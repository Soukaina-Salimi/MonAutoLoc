# marketing-orchestrator/agents/publish_agent.py
import time
import logging
import asyncio
from mcp.social_tools import execute_marketing_tool

logger = logging.getLogger("marketing_orchestrator")


async def run(
    contents:        dict,
    vehicle_data:    dict,
    owner_id:        int,
    campaign_config: dict,
) -> dict:
    vehicule_id = vehicle_data.get("id")
    image_url   = vehicle_data.get("image_url")
    vehicle_url = f"https://autorent.ma/vehicules/{vehicule_id}"

    publish_tasks = []
    platforms     = list(contents.get("contents", {}).keys())

    logger.info(
        f"[MARKETING][PUBLISH] ▶ START | owner_id={owner_id} | "
        f"vehicule_id={vehicule_id} | platforms={platforms} | "
        f"image={'OK' if image_url else 'absente'}"
    )

    for platform in platforms:
        content_data = contents["contents"].get(platform, {})
        text         = content_data.get("content", "")

        if platform == "facebook":
            logger.info(
                f"[MARKETING][PUBLISH]   prépare Facebook | chars={len(text)} | "
                f"link={vehicle_url}"
            )
            publish_tasks.append(
                execute_marketing_tool("publish_facebook", {
                    "owner_id":  owner_id,   # ← OBLIGATOIRE
                    "message":   text,
                    "image_url": image_url,
                    "link":      vehicle_url,
                })
            )
        elif platform == "instagram":
            logger.info(
                f"[MARKETING][PUBLISH]   prépare Instagram | chars={len(text)} | "
                f"image={'OK' if image_url else 'manquante'}"
            )
            publish_tasks.append(
                execute_marketing_tool("publish_instagram", {
                    "owner_id":  owner_id,   # ← OBLIGATOIRE
                    "image_url": image_url,
                    "caption":   text,
                })
            )
        elif platform == "tiktok":
            logger.info(f"[MARKETING][PUBLISH]   prépare TikTok (simulation) | chars={len(text)}")
            publish_tasks.append(_simulate_tiktok(text, vehicle_url))

    logger.info(
        f"[MARKETING][PUBLISH] → asyncio.gather sur {len(publish_tasks)} tâche(s) "
        f"en parallèle"
    )

    t0 = time.time()
    results = await asyncio.gather(*publish_tasks, return_exceptions=True)
    dur = round((time.time() - t0) * 1000)

    logger.info(f"[MARKETING][PUBLISH] gather terminé en {dur}ms")

    published = []
    for i, result in enumerate(results):
        platform = platforms[i] if i < len(platforms) else "unknown"

        if isinstance(result, Exception):
            published.append({
                "platform": platform,
                "success":  False,
                "error":    str(result),
            })
            logger.warning(
                f"[MARKETING][PUBLISH] ✗ platform={platform} | exception={result}"
            )
        else:
            published.append({**result, "platform": platform})

            if result.get("success"):
                logger.info(
                    f"[MARKETING][PUBLISH] ✓ platform={platform} | "
                    f"post_id={result.get('post_id')} | "
                    f"url={result.get('post_url')} | "
                    f"simulated={result.get('simulated', False)}"
                )

                # Sauvegarder UNIQUEMENT si vraiment publié (pas simulé)
                if not result.get("simulated"):
                    save_result = await execute_marketing_tool("save_campaign", {
                        "owner_id":    owner_id,
                        "vehicule_id": vehicule_id,
                        "platform":    platform,
                        "post_id":     result.get("post_id", ""),
                        "post_url":    result.get("post_url", ""),
                        "content":     contents["contents"].get(platform, {}).get("content", ""),
                        "status":      "published",
                    })
                    if save_result.get("saved"):
                        logger.info(
                            f"[MARKETING][PUBLISH]   campagne sauvegardée | "
                            f"platform={platform} | campaign_id={save_result.get('id')}"
                        )
                    else:
                        logger.warning(
                            f"[MARKETING][PUBLISH]   échec sauvegarde campagne | platform={platform}"
                        )
                else:
                    logger.info(
                        f"[MARKETING][PUBLISH]   campagne non sauvegardée (simulée) | "
                        f"platform={platform}"
                    )
            else:
                logger.warning(
                    f"[MARKETING][PUBLISH] ✗ platform={platform} | "
                    f"code={result.get('code')} | error={result.get('error')}"
                )

    success_count = sum(1 for p in published if p.get("success"))
    fail_count    = len(published) - success_count

    logger.info(
        f"[MARKETING][PUBLISH] ▶ END | success={success_count} | failed={fail_count}"
    )

    return {"published": published}


async def _simulate_tiktok(script: str, url: str) -> dict:
    return {
        "success":   True,
        "simulated": True,
        "post_id":   f"tiktok_sim_{abs(hash(script)) % 99999}",
        "post_url":  "https://tiktok.com/@autorent.ma",
        "platform":  "tiktok",
        "note":      "Script généré — publication manuelle requise",
        "script":    script,
    }