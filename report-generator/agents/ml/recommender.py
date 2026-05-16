# behavior_analytics/agents/ml/recommender.py
"""
Système de recommandation de véhicules basé sur :
- Comportement passé du client (Content-Based)
- Comportement de clients similaires (Collaborative Filtering léger)
- Segment RFM du client
"""

import pandas as pd
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
import logging

logger = logging.getLogger(__name__)


def build_client_item_matrix(bookings_df: pd.DataFrame) -> pd.DataFrame:
    """
    Construit la matrice client × catégorie.
    Valeur = nombre de fois loué cette catégorie.
    """
    if bookings_df.empty or "category" not in bookings_df.columns:
        return pd.DataFrame()

    matrix = bookings_df.pivot_table(
        index   = "client_id",
        columns = "category",
        values  = "booking_id",
        aggfunc = "count",
        fill_value = 0,
    )
    return matrix


def recommend_for_client(
    client_id:   int,
    bookings_df: pd.DataFrame,
    rfm_df:      pd.DataFrame,
    top_n:       int = 3,
) -> dict:
    """
    Génère des recommandations pour un client.

    Stratégie hybride :
    1. Si assez de données → Collaborative Filtering
    2. Sinon → Content-Based (profil RFM + segment)
    """
    matrix = build_client_item_matrix(bookings_df)

    if matrix.empty or client_id not in matrix.index or len(matrix) < 5:
        return _content_based_recommend(client_id, rfm_df, top_n)

    return _collaborative_recommend(client_id, matrix, top_n)


def _collaborative_recommend(
    client_id: int,
    matrix:    pd.DataFrame,
    top_n:     int,
) -> dict:
    """
    Collaborative Filtering basé sur similarité cosinus.
    Trouve les N clients les plus similaires et recommande
    ce qu'ils ont loué mais pas le client cible.
    """
    # Similarité entre clients
    sim_matrix = cosine_similarity(matrix.values)
    sim_df     = pd.DataFrame(
        sim_matrix,
        index   = matrix.index,
        columns = matrix.index,
    )

    # Top 5 clients similaires (exclure le client lui-même)
    client_sims = sim_df[client_id].drop(client_id).sort_values(ascending=False)
    similar_clients = client_sims.head(5).index.tolist()

    # Ce que le client a déjà loué
    already_booked = set(
        matrix.columns[matrix.loc[client_id] > 0].tolist()
    )

    # Ce que les clients similaires ont loué
    scores = {}
    for sim_client in similar_clients:
        similarity = sim_df.loc[client_id, sim_client]
        for cat in matrix.columns:
            if cat not in already_booked and matrix.loc[sim_client, cat] > 0:
                scores[cat] = scores.get(cat, 0) + (
                    matrix.loc[sim_client, cat] * similarity
                )

    # Trier par score
    recommendations = sorted(scores.items(), key=lambda x: x[1], reverse=True)

    return {
        "method":          "collaborative_filtering",
        "similar_clients": len(similar_clients),
        "recommendations": [
            {
                "category":   cat,
                "score":      round(score, 2),
                "confidence": "haute" if score > 1.0 else "moyenne",
                "reason":     f"Clients similaires apprécient la catégorie {cat}",
            }
            for cat, score in recommendations[:top_n]
        ],
        "already_used": list(already_booked),
    }


def _content_based_recommend(
    client_id: int,
    rfm_df:    pd.DataFrame,
    top_n:     int,
) -> dict:
    """
    Recommandation Content-Based selon le segment RFM.
    Fallback quand pas assez de données collaboratives.
    """
    # Recommandations par segment
    segment_reco = {
        "Champion":      ["suv", "luxe", "berline"],
        "Loyal":         ["berline", "suv", "citadine"],
        "Potentiel":     ["berline", "suv", "citadine"],
        "Nouveau":       ["citadine", "berline", "suv"],
        "À risque":      ["berline", "citadine"],
        "Perdu VIP":     ["luxe", "suv", "berline"],
        "Dormant":       ["citadine", "berline"],
        "Sensible prix": ["citadine", "utilitaire"],
        "Standard":      ["berline", "citadine", "suv"],
    }

    # Récupérer le segment du client
    client_rfm = rfm_df[rfm_df["client_id"] == client_id]
    segment    = client_rfm["segment"].iloc[0] if not client_rfm.empty else "Standard"
    cats       = segment_reco.get(segment, ["berline", "suv"])[:top_n]

    return {
        "method":          "content_based",
        "segment":         segment,
        "recommendations": [
            {
                "category":   cat,
                "score":      1.0 - i * 0.15,
                "confidence": "moyenne",
                "reason":     f"Recommandé pour les clients {segment}",
            }
            for i, cat in enumerate(cats)
        ],
        "already_used": [],
    }