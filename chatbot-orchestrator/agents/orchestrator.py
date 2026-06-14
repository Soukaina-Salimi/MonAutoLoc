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
    "authenticated": 20,
    "anonymous":     8,
}

# ── Helper logging ─────────────────────────────────────────────────────────────
def _log_agent(name: str, status: str, duration_ms: int, detail: str = ""):
    """
    Affiche un log structuré et lisible pour chaque agent.
    Format : [AGENT] ▶ NomAgent | status | Xms | détail
    """
    icon = "✅" if status == "OK" else "⚠️" if status == "SKIP" else "❌"
    line = f"[AGENT] {icon} {name:<22} | {status:<5} | {duration_ms:>5}ms"
    if detail:
        line += f" | {detail}"
    logger.info(line)


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

    # ══════════════════════════════════════════════════════════════════════
    # DÉBUT PIPELINE
    # ══════════════════════════════════════════════════════════════════════
    logger.info("=" * 65)
    logger.info(f"[PIPELINE] ▶ START  | session={session_id[:8]}... | user={user_id or 'anon'}")
    logger.info(f"[PIPELINE]   message='{message[:80]}{'...' if len(message) > 80 else ''}'")
    logger.info("=" * 65)

    # ── 1. Rate Limiting ──────────────────────────────────────────────────
    t0         = time.time()
    identifier  = f"user:{user_id}" if user_id else f"ip:{ip_address or session_id}"
    user_type   = "authenticated" if user_id else "anonymous"
    max_per_min = RATE_LIMITS[user_type]

    rate_check = await redis.check_rate_limit(identifier, max_per_min)
    dur = round((time.time() - t0) * 1000)

    if not rate_check["allowed"]:
        logger.warning(
            f"[PIPELINE] ⛔ RATE_LIMIT | {identifier} | "
            f"reset_in={rate_check['reset_in']}s"
        )
        return {
            "response":     f"⚠️ Vous envoyez trop de messages. Patientez {rate_check['reset_in']} seconde(s).",
            "suggestions":  [],
            "rate_limited": True,
            "reset_in":     rate_check["reset_in"],
            "log_id":       None,
        }

    logger.info(
        f"[STEP 1] Rate limiting | {user_type} | "
        f"limit={max_per_min}/min | {dur}ms | ALLOWED"
    )

    # ── 2. Mémoire utilisateur ────────────────────────────────────────────
    t0               = time.time()
    memory           = await redis.get_user_memory(session_id)
    enriched_context = _enrich_context_with_memory(context, memory)
    dur              = round((time.time() - t0) * 1000)

    logger.info(
        f"[STEP 2] Memory Redis   | "
        f"msg_count={memory.get('message_count', 0)} | "
        f"last_city={memory.get('last_city') or 'none'} | "
        f"budget={memory.get('preferred_budget') or 'none'} | "
        f"{dur}ms"
    )

    # ── 3. Cache ──────────────────────────────────────────────────────────
    t0           = time.time()
    is_cacheable = _is_cacheable(message, context)
    if is_cacheable:
        cached = await redis.get_cached_response(message, enriched_context)
        dur    = round((time.time() - t0) * 1000)
        if cached:
            logger.info(f"[STEP 3] Cache Redis    | HIT ✅ | {dur}ms | réponse servie depuis cache")
            await _update_memory_after_response(redis, session_id, message, cached, {})
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
                "used_cache":        True,
                "vehicules_returned":0,
                "services_returned": 0,
            })
            cached["log_id"] = log_id
            cached["_meta"]  = {
                **cached.get("_meta", {}),
                "from_cache":    True,
                "response_time": round((time.time() - start_time) * 1000),
            }
            total_ms = round((time.time() - start_time) * 1000)
            logger.info(f"[PIPELINE] ✅ END (cache) | total={total_ms}ms | log_id={log_id}")
            logger.info("=" * 65)
            return cached
        else:
            logger.info(f"[STEP 3] Cache Redis    | MISS ❌ | {dur}ms | pipeline complet requis")
    else:
        dur = round((time.time() - t0) * 1000)
        logger.info(f"[STEP 3] Cache Redis    | SKIP ⏭  | {dur}ms | message non cacheable")

    # ══════════════════════════════════════════════════════════════════════
    # PIPELINE DES AGENTS
    # ══════════════════════════════════════════════════════════════════════
    logger.info("-" * 65)
    logger.info("[PIPELINE] ▶ AGENTS START")
    logger.info("-" * 65)

    agents_called = 0

    # ── Agent 1 : Sécurité (entrée) ───────────────────────────────────────
    t0 = time.time()
    filtered_message = securite_agent.filter_input(message)
    dur = round((time.time() - t0) * 1000)
    if filtered_message != message:
        _log_agent("SécuritéAgent (in)", "WARN", dur,
                   f"message modifié : '{message[:40]}' → '{filtered_message[:40]}'")
    else:
        _log_agent("SécuritéAgent (in)", "OK", dur, "aucun contenu interdit détecté")
    agents_called += 1

    # ── Agent 2 : Extraction ──────────────────────────────────────────────
    t0         = time.time()
    extraction = await extraction_agent.run(filtered_message, enriched_context)
    dur        = round((time.time() - t0) * 1000)
    intent     = extraction.get("intent", "general_info")
    params     = extraction.get("params", {})
    needs      = extraction.get("needs_agents", [])

    _log_agent(
        "ExtractionAgent", "OK", dur,
        f"intent={intent} | city={params.get('city') or '—'} | "
        f"category={params.get('category') or '—'} | "
        f"max_price={params.get('max_price') or '—'} | "
        f"dates={params.get('start_date') or '—'}→{params.get('end_date') or '—'} | "
        f"needs={needs}"
    )
    agents_called += 1

    # Enrichissement mémoire
    params = _enrich_params_with_memory(params, memory)
    if params.get("_city_from_mem"):
        logger.info(f"[MEMORY]   📍 ville injectée depuis mémoire : {params['city']}")
    if params.get("_budget_from_mem"):
        logger.info(f"[MEMORY]   💰 budget injecté depuis mémoire : {params['max_price']} MAD")

    # ── Agents 3+4 : Véhicule + Service (parallèle si besoin) ─────────────
    vehicules_result = {"vehicules": []}
    services_result  = {"owners": []}

    if intent in ("search_vehicle", "check_availability", "get_price") or "vehicule" in needs:
        if "service" in needs:
            # Exécution parallèle
            logger.info("[PARALLEL] ▶ asyncio.gather(VehiculeAgent, ServiceAgent)")
            t0 = time.time()
            vehicules_result, services_result = await asyncio.gather(
                vehicule_agent.run(params, enriched_context),
                service_agent.run(params, enriched_context),
            )
            dur = round((time.time() - t0) * 1000)
            _log_agent(
                "VehiculeAgent", "OK", dur,
                f"→ {len(vehicules_result.get('vehicules', []))} véhicule(s) trouvé(s) | "
                f"city={params.get('city') or '—'} | category={params.get('category') or '—'}"
            )
            _log_agent(
                "ServiceAgent", "OK", dur,
                f"→ {len(services_result.get('owners', []))} prestataire(s) trouvé(s) | "
                f"(parallèle avec VehiculeAgent)"
            )
            agents_called += 2
        else:
            t0               = time.time()
            vehicules_result = await vehicule_agent.run(params, enriched_context)
            dur              = round((time.time() - t0) * 1000)
            nb_v             = len(vehicules_result.get("vehicules", []))
            _log_agent(
                "VehiculeAgent", "OK", dur,
                f"→ {nb_v} véhicule(s) | "
                f"city={params.get('city') or '—'} | "
                f"category={params.get('category') or '—'} | "
                f"max_price={params.get('max_price') or '—'}"
            )
            agents_called += 1

            # Afficher les 3 premiers véhicules trouvés
            if nb_v > 0:
                for v in vehicules_result["vehicules"][:3]:
                    logger.info(
                        f"[VEHICLE]    • {v.get('brand','')} {v.get('model','')} "
                        f"{v.get('year','')} | {v.get('price_per_day','')} MAD/jour | "
                        f"{v.get('city','')} | note={v.get('average_rating','?')}/5"
                    )
                if nb_v > 3:
                    logger.info(f"[VEHICLE]    ... et {nb_v - 3} autre(s)")

    elif intent == "search_service" or "service" in needs:
        t0              = time.time()
        services_result = await service_agent.run(params, enriched_context)
        dur             = round((time.time() - t0) * 1000)
        _log_agent(
            "ServiceAgent", "OK", dur,
            f"→ {len(services_result.get('owners', []))} prestataire(s)"
        )
        agents_called += 1
    else:
        _log_agent("VehiculeAgent", "SKIP", 0,
                   f"intent={intent} ne nécessite pas de recherche véhicule")
        _log_agent("ServiceAgent",  "SKIP", 0, "idem")

    # ── Agent 5 : DispoAgent ──────────────────────────────────────────────
    dispo_result = {"checked": False}
    if params.get("start_date") and params.get("end_date") and vehicules_result.get("vehicules"):
        t0           = time.time()
        dispo_result = await dispo_agent.run(params, vehicules_result)
        dur          = round((time.time() - t0) * 1000)
        nb_dispo     = len(dispo_result.get("available", []))
        nb_indispo   = dispo_result.get("unavailable_count", 0)
        _log_agent(
            "DispoAgent", "OK", dur,
            f"dates={params['start_date']}→{params['end_date']} | "
            f"disponibles={nb_dispo} | indisponibles={nb_indispo}"
        )
        agents_called += 1
    else:
        reason = "pas de dates" if not params.get("start_date") else "pas de véhicules"
        _log_agent("DispoAgent", "SKIP", 0, reason)

    # ── Agent 6 : PrixAgent ───────────────────────────────────────────────
    prix_result = {"prix_results": []}
    if vehicules_result.get("vehicules"):
        t0          = time.time()
        prix_result = await prix_agent.run(params, vehicules_result, dispo_result)
        dur         = round((time.time() - t0) * 1000)
        top         = prix_result.get("prix_results", [])
        # Version robuste - ligne 276
        if top:
            v = top[0]
            brand = v.get('brand', '?')
            model = v.get('model', '?')
            # Essayer plusieurs clés possibles
            price = v.get('price_per_day') or v.get('prix_par_jour') or v.get('prix') or v.get('daily_rate') or '?'
            top_info = f"{brand} {model} {price}MAD"
        else:
            top_info = "—"

        _log_agent(
            "PrixAgent", "OK", dur,
            f"→ {len(top)} résultat(s) calculé(s) | top={top_info}"
        )
        agents_called += 1
    else:
        _log_agent("PrixAgent", "SKIP", 0, "aucun véhicule à valoriser")

    # ── Agent 7 : FormatageAgent ──────────────────────────────────────────
    t0        = time.time()
    formatted = await formatage_agent.run(
        original_message = filtered_message,
        extraction       = extraction,
        vehicules        = vehicules_result,
        services         = services_result,
        dispo            = dispo_result,
        prix             = prix_result,
        context          = enriched_context,
        history          = memory.get("history", [])[-6:],
    )
    dur = round((time.time() - t0) * 1000)
    _log_agent(
        "FormatageAgent", "OK", dur,
        f"réponse={len(formatted.get('response',''))} chars | "
        f"suggestions={len(formatted.get('suggestions', []))}"
    )
    agents_called += 1

    # ── Agent 8 : Sécurité (sortie) ───────────────────────────────────────
    t0            = time.time()
    safe_response = securite_agent.run(formatted["response"])
    dur           = round((time.time() - t0) * 1000)
    _log_agent(
        "SécuritéAgent (out)", "OK", dur,
        f"réponse finale={len(safe_response)} chars | "
        f"{'modifiée' if safe_response != formatted['response'] else 'inchangée'}"
    )
    agents_called += 1

    # ── Aperçu de la réponse ──────────────────────────────────────────────
    preview = safe_response[:120].replace('\n', ' ')
    logger.info(f"[RESPONSE] 💬 '{preview}{'...' if len(safe_response) > 120 else ''}'")

    # ── 5. Logger ─────────────────────────────────────────────────────────
    response_time_ms = round((time.time() - start_time) * 1000)
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

    # ── 6. Résultat final ─────────────────────────────────────────────────
    result = {
        "response":    safe_response,
        "suggestions": formatted.get("suggestions", []),
        "log_id":      log_id,
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

    # ══════════════════════════════════════════════════════════════════════
    # RÉSUMÉ FINAL
    # ══════════════════════════════════════════════════════════════════════
    logger.info("-" * 65)
    logger.info(
        f"[PIPELINE] ✅ END | total={response_time_ms}ms | "
        f"agents={agents_called} | intent={intent} | "
        f"vehicules={len(vehicules_result.get('vehicules', []))} | "
        f"log_id={log_id}"
    )
    logger.info("=" * 65)

    return result


# ── Helpers ────────────────────────────────────────────────────────────────────

def _is_cacheable(message: str, context: dict) -> bool:
    msg_lower = message.lower().strip()
    greetings = ["bonjour", "salut", "bonsoir", "hello", "hi", "salam"]
    if any(msg_lower.startswith(g) for g in greetings):
        return False
    if context.get("vehiculeId") or context.get("page") == "vehicule":
        return False
    return True


def _enrich_context_with_memory(context: dict, memory: dict) -> dict:
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
    enriched = dict(params)
    if not enriched.get("city") and memory.get("last_city"):
        enriched["city"]           = memory["last_city"]
        enriched["_city_from_mem"] = True
    if not enriched.get("max_price") and memory.get("preferred_budget"):
        enriched["max_price"]        = memory["preferred_budget"]
        enriched["_budget_from_mem"] = True
    return enriched


async def _update_memory_after_response(
    redis, session_id, message, result, extra
) -> None:
    updates = {
        "history": [
            {"role": "user",      "content": message},
            {"role": "assistant", "content": result.get("response", "")},
        ],
    }
    params = extra.get("params", {})
    if params.get("city"):        updates["last_city"]        = params["city"]
    if params.get("category"):    updates["last_category"]    = params["category"]
    if params.get("max_price"):   updates["preferred_budget"] = params["max_price"]
    vehicules = extra.get("vehicules", {}).get("vehicules", [])
    if vehicules:
        updates["viewed_vehicules"] = [v["id"] for v in vehicules if v.get("id")]
    services = extra.get("services", {}).get("owners", [])
    if services:
        st = extra.get("services", {}).get("service_type", "")
        if st:
            updates["interests"] = [st]
    await redis.update_user_memory(session_id, updates)


async def _log_to_db(log_data: dict) -> int | None:
    import httpx, os
    AUTH_SERVICE_URL = os.getenv("AUTH_SERVICE_URL", "http://auth-service")
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp = await client.post(
                f"{AUTH_SERVICE_URL}/api/internal/chat-logs",
                json=log_data
            )
        if resp.status_code == 201:
            return resp.json().get("id")
        return None
    except Exception as e:
        logger.warning(f"Chat log failed: {e}")
        return None