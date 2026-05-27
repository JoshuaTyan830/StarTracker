"""Copy normalized data to frontend/public/data for static serving."""
import argparse
import shutil
from pathlib import Path

from pipeline_config import ALL_YEARS, GSAT_STATS_FILE, PUBLIC_DATA, STARS_DIR, v2_path


def copy_public(years: list[str]) -> None:
    stars_public = PUBLIC_DATA / "stars"
    stars_public.mkdir(parents=True, exist_ok=True)

    copied = 0
    for year in years:
        src = v2_path(year)
        if not src.exists():
            print(f"⚠️  Skip missing: {src}")
            continue
        dst = stars_public / f"{year}.json"
        shutil.copy2(src, dst)
        copied += 1

    if GSAT_STATS_FILE.exists():
        shutil.copy2(GSAT_STATS_FILE, PUBLIC_DATA / GSAT_STATS_FILE.name)

    manifest_src = GSAT_STATS_FILE.parent / "manifest.json"
    if manifest_src.exists():
        shutil.copy2(manifest_src, PUBLIC_DATA / "manifest.json")

    print(f"✅ Copied {copied} star files → {stars_public}")


def main():
    parser = argparse.ArgumentParser(description="Copy data to frontend/public/data")
    parser.add_argument("--year", help="Academic year")
    parser.add_argument("--all", action="store_true", help="Copy all years 106-115")
    args = parser.parse_args()

    years = ALL_YEARS if args.all else ([args.year] if args.year else ALL_YEARS)
    copy_public(years)


if __name__ == "__main__":
    main()
