"""FastAPI backend — serves briefing data to the Vercel frontend."""

import os
from datetime import date as date_type

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

app = FastAPI(
    title="Fleet Briefing API",
    description="Daily VTC fleet operational briefings powered by DeepSeek",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # restrict to your Vercel domain in production
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    """Health check endpoint for Railway."""
    return {"status": "ok", "service": "fleet-briefing-agent"}


@app.get("/api/briefings")
def list_briefings(date: str | None = Query(default=None)):
    """Return all city briefings for a given date (default: today)."""
    from src.db import get_briefings_by_date
    target = date or date_type.today().strftime("%Y-%m-%d")
    briefings = get_briefings_by_date(target)
    if not briefings:
        raise HTTPException(status_code=404, detail=f"No briefings found for {target}")
    return {"date": target, "briefings": briefings}


@app.get("/api/briefings/{date}/{city}")
def get_briefing(date: str, city: str):
    """Return the briefing for a specific date and city."""
    from src.db import get_client
    result = (
        get_client()
        .table("briefings")
        .select("*")
        .eq("date", date)
        .eq("city", city)
        .single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail=f"No briefing for {city} on {date}")
    return result.data


@app.get("/api/dates")
def list_dates():
    """Return the last 7 dates with available briefings."""
    from src.db import get_latest_dates
    return {"dates": get_latest_dates()}


@app.post("/api/run")
def trigger_run(date: str | None = Query(default=None)):
    """Manually trigger a briefing run for a given date."""
    import subprocess
    import sys
    cmd = [sys.executable, "main.py"]
    if date:
        cmd += ["--date", date]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
    if result.returncode != 0:
        raise HTTPException(status_code=500, detail=result.stderr)
    return {"status": "completed", "output": result.stdout}
