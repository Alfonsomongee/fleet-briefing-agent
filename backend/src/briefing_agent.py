"""Generate natural-language operational briefings using the DeepSeek API."""

import json
import os

from dotenv import load_dotenv
from openai import OpenAI, APIConnectionError, AuthenticationError

load_dotenv()

SYSTEM_PROMPT = """Eres un analista de operaciones de flotas VTC.
Tu misión es generar briefings operativos concisos, claros y accionables en español.
Responde ÚNICAMENTE con el JSON solicitado, sin texto adicional."""

USER_PROMPT_TEMPLATE = """
Ciudad: {city} | Fecha: {date}

KPIs HOY:
{kpis_today_str}

BASELINE (media 7 días):
{kpis_baseline_str}

ANOMALÍAS DETECTADAS ({anomalies_count}):
{anomalies_str}

Genera el briefing en este JSON exacto:
{{
  "resumen": "2-3 frases explicando qué pasó operativamente hoy",
  "alertas": ["anomalía 1 en lenguaje claro", "anomalía 2..."],
  "recomendacion": "una acción concreta que el equipo debe tomar hoy",
  "prioridad": "alta | media | baja"
}}
"""


def _format_kpis(kpis: dict) -> str:
    labels = {
        "tasa_utilizacion": "Tasa utilización",
        "fleet_availability": "Disponibilidad flota",
        "mttr_horas": "MTTR (horas)",
        "cost_per_km": "Coste/km (€)",
        "on_time_rate": "Tasa puntualidad",
        "revenue_proxy": "Revenue proxy (€)",
    }
    return "\n".join(f"  {labels.get(k, k)}: {v}" for k, v in kpis.items())


def _format_anomalies(anomalies: list[dict]) -> str:
    if not anomalies:
        return "  Ninguna anomalía significativa detectada."
    lines = []
    for a in anomalies:
        flag = "🔴 CRÍTICO" if a["critico"] else "🟡"
        lines.append(
            f"  {flag} {a['kpi']}: {a['desviacion_pct']:+.1f}% "
            f"(hoy {a['valor_hoy']} vs baseline {a['valor_baseline']})"
        )
    return "\n".join(lines)


def generate_briefing(
    city: str,
    date: str,
    kpis_today: dict,
    kpis_baseline: dict,
    anomalies: list[dict],
) -> dict:
    """Call DeepSeek to generate a structured operational briefing."""
    api_key = os.getenv("DEEPSEEK_API_KEY")
    if not api_key:
        raise EnvironmentError(
            "❌ DEEPSEEK_API_KEY is not set.\n"
            "Add it to your .env file: DEEPSEEK_API_KEY=sk-..."
        )

    client = OpenAI(
        api_key=api_key,
        base_url="https://api.deepseek.com",
    )

    user_prompt = USER_PROMPT_TEMPLATE.format(
        city=city,
        date=date,
        kpis_today_str=_format_kpis(kpis_today),
        kpis_baseline_str=_format_kpis(kpis_baseline),
        anomalies_count=len(anomalies),
        anomalies_str=_format_anomalies(anomalies),
    )

    try:
        response = client.chat.completions.create(
            model=os.getenv("DEEPSEEK_MODEL", "deepseek-chat"),
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            response_format={"type": "json_object"},
            temperature=0.3,
        )
        content = response.choices[0].message.content
        briefing = json.loads(content)

    except AuthenticationError:
        raise EnvironmentError(
            "❌ Invalid DEEPSEEK_API_KEY. Check your key at https://platform.deepseek.com"
        )
    except APIConnectionError:
        raise ConnectionError(
            "❌ Cannot reach DeepSeek API. Check your internet connection."
        )
    except (json.JSONDecodeError, KeyError) as e:
        briefing = {
            "resumen": "Error al parsear la respuesta del modelo.",
            "alertas": [],
            "recomendacion": "Revisar logs del agente.",
            "prioridad": "desconocida",
            "error": str(e),
        }

    briefing["city"] = city
    briefing["date"] = date
    briefing["kpis_today"] = kpis_today
    briefing["kpis_baseline"] = kpis_baseline
    briefing["anomalies"] = anomalies
    briefing["anomalies_count"] = len(anomalies)
    return briefing
