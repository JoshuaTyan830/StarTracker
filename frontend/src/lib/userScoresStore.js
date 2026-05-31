import { emptyUserScores, hasAnyUserScore } from './gsatConversion';

const STORAGE_KEY = 'startracker_user_scores';

function normalizeScores(raw) {
  const base = emptyUserScores();
  if (!raw || typeof raw !== 'object') {
    return { ...base, qualFilterEnabled: false };
  }

  const scores = { ...base.scores };
  if (raw.scores && typeof raw.scores === 'object') {
    for (const [key, val] of Object.entries(raw.scores)) {
      if (key in scores && (typeof val === 'string' || typeof val === 'number')) {
        scores[key] = String(val);
      }
    }
  }

  const listening =
    typeof raw.listening === 'string' ? raw.listening.toUpperCase() : '';

  return {
    scores,
    listening: ['A', 'B', 'C', 'F'].includes(listening) ? listening : '',
    qualFilterEnabled: Boolean(raw.qualFilterEnabled),
  };
}

export function loadUserScores() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return normalizeScores(null);
    return normalizeScores(JSON.parse(raw));
  } catch {
    return normalizeScores(null);
  }
}

export function saveUserScores(state) {
  try {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        scores: state.scores ?? emptyUserScores().scores,
        listening: state.listening ?? '',
        qualFilterEnabled: Boolean(state.qualFilterEnabled),
      })
    );
  } catch {
    /* ignore */
  }
}

export { hasAnyUserScore };
