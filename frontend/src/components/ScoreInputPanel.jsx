import {
  GSAT_INPUT_SUBJECTS,
  LISTENING_GRADES,
} from '../lib/gsatConversion';
import { hasAnyUserScore } from '../lib/userScoresStore';

const SCORE_INPUT_CLASS =
  'w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm text-center font-mono focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent';

export default function ScoreInputPanel({
  userScores,
  onChange,
  qualFilterEnabled,
  onQualFilterChange,
  referenceYear,
  passCount,
  totalCount,
  qualFilterActive,
}) {
  const hasScores = hasAnyUserScore(userScores);

  const setScore = (subject, value) => {
    const digits = value.replace(/\D/g, '').slice(0, 2);
    onChange({
      ...userScores,
      scores: { ...userScores.scores, [subject]: digits },
    });
  };

  const setListening = (value) => {
    onChange({ ...userScores, listening: value });
  };

  return (
    <div className="border border-violet-100 rounded-xl bg-violet-50/40 overflow-hidden">
      <div className="px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-violet-100/80">
        <div>
          <h2 className="text-sm font-bold text-violet-900">
            我的學測成績 · 第一階段檢定
          </h2>
          <p className="text-xs text-violet-700/80 mt-0.5">
            對照 {referenceYear} 學年度簡章檢定標準；啟用後會出現在下方「已篩選」列
          </p>
        </div>
        <label className="inline-flex items-center gap-2 text-sm text-violet-900 shrink-0 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={qualFilterEnabled}
            onChange={(e) => onQualFilterChange(e.target.checked)}
            disabled={!hasScores}
            className="rounded border-violet-300 text-violet-600 focus:ring-violet-500 disabled:opacity-40"
          />
          <span className={!hasScores ? 'opacity-50' : ''}>
            僅顯示通過檢定校系
          </span>
        </label>
      </div>

      <div className="px-4 py-3">
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {GSAT_INPUT_SUBJECTS.map((subject) => (
            <label key={subject} className="block">
              <span className="block text-[11px] font-semibold text-gray-600 mb-1 text-center">
                {subject}
              </span>
              <input
                type="text"
                inputMode="numeric"
                placeholder="—"
                value={userScores.scores[subject]}
                onChange={(e) => setScore(subject, e.target.value)}
                className={SCORE_INPUT_CLASS}
                aria-label={`${subject}級分`}
              />
            </label>
          ))}
        </div>

        <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
          <label className="flex items-center gap-2 text-sm text-gray-700 shrink-0">
            <span className="font-semibold text-gray-600 w-10 text-center">英聽</span>
            <select
              value={userScores.listening}
              onChange={(e) => setListening(e.target.value)}
              className="px-2 py-1.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-400"
            >
              <option value="">—</option>
              {LISTENING_GRADES.map((g) => (
                <option key={g} value={g}>
                  {g} 級
                </option>
              ))}
            </select>
          </label>

          {qualFilterActive && totalCount > 0 && (
            <p className="text-xs text-violet-800">
              通過 {referenceYear} 檢定：
              <span className="font-bold tabular-nums mx-1">{passCount}</span>
              / {totalCount} 筆校系
            </p>
          )}

          {!hasScores && (
            <p className="text-xs text-gray-400">
              輸入至少一科成績或英聽後，可啟用檢定篩選
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
