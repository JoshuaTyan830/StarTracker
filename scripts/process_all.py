import os
import glob
import pdfplumber
import pandas as pd
import json
import re

# ================= 配置區 =================
YEAR = "115"  # 你只要改這個年份，就能處理不同年的資料夾
DATA_DIR = f"../data/{YEAR}/"
OUTPUT_JSON = f"../cleaned_data/{YEAR}_all_stars.json"
# ==========================================

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
                
                for index, row in df.iterrows():
                    dept_id = str(row.iloc[0]).strip()
                    
                    # 過濾非校系資料列
                    if not dept_id.isdigit():
                        continue
                        
                    dept_data = {
                        "school_id": school_id,
                        "dept_id": dept_id,
                        "dept_name": str(row.iloc[1]).strip().replace('\n', ''),
                        "quota": str(row.iloc[2]).strip(),
                        "admitted": str(row.iloc[3]).strip(),
                        "requirements": [],
                        "practical_reqs": [],
                        "criteria": []
                    }
                    
                    # 1. 處理學測檢定標準
                    subjects = str(row.iloc[4]).split('\n')
                    standards = str(row.iloc[5]).split('\n')
                    scores = str(row.iloc[6]).split('\n')
                    
                    for i in range(len(subjects)):
                        subj = subjects[i].strip()
                        std = standards[i].strip() if i < len(standards) else "--"
                        score = scores[i].strip() if i < len(scores) else "--"
                        if subj not in ['None', '', '--']:
                            dept_data["requirements"].append({"subject": subj, "standard": std, "score": score})

                    # 2. 處理術科檢定標準
                    p_items = str(row.iloc[7]).split('\n')
                    p_scores = str(row.iloc[8]).split('\n')
                    for i in range(len(p_items)):
                        p_item = p_items[i].strip()
                        p_score = p_scores[i].strip() if i < len(p_scores) else "--"
                        if p_item not in ['None', '', '--']:
                            dept_data["practical_reqs"].append({"item": p_item, "score": p_score})
                            
                    # 3. 處理分發比序
                    dept_data["round1_admitted"] = str(row.iloc[11]).strip()
                    dept_data["round2_admitted"] = str(row.iloc[13]).strip()
                    
                    criteria_items = str(row.iloc[10]).split('\n')
                    r1_stds = str(row.iloc[12]).split('\n')
                    r2_stds = str(row.iloc[14]).split('\n')
                    
                    for i in range(len(criteria_items)):
                        item = criteria_items[i].strip()
                        r1 = r1_stds[i].strip() if i < len(r1_stds) else "--"
                        r2 = r2_stds[i].strip() if i < len(r2_stds) else "--"
                        if item not in ['None', '', '--']:
                            dept_data["criteria"].append({"order": i + 1, "item": item, "round1_result": r1, "round2_result": r2})
                    
                    school_data.append(dept_data)
                    
    except Exception as e:
        print(f"  ❌ 處理 {pdf_path} 時發生錯誤: {e}")
        
    return school_data

def main():
    print(f"🌟 StarTracker 資料清洗程式啟動 🌟")
    print(f"目標年份: {YEAR}")
    print(f"掃描目錄: {DATA_DIR}")
    
    # 使用 glob 抓取所有 pdf 檔案
    pdf_files = glob.glob(os.path.join(DATA_DIR, "*.pdf"))
    
    if not pdf_files:
        print("⚠️ 找不到任何 PDF 檔案，請檢查路徑設定。")
        return

    print(f"共找到 {len(pdf_files)} 個 PDF 檔案，準備開始批次處理...\n" + "="*40)
    
    all_universities_data = []
    
    for pdf_path in sorted(pdf_files): # 加上 sorted 讓它照 001, 002 順序跑
        # 從檔名解析出 school_id (例如從 "115Standard_001.pdf" 切出 "001")
        filename = os.path.basename(pdf_path)
        # 假設檔名格式固定為 "115Standard_001.pdf"
        match = re.search(r'\d{3}', filename.split('_')[-1])
        school_id = match.group(0) if match else "000"
        
        # 呼叫解析函數
        school_data = parse_single_pdf(pdf_path, school_id)
        all_universities_data.extend(school_data)
        
    print("="*40)
    print(f"✅ 全數解析完成！總共抓取了 {len(all_universities_data)} 個校系資料。")
    print(f"💾 正在寫入合併檔案: {OUTPUT_JSON} ...")
    
    with open(OUTPUT_JSON, 'w', encoding='utf-8') as f:
        json.dump(all_universities_data, f, ensure_ascii=False, indent=4)
        
    print("🎉 大功告成！前端已經可以拿這份 JSON 去耍了！")

if __name__ == "__main__":
    main()