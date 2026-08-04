"""Load fleet data from one or more Excel files."""

from pathlib import Path

import pandas as pd


def load_from_excel(path: str) -> pd.DataFrame:
    """Load fleet data from a .xlsx file or a folder of .xlsx files.

    If a file has multiple sheets, each sheet name is treated as a city name.
    """
    p = Path(path)
    frames: list[pd.DataFrame] = []

    files = list(p.glob("*.xlsx")) if p.is_dir() else [p]
    if not files:
        raise FileNotFoundError(f"No .xlsx files found at: {path}")

    for filepath in files:
        xl = pd.ExcelFile(filepath)
        if len(xl.sheet_names) > 1:
            # One sheet per city
            for sheet in xl.sheet_names:
                df = xl.parse(sheet)
                df["city"] = sheet
                frames.append(df)
        else:
            frames.append(xl.parse(xl.sheet_names[0]))

    result = pd.concat(frames, ignore_index=True)
    result["date"] = pd.to_datetime(result["date"]).dt.strftime("%Y-%m-%d")
    return result
