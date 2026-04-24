# agent-orchestrator/agents/extraction_agent.py
# RÔLE : Comprend la demande et extrait les intentions + paramètres

import json
import os
import httpx
from typing import Optional

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL   = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")


async def run(message: str, context: dict) -> dict:
    """
    Analyse le message utilisateur et extrait :
    - intent : ce que veut l'utilisateur
    - params : les paramètres structurés
    - needs_agents : quels agents appeler ensuite
    """

    system_prompt = """Tu es un agent d'extraction d'intentions pour une plateforme de location au Maroc.

Analyse le message et retourne UNIQUEMENT un JSON avec :
{
  "intent": "search_vehicle" | "search_service" | "check_availability" | "get_price" | "general_info" | "greeting",
  "params": {
    "city": null,
    "category": null,
    "fuel_type": null,
    "max_price": null,
    "min_price": null,
    "seats": null,
    "offers_driver": null,
    "service_type": null,
    "start_date": null,
    "end_date": null,
    "vehicule_id": null,
    "owner_id": null
  },
  "needs_agents": ["vehicule", "service", "dispo", "prix"],
  "language_budget_hint": null
}

Règles de conversion :
- "pas cher" / "économique" → max_price: 300
- "luxe" / "premium" → min_price: 800
- "famille" / "7 places" → seats: 7
- "bagages" / "valises" → service_type: "transport_bagages"
- "déménagement" → service_type: "demenagement"
- "livraison" / "colis" → service_type: "livraison_colis"
- "avec chauffeur" → offers_driver: true
- Ville mentionnée → extraire dans city
- Dates mentionnées → extraire start_date / end_date au format YYYY-MM-DD

Retourne UNIQUEMENT le JSON, sans texte avant ou après."""

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={"Authorization": f"Bearer {GROQ_API_KEY}"},
                json={
                    "model": GROQ_MODEL,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user",   "content": message},
                    ],
                    "max_tokens":  300,
                    "temperature": 0.0,
                    "response_format": {"type": "json_object"},
                }
            )

        result = resp.json()["choices"][0]["message"]["content"]
        return json.loads(result)

    except Exception as e:
        return {
            "intent":       "general_info",
            "params":       {},
            "needs_agents": [],
            "error":        str(e),
        }