import { useMemo } from 'react';
import { getHistoricalData } from '../../lib/deptUtils';
import { filterCriteriaForRound } from '../../lib/historyUtils';
import { compareColor } from '../../lib/compareColors';

export default function CompareDeptPanel({
  item,
  colorIndex,
  yearCache,
  availableYears,
  round,
  onRemove,
}) {
  const historicalData = useMemo(
    () => getHistoricalData(yearCache, availableYears, item.anchor),
    [yearCache, availableYears, item.anchor]
  );

  const roundField = round === 2 ? 'round2' : 'round1';
  const roundLabel = round === 2 ? '第二輪' : '第一輪';
  const color = compareColor(colorIndex);

  return (
    <div
      className="shrink-0 w-[220px] flex flex-col border border-gray-200 rounded-xl bg-white overflow-hidden shadow-sm"
      style={{ borderTopWidth: 3, borderTopColor: color }}
    >
      <div className="px-2.5 py-2 border-b border-gray-100 bg-gray-50/80">
        <div className="flex justify-between items-start gap-1">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-mono font-bold" style={{ color }}>
              {item.anchor.dept_id}
            </p>
            <p className="text-xs font-bold text-gray-800 line-clamp-2 leading-snug">
              {item.label}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onRemove(item.key)}
            className="text-gray-300 hover:text-red-500 text-xs shrink-0"
            aria-label="移除"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-[200px] max-h-[420px]">
        {historicalData.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-6">載入中…</p>
        ) : (
          historicalData.map(({ year, data }) => {
            const rows = filterCriteriaForRound(data.criteria, round);
            if (rows.length === 0) return null;

            const r1 = data.admitted_round1 ?? data.round1_admitted;
            const r2 = data.admitted_round2 ?? data.round2_admitted;
            const admitted =
              round === 2 ? r2 : r1;

            return (
              <div
                key={year}
                className="rounded-lg border border-gray-100 overflow-hidden"
              >
                <div className="px-2 py-1 bg-slate-700 text-white text-xs font-bold flex justify-between">
                  <span>{year} 學年</span>
                  {admitted != null && admitted !== '' && (
                    <span className="text-slate-300 font-normal text-[10px]">
                      {roundLabel}（{admitted}）
                    </span>
                  )}
                </div>
                <ul className="divide-y divide-gray-50">
                  {rows.map((row) => (
                    <li
                      key={row.order}
                      className={`px-2 py-1 flex justify-between gap-1 text-xs ${
                        row.item?.includes('在校學業') ? 'bg-amber-50/70' : ''
                      }`}
                    >
                      <span className="text-gray-700 font-medium truncate">
                        {row.item}
                      </span>
                      <span
                        className={`font-bold shrink-0 ${
                          round === 2 ? 'text-red-600' : 'text-blue-600'
                        }`}
                      >
                        {row[roundField]}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
