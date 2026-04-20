from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import paddleocr
from paddleocr import PaddleOCR
import numpy as np
from PIL import Image
import io
import os
import json
import re
import time
import logging
from groq import Groq

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s"
)
logger = logging.getLogger(__name__)

# ── App FastAPI ────────────────────────────────────────────────────────────────
app = FastAPI(
    title="OCR Service",
    description="PaddleOCR + Groq LLM — Extraction de documents officiels marocains",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Initialisation PaddleOCR (une seule fois au démarrage) ────────────────────
logger.info("Initialisation PaddleOCR...")
ocr_engine = PaddleOCR(
    use_angle_cls=True,
    lang="french",
    use_gpu=False,
    show_log=False,
    enable_mkldnn=False,
)
logger.info("PaddleOCR prêt.")

# ── Client Groq ────────────────────────────────────────────────────────────────
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL   = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")

if not GROQ_API_KEY:
    logger.warning("GROQ_API_KEY non définie — les extractions LLM échoueront")

groq_client = Groq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None

# ── Prompts par type de document ──────────────────────────────────────────────
PROMPTS = {
    "cin": """
Tu es un expert en lecture de cartes d'identité nationales marocaines (CIN).
Extrais les informations suivantes du texte OCR fourni et retourne UNIQUEMENT un JSON valide.

Champs à extraire :
- last_name : Nom de famille (souvent après "NOM" ou en majuscules)
- first_name : Prénom (souvent après "PRENOM" ou "Prénom")
- cin_number : Numéro CIN (format lettres+chiffres, ex: AB123456 ou BE987654)
- birth_date : Date de naissance (format YYYY-MM-DD si possible, sinon DD/MM/YYYY)
- cin_expiry_date : Date d'expiration (format YYYY-MM-DD si possible)

Retourne UNIQUEMENT ce JSON (sans texte avant ou après) :
{
  "last_name": null,
  "first_name": null,
  "cin_number": null,
  "birth_date": null,
  "cin_expiry_date": null
}
""",

    "cin_verso": """
Tu es un expert en lecture de cartes d'identité nationales marocaines (verso).
Extrais les informations suivantes du texte OCR fourni et retourne UNIQUEMENT un JSON valide.

Champs à extraire :
- address : Adresse complète (souvent après "Adresse" ou "العنوان")
- gender : Sexe — retourne exactement "M" pour masculin ou "F" pour féminin

Retourne UNIQUEMENT ce JSON (sans texte avant ou après) :
{
  "address": null,
  "gender": null
}
""",

    "permis": """
Tu es un expert en lecture de permis de conduire marocains (recto).
Le permis marocain est bilingue français/arabe.
Extrais les informations suivantes du texte OCR fourni et retourne UNIQUEMENT un JSON valide.

Champs à extraire :
- last_name : Nom de famille
- first_name : Prénom
- permis_number : Numéro de permis (peut être partiel sur le recto)
- birth_date : Date de naissance (format YYYY-MM-DD si possible)
- issue_date : Date de délivrance (format YYYY-MM-DD si possible)
- expiry_date : Date d'expiration (format YYYY-MM-DD si possible)
- categories : Tableau des catégories (ex: ["B", "A"] — cherche les lettres A, B, C, D, E, EB, EC)

Retourne UNIQUEMENT ce JSON (sans texte avant ou après) :
{
  "last_name": null,
  "first_name": null,
  "permis_number": null,
  "birth_date": null,
  "issue_date": null,
  "expiry_date": null,
  "categories": []
}
""",

    "permis_verso": """
Tu es un expert en lecture de permis de conduire marocains (verso).
Le verso contient souvent le numéro de permis complet (16 chiffres) et les catégories détaillées.
Extrais les informations suivantes du texte OCR fourni et retourne UNIQUEMENT un JSON valide.

Champs à extraire :
- permis_number : Numéro complet (souvent 16 chiffres sur le verso)
- expiry_date : Date d'expiration (format YYYY-MM-DD si possible)
- categories : Tableau des catégories valides (ex: ["B", "C"])

Retourne UNIQUEMENT ce JSON (sans texte avant ou après) :
{
  "permis_number": null,
  "expiry_date": null,
  "categories": []
}
""",

    "carte_grise": """
Tu es un expert en lecture de cartes grises marocaines (recto).
La carte grise marocaine est bilingue français/arabe.
Extrais les informations suivantes du texte OCR fourni et retourne UNIQUEMENT un JSON valide.

Champs à extraire :
- immatriculation : Numéro d'immatriculation (format XX-A-XXXX ou ancien format)
- immat_ancienne : Ancienne immatriculation si présente (sinon null)
- owner_name : Nom du propriétaire
- first_registration : Date de première mise en circulation (format YYYY-MM-DD si possible)
- expiry_date : Date d'expiration de la carte grise (format YYYY-MM-DD si possible)

Retourne UNIQUEMENT ce JSON (sans texte avant ou après) :
{
  "immatriculation": null,
  "immat_ancienne": null,
  "owner_name": null,
  "first_registration": null,
  "expiry_date": null
}
""",

    "carte_grise_verso": """
Tu es un expert en lecture de cartes grises marocaines (verso).
Le verso contient les caractéristiques techniques du véhicule. Document bilingue français/arabe.
Extrais les informations suivantes du texte OCR fourni et retourne UNIQUEMENT un JSON valide.

Champs à extraire :
- marque : Marque du véhicule (ex: DACIA, RENAULT, VOLKSWAGEN)
- carburant : Type de carburant (essence, diesel, hybride, electrique, gpl)
- puissance_fiscale : Puissance fiscale en CV (nombre entier)
- nb_places : Nombre de places assises (nombre entier)
- genre : Genre du véhicule (VP, VU, TAXI, etc.)
- chassis : Numéro de châssis VIN (17 caractères alphanumériques)
- cylindres : Nombre de cylindres (nombre entier)
- ptac : Poids total autorisé en charge en kg (nombre entier)

Retourne UNIQUEMENT ce JSON (sans texte avant ou après) :
{
  "marque": null,
  "carburant": null,
  "puissance_fiscale": null,
  "nb_places": null,
  "genre": null,
  "chassis": null,
  "cylindres": null,
  "ptac": null
}
"""
}

# ── Fonctions utilitaires ─────────────────────────────────────────────────────

def preprocess_image(image_bytes: bytes) -> np.ndarray:
    """
    Prétraite l'image pour améliorer la qualité OCR.
    - Convertit en RGB
    - Agrandit si trop petite (moins de 1000px de large)
    - Retourne un tableau numpy
    """
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")

    # Agrandir si trop petite
    w, h = image.size
    if w < 1000:
        scale  = 1000 / w
        image  = image.resize((int(w * scale), int(h * scale)), Image.LANCZOS)
        logger.info(f"Image redimensionnée: {w}x{h} → {image.size[0]}x{image.size[1]}")

    return np.array(image)


def extract_text_with_paddle(img_array: np.ndarray) -> str:
    """
    Utilise PaddleOCR pour extraire le texte brut de l'image.
    Compatible avec les versions récentes de PaddleOCR.
    """
    # Version récente : utiliser .ocr() au lieu de .predict()
    result = ocr_engine.ocr(img_array, cls=True)
    
    lines = []
    if result and result[0]:
        for line in result[0]:
            # Structure PaddleOCR récente : [[coords], (text, confidence)]
            if len(line) >= 2:
                text, confidence = line[1]
                if confidence >= 0.50 and text.strip():
                    lines.append(text.strip())
    
    raw_text = "\n".join(lines)
    logger.info(f"PaddleOCR extrait {len(lines)} lignes (confiance ≥ 50%)")
    return raw_text

def parse_with_groq(raw_text: str, doc_type: str) -> dict:
    """
    Envoie le texte brut à Groq LLM pour extraction structurée.
    Retourne un dict JSON ou un dict vide en cas d'échec.
    """
    if not groq_client:
        logger.error("Groq client non initialisé — clé API manquante")
        return {}

    prompt = PROMPTS.get(doc_type)
    if not prompt:
        logger.error(f"Type de document inconnu: {doc_type}")
        return {}

    try:
        t0 = time.time()
        response = groq_client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[
                {
                    "role": "system",
                    "content": prompt
                },
                {
                    "role": "user",
                    "content": f"Texte OCR extrait du document :\n\n{raw_text}"
                }
            ],
            temperature=0.0,
            max_tokens=500,
            response_format={"type": "json_object"},
        )
        elapsed = time.time() - t0
        logger.info(f"Groq LLM répondu en {elapsed:.2f}s")

        content = response.choices[0].message.content
        return json.loads(content)

    except json.JSONDecodeError as e:
        logger.error(f"Groq JSON parse error: {e} — contenu: {content[:200]}")
        # Tentative de récupération : chercher un JSON dans le texte
        json_match = re.search(r'\{.*\}', content, re.DOTALL)
        if json_match:
            try:
                return json.loads(json_match.group())
            except Exception:
                pass
        return {}

    except Exception as e:
        logger.error(f"Groq API error: {e}")
        return {}


def clean_extracted_data(data: dict, doc_type: str) -> dict:
    """
    Nettoie et normalise les données extraites.
    """
    cleaned = {}

    for key, value in data.items():
        if value is None or value == "" or value == []:
            cleaned[key] = None
            continue

        if isinstance(value, str):
            value = value.strip()

            # Normaliser les dates au format YYYY-MM-DD
            if 'date' in key or key in ['birth_date', 'issue_date', 'expiry_date',
                                         'first_registration']:
                value = normalize_date(value)

            # Nettoyer le numéro CIN
            if key == 'cin_number':
                value = re.sub(r'[^A-Z0-9]', '', value.upper())

            # Normaliser le genre
            if key == 'gender':
                v = value.upper()
                if v in ['M', 'MASCULIN', 'MALE', 'ذكر']:
                    value = 'M'
                elif v in ['F', 'FEMININ', 'FÉMININ', 'FEMALE', 'أنثى']:
                    value = 'F'
                else:
                    value = None

            # Nettoyer le carburant
            if key == 'carburant':
                v = value.lower()
                if 'essence' in v or 'super' in v:
                    value = 'essence'
                elif 'diesel' in v or 'gasoil' in v or 'gas-oil' in v:
                    value = 'diesel'
                elif 'hybride' in v:
                    value = 'hybride'
                elif 'elect' in v:
                    value = 'electrique'
                elif 'gpl' in v or 'gaz' in v:
                    value = 'gpl'

        # Nettoyer les catégories de permis
        if key == 'categories' and isinstance(value, list):
            valid_cats = {'A', 'A1', 'B', 'BE', 'C', 'CE', 'C1', 'D', 'DE', 'D1', 'EB', 'EC'}
            value = [c.upper().strip() for c in value if c.upper().strip() in valid_cats]

        cleaned[key] = value

    return cleaned


def normalize_date(date_str: str) -> str | None:
    """
    Essaie de normaliser une date en format YYYY-MM-DD.
    Supporte DD/MM/YYYY, DD-MM-YYYY, YYYY/MM/DD, etc.
    """
    if not date_str:
        return None

    date_str = date_str.strip()

    # Déjà au bon format
    if re.match(r'^\d{4}-\d{2}-\d{2}$', date_str):
        return date_str

    # DD/MM/YYYY ou DD-MM-YYYY
    m = re.match(r'^(\d{1,2})[/\-\.](\d{1,2})[/\-\.](\d{4})$', date_str)
    if m:
        d, mo, y = m.group(1), m.group(2), m.group(3)
        return f"{y}-{mo.zfill(2)}-{d.zfill(2)}"

    # YYYY/MM/DD
    m = re.match(r'^(\d{4})[/\-\.](\d{1,2})[/\-\.](\d{1,2})$', date_str)
    if m:
        y, mo, d = m.group(1), m.group(2), m.group(3)
        return f"{y}-{mo.zfill(2)}-{d.zfill(2)}"

    # Mois en toutes lettres (ex: "15 Mars 2024")
    months_fr = {
        'janvier': '01', 'février': '02', 'mars': '03', 'avril': '04',
        'mai': '05', 'juin': '06', 'juillet': '07', 'août': '08',
        'septembre': '09', 'octobre': '10', 'novembre': '11', 'décembre': '12',
        'jan': '01', 'fev': '02', 'mar': '03', 'avr': '04',
        'jun': '06', 'jul': '07', 'aou': '08', 'sep': '09',
        'oct': '10', 'nov': '11', 'dec': '12',
    }
    m = re.match(r'^(\d{1,2})\s+(\w+)\s+(\d{4})$', date_str.lower())
    if m:
        d, mo_str, y = m.group(1), m.group(2), m.group(3)
        mo = months_fr.get(mo_str)
        if mo:
            return f"{y}-{mo}-{d.zfill(2)}"

    logger.warning(f"Date non normalisée: {date_str}")
    return date_str


# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/")
def health():
    return {
        "status": "ok",
        "service": "ocr-service",
        "engine": "PaddleOCR + Groq LLM",
        "model": GROQ_MODEL,
    }


@app.get("/health")
def health_check():
    return {"status": "healthy"}


@app.post("/ocr/extract")
async def extract_document(
    file: UploadFile = File(...),
    doc_type: str    = Form(...),
):
    """
    Endpoint principal d'extraction OCR.

    Paramètres :
    - file : Image du document (JPG, PNG, WebP)
    - doc_type : Type de document
      (cin | cin_verso | permis | permis_verso | carte_grise | carte_grise_verso)

    Retourne :
    - success : bool
    - doc_type : str
    - raw_text : str (texte brut extrait par PaddleOCR)
    - data : dict (données structurées extraites par Groq)
    - timing : dict (temps de traitement par étape)
    """
    # Validation du type de document
    valid_types = ["cin", "cin_verso", "permis", "permis_verso",
                   "carte_grise", "carte_grise_verso"]
    if doc_type not in valid_types:
        raise HTTPException(
            status_code=422,
            detail=f"doc_type invalide. Valeurs acceptées: {valid_types}"
        )

    # Validation du type de fichier
    if file.content_type not in ["image/jpeg", "image/jpg", "image/png", "image/webp"]:
        raise HTTPException(
            status_code=422,
            detail="Format de fichier non supporté. Utilisez JPG, PNG ou WebP."
        )

    logger.info(f"=== Extraction: doc_type={doc_type}, file={file.filename} ===")

    try:
        # Lire l'image
        t_start = time.time()
        image_bytes = await file.read()
        logger.info(f"Taille fichier: {len(image_bytes) / 1024:.1f} KB")

        # Prétraitement
        t0 = time.time()
        img_array = preprocess_image(image_bytes)
        t_preprocess = time.time() - t0

        # PaddleOCR
        t0 = time.time()
        raw_text = extract_text_with_paddle(img_array)
        t_ocr = time.time() - t0
        logger.info(f"OCR terminé en {t_ocr:.2f}s")

        if not raw_text.strip():
            logger.warning("Aucun texte extrait par PaddleOCR")
            return {
                "success"  : False,
                "doc_type" : doc_type,
                "raw_text" : "",
                "data"     : {},
                "error"    : "Aucun texte lisible détecté dans l'image",
                "timing"   : {
                    "preprocess_s": round(t_preprocess, 2),
                    "ocr_s"       : round(t_ocr, 2),
                    "llm_s"       : 0,
                    "total_s"     : round(time.time() - t_start, 2),
                }
            }

        # Groq LLM
        t0 = time.time()
        raw_data = parse_with_groq(raw_text, doc_type)
        t_llm = time.time() - t0
        logger.info(f"Groq LLM terminé en {t_llm:.2f}s")

        # Nettoyage des données
        cleaned_data = clean_extracted_data(raw_data, doc_type)

        t_total = time.time() - t_start
        logger.info(f"=== Extraction terminée en {t_total:.2f}s total ===")
        logger.info(f"Données extraites: {cleaned_data}")

        return {
            "success"  : True,
            "doc_type" : doc_type,
            "raw_text" : raw_text,
            "data"     : cleaned_data,
            "timing"   : {
                "preprocess_s": round(t_preprocess, 2),
                "ocr_s"       : round(t_ocr, 2),
                "llm_s"       : round(t_llm, 2),
                "total_s"     : round(t_total, 2),
            }
        }

    except Exception as e:
        logger.error(f"Extraction error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Erreur d'extraction: {str(e)}")


@app.post("/ocr/test-paddle")
async def test_paddle(file: UploadFile = File(...)):
    """
    Route de test — retourne uniquement le texte brut PaddleOCR sans LLM.
    Utile pour déboguer la qualité de l'extraction OCR.
    """
    try:
        image_bytes = await file.read()
        img_array   = preprocess_image(image_bytes)
        raw_text    = extract_text_with_paddle(img_array)
        return {
            "success"  : True,
            "raw_text" : raw_text,
            "lines"    : raw_text.split("\n") if raw_text else [],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))