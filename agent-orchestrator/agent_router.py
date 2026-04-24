# agent-orchestrator/agent_router.py

from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional, List
from agents.orchestrator import process

router = APIRouter()


class HistoryItem(BaseModel):
    role:    str
    content: str


class AgentChatRequest(BaseModel):
    message: str
    history: Optional[List[HistoryItem]] = []
    context: Optional[dict] = {"page": "general"}


@router.post("/agent/chat")
async def agent_chat(req: AgentChatRequest):
    history = [{"role": h.role, "content": h.content} for h in (req.history or [])]
    result  = await process(
        message = req.message,
        history = history,
        context = req.context or {"page": "general"},
    )
    return result