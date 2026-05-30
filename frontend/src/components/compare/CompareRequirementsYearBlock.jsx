import {
  buildYearRequirementsRows,
  formatQuotaAdmittedLine,
  QUOTA_ROW_CELL_CLASS,
  requirementLabelBadgeClass,
} from '../../lib/compareRequirementsUtils';

const CELL =
  'px-1.5 py-1.5 text-xs text-center min-h-[2.1rem] flex items-center justify-center';
const SUBJECT_CELL =
  'px-2 py-1.5 text-sm font-bold border-r border-gray-100 flex items-center leading-snug';
/** 名額列對應的左欄標題，字多欄窄，用較小字級 */
const SUBJECT_HEADER_CELL =
  'px-1.5 py-1.5 text-[10px] font-bold border-r border-gray-100 flex items-center leading-tight text-gray-600';

function StandardValue({ label, subject }) {
  if (!label) {
    return <span className="text-gray-300">—</span>;
  }
  return (
    <span className={requirementLabelBadgeClass(label, subject)}>{label}</span>
  );
}

export default function CompareRequirementsYearBlock({
  year,
  yearIndex,
  itemBlocks,
  gridCols,
}) {
  const { gsatRows, practicalRows } = buildYearRequirementsRows(year, itemBlocks);
  const allRows = [
    ...gsatRows.map((r) => ({ ...r, isPractical: false })),
    ...practicalRows,
  ];
  const rowSpan = 1 + Math.max(allRows.length, 1);

  return (
    <div
      className={`border-b-2 border-gray-200 last:border-b-0 ${
        yearIndex % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'
      }`}
      style={{
        display: 'grid',
        gridTemplateColumns: gridCols,
        gridTemplateRows: `auto repeat(${Math.max(allRows.length, 1)}, auto)`,
      }}
    >
      <div
        className="flex items-center justify-center py-3 px-1 bg-slate-100/80 border-r border-gray-200"
        style={{ gridRow: `1 / span ${rowSpan}` }}
      >
        <span className="font-bold text-base text-slate-700 tabular-nums">
          {year}
        </span>
      </div>

      <div
        className={`${SUBJECT_HEADER_CELL} border-b border-gray-100 bg-gray-50/50`}
      >
        學測、英聽
      </div>
      {itemBlocks.map(({ item, byYear }) => (
        <div key={`${year}-stat-${item.key}`} className={QUOTA_ROW_CELL_CLASS}>
          {formatQuotaAdmittedLine(byYear[String(year)]) ?? '—'}
        </div>
      ))}

      {allRows.length === 0 ? (
        <>
          <div className="px-2 py-2 text-[11px] text-gray-400 border-r border-gray-100">
            —
          </div>
          {itemBlocks.map(({ item }) => (
            <div
              key={`${year}-empty-${item.key}`}
              className={`${CELL} text-gray-300 border-r border-gray-50 last:border-r-0`}
            >
              —
            </div>
          ))}
        </>
      ) : (
        allRows.map((row, rowIndex) => (
          <div
            key={`${year}-row-${row.subject}-${rowIndex}`}
            className="contents"
          >
            <div
              className={`${SUBJECT_CELL} ${
                row.isPractical
                  ? 'text-purple-900 bg-purple-50/40'
                  : 'text-gray-900 bg-gray-50/40'
              }`}
            >
              {row.subject}
            </div>
            {itemBlocks.map(({ item }) => (
              <div
                key={`${year}-${row.subject}-${item.key}`}
                className={`${CELL} border-r border-gray-50 last:border-r-0 bg-white`}
              >
                <StandardValue
                  label={row.cells[item.key]}
                  subject={row.subject}
                />
              </div>
            ))}
          </div>
        ))
      )}
    </div>
  );
}
