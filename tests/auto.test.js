// Techs pick their own jobs (pass 4 spec 2.6, M23).
import test from 'node:test';
import assert from 'node:assert/strict';
import { EQUIPMENT_BY_ID, advance, assign, createGame, getAlarm, getTech, onCeoRoute, playRun, raiseAlarm, step } from '../src/core/index2.js';
import { autoOrder } from '../src/core/auto.js';

// No director: the test raises every alarm. Auto-dispatch on, as by default.
const game = (config = {}) => createGame({ seed: 1, config: { tutorial: false, startHalls: 2, ...config, director: { enabled: false } } });

test('auto-dispatch is on by default, and waits a second before a tech heads off', () => {
  const s = game();
  assert.equal(s.config.autoDispatch.enabled, true);
  const a = raiseAlarm(s, 'breaker', 'msb-1-t-A');
  advance(s, 0.5);
  assert.equal(getAlarm(s, a.id).techId, null);
  advance(s, 0.6);
  assert.notEqual(getAlarm(s, a.id).techId, null);
  assert.equal(s.stats.autoSent, 1);
});

test('the alarm costing most goes first, to the tech who would finish it soonest', () => {
  const s = game({ startHalls: 2 });
  s.techs = s.techs.slice(0, 1); // one tech, two alarms
  const free = raiseAlarm(s, 'breaker', 'msb-2-t-A'); // costs nothing yet
  const costly = raiseAlarm(s, 'network', 'row-1-t-0'); // losing a row now
  advance(s, 1.1);
  assert.equal(getAlarm(s, costly.id).techId, s.techs[0].id);
  assert.equal(getAlarm(s, free.id).techId, null);
});

test('with two free techs and one alarm, the one who would finish soonest goes', () => {
  const s = game();
  const a = raiseAlarm(s, 'chiller', 'chiller-A-0');
  advance(s, 1.1);
  const sent = getTech(s, getAlarm(s, a.id).techId);
  // Both techs start together, so the Mechanical tech's faster fix decides it.
  assert.equal(sent.trade, 'mechanical');
});

test('a busy tech is never pulled off a job; the alarm waits for someone to come free', () => {
  const s = game();
  s.techs = s.techs.slice(0, 2);
  const first = raiseAlarm(s, 'breaker', 'msb-1-t-A');
  const second = raiseAlarm(s, 'breaker', 'msb-1-b-A');
  advance(s, 1.1);
  const busy = s.techs.map((t) => t.alarmId);
  assert.deepEqual([...busy].sort(), [first.id, second.id].sort());
  const third = raiseAlarm(s, 'network', 'row-1-t-0'); // costs more than both, but nobody is free
  advance(s, 1.5);
  assert.equal(getAlarm(s, third.id).techId, null);
  assert.deepEqual(s.techs.map((t) => t.alarmId), busy);
});

test('the player can still redirect, and a job the player gave is kept', () => {
  const s = game();
  const a = raiseAlarm(s, 'breaker', 'msb-1-t-A');
  const b = raiseAlarm(s, 'leak', 'cdu-1-t');
  advance(s, 1.1);
  const tech = getTech(s, getAlarm(s, a.id).techId);
  assert.equal(assign(s, tech.id, b.id).ok, true); // player redirects this tech to the leak
  advance(s, 0.2);
  assert.equal(tech.alarmId, b.id);
  // The breaker is picked up again by whoever comes free, never by taking the player's tech back.
  for (let i = 0; i < 40 && getAlarm(s, b.id); i++) {
    step(s, 0.05);
    if (getAlarm(s, b.id)) assert.equal(tech.alarmId, b.id);
  }
});

test('while the CEO is coming, alarms the CEO will see come first', () => {
  // Hall 3 comes online on a short build timer, which brings the ribbon-cutting to Hall 3.
  const s = game({ startHalls: 2, build: { every: 2, greenBoost: 1 } });
  while (!s.ceo && s.t < 30) step(s, 0.05);
  s.techs = s.techs.slice(0, 1); // after hall 3's new hire: one tech, two alarms
  assert.ok(s.ceo && s.ceo.phase === 'warning', 'the ribbon-cutting is announced');
  assert.equal(onCeoRoute(s, EQUIPMENT_BY_ID['msb-3-t-A']), true);
  assert.equal(onCeoRoute(s, EQUIPMENT_BY_ID['row-1-t-0']), false);
  const elsewhere = raiseAlarm(s, 'network', 'row-1-t-0'); // costing power, but not on the route
  const onRoute = raiseAlarm(s, 'breaker', 'msb-3-t-A'); // costing nothing, but the CEO will see it
  advance(s, 1.1);
  assert.equal(getAlarm(s, onRoute.id).techId, s.techs[0].id);
  assert.equal(getAlarm(s, elsewhere.id).techId, null);
  assert.deepEqual(autoOrder(s).map((a) => a.id), [elsewhere.id]);
});

test('off in the drawer, nobody moves by themselves', () => {
  const s = game({ autoDispatch: { enabled: false, delay: 1 } });
  const a = raiseAlarm(s, 'breaker', 'msb-1-t-A');
  advance(s, 5);
  assert.equal(getAlarm(s, a.id).techId, null);
});

test('held off while the tutorial lessons run', () => {
  const s = game();
  s.scripted = true;
  const a = raiseAlarm(s, 'breaker', 'msb-1-t-A');
  advance(s, 3);
  assert.equal(getAlarm(s, a.id).techId, null);
});

test('with nobody playing, auto-dispatch keeps a run going far longer than no crew orders at all', () => {
  const runs = (auto) => [1, 2, 3, 4].map((seed) => playRun({ seed, policy: 'random', reaction: 1e9, maxSeconds: 1200, config: { tutorial: false, autoDispatch: { enabled: auto, delay: 1 } } }).seconds);
  const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const off = mean(runs(false));
  const on = mean(runs(true));
  assert.ok(on > off * 4, `auto ${on.toFixed(0)} s, none ${off.toFixed(0)} s`);
});
