# pricing-dynamique/agents/pricing_agent.py

import httpx
import os
import asyncio
import json
import time
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
    pipeline_start = time.time()
    
    logger.info("-" * 70)
    logger.info("🏁 PIPELINE PRICING - DÉBUT")
    logger.info("-" * 70)
    
    # ══════════════════════════════════════════════════════════════════════
    # STEP 1: Récupération des données de marché
    # ══════════════════════════════════════════════════════════════════════
    logger.info("[STEP 1] 📊 Récupération des prix du marché local...")
    t0 = time.time()
    market_data = await _get_market_data(city, category)
    t_market = round((time.time() - t0) * 1000)
    
    market_avg = market_data.get("avg_price", 300)
    market_min = market_data.get("min_price", 150)
    market_max = market_data.get("max_price", 600)
    supply = market_data.get("count", 0)
    
    logger.info(f"[STEP 1] ✅ Données marché récupérées | {t_market}ms")
    logger.info(f"          • Ville: {city}")
    logger.info(f"          • Catégorie: {category}")
    logger.info(f"          • Véhicules similaires: {supply}")
    logger.info(f"          • Prix moyen: {market_avg} MAD/jour")
    logger.info(f"          • Fourchette: [{market_min} - {market_max}] MAD/jour")
    
    if supply == 0:
        logger.warning(f"[STEP 1] ⚠️ Aucune donnée marché disponible → utilisation valeurs par défaut")
        logger.info(f"          • Valeurs par défaut: min={market_min}, avg={market_avg}, max={market_max}")
    
    # ══════════════════════════════════════════════════════════════════════
    # STEP 2: Calcul des paramètres contextuels
    # ══════════════════════════════════════════════════════════════════════
    logger.info("[STEP 2] 📐 Calcul des paramètres contextuels...")
    
    season = _get_current_season()
    current_year = datetime.now().year
    age = current_year - (year or 2020)
    
    logger.info(f"[STEP 2] ✅ Paramètres calculés:")
    logger.info(f"          • Saison actuelle: {season}")
    logger.info(f"          • Âge du véhicule: {age} an(s)")
    logger.info(f"          • Année actuelle: {current_year}")
    
    # Calcul d'un prix basé sur des règles (pour comparaison)
    age_factor = max(0.7, 1 - (age / 20))
    rule_based_price = round(market_avg * age_factor)
    logger.info(f"          • Facteur âge: {age_factor:.2f}")
    logger.info(f"          • Prix règles métier: {rule_based_price} MAD/jour")
    
    # ══════════════════════════════════════════════════════════════════════
    # STEP 3: Construction du prompt pour Groq LLM
    # ══════════════════════════════════════════════════════════════════════
    logger.info("[STEP 3] 🤖 Construction du prompt pour Groq LLaMA...")
    
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

    logger.info(f"[STEP 3] ✅ Prompt construit | Longueur: {len(prompt)} caractères")
    logger.info(f"          • Modèle Groq: {GROQ_MODEL}")
    logger.info(f"          • Temperature: 0.2")
    logger.info(f"          • Max tokens: 300")
    
    # ══════════════════════════════════════════════════════════════════════
    # STEP 4: Appel à Groq LLaMA
    # ══════════════════════════════════════════════════════════════════════
    logger.info("[STEP 4] 🌐 Appel à l'API Groq LLaMA...")
    t0 = time.time()
    
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
        
        t_llm = round((time.time() - t0) * 1000)
        logger.info(f"[STEP 4] ✅ Groq LLM répondu | {t_llm}ms | Status: {resp.status_code}")
        
        content = resp.json()["choices"][0]["message"]["content"].strip()
        logger.info(f"[STEP 4] 📝 Réponse brute (premier 200 chars): {content[:200]}...")
        
        # Nettoyer les backticks si présents
        if "```" in content:
            logger.info("[STEP 4] 🔧 Nettoyage des backticks détectés")
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]
        
        result = json.loads(content.strip())
        
        suggested_price = result.get("suggested_price", market_avg)
        min_price = result.get("min_price")
        max_price = result.get("max_price")
        
        logger.info(f"[STEP 4] ✅ JSON parsé avec succès")
        logger.info(f"          • Prix suggéré: {suggested_price} MAD/jour")
        logger.info(f"          • Fourchette basse: {min_price} MAD/jour")
        logger.info(f"          • Fourchette haute: {max_price} MAD/jour")
        logger.info(f"          • Position marché: {result.get('reasoning', {}).get('market_position', '?')}")
        logger.info(f"          • Facteurs clés: {result.get('reasoning', {}).get('key_factors', [])}")
        
        final_result = {
            "suggested_price":  suggested_price,
            "min_price":        min_price,
            "max_price":        max_price,
            "explanation":      result.get("explanation", ""),
            "reasoning":        result.get("reasoning", {}),
            "market_data":      market_data,
            "season":           season,
        }
        
    except Exception as e:
        t_llm = round((time.time() - t0) * 1000)
        logger.warning(f"[STEP 4] ❌ LLM error | {t_llm}ms | {e}")
        logger.info("[STEP 4] 🔄 Fallback vers prix moyen du marché")
        
        final_result = {
            "suggested_price":  market_avg,
            "min_price":        market_min,
            "max_price":        market_max,
            "explanation":      f"Prix basé sur le marché local à {city}. "
                                f"Les véhicules similaires se louent en moyenne {market_avg} MAD/jour.",
            "reasoning":        {"market_position": "compétitif", "key_factors": ["prix marché"]},
            "market_data":      market_data,
            "season":           season,
        }
        
        logger.info(f"[STEP 4] 📊 Fallback appliqué | Prix: {market_avg} MAD/jour")
    
    # ══════════════════════════════════════════════════════════════════════
    # STEP 5: Validation et ajustements finaux
    # ══════════════════════════════════════════════════════════════════════
    logger.info("[STEP 5] ✅ Validation des résultats...")
    
    suggested = final_result["suggested_price"]
    
    # Empêcher les aberrations
    if suggested > market_max * 1.5 and market_max > 0:
        logger.warning(f"[STEP 5] ⚠️ Prix trop élevé ({suggested} > {market_max*1.5}) → ajustement")
        suggested = market_max
        final_result["suggested_price"] = suggested
    elif suggested < market_min * 0.5 and market_min > 0:
        logger.warning(f"[STEP 5] ⚠️ Prix trop bas ({suggested} < {market_min*0.5}) → ajustement")
        suggested = market_min
        final_result["suggested_price"] = suggested
    
    # Calcul de l'écart par rapport au marché
    if market_avg > 0:
        deviation_pct = round((suggested - market_avg) / market_avg * 100, 1)
        if deviation_pct > 0:
            logger.info(f"[STEP 5] 📈 Prix {deviation_pct}% au-dessus de la moyenne du marché")
        elif deviation_pct < 0:
            logger.info(f"[STEP 5] 📉 Prix {abs(deviation_pct)}% en-dessous de la moyenne du marché")
        else:
            logger.info(f"[STEP 5] 📊 Prix aligné avec la moyenne du marché")
    
    # ══════════════════════════════════════════════════════════════════════
    # PIPELINE SUMMARY
    # ══════════════════════════════════════════════════════════════════════
    total_ms = round((time.time() - pipeline_start) * 1000)
    
    logger.info("-" * 70)
    logger.info("🏁 PIPELINE PRICING - RÉSUMÉ FINAL")
    logger.info("-" * 70)
    logger.info(f"⏱️  Temps total: {total_ms}ms")
    logger.info(f"   • Récupération marché: {t_market}ms")
    logger.info(f"   • Appel Groq LLM: {t_llm if 't_llm' in dir() else '?'}ms")
    logger.info("")
    logger.info(f"💰 PRICE SUGGESTION FINALE:")
    logger.info(f"   • Prix suggéré: {final_result['suggested_price']} MAD/jour")
    logger.info(f"   • Fourchette recommandée: {final_result['min_price']} - {final_result['max_price']} MAD/jour")
    logger.info(f"   • Justification: {final_result['explanation'][:150]}...")
    logger.info("-" * 70)
    
    return final_result


async def _get_market_data(city: str, category: str) -> dict:
    """
    Récupère les prix des véhicules similaires sur AutoRent.
    Retourne avg, min, max, count.
    """
    t0 = time.time()
    
    logger.info(f"[MARKET] 🔍 Recherche de véhicules similaires...")
    logger.info(f"         • Ville: {city}")
    logger.info(f"         • Catégorie: {category}")
    
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(
                f"{VEHICLE_SERVICE}/api/vehicules",
                params={"city": city, "category": category}
            )
        
        t_http = round((time.time() - t0) * 1000)
        logger.info(f"[MARKET] 📡 HTTP GET | {t_http}ms | Status: {resp.status_code}")

        if resp.status_code != 200:
            logger.warning(f"[MARKET] ⚠️ HTTP {resp.status_code} → utilisation valeurs par défaut")
            return _default_market(category)

        data = resp.json()
        vehicles = data if isinstance(data, list) else data.get("data", [])
        
        logger.info(f"[MARKET] 📊 {len(vehicles)} véhicules trouvés dans la catégorie '{category}' à {city}")

        prices = [
            v["price_per_day"]
            for v in vehicles
            if v.get("price_per_day") and v.get("status") == "available"
        ]

        if not prices:
            logger.warning(f"[MARKET] ⚠️ Aucun prix valide trouvé → utilisation valeurs par défaut")
            return _default_market(category)

        avg_price = round(sum(prices) / len(prices))
        min_price = min(prices)
        max_price = max(prices)
        
        logger.info(f"[MARKET] ✅ Statistiques calculées:")
        logger.info(f"         • Véhicules analysés: {len(prices)}")
        logger.info(f"         • Prix moyen: {avg_price} MAD/jour")
        logger.info(f"         • Prix min: {min_price} MAD/jour")
        logger.info(f"         • Prix max: {max_price} MAD/jour")
        
        # Afficher la distribution des prix
        price_ranges = [(0, 200), (200, 400), (400, 600), (600, 800), (800, 1000), (1000, float('inf'))]
        for low, high in price_ranges:
            count = sum(1 for p in prices if low <= p < high)
            if count > 0:
                range_str = f"{low}-{high}" if high != float('inf') else f"{low}+"
                logger.info(f"[MARKET]         • {range_str} MAD: {count} véhicule(s)")

        return {
            "avg_price": avg_price,
            "min_price": min_price,
            "max_price": max_price,
            "count":     len(prices),
        }

    except Exception as e:
        t_http = round((time.time() - t0) * 1000)
        logger.error(f"[MARKET] ❌ Erreur | {t_http}ms | {e}")
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
    cat = category.lower()
    data = defaults.get(cat, {"avg": 350, "min": 200, "max": 600})
    
    logger.info(f"[MARKET] 📋 Valeurs par défaut pour catégorie '{category}':")
    logger.info(f"         • Prix moyen: {data['avg']} MAD/jour")
    logger.info(f"         • Fourchette: [{data['min']} - {data['max']}] MAD/jour")
    
    return {
        "avg_price": data["avg"],
        "min_price": data["min"],
        "max_price": data["max"],
        "count":     0,  # Pas de données locales
    }