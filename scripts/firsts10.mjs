// Pass 10 spec 2.5 (M59): a first run's firsts, scripted, on the first run's gentler rules (M60). The game holds while a pause card shows, so
// closing it at once costs no game time; the held time is the cards times a reading time.
//   node scripts/firsts10.mjs [seeds] [read seconds]
import { playRun } from '../src/core/index2.js';
import { closeFirst, createFirsts, updateFirsts } from '../src/ui/firsts.js';

const seeds = Number(process.argv[2] ?? 12);
const read = Number(process.argv[3] ?? 4);
const clock = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const median = (xs) => { const v = [...xs].sort((a, b) => a - b); const m = v.length >> 1; return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2; };

const counts = [];
const lasts = [];
const order = {};
let notes = 0;
for (let seed = 1; seed <= seeds; seed++) {
  const f = createFirsts();
  let seen = 0;
  const pauses = [];
  playRun({ seed, config: { tutorial: true, building: { enabled: true } }, builder: 'builder', policy: 'none', maxSeconds: 1800, onStep: (s) => {
    const events = s.events.slice(seen);
    seen = s.events.length;
    const out = updateFirsts(f, s, events);
    if (out.pause) { pauses.push({ id: out.pause.id, t: s.t }); closeFirst(f, s); }
  } });
  notes += f.seen.size - pauses.length;
  counts.push(pauses.length);
  lasts.push(pauses.length ? pauses[pauses.length - 1].t : 0);
  for (const p of pauses) (order[p.id] ??= []).push(p.t);
}
console.log(`${seeds} first runs (compute first), reading ${read} s a card:`);
console.log(`  pause cards: median ${median(counts)} (${Math.min(...counts)} to ${Math.max(...counts)}); held: median ${clock(median(counts) * read)}; last card at a median ${clock(median(lasts))} (latest ${clock(Math.max(...lasts))}); notes: ${(notes / seeds).toFixed(1)} a run`);
for (const [id, ts] of Object.entries(order).sort((a, b) => median(a[1]) - median(b[1]))) console.log(`  ${id}: ${ts.length}/${seeds} runs, at a median ${clock(median(ts))}`);
