import { Fragment, useMemo } from 'react';
import {
  formatYearsCoverage,
  getQuota,
  groupBadgeClass,
} from '../lib/deptUtils';
import { groupIndexBySchool } from '../lib/historyUtils';

export default function DeptTable({
  filteredIndex,
  availableYears,
  referenceYear,
  isLoadingInitial,
  resultCount,
  loadedYearCount,
  isBackgroundLoading,
  qualFilterActive,
  onSelectEntry,
  onToggleCompare,
  compareKeys,
}) {
  const schoolGroups = useMemo(
    () => groupIndexBySchool(filteredIndex),
    [filteredIndex]
  );

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="py-2.5 px-4 border-b border-gray-100 bg-gray-50 text-sm font-semibold text-gray-500 flex justify-between items-center gap-2 flex-wrap">
        <span>
          {isLoadingInitial
            ? `載入 ${referenceYear} 學年度資料中...`
            : `找到 ${resultCount} 筆校系${
                qualFilterActive ? '（已套用檢定篩選）' : ''
              }`}
        </span>
        <span className="text-xs text-gray-400 font-normal">
          {isBackgroundLoading
            ? `歷年資料載入中（${loadedYearCount}/${availableYears.length}）…`
            : `已整合 ${loadedYearCount} 個學年度 · 對照 ${referenceYear}`}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/50 border-b border-gray-100">
              <th className="py-3 px-4 text-sm font-semibold text-gray-500 whitespace-nowrap">
                代碼
              </th>
              <th className="py-3 px-4 text-sm font-semibold text-gray-500 whitespace-nowrap">
                系所名稱
              </th>
              <th className="py-3 px-4 text-sm font-semibold text-gray-500 whitespace-nowrap">
                學群
              </th>
              <th className="py-3 px-4 text-sm font-semibold text-gray-500 whitespace-nowrap text-center">
                招生名額
              </th>
              <th className="py-3 px-4 text-sm font-semibold text-gray-500 whitespace-nowrap text-center">
                可填志願數
              </th>
              <th className="py-3 px-4 text-sm font-semibold text-gray-500 whitespace-nowrap text-center">
                歷年資料
              </th>
              {onToggleCompare && (
                <th className="py-3 px-2 text-sm font-semibold text-gray-500 w-14 text-center">
                  比對
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {schoolGroups.map((group) => (
              <Fragment key={group.school_id}>
                <tr className="bg-blue-50/90 border-y border-blue-100/80">
                  <td colSpan={onToggleCompare ? 7 : 6} className="py-3.5 px-4">
                    <span className="font-mono text-sm font-semibold text-blue-600/90 mr-3">
                      {group.school_id}
                    </span>
                    <span className="text-base sm:text-lg font-extrabold text-blue-900 tracking-tight">
                      {group.school_name}
                    </span>
                  </td>
                </tr>
                {group.entries.map((entry) => {
                  const dept = entry.displayDept;
                  return (
                    <tr
                      key={entry.key}
                      onClick={() => onSelectEntry(entry.anchor)}
                      className="border-b border-gray-50 hover:bg-blue-50 cursor-pointer transition-colors"
                    >
                      <td className="py-2.5 px-4 text-gray-500 font-mono text-sm pl-6">
                        {dept.dept_id}
                      </td>
                      <td className="py-2.5 px-4 font-bold text-gray-800 text-sm">
                        {dept.dept_name}
                      </td>
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold whitespace-nowrap ${groupBadgeClass(dept.group)}`}
                        >
                          {dept.group || '未知學群'}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-gray-700 font-medium text-center text-sm">
                        {getQuota(dept)}
                      </td>
                      <td className="py-2.5 px-4 text-gray-700 font-medium text-center text-sm">
                        {dept.max_choices ?? '-'}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
                          {formatYearsCoverage(entry.years, availableYears)}
                        </span>
                      </td>
                      {onToggleCompare && (
                        <td className="py-2.5 px-2 text-center">
                          <button
                            type="button"
                            title={
                              compareKeys?.has(entry.key)
                                ? '再次點擊可移出比對'
                                : '加入比對'
                            }
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleCompare(entry.anchor);
                            }}
                            className={`w-8 h-8 rounded-lg text-sm font-bold transition-colors border ${
                              compareKeys?.has(entry.key)
                                ? 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200 hover:text-gray-600'
                                : 'bg-violet-600 text-white border-violet-600 hover:bg-violet-700'
                            }`}
                          >
                            {compareKeys?.has(entry.key) ? '✓' : '+'}
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </Fragment>
            ))}
            {!isLoadingInitial && filteredIndex.length === 0 && (
              <tr>
                <td
                  colSpan={onToggleCompare ? 7 : 6}
                  className="p-8 text-center text-gray-400"
                >
                  找不到符合條件的校系
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
