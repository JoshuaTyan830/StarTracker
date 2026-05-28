"""Enrich v1 star data with mapping metadata (group, school name, etc.)."""
import argparse
import json
import re
from typing import Optional, Tuple, Tuple

import pandas as pd

from pipeline_config import MAPPING_FILE, v1_path

REFERENCE_YEARS = ["115", "114"]


def parse_choices(value) -> Optional[int]:
    if value is None:
        return None
    text = str(value).strip()
    if not text or text in ("--", "無", "nan", "None"):
        return None
    if text.isdigit():
        return int(text)
    return None


def reference_key(dept_id: str, is_extra_quota: bool) -> str:
    suffix = "extra" if is_extra_quota else "regular"
    return f"{dept_id}_{suffix}"


def normalize_dept_name(name: str) -> str:
    return (name or "").replace("【外加】", "").strip()


def loose_dept_name(name: str) -> str:
    """Strip grouping suffixes for fuzzy mapping match."""
    text = normalize_dept_name(name)
    text = re.sub(r"《[^》]+》", "", text)
    text = re.sub(r"[（(][^）)]*[）)]", "", text)
    return text.strip()


def find_mapping_match(
    school_name: Optional[str],
    dept_name: str,
    dept_id: str,
    mapping_by_name: dict,
    mapping_by_id: dict,
) -> Tuple[Optional[dict], Optional[str]]:
    if school_name:
        exact_key = mapping_name_key(school_name, dept_name)
        if exact_key in mapping_by_name:
            return mapping_by_name[exact_key], "mapping_114"

        prefix = f"{school_name}::"
        base = normalize_dept_name(dept_name)
        base_loose = loose_dept_name(dept_name)
        best_info = None
        best_len = 0

        for key, info in mapping_by_name.items():
            if not key.startswith(prefix):
                continue
            mapped = key[len(prefix):]
            mapped_loose = loose_dept_name(mapped)
            for candidate in (mapped, mapped_loose):
                if len(candidate) < 4:
                    continue
                if base.startswith(candidate) or base_loose.startswith(candidate):
                    if len(candidate) > best_len:
                        best_len = len(candidate)
                        best_info = info

        if best_info:
            return best_info, "mapping_114_fuzzy"

    if dept_id in mapping_by_id:
        return mapping_by_id[dept_id], "mapping_114"

    return None, None


def mapping_name_key(school_name: str, dept_name: str) -> str:
    return f"{school_name}::{normalize_dept_name(dept_name)}"


def reference_name_key(school_name: str, dept_name: str, is_extra_quota: bool) -> str:
    suffix = "extra" if is_extra_quota else "regular"
    return f"{school_name}::{normalize_dept_name(dept_name)}::{suffix}"


def load_mapping() -> Tuple[dict, dict, dict]:
    df = pd.read_excel(MAPPING_FILE)
    by_id: dict[str, dict] = {}
    by_name: dict[str, dict] = {}
    school_names: dict[str, str] = {}

    for _, row in df.iterrows():
        values_list = [str(x).strip() for x in row.values]
        row_str = " ".join(values_list)

        match = re.search(r"\((\d{5})\)", row_str)
        if not match:
            continue

        dept_id = match.group(1)
        first_col = str(row.iloc[0]).strip()
        school_name = first_col.split("\n")[0].strip() if "\n" in first_col else ""

        dept_name_match = re.search(r"\n(.+?) \(" + re.escape(dept_id) + r"\)", first_col)
        dept_name = dept_name_match.group(1).strip() if dept_name_match else ""

        group_match = re.search(r"(第[一二三四五六七八]類學群|不分學群)", row_str)
        group_name = group_match.group(1) if group_match else None

        info = {
            "group": group_name,
            "max_choices": parse_choices(row.iloc[4]),
            "max_choices_extra": parse_choices(row.iloc[5]),
            "school_name": school_name,
            "dept_name": dept_name,
        }

        by_id[dept_id] = info
        if school_name and dept_name:
            by_name[mapping_name_key(school_name, dept_name)] = info
        if school_name and len(dept_id) >= 3:
            school_names[dept_id[:3]] = school_name

    return by_id, by_name, school_names


def load_reference_groups() -> Tuple[dict, dict]:
    """Fallback groups from recently enriched v1 files."""
    by_id: dict[str, dict] = {}
    by_name: dict[str, dict] = {}
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
            is_extra = dept.get("is_extra_quota", "【外加】" in dept.get("dept_name", ""))
            max_choices = dept.get("max_choices")
            if isinstance(max_choices, str) and max_choices.isdigit():
                max_choices = int(max_choices)
            info = {
                "group": group,
                "max_choices": max_choices,
                "school_name": dept.get("school_name"),
            }
            by_id[reference_key(dept_id, is_extra)] = info
            school_name = dept.get("school_name")
            dept_name = dept.get("dept_name", "")
            if school_name and dept_name:
                by_name[reference_name_key(school_name, dept_name, is_extra)] = info
    return by_id, by_name


def resolve_school_name(
    dept: dict,
    school_id: str,
    school_names: dict[str, str],
    mapping_by_id: dict[str, dict],
) -> Optional[str]:
    if dept.get("school_name"):
        return dept["school_name"]
    if school_id in school_names:
        return school_names[school_id]
    for other_id, info in mapping_by_id.items():
        if other_id.startswith(school_id) and info.get("school_name"):
            return info["school_name"]
    return None


def apply_mapping_info(dept: dict, info: dict, source: str) -> None:
    dept["group"] = info["group"]
    dept["max_choices"] = resolve_max_choices(info, dept["is_extra_quota"])
    if info.get("school_name"):
        dept["school_name"] = info["school_name"]
    dept["group_source"] = source


def resolve_max_choices(info: dict, is_extra_quota: bool) -> Optional[int]:
    if is_extra_quota:
        return info.get("max_choices_extra") or info.get("max_choices")
    return info.get("max_choices")


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

    mapping_by_id, mapping_by_name, school_names = load_mapping()
    reference_by_id, reference_by_name = load_reference_groups()
    print(
        f"  mapping: {len(mapping_by_id)} by id, {len(mapping_by_name)} by name; "
        f"reference: {len(reference_by_id)} by id, {len(reference_by_name)} by name"
    )

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
        school_name = resolve_school_name(dept, school_id, school_names, mapping_by_id)
        name_key = mapping_name_key(school_name, dept_name) if school_name else None
        ref_name_key = (
            reference_name_key(school_name, dept_name, dept["is_extra_quota"])
            if school_name
            else None
        )

        mapping_info, mapping_source = find_mapping_match(
            school_name, dept_name, dept_id, mapping_by_name, mapping_by_id
        )

        if mapping_info and mapping_source:
            apply_mapping_info(dept, mapping_info, mapping_source)
            mapped_count += 1
        elif ref_name_key and ref_name_key in reference_by_name:
            apply_mapping_info(dept, reference_by_name[ref_name_key], "inferred_from_114")
            inferred_count += 1
        elif reference_key(dept_id, dept["is_extra_quota"]) in reference_by_id:
            apply_mapping_info(
                dept,
                reference_by_id[reference_key(dept_id, dept["is_extra_quota"])],
                "inferred_from_114",
            )
            inferred_count += 1
        else:
            dept["group"] = None
            dept["max_choices"] = None
            dept["school_name"] = school_name
            dept["group_source"] = "unknown"
            unknown_count += 1

        if not dept.get("school_name") and school_name:
            dept["school_name"] = school_name

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

    if args.all:
        # Enrich recent years first so reference fallback is correct for older years.
        priority = [y for y in REFERENCE_YEARS if y in years]
        rest = sorted([y for y in years if y not in priority], key=int, reverse=True)
        years = priority + rest

    for year in years:
        enrich_year(year)


if __name__ == "__main__":
    main()
