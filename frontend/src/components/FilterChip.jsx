export default function FilterChip({ label, chipClass, onRemove }) {
  return (
    <span
      className={`inline-flex items-center gap-0.5 pl-2.5 pr-1.5 py-1 rounded-full text-xs font-medium border shrink-0 ${chipClass}`}
    >
      <span className="truncate max-w-[12rem]">{label}</span>
      <button
        type="button"
        onClick={onRemove}
        className="w-3.5 h-3.5 flex items-center justify-center rounded-full hover:bg-black/10 text-[11px] leading-none shrink-0"
        aria-label={`移除 ${label}`}
      >
        ×
      </button>
    </span>
  );
}
