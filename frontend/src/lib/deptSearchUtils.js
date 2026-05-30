/** 搜尋用：台／臺、大小寫統一 */
export function normalizeSearchText(text) {
  return String(text ?? '')
    .replace(/台/g, '臺')
    .toLowerCase()
    .trim();
}

/** 去掉空白與常見間隔符，讓「臺灣大學法律」能對到「臺灣大學 法律學系」 */
export function compactSearchText(text) {
  return normalizeSearchText(text).replace(/[\s·．・\-—／/|｜,，、]/g, '');
}

/** 以空白切詞；無字串時回傳空陣列（代表不篩關鍵字） */
export function searchTokens(term) {
  const normalized = normalizeSearchText(term);
  if (!normalized) return [];
  return normalized.split(/\s+/).filter(Boolean);
}

function tokenMatchesHaystack(token, haystack, compactHaystack) {
  const compactTok = compactSearchText(token);
  return (
    haystack.includes(token) ||
    (compactTok.length > 0 && compactHaystack.includes(compactTok))
  );
}

/**
 * 多關鍵字 AND 比對。
 * 支援「臺灣大學 法律」與連續輸入「臺灣大學法律」（略過學校／系名間空白）。
 */
export function matchesDepartmentSearch(
  { schoolName = '', deptName = '', deptId = '', extra = [] },
  term
) {
  const tokens = searchTokens(term);
  if (tokens.length === 0) return true;

  const parts = [schoolName, deptName, deptId, ...extra];
  const haystack = normalizeSearchText(parts.join(' '));
  const compactHaystack = compactSearchText(parts.join(''));

  return tokens.every((tok) =>
    tokenMatchesHaystack(tok, haystack, compactHaystack)
  );
}
