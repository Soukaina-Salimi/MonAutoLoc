from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from ocr_engine import process_document

app = FastAPI(title="OCR Microservice")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # En prod : mets l'URL de ton Laravel
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def health_check():
    return {"status": "OCR service running"}


@app.post("/ocr/extract")
async def extract_document(
    file: UploadFile = File(...),
    doc_type: str = Form(...)  # "cin", "permis", "carte_grise"
):
    # Validation type
    if doc_type not in ["cin", "permis", "carte_grise","permis_verso","carte_grise_verso"]:
        raise HTTPException(status_code=400, detail="doc_type invalide")
    
    # Validation format image
    allowed = ["image/jpeg", "image/png", "image/webp", "image/jpg"]
    if file.content_type not in allowed:
        raise HTTPException(status_code=400, detail="Format non supporté")
    
    # Validation taille (5MB max)
    contents = await file.read()
    if len(contents) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Fichier trop grand (max 5MB)")
    
    result = process_document(contents, doc_type)
    return result