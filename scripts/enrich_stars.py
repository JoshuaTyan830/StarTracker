import pandas as pd
import json
import re
import os

# ================= 配置區 =================
YEAR = "112"
MAPPING_FILE = f"../data/mappings/mapping_{YEAR}.xlsx"
JSON_FILE = f"../cleaned_data/{YEAR}_all_stars.json"
# ==========================================

def enrich_data():
    print(f"🌟 開始進行 {YEAR} 年度資料縫合作業 🌟")
    
    # 1. 讀取你整理的 Mapping Excel
    print(f"讀取 Mapping 檔案: {MAPPING_FILE} ...")
    try:
        df = pd.read_excel(MAPPING_FILE)
    except Exception as e:
        print(f"⚠️ 讀取 Mapping 檔案失敗: {e}")
        return

    mapping_dict = {}
    
    # 2. 掃描 Excel 建立對照表
    for index, row in df.iterrows():
        # 把這一列的所有格子轉成字串陣列，並去除前後空白
        values_list = [str(x).strip() for x in row.values]
        row_str = " ".join(values_list)
        
        # 抓取 (00101) 裡的 5 碼校系代碼
        match = re.search(r'\((\d{5})\)', row_str)
        if match:
            dept_id = match.group(1)
            
            # 抓取學群類別
            group_match = re.search(r'(第[一二三四五六七八]類學群|不分學群)', row_str)
            group_name = group_match.group(1) if group_match else "未知學群"
            
            # 抓取志願數：利用你整理的乾淨格式，尋找在 row 裡面合理的數字
            choices = "未知"
            # 反向掃描這列，第一個介於 1~30 的純數字通常就是志願數
            for v in reversed(values_list):
                if v.isdigit() and 0 < int(v) <= 30:
                    choices = v
                    break
            
            mapping_dict[dept_id] = {
                "group": group_name,
                "max_choices": choices
            }

    print(f"✅ 成功從 Excel 萃取出 {len(mapping_dict)} 筆校系對照資料！")
    
    # 3. 讀取並更新原本的 JSON 檔
    print(f"讀取原始 JSON: {JSON_FILE} ...")
    with open(JSON_FILE, 'r', encoding='utf-8') as f:
        raw_stars_data = json.load(f)
        
    # ✨ 修正後的去重邏輯：使用「代碼 + 系名」當作複合鍵
    deduped_dict = {}
    for dept in raw_stars_data:
        d_id = dept.get("dept_id")
        d_name = dept.get("dept_name", "") # 抓取系所名稱
        
        if not d_id:
            continue
            
        # 組合出獨一無二的 Key，例如 "00151_森林環境暨資源學系【外加】"
        unique_key = f"{d_id}_{d_name}"
        
        # 用 unique_key 來判斷是否重複
        if unique_key not in deduped_dict:
            deduped_dict[unique_key] = dept

    # 把去重後的乾淨資料轉回陣列
    stars_data = list(deduped_dict.values())
    print(f"🧹 去重完成：從 {len(raw_stars_data)} 筆原始資料中，提煉出 {len(stars_data)} 筆唯一校系。")

    # 4. 開始縫合學群資訊
    updated_count = 0
    missing_depts = [] # 用來記錄找不到學群的孤兒校系
    
    for dept in stars_data:
        d_id = dept["dept_id"]
        if d_id in mapping_dict:
            # 成功對應，注入新屬性
            dept["group"] = mapping_dict[d_id]["group"]
            dept["max_choices"] = mapping_dict[d_id]["max_choices"]
            updated_count += 1
        else:
            # 對應失敗的防呆機制
            dept["group"] = "未知"
            dept["max_choices"] = "未知"
            missing_depts.append(d_id)
            
    # 5. 將注入完成的資料寫回 JSON
    with open(JSON_FILE, 'w', encoding='utf-8') as f:
        json.dump(stars_data, f, ensure_ascii=False, indent=4)
        
    print(f"🎉 縫合完成！共更新了 {updated_count} 筆校系的學群與志願數資訊。")
    if missing_depts:
        print(f"⚠️ 警告：有 {len(missing_depts)} 個校系在 PDF 中，但在 Excel 裡找不到對應代碼。")
        print(f"   前幾筆未知的代碼為: {missing_depts[:5]}")

if __name__ == "__main__":
    enrich_data()