"""Calculate operational KPIs from raw fleet data."""

import pandas as pd


REVENUE_RATE_EUR_PER_HOUR = 18.0


def calculate_kpis(row: pd.Series) -> dict:
    """Compute KPIs for a single daily row."""
    maintenance_events = row.get("maintenance_events", 0) or 0
    total_repair_hours = row.get("total_repair_hours", 0.0) or 0.0
    total_trips = row["total_trips"] or 1  # avoid division by zero

    return {
        "tasa_utilizacion": round(
            row["hours_with_passenger"] / row["hours_available"], 4
        ) if row["hours_available"] > 0 else 0.0,
        "fleet_availability": round(
            row["vehicles_operational"] / row["total_vehicles"], 4
        ) if row["total_vehicles"] > 0 else 0.0,
        "mttr_horas": round(
            total_repair_hours / maintenance_events, 4
        ) if maintenance_events > 0 else 0.0,
        "cost_per_km": round(
            row["total_cost_eur"] / row["total_km"], 4
        ) if row["total_km"] > 0 else 0.0,
        "on_time_rate": round(
            (row["total_trips"] - row["cancelled_trips"]) / row["total_trips"], 4
        ) if row["total_trips"] > 0 else 0.0,
        "revenue_proxy": round(
            row["total_trips"] * (row["hours_with_passenger"] / total_trips) * REVENUE_RATE_EUR_PER_HOUR, 4
        ),
    }


def calculate_baseline(df_period: pd.DataFrame) -> dict:
    """Compute average KPIs over a historical period."""
    if df_period.empty:
        return {k: 0.0 for k in [
            "tasa_utilizacion", "fleet_availability", "mttr_horas",
            "cost_per_km", "on_time_rate", "revenue_proxy"
        ]}

    kpi_rows = [calculate_kpis(row) for _, row in df_period.iterrows()]
    kpi_df = pd.DataFrame(kpi_rows)
    return {col: round(kpi_df[col].mean(), 4) for col in kpi_df.columns}
