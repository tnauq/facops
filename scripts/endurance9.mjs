// Pass 9 spec 5.3 (M56): how long a competent player lasts in endurance, and what it adds to the score.
//   node scripts/endurance9.mjs [seeds] [config JSON] [player: builder | ready]
import { playRun } from '../src/core/index2.js';

const seeds = Number(process.argv[2] ?? 12);
const extra = JSON.parse(process.argv[3] ?? '{}');
const who = process.argv[4] ?? 'builder';
const config = { tutorial: false, ...extra, building: { enabled: true, ...(extra.building ?? {}) } };
const opts = who === 'ready' ? { builder: 'builder', policy: 'greedy', reaction: 1, actionGap: 0.8 } : { builder: 'builder', policy: 'none' };
const clock = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const median = (xs) => { const v = [...xs].sort((a, b) => a - b); const m = v.length >> 1; return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2; };

const rows = [];
for (let seed = 1; seed <= seeds; seed++) {
  let atWin = null;
  const r = playRun({ seed, config, ...opts, endurance: true, maxSeconds: 3600, onStep: (s) => { if (s.won && atWin === null) atWin = s.stats.delivered; } });
  if (!r.won) continue;
  rows.push({ seconds: r.endurance ? r.endurance.seconds : 0, level: r.endurance ? r.endurance.level : 0, endedBy: r.endurance?.endedBy, gain: atWin > 0 ? r.score / atWin - 1 : 0 });
}
const by = (k) => rows.filter((x) => x.endedBy === k).length;
console.log(`${who}: ${rows.length} of ${seeds} won. Endurance median ${clock(median(rows.map((x) => x.seconds)))} (${clock(Math.min(...rows.map((x) => x.seconds)))} to ${clock(Math.max(...rows.map((x) => x.seconds)))}), level median ${median(rows.map((x) => x.level))}, ended: broke ${by('bankrupt')}, fired ${by('ceo')}, other ${rows.length - by('bankrupt') - by('ceo')}. Score added: median +${Math.round(median(rows.map((x) => x.gain)) * 100)}%.`);
