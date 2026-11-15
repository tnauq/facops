// The best score (spec section 10): saved under localStorage['facops.best.v1'] as
// { energyGwh, seconds }. Better means more energy delivered; on a tie, the longer round.
// Storage is optional: if it is blocked or broken the game carries on without a saved best.

export const BEST_KEY = 'facops.best.v1';
export const BEST2_KEY = 'facops.best.v2'; // pass 2 keeps its own best: a 300 MW run scores differently
export const BEST4_KEY = 'facops.best.v4'; // pass 4 building mode: the score is money earned

const valid = (b) => b !== null && typeof b === 'object' && Number.isFinite(b.energyGwh) && Number.isFinite(b.seconds);

/**
 * Pure: the better of the old best (or null) and this round. Returns { best, isNew }. In building
 * mode (round.building) the score is money earned, kept as `earned` beside the energy.
 */
export function recordBest(previous, round) {
  const money = Boolean(round.building);
  const entry = money ? { energyGwh: round.energyGwh, seconds: round.seconds, earned: round.earned } : { energyGwh: round.energyGwh, seconds: round.seconds };
  if (!valid(previous) || (money && !Number.isFinite(previous.earned))) return { best: entry, isNew: true };
  const score = (b) => (money ? b.earned : b.energyGwh);
  const better = score(entry) > score(previous) || (score(entry) === score(previous) && entry.seconds > previous.seconds);
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
export function loadBest(storage = defaultStorage(), key = BEST_KEY) {
  try {
    const raw = storage?.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!valid(parsed)) return null;
    return Number.isFinite(parsed.earned) ? { energyGwh: parsed.energyGwh, seconds: parsed.seconds, earned: parsed.earned } : { energyGwh: parsed.energyGwh, seconds: parsed.seconds };
  } catch {
    return null;
  }
}

/** Save a best score. Returns true if it was written. */
export function saveBest(best, storage = defaultStorage(), key = BEST_KEY) {
  try {
    if (!storage) return false;
    const out = { energyGwh: best.energyGwh, seconds: best.seconds };
    if (Number.isFinite(best.earned)) out.earned = best.earned;
    storage.setItem(key, JSON.stringify(out));
    return true;
  } catch {
    return false;
  }
}

/** Short text for the overlays, e.g. "1.92 GWh in 4:12", or "$12,345 in 9:12" in building mode. */
export function bestText(best, formatClock) {
  if (!valid(best)) return 'None yet';
  if (Number.isFinite(best.earned)) return `$${Math.round(best.earned).toLocaleString('en-US')} in ${formatClock(best.seconds)}`;
  return `${best.energyGwh.toFixed(2)} GWh in ${formatClock(best.seconds)}`;
}
