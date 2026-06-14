# pricing-dynamique/main.py
from fastapi import FastAPI
from pydantic import BaseModel
from typing import Optional
import logging
import time
from fastapi.middleware.cors import CORSMiddleware
from agents.pricing_agent import suggest_price

# Création de l'application FastAPI
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-RateLimit-Remaining", "X-RateLimit-Reset"],
)

# Configuration du logging avec format détaillé
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s"
)
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
    start_time = time.time()
    
    logger.info("=" * 70)
    logger.info(f"🚗 PRICING REQUEST | {req.brand} {req.model} ({req.year}) | {req.city}")
    logger.info("=" * 70)
    logger.info(f"📋 Paramètres reçus:")
    logger.info(f"   • Catégorie: {req.category}")
    logger.info(f"   • Marque/Modèle: {req.brand} {req.model}")
    logger.info(f"   • Année: {req.year}")
    logger.info(f"   • Ville: {req.city}")
    logger.info(f"   • Carburant: {req.fuel_type}")
    logger.info(f"   • Transmission: {req.transmission}")
    logger.info(f"   • Places: {req.seats}")
    logger.info(f"   • Chauffeur: {'Oui' if req.offers_driver else 'Non'}")
    
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
    
    elapsed_ms = round((time.time() - start_time) * 1000)
    logger.info("=" * 70)
    logger.info(f"✅ PRICING RESULT | {elapsed_ms}ms | Prix suggéré: {result.get('suggested_price')} MAD/jour")
    logger.info(f"   • Fourchette: {result.get('min_price')} - {result.get('max_price')} MAD/jour")
    logger.info(f"   • Saison: {result.get('season')}")
    logger.info(f"   • Données marché: {result.get('market_data', {}).get('count', 0)} véhicules similaires")
    logger.info("=" * 70)
    
    return result


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/")
async def root():
    return {"message": "Pricing service is running"}