# agent-orchestrator/cache/redis_client.py

import redis.asyncio as redis
import json
import os
import hashlib
import logging
from typing import Optional, Any

logger = logging.getLogger(__name__)

REDIS_URL       = os.getenv("REDIS_URL", "redis://redis:6379/0")
CACHE_TTL       = int(os.getenv("CACHE_TTL_SECONDS", "300"))      # 5 min
MEMORY_TTL      = int(os.getenv("MEMORY_TTL_SECONDS", "1800"))    # 30 min
RATE_LIMIT_TTL  = 60                                               # 1 min fenêtre


class RedisClient:
    _instance: Optional["RedisClient"] = None
    _pool:     Optional[redis.Redis]   = None

    @classmethod
    async def get(cls) -> "RedisClient":
        if cls._instance is None:
            cls._instance = cls()
            cls._pool = redis.from_url(
                REDIS_URL,
                encoding="utf-8",
                decode_responses=True,
                max_connections=10,
            )
        return cls._instance

    # ── Cache des réponses ─────────────────────────────────────────────────

    def _cache_key(self, message: str, context: dict) -> str:
        """Génère une clé de cache unique basée sur le message + contexte."""
        normalized = message.strip().lower()
        ctx_str    = json.dumps(context, sort_keys=True)
        raw        = f"{normalized}|{ctx_str}"
        return "chat:cache:" + hashlib.md5(raw.encode()).hexdigest()

    async def get_cached_response(self, message: str, context: dict) -> Optional[dict]:
        """Récupère une réponse en cache si elle existe."""
        try:
            key  = self._cache_key(message, context)
            data = await self._pool.get(key)
            if data:
                logger.info(f"Cache HIT: {key[:20]}…")
                result = json.loads(data)
                result["_from_cache"] = True
                return result
            return None
        except Exception as e:
            logger.warning(f"Redis cache get error: {e}")
            return None

    async def set_cached_response(self, message: str, context: dict, response: dict) -> None:
        """Met en cache une réponse."""
        try:
            # Ne pas cacher si la réponse contient une erreur
            if response.get("error"):
                return
            key  = self._cache_key(message, context)
            data = json.dumps(response, ensure_ascii=False)
            await self._pool.setex(key, CACHE_TTL, data)
            logger.info(f"Cache SET: {key[:20]}… (TTL={CACHE_TTL}s)")
        except Exception as e:
            logger.warning(f"Redis cache set error: {e}")

    # ── Mémoire utilisateur ────────────────────────────────────────────────

    def _memory_key(self, session_id: str) -> str:
        return f"chat:memory:{session_id}"

    async def get_user_memory(self, session_id: str) -> dict:
        """Récupère la mémoire de session d'un utilisateur."""
        try:
            key  = self._memory_key(session_id)
            data = await self._pool.get(key)
            if data:
                return json.loads(data)
            return {
                "session_id":       session_id,
                "message_count":    0,
                "last_intent":      None,
                "last_city":        None,
                "last_category":    None,
                "preferred_budget": None,
                "viewed_vehicules": [],
                "interests":        [],
                "history":          [],
            }
        except Exception as e:
            logger.warning(f"Redis memory get error: {e}")
            return {"session_id": session_id, "history": []}

    async def update_user_memory(self, session_id: str, update: dict) -> None:
        """Met à jour la mémoire de session."""
        try:
            key    = self._memory_key(session_id)
            memory = await self.get_user_memory(session_id)

            # Mettre à jour les champs
            for k, v in update.items():
                if k == "history":
                    # Garder seulement les 10 derniers messages
                    memory["history"] = (memory.get("history", []) + v)[-10:]
                elif k == "viewed_vehicules":
                    # Garder les 20 derniers véhicules vus
                    seen = memory.get("viewed_vehicules", [])
                    for vid in v:
                        if vid not in seen:
                            seen.append(vid)
                    memory["viewed_vehicules"] = seen[-20:]
                elif k == "interests":
                    # Ajouter les intérêts sans doublon
                    interests = set(memory.get("interests", []))
                    interests.update(v)
                    memory["interests"] = list(interests)
                else:
                    if v is not None:
                        memory[k] = v

            memory["message_count"] = memory.get("message_count", 0) + 1

            data = json.dumps(memory, ensure_ascii=False)
            await self._pool.setex(key, MEMORY_TTL, data)

        except Exception as e:
            logger.warning(f"Redis memory update error: {e}")

    # ── Rate Limiting ──────────────────────────────────────────────────────

    def _rate_key(self, identifier: str) -> str:
        return f"chat:rate:{identifier}"

    async def check_rate_limit(
        self,
        identifier: str,
        max_per_minute: int = 10,
    ) -> dict:
        """
        Vérifie si l'utilisateur dépasse la limite.
        Retourne: { allowed: bool, count: int, remaining: int, reset_in: int }
        """
        try:
            key   = self._rate_key(identifier)
            pipe  = self._pool.pipeline()
            await pipe.incr(key)
            await pipe.ttl(key)
            results = await pipe.execute()

            count = results[0]
            ttl   = results[1]

            # Première requête → définir l'expiration
            if count == 1:
                await self._pool.expire(key, RATE_LIMIT_TTL)
                ttl = RATE_LIMIT_TTL

            allowed   = count <= max_per_minute
            remaining = max(0, max_per_minute - count)

            if not allowed:
                logger.warning(f"Rate limit exceeded: {identifier} ({count}/{max_per_minute})")

            return {
                "allowed":   allowed,
                "count":     count,
                "remaining": remaining,
                "reset_in":  ttl,
                "limit":     max_per_minute,
            }
        except Exception as e:
            logger.warning(f"Redis rate limit error: {e}")
            return {"allowed": True, "count": 0, "remaining": 10, "reset_in": 60, "limit": 10}

    # ── Analytics aggregées ────────────────────────────────────────────────

    async def increment_intent_counter(self, intent: str) -> None:
        """Incrémente le compteur d'intention pour les analytics."""
        try:
            from datetime import date
            today = date.today().isoformat()
            await self._pool.hincrby(f"chat:analytics:intents:{today}", intent, 1)
            await self._pool.expire(f"chat:analytics:intents:{today}", 86400 * 30)
        except Exception as e:
            logger.warning(f"Redis analytics error: {e}")

    async def get_analytics_today(self) -> dict:
        """Récupère les analytics du jour."""
        try:
            from datetime import date
            today  = date.today().isoformat()
            intents = await self._pool.hgetall(f"chat:analytics:intents:{today}")
            total   = await self._pool.get(f"chat:analytics:total:{today}") or "0"
            return {
                "date":    today,
                "total":   int(total),
                "intents": {k: int(v) for k, v in intents.items()},
            }
        except Exception as e:
            logger.warning(f"Redis analytics get error: {e}")
            return {}

    async def ping(self) -> bool:
        """Vérifie la connexion Redis."""
        try:
            return await self._pool.ping()
        except Exception:
            return False