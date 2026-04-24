# agent-orchestrator/agents/service_agent.py
# RÔLE : Recherche les prestataires de services

from mcp.tools import execute_tool


async def run(params: dict, context: dict) -> dict:
    """Recherche des prestataires selon le type de service."""

    service_type = params.get("service_type")

    # Déduire depuis le contexte de page
    if not service_type:
        page_service_map = {
            "bagages":      "transport_bagages",
            "livraison":    "livraison_colis",
            "demenagement": "demenagement",
        }
        service_type = page_service_map.get(context.get("page", ""))

    if not service_type:
        return {"owners": [], "error": "service_type non déterminé"}

    mcp_params = {"service_type": service_type}
    if params.get("city"):
        mcp_params["city"] = params["city"]

    owners = await execute_tool("search_service_owners", mcp_params)
    return {"owners": owners[:6], "service_type": service_type}