import { useMemo, useState } from 'react';
import { matchesDepartmentSearch } from '../../lib/deptSearchUtils';

const RESULTS_MIN_H = 'min-h-[18rem]';

export default function ComparePickerModal({
  onClose,
  departmentIndex,
  compareKeys,
  canAdd,
  onSelect,
}) {
  const [searchTerm, setSearchTerm] = useState('');

  const results = useMemo(() => {
    const term = searchTerm.trim();
    const list = departmentIndex.filter((entry) => {
      if (compareKeys.has(entry.key)) return false;
      const dept = entry.displayDept;
      return matchesDepartmentSearch(
        {
          schoolName: dept.school_name || '',
          deptName: dept.dept_name || '',
          deptId: dept.dept_id || '',
        },
        term
      );
    });
    return list.slice(0, 80);
  }, [departmentIndex, searchTerm, compareKeys]);

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-start z-50 p-4 pt-10 sm:pt-14 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[min(85vh,calc(100vh-3.5rem))] flex flex-col overflow-hidden shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-gray-200 flex justify-between items-center shrink-0">
          <h2 className="text-lg font-bold text-gray-800">搜尋並加入校系</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-red-500 rounded-lg font-bold"
          >
            ✕
          </button>
        </div>

        <div className="p-4 border-b border-gray-100 shrink-0">
          <input
            type="text"
            autoFocus
            placeholder="🔍 學校、系名或代碼..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
          {!canAdd && (
            <p className="text-xs text-amber-600 mt-2">比對清單已滿，請先移除一個校系。</p>
          )}
        </div>

        <ul className={`overflow-y-auto flex-1 p-2 ${RESULTS_MIN_H}`}>
          {results.length === 0 ? (
            <li className="text-center text-gray-400 text-sm py-10">
              {searchTerm ? '找不到符合的校系' : '輸入關鍵字開始搜尋'}
            </li>
          ) : (
            results.map((entry) => {
              const dept = entry.displayDept;
              return (
                <li key={entry.key}>
                  <button
                    type="button"
                    disabled={!canAdd}
                    onClick={() => {
                      onSelect(entry.anchor);
                      onClose();
                    }}
                    className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <span className="text-[10px] font-mono text-blue-600 font-bold">
                      {dept.dept_id}
                    </span>
                    <p className="text-sm font-semibold text-gray-800">
                      {dept.school_name} · {dept.dept_name}
                    </p>
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </div>
    </div>
  );
}
