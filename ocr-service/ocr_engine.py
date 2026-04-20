import pytesseract
import cv2
import numpy as np
import re
#pil pour le pretraitement de l'image
from PIL import Image
import io

pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

def preprocess_image(image_bytes: bytes):
    pil_image = Image.open(io.BytesIO(image_bytes))
    
    # Convertir en RGB
    if pil_image.mode != 'RGB':
        pil_image = pil_image.convert('RGB')
    
    # Agrandir
    w, h = pil_image.size
    if w < 1000:
        scale = 1000 / w
        pil_image = pil_image.resize((int(w * scale), int(h * scale)), Image.LANCZOS)
    
    return pil_image


def extract_text(image_bytes: bytes) -> str:
    """Extrait le texte brut de l'image"""
    pil_image = preprocess_image(image_bytes)
    
    try:
        text = pytesseract.image_to_string(
            pil_image,
            lang='fra',
            config='--oem 3 --psm 6'
            #oem OCR Engine Mode
            #0 = ancien moteur Tesseract seulement
            #1 = réseau de neurones LSTM seulement  
            #2 = les deux combinés
            #3 = automatique (choisit le meilleur) 
            #psm page segmentation mode
            #3 = page complète avec colonnes (défaut)
            #6 = bloc de texte uniforme ← idéal pour documents officiels
            #11 = ligne par ligne
        )
        if len(text.strip()) > 10:
            return text
    except Exception:
        pass
    #autre langue que fr
    try:
        text = pytesseract.image_to_string(
            pil_image,
            config='--oem 3 --psm 6'
        )
        return text
    except Exception as e:
        raise ValueError(f"Erreur OCR: {str(e)}")


def parse_cin(text: str) -> dict:
    result = {
        "type": "cin",
        "cin_number": None,
        "last_name": None,
        "first_name": None,
        "birth_date": None,
        "expiry_date": None,
        "raw_confidence": "low"
    }

    print("=== RAW TEXT ===")
    print(text)
    print("================")

    # Nettoyer les lignes : enlever ponctuation de début (. " * - à)
    lines = [re.sub(r'^[^A-Za-z0-9]+', '', l).strip() for l in text.split('\n') if l.strip()]
    lines = [l for l in lines if l]  # enlever lignes vides apres nettoyage

    # Numero CIN marocain - tolerant aux erreurs OCR
    # Format: 1-2 lettres + 5-8 chiffres (K01234567, QB50793, U1234567, AB123456)
    m = re.search(r'N[^\w]?\s*([A-Z]{1,2})[A-Z]?(\d{5,8})', text.upper())
    if m:
        result["cin_number"] = m.group(1) + m.group(2)
        result["raw_confidence"] = "medium"
    else:
        # Pattern libre : lettre(s) + chiffres, tolérant lettre parasite OCR
        m = re.search(r'(?<![A-Z])([A-Z]{1,2})[A-Z]?(\d{5,8})(?!\d)', text.upper())
        if m:
            result["cin_number"] = m.group(1) + m.group(2)
            result["raw_confidence"] = "medium"

    # Dates DD/MM/YYYY
    # Normaliser les dates sans séparateur (22.042018 -> 22.04.2018)
    text_norm = re.sub(r'(\d{2}[.\/\-])(\d{2})(\d{4})', r'\1\2.\3', text)
    all_dates = re.findall(r'\b(\d{2}[\.\/\-]\d{2}[\.\/\-]\d{4})\b', text_norm)
    if len(all_dates) >= 1:
        result["birth_date"] = all_dates[0]
        result["raw_confidence"] = "medium"
    if len(all_dates) >= 2:
        result["expiry_date"] = all_dates[-1]

    # Nom/prénom : chercher d'abord via mots-clés
    for line in lines:
        if re.search(r'\bnom\b', line, re.IGNORECASE) and not re.search(r'pr[eéa]nom', line, re.IGNORECASE):
            words = line.split()
            upper_words = [w for w in words if re.match(r'^[A-Z]{2,}$', w)]
            if upper_words:
                result["last_name"] = ' '.join(upper_words)
                result["raw_confidence"] = "high"
                break

    for line in lines:
        if re.search(r'pr[eéa]nom', line, re.IGNORECASE):
            words = line.split()
            upper_words = [w for w in words if re.match(r'^[A-Z]{2,}$', w)]
            if upper_words:
                result["first_name"] = ' '.join(upper_words)
                break

    # Fallback pour vraie CIN : lignes isolées (MAJUSCULES ou capitalisées)
    if not result["last_name"]:
        skip_words = {'ROYAUME', 'DU', 'MAROC', 'CARTE', 'NATIONALE', 'IDENTITE',
                      'DIDENTITE', 'DIDENTIT', 'MAMUR', 'NDVIAUME', 'PRPETENENTEE',
                      'VALABLE', 'VATANE', 'NEE', 'CIN', 'SPECIMEN', 'BOUZAKARN',
                      'OUARZAZATE', 'JUSQUAU', 'JUSQU', 'REFE', 'AU', 'LE', 'LA', 'DE',
                      'TE', 'CE', 'PE', 'RA', 'DS', 'NV', 'GL', 'FR', 'SR', 'NE', 'SI'}
        # Villes marocaines connues à exclure
        skip_cities = {'TANGER', 'ASSILAH', 'CASABLANCA', 'RABAT', 'FES', 'MARRAKECH',
                       'AGADIR', 'MEKNES', 'OUJDA', 'KHOURIBGA', 'BEJAAD'}
        name_lines = []
        for line in lines:
            clean_up = re.sub(r'[^A-Za-z\s]', '', line).strip()
            clean = clean_up.upper()
            words = clean.split()
            valid_words = [w for w in words
                           if w not in skip_words and w not in skip_cities]
            pure = re.sub(r'[^A-Za-z]', '', line)
            total = re.sub(r'\s', '', line)
            ratio = len(pure) / max(len(total), 1)
            has_long = any(len(w) >= 4 for w in valid_words)
            # Accepter majuscules ET capitalisées (rachid, el asri)
            is_name_like = ratio > 0.70 and 1 <= len(valid_words) <= 3 and has_long
            if is_name_like:
                # Garder la casse originale
                orig_words = clean_up.split()
                orig_valid = [w for w in orig_words
                              if w.upper() not in skip_words
                              and w.upper() not in skip_cities]
                if orig_valid:
                    name_lines.append(' '.join(orig_valid))
        if name_lines:
            result["last_name"] = name_lines[0]
            result["raw_confidence"] = "high"
        if len(name_lines) >= 2:
            result["first_name"] = name_lines[1]

    return result


def parse_permis(text: str) -> dict:
    result = {
        "type": "permis",
        "permis_number": None,
        "last_name": None,
        "first_name": None,
        "birth_date": None,
        "issue_date": None,
        "expiry_date": None,
        "categories": [],
    }

    # Normaliser toutes les formes de dates collées
    # 2602/1987 -> 26/02/1987  |  01062007 -> 01/06/2007
    text_norm = re.sub(r'(\d{2})(\d{2})[/](\d{4})', r'\1/\2/\3', text)   # 2602/1987
    text_norm = re.sub(r'(\d{2})(\d{2})(\d{4})(?!\d)', r'\1/\2/\3', text_norm)  # 01062007

    # Numéro permis — après "Permis N°" (peut contenir /)
    m = re.search(r'Permis\s+N[°o\.\s]{0,3}\s*([\d/]+)', text_norm, re.IGNORECASE)
    if m:
        result["permis_number"] = m.group(1).replace('/', '')
    else:
        m = re.search(r'N[°\.\s]{0,3}\s*(\d{5,8})', text_norm.upper())
        if m:
            result["permis_number"] = m.group(1)

    # Fallback : si Tesseract n'a pas lu "Permis N°", chercher tout nombre 7-8 chiffres isolé
    if not result["permis_number"]:
        # Chercher format XX/XXXXXX (01/079202)
        m = re.search(r'\b(\d{2}/\d{6})\b', text_norm)
        if m:
            result["permis_number"] = m.group(1).replace('/', '')

    # Prénom — capturer mots 100% MAJUSCULES après "Prénom/Prenom"
    # Sur permis marocain: "Prénom EL AMRI ..." ou "1. Nom: KHALIL"
    m = re.search(r'pr[eé]nom\s+(.*?)(?:\n|$)', text_norm, re.IGNORECASE)
    if m:
        words = [w for w in m.group(1).split() if w.isupper() and len(w) >= 2]
        if words:
            result["first_name"] = ' '.join(words)
    if not result["first_name"]:
        m = re.search(r'(?:\d\.\s*)?pr[eéa]nom\s*[:\s]+([A-Za-z]+)', text_norm, re.IGNORECASE)
        if m:
            result["first_name"] = m.group(1).capitalize()

    # Nom — capturer mots MAJUSCULES après "Nom"
    m = re.search(r'\bnom\s+(.*?)(?:\n|$)', text_norm, re.IGNORECASE)
    if m:
        words = [w for w in m.group(1).split() if w.isupper() and len(w) >= 2]
        if words:
            result["last_name"] = ' '.join(words)
    if not result["last_name"]:
        m = re.search(r'(?:\d\.\s*)?nom\s*[:\s]+([A-Za-z]+)', text_norm, re.IGNORECASE)
        if m:
            result["last_name"] = m.group(1).upper()

    # Date naissance — après "Né(e) le" ou "naissance"
    m = re.search(r'n[eé]\(?e?\)?\s*le\s+(\d{2}[\/\.]\d{2}[\/\.]\d{4})', text_norm, re.IGNORECASE)
    if m:
        result["birth_date"] = m.group(1)
    else:
        m = re.search(r'naissance\s*[:\s]+(\d{2}[\/\.]\d{2}[\/\.]\d{4})', text_norm, re.IGNORECASE)
        if m:
            result["birth_date"] = m.group(1)

    # Date délivrance — après "Rabat le" / "délivrance" / ville + le
    m = re.search(r'(?:rabat|casablanca|delivr|d[eé]livr|dlivr)\w*\s+le?\s+(\d{2}[\/\.]\d{2}[\/\.]\d{4})', text_norm, re.IGNORECASE)
    if m:
        result["issue_date"] = m.group(1)
    else:
        m = re.search(r'd[eé]livr\w*\s*[:\s]+(\d{2}[\/\.]\d{2}[\/\.]\d{4})', text_norm, re.IGNORECASE)
        if m:
            result["issue_date"] = m.group(1)

    # Date expiration — après "expiration"
    m = re.search(r'expiration\s*[:\s]+(\d{2}[\/\.]\d{2}[\/\.]\d{4})', text_norm, re.IGNORECASE)
    if m:
        result["expiry_date"] = m.group(1)

    # Fallback dates si toujours null
    if not result["birth_date"] or not result["issue_date"]:
        all_dates = list(dict.fromkeys(re.findall(r'\b(\d{2}[\/\.\-]\d{2}[\/\.\-]\d{4})\b', text_norm)))
        if not result["birth_date"] and all_dates:
            result["birth_date"] = all_dates[0]
        if not result["issue_date"] and len(all_dates) >= 2:
            result["issue_date"] = all_dates[1]
        if not result["expiry_date"] and len(all_dates) >= 3:
            result["expiry_date"] = all_dates[2]

    # Catégories — chercher [B] [C] ou lettres isolées en fin de texte
    cats_bracket = re.findall(r'[\[\(]([ABCDE])[\]\)]', text_norm.upper())
    if cats_bracket:
        result["categories"] = sorted(list(set(cats_bracket)))
    else:
        # Lettres seules sur une ligne (ex: "A B" ou "A\nB")
        last_part = text_norm.split('\n')
        cats_solo = []
        for line in last_part:
            clean = line.strip()
            if re.match(r'^[ABCDE]$', clean.upper()):
                cats_solo.append(clean.upper())
        if cats_solo:
            result["categories"] = sorted(list(set(cats_solo)))
        else:
            cats = re.findall(r'(?<![A-Z0-9/])([ABCDE])(?![A-Z0-9/])', text_norm.upper())
            result["categories"] = sorted(list(set(cats)))

    return result


def parse_permis(text: str) -> dict:
    result = {
        "type": "permis",
        "permis_number": None,
        "last_name": None,
        "first_name": None,
        "birth_date": None,
        "issue_date": None,
        "expiry_date": None,
        "categories": [],
    }

    # Normaliser toutes les formes de dates collées
    # 2602/1987 -> 26/02/1987  |  01062007 -> 01/06/2007  |  0111/2017 -> 01/11/2017
    text_norm = re.sub(r'(\d{2})(\d{2})[/](\d{4})', r'\1/\2/\3', text)   # 2602/1987
    text_norm = re.sub(r'(\d{2})(\d{2})(\d{4})(?!\d)', r'\1/\2/\3', text_norm)  # 01062007
    text_norm = re.sub(r'(\d{2})(\d{2})/(\d{4})', r'\1/\2/\3', text_norm)  # 0111/2017

    # Numéro permis — après "Permis N°" (peut contenir /)
    m = re.search(r'Permis\s+N[°o\.\s]{0,3}\s*([\d/]+)', text_norm, re.IGNORECASE)
    if m:
        result["permis_number"] = m.group(1).replace('/', '')
    else:
        m = re.search(r'N[°\.\s]{0,3}\s*(\d{5,8})', text_norm.upper())
        if m:
            result["permis_number"] = m.group(1)

    # Fallback : si Tesseract n'a pas lu "Permis N°", chercher tout nombre 7-8 chiffres isolé
    if not result["permis_number"]:
        # Chercher format XX/XXXXXX (01/079202)
        m = re.search(r'\b(\d{2}/\d{6})\b', text_norm)
        if m:
            result["permis_number"] = m.group(1).replace('/', '')

    # Prénom — capturer mots 100% MAJUSCULES après "Prénom/Prenom"
    # Sur permis marocain: "Prénom EL AMRI ..." ou "1. Nom: KHALIL"
    m = re.search(r'pr[eé]nom\s+(.*?)(?:\n|$)', text_norm, re.IGNORECASE)
    if m:
        words = [w for w in m.group(1).split() if w.isupper() and len(w) >= 2]
        if words:
            result["first_name"] = ' '.join(words)
    if not result["first_name"]:
        m = re.search(r'(?:\d\.\s*)?pr[eéa]nom\s*[:\s]+([A-Za-z]+)', text_norm, re.IGNORECASE)
        if m:
            result["first_name"] = m.group(1).capitalize()

    # Nom — capturer mots MAJUSCULES après "Nom"
    m = re.search(r'\bnom\s+(.*?)(?:\n|$)', text_norm, re.IGNORECASE)
    if m:
        words = [w for w in m.group(1).split() if w.isupper() and len(w) >= 2]
        if words:
            result["last_name"] = ' '.join(words)
    if not result["last_name"]:
        m = re.search(r'(?:\d\.\s*)?nom\s*[:\s]+([A-Za-z]+)', text_norm, re.IGNORECASE)
        if m:
            result["last_name"] = m.group(1).upper()

    # Date naissance — après "Né(e) le" ou "naissance"
    m = re.search(r'n[eé]\(?e?\)?\s*le\s+(\d{2}[\/\.]\d{2}[\/\.]\d{4})', text_norm, re.IGNORECASE)
    if m:
        result["birth_date"] = m.group(1)
    else:
        m = re.search(r'naissance\s*[:\s]+(\d{2}[\/\.]\d{2}[\/\.]\d{4})', text_norm, re.IGNORECASE)
        if m:
            result["birth_date"] = m.group(1)

    # Date délivrance — après "Rabat le" / "délivrance" / ville + le
    m = re.search(r'(?:rabat|casablanca|delivr|d[eé]livr|dlivr)\w*\s+le?\s+(\d{2}[\/\.]\d{2}[\/\.]\d{4})', text_norm, re.IGNORECASE)
    if m:
        result["issue_date"] = m.group(1)
    else:
        m = re.search(r'd[eé]livr\w*\s*[:\s]+(\d{2}[\/\.]\d{2}[\/\.]\d{4})', text_norm, re.IGNORECASE)
        if m:
            result["issue_date"] = m.group(1)

    # Date expiration — après "expiration"
    m = re.search(r'expiration\s*[:\s]+(\d{2}[\/\.]\d{2}[\/\.]\d{4})', text_norm, re.IGNORECASE)
    if m:
        result["expiry_date"] = m.group(1)

    # Fallback dates si toujours null
    if not result["birth_date"] or not result["issue_date"]:
        all_dates = list(dict.fromkeys(re.findall(r'\b(\d{2}[\/\.\-]\d{2}[\/\.\-]\d{4})\b', text_norm)))
        if not result["birth_date"] and all_dates:
            result["birth_date"] = all_dates[0]
        if not result["issue_date"] and len(all_dates) >= 2:
            result["issue_date"] = all_dates[1]
        if not result["expiry_date"] and len(all_dates) >= 3:
            result["expiry_date"] = all_dates[2]

    # Catégories — chercher [B] [C] ou lettres isolées en fin de texte
    cats_bracket = re.findall(r'[\[\(]([ABCDE])[\]\)]', text_norm.upper())
    if cats_bracket:
        result["categories"] = sorted(list(set(cats_bracket)))
    else:
        # Lettres seules sur une ligne (ex: "A B" ou "A\nB")
        last_part = text_norm.split('\n')
        cats_solo = []
        for line in last_part:
            clean = line.strip()
            if re.match(r'^[ABCDE]$', clean.upper()):
                cats_solo.append(clean.upper())
        if cats_solo:
            result["categories"] = sorted(list(set(cats_solo)))
        else:
            cats = re.findall(r'(?<![A-Z0-9/])([ABCDE])(?![A-Z0-9/])', text_norm.upper())
            result["categories"] = sorted(list(set(cats)))

    return result

def parse_carte_grise(text: str) -> dict:
    result = {
        "type": "carte_grise",
        "immatriculation": None,
        "immatriculation_ancienne": None,
        "owner_name": None,
        "first_registration": None,
        "maroc_registration": None,
        "expiry_date": None,
        "usage": None,
    }

    # Normaliser dates collées: 0209/2014->02/09/2014, 0111/2017->01/11/2017
    def fix_date(m):
        day, middle, year = m.group(1), m.group(2), m.group(3)
        month = middle[:2] if len(middle) == 3 else middle
        return f"{day}/{month}/{year}"
    text_norm = re.sub(r'(\d{2})/(\d{2,3})(\d{4})(?!\d)', fix_date, text)
    text_norm = re.sub(r'(\d{2})(\d{2})/?(\d{4})(?!\d)', fix_date, text_norm)

    # === IMMATRICULATION ===
    # Format: 12029-A-6 ou 8666-1-18
    # Tesseract lit: '8666- | 18', '12029- » 6', '8666- 1 138 2'
    m = re.search(r'(\d{4,5})\s*[-–]\s*([A-Z\»\«\*\+|1١I])\s*[-–]?\s*(\d{1,3})', text_norm.upper())
    if m:
        num, sep, region_raw = m.group(1), m.group(2), m.group(3)
        region = region_raw[-2:] if len(region_raw) == 3 else region_raw.zfill(2)
        mid = '1' if sep in '|1١I' else (sep if sep.isalpha() else 'A')
        result["immatriculation"] = f"{num}-{mid}-{region}"
    else:
        # Format 'PAT MAROC 107-17'
        m = re.search(r"Num[eé]ro\s+d.immatriculation\s+([A-Z0-9]+(?:\s+[A-Z0-9]+)?\s*[\.-]?\s*\d+[-\s]\d+)", text_norm, re.IGNORECASE)
        if m:
            result["immatriculation"] = re.sub(r'\s+', ' ', m.group(1).strip().rstrip('.'))

    # === ANCIENNE IMMATRICULATION ===
    # Ancienne immat: AZ483AP, WW594949 - Tesseract peut déformer (AZAESAP, artéreuse...)
    m = re.search(r'\b(?:ant[eé]r|art[eé]r)\w*\s+([A-Z]{2}[A-Z0-9]{3,8})', text_norm, re.IGNORECASE)
    if not m:
        m = re.search(r'\bann[eé]\w*\s+([A-Z]{2}[A-Z0-9]{3,8})', text_norm, re.IGNORECASE)
    if m:
        result["immatriculation_ancienne"] = m.group(1)

    # === 1ÈRE MISE EN CIRCULATION ===
    m = re.search(r'(?:1[eè]re?\s*M\.?C\.?|f[eé]re?\s*MC|première\s+mise)[,\s]+(\d{2}[\/.\-]\d{2}[\/.\-]\d{4})', text_norm, re.IGNORECASE)
    if m:
        result["first_registration"] = m.group(1)

    # === MC AU MAROC ===
    m = re.search(r'(?:M\.?C\.?\s+au\s+Maroc|MC\s+au\w*|au\s+Maroc)\s+(\d{2}[\/.\-]\d{2}[\/.\-]\d{4})', text_norm, re.IGNORECASE)
    if m:
        result["maroc_registration"] = m.group(1)

    # === FIN DE VALIDITÉ ===
    m = re.search(r'(?:fin\s+de\s+validit[eé]|validit[eé])\s+(\d{2}[\/.\-]\d{2}[\/.\-]\d{4})', text_norm, re.IGNORECASE)
    if m:
        result["expiry_date"] = m.group(1)

    # Fallback dates
    all_dates = list(dict.fromkeys(re.findall(r'\b(\d{2}[\/.\-]\d{2}[\/.\-]\d{4})\b', text_norm)))
    if not result["first_registration"] and all_dates:
        result["first_registration"] = all_dates[0]
    if not result["maroc_registration"] and len(all_dates) >= 2:
        result["maroc_registration"] = all_dates[1]
    if not result["expiry_date"] and len(all_dates) >= 3:
        result["expiry_date"] = all_dates[-1]

    # === PROPRIÉTAIRE ===
    # Chercher 1-2 lignes en MAJUSCULES après "Propriétaire"
    lines = [l.strip() for l in text_norm.split('\n') if l.strip()]
    skip_words = {'CARTE', 'GRISE', 'MAROC', 'ROYAUME', 'MUTATION', 'USAGE',
                  'FIN', 'VALIDITE', 'VALIDIT', 'IMMATRICULATION', 'ANTERIEURE',
                  'PROPRIETAIRE'}
    prop_idx = None
    for i, line in enumerate(lines):
        if re.search(r'propri[eé]taire', line, re.IGNORECASE):
            prop_idx = i
            break
    if prop_idx is not None:
        noise_words = {'AU', 'GH', 'JE', 'JA', 'SA', 'CE', 'LUX', 'EU', 'DU',
                       'DE', 'LE', 'LA', 'ET', 'IL', 'EN', 'UN', 'UNE', 'PAR',
                       'SAIL', 'EI', 'ES', 'NE', 'AH', 'GS', 'JS'}
        address_words = {'RABAT', 'CASABLANCA', 'SALE', 'FES', 'AVENUE',
                         'BOULEVARD', 'RUE', 'QUARTIER', 'BLOC'}
        name_parts = []
        for line in lines[prop_idx+1:prop_idx+4]:  # max 3 lignes
            clean = re.sub(r'[^A-Za-z\s]', '', line).strip()
            words = clean.split()
            valid = [w for w in words
                     if len(w) >= 3
                     and w.isalpha()
                     and w.upper() not in noise_words
                     and w.upper() not in skip_words]
            name_parts.extend(valid)
        if name_parts:
            # Normaliser DESUSA -> DES USA, dédoublonner, enlever adresses
            raw_name = ' '.join(name_parts)
            raw_name = raw_name.replace('DESUSA', 'DES USA').replace('Desusa', 'DES USA')
            final_words = []
            seen = set()
            for w in raw_name.split():
                if w.upper() not in seen and w.upper() not in address_words:
                    seen.add(w.upper())
                    final_words.append(w.upper())
            if final_words:
                result["owner_name"] = ' '.join(final_words[:5])

    # === USAGE ===
    m = re.search(r'[Uu]sage\s+([A-Za-z\s]+?)(?:\n|$)', text_norm)
    if m:
        usage = re.sub(r'[^A-Za-z\s]', '', m.group(1)).strip()
        if len(usage) > 2:
            result["usage"] = usage

    return result


def process_document(image_bytes: bytes, doc_type: str) -> dict:
    raw_text = extract_text(image_bytes)

    parsers = {
        "cin": parse_cin,
        "permis": parse_permis,
        "carte_grise": parse_carte_grise,
        "carte_grise_verso": parse_carte_grise_verso,
        "permis_verso": parse_permis_verso,
    }

    parsed_data = parsers.get(doc_type, parse_cin)(raw_text)

    return {
        "success": True,
        "raw_text": raw_text,
        "data": parsed_data
    }


def parse_carte_grise_verso(text: str) -> dict:
    result = {
        "type": "carte_grise_verso",
        "marque": None,
        "type_vehicule": None,
        "genre": None,
        "modele": None,
        "carburant": None,
        "chassis": None,
        "cylindres": None,
        "puissance_fiscale": None,
        "nb_places": None,
        "ptac": None,
        "poids_vide": None,
        "numero_vehicule": None,
    }

    KNOWN_BRANDS = [
        'DACIA', 'RENAULT', 'PEUGEOT', 'CITROEN', 'VOLKSWAGEN', 'VW',
        'BMW', 'MERCEDES', 'TOYOTA', 'HYUNDAI', 'KIA', 'FORD', 'FIAT',
        'SEAT', 'OPEL', 'NISSAN', 'HONDA', 'MAZDA', 'SUZUKI', 'MITSUBISHI',
        'AUDI', 'SKODA', 'VOLVO', 'JEEP', 'CHEVROLET', 'LAND ROVER',
    ]

    def fuzzy_brand(word, brands, max_diff=2):
        w = word.upper()
        for brand in brands:
            if brand == w:
                return brand
            if abs(len(brand) - len(w)) <= 1:
                diffs = sum(a != b for a, b in zip(brand.ljust(12), w.ljust(12)))
                if diffs <= max_diff:
                    return brand
        return None

    lines = [l.strip() for l in text.split('\n') if l.strip()]

    # === MARQUE ===
    for brand in KNOWN_BRANDS:
        if brand.lower() in text.lower():
            result["marque"] = brand
            break
    if not result["marque"]:
        for i, line in enumerate(lines):
            if re.search(r'marque\s*:?\s*$', line, re.IGNORECASE) and i > 0:
                for word in lines[i-1].split():
                    m = fuzzy_brand(word, KNOWN_BRANDS)
                    if m:
                        result["marque"] = m
                        break

    # === TYPE VEHICULE ===
    m = re.search(r'\bType\s+(?!carburant)([A-Z0-9][A-Z0-9\-]{2,10})\b', text, re.IGNORECASE)
    if m:
        result["type_vehicule"] = m.group(1).upper()

    # === GENRE ===
    m = re.search(r'Genre\s+([A-Z][A-Z\s]+?)(?:\s*[|£\n]|\s{2,})', text, re.IGNORECASE)
    if m:
        result["genre"] = m.group(1).strip()

    # === MODÈLE ===
    m = re.search(r'[Mm]od[eè]le\s+([A-Z0-9][^\n]{1,20})', text)
    if m and m.group(1).strip() not in ('-', '–', '—', '=', '= |'):
        result["modele"] = m.group(1).strip()

    # === CARBURANT ===
    for c in ['Diesel', 'Essence', 'Hybride', 'Electrique', 'GPL', 'GNV']:
        if c.lower() in text.lower():
            result["carburant"] = c
            break

    # === N° CHÂSSIS ===
    # Tesseract peut ajouter "-" avant ou des espaces/bruit après
    m = re.search(r'ch[aâ]ssis\s+-?([A-Z0-9]{10,20})', text, re.IGNORECASE)
    if m:
        result["chassis"] = m.group(1)

    # === CYLINDRES ===
    # Tesseract écrit "cyhndres" au lieu de "cylindres"
    m = re.search(r'cy[lh]?[ni][hn]?dres?\s+(\d+)', text, re.IGNORECASE)
    if not m:
        m = re.search(r'cylindres?\s+[A-Za-z\s]{0,10}(\d+)\b', text, re.IGNORECASE)
    if m and int(m.group(1)) <= 16:
        result["cylindres"] = int(m.group(1))

    # === PUISSANCE FISCALE ===
    m = re.search(r'[Pp]uissance\s+(?:fiscale\s+)?(\d+)', text)
    if m:
        result["puissance_fiscale"] = int(m.group(1))

    # === NOMBRE DE PLACES ===
    m = re.search(r'[Pp]laces?\s+(\d+)', text)
    if m:
        result["nb_places"] = int(m.group(1))

    # === PTAC ===
    # Tesseract écrit "PTAC.E_———,," ou "P T A C" ou "PTAC"
    m = re.search(r'P\.?T\.?A\.?C[^0-9\n]{0,20}(\d[\d\s]*)\s*kg', text, re.IGNORECASE)
    if m:
        result["ptac"] = m.group(1).strip() + ' kg'

    # === POIDS À VIDE ===
    # Tesseract écrit "Pords à vide" ou "Poids à nde", et "xg" au lieu de "kg"
    m = re.search(r'[Pp][oi]?[ro]?[di][sd]s?\s+[àa]\s+\w+\s+(\d[\d\s]*)\s*[xk]g', text)
    if m:
        result["poids_vide"] = m.group(1).strip() + ' kg'

    # === NUMÉRO VÉHICULE (bas de carte) ===
    m = re.search(r'[NC]-[\d\s]{10,20}', text)
    if m:
        result["numero_vehicule"] = re.sub(r'\s+', ' ', m.group(0).strip())

    return result

def parse_permis_verso(text: str) -> dict:
    result = {
        "type": "permis_verso",
        "categories": {},
        "expiry_date": None,
        "permis_number": None,
    }

    # Fin de validité — chercher date après le label (peut être sur la ligne suivante)
    m = re.search(r'fin\s+de\s+validit[eé][^\d\n]*\n?(\d{2}[\/\.]\d{2}[\/\.]\d{4})', text, re.IGNORECASE)
    if m:
        result["expiry_date"] = m.group(1)
    else:
        # Fallback: toutes les dates, prendre la plus grande (= expiry)
        all_dates = re.findall(r'(\d{2}[\/.\-]\d{2}[\/.\-]\d{4})', text)
        if all_dates:
            # Trier et prendre la dernière (date la plus lointaine = expiry)
            sorted_dates = sorted(all_dates, key=lambda d: d.split('/')[::-1])
            result["expiry_date"] = sorted_dates[-1]

    # Numéro permis — format 1400000000002618 (16 chiffres)
    # Tesseract peut lire "+400..." au lieu de "1400..."
    m = re.search(r'[+\-]?(1?\d{15})\b', text)
    if m:
        num = m.group(0).replace('+', '1').replace('-', '1')
        if not num.startswith('1'):
            num = '1' + num
        result["permis_number"] = num
    else:
        m = re.search(r'\b(\d{13,18})\b', text)
        if m:
            result["permis_number"] = m.group(1)

    # MRZ code (bas de page) — extraire catégories si présent
    mrz = re.search(r'([A-Z]{3}[A-Z0-9<]{20,})', text.upper())
    if mrz:
        result["mrz"] = mrz.group(1)

    # Catégories — parser le tableau (Tesseract lit souvent mal)
    valid_cats = {'AM', 'A1', 'A2', 'A', 'B1', 'B', 'C1', 'C', 'D1', 'D',
                  'BE', 'CE', 'DE', 'EB', 'EC', 'ED'}
    lines = [l.strip() for l in text.split('\n') if l.strip()]
    for line in lines:
        # Nettoyer la ligne des caractères parasites [ ] | *
        clean = re.sub(r'[\[\]|\*\(\)"!]', ' ', line).strip()
        # Pattern: CATEGORIE  DATE_OU_ETOILES  RESTRICTION
        m = re.match(r'^([A-Z]{1,2}\d?)\s+(\d{2}[\/.\-]\d{2}[\/.\-]\d{4}|\*+)\s*(.*)?$', clean)
        if m:
            cat = m.group(1).upper()
            if cat in valid_cats:
                date_raw = m.group(2)
                date = date_raw if re.match(r'\d{2}', date_raw) else None
                result["categories"][cat] = {
                    "date_delivrance": date,
                    "restrictions": None
                }

    # Si catégories vides mais on a des dates dans le texte
    # Associer la 1ère date trouvée à B (cat la plus commune)
    if not result["categories"]:
        issue_dates = [d for d in re.findall(r'(\d{2}[\/.\-]\d{2}[\/.\-]\d{4})', text)
                       if d != result["expiry_date"]]
        if issue_dates:
            result["categories"]["B"] = {
                "date_delivrance": issue_dates[0],
                "restrictions": None
            }

    return result


#Regex = Regular Expression = une façon d'écrire un motif de recherche dans du texte.Au lieu de chercher un mot exact, tu décris la forme de ce que tu cherches.
#Les symboles de base
#[A-Z]     = n'importe quelle lettre majuscule (A, B, C... Z)
#[a-z]     = n'importe quelle lettre minuscule
#\d        = n'importe quel chiffre (0, 1, 2... 9)
#\s        = un espace ou tabulation
#.         = n'importe quel caractère
#{2}       = exactement 2 fois
#{2,5}     = entre 2 et 5 fois
#+         = 1 fois ou plus
#*         = 0 fois ou plus
#?         = 0 ou 1 fois (optionnel)
#\b        = frontière de mot (début ou fin)
#^         = début de ligne
#$         = fin de ligne