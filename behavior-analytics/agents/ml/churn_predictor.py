# behavior_analytics/agents/ml/churn_predictor.py
"""
Prédiction de churn (attrition) avec Régression Logistique.

Features prédictives :
- Jours depuis dernière réservation
- Tendance (fréquence en baisse ?)
- Montant moyen (en baisse ?)
- Score RFM
- Durée cliente
"""

import pandas as pd
import numpy as np
import logging
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import cross_val_score
from sklearn.metrics import classification_report

logger = logging.getLogger(__name__)

# Seuil de risque de churn
CHURN_THRESHOLD   = 0.50   # prob > 50% → à risque
HIGH_RISK_THRESHOLD = 0.75  # prob > 75% → risque élevé


def build_churn_features(
    rfm_df:      pd.DataFrame,
    bookings_df: pd.DataFrame,
) -> pd.DataFrame:
    """Construit les features de churn."""

    features = rfm_df[["client_id", "recency", "frequency",
                        "monetary", "rfm_score", "rfm_score_100"]].copy()

    if not bookings_df.empty:
        bookings_df = bookings_df.copy()
        bookings_df["date"] = pd.to_datetime(bookings_df["date"])

        # Tendance sur 3 derniers mois vs 3 précédents
        three_months_ago = pd.Timestamp.now() - pd.DateOffset(months=3)
        six_months_ago   = pd.Timestamp.now() - pd.DateOffset(months=6)

        for client_id, group in bookings_df.groupby("client_id"):
            recent  = group[group["date"] >= three_months_ago]["amount"].sum()
            older   = group[
                (group["date"] >= six_months_ago) &
                (group["date"] < three_months_ago)
            ]["amount"].sum()

            trend = (recent - older) / max(older, 1)  # Variation %

            features.loc[
                features["client_id"] == client_id,
                "spend_trend"
            ] = trend

            # Régularité (écart-type entre réservations)
            if len(group) > 1:
                sorted_dates = group["date"].sort_values()
                gaps         = sorted_dates.diff().dt.days.dropna()
                features.loc[
                    features["client_id"] == client_id,
                    "booking_regularity"
                ] = gaps.std() if len(gaps) > 0 else 0

    features = features.fillna(0)
    return features


def train_churn_model(
    rfm_df:      pd.DataFrame,
    bookings_df: pd.DataFrame,
    clients_df:  pd.DataFrame,  # Contient is_churned (label)
) -> dict:
    """
    Entraîne le modèle de prédiction de churn.
    Utilise des labels synthétiques si pas assez de données réelles.
    """
    features = build_churn_features(rfm_df, bookings_df)

    # Labels : churné ou non
    if "is_churned" in clients_df.columns:
        labels = clients_df[["client_id", "is_churned"]].copy()
        features = features.merge(labels, on="client_id", how="left")
    else:
        # Générer des labels basés sur la récence (proxy du churn)
        features["is_churned"] = (
            (features["recency"] > 180) & (features["frequency"] <= 2)
        ).astype(int)

    feature_cols = [
        "recency", "frequency", "monetary", "rfm_score",
        "spend_trend", "booking_regularity"
    ]
    available_cols = [c for c in feature_cols if c in features.columns]

    X = features[available_cols].values
    y = features["is_churned"].values

    # Normalisation
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    # ── Régression Logistique ─────────────────────────────────────────────
    model = LogisticRegression(
        random_state    = 42,
        max_iter        = 1000,
        class_weight    = "balanced",   # Gérer déséquilibre churné/non churné
        C               = 0.1,          # Régularisation
    )

    model.fit(X_scaled, y)

    # Cross-validation
    cv_scores = cross_val_score(model, X_scaled, y, cv=5, scoring="roc_auc")
    auc_mean  = float(cv_scores.mean())

    # ── Prédictions sur tous les clients ─────────────────────────────────
    proba    = model.predict_proba(X_scaled)[:, 1]
    features = features.copy()
    features["churn_probability"] = proba
    features["churn_risk_level"]  = features["churn_probability"].apply(
        lambda p: "élevé" if p >= HIGH_RISK_THRESHOLD
                  else "moyen" if p >= CHURN_THRESHOLD
                  else "faible"
    )

    # ── Importance des features ───────────────────────────────────────────
    coefs = model.coef_[0]
    feature_importance = sorted(
        zip(available_cols, abs(coefs)),
        key=lambda x: x[1],
        reverse=True
    )

    # ── Clients à risque ──────────────────────────────────────────────────
    at_risk   = features[features["churn_probability"] >= CHURN_THRESHOLD]
    high_risk = features[features["churn_probability"] >= HIGH_RISK_THRESHOLD]

    return {
        "model":           model,
        "scaler":          scaler,
        "feature_cols":    available_cols,
        "auc_score":       round(auc_mean, 3),
        "churn_rate":      round(float(y.mean()), 3),
        "at_risk_count":   len(at_risk),
        "high_risk_count": len(high_risk),
        "feature_importance": [
            {"feature": f, "importance": round(float(i), 3)}
            for f, i in feature_importance
        ],
        "predictions_df":  features[[
            "client_id", "recency", "frequency", "monetary",
            "churn_probability", "churn_risk_level"
        ]],
    }


def predict_client_churn(
    model_result:  dict,
    client_data:   dict,
) -> dict:
    """Prédit le risque de churn pour UN client spécifique."""
    model     = model_result["model"]
    scaler    = model_result["scaler"]
    feat_cols = model_result["feature_cols"]

    values  = [client_data.get(c, 0) for c in feat_cols]
    X       = np.array(values).reshape(1, -1)
    X_sc    = scaler.transform(X)
    proba   = float(model.predict_proba(X_sc)[0][1])

    return {
        "churn_probability": round(proba, 3),
        "risk_level":        "élevé" if proba >= HIGH_RISK_THRESHOLD
                             else "moyen" if proba >= CHURN_THRESHOLD
                             else "faible",
        "risk_pct":          round(proba * 100, 1),
        "action_recommended": _get_churn_action(proba),
    }


def _get_churn_action(prob: float) -> str:
    if prob >= 0.75:
        return "🚨 Action urgente : offre win-back avec remise 20% sur prochaine réservation"
    elif prob >= 0.50:
        return "⚠️ Relancer avec email personnalisé + offre exclusive -10%"
    elif prob >= 0.25:
        return "👀 Surveiller — envoyer newsletter avec nouveautés"
    return "✅ Client stable — maintenir l'engagement"