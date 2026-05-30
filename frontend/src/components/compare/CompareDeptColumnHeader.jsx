import { splitCompareAnchor } from '../../lib/compareLabelUtils';

export default function CompareDeptColumnHeader({
  item,
  accentColor,
  onOpenDept,
}) {
  const { school, dept } = splitCompareAnchor(item.anchor, item.label);

  return (
    <button
      type="button"
      onClick={() => onOpenDept?.(item)}
      className="min-w-0 text-left px-2 py-2.5 bg-gray-50/90 border-b border-gray-200 hover:bg-blue-50/80 transition-colors group w-full"
      style={
        accentColor
          ? { borderTopWidth: 3, borderTopColor: accentColor }
          : undefined
      }
      title="點擊查看此校系歷年詳情"
    >
      <p
        className="text-[10px] font-mono font-bold leading-none truncate group-hover:underline"
        style={{ color: accentColor }}
      >
        {item.anchor.dept_id}
      </p>
      <p className="text-xs sm:text-sm font-bold text-gray-800 leading-snug mt-0.5 line-clamp-2 group-hover:text-blue-800">
        {school}
      </p>
      <p className="text-[10px] sm:text-xs text-gray-600 leading-snug line-clamp-2">
        {dept}
      </p>
    </button>
  );
}
