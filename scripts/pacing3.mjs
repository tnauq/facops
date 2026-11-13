// Scripted checks for pass 3 (spec 4.5). Not part of the game. Run with:
//   node scripts/pacing3.mjs [seeds] [config JSON]
// Plays each player over the same seeds and prints one table row per player.
import { playRun } from '../src/core/index2.js';

const seeds = Number(process.argv[2] ?? 12);
const config = JSON.parse(process.argv[3] ?? '{}');

const PLAYERS = [
  ['careful, ready for the CEO', { reaction: 0.6, actionGap: 0.5 }],
  ['good, ready for the CEO', { reaction: 1, actionGap: 0.8 }],
  ['good, CEO-blind', { reaction: 1, actionGap: 0.8, policy: 'blind' }],
  ['slow, ready for the CEO', { reaction: 2, actionGap: 1.5 }],
  ['very slow, ready for the CEO', { reaction: 4, actionGap: 3 }],
  ['random', { reaction: 1, actionGap: 0.8, policy: 'random' }],
];

const clock = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const mean = (xs) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);

function one(seed, opts) {
  // Between hall 3 and hall 8: share of time with more alarms waiting than free techs.
  let mid = 0;
  let short = 0;
  const r = playRun({
    seed,
    config: { tutorial: false, ...config },
    maxSeconds: 1800,
    ...opts,
    onStep: (s) => {
      if (s.halls < 3 || s.fullCampusAt !== null) return;
      mid += 1;
      const waiting = s.alarms.filter((a) => a.techId === null).length;
      const idle = s.techs.filter((t) => t.state === 'idle').length;
      if (waiting > idle) short += 1;
    },
  });
  const s = r.state;
  const cause = r.firedByCeo ? (s.ceo && s.ceo.zeroTolerance ? 'zero tolerance' : 'CEO hit') : 'meter';
  const h8 = r.deliveries.find((d) => d.hall === 8);
  return { seconds: r.seconds, gwh: r.energyGwh, halls: r.halls, h8: h8 ? h8.t : null, cause, short: mid > 0 ? short / mid : 0, sightings: r.ceoSightings, walks: s.ceoWalks, finished: r.finished };
}

console.log(`Seeds 1 to ${seeds}. Config: ${JSON.stringify(config)}`);
console.log('| Player | Run length (range) | GWh | Hall 8 reached | Hall 8 at | Ended by zero tolerance / CEO hit / meter | Short-handed, halls 3 to 8 | Sightings |');
console.log('|---|---|---|---|---|---|---|---|');
const rows = {};
for (const [name, opts] of PLAYERS) {
  const runs = [];
  for (let seed = 1; seed <= seeds; seed++) runs.push(one(seed, opts));
  const len = runs.map((r) => r.seconds);
  const h8 = runs.filter((r) => r.h8 !== null);
  const by = (c) => runs.filter((r) => r.cause === c).length;
  rows[name] = { len: mean(len), gwh: mean(runs.map((r) => r.gwh)) };
  console.log(`| ${name} | ${clock(mean(len))} (${clock(Math.min(...len))} to ${clock(Math.max(...len))}) | ${mean(runs.map((r) => r.gwh)).toFixed(2)} | ${h8.length}/${seeds} | ${h8.length ? clock(mean(h8.map((r) => r.h8))) : '-'} | ${by('zero tolerance')} / ${by('CEO hit')} / ${by('meter')} | ${Math.round(mean(runs.map((r) => r.short)) * 100)}% | ${mean(runs.map((r) => r.sightings)).toFixed(1)} |`);
}
const good = rows['good, ready for the CEO'];
const blind = rows['good, CEO-blind'];
const rnd = rows.random;
console.log(`\nBlind vs ready: ${Math.round(good.len - blind.len)} s shorter, ${Math.round((1 - blind.gwh / good.gwh) * 100)}% less energy. Random: ${Math.round((1 - rnd.gwh / good.gwh) * 100)}% less energy.`);
