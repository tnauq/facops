import test from 'node:test';
import assert from 'node:assert/strict';
import { assign, coolingShield, getAlarm, gw, powerShield, raiseAlarm } from '../src/core/index.js';
import { near, quietGame, tick } from './helpers.js';

const mw = (state) => Math.round(gw(state).deliveredMw);

test('a fresh campus delivers 500 MW and is green', () => {
  const g = quietGame();
  const load = gw(g);
  assert.equal(load.capacityMw, 500);
  assert.equal(load.deliveredMw, 500);
  assert.equal(load.band, 'green');
});

test('equipment holds one alarm at a time, and alarms must match their equipment', () => {
  const g = quietGame();
  assert.ok(raiseAlarm(g, 'network', 'rack-1-0-2'));
  assert.equal(raiseAlarm(g, 'network', 'rack-1-0-2'), null);
  assert.throws(() => raiseAlarm(g, 'leak', 'rack-1-0-3'));
  assert.throws(() => raiseAlarm(g, 'nonsense', 'rack-1-0-3'));
});

test('network failure: the rack drops to zero at once and spreads every 30 s', () => {
  const g = quietGame();
  raiseAlarm(g, 'network', 'rack-1-0-2');
  tick(g, 0.05);
  assert.equal(mw(g), 475);
  tick(g, 29.9);
  assert.equal(g.alarms.length, 1);
  tick(g, 0.2);
  assert.equal(g.alarms.length, 2, 'one neighbor should now be down');
  assert.equal(mw(g), 450);
  assert.equal(g.stats.spreads, 1);
  const second = g.alarms[1];
  assert.ok(['rack-1-0-1', 'rack-1-0-3'].includes(second.equipId));
  tick(g, 30);
  assert.ok(g.alarms.length >= 3, 'the first failure keeps spreading');
});

test('network failure at the end of a row can only spread inward', () => {
  const g = quietGame();
  raiseAlarm(g, 'network', 'rack-2-1-0');
  tick(g, 30.2);
  assert.equal(g.alarms[1].equipId, 'rack-2-1-1');
});

test('CDU leak: the row throttles to 60%, then shuts down at 30 s', () => {
  const g = quietGame();
  raiseAlarm(g, 'leak', 'cdu-1-0');
  tick(g, 0.05);
  assert.equal(mw(g), 450);
  assert.equal(gw(g).band, 'green');
  tick(g, 29.8);
  assert.equal(mw(g), 450);
  tick(g, 0.3);
  assert.equal(mw(g), 375);
  assert.equal(gw(g).band, 'red');
  assert.equal(g.stats.rowShutdowns, 1);
  tick(g, 60);
  assert.equal(mw(g), 375, 'a shut-down row gets no worse');
});

test('breaker trip: one side costs nothing, the second side trips at 45 s and the hall goes dark', () => {
  const g = quietGame();
  raiseAlarm(g, 'breaker', 'msb-1-A');
  tick(g, 44.8);
  assert.equal(mw(g), 500);
  assert.equal(powerShield(g, 1), 'cracked');
  assert.equal(powerShield(g, 2), 'whole');
  tick(g, 0.4);
  assert.equal(powerShield(g, 1), 'broken');
  assert.equal(mw(g), 250);
  assert.equal(g.stats.hallDark, 1);
  assert.ok(g.events.some((e) => e.type === 'hallDark' && e.hall === 1));
  assert.equal(g.alarms.length, 2);
});

test('breaker trip: resetting either side brings the hall back over about 3 s', () => {
  const g = quietGame({ meter: { start: 1000, max: 1000 } });
  raiseAlarm(g, 'breaker', 'msb-1-A');
  tick(g, 45.2);
  assert.equal(mw(g), 250);
  const second = g.alarms.find((a) => a.equipId === 'msb-1-B');
  assign(g, 'tech-0', second.id);
  tick(g, 20);
  assert.equal(getAlarm(g, second.id), null);
  assert.equal(powerShield(g, 1), 'cracked');
  assert.equal(mw(g), 500);
});

test('chiller trip: one down costs nothing, a second trips at 60 s and every rack throttles', () => {
  const g = quietGame({ meter: { start: 1000, max: 1000 } });
  raiseAlarm(g, 'chiller', 'chiller-0');
  tick(g, 59.8);
  assert.equal(mw(g), 500);
  assert.equal(coolingShield(g), 'cracked');
  tick(g, 0.4);
  assert.equal(coolingShield(g), 'broken');
  assert.equal(g.stats.secondChillers, 1);
  tick(g, 5);
  assert.ok(near(gw(g).fraction, 0.9, 0.01), `after 5 s the campus should be near 90%, was ${gw(g).fraction}`);
  tick(g, 30);
  assert.ok(near(gw(g).fraction, 0.5, 0.001), 'one chiller holds the campus at 50%');
  tick(g, 30);
  assert.equal(coolingShield(g), 'broken');
  assert.equal(g.stats.secondChillers, 2, 'the second alarm, ignored for its own 60 s, trips the last chiller');
  assert.ok(gw(g).fraction < 0.5);
});

test('chiller trip: with none running the campus falls to zero; a restart recovers at the same pace', () => {
  const g = quietGame({ meter: { start: 100000, max: 100000 } });
  for (const id of ['chiller-0', 'chiller-1', 'chiller-2']) raiseAlarm(g, 'chiller', id);
  tick(g, 60);
  assert.ok(gw(g).fraction < 0.001);
  const first = g.alarms[0];
  const second = g.alarms[1];
  assign(g, 'tech-0', first.id);
  assign(g, 'tech-1', second.id);
  tick(g, 20);
  assert.equal(g.alarms.length, 1, 'two chillers should be back');
  const before = gw(g).fraction;
  tick(g, 5);
  assert.ok(near(gw(g).fraction - before, 0.1, 0.01), 'recovery is 10% per 5 s');
});

test('pump overpressure: costs nothing, then bursts at 20 s into two leaks on its own loop', () => {
  const g = quietGame();
  raiseAlarm(g, 'pump', 'pump-1');
  tick(g, 19.8);
  assert.equal(mw(g), 500);
  assert.equal(g.alarms.length, 1);
  tick(g, 0.4);
  assert.deepEqual(g.alarms.map((a) => a.equipId).sort(), ['cdu-2-0', 'cdu-2-1']);
  assert.equal(g.equip['pump-1'].alarmId, null);
  assert.equal(g.equip['pump-1'].overpressure, false);
  assert.equal(g.stats.bursts, 1);
  assert.equal(mw(g), 400);
});

test('pump burst: only leaks where the loop has a dry CDU, and frees a tech who was on the way', () => {
  const g = quietGame();
  raiseAlarm(g, 'leak', 'cdu-1-0');
  const pump = raiseAlarm(g, 'pump', 'pump-0');
  tick(g, 19);
  assign(g, 'tech-1', pump.id);
  tick(g, 1.2);
  assert.equal(g.techs[1].state, 'idle');
  assert.equal(g.techs[1].alarmId, null);
  assert.deepEqual(g.alarms.map((a) => a.equipId).sort(), ['cdu-1-0', 'cdu-1-1']);
});

test('a clock stands still while a tech is on site fixing', () => {
  const g = quietGame();
  const leak = raiseAlarm(g, 'leak', 'cdu-1-0');
  tick(g, 27);
  assign(g, 'tech-0', leak.id);
  tick(g, 12);
  assert.equal(g.stats.rowShutdowns, 0, 'the row must not shut down while someone is fixing the leak');
  assert.equal(getAlarm(g, leak.id), null);
});

test('a rack climbs back over 3 s after its fault clears', () => {
  const g = quietGame();
  const a = raiseAlarm(g, 'network', 'rack-1-0-0');
  assign(g, 'tech-0', a.id);
  while (getAlarm(g, a.id)) tick(g, 0.05);
  tick(g, 1.5);
  assert.ok(near(g.equip['rack-1-0-0'].level, 0.5, 0.05), `half-way after 1.5 s, was ${g.equip['rack-1-0-0'].level}`);
  tick(g, 1.6);
  assert.equal(g.equip['rack-1-0-0'].level, 1);
});
