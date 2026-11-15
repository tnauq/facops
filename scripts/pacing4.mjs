// Scripted checks for pass 4's building mode (spec 4.1). Not part of the game. Run with:
//   node scripts/pacing4.mjs [seeds] [config JSON]
// Every player builds with a scripted plan; auto-dispatch sends the techs. Prints one row per player.
import { onlineRows, playRun } from '../src/core/index2.js';

const seeds = Number(process.argv[2] ?? 12);
const extra = JSON.parse(process.argv[3] ?? '{}');
const config = { tutorial: false, ...extra, building: { enabled: true, ...(extra.building ?? {}) } };

const PLAYERS = [
  ['builder (compute first, backups from hall 4, hires)', { builder: 'builder', policy: 'none' }],
  ['builder, also gets ready for the CEO', { builder: 'builder', policy: 'greedy', reaction: 1, actionGap: 0.8 }],
  ['builder with backups from hall 6', { builder: 'mid', policy: 'none' }],
  ['careful builder (backups early)', { builder: 'careful', policy: 'none' }],
  ['greedy builder (no backups)', { builder: 'greedy', policy: 'none' }],
  ['builder that never hires', { builder: 'nohire', policy: 'none' }],
  ['slow builder (decides every 4 s)', { builder: 'builder', policy: 'none', buildGap: 4 }],
];

const clock = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const mean = (xs) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);

function one(seed, opts) {
  let firstBuild = null;
  let mw150 = null;
  let early = 0;
  let short = 0;
  const r = playRun({
    seed, config, maxSeconds: 1800, ...opts,
    onStep: (s) => {
      if (firstBuild === null && s.stats.spent > 0) firstBuild = s.t;
      if (mw150 === null && onlineRows(s).length * s.config.rowMw >= 150) mw150 = s.t;
      if (s.t < 480) {
        early += 1;
        const waiting = s.alarms.filter((a) => a.techId === null).length;
        const idle = s.techs.filter((t) => t.state === 'idle').length;
        if (waiting > idle) short += 1;
      }
    },
  });
  const cause = r.firedByCeo ? (r.state.ceo && r.state.ceo.zeroTolerance ? 'zero tolerance' : 'CEO fine') : r.bankrupt ? 'broke' : 'meter';
  return { seconds: r.seconds, earned: r.earned, firstBuild, mw150, cause, short: early ? short / early : 0, crew: r.crew.length, halls: r.halls };
}

console.log(`Seeds 1 to ${seeds}. Config: ${JSON.stringify(extra)}`);
console.log('| Player | Run length (range) | Earned | First build | 150 MW at | Halls | Crew | Ended by zero tolerance / CEO fine / broke | Short-handed before 8:00 |');
console.log('|---|---|---|---|---|---|---|---|---|');
const rows = {};
for (const [name, opts] of PLAYERS) {
  const runs = [];
  for (let seed = 1; seed <= seeds; seed++) runs.push(one(seed, opts));
  const len = runs.map((r) => r.seconds);
  const hit = runs.filter((r) => r.mw150 !== null);
  const by = (c) => runs.filter((r) => r.cause === c).length;
  rows[name] = mean(runs.map((r) => r.earned));
  console.log(`| ${name} | ${clock(mean(len))} (${clock(Math.min(...len))} to ${clock(Math.max(...len))}) | $${Math.round(mean(runs.map((r) => r.earned))).toLocaleString('en-US')} | ${clock(mean(runs.map((r) => r.firstBuild ?? 0)))} | ${hit.length ? `${clock(mean(hit.map((r) => r.mw150)))} (${hit.length}/${seeds})` : '-'} | ${mean(runs.map((r) => r.halls)).toFixed(1)} | ${mean(runs.map((r) => r.crew)).toFixed(1)} | ${by('zero tolerance')} / ${by('CEO fine')} / ${by('broke')} | ${Math.round(mean(runs.map((r) => r.short)) * 100)}% |`);
}
const b = rows['builder (compute first, backups from hall 4, hires)'];
const less = (name) => Math.round((1 - rows[name] / b) * 100);
console.log(`\nAgainst the compute-first builder: careful earns ${less('careful builder (backups early)')}% less, greedy ${less('greedy builder (no backups)')}% less, never hiring ${less('builder that never hires')}% less.`);
