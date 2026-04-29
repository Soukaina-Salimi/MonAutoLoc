# marketing-orchestrator/mcp/social_tools.py

import httpx
import os
from datetime import datetime

GROQ_API_KEY     = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL       = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
AUTH_SERVICE_URL = os.getenv("AUTH_SERVICE_URL", "http://auth-service")


# ── Router principal ──────────────────────────────────────────────────────────

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


# ── Récupérer les tokens d'un owner depuis auth-service ──────────────────────

async def _get_owner_tokens(owner_id: int, platform: str) -> dict | None:
    """
    Récupère les tokens de CET owner spécifique depuis la BDD.
    Route interne auth-service : GET /api/internal/social-accounts/{userId}/{platform}
    """
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(
                f"{AUTH_SERVICE_URL}/api/internal/social-accounts/{owner_id}/{platform}"
            )
        if resp.status_code == 200:
            return resp.json()
        print(f"[_get_owner_tokens] owner={owner_id} platform={platform} → {resp.status_code}")
        return None
    except Exception as e:
        print(f"[_get_owner_tokens] Error: {e}")
        return None


# ── Publication Facebook ──────────────────────────────────────────────────────

async def _publish_facebook(params: dict) -> dict:
    """
    Publie sur la page Facebook de l'owner.
    Nécessite que l'owner ait connecté son compte via OAuth.
    """
    owner_id = params.get("owner_id")

    if not owner_id:
        return {
            "success":   False,
            "simulated": False,
            "error":     "owner_id manquant dans les paramètres",
            "code":      "MISSING_OWNER_ID",
        }

    # Récupérer les tokens de CET owner
    account = await _get_owner_tokens(owner_id, "facebook")

    if not account:
        return {
            "success":   False,
            "simulated": False,
            "platform":  "facebook",
            "error":     "Compte Facebook non connecté. Connectez votre page dans Paramètres → Réseaux sociaux.",
            "code":      "NOT_CONNECTED",
        }

    token   = account.get("decrypted_token")
    page_id = account.get("page_id")

    if not token:
        return {
            "success": False,
            "error":   "Token Facebook invalide ou expiré. Reconnectez votre compte.",
            "code":    "INVALID_TOKEN",
        }

    if not page_id:
        return {
            "success": False,
            "error":   "Page ID manquant. Reconnectez votre compte Facebook.",
            "code":    "MISSING_PAGE_ID",
        }

    payload = {
        "message":      params.get("message", ""),
        "access_token": token,
    }
    if params.get("link"):
        payload["link"] = params["link"]

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            if params.get("image_url"):
                resp = await client.post(
                    f"https://graph.facebook.com/v19.0/{page_id}/photos",
                    data={**payload, "url": params["image_url"]}
                )
            else:
                resp = await client.post(
                    f"https://graph.facebook.com/v19.0/{page_id}/feed",
                    data=payload
                )

        result = resp.json()
        print(f"[Facebook API] Response: {result}")

        if "id" in result:
            return {
                "success":   True,
                "simulated": False,
                "post_id":   result["id"],
                "post_url":  f"https://facebook.com/{result['id'].replace('_', '/posts/')}",
                "platform":  "facebook",
                "page_name": account.get("page_name"),
                "owner_id":  owner_id,
            }

        fb_error = result.get("error", {})
        return {
            "success":   False,
            "simulated": False,
            "error":     fb_error.get("message", "Erreur Facebook inconnue"),
            "fb_code":   fb_error.get("code"),
        }

    except Exception as e:
        return {
            "success":   False,
            "simulated": False,
            "error":     f"Erreur réseau Facebook: {str(e)}",
        }


# ── Publication Instagram ─────────────────────────────────────────────────────

async def _publish_instagram(params: dict) -> dict:
    """
    Publie sur le compte Instagram Business de l'owner.
    Nécessite un compte Instagram Business lié à une page Facebook.
    """
    owner_id = params.get("owner_id")

    if not owner_id:
        return {
            "success": False,
            "error":   "owner_id manquant",
            "code":    "MISSING_OWNER_ID",
        }

    # Récupérer les tokens Instagram de cet owner
    account = await _get_owner_tokens(owner_id, "instagram")

    if not account:
        return {
            "success":   False,
            "simulated": False,
            "platform":  "instagram",
            "error":     "Compte Instagram non connecté. Connectez votre page Facebook (Instagram Business sera lié automatiquement).",
            "code":      "NOT_CONNECTED",
        }

    token      = account.get("decrypted_token")
    ig_user_id = account.get("ig_user_id")

    if not token or not ig_user_id:
        return {
            "success": False,
            "error":   "Token ou User ID Instagram manquant. Reconnectez votre compte.",
            "code":    "INVALID_TOKEN",
        }

    if not params.get("image_url"):
        return {
            "success": False,
            "error":   "Une image publique est requise pour publier sur Instagram.",
            "code":    "MISSING_IMAGE",
        }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            # Étape 1 : créer le media container
            container_resp = await client.post(
                f"https://graph.facebook.com/v19.0/{ig_user_id}/media",
                params={
                    "image_url":    params["image_url"],
                    "caption":      params.get("caption", ""),
                    "access_token": token,
                }
            )
            container = container_resp.json()
            print(f"[Instagram] Container: {container}")

            if "id" not in container:
                return {
                    "success": False,
                    "error":   container.get("error", {}).get("message", "Erreur création media Instagram"),
                }

            # Étape 2 : publier le container
            publish_resp = await client.post(
                f"https://graph.facebook.com/v19.0/{ig_user_id}/media_publish",
                params={
                    "creation_id":  container["id"],
                    "access_token": token,
                }
            )
            result = publish_resp.json()
            print(f"[Instagram] Publish: {result}")

        if "id" in result:
            return {
                "success":   True,
                "simulated": False,
                "post_id":   result["id"],
                "post_url":  f"https://instagram.com/p/{result['id']}",
                "platform":  "instagram",
                "owner_id":  owner_id,
            }

        return {
            "success":   False,
            "simulated": False,
            "error":     result.get("error", {}).get("message", "Erreur publication Instagram"),
        }

    except Exception as e:
        return {
            "success":   False,
            "simulated": False,
            "error":     f"Erreur réseau Instagram: {str(e)}",
        }


# ── Analytics ─────────────────────────────────────────────────────────────────

async def _get_analytics(params: dict) -> dict:
    return {
        "post_id":    params.get("post_id"),
        "platform":   params.get("platform", "facebook"),
        "simulated":  True,
        "reach":      0,
        "impressions":0,
        "likes":      0,
        "note":       "Analytics disponibles après connexion du compte",
    }


# ── Sauvegarder la campagne en BDD ────────────────────────────────────────────

async def _save_campaign(params: dict) -> dict:
    """Sauvegarde la campagne via auth-service."""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.post(
                f"{AUTH_SERVICE_URL}/api/internal/marketing-campaigns",
                json=params
            )
        if resp.status_code in (200, 201):
            data = resp.json()
            print(f"[save_campaign] Saved: id={data.get('id')}")
            return {"saved": True, "id": data.get("id")}
        print(f"[save_campaign] Failed: {resp.status_code} — {resp.text}")
        return {"saved": False}
    except Exception as e:
        print(f"[save_campaign] Error: {e}")
        return {"saved": False}


# ── Génération de contenu ─────────────────────────────────────────────────────

async def _generate_content(params: dict) -> dict:
    vehicle  = params["vehicle_data"]
    platform = params.get("platform", "facebook")
    tone     = params.get("tone", "professionnel")
    language = params.get("language", "fr")
    promo    = params.get("promo_price")

    platform_instructions = {
        "facebook":  "Post Facebook : 3-4 phrases accrocheuses + émojis + appel à l'action. Max 300 mots.",
        "instagram": "Caption Instagram : accroche + description + 15-20 hashtags. Max 200 mots + hashtags.",
        "tiktok":    "Script TikTok 30s : [HOOK]: ... [PRÉSENTATION]: ... [OFFRE]: ... [CTA]: ...",
    }

    price_info = f"Prix promo: {promo} MAD/jour" if promo else f"Prix: {vehicle.get('price_per_day')} MAD/jour"

    prompt = f"""Expert marketing digital au Maroc. Génère le contenu pour ce véhicule.

VÉHICULE: {vehicle.get('brand')} {vehicle.get('model')} ({vehicle.get('year','')})
{price_info} | {vehicle.get('fuel_type','')} | {vehicle.get('city','Maroc')}
Description: {vehicle.get('description','')}
Chauffeur: {'Oui' if vehicle.get('offers_driver') else 'Non'}

PLATEFORME: {platform}
INSTRUCTIONS: {platform_instructions.get(platform,'')}
TON: {tone} | LANGUE: {'Français' if language=='fr' else 'Arabe' if language=='ar' else 'Anglais'}

Génère UNIQUEMENT le contenu du post, sans explication."""

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={"Authorization": f"Bearer {GROQ_API_KEY}"},
                json={
                    "model":       GROQ_MODEL,
                    "messages":    [{"role": "user", "content": prompt}],
                    "max_tokens":  500,
                    "temperature": 0.7,
                }
            )
        content = resp.json()["choices"][0]["message"]["content"]
        return {"content": content, "platform": platform, "char_count": len(content)}
    except Exception as e:
        return {"content": f"Erreur génération: {e}", "platform": platform}