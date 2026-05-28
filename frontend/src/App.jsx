import { useState, useMemo, useEffect, useRef } from 'react';
import {
  buildDepartmentIndex,
  buildGroupOptions,
  buildSchoolNameRegistry,
  buildSchoolOptionsFromIndex,
  countUniqueDepartments,
  deptIndexKey,
  findDeptInYear,
  formatCriteriaResult,
  formatPracticalReq,
  formatRequirement,
  formatYearsCoverage,
  getAdmittedTotal,
  getDisplayDeptForYear,
  getGroupLabel,
  getHistoricalData,
  getQuota,
  groupBadgeClass,
  GROUP_ORDER,
} from './lib/deptUtils';

const DEFAULT_YEARS = Array.from({ length: 10 }, (_, i) => String(115 - i));
const DEFAULT_REFERENCE_YEAR = '115';
const PRESENCE_FILTER_ALL = '全部';

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

async function loadYearIntoCache(year, setYearCache, setLoadError, cancelledRef) {
  const res = await fetchYearData(year);
  if (cancelledRef?.current) return;
  setYearCache((prev) => ({ ...prev, [year]: res }));
  setLoadError(null);
}

const FILTER_CHIP = {
  year: 'bg-violet-100 text-violet-800 border-violet-200',
  group: 'bg-sky-100 text-sky-800 border-sky-200',
  school: 'bg-emerald-100 text-emerald-800 border-emerald-200',
};

function FilterChip({ label, chipClass, onRemove }) {
  return (
    <span
      className={`inline-flex items-center gap-0.5 pl-2.5 pr-1.5 py-1 rounded-full text-xs font-medium border shrink-0 ${chipClass}`}
    >
      <span className="truncate max-w-[12rem]">{label}</span>
      <button
        type="button"
        onClick={onRemove}
        className="w-3.5 h-3.5 flex items-center justify-center rounded-full hover:bg-black/10 text-[11px] leading-none shrink-0"
        aria-label={`移除 ${label}`}
      >
        ×
      </button>
    </span>
  );
}

function ActiveFilterBar({
  presenceYear,
  selectedGroupIds,
  selectedSchoolIds,
  schoolOptions,
  onClearYear,
  onRemoveGroup,
  onRemoveSchool,
  onClearAll,
}) {
  const schoolById = useMemo(
    () => new Map(schoolOptions.map((s) => [s.school_id, s])),
    [schoolOptions]
  );

  const groupChips = GROUP_ORDER.filter((g) => selectedGroupIds.has(g));
  const schoolChips = [...selectedSchoolIds].sort((a, b) =>
    String(a).localeCompare(String(b), undefined, { numeric: true })
  );

  const hasFilters =
    presenceYear !== PRESENCE_FILTER_ALL ||
    groupChips.length > 0 ||
    schoolChips.length > 0;

  if (!hasFilters) return null;

  return (
    <div className="flex items-center gap-2 min-w-0">
      <span className="text-xs text-gray-400 shrink-0">已篩選：</span>
      <div className="flex-1 min-w-0 overflow-x-auto">
        <div className="flex items-center gap-2 w-max pr-1">
          {presenceYear !== PRESENCE_FILTER_ALL && (
            <FilterChip
              label={presenceYear}
              chipClass={FILTER_CHIP.year}
              onRemove={onClearYear}
            />
          )}
          {groupChips.map((group) => (
            <FilterChip
              key={group}
              label={group}
              chipClass={FILTER_CHIP.group}
              onRemove={() => onRemoveGroup(group)}
            />
          ))}
          {schoolChips.map((schoolId) => (
            <FilterChip
              key={schoolId}
              label={schoolById.get(schoolId)?.school_name ?? schoolId}
              chipClass={FILTER_CHIP.school}
              onRemove={() => onRemoveSchool(schoolId)}
            />
          ))}
        </div>
      </div>
      <button
        type="button"
        onClick={onClearAll}
        className="text-xs text-gray-500 hover:text-red-600 underline shrink-0 pl-1"
      >
        清除
      </button>
    </div>
  );
}

function FilterModal({
  onClose,
  groupOptions,
  selectedGroupIds,
  onToggleGroup,
  onClearGroups,
  onSelectAllGroups,
  schoolOptions,
  selectedSchoolIds,
  onToggleSchool,
  onClearSchools,
  onSelectAllSchools,
  presenceYear,
  onPresenceYearChange,
  availableYears,
  onClearAll,
  selectedFilterItemCount,
}) {
  const [schoolSearch, setSchoolSearch] = useState('');
  const searchTerm = schoolSearch.trim();

  const schoolMatchesSearch = (school) =>
    !searchTerm ||
    school.school_name.includes(searchTerm) ||
    school.school_id.includes(searchTerm);

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[88vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b-2 border-gray-200 flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-800">篩選條件</h2>
            {selectedFilterItemCount > 0 && (
              <p className="text-xs text-blue-600 mt-0.5">
                已選 {selectedFilterItemCount} 項
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors font-bold"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-1 min-h-0">
          {/* Left sidebar: year + groups */}
          <aside className="w-72 shrink-0 border-r-2 border-gray-300 flex flex-col bg-gray-50/80">
            <div className="p-5 border-b-2 border-gray-300 shrink-0">
              <h3 className="text-base font-bold text-gray-800 mb-3">招生年份</h3>
              <select
                value={presenceYear}
                onChange={(e) => onPresenceYearChange(e.target.value)}
                className="w-full p-2.5 border border-gray-300 rounded-lg bg-white text-sm font-medium text-gray-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={PRESENCE_FILTER_ALL}>不限學年</option>
                {availableYears.map((year) => (
                  <option key={year} value={year}>
                    {year} 學年度
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                選特定學年可對照該年簡章；不限則顯示歷年曾出現的所有校系。
              </p>
            </div>

            <div className="flex flex-col flex-1 min-h-0 p-5">
              <div className="flex justify-between items-center mb-3 shrink-0">
                <h3 className="text-base font-bold text-gray-800">學群</h3>
                <div className="flex gap-1.5 text-xs">
                  <button
                    type="button"
                    onClick={onSelectAllGroups}
                    className="text-blue-600 hover:underline"
                  >
                    全選
                  </button>
                  <span className="text-gray-300">|</span>
                  <button
                    type="button"
                    onClick={onClearGroups}
                    className="text-gray-500 hover:underline"
                  >
                    清除
                  </button>
                </div>
              </div>
              <div className="overflow-y-auto flex-1 -mx-1 px-1 space-y-0.5">
                {groupOptions.map((group) => (
                  <label
                    key={group}
                    className="flex items-start gap-2.5 px-2 py-2 rounded-lg hover:bg-white cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedGroupIds.has(group)}
                      onChange={() => onToggleGroup(group)}
                      className="text-blue-600 rounded mt-0.5 shrink-0"
                    />
                    <span className="text-sm text-gray-700 leading-snug">
                      {getGroupLabel(group)}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </aside>

          {/* Right: schools grid */}
          <div className="flex-1 flex flex-col min-w-0 bg-white">
            <div className="px-5 py-4 border-b-2 border-gray-300 flex flex-wrap items-center gap-3 shrink-0">
              <h3 className="text-base font-bold text-gray-800">學校</h3>
              <div className="flex gap-2 text-xs ml-auto">
                <button
                  type="button"
                  onClick={onSelectAllSchools}
                  className="text-blue-600 hover:underline"
                >
                  全選
                </button>
                <span className="text-gray-300">|</span>
                <button
                  type="button"
                  onClick={onClearSchools}
                  className="text-gray-500 hover:underline"
                >
                  清除
                </button>
              </div>
              <input
                type="text"
                placeholder="搜尋學校名稱或代碼..."
                value={schoolSearch}
                onChange={(e) => setSchoolSearch(e.target.value)}
                className="w-full sm:w-72 p-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex-1 overflow-y-auto p-4 min-h-0">
              {schoolOptions.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">尚無學校資料</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5 h-full content-start">
                  {schoolOptions.map((school) => {
                    const matched = schoolMatchesSearch(school);
                    const selected = selectedSchoolIds.has(school.school_id);
                    return (
                      <label
                        key={school.school_id}
                        className={`flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer transition-all border ${
                          searchTerm && matched
                            ? 'bg-amber-50 border-amber-300 ring-1 ring-amber-200'
                            : searchTerm && !matched
                              ? 'opacity-35 border-transparent hover:opacity-60'
                              : selected
                                ? 'bg-blue-50 border-blue-200'
                                : 'border-transparent hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => onToggleSchool(school.school_id)}
                          className="text-blue-600 rounded shrink-0"
                        />
                        <span className="text-[10px] font-mono text-gray-400 shrink-0">
                          {school.school_id}
                        </span>
                        <span className="text-sm text-gray-700 truncate" title={school.school_name}>
                          {school.school_name}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t-2 border-gray-200 flex justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClearAll}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
          >
            清除全部
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors"
          >
            完成
          </button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [availableYears, setAvailableYears] = useState(DEFAULT_YEARS);
  const [referenceYear, setReferenceYear] = useState(DEFAULT_REFERENCE_YEAR);
  const [presenceYear, setPresenceYear] = useState(PRESENCE_FILTER_ALL);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroupIds, setSelectedGroupIds] = useState(() => new Set());
  const [selectedSchoolIds, setSelectedSchoolIds] = useState(() => new Set());
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedAnchor, setSelectedAnchor] = useState(null);

  const [yearCache, setYearCache] = useState({});
  const [loadError, setLoadError] = useState(null);
  const [manifestStats, setManifestStats] = useState(null);
  const [manifestSchoolNames, setManifestSchoolNames] = useState({});
  const inflightRef = useRef(new Set());
  const yearCacheRef = useRef({});
  const cancelledRef = useRef(false);

  useEffect(() => {
    yearCacheRef.current = yearCache;
  }, [yearCache]);

  useEffect(() => {
    fetchManifest().then((manifest) => {
      if (manifest?.years?.length) {
        const years = manifest.years.map(String);
        setAvailableYears(years);
        if (!years.includes(referenceYear)) {
          setReferenceYear(years[0]);
        }
      }
      if (manifest?.stats) {
        setManifestStats(manifest.stats);
      }
      if (manifest?.school_names) {
        setManifestSchoolNames(manifest.school_names);
      }
    });
  }, []);

  // Priority: load reference year first.
  useEffect(() => {
    cancelledRef.current = false;
    const year = referenceYear;

    if (yearCache[year] || inflightRef.current.has(year)) {
      return () => { cancelledRef.current = true; };
    }

    inflightRef.current.add(year);

    loadYearIntoCache(year, setYearCache, setLoadError, cancelledRef)
      .catch((err) => {
        if (!cancelledRef.current) setLoadError(err.message);
      })
      .finally(() => {
        inflightRef.current.delete(year);
      });

    return () => { cancelledRef.current = true; };
  }, [referenceYear, yearCache]);

  // Background: load remaining years once reference year is ready.
  useEffect(() => {
    if (!yearCache[referenceYear]) return undefined;

    let cancelled = false;

    (async () => {
      for (const year of availableYears) {
        if (cancelled) return;
        if (yearCacheRef.current[year] || inflightRef.current.has(year)) continue;

        inflightRef.current.add(year);
        try {
          const data = await fetchYearData(year);
          if (cancelled) return;
          setYearCache((prev) => ({ ...prev, [year]: data }));
        } catch {
          // ignore background load errors
        } finally {
          inflightRef.current.delete(year);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [yearCache[referenceYear], availableYears, referenceYear]);

  // Modal: ensure all years loaded when viewing history.
  useEffect(() => {
    if (!selectedAnchor) return undefined;

    const ordered = [...availableYears].sort((a, b) => {
      if (a === referenceYear) return -1;
      if (b === referenceYear) return 1;
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
  }, [selectedAnchor, availableYears, referenceYear]);

  const schoolNameRegistry = useMemo(
    () =>
      buildSchoolNameRegistry(
        yearCache,
        availableYears,
        referenceYear,
        manifestSchoolNames
      ),
    [yearCache, availableYears, referenceYear, manifestSchoolNames]
  );

  const departmentIndex = useMemo(
    () =>
      buildDepartmentIndex(
        yearCache,
        availableYears,
        referenceYear,
        schoolNameRegistry
      ),
    [yearCache, availableYears, referenceYear, schoolNameRegistry]
  );

  const isLoadingInitial = !yearCache[referenceYear] && !loadError;
  const loadedYearCount = availableYears.filter((y) => yearCache[y]).length;
  const isBackgroundLoading = loadedYearCount < availableYears.length;

  const groupOptions = useMemo(
    () => buildGroupOptions(departmentIndex.map((e) => e.displayDept)),
    [departmentIndex]
  );

  const schoolOptions = useMemo(
    () => buildSchoolOptionsFromIndex(departmentIndex, schoolNameRegistry),
    [departmentIndex, schoolNameRegistry]
  );

  useEffect(() => {
    setSelectedGroupIds((prev) => {
      const valid = new Set(groupOptions);
      const next = new Set([...prev].filter((g) => valid.has(g)));
      return next.size === prev.size ? prev : next;
    });
  }, [groupOptions]);

  useEffect(() => {
    setSelectedSchoolIds((prev) => {
      const valid = new Set(schoolOptions.map((s) => s.school_id));
      const next = new Set([...prev].filter((id) => valid.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [schoolOptions]);

  useEffect(() => {
    if (
      presenceYear !== PRESENCE_FILTER_ALL &&
      !availableYears.includes(presenceYear)
    ) {
      setPresenceYear(PRESENCE_FILTER_ALL);
    }
  }, [availableYears, presenceYear]);

  const unknownGroupPct = manifestStats?.[referenceYear]?.unknown_group_pct ?? 0;

  const selectedFilterItemCount =
    selectedGroupIds.size +
    selectedSchoolIds.size +
    (presenceYear !== PRESENCE_FILTER_ALL ? 1 : 0);

  const filteredIndex = useMemo(() => {
    const term = searchTerm.trim();
    return departmentIndex.filter((entry) => {
      if (presenceYear !== PRESENCE_FILTER_ALL && !entry.byYear[presenceYear]) {
        return false;
      }

      if (selectedSchoolIds.size > 0 && !selectedSchoolIds.has(entry.school_id)) {
        return false;
      }

      const dept = entry.displayDept;
      const schoolName = dept.school_name || '';
      const matchSearch =
        !term ||
        dept.dept_name.includes(term) ||
        dept.dept_id.includes(term) ||
        schoolName.includes(term) ||
        entry.years.some((year) => entry.byYear[year].dept_id.includes(term));

      const group = dept.group || '未知學群';
      const matchGroup =
        selectedGroupIds.size === 0 || selectedGroupIds.has(group);

      return matchSearch && matchGroup;
    });
  }, [departmentIndex, searchTerm, selectedGroupIds, presenceYear, selectedSchoolIds]);

  const uniqueFilteredCount = useMemo(
    () => countUniqueDepartments(filteredIndex.map((entry) => entry.displayDept)),
    [filteredIndex]
  );

  function toggleGroup(group) {
    setSelectedGroupIds((prev) => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  }

  function toggleSchool(schoolId) {
    setSelectedSchoolIds((prev) => {
      const next = new Set(prev);
      if (next.has(schoolId)) next.delete(schoolId);
      else next.add(schoolId);
      return next;
    });
  }

  function removeGroup(group) {
    setSelectedGroupIds((prev) => {
      const next = new Set(prev);
      next.delete(group);
      return next;
    });
  }

  function removeSchool(schoolId) {
    setSelectedSchoolIds((prev) => {
      const next = new Set(prev);
      next.delete(schoolId);
      return next;
    });
  }

  function clearYearFilter() {
    setPresenceYear(PRESENCE_FILTER_ALL);
  }

  function clearAllFilters() {
    setSelectedGroupIds(new Set());
    setSelectedSchoolIds(new Set());
    setPresenceYear(PRESENCE_FILTER_ALL);
  }

  function selectAllGroups() {
    setSelectedGroupIds(new Set(groupOptions));
  }

  function selectAllSchools() {
    setSelectedSchoolIds(new Set(schoolOptions.map((s) => s.school_id)));
  }

  const historicalData = useMemo(
    () => getHistoricalData(yearCache, availableYears, selectedAnchor),
    [yearCache, availableYears, selectedAnchor]
  );

  const selectedIndexEntry = useMemo(() => {
    if (!selectedAnchor) return null;
    return departmentIndex.find((entry) =>
      entry.key === deptIndexKey(selectedAnchor)
    );
  }, [departmentIndex, selectedAnchor]);

  const selectedDept = selectedAnchor
    ? findDeptInYear(yearCache[referenceYear], selectedAnchor) ??
      getDisplayDeptForYear(selectedIndexEntry, referenceYear) ??
      selectedAnchor
    : null;

  const yearRangeLabel =
    availableYears.length > 1
      ? `${availableYears[availableYears.length - 1]}–${availableYears[0]}`
      : availableYears[0] ?? '';

  return (
    <div className="min-h-screen bg-gray-50 p-8 font-sans">
      <div className="max-w-6xl mx-auto">

        <div className="mb-8">
          <div className="mb-4">
            <h1 className="text-4xl font-bold text-blue-900 mb-2">StarTracker 🌟</h1>
            <p className="text-gray-600 font-medium">繁星校系資料庫 · 歷年比序查詢</p>
            {yearRangeLabel && (
              <p className="text-sm text-gray-400 mt-1">資料涵蓋 {yearRangeLabel} 學年度</p>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
            <label className="flex items-center gap-2 text-sm text-gray-600 shrink-0">
              <span className="font-medium whitespace-nowrap">簡章對照學年</span>
              <select
                value={referenceYear}
                onChange={(e) => setReferenceYear(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-xl bg-white text-sm font-bold text-gray-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {availableYears.map((year) => (
                  <option key={year} value={year}>
                    {year} 學年度
                  </option>
                ))}
              </select>
            </label>
            <p className="text-xs text-gray-400">
              主表顯示的代碼、學群、名額以此學年簡章為準；若該系該年沒有招生，則改用最近有資料的學年。
            </p>
          </div>
        </div>

        {loadError && !yearCache[referenceYear] && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
            載入失敗：{loadError}（請確認已執行 <code className="font-mono">python scripts/run_pipeline.py --from copy --all</code>）
          </div>
        )}

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 mb-6 flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="🔍 搜尋學校、系名或代碼..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
            />

            <button
              type="button"
              onClick={() => setShowFilterModal(true)}
              className="px-5 py-3 border border-gray-200 rounded-xl bg-white font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors flex items-center justify-center gap-2 shrink-0"
            >
              ⚙️ 篩選條件
              {selectedFilterItemCount > 0 && (
                <span className="px-2 py-0.5 text-xs font-bold text-white bg-blue-600 rounded-full">
                  {selectedFilterItemCount}
                </span>
              )}
            </button>
          </div>

          <ActiveFilterBar
            presenceYear={presenceYear}
            selectedGroupIds={selectedGroupIds}
            selectedSchoolIds={selectedSchoolIds}
            schoolOptions={schoolOptions}
            onClearYear={clearYearFilter}
            onRemoveGroup={removeGroup}
            onRemoveSchool={removeSchool}
            onClearAll={clearAllFilters}
          />
        </div>

        {unknownGroupPct > 0 && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-sm">
            {referenceYear} 學年度有 {unknownGroupPct}% 校系未能對照學群（顯示為「未知學群」），以全部學群瀏覽仍可搜尋。
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="py-2.5 px-4 border-b border-gray-100 bg-gray-50 text-sm font-semibold text-gray-500 flex justify-between items-center gap-2 flex-wrap">
            <span>
              {isLoadingInitial
                ? `載入 ${referenceYear} 學年度資料中...`
                : `找到 ${uniqueFilteredCount} 筆校系`}
            </span>
            <span className="text-xs text-gray-400 font-normal">
              {isBackgroundLoading
                ? `歷年資料載入中（${loadedYearCount}/${availableYears.length}）…`
                : `已整合 ${loadedYearCount} 個學年度 · 對照 ${referenceYear}`}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="py-3 px-4 text-sm font-semibold text-gray-500 whitespace-nowrap">代碼</th>
                  <th className="py-3 px-4 text-sm font-semibold text-gray-500 whitespace-nowrap">學校名稱</th>
                  <th className="py-3 px-4 text-sm font-semibold text-gray-500 whitespace-nowrap">系所名稱</th>
                  <th className="py-3 px-4 text-sm font-semibold text-gray-500 whitespace-nowrap">學群</th>
                  <th className="py-3 px-4 text-sm font-semibold text-gray-500 whitespace-nowrap text-center">招生名額</th>
                  <th className="py-3 px-4 text-sm font-semibold text-gray-500 whitespace-nowrap text-center">可填志願數</th>
                  <th className="py-3 px-4 text-sm font-semibold text-gray-500 whitespace-nowrap text-center">歷年資料</th>
                </tr>
              </thead>
              <tbody>
                {filteredIndex.map((entry) => {
                  const dept = entry.displayDept;
                  return (
                    <tr
                      key={entry.key}
                      onClick={() => setSelectedAnchor(entry.anchor)}
                      className="border-b border-gray-50 hover:bg-blue-50 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4 text-gray-500 font-mono text-sm">{dept.dept_id}</td>
                      <td className="py-3 px-4 text-gray-600 text-sm">{dept.school_name || '未知學校'}</td>
                      <td className="py-3 px-4 font-bold text-gray-800 text-sm">{dept.dept_name}</td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold whitespace-nowrap ${groupBadgeClass(dept.group)}`}>
                          {dept.group || '未知學群'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-700 font-medium text-center text-sm">{getQuota(dept)}</td>
                      <td className="py-3 px-4 text-gray-700 font-medium text-center text-sm">{dept.max_choices ?? '-'}</td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
                          {formatYearsCoverage(entry.years, availableYears)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {!isLoadingInitial && filteredIndex.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-gray-400">
                      找不到符合條件的校系
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showFilterModal && (
        <FilterModal
          onClose={() => setShowFilterModal(false)}
          groupOptions={groupOptions}
          selectedGroupIds={selectedGroupIds}
          onToggleGroup={toggleGroup}
          onClearGroups={() => setSelectedGroupIds(new Set())}
          onSelectAllGroups={selectAllGroups}
          schoolOptions={schoolOptions}
          selectedSchoolIds={selectedSchoolIds}
          onToggleSchool={toggleSchool}
          onClearSchools={() => setSelectedSchoolIds(new Set())}
          onSelectAllSchools={selectAllSchools}
          presenceYear={presenceYear}
          onPresenceYearChange={setPresenceYear}
          availableYears={availableYears}
          onClearAll={clearAllFilters}
          selectedFilterItemCount={selectedFilterItemCount}
        />
      )}

      {selectedAnchor && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-y-auto overflow-hidden flex flex-col">

            <div className="p-6 border-b border-gray-100 flex justify-between items-start sticky top-0 bg-white z-10 shadow-sm">
              <div>
                <div className="text-sm text-blue-600 font-mono font-bold mb-1">
                  {selectedDept?.dept_id ?? selectedAnchor.dept_id}
                  {selectedDept?.dept_id && selectedDept.dept_id !== selectedAnchor.dept_id && (
                    <span className="text-gray-400 font-normal ml-2">
                      （{referenceYear} 學年度代碼）
                    </span>
                  )}
                </div>
                <h2 className="text-2xl font-bold text-gray-800">
                  {selectedDept?.school_name || selectedAnchor.school_name || '未知學校'}{' '}
                  {selectedDept?.dept_name || selectedAnchor.dept_name}
                </h2>
                <p className="text-sm text-gray-500 mt-2">
                  歷年資料：
                  {historicalData.length > 0 ? (
                    <>
                      {' '}
                      {historicalData.map((h) => h.year).join('、')}
                      <span className="text-gray-400 ml-1">
                        （{historicalData.length}/{availableYears.length} 學年度）
                      </span>
                    </>
                  ) : (
                    ' 載入中…'
                  )}
                </p>
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
                {availableYears.some((year) => !yearCache[year]) && selectedAnchor && (
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

                {!availableYears.some((year) => !yearCache[year]) &&
                  selectedAnchor &&
                  historicalData.length === 0 && (
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
