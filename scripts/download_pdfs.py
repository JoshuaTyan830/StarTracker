import os
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin
import time

# ================= 配置區 =================
# 1. 儲存的目標資料夾
SAVE_DIR = "../data/115/"

# 2. 貼上你截圖中網址列的那個超長網址！
# (注意：每次查不同年份或第八類學群時，只要換這個網址就好)
PAGE_URL = "https://www.cac.edu.tw/CacLink/star115/115starP_reultSK_Query_94feYz1zW_d3Ez/html_115_9wL/standard/one2seven/collegeList_1.php"
# ==========================================

def download_all_pdfs():
    print(f"啟動自動下載器！目標網址: {PAGE_URL}")
    os.makedirs(SAVE_DIR, exist_ok=True)
    
    # 取得網頁原始碼
    try:
        response = requests.get(PAGE_URL)
        response.encoding = 'utf-8' # 避免中文亂碼
        soup = BeautifulSoup(response.text, 'html.parser')
    except Exception as e:
        print(f"⚠️ 無法連線至網頁: {e}")
        return

    # 尋找網頁中所有的超連結 (a 標籤)
    links = soup.find_all('a')
    pdf_count = 0

    print(f"成功取得網頁，開始尋找 PDF 檔案...")
    
    for link in links:
        href = link.get('href')
        
        # 判斷連結是否指向 PDF 檔 (通常 href 會長這樣: 001/115Standard_001.pdf)
        if href and '.pdf' in href.lower():
            # 將相對路徑轉換為完整的絕對下載網址
            full_pdf_url = urljoin(PAGE_URL, href)
            
            # 從網址中切出檔名 (例如: 115Standard_001.pdf)
            filename = os.path.basename(full_pdf_url)
            save_path = os.path.join(SAVE_DIR, filename)
            
            # 如果檔案已經存在，就跳過不重複下載
            if os.path.exists(save_path):
                print(f"⏩ 已存在，跳過: {filename}")
                continue
                
            print(f"⬇️ 正在下載: {filename} ...")
            try:
                pdf_response = requests.get(full_pdf_url)
                # 將下載的內容寫入檔案
                with open(save_path, 'wb') as f:
                    f.write(pdf_response.content)
                pdf_count += 1
                
                # 為了避免被大考中心伺服器封鎖，每次下載完稍微停頓 0.5 秒
                time.sleep(0.5)
            except Exception as e:
                print(f"❌ 下載 {filename} 失敗: {e}")

    print("="*40)
    print(f"🎉 下載任務完成！本次共下載了 {pdf_count} 個 PDF 檔案。")

if __name__ == "__main__":
    download_all_pdfs()