import { splitCompareAnchor } from '../../lib/compareLabelUtils';

const DEFAULT_COLORS = ['#2563eb', '#0d9488', '#7c3aed'];
const DIMMED_LINE_OPACITY = 0.65;

function getGlobalYRange(allSeries, getValue) {
  const values = [];
  for (const s of allSeries) {
    for (const p of s.points) {
      const v = getValue(p);
      if (v != null) values.push(v);
    }
  }
  if (values.length === 0) return null;
  return { minY: Math.min(...values), maxY: Math.max(...values) };
}

function scalePoints(points, width, height, padding, getValue, yRange) {
  const values = points.map(getValue).filter((v) => v != null);
  if (values.length === 0) return null;

  const minY = yRange?.minY ?? Math.min(...values);
  const maxY = yRange?.maxY ?? Math.max(...values);
  const span = maxY - minY || 1;
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const coords = points.map((p, i) => {
    const v = getValue(p);
    if (v == null) return null;
    const x =
      points.length === 1
        ? width / 2
        : padding.left + (i / (points.length - 1)) * innerW;
    // 校排%：越小越嚴格，顯示在圖上方；越大在下方
    const y = padding.top + ((v - minY) / span) * innerH;
    return { x, y, label: p.year, value: v };
  });

  return { coords, minY, maxY };
}

function collectAllYears(series) {
  const years = new Set();
  for (const s of series) {
    for (const p of s.points) {
      if (p.value != null) years.add(p.year);
    }
  }
  return [...years].sort((a, b) => a - b);
}

function alignToYears(points, allYears) {
  return allYears.map((year) => {
    const hit = points.find((p) => p.year === year);
    return { year, value: hit?.value ?? null };
  });
}

/** 略過中間缺年，依時間順序連接所有有值的點 */
function SeriesPath({ coords, strokeWidth = 2.5, opacity = 1 }) {
  const valid = coords.filter(Boolean);
  if (valid.length < 2) return null;

  const d = valid
    .map((c, j) => `${j === 0 ? 'M' : 'L'} ${c.x} ${c.y}`)
    .join(' ');

  return (
    <path
      d={d}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity={opacity}
    />
  );
}

function ValueLabel({ x, y, text, color }) {
  const label = String(text);
  const charW = 5.8;
  const padX = 4;
  const padY = 2;
  const w = label.length * charW + padX * 2;
  const h = 14;
  const rectX = x - w / 2;
  const rectY = y - h - 6;

  return (
    <g>
      <rect
        x={rectX}
        y={rectY}
        width={w}
        height={h}
        rx={3}
        fill="white"
        fillOpacity={0.9}
        stroke="#e5e7eb"
        strokeWidth={0.5}
      />
      <text
        x={x}
        y={rectY + h - padY - 1}
        textAnchor="middle"
        fill={color}
        style={{ fontSize: 10, fontWeight: 700 }}
      >
        {label}
      </text>
    </g>
  );
}

/**
 * @param {{ title: string, series: { key: string, label: string, points: { year: number, value: number|null }[] }[], valueSuffix?: string, lineColor?: string, className?: string }} props
 */
function orderSeriesForHighlight(series, highlightKey) {
  if (!highlightKey) return series;
  const hit = series.find((s) => s.key === highlightKey);
  if (!hit) return series;
  return [...series.filter((s) => s.key !== highlightKey), hit];
}

export default function TrendLineChart({
  title,
  series,
  valueSuffix = '',
  lineColor,
  className = '',
  wide = false,
  fillWidth = false,
  embedded = false,
  hidePointLabels = false,
  highlightKey = null,
  legendWrap = false,
  legendLarge = false,
}) {
  const hasData = series.some((s) => s.points.some((p) => p.value != null));
  const allYears = hasData ? collectAllYears(series) : [];
  const yearSpan = Math.max(allYears.length, 2);

  const width = fillWidth
    ? Math.max(720, yearSpan * 72)
    : wide
      ? 420
      : 320;
  const isCompareChart = legendLarge && fillWidth && embedded;
  const height = fillWidth ? 300 : wide ? 220 : 200;
  const padding = isCompareChart
    ? { top: 28, right: 28, bottom: 34, left: 28 }
    : fillWidth
      ? { top: 40, right: 28, bottom: 36, left: 28 }
      : wide
        ? { top: 36, right: 52, bottom: 32, left: 52 }
        : { top: 32, right: 28, bottom: 28, left: 28 };

  const yRange = hasData ? getGlobalYRange(series, (p) => p.value) : null;
  const drawSeries = orderSeriesForHighlight(series, highlightKey);
  const yearAxisFontSize = legendLarge ? 12 : fillWidth ? 11 : 10;
  // 比對頁：繪圖區與年份分開，年份固定在 SVG 底部留白帶內
  const yearLabelY = isCompareChart
    ? height - 11
    : height - (legendLarge ? 8 : 10);
  const innerW = width - padding.left - padding.right;
  const yearAxisX = (i) =>
    allYears.length === 1
      ? width / 2
      : padding.left + (i / (allYears.length - 1)) * innerW;

  const shellClass = embedded
    ? `flex flex-col flex-1 min-h-0 ${className}`
    : `bg-white rounded-xl border border-gray-200/80 shadow-sm px-5 py-4 flex flex-col flex-1 min-h-0 ${className}`;

  if (!hasData) {
    return (
      <div className={`${shellClass} min-h-[140px]`}>
        {title && !embedded && (
          <h4 className="text-sm font-bold text-gray-700 mb-3">{title}</h4>
        )}
        <p className="text-sm text-gray-400 flex-1 flex items-center justify-center">
          尚無可繪製資料
        </p>
      </div>
    );
  }

  return (
    <div className={shellClass}>
      {title && !embedded && (
        <h4 className="text-sm font-bold text-gray-800 mb-3 shrink-0">{title}</h4>
      )}
      <div
        className={`flex items-stretch min-h-[120px] ${
          isCompareChart
            ? 'flex-[1_1_0] min-h-0'
            : `flex-1 ${embedded && fillWidth ? 'min-h-[14rem]' : ''}`
        } ${embedded ? 'py-0' : 'py-1'}`}
      >
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className={`w-full ${
            embedded && fillWidth
              ? isCompareChart
                ? 'h-full min-h-0 block'
                : 'h-full min-h-[14rem] block'
              : `block ${fillWidth ? '' : 'max-h-[220px]'}`
          }`}
          style={
            fillWidth && !embedded
              ? { aspectRatio: `${width} / ${height}` }
              : undefined
          }
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label={title || '趨勢圖'}
        >
          {drawSeries.map((s, si) => {
            const aligned = alignToYears(s.points, allYears);
            const scaled = scalePoints(
              aligned,
              width,
              height,
              padding,
              (p) => p.value,
              yRange
            );
            if (!scaled) return null;
            const color =
              s.color ?? lineColor ?? DEFAULT_COLORS[si % DEFAULT_COLORS.length];
            const labelText = (v) => `${v}${valueSuffix}`;
            const isActive = !highlightKey || s.key === highlightKey;
            const dimmed = highlightKey && !isActive;
            const strokeWidth = isActive && highlightKey ? 4 : dimmed ? 1.5 : 2.5;
            const pointR = isActive && highlightKey ? 5 : 3.5;
            const lineOpacity = dimmed ? DIMMED_LINE_OPACITY : 1;

            return (
              <g key={s.key} style={{ color }} opacity={lineOpacity}>
                <SeriesPath
                  coords={scaled.coords}
                  strokeWidth={strokeWidth}
                  opacity={lineOpacity}
                />
                {scaled.coords.map(
                  (c) =>
                    c && (
                      <g key={`${s.key}-${c.label}`} opacity={lineOpacity}>
                        <circle cx={c.x} cy={c.y} r={pointR} fill={color} />
                        {!hidePointLabels && (
                          <ValueLabel
                            x={c.x}
                            y={c.y}
                            text={labelText(c.value)}
                            color={color}
                          />
                        )}
                      </g>
                    )
                )}
              </g>
            );
          })}
          {allYears.map((year, i) => (
            <text
              key={year}
              x={yearAxisX(i)}
              y={yearLabelY}
              textAnchor="middle"
              fill={legendLarge ? '#6b7280' : '#9ca3af'}
              style={{ fontSize: yearAxisFontSize, fontWeight: 700 }}
            >
              {year}
            </text>
          ))}
        </svg>
      </div>
      {series.length > 0 && (
        <div
          className={`shrink-0 ${
            isCompareChart
              ? 'mt-0.5 pt-3 pb-2 border-t border-gray-100/80'
              : legendLarge
                ? 'mt-2.5 pb-0.5'
                : 'mt-1.5'
          } ${
            legendWrap
              ? `flex flex-wrap justify-center items-start px-1 ${
                  legendLarge
                    ? 'gap-x-5 sm:gap-x-6 gap-y-2'
                    : 'gap-x-5 sm:gap-x-6 gap-y-2.5'
                }`
              : `flex flex-wrap gap-x-4 gap-y-1.5 ${wide ? 'justify-center' : ''}`
          }`}
        >
          {series.map((s, si) => {
            const color =
              s.color ?? lineColor ?? DEFAULT_COLORS[si % DEFAULT_COLORS.length];
            const isActive = !highlightKey || s.key === highlightKey;
            const { school, dept } = splitCompareAnchor(s.anchor, s.label);

            if (legendWrap) {
              const schoolCls = legendLarge
                ? 'text-[11px] font-semibold text-gray-800 leading-tight'
                : 'text-[11px] font-semibold text-gray-800';
              const deptCls = legendLarge
                ? 'text-[10px] text-gray-500 mt-0.5 leading-tight'
                : 'text-[10px] text-gray-600 mt-0.5';
              const barCls = legendLarge
                ? 'w-5 h-1 rounded-full shrink-0 mb-1'
                : 'w-5 h-1 rounded-full shrink-0 mb-1';
              const colMax = legendLarge ? 'max-w-[9.5rem]' : 'max-w-[9.5rem]';

              return (
                <div
                  key={s.key}
                  className={`flex flex-col items-center text-center ${colMax} min-w-[5.5rem] transition-opacity leading-snug ${
                    !isActive && highlightKey ? 'opacity-[0.65]' : ''
                  }`}
                >
                  <span
                    className={barCls}
                    style={{ backgroundColor: color }}
                  />
                  <span className={schoolCls}>{school}</span>
                  <span className={deptCls}>{dept}</span>
                </div>
              );
            }

            return (
              <span
                key={s.key}
                className={`flex items-start gap-1.5 text-[11px] text-gray-700 font-medium transition-opacity max-w-[14rem] ${
                  !isActive && highlightKey ? 'opacity-[0.65]' : ''
                }`}
              >
                <span
                  className="w-4 h-1 rounded-full shrink-0 mt-1"
                  style={{ backgroundColor: color }}
                />
                <span className="leading-snug truncate">{s.label}</span>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
