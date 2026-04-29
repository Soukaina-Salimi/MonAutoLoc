from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import httpx
import os

from agents.marketing_orchestrator import process_marketing_campaign
from agents import content_agent   # ← import manquant

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
            resp = await client.get(f"{VEHICLE_SERVICE_URL}/api/vehicules/{vehicule_id}")
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
        print(f"[_fetch_vehicle] Error: {e}")
        return None


# ── POST /marketing/preview ───────────────────────────────────────────────────

@app.post("/marketing/preview")
async def preview_campaign(req: CampaignRequest):
    """Génère le contenu sans publier — pour aperçu et édition."""

    vehicle_data = await _fetch_vehicle(req.vehicule_id)
    if not vehicle_data:
        raise HTTPException(status_code=404, detail="Véhicule introuvable")

    # Générer le contenu via ContentAgent
    contents = await content_agent.run(vehicle_data, {
        "platforms":   req.platforms,
        "tone":        req.tone,
        "language":    req.language,
        "promo_price": req.promo_price,
    })

    return {
        "success":      True,
        "vehicle":      f"{vehicle_data['brand']} {vehicle_data['model']}",
        "image_url":    vehicle_data.get("image_url"),
        "contents":     contents.get("contents", {}),
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