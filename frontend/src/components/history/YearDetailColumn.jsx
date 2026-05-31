import { useMemo } from 'react';
import {
  compactCriteriaRows,
  compactPracticalRows,
  compactRequirementRows,
} from '../../lib/historyUtils';
import { requirementLabelBadgeClass } from '../../lib/compareRequirementsUtils';
import { buildEquivalentItem } from '../../lib/gsatConversion';
import { evaluateStage1Requirements } from '../../lib/requirementCheck';
import { getAdmittedTotal, getQuota } from '../../lib/deptUtils';

const SECTION_TITLE =
  'font-bold text-gray-600 mb-1.5 text-xs tracking-wide';
const CELL = 'px-2 py-1.5 text-[13px]';
const CELL_VALUE = `${CELL} text-gray-700 font-medium leading-snug`;
const REQ_ROW_HEIGHT = 'h-[30px]';

export default function YearDetailColumn({
  year,
  data,
  anchorDeptId,
  showPracticalSection,
  requirementsMinHeightPx,
  referenceYear,
  gsatStats,
  maxReqRowCount = 0,
  referenceRequirements = [],
  userScores,
}) {
  const requirements = compactRequirementRows(data.requirements);
  const rawRequirements = data.requirements ?? [];
  const practicals = compactPracticalRows(data.practical_reqs);
  const criteria = compactCriteriaRows(data.criteria);
  const round1Admitted = data.admitted_round1 ?? data.round1_admitted ?? '-';
  const round2Admitted = data.admitted_round2 ?? data.round2_admitted ?? '-';

  const round1Header =
    round1Admitted !== '-' ? `一輪（${round1Admitted}）` : '一輪';
  const round2Header =
    round2Admitted !== '-' ? `二輪（${round2Admitted}）` : '二輪';

  const padRowCount = Math.max(0, maxReqRowCount - requirements.length);

  const equivBySubject = useMemo(() => {
    const map = new Map();
    if (!gsatStats || !referenceYear || String(year) === String(referenceYear)) {
      return map;
    }
    for (const row of requirements) {
      const raw = rawRequirements.find((r) => r.subject === row.subject);
      const minLevel =
        raw?.min_level ?? raw?.score?.replace?.(/[^\d]/g, '');
      if (!minLevel) continue;
      const item = buildEquivalentItem(
        gsatStats,
        year,
        referenceYear,
        row.subject,
        Number(minLevel),
        referenceRequirements
      );
      if (item) map.set(row.subject, item);
    }
    return map;
  }, [
    gsatStats,
    referenceYear,
    year,
    requirements,
    rawRequirements,
    referenceRequirements,
  ]);

  const stage1Pass = useMemo(
    () =>
      evaluateStage1Requirements(data, userScores, {
        year,
        referenceYear,
        gsatStats,
        referenceRequirements,
      }),
    [data, userScores, year, referenceYear, gsatStats, referenceRequirements]
  );

  return (
    <div className="shrink-0 w-[280px] h-full border-r border-gray-200 last:border-r-0 flex flex-col bg-white">
      <div className="bg-slate-800 text-white px-2.5 py-2.5 shrink-0">
        <div className="flex items-start justify-between gap-2 gap-y-1 flex-wrap">
          <div className="flex items-center gap-2 min-w-0 flex-wrap">
            <span className="font-bold text-base leading-tight">{year} 學年</span>
            {stage1Pass !== null && (
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded-md shrink-0 ${
                  stage1Pass
                    ? 'bg-green-600 text-green-200'
                    : 'bg-red-600 text-red-200'
                }`}
              >
                {stage1Pass ? '通過' : '不通過'}
              </span>
            )}
          </div>
          <span className="text-[13px] text-slate-200 font-normal whitespace-nowrap">
            招生名額 {getQuota(data)}
            <span className="text-slate-500 mx-1">·</span>
            錄取 {getAdmittedTotal(data)}
          </span>
        </div>
        <div className="text-slate-400 font-mono text-[10px] mt-1">
          {data.dept_id}
          {data.dept_id !== anchorDeptId && (
            <span className="text-slate-500 ml-1">（代碼變更）</span>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2.5 py-3 min-h-0">
        <div
          className="space-y-3"
          style={
            requirementsMinHeightPx
              ? { minHeight: requirementsMinHeightPx }
              : undefined
          }
        >
        <section>
          <div className={SECTION_TITLE}>學測、英聽檢定</div>
          {requirements.length > 0 ? (
            <>
              <table className="w-full border border-gray-200 border-collapse">
                <tbody>
                  {requirements.map((row, idx) => {
                    const equiv = equivBySubject.get(row.subject);
                    const isLast = idx === requirements.length - 1;
                    return (
                      <tr
                        key={row.subject}
                        className={`${REQ_ROW_HEIGHT} ${
                          isLast ? '' : 'border-b border-gray-100'
                        }`}
                      >
                        <td
                          className={`${CELL} font-semibold text-gray-800 w-[3.35rem] border-r border-gray-100 bg-gray-50/90 whitespace-nowrap leading-tight`}
                        >
                          {row.subject}
                        </td>
                        <td className={`${CELL_VALUE} align-middle`}>
                          <span className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                            <span
                              className={requirementLabelBadgeClass(
                                row.label,
                                row.subject
                              )}
                            >
                              {row.label}
                            </span>
                            {equiv && (
                              <span
                                className="text-[10px] text-violet-600 font-medium whitespace-nowrap"
                                title={`${year} 學年檢定約 ${equiv.originalLevel} 級分，換算至 ${referenceYear} 學年約 ${equiv.level} 級分`}
                              >
                                ≈{referenceYear}年的{equiv.level}級分
                              </span>
                            )}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {padRowCount > 0 && (
                <div
                  style={{ height: padRowCount * 30 }}
                  aria-hidden
                  className="shrink-0"
                />
              )}
            </>
          ) : (
            <p className="text-gray-400 text-[13px] px-0.5">—</p>
          )}
        </section>

        {showPracticalSection && practicals.length > 0 && (
          <section>
            <div className={`${SECTION_TITLE} text-purple-700`}>術科考試</div>
            <table className="w-full border border-purple-100 border-collapse">
              <tbody>
                {practicals.map((row) => (
                  <tr
                    key={row.item}
                    className="border-b border-purple-50 last:border-0"
                  >
                    <td
                      className={`${CELL} font-semibold text-gray-800 border-r border-purple-50 bg-purple-50/40`}
                    >
                      {row.item}
                    </td>
                    <td className={CELL_VALUE}>
                      <span className={requirementLabelBadgeClass(row.label, row.subject)}>
                        {row.label}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}
        </div>

        <section className="mt-3">
          <div className={SECTION_TITLE}>分發比序</div>
          {criteria.length > 0 ? (
            <table className="w-full border border-gray-200 border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-600">
                  <th
                    className={`${CELL} w-7 text-center font-bold border-b border-gray-200 text-[11px]`}
                  >
                    #
                  </th>
                  <th
                    className={`${CELL} text-left font-bold border-b border-gray-200 text-[11px]`}
                  >
                    項目
                  </th>
                  <th
                    className={`${CELL} w-12 text-center font-bold border-b border-gray-200 text-[11px] text-blue-700`}
                  >
                    {round1Header}
                  </th>
                  <th
                    className={`${CELL} w-12 text-center font-bold border-b border-gray-200 text-[11px] text-red-600`}
                  >
                    {round2Header}
                  </th>
                </tr>
              </thead>
              <tbody>
                {criteria.map((row) => {
                  const highlightR1 = row.round1 && row.round1 !== '--';
                  const highlightR2 = row.round2 && row.round2 !== '--';
                  return (
                    <tr
                      key={row.order}
                      className={`border-b border-gray-50 ${
                        row.item?.includes('在校學業') ? 'bg-amber-50/50' : ''
                      }`}
                    >
                      <td className={`${CELL} text-center text-gray-400 font-mono`}>
                        {row.order}
                      </td>
                      <td className={`${CELL} font-medium text-gray-800 leading-tight break-words`}>
                        {row.item}
                      </td>
                      <td
                        className={`${CELL} text-center font-semibold ${
                          highlightR1 ? 'text-blue-600' : 'text-gray-300'
                        }`}
                      >
                        {row.round1}
                      </td>
                      <td
                        className={`${CELL} text-center font-semibold ${
                          highlightR2 ? 'text-red-600' : 'text-gray-300'
                        }`}
                      >
                        {row.round2}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <p className="text-gray-400 text-[13px] px-0.5">—</p>
          )}
        </section>
      </div>
    </div>
  );
}
