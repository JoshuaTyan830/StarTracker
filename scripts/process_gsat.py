import os
import glob
import pandas as pd
import json

# ================= 配置區 =================
DATA_DIR = "../data/gsat_stats/"
OUTPUT_JSON = "../cleaned_data/gsat_historical_stats.json"
SUBJECTS_TO_FIND = ["國文", "英文", "數學", "數學A", "數學B", "社會", "自然"]
# ==========================================

def parse_gsat_excel(file_path):
    print(f"正在解析: {os.path.basename(file_path)} ...")
    df = pd.read_excel(file_path, header=None)
    year_data = {}
    
    for row_idx in range(len(df)):
        for col_idx in range(len(df.columns)):
            cell_value = str(df.iloc[row_idx, col_idx]).strip()
            
            if cell_value in SUBJECTS_TO_FIND:
                subject_name = cell_value
                year_data[subject_name] = {}
                
                # 【升級 1：動態尋找 15 級分的真實列數】
                start_row = -1
                # 從科目名稱往下找最多 5 行，看看哪一行的最左邊或左邊一格是 "15"
                for r in range(row_idx + 1, min(row_idx + 6, len(df))):
                    grade_cell_1 = str(df.iloc[r, max(0, col_idx - 1)]).strip()
                    grade_cell_2 = str(df.iloc[r, 0]).strip() # 有時候級分固定在最左側 A 欄
                    if grade_cell_1 in ["15", "15.0"] or grade_cell_2 in ["15", "15.0"]:
                        start_row = r
                        break
                
                if start_row == -1:
                    print(f"  ⚠️ 找不到 {subject_name} 的 15 級分起點，跳過此科。")
                    continue
                
                # 【升級 2：修正百分比的欄位位移】
                # 「人數」是 col_idx，「百分比」是 col_idx + 1
                pct_col_idx = col_idx + 1
                
                current_top_down_cumulative = 0.0 
                
                for offset in range(16):
                    score = 15 - offset 
                    target_row = start_row + offset
                    
                    if target_row >= len(df):
                        break
                        
                    percentage_val = df.iloc[target_row, pct_col_idx]
                    
                    try:
                        pct = float(percentage_val)
                    except:
                        pct = 0.0
                        
                    current_top_down_cumulative += pct
                    
                    year_data[subject_name][str(score)] = {
                        "percentage": round(pct, 2),
                        "top_down_percentile": round(current_top_down_cumulative, 2)
                    }

    return year_data

def main():
    print("🌟 學測級分歷史統計清洗程式啟動 🌟")
    excel_files = glob.glob(os.path.join(DATA_DIR, "*.xls*")) 
    
    if not excel_files:
        print("⚠️ 找不到任何 Excel 檔案，請檢查路徑設定。")
        return
        
    all_years_stats = {}
    
    for file_path in sorted(excel_files):
        filename = os.path.basename(file_path)
        year_str = "".join(filter(str.isdigit, filename))
        
        if year_str:
            all_years_stats[year_str] = parse_gsat_excel(file_path)
            
    print("="*40)
    print("💾 正在寫入學測總表 JSON ...")
    with open(OUTPUT_JSON, 'w', encoding='utf-8') as f:
        json.dump(all_years_stats, f, ensure_ascii=False, indent=4)
        
    print(f"🎉 成功！已建立跨年份級分對照表：{OUTPUT_JSON}")

if __name__ == "__main__":
    main()