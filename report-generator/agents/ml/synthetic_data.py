# agent-orchestrator/agents/ml/synthetic_data.py
"""
Génère des données synthétiques réalistes pour le Maroc.
Utilisées pour initialiser le modèle avant d'avoir assez de données réelles.
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta

# Jours fériés Maroc 2024-2026
FERIES_MAROC = [
    "2024-01-01", "2024-01-11", "2024-05-01", "2024-07-30",
    "2024-08-14", "2024-08-20", "2024-08-21", "2024-11-06", "2024-11-18",
    "2025-01-01", "2025-01-11", "2025-05-01", "2025-07-30",
    "2025-08-14", "2025-08-20", "2025-08-21", "2025-11-06", "2025-11-18",
    "2026-01-01", "2026-01-11", "2026-05-01", "2026-07-30",
]

# Profil de demande par mois (index de saisonnalité)
# 1.0 = moyenne, >1.0 = haute saison, <1.0 = basse saison
SEASONAL_MAROC = {
    1:  0.75,  # Janvier — basse saison
    2:  0.80,  # Février
    3:  0.90,  # Mars — début printemps
    4:  1.00,  # Avril — vacances scolaires
    5:  1.05,  # Mai
    6:  1.10,  # Juin — pré-été
    7:  1.45,  # Juillet — HAUTE SAISON (tourisme)
    8:  1.50,  # Août — TRÈS HAUTE SAISON
    9:  1.10,  # Septembre — post-été
    10: 0.95,  # Octobre
    11: 0.85,  # Novembre
    12: 1.20,  # Décembre — vacances scolaires + Nouvel An
}

# Profil hebdomadaire
WEEKLY_PATTERN = {
    0: 0.85,  # Lundi
    1: 0.80,  # Mardi
    2: 0.82,  # Mercredi
    3: 0.88,  # Jeudi
    4: 1.05,  # Vendredi — début week-end
    5: 1.25,  # Samedi — pic
    6: 1.20,  # Dimanche
}

# Profil par ville (multiplicateur de base)
CITY_BASE = {
    "Casablanca":  1.00,
    "Marrakech":   1.35,  # Tourisme élevé
    "Agadir":      1.25,  # Station balnéaire
    "Fès":         0.85,
    "Rabat":       0.90,
    "Tanger":      0.95,
    "Meknès":      0.70,
    "Oujda":       0.65,
}


def generate_synthetic_history(
    city:       str   = "Casablanca",
    category:   str   = "berline",
    days:       int   = 365,
    base_demand:float = 8.0,    # demande moyenne en réservations/jour
    noise_std:  float = 1.5,
) -> pd.DataFrame:
    """
    Génère un historique de demande synthétique réaliste.
    
    Returns:
        DataFrame avec colonnes ['ds', 'y'] (format Prophet)
        ds = date, y = nombre de réservations
    """
    np.random.seed(42)

    city_mult = CITY_BASE.get(city, 0.85)

    # Catégorie multiplie la demande de base
    cat_mult = {
        "citadine":   0.90,
        "berline":    1.00,
        "suv":        1.15,
        "4x4":        0.80,
        "utilitaire": 0.70,
        "luxe":       0.50,
        "minibus":    0.60,
    }.get(category.lower(), 1.0)

    dates  = []
    values = []

    start = datetime.now() - timedelta(days=days)

    for i in range(days):
        date = start + timedelta(days=i)

        # Saisonnalité mensuelle
        monthly = SEASONAL_MAROC.get(date.month, 1.0)

        # Motif hebdomadaire
        weekly  = WEEKLY_PATTERN.get(date.weekday(), 1.0)

        # Jour férié → boost
        is_ferie = date.strftime("%Y-%m-%d") in FERIES_MAROC
        ferie_mult = 1.30 if is_ferie else 1.0

        # Trend légère croissance (+15% sur l'année)
        trend = 1.0 + (i / days) * 0.15

        # Calcul de la demande
        demand = (
            base_demand
            * city_mult
            * cat_mult
            * monthly
            * weekly
            * ferie_mult
            * trend
        )

        # Bruit gaussien (variabilité naturelle)
        demand += np.random.normal(0, noise_std)
        demand  = max(0, round(demand))

        dates.append(date.strftime("%Y-%m-%d"))
        values.append(demand)

    return pd.DataFrame({"ds": pd.to_datetime(dates), "y": values})