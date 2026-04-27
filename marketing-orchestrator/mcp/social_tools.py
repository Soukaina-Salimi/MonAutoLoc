# MarketingOrchestratorAgent/mcp/social_tools.py

import httpx
import os
import json
from typing import Optional
from datetime import datetime

# ── Tokens API (à mettre dans .env) ──────────────────────────────────────────
FB_PAGE_ACCESS_TOKEN = os.getenv("FB_PAGE_ACCESS_TOKEN", "")
FB_PAGE_ID           = os.getenv("FB_PAGE_ID", "")
IG_USER_ID           = os.getenv("IG_USER_ID", "")
IG_ACCESS_TOKEN      = os.getenv("IG_ACCESS_TOKEN", "")
TIKTOK_ACCESS_TOKEN  = os.getenv("TIKTOK_ACCESS_TOKEN", "")

# ── Définition des outils MCP ─────────────────────────────────────────────────
MARKETING_TOOLS = [
    {
        "name": "publish_facebook",
        "description": "Publie une annonce sur une page Facebook",
        "inputSchema": {
            "type": "object",
            "properties": {
                "message":   {"type": "string",  "description": "Texte du post"},
                "image_url": {"type": "string",  "description": "URL de l'image (optionnel)"},
                "link":      {"type": "string",  "description": "Lien vers la page du véhicule"},
                "scheduled_time": {"type": "string", "description": "Timestamp UNIX pour planifier (optionnel)"},
            },
            "required": ["message"]
        }
    },
    {
        "name": "publish_instagram",
        "description": "Publie une photo sur Instagram Business",
        "inputSchema": {
            "type": "object",
            "properties": {
                "image_url": {"type": "string", "description": "URL publique de l'image"},
                "caption":   {"type": "string", "description": "Légende avec hashtags"},
            },
            "required": ["image_url", "caption"]
        }
    },
    {
        "name": "generate_content",
        "description": "Génère du contenu marketing via Groq LLM",
        "inputSchema": {
            "type": "object",
            "properties": {
                "vehicle_data":  {"type": "object", "description": "Données du véhicule"},
                "platform":      {"type": "string", "description": "facebook/instagram/tiktok"},
                "tone":          {"type": "string", "description": "professionnel/casual/urgence"},
                "language":      {"type": "string", "description": "fr/ar/en"},
                "promo_price":   {"type": "number", "description": "Prix promotionnel si applicable"},
            },
            "required": ["vehicle_data", "platform"]
        }
    },
    {
        "name": "get_post_analytics",
        "description": "Récupère les statistiques d'un post Facebook/Instagram",
        "inputSchema": {
            "type": "object",
            "properties": {
                "post_id":  {"type": "string", "description": "ID du post"},
                "platform": {"type": "string", "description": "facebook/instagram"},
            },
            "required": ["post_id", "platform"]
        }
    },
    {
        "name": "save_campaign",
        "description": "Sauvegarde les infos d'une campagne en BDD via auth-service",
        "inputSchema": {
            "type": "object",
            "properties": {
                "owner_id":    {"type": "integer"},
                "vehicule_id": {"type": "integer"},
                "platform":    {"type": "string"},
                "post_id":     {"type": "string"},
                "post_url":    {"type": "string"},
                "content":     {"type": "string"},
            },
            "required": ["owner_id", "platform"]
        }
    },
]


# ── Exécution des outils ──────────────────────────────────────────────────────

async def execute_marketing_tool(tool_name: str, params: dict):

    if tool_name == "generate_content":
        return await _generate_content(params)

    elif tool_name == "publish_facebook":
        return await _publish_facebook(params)

    elif tool_name == "publish_instagram":
        return await _publish_instagram(params)

    elif tool_name == "get_post_analytics":
        return await _get_analytics(params)

    elif tool_name == "save_campaign":
        return await _save_campaign(params)

    return {"error": f"Tool {tool_name} inconnu"}


# ── Génération de contenu avec Groq ──────────────────────────────────────────

async def _generate_content(params: dict) -> dict:
    vehicle    = params["vehicle_data"]
    platform   = params.get("platform", "facebook")
    tone       = params.get("tone", "professionnel")
    language   = params.get("language", "fr")
    promo      = params.get("promo_price")

    GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
    GROQ_MODEL   = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")

    platform_instructions = {
        "facebook": "Post Facebook : 3-4 phrases accrocheuses + émojis + appel à l'action. Max 300 mots.",
        "instagram": "Caption Instagram : phrase d'accroche + description + 15-20 hashtags pertinents (#locationvoiture #maroc #autorent etc). Max 200 mots + hashtags.",
        "tiktok": "Script TikTok 30 secondes : hook choc (0-3s) + présentation véhicule (3-20s) + offre (20-27s) + CTA (27-30s). Format: [HOOK]: ... [PRÉSENTATION]: ... [OFFRE]: ... [CTA]: ...",
    }

    price_info = f"Prix promotionnel: {promo} MAD/jour" if promo else f"Prix: {vehicle.get('price_per_day')} MAD/jour"

    prompt = f"""Tu es un expert en marketing digital pour une plateforme de location de véhicules au Maroc.

VÉHICULE À PROMOUVOIR :
- Marque/Modèle: {vehicle.get('brand')} {vehicle.get('model')}
- Année: {vehicle.get('year', 'N/A')}
- Carburant: {vehicle.get('fuel_type', 'N/A')}
- Transmission: {vehicle.get('transmission', 'N/A')}
- Places: {vehicle.get('seats', 'N/A')}
- {price_info}
- Ville: {vehicle.get('city', 'Maroc')}
- Description: {vehicle.get('description', '')}
- Avec chauffeur: {'Oui' if vehicle.get('offers_driver') else 'Non'}

PLATEFORME : {platform}
INSTRUCTIONS : {platform_instructions.get(platform, platform_instructions['facebook'])}
TON : {tone}
LANGUE : {'Français' if language == 'fr' else 'Arabe' if language == 'ar' else 'Anglais'}

Génère UNIQUEMENT le contenu du post, prêt à publier. Pas d'explication.
Inclus toujours : plateforme AutoRent, lien de réservation sur https://autorent.ma"""

    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={"Authorization": f"Bearer {GROQ_API_KEY}"},
            json={
                "model": GROQ_MODEL,
                "messages": [{"role": "user", "content": prompt}],
                "max_tokens": 500,
                "temperature": 0.7,
            }
        )

    content = resp.json()["choices"][0]["message"]["content"]

    # Générer aussi les hashtags si pas Instagram
    hashtags = []
    if platform != "instagram":
        hashtags = _generate_hashtags(vehicle)

    return {
        "content":   content,
        "hashtags":  hashtags,
        "platform":  platform,
        "language":  language,
        "char_count": len(content),
    }


# ── Publication Facebook ──────────────────────────────────────────────────────

async def _publish_facebook(params: dict) -> dict:
    if not FB_PAGE_ACCESS_TOKEN or not FB_PAGE_ID:
        # Mode simulation pour le dev
        return {
            "success":  True,
            "simulated": True,
            "post_id":  f"sim_{int(datetime.now().timestamp())}",
            "post_url": "https://facebook.com/autorent.ma/posts/simulation",
            "message":  "Publication simulée (token non configuré)",
        }

    payload = {
        "message":      params["message"],
        "access_token": FB_PAGE_ACCESS_TOKEN,
    }

    if params.get("link"):
        payload["link"] = params["link"]

    if params.get("scheduled_time"):
        payload["scheduled_publish_time"] = params["scheduled_time"]
        payload["published"] = False

    async with httpx.AsyncClient(timeout=30.0) as client:
        # Si image → utiliser l'endpoint photos
        if params.get("image_url"):
            resp = await client.post(
                f"https://graph.facebook.com/v19.0/{FB_PAGE_ID}/photos",
                data={
                    **payload,
                    "url": params["image_url"],
                }
            )
        else:
            resp = await client.post(
                f"https://graph.facebook.com/v19.0/{FB_PAGE_ID}/feed",
                data=payload
            )

    result = resp.json()

    if "id" in result:
        post_id  = result["id"]
        post_url = f"https://facebook.com/{post_id.replace('_', '/posts/')}"
        return {
            "success":  True,
            "post_id":  post_id,
            "post_url": post_url,
            "platform": "facebook",
        }
    else:
        return {
            "success": False,
            "error":   result.get("error", {}).get("message", "Erreur inconnue"),
        }


# ── Publication Instagram ─────────────────────────────────────────────────────

async def _publish_instagram(params: dict) -> dict:
    if not IG_ACCESS_TOKEN or not IG_USER_ID:
        return {
            "success":   True,
            "simulated": True,
            "post_id":   f"ig_sim_{int(datetime.now().timestamp())}",
            "post_url":  "https://instagram.com/p/simulation",
            "message":   "Publication Instagram simulée",
        }

    async with httpx.AsyncClient(timeout=30.0) as client:
        # Étape 1 : créer le media container
        container_resp = await client.post(
            f"https://graph.facebook.com/v19.0/{IG_USER_ID}/media",
            params={
                "image_url":    params["image_url"],
                "caption":      params["caption"],
                "access_token": IG_ACCESS_TOKEN,
            }
        )
        container = container_resp.json()

        if "id" not in container:
            return {"success": False, "error": container.get("error", {}).get("message")}

        # Étape 2 : publier le container
        publish_resp = await client.post(
            f"https://graph.facebook.com/v19.0/{IG_USER_ID}/media_publish",
            params={
                "creation_id":  container["id"],
                "access_token": IG_ACCESS_TOKEN,
            }
        )
        result = publish_resp.json()

    if "id" in result:
        return {
            "success":  True,
            "post_id":  result["id"],
            "post_url": f"https://instagram.com/p/{result['id']}",
            "platform": "instagram",
        }
    return {"success": False, "error": result.get("error", {}).get("message")}


# ── Analytics ────────────────────────────────────────────────────────────────

async def _get_analytics(params: dict) -> dict:
    post_id  = params["post_id"]
    platform = params.get("platform", "facebook")

    if "sim_" in post_id:
        # Données simulées pour dev
        return {
            "post_id":    post_id,
            "platform":   platform,
            "reach":      int(150 + hash(post_id) % 500),
            "impressions":int(200 + hash(post_id) % 800),
            "likes":      int(10  + hash(post_id) % 50),
            "comments":   int(2   + hash(post_id) % 15),
            "shares":     int(1   + hash(post_id) % 10),
            "clicks":     int(5   + hash(post_id) % 30),
            "simulated":  True,
        }

    if platform == "facebook" and FB_PAGE_ACCESS_TOKEN:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                f"https://graph.facebook.com/v19.0/{post_id}/insights",
                params={
                    "metric":       "post_impressions,post_reach,post_reactions_by_type_total",
                    "access_token": FB_PAGE_ACCESS_TOKEN,
                }
            )
        data = resp.json().get("data", [])
        metrics = {item["name"]: item["values"][0]["value"] for item in data}
        return {"post_id": post_id, "platform": "facebook", **metrics}

    return {"error": "Analytics non disponibles"}


# ── Sauvegarder la campagne ───────────────────────────────────────────────────

async def _save_campaign(params: dict) -> dict:
    AUTH_SERVICE_URL = os.getenv("AUTH_SERVICE_URL", "http://auth-service")
    async with httpx.AsyncClient(timeout=5.0) as client:
        resp = await client.post(
            f"{AUTH_SERVICE_URL}/api/internal/marketing-campaigns",
            json=params
        )
    return resp.json() if resp.status_code in (200, 201) else {"saved": False}


# ── Hashtags helpers ─────────────────────────────────────────────────────────

def _generate_hashtags(vehicle: dict) -> list:
    base = ["#locationvoiture", "#autorent", "#maroc", "#تأجيرسيارات"]
    city = vehicle.get("city", "")
    if city:
        base.append(f"#{city.lower().replace(' ', '')}")
    if vehicle.get("fuel_type") == "electrique":
        base.extend(["#voitureelectrique", "#ecodriving"])
    if vehicle.get("offers_driver"):
        base.extend(["#avecchauffeur", "#chauffeurprive"])
    return base