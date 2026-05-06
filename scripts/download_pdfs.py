import os
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin
import time

# ================= 配置區 =================
SAVE_DIR = "../data/112/"

# 貼上目標網址
PAGE_URL = "https://www.cac.edu.tw/cacportal/star_his_report/112/112_result_standard/eight/collegeList_1.php"

# ✨ 新增：檔名後綴！
# 如果是下載 1~7 類，保持空白 ""
# 如果是下載第 8 類，請改成 "_g8"
FILE_SUFFIX = "_g8"
# ==========================================

def download_all_pdfs():
    print(f"啟動自動下載器！目標網址: {PAGE_URL}")
    os.makedirs(SAVE_DIR, exist_ok=True)

    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    
    try:
        # ✨ 在 get 裡面加上 headers
        response = requests.get(PAGE_URL, headers=headers, timeout=10)
        response.encoding = 'utf-8' 
        soup = BeautifulSoup(response.text, 'html.parser')
    except Exception as e:
        print(f"⚠️ 無法連線至網頁: {e}")
        return

    links = soup.find_all('a')
    pdf_count = 0
    
    for link in links:
        href = link.get('href')
        if href and '.pdf' in href.lower():
            full_pdf_url = urljoin(PAGE_URL, href)
            filename = os.path.basename(full_pdf_url)
            
            # ✨ 核心邏輯：如果設定了後綴，就在 .pdf 前面插入後綴
            # 例如 115Standard_001.pdf 變成 115Standard_001_g8.pdf
            if FILE_SUFFIX:
                filename = filename.replace('.pdf', f'{FILE_SUFFIX}.pdf')
                
            save_path = os.path.join(SAVE_DIR, filename)
            
            if os.path.exists(save_path):
                print(f"⏩ 已存在，跳過: {filename}")
                continue
                
            print(f"⬇️ 正在下載: {filename} ...")
            try:
                # ✨ 下載 PDF 的地方也要帶上 headers
                pdf_response = requests.get(full_pdf_url, headers=headers, timeout=20)
                with open(save_path, 'wb') as f:
                    f.write(pdf_response.content)
                pdf_count += 1
                time.sleep(0.5)
            except Exception as e:
                print(f"❌ 下載 {filename} 失敗: {e}")

    print("="*40)
    print(f"🎉 下載任務完成！本次共下載了 {pdf_count} 個 PDF 檔案。")

if __name__ == "__main__":
    download_all_pdfs()