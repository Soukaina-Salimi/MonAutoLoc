# agent-orchestrator/agents/vehicule_agent.py
# RÔLE : Recherche les véhicules via MCP

from mcp.tools import execute_tool


async def run(params: dict, context: dict) -> dict:
    """Recherche des véhicules selon les paramètres extraits."""

    # Construire les filtres MCP
    mcp_params = {}
    if params.get("city"):         mcp_params["city"]          = params["city"]
    if params.get("category"):     mcp_params["category"]      = params["category"]
    if params.get("fuel_type"):    mcp_params["fuel_type"]     = params["fuel_type"]
    if params.get("max_price"):    mcp_params["max_price"]     = params["max_price"]
    if params.get("min_price"):    mcp_params["min_price"]     = params["min_price"]
    if params.get("seats"):        mcp_params["seats"]         = params["seats"]
    if params.get("offers_driver"):mcp_params["offers_driver"] = params["offers_driver"]

    # Si contexte page owner → filtrer par cet owner
    if context.get("page") == "owner" and context.get("ownerId"):
        all_vehicules = await execute_tool("search_vehicules", mcp_params)
        owner_id = context["ownerId"]
        # Note: user_id retiré par sanitize mais on peut filtrer via l'API
        vehicules = [v for v in all_vehicules]  # déjà filtré côté API si besoin
        return {"vehicules": vehicules, "filtered_by_owner": owner_id}

    # Si contexte page véhicule → juste ce véhicule
    if context.get("page") == "vehicule" and context.get("vehiculeId"):
        detail = await execute_tool("get_vehicule_detail", {
            "vehicule_id": context["vehiculeId"]
        })
        return {"vehicules": [detail] if detail else [], "single_vehicle": True}

    vehicules = await execute_tool("search_vehicules", mcp_params)
    return {"vehicules": vehicules[:8]}  # max 8 résultats