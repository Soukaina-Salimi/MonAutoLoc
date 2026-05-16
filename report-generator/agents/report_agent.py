# report-generator/agents/report_agent.py
"""
Agent de génération de rapport mensuel complet.
Collecte toutes les données, génère insights LLM, produit le PDF.
"""

import asyncio
import httpx
import json
import os
import logging
from datetime import datetime, date
from dateutil.relativedelta import relativedelta

logger = logging.getLogger(__name__)

GROQ_API_KEY     = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL       = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
BOOKING_SERVICE  = os.getenv("BOOKING_SERVICE_URL", "http://booking-service")
VEHICLE_SERVICE  = os.getenv("VEHICLE_SERVICE_URL", "http://vehicle-service")
AUTH_SERVICE     = os.getenv("AUTH_SERVICE_URL",    "http://auth-service")

REPORTS_DIR = "/app/reports"
os.makedirs(REPORTS_DIR, exist_ok=True)


async def generate(
    owner_id:   int,
    owner_name: str,
    month:      int  = None,
    year:       int  = None,
    token:      str  = None,
) -> dict:
    """
    Génère le rapport mensuel complet pour un owner.

    Returns:
        { "pdf_path": "...", "pdf_url": "...", "summary": {...} }
    """
    # Période analysée (défaut = mois précédent)
    if not month or not year:
        prev        = date.today().replace(day=1) - relativedelta(months=1)
        month, year = prev.month, prev.year

    period_label = datetime(year, month, 1).strftime("%B %Y").capitalize()
    logger.info(f"[report] Génération rapport {period_label} pour owner #{owner_id}")

    # ── 1. Collecter toutes les données en parallèle ──────────────────────
    (
        booking_stats,
        vehicles,
        revenue_chart,
        campaigns,
        owner_info,
    ) = await asyncio.gather(
        _fetch_booking_stats(owner_id, month, year, token),
        _fetch_vehicles(owner_id, token),
        _fetch_revenue_chart(owner_id, month, year, token),
        _fetch_campaigns(owner_id, month, year),
        _fetch_owner_info(owner_id),
        return_exceptions=True,
    )

    # Sécuriser les résultats
    if isinstance(booking_stats,  Exception): booking_stats  = {}
    if isinstance(vehicles,       Exception): vehicles       = []
    if isinstance(revenue_chart,  Exception): revenue_chart  = []
    if isinstance(campaigns,      Exception): campaigns      = []
    if isinstance(owner_info,     Exception): owner_info     = {}

    # ── 2. Analyse comportement (RFM simplifié) ───────────────────────────
    behavior = await _compute_behavior_summary(owner_id)
    if isinstance(behavior, Exception): behavior = {}

    # ── 3. Prédiction mois suivant ────────────────────────────────────────
    next_month_pred = await _predict_next_month(vehicles)
    if isinstance(next_month_pred, Exception): next_month_pred = {}

    # ── 4. Construire le contexte complet ─────────────────────────────────
    report_data = {
        "owner_id":       owner_id,
        "owner_name":     owner_name or owner_info.get("name", "Owner"),
        "agency_name":    owner_info.get("agency_name"),
        "period":         { "month": month, "year": year, "label": period_label },
        "generated_at":   datetime.now().isoformat(),

        # KPIs financiers
        "financials": {
            "total_revenue":      booking_stats.get("revenue", 0),
            "prev_month_revenue": booking_stats.get("prev_revenue", 0),
            "revenue_change_pct": _pct_change(
                booking_stats.get("revenue", 0),
                booking_stats.get("prev_revenue", 0)
            ),
            "avg_booking_value":  booking_stats.get("avg_value", 0),
        },

        # KPIs réservations
        "bookings": {
            "total":       booking_stats.get("total", 0),
            "completed":   booking_stats.get("completed", 0),
            "cancelled":   booking_stats.get("cancelled", 0),
            "pending":     booking_stats.get("pending", 0),
            "cancel_rate": booking_stats.get("cancel_rate", 0),
        },

        # Flotte
        "fleet": {
            "total_vehicles":    len(vehicles),
            "avg_rating":        _avg([v.get("average_rating", 0) for v in vehicles]),
            "occupation_rate":   booking_stats.get("occupation_rate", 0),
            "top_vehicle":       _top_vehicle(vehicles, booking_stats),
            "vehicles":          vehicles[:10],
        },

        # Revenus par semaine/jour
        "revenue_chart":  revenue_chart,

        # Marketing
        "marketing": {
            "campaigns_count":   len(campaigns),
            "platforms":         _group_by_platform(campaigns),
            "campaigns":         campaigns[:5],
        },

        # Comportement clients
        "behavior": behavior,

        # Prédiction mois suivant
        "next_month": next_month_pred,
    }

    # ── 5. Générer les insights LLM ───────────────────────────────────────
    insights = await _generate_insights(report_data)
    report_data["insights"] = insights

    # ── 6. Générer le PDF ─────────────────────────────────────────────────
    from pdf.report_builder import build_pdf

    filename  = f"rapport_{owner_id}_{year}_{month:02d}.pdf"
    pdf_path  = os.path.join(REPORTS_DIR, filename)

    await asyncio.get_event_loop().run_in_executor(
        None,
        lambda: build_pdf(report_data, pdf_path)
    )

    # ── 7. Sauvegarder en BDD ─────────────────────────────────────────────
    await _save_report_record(owner_id, month, year, pdf_path, filename)

    return {
        "success":   True,
        "pdf_path":  pdf_path,
        "filename":  filename,
        "period":    period_label,
        "summary": {
            "revenue":    report_data["financials"]["total_revenue"],
            "bookings":   report_data["bookings"]["total"],
            "vehicles":   report_data["fleet"]["total_vehicles"],
            "campaigns":  report_data["marketing"]["campaigns_count"],
        },
    }


# ── Collecteurs de données ─────────────────────────────────────────────────────

async def _fetch_booking_stats(owner_id, month, year, token) -> dict:
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            headers = {"Authorization": f"Bearer {token}"} if token else {}
            resp = await client.get(
                f"{BOOKING_SERVICE}/api/internal/owner/{owner_id}/monthly-stats",
                params={"month": month, "year": year},
                headers=headers,
            )
        return resp.json() if resp.status_code == 200 else {}
    except Exception as e:
        logger.warning(f"[report] booking stats failed: {e}")
        return {}


async def _fetch_vehicles(owner_id, token) -> list:
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            headers = {"Authorization": f"Bearer {token}"} if token else {}
            resp = await client.get(
                f"{VEHICLE_SERVICE}/api/owner/vehicules",
                headers=headers,
            )
        return resp.json() if resp.status_code == 200 else []
    except Exception:
        return []


async def _fetch_revenue_chart(owner_id, month, year, token) -> list:
    """Revenus semaine par semaine sur le mois."""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            headers = {"Authorization": f"Bearer {token}"} if token else {}
            resp = await client.get(
                f"{BOOKING_SERVICE}/api/internal/owner/{owner_id}/weekly-revenue",
                params={"month": month, "year": year},
                headers=headers,
            )
        return resp.json() if resp.status_code == 200 else []
    except Exception:
        return []


async def _fetch_campaigns(owner_id, month, year) -> list:
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(
                f"{AUTH_SERVICE}/api/internal/owner/{owner_id}/campaigns",
                params={"month": month, "year": year},
            )
        return resp.json() if resp.status_code == 200 else []
    except Exception:
        return []


async def _fetch_owner_info(owner_id) -> dict:
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(f"{AUTH_SERVICE}/api/users/{owner_id}")
        return resp.json() if resp.status_code == 200 else {}
    except Exception:
        return {}


async def _compute_behavior_summary(owner_id) -> dict:
    """Résumé comportemental simplifié (sans K-Means complet)."""
    from agents.ml.synthetic_clients import generate_clients, generate_bookings_history
    from agents.ml.rfm_analyzer import calculate_rfm, get_segment_stats
    import pandas as pd

    clients_df  = generate_clients(n=80)
    bookings_df = generate_bookings_history(clients_df)
    rfm_df      = calculate_rfm(bookings_df)
    seg_stats   = get_segment_stats(rfm_df)

    return {
        "total_clients":   len(clients_df),
        "champion_count":  seg_stats.get("Champion", {}).get("count", 0),
        "at_risk_count":   seg_stats.get("À risque",  {}).get("count", 0),
        "avg_rfm_score":   round(rfm_df["rfm_score_100"].mean(), 1),
        "top_segment":     max(seg_stats.items(),
                               key=lambda x: x[1]["count"],
                               default=("Standard", {}))[0],
        "segments":        seg_stats,
    }


async def _predict_next_month(vehicles) -> dict:
    """Prédiction demande mois suivant pour chaque ville/catégorie de l'owner."""
    if not vehicles:
        return {}

    # Prendre la ville et catégorie les plus représentées
    cities  = [v.get("city", "Casablanca") for v in vehicles if v.get("city")]
    cats    = [v.get("category", "berline") for v in vehicles if v.get("category")]

    top_city = max(set(cities), key=cities.count) if cities else "Casablanca"
    top_cat  = max(set(cats),   key=cats.count)   if cats   else "berline"

    try:
        from agents.ml.prophet_model import get_predictor
        import asyncio

        predictor = await asyncio.get_event_loop().run_in_executor(
            None, lambda: get_predictor(top_city, top_cat)
        )
        summary = await asyncio.get_event_loop().run_in_executor(
            None, lambda: predictor.predict_summary(30)
        )

        return {
            "city":        top_city,
            "category":    top_cat,
            "avg_daily":   summary.get("avg_daily"),
            "peak_day":    summary.get("peak_day"),
            "trend":       summary.get("trend_direction"),
            "high_demand_days": summary.get("high_demand_days"),
        }
    except Exception as e:
        logger.warning(f"[report] prediction failed: {e}")
        return {}


async def _generate_insights(data: dict) -> dict:
    """Groq LLM génère l'analyse executive du rapport."""

    rev    = data["financials"]["total_revenue"]
    rev_ch = data["financials"]["revenue_change_pct"]
    bkgs   = data["bookings"]["total"]
    occ    = data["fleet"]["occupation_rate"]
    period = data["period"]["label"]

    prompt = f"""Tu es le directeur analytique d'AutoRent Maroc.
Génère le rapport mensuel de {period} pour {data['owner_name']}.

DONNÉES DU MOIS :
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💰 Revenus       : {rev} MAD ({'+' if rev_ch >= 0 else ''}{rev_ch}% vs mois précédent)
📅 Réservations  : {bkgs} ({data['bookings']['completed']} terminées, {data['bookings']['cancelled']} annulées)
🚗 Taux occupation flotte : {occ}%
📢 Campagnes marketing : {data['marketing']['campaigns_count']}
👥 Clients analysés : {data['behavior'].get('total_clients', 0)}
🏆 Champions : {data['behavior'].get('champion_count', 0)}
⚠️ À risque de churn : {data['behavior'].get('at_risk_count', 0)}

PRÉDICTION MOIS SUIVANT :
Demande prévue : {data['next_month'].get('avg_daily', '?')} réservations/jour
Tendance : {data['next_month'].get('trend', 'stable')}

Génère une analyse en JSON :
{{
  "executive_summary":   "Synthèse executive 3 phrases, ton professionnel",
  "performance_verdict": "excellent|bon|moyen|insuffisant",
  "key_achievements":    ["Réalisation 1", "Réalisation 2", "Réalisation 3"],
  "key_concerns":        ["Préoccupation 1", "Préoccupation 2"],
  "next_month_strategy": "Plan d'action concret pour le mois suivant (2-3 phrases)",
  "pricing_advice":      "Conseil pricing pour le mois prochain",
  "fleet_advice":        "Conseil sur la flotte",
  "marketing_advice":    "Conseil sur le marketing",
  "kpis_to_watch":       ["KPI 1", "KPI 2", "KPI 3"]
}}

Réponds UNIQUEMENT en JSON valide."""

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={"Authorization": f"Bearer {GROQ_API_KEY}"},
                json={
                    "model":       GROQ_MODEL,
                    "messages":    [{"role": "user", "content": prompt}],
                    "max_tokens":  800,
                    "temperature": 0.3,
                }
            )
        content = resp.json()["choices"][0]["message"]["content"].strip()
        if "```" in content:
            content = content.split("```")[1]
            if content.startswith("json"): content = content[4:]
        return json.loads(content.strip())
    except Exception as e:
        logger.warning(f"[report] LLM insights failed: {e}")
        return {
            "executive_summary":   f"Rapport de {period} : {rev} MAD de revenus, {bkgs} réservations.",
            "performance_verdict": "moyen",
            "key_achievements":    [f"{bkgs} réservations réalisées", f"{rev} MAD générés"],
            "key_concerns":        ["Données insuffisantes pour analyse complète"],
            "next_month_strategy": "Continuez à optimiser vos disponibilités.",
            "pricing_advice":      "Analysez la concurrence locale.",
            "fleet_advice":        "Maintenez vos véhicules en bon état.",
            "marketing_advice":    "Publiez régulièrement sur les réseaux sociaux.",
            "kpis_to_watch":       ["Taux d'occupation", "Revenus mensuels", "Taux d'annulation"],
        }


async def _save_report_record(owner_id, month, year, pdf_path, filename):
    """Sauvegarde la référence du rapport en BDD."""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            await client.post(
                f"{AUTH_SERVICE}/api/internal/monthly-reports",
                json={
                    "owner_id": owner_id,
                    "month":    month,
                    "year":     year,
                    "filename": filename,
                    "pdf_path": pdf_path,
                }
            )
    except Exception as e:
        logger.warning(f"[report] save record failed: {e}")


# ── Helpers ────────────────────────────────────────────────────────────────────

def _pct_change(current, previous) -> float:
    if not previous: return 100.0 if current > 0 else 0.0
    return round(((current - previous) / previous) * 100, 1)

def _avg(lst: list) -> float:
    lst = [x for x in lst if x]
    return round(sum(lst) / len(lst), 1) if lst else 0.0

def _top_vehicle(vehicles, booking_stats) -> dict:
    if not vehicles: return {}
    return max(vehicles, key=lambda v: v.get("average_rating", 0))

def _group_by_platform(campaigns) -> dict:
    result = {}
    for c in campaigns:
        p = c.get("platform", "unknown")
        result[p] = result.get(p, 0) + 1
    return result