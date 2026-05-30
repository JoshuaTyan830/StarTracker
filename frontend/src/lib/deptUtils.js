/** Strip 【外加】 suffix for cross-year department matching. */
export function normalizeDeptName(name) {
  return (name || '').replace(/【外加】/g, '').trim();
}

/** Compare zero-padded numeric codes (e.g. school 001, dept 00101). */
export function compareNumericCodes(a, b) {
  const na = Number(a);
  const nb = Number(b);
  if (!Number.isNaN(na) && !Number.isNaN(nb) && na !== nb) {
    return na - nb;
  }
  return String(a ?? '').localeCompare(String(b ?? ''), undefined, {
    numeric: true,
  });
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
  '第一類學群': '第一類學群（文法商）',
  '第二類學群': '第二類學群（理工）',
  '第三類學群': '第三類學群（生農）',
  '第四類學群': '第四類學群（音樂）',
  '第五類學群': '第五類學群（美術）',
  '第六類學群': '第六類學群（舞蹈）',
  '第七類學群': '第七類學群（體育）',
  '第八類學群': '第八類學群（醫牙）',
  '不分學群': '不分學群',
  '未知學群': '未知學群',
};

/** Discontinued / renumbered schools not present in mapping or v2 names. */
export const LEGACY_SCHOOL_NAMES = {
  '025': '國立陽明大學',
  '111': '台灣首府大學',
  '133': '明道大學',
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

export function buildSchoolOptions(departments) {
  const map = new Map();
  for (const dept of departments) {
    if (!dept.school_id || map.has(dept.school_id)) continue;
    map.set(dept.school_id, {
      school_id: dept.school_id,
      school_name: dept.school_name || '未知學校',
    });
  }
  return Array.from(map.values()).sort((a, b) =>
    compareNumericCodes(a.school_id, b.school_id)
  );
}

/** Pick the best school_name for an index entry, preferring referenceYear then newest. */
export function resolveSchoolNameFromEntry(entry, referenceYear) {
  if (!entry?.years?.length) return null;
  const ordered = [...entry.years].sort((a, b) => {
    if (a === referenceYear) return -1;
    if (b === referenceYear) return 1;
    return Number(b) - Number(a);
  });
  for (const year of ordered) {
    const name = entry.byYear[year]?.school_name;
    if (name) return name;
  }
  return null;
}

/**
 * Build school_id → name from loaded years, static fallbacks, and optional manifest map.
 * Scans every department row so a name on any dept resolves the whole school.
 */
export function buildSchoolNameRegistry(
  yearCache,
  availableYears,
  referenceYear,
  manifestSchoolNames = {}
) {
  const registry = new Map(Object.entries(manifestSchoolNames));
  for (const [sid, name] of Object.entries(LEGACY_SCHOOL_NAMES)) {
    if (!registry.has(sid)) registry.set(sid, name);
  }

  const loadedYears = availableYears.filter((year) => yearCache[year]);
  const ordered = [...loadedYears].sort((a, b) => {
    if (a === referenceYear) return -1;
    if (b === referenceYear) return 1;
    return Number(b) - Number(a);
  });

  for (const year of ordered) {
    for (const dept of yearCache[year]) {
      const sid = dept.school_id;
      const name = dept.school_name;
      if (sid && name && !registry.has(sid)) {
        registry.set(sid, name);
      }
    }
  }

  for (const year of loadedYears) {
    for (const dept of yearCache[year]) {
      const sid = dept.school_id;
      const name = dept.school_name;
      if (sid && name && !registry.has(sid)) {
        registry.set(sid, name);
      }
    }
  }

  return registry;
}

export function resolveSchoolName(schoolId, schoolNameRegistry, entry, referenceYear) {
  if (!schoolId) return '未知學校';
  return (
    schoolNameRegistry.get(schoolId) ||
    resolveSchoolNameFromEntry(entry, referenceYear) ||
    LEGACY_SCHOOL_NAMES[schoolId] ||
    '未知學校'
  );
}

export function buildSchoolOptionsFromIndex(departmentIndex, schoolNameRegistry) {
  const map = new Map();

  for (const entry of departmentIndex) {
    if (!entry.school_id || map.has(entry.school_id)) continue;
    map.set(entry.school_id, {
      school_id: entry.school_id,
      school_name: resolveSchoolName(
        entry.school_id,
        schoolNameRegistry,
        entry,
        null
      ),
    });
  }

  return Array.from(map.values()).sort((a, b) =>
    compareNumericCodes(a.school_id, b.school_id)
  );
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

/** Index key for unified list (一般/外加 shown as separate rows). */
export function deptIndexKey(dept) {
  return `${dept.school_id}::${normalizeDeptName(dept.dept_name)}::${Boolean(dept.is_extra_quota)}`;
}

export function deptToAnchor(dept) {
  return {
    school_id: dept.school_id,
    school_name: dept.school_name,
    dept_id: dept.dept_id,
    dept_name: dept.dept_name,
    is_extra_quota: dept.is_extra_quota,
  };
}

/**
 * Merge loaded year datasets into a unified department index.
 * displayDept uses referenceYear when available, otherwise the newest loaded year.
 */
export function buildDepartmentIndex(
  yearCache,
  availableYears,
  referenceYear,
  schoolNameRegistry = new Map()
) {
  const map = new Map();
  const loadedYears = availableYears.filter((year) => yearCache[year]);

  for (const year of loadedYears) {
    for (const dept of yearCache[year]) {
      const key = deptIndexKey(dept);
      let entry = map.get(key);
      if (!entry) {
        entry = {
          key,
          school_id: dept.school_id,
          is_extra_quota: Boolean(dept.is_extra_quota),
          years: [],
          byYear: {},
        };
        map.set(key, entry);
      }
      if (!entry.byYear[year]) {
        entry.years.push(year);
        entry.byYear[year] = dept;
      }
    }
  }

  return Array.from(map.values())
    .map((entry) => {
      entry.years.sort((a, b) => Number(b) - Number(a));
      const display =
        entry.byYear[referenceYear] ?? entry.byYear[entry.years[0]];
      if (!display) return null;
      const school_name = resolveSchoolName(
        entry.school_id,
        schoolNameRegistry,
        entry,
        referenceYear
      );
      const enrichedDisplay = { ...display, school_name };
      return {
        ...entry,
        displayDept: enrichedDisplay,
        anchor: deptToAnchor(enrichedDisplay),
      };
    })
    .filter(Boolean)
    .sort((a, b) => {
      const bySchool = compareNumericCodes(a.school_id, b.school_id);
      if (bySchool !== 0) return bySchool;

      const byDept = compareNumericCodes(
        a.displayDept.dept_id,
        b.displayDept.dept_id
      );
      if (byDept !== 0) return byDept;

      if (a.is_extra_quota !== b.is_extra_quota) {
        return a.is_extra_quota ? 1 : -1;
      }
      return 0;
    });
}

export function getDisplayDeptForYear(entry, referenceYear) {
  if (!entry) return undefined;
  return entry.byYear[referenceYear] ?? entry.displayDept;
}

export function formatYearsCoverage(years, availableYears) {
  if (!years?.length) return '-';
  const total = availableYears?.length ?? years.length;
  if (years.length === total) return `完整 ${total} 年`;
  const sorted = [...years].sort((a, b) => Number(a) - Number(b));
  if (years.length === 1) return `${sorted[0]} 年`;
  return `${sorted[0]}–${sorted[sorted.length - 1]}（${years.length} 年）`;
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
