# agent-orchestrator/agents/formatage_agent.py
# RÔLE : Construit la réponse finale lisible

import os
import json
import httpx

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL   = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")


async def run(
    original_message: str,
    extraction:  dict,
    vehicules:   dict,
    services:    dict,
    dispo:       dict,
    prix:        dict,
    context:     dict,
    history:     list,
) -> dict:
    """Synthétise tous les résultats en une réponse naturelle."""

    # Construire le résumé des données pour le LLM
    data_summary = _build_data_summary(vehicules, services, dispo, prix, context)

    system_prompt = f"""Tu es l'assistant final de la plateforme AutoRent Maroc.
Tu reçois des données déjà traitées par des agents spécialisés et tu dois formuler une réponse naturelle en français.

DONNÉES DISPONIBLES :
{data_summary}

RÈGLES :
- Réponse courte et directe (max 4 phrases)
- Toujours en français
- Format véhicule : "**Marque Modèle** (Ville) - X MAD/jour"
- Si disponibilité vérifiée, mentionner le total pour X jours
- Si chauffeur inclus, mentionner le surcoût
- Terminer par une question d'aide si pertinent
- Ne jamais mentionner d'immatriculation, VIN, email, téléphone direct

CONTEXTE PAGE : {context.get('page', 'general')}"""

    messages_for_groq = [{"role": "system", "content": system_prompt}]

    # Ajouter l'historique court
    for h in history[-4:]:
        messages_for_groq.append({"role": h["role"], "content": h["content"]})

    messages_for_groq.append({"role": "user", "content": original_message})

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={"Authorization": f"Bearer {GROQ_API_KEY}"},
                json={
                    "model":       GROQ_MODEL,
                    "messages":    messages_for_groq,
                    "max_tokens":  350,
                    "temperature": 0.5,
                }
            )

        response_text = resp.json()["choices"][0]["message"]["content"]

        # Générer les suggestions de navigation
        suggestions = _build_suggestions(vehicules, services, extraction, context)

        return {
            "response":    response_text,
            "suggestions": suggestions,
        }

    except Exception as e:
        return {
            "response":    "Je rencontre une difficulté technique. Réessayez dans un instant.",
            "suggestions": [],
            "error":       str(e),
        }


def _build_data_summary(vehicules, services, dispo, prix, context) -> str:
    parts = []

    if prix.get("prix_results"):
        parts.append("=== VÉHICULES AVEC PRIX ===")
        for p in prix["prix_results"][:4]:
            d = p["price_details"]
            line = f"- {p['brand']} {p['model']} ({p.get('city','?')}) "
            line += f"| {d['price_per_day']} MAD/jour"
            if d.get("nb_days", 1) > 1:
                line += f" | Total {d['nb_days']}j: {d['grand_total']} MAD"
            if d.get("with_driver"):
                line += f" | +{d['driver_total']} MAD chauffeur"
            line += f" | ID:{p['vehicule_id']}"
            parts.append(line)

    elif vehicules.get("vehicules"):
        parts.append("=== VÉHICULES TROUVÉS ===")
        for v in vehicules["vehicules"][:4]:
            parts.append(f"- {v['brand']} {v['model']} ({v.get('city','?')}) "
                        f"| {v['price_per_day']} MAD/jour | ID:{v['id']}")

    if services.get("owners"):
        st = services.get("service_type", "")
        label = {"transport_bagages": "BAGAGES", "livraison_colis": "LIVRAISON",
                 "demenagement": "DÉMÉNAGEMENT"}.get(st, "SERVICES")
        parts.append(f"\n=== PRESTATAIRES {label} ===")
        for o in services["owners"][:3]:
            parts.append(f"- {o['display_name']} ({o.get('city','?')}) | ID:{o['id']}")

    if dispo.get("checked"):
        parts.append(f"\n=== DISPONIBILITÉ ({dispo['start_date']} → {dispo['end_date']}) ===")
        for r in dispo.get("results", []):
            status = "✅ Disponible" if r["available"] else "❌ Réservé"
            parts.append(f"- {r['brand']} {r['model']}: {status}")

    return "\n".join(parts) if parts else "Aucune donnée pertinente trouvée."


def _build_suggestions(vehicules, services, extraction, context) -> list:
    suggestions = []

    if vehicules.get("vehicules"):
        suggestions.append({"label": "Voir les véhicules", "url": "/vehicules", "type": "vehicules"})

    st = services.get("service_type") or extraction.get("params", {}).get("service_type")
    if st:
        url_map = {
            "transport_bagages": "/bagages",
            "livraison_colis":   "/livraison",
            "demenagement":      "/demenagement",
        }
        if url := url_map.get(st):
            suggestions.append({"label": "Voir les prestataires", "url": url, "type": "service"})

    return suggestions[:3]