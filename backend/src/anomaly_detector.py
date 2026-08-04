"""Detect KPI anomalies against a baseline using configurable thresholds."""


def detect_anomalies(
    kpis_today: dict,
    kpis_baseline: dict,
    threshold: float = 0.10,
) -> list[dict]:
    """Compare today's KPIs against a baseline and return anomalies.

    Args:
        kpis_today: KPIs for the target date.
        kpis_baseline: Average KPIs for the reference period (7-day rolling).
        threshold: Deviation fraction above which a KPI is marked critical (default 10%).

    Returns:
        List of anomaly dicts, ordered by absolute deviation descending.
        Only includes KPIs with |deviation| > 5%.
    """
    anomalies: list[dict] = []
    noise_floor = 5.0  # percentage

    for kpi, valor_hoy in kpis_today.items():
        valor_baseline = kpis_baseline.get(kpi, 0.0)
        if valor_baseline == 0:
            continue

        desviacion_pct = (valor_hoy - valor_baseline) / valor_baseline * 100

        if abs(desviacion_pct) <= noise_floor:
            continue

        anomalies.append({
            "kpi": kpi,
            "valor_hoy": round(valor_hoy, 4),
            "valor_baseline": round(valor_baseline, 4),
            "desviacion_pct": round(desviacion_pct, 2),
            "direccion": "bajada" if desviacion_pct < 0 else "subida",
            "critico": bool(abs(desviacion_pct) > threshold * 100),
        })

    anomalies.sort(key=lambda x: abs(x["desviacion_pct"]), reverse=True)
    return anomalies
