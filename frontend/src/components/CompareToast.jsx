export default function CompareToast({ toast, onDismiss }) {
  if (!toast) return null;

  const styles = {
    success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    warn: 'bg-amber-50 border-amber-200 text-amber-800',
    info: 'bg-sky-50 border-sky-200 text-sky-800',
  };

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] px-4 w-full max-w-md pointer-events-none">
      <div
        className={`pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 rounded-xl border shadow-lg text-sm font-medium ${styles[toast.type] ?? styles.info}`}
      >
        <span>{toast.message}</span>
        <button
          type="button"
          onClick={onDismiss}
          className="text-current opacity-60 hover:opacity-100 shrink-0"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
