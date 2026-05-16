# behavior_analytics/agents/ml/synthetic_clients.py
"""
Génère des données clients synthétiques réalistes pour AutoRent Maroc.
Utilisées pour initialiser les modèles avant données réelles suffisantes.
"""

import numpy as np
import pandas as pd
from datetime import datetime, timedelta
import random

random.seed(42)
np.random.seed(42)

# Profils comportementaux réels de clients AutoRent Maroc
CLIENT_PROFILES = {
    "voyageur_affaires": {
        "weight":          0.20,   # 20% des clients
        "bookings_per_year": (8, 15),
        "avg_duration":    (2, 4),  # jours
        "preferred_cats":  ["berline", "suv"],
        "price_sensitivity": 0.3,   # peu sensible au prix
        "avg_spend_day":   (400, 700),
        "cities":          ["Casablanca", "Rabat", "Tanger"],
        "loyalty":         0.75,    # probabilité de revenir
        "churn_risk":      0.15,
    },
    "famille": {
        "weight":          0.25,
        "bookings_per_year": (3, 6),
        "avg_duration":    (5, 10),
        "preferred_cats":  ["suv", "minibus", "berline"],
        "price_sensitivity": 0.7,
        "avg_spend_day":   (300, 500),
        "cities":          ["Marrakech", "Agadir", "Fès"],
        "loyalty":         0.55,
        "churn_risk":      0.30,
    },
    "touriste": {
        "weight":          0.30,
        "bookings_per_year": (1, 3),
        "avg_duration":    (7, 14),
        "preferred_cats":  ["suv", "4x4", "berline"],
        "price_sensitivity": 0.5,
        "avg_spend_day":   (350, 600),
        "cities":          ["Marrakech", "Agadir", "Fès", "Meknès"],
        "loyalty":         0.25,
        "churn_risk":      0.60,
    },
    "occasionnel": {
        "weight":          0.25,
        "bookings_per_year": (1, 2),
        "avg_duration":    (1, 3),
        "preferred_cats":  ["citadine", "berline"],
        "price_sensitivity": 0.9,
        "avg_spend_day":   (180, 320),
        "cities":          ["Casablanca", "Rabat", "Oujda"],
        "loyalty":         0.35,
        "churn_risk":      0.55,
    },
}


def generate_clients(n: int = 200) -> pd.DataFrame:
    """Génère n clients avec historique synthétique."""
    clients = []
    profiles = list(CLIENT_PROFILES.keys())
    weights  = [CLIENT_PROFILES[p]["weight"] for p in profiles]

    for i in range(n):
        profile_name = np.random.choice(profiles, p=weights)
        profile      = CLIENT_PROFILES[profile_name]

        # Dates d'inscription (entre 2 ans et 1 mois)
        days_ago      = random.randint(30, 730)
        registered_at = datetime.now() - timedelta(days=days_ago)

        # Nombre de réservations
        nb_bookings = random.randint(*profile["bookings_per_year"])
        nb_bookings = max(1, nb_bookings)

        # Dernière réservation
        last_booking_days = random.randint(1, min(days_ago, 365))
        last_booking_at   = datetime.now() - timedelta(days=last_booking_days)

        # Calculs financiers
        avg_duration  = random.uniform(*profile["avg_duration"])
        avg_spend_day = random.uniform(*profile["avg_spend_day"])
        total_spend   = nb_bookings * avg_duration * avg_spend_day
        avg_spend     = total_spend / nb_bookings

        # Catégories préférées
        pref_cats = profile["preferred_cats"]
        fav_cat   = random.choice(pref_cats)

        # Ville préférée
        fav_city = random.choice(profile["cities"])

        # Score satisfaction (note moyenne donnée)
        avg_rating = random.gauss(4.0, 0.8)
        avg_rating = max(1.0, min(5.0, avg_rating))

        # Churn : n'a pas réservé depuis longtemps
        is_churned = last_booking_days > 180 and random.random() < profile["churn_risk"]

        clients.append({
            "client_id":        i + 1,
            "profile":          profile_name,
            "registered_days":  days_ago,
            "nb_bookings":      nb_bookings,
            "total_spend":      round(total_spend, 2),
            "avg_spend":        round(avg_spend, 2),
            "avg_duration":     round(avg_duration, 1),
            "last_booking_days":last_booking_days,
            "fav_category":     fav_cat,
            "fav_city":         fav_city,
            "avg_rating_given": round(avg_rating, 1),
            "price_sensitivity":profile["price_sensitivity"],
            "loyalty_score":    profile["loyalty"],
            "is_churned":       is_churned,
            "churn_risk":       profile["churn_risk"],
        })

    return pd.DataFrame(clients)


def generate_bookings_history(clients_df: pd.DataFrame) -> pd.DataFrame:
    """Génère l'historique de réservations pour chaque client."""
    bookings = []

    for _, client in clients_df.iterrows():
        for j in range(int(client["nb_bookings"])):
            # Date réservation répartie sur la période d'inscription
            days_offset = random.randint(
                1,
                max(2, int(client["registered_days"]))
            )
            booking_date = datetime.now() - timedelta(days=days_offset)

            bookings.append({
                "booking_id":  f"B{client['client_id']:04d}{j:02d}",
                "client_id":   client["client_id"],
                "date":        booking_date.strftime("%Y-%m-%d"),
                "category":    client["fav_category"],
                "city":        client["fav_city"],
                "duration":    round(random.uniform(
                    client["avg_duration"] * 0.7,
                    client["avg_duration"] * 1.3
                ), 1),
                "amount":      round(
                    client["avg_spend"] * random.uniform(0.8, 1.2), 2
                ),
                "rating_given":round(random.gauss(client["avg_rating_given"], 0.3), 1),
            })

    df = pd.DataFrame(bookings)
    df["rating_given"] = df["rating_given"].clip(1, 5)
    return df