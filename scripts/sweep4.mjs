// Settings search for pass 4's building mode. Not part of the game.
//   node scripts/sweep4.mjs seeds '[config, config, ...]'
import { onlineRows, playRun } from '../src/core/index2.js';
const seeds = Number(process.argv[2] ?? 6);
const configs = JSON.parse(process.argv[3]);
const clock = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const mean = (xs) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
for (const extra of configs) {
  const config = { tutorial: false, ...extra, building: { enabled: true, ...(extra.building ?? {}) } };
  const line = [];
  for (const plan of (process.argv[4] ?? 'builder,careful,greedy,nohire').split(',')) {
    const runs = [];
    for (let seed = 1; seed <= seeds; seed++) {
      let mw150 = null;
      let early = 0;
      const r = playRun({ seed, config, policy: 'none', builder: plan, maxSeconds: 1800, onStep: (s) => {
        if (mw150 === null && onlineRows(s).length * s.config.rowMw >= 150) mw150 = s.t;
        if (s.t <= 180) early = s.stats.earned;
      } });
      runs.push({ len: r.seconds, earned: r.earned, mw150, early, broke: r.bankrupt });
    }
    const hit = runs.filter((r) => r.mw150 !== null);
    line.push(`${plan}: ${clock(mean(runs.map((r) => r.len)))}, $${Math.round(mean(runs.map((r) => r.earned)) / 1000)}k, 3-min $${Math.round(mean(runs.map((r) => r.early)))}, 150MW ${hit.length ? clock(mean(hit.map((r) => r.mw150))) : '-'} (${hit.length}/${seeds}), broke ${runs.filter((r) => r.broke).length}`);
  }
  console.log(JSON.stringify(extra));
  console.log('  ' + line.join('\n  '));
}
