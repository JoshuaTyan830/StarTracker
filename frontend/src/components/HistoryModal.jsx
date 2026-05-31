import { useMemo } from 'react';
import {
  buildSchoolRankTrend,
  getMaxRequirementRowCount,
  getRequirementsBlockMinHeightPx,
  historicalHasPractical,
} from '../lib/historyUtils';
import { loadUserScores } from '../lib/userScoresStore';
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
  gsatStats,
  userScores: userScoresProp,
}) {
  const userScores = userScoresProp ?? loadUserScores();
  const showPracticalSection = useMemo(
    () => historicalHasPractical(historicalData),
    [historicalData]
  );

  const maxReqRowCount = useMemo(
    () => getMaxRequirementRowCount(historicalData),
    [historicalData]
  );

  const referenceRequirements = selectedDept?.requirements ?? [];

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
          <aside className="w-[min(400px,34vw)] shrink-0 border-r border-gray-200 bg-gray-50/90 px-4 py-4 flex flex-col gap-3 min-h-0">
            <div className="text-[11px] text-gray-500 leading-relaxed shrink-0 space-y-1.5">
              <p>左側為跨年趨勢；右側可橫向滑動對照各學年簡章。</p>
              {gsatStats && (
                <div className="text-violet-800/90 space-y-1">
                  <p>
                    <span className="font-semibold text-violet-900">等值級分：</span>
                    依累積人數百分比，將各欄學年檢定換算至對照學年（{referenceYear}），標示於檢定右側（如{' '}
                    114 年頂標 12 級分 ≈{referenceYear}年的11級分 表示 114 年標準約等同 {referenceYear}{' '}
                    學年 11 級分）。
                  </p>
                  <p>
                    <span className="font-semibold text-violet-900">數學換算：</span>
                    111 學年度起分數學 A／B；舊年度僅「數學」一科。對照學年若分科採計，各科分別換算。
                  </p>
                </div>
              )}
            </div>
            <div className="flex flex-col flex-1 gap-3 min-h-0">
              <TrendLineChart
                title="在校學業 · 第一輪篩選 (%)"
                series={round1ChartSeries}
                valueSuffix="%"
                lineColor="#2563eb"
                wide
                flat
                className="flex-[1_1_0] min-h-0"
              />
              <TrendLineChart
                title="在校學業 · 第二輪 (%)"
                series={round2ChartSeries}
                valueSuffix="%"
                lineColor="#dc2626"
                wide
                flat
                className="flex-[1_1_0] min-h-0"
              />
            </div>
          </aside>

          <div className="flex-1 flex flex-col min-w-0 bg-gray-100 min-h-0">
            <div className="px-4 py-3 border-b border-gray-200 bg-white shrink-0 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <h3 className="text-lg font-bold text-gray-800 shrink-0">歷年錄取標準</h3>
                <span className="relative inline-flex shrink-0 group">
                  <button
                    type="button"
                    className="w-5 h-5 rounded-full bg-gray-200 text-gray-600 hover:bg-gray-300 text-[11px] font-bold leading-none flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-blue-400"
                    aria-label="歷年錄取標準說明"
                  >
                    ?
                  </button>
                  <div
                    role="tooltip"
                    className="pointer-events-none absolute left-0 top-full mt-2 z-50 w-[min(22rem,calc(100vw-3rem))] px-3 py-2.5 rounded-lg bg-gray-900 text-white text-[11px] leading-relaxed shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible group-focus-within:opacity-100 group-focus-within:visible transition-opacity"
                  >
                    <p className="font-semibold text-gray-100 mb-1.5">關於「通過／不通過」</p>
                    <p className="text-gray-300 mb-2">
                      各學年標題旁的標籤，僅表示依您輸入的成績是否達該年簡章的
                      <span className="text-white">第一階段學測、英聽檢定</span>
                      ；不含分發比序、術科考或錄取結果。
                    </p>
                    <p className="font-semibold text-gray-100 mb-1.5">
                      為何換算結果可能和直覺不同？
                    </p>
                    <ul className="text-gray-300 space-y-1 list-disc pl-4">
                      <li>
                        歷年欄位以您選定的對照學年（{referenceYear}）所填成績判定；該年檢定會先換算成
                        {referenceYear} 年的等值級分再比對（右側紫色 ≈{referenceYear}年的…級分）。
                      </li>
                      <li>
                        因此可能出現：{referenceYear} 年欄顯示「不通過」，舊年卻顯示「通過」——例如該年頂標換算至{' '}
                        {referenceYear} 年低於您的成績，但您尚未達 {referenceYear} 年簡章原文門檻。
                      </li>
                      <li>
                        頂標、前標等名稱的定義每年都相同，但各年「頂標是幾級分」、以及每個級分對應的累積人數百分比並不一致。換算時只能找最接近的級分，因此結果可能和直覺略有出入。
                      </li>
                      <li>
                        111 學年度起學測分數學 A／B 兩科，舊年度簡章僅「數學」一科；跨年度比對時各科分別換算，也可能加劇上述落差。
                      </li>
                    </ul>
                  </div>
                </span>
              </div>
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
                      referenceYear={referenceYear}
                      gsatStats={gsatStats}
                      maxReqRowCount={maxReqRowCount}
                      referenceRequirements={referenceRequirements}
                      userScores={userScores}
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
