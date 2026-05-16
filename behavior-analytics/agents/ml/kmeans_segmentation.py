# behavior_analytics/agents/ml/kmeans_segmentation.py
"""
K-Means Clustering pour segmentation comportementale.
Identifie des groupes naturels de clients sans étiquettes prédéfinies.

Features utilisées :
- Récence, fréquence, montant (RFM)
- Durée moyenne des locations
- Catégorie préférée (encodée)
- Sensibilité horaire (week-end vs semaine)
"""

import pandas as pd
import numpy as np
import logging
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import silhouette_score
from sklearn.decomposition import PCA

logger = logging.getLogger(__name__)

# Noms des clusters AutoRent (assignés après analyse)
CLUSTER_NAMES = {
    0: "Voyageur Affaires",
    1: "Famille Vacances",
    2: "Touriste Découverte",
    3: "Client Occasionnel",
    4: "Locataire Régulier",
}

CLUSTER_COLORS = {
    0: "#3B82F6",
    1: "#10B981",
    2: "#8B5CF6",
    3: "#F59E0B",
    4: "#EF4444",
}


def build_features(
    rfm_df:      pd.DataFrame,
    bookings_df: pd.DataFrame,
    clients_df:  pd.DataFrame,
) -> pd.DataFrame:
    """
    Construit la matrice de features pour le clustering.
    """
    features = rfm_df[["client_id", "recency", "frequency",
                        "monetary", "avg_order_value"]].copy()

    # Durée moyenne des locations
    if not bookings_df.empty and "duration" in bookings_df.columns:
        dur = bookings_df.groupby("client_id")["duration"].mean().reset_index()
        dur.columns = ["client_id", "avg_duration"]
        features = features.merge(dur, on="client_id", how="left")
    else:
        features["avg_duration"] = 3.0

    # Diversité des catégories (nb catégories différentes)
    if not bookings_df.empty and "category" in bookings_df.columns:
        cat_div = bookings_df.groupby("client_id")["category"].nunique().reset_index()
        cat_div.columns = ["client_id", "cat_diversity"]
        features = features.merge(cat_div, on="client_id", how="left")
    else:
        features["cat_diversity"] = 1

    # Remplir les NaN
    features = features.fillna(features.median(numeric_only=True))

    return features


def train_kmeans(
    features_df: pd.DataFrame,
    n_clusters:  int = 4,
    auto_k:      bool = True,
) -> dict:
    """
    Entraîne le modèle K-Means.

    Si auto_k=True : cherche le meilleur k entre 2 et 7
    via le score silhouette.

    Returns:
        dict avec modèle, scaler, labels, métriques
    """
    feature_cols = [
        "recency", "frequency", "monetary",
        "avg_order_value", "avg_duration", "cat_diversity"
    ]

    # Garder seulement les colonnes disponibles
    available = [c for c in feature_cols if c in features_df.columns]
    X         = features_df[available].values

    # Normalisation
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    # ── Trouver k optimal via silhouette score ────────────────────────────
    if auto_k and len(X_scaled) > 10:
        best_k     = n_clusters
        best_score = -1

        for k in range(2, min(8, len(X_scaled) // 5 + 2)):
            km = KMeans(n_clusters=k, random_state=42, n_init=10)
            labels = km.fit_predict(X_scaled)
            score  = silhouette_score(X_scaled, labels)
            logger.info(f"K={k} → Silhouette={score:.3f}")
            if score > best_score:
                best_score = score
                best_k     = k

        n_clusters = best_k
        logger.info(f"K optimal = {n_clusters} (silhouette={best_score:.3f})")

    # ── Entraînement final ────────────────────────────────────────────────
    kmeans = KMeans(
        n_clusters = n_clusters,
        random_state= 42,
        n_init     = 10,
        max_iter   = 300,
    )
    labels = kmeans.fit_predict(X_scaled)

    # ── Silhouette score final ────────────────────────────────────────────
    sil_score = silhouette_score(X_scaled, labels) if len(set(labels)) > 1 else 0

    # ── PCA pour visualisation 2D ─────────────────────────────────────────
    pca      = PCA(n_components=2, random_state=42)
    X_pca    = pca.fit_transform(X_scaled)
    variance = pca.explained_variance_ratio_

    # ── Profil de chaque cluster ──────────────────────────────────────────
    features_df = features_df.copy()
    features_df["cluster"] = labels
    features_df["pca_x"]   = X_pca[:, 0]
    features_df["pca_y"]   = X_pca[:, 1]

    cluster_profiles = []
    for c in range(n_clusters):
        mask    = features_df["cluster"] == c
        subset  = features_df[mask]

        # Caractériser le cluster
        profile = {
            "cluster_id":      c,
            "name":            CLUSTER_NAMES.get(c, f"Groupe {c+1}"),
            "color":           CLUSTER_COLORS.get(c, "#6B7280"),
            "count":           int(mask.sum()),
            "pct":             round(mask.sum() / len(features_df) * 100, 1),
            "avg_recency":     round(subset["recency"].mean(),       1),
            "avg_frequency":   round(subset["frequency"].mean(),     1),
            "avg_monetary":    round(subset["monetary"].mean(),      1),
            "avg_duration":    round(subset["avg_duration"].mean(),  1),
            "characteristics": _describe_cluster(subset),
        }
        cluster_profiles.append(profile)

    # Points PCA pour scatter plot
    scatter_points = []
    for _, row in features_df.iterrows():
        scatter_points.append({
            "client_id": int(row["client_id"]),
            "cluster":   int(row["cluster"]),
            "x":         round(float(row["pca_x"]), 3),
            "y":         round(float(row["pca_y"]), 3),
            "name":      CLUSTER_NAMES.get(int(row["cluster"]), f"Groupe {int(row['cluster'])+1}"),
        })

    return {
        "model":             kmeans,
        "scaler":            scaler,
        "labels":            labels.tolist(),
        "n_clusters":        n_clusters,
        "silhouette_score":  round(float(sil_score), 3),
        "pca_variance":      [round(float(v), 3) for v in variance],
        "cluster_profiles":  cluster_profiles,
        "scatter_points":    scatter_points,
        "feature_cols":      available,
    }


def _describe_cluster(subset: pd.DataFrame) -> list[str]:
    """Génère une description textuelle du cluster."""
    desc = []

    avg_rec = subset["recency"].mean()
    avg_frq = subset["frequency"].mean()
    avg_mon = subset["monetary"].mean()

    if avg_rec <= 30:   desc.append("Très actif récemment")
    elif avg_rec <= 90: desc.append("Actif ce trimestre")
    else:               desc.append("Inactif depuis longtemps")

    if avg_frq >= 8:   desc.append("Très fidèle")
    elif avg_frq >= 4: desc.append("Fidèle")
    else:              desc.append("Occasionnel")

    if avg_mon >= 5000: desc.append("Haute valeur")
    elif avg_mon >= 2000: desc.append("Valeur moyenne")
    else:               desc.append("Faible valeur")

    if "avg_duration" in subset.columns:
        avg_dur = subset["avg_duration"].mean()
        if avg_dur >= 7:   desc.append("Longues locations")
        elif avg_dur >= 3: desc.append("Locations moyennes")
        else:              desc.append("Courtes locations")

    return desc