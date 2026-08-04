"""CLI entry point for the fleet briefing agent."""

import argparse
import sys
from datetime import date as date_type

from dotenv import load_dotenv

load_dotenv()


PRIORITY_ICONS = {"alta": "⚠️ ", "media": "📊", "baja": "✅", "desconocida": "❓"}


def run_pipeline(target_date: str, cities: list[str] | None = None) -> list[dict]:
    """Run the full briefing pipeline for a date and optional city filter."""
    from src.data_loader import load_data, get_today_data, get_last_n_days
    from src.kpi_calculator import calculate_kpis, calculate_baseline
    from src.anomaly_detector import detect_anomalies
    from src.briefing_agent import generate_briefing
    from src.report_generator import save_json
    from src.db import save_briefing

    df = load_data()
    today_df = get_today_data(df, target_date)
    available_cities = sorted(today_df["city"].unique().tolist())
    selected = [c for c in available_cities if not cities or c in cities]

    if not selected:
        print(f"❌ No data found for cities: {cities} on {target_date}")
        sys.exit(1)

    briefings = []
    for city in selected:
        city_row = today_df[today_df["city"] == city].iloc[0]
        baseline_df = get_last_n_days(df[df["city"] == city], target_date, n=7)

        kpis_today = calculate_kpis(city_row)
        kpis_baseline = calculate_baseline(baseline_df)
        anomalies = detect_anomalies(kpis_today, kpis_baseline)
        briefing = generate_briefing(city, target_date, kpis_today, kpis_baseline, anomalies)

        save_json(briefing)
        try:
            save_briefing(briefing)
        except Exception as e:
            print(f"  ⚠️  Supabase save skipped ({e})")

        briefings.append(briefing)

        icon = PRIORITY_ICONS.get(briefing.get("prioridad", ""), "❓")
        n_alerts = briefing.get("anomalies_count", 0)
        label = "alerta" if n_alerts == 1 else "alertas"
        print(f"{icon} {city:<12} — prioridad: {briefing.get('prioridad','?'):<8} — {n_alerts} {label}")

    return briefings


def main() -> None:
    parser = argparse.ArgumentParser(description="Fleet Briefing Agent")
    parser.add_argument("--date", default=date_type.today().strftime("%Y-%m-%d"), help="Target date (YYYY-MM-DD)")
    parser.add_argument("--city", help="Run for a single city (default: all)")
    parser.add_argument("--generate-data", action="store_true", help="Generate sample CSV data before running")
    args = parser.parse_args()

    if args.generate_data:
        print("📊 Generating sample data…")
        from data.generate_sample_data import generate_fleet_data
        generate_fleet_data()

    cities = [args.city] if args.city else None

    print(f"\n🚗 Fleet Briefing Agent — {args.date}\n{'─' * 45}")

    try:
        briefings = run_pipeline(args.date, cities)
    except EnvironmentError as e:
        print(f"\n{e}")
        sys.exit(1)
    except ConnectionError as e:
        print(f"\n{e}")
        sys.exit(1)
    except FileNotFoundError as e:
        print(f"\n❌ {e}")
        sys.exit(1)

    from src.report_generator import generate_html_report
    report_path = generate_html_report(briefings)
    print(f"\n{'─' * 45}\nInforme guardado en {report_path}")


if __name__ == "__main__":
    main()
