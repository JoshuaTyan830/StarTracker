import {
  formatCriteriaResult,
  formatPracticalReq,
  formatRequirement,
  getHistoricalData,
} from './deptUtils';

/** Parse round result to numeric percentile when possible. */
export function parsePercentileValue(round) {
  if (!round) return null;
  if (typeof round === 'object') {
    if (round.type === 'percentile' && round.value != null) return Number(round.value);
    if (round.value != null && !Number.isNaN(Number(round.value))) return Number(round.value);
    const raw = round.raw ?? '';
    const m = String(raw).match(/([\d.]+)\s*%/);
    if (m) return Number(m[1]);
  }
  const m = String(round).match(/([\d.]+)\s*%/);
  return m ? Number(m[1]) : null;
}

export function findSchoolRankCriteria(criteria) {
  if (!criteria?.length) return null;
  return (
    criteria.find((c) => c.item === '在校學業') ||
    criteria.find((c) => c.item?.includes('在校學業'))
  );
}

/** Trend points for 在校學業 round1 / round2 cutoffs (%). */
export function buildSchoolRankTrend(historicalData) {
  return historicalData
    .map(({ year, data }) => {
      const crit = findSchoolRankCriteria(data.criteria);
      return {
        year: Number(year),
        round1: parsePercentileValue(crit?.round1 ?? crit?.round1_result),
        round2: parsePercentileValue(crit?.round2 ?? crit?.round2_result),
      };
    })
    .filter((p) => p.round1 != null || p.round2 != null)
    .sort((a, b) => a.year - b.year);
}

/** First-round admitted count per year (錄取人數 — 第一輪). */
export function buildRound1AdmittedTrend(historicalData) {
  return historicalData
    .map(({ year, data }) => {
      const n =
        data.admitted_round1 ?? data.round1_admitted ?? null;
      const val = n != null && n !== '' ? Number(n) : null;
      return {
        year: Number(year),
        value: val != null && !Number.isNaN(val) ? val : null,
      };
    })
    .filter((p) => p.value != null)
    .sort((a, b) => a.year - b.year);
}

export function historicalHasPractical(historicalData) {
  return historicalData.some(({ data }) =>
    data.practical_reqs?.some((req) => formatPracticalReq(req))
  );
}

/** Group flat filtered index rows by school_id (already sorted by school). */
export function groupIndexBySchool(filteredIndex) {
  const groups = [];
  for (const entry of filteredIndex) {
    const last = groups[groups.length - 1];
    if (!last || last.school_id !== entry.school_id) {
      groups.push({
        school_id: entry.school_id,
        school_name: entry.displayDept.school_name || '未知學校',
        entries: [entry],
      });
    } else {
      last.entries.push(entry);
    }
  }
  return groups;
}

export function compactRequirementRows(requirements) {
  return (requirements ?? [])
    .map((req) => {
      const label = formatRequirement(req);
      if (!label) return null;
      return { subject: req.subject, label };
    })
    .filter(Boolean);
}

export function compactPracticalRows(practical_reqs) {
  return (practical_reqs ?? [])
    .map((req) => {
      const label = formatPracticalReq(req);
      if (!label) return null;
      return { item: req.item, label };
    })
    .filter(Boolean);
}

export function compactCriteriaRows(criteria) {
  return (criteria ?? []).map((crit) => ({
    order: crit.order,
    item: crit.item,
    round1: formatCriteriaResult(crit.round1 ?? crit.round1_result),
    round2: formatCriteriaResult(crit.round2 ?? crit.round2_result),
  }));
}

/** 比對頁分發比序：固定 7 個序位，缺項以 — / -- 補齊 */
export const COMPARE_CRITERIA_SLOT_COUNT = 7;

export function criteriaRowsForCompareDisplay(criteria) {
  const rows = compactCriteriaRows(criteria);
  const byOrder = new Map(rows.map((r) => [Number(r.order), r]));
  const result = [];
  for (let order = 1; order <= COMPARE_CRITERIA_SLOT_COUNT; order++) {
    const row = byOrder.get(order);
    result.push(
      row ?? {
        order,
        item: '—',
        round1: '--',
        round2: '--',
      }
    );
  }
  return result;
}

/** Rows with a meaningful result for the selected round (比序有篩到). */
export function filterCriteriaForRound(criteria, round) {
  const field = round === 2 ? 'round2' : 'round1';
  return compactCriteriaRows(criteria).filter(
    (row) => row[field] && row[field] !== '--'
  );
}

function criteriaRowIsUsed(row) {
  return (
    (row.round1 && row.round1 !== '--') || (row.round2 && row.round2 !== '--')
  );
}

/** 裁到該系所當年度最後一個有比序結果的項目（不含後方全為 -- 的列） */
export function trimCriteriaToLastUsed(criteria) {
  const rows = compactCriteriaRows(criteria);
  let lastUsed = -1;
  for (let i = 0; i < rows.length; i++) {
    if (criteriaRowIsUsed(rows[i])) lastUsed = i;
  }
  if (lastUsed < 0) return rows;
  return rows.slice(0, lastUsed + 1);
}

/** 各學年檢定列數上限，用於單一科系頁對齊分發比序起始高度 */
export function getRequirementsBlockMinHeightPx(
  historicalData,
  showPracticalSection
) {
  let maxReq = 0;
  let maxPrac = 0;
  for (const { data } of historicalData) {
    maxReq = Math.max(
      maxReq,
      compactRequirementRows(data?.requirements).length
    );
    if (showPracticalSection) {
      maxPrac = Math.max(
        maxPrac,
        compactPracticalRows(data?.practical_reqs).length
      );
    }
  }
  const titlePx = 22;
  const rowPx = 30;
  const gapPx = 8;
  let h = titlePx + Math.max(maxReq, 1) * rowPx;
  if (showPracticalSection && maxPrac > 0) {
    h += gapPx + titlePx + maxPrac * rowPx;
  }
  return h;
}

/** Points for one department's 在校學業 trend for a single round. */
export function buildRankSeriesForRound(historicalData, round) {
  const trend = buildSchoolRankTrend(historicalData);
  const field = round === 2 ? 'round2' : 'round1';
  return trend
    .map((p) => ({ year: p.year, value: p[field] }))
    .filter((p) => p.value != null);
}

