# MarketingOrchestratorAgent/main.py

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from agents.marketing_orchestrator import process_marketing_campaign

app = FastAPI(title="AutoRent Agent Orchestrator")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class CampaignRequest(BaseModel):
    owner_id:     int
    vehicule_id:  int
    platforms:    List[str] = ["facebook"]     # facebook, instagram, tiktok
    tone:         str       = "professionnel"   # professionnel, casual, urgence
    language:     str       = "fr"             # fr, ar, en
    promo_price:  Optional[float] = None       # Prix promo si applicable


class CampaignResponse(BaseModel):
    success:          bool
    vehicle:          Optional[str]
    published_count:  int = 0
    failed_count:     int = 0
    publications:     list = []
    contents_preview: dict = {}


@app.post("/marketing/publish", response_model=CampaignResponse)
async def publish_campaign(req: CampaignRequest):
    result = await process_marketing_campaign(
        owner_id        = req.owner_id,
        vehicule_id     = req.vehicule_id,
        campaign_config = {
            "platforms":   req.platforms,
            "tone":        req.tone,
            "language":    req.language,
            "promo_price": req.promo_price,
        }
    )
    return result


@app.get("/marketing/analytics/{post_id}")
async def get_analytics(post_id: str, platform: str = "facebook"):
    from mcp.social_tools import execute_marketing_tool
    return await execute_marketing_tool("get_post_analytics", {
        "post_id": post_id, "platform": platform
    })


@app.get("/health")
def health():
    return {"status": "ok", "service": "marketing-orchestrator"}