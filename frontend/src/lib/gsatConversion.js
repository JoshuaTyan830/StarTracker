/** 學測六科（不含英聽）輸入順序 */
export const GSAT_INPUT_SUBJECTS = [
  '國文',
  '英文',
  '數學A',
  '數學B',
  '社會',
  '自然',
];

export const LISTENING_GRADES = ['A', 'B', 'C', 'F'];

/** 舊年度統計檔僅有「數學」時，對應新制數學 A/B 的 fallback */
export function resolveStatsSubject(stats, year, subject) {
  const yearStats = stats?.[String(year)];
  if (!yearStats) return null;
  if (yearStats[subject]) return subject;
  if (
    (subject === '數學A' || subject === '數學B') &&
    yearStats['數學']
  ) {
    return '數學';
  }
  return null;
}

function statsHasSubject(stats, year, subject) {
  return Boolean(resolveStatsSubject(stats, year, subject));
}

/**
 * 依對照學年簡章決定數學換算科目：有 A 用 A，僅 B 用 B，預設 A。
 */
export function pickMathSubjectForConversion(referenceRequirements) {
  const active = (referenceRequirements ?? []).filter(
    (r) => r.standard && r.standard !== '--'
  );
  if (active.some((r) => r.subject === '數學A')) return '數學A';
  if (active.some((r) => r.subject === '數學B')) return '數學B';
  return '數學A';
}

/**
 * 跨年度換算時，解析統計檔應使用的 from/to 科目（處理數學 ↔ 數學A/B）。
 */
export function resolveConversionSubjects(
  stats,
  fromYear,
  toYear,
  rowSubject,
  referenceRequirements
) {
  if (rowSubject !== '數學' && rowSubject !== '數學A' && rowSubject !== '數學B') {
    return { fromSubject: rowSubject, toSubject: rowSubject };
  }

  const mathPick = pickMathSubjectForConversion(referenceRequirements);

  if (rowSubject === '數學') {
    return {
      fromSubject: '數學',
      toSubject: statsHasSubject(stats, toYear, mathPick) ? mathPick : '數學',
    };
  }

  let fromSubject = rowSubject;
  if (
    !statsHasSubject(stats, fromYear, rowSubject) &&
    statsHasSubject(stats, fromYear, '數學')
  ) {
    fromSubject = '數學';
  }

  let toSubject = rowSubject;
  if (
    !statsHasSubject(stats, toYear, rowSubject) &&
    statsHasSubject(stats, toYear, '數學')
  ) {
    toSubject = '數學';
  } else if (
    !statsHasSubject(stats, toYear, rowSubject) &&
    statsHasSubject(stats, toYear, mathPick)
  ) {
    toSubject = mathPick;
  }

  return { fromSubject, toSubject };
}

/** 取得某年度某科各級分（由高到低）的累積人數表。 */
function getSortedLevels(stats, year, subject) {
  const key = resolveStatsSubject(stats, year, subject);
  if (!key) return [];
  const entries = stats[String(year)]?.[key];
  if (!entries) return [];
  return Object.keys(entries)
    .map(Number)
    .filter((n) => !Number.isNaN(n))
    .sort((a, b) => b - a);
}

/** 取得某年度某科某級分的累積人數百分比（前幾%）。 */
export function getPercentileForLevel(stats, year, subject, level) {
  const key = resolveStatsSubject(stats, year, subject);
  if (!key || level == null || level === '') return null;
  const entry = stats[String(year)]?.[key]?.[String(level)];
  const pct = entry?.top_down_percentile ?? entry?.percentage;
  return pct != null && !Number.isNaN(Number(pct)) ? Number(pct) : null;
}

/**
 * 在目標年度找最接近相同「前幾%」的級分。
 * 資料為離散級分（0–15），以線性掃描全部級分（非二分搜尋）找最小差距；
 * 同差距時取較高級分。
 */
export function convertLevelBetweenYears(
  stats,
  fromYear,
  toYear,
  subject,
  level,
  { fromSubject, toSubject } = {}
) {
  const src = fromSubject ?? subject;
  const dst = toSubject ?? subject;
  const targetPct = getPercentileForLevel(stats, fromYear, src, level);
  if (targetPct == null) return null;

  const levels = getSortedLevels(stats, toYear, dst);
  if (levels.length === 0) return null;

  let bestLevel = null;
  let bestDiff = Infinity;

  for (const lv of levels) {
    const pct = getPercentileForLevel(stats, toYear, dst, lv);
    if (pct == null) continue;
    const diff = Math.abs(pct - targetPct);
    if (
      bestLevel == null ||
      diff < bestDiff ||
      (diff === bestDiff && lv > bestLevel)
    ) {
      bestDiff = diff;
      bestLevel = lv;
    }
  }

  return bestLevel;
}

/**
 * 單一檢定列的等值換算摘要（fromYear 級分 → toYear 對應級分）。
 * @returns {{ subject, level, originalLevel, sameLevel, fromPct }|null}
 */
export function buildEquivalentItem(
  stats,
  fromYear,
  toYear,
  rowSubject,
  minLevel,
  referenceRequirements
) {
  if (minLevel == null || fromYear === toYear) return null;
  if (!resolveStatsSubject(stats, fromYear, rowSubject) &&
      !['數學', '數學A', '數學B'].includes(rowSubject)) {
    return null;
  }

  const { fromSubject, toSubject } = resolveConversionSubjects(
    stats,
    fromYear,
    toYear,
    rowSubject,
    referenceRequirements
  );

  const eq = convertLevelBetweenYears(
    stats,
    fromYear,
    toYear,
    rowSubject,
    minLevel,
    { fromSubject, toSubject }
  );
  if (eq == null) return null;

  const originalLevel = Number(minLevel);
  return {
    subject: rowSubject,
    level: eq,
    originalLevel,
    sameLevel: eq === originalLevel,
    fromPct: getPercentileForLevel(stats, fromYear, fromSubject, minLevel),
  };
}

/** 空的使用者成績物件 */
export function emptyUserScores() {
  return {
    scores: Object.fromEntries(GSAT_INPUT_SUBJECTS.map((s) => [s, ''])),
    listening: '',
  };
}

/** 是否已輸入至少一項成績（供檢定篩選判斷） */
export function hasAnyUserScore(userScores) {
  if (!userScores) return false;
  if (userScores.listening) return true;
  return GSAT_INPUT_SUBJECTS.some((s) => {
    const v = userScores.scores?.[s];
    return v !== '' && v != null;
  });
}
