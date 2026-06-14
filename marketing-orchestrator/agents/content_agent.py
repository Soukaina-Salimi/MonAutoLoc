# MarketingOrchestratorAgent/agents/content_agent.py
import time
import logging
from mcp.social_tools import execute_marketing_tool

logger = logging.getLogger("marketing_orchestrator")


async def run(vehicle_data: dict, campaign_config: dict) -> dict:
    """Génère le contenu pour chaque plateforme demandée."""
    platforms = campaign_config.get("platforms", ["facebook"])
    tone      = campaign_config.get("tone", "professionnel")
    language  = campaign_config.get("language", "fr")
    promo     = campaign_config.get("promo_price")

    logger.info(
        f"[MARKETING][CONTENT] ▶ START | platforms={platforms} | "
        f"tone={tone} | lang={language} | promo={promo or '—'}"
    )

    results = {}
    for platform in platforms:
        t0 = time.time()
        content_result = await execute_marketing_tool("generate_content", {
            "vehicle_data": vehicle_data,
            "platform":     platform,
            "tone":         tone,
            "language":     language,
            "promo_price":  promo,
        })
        dur = round((time.time() - t0) * 1000)
        results[platform] = content_result

        char_count = content_result.get("char_count", 0)
        preview    = content_result.get("content", "")[:100].replace("\n", " ")

        logger.info(
            f"[MARKETING][CONTENT] ✓ platform={platform} | {dur}ms | chars={char_count}"
        )
        logger.info(
            f"[MARKETING][CONTENT]   preview [{platform}]: "
            f"{preview}{'...' if char_count > 100 else ''}"
        )

    logger.info(f"[MARKETING][CONTENT] ▶ END | {len(results)} contenu(s) généré(s)")

    return {
        "contents":  results,
        "platforms": platforms,
    }