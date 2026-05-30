/** @param {{ school_name?: string, dept_name?: string }} anchor */
export function splitCompareAnchor(anchor, label = '') {
  const school = anchor?.school_name || '';
  let dept = (anchor?.dept_name || '').replace(/【外加】/g, '').trim();
  const labelStr = typeof label === 'string' ? label : '';

  if (school && dept) return { school, dept };

  if (school && labelStr.includes(school)) {
    return { school, dept: labelStr.replace(school, '').trim() || dept };
  }

  const parts = labelStr.trim().split(/\s+/);
  if (parts.length >= 2) {
    return { school: parts[0], dept: parts.slice(1).join(' ') };
  }

  return { school: school || labelStr, dept };
}
