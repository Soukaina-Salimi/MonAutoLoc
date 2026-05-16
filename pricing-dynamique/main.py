# Dans pricing-dynamique/main.py —
from fastapi import FastAPI
from pydantic import BaseModel
from typing import Optional
import logging
from fastapi.middleware.cors import CORSMiddleware

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


class PricingSuggestionRequest(BaseModel):
    category: str
    city: str
    brand: str
    model: str
    year: int
    fuel_type: Optional[str] = "essence"
    transmission: Optional[str] = "manuelle"
    seats: Optional[int] = 5
    offers_driver: Optional[bool] = False


@app.post("/agent/pricing/suggest")
async def suggest_vehicle_price(req: PricingSuggestionRequest):
    """
    Suggère un prix lors de l'ajout d'un véhicule.
    Appelé une seule fois par l'owner quand il crée son annonce.
    """
    from agents.pricing_agent import suggest_price

    logger.info(f"Pricing request: {req.brand} {req.model} in {req.city}")

    result = await suggest_price(
        category=req.category,
        city=req.city,
        brand=req.brand,
        model=req.model,
        year=req.year,
        fuel_type=req.fuel_type,
        transmission=req.transmission,
        seats=req.seats,
        offers_driver=req.offers_driver,
    )
    return result


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/")
async def root():
    return {"message": "Pricing service is running"}