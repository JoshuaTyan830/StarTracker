"""Orchestrate the StarTracker data pipeline."""
import argparse
import json
import subprocess
import sys
from pathlib import Path

from pipeline_config import ALL_YEARS, SAMPLES_DIR, v1_path, v2_path

SCRIPTS_DIR = Path(__file__).resolve().parent
STEPS = ["process", "enrich", "normalize", "manifest", "sample", "copy"]


def run_script(name: str, args: list[str]) -> None:
    script = SCRIPTS_DIR / f"{name}.py"
    cmd = [sys.executable, str(script), *args]
    print(f"\n{'=' * 50}\n▶ {' '.join(cmd)}\n{'=' * 50}")
    subprocess.run(cmd, check=True)


def build_sample(year: str = "115", count: int = 10) -> None:
    src = v2_path(year)
    if not src.exists():
        print(f"⚠️  Sample skipped, missing {src}")
        return

    with src.open(encoding="utf-8") as f:
        data = json.load(f)

    sample = data[:count]
    SAMPLES_DIR.mkdir(parents=True, exist_ok=True)
    out = SAMPLES_DIR / f"{year}_sample.json"
    with out.open("w", encoding="utf-8") as f:
        json.dump(sample, f, ensure_ascii=False, indent=2)
    print(f"✅ Wrote sample ({len(sample)} depts) → {out}")


ENRICH_PRIORITY_YEARS = ["115", "114"]


def order_years_for_enrich(years: list[str]) -> list[str]:
    """Process recent years first so reference fallback uses up-to-date data."""
    priority = [y for y in ENRICH_PRIORITY_YEARS if y in years]
    rest = sorted([y for y in years if y not in priority], key=int, reverse=True)
    return priority + rest


def run_pipeline(years: list[str], start_step: str, skip_process: bool) -> None:
    start_idx = STEPS.index(start_step)

    if start_idx <= STEPS.index("enrich") and len(years) > 1:
        years = order_years_for_enrich(years)

    for year in years:
        if start_idx <= STEPS.index("process") and not skip_process:
            if not v1_path(year).exists() or start_step == "process":
                run_script("process_all", ["--year", year])

        if start_idx <= STEPS.index("enrich"):
            if v1_path(year).exists():
                run_script("enrich_stars", ["--year", year])
            else:
                print(f"⚠️  Skip enrich for {year}, missing v1")

        if start_idx <= STEPS.index("normalize"):
            if v1_path(year).exists():
                run_script("normalize", ["--year", year])
            else:
                print(f"⚠️  Skip normalize for {year}, missing v1")

    if start_idx <= STEPS.index("manifest"):
        run_script("build_manifest", ["--all"])

    if start_idx <= STEPS.index("sample"):
        build_sample("115")

    if start_idx <= STEPS.index("copy"):
        run_script("copy_to_public", ["--all"])


def main():
    parser = argparse.ArgumentParser(description="Run StarTracker data pipeline")
    parser.add_argument("--year", help="Single academic year")
    parser.add_argument("--all", action="store_true", help="Process years 106-115")
    parser.add_argument(
        "--from",
        dest="start_step",
        choices=STEPS,
        default="process",
        help="Start from this step (default: process)",
    )
    parser.add_argument(
        "--skip-process",
        action="store_true",
        help="Skip PDF parsing even when starting from process",
    )
    args = parser.parse_args()

    years = ALL_YEARS if args.all else ([args.year] if args.year else [])
    if not years:
        parser.error("Specify --year or --all")

    run_pipeline(years, args.start_step, args.skip_process)


if __name__ == "__main__":
    main()
