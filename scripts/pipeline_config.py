"""Shared paths and constants for the StarTracker data pipeline."""
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CLEANED_DATA = ROOT / "cleaned_data"
STARS_DIR = CLEANED_DATA / "stars"
SAMPLES_DIR = CLEANED_DATA / "samples"
PUBLIC_DATA = ROOT / "frontend" / "public" / "data"
MAPPING_FILE = ROOT / "data" / "mappings" / "mapping_114.xlsx"
GSAT_STATS_FILE = CLEANED_DATA / "gsat_historical_stats.json"
MANIFEST_FILE = CLEANED_DATA / "manifest.json"

ALL_YEARS = [str(y) for y in range(106, 116)]
SCHEMA_VERSION = 2
MAPPING_SOURCE = "mapping_114.xlsx"


def v1_path(year: str) -> Path:
    return CLEANED_DATA / f"{year}_all_stars.json"


def v2_path(year: str) -> Path:
    return STARS_DIR / f"{year}.json"


def data_dir(year: str) -> Path:
    return ROOT / "data" / year
