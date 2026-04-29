# marketing-orchestrator/agents/publish_agent.py

from mcp.social_tools import execute_marketing_tool
import asyncio


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

    for platform in platforms:
        content_data = contents["contents"].get(platform, {})
        text         = content_data.get("content", "")

        if platform == "facebook":
            publish_tasks.append(
                execute_marketing_tool("publish_facebook", {
                    "owner_id":  owner_id,   # ← OBLIGATOIRE
                    "message":   text,
                    "image_url": image_url,
                    "link":      vehicle_url,
                })
            )
        elif platform == "instagram":
            publish_tasks.append(
                execute_marketing_tool("publish_instagram", {
                    "owner_id":  owner_id,   # ← OBLIGATOIRE
                    "image_url": image_url,
                    "caption":   text,
                })
            )
        elif platform == "tiktok":
            publish_tasks.append(_simulate_tiktok(text, vehicle_url))

    results = await asyncio.gather(*publish_tasks, return_exceptions=True)

    published = []
    for i, result in enumerate(results):
        platform = platforms[i] if i < len(platforms) else "unknown"

        if isinstance(result, Exception):
            published.append({
                "platform": platform,
                "success":  False,
                "error":    str(result),
            })
        else:
            published.append({**result, "platform": platform})

            # Sauvegarder UNIQUEMENT si vraiment publié (pas simulé)
            if result.get("success") and not result.get("simulated"):
                await execute_marketing_tool("save_campaign", {
                    "owner_id":    owner_id,
                    "vehicule_id": vehicule_id,
                    "platform":    platform,
                    "post_id":     result.get("post_id", ""),
                    "post_url":    result.get("post_url", ""),
                    "content":     contents["contents"].get(platform, {}).get("content", ""),
                    "status":      "published",
                })

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