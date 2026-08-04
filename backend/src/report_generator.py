"""Save briefing results as JSON and generate consolidated HTML reports."""

import json
import os
from datetime import datetime
from pathlib import Path


class _SafeEncoder(json.JSONEncoder):
    """Handle numpy scalars and other non-standard types."""
    def default(self, obj):
        try:
            import numpy as np
            if isinstance(obj, (np.integer,)):
                return int(obj)
            if isinstance(obj, (np.floating,)):
                return float(obj)
            if isinstance(obj, (np.bool_,)):
                return bool(obj)
            if isinstance(obj, np.ndarray):
                return obj.tolist()
        except ImportError:
            pass
        return super().default(obj)


PRIORITY_COLORS = {
    "alta": ("#dc2626", "#fef2f2"),
    "media": ("#d97706", "#fffbeb"),
    "baja": ("#16a34a", "#f0fdf4"),
    "desconocida": ("#6b7280", "#f9fafb"),
}

PRIORITY_EMOJI = {"alta": "⚠️", "media": "📊", "baja": "✅", "desconocida": "❓"}


def save_json(briefing: dict, output_dir: str = "output") -> None:
    """Save a briefing dict as JSON to output/briefing_YYYY-MM-DD_CIUDAD.json."""
    Path(output_dir).mkdir(parents=True, exist_ok=True)
    city_slug = briefing["city"].lower().replace(" ", "_")
    filename = f"briefing_{briefing['date']}_{city_slug}.json"
    path = Path(output_dir) / filename
    with open(path, "w", encoding="utf-8") as f:
        json.dump(briefing, f, ensure_ascii=False, indent=2, cls=_SafeEncoder)


def _kpi_row(label: str, today: float, baseline: float) -> str:
    diff = today - baseline
    diff_pct = (diff / baseline * 100) if baseline else 0
    color = "#16a34a" if diff_pct >= 0 else "#dc2626"
    arrow = "▲" if diff_pct >= 0 else "▼"
    return (
        f"<tr>"
        f"<td style='padding:6px 12px;border-bottom:1px solid #e5e7eb'>{label}</td>"
        f"<td style='padding:6px 12px;border-bottom:1px solid #e5e7eb;text-align:right'>{today:.4f}</td>"
        f"<td style='padding:6px 12px;border-bottom:1px solid #e5e7eb;text-align:right'>{baseline:.4f}</td>"
        f"<td style='padding:6px 12px;border-bottom:1px solid #e5e7eb;text-align:right;color:{color};font-weight:600'>"
        f"{arrow} {abs(diff_pct):.1f}%</td>"
        f"</tr>"
    )


KPI_LABELS = {
    "tasa_utilizacion": "Tasa utilización",
    "fleet_availability": "Disponibilidad flota",
    "mttr_horas": "MTTR (h)",
    "cost_per_km": "Coste/km (€)",
    "on_time_rate": "Tasa puntualidad",
    "revenue_proxy": "Revenue proxy (€)",
}


def _city_card(b: dict) -> str:
    prioridad = b.get("prioridad", "desconocida")
    color, bg = PRIORITY_COLORS.get(prioridad, PRIORITY_COLORS["desconocida"])
    alertas_html = "".join(f"<li style='margin:4px 0'>{a}</li>" for a in b.get("alertas", []))

    kpi_rows = "".join(
        _kpi_row(KPI_LABELS.get(k, k), b["kpis_today"].get(k, 0), b["kpis_baseline"].get(k, 0))
        for k in KPI_LABELS
    )

    return f"""
    <div style='background:#fff;border-radius:12px;box-shadow:0 1px 4px rgba(0,0,0,.08);
                margin-bottom:24px;overflow:hidden;border:1px solid #e5e7eb'>
      <div style='background:{bg};border-left:4px solid {color};padding:16px 20px;
                  display:flex;align-items:center;justify-content:space-between'>
        <div>
          <span style='font-size:20px;font-weight:700;color:#111'>{b["city"]}</span>
          <span style='margin-left:8px;font-size:13px;color:#6b7280'>{b["date"]}</span>
        </div>
        <span style='background:{color};color:#fff;padding:4px 12px;border-radius:9999px;
                     font-size:13px;font-weight:600;text-transform:uppercase'>
          {PRIORITY_EMOJI.get(prioridad,"")} {prioridad}
        </span>
      </div>
      <div style='padding:20px'>
        <p style='color:#374151;margin:0 0 16px 0;line-height:1.6'>{b.get("resumen","")}</p>
        {"<ul style='margin:0 0 16px 0;padding-left:20px;color:#374151'>" + alertas_html + "</ul>" if alertas_html else ""}
        <div style='background:#f8fafc;border-radius:8px;padding:12px 16px;
                    border-left:3px solid {color};margin-bottom:16px'>
          <strong style='font-size:13px;text-transform:uppercase;color:#6b7280'>Recomendación</strong>
          <p style='margin:4px 0 0 0;color:#111'>{b.get("recomendacion","")}</p>
        </div>
        <table style='width:100%;border-collapse:collapse;font-size:13px'>
          <thead>
            <tr style='background:#f1f5f9'>
              <th style='padding:8px 12px;text-align:left;font-weight:600;color:#6b7280'>KPI</th>
              <th style='padding:8px 12px;text-align:right;font-weight:600;color:#6b7280'>Hoy</th>
              <th style='padding:8px 12px;text-align:right;font-weight:600;color:#6b7280'>Baseline 7d</th>
              <th style='padding:8px 12px;text-align:right;font-weight:600;color:#6b7280'>Δ</th>
            </tr>
          </thead>
          <tbody>{kpi_rows}</tbody>
        </table>
      </div>
    </div>"""


def generate_html_report(briefings: list[dict], output_dir: str = "output") -> str:
    """Generate a consolidated HTML report for all cities on a given date."""
    if not briefings:
        return ""

    Path(output_dir).mkdir(parents=True, exist_ok=True)
    report_date = briefings[0]["date"]

    summary_rows = ""
    for b in briefings:
        p = b.get("prioridad", "desconocida")
        color, _ = PRIORITY_COLORS.get(p, PRIORITY_COLORS["desconocida"])
        summary_rows += (
            f"<tr>"
            f"<td style='padding:10px 16px;font-weight:600'>{b['city']}</td>"
            f"<td style='padding:10px 16px'>"
            f"<span style='background:{color};color:#fff;padding:2px 10px;border-radius:9999px;"
            f"font-size:12px;font-weight:600'>{p.upper()}</span></td>"
            f"<td style='padding:10px 16px;text-align:center'>{b.get('anomalies_count', 0)}</td>"
            f"<td style='padding:10px 16px;font-size:13px;color:#374151'>{b.get('recomendacion','')[:80]}…</td>"
            f"</tr>"
        )

    cards_html = "".join(_city_card(b) for b in briefings)
    generated_at = datetime.now().strftime("%Y-%m-%d %H:%M UTC")

    html = f"""<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Fleet Briefing — {report_date}</title>
  <style>
    * {{ box-sizing: border-box; margin: 0; padding: 0; }}
    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: #f8fafc; color: #111; }}
    .container {{ max-width: 900px; margin: 0 auto; padding: 32px 16px; }}
    h1 {{ font-size: 24px; font-weight: 700; color: #111; }}
    .subtitle {{ color: #6b7280; font-size: 14px; margin-top: 4px; }}
    .summary-table {{ width: 100%; border-collapse: collapse; background: #fff;
                      border-radius: 12px; overflow: hidden;
                      box-shadow: 0 1px 4px rgba(0,0,0,.08); margin: 24px 0; }}
    .summary-table th {{ background: #f1f5f9; padding: 10px 16px; text-align: left;
                         font-size: 12px; font-weight: 600; color: #6b7280;
                         text-transform: uppercase; letter-spacing: .05em; }}
    .summary-table tr:not(:last-child) td {{ border-bottom: 1px solid #e5e7eb; }}
    .footer {{ text-align: center; color: #9ca3af; font-size: 12px; margin-top: 32px; }}
  </style>
</head>
<body>
  <div class="container">
    <h1>🚗 Fleet Briefing</h1>
    <p class="subtitle">Informe operativo — {report_date} · Generado: {generated_at}</p>

    <table class="summary-table">
      <thead>
        <tr>
          <th>Ciudad</th><th>Prioridad</th><th>Alertas</th><th>Recomendación principal</th>
        </tr>
      </thead>
      <tbody>{summary_rows}</tbody>
    </table>

    {cards_html}

    <p class="footer">fleet-briefing-agent · powered by DeepSeek</p>
  </div>
</body>
</html>"""

    out_path = Path(output_dir) / f"report_{report_date}.html"
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(html)

    return str(out_path)
