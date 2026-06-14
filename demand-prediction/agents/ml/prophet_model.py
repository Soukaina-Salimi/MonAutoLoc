# agent-orchestrator/agents/ml/prophet_model.py

import pandas as pd
import numpy as np
import json
import os
import time
import logging
from datetime import datetime, timedelta
from typing import Optional

logger = logging.getLogger("demand_prediction")

# Vérifier si Prophet est installé
try:
    from prophet import Prophet
    PROPHET_AVAILABLE = True
except ImportError:
    PROPHET_AVAILABLE = False
    logger.warning("[PROPHET] Prophet non installé — utilisation du fallback statistique")

from agents.ml.synthetic_data import (
    generate_synthetic_history,
    FERIES_MAROC,
    SEASONAL_MAROC,
    WEEKLY_PATTERN,
    CITY_BASE,
)

# Répertoire pour sauvegarder les modèles entraînés
MODEL_DIR = "/app/models"
os.makedirs(MODEL_DIR, exist_ok=True)


class DemandPredictor:
    """
    Modèle de prédiction de demande hybride.

    Combine :
    - Prophet (série temporelle) pour la tendance + saisonnalité
    - Données historiques réelles (booking-service) + synthétiques
    - Features engineering (fériés, saison, ville)
    """

    def __init__(self, city: str, category: str):
        self.city     = city
        self.category = category
        self.key      = f"{city}_{category}".lower().replace(" ", "_")
        self.model    = None
        self.is_trained = False

    def _get_model_path(self) -> str:
        return os.path.join(MODEL_DIR, f"prophet_{self.key}.json")

    def prepare_data(
        self,
        real_data: Optional[list] = None,
        synthetic_days: int = 365,
    ) -> pd.DataFrame:
        """
        Combine données réelles et synthétiques.

        real_data format: [{"date": "2024-01-15", "bookings": 12}, ...]
        """
        logger.info(
            f"[PROPHET][{self.key}] prepare_data | synthetic_days={synthetic_days} | "
            f"real_data={len(real_data) if real_data else 0}"
        )

        # Données synthétiques comme base
        df_synth = generate_synthetic_history(
            city     = self.city,
            category = self.category,
            days     = synthetic_days,
        )
        logger.info(
            f"[PROPHET][{self.key}] données synthétiques générées | "
            f"{len(df_synth)} jours | "
            f"y_moyenne={round(df_synth['y'].mean(), 2)}"
        )

        # Si des données réelles existent → les mélanger
        if real_data and len(real_data) >= 7:
            df_real = pd.DataFrame(real_data)
            df_real["ds"] = pd.to_datetime(df_real["date"])
            df_real["y"]  = df_real["bookings"].astype(float)
            df_real = df_real[["ds", "y"]]

            # Supprimer les dates synthétiques qui chevauchent les réelles
            real_dates = set(df_real["ds"].dt.strftime("%Y-%m-%d"))
            df_synth   = df_synth[
                ~df_synth["ds"].dt.strftime("%Y-%m-%d").isin(real_dates)
            ]

            # Pondérer les données réelles (3x plus importantes)
            df_real_weighted = pd.concat([df_real] * 3, ignore_index=True)

            df = pd.concat([df_synth, df_real_weighted], ignore_index=True)

            logger.info(
                f"[PROPHET][{self.key}] fusion réel+synthétique | "
                f"réel={len(df_real)} (x3 -> {len(df_real_weighted)}) | "
                f"synthétique restant={len(df_synth)} | total={len(df)}"
            )
        else:
            df = df_synth
            logger.info(
                f"[PROPHET][{self.key}] pas assez de données réelles (<7) -> "
                f"100% synthétique ({len(df)} jours)"
            )

        return df.sort_values("ds").reset_index(drop=True)

    def train(self, real_data: Optional[list] = None) -> dict:
        """Entraîne le modèle Prophet."""
        if not PROPHET_AVAILABLE:
            logger.warning(f"[PROPHET][{self.key}] Prophet indisponible -> fallback")
            return self._train_fallback(real_data)

        logger.info(f"[PROPHET][{self.key}] ▶ START train | city={self.city} | category={self.category}")
        t0 = time.time()

        df = self.prepare_data(real_data)

        # Jours fériés Maroc
        holidays = pd.DataFrame({
            "holiday": "Jour Férié Maroc",
            "ds":      pd.to_datetime(FERIES_MAROC),
            "lower_window": -1,
            "upper_window":  1,
        })
        logger.info(f"[PROPHET][{self.key}] {len(holidays)} jours fériés chargés (fenêtre ±1j)")

        # Configurer Prophet
        self.model = Prophet(
            yearly_seasonality  = True,
            weekly_seasonality  = True,
            daily_seasonality   = False,
            holidays            = holidays,
            interval_width      = 0.95,
            changepoint_prior_scale     = 0.05,
            seasonality_prior_scale     = 10,
        )
        logger.info(
            f"[PROPHET][{self.key}] config | yearly=True | weekly=True | "
            f"interval_width=0.95 | changepoint_prior_scale=0.05 | "
            f"seasonality_prior_scale=10"
        )

        # Ajouter saisonnalité mensuelle personnalisée
        self.model.add_seasonality(
            name="monthly",
            period=30.5,
            fourier_order=5,
        )
        logger.info(f"[PROPHET][{self.key}] saisonnalité 'monthly' ajoutée (period=30.5, fourier_order=5)")

        # Entraîner
        logger.info(f"[PROPHET][{self.key}] model.fit() sur {len(df)} points...")
        self.model.fit(df)
        self.is_trained = True
        fit_dur = round((time.time() - t0) * 1000)
        logger.info(f"[PROPHET][{self.key}] model.fit() terminé | {fit_dur}ms")

        # Métriques de base
        future   = self.model.make_future_dataframe(periods=30)
        forecast = self.model.predict(future)

        total_dur = round((time.time() - t0) * 1000)
        logger.info(
            f"[PROPHET][{self.key}] ▶ END train | {total_dur}ms | "
            f"data_points={len(df)} | features=[yearly, weekly, holidays_maroc, monthly]"
        )

        return {
            "status":        "trained",
            "data_points":   len(df),
            "city":          self.city,
            "category":      self.category,
            "model":         "Prophet (Meta)",
            "features":      ["yearly_seasonality", "weekly_seasonality",
                              "holidays_maroc", "monthly_seasonality"],
        }

    def predict(self, days_ahead: int = 30) -> list:
        """
        Prédit la demande pour les N prochains jours.

        Returns:
            list de dicts: [{date, predicted, lower, upper, weekday, is_ferie}, ...]
        """
        if not self.is_trained:
            logger.info(f"[PROPHET][{self.key}] modèle non entraîné -> train() automatique")
            self.train()

        if not PROPHET_AVAILABLE or self.model is None:
            logger.info(f"[PROPHET][{self.key}] predict() -> fallback statistique")
            return self._predict_fallback(days_ahead)

        logger.info(f"[PROPHET][{self.key}] model.predict() sur {days_ahead} jours futurs")
        t0 = time.time()
        future   = self.model.make_future_dataframe(periods=days_ahead)
        forecast = self.model.predict(future)
        dur = round((time.time() - t0) * 1000)
        logger.info(f"[PROPHET][{self.key}] predict() terminé | {dur}ms")

        # Garder uniquement les prédictions futures
        future_only = forecast.tail(days_ahead)

        results = []
        for _, row in future_only.iterrows():
            date   = row["ds"].strftime("%Y-%m-%d")
            is_fe  = date in FERIES_MAROC
            wd     = row["ds"].weekday()

            results.append({
                "date":       date,
                "predicted":  max(0, round(row["yhat"], 1)),
                "lower":      max(0, round(row["yhat_lower"], 1)),
                "upper":      max(0, round(row["yhat_upper"], 1)),
                "weekday":    ["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"][wd],
                "is_weekend": wd >= 5,
                "is_ferie":   is_fe,
                "trend":      round(row["trend"], 1),
                "level":      self._demand_level(row["yhat"]),
            })

        logger.info(f"[PROPHET][{self.key}] {len(results)} prédictions générées")
        return results

    def predict_summary(self, days_ahead: int = 30) -> dict:
        """Résumé de la prédiction pour les N prochains jours."""
        predictions = self.predict(days_ahead)
        if not predictions:
            logger.warning(f"[PROPHET][{self.key}] predict_summary -> aucune prédiction")
            return {}

        values = [p["predicted"] for p in predictions]
        avg    = round(sum(values) / len(values), 1)
        peak   = max(predictions, key=lambda x: x["predicted"])
        low    = min(predictions, key=lambda x: x["predicted"])

        high_days     = [p for p in predictions if p["level"] == "haute"]
        weekends      = [p for p in predictions if p["is_weekend"]]
        ferié_days    = [p for p in predictions if p["is_ferie"]]

        summary = {
            "period_days":    days_ahead,
            "avg_daily":      avg,
            "peak_day":       peak,
            "lowest_day":     low,
            "high_demand_days": len(high_days),
            "weekend_avg":    round(sum(p["predicted"] for p in weekends) / max(len(weekends), 1), 1),
            "ferie_count":    len(ferié_days),
            "trend_direction":"hausse" if predictions[-1]["predicted"] > predictions[0]["predicted"] else "baisse",
            "predictions":    predictions,
        }

        logger.info(
            f"[PROPHET][{self.key}] summary | avg={avg} | peak={peak['date']}({peak['predicted']}) | "
            f"low={low['date']}({low['predicted']}) | trend={summary['trend_direction']}"
        )

        return summary

    def _demand_level(self, value: float) -> str:
        """Classe le niveau de demande."""
        if value >= 12:   return "très haute"
        if value >= 8:    return "haute"
        if value >= 5:    return "normale"
        if value >= 2:    return "faible"
        return "très faible"

    def _train_fallback(self, real_data=None) -> dict:
        """Fallback si Prophet non disponible."""
        logger.info(f"[PROPHET][{self.key}] _train_fallback() | real_data={len(real_data) if real_data else 0}")
        self.is_trained = True
        return {"status": "trained_fallback", "model": "Statistical"}

    def _predict_fallback(self, days_ahead: int) -> list:
        """Prédiction statistique simple si Prophet indisponible."""
        logger.info(f"[PROPHET][{self.key}] _predict_fallback() sur {days_ahead} jours")
        city_mult = CITY_BASE.get(self.city, 0.85)
        base      = 8.0 * city_mult
        results   = []

        for i in range(days_ahead):
            date     = (datetime.now() + timedelta(days=i)).strftime("%Y-%m-%d")
            dt       = datetime.strptime(date, "%Y-%m-%d")
            monthly  = SEASONAL_MAROC.get(dt.month, 1.0)
            weekly   = WEEKLY_PATTERN.get(dt.weekday(), 1.0)
            is_fe    = date in FERIES_MAROC
            fe_mult  = 1.3 if is_fe else 1.0
            value    = base * monthly * weekly * fe_mult
            wd       = dt.weekday()

            results.append({
                "date":       date,
                "predicted":  round(value, 1),
                "lower":      round(value * 0.75, 1),
                "upper":      round(value * 1.25, 1),
                "weekday":    ["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"][wd],
                "is_weekend": wd >= 5,
                "is_ferie":   is_fe,
                "trend":      value,
                "level":      self._demand_level(value),
            })

        return results


# Cache des modèles en mémoire (évite re-entraînement à chaque requête)
_model_cache: dict[str, DemandPredictor] = {}


def get_predictor(city: str, category: str) -> DemandPredictor:
    """Retourne un modèle entraîné depuis le cache ou en crée un nouveau."""
    key = f"{city}_{category}".lower()

    if key not in _model_cache:
        logger.info(f"[PROPHET][CACHE] MISS pour key={key} -> création + entraînement")
        predictor = DemandPredictor(city, category)
        predictor.train()
        _model_cache[key] = predictor
    else:
        logger.info(f"[PROPHET][CACHE] HIT pour key={key} -> réutilisation du modèle")

    return _model_cache[key]


def retrain_with_real_data(city: str, category: str, real_data: list) -> dict:
    """Re-entraîne le modèle avec de nouvelles données réelles."""
    key       = f"{city}_{category}".lower()
    logger.info(f"[PROPHET][CACHE] RETRAIN forcé pour key={key} | real_data={len(real_data)} points")
    predictor = DemandPredictor(city, category)
    result    = predictor.train(real_data)
    _model_cache[key] = predictor
    return result