// Pass 8 spec 5.2 (M48): busy and quiet spells against none. Director picks a minute (within a tenth
// of today's), and building windows: gaps of 15 s or more with no new pick, per 10 minutes.
//   node scripts/spells8.mjs [seeds] [config JSON for the spells run]
import { playRun } from '../src/core/index2.js';

const seeds = Number(process.argv[2] ?? 12);
const extra = JSON.parse(process.argv[3] ?? '{}');
const base = { tutorial: false, building: { enabled: true } };
const OFF = { enabled: false, busy: [35, 45], quiet: [15, 25], busyFactor: 0.67, easeAfter: 10 };
const make = (spells) => ({ ...base, ...extra, building: { ...base.building, ...(extra.building ?? {}), ...(spells ? {} : { spells: OFF }) } });

for (const [name, config] of [['No spells', make(false)], ['Spells', make(true)]]) {
  let picks = 0;
  let minutes = 0;
  let windows = 0;
  let len = 0;
  for (let seed = 1; seed <= seeds; seed++) {
    const r = playRun({ seed, config, builder: 'builder', policy: 'none', maxSeconds: 1800 });
    const times = r.state.events.filter((e) => e.type === 'warning').map((e) => e.t);
    picks += times.length;
    const span = (r.state.t - 20) / 60;
    minutes += span;
    for (let i = 0; i + 1 < times.length; i++) if (times[i + 1] - times[i] >= 15) windows += 1;
    len += r.seconds;
  }
  console.log(`| ${name} | ${(picks / minutes).toFixed(2)} picks a minute | ${((windows / minutes) * 10).toFixed(1)} building windows per 10 min | run ${(len / seeds / 60).toFixed(1)} min |`);
}
