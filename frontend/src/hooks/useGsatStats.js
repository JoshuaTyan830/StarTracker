import { useEffect, useState } from 'react';
import { fetchGsatStats } from '../lib/starDataApi';

let cachedStats = null;
let inflight = null;

export function useGsatStats() {
  const [stats, setStats] = useState(cachedStats);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(!cachedStats);

  useEffect(() => {
    if (cachedStats) {
      setStats(cachedStats);
      setLoading(false);
      return undefined;
    }

    if (!inflight) {
      inflight = fetchGsatStats()
        .then((data) => {
          cachedStats = data;
          return data;
        })
        .finally(() => {
          inflight = null;
        });
    }

    let cancelled = false;

    inflight
      .then((data) => {
        if (!cancelled) {
          setStats(data);
          setError(null);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { stats, loading, error };
}
