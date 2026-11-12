// The best score (spec section 10): saved under localStorage['facops.best.v1'] as
// { energyGwh, seconds }. Better means more energy delivered; on a tie, the longer round.
// Storage is optional: if it is blocked or broken the game carries on without a saved best.

export const BEST_KEY = 'facops.best.v1';

const valid = (b) => b !== null && typeof b === 'object' && Number.isFinite(b.energyGwh) && Number.isFinite(b.seconds);

/** Pure: the better of the old best (or null) and this round. Returns { best, isNew }. */
export function recordBest(previous, round) {
  const entry = { energyGwh: round.energyGwh, seconds: round.seconds };
  if (!valid(previous)) return { best: entry, isNew: true };
  const better =
    entry.energyGwh > previous.energyGwh || (entry.energyGwh === previous.energyGwh && entry.seconds > previous.seconds);
  return better ? { best: entry, isNew: true } : { best: previous, isNew: false };
}

/** The page's localStorage, or null. Merely touching it can throw in some private modes. */
export function defaultStorage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

/** The saved best, or null if there is none, it is unreadable, or storage is unavailable. */
export function loadBest(storage = defaultStorage()) {
  try {
    const raw = storage?.getItem(BEST_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return valid(parsed) ? { energyGwh: parsed.energyGwh, seconds: parsed.seconds } : null;
  } catch {
    return null;
  }
}

/** Save a best score. Returns true if it was written. */
export function saveBest(best, storage = defaultStorage()) {
  try {
    if (!storage) return false;
    storage.setItem(BEST_KEY, JSON.stringify({ energyGwh: best.energyGwh, seconds: best.seconds }));
    return true;
  } catch {
    return false;
  }
}

/** Short text for the overlays, e.g. "1.92 GWh in 4:12". */
export function bestText(best, formatClock) {
  return valid(best) ? `${best.energyGwh.toFixed(2)} GWh in ${formatClock(best.seconds)}` : 'None yet';
}
