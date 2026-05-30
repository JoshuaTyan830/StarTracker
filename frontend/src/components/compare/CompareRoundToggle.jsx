export default function CompareRoundToggle({ round, onRoundChange, size = 'sm' }) {
  const pad =
    size === 'md'
      ? 'px-4 py-2 text-sm min-w-[4.25rem]'
      : size === 'sm'
        ? 'px-3 py-1.5 text-xs'
        : 'px-4 py-2 text-sm';

  return (
    <div
      className={`inline-flex rounded-lg border border-gray-200 bg-gray-50 shrink-0 ${
        size === 'md' ? 'p-1' : 'p-0.5'
      }`}
    >
      <button
        type="button"
        onClick={() => onRoundChange(1)}
        className={`${pad} rounded-md font-bold transition-colors ${
          round === 1 ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-white'
        }`}
      >
        第一輪
      </button>
      <button
        type="button"
        onClick={() => onRoundChange(2)}
        className={`${pad} rounded-md font-bold transition-colors ${
          round === 2 ? 'bg-red-600 text-white' : 'text-gray-600 hover:bg-white'
        }`}
      >
        第二輪
      </button>
    </div>
  );
}
