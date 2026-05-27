"""Build manifest.json summarizing normalized star data."""
import argparse
import json
from datetime import datetime, timezone

from pipeline_config import (
    ALL_YEARS,
    GSAT_STATS_FILE,
    MANIFEST_FILE,
    MAPPING_SOURCE,
    SCHEMA_VERSION,
    STARS_DIR,
    v2_path,
)


def build_manifest(years: list[str]) -> dict:
    stats = {}
    for year in years:
        path = v2_path(year)
        if not path.exists():
            continue
        with path.open(encoding="utf-8") as f:
            data = json.load(f)

        unknown_group = sum(1 for d in data if not d.get("group"))
        stats[year] = {
            "depts": len(data),
            "unknown_group": unknown_group,
            "unknown_group_pct": round(100 * unknown_group / len(data), 1) if data else 0,
        }

    return {
        "schema_version": SCHEMA_VERSION,
        "years": sorted(stats.keys(), reverse=True),
        "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "mapping_source": MAPPING_SOURCE,
        "gsat_stats_file": GSAT_STATS_FILE.name,
        "stats": stats,
    }


def main():
    parser = argparse.ArgumentParser(description="Build cleaned_data/manifest.json")
    parser.add_argument("--all", action="store_true", help="Include all years 106-115")
    args = parser.parse_args()

    years = ALL_YEARS if args.all else ALL_YEARS
    manifest = build_manifest(years)

    MANIFEST_FILE.parent.mkdir(parents=True, exist_ok=True)
    with MANIFEST_FILE.open("w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)

    print(f"✅ Wrote manifest → {MANIFEST_FILE}")


if __name__ == "__main__":
    main()
