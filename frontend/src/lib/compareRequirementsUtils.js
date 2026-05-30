import {
  compactPracticalRows,
  compactRequirementRows,
} from './historyUtils';

/** 學測檢定科目慣用排序 */
const GSAT_SUBJECT_ORDER = [
  '國文',
  '英文',
  '數學A',
  '數學B',
  '社會',
  '自然',
];

function subjectSortIndex(subject) {
  const i = GSAT_SUBJECT_ORDER.indexOf(subject);
  return i >= 0 ? i : GSAT_SUBJECT_ORDER.length + subject.charCodeAt(0);
}

/** 檢定／英聽難度色階 id（最嚴 → 最寬） */
export function getRequirementColorLevel(label, subject = '') {
  if (!label) return 'none';
  if (subject === '英聽' || (/英聽/.test(label) && !/[頂前均後底]標/.test(label))) {
    const t = label.trim();
    const grade =
      t.match(/^([ABCF])(?:級|\s|（|\(|$)/i)?.[1]?.toUpperCase() ??
      t.match(/([ABCF])級/i)?.[1]?.toUpperCase();
    if (grade === 'A') return 'top';
    if (grade === 'B') return 'front';
    if (grade === 'C') return 'mid';
    if (grade === 'F') return 'base';
    return 'plain';
  }
  const standard = label.split(/[\s(]/)[0] ?? '';
  if (standard.includes('頂標')) return 'top';
  if (standard.includes('前標')) return 'front';
  if (standard.includes('均標')) return 'mid';
  if (standard.includes('後標')) return 'back';
  if (standard.includes('底標')) return 'base';
  return 'plain';
}

const LEVEL_BADGE_CLASS = {
  top: 'bg-red-100 text-red-900 ring-1 ring-red-300/80 font-bold',
  front: 'bg-orange-100 text-orange-900 ring-1 ring-orange-300/80 font-semibold',
  mid: 'bg-yellow-100 text-yellow-900 ring-1 ring-yellow-400/70 font-semibold',
  back: 'bg-lime-100 text-lime-900 ring-1 ring-lime-400/70 font-medium',
  base: 'bg-green-100 text-green-900 ring-1 ring-green-300/70 font-medium',
  plain: 'bg-gray-100 text-gray-800 ring-1 ring-gray-200/80 font-medium',
  none: '',
};

/** 色塊標籤（比純文字色更易辨識） */
export function requirementLabelBadgeClass(label, subject = '') {
  const level = getRequirementColorLevel(label, subject);
  const tone = LEVEL_BADGE_CLASS[level] ?? LEVEL_BADGE_CLASS.plain;
  return `inline-block max-w-full px-2 py-0.5 rounded-md text-xs leading-snug ${tone}`;
}

/** @deprecated 請改用 requirementLabelBadgeClass */
export function standardToneClass(standard) {
  return requirementLabelBadgeClass(standard ? `${standard}` : '', '');
}

export function requirementLabelToneClass(label, subject = '') {
  return requirementLabelBadgeClass(label, subject);
}

/** 名額／錄取列：兩種檢視模式共用高度 */
export const QUOTA_ROW_CELL_CLASS =
  'py-2.5 px-2 text-xs text-gray-600 text-center bg-gray-50/40 border-b border-gray-100 leading-snug min-h-[2.35rem] flex items-center justify-center tabular-nums';

export function formatQuotaAdmittedLine(data) {
  if (!data) return null;
  const quota = data.quota != null && data.quota !== '' ? data.quota : '—';
  const admitted =
    data.admitted_total ?? data.admitted ?? '—';
  return `名額 ${quota} · 錄取 ${admitted}`;
}

/**
 * 單一學年：左側科目列 + 各校系僅顯示檢定結果
 * @returns {{ gsatRows: { subject, cells }[], practicalRows: { subject, cells }[] }}
 */
export function buildYearRequirementsRows(year, itemBlocks) {
  const gsatMap = new Map();

  for (const block of itemBlocks) {
    const data = block.byYear[String(year)];
    if (!data) continue;

    for (const row of compactRequirementRows(data.requirements)) {
      let entry = gsatMap.get(row.subject);
      if (!entry) {
        entry = { subject: row.subject, cells: {} };
        gsatMap.set(row.subject, entry);
      }
      entry.cells[block.item.key] = row.label;
    }
  }

  const gsatRows = [...gsatMap.values()].sort(
    (a, b) => subjectSortIndex(a.subject) - subjectSortIndex(b.subject)
  );

  const practicalRows = [];
  for (const block of itemBlocks) {
    const data = block.byYear[String(year)];
    if (!data) continue;
    for (const row of compactPracticalRows(data.practical_reqs)) {
      const key = `prac::${row.item}`;
      let entry = practicalRows.find((r) => r.key === key);
      if (!entry) {
        entry = { key, subject: row.item, cells: {}, isPractical: true };
        practicalRows.push(entry);
      }
      entry.cells[block.item.key] = row.label;
    }
  }

  return { gsatRows, practicalRows };
}
