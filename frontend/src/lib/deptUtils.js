/** Strip 【外加】 suffix for cross-year department matching. */
export function normalizeDeptName(name) {
  return (name || '').replace(/【外加】/g, '').trim();
}

/** Standard display order for academic groups. */
export const GROUP_ORDER = [
  '第一類學群',
  '第二類學群',
  '第三類學群',
  '第四類學群',
  '第五類學群',
  '第六類學群',
  '第七類學群',
  '第八類學群',
  '不分學群',
  '未知學群',
];

const GROUP_LABELS = {
  '第一類學群': '第一類學群 (文法商)',
  '第二類學群': '第二類學群 (理工)',
  '第三類學群': '第三類學群 (生醫)',
  '第四類學群': '第四類學群 (建築/design)',
  '第五類學群': '第五類學群 (藝術)',
  '第六類學群': '第六類學群 (歷史/geo)',
  '第七類學群': '第七類學群 (哲學/宗教)',
  '第八類學群': '第八類學群 (醫牙)',
  '不分學群': '不分學群',
  '未知學群': '未知學群',
};

export function getGroupLabel(group) {
  return GROUP_LABELS[group] ?? group;
}

export function buildGroupOptions(departments) {
  const present = new Set(
    departments.map((d) => d.group || '未知學群')
  );
  return GROUP_ORDER.filter((g) => present.has(g));
}

export function groupBadgeClass(group) {
  if (group === '第八類學群') return 'bg-red-100 text-red-700';
  if (group === '未知學群' || !group) return 'bg-gray-100 text-gray-600';
  return 'bg-blue-100 text-blue-700';
}

/** Unique key within a single year's dataset (handles duplicate dept_id). */
export function deptRowKey(dept) {
  return `${dept.dept_id}::${dept.dept_name}`;
}

/** Identity key treating 一般/外加 as one department. */
export function deptIdentityKey(dept) {
  return `${dept.school_id}::${normalizeDeptName(dept.dept_name)}`;
}

export function countUniqueDepartments(departments) {
  return new Set(departments.map(deptIdentityKey)).size;
}

/** Match departments across years by school + normalized name + quota type. */
export function deptMatches(anchor, candidate) {
  if (!anchor || !candidate) return false;
  if (anchor.school_id !== candidate.school_id) return false;
  if (Boolean(anchor.is_extra_quota) !== Boolean(candidate.is_extra_quota)) return false;
  return normalizeDeptName(anchor.dept_name) === normalizeDeptName(candidate.dept_name);
}

export function findDeptInYear(yearData, anchor) {
  if (!yearData || !anchor) return undefined;
  return yearData.find((dept) => deptMatches(anchor, dept));
}

export function getHistoricalData(yearCache, availableYears, anchor) {
  if (!anchor) return [];

  return availableYears
    .filter((year) => yearCache[year])
    .sort((a, b) => Number(b) - Number(a))
    .map((year) => ({
      year,
      data: findDeptInYear(yearCache[year], anchor),
    }))
    .filter((item) => item.data);
}

/** Recruitment quota (招生名額). */
export function getQuota(dept) {
  if (!dept) return '-';
  const { quota } = dept;
  return quota != null && quota !== '' ? quota : '-';
}

/** Total admitted count (錄取人數). */
export function getAdmittedTotal(dept) {
  if (!dept) return '-';
  return dept.admitted_total ?? dept.admitted ?? '-';
}

export function formatCriteriaResult(round) {
  if (!round) return '--';
  if (typeof round === 'string') return round;
  return round.raw ?? String(round.value ?? '--');
}

export function formatRequirement(req) {
  const standard = req.standard ?? '--';
  if (standard === '--') return null;
  const level = req.min_level ?? req.score?.replace?.(/[^\d]/g, '');
  return level ? `${standard} (${level}級分)` : standard;
}

export function formatPracticalReq(req) {
  const standard = req.standard ?? req.score ?? '--';
  if (!standard || standard === '--') return null;
  return standard;
}
