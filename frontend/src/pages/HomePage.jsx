import { useState, useMemo, useEffect, useCallback } from 'react';
import ActiveFilterBar from '../components/ActiveFilterBar';
import DeptTable from '../components/DeptTable';
import FilterModal from '../components/FilterModal';
import HistoryModal from '../components/HistoryModal';
import ScoreInputPanel from '../components/ScoreInputPanel';
import {
  PAGE_SHELL_HOME,
  PRESENCE_FILTER_ALL,
  QUOTA_FILTER_ALL,
  QUOTA_FILTER_EXTRA,
  QUOTA_FILTER_REGULAR,
} from '../lib/constants';
import {
  buildDepartmentIndex,
  buildGroupOptions,
  buildSchoolNameRegistry,
  buildSchoolOptionsFromIndex,
  deptIndexKey,
  findDeptInYear,
  getDisplayDeptForYear,
  getHistoricalData,
} from '../lib/deptUtils';
import { fetchYearData } from '../lib/starDataApi';
import { matchesDepartmentSearch } from '../lib/deptSearchUtils';
import { passesStage1Requirements } from '../lib/requirementCheck';
import { hasAnyUserScore, loadUserScores, saveUserScores } from '../lib/userScoresStore';
import { useGsatStats } from '../hooks/useGsatStats';
import {
  loadHomeBrowseState,
  saveHomeBrowseState,
} from '../lib/homeBrowseStore';

export default function HomePage({ starData, compare }) {
  const {
    availableYears,
    referenceYear,
    setReferenceYear,
    yearCache,
    setYearCache,
    loadError,
    manifestStats,
    manifestSchoolNames,
    yearCacheRef,
    inflightRef,
  } = starData;

  const [presenceYear, setPresenceYear] = useState(() => {
    const saved = loadHomeBrowseState();
    return saved?.presenceYear ?? PRESENCE_FILTER_ALL;
  });
  const [searchTerm, setSearchTerm] = useState(
    () => loadHomeBrowseState()?.searchTerm ?? ''
  );
  const [selectedGroupIds, setSelectedGroupIds] = useState(
    () => new Set(loadHomeBrowseState()?.selectedGroupIds ?? [])
  );
  const [selectedSchoolIds, setSelectedSchoolIds] = useState(
    () => new Set(loadHomeBrowseState()?.selectedSchoolIds ?? [])
  );
  const [quotaFilter, setQuotaFilter] = useState(() => {
    const saved = loadHomeBrowseState()?.quotaFilter;
    return saved === QUOTA_FILTER_REGULAR ||
      saved === QUOTA_FILTER_EXTRA
      ? saved
      : QUOTA_FILTER_ALL;
  });
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedAnchor, setSelectedAnchor] = useState(null);
  const [userScores, setUserScores] = useState(() => loadUserScores());
  const [qualFilterEnabled, setQualFilterEnabled] = useState(
    () => loadUserScores().qualFilterEnabled
  );

  const { stats: gsatStats } = useGsatStats();

  useEffect(() => {
    saveUserScores({ ...userScores, qualFilterEnabled });
  }, [userScores, qualFilterEnabled]);

  useEffect(() => {
    saveHomeBrowseState({
      searchTerm,
      presenceYear,
      selectedGroupIds,
      selectedSchoolIds,
      quotaFilter,
    });
  }, [searchTerm, presenceYear, selectedGroupIds, selectedSchoolIds, quotaFilter]);

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
          // ignore
        } finally {
          inflightRef.current.delete(year);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedAnchor, availableYears, referenceYear, setYearCache, yearCacheRef, inflightRef]);

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

  const qualFilterActive =
    qualFilterEnabled && hasAnyUserScore(userScores);

  const selectedFilterItemCount =
    selectedGroupIds.size +
    selectedSchoolIds.size +
    (presenceYear !== PRESENCE_FILTER_ALL ? 1 : 0) +
    (qualFilterActive ? 1 : 0) +
    (quotaFilter !== QUOTA_FILTER_ALL ? 1 : 0);

  const getDeptForReferenceYear = useCallback(
    (entry) =>
      findDeptInYear(yearCache[referenceYear], entry.displayDept) ??
      getDisplayDeptForYear(entry, referenceYear),
    [yearCache, referenceYear]
  );

  const browseFilteredIndex = useMemo(() => {
    const term = searchTerm.trim();
    return departmentIndex.filter((entry) => {
      if (presenceYear !== PRESENCE_FILTER_ALL && !entry.byYear[presenceYear]) {
        return false;
      }
      if (selectedSchoolIds.size > 0 && !selectedSchoolIds.has(entry.school_id)) {
        return false;
      }
      if (quotaFilter === QUOTA_FILTER_REGULAR && entry.is_extra_quota) {
        return false;
      }
      if (quotaFilter === QUOTA_FILTER_EXTRA && !entry.is_extra_quota) {
        return false;
      }
      const dept = entry.displayDept;
      const schoolName = dept.school_name || '';
      const matchSearch = matchesDepartmentSearch(
        {
          schoolName,
          deptName: dept.dept_name,
          deptId: dept.dept_id,
          extra: entry.years.map((year) => entry.byYear[year]?.dept_id ?? ''),
        },
        term
      );
      const group = dept.group || '未知學群';
      const matchGroup =
        selectedGroupIds.size === 0 || selectedGroupIds.has(group);
      return matchSearch && matchGroup;
    });
  }, [
    departmentIndex,
    searchTerm,
    selectedGroupIds,
    presenceYear,
    selectedSchoolIds,
    quotaFilter,
  ]);

  const qualPassCount = useMemo(() => {
    if (!qualFilterActive) return 0;
    return browseFilteredIndex.filter((entry) => {
      const dept = getDeptForReferenceYear(entry);
      return dept && passesStage1Requirements(dept, userScores);
    }).length;
  }, [
    browseFilteredIndex,
    qualFilterActive,
    userScores,
    getDeptForReferenceYear,
  ]);

  const filteredIndex = useMemo(() => {
    if (!qualFilterActive) {
      return browseFilteredIndex;
    }
    return browseFilteredIndex.filter((entry) => {
      const dept = getDeptForReferenceYear(entry);
      return dept && passesStage1Requirements(dept, userScores);
    });
  }, [
    browseFilteredIndex,
    qualFilterActive,
    userScores,
    getDeptForReferenceYear,
  ]);

  const resultCount = filteredIndex.length;

  const historicalData = useMemo(
    () => getHistoricalData(yearCache, availableYears, selectedAnchor),
    [yearCache, availableYears, selectedAnchor]
  );

  const selectedIndexEntry = useMemo(() => {
    if (!selectedAnchor) return null;
    return departmentIndex.find(
      (entry) => entry.key === deptIndexKey(selectedAnchor)
    );
  }, [departmentIndex, selectedAnchor]);

  const selectedDept = selectedAnchor
    ? (findDeptInYear(yearCache[referenceYear], selectedAnchor) ??
      getDisplayDeptForYear(selectedIndexEntry, referenceYear) ??
      selectedAnchor)
    : null;

  const yearRangeLabel =
    availableYears.length > 1
      ? `${availableYears[availableYears.length - 1]}–${availableYears[0]}`
      : (availableYears[0] ?? '');

  const compareKeys = useMemo(
    () => new Set(compare.items.map((i) => i.key)),
    [compare.items]
  );

  const compareAnchor = selectedDept
    ? {
        ...selectedAnchor,
        school_name: selectedDept.school_name ?? selectedAnchor.school_name,
        dept_name: selectedDept.dept_name ?? selectedAnchor.dept_name,
        dept_id: selectedDept.dept_id ?? selectedAnchor.dept_id,
      }
    : selectedAnchor;

  return (
    <div className={`${PAGE_SHELL_HOME} py-8`}>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 leading-tight">
          繁星校系資料庫
          <span className="font-normal text-gray-400"> · </span>
          <span className="font-semibold text-gray-600">歷年比序查詢</span>
        </h1>
        {yearRangeLabel && (
          <p className="text-sm text-gray-400 mt-1">資料涵蓋 {yearRangeLabel} 學年度</p>
        )}

        <div className="flex flex-col sm:flex-row gap-4 sm:items-center mt-4">
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
          載入失敗：{loadError}（請確認已執行{' '}
          <code className="font-mono">
            python scripts/run_pipeline.py --from copy --all
          </code>
          ）
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
          qualFilterActive={qualFilterActive}
          referenceYear={referenceYear}
          onClearQualFilter={() => setQualFilterEnabled(false)}
          quotaFilter={quotaFilter}
          onClearQuotaFilter={() => setQuotaFilter(QUOTA_FILTER_ALL)}
          onClearYear={() => setPresenceYear(PRESENCE_FILTER_ALL)}
          onRemoveGroup={(group) =>
            setSelectedGroupIds((prev) => {
              const next = new Set(prev);
              next.delete(group);
              return next;
            })
          }
          onRemoveSchool={(schoolId) =>
            setSelectedSchoolIds((prev) => {
              const next = new Set(prev);
              next.delete(schoolId);
              return next;
            })
          }
          onClearAll={() => {
            setSelectedGroupIds(new Set());
            setSelectedSchoolIds(new Set());
            setPresenceYear(PRESENCE_FILTER_ALL);
            setQualFilterEnabled(false);
            setQuotaFilter(QUOTA_FILTER_ALL);
          }}
          quotaFilter={quotaFilter}
          onClearQuotaFilter={() => setQuotaFilter(QUOTA_FILTER_ALL)}
        />
      </div>

      <div className="mb-6">
        <ScoreInputPanel
          userScores={userScores}
          onChange={setUserScores}
          qualFilterEnabled={qualFilterEnabled}
          onQualFilterChange={setQualFilterEnabled}
          referenceYear={referenceYear}
          passCount={qualPassCount}
          totalCount={browseFilteredIndex.length}
          qualFilterActive={qualFilterActive}
        />
      </div>

      {unknownGroupPct > 0 && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-sm">
          {referenceYear} 學年度有 {unknownGroupPct}% 校系未能對照學群（顯示為「未知學群」），以全部學群瀏覽仍可搜尋。
        </div>
      )}

      <DeptTable
        filteredIndex={filteredIndex}
        availableYears={availableYears}
        referenceYear={referenceYear}
        isLoadingInitial={isLoadingInitial}
        resultCount={resultCount}
        loadedYearCount={loadedYearCount}
        isBackgroundLoading={isBackgroundLoading}
        qualFilterActive={qualFilterActive}
        onSelectEntry={setSelectedAnchor}
        onToggleCompare={(anchor) => compare.toggle(anchor)}
        compareKeys={compareKeys}
      />

      {showFilterModal && (
        <FilterModal
          onClose={() => setShowFilterModal(false)}
          groupOptions={groupOptions}
          selectedGroupIds={selectedGroupIds}
          onToggleGroup={(group) =>
            setSelectedGroupIds((prev) => {
              const next = new Set(prev);
              if (next.has(group)) next.delete(group);
              else next.add(group);
              return next;
            })
          }
          onClearGroups={() => setSelectedGroupIds(new Set())}
          onSelectAllGroups={() => setSelectedGroupIds(new Set(groupOptions))}
          schoolOptions={schoolOptions}
          selectedSchoolIds={selectedSchoolIds}
          onToggleSchool={(schoolId) =>
            setSelectedSchoolIds((prev) => {
              const next = new Set(prev);
              if (next.has(schoolId)) next.delete(schoolId);
              else next.add(schoolId);
              return next;
            })
          }
          onClearSchools={() => setSelectedSchoolIds(new Set())}
          onSelectAllSchools={() =>
            setSelectedSchoolIds(new Set(schoolOptions.map((s) => s.school_id)))
          }
          presenceYear={presenceYear}
          onPresenceYearChange={setPresenceYear}
          availableYears={availableYears}
          onClearAll={() => {
            setSelectedGroupIds(new Set());
            setSelectedSchoolIds(new Set());
            setPresenceYear(PRESENCE_FILTER_ALL);
            setQualFilterEnabled(false);
            setQuotaFilter(QUOTA_FILTER_ALL);
          }}
          quotaFilter={quotaFilter}
          onQuotaFilterChange={setQuotaFilter}
          selectedFilterItemCount={selectedFilterItemCount}
        />
      )}

      {selectedAnchor && (
        <HistoryModal
          selectedAnchor={selectedAnchor}
          selectedDept={selectedDept}
          compareAnchor={compareAnchor}
          referenceYear={referenceYear}
          historicalData={historicalData}
          availableYears={availableYears}
          yearCache={yearCache}
          compare={compare}
          onClose={() => setSelectedAnchor(null)}
          gsatStats={gsatStats}
          userScores={userScores}
        />
      )}
    </div>
  );
}
