// A gentler first run (pass 10 spec 3, M60): with the tutorial on, more cash, a later deadline and a
// slower-tightening director.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, deadlineAt, results } from '../src/core/index2.js';

const make = (tutorial, building = {}) => createGame({ seed: 1, config: { tutorial, building: { enabled: true, ...building } } });

test('the tutorial on: the first-run values', () => {
  const s = make(true);
  const fr = s.config.building.firstRun;
  assert.equal(s.cash, fr.startCash);
  assert.equal(s.config.building.startCash, fr.startCash, 'the ledger starts from it too');
  assert.equal(s.config.building.deadline.at, fr.deadlineAt);
  assert.equal(deadlineAt(s), fr.deadlineAt);
  assert.equal(s.config.building.tighten, fr.tighten);
  assert.equal(fr.startCash, 1600);
  assert.equal(fr.deadlineAt, 1080);
});

test('the tutorial off, or the first-run values switched off: the normal run', () => {
  const normal = make(false);
  assert.equal(normal.cash, 800);
  assert.equal(normal.config.building.deadline.at, 810);
  assert.equal(normal.config.building.tighten, 0.02);
  const off = make(true, { firstRun: { enabled: false, startCash: 1600, deadlineAt: 1080, tighten: 0.015 } });
  assert.equal(off.cash, 800);
});

test('the caller\'s config is never changed', () => {
  const deadline = { enabled: true, at: 810, marks: [300, 60] };
  const config = { tutorial: true, building: { enabled: true, deadline } };
  const s = createGame({ seed: 1, config });
  assert.equal(s.config.building.deadline.at, 1080);
  assert.equal(deadline.at, 810);
  assert.equal(results(s).building, true);
});
