"""Load fleet data from a SQL database via SQLAlchemy."""

import os

import pandas as pd
from sqlalchemy import create_engine, text


DEFAULT_QUERY = """
SELECT
    DATE(fecha_inicio)           AS date,
    ciudad                       AS city,
    COUNT(DISTINCT vehiculo_id)  AS total_vehicles,
    SUM(duracion_horas)          AS hours_with_passenger,
    SUM(km_recorridos)           AS total_km,
    SUM(coste_eur)               AS total_cost_eur,
    COUNT(*)                     AS total_trips,
    COUNT(CASE WHEN cancelado THEN 1 END) AS cancelled_trips
FROM viajes
GROUP BY DATE(fecha_inicio), ciudad
ORDER BY date, city
"""


def load_from_sql(query: str | None = None) -> pd.DataFrame:
    """Connect via SQLAlchemy and return fleet data as a DataFrame.

    Compatible with PostgreSQL, MySQL, and SQL Server — only DATABASE_URL changes.
    """
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise EnvironmentError("DATABASE_URL is not set in environment variables.")

    engine = create_engine(database_url)
    sql = query or DEFAULT_QUERY

    with engine.connect() as conn:
        df = pd.read_sql(text(sql), conn)

    df["date"] = pd.to_datetime(df["date"]).dt.strftime("%Y-%m-%d")
    return df
