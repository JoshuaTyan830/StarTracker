import { useEffect, useMemo, useState } from 'react';
import HistoryModal from '../components/HistoryModal';
import {
  buildDepartmentIndex,
  buildSchoolNameRegistry,
  deptIndexKey,
  findDeptInYear,
  getDisplayDeptForYear,
  getHistoricalData,
} from '../lib/deptUtils';
import { buildRankSeriesForRound } from '../lib/historyUtils';
import { compareColor } from '../lib/compareColors';
import { fetchYearData } from '../lib/starDataApi';
import CompareSidebar from '../components/compare/CompareSidebar';
import CompareChartPanel from '../components/compare/CompareChartPanel';
import ComparePickerModal from '../components/compare/ComparePickerModal';
import CompareHistoricalPanel from '../components/compare/CompareHistoricalPanel';
import { PAGE_SHELL_COMPARE } from '../lib/constants';
import { clearCompareStorage } from '../lib/compareStore';

export default function ComparePage({ starData, compare }) {
  const [showPicker, setShowPicker] = useState(false);
  const [round, setRound] = useState(1);
  const [hoveredKey, setHoveredKey] = useState(null);
  const [detailAnchor, setDetailAnchor] = useState(null);

  const {
    availableYears,
    referenceYear,
    yearCache,
    setYearCache,
    manifestSchoolNames,
    ensureYearsForAnchors,
    yearCacheRef,
    inflightRef,
  } = starData;

  const { items, remove, add, canAdd } = compare;

  useEffect(() => {
    const anchors = items.map((i) => i.anchor);
    return ensureYearsForAnchors(anchors);
  }, [items, ensureYearsForAnchors]);

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

  const departmentIndex = useMemo(() => {
    try {
      return buildDepartmentIndex(
        yearCache,
        availableYears,
        referenceYear,
        schoolNameRegistry
      );
    } catch {
      return [];
    }
  }, [yearCache, availableYears, referenceYear, schoolNameRegistry]);

  const compareKeys = useMemo(
    () => new Set(items.map((i) => i.key)),
    [items]
  );

  const chartSeries = useMemo(() => {
    return items
      .map((item, index) => ({ item, colorIndex: index }))
      .filter(({ item }) => item?.anchor?.dept_id)
      .map(({ item, colorIndex }) => {
        const historical = getHistoricalData(
          yearCache,
          availableYears,
          item.anchor
        );
        const points = buildRankSeriesForRound(historical, round);
        return {
          key: item.key,
          label: item.label,
          anchor: item.anchor,
          color: compareColor(colorIndex),
          points,
        };
      });
  }, [items, yearCache, availableYears, round]);

  const chartTitle =
    round === 2
      ? '在校學業 · 第二輪比序 (%)'
      : '在校學業 · 第一輪比序 (%)';

  useEffect(() => {
    if (!detailAnchor) return undefined;

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
  }, [
    detailAnchor,
    availableYears,
    referenceYear,
    setYearCache,
    yearCacheRef,
    inflightRef,
  ]);

  const detailIndexEntry = useMemo(() => {
    if (!detailAnchor) return null;
    return departmentIndex.find(
      (entry) => entry.key === deptIndexKey(detailAnchor)
    );
  }, [departmentIndex, detailAnchor]);

  const detailDept = detailAnchor
    ? (findDeptInYear(yearCache[referenceYear], detailAnchor) ??
      getDisplayDeptForYear(detailIndexEntry, referenceYear) ??
      detailAnchor)
    : null;

  const detailHistoricalData = useMemo(
    () => getHistoricalData(yearCache, availableYears, detailAnchor),
    [yearCache, availableYears, detailAnchor]
  );

  const detailCompareAnchor = detailDept
    ? {
        ...detailAnchor,
        school_name: detailDept.school_name ?? detailAnchor.school_name,
        dept_name: detailDept.dept_name ?? detailAnchor.dept_name,
        dept_id: detailDept.dept_id ?? detailAnchor.dept_id,
      }
    : detailAnchor;

  return (
    <div className={`${PAGE_SHELL_COMPARE} py-4`}>
      <header className="mb-4">
        <h1 className="text-2xl font-bold text-blue-900">校系比對</h1>
        <p className="text-gray-600 text-sm mt-0.5">
          並列比較多個校系歷年在校學業門檻與分發比序結果
        </p>
        <button
          type="button"
          onClick={() => {
            clearCompareStorage();
            window.location.reload();
          }}
          className="mt-2 text-xs text-gray-400 hover:text-violet-600 underline"
        >
          頁面異常？清除比對快取並重整
        </button>
      </header>

      <div className="flex gap-3 sm:gap-4 items-stretch min-h-[28rem] h-[32rem] max-h-[56vh]">
        <CompareSidebar
          items={items}
          onAddClick={() => setShowPicker(true)}
          onRemove={remove}
          canAdd={canAdd}
          hoveredKey={hoveredKey}
          onHoverKey={setHoveredKey}
          onOpenDept={({ anchor }) => setDetailAnchor(anchor)}
        />

        {items.length > 0 ? (
          <CompareChartPanel
            title={chartTitle}
            series={chartSeries}
            round={round}
            onRoundChange={setRound}
            highlightKey={hoveredKey}
          />
        ) : (
          <div className="flex-1 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50/50 flex items-center justify-center min-h-[22rem]">
            <p className="text-sm text-gray-400 text-center px-6">
              從左側加入校系開始比對
            </p>
          </div>
        )}
      </div>

      {items.length > 0 && (
        <div className="mt-4">
          <CompareHistoricalPanel
            items={items}
            yearCache={yearCache}
            availableYears={availableYears}
            onOpenDept={({ anchor }) => setDetailAnchor(anchor)}
          />
        </div>
      )}

      {detailAnchor && (
        <HistoryModal
          selectedAnchor={detailAnchor}
          selectedDept={detailDept}
          compareAnchor={detailCompareAnchor}
          referenceYear={referenceYear}
          historicalData={detailHistoricalData}
          availableYears={availableYears}
          yearCache={yearCache}
          compare={compare}
          onClose={() => setDetailAnchor(null)}
        />
      )}

      {showPicker && (
        <ComparePickerModal
          onClose={() => setShowPicker(false)}
          departmentIndex={departmentIndex}
          compareKeys={compareKeys}
          canAdd={canAdd}
          onSelect={(anchor) => add(anchor)}
        />
      )}
    </div>
  );
}
