# agent-orchestrator/agents/ml/features.py
"""
Feature engineering pour enrichir les prédictions.
"""

from datetime import datetime, date
import httpx
import os

BOOKING_SERVICE = os.getenv("BOOKING_SERVICE_URL", "http://booking-service")

async def fetch_real_demand_data(
    city:     str,
    category: str,
    days:     int = 90,
) -> list:
    """
    Récupère les données réelles de réservations depuis booking-service.
    
    Returns:
        [{"date": "2024-01-15", "bookings": 12}, ...]
    """
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(
                f"{BOOKING_SERVICE}/api/internal/demand-history",
                params={
                    "city":     city,
                    "category": category,
                    "days":     days,
                }
            )
        if resp.status_code == 200:
            return resp.json()
        return []
    except Exception as e:
        return []


def get_context_features(
    target_date: str,
    city:        str,
) -> dict:
    """
    Extrait les features contextuelles pour une date donnée.
    Utilisé pour enrichir la prédiction avec le contexte Maroc.
    """
    from agents.ml.synthetic_data import FERIES_MAROC, SEASONAL_MAROC

    dt       = datetime.strptime(target_date, "%Y-%m-%d")
    is_ferie = target_date in FERIES_MAROC

    # Saison
    month    = dt.month
    if month in (6, 7, 8):    season = "été"
    elif month in (12, 1, 2): season = "hiver"
    elif month in (3, 4, 5):  season = "printemps"
    else:                     season = "automne"

    # Proximité événements
    days_to_weekend = (5 - dt.weekday()) % 7

    return {
        "date":            target_date,
        "weekday":         dt.strftime("%A"),
        "is_weekend":      dt.weekday() >= 5,
        "is_ferie":        is_ferie,
        "season":          season,
        "month":           month,
        "seasonal_index":  SEASONAL_MAROC.get(month, 1.0),
        "days_to_weekend": days_to_weekend,
        "city":            city,
    }