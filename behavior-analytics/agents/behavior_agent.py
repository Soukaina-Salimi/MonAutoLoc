# behavior_analytics/agents/behavior_agent.py
"""
Agent principal d'analyse comportementale.
Orchestre RFM + K-Means + Churn + Recommandations + LLM Insights.
"""

import asyncio
import httpx
import json
import os
import time
import logging
from datetime import datetime

logger = logging.getLogger("behavior_analytics")
logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(message)s")

GROQ_API_KEY    = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL      = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
BOOKING_SERVICE = os.getenv("BOOKING_SERVICE_URL", "http://booking-service")
AUTH_SERVICE    = os.getenv("AUTH_SERVICE_URL", "http://auth-service")


async def analyze(
    owner_id:   int,
    mode:       str = "full",   # full | rfm | churn | segments | recommend
    client_id:  int = None,
) -> dict:
    """
    Analyse comportementale complète pour un owner.

    Returns:
        {
          "rfm":          { segments, stats, top_clients },
          "clustering":   { profiles, scatter_points, silhouette },
          "churn":        { at_risk, high_risk, rate },
          "insights":     { ... LLM analysis ... },
          "summary":      { ... KPIs ... },
        }
    """
    import pandas as pd
    from agents.ml.synthetic_clients   import generate_clients, generate_bookings_history
    from agents.ml.rfm_analyzer        import calculate_rfm, get_segment_stats, SEGMENT_CONFIG
    from agents.ml.kmeans_segmentation import build_features, train_kmeans
    from agents.ml.churn_predictor     import train_churn_model
    from agents.ml.recommender        import recommend_for_client

    pipeline_start = time.time()

    logger.info("=" * 65)
    logger.info(
        f"[BEHAVIOR] === START === owner_id={owner_id} | mode={mode} | "
        f"client_id={client_id or '—'}"
    )
    logger.info("=" * 65)

    # ── 1. Récupérer données réelles + synthétiques ───────────────────────
    t0 = time.time()
    real_bookings = await _fetch_real_bookings(owner_id)
    real_clients  = await _fetch_real_clients(owner_id)
    dur = round((time.time() - t0) * 1000)

    logger.info(
        f"[STEP 1] Acquisition données | {dur}ms | "
        f"real_clients={len(real_clients)} | real_bookings={len(real_bookings)}"
    )

    # Utiliser synthétique si pas assez de données réelles
    if len(real_clients) < 10 and len(real_bookings) < 20:
        logger.info(
            f"[STEP 1] Données insuffisantes (<10 clients) → génération synthétique"
        )
        t0 = time.time()
        clients_df  = generate_clients(n=150)
        bookings_df = generate_bookings_history(clients_df)
        dur = round((time.time() - t0) * 1000)
        data_source = "synthetic"
        logger.info(
            f"[STEP 1] Données synthétiques générées | {dur}ms | "
            f"clients={len(clients_df)} | bookings={len(bookings_df)} | "
            f"profils=voyageur_affaires(20%), famille(25%), touriste(30%), occasionnel(25%)"
        )
    else:
        clients_df  = pd.DataFrame(real_clients)
        bookings_df = pd.DataFrame(real_bookings)
        data_source = "real"
        logger.info(
            f"[STEP 1] Utilisation données réelles | "
            f"clients={len(clients_df)} | bookings={len(bookings_df)}"
        )

    loop = asyncio.get_event_loop()

    # ── 2. RFM Analysis ───────────────────────────────────────────────────
    logger.info("-" * 65)
    logger.info("[STEP 2] ▶ Analyse RFM (Recency, Frequency, Monetary)")
    t0 = time.time()
    rfm_df = await loop.run_in_executor(
        None,
        lambda: calculate_rfm(bookings_df)
    )
    dur = round((time.time() - t0) * 1000)

    segment_stats = get_segment_stats(rfm_df)
    avg_rfm = round(rfm_df["rfm_score_100"].mean(), 1)

    logger.info(
        f"[STEP 2] RFM calculé | {dur}ms | clients_scorés={len(rfm_df)} | "
        f"score_moyen={avg_rfm}/100"
    )
    for seg, data in segment_stats.items():
        logger.info(
            f"[STEP 2]   segment={seg:<12} | count={data.get('count', 0):>3} | "
            f"{data.get('percentage', 0)}%"
        )

    # Top clients par score RFM
    top_clients = rfm_df.nlargest(10, "rfm_score_100")[[
        "client_id", "recency", "frequency", "monetary",
        "rfm_score_100", "segment"
    ]].to_dict(orient="records")

    if top_clients:
        best = top_clients[0]
        logger.info(
            f"[STEP 2] Top client: id={best['client_id']} | "
            f"segment={best['segment']} | score={best['rfm_score_100']}/100 | "
            f"R={best['recency']} F={best['frequency']} M={best['monetary']}"
        )

    # ── 3. K-Means Clustering ─────────────────────────────────────────────
    logger.info("-" * 65)
    logger.info("[STEP 3] ▶ K-Means Clustering (auto_k=True, k=2..7)")
    t0 = time.time()
    features_df  = build_features(rfm_df, bookings_df, clients_df)
    logger.info(
        f"[STEP 3] Features construites | dims={features_df.shape[1]} | "
        f"(recency, frequency, monetary, avg_order_value, avg_duration, cat_diversity)"
    )

    cluster_result = await loop.run_in_executor(
        None,
        lambda: train_kmeans(features_df, auto_k=True)
    )
    dur = round((time.time() - t0) * 1000)

    logger.info(
        f"[STEP 3] K-Means entraîné | {dur}ms | "
        f"k_optimal={cluster_result['n_clusters']} | "
        f"silhouette_score={cluster_result['silhouette_score']:.3f} "
        f"({_interpret_silhouette(cluster_result['silhouette_score'])}) | "
        f"pca_variance={cluster_result['pca_variance']}"
    )
    for p in cluster_result["cluster_profiles"]:
        logger.info(
            f"[STEP 3]   cluster='{p['name']}' | count={p['count']} | {p['pct']}%"
        )

    # ── 4. Churn Prediction ───────────────────────────────────────────────
    logger.info("-" * 65)
    logger.info("[STEP 4] ▶ Prédiction Churn (LogisticRegression, C=0.1, balanced)")
    t0 = time.time()
    churn_result = await loop.run_in_executor(
        None,
        lambda: train_churn_model(rfm_df, bookings_df, clients_df)
    )
    dur = round((time.time() - t0) * 1000)

    logger.info(
        f"[STEP 4] Modèle churn entraîné | {dur}ms | "
        f"auc_score={churn_result['auc_score']:.3f} (cross-val 5-fold) | "
        f"churn_rate={round(churn_result['churn_rate']*100,1)}% | "
        f"at_risk={churn_result['at_risk_count']} | "
        f"high_risk={churn_result['high_risk_count']}"
    )

    if churn_result.get("feature_importance"):
        fi = churn_result["feature_importance"]
        # Nouveau format : liste de dicts [{"feature": "recency", "importance": 0.45}, ...]
        if isinstance(fi, list) and len(fi) > 0:
            if isinstance(fi[0], dict) and "feature" in fi[0]:
                top_features = fi[:3]
                logger.info(
                    f"[STEP 4] Top features (importance): "
                    + ", ".join([f"{item['feature']}={item['importance']:.3f}" for item in top_features])
                )
        # Ancien format (dictionnaire) pour compatibilité
        elif isinstance(fi, dict):
            top_features = sorted(fi.items(), key=lambda x: abs(x[1]), reverse=True)[:3]
            logger.info(
                f"[STEP 4] Top features (importance): "
                + ", ".join([f"{k}={v:.3f}" for k, v in top_features])
            )
        else:
            logger.info(f"[STEP 4] feature_importance (format inconnu): {fi}")
    else:
        logger.info("[STEP 4] Pas de feature importance disponible")

    # Clients à risque (top 10)
    at_risk_clients = (
        churn_result["predictions_df"]
        .nlargest(10, "churn_probability")
        .to_dict(orient="records")
    )

    if at_risk_clients:
        worst = at_risk_clients[0]
        logger.info(
            f"[STEP 4] Client le plus à risque: id={worst.get('client_id')} | "
            f"proba_churn={worst.get('churn_probability'):.2f}"
        )

    # ── 5. Recommandation pour un client spécifique ───────────────────────
    logger.info("-" * 65)
    client_reco = None
    if client_id:
        logger.info(f"[STEP 5] ▶ Recommandation hybride | client_id={client_id}")
        t0 = time.time()
        client_reco = recommend_for_client(
            client_id   = client_id,
            bookings_df = bookings_df,
            rfm_df      = rfm_df,
        )
        dur = round((time.time() - t0) * 1000)
        method = client_reco.get("method", "—") if client_reco else "—"
        nb_reco = len(client_reco.get("recommendations", [])) if client_reco else 0
        logger.info(
            f"[STEP 5] Recommandation générée | {dur}ms | "
            f"méthode={method} | {nb_reco} suggestion(s)"
        )
    else:
        logger.info("[STEP 5] ⏭ SKIP — aucun client_id fourni")

    # ── 6. LLM Insights ───────────────────────────────────────────────────
    logger.info("-" * 65)
    logger.info("[STEP 6] ▶ Insights LLM (Groq LLaMA 3.3-70b, temperature=0.3)")
    t0 = time.time()
    llm_insights = await _generate_behavior_insights(
        segment_stats  = segment_stats,
        churn_rate     = churn_result["churn_rate"],
        at_risk_count  = churn_result["at_risk_count"],
        cluster_profiles = cluster_result["cluster_profiles"],
        top_clients    = top_clients[:3],
        data_source    = data_source,
        owner_id       = owner_id,
    )
    dur = round((time.time() - t0) * 1000)

    logger.info(f"[STEP 6] Insights générés | {dur}ms")
    logger.info(f"[STEP 6]   executive_summary: {llm_insights.get('executive_summary','')[:120]}...")
    logger.info(f"[STEP 6]   key_finding: {llm_insights.get('key_finding','')[:120]}")
    logger.info(
        f"[STEP 6]   churn_strategy.urgency={llm_insights.get('churn_strategy',{}).get('urgency','—')}"
    )

    # ── 7. Assembler le résultat ──────────────────────────────────────────
    total_clients = len(clients_df)

    total_dur = round((time.time() - pipeline_start) * 1000)
    logger.info("-" * 65)
    logger.info(
        f"[BEHAVIOR] === END === total={total_dur}ms | data_source={data_source} | "
        f"total_clients={total_clients} | "
        f"n_clusters={cluster_result['n_clusters']} | "
        f"churn_rate={round(churn_result['churn_rate']*100,1)}% | "
        f"avg_rfm={avg_rfm}"
    )
    logger.info("=" * 65)

    return {
        "owner_id":    owner_id,
        "data_source": data_source,
        "analyzed_at": datetime.now().isoformat(),
        "total_clients": total_clients,

        # KPIs rapides
        "summary": {
            "total_clients":    total_clients,
            "champion_count":   segment_stats.get("Champion",    {}).get("count", 0),
            "at_risk_count":    churn_result["at_risk_count"],
            "high_risk_count":  churn_result["high_risk_count"],
            "churn_rate_pct":   round(churn_result["churn_rate"] * 100, 1),
            "avg_rfm_score":    round(rfm_df["rfm_score_100"].mean(), 1),
            "n_clusters":       cluster_result["n_clusters"],
            "silhouette_score": cluster_result["silhouette_score"],
            "model_quality":    _interpret_silhouette(cluster_result["silhouette_score"]),
        },

        # RFM
        "rfm": {
            "segment_stats":   segment_stats,
            "segment_config":  {k: {"color": v["color"], "icon": v["icon"], "action": v["action"]}
                                for k, v in SEGMENT_CONFIG.items()},
            "top_clients":     top_clients,
            "score_distribution": {
                "champion":  segment_stats.get("Champion", {}).get("count", 0),
                "loyal":     segment_stats.get("Loyal",    {}).get("count", 0),
                "at_risk":   segment_stats.get("À risque", {}).get("count", 0),
                "lost":      segment_stats.get("Perdu VIP",{}).get("count", 0),
            },
        },

        # K-Means
        "clustering": {
            "n_clusters":      cluster_result["n_clusters"],
            "silhouette_score":cluster_result["silhouette_score"],
            "pca_variance":    cluster_result["pca_variance"],
            "profiles":        cluster_result["cluster_profiles"],
            "scatter_points":  cluster_result["scatter_points"][:100],  # limiter
        },

        # Churn
        "churn": {
            "rate":            churn_result["churn_rate"],
            "auc_score":       churn_result["auc_score"],
            "at_risk_count":   churn_result["at_risk_count"],
            "high_risk_count": churn_result["high_risk_count"],
            "at_risk_clients": at_risk_clients,
            "feature_importance": churn_result["feature_importance"],
        },

        # Recommandations client spécifique
        "recommendation": client_reco,

        # Insights LLM
        "insights": llm_insights,
    }


async def _fetch_real_bookings(owner_id: int) -> list:
    """Récupère les réservations réelles depuis booking-service."""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            logger.info(
                f"[BEHAVIOR] GET {BOOKING_SERVICE}/api/internal/owner/{owner_id}/bookings-analytics"
            )
            resp = await client.get(
                f"{BOOKING_SERVICE}/api/internal/owner/{owner_id}/bookings-analytics"
            )
        logger.info(f"[BEHAVIOR] booking-service (bookings) → status={resp.status_code}")
        return resp.json() if resp.status_code == 200 else []
    except Exception as e:
        logger.warning(f"[BEHAVIOR] _fetch_real_bookings erreur: {e}")
        return []


async def _fetch_real_clients(owner_id: int) -> list:
    """Récupère les clients uniques de cet owner."""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            logger.info(
                f"[BEHAVIOR] GET {BOOKING_SERVICE}/api/internal/owner/{owner_id}/clients"
            )
            resp = await client.get(
                f"{BOOKING_SERVICE}/api/internal/owner/{owner_id}/clients"
            )
        logger.info(f"[BEHAVIOR] booking-service (clients) → status={resp.status_code}")
        return resp.json() if resp.status_code == 200 else []
    except Exception as e:
        logger.warning(f"[BEHAVIOR] _fetch_real_clients erreur: {e}")
        return []


async def _generate_behavior_insights(
    segment_stats:    dict,
    churn_rate:       float,
    at_risk_count:    int,
    cluster_profiles: list,
    top_clients:      list,
    data_source:      str,
    owner_id:         int,
) -> dict:
    """Groq LLM génère des insights comportementaux actionnables."""

    # Préparer le résumé pour le LLM
    top_segment = max(segment_stats.items(),
                      key=lambda x: x[1].get("count", 0),
                      default=("Standard", {}))[0] if segment_stats else "Standard"

    segments_summary = ", ".join([
        f"{seg}: {data['count']} clients ({data['percentage']}%)"
        for seg, data in list(segment_stats.items())[:5]
    ])

    clusters_summary = ", ".join([
        f"{p['name']}: {p['count']} clients ({p['pct']}%)"
        for p in cluster_profiles[:4]
    ])

    prompt = f"""Tu es un expert en analyse comportementale client pour AutoRent,
plateforme de location de véhicules au Maroc.

RÉSULTATS D'ANALYSE (Owner #{owner_id})
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Segmentation RFM :
{segments_summary}

Segment dominant : {top_segment}
Taux de churn estimé : {round(churn_rate * 100, 1)}%
Clients à risque de départ : {at_risk_count}

Clusters comportementaux détectés :
{clusters_summary}

Source données : {data_source}

Génère une analyse STRATÉGIQUE en JSON :
{{
  "executive_summary": "Synthèse en 3 phrases pour l'owner",
  "key_finding":       "La découverte la plus importante",
  "segments_strategy": [
    {{
      "segment":    "nom du segment",
      "strategy":   "stratégie concrète",
      "expected_roi":"impact attendu"
    }}
  ],
  "churn_strategy": {{
    "urgency":     "faible|moyen|élevé",
    "main_cause":  "cause probable du churn",
    "action_plan": ["action 1", "action 2", "action 3"]
  }},
  "growth_opportunity": "La meilleure opportunité de croissance identifiée",
  "kpi_to_track": ["KPI 1 à surveiller", "KPI 2", "KPI 3"],
  "next_30_days": "Plan d'action prioritaire pour les 30 prochains jours"
}}

Réponds UNIQUEMENT en JSON valide."""

    logger.info(
        f"[STEP 6] Prompt construit | top_segment={top_segment} | "
        f"segments={list(segment_stats.keys())[:5]}"
    )

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={"Authorization": f"Bearer {GROQ_API_KEY}"},
                json={
                    "model":       GROQ_MODEL,
                    "messages":    [{"role": "user", "content": prompt}],
                    "max_tokens":  700,
                    "temperature": 0.3,
                }
            )

        logger.info(f"[STEP 6] Groq API → status={resp.status_code}")

        content = resp.json()["choices"][0]["message"]["content"].strip()
        if "```" in content:
            content = content.split("```")[1]
            if content.startswith("json"): content = content[4:]

        parsed = json.loads(content.strip())
        logger.info(f"[STEP 6] JSON parsé avec succès | clés={list(parsed.keys())}")
        return parsed

    except Exception as e:
        logger.warning(f"[STEP 6] ⚠ LLM failed: {e} → fallback statique")
        return {
            "executive_summary": f"Analyse de {len(segment_stats)} segments clients. Taux de churn: {round(churn_rate*100,1)}%.",
            "key_finding":       "Segmentation RFM révèle des profils distincts.",
            "segments_strategy": [],
            "churn_strategy":    {"urgency": "moyen", "main_cause": "Inactivité prolongée", "action_plan": ["Relancer les clients inactifs"]},
            "growth_opportunity":"Fidélisation des clients Champions",
            "kpi_to_track":      ["Taux de churn mensuel", "Score RFM moyen", "Taux de rétention"],
            "next_30_days":      "Lancer une campagne de réactivation sur les clients À risque.",
        }


def _interpret_silhouette(score: float) -> str:
    if score >= 0.70: return "Excellent"
    if score >= 0.50: return "Bon"
    if score >= 0.30: return "Acceptable"
    return "Faible — plus de données recommandées"