import { useCallback, useEffect, useRef, useState } from 'react';
import { DEFAULT_REFERENCE_YEAR, DEFAULT_YEARS } from '../lib/constants';
import { fetchManifest, fetchYearData, loadYearIntoCache } from '../lib/starDataApi';

export function useStarData() {
  const [availableYears, setAvailableYears] = useState(DEFAULT_YEARS);
  const [referenceYear, setReferenceYear] = useState(DEFAULT_REFERENCE_YEAR);
  const [yearCache, setYearCache] = useState({});
  const [loadError, setLoadError] = useState(null);
  const [manifestStats, setManifestStats] = useState(null);
  const [manifestSchoolNames, setManifestSchoolNames] = useState({});
  const inflightRef = useRef(new Set());
  const yearCacheRef = useRef({});
  const cancelledRef = useRef(false);

  useEffect(() => {
    yearCacheRef.current = yearCache;
  }, [yearCache]);

  useEffect(() => {
    fetchManifest().then((manifest) => {
      if (manifest?.years?.length) {
        const years = manifest.years.map(String);
        setAvailableYears(years);
        setReferenceYear((prev) =>
          years.includes(prev) ? prev : years[0]
        );
      }
      if (manifest?.stats) setManifestStats(manifest.stats);
      if (manifest?.school_names) setManifestSchoolNames(manifest.school_names);
    });
  }, []);

  useEffect(() => {
    cancelledRef.current = false;
    const year = referenceYear;

    if (yearCache[year] || inflightRef.current.has(year)) {
      return () => {
        cancelledRef.current = true;
      };
    }

    inflightRef.current.add(year);
    loadYearIntoCache(year, setYearCache, setLoadError, cancelledRef)
      .catch((err) => {
        if (!cancelledRef.current) setLoadError(err.message);
      })
      .finally(() => inflightRef.current.delete(year));

    return () => {
      cancelledRef.current = true;
    };
  }, [referenceYear, yearCache]);

  useEffect(() => {
    if (!yearCache[referenceYear]) return undefined;

    let cancelled = false;

    (async () => {
      for (const year of availableYears) {
        if (cancelled) return;
        if (yearCacheRef.current[year] || inflightRef.current.has(year)) continue;

        inflightRef.current.add(year);
        try {
          const data = await fetchYearData(year);
          if (cancelled) return;
          setYearCache((prev) => ({ ...prev, [year]: data }));
        } catch {
          // ignore
        } finally {
          inflightRef.current.delete(year);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [yearCache[referenceYear], availableYears, referenceYear]);

  const ensureYearsForAnchors = useCallback(
    (anchors) => {
      if (!anchors?.length) return undefined;

      let cancelled = false;

      (async () => {
        for (const year of availableYears) {
          if (cancelled) return;
          if (yearCacheRef.current[year] || inflightRef.current.has(year)) continue;

          inflightRef.current.add(year);
          try {
            const data = await fetchYearData(year);
            if (cancelled) return;
            setYearCache((prev) => ({ ...prev, [year]: data }));
          } catch {
            // ignore
          } finally {
            inflightRef.current.delete(year);
          }
        }
      })();

      return () => {
        cancelled = true;
      };
    },
    [availableYears, setYearCache]
  );

  return {
    availableYears,
    referenceYear,
    setReferenceYear,
    yearCache,
    setYearCache,
    loadError,
    manifestStats,
    manifestSchoolNames,
    ensureYearsForAnchors,
    yearCacheRef,
    inflightRef,
  };
}
