from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import httpx
import os
import time
import logging
import asyncio

from agents.marketing_orchestrator import process_marketing_campaign
from agents import content_agent, image_agent

logger = logging.getLogger("marketing_orchestrator")
logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(message)s")

app = FastAPI(title="AutoRent Marketing Orchestrator")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class CampaignRequest(BaseModel):
    owner_id:    int
    vehicule_id: int
    platforms:   List[str]      = ["facebook"]
    tone:        str            = "professionnel"
    language:    str            = "fr"
    promo_price: Optional[float]= None
    custom_contents: Optional[dict] = None  # ← contenu édité depuis le preview


class CampaignResponse(BaseModel):
    success:          bool
    vehicle:          Optional[str] = None
    published_count:  int  = 0
    failed_count:     int  = 0
    publications:     list = []
    contents_preview: dict = {}


# ── Helper — récupérer le véhicule ────────────────────────────────────────────

async def _fetch_vehicle(vehicule_id: int) -> dict | None:
    VEHICLE_SERVICE_URL = os.getenv("VEHICLE_SERVICE_URL", "http://vehicle-service")
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            logger.info(f"[MARKETING] GET {VEHICLE_SERVICE_URL}/api/vehicules/{vehicule_id}")
            resp = await client.get(f"{VEHICLE_SERVICE_URL}/api/vehicules/{vehicule_id}")
        logger.info(f"[MARKETING] vehicle-service → status={resp.status_code}")
        if resp.status_code == 200:
            v = resp.json()
            return {
                "id":               v.get("id"),
                "brand":            v.get("brand"),
                "model":            v.get("model"),
                "year":             v.get("year"),
                "fuel_type":        v.get("fuel_type"),
                "transmission":     v.get("transmission"),
                "seats":            v.get("seats"),
                "price_per_day":    v.get("price_per_day"),
                "city":             v.get("city"),
                "description":      v.get("description"),
                "offers_driver":    v.get("offers_driver"),
                "driver_daily_rate":v.get("driver_daily_rate"),
                "image_url":        v.get("image_url"),
            }
        return None
    except Exception as e:
        logger.error(f"[MARKETING] _fetch_vehicle erreur: {e}")
        return None


# ── POST /marketing/preview ───────────────────────────────────────────────────

@app.post("/marketing/preview")
async def preview_campaign(req: CampaignRequest):
    """Génère le contenu + visuels sans publier — pour aperçu et édition."""

    logger.info("=" * 65)
    logger.info(
        f"[MARKETING] === PHASE 1: PREVIEW === owner_id={req.owner_id} | "
        f"vehicule_id={req.vehicule_id} | platforms={req.platforms} | "
        f"tone={req.tone} | lang={req.language}"
    )
    logger.info("=" * 65)

    vehicle_data = await _fetch_vehicle(req.vehicule_id)
    if not vehicle_data:
        logger.error(f"[MARKETING] 404 — véhicule introuvable id={req.vehicule_id}")
        raise HTTPException(status_code=404, detail="Véhicule introuvable")

    logger.info(
        f"[MARKETING] Véhicule récupéré: {vehicle_data['brand']} {vehicle_data['model']} "
        f"({vehicle_data.get('year')}) — {vehicle_data.get('price_per_day')} MAD/jour "
        f"— ville={vehicle_data.get('city')}"
    )

    # Générer le contenu et les visuels en parallèle
    logger.info("[MARKETING] → ContentAgent + ImageAgent (parallèle)")
    t0 = time.time()
    contents, images = await asyncio.gather(
        content_agent.run(vehicle_data, {
            "platforms":   req.platforms,
            "tone":        req.tone,
            "language":    req.language,
            "promo_price": req.promo_price,
        }),
        image_agent.run(vehicle_data, req.platforms, req.promo_price),
    )
    dur = round((time.time() - t0) * 1000)
    logger.info(f"[MARKETING] ContentAgent + ImageAgent terminés en {dur}ms")

    logger.info(f"[MARKETING] === PHASE 1 TERMINÉE === preview retournée au frontend")
    logger.info("=" * 65)

    return {
        "success":      True,
        "vehicle":      f"{vehicle_data['brand']} {vehicle_data['model']}",
        "image_url":    vehicle_data.get("image_url"),
        "contents":     contents.get("contents", {}),
        "images":       images.get("images", {}),
    }


# ── POST /marketing/publish ───────────────────────────────────────────────────

@app.post("/marketing/publish", response_model=CampaignResponse)
async def publish_campaign(req: CampaignRequest):
    """Publie le contenu sur les plateformes — avec contenu édité si fourni."""

    result = await process_marketing_campaign(
        owner_id        = req.owner_id,
        vehicule_id     = req.vehicule_id,
        campaign_config = {
            "platforms":        req.platforms,
            "tone":             req.tone,
            "language":         req.language,
            "promo_price":      req.promo_price,
            "custom_contents":  req.custom_contents,  # ← texte édité par l'owner
        }
    )
    return result


# ── GET /marketing/analytics/{post_id} ───────────────────────────────────────

@app.get("/marketing/analytics/{post_id}")
async def get_analytics(post_id: str, platform: str = "facebook"):
    from mcp.social_tools import execute_marketing_tool
    return await execute_marketing_tool("get_post_analytics", {
        "post_id": post_id, "platform": platform
    })


# ── GET /health ───────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "service": "marketing-orchestrator"}