export default function AddToCompareButton({
  anchor,
  compare,
  variant = 'secondary',
}) {
  if (!anchor) return null;

  const inList = compare.isInList(anchor);
  const disabled = !inList && !compare.canAdd;
  const toggle = compare.toggle ?? compare.add;

  const base =
    variant === 'stacked'
      ? 'w-full px-3 py-2.5 rounded-lg text-xs sm:text-sm font-bold transition-colors text-center leading-snug'
      : variant === 'headerInline'
        ? 'px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap'
        : variant === 'primary'
          ? 'px-4 py-2 rounded-xl text-sm font-bold transition-colors'
          : 'px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors';

  const styles = inList
    ? 'bg-violet-100 text-violet-800 hover:bg-violet-200 border border-violet-300'
    : disabled
      ? 'bg-gray-50 text-gray-400 cursor-not-allowed border border-gray-100'
      : variant === 'stacked' || variant === 'headerInline'
        ? 'bg-violet-600 text-white hover:bg-violet-700 border border-violet-600'
        : variant === 'primary'
          ? 'bg-violet-600 text-white hover:bg-violet-700 border border-violet-600'
          : 'bg-violet-50 text-violet-700 hover:bg-violet-100 border border-violet-200';

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => toggle(anchor)}
      className={`${base} ${styles}`}
      title={
        inList
          ? '再次點擊可移出比對'
          : disabled
            ? '比對清單已滿'
            : '加入校系比對'
      }
    >
      {inList ? '✓ 已加入比對' : '+ 新增到比對'}
    </button>
  );
}
