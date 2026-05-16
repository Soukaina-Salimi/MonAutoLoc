# pricing-dynamique/agents/pricing_agent.py

import httpx
import os
import asyncio
import json
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

GROQ_API_KEY    = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL      = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
VEHICLE_SERVICE = os.getenv("VEHICLE_SERVICE_URL", "http://vehicle-service")

# Saison actuelle au Maroc
def _get_current_season() -> str:
    month = datetime.now().month
    if month in (6, 7, 8):   return "été (haute saison)"
    if month in (12, 1, 2):  return "hiver (saison moyenne)"
    if month in (3, 4, 5):   return "printemps (bonne saison)"
    return "automne (saison normale)"


async def suggest_price(
    category:    str,
    city:        str,
    brand:       str,
    model:       str,
    year:        int,
    fuel_type:   str        = "essence",
    transmission:str        = "manuelle",
    seats:       int        = 5,
    offers_driver: bool     = False,
) -> dict:
    """
    Suggère un prix de base pour un nouveau véhicule.
    Appelé uniquement lors de l'ajout d'un véhicule par l'owner.
    """

    # 1. Récupérer les prix du marché local (véhicules similaires)
    market_data = await _get_market_data(city, category)

    # 2. Construire le contexte pour le LLM
    season    = _get_current_season()
    age       = datetime.now().year - (year or 2020)
    market_avg= market_data.get("avg_price", 300)
    market_min= market_data.get("min_price", 150)
    market_max= market_data.get("max_price", 600)
    supply    = market_data.get("count", 10)  # Nombre de véhicules similaires en ville

    # 3. Demander au LLM de suggérer un prix
    prompt = f"""Tu es un expert en tarification de location de véhicules au Maroc.

Un propriétaire ajoute ce véhicule sur AutoRent :
- Marque / Modèle : {brand} {model} ({year})
- Catégorie : {category}
- Ville : {city}
- Carburant : {fuel_type} | Transmission : {transmission}
- Places : {seats} | Avec chauffeur : {'Oui' if offers_driver else 'Non'}
- Âge du véhicule : {age} an(s)

État du marché local à {city} pour la catégorie "{category}" :
- Prix moyen actuel : {market_avg} MAD/jour
- Prix minimum : {market_min} MAD/jour
- Prix maximum : {market_max} MAD/jour
- Nombre de véhicules similaires en ville : {supply}
- Saison actuelle : {season}

Ta mission : suggérer le prix idéal (MAD/jour) pour maximiser les réservations
tout en étant rentable. Tiens compte de :
- La compétitivité par rapport au marché local
- L'état et l'âge du véhicule
- La saison
- L'offre disponible (si beaucoup de concurrence → prix plus bas)

Réponds UNIQUEMENT en JSON valide, rien d'autre :
{{
  "suggested_price": 320,
  "min_price": 270,
  "max_price": 380,
  "explanation": "Explication courte et claire pour l'owner (2-3 phrases max)",
  "reasoning": {{
    "market_position": "compétitif / premium / économique",
    "key_factors": ["facteur 1", "facteur 2"]
  }}
}}"""

    try:
        async with httpx.AsyncClient(timeout=12.0) as client:
            resp = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={"Authorization": f"Bearer {GROQ_API_KEY}"},
                json={
                    "model":       GROQ_MODEL,
                    "messages":    [{"role": "user", "content": prompt}],
                    "max_tokens":  300,
                    "temperature": 0.2,
                }
            )

        content = resp.json()["choices"][0]["message"]["content"].strip()

        # Nettoyer les backticks si présents
        if "```" in content:
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]

        result = json.loads(content.strip())

        return {
            "suggested_price":  result.get("suggested_price", market_avg),
            "min_price":        result.get("min_price"),
            "max_price":        result.get("max_price"),
            "explanation":      result.get("explanation", ""),
            "reasoning":        result.get("reasoning", {}),
            "market_data":      market_data,
            "season":           season,
        }

    except Exception as e:
        logger.warning(f"[pricing_agent] LLM error: {e}")
        # Fallback : suggérer le prix moyen du marché
        return {
            "suggested_price":  market_avg,
            "min_price":        market_min,
            "max_price":        market_max,
            "explanation":      f"Prix basé sur le marché local à {city}. "
                                f"Les véhicules similaires se louent en moyenne {market_avg} MAD/jour.",
            "reasoning":        {"market_position": "compétitif", "key_factors": ["prix marché"]},
            "market_data":      market_data,
            "season":           season,
        }


async def _get_market_data(city: str, category: str) -> dict:
    """
    Récupère les prix des véhicules similaires sur AutoRent.
    Retourne avg, min, max, count.
    """
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(
                f"{VEHICLE_SERVICE}/api/vehicules",
                params={"city": city, "category": category}
            )

        if resp.status_code != 200:
            return _default_market(category)

        data     = resp.json()
        vehicles = data if isinstance(data, list) else data.get("data", [])

        prices = [
            v["price_per_day"]
            for v in vehicles
            if v.get("price_per_day") and v.get("status") == "available"
        ]

        if not prices:
            return _default_market(category)

        return {
            "avg_price": round(sum(prices) / len(prices)),
            "min_price": min(prices),
            "max_price": max(prices),
            "count":     len(prices),
        }

    except Exception as e:
        logger.warning(f"[pricing_agent] Market fetch error: {e}")
        return _default_market(category)


def _default_market(category: str) -> dict:
    """Prix par défaut si pas de données marché (nouveau déploiement)."""
    defaults = {
        "citadine":    {"avg": 250, "min": 180, "max": 350},
        "berline":     {"avg": 350, "min": 250, "max": 500},
        "suv":         {"avg": 500, "min": 350, "max": 800},
        "4x4":         {"avg": 600, "min": 400, "max": 900},
        "utilitaire":  {"avg": 400, "min": 300, "max": 600},
        "luxe":        {"avg": 900, "min": 600, "max": 1500},
        "minibus":     {"avg": 700, "min": 500, "max": 1000},
    }
    cat  = category.lower()
    data = defaults.get(cat, {"avg": 350, "min": 200, "max": 600})
    return {
        "avg_price": data["avg"],
        "min_price": data["min"],
        "max_price": data["max"],
        "count":     0,  # Pas de données locales
    }