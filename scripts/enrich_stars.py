"""Enrich v1 star data with mapping metadata (group, school name, etc.)."""
import argparse
import json
import re

import pandas as pd

from pipeline_config import MAPPING_FILE, v1_path

REFERENCE_YEARS = ["115", "114"]


def load_mapping() -> dict[str, dict]:
    df = pd.read_excel(MAPPING_FILE)
    mapping_dict = {}

    for _, row in df.iterrows():
        values_list = [str(x).strip() for x in row.values]
        row_str = " ".join(values_list)

        match = re.search(r"\((\d{5})\)", row_str)
        if not match:
            continue

        dept_id = match.group(1)
        first_col = str(row.iloc[0]).strip()
        school_name = first_col.split("\n")[0].strip() if "\n" in first_col else ""

        group_match = re.search(r"(第[一二三四五六七八]類學群|不分學群)", row_str)
        group_name = group_match.group(1) if group_match else None

        choices = None
        for value in reversed(values_list):
            if value.isdigit() and 0 < int(value) <= 30:
                choices = int(value)
                break

        mapping_dict[dept_id] = {
            "group": group_name,
            "max_choices": choices,
            "school_name": school_name,
        }

    return mapping_dict


def load_reference_groups() -> dict[str, dict]:
    """Fallback groups from recently enriched v1 files."""
    reference = {}
    for year in REFERENCE_YEARS:
        path = v1_path(year)
        if not path.exists():
            continue
        with path.open(encoding="utf-8") as f:
            data = json.load(f)
        for dept in data:
            dept_id = dept.get("dept_id")
            group = dept.get("group")
            if not dept_id or group in (None, "未知", "未知學群"):
                continue
            max_choices = dept.get("max_choices")
            if isinstance(max_choices, str) and max_choices.isdigit():
                max_choices = int(max_choices)
            reference[dept_id] = {
                "group": group,
                "max_choices": max_choices,
                "school_name": dept.get("school_name"),
            }
    return reference


def dedupe_departments(raw_data: list[dict]) -> list[dict]:
    deduped = {}
    for dept in raw_data:
        dept_id = dept.get("dept_id")
        dept_name = dept.get("dept_name", "")
        if not dept_id:
            continue
        unique_key = f"{dept_id}_{dept_name}"
        if unique_key not in deduped:
            deduped[unique_key] = dept
    return list(deduped.values())


def enrich_year(year: str) -> dict:
    json_file = v1_path(year)
    print(f"🌟 Enriching {year} → {json_file}")

    mapping_dict = load_mapping()
    reference_groups = load_reference_groups()
    print(f"  mapping entries: {len(mapping_dict)}, reference entries: {len(reference_groups)}")

    with json_file.open(encoding="utf-8") as f:
        raw_data = json.load(f)

    stars_data = dedupe_departments(raw_data)
    print(f"  deduped: {len(raw_data)} → {len(stars_data)}")

    mapped_count = 0
    inferred_count = 0
    unknown_count = 0

    for dept in stars_data:
        dept_id = dept["dept_id"]
        dept_name = dept.get("dept_name", "")
        dept["is_extra_quota"] = "【外加】" in dept_name

        school_id = dept_id[:3] if len(dept_id) >= 3 else dept.get("school_id", "")

        if dept_id in mapping_dict:
            info = mapping_dict[dept_id]
            dept["group"] = info["group"]
            dept["max_choices"] = info["max_choices"]
            dept["school_name"] = info["school_name"]
            dept["group_source"] = "mapping_114"
            mapped_count += 1
        elif dept_id in reference_groups:
            info = reference_groups[dept_id]
            dept["group"] = info["group"]
            dept["max_choices"] = info["max_choices"]
            dept["school_name"] = info.get("school_name")
            dept["group_source"] = "inferred_from_114"
            inferred_count += 1
        else:
            dept["group"] = None
            dept["max_choices"] = None
            dept["school_name"] = None
            dept["group_source"] = "unknown"
            unknown_count += 1

        if not dept.get("school_name") and school_id:
            for other_id, info in mapping_dict.items():
                if other_id.startswith(school_id) and info.get("school_name"):
                    dept["school_name"] = info["school_name"]
                    break

    with json_file.open("w", encoding="utf-8") as f:
        json.dump(stars_data, f, ensure_ascii=False, indent=2)

    print(
        f"  ✅ mapped={mapped_count}, inferred={inferred_count}, unknown={unknown_count}"
    )
    return {
        "year": year,
        "total": len(stars_data),
        "mapped": mapped_count,
        "inferred": inferred_count,
        "unknown": unknown_count,
    }


def main():
    parser = argparse.ArgumentParser(description="Enrich v1 star data with mapping metadata")
    parser.add_argument("--year", help="Academic year (e.g. 115)")
    parser.add_argument("--all", action="store_true", help="Process years 106-115")
    args = parser.parse_args()

    from pipeline_config import ALL_YEARS

    years = ALL_YEARS if args.all else ([args.year] if args.year else [])
    if not years:
        parser.error("Specify --year or --all")

    for year in years:
        enrich_year(year)


if __name__ == "__main__":
    main()
