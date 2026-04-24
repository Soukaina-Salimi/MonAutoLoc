# agent-orchestrator/agents/orchestrator.py
# RÔLE : Coordonne tous les agents via A2A

import asyncio

from agents import extraction_agent
from agents import vehicule_agent
from agents import service_agent
from agents import prix_agent
from agents import formatage_agent
from agents import securite_agent
from agents import dispo_agent

async def process(message: str, history: list, context: dict) -> dict:
    """
    Pipeline A2A complet :
    1. Extraction → comprendre la demande
    2. Véhicule/Service → rechercher (en parallèle si besoin)
    3. Disponibilité → vérifier les dates
    4. Prix → calculer les tarifs
    5. Formatage → construire la réponse
    6. Sécurité → filtrer
    """

    # ── Étape 1 : Extraction ──────────────────────────────────────────────
    extraction = await extraction_agent.run(message, context)
    intent     = extraction.get("intent", "general_info")
    params     = extraction.get("params", {})

    # ── Étape 2 : Recherche en parallèle ─────────────────────────────────
    vehicules_result = {"vehicules": []}
    services_result  = {"owners": []}

    needs = extraction.get("needs_agents", [])

    if intent in ("search_vehicle", "check_availability", "get_price") or "vehicule" in needs:
        if intent in ("search_service",) or "service" in needs:
            # Les deux en parallèle
            vehicules_result, services_result = await asyncio.gather(
                vehicule_agent.run(params, context),
                service_agent.run(params, context),
            )
        else:
            vehicules_result = await vehicule_agent.run(params, context)

    elif intent == "search_service" or "service" in needs:
        services_result = await service_agent.run(params, context)

    # ── Étape 3 : Disponibilité ───────────────────────────────────────────
    dispo_result = {"checked": False}
    if params.get("start_date") and params.get("end_date") and vehicules_result.get("vehicules"):
        dispo_result = await dispo_agent.run(params, vehicules_result)

    # ── Étape 4 : Prix ────────────────────────────────────────────────────
    prix_result = {"prix_results": []}
    if vehicules_result.get("vehicules"):
        prix_result = await prix_agent.run(params, vehicules_result, dispo_result)

    # ── Étape 5 : Formatage ───────────────────────────────────────────────
    formatted = await formatage_agent.run(
        original_message = message,
        extraction       = extraction,
        vehicules        = vehicules_result,
        services         = services_result,
        dispo            = dispo_result,
        prix             = prix_result,
        context          = context,
        history          = history,
    )

    # ── Étape 6 : Sécurité ────────────────────────────────────────────────
    safe_response = securite_agent.run(formatted["response"])

    return {
        "response":    safe_response,
        "suggestions": formatted.get("suggestions", []),
        # Debug info (à retirer en prod)
        "_debug": {
            "intent":          intent,
            "params":          params,
            "vehicules_count": len(vehicules_result.get("vehicules", [])),
            "services_count":  len(services_result.get("owners", [])),
            "dispo_checked":   dispo_result.get("checked"),
            "prix_count":      len(prix_result.get("prix_results", [])),
        }
    }