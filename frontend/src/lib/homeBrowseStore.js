const STORAGE_KEY = 'startracker_home_browse';

export function loadHomeBrowseState() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return {
      searchTerm:
        typeof parsed.searchTerm === 'string' ? parsed.searchTerm : '',
      presenceYear:
        typeof parsed.presenceYear === 'string' ? parsed.presenceYear : null,
      selectedGroupIds: Array.isArray(parsed.selectedGroupIds)
        ? parsed.selectedGroupIds.filter((g) => typeof g === 'string')
        : [],
      selectedSchoolIds: Array.isArray(parsed.selectedSchoolIds)
        ? parsed.selectedSchoolIds.filter((id) => typeof id === 'string')
        : [],
    };
  } catch {
    return null;
  }
}

export function saveHomeBrowseState({
  searchTerm,
  presenceYear,
  selectedGroupIds,
  selectedSchoolIds,
}) {
  try {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        searchTerm: searchTerm ?? '',
        presenceYear: presenceYear ?? null,
        selectedGroupIds: [...(selectedGroupIds ?? [])],
        selectedSchoolIds: [...(selectedSchoolIds ?? [])],
      })
    );
  } catch {
    /* ignore quota / private mode */
  }
}
