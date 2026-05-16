# Dans pricing-dynamique/main.py —
from fastapi import FastAPI
from pydantic import BaseModel
from typing import Optional
import logging
from fastapi.middleware.cors import CORSMiddleware
from agents.behavior_agent import analyze as analyze_behavior

# Création de l'application FastAPI
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-RateLimit-Remaining", "X-RateLimit-Reset"],
)

# Configuration du logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class BehaviorRequest(BaseModel):
    owner_id:  int
    mode:      str           = "full"
    client_id: Optional[int] = None

class ClientRecoRequest(BaseModel):
    owner_id:  int
    client_id: int
    
@app.post("/agent/behavior/analyze")
async def behavior_analyze(req: BehaviorRequest):
    """
    Analyse comportementale complète :
    RFM + K-Means + Churn + Recommandations + Insights LLM
    """
    result = await analyze_behavior(
        owner_id  = req.owner_id,
        mode      = req.mode,
        client_id = req.client_id,
    )
    return result

@app.post("/agent/behavior/recommend")
async def behavior_recommend(req: ClientRecoRequest):
    """Recommandations personnalisées pour un client spécifique."""
    result = await analyze_behavior(
        owner_id  = req.owner_id,
        mode      = "recommend",
        client_id = req.client_id,
    )
    return result.get("recommendation", {})


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/")
async def root():
    return {"message": "Pricing service is running"}