# MarketingOrchestratorAgent/agents/marketing_orchestrator.py

import httpx
import os
from agents import content_agent, publish_agent


async def process_marketing_campaign(
    owner_id:        int,
    vehicule_id:     int,
    campaign_config: dict,
) -> dict:
    """
    Pipeline complet :
    1. Récupérer les données du véhicule
    2. ContentAgent → générer le contenu
    3. PublishAgent → publier sur les plateformes
    4. Retourner le résumé
    """

    # ── Étape 1 : Récupérer le véhicule ──────────────────────────────────
    vehicle_data = await _fetch_vehicle(vehicule_id)
    if not vehicle_data:
        return {"success": False, "error": "Véhicule introuvable"}

    # ── Étape 2 : Générer le contenu ──────────────────────────────────────
    contents = await content_agent.run(vehicle_data, campaign_config)

    # ── Étape 3 : Publier ─────────────────────────────────────────────────
    publish_result = await publish_agent.run(
        contents         = contents,
        vehicle_data     = vehicle_data,
        owner_id         = owner_id,
        campaign_config  = campaign_config,
    )

    # ── Résumé ────────────────────────────────────────────────────────────
    successful = [p for p in publish_result["published"] if p.get("success")]
    failed     = [p for p in publish_result["published"] if not p.get("success")]

    return {
        "success":          len(successful) > 0,
        "vehicle":          f"{vehicle_data['brand']} {vehicle_data['model']}",
        "published_count":  len(successful),
        "failed_count":     len(failed),
        "publications":     publish_result["published"],
        "contents_preview": {
            platform: data.get("content", "")[:150] + "..."
            for platform, data in contents.get("contents", {}).items()
        },
    }


async def _fetch_vehicle(vehicule_id: int) -> dict | None:
    VEHICLE_SERVICE_URL = os.getenv("VEHICLE_SERVICE_URL", "http://vehicle-service")
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(f"{VEHICLE_SERVICE_URL}/api/vehicules/{vehicule_id}")
        if resp.status_code == 200:
            v = resp.json()
            # Sanitize — pas de données sensibles
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
    except Exception:
        return None