import { MAX_COMPARE } from '../../lib/constants';
import { compareColor } from '../../lib/compareColors';
import { splitCompareAnchor } from '../../lib/compareLabelUtils';

export default function CompareSidebar({
  items,
  onAddClick,
  onRemove,
  canAdd,
  hoveredKey,
  onHoverKey,
  onOpenDept,
}) {
  const validItems = items.filter((i) => i?.anchor?.dept_id);
  const slots = Array.from({ length: MAX_COMPARE }, (_, i) => validItems[i] ?? null);

  return (
    <aside className="w-[12.5rem] sm:w-[13.5rem] shrink-0 flex flex-col gap-2 h-full min-h-0">
      {slots.map((item, index) => {
        if (!item) {
          return (
            <button
              key={`empty-${index}`}
              type="button"
              onClick={onAddClick}
              disabled={!canAdd}
              className="flex-1 min-h-[3rem] rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/80 hover:border-violet-300 hover:bg-violet-50/50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center text-gray-300 hover:text-violet-500 transition-colors"
            >
              <span className="text-xl leading-none">＋</span>
            </button>
          );
        }

        const color = compareColor(index);
        const isHovered = hoveredKey === item.key;
        const { school, dept } = splitCompareAnchor(item.anchor, item.label);

        return (
          <div
            key={item.key}
            className={`flex-1 min-h-[3rem] rounded-xl border pl-2.5 pr-1 py-2 flex items-center gap-1 shadow-sm transition-all relative ${
              isHovered
                ? 'border-violet-300 bg-violet-50/60 ring-2 ring-violet-200/80'
                : 'border-gray-200 bg-white'
            }`}
            style={{ borderLeftWidth: 3, borderLeftColor: color }}
            onMouseEnter={() => onHoverKey?.(item.key)}
            onMouseLeave={() => onHoverKey?.(null)}
          >
            <button
              type="button"
              onClick={() => onOpenDept?.(item)}
              className="flex-1 min-w-0 text-left cursor-pointer group rounded-lg -ml-0.5 pl-0.5 py-0.5 hover:bg-white/60 transition-colors"
              title="點擊查看此校系歷年詳情"
            >
              <p
                className={`font-mono font-bold leading-snug transition-all group-hover:underline ${
                  isHovered ? 'text-sm' : 'text-[11px]'
                }`}
                style={{ color }}
              >
                {item.anchor.dept_id}
              </p>
              <p
                className={`font-bold text-gray-800 leading-snug mt-0.5 line-clamp-2 transition-all group-hover:text-blue-800 ${
                  isHovered ? 'text-base' : 'text-sm'
                }`}
              >
                {school}
              </p>
              <p
                className={`text-gray-600 leading-snug mt-0.5 line-clamp-2 transition-all ${
                  isHovered ? 'text-sm font-semibold' : 'text-xs font-medium'
                }`}
              >
                {dept}
              </p>
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(item.key);
              }}
              className="shrink-0 w-7 h-7 flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg text-sm font-bold transition-colors z-10"
              aria-label="移除"
            >
              ×
            </button>
          </div>
        );
      })}
    </aside>
  );
}
