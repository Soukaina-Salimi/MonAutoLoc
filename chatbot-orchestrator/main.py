# agent-orchestrator/main.py

import uuid
import logging
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from agents.orchestrator import process
from cache.redis_client import RedisClient

logging.basicConfig(level=logging.INFO)
app = FastAPI(title="AutoRent Agent Orchestrator")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-RateLimit-Remaining", "X-RateLimit-Reset"],
)


class ChatMessage(BaseModel):
    message:    str
    history:    Optional[List[dict]] = []
    context:    Optional[dict]       = {"page": "general"}
    session_id: Optional[str]        = None
    user_id:    Optional[int]        = None


@app.post("/agent/chat")
async def agent_chat(req: ChatMessage, request: Request):
    session_id = req.session_id or str(uuid.uuid4())
    ip_address = request.client.host if request.client else "unknown"

    result = await process(
        message    = req.message.strip()[:500],
        history    = (req.history or [])[-10:],
        context    = req.context or {"page": "general"},
        session_id = session_id,
        user_id    = req.user_id,
        ip_address = ip_address,
    )

    result["session_id"] = session_id

    return result


@app.get("/agent/analytics")
async def get_analytics():
    """Statistiques du chatbot du jour."""
    redis = await RedisClient.get()
    return await redis.get_analytics_today()


@app.get("/agent/health")
async def health():
    redis     = await RedisClient.get()
    redis_ok  = await redis.ping()
    return {
        "status": "ok",
        "redis":  "connected" if redis_ok else "disconnected",
    }