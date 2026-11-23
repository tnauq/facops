// Pass 9's balance check (spec 7, M58): a game you win. Per player: wins, the median time to win,
// how the losses split, the median score and when 150 MW came. Not part of the game.
//   node scripts/pacing9.mjs [seeds] [config JSON] [players: words in their names, | between] [endurance: 1]
import { onlineRows, playRun } from '../src/core/index2.js';

const seeds = Number(process.argv[2] ?? 12);
const extra = JSON.parse(process.argv[3] ?? '{}');
const only = process.argv[4];
const endurance = process.argv[5] === '1';
const config = { tutorial: false, ...extra, building: { enabled: true, ...(extra.building ?? {}) } };
const EVERY = { builder: 'builder', policy: 'none', posts: 'priority', chase: true, surges: true, perks: 'first', rescue: 'fund' };

export const PLAYERS = [
  ['compute first', { builder: 'builder', policy: 'none' }],
  ['gets ready for the CEO', { builder: 'builder', policy: 'greedy', reaction: 1, actionGap: 0.8 }],
  ['every pass 8 tool', EVERY],
  ['no pass 8 tool', { builder: 'builder', policy: 'none', perks: 'none', rescue: 'close' }],
  ['never a backup', { builder: 'greedy', policy: 'none' }],
  ['backups early', { builder: 'careful', policy: 'none' }],
  ['never hires', { builder: 'nohire', policy: 'none' }],
  // Every tool but one, to find what makes the every-tool player fast.
  ['every tool but promises', { ...EVERY, chase: false }],
  ['every tool but surges', { ...EVERY, surges: false }],
  ['every tool but perks', { ...EVERY, perks: 'none' }],
  ['every tool but funding', { ...EVERY, rescue: 'close' }],
  ['every tool but posts', { ...EVERY, posts: false }],
];

const clock = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const median = (xs) => { if (!xs.length) return NaN; const v = [...xs].sort((a, b) => a - b); const m = v.length >> 1; return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2; };

console.log(`Seeds 1 to ${seeds}${endurance ? ', playing endurance after a win' : ''}. Config: ${JSON.stringify(extra)}`);
console.log('| Player | Won | Median win | Broke / fired / missed / sold early | Median score | 150 MW |');
console.log('|---|---|---|---|---|---|');
for (const [name, opts] of PLAYERS.filter(([n]) => !only || only.split('|').some((w) => n === w || n.startsWith(w)))) {
  const runs = [];
  for (let seed = 1; seed <= seeds; seed++) {
    let mw150 = null;
    const r = playRun({ seed, config, maxSeconds: endurance ? 3600 : 1800, endurance, ...opts, onStep: (s) => { if (mw150 === null && onlineRows(s).length * s.config.rowMw >= 150) mw150 = s.t; } });
    runs.push({ won: r.won, wonAt: r.wonAt, outcome: r.outcome, score: r.score, mw150 });
  }
  const n = (o) => runs.filter((r) => r.outcome === o).length;
  const wins = runs.filter((r) => r.won);
  const mw = runs.filter((r) => r.mw150 !== null).map((r) => r.mw150);
  console.log(`| ${name} | ${wins.length}/${seeds} | ${wins.length ? clock(median(wins.map((r) => r.wonAt))) : '-'} | ${n('broke')} / ${n('fired')} / ${n('deadline')} / ${n('soldEarly')} | $${Math.round(median(runs.map((r) => r.score))).toLocaleString('en-US')} | ${mw.length ? `${clock(median(mw))} (${mw.length})` : '-'} |`);
}
