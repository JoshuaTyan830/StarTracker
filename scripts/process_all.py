import argparse
import glob
import json
import os
import re

import pandas as pd
import pdfplumber

from pipeline_config import data_dir, v1_path


def parse_single_pdf(pdf_path, school_id):
    """處理單一學校的 PDF，回傳該校所有校系的陣列"""
    school_data = []

    try:
        with pdfplumber.open(pdf_path) as pdf:
            total_pages = len(pdf.pages)
            print(f"  👉 檔案 {os.path.basename(pdf_path)} (共 {total_pages} 頁) 開始解析...")

            for page in pdf.pages:
                table = page.extract_table()
                if not table:
                    continue

                df = pd.DataFrame(table)

                for _, row in df.iterrows():
                    dept_id = str(row.iloc[0]).strip()

                    if not dept_id.isdigit():
                        continue

                    dept_data = {
                        "school_id": school_id,
                        "dept_id": dept_id,
                        "dept_name": str(row.iloc[1]).strip().replace("\n", ""),
                        "quota": str(row.iloc[2]).strip(),
                        "admitted": str(row.iloc[3]).strip(),
                        "requirements": [],
                        "practical_reqs": [],
                        "criteria": [],
                    }

                    subjects = str(row.iloc[4]).split("\n")
                    standards = str(row.iloc[5]).split("\n")
                    scores = str(row.iloc[6]).split("\n")

                    for i in range(len(subjects)):
                        subj = subjects[i].strip()
                        std = standards[i].strip() if i < len(standards) else "--"
                        score = scores[i].strip() if i < len(scores) else "--"
                        if subj not in ["None", "", "--"]:
                            dept_data["requirements"].append(
                                {"subject": subj, "standard": std, "score": score}
                            )

                    p_items = str(row.iloc[7]).split("\n")
                    p_scores = str(row.iloc[8]).split("\n")
                    for i in range(len(p_items)):
                        p_item = p_items[i].strip()
                        p_score = p_scores[i].strip() if i < len(p_scores) else "--"
                        if p_item not in ["None", "", "--"]:
                            dept_data["practical_reqs"].append(
                                {"item": p_item, "score": p_score}
                            )

                    dept_data["round1_admitted"] = str(row.iloc[11]).strip()
                    dept_data["round2_admitted"] = str(row.iloc[13]).strip()

                    criteria_items = str(row.iloc[10]).split("\n")
                    r1_stds = str(row.iloc[12]).split("\n")
                    r2_stds = str(row.iloc[14]).split("\n")

                    for i in range(len(criteria_items)):
                        item = criteria_items[i].strip()
                        r1 = r1_stds[i].strip() if i < len(r1_stds) else "--"
                        r2 = r2_stds[i].strip() if i < len(r2_stds) else "--"
                        if item not in ["None", "", "--"]:
                            dept_data["criteria"].append(
                                {
                                    "order": i + 1,
                                    "item": item,
                                    "round1_result": r1,
                                    "round2_result": r2,
                                }
                            )

                    school_data.append(dept_data)

    except Exception as e:
        print(f"  ❌ 處理 {pdf_path} 時發生錯誤: {e}")

    return school_data


def process_year(year: str) -> int:
    data_directory = data_dir(year)
    output_json = v1_path(year)

    print("🌟 StarTracker 資料清洗程式啟動 🌟")
    print(f"目標年份: {year}")
    print(f"掃描目錄: {data_directory}")

    pdf_files = glob.glob(str(data_directory / "*.pdf"))

    if not pdf_files:
        raise FileNotFoundError(f"找不到 PDF 檔案: {data_directory}")

    print(f"共找到 {len(pdf_files)} 個 PDF 檔案，準備開始批次處理...\n" + "=" * 40)

    all_universities_data = []

    for pdf_path in sorted(pdf_files):
        filename = os.path.basename(pdf_path)
        match = re.search(r"\d{3}", filename.split("_")[1])
        school_id = match.group(0) if match else "000"
        school_data = parse_single_pdf(pdf_path, school_id)
        all_universities_data.extend(school_data)

    output_json.parent.mkdir(parents=True, exist_ok=True)
    with output_json.open("w", encoding="utf-8") as f:
        json.dump(all_universities_data, f, ensure_ascii=False, indent=2)

    print("=" * 40)
    print(f"✅ 解析完成！{len(all_universities_data)} 個校系 → {output_json}")
    return len(all_universities_data)


def main():
    parser = argparse.ArgumentParser(description="Parse star admission PDFs to v1 JSON")
    parser.add_argument("--year", required=True, help="Academic year (e.g. 115)")
    args = parser.parse_args()
    process_year(args.year)


if __name__ == "__main__":
    main()
