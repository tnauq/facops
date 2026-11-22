// Scripted checks for pass 4's building mode (spec 4.1). Not part of the game. Run with:
//   node scripts/pacing4.mjs [seeds] [config JSON] [players: a word in their names, e.g. "builder,"]
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
  // Pass 8 (M47/M48): a player who posts its crew, so warnings are caught and wrenches rarely seen.
  ['builder that posts its crew (compute first, posts along the halls)', { builder: 'builder', policy: 'none', posts: 'nopriority' }],
  // Pass 8 (M49): a player who takes every promise it has room for.
  ['builder that chases promises (compute first, takes every offer)', { builder: 'builder', policy: 'none', chase: true }],
  // Pass 8 (M50): a player who takes every surge.
  ['builder that takes every surge (compute first)', { builder: 'builder', policy: 'none', surges: true }],
  // Pass 8 (M51): the pick of two left alone, and a player who always takes the funding round.
  ['builder that takes no perks (compute first)', { builder: 'builder', policy: 'none', perks: 'none' }],
  ['builder that always takes the funding round (compute first)', { builder: 'builder', policy: 'none', rescue: 'fund' }],
  // Pass 7 spec 3.6: two players who hand over the keys.
  ['bold seller (compute first; sells at 2 strikes or credits over 60% of income)', { builder: 'builder', policy: 'none', seller: { strikes: 2, creditShare: 0.6 } }],
  ['cautious seller (gets ready for the CEO; sells at 2 strikes or credits over 30% of income)', { builder: 'builder', policy: 'greedy', seller: { strikes: 2, creditShare: 0.3 } }],
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
  // Pass 5 (M33): fired by the CEO's strikes, broke (before or after the loan's 5:00), or still running.
  const cause = r.sold ? 'sold' : r.firedByCeo ? 'fired' : r.bankrupt ? (r.seconds < 300 ? 'broke early' : 'broke late') : r.finished ? 'other' : 'still running';
  return { seconds: r.seconds, earned: r.earned, firstBuild, mw150, cause, short: early ? short / early : 0, crew: r.crew.length, halls: r.halls, strikes: r.strikes, commissionedAt: r.commissionedAt, dryCdus: r.cdusEverDry ?? 0, dryHalls: r.hallsEverDry ?? 0, score: r.score ?? r.earned, credits: r.credits ?? 0, uptimeShare: r.earned > 0 ? (r.uptime ?? 0) / (r.earned - (r.uptime ?? 0)) : 0 };
}

console.log(`Seeds 1 to ${seeds}. Config: ${JSON.stringify(extra)}`);
console.log('| Player | Run length: median (range) | Earned | First build | 150 MW at | Halls | Crew | Sold / fired / broke before 5:00 / broke later / still running | Score | Credits | Uptime bonus / income | Strikes | Commissioned (at) | Short-handed before 8:00 | CDUs ever dry / halls ever without water |');
console.log('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
const median = (xs) => { const v = [...xs].sort((a, b) => a - b); const m = v.length >> 1; return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2; };
const rows = {};
const only = process.argv[4];
for (const [name, opts] of PLAYERS.filter(([n]) => !only || n.includes(only))) {
  const runs = [];
  for (let seed = 1; seed <= seeds; seed++) runs.push(one(seed, opts));
  const len = runs.map((r) => r.seconds);
  const hit = runs.filter((r) => r.mw150 !== null);
  const by = (c) => runs.filter((r) => r.cause === c).length;
  const comm = runs.filter((r) => r.commissionedAt !== null);
  rows[name] = mean(runs.map((r) => r.earned));
  console.log(`| ${name} | ${clock(median(len))} (${clock(Math.min(...len))} to ${clock(Math.max(...len))}) | $${Math.round(mean(runs.map((r) => r.earned))).toLocaleString('en-US')} | ${clock(mean(runs.map((r) => r.firstBuild ?? 0)))} | ${hit.length ? `${clock(mean(hit.map((r) => r.mw150)))} (${hit.length}/${seeds})` : '-'} | ${mean(runs.map((r) => r.halls)).toFixed(1)} | ${mean(runs.map((r) => r.crew)).toFixed(1)} | ${by('sold')} / ${by('fired')} / ${by('broke early')} / ${by('broke late')} / ${by('still running')} | $${Math.round(mean(runs.map((r) => r.score))).toLocaleString('en-US')} | $${Math.round(mean(runs.map((r) => r.credits))).toLocaleString('en-US')} | ${Math.round(mean(runs.map((r) => r.uptimeShare)) * 100)}% | ${mean(runs.map((r) => r.strikes)).toFixed(1)} | ${comm.length}/${seeds}${comm.length ? ` (${clock(median(comm.map((r) => r.commissionedAt)))})` : ''} | ${Math.round(mean(runs.map((r) => r.short)) * 100)}% | ${mean(runs.map((r) => r.dryCdus)).toFixed(1)} / ${mean(runs.map((r) => r.dryHalls)).toFixed(1)} |`);
}
if (only) process.exit(0);
const b = rows['builder (compute first, backups from hall 4, hires)'];
const less = (name) => Math.round((1 - rows[name] / b) * 100);
console.log(`\nAgainst the compute-first builder: careful earns ${less('careful builder (backups early)')}% less, greedy ${less('greedy builder (no backups)')}% less, never hiring ${less('builder that never hires')}% less.`);
