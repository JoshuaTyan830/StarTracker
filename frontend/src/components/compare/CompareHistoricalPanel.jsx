import { useMemo, useState } from 'react';
import { getHistoricalData } from '../../lib/deptUtils';
import { compareColor } from '../../lib/compareColors';
import { QUOTA_ROW_CELL_CLASS } from '../../lib/compareRequirementsUtils';
import CompareDeptCell, { CompareYearQuotaStrip } from './CompareDeptCell';
import CompareDeptColumnHeader from './CompareDeptColumnHeader';
import CompareRequirementsYearBlock from './CompareRequirementsYearBlock';

const MODES = [
  { id: 'requirements', label: '檢定標準' },
  { id: 'criteria', label: '分發比序' },
];

export default function CompareHistoricalPanel({
  items,
  yearCache,
  availableYears,
  onOpenDept,
}) {
  const [detailMode, setDetailMode] = useState('requirements');

  const years = useMemo(
    () =>
      [...availableYears]
        .filter((y) => yearCache[y])
        .sort((a, b) => Number(b) - Number(a)),
    [availableYears, yearCache]
  );

  const itemBlocks = useMemo(
    () =>
      items
        .filter((item) => item?.anchor?.dept_id)
        .map((item, index) => {
          const historical = getHistoricalData(
            yearCache,
            availableYears,
            item.anchor
          );
          const byYear = Object.fromEntries(
            historical.map((h) => [String(h.year), h.data])
          );
          return {
            item,
            color: compareColor(index),
            byYear,
            anchorDeptId: item.anchor.dept_id,
          };
        }),
    [items, yearCache, availableYears]
  );

  const gridColsCriteria = useMemo(
    () =>
      `3.25rem repeat(${Math.max(itemBlocks.length, 1)}, minmax(0, 1fr))`,
    [itemBlocks.length]
  );

  const gridColsRequirements = useMemo(
    () =>
      `3.25rem 4.75rem repeat(${Math.max(itemBlocks.length, 1)}, minmax(0, 1fr))`,
    [itemBlocks.length]
  );

  if (items.length === 0) return null;

  const yearsLoading = years.length < availableYears.length;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
      <div className="px-4 py-3.5 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3 bg-gray-50/80">
        <h2 className="text-lg font-bold text-gray-800">歷年資料比較</h2>
        <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-0.5 shrink-0">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setDetailMode(m.id)}
              className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition-colors ${
                detailMode === m.id
                  ? 'bg-white text-blue-800 shadow-sm border border-gray-200/80'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {years.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-10">歷年資料載入中…</p>
      ) : detailMode === 'requirements' ? (
        <div className="w-full">
          <div
            className="grid border-b border-gray-200 bg-gray-50/90 divide-x divide-gray-100"
            style={{ gridTemplateColumns: gridColsRequirements }}
          >
            <div className="flex items-center justify-center py-2.5 text-[10px] font-bold text-gray-400">
              學年
            </div>
            <div className="flex items-center px-2 py-2.5 text-xs font-bold text-gray-600">
              科目
            </div>
            {itemBlocks.map(({ item, color }) => (
              <CompareDeptColumnHeader
                key={item.key}
                item={item}
                accentColor={color}
                onOpenDept={onOpenDept}
              />
            ))}
          </div>
          {years.map((year, yearIndex) => (
            <CompareRequirementsYearBlock
              key={year}
              year={year}
              yearIndex={yearIndex}
              itemBlocks={itemBlocks}
              gridCols={gridColsRequirements}
            />
          ))}
        </div>
      ) : (
        <div className="w-full">
          <div
            className="grid border-b border-gray-200 bg-gray-50/90 divide-x divide-gray-100"
            style={{ gridTemplateColumns: gridColsCriteria }}
          >
            <div className="flex items-center justify-center py-2.5 text-[10px] font-bold text-gray-400">
              學年
            </div>
            {itemBlocks.map(({ item, color }) => (
              <CompareDeptColumnHeader
                key={item.key}
                item={item}
                accentColor={color}
                onOpenDept={onOpenDept}
              />
            ))}
          </div>

          {years.map((year, yearIndex) => (
            <div
              key={year}
              className={`border-b-2 border-gray-200 last:border-b-0 ${
                yearIndex % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'
              }`}
            >
              <div
                className="grid divide-x divide-gray-100 border-b border-gray-100 bg-gray-50/40"
                style={{ gridTemplateColumns: gridColsCriteria }}
              >
                <div className="flex items-center justify-center bg-slate-100/60 border-r border-gray-200" />
                {itemBlocks.map(({ item, byYear }) => (
                  <div key={`${year}-q-${item.key}`} className={QUOTA_ROW_CELL_CLASS}>
                    <CompareYearQuotaStrip data={byYear[year]} />
                  </div>
                ))}
              </div>

              <div
                className="grid divide-x divide-gray-100"
                style={{ gridTemplateColumns: gridColsCriteria }}
              >
                <div className="flex items-center justify-center py-4 px-1 bg-slate-100/80 border-r border-gray-200">
                  <span className="font-bold text-base text-slate-700 tabular-nums">
                    {year}
                  </span>
                </div>
                {itemBlocks.map(({ item, byYear }) => (
                  <CompareDeptCell
                    key={`${item.key}-${year}`}
                    data={byYear[year]}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {yearsLoading && years.length > 0 && (
        <p className="text-[11px] text-gray-400 text-center py-2 border-t border-gray-50">
          部分學年度資料載入中…
        </p>
      )}
    </div>
  );
}
