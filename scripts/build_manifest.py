"""Build manifest.json summarizing normalized star data."""
import argparse
import json
import re
from datetime import datetime, timezone

import pandas as pd

from pipeline_config import (
    ALL_YEARS,
    GSAT_STATS_FILE,
    MANIFEST_FILE,
    MAPPING_FILE,
    MAPPING_SOURCE,
    SCHEMA_VERSION,
    v2_path,
)

LEGACY_SCHOOL_NAMES = {
    "025": "國立陽明大學",
    "111": "台灣首府大學",
    "133": "明道大學",
}


def load_mapping_school_names() -> dict[str, str]:
    df = pd.read_excel(MAPPING_FILE)
    school_names: dict[str, str] = {}

    for _, row in df.iterrows():
        row_str = " ".join(str(x).strip() for x in row.values)
        match = re.search(r"\((\d{5})\)", row_str)
        if not match:
            continue

        dept_id = match.group(1)
        first_col = str(row.iloc[0]).strip()
        school_name = first_col.split("\n")[0].strip() if "\n" in first_col else ""
        if school_name and len(dept_id) >= 3:
            school_names[dept_id[:3]] = school_name

    return school_names


def build_school_names(years: list[str]) -> dict[str, str]:
    names = load_mapping_school_names()

    for year in years:
        path = v2_path(year)
        if not path.exists():
            continue
        with path.open(encoding="utf-8") as f:
            data = json.load(f)
        for dept in data:
            school_id = dept.get("school_id")
            school_name = dept.get("school_name")
            if school_id and school_name and school_id not in names:
                names[school_id] = school_name

    for school_id, school_name in LEGACY_SCHOOL_NAMES.items():
        names.setdefault(school_id, school_name)

    return dict(sorted(names.items(), key=lambda item: int(item[0])))


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
        "school_names": build_school_names(years),
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
