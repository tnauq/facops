// Pass 10 spec 4 (M61): when each part of a first run's screen appears, and whether the compute-first
// builder ever wants a spot the first run does not show yet (it would be stuck if a player were).
//   node scripts/opening10.mjs [seeds]
import { EQUIPMENT_BY_ID, playRun, spotState } from '../src/core/index2.js';
import { nextWanted } from '../src/core/builder.js';
import { closeFirst, createFirsts, updateFirsts } from '../src/ui/firsts.js';
import { openingModel, updateOpening } from '../src/ui/opening.js';

const seeds = Number(process.argv[2] ?? 12);
const clock = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const median = (xs) => { const v = [...xs].sort((a, b) => a - b); const m = v.length >> 1; return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2; };

const at = {};
let blocked = 0;
const blockedIds = {};
for (let seed = 1; seed <= seeds; seed++) {
  const f = createFirsts();
  let seen = 0;
  let lastCheck = -1;
  playRun({ seed, config: { tutorial: true, building: { enabled: true } }, builder: 'builder', policy: 'none', maxSeconds: 1800, onStep: (s) => {
    const events = s.events.slice(seen);
    seen = s.events.length;
    const out = updateFirsts(f, s, events);
    if (out.pause) closeFirst(f, s);
    for (const part of updateOpening(f, s)) (at[part] ??= []).push(s.t);
    if (Math.floor(s.t) === lastCheck) return;
    lastCheck = Math.floor(s.t);
    const id = nextWanted(s, 'builder');
    if (id && spotState(s, id) === 'empty' && !openingModel(f).spot(id)) {
      blocked++;
      blockedIds[id] = (blockedIds[id] ?? 0) + 1;
    }
  } });
}
console.log(`${seeds} first runs (compute first):`);
for (const [part, ts] of Object.entries(at).sort((a, b) => median(a[1]) - median(b[1]))) console.log(`  ${part}: ${ts.length}/${seeds} runs, at a median ${clock(median(ts))} (earliest ${clock(Math.min(...ts))})`);
console.log(`  seconds the builder wanted a hidden spot: ${blocked}`, blockedIds);
