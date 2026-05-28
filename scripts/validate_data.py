"""Validate normalized star data and public copies."""
import argparse
import json
import re
import sys
from pathlib import Path

import pandas as pd

from pipeline_config import ALL_YEARS, GSAT_STATS_FILE, PUBLIC_DATA, STARS_DIR, v2_path

MEDICAL_KEYWORDS = ("醫學", "牙醫", "中醫", "藥學", "獸醫", "口腔")


def load_mapping_groups() -> dict[str, str]:
    mapping_file = Path(__file__).resolve().parent.parent / "data" / "mappings" / "mapping_114.xlsx"
    df = pd.read_excel(mapping_file)
    by_name: dict[str, str] = {}

    for _, row in df.iterrows():
        first_col = str(row.iloc[0]).strip()
        match = re.search(r"\((\d{5})\)", first_col)
        if not match:
            continue
        dept_id = match.group(1)
        school_name = first_col.split("\n")[0].strip() if "\n" in first_col else ""
        name_match = re.search(r"\n(.+?) \(" + re.escape(dept_id) + r"\)", first_col)
        dept_name = name_match.group(1).strip() if name_match else ""
        group_match = re.search(r"(第[一二三四五六七八]類學群|不分學群)", " ".join(str(x) for x in row.values))
        group = group_match.group(1) if group_match else None
        if school_name and dept_name and group:
            by_name[f"{school_name}::{dept_name.replace('【外加】', '').strip()}"] = group

    return by_name


def validate_year(year: str, mapping_by_name: dict[str, str]) -> tuple[list[str], list[str]]:
    errors: list[str] = []
    warnings: list[str] = []
    v2 = v2_path(year)
    public = PUBLIC_DATA / "stars" / f"{year}.json"

    if not v2.exists():
        return [f"{year}: missing {v2}"], []

    if not public.exists():
        errors.append(f"{year}: missing public copy")

    data = json.loads(v2.read_text(encoding="utf-8"))
    if public.exists():
        public_data = json.loads(public.read_text(encoding="utf-8"))
        if len(data) != len(public_data):
            errors.append(f"{year}: v2/public count mismatch ({len(data)} vs {len(public_data)})")

    unknown = sum(1 for d in data if not d.get("group"))
    if unknown:
        msg = f"{year}: {unknown} departments without group ({100 * unknown / len(data):.1f}%)"
        if year in ("114", "115"):
            errors.append(msg)
        else:
            warnings.append(msg)

    for d in data:
        if d.get("group") != "第八類學群":
            continue
        if not any(k in d.get("dept_name", "") for k in MEDICAL_KEYWORDS):
            errors.append(
                f"{year}: suspicious 第八類 {d.get('school_name')} {d.get('dept_name')} ({d.get('dept_id')})"
            )

        key = f"{d.get('school_name', '')}::{d.get('dept_name', '').replace('【外加】', '').strip()}"
        expected = mapping_by_name.get(key)
        if expected and expected != d.get("group"):
            errors.append(
                f"{year}: group mismatch {d.get('school_name')} {d.get('dept_name')} "
                f"data={d.get('group')} mapping={expected}"
            )

    return errors, warnings


def main() -> None:
    parser = argparse.ArgumentParser(description="Validate StarTracker normalized data")
    parser.add_argument("--year", help="Single academic year")
    parser.add_argument("--all", action="store_true", help="Validate years 106-115")
    args = parser.parse_args()

    years = ALL_YEARS if args.all else ([args.year] if args.year else ALL_YEARS)
    mapping_by_name = load_mapping_groups()

    all_errors: list[str] = []
    all_warnings: list[str] = []
    for year in years:
        errors, warnings = validate_year(year, mapping_by_name)
        all_errors.extend(errors)
        all_warnings.extend(warnings)

    if not (PUBLIC_DATA / GSAT_STATS_FILE.name).exists():
        all_errors.append(f"missing public {GSAT_STATS_FILE.name}")

    if all_warnings:
        print("⚠️  Warnings:")
        for warning in all_warnings:
            print(f"  - {warning}")

    if all_errors:
        print("❌ Validation failed:")
        for issue in all_errors:
            print(f"  - {issue}")
        sys.exit(1)

    print(f"✅ Validation passed for {len(years)} year(s)")
    if all_warnings:
        print(f"   ({len(all_warnings)} warning(s) above)")


if __name__ == "__main__":
    main()
