# agent-orchestrator/main.py

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from agent_router import router as agent_router

app = FastAPI(
    title="AutoRent Agent Orchestrator",
    description="Multi-agent chatbot service avec architecture A2A",
    version="1.0.0",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Inclure le router des agents
app.include_router(agent_router)

@app.get("/health")
async def health():
    return {"status": "ok", "service": "agent-orchestrator"}