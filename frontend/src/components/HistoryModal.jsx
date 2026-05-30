import { useMemo } from 'react';
import {
  buildSchoolRankTrend,
  getRequirementsBlockMinHeightPx,
  historicalHasPractical,
} from '../lib/historyUtils';
import AddToCompareButton from './AddToCompareButton';
import TrendLineChart from './history/TrendLineChart';
import YearDetailColumn from './history/YearDetailColumn';

export default function HistoryModal({
  selectedAnchor,
  selectedDept,
  compareAnchor,
  referenceYear,
  historicalData,
  availableYears,
  yearCache,
  compare,
  onClose,
}) {
  const showPracticalSection = useMemo(
    () => historicalHasPractical(historicalData),
    [historicalData]
  );

  const requirementsMinHeightPx = useMemo(
    () => getRequirementsBlockMinHeightPx(historicalData, showPracticalSection),
    [historicalData, showPracticalSection]
  );

  const schoolRankTrend = useMemo(
    () => buildSchoolRankTrend(historicalData),
    [historicalData]
  );

  const isLoadingHistory = availableYears.some((year) => !yearCache[year]);
  const anchorDeptId = selectedAnchor?.dept_id;

  const round1ChartSeries = useMemo(
    () => [
      {
        key: 'round1',
        label: '第一輪錄取標準',
        points: schoolRankTrend.map((p) => ({ year: p.year, value: p.round1 })),
      },
    ],
    [schoolRankTrend]
  );

  const round2ChartSeries = useMemo(
    () => [
      {
        key: 'round2',
        label: '第二輪錄取標準',
        points: schoolRankTrend.map((p) => ({ year: p.year, value: p.round2 })),
      },
    ],
    [schoolRankTrend]
  );

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50 p-2 sm:p-3"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-[min(96rem,99vw)] h-[min(92vh,940px)] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative px-5 py-3.5 border-b border-gray-200 shrink-0 bg-white">
          <div className="absolute right-5 top-3 z-10 flex flex-col items-end gap-2.5 w-[10.5rem] sm:w-[11rem] pointer-events-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors font-bold text-sm whitespace-nowrap self-end"
              aria-label="關閉"
            >
              ✕ 關閉
            </button>
            {compare && compareAnchor && (
              <AddToCompareButton
                anchor={compareAnchor}
                compare={compare}
                variant="stacked"
              />
            )}
          </div>
          <div className="min-w-0 pr-[11.5rem] sm:pr-[12rem]">
            <div className="text-sm text-blue-600 font-mono font-bold mb-0.5">
              {selectedDept?.dept_id ?? selectedAnchor.dept_id}
              {selectedDept?.dept_id &&
                selectedDept.dept_id !== selectedAnchor.dept_id && (
                  <span className="text-gray-400 font-normal ml-2 text-xs">
                    （{referenceYear} 學年度代碼）
                  </span>
                )}
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 truncate pr-2">
              {selectedDept?.school_name || selectedAnchor.school_name || '未知學校'}{' '}
              {selectedDept?.dept_name || selectedAnchor.dept_name}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {historicalData.length > 0 ? (
                <>
                  歷年 {historicalData.map((h) => h.year).join('、')}
                  <span className="text-gray-400 ml-1">
                    （{historicalData.length}/{availableYears.length} 學年度）
                  </span>
                </>
              ) : (
                '歷年資料載入中…'
              )}
              {isLoadingHistory && historicalData.length > 0 && (
                <span className="text-amber-600 ml-2">持續載入中</span>
              )}
            </p>
          </div>
        </div>

        <div className="flex flex-1 min-h-0">
          <aside className="w-[min(400px,34vw)] shrink-0 border-r border-gray-200 bg-gray-50/90 px-5 py-5 flex flex-col gap-5 min-h-0">
            <p className="text-xs text-gray-500 leading-relaxed shrink-0">
              左側為跨年趨勢；右側可橫向滑動對照各學年簡章。
            </p>
            <div className="flex flex-col flex-1 gap-5 min-h-0">
              <TrendLineChart
                title="在校學業 · 第一輪篩選 (%)"
                series={round1ChartSeries}
                valueSuffix="%"
                lineColor="#2563eb"
                className="flex-1 min-h-0"
              />
              <TrendLineChart
                title="在校學業 · 第二輪 (%)"
                series={round2ChartSeries}
                valueSuffix="%"
                lineColor="#dc2626"
                className="flex-1 min-h-0"
              />
            </div>
          </aside>

          <div className="flex-1 flex flex-col min-w-0 bg-gray-100 min-h-0">
            <div className="px-4 py-3 border-b border-gray-200 bg-white shrink-0 flex items-center justify-between gap-3">
              <h3 className="text-lg font-bold text-gray-800">歷年錄取標準</h3>
              <span className="text-xs text-gray-400 shrink-0">← 橫向滑動查看更多學年</span>
            </div>

            <div className="flex-1 overflow-x-auto overflow-y-hidden min-h-0">
              {historicalData.length > 0 ? (
                <div className="flex h-full min-w-max">
                  {historicalData.map((history) => (
                    <YearDetailColumn
                      key={history.year}
                      year={history.year}
                      data={history.data}
                      anchorDeptId={anchorDeptId}
                      showPracticalSection={showPracticalSection}
                      requirementsMinHeightPx={requirementsMinHeightPx}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-16 text-base">
                  {isLoadingHistory ? '載入歷年資料中…' : '找不到此校系的歷年資料'}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
