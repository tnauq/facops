// Grid search over pass 3 pacing settings against the spec 4.5 targets. Not part of the game.
import { playRun } from '../src/core/index2.js';

const SEEDS = 12;
const players = { good: { reaction: 1, actionGap: 0.8 }, blind: { reaction: 1, actionGap: 0.8, policy: 'blind' }, random: { reaction: 1, actionGap: 0.8, policy: 'random' } };
const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;

function measure(config) {
  const out = {};
  for (const [name, opts] of Object.entries(players)) {
    let mid = 0, short = 0;
    const runs = [];
    for (let seed = 1; seed <= SEEDS; seed++) {
      const r = playRun({ seed, config: { tutorial: false, ...config }, maxSeconds: 1800, ...opts, onStep: name !== 'good' ? null : (s) => {
        if (s.halls < 3 || s.fullCampusAt !== null) return;
        mid += 1;
        if (s.alarms.filter((a) => a.techId === null).length > s.techs.filter((t) => t.state === 'idle').length) short += 1;
      } });
      runs.push({ len: r.seconds, gwh: r.energyGwh, h8: r.halls >= 8, zt: r.firedByCeo && r.state.ceo?.zeroTolerance });
    }
    out[name] = { len: mean(runs.map((r) => r.len)), gwh: mean(runs.map((r) => r.gwh)), h8: runs.filter((r) => r.h8).length, zt: runs.filter((r) => r.zt).length, short: mid ? short / mid : 0 };
  }
  const g = out.good, b = out.blind, r = out.random;
  const checks = {
    len: g.len >= 540 && g.len <= 780,
    zt: g.zt >= 7,
    h8: g.h8 >= 10,
    blindLen: g.len - b.len >= 90,
    blindGwh: 1 - b.gwh / g.gwh >= 0.15,
    random: 1 - r.gwh / g.gwh >= 0.25,
    short: g.short >= 0.1 && g.short <= 0.3,
  };
  return { out, checks, score: Object.values(checks).filter(Boolean).length };
}

const grid = [];
for (const carryOver of [0.6, 0.7])
  for (const darkDrain of [0.5, 1])
    for (const capGrowEvery of [30, 60, 100000])
      for (const gap of [[30, 45], [45, 60]])
        for (const handoverCost of [35])
          grid.push({ director: { carryOver, capGrowEvery }, meter: { darkDrain }, ceo: { gap } });

const results = [];
for (const config of grid) {
  const m = measure(config);
  results.push({ config, ...m });
  const g = m.out.good;
  console.log(`${m.score}/7 ${JSON.stringify(config)} good ${Math.round(g.len)}s zt ${g.zt} h8 ${g.h8} short ${Math.round(g.short * 100)}% | blind -${Math.round(g.len - m.out.blind.len)}s -${Math.round((1 - m.out.blind.gwh / g.gwh) * 100)}% | random -${Math.round((1 - m.out.random.gwh / g.gwh) * 100)}% | fails: ${Object.entries(m.checks).filter(([, v]) => !v).map(([k]) => k).join(',')}`);
}
