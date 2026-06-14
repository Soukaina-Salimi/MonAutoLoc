from fastapi import FastAPI
from pydantic import BaseModel
from typing import Optional
import time
import logging
from fastapi.middleware.cors import CORSMiddleware
from agents.demand_agent import predict as predict_demand

# Configuration du logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(message)s")
logger = logging.getLogger("demand_prediction")

# Création de l'application FastAPI
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-RateLimit-Remaining", "X-RateLimit-Reset"],
)


class DemandRequest(BaseModel):
    city:        str
    category:    str
    days_ahead:  int            = 30
    owner_id:    Optional[int]  = None
    vehicule_id: Optional[int]  = None

class RetrainRequest(BaseModel):
    city:      str
    category:  str
    real_data: list  # [{"date": "2024-01-15", "bookings": 12}, ...]


@app.post("/agent/demand/predict")
async def demand_predict(req: DemandRequest):
    """
    Prédit la demande pour une ville/catégorie.
    Utilisé dans le dashboard owner pour l'onglet "Prédictions".
    """
    logger.info("=" * 65)
    logger.info(
        f"[DEMAND] === START === city={req.city} | category={req.category} | "
        f"days_ahead={min(req.days_ahead, 90)} | owner_id={req.owner_id or '—'} | "
        f"vehicule_id={req.vehicule_id or '—'}"
    )
    logger.info("=" * 65)

    t0 = time.time()
    result = await predict_demand(
        city        = req.city,
        category    = req.category,
        days_ahead  = min(req.days_ahead, 90),  # max 90 jours
        owner_id    = req.owner_id,
        vehicule_id = req.vehicule_id,
    )
    dur = round((time.time() - t0) * 1000)

    summary = result.get("summary", {})
    logger.info("-" * 65)
    logger.info(
        f"[DEMAND] === END === total={dur}ms | data_source={result.get('data_source')} | "
        f"avg_daily={summary.get('avg_daily_demand')} | "
        f"trend={summary.get('trend_direction')} | "
        f"high_demand_days={summary.get('high_demand_days')} | "
        f"weekend_avg={summary.get('weekend_avg')} | "
        f"ferie_count={summary.get('ferie_count')}"
    )
    if summary.get("peak_day"):
        logger.info(
            f"[DEMAND] Peak day: {summary['peak_day'].get('date')} | "
            f"predicted={summary['peak_day'].get('predicted')}"
        )
    logger.info("=" * 65)

    return result


@app.post("/agent/demand/retrain")
async def demand_retrain(req: RetrainRequest):
    """
    Re-entraîne le modèle avec de nouvelles données réelles.
    Appelé automatiquement quand de nouvelles réservations arrivent.
    """
    from agents.ml.prophet_model import retrain_with_real_data

    logger.info("=" * 65)
    logger.info(
        f"[DEMAND][RETRAIN] === START === city={req.city} | category={req.category} | "
        f"real_data_points={len(req.real_data)}"
    )
    logger.info("=" * 65)

    t0 = time.time()
    result = retrain_with_real_data(
        city      = req.city,
        category  = req.category,
        real_data = req.real_data,
    )
    dur = round((time.time() - t0) * 1000)

    logger.info(
        f"[DEMAND][RETRAIN] === END === {dur}ms | status={result.get('status')} | "
        f"model={result.get('model')} | data_points={result.get('data_points', '—')}"
    )
    logger.info("=" * 65)

    return result


@app.get("/agent/demand/cities")
async def demand_cities():
    """Liste des villes et catégories supportées."""
    return {
        "cities":     ["Casablanca", "Marrakech", "Agadir", "Fès",
                       "Rabat", "Tanger", "Meknès", "Oujda"],
        "categories": ["citadine", "berline", "suv", "4x4",
                       "utilitaire", "luxe", "minibus"],
    }


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/")
async def root():
    return {"message": "demand prediction service is running"}