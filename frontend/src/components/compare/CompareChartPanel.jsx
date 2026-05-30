import TrendLineChart from '../history/TrendLineChart';
import CompareRoundToggle from './CompareRoundToggle';

export default function CompareChartPanel({
  title,
  series,
  round,
  onRoundChange,
  highlightKey,
  valueSuffix = '%',
}) {
  return (
    <div className="flex-1 min-w-0 flex flex-col rounded-2xl border border-gray-200 bg-white overflow-hidden h-full min-h-0">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between gap-3 shrink-0">
        <div className="flex flex-wrap items-baseline gap-x-2.5 sm:gap-x-3 gap-y-0.5 min-w-0 flex-1">
          <h2 className="text-sm sm:text-base font-bold text-gray-800 leading-snug shrink-0">
            {title}
          </h2>
          <span className="text-[11px] sm:text-xs text-gray-400 font-normal leading-snug">
            滑鼠移到左側校系可凸顯折線
          </span>
        </div>
        <CompareRoundToggle round={round} onRoundChange={onRoundChange} size="md" />
      </div>

      <div className="flex-1 flex flex-col min-h-0 px-1.5 sm:px-2 pb-2.5 pt-0.5">
        <TrendLineChart
          series={series}
          valueSuffix={valueSuffix}
          fillWidth
          embedded
          highlightKey={highlightKey}
          legendWrap
          legendLarge
          className="flex-1 min-h-0"
        />
      </div>
    </div>
  );
}
