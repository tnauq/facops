import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_CONFIG, alarmCap, createGame, eligibleEquipment, raiseAlarm, spawnInterval, step } from '../src/core/index.js';
import { near, quietGame } from './helpers.js';

test('the interval tightens 5% every 10 s and stops at the floor', () => {
  assert.equal(spawnInterval(DEFAULT_CONFIG, 0), 10);
  assert.equal(spawnInterval(DEFAULT_CONFIG, 9.9), 10);
  assert.ok(near(spawnInterval(DEFAULT_CONFIG, 10), 9.5, 1e-9));
  assert.ok(near(spawnInterval(DEFAULT_CONFIG, 100), 10 * 0.95 ** 10, 1e-9));
  assert.equal(spawnInterval(DEFAULT_CONFIG, 5000), 2);
});

test('the alarm cap is crew + 2, then rises by 1 every 45 s after two minutes', () => {
  assert.equal(alarmCap(DEFAULT_CONFIG, 0), 5);
  assert.equal(alarmCap(DEFAULT_CONFIG, 164), 5);
  assert.equal(alarmCap(DEFAULT_CONFIG, 165), 6);
  assert.equal(alarmCap(DEFAULT_CONFIG, 210), 7);
});

test('the first alarm arrives at 5 s, not before', () => {
  const g = createGame({ seed: 11 });
  for (let i = 0; i < 99; i++) step(g, 0.05);
  assert.equal(g.alarms.length, 0);
  for (let i = 0; i < 3; i++) step(g, 0.05);
  assert.equal(g.alarms.length, 1);
});

test('the director alone never pushes past the cap', () => {
  // Long clocks so nothing escalates; no player, so nothing clears.
  const g = createGame({ seed: 5, config: { clockScale: 1000, meter: { start: 1e9, max: 1e9 } } });
  for (let i = 0; i < 20 * 400; i++) {
    step(g, 0.05);
    assert.ok(g.alarms.length <= alarmCap(g.config, g.t), `over the cap at t=${g.t}`);
  }
  assert.equal(g.alarms.length, alarmCap(g.config, g.t), 'and it does fill the cap');
});

test('mercy: the director never trips a second side or a second chiller', () => {
  const g = quietGame();
  raiseAlarm(g, 'breaker', 'msb-1-A');
  const breakers = eligibleEquipment(g, 'breaker').map((e) => e.id).sort();
  assert.deepEqual(breakers, ['msb-2-A', 'msb-2-B']);
  assert.equal(eligibleEquipment(g, 'chiller').length, 3);
  raiseAlarm(g, 'chiller', 'chiller-1');
  assert.equal(eligibleEquipment(g, 'chiller').length, 0);
});

test('eligibility leaves out equipment that already has a problem', () => {
  const g = quietGame();
  raiseAlarm(g, 'network', 'rack-1-0-0');
  raiseAlarm(g, 'leak', 'cdu-2-1');
  raiseAlarm(g, 'pump', 'pump-0');
  assert.equal(eligibleEquipment(g, 'network').length, 19);
  assert.equal(eligibleEquipment(g, 'leak').length, 3);
  assert.deepEqual(eligibleEquipment(g, 'pump').map((e) => e.id), ['pump-1']);
});

test('same seed, same game; different seed, different game', () => {
  const log = (seed) => {
    const g = createGame({ seed });
    for (let i = 0; i < 20 * 120; i++) step(g, 0.05);
    return JSON.stringify(g.events.map((e) => [Math.round(e.t * 100), e.type, e.equipId ?? e.hall ?? '']));
  };
  assert.equal(log(123), log(123));
  assert.notEqual(log(123), log(124));
});

test('waves can be switched off', () => {
  const count = (waveEvery) => {
    const g = createGame({ seed: 8, config: { clockScale: 1000, meter: { start: 1e9, max: 1e9 }, director: { waveEvery, capExtra: 100 } } });
    for (let i = 0; i < 20 * 100; i++) step(g, 0.05);
    return g.stats.spawned;
  };
  assert.ok(count(45) > count(0));
});
