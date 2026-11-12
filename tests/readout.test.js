import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, step } from '../src/core/index.js';
import { gwText, readoutText } from '../src/ui/readout.js';
import { quietGame, tick } from './helpers.js';
import { raiseAlarm } from '../src/core/index.js';

test('the readout shows time, load, band and meter', () => {
  const s = quietGame();
  tick(s, 12);
  assert.equal(readoutText(s), '0:12   ·   Load 0.50 / 0.50 GW   ·   Green   ·   Stability 52   ·   Alarms 0');
});

test('the readout follows a lost rack', () => {
  const s = quietGame();
  raiseAlarm(s, 'network', 'rack-1-0-0');
  tick(s, 1);
  assert.match(readoutText(s, { auto: true }), /Load 0\.48 \/ 0\.50 GW .*Alarms 1 .*Auto$/);
});

test('once the round is over the readout gives the result', () => {
  const s = createGame({ seed: 4 });
  while (!s.over) step(s, 0.05);
  assert.match(readoutText(s), /^Round over at \d+:\d\d\. Delivered \d+\.\d\d GWh\. Reload to play again\.$/);
});

test('GW is rounded to the nearest hundredth', () => {
  assert.equal(gwText(475), '0.48');
  assert.equal(gwText(500), '0.50');
  assert.equal(gwText(0), '0.00');
  assert.equal(gwText(374.9), '0.37');
});
