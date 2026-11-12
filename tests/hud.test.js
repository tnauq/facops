import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, gw, raiseAlarm, step } from '../src/core/index.js';
import { BAND_COLOR, BAND_SHAPE, hudModel } from '../src/ui/hud.js';
import { gwText } from '../src/ui/readout.js';
import { quietGame, tick } from './helpers.js';

test('a fresh round: 0:00, full load, green, meter at its start value', () => {
  const s = quietGame();
  const m = hudModel(s);
  assert.equal(m.clock, '0:00');
  assert.equal(m.load, '0.50 / 0.50 GW');
  assert.equal(m.band, 'green');
  assert.equal(m.meter, s.meter);
});

test('the load readout and meter follow gw(state) and state.meter through a whole round', () => {
  const s = createGame({ seed: 11 });
  while (!s.over) {
    step(s, 0.05);
    const m = hudModel(s);
    const load = gw(s);
    assert.equal(m.load, `${gwText(load.deliveredMw)} / ${gwText(load.capacityMw)} GW`);
    assert.equal(m.band, load.band);
    assert.equal(m.meter, Math.max(0, Math.min(100, s.meter)));
  }
  assert.equal(hudModel(s).meter, 0);
});

test('a dark hall shows red', () => {
  const s = quietGame();
  raiseAlarm(s, 'breaker', 'msb-1-A');
  raiseAlarm(s, 'breaker', 'msb-1-B');
  tick(s, 1);
  const m = hudModel(s);
  assert.equal(m.band, 'red');
  assert.equal(m.load, '0.25 / 0.50 GW');
});

test('every band has its own color and shape', () => {
  for (const band of ['green', 'yellow', 'red']) {
    assert.ok(BAND_COLOR[band]);
    assert.ok(BAND_SHAPE[band]);
  }
  assert.equal(new Set(Object.values(BAND_SHAPE)).size, 3);
});
