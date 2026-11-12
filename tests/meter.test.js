import test from 'node:test';
import assert from 'node:assert/strict';
import { assign, bandOf, gw, raiseAlarm, step } from '../src/core/index.js';
import { near, quietGame, tick } from './helpers.js';

test('band edges: green at 90% and up, red below 80%', () => {
  assert.equal(bandOf(1), 'green');
  assert.equal(bandOf(0.9), 'green');
  assert.equal(bandOf(0.8999), 'yellow');
  assert.equal(bandOf(0.8), 'yellow');
  assert.equal(bandOf(0.7999), 'red');
  assert.equal(bandOf(0), 'red');
});

test('green fills the meter by 1 point per second, up to 100', () => {
  const g = quietGame();
  assert.equal(g.meter, 40);
  tick(g, 10);
  assert.ok(near(g.meter, 50, 0.01));
  tick(g, 70);
  assert.equal(g.meter, 100);
});

test('yellow drains half a point per second', () => {
  const g = quietGame();
  raiseAlarm(g, 'leak', 'cdu-1-0');
  raiseAlarm(g, 'leak', 'cdu-1-1'); // 400 of 500 MW: exactly 80%, which is yellow
  tick(g, 10);
  assert.equal(gw(g).band, 'yellow');
  assert.ok(near(g.meter, 35, 0.05), `meter was ${g.meter}`);
});

test('red drains 2 points per second and an empty meter ends the round', () => {
  const g = quietGame();
  raiseAlarm(g, 'breaker', 'msb-1-A');
  raiseAlarm(g, 'breaker', 'msb-1-B'); // hall 1 dark: 50%
  tick(g, 19.9);
  assert.equal(g.over, false);
  tick(g, 0.2);
  assert.equal(g.over, true);
  assert.equal(g.overReason, 'stability');
  assert.equal(g.meter, 0);
  assert.ok(g.events.some((e) => e.type === 'over'));
});

test('nothing moves after the round is over', () => {
  const g = quietGame();
  raiseAlarm(g, 'breaker', 'msb-1-A');
  const b = raiseAlarm(g, 'breaker', 'msb-1-B');
  tick(g, 25);
  const frozen = g.t;
  step(g, 0.05);
  assert.equal(g.t, frozen);
  assert.deepEqual(assign(g, 'tech-0', b.id), { ok: false, reason: 'over' });
});

test('a band change is announced once', () => {
  const g = quietGame();
  raiseAlarm(g, 'breaker', 'msb-1-A');
  raiseAlarm(g, 'breaker', 'msb-1-B');
  tick(g, 2);
  const changes = g.events.filter((e) => e.type === 'band');
  assert.equal(changes.length, 1);
  assert.deepEqual({ from: changes[0].from, to: changes[0].to }, { from: 'green', to: 'red' });
});
