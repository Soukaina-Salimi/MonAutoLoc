# agent-orchestrator/agents/dispo_agent.py
# RÔLE : Vérifie les disponibilités

from mcp.tools import execute_tool


async def run(params: dict, vehicule_results: dict) -> dict:
    """Vérifie la disponibilité pour les véhicules trouvés."""

    start_date = params.get("start_date")
    end_date   = params.get("end_date")

    if not start_date or not end_date:
        return {"checked": False, "reason": "Dates non fournies"}

    vehicules = vehicule_results.get("vehicules", [])
    if not vehicules:
        return {"checked": False, "reason": "Aucun véhicule à vérifier"}

    availability_results = []

    # Vérifier max 3 véhicules pour limiter les appels
    for v in vehicules[:3]:
        if not v.get("id"):
            continue
        result = await execute_tool("check_availability", {
            "vehicule_id": v["id"],
            "start_date":  start_date,
            "end_date":    end_date,
        })
        availability_results.append({
            "vehicule_id": v["id"],
            "brand":       v.get("brand"),
            "model":       v.get("model"),
            "available":   result.get("available", False),
            "nb_days":     result.get("nb_days", 0),
        })

    return {
        "checked":      True,
        "start_date":   start_date,
        "end_date":     end_date,
        "results":      availability_results,
    }