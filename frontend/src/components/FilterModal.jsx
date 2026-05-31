import { useState } from 'react';
import { PRESENCE_FILTER_ALL, QUOTA_FILTER_ALL, QUOTA_FILTER_EXTRA, QUOTA_FILTER_REGULAR } from '../lib/constants';
import { getGroupLabel } from '../lib/deptUtils';

export default function FilterModal({
  onClose,
  groupOptions,
  selectedGroupIds,
  onToggleGroup,
  onClearGroups,
  onSelectAllGroups,
  schoolOptions,
  selectedSchoolIds,
  onToggleSchool,
  onClearSchools,
  onSelectAllSchools,
  presenceYear,
  onPresenceYearChange,
  availableYears,
  onClearAll,
  selectedFilterItemCount,
  quotaFilter,
  onQuotaFilterChange,
}) {
  const [schoolSearch, setSchoolSearch] = useState('');
  const searchTerm = schoolSearch.trim();

  const schoolMatchesSearch = (school) =>
    !searchTerm ||
    school.school_name.includes(searchTerm) ||
    school.school_id.includes(searchTerm);

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[88vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b-2 border-gray-200 flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-800">篩選條件</h2>
            {selectedFilterItemCount > 0 && (
              <p className="text-xs text-blue-600 mt-0.5">
                已選 {selectedFilterItemCount} 項
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors font-bold"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-1 min-h-0">
          <aside className="w-72 shrink-0 self-stretch border-r-2 border-gray-300 flex flex-col min-h-0 bg-gray-50/80">
            <div className="shrink-0 px-4 pt-4 pb-3 border-b border-gray-200 space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">
                  招生年份
                </label>
                <select
                  value={presenceYear}
                  onChange={(e) => onPresenceYearChange(e.target.value)}
                  className="w-full py-1.5 px-2 border border-gray-300 rounded-md bg-white text-sm text-gray-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={PRESENCE_FILTER_ALL}>不限學年</option>
                  {availableYears.map((year) => (
                    <option key={year} value={year}>
                      {year} 學年度
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-gray-500 mt-1 leading-snug">
                  選特定學年可對照該年簡章；不限則顯示歷年曾出現的所有校系。
                </p>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">
                  名額類型
                </label>
                <select
                  value={quotaFilter ?? QUOTA_FILTER_ALL}
                  onChange={(e) => onQuotaFilterChange(e.target.value)}
                  className="w-full py-1.5 px-2 border border-gray-300 rounded-md bg-white text-sm text-gray-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={QUOTA_FILTER_ALL}>全部（一般＋外加）</option>
                  <option value={QUOTA_FILTER_REGULAR}>僅一般生</option>
                  <option value={QUOTA_FILTER_EXTRA}>僅外加名額</option>
                </select>
                <p className="text-[11px] text-gray-500 mt-1 leading-snug">
                  一般生與外加名額為不同招生管道，主表分開列計。
                </p>
              </div>
            </div>

            <div className="flex-1 flex flex-col min-h-0 px-4 py-3">
              <div className="flex justify-between items-center mb-2 shrink-0">
                <h3 className="text-sm font-bold text-gray-800">學群</h3>
                <div className="flex gap-1.5 text-[11px]">
                  <button
                    type="button"
                    onClick={onSelectAllGroups}
                    className="text-blue-600 hover:underline"
                  >
                    全選
                  </button>
                  <span className="text-gray-300">|</span>
                  <button
                    type="button"
                    onClick={onClearGroups}
                    className="text-gray-500 hover:underline"
                  >
                    清除
                  </button>
                </div>
              </div>
              <div className="flex-1 flex flex-col min-h-0">
                {groupOptions.map((group) => (
                  <label
                    key={group}
                    className="flex-1 flex items-center gap-2 px-1 min-h-[1.75rem] rounded-md hover:bg-white cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedGroupIds.has(group)}
                      onChange={() => onToggleGroup(group)}
                      className="text-blue-600 rounded shrink-0"
                    />
                    <span className="text-xs text-gray-700 leading-snug">
                      {getGroupLabel(group)}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </aside>

          <div className="flex-1 flex flex-col min-w-0 bg-white">
            <div className="px-5 py-4 border-b-2 border-gray-300 flex flex-wrap items-center gap-3 shrink-0">
              <h3 className="text-base font-bold text-gray-800">學校</h3>
              <div className="flex gap-2 text-xs ml-auto">
                <button
                  type="button"
                  onClick={onSelectAllSchools}
                  className="text-blue-600 hover:underline"
                >
                  全選
                </button>
                <span className="text-gray-300">|</span>
                <button
                  type="button"
                  onClick={onClearSchools}
                  className="text-gray-500 hover:underline"
                >
                  清除
                </button>
              </div>
              <input
                type="text"
                placeholder="搜尋學校名稱或代碼..."
                value={schoolSearch}
                onChange={(e) => setSchoolSearch(e.target.value)}
                className="w-full sm:w-72 p-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex-1 overflow-y-auto p-4 min-h-0">
              {schoolOptions.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">尚無學校資料</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5 h-full content-start">
                  {schoolOptions.map((school) => {
                    const matched = schoolMatchesSearch(school);
                    const selected = selectedSchoolIds.has(school.school_id);
                    return (
                      <label
                        key={school.school_id}
                        className={`flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer transition-all border ${
                          searchTerm && matched
                            ? 'bg-amber-50 border-amber-300 ring-1 ring-amber-200'
                            : searchTerm && !matched
                              ? 'opacity-35 border-transparent hover:opacity-60'
                              : selected
                                ? 'bg-blue-50 border-blue-200'
                                : 'border-transparent hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => onToggleSchool(school.school_id)}
                          className="text-blue-600 rounded shrink-0"
                        />
                        <span className="text-[10px] font-mono text-gray-400 shrink-0">
                          {school.school_id}
                        </span>
                        <span className="text-sm text-gray-700 truncate" title={school.school_name}>
                          {school.school_name}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t-2 border-gray-200 flex justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClearAll}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
          >
            清除全部
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors"
          >
            完成
          </button>
        </div>
      </div>
    </div>
  );
}
