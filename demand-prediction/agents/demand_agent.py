# demand-prediction/agents/demand_agent.py
"""
Agent de prédiction de demande hybride.
Combine Prophet (ML) + Groq LLM (contexte) + données réelles.
"""

import asyncio
import httpx
import json
import os
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

GROQ_API_KEY    = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL      = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
VEHICLE_SERVICE = os.getenv("VEHICLE_SERVICE_URL", "http://vehicle-service")


async def predict(
    city:        str,
    category:    str,
    days_ahead:  int  = 30,
    owner_id:    int  = None,
    vehicule_id: int  = None,
) -> dict:
    """
    Prédit la demande et génère des insights actionnables pour l'owner.
    
    Pipeline:
    1. Récupérer données réelles depuis booking-service
    2. Entraîner/récupérer modèle Prophet
    3. Générer prédictions
    4. Enrichir avec insights Groq LLM
    5. Retourner résultat complet
    """

    # ── 1. Données réelles (en parallèle avec init modèle) ───────────────
    from agents.ml.features import fetch_real_demand_data
    from agents.ml.prophet_model import get_predictor

    real_data = await fetch_real_demand_data(city, category, days=90)

    # ── 2. Entraîner/récupérer le modèle ─────────────────────────────────
    # En prod → get_predictor depuis cache, sinon train
    loop = asyncio.get_event_loop()
    predictor = await loop.run_in_executor(
        None,
        lambda: get_predictor(city, category)
    )

    # Si nouvelles données réelles → re-entraîner
    if real_data and len(real_data) >= 14:
        await loop.run_in_executor(
            None,
            lambda: predictor.train(real_data)
        )

    # ── 3. Générer les prédictions ────────────────────────────────────────
    summary = await loop.run_in_executor(
        None,
        lambda: predictor.predict_summary(days_ahead)
    )

    # ── 4. Concurrence : infos véhicule + insights LLM ───────────────────
    vehicle_info, llm_insights = await asyncio.gather(
        _fetch_vehicle_info(vehicule_id) if vehicule_id else asyncio.coroutine(lambda: {})(),
        _generate_insights(city, category, summary, real_data),
        return_exceptions=True,
    )

    if isinstance(vehicle_info, Exception):  vehicle_info = {}
    if isinstance(llm_insights, Exception):  llm_insights = {}

    # ── 5. Construire le résultat final ───────────────────────────────────
    return {
        "city":          city,
        "category":      category,
        "period_days":   days_ahead,
        "model_used":    "Prophet (Meta) + Groq LLM",
        "data_source":   "real" if len(real_data) >= 14 else "synthetic+real",
        "real_data_points": len(real_data),

        # Métriques clés
        "summary": {
            "avg_daily_demand":   summary.get("avg_daily"),
            "peak_day":           summary.get("peak_day"),
            "lowest_day":         summary.get("lowest_day"),
            "high_demand_days":   summary.get("high_demand_days"),
            "weekend_avg":        summary.get("weekend_avg"),
            "ferie_count":        summary.get("ferie_count"),
            "trend_direction":    summary.get("trend_direction"),
        },

        # Prédictions jour par jour
        "predictions": summary.get("predictions", []),

        # Insights LLM (actionnables)
        "insights":    llm_insights,

        # Recommandations de prix
        "pricing_recommendations": _build_pricing_reco(summary),
    }


async def _fetch_vehicle_info(vehicule_id: int) -> dict:
    """Récupère les infos d'un véhicule spécifique."""
    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            resp = await client.get(f"{VEHICLE_SERVICE}/api/vehicules/{vehicule_id}")
        return resp.json() if resp.status_code == 200 else {}
    except Exception:
        return {}


async def _generate_insights(
    city:      str,
    category:  str,
    summary:   dict,
    real_data: list,
) -> dict:
    """
    Groq LLM génère des insights actionnables basés sur les prédictions.
    """
    avg       = summary.get("avg_daily", 0)
    peak      = summary.get("peak_day", {})
    trend     = summary.get("trend_direction", "stable")
    high_days = summary.get("high_demand_days", 0)
    total     = summary.get("period_days", 30)

    prompt = f"""Tu es un expert en analyse de demande pour AutoRent, plateforme de location de véhicules au Maroc.

DONNÉES DE PRÉDICTION — {city} | Catégorie: {category}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Période analysée : {total} prochains jours
Demande moyenne journalière : {avg} réservations/jour
Tendance : {trend}
Jours à forte demande : {high_days}/{total} jours
Pic prévu : {peak.get('date', 'N/A')} ({peak.get('predicted', 0)} réservations)
Données réelles disponibles : {len(real_data)} jours

Génère une analyse CONCRÈTE et ACTIONNABLE pour l'owner en JSON :
{{
  "market_analysis": "Analyse en 2 phrases du marché local pour cette catégorie à {city}",
  "demand_outlook": "Perspective demande pour les {total} prochains jours (2 phrases)",
  "best_periods": [
    {{"period": "description courte", "reason": "pourquoi forte demande", "recommendation": "action concrète"}}
  ],
  "pricing_advice": "Conseil sur les prix selon la demande prévue",
  "availability_tip": "Conseil de disponibilité / gestion flotte",
  "risk_alert": "Risque ou point d'attention (ou null si aucun)",
  "confidence": "high|medium|low",
  "confidence_reason": "pourquoi ce niveau de confiance"
}}

Contexte Maroc : demande pic en juillet-août (tourisme), décembre (vacances).
Réponds UNIQUEMENT en JSON valide, aucun texte avant/après."""

    try:
        async with httpx.AsyncClient(timeout=12.0) as client:
            resp = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={"Authorization": f"Bearer {GROQ_API_KEY}"},
                json={
                    "model":       GROQ_MODEL,
                    "messages":    [{"role": "user", "content": prompt}],
                    "max_tokens":  600,
                    "temperature": 0.3,
                }
            )

        content = resp.json()["choices"][0]["message"]["content"].strip()

        # Nettoyer les backticks si présents
        if "```" in content:
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]

        return json.loads(content.strip())

    except Exception as e:
        logger.warning(f"[demand_agent] LLM insights failed: {e}")
        return {
            "market_analysis":  f"Le marché de la location de {category} à {city} montre une demande {trend}.",
            "demand_outlook":   f"Demande prévue : {avg:.1f} réservations/jour en moyenne.",
            "best_periods":     [],
            "pricing_advice":   "Ajustez vos prix selon la saisonnalité.",
            "availability_tip": "Maintenez vos véhicules disponibles pendant les périodes de forte demande.",
            "risk_alert":       None,
            "confidence":       "low",
            "confidence_reason":"Données limitées disponibles",
        }


def _build_pricing_reco(summary: dict) -> list:
    """
    Génère des recommandations de prix basées sur les prédictions de demande.
    Logique : haute demande → prix en hausse suggéré.
    """
    recommendations = []
    predictions = summary.get("predictions", [])

    if not predictions:
        return []

    avg = summary.get("avg_daily", 5)

    for pred in predictions[:7]:  # 7 prochains jours
        demand   = pred["predicted"]
        ratio    = demand / max(avg, 1)
        date_str = pred["date"]

        if ratio >= 1.3:
            price_adj = "+15% à +25%"
            advice    = "Forte demande — augmentez vos prix"
            level     = "🔴"
        elif ratio >= 1.1:
            price_adj = "+5% à +15%"
            advice    = "Bonne demande — légère hausse recommandée"
            level     = "🟡"
        elif ratio <= 0.7:
            price_adj = "-10% à -15%"
            advice    = "Faible demande — réduisez pour attirer"
            level     = "🟢"
        else:
            price_adj = "Prix stable"
            advice    = "Demande normale"
            level     = "⚪"

        recommendations.append({
            "date":           date_str,
            "weekday":        pred["weekday"],
            "demand":         demand,
            "demand_level":   pred["level"],
            "price_adjustment": price_adj,
            "advice":         advice,
            "indicator":      level,
        })

    return recommendations