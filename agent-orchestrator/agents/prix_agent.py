# agent-orchestrator/agents/prix_agent.py
# RÔLE : Calcule les tarifs

from mcp.tools import execute_tool
from typing import Optional


async def run(params: dict, vehicule_results: dict, dispo_results: dict) -> dict:
    """Calcule les prix pour les véhicules disponibles."""

    with_driver = params.get("offers_driver", False)
    nb_drivers  = params.get("nb_drivers", 1)
    nb_days     = 1  # défaut

    # Récupérer nb_days depuis les résultats de disponibilité
    if dispo_results.get("checked"):
        for r in dispo_results.get("results", []):
            if r.get("nb_days"):
                nb_days = r["nb_days"]
                break

    vehicules    = vehicule_results.get("vehicules", [])
    prix_results = []

    for v in vehicules[:5]:
        if not v.get("price_per_day"):
            continue

        price_result = await execute_tool("calculate_price", {
            "price_per_day":    float(v["price_per_day"]),
            "nb_days":          nb_days,
            "with_driver":      with_driver and v.get("offers_driver", False),
            "nb_drivers":       nb_drivers,
            "driver_daily_rate": float(v.get("driver_daily_rate") or 0),
        })

        prix_results.append({
            "vehicule_id":   v.get("id"),
            "brand":         v.get("brand"),
            "model":         v.get("model"),
            "city":          v.get("city"),
            "image_url":     v.get("image_url"),
            "price_details": price_result,
        })

    # Trier par prix total croissant
    prix_results.sort(key=lambda x: x["price_details"].get("grand_total", 0))

    return {
        "nb_days":      nb_days,
        "with_driver":  with_driver,
        "prix_results": prix_results,
    }