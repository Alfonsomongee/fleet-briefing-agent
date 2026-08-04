"""Load fleet data from a PDF report using pdfplumber + LLM parsing."""

import json
import os

import pandas as pd
import pdfplumber
from openai import OpenAI


PARSE_PROMPT = """You are a data extraction assistant. Extract all fleet KPI data from the following text.
Return ONLY a JSON array where each element has these exact keys:
date, city, total_vehicles, vehicles_operational, vehicles_in_maintenance,
total_trips, hours_available, hours_with_passenger, total_km,
total_cost_eur, maintenance_events, total_repair_hours, cancelled_trips.

Use null for any missing field. No markdown, no explanation — only the JSON array.

Text:
{text}
"""


def _extract_text(path: str) -> str:
    """Extract text from PDF; fall back to OCR if empty."""
    text = ""
    with pdfplumber.open(path) as pdf:
        for page in pdf.pages:
            text += page.extract_text() or ""

    if not text.strip():
        try:
            import pytesseract
            from PIL import Image
            with pdfplumber.open(path) as pdf:
                for page in pdf.pages:
                    img = page.to_image(resolution=200).original
                    text += pytesseract.image_to_string(img)
        except ImportError:
            raise RuntimeError("PDF appears to be scanned. Install pytesseract and Pillow for OCR support.")

    return text


def load_from_pdf(path: str) -> pd.DataFrame:
    """Extract fleet data from a PDF report using text extraction + LLM parsing."""
    text = _extract_text(path)[:4000]

    client = OpenAI(
        api_key=os.getenv("DEEPSEEK_API_KEY"),
        base_url="https://api.deepseek.com",
    )
    response = client.chat.completions.create(
        model=os.getenv("DEEPSEEK_MODEL", "deepseek-chat"),
        messages=[{"role": "user", "content": PARSE_PROMPT.format(text=text)}],
        response_format={"type": "json_object"},
        temperature=0.1,
    )

    raw = response.choices[0].message.content
    data = json.loads(raw)

    # The model may return {"data": [...]} or a bare list
    if isinstance(data, dict):
        data = next(iter(data.values()))

    df = pd.DataFrame(data)
    df["date"] = pd.to_datetime(df["date"]).dt.strftime("%Y-%m-%d")
    return df
