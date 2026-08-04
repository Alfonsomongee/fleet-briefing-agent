"""Generate 90 days of simulated fleet data and save to data/fleet_data.csv."""

import random
from datetime import date, timedelta
from pathlib import Path

import numpy as np
import pandas as pd


CITIES = ["Madrid", "Barcelona", "Valencia", "Sevilla"]
SEED = 42
random.seed(SEED)
np.random.seed(SEED)


def _is_weekend(d: date) -> bool:
    return d.weekday() >= 5


def generate_fleet_data(days: int = 90, output_path: str = "data/fleet_data.csv") -> pd.DataFrame:
    """Generate synthetic VTC fleet data with realistic variability."""
    end_date = date.today()
    start_date = end_date - timedelta(days=days - 1)
    date_range = [start_date + timedelta(days=i) for i in range(days)]

    # One anomaly day per city (sudden 30 % utilisation drop)
    anomaly_days = {city: random.choice(date_range[7:days - 7]) for city in CITIES}

    rows = []
    for d in date_range:
        for city in CITIES:
            is_wknd = _is_weekend(d)
            is_anomaly = (d == anomaly_days[city])

            total_vehicles = random.randint(80, 120)
            operational_pct = np.random.uniform(0.85, 1.0)
            vehicles_operational = int(total_vehicles * operational_pct)
            vehicles_in_maintenance = total_vehicles - vehicles_operational

            # Weekend demand boost
            trip_multiplier = 1.25 if is_wknd else 1.0
            base_trips = random.randint(400, 800)
            total_trips = int(base_trips * trip_multiplier)

            # Anomaly: 30 % drop in utilisation
            util_factor = 0.70 if is_anomaly else 1.0
            hours_available = vehicles_operational * np.random.uniform(8, 12)
            util_rate = np.random.uniform(0.55, 0.80) * util_factor
            hours_with_passenger = hours_available * util_rate

            km_per_hour = np.random.uniform(20, 35)
            total_km = hours_with_passenger * km_per_hour

            fuel_cost_per_km = np.random.uniform(0.08, 0.15)
            maint_cost_per_km = np.random.uniform(0.02, 0.05)
            total_cost_eur = total_km * (fuel_cost_per_km + maint_cost_per_km)

            maintenance_events = random.randint(0, 5) if not is_anomaly else random.randint(3, 8)
            total_repair_hours = maintenance_events * np.random.uniform(1.5, 4.0)

            cancel_rate = np.random.uniform(0.01, 0.05) if not is_anomaly else np.random.uniform(0.08, 0.15)
            cancelled_trips = int(total_trips * cancel_rate)

            rows.append({
                "date": d.strftime("%Y-%m-%d"),
                "city": city,
                "total_vehicles": total_vehicles,
                "vehicles_operational": vehicles_operational,
                "vehicles_in_maintenance": vehicles_in_maintenance,
                "total_trips": total_trips,
                "hours_available": round(hours_available, 2),
                "hours_with_passenger": round(hours_with_passenger, 2),
                "total_km": round(total_km, 2),
                "total_cost_eur": round(total_cost_eur, 2),
                "maintenance_events": maintenance_events,
                "total_repair_hours": round(total_repair_hours, 2),
                "cancelled_trips": cancelled_trips,
            })

    df = pd.DataFrame(rows)
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(output_path, index=False)
    print(f"✅ Sample data saved to {output_path} ({len(df)} rows)")
    return df


if __name__ == "__main__":
    generate_fleet_data()
