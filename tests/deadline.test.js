// The board's deadline (pass 9 spec 4, M55).
import test from 'node:test';
import assert from 'node:assert/strict';
import { EQUIPMENT, advance, build, commissioned, createGame, deadlineAt, deadlineLeft, results, step } from '../src/core/index2.js';

const NO_BURN = { loan: 0, loanRate: 0, base: 0, doubling: 0, upkeep: 0, wages: 0 };
const game = (building = {}, config = {}) => createGame({
  seed: 1,
  config: { tutorial: false, autoDispatch: { enabled: false }, director: { enabled: false }, ceo: { enabled: false }, ...config, building: { enabled: true, startCash: 100000, burn: NO_BURN, ...building } },
});
const DEADLINE = (at) => ({ deadline: { enabled: true, at, marks: [20, 5] } });

test('miss the deadline and the board pulls the plug: a loss, scored on the compute delivered', () => {
  const s = game(DEADLINE(30));
  assert.equal(deadlineLeft(s), 30);
  assert.equal(deadlineAt(s), 30);
  advance(s, 29.9);
  assert.equal(s.over, false);
  advance(s, 0.2);
  assert.equal(s.over, true);
  assert.equal(s.overReason, 'deadline');
  const r = results(s);
  assert.equal(r.outcome, 'deadline');
  assert.equal(r.missedDeadline, true);
  assert.equal(r.won, false);
  assert.equal(r.rowsBuilt, 2, 'the two starting rows');
  assert.ok(r.score > 0 && r.score === s.stats.delivered);
  assert.equal(s.events.filter((e) => e.type === 'deadlineMissed').length, 1);
});

test('the CEO counts down at the configured marks, once each', () => {
  const s = game(DEADLINE(30));
  advance(s, 29);
  assert.deepEqual(s.events.filter((e) => e.type === 'deadlineSoon').map((e) => e.left), [20, 5]);
});

test('Commissioned before the deadline stops the clock: the last inspection is in time', () => {
  const s = game({ ...DEADLINE(60), finish: { enabled: true } }, { ceo: { enabled: true } });
  for (const e of EQUIPMENT) if (!s.equip[e.id].built) build(s, e.id);
  while (!commissioned(s) && s.t < 60) step(s, 0.05);
  assert.equal(commissioned(s), true);
  assert.equal(deadlineLeft(s), null);
  while (!s.over && s.t < 400) step(s, 0.05);
  assert.equal(s.overReason, 'won', 'the inspection ends after the deadline, and still wins');
  assert.ok(s.t > 60);
});

test('switched off, or with the win at the finish off, there is no deadline', () => {
  const off = game({ deadline: { enabled: false, at: 30, marks: [] } });
  assert.equal(deadlineLeft(off), null);
  advance(off, 40);
  assert.equal(off.over, false);
  const noFinish = game({ ...DEADLINE(30), finish: { enabled: false } });
  assert.equal(deadlineLeft(noFinish), null);
  advance(noFinish, 40);
  assert.equal(noFinish.over, false);
});

test('the deadline runs on the economy clock: after the tutorial, it moves with it', () => {
  const s = game(DEADLINE(30));
  s.economyStart = 100;
  assert.equal(deadlineAt(s), 130);
});

test('the screen: the note leads with the deadline, the run-over card says how far the campus got', async () => {
  const { deadlineNote, hudModel2 } = await import('../src/ui/hud2.js');
  const { resultsPanel } = await import('../src/ui/results.js');
  const { partingLine } = await import('../src/ui/runOver.js');
  const { formatClock } = await import('../src/core/index2.js');
  const s = game({ deadline: { enabled: true, at: 960, marks: [300, 60] } });
  assert.deepEqual(deadlineNote(s), { text: 'Due 16:00', urgent: false });
  assert.match(hudModel2(s).note, / · Due 16:00$/);
  s.economyStart = -700; // 11:40 of economy time gone: 4:20 left
  assert.deepEqual(deadlineNote(s), { text: '4:20 left', urgent: true });
  assert.equal(hudModel2(s).noteShorter, '4:20 left');
  assert.match(hudModel2(s).note, /^4:20 left · /);
  const m = game(DEADLINE(5));
  advance(m, 6);
  const r = results(m);
  const panel = resultsPanel(r, { isNew: false, best: { score: 1, seconds: 1, energyGwh: 1 } }, formatClock);
  assert.equal(panel.title, 'Missed the deadline');
  assert.ok(panel.lines.some(([k, v]) => k === 'Campus' && v === '2 of 48 rows'));
  assert.equal(partingLine(m, r), 'The board pulled the plug. I was never here.');
});
