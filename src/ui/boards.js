// The leaderboards (pass 10 spec 6.1, M63). Pure, apart from the storage helpers, which never throw.
//
// Two boards kept on the device, each the top ten runs, arcade style with three initials:
//   gw:   energy delivered (GWh), most first; any run that ends.
//   full: the time all 48 rows were running (Commissioned), fastest first; only runs that got there.
// Building runs with the finish on count, but not the scripted player and not the tutorial run.
// Saved under localStorage['facops.boards.v1'] as { gw: [...], full: [...], initials: 'ABC' }.

export const BOARDS_KEY = 'facops.boards.v1';
export const TOP = 10;
export const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

const num = (x) => Number.isFinite(x);
const cleanInitials = (s) => (typeof s === 'string' && /^[A-Z]{3}$/.test(s) ? s : null);

// Each board: what ranks it, and whether more is better.
const BOARD = {
  gw: { key: 'gwh', more: true },
  full: { key: 'fullAt', more: false },
};

/** Clean a stored value: anything malformed is dropped. */
export function cleanBoards(raw) {
  const out = { gw: [], full: [], initials: null };
  if (!raw || typeof raw !== 'object') return out;
  out.initials = cleanInitials(raw.initials);
  for (const id of Object.keys(BOARD)) {
    const list = Array.isArray(raw[id]) ? raw[id] : [];
    out[id] = list
      .filter((e) => e && cleanInitials(e.initials) && num(e[BOARD[id].key]) && typeof e.date === 'string')
      .slice(0, TOP);
  }
  return out;
}

/** Does this run go on the boards at all? r: results(state); tutorial: the run had the firsts on. */
export const countsForBoards = (r, { tutorial = false, auto = false } = {}) => Boolean(r.building && r.finish && !tutorial && !auto);

/** The run's entry for each board it qualifies for: { gw, full }, each null when it does not. */
export function entriesFor(r, date) {
  const gw = num(r.energyGwh) && r.energyGwh > 0 ? { gwh: r.energyGwh, score: num(r.score) ? r.score : 0, date } : null;
  const full = r.commissioned && num(r.commissionedAt) ? { fullAt: r.commissionedAt, date } : null;
  return { gw, full };
}

/** Where the value would land on the board (0-based), or null if it misses the top ten. Ties go below. */
export function placeOn(list, id, value) {
  const { key, more } = BOARD[id];
  const better = (e) => (more ? value > e[key] : value < e[key]);
  const i = list.findIndex(better);
  const at = i === -1 ? list.length : i;
  return at < TOP ? at : null;
}

/** The places this run would take: { gw, full } (0-based or null). */
export function placesFor(boards, entries) {
  const b = cleanBoards(boards);
  return {
    gw: entries.gw ? placeOn(b.gw, 'gw', entries.gw.gwh) : null,
    full: entries.full ? placeOn(b.full, 'full', entries.full.fullAt) : null,
  };
}

/** The boards with this run added under these initials (only where it places). Remembers the initials. */
export function addRun(boards, entries, initials) {
  const b = cleanBoards(boards);
  const name = cleanInitials(initials) ?? 'AAA';
  const out = { ...b, initials: name };
  for (const id of Object.keys(BOARD)) {
    const e = entries[id];
    if (!e) continue;
    const at = placeOn(b[id], id, e[BOARD[id].key]);
    if (at === null) continue;
    out[id] = [...b[id].slice(0, at), { ...e, initials: name }, ...b[id].slice(at)].slice(0, TOP);
  }
  return out;
}

/** The results card's line: "#2 for GW delivered · #1 for time to full build", or ''. */
export function placesLine(places) {
  const parts = [];
  if (places.gw !== null && places.gw !== undefined) parts.push(`#${places.gw + 1} for GW delivered`);
  if (places.full !== null && places.full !== undefined) parts.push(`#${places.full + 1} for time to full build`);
  return parts.join(' · ');
}

/** The three letters of the initials picker, stepped: index i up (+1) or down (-1), wrapping. */
export function stepLetter(initials, i, by) {
  const s = (cleanInitials(initials) ?? 'AAA').split('');
  s[i] = LETTERS[(LETTERS.indexOf(s[i]) + by + LETTERS.length) % LETTERS.length];
  return s.join('');
}

/**
 * The boards as rows for the screen: { gw: [{ rank, initials, value, detail, date }], full: [...] }.
 * formatClock: the game's clock text.
 */
export function boardRows(boards, formatClock) {
  const b = cleanBoards(boards);
  const money = (n) => `$${Math.round(n).toLocaleString('en-US')}`;
  return {
    gw: b.gw.map((e, i) => ({ rank: i + 1, initials: e.initials, value: `${e.gwh.toFixed(2)} GWh`, detail: money(e.score ?? 0), date: e.date })),
    full: b.full.map((e, i) => ({ rank: i + 1, initials: e.initials, value: formatClock(e.fullAt), detail: '', date: e.date })),
  };
}

/** Today as the boards show it, "26 Nov" (from a Date). */
export const boardDate = (d) => `${d.getDate()} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()]}`;

export function loadBoards(storage) {
  try {
    const raw = storage?.getItem(BOARDS_KEY);
    return cleanBoards(raw ? JSON.parse(raw) : null);
  } catch {
    return cleanBoards(null);
  }
}

export function saveBoards(boards, storage) {
  try {
    if (!storage) return false;
    storage.setItem(BOARDS_KEY, JSON.stringify(cleanBoards(boards)));
    return true;
  } catch {
    return false;
  }
}
