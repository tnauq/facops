// Minute-by-minute pressure profile. Not part of the game. Run with:
//   node scripts/profile.mjs [seeds] [config JSON] [player: good|slow|veryslow]
// For each minute of a run: halls online, crew, alarms open, alarms started that minute, the share
// of time with more alarms waiting than free techs, and how many runs were still going.
import { playRun } from '../src/core/index2.js';

const seeds = Number(process.argv[2] ?? 12);
const config = JSON.parse(process.argv[3] ?? '{}');
const PLAYER = { good: { reaction: 1, actionGap: 0.8 }, slow: { reaction: 2, actionGap: 1.5 }, veryslow: { reaction: 4, actionGap: 3 } }[process.argv[4] ?? 'slow'];

const mins = [];
const row = (m) => (mins[m] ??= { n: 0, halls: 0, crew: 0, open: 0, short: 0, runs: new Set(), started: 0 });
for (let seed = 1; seed <= seeds; seed++) {
  let seen = new Set();
  playRun({
    seed, config: { tutorial: false, ...config }, maxSeconds: 1800, ...PLAYER,
    onStep: (s) => {
      const r = row(Math.floor(s.t / 60));
      r.n += 1; r.runs.add(seed);
      r.halls += s.halls; r.crew += s.techs.length; r.open += s.alarms.length;
      const waiting = s.alarms.filter((a) => a.techId === null).length;
      const idle = s.techs.filter((t) => t.state === 'idle').length;
      if (waiting > idle) r.short += 1;
      for (const a of s.alarms) if (!seen.has(a.id)) { seen.add(a.id); r.started += 1; }
    },
  });
}
console.log(`Player ${process.argv[4] ?? 'slow'}, seeds 1 to ${seeds}. Config: ${JSON.stringify(config)}`);
console.log('| Minute | Runs going | Halls | Crew | Alarms open | Alarms started a minute | Short-handed |');
console.log('|---|---|---|---|---|---|---|');
mins.forEach((r, m) => {
  if (!r || r.runs.size < 2) return;
  console.log(`| ${m}–${m + 1} | ${r.runs.size} | ${(r.halls / r.n).toFixed(1)} | ${(r.crew / r.n).toFixed(1)} | ${(r.open / r.n).toFixed(1)} | ${(r.started / r.runs.size).toFixed(1)} | ${Math.round((100 * r.short) / r.n)}% |`);
});
