from fastapi import FastAPI
from pydantic import BaseModel
from typing import Optional
import logging
from fastapi.middleware.cors import CORSMiddleware
from agents.demand_agent import predict as predict_demand

# Création de l'application FastAPI
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-RateLimit-Remaining", "X-RateLimit-Reset"],
)

# Configuration du logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

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
    result = await predict_demand(
        city        = req.city,
        category    = req.category,
        days_ahead  = min(req.days_ahead, 90),  # max 90 jours
        owner_id    = req.owner_id,
        vehicule_id = req.vehicule_id,
    )
    return result


@app.post("/agent/demand/retrain")
async def demand_retrain(req: RetrainRequest):
    """
    Re-entraîne le modèle avec de nouvelles données réelles.
    Appelé automatiquement quand de nouvelles réservations arrivent.
    """
    from agents.ml.prophet_model import retrain_with_real_data

    result = retrain_with_real_data(
        city      = req.city,
        category  = req.category,
        real_data = req.real_data,
    )
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