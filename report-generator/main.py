# dans report-generator/main.py

from agents.report_agent import generate as generate_report
import os
from fastapi import FastAPI,HTTPException
from pydantic import BaseModel
from typing import Optional
import logging
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
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

class ReportRequest(BaseModel):
    owner_id:   int
    owner_name: str
    month:      Optional[int] = None
    year:       Optional[int] = None
    token:      Optional[str] = None

@app.post("/agent/report/generate")
async def report_generate(req: ReportRequest):
    """Génère le rapport mensuel PDF pour un owner."""
    result = await generate_report(
        owner_id   = req.owner_id,
        owner_name = req.owner_name,
        month      = req.month,
        year       = req.year,
        token      = req.token,
    )
    return result

@app.get("/agent/report/download/{filename}")
async def report_download(filename: str):
    """Télécharge un rapport PDF généré."""
    from fastapi.responses import FileResponse
    path = f"/app/reports/{filename}"
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Rapport non trouvé")
    return FileResponse(path, media_type="application/pdf",
                        filename=filename)

@app.get("/agent/report/list/{owner_id}")
async def report_list(owner_id: int):
    """Liste les rapports disponibles pour un owner."""
    import glob
    pattern = f"/app/reports/rapport_{owner_id}_*.pdf"
    files   = glob.glob(pattern)
    reports = []
    for f in sorted(files, reverse=True):
        fname  = os.path.basename(f)
        parts  = fname.replace(".pdf","").split("_")
        if len(parts) >= 4:
            reports.append({
                "filename": fname,
                "year":     parts[2],
                "month":    parts[3],
                "size_kb":  round(os.path.getsize(f) / 1024, 1),
                "created":  datetime.fromtimestamp(
                    os.path.getctime(f)
                ).strftime("%d/%m/%Y %H:%M"),
            })
    return reports