# MarketingOrchestratorAgent/agents/marketing_orchestrator.py
import httpx
import os
import logging
from agents import content_agent, publish_agent

logger = logging.getLogger("marketing_orchestrator")
logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(message)s")


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
    logger.info(
        f"[MARKETING] === Démarrage campagne === owner_id={owner_id} "
        f"vehicule_id={vehicule_id} platforms={campaign_config.get('platforms')}"
    )

    vehicle_data = await _fetch_vehicle(vehicule_id)
    if not vehicle_data:
        logger.error(f"[MARKETING] Véhicule introuvable id={vehicule_id}")
        return {"success": False, "error": "Véhicule introuvable"}

    logger.info(
        f"[MARKETING] Véhicule récupéré: {vehicle_data['brand']} {vehicle_data['model']} "
        f"({vehicle_data.get('year')}) — {vehicle_data.get('price_per_day')} MAD/jour "
        f"— ville={vehicle_data.get('city')}"
    )

    custom_contents = campaign_config.get("custom_contents")

    # Si l'owner a édité le contenu dans le preview → l'utiliser directement
    if custom_contents:
        logger.info(
            f"[MARKETING] ContentAgent BYPASS — contenu personnalisé fourni par l'owner "
            f"pour les plateformes: {list(custom_contents.keys())}"
        )
        contents = {
            "contents": {
                platform: {"content": text}
                for platform, text in custom_contents.items()
            }
        }
    else:
        # Sinon générer via ContentAgent
        logger.info(
            f"[MARKETING] ContentAgent → génération via Groq pour "
            f"platforms={campaign_config.get('platforms')} "
            f"tone={campaign_config.get('tone')} lang={campaign_config.get('language')}"
        )
        contents = await content_agent.run(vehicle_data, campaign_config)

        for platform, data in contents.get("contents", {}).items():
            content_text = data.get("content", "")
            logger.info(
                f"[MARKETING] ContentAgent ✓ platform={platform} "
                f"chars={len(content_text)}"
            )
            logger.info(
                f"[MARKETING] ContentAgent preview [{platform}]: "
                f"{content_text[:120]}{'...' if len(content_text) > 120 else ''}"
            )

    logger.info(
        f"[MARKETING] PublishAgent → démarrage publication parallèle "
        f"platforms={list(contents.get('contents', {}).keys())}"
    )

    publish_result = await publish_agent.run(
        contents         = contents,
        vehicle_data     = vehicle_data,
        owner_id         = owner_id,
        campaign_config  = campaign_config,
    )

    for pub in publish_result["published"]:
        if pub.get("success"):
            logger.info(
                f"[MARKETING] PublishAgent ✓ platform={pub.get('platform')} "
                f"post_id={pub.get('post_id')} url={pub.get('post_url')}"
            )
        else:
            logger.warning(
                f"[MARKETING] PublishAgent ✗ platform={pub.get('platform')} "
                f"code={pub.get('code')} error={pub.get('error')}"
            )

    successful = [p for p in publish_result["published"] if p.get("success")]
    failed     = [p for p in publish_result["published"] if not p.get("success")]

    logger.info(
        f"[MARKETING] === Fin campagne === success={len(successful) > 0} "
        f"published_count={len(successful)} failed_count={len(failed)}"
    )

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
    """Helper local — même logique que dans main.py."""
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
        logger.error(f"[MARKETING] Erreur _fetch_vehicle: {e}")
        return None