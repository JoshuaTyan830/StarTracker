export async function fetchYearData(year) {
  const res = await fetch(`/data/stars/${year}.json`);
  if (!res.ok) throw new Error(`Failed to load ${year}: ${res.status}`);
  return res.json();
}

export async function fetchManifest() {
  try {
    const res = await fetch('/data/manifest.json');
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function loadYearIntoCache(year, setYearCache, setLoadError, cancelledRef) {
  const res = await fetchYearData(year);
  if (cancelledRef?.current) return;
  setYearCache((prev) => ({ ...prev, [year]: res }));
  setLoadError(null);
}
