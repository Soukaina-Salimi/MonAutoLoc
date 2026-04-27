# MarketingOrchestratorAgent/agents/image_agent.py
# RÔLE : Prépare et optimise l'image pour chaque plateforme

import httpx
import os
import base64
from PIL import Image, ImageDraw, ImageFont
import io
from typing import Optional

# Dimensions optimales par plateforme
PLATFORM_SPECS = {
    "facebook":  {"width": 1200, "height": 630,  "ratio": "1.91:1"},
    "instagram": {"width": 1080, "height": 1080, "ratio": "1:1"},
    "tiktok":    {"width": 1080, "height": 1920, "ratio": "9:16"},
}


async def run(
    vehicle_data:    dict,
    platforms:       list,
    promo_price:     Optional[float] = None,
) -> dict:
    """
    Prépare les visuels marketing pour chaque plateforme.
    Si une image existe → la redimensionner + ajouter le watermark AutoRent.
    Sinon → générer un visuel placeholder de qualité.
    """

    image_url = vehicle_data.get("image_url")
    results   = {}

    for platform in platforms:
        try:
            if image_url:
                # Télécharger et optimiser l'image existante
                processed = await _process_existing_image(
                    image_url    = image_url,
                    platform     = platform,
                    vehicle_data = vehicle_data,
                    promo_price  = promo_price,
                )
            else:
                # Générer un visuel placeholder
                processed = _generate_placeholder(
                    platform     = platform,
                    vehicle_data = vehicle_data,
                    promo_price  = promo_price,
                )

            results[platform] = processed

        except Exception as e:
            results[platform] = {
                "success":   False,
                "error":     str(e),
                "image_url": image_url,  # fallback — image originale
            }

    return {"images": results}


async def _process_existing_image(
    image_url:    str,
    platform:     str,
    vehicle_data: dict,
    promo_price:  Optional[float],
) -> dict:
    """Télécharge, redimensionne et watermark l'image."""

    # Télécharger l'image
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.get(image_url)
        if resp.status_code != 200:
            raise Exception(f"Impossible de télécharger l'image: {image_url}")
        image_bytes = resp.content

    # Ouvrir avec Pillow
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")

    # Redimensionner selon la plateforme
    spec   = PLATFORM_SPECS.get(platform, PLATFORM_SPECS["facebook"])
    target = (spec["width"], spec["height"])
    img    = _smart_resize(img, target)

    # Ajouter le watermark AutoRent
    img = _add_watermark(img, platform)

    # Ajouter le badge prix si promo
    if promo_price:
        img = _add_price_badge(img, promo_price, vehicle_data.get("price_per_day"))

    # Ajouter le bandeau infos véhicule en bas
    img = _add_vehicle_info_banner(img, vehicle_data, platform)

    # Convertir en base64 pour retourner
    buffer = io.BytesIO()
    img.save(buffer, format="JPEG", quality=90, optimize=True)
    img_base64 = base64.b64encode(buffer.getvalue()).decode()

    # Sauvegarder localement (pour servir via URL)
    filename = f"marketing_{vehicle_data.get('id', 'xxx')}_{platform}.jpg"
    save_path = f"/tmp/{filename}"
    img.save(save_path, format="JPEG", quality=90)

    return {
        "success":    True,
        "platform":   platform,
        "dimensions": f"{img.width}x{img.height}",
        "base64":     f"data:image/jpeg;base64,{img_base64}",
        "local_path": save_path,
        "filename":   filename,
        # En prod → uploader sur S3/Cloudinary et retourner l'URL publique
        "image_url":  image_url,  # fallback pour l'instant
    }


def _generate_placeholder(
    platform:     str,
    vehicle_data: dict,
    promo_price:  Optional[float],
) -> dict:
    """Génère un visuel de remplacement si pas d'image véhicule."""

    spec   = PLATFORM_SPECS.get(platform, PLATFORM_SPECS["facebook"])
    width  = spec["width"]
    height = spec["height"]

    # Fond dégradé bleu-violet (couleurs AutoRent)
    img  = Image.new("RGB", (width, height))
    draw = ImageDraw.Draw(img)

    # Dégradé manuel
    for y in range(height):
        ratio = y / height
        r = int(30  + (147 - 30)  * ratio)
        g = int(58  + (51  - 58)  * ratio)
        b = int(138 + (234 - 138) * ratio)
        draw.line([(0, y), (width, y)], fill=(r, g, b))

    # Texte principal
    brand = vehicle_data.get("brand", "")
    model = vehicle_data.get("model", "")
    price = promo_price or vehicle_data.get("price_per_day", 0)
    city  = vehicle_data.get("city", "Maroc")

    draw.text((width // 2, height // 2 - 80), f"{brand} {model}",
              fill="white", anchor="mm")
    draw.text((width // 2, height // 2),
              f"{price} MAD/jour",
              fill="#FFD700", anchor="mm")
    draw.text((width // 2, height // 2 + 60),
              f"📍 {city}",
              fill="white", anchor="mm")
    draw.text((width // 2, height - 40),
              "autorent.ma",
              fill="rgba(255,255,255,0.7)", anchor="mm")

    buffer = io.BytesIO()
    img.save(buffer, format="JPEG", quality=85)
    img_base64 = base64.b64encode(buffer.getvalue()).decode()

    return {
        "success":    True,
        "platform":   platform,
        "dimensions": f"{width}x{height}",
        "base64":     f"data:image/jpeg;base64,{img_base64}",
        "generated":  True,
        "image_url":  None,
    }


def _smart_resize(img: Image.Image, target: tuple) -> Image.Image:
    """Redimensionne intelligemment en préservant le sujet central."""
    target_w, target_h = target
    orig_w,   orig_h   = img.size
    target_ratio = target_w / target_h
    orig_ratio   = orig_w  / orig_h

    if orig_ratio > target_ratio:
        # Image plus large → crop côtés
        new_h = orig_h
        new_w = int(orig_h * target_ratio)
        left  = (orig_w - new_w) // 2
        img   = img.crop((left, 0, left + new_w, orig_h))
    else:
        # Image plus haute → crop haut/bas
        new_w = orig_w
        new_h = int(orig_w / target_ratio)
        top   = (orig_h - new_h) // 2
        img   = img.crop((0, top, orig_w, top + new_h))

    return img.resize((target_w, target_h), Image.LANCZOS)


def _add_watermark(img: Image.Image, platform: str) -> Image.Image:
    """Ajoute le logo AutoRent en filigrane."""
    draw = ImageDraw.Draw(img)
    w, h = img.size

    # Bandeau en haut à gauche
    draw.rectangle([10, 10, 160, 45], fill=(30, 58, 138, 200))
    draw.text((85, 27), "AutoRent", fill="white", anchor="mm")

    return img


def _add_price_badge(
    img:            Image.Image,
    promo_price:    float,
    original_price: Optional[float],
) -> Image.Image:
    """Ajoute un badge prix promotionnel."""
    draw = ImageDraw.Draw(img)
    w, h = img.size

    # Badge rouge en haut à droite
    badge_x = w - 150
    badge_y = 10
    draw.ellipse([badge_x, badge_y, badge_x + 140, badge_y + 100],
                 fill=(220, 38, 38))
    draw.text((badge_x + 70, badge_y + 30),
              f"{int(promo_price)}",
              fill="white", anchor="mm")
    draw.text((badge_x + 70, badge_y + 55),
              "MAD/jour",
              fill="white", anchor="mm")

    if original_price and original_price > promo_price:
        draw.text((badge_x + 70, badge_y + 75),
                  f"({int(original_price)} MAD)",
                  fill="#FCA5A5", anchor="mm")

    return img


def _add_vehicle_info_banner(
    img:          Image.Image,
    vehicle_data: dict,
    platform:     str,
) -> Image.Image:
    """Ajoute un bandeau d'infos en bas de l'image."""
    draw  = ImageDraw.Draw(img)
    w, h  = img.size
    band_h = 70

    # Fond semi-transparent en bas
    overlay = Image.new("RGBA", (w, band_h), (0, 0, 0, 180))
    img.paste(overlay, (0, h - band_h), overlay)

    draw = ImageDraw.Draw(img)

    brand = vehicle_data.get("brand", "")
    model = vehicle_data.get("model", "")
    year  = vehicle_data.get("year", "")
    fuel  = vehicle_data.get("fuel_type", "")
    city  = vehicle_data.get("city", "")

    draw.text((20, h - band_h + 15),
              f"{brand} {model} {year}",
              fill="white")
    draw.text((20, h - band_h + 40),
              f"⛽ {fuel}  📍 {city}  🌐 autorent.ma",
              fill="#D1D5DB")

    return img