import { useState, useMemo, useEffect, useRef } from 'react';
import {
  buildGroupOptions,
  countUniqueDepartments,
  deptRowKey,
  findDeptInYear,
  formatCriteriaResult,
  formatPracticalReq,
  formatRequirement,
  getAdmittedTotal,
  getGroupLabel,
  getHistoricalData,
  getQuota,
  groupBadgeClass,
} from './lib/deptUtils';

const DEFAULT_YEARS = Array.from({ length: 10 }, (_, i) => String(115 - i));

async function fetchYearData(year) {
  const res = await fetch(`/data/stars/${year}.json`);
  if (!res.ok) throw new Error(`Failed to load ${year}: ${res.status}`);
  return res.json();
}

async function fetchManifest() {
  try {
    const res = await fetch('/data/manifest.json');
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default function App() {
  const [availableYears, setAvailableYears] = useState(DEFAULT_YEARS);
  const [selectedYear, setSelectedYear] = useState('115');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('全部學群');
  const [selectedAnchor, setSelectedAnchor] = useState(null);

  const [yearCache, setYearCache] = useState({});
  const [loadError, setLoadError] = useState(null);
  const [manifestStats, setManifestStats] = useState(null);
  const inflightRef = useRef(new Set());
  const yearCacheRef = useRef({});

  useEffect(() => {
    yearCacheRef.current = yearCache;
  }, [yearCache]);

  useEffect(() => {
    fetchManifest().then((manifest) => {
      if (manifest?.years?.length) {
        setAvailableYears(manifest.years.map(String));
      }
      if (manifest?.stats) {
        setManifestStats(manifest.stats);
      }
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    const year = selectedYear;

    if (yearCache[year] || inflightRef.current.has(year)) {
      return () => { cancelled = true; };
    }

    inflightRef.current.add(year);

    fetchYearData(year)
      .then((data) => {
        if (cancelled) return;
        setYearCache((prev) => ({ ...prev, [year]: data }));
        setLoadError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadError(err.message);
      })
      .finally(() => {
        inflightRef.current.delete(year);
      });

    return () => { cancelled = true; };
  }, [selectedYear, yearCache]);

  useEffect(() => {
    if (!selectedAnchor) return undefined;

    const ordered = [...availableYears].sort((a, b) => {
      if (a === selectedYear) return -1;
      if (b === selectedYear) return 1;
      return Number(b) - Number(a);
    });

    let cancelled = false;

    (async () => {
      for (const year of ordered) {
        if (cancelled) return;
        if (yearCacheRef.current[year] || inflightRef.current.has(year)) continue;

        inflightRef.current.add(year);
        try {
          const data = await fetchYearData(year);
          if (cancelled) return;
          setYearCache((prev) => ({ ...prev, [year]: data }));
        } catch {
          // ignore background history load errors
        } finally {
          inflightRef.current.delete(year);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [selectedAnchor, availableYears, selectedYear]);

  const currentData = useMemo(
    () => yearCache[selectedYear] || [],
    [yearCache, selectedYear]
  );

  const isLoadingSelected = !yearCache[selectedYear] && !loadError;
  const historyLoading = Boolean(
    selectedAnchor && availableYears.some((year) => !yearCache[year])
  );

  const groupOptions = useMemo(
    () => buildGroupOptions(currentData),
    [currentData]
  );

  useEffect(() => {
    if (selectedGroup !== '全部學群' && !groupOptions.includes(selectedGroup)) {
      setSelectedGroup('全部學群');
    }
  }, [selectedYear, groupOptions, selectedGroup]);

  const unknownGroupPct = manifestStats?.[selectedYear]?.unknown_group_pct ?? 0;

  const filteredData = useMemo(() => {
    return currentData.filter((dept) => {
      const schoolName = dept.school_name || '';
      const matchSearch =
        dept.dept_name.includes(searchTerm) ||
        dept.dept_id.includes(searchTerm) ||
        schoolName.includes(searchTerm);

      const group = dept.group || '未知學群';
      const matchGroup = selectedGroup === '全部學群' || group === selectedGroup;

      return matchSearch && matchGroup;
    });
  }, [currentData, searchTerm, selectedGroup]);

  const uniqueFilteredCount = useMemo(
    () => countUniqueDepartments(filteredData),
    [filteredData]
  );

  const historicalData = useMemo(
    () => getHistoricalData(yearCache, availableYears, selectedAnchor),
    [yearCache, availableYears, selectedAnchor]
  );

  const selectedDept = selectedAnchor
    ? findDeptInYear(currentData, selectedAnchor) ?? selectedAnchor
    : null;

  return (
    <div className="min-h-screen bg-gray-50 p-8 font-sans">
      <div className="max-w-6xl mx-auto">

        <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <h1 className="text-4xl font-bold text-blue-900 mb-2">StarTracker 🌟</h1>
            <p className="text-gray-600 font-medium">繁星推薦落點分析系統</p>
          </div>

          <div className="flex flex-wrap gap-2 max-w-xl justify-end">
            {availableYears.map((year) => (
              <button
                key={year}
                onClick={() => setSelectedYear(year)}
                className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all shadow-sm ${
                  selectedYear === year
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                {year}
              </button>
            ))}
          </div>
        </div>

        {loadError && !yearCache[selectedYear] && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
            載入失敗：{loadError}（請確認已執行 <code className="font-mono">python scripts/run_pipeline.py --from copy --all</code>）
          </div>
        )}

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 mb-6 flex flex-col md:flex-row gap-4">
          <input
            type="text"
            placeholder="🔍 搜尋學校、系名或代碼..."
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
            {groupOptions.map((group) => (
              <option key={group} value={group}>
                {getGroupLabel(group)}
              </option>
            ))}
          </select>
        </div>

        {unknownGroupPct > 0 && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-sm">
            {selectedYear} 學年度有 {unknownGroupPct}% 校系未能對照學群（顯示為「未知學群」），以全部學群瀏覽仍可搜尋。
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50 text-sm font-semibold text-gray-500 flex justify-between">
            <span>
              {isLoadingSelected
                ? `載入 ${selectedYear} 學年度資料中...`
                : `找到 ${uniqueFilteredCount} 筆校系資料`}
            </span>
            <span className="text-xs text-gray-400">{selectedYear} 學年度</span>
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
                {filteredData.map((dept) => (
                  <tr
                    key={deptRowKey(dept)}
                    onClick={() => setSelectedAnchor({
                      school_id: dept.school_id,
                      school_name: dept.school_name,
                      dept_id: dept.dept_id,
                      dept_name: dept.dept_name,
                      is_extra_quota: dept.is_extra_quota,
                    })}
                    className="border-b border-gray-50 hover:bg-blue-50 cursor-pointer transition-colors"
                  >
                    <td className="p-4 text-gray-500 font-mono text-sm">{dept.dept_id}</td>
                    <td className="p-4 text-gray-600">{dept.school_name || '未知學校'}</td>
                    <td className="p-4 font-bold text-gray-800">{dept.dept_name}</td>
                    <td className="p-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${groupBadgeClass(dept.group)}`}>
                        {dept.group || '未知學群'}
                      </span>
                    </td>
                    <td className="p-4 text-gray-700 font-medium text-center">{getQuota(dept)}</td>
                    <td className="p-4 text-gray-700 font-medium text-center">{dept.max_choices ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {selectedAnchor && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-y-auto overflow-hidden flex flex-col">

            <div className="p-6 border-b border-gray-100 flex justify-between items-start sticky top-0 bg-white z-10 shadow-sm">
              <div>
                <div className="text-sm text-blue-600 font-mono font-bold mb-1">
                  {selectedDept?.dept_id ?? selectedAnchor.dept_id}
                  {selectedDept?.dept_id !== selectedAnchor.dept_id && (
                    <span className="text-gray-400 font-normal ml-2">
                      （{selectedYear} 學年度代碼）
                    </span>
                  )}
                </div>
                <h2 className="text-2xl font-bold text-gray-800">
                  {selectedDept?.school_name || selectedAnchor.school_name || '未知學校'}{' '}
                  {selectedDept?.dept_name || selectedAnchor.dept_name}
                </h2>
              </div>
              <button
                onClick={() => setSelectedAnchor(null)}
                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors font-bold"
              >
                ✕ 關閉
              </button>
            </div>

            <div className="p-6 flex-1 bg-gray-50/50">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-800">📊 歷年錄取標準與比序</h3>
                {historyLoading && (
                  <span className="text-sm text-gray-500">載入歷年資料中...</span>
                )}
              </div>

              <div className="space-y-6">
                {historicalData.map((history) => (
                  <div key={history.year} className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">

                    <div className="bg-gradient-to-r from-blue-600 to-blue-800 px-5 py-3 flex justify-between items-center flex-wrap gap-2">
                      <div className="text-white">
                        <span className="font-black text-lg tracking-wider">
                          {history.year} 學年度
                        </span>
                        {history.data.dept_id !== selectedAnchor.dept_id && (
                          <span className="ml-3 text-blue-200 text-xs font-mono">
                            {history.data.dept_id}
                          </span>
                        )}
                      </div>
                      <div className="text-blue-100 text-sm font-medium flex gap-4 flex-wrap">
                        <span>招生名額：{getQuota(history.data)}</span>
                        <span>錄取人數：{getAdmittedTotal(history.data)}</span>
                        <span>第一輪：{history.data.admitted_round1 ?? history.data.round1_admitted ?? '-'}</span>
                        <span>第二輪：{history.data.admitted_round2 ?? history.data.round2_admitted ?? '-'}</span>
                      </div>
                    </div>

                    <div className="p-5">
                      <div className="mb-5">
                        <h4 className="text-sm font-bold text-gray-500 mb-2">📌 學測、英聽檢定標準</h4>
                        <div className="flex flex-wrap gap-2">
                          {history.data.requirements?.map((req, i) => {
                            const label = formatRequirement(req);
                            if (!label) return null;
                            return (
                              <div
                                key={i}
                                className="px-3 py-1.5 rounded-lg border text-sm flex items-center gap-2 bg-blue-50 border-blue-200 text-blue-700 font-medium"
                              >
                                <span className="font-bold">{req.subject}</span>
                                <span className="bg-white px-2 py-0.5 rounded text-xs border border-blue-100">
                                  {label}
                                </span>
                              </div>
                            );
                          })}
                          {!history.data.requirements?.some((req) => formatRequirement(req)) && (
                            <span className="text-sm text-gray-400">無學測檢定門檻（可能僅術科或特殊招生）</span>
                          )}
                        </div>
                      </div>

                      {history.data.practical_reqs?.length > 0 && (
                        <div className="mb-5">
                          <h4 className="text-sm font-bold text-gray-500 mb-2">🎨 術科檢定標準</h4>
                          <div className="flex flex-wrap gap-2">
                            {history.data.practical_reqs.map((req, i) => {
                              const label = formatPracticalReq(req);
                              if (!label) return null;
                              return (
                                <div
                                  key={i}
                                  className="px-3 py-1.5 rounded-lg border text-sm flex items-center gap-2 bg-purple-50 border-purple-200 text-purple-700 font-medium"
                                >
                                  <span className="font-bold">{req.item}</span>
                                  <span className="bg-white px-2 py-0.5 rounded text-xs border border-purple-100">
                                    {label}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

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
                                const r1 = formatCriteriaResult(crit.round1 ?? crit.round1_result);
                                const r2 = formatCriteriaResult(crit.round2 ?? crit.round2_result);
                                const hasR1 = r1 && r1 !== '--';

                                return (
                                  <tr key={i} className="hover:bg-blue-50/30 transition-colors border-b border-gray-100 last:border-0">
                                    <td className="p-3 text-center font-mono text-gray-400">{crit.order}</td>
                                    <td className="p-3 font-bold text-gray-700">{crit.item}</td>
                                    <td className="p-3 text-center">
                                      <span className={`font-bold ${hasR1 ? 'text-blue-600 text-base' : 'text-gray-300'}`}>
                                        {r1}
                                      </span>
                                    </td>
                                    <td className="p-3 text-center">
                                      <span className={`font-bold ${r2 && r2 !== '--' ? 'text-teal-600' : 'text-gray-300'}`}>
                                        {r2}
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

                {!historyLoading && historicalData.length === 0 && (
                  <p className="text-gray-500 text-center py-8">找不到此校系的歷年資料</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
