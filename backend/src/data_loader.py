"""Single entry point for all fleet data sources."""

import os
from pathlib import Path

import pandas as pd
from dotenv import load_dotenv

load_dotenv()


def load_data() -> pd.DataFrame:
    """Load fleet data from the source specified by DATA_SOURCE env var.

    Supported values: csv (default), sql, excel, pdf.
    """
    source = os.getenv("DATA_SOURCE", "csv").lower()

    if source == "csv":
        csv_path = os.getenv("CSV_PATH", "data/fleet_data.csv")
        if not Path(csv_path).exists():
            raise FileNotFoundError(
                f"CSV not found at '{csv_path}'. "
                "Run: python main.py --generate-data"
            )
        return pd.read_csv(csv_path)

    elif source == "sql":
        from src.connectors.sql_connector import load_from_sql
        return load_from_sql()

    elif source == "excel":
        from src.connectors.excel_connector import load_from_excel
        excel_path = os.getenv("EXCEL_PATH", "data/")
        return load_from_excel(excel_path)

    elif source == "pdf":
        from src.connectors.pdf_connector import load_from_pdf
        pdf_path = os.getenv("PDF_PATH", "data/report.pdf")
        return load_from_pdf(pdf_path)

    else:
        raise ValueError(f"Unknown DATA_SOURCE: '{source}'. Use csv | sql | excel | pdf.")


def get_today_data(df: pd.DataFrame, date: str | None = None) -> pd.DataFrame:
    """Return all rows for a specific date (default: today)."""
    from datetime import date as date_type
    target = date or date_type.today().strftime("%Y-%m-%d")
    result = df[df["date"] == target]
    if result.empty:
        raise ValueError(f"No data found for date: {target}")
    return result


def get_last_n_days(df: pd.DataFrame, date: str, n: int = 7) -> pd.DataFrame:
    """Return the n days prior to (not including) the given date."""
    from datetime import datetime, timedelta
    end = datetime.strptime(date, "%Y-%m-%d")
    start = end - timedelta(days=n)
    mask = (pd.to_datetime(df["date"]) >= start) & (pd.to_datetime(df["date"]) < end)
    return df[mask]
