import { COMPARE_SLOT_COUNT, MAX_COMPARE } from '../../lib/constants';
import { compareColor } from '../../lib/compareColors';

const CENTER_INDEX = Math.floor(COMPARE_SLOT_COUNT / 2);

export default function CompareSlotBar({ items, onAddClick, onRemove }) {
  const slots = Array.from({ length: COMPARE_SLOT_COUNT }, (_, i) => items[i] ?? null);

  return (
    <div className="w-full">
      <p className="text-xs text-gray-400 mb-2">
        最多 {MAX_COMPARE} 個校系 · 點擊「＋」搜尋加入
      </p>
      <div className="flex items-stretch gap-2 sm:gap-2.5">
        {slots.map((item, index) => {
          const isCenter = index === CENTER_INDEX;

          if (!item && isCenter) {
            return (
              <button
                key="center-add"
                type="button"
                onClick={onAddClick}
                className="flex-1 min-w-0 min-h-[72px] rounded-xl border-2 border-dashed border-violet-300 bg-violet-50/80 hover:bg-violet-100 hover:border-violet-400 transition-colors flex flex-col items-center justify-center gap-0.5 text-violet-600"
              >
                <span className="text-3xl font-light leading-none">＋</span>
                <span className="text-xs font-bold">加入校系</span>
              </button>
            );
          }

          if (!item) {
            return (
              <button
                key={`empty-${index}`}
                type="button"
                onClick={onAddClick}
                className="flex-1 min-w-0 min-h-[72px] rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/50 hover:border-blue-300 hover:bg-blue-50/50 transition-colors flex items-center justify-center text-gray-300 hover:text-blue-400"
              >
                <span className="text-2xl">＋</span>
              </button>
            );
          }

          const color = compareColor(index);
          return (
            <div
              key={item.key}
              className="flex-1 min-w-0 min-h-[72px] rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden flex flex-col"
              style={{ borderTopColor: color, borderTopWidth: 3 }}
            >
              <div className="p-2.5 flex-1 min-w-0">
                <p
                  className="text-[10px] font-mono font-bold mb-0.5"
                  style={{ color }}
                >
                  {item.anchor.dept_id}
                </p>
                <p className="text-xs font-bold text-gray-800 line-clamp-2 leading-snug">
                  {item.label}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onRemove(item.key)}
                className="text-[10px] text-gray-400 hover:text-red-500 hover:bg-red-50 py-1 border-t border-gray-100 transition-colors"
              >
                移除
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
