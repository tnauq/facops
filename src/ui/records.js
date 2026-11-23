// The two records of a game you win (pass 9 spec 3.2, M54): the fastest win and the high score.
// Saved under localStorage['facops.records.v9'] as { high: { score, seconds } | null, fastest:
// { wonAt, score } | null }. Pure apart from the storage helpers, which never throw.

export const RECORDS_KEY = 'facops.records.v9';

const money = (n) => `$${Math.round(n).toLocaleString('en-US')}`;
const num = (x) => Number.isFinite(x);

/** Clean a stored value: anything malformed becomes null. */
export function cleanRecords(raw) {
  const out = { high: null, fastest: null, level: null };
  if (!raw || typeof raw !== 'object') return out;
  if (num(raw.level) && raw.level >= 1) out.level = raw.level; // pass 9 (M56): the best endurance level
  if (raw.high && num(raw.high.score) && num(raw.high.seconds)) out.high = { score: raw.high.score, seconds: raw.high.seconds };
  if (raw.fastest && num(raw.fastest.wonAt) && num(raw.fastest.score)) out.fastest = { wonAt: raw.fastest.wonAt, score: raw.fastest.score };
  return out;
}

/**
 * The records after this run (results(state) with the finish on). Returns { records, newHigh,
 * newFastest }. Any run can set the high score; only a win can set the fastest win.
 */
export function recordRun(previous, r) {
  const prev = cleanRecords(previous);
  const newHigh = num(r.score) && (!prev.high || r.score > prev.high.score);
  const newFastest = Boolean(r.won) && num(r.wonAt) && (!prev.fastest || r.wonAt < prev.fastest.wonAt);
  const level = r.endurance ? r.endurance.level : null;
  const newLevel = num(level) && (!prev.level || level > prev.level);
  return {
    records: {
      high: newHigh ? { score: r.score, seconds: r.seconds } : prev.high,
      fastest: newFastest ? { wonAt: r.wonAt, score: r.score } : prev.fastest,
      level: newLevel ? level : prev.level,
    },
    newHigh,
    newFastest,
    newLevel,
  };
}

/** The menu's line: "Fastest win 12:40 · High score $182,300 · Endurance level 7", or null with no records yet. */
export function recordsText(records, formatClock) {
  const r = cleanRecords(records);
  const parts = [];
  if (r.fastest) parts.push(`Fastest win ${formatClock(r.fastest.wonAt)}`);
  if (r.high) parts.push(`High score ${money(r.high.score)}`);
  if (r.level) parts.push(`Endurance level ${r.level}`);
  return parts.length ? parts.join(' · ') : null;
}

/** The results card's line: what this run set, else the records to beat. */
export function recordsLine(result, formatClock) {
  if (result.newFastest && result.newHigh) return 'New fastest win and new high score!';
  if (result.newFastest) return 'New fastest win!';
  if (result.newHigh && result.newLevel) return 'New high score and best endurance level!';
  if (result.newHigh) return 'New high score!';
  if (result.newLevel) return 'New best endurance level!';
  return recordsText(result.records, formatClock) ?? '';
}

export function loadRecords(storage, key = RECORDS_KEY) {
  try {
    const raw = storage?.getItem(key);
    return cleanRecords(raw ? JSON.parse(raw) : null);
  } catch {
    return cleanRecords(null);
  }
}

export function saveRecords(records, storage, key = RECORDS_KEY) {
  try {
    if (!storage) return false;
    storage.setItem(key, JSON.stringify(cleanRecords(records)));
    return true;
  } catch {
    return false;
  }
}
