import { deptIndexKey } from './deptUtils';

const STORAGE_KEY = 'startracker_compare';

export function makeCompareLabel(anchor) {
  const school = anchor.school_name || '未知學校';
  const dept = anchor.dept_name || '';
  return `${school} ${dept}`.trim();
}

export function makeCompareItem(anchor) {
  return {
    key: deptIndexKey(anchor),
    anchor: {
      school_id: anchor.school_id,
      school_name: anchor.school_name,
      dept_id: anchor.dept_id,
      dept_name: anchor.dept_name,
      is_extra_quota: anchor.is_extra_quota,
    },
    label: makeCompareLabel(anchor),
  };
}

export function isValidCompareItem(item) {
  const a = item?.anchor;
  return Boolean(item?.key && a?.dept_id && a?.school_id != null && a?.school_id !== '');
}

export function normalizeCompareItem(item) {
  if (!isValidCompareItem(item)) return null;
  const a = item.anchor;
  const school = a.school_name || '未知學校';
  const dept = a.dept_name || '';
  const label =
    item.label && String(item.label).trim()
      ? item.label
      : makeCompareLabel({ ...a, school_name: school, dept_name: dept });
  return {
    key: item.key,
    anchor: {
      school_id: a.school_id,
      school_name: school,
      dept_id: a.dept_id,
      dept_name: dept,
      is_extra_quota: Boolean(a.is_extra_quota),
    },
    label,
  };
}

export function loadCompareItems() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeCompareItem).filter(Boolean);
  } catch {
    return [];
  }
}

export function saveCompareItems(items) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function clearCompareStorage() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
