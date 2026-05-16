# agent-orchestrator/agents/orchestrator.py

import asyncio
import time
import logging
from cache.redis_client import RedisClient
from agents import (
    extraction_agent,
    vehicule_agent,
    service_agent,
    dispo_agent,
    prix_agent,
    formatage_agent,
    securite_agent,
)

logger = logging.getLogger(__name__)

# ── Limites par type d'utilisateur ────────────────────────────────────────────
RATE_LIMITS = {
    "authenticated": 20,   # 20 messages/min si connecté
    "anonymous":     8,    # 8 messages/min si visiteur
}


async def process(
    message:    str,
    history:    list,
    context:    dict,
    session_id: str = "anonymous",
    user_id:    int = None,
    ip_address: str = None,
) -> dict:

    start_time = time.time()
    redis      = await RedisClient.get()

    # ── 1. Rate Limiting ──────────────────────────────────────────────────
    identifier  = f"user:{user_id}" if user_id else f"ip:{ip_address or session_id}"
    user_type   = "authenticated" if user_id else "anonymous"
    max_per_min = RATE_LIMITS[user_type]

    rate_check = await redis.check_rate_limit(identifier, max_per_min)
    if not rate_check["allowed"]:
        return {
            "response":      f"⚠️ Vous envoyez trop de messages. Patientez {rate_check['reset_in']} seconde(s).",
            "suggestions":   [],
            "rate_limited":  True,
            "reset_in":      rate_check["reset_in"],
            "log_id":        None,  # ← pas de log pour rate limit
        }

    # ── 2. Mémoire utilisateur ────────────────────────────────────────────
    memory           = await redis.get_user_memory(session_id)
    enriched_context = _enrich_context_with_memory(context, memory)

    # ── 3. Cache ──────────────────────────────────────────────────────────
    is_cacheable = _is_cacheable(message, context)
    if is_cacheable:
        cached = await redis.get_cached_response(message, enriched_context)
        if cached:
            await _update_memory_after_response(redis, session_id, message, cached, {})
            # Pour le cache — logger quand même mais avec used_cache=True
            log_id = await _log_to_db({
                "user_id":           user_id,
                "session_id":        session_id,
                "ip_address":        ip_address,
                "user_message":      message,
                "bot_response":      cached.get("response", ""),
                "intent":            cached.get("_meta", {}).get("intent", "cached"),
                "extracted_params":  {},
                "page_context":      context.get("page", "general"),
                "response_time_ms":  round((time.time() - start_time) * 1000),
                "agents_called":     0,
                "used_cache":        True,   # ← marqué comme cache
                "vehicules_returned":0,
                "services_returned": 0,
            })
            cached["log_id"] = log_id        # ← log_id à la racine
            cached["_meta"]  = {
                **cached.get("_meta", {}),
                "from_cache":    True,
                "response_time": round((time.time() - start_time) * 1000),
            }
            return cached

    # ── 4. Pipeline Agents ────────────────────────────────────────────────
    agents_called = 0

    extraction = await extraction_agent.run(message, enriched_context)
    intent     = extraction.get("intent", "general_info")
    params     = extraction.get("params", {})
    agents_called += 1

    params = _enrich_params_with_memory(params, memory)

    vehicules_result = {"vehicules": []}
    services_result  = {"owners": []}
    needs            = extraction.get("needs_agents", [])

    if intent in ("search_vehicle", "check_availability", "get_price") or "vehicule" in needs:
        if "service" in needs:
            vehicules_result, services_result = await asyncio.gather(
                vehicule_agent.run(params, enriched_context),
                service_agent.run(params, enriched_context),
            )
            agents_called += 2
        else:
            vehicules_result = await vehicule_agent.run(params, enriched_context)
            agents_called += 1
    elif intent == "search_service" or "service" in needs:
        services_result = await service_agent.run(params, enriched_context)
        agents_called += 1

    dispo_result = {"checked": False}
    if params.get("start_date") and params.get("end_date") and vehicules_result.get("vehicules"):
        dispo_result = await dispo_agent.run(params, vehicules_result)
        agents_called += 1

    prix_result = {"prix_results": []}
    if vehicules_result.get("vehicules"):
        prix_result = await prix_agent.run(params, vehicules_result, dispo_result)
        agents_called += 1

    formatted = await formatage_agent.run(
        original_message = message,
        extraction       = extraction,
        vehicules        = vehicules_result,
        services         = services_result,
        dispo            = dispo_result,
        prix             = prix_result,
        context          = enriched_context,
        history          = memory.get("history", [])[-6:],
    )
    agents_called += 1

    safe_response    = securite_agent.run(formatted["response"])
    agents_called   += 1
    response_time_ms = round((time.time() - start_time) * 1000)

    # ── 5. Logger ET récupérer le log_id ──────────────────────────────────
    await redis.increment_intent_counter(intent)
    log_id = await _log_to_db({
        "user_id":           user_id,
        "session_id":        session_id,
        "ip_address":        ip_address,
        "user_message":      message,
        "bot_response":      safe_response,
        "intent":            intent,
        "extracted_params":  params,
        "page_context":      context.get("page", "general"),
        "response_time_ms":  response_time_ms,
        "agents_called":     agents_called,
        "used_cache":        False,
        "vehicules_returned":len(vehicules_result.get("vehicules", [])),
        "services_returned": len(services_result.get("owners", [])),
    })

    # ── 6. Construire le résultat avec log_id à la RACINE ─────────────────
    result = {
        "response":    safe_response,
        "suggestions": formatted.get("suggestions", []),
        "log_id":      log_id,          # ← ICI à la racine — pas dans _meta
        "_meta": {
            "intent":        intent,
            "agents_called": agents_called,
            "response_time": response_time_ms,
            "from_cache":    False,
            "session_id":    session_id,
        }
    }

    # ── 7. Cache + mémoire ────────────────────────────────────────────────
    if is_cacheable and not result.get("error"):
        await redis.set_cached_response(message, enriched_context, result)

    await _update_memory_after_response(redis, session_id, message, result, {
        "intent":    intent,
        "params":    params,
        "vehicules": vehicules_result,
        "services":  services_result,
    })

    return result

# ── Helpers ────────────────────────────────────────────────────────────────────

def _is_cacheable(message: str, context: dict) -> bool:
    """
    Détermine si la réponse peut être mise en cache.
    On ne cache PAS les questions très personnalisées.
    """
    msg_lower = message.lower().strip()

    # Ne pas cacher les salutations (rapides, inutile)
    greetings = ["bonjour", "salut", "bonsoir", "hello", "hi", "salam"]
    if any(msg_lower.startswith(g) for g in greetings):
        return False

    # Ne pas cacher si contexte trop spécifique (vehicule précis)
    if context.get("vehiculeId") or context.get("page") == "vehicule":
        return False

    # Cacher les recherches génériques
    cacheable_intents = ["search_vehicle", "search_service", "general_info"]
    return True


def _enrich_context_with_memory(context: dict, memory: dict) -> dict:
    """Enrichit le contexte avec les préférences mémorisées."""
    enriched = dict(context)
    enriched["_memory"] = {
        "message_count":    memory.get("message_count", 0),
        "last_city":        memory.get("last_city"),
        "last_category":    memory.get("last_category"),
        "preferred_budget": memory.get("preferred_budget"),
        "interests":        memory.get("interests", []),
        "is_returning":     memory.get("message_count", 0) > 0,
    }
    return enriched


def _enrich_params_with_memory(params: dict, memory: dict) -> dict:
    """Utilise la mémoire pour compléter les params manquants."""
    enriched = dict(params)

    # Si pas de ville → utiliser la dernière ville mémorisée
    if not enriched.get("city") and memory.get("last_city"):
        enriched["city"]           = memory["last_city"]
        enriched["_city_from_mem"] = True

    # Si pas de budget → utiliser le budget préféré
    if not enriched.get("max_price") and memory.get("preferred_budget"):
        enriched["max_price"]         = memory["preferred_budget"]
        enriched["_budget_from_mem"]  = True

    return enriched


async def _update_memory_after_response(
    redis:      RedisClient,
    session_id: str,
    message:    str,
    result:     dict,
    extra:      dict,
) -> None:
    """Met à jour la mémoire utilisateur après chaque échange."""
    updates = {
        "history": [
            {"role": "user",      "content": message},
            {"role": "assistant", "content": result.get("response", "")},
        ],
    }

    params = extra.get("params", {})

    # Mémoriser la ville si mentionnée
    if params.get("city"):
        updates["last_city"] = params["city"]

    # Mémoriser la catégorie
    if params.get("category"):
        updates["last_category"] = params["category"]

    # Mémoriser le budget
    if params.get("max_price"):
        updates["preferred_budget"] = params["max_price"]

    # Mémoriser les intérêts
    vehicules = extra.get("vehicules", {}).get("vehicules", [])
    if vehicules:
        updates["viewed_vehicules"] = [v["id"] for v in vehicules if v.get("id")]

    # Intérêts déduits
    services = extra.get("services", {}).get("owners", [])
    if services:
        st = extra.get("services", {}).get("service_type", "")
        if st:
            updates["interests"] = [st]

    await redis.update_user_memory(session_id, updates)


# Dans orchestrator.py — modifier _log_to_db pour retourner l'ID

async def _log_to_db(log_data: dict) -> int | None:
    """Envoie les logs analytics à auth-service — retourne l'ID créé."""
    import httpx
    import os
    AUTH_SERVICE_URL = os.getenv("AUTH_SERVICE_URL", "http://auth-service")
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp = await client.post(
                f"{AUTH_SERVICE_URL}/api/internal/chat-logs",
                json=log_data
            )
        if resp.status_code == 201:
            return resp.json().get("id")  # ← retourner l'ID
        return None
    except Exception as e:
        logger.warning(f"Chat log failed: {e}")
        return None

