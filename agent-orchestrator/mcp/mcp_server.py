# agent-orchestrator/mcp/tools.py

import httpx
import os
from typing import Any

VEHICLE_SERVICE_URL = os.getenv("VEHICLE_SERVICE_URL", "http://vehicle-service")
AUTH_SERVICE_URL    = os.getenv("AUTH_SERVICE_URL",    "http://auth-service")
BOOKING_SERVICE_URL = os.getenv("BOOKING_SERVICE_URL", "http://booking-service")

# ── Définition des outils MCP ─────────────────────────────────────────────────
MCP_TOOLS = [
    {
        "name": "search_vehicules",
        "description": "Recherche des véhicules disponibles selon des critères",
        "inputSchema": {
            "type": "object",
            "properties": {
                "city":         {"type": "string",  "description": "Ville de location"},
                "category":     {"type": "string",  "description": "voiture/suv/camion/moto/van"},
                "fuel_type":    {"type": "string",  "description": "essence/diesel/hybride/electrique"},
                "min_price":    {"type": "number",  "description": "Prix minimum MAD/jour"},
                "max_price":    {"type": "number",  "description": "Prix maximum MAD/jour"},
                "seats":        {"type": "integer", "description": "Nombre minimum de places"},
                "offers_driver":{"type": "boolean", "description": "Avec chauffeur disponible"},
            }
        }
    },
    {
        "name": "get_vehicule_detail",
        "description": "Détails complets d'un véhicule par son ID",
        "inputSchema": {
            "type": "object",
            "properties": {
                "vehicule_id": {"type": "integer", "description": "ID du véhicule"}
            },
            "required": ["vehicule_id"]
        }
    },
    {
        "name": "check_availability",
        "description": "Vérifie la disponibilité d'un véhicule pour des dates données",
        "inputSchema": {
            "type": "object",
            "properties": {
                "vehicule_id": {"type": "integer", "description": "ID du véhicule"},
                "start_date":  {"type": "string",  "description": "Date début YYYY-MM-DD"},
                "end_date":    {"type": "string",  "description": "Date fin YYYY-MM-DD"},
            },
            "required": ["vehicule_id", "start_date", "end_date"]
        }
    },
    {
        "name": "search_service_owners",
        "description": "Recherche des prestataires de services transport",
        "inputSchema": {
            "type": "object",
            "properties": {
                "service_type": {
                    "type": "string",
                    "description": "transport_bagages/livraison_colis/demenagement"
                },
                "city": {"type": "string", "description": "Ville du prestataire"},
            },
            "required": ["service_type"]
        }
    },
    {
        "name": "calculate_price",
        "description": "Calcule le prix total d'une réservation",
        "inputSchema": {
            "type": "object",
            "properties": {
                "price_per_day":    {"type": "number",  "description": "Prix journalier du véhicule"},
                "nb_days":          {"type": "integer", "description": "Nombre de jours"},
                "with_driver":      {"type": "boolean", "description": "Avec chauffeur"},
                "nb_drivers":       {"type": "integer", "description": "Nombre de chauffeurs (1 ou 2)"},
                "driver_daily_rate":{"type": "number",  "description": "Tarif chauffeur/jour"},
            },
            "required": ["price_per_day", "nb_days"]
        }
    },
    {
        "name": "get_owner_profile",
        "description": "Récupère le profil public d'un propriétaire",
        "inputSchema": {
            "type": "object",
            "properties": {
                "owner_id": {"type": "integer", "description": "ID du propriétaire"}
            },
            "required": ["owner_id"]
        }
    },
]


# ── Exécution des outils MCP ──────────────────────────────────────────────────

async def execute_tool(tool_name: str, params: dict) -> Any:
    """Exécute un outil MCP et retourne le résultat."""
    async with httpx.AsyncClient(timeout=10.0) as client:

        if tool_name == "search_vehicules":
            resp = await client.get(
                f"{VEHICLE_SERVICE_URL}/api/vehicules",
                params={k: v for k, v in params.items() if v is not None}
            )
            if resp.status_code == 200:
                vehicules = resp.json()
                # Retirer les données sensibles AVANT de les passer aux agents
                return [_sanitize_vehicule(v) for v in vehicules]
            return []

        elif tool_name == "get_vehicule_detail":
            resp = await client.get(
                f"{VEHICLE_SERVICE_URL}/api/vehicules/{params['vehicule_id']}"
            )
            return _sanitize_vehicule(resp.json()) if resp.status_code == 200 else None

        elif tool_name == "check_availability":
            resp = await client.get(
                f"{VEHICLE_SERVICE_URL}/api/vehicules/{params['vehicule_id']}/booked-dates"
            )
            if resp.status_code != 200:
                return {"available": False, "booked_dates": []}

            booked_dates = resp.json()
            # Vérifier si les dates demandées sont libres
            from datetime import date, timedelta
            start = date.fromisoformat(params["start_date"])
            end   = date.fromisoformat(params["end_date"])
            current = start
            requested_dates = []
            while current <= end:
                requested_dates.append(current.isoformat())
                current += timedelta(days=1)

            conflicts = [d for d in requested_dates if d in booked_dates]
            return {
                "available":    len(conflicts) == 0,
                "nb_days":      (end - start).days,
                "conflicts":    conflicts,
                "booked_dates": booked_dates,
            }

        elif tool_name == "search_service_owners":
            resp = await client.get(
                f"{AUTH_SERVICE_URL}/api/service-owners",
                params={"service": params["service_type"]}
            )
            if resp.status_code == 200:
                owners = resp.json()
                if params.get("city"):
                    city_lower = params["city"].lower()
                    owners = [o for o in owners
                              if city_lower in (o.get("city") or "").lower()]
                return [_sanitize_owner(o) for o in owners]
            return []

        elif tool_name == "calculate_price":
            price_per_day     = params["price_per_day"]
            nb_days           = params["nb_days"]
            with_driver       = params.get("with_driver", False)
            nb_drivers        = params.get("nb_drivers", 1)
            driver_daily_rate = params.get("driver_daily_rate", 0)

            vehicle_total = price_per_day * nb_days
            driver_total  = (driver_daily_rate * nb_drivers * nb_days) if with_driver else 0

            return {
                "vehicle_total":   vehicle_total,
                "driver_total":    driver_total,
                "grand_total":     vehicle_total + driver_total,
                "nb_days":         nb_days,
                "price_per_day":   price_per_day,
                "with_driver":     with_driver,
                "nb_drivers":      nb_drivers,
                "driver_daily_rate": driver_daily_rate,
            }

        elif tool_name == "get_owner_profile":
            resp = await client.get(
                f"{AUTH_SERVICE_URL}/api/service-owners/{params['owner_id']}"
            )
            return _sanitize_owner(resp.json()) if resp.status_code == 200 else None

    return None


# ── Filtrage données sensibles au niveau MCP ──────────────────────────────────

def _sanitize_vehicule(v: dict) -> dict:
    """Retire les données sensibles d'un véhicule."""
    if not v:
        return {}
    return {
        "id":               v.get("id"),
        "brand":            v.get("brand"),
        "model":            v.get("model"),
        "year":             v.get("year"),
        "category":         v.get("category"),
        "fuel_type":        v.get("fuel_type"),
        "transmission":     v.get("transmission"),
        "seats":            v.get("seats"),
        "price_per_day":    v.get("price_per_day"),
        "city":             v.get("city"),
        "description":      v.get("description"),
        "status":           v.get("status"),
        "offers_driver":    v.get("offers_driver"),
        "driver_daily_rate":v.get("driver_daily_rate"),
        "image_url":        v.get("image_url"),
        # ❌ immatriculation, chassis, user_id → PAS inclus
    }


def _sanitize_owner(o: dict) -> dict:
    """Retire les données sensibles d'un owner."""
    if not o:
        return {}
    return {
        "id":                o.get("id"),
        "display_name":      o.get("display_name") or o.get("name"),
        "city":              o.get("city"),
        "bio":               o.get("bio"),
        "is_agency":         o.get("is_agency"),
        "agency_name":       o.get("agency_name"),
        "agency_description":o.get("agency_description"),
        "services":          o.get("services", []),
        "rating":            o.get("rating"),
        "verified":          o.get("verified"),
        # ❌ email, phone, agency_rc → PAS inclus
    }