import { criteriaRowsForCompareDisplay } from '../../lib/historyUtils';
import { getAdmittedTotal, getQuota } from '../../lib/deptUtils';

const SECTION_TITLE =
  'font-bold text-gray-600 mb-1.5 text-xs tracking-wide';
const CELL = 'px-1.5 py-1.5 text-xs leading-snug';

function CriteriaBlock({ data }) {
  const criteria = criteriaRowsForCompareDisplay(data.criteria);
  const round1Admitted = data.admitted_round1 ?? data.round1_admitted ?? '-';
  const round2Admitted = data.admitted_round2 ?? data.round2_admitted ?? '-';
  const round1Header =
    round1Admitted !== '-' ? `一輪（${round1Admitted}）` : '一輪';
  const round2Header =
    round2Admitted !== '-' ? `二輪（${round2Admitted}）` : '二輪';

  return (
    <section>
      <div className={SECTION_TITLE}>分發比序</div>
      {criteria.length > 0 ? (
        <table className="w-full table-fixed border border-gray-200 border-collapse">
          <thead>
            <tr className="bg-gray-50 text-gray-600">
              <th
                className={`${CELL} w-[1.5rem] text-center font-bold border-b border-gray-200`}
              >
                #
              </th>
              <th
                className={`${CELL} text-left font-bold border-b border-gray-200`}
              >
                項目
              </th>
              <th
                className={`${CELL} w-[2.85rem] text-center font-bold border-b border-gray-200 text-blue-700`}
              >
                {round1Header}
              </th>
              <th
                className={`${CELL} w-[2.85rem] text-center font-bold border-b border-gray-200 text-red-600`}
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
                  <td
                    className={`${CELL} font-medium text-gray-800 break-words`}
                  >
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
        <p className="text-gray-400 text-xs">—</p>
      )}
    </section>
  );
}

/** 分發比序模式：單一校系 × 單一學年 */
export default function CompareDeptCell({ data }) {
  if (!data) {
    return (
      <div className="min-w-0 flex flex-col bg-gray-50/50 min-h-[4rem] items-center justify-center px-1">
        <p className="text-xs text-gray-400 text-center">無資料</p>
      </div>
    );
  }

  return (
    <div className="min-w-0 flex flex-col bg-white h-full px-1.5 sm:px-2 py-2">
      <CriteriaBlock data={data} />
    </div>
  );
}

/** 分發比序列：該年各校系名額／錄取（單獨一列，不塞進每格表格） */
export function CompareYearQuotaStrip({ data }) {
  if (!data) {
    return <span className="text-gray-300">—</span>;
  }
  const quota = getQuota(data);
  const admitted = getAdmittedTotal(data);
  return (
    <span>
      名額 {quota} · 錄取 {admitted}
    </span>
  );
}
