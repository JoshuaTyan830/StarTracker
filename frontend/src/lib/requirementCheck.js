import {
  GSAT_INPUT_SUBJECTS,
  buildEquivalentItem,
  hasAnyUserScore,
} from './gsatConversion';

const LISTENING_RANK = { A: 0, B: 1, C: 2, F: 3 };

/** 從檢定 standard 解析英聽要求等級（A 最嚴）。 */
export function parseListeningRequirement(standard) {
  if (!standard || standard === '--') return null;
  const match = String(standard).match(/([ABCF])/i);
  return match ? match[1].toUpperCase() : null;
}

function passesListening(userGrade, requiredGrade) {
  if (!requiredGrade) return true;
  if (!userGrade) return false;
  const userRank = LISTENING_RANK[userGrade];
  const reqRank = LISTENING_RANK[requiredGrade];
  if (userRank == null || reqRank == null) return false;
  return userRank <= reqRank;
}

function passesNumericSubject(userScore, minLevel) {
  if (minLevel == null) return true;
  const score = Number(userScore);
  if (userScore === '' || userScore == null || Number.isNaN(score)) return false;
  return score >= Number(minLevel);
}

/** 單一 requirement 列是否通過。 */
export function passesRequirement(req, userScores) {
  if (!req || req.standard === '--' || !req.standard) return true;

  if (req.subject === '英聽') {
    return passesListening(
      userScores?.listening,
      parseListeningRequirement(req.standard)
    );
  }

  if (!GSAT_INPUT_SUBJECTS.includes(req.subject)) return true;
  return passesNumericSubject(
    userScores?.scores?.[req.subject],
    req.min_level
  );
}

/** 第一階段學測／英聽檢定是否全部通過。 */
export function passesStage1Requirements(dept, userScores) {
  if (!dept?.requirements?.length) return true;
  return dept.requirements.every((req) => passesRequirement(req, userScores));
}

function minLevelFromReq(req) {
  if (req.min_level != null && req.min_level !== '') return Number(req.min_level);
  const digits = req.score?.replace?.(/[^\d]/g, '');
  return digits ? Number(digits) : null;
}

/** 單一檢定列是否通過（歷年換算至對照學年後比對使用者成績）。 */
export function passesRequirementForYear(
  req,
  userScores,
  { year, referenceYear, gsatStats, referenceRequirements = [] }
) {
  if (!req || req.standard === '--' || !req.standard) return true;

  if (req.subject === '英聽') {
    return passesListening(
      userScores?.listening,
      parseListeningRequirement(req.standard)
    );
  }

  if (!GSAT_INPUT_SUBJECTS.includes(req.subject)) return true;

  if (String(year) === String(referenceYear)) {
    return passesNumericSubject(
      userScores?.scores?.[req.subject],
      req.min_level
    );
  }

  const minLevel = minLevelFromReq(req);
  if (minLevel == null || !gsatStats) {
    return passesNumericSubject(
      userScores?.scores?.[req.subject],
      req.min_level
    );
  }

  const item = buildEquivalentItem(
    gsatStats,
    year,
    referenceYear,
    req.subject,
    minLevel,
    referenceRequirements
  );

  if (!item) {
    return passesNumericSubject(
      userScores?.scores?.[req.subject],
      req.min_level
    );
  }

  return passesNumericSubject(
    userScores?.scores?.[req.subject],
    item.level
  );
}

/**
 * 評估某學年第一階段檢定是否通過。
 * @returns {boolean|null} null 表示尚未輸入成績
 */
export function evaluateStage1Requirements(
  dept,
  userScores,
  { year, referenceYear, gsatStats, referenceRequirements = [] }
) {
  if (!hasAnyUserScore(userScores)) return null;
  if (!dept?.requirements?.length) return true;

  return dept.requirements.every((req) =>
    passesRequirementForYear(req, userScores, {
      year,
      referenceYear,
      gsatStats,
      referenceRequirements,
    })
  );
}

/** 未通過的檢定科目摘要（供 UI 提示）。 */
export function failedRequirements(dept, userScores) {
  if (!dept?.requirements?.length) return [];
  return dept.requirements.filter((req) => !passesRequirement(req, userScores));
}
