// The best score (spec section 10): saved under localStorage['facops.best.v1'] as
// { energyGwh, seconds }. Better means more energy delivered; on a tie, the longer round.
// Storage is optional: if it is blocked or broken the game carries on without a saved best.

export const BEST_KEY = 'facops.best.v1';
export const BEST2_KEY = 'facops.best.v2'; // pass 2 keeps its own best: a 300 MW run scores differently
export const BEST4_KEY = 'facops.best.v4'; // pass 4 building mode: the score is money earned
export const BEST5_KEY = 'facops.best.v5'; // pass 5 (M34): the score is money earned plus the sale price

const valid = (b) => b !== null && typeof b === 'object' && Number.isFinite(b.energyGwh) && Number.isFinite(b.seconds);

/**
 * Pure: the better of the old best (or null) and this round. Returns { best, isNew }. In building
 * mode (round.building) the score is money earned, kept as `earned` beside the energy.
 */
export function recordBest(previous, round) {
  const money = Boolean(round.building);
  // Pass 5 (spec 5.2): a round with a score (earned plus any sale) is judged on it.
  const scored = money && Number.isFinite(round.score);
  const entry = money ? { energyGwh: round.energyGwh, seconds: round.seconds, earned: round.earned } : { energyGwh: round.energyGwh, seconds: round.seconds };
  if (scored) entry.score = round.score;
  if (!valid(previous) || (money && !Number.isFinite(previous.earned)) || (scored && !Number.isFinite(previous.score))) return { best: entry, isNew: true };
  const score = (b) => (scored ? b.score : money ? b.earned : b.energyGwh);
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
    const out = { energyGwh: parsed.energyGwh, seconds: parsed.seconds };
    if (Number.isFinite(parsed.earned)) out.earned = parsed.earned;
    if (Number.isFinite(parsed.score)) out.score = parsed.score;
    return out;
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
    if (Number.isFinite(best.score)) out.score = best.score;
    storage.setItem(key, JSON.stringify(out));
    return true;
  } catch {
    return false;
  }
}

/** Short text for the overlays, e.g. "1.92 GWh in 4:12", or "$12,345 in 9:12" in building mode. */
export function bestText(best, formatClock) {
  if (!valid(best)) return 'None yet';
  if (Number.isFinite(best.score)) return `$${Math.round(best.score).toLocaleString('en-US')} in ${formatClock(best.seconds)}`;
  if (Number.isFinite(best.earned)) return `$${Math.round(best.earned).toLocaleString('en-US')} in ${formatClock(best.seconds)}`;
  return `${best.energyGwh.toFixed(2)} GWh in ${formatClock(best.seconds)}`;
}

/**
 * The start card's best in building mode (pass 5 spec 5.2): the pass 5 score, or, before any pass 5
 * run, the old best labelled with the older rules (money earned only).
 */
export function buildingBestText(best5, best4, formatClock) {
  if (valid(best5)) return bestText(best5, formatClock);
  if (valid(best4) && Number.isFinite(best4.earned)) return `${bestText(best4, formatClock)} (older rules: money earned)`;
  return 'None yet';
}
