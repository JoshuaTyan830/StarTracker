import { useState, useMemo } from 'react';
// 🌟 引入 112~115 全年份資料
import data115 from './data/115_all_stars.json';
import data114 from './data/114_all_stars.json';
import data113 from './data/113_all_stars.json'; 
import data112 from './data/112_all_stars.json'; 
// import gsatData from './data/gsat_historical_stats.json'; // 預留給接下來的級分轉換

// 建立資料字典方便切換
const yearData = {
  "115": data115,
  "114": data114,
  "113": data113,
  "112": data112,
};

// 🏫 建立學校代碼對照表 (你可以繼續擴充)
const SCHOOL_MAP = {
  "001": "國立臺灣大學",
  "002": "國立臺灣師範大學",
  "003": "國立中興大學",
  "004": "國立成功大學",
  "005": "國立政治大學",
  "006": "國立清華大學",
  "011": "國立陽明交通大學",
  "013": "國立陽明交通大學", 
  "014": "國立中央大學",
  "031": "東吳大學",
  "033": "中原大學",
  "034": "東海大學",
};

export default function App() {
  const [selectedYear, setSelectedYear] = useState("115");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("全部學群");
  
  // 用來控制彈出視窗的狀態 (記錄目前點擊的科系代碼)
  const [selectedDeptId, setSelectedDeptId] = useState(null);

  const currentData = yearData[selectedYear] || [];

  // 搜尋與篩選邏輯
  const filteredData = useMemo(() => {
    return currentData.filter((dept) => {
      const schoolName = SCHOOL_MAP[dept.dept_id.substring(0, 3)] || "";
      const matchSearch = 
        dept.dept_name.includes(searchTerm) || 
        dept.dept_id.includes(searchTerm) ||
        schoolName.includes(searchTerm); 
      
      const matchGroup = selectedGroup === "全部學群" || dept.group === selectedGroup;
      
      return matchSearch && matchGroup;
    });
  }, [currentData, searchTerm, selectedGroup]);

  // 取得被點選系所的「歷年資料」
  const getHistoricalData = (deptId) => {
    return Object.keys(yearData).sort().reverse().map(year => ({
      year,
      data: yearData[year].find(d => d.dept_id === deptId)
    })).filter(item => item.data); // 只保留有找到資料的年份
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8 font-sans">
      <div className="max-w-6xl mx-auto">
        
        {/* Header 區塊 */}
        <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <h1 className="text-4xl font-bold text-blue-900 mb-2">StarTracker 🌟</h1>
            <p className="text-gray-600 font-medium">繁星推薦落點分析系統 (Prototype)</p>
          </div>
          
          <div className="flex space-x-2">
            {Object.keys(yearData).sort().reverse().map(year => (
              <button
                key={year}
                onClick={() => setSelectedYear(year)}
                className={`px-5 py-2 rounded-lg font-bold transition-all shadow-sm ${
                  selectedYear === year 
                    ? 'bg-blue-600 text-white hover:bg-blue-700' 
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                {year} 學年度
              </button>
            ))}
          </div>
        </div>

        {/* 搜尋列 */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 mb-6 flex flex-col md:flex-row gap-4">
          <input
            type="text"
            placeholder="🔍 搜尋學校、系名或代碼 (例如：臺灣大學 或 資訊管理)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
          />
          
          <select 
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            className="p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white min-w-45 cursor-pointer font-medium text-gray-700"
          >
            <option value="全部學群">📚 全部學群</option>
            <option value="第一類學群">第一類學群 (文法商)</option>
            <option value="第二類學群">第二類學群 (理工)</option>
            <option value="第三類學群">第三類學群 (生醫)</option>
            <option value="第八類學群">第八類學群 (醫牙)</option>
          </select>
        </div>

        {/* 表格區塊 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50 text-sm font-semibold text-gray-500 flex justify-between">
            <span>找到 {filteredData.length} 筆校系資料</span>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="p-4 text-sm font-semibold text-gray-500 whitespace-nowrap">代碼</th>
                  <th className="p-4 text-sm font-semibold text-gray-500 whitespace-nowrap">學校名稱</th>
                  <th className="p-4 text-sm font-semibold text-gray-500 whitespace-nowrap">系所名稱</th>
                  <th className="p-4 text-sm font-semibold text-gray-500 whitespace-nowrap">學群</th>
                  <th className="p-4 text-sm font-semibold text-gray-500 whitespace-nowrap text-center">招生名額</th>
                  <th className="p-4 text-sm font-semibold text-gray-500 whitespace-nowrap text-center">可填志願數</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.slice(0, 100).map((dept, index) => {
                  const schoolName = SCHOOL_MAP[dept.dept_id.substring(0, 3)] || "未知學校";
                  return (
                    <tr 
                      key={index} 
                      onClick={() => setSelectedDeptId(dept.dept_id)}
                      className="border-b border-gray-50 hover:bg-blue-50 cursor-pointer transition-colors"
                    >
                      <td className="p-4 text-gray-500 font-mono text-sm">{dept.dept_id}</td>
                      <td className="p-4 text-gray-600">{schoolName}</td>
                      <td className="p-4 font-bold text-gray-800">{dept.dept_name}</td>
                      <td className="p-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          dept.group === "第八類學群" ? "bg-red-100 text-red-700" :
                          dept.group ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"
                        }`}>
                          {dept.group || "未知學群"}
                        </span>
                      </td>
                      <td className="p-4 text-gray-700 font-medium text-center">{dept.admitted || dept.quota || "-"}</td>
                      <td className="p-4 text-gray-700 font-medium text-center">{dept.max_choices || "-"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* 🌟 Modal 彈出視窗：顯示歷年資料與級分轉換 */}
      {selectedDeptId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-y-auto overflow-hidden flex flex-col">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-100 flex justify-between items-start sticky top-0 bg-white z-10 shadow-sm">
              <div>
                <div className="text-sm text-blue-600 font-mono font-bold mb-1">{selectedDeptId}</div>
                <h2 className="text-2xl font-bold text-gray-800">
                  {SCHOOL_MAP[selectedDeptId.substring(0, 3)] || "未知學校"} {
                    filteredData.find(d => d.dept_id === selectedDeptId)?.dept_name
                  }
                </h2>
              </div>
              <button 
                onClick={() => setSelectedDeptId(null)}
                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors font-bold"
              >
                ✕ 關閉
              </button>
            </div>

            {/* Modal Content - 歷年資料 */}
            <div className="p-6 flex-1 bg-gray-50/50">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-800 flex items-center">
                  📊 歷年錄取標準與比序
                </h3>
                <div className="text-sm bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full font-bold shadow-sm">
                  ⚡ 級分轉換預覽模式已啟用 (Mockup)
                </div>
              </div>
              
              <div className="space-y-6">
                {getHistoricalData(selectedDeptId).map((history, idx) => (
                  <div key={idx} className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden transition-all hover:shadow-md">
                    
                    {/* 年度標頭 */}
                    <div className="bg-gradient-to-r from-blue-600 to-blue-800 px-5 py-3 flex justify-between items-center">
                      <span className="text-white font-black text-lg tracking-wider">
                        {history.year} 學年度
                      </span>
                      <div className="text-blue-100 text-sm font-medium flex gap-4">
                        <span>招生名額：{history.data.admitted || history.data.quota || "-"}</span>
                        <span>第一輪錄取：{history.data.round1_admitted || "-"}</span>
                        <span>第二輪錄取：{history.data.round2_admitted || "-"}</span>
                      </div>
                    </div>
                    
                    <div className="p-5">
                      {/* 1. 檢定標準 (Tags 排版) */}
                      <div className="mb-5">
                        <h4 className="text-sm font-bold text-gray-500 mb-2">📌 學測、英聽檢定標準</h4>
                        <div className="flex flex-wrap gap-2">
                          {history.data.requirements?.map((req, i) => (
                            <div 
                              key={i} 
                              className={`px-3 py-1.5 rounded-lg border text-sm flex items-center gap-2 ${
                                req.standard === '--' 
                                  ? 'bg-gray-50 border-gray-100 text-gray-400' 
                                  : 'bg-blue-50 border-blue-200 text-blue-700 font-medium'
                              }`}
                            >
                              <span className="font-bold">{req.subject}</span>
                              {req.standard !== '--' && (
                                <span className="bg-white px-2 py-0.5 rounded text-xs border border-blue-100">
                                  {req.standard} {req.score !== '--' ? `(${req.score})` : ''}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* 2. 分發比序錄取標準 (Table 排版) */}
                      <div>
                        <h4 className="text-sm font-bold text-gray-500 mb-2">🏆 分發比序錄取結果</h4>
                        <div className="overflow-x-auto rounded-xl border border-gray-200">
                          <table className="w-full text-sm text-left border-collapse">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="p-3 border-b border-gray-200 w-16 text-center text-gray-600">順序</th>
                                <th className="p-3 border-b border-gray-200 text-gray-600">比序項目</th>
                                <th className="p-3 border-b border-gray-200 text-center text-gray-600">第一輪結果</th>
                                <th className="p-3 border-b border-gray-200 text-center text-gray-600">第二輪結果</th>
                              </tr>
                            </thead>
                            <tbody>
                              {history.data.criteria?.map((crit, i) => {
                                // 💡 判斷是否為「學測成績」且有分數，用來觸發我們的「轉換預覽 UX」
                                const isGsatScore = crit.item.includes("學測") && crit.round1_result !== "--" && !crit.round1_result.includes("%");
                                
                                return (
                                  <tr key={i} className="hover:bg-blue-50/30 transition-colors border-b border-gray-100 last:border-0">
                                    <td className="p-3 text-center font-mono text-gray-400">{crit.order}</td>
                                    <td className="p-3 font-bold text-gray-700">{crit.item}</td>
                                    
                                    {/* 第一輪結果與級分轉換 */}
                                    <td className="p-3 text-center">
                                      <div className="flex flex-col items-center justify-center gap-1">
                                        <span className={`font-bold ${crit.round1_result !== "--" ? "text-blue-600 text-base" : "text-gray-300"}`}>
                                          {crit.round1_result}
                                        </span>
                                        {/* ✨ 這裡就是你理想中的級分轉換 UI！先用假資料示範 */}
                                        {history.year !== "115" && isGsatScore && (
                                          <div className="text-[11px] bg-orange-50 border border-orange-200 text-orange-700 px-2 py-0.5 rounded shadow-sm flex items-center gap-1">
                                            ✨ 115年 14級 ➜ 相當於 {crit.round1_result}級 ✅
                                          </div>
                                        )}
                                      </div>
                                    </td>

                                    {/* 第二輪結果 */}
                                    <td className="p-3 text-center">
                                      <span className={`font-bold ${crit.round2_result !== "--" ? "text-teal-600" : "text-gray-300"}`}>
                                        {crit.round2_result}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                      
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}