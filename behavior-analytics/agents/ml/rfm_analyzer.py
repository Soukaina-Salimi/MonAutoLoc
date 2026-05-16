# behavior_analytics/agents/ml/rfm_analyzer.py
"""
RFM Analysis (Recency, Frequency, Monetary)
Méthode classique de data analytics pour scorer les clients.

Chaque client reçoit un score R, F, M de 1 à 5
→ Score global RFM de 3 à 15
→ Segment : Champion, Loyal, À risque, Perdu...
"""

import pandas as pd
import numpy as np
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


def calculate_rfm(bookings_df: pd.DataFrame) -> pd.DataFrame:
    """
    Calcule les scores RFM pour chaque client.

    Args:
        bookings_df: DataFrame avec colonnes [client_id, date, amount]

    Returns:
        DataFrame RFM avec scores et segments
    """
    if bookings_df.empty:
        return pd.DataFrame()

    # Date de référence = aujourd'hui
    reference_date = datetime.now()

    bookings_df = bookings_df.copy()
    bookings_df["date"] = pd.to_datetime(bookings_df["date"])

    # ── Calcul RFM brut ───────────────────────────────────────────────────
    rfm = bookings_df.groupby("client_id").agg(
        recency   = ("date",   lambda x: (reference_date - x.max()).days),
        frequency = ("date",   "count"),
        monetary  = ("amount", "sum"),
    ).reset_index()

    # ── Scores R, F, M (1 à 5) ───────────────────────────────────────────
    # Recency : plus récent = meilleur score (inversé)
    rfm["r_score"] = pd.qcut(
        rfm["recency"].rank(method="first"),
        q=5,
        labels=[5, 4, 3, 2, 1]  # Score inversé
    ).astype(int)

    # Frequency : plus fréquent = meilleur
    rfm["f_score"] = pd.qcut(
        rfm["frequency"].rank(method="first"),
        q=5,
        labels=[1, 2, 3, 4, 5]
    ).astype(int)

    # Monetary : plus dépensé = meilleur
    rfm["m_score"] = pd.qcut(
        rfm["monetary"].rank(method="first"),
        q=5,
        labels=[1, 2, 3, 4, 5]
    ).astype(int)

    # Score global pondéré : R(40%) + F(35%) + M(25%)
    rfm["rfm_score"] = (
        rfm["r_score"] * 0.40 +
        rfm["f_score"] * 0.35 +
        rfm["m_score"] * 0.25
    ).round(2)

    # Score normalisé 0-100
    rfm["rfm_score_100"] = (
        (rfm["rfm_score"] - 1) / (5 - 1) * 100
    ).round(1)

    # ── Segmentation ─────────────────────────────────────────────────────
    rfm["segment"] = rfm.apply(_assign_segment, axis=1)

    # ── Métriques additionnelles ──────────────────────────────────────────
    rfm["avg_order_value"] = (rfm["monetary"] / rfm["frequency"]).round(2)
    rfm["recency_label"]   = rfm["recency"].apply(_recency_label)

    return rfm


def _assign_segment(row) -> str:
    """
    Segmentation basée sur les scores R, F, M.
    Matrice de segmentation standard adapté AutoRent.
    """
    r, f, m = row["r_score"], row["f_score"], row["m_score"]

    # Champions : réservations récentes + fréquentes + dépenses élevées
    if r >= 4 and f >= 4 and m >= 4:
        return "Champion"

    # Clients fidèles
    if r >= 3 and f >= 4:
        return "Loyal"

    # Clients potentiellement fidèles
    if r >= 4 and f >= 2 and m >= 3:
        return "Potentiel"

    # Nouveaux clients prometteurs
    if r >= 4 and f == 1:
        return "Nouveau"

    # Clients à risque (étaient bons, maintenant inactifs)
    if r <= 2 and f >= 3 and m >= 3:
        return "À risque"

    # Clients perdus (haute valeur passée, très inactifs)
    if r == 1 and f >= 4:
        return "Perdu VIP"

    # Clients dormants (peu actifs, peu dépensé)
    if r <= 2 and f <= 2:
        return "Dormant"

    # Clients à prix sensibles
    if m <= 2 and f >= 3:
        return "Sensible prix"

    return "Standard"


def _recency_label(days: int) -> str:
    if days <= 7:    return "Cette semaine"
    if days <= 30:   return "Ce mois"
    if days <= 90:   return "Trimestre"
    if days <= 180:  return "Semestre"
    return "Inactif +6 mois"


def get_segment_stats(rfm_df: pd.DataFrame) -> dict:
    """Statistiques agrégées par segment."""
    if rfm_df.empty:
        return {}

    stats = rfm_df.groupby("segment").agg(
        count        = ("client_id", "count"),
        avg_monetary = ("monetary",  "mean"),
        avg_frequency= ("frequency", "mean"),
        avg_recency  = ("recency",   "mean"),
        avg_rfm      = ("rfm_score_100", "mean"),
    ).reset_index()

    total = len(rfm_df)
    result = {}

    for _, row in stats.iterrows():
        seg = row["segment"]
        result[seg] = {
            "count":         int(row["count"]),
            "percentage":    round(row["count"] / total * 100, 1),
            "avg_spend":     round(row["avg_monetary"], 2),
            "avg_frequency": round(row["avg_frequency"], 1),
            "avg_recency_days": round(row["avg_recency"], 0),
            "avg_rfm_score": round(row["avg_rfm"], 1),
        }

    return result


# Mapping couleurs et actions par segment (pour le frontend)
SEGMENT_CONFIG = {
    "Champion":     {
        "color":  "#10B981",  # vert
        "icon":   "🏆",
        "action": "Offrir une récompense de fidélité, demander un avis",
        "priority": 1,
    },
    "Loyal":        {
        "color":  "#3B82F6",  # bleu
        "icon":   "⭐",
        "action": "Programme de fidélité, offres exclusives",
        "priority": 2,
    },
    "Potentiel":    {
        "color":  "#8B5CF6",  # violet
        "icon":   "🚀",
        "action": "Accompagner vers fidélité, offre personnalisée",
        "priority": 3,
    },
    "Nouveau":      {
        "color":  "#06B6D4",  # cyan
        "icon":   "✨",
        "action": "Bienvenue, email d'onboarding, offre 2ème réservation",
        "priority": 4,
    },
    "À risque":     {
        "color":  "#F59E0B",  # amber
        "icon":   "⚠️",
        "action": "Relance urgente, offre de réactivation -15%",
        "priority": 5,
    },
    "Perdu VIP":    {
        "color":  "#EF4444",  # rouge
        "icon":   "💔",
        "action": "Campagne win-back avec forte remise",
        "priority": 6,
    },
    "Dormant":      {
        "color":  "#9CA3AF",  # gris
        "icon":   "😴",
        "action": "Email de rappel avec promotion saisonnière",
        "priority": 7,
    },
    "Sensible prix":{
        "color":  "#F97316",  # orange
        "icon":   "💰",
        "action": "Offres promotionnelles et prix bas",
        "priority": 8,
    },
    "Standard":     {
        "color":  "#6B7280",
        "icon":   "👤",
        "action": "Engagement standard",
        "priority": 9,
    },
}