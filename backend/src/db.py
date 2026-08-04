"""Supabase client and persistence helpers for briefing data."""

import json
import os

from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

_client: Client | None = None


def get_client() -> Client:
    """Return a singleton Supabase client."""
    global _client
    if _client is None:
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_SERVICE_KEY")
        if not url or not key:
            raise EnvironmentError(
                "SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in .env"
            )
        _client = create_client(url, key)
    return _client


def save_briefing(briefing: dict) -> dict:
    """Upsert a briefing into the database. Returns the saved record."""
    client = get_client()
    payload = {
        "date": briefing["date"],
        "city": briefing["city"],
        "resumen": briefing.get("resumen", ""),
        "alertas": briefing.get("alertas", []),
        "recomendacion": briefing.get("recomendacion", ""),
        "prioridad": briefing.get("prioridad", "desconocida"),
        "kpis_today": briefing.get("kpis_today", {}),
        "kpis_baseline": briefing.get("kpis_baseline", {}),
        "anomalies": briefing.get("anomalies", []),
        "anomalies_count": briefing.get("anomalies_count", 0),
    }
    result = (
        client.table("briefings")
        .upsert(payload, on_conflict="date,city")
        .execute()
    )
    return result.data[0] if result.data else payload


def get_briefings_by_date(date: str) -> list[dict]:
    """Fetch all city briefings for a given date."""
    client = get_client()
    result = (
        client.table("briefings")
        .select("*")
        .eq("date", date)
        .order("city")
        .execute()
    )
    return result.data or []


def get_latest_dates(limit: int = 7) -> list[str]:
    """Return the most recent dates that have briefings stored."""
    client = get_client()
    result = (
        client.table("briefings")
        .select("date")
        .order("date", desc=True)
        .limit(limit)
        .execute()
    )
    seen = []
    for row in result.data or []:
        if row["date"] not in seen:
            seen.append(row["date"])
    return seen
