"""Normalize enriched v1 JSON to schema v2."""
import argparse
import json
import re
from typing import List, Optional, Tuple

from pipeline_config import ALL_YEARS, SCHEMA_VERSION, STARS_DIR, v1_path, v2_path

# Exact match for common criteria items
CRITERIA_KIND_MAP = {
    "在校學業": ("school_rank", []),
    "學測國文": ("gsat_single", ["國文"]),
    "學測英文": ("gsat_single", ["英文"]),
    "學測社會": ("gsat_single", ["社會"]),
    "學測自然": ("gsat_single", ["自然"]),
    "學測數A": ("gsat_single", ["數學A"]),
    "學測數B": ("gsat_single", ["數學B"]),
    "學測數學A": ("gsat_single", ["數學A"]),
    "學測數學B": ("gsat_single", ["數學B"]),
    "學測國英": ("gsat_sum", ["國文", "英文"]),
    "學測國英社": ("gsat_sum", ["國文", "英文", "社會"]),
    "學測國英數A自": ("gsat_sum", ["國文", "英文", "數學A", "自然"]),
    "學測國數A社自": ("gsat_sum", ["國文", "數學A", "社會", "自然"]),
    "學測英數A自": ("gsat_sum", ["英文", "數學A", "自然"]),
    "學測英數A社": ("gsat_sum", ["英文", "數學A", "社會"]),
    "學測國英數A": ("gsat_sum", ["國文", "英文", "數學A"]),
    "學測國英數B": ("gsat_sum", ["國文", "英文", "數學B"]),
    "學測國英數A社": ("gsat_sum", ["國文", "英文", "數學A", "社會"]),
    "學測國英數A社自": ("gsat_sum", ["國文", "英文", "數學A", "社會", "自然"]),
    "學測國數A": ("gsat_sum", ["國文", "數學A"]),
    "學測國數B": ("gsat_sum", ["國文", "數學B"]),
    "學測國社": ("gsat_sum", ["國文", "社會"]),
    "學測英社": ("gsat_sum", ["英文", "社會"]),
    "學測英自": ("gsat_sum", ["英文", "自然"]),
    "學測數A社": ("gsat_sum", ["數學A", "社會"]),
    "學測數A自": ("gsat_sum", ["數學A", "自然"]),
    "學測數B自": ("gsat_sum", ["數學B", "自然"]),
    "學測社自": ("gsat_sum", ["社會", "自然"]),
    "公社學業": ("subject_grade", ["公民", "社會"]),
    "國語文學業": ("subject_grade", ["國語文"]),
    "英語文學業": ("subject_grade", ["英語文"]),
    "數學學業": ("subject_grade", ["數學"]),
    "物理學業": ("subject_grade", ["物理"]),
    "化學學業": ("subject_grade", ["化學"]),
    "生物學業": ("subject_grade", ["生物"]),
    "歷史學業": ("subject_grade", ["歷史"]),
    "地理學業": ("subject_grade", ["地理"]),
    "資訊科技學業": ("subject_grade", ["資訊科技"]),
    "生活科技學業": ("subject_grade", ["生活科技"]),
}

GSAT_TOKEN_MAP = [
    ("數A", "數學A"),
    ("數B", "數學B"),
    ("國", "國文"),
    ("英", "英文"),
    ("社", "社會"),
    ("自", "自然"),
    ("數", "數學"),
]


def parse_int(value) -> Optional[int]:
    if value is None:
        return None
    text = str(value).strip()
    if not text or text in ("--", "None", "未知", "nan"):
        return None
    if text.isdigit():
        return int(text)
    match = re.search(r"\d+", text)
    return int(match.group()) if match else None


def parse_min_level(score_str: str) -> Optional[int]:
    if not score_str or score_str == "--":
        return None
    match = re.search(r"(\d+)", str(score_str))
    return int(match.group(1)) if match else None


def parse_criteria_result(raw: str) -> Optional[dict]:
    if not raw or str(raw).strip() in ("--", "None", ""):
        return None

    raw = str(raw).strip()
    note = None
    if raw.endswith("＊") or raw.endswith("*"):
        note = "supplementary"
        raw = raw.rstrip("＊*").strip()

    if "%" in raw:
        value = float(raw.replace("%", "").strip())
        result = {"type": "percentile", "value": value, "raw": raw}
    elif re.fullmatch(r"\d+(\.\d+)?", raw):
        result = {"type": "level_sum", "value": int(float(raw)), "raw": raw}
    else:
        result = {"type": "unknown", "raw": raw}

    if note:
        result["note"] = note
    return result


def infer_criteria_kind(item: str) -> Tuple[str, List[str]]:
    if item in CRITERIA_KIND_MAP:
        return CRITERIA_KIND_MAP[item]

    if item.endswith("學業"):
        subject = item.replace("學業", "")
        return "subject_grade", [subject]

    if item.startswith("學測"):
        suffix = item[2:]
        subjects = []
        remaining = suffix
        while remaining:
            matched = False
            for token, subject in GSAT_TOKEN_MAP:
                if remaining.startswith(token):
                    subjects.append(subject)
                    remaining = remaining[len(token):]
                    matched = True
                    break
            if not matched:
                break
        if subjects:
            kind = "gsat_single" if len(subjects) == 1 else "gsat_sum"
            return kind, subjects

    return "unknown", []


def normalize_requirement(req: dict) -> dict:
    return {
        "subject": req.get("subject", ""),
        "standard": req.get("standard", "--"),
        "min_level": parse_min_level(req.get("score", "")),
    }


def normalize_practical(req: dict) -> dict:
    return {
        "item": req.get("item", ""),
        "standard": req.get("score", "--"),
    }


def normalize_criterion(crit: dict) -> dict:
    item = crit.get("item", "")
    kind, subjects = infer_criteria_kind(item)
    return {
        "order": crit.get("order"),
        "item": item,
        "kind": kind,
        "subjects": subjects,
        "round1": parse_criteria_result(crit.get("round1_result", "--")),
        "round2": parse_criteria_result(crit.get("round2_result", "--")),
    }


def normalize_group(group) -> Optional[str]:
    if group in (None, "未知", "未知學群", ""):
        return None
    return group


def normalize_dept(dept: dict, year: str) -> dict:
    dept_name = dept.get("dept_name", "")
    group = normalize_group(dept.get("group"))
    max_choices = parse_int(dept.get("max_choices"))

    return {
        "schema_version": SCHEMA_VERSION,
        "year": int(year),
        "school_id": dept.get("school_id", ""),
        "school_name": dept.get("school_name") or None,
        "dept_id": dept.get("dept_id", ""),
        "dept_name": dept_name,
        "is_extra_quota": dept.get("is_extra_quota", "【外加】" in dept_name),
        "quota": parse_int(dept.get("quota")),
        "admitted_total": parse_int(dept.get("admitted")),
        "admitted_round1": parse_int(dept.get("round1_admitted")),
        "admitted_round2": parse_int(dept.get("round2_admitted")),
        "group": group,
        "group_source": dept.get("group_source"),
        "max_choices": max_choices,
        "requirements": [normalize_requirement(r) for r in dept.get("requirements", [])],
        "practical_reqs": [normalize_practical(r) for r in dept.get("practical_reqs", [])],
        "criteria": [normalize_criterion(c) for c in dept.get("criteria", [])],
    }


def normalize_year(year: str) -> int:
    input_path = v1_path(year)
    output_path = v2_path(year)

    if not input_path.exists():
        raise FileNotFoundError(f"Missing v1 file: {input_path}")

    with input_path.open(encoding="utf-8") as f:
        v1_data = json.load(f)

    v2_data = [normalize_dept(dept, year) for dept in v1_data]

    STARS_DIR.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8") as f:
        json.dump(v2_data, f, ensure_ascii=False, indent=2)

    print(f"✅ Normalized {year}: {len(v2_data)} departments → {output_path}")
    return len(v2_data)


def main():
    parser = argparse.ArgumentParser(description="Normalize v1 star data to schema v2")
    parser.add_argument("--year", help="Academic year (e.g. 115)")
    parser.add_argument("--all", action="store_true", help="Process years 106-115")
    args = parser.parse_args()

    years = ALL_YEARS if args.all else ([args.year] if args.year else [])
    if not years:
        parser.error("Specify --year or --all")

    for year in years:
        normalize_year(year)


if __name__ == "__main__":
    main()
