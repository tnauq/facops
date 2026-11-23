// Endurance after the win (pass 9 spec 5, M56).
import test from 'node:test';
import assert from 'node:assert/strict';
import { EQUIPMENT, advance, alarmCap, build, commissioned, createGame, endEndurance, heat, results, startEndurance, step } from '../src/core/index2.js';

const NO_BURN = { loan: 0, loanRate: 0, base: 0, doubling: 0, upkeep: 0, wages: 0 };
const game = (config = {}) => createGame({
  seed: 1,
  config: { tutorial: false, autoDispatch: { enabled: false }, director: { enabled: false }, ceo: { enabled: false }, ...config, building: { enabled: true, startCash: 100000, burn: NO_BURN, ...(config.building ?? {}) } },
});
function won(config) {
  const s = game(config);
  for (const e of EQUIPMENT) if (!s.equip[e.id].built) build(s, e.id);
  while (!s.over && s.t < 200) step(s, 0.05);
  return s;
}

test('endurance starts only from a won run, and the run stays won', () => {
  const fresh = game();
  assert.deepEqual(startEndurance(fresh), { ok: false, reason: 'not won' });
  const s = won();
  assert.equal(s.overReason, 'won');
  assert.equal(startEndurance(s).ok, true);
  assert.equal(s.over, false);
  assert.equal(startEndurance(s).ok, false, 'once');
  advance(s, 5);
  assert.equal(endEndurance(s).ok, true);
  const r = results(s);
  assert.equal(r.won, true);
  assert.equal(r.outcome, 'won');
  assert.equal(r.endurance.endedBy, 'ended');
  assert.ok(Math.abs(r.endurance.seconds - 5) < 0.1);
});

test('a level a minute; the heat compounds; the cap grows with it', () => {
  const s = won();
  const cap = alarmCap(s);
  startEndurance(s);
  assert.equal(heat(s), 1);
  advance(s, 60.1);
  assert.equal(s.endurance.level, 2);
  assert.ok(Math.abs(heat(s) - 1.1) < 1e-9);
  advance(s, 240);
  assert.equal(s.endurance.level, 6);
  assert.ok(Math.abs(heat(s) - Math.pow(1.1, 5)) < 1e-9);
  assert.equal(alarmCap(s), cap + 1, '1.61 heat: one more alarm for 0.5 of heat');
  assert.deepEqual(s.events.filter((e) => e.type === 'levelUp').map((e) => e.level), [2, 3, 4, 5, 6]);
});

test('compute pays the heat times as much, and it counts in the score', () => {
  const s = won();
  startEndurance(s);
  advance(s, 1);
  const before = s.stats.delivered;
  advance(s, 1);
  const level1 = s.stats.delivered - before;
  advance(s, 59);
  const mid = s.stats.delivered;
  advance(s, 1);
  const level2 = s.stats.delivered - mid;
  assert.ok(Math.abs(level2 / level1 - 1.1) < 0.01, `${level2 / level1}`);
  assert.equal(results(s).score, s.stats.delivered);
});

test('going broke ends endurance, not the win', () => {
  const s = won({ building: { burn: { ...NO_BURN, base: 0 } } });
  startEndurance(s);
  s.cash = -1e6;
  s.config.building.rescue = { enabled: false, funding: 0, rate: 0 };
  advance(s, 60);
  assert.equal(s.over, true);
  const r = results(s);
  assert.equal(r.won, true);
  assert.equal(r.endurance.endedBy, 'bankrupt');
});

test('switched off, a won run cannot start endurance', () => {
  const s = won({ building: { endurance: { enabled: false, levelEvery: 60, heatPerLevel: 0.1, capPerHeat: 0.5 } } });
  assert.deepEqual(startEndurance(s), { ok: false, reason: 'off' });
});

test('the screen: the note leads with the level, a line per level, the results and the records', async () => {
  const { enduranceNote, levelLine } = await import('../src/ui/enduranceView.js');
  const { hudModel2 } = await import('../src/ui/hud2.js');
  const { resultsPanel } = await import('../src/ui/results.js');
  const { recordRun, recordsText, recordsLine } = await import('../src/ui/records.js');
  const { formatClock } = await import('../src/core/index2.js');
  const s = won();
  assert.equal(enduranceNote(s), null);
  startEndurance(s);
  advance(s, 120.1);
  assert.deepEqual(enduranceNote(s), { long: 'Endurance · level 3 · 1.21×', short: 'L3 · 1.21×' });
  assert.match(hudModel2(s).note, /^Endurance · level 3 · 1\.21× · /);
  assert.equal(hudModel2(s).noteShorter, 'L3 · 1.21×');
  assert.equal(levelLine(4, 1.331), 'Level 4: alarms 1.33× as often, compute pays 1.33×.');
  endEndurance(s);
  const r = results(s);
  const panel = resultsPanel(r, { isNew: false, best: { score: 1, seconds: 1, energyGwh: 1 } }, formatClock);
  assert.equal(panel.title, 'Campus handed over');
  assert.deepEqual(panel.lines.find(([k]) => k === 'Endurance'), ['Endurance', 'Level 3 · 2:00 · you stopped']);
  const rec = recordRun(null, r);
  assert.equal(rec.newLevel, true);
  assert.match(recordsText(rec.records, formatClock), / · Endurance level 3$/);
  assert.equal(recordsLine(rec, formatClock), 'New fastest win and new high score!');
});
