# MarketingOrchestratorAgent/agents/content_agent.py

from mcp.social_tools import execute_marketing_tool


async def run(vehicle_data: dict, campaign_config: dict) -> dict:
    """Génère le contenu pour chaque plateforme demandée."""

    platforms = campaign_config.get("platforms", ["facebook"])
    tone      = campaign_config.get("tone", "professionnel")
    language  = campaign_config.get("language", "fr")
    promo     = campaign_config.get("promo_price")

    results = {}

    for platform in platforms:
        content_result = await execute_marketing_tool("generate_content", {
            "vehicle_data": vehicle_data,
            "platform":     platform,
            "tone":         tone,
            "language":     language,
            "promo_price":  promo,
        })
        results[platform] = content_result

    return {
        "contents":  results,
        "platforms": platforms,
    }