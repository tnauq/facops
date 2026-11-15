// The yard's failures (pass 4 spec 7.3, M30).
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  EQUIPMENT_BY_ID, advance, assign, build, createGame, eligibleEquipment, getAlarm, isHalfDark, raiseAlarm, runningChillers,
  serviceOf, step,
} from '../src/core/index2.js';
import { alarmCost } from '../src/core/cost.js';

const NO_BURN = { base: 0, doubling: 150, upkeep: 0, wages: 0 };
const game = (cash = 10000) => createGame({ seed: 1, config: { tutorial: false, autoDispatch: { enabled: false }, director: { enabled: false }, building: { enabled: true, startCash: cash, burn: NO_BURN } } });
const buildAll = (s, ids) => {
  for (const id of ids) build(s, id);
  advance(s, 8.1);
};

test('a transformer short takes its switchboard off at once; with the B side built, the half stays lit', () => {
  const s = game();
  const a = raiseAlarm(s, 'short', 'xfmr-1-t-A');
  assert.equal(isHalfDark(s, 1, 't'), true, 'no backup: dark');
  assert.ok(alarmCost(s, a) > 0);
  const t = game();
  buildAll(t, ['xfmr-1-t-B', 'msb-1-t-B']);
  const b = raiseAlarm(t, 'short', 'xfmr-1-t-A');
  assert.equal(isHalfDark(t, 1, 't'), false);
  assert.equal(alarmCost(t, b), 0);
});

test('a short is fixed in two places: disconnected at its RMU, then repaired at the transformer', () => {
  const s = game();
  const a = raiseAlarm(s, 'short', 'xfmr-1-t-A');
  assert.equal(a.stage, 'disconnect');
  const rmu = EQUIPMENT_BY_ID['rmu-1-t'];
  assert.deepEqual(serviceOf(s, a), { x: rmu.sx, y: rmu.sy });
  const tech = s.techs[0];
  assign(s, tech.id, a.id);
  const events = [];
  for (let i = 0; i < 2400 && getAlarm(s, a.id); i++) {
    step(s, 0.05);
    events.push(...s.events.splice(0));
  }
  assert.equal(getAlarm(s, a.id), null, 'fixed');
  const types = events.map((e) => e.type);
  assert.ok(types.indexOf('disconnect') >= 0 && types.indexOf('disconnect') < types.indexOf('clear'), 'disconnected before it was cleared');
  // The tech finished at the transformer, not at the RMU.
  const x = EQUIPMENT_BY_ID['xfmr-1-t-A'];
  assert.deepEqual([tech.x, tech.y], [x.sx, x.sy]);
  assert.equal(isHalfDark(s, 1, 't'), false);
});

test('once disconnected the short cannot spread; left connected for 45 s, it takes out its RMU', () => {
  const s = game();
  buildAll(s, ['xfmr-1-t-B', 'msb-1-t-B']);
  raiseAlarm(s, 'short', 'xfmr-1-t-A');
  assert.equal(isHalfDark(s, 1, 't'), false, 'the B side carries it');
  advance(s, 46);
  const rmu = s.alarms.find((a) => a.type === 'rmu');
  assert.ok(rmu, 'the RMU faulted');
  assert.equal(isHalfDark(s, 1, 't'), true, 'both sides: dark, backup or not');
});

test('an RMU fault takes out both sides; fixed at the RMU, both come back', () => {
  const s = game();
  buildAll(s, ['xfmr-1-t-B', 'msb-1-t-B']);
  const a = raiseAlarm(s, 'rmu', 'rmu-1-t');
  assert.equal(isHalfDark(s, 1, 't'), true);
  assert.ok(alarmCost(s, a) > 0);
  assert.equal(Number.isFinite(a.clockEnd), false, 'no clock: it is already the worst');
  assign(s, s.techs[0].id, a.id);
  for (let i = 0; i < 2400 && getAlarm(s, a.id); i++) step(s, 0.05);
  assert.equal(isHalfDark(s, 1, 't'), false);
});

test('a dry cooler fan failure can stop chillers; left 60 s, the next unit at the plant fails', () => {
  const s = game();
  buildAll(s, ['chiller-A-1', 'dry-A-1', 'chiller-A-2']);
  assert.equal(runningChillers(s), 3);
  raiseAlarm(s, 'fan', 'dry-A-1');
  assert.equal(runningChillers(s), 2, 'one unit lets only two chillers run');
  advance(s, 61);
  assert.equal(s.alarms.filter((a) => a.type === 'fan').length, 2);
  assert.equal(runningChillers(s), 0);
});

test('yard failures only happen in building mode; the director picks them there', () => {
  const classic = createGame({ seed: 1 });
  for (const t of ['short', 'rmu', 'fan']) assert.deepEqual(eligibleEquipment(classic, t), []);
  // Mercy: with fewer halls online than building.yardFromHalls, no yard failures yet.
  const early = game();
  buildAll(early, ['xfmr-1-t-B', 'msb-1-t-B', 'dry-A-1']);
  for (const t of ['short', 'rmu', 'fan']) assert.deepEqual(eligibleEquipment(early, t), [], `${t} waits`);
  const s = createGame({ seed: 1, config: { tutorial: false, autoDispatch: { enabled: false }, director: { enabled: false }, building: { enabled: true, startCash: 10000, burn: NO_BURN, yardFromHalls: 1 } } });
  buildAll(s, ['xfmr-1-t-B', 'msb-1-t-B', 'dry-A-1']);
  assert.ok(eligibleEquipment(s, 'short').length > 0);
  assert.ok(eligibleEquipment(s, 'rmu').length > 0);
  assert.ok(eligibleEquipment(s, 'fan').length > 0, 'a spare unit makes a fan failure fair');
});

test('a tech walks out through the yard doors to the transformer', () => {
  const s = game();
  const a = raiseAlarm(s, 'rmu', 'rmu-1-t');
  const tech = s.techs[0];
  assign(s, tech.id, a.id);
  assert.ok(tech.path.some((p) => p.y < 0), 'the walk goes outside');
});
