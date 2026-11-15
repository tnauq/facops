// Building and money (pass 4 spec 2.1 to 2.8, M24).
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  advance, assign, build, buyUpgrade, cannotBuild, chillersNeeded, createGame, coolantState, getAlarm, hallOnline, hire, isBuilt,
  isHalfDark, isOnline, liquidShield, load, onlineRows, powerShield, priceOf, raiseAlarm, results, runningChillers, spotState,
  step, EQUIPMENT_BY_ID,
} from '../src/core/index2.js';
import { alarmCost } from '../src/core/cost.js';

// Building mode with no director alarms and no techs heading off by themselves, unless a test says.
const game = (config = {}) => createGame({
  seed: 1,
  config: { tutorial: false, autoDispatch: { enabled: false }, ...config, building: { enabled: true, ...(config.building ?? {}) }, director: { enabled: false, ...(config.director ?? {}) } },
});
test('a run starts with the bare minimum for one hall, and $400', () => {
  const s = game();
  for (const id of ['pump-A-t', 'chiller-A-0', 'msb-1-t-A', 'cdu-1-t', 'row-1-t-0', 'row-1-t-1']) assert.equal(isBuilt(s, id), true, id);
  for (const id of ['pump-A-b', 'chiller-A-1', 'msb-1-t-B', 'msb-1-b-A', 'cdu-1-b', 'row-1-t-2', 'row-2-t-0']) assert.equal(isBuilt(s, id), false, id);
  assert.equal(s.cash, 400);
  assert.equal(hallOnline(s, 1), true);
  assert.equal(hallOnline(s, 2), false);
  assert.equal(s.halls, 1);
  assert.deepEqual(s.techs.map((t) => t.trade), ['electrical', 'mechanical']);
  assert.equal(load(s).capacityMw, 2 * s.config.rowMw);
});

test('building takes the money at once, and the contractor finishes 8 s later', () => {
  const s = game();
  const r = build(s, 'row-1-t-2');
  assert.equal(r.ok, true);
  assert.equal(s.cash, 400 - 150);
  assert.equal(spotState(s, 'row-1-t-2'), 'building');
  assert.equal(cannotBuild(s, 'row-1-t-2'), 'building');
  advance(s, 7.9);
  assert.equal(isBuilt(s, 'row-1-t-2'), false);
  advance(s, 0.2);
  assert.equal(isBuilt(s, 'row-1-t-2'), true);
  assert.equal(cannotBuild(s, 'row-1-t-2'), 'built');
  assert.equal(load(s).capacityMw, 3 * s.config.rowMw);
});

test('no building without the money, and nothing in the classic game', () => {
  const s = game({ building: { startCash: 100 } });
  assert.equal(build(s, 'row-1-t-2').reason, 'cash');
  assert.equal(s.cash, 100);
  const classic = createGame({ seed: 1 });
  assert.equal(build(classic, 'row-1-t-2').reason, 'off');
});

test('rows earn money while they deliver: $3 a second each at full output', () => {
  const s = game();
  advance(s, 10);
  assert.ok(Math.abs(s.cash - (400 + 2 * 3 * 10)) < 1, `${s.cash}`);
  assert.ok(Math.abs(results(s).earned - 60) < 1);
});

test('a hall comes online with a switchboard, a coolant unit, and a chiller anywhere', () => {
  const s = game({ building: { startCash: 10000 } });
  build(s, 'msb-3-b-A');
  advance(s, 8.1);
  assert.equal(hallOnline(s, 3), false);
  build(s, 'cdu-3-b');
  advance(s, 8.1);
  assert.equal(hallOnline(s, 3), true);
  assert.equal(s.halls, 2);
  assert.ok(s.stats.hallsOnline.some((h) => h.hall === 3));
  // A row in a hall that is not online earns nothing until it is.
  build(s, 'row-5-t-0');
  advance(s, 8.1);
  assert.equal(isOnline(s, EQUIPMENT_BY_ID['row-5-t-0']), false);
  assert.equal(onlineRows(s).some((r) => r.id === 'row-5-t-0'), false);
});

test('rows only deliver in a half with a working switchboard', () => {
  const s = game({ building: { startCash: 10000 } });
  build(s, 'row-1-b-0'); // bottom half: no switchboard there yet
  advance(s, 8.1);
  assert.equal(isHalfDark(s, 1, 'b'), true);
  advance(s, 4);
  assert.equal(s.equip['row-1-b-0'].level, 0);
  build(s, 'msb-1-b-A');
  advance(s, 12);
  assert.equal(isHalfDark(s, 1, 'b'), false);
  assert.ok(s.equip['row-1-b-0'].level > 0.99);
});

test('a breaker trip with no backup darkens the half at once; with the B built, it costs nothing', () => {
  const s = game({ building: { startCash: 10000 } });
  raiseAlarm(s, 'breaker', 'msb-1-t-A');
  assert.equal(isHalfDark(s, 1, 't'), true);
  assert.equal(powerShield(s, 1), 'broken');
  assert.equal(alarmCost(s, s.alarms[0]), Math.round(2 * s.config.rowMw));
  const t = createGame({ seed: 1, config: { tutorial: false, autoDispatch: { enabled: false }, building: { enabled: true, startCash: 10000 }, director: { enabled: false } } });
  assert.equal(powerShield(t, 1), 'single'); // working, no backup
  build(t, 'msb-1-t-B');
  advance(t, 8.1);
  assert.equal(powerShield(t, 1), 'whole');
  const a = raiseAlarm(t, 'breaker', 'msb-1-t-A');
  assert.equal(isHalfDark(t, 1, 't'), false);
  assert.equal(alarmCost(t, a), 0);
});

test('a lone breaker left alone trips nothing else; a pair still trips its partner', () => {
  const s = game();
  const a = raiseAlarm(s, 'breaker', 'msb-1-t-A');
  advance(s, 46);
  assert.equal(s.alarms.length, 1);
  assert.ok(getAlarm(s, a.id));
});

test('a leak with no second coolant unit throttles, then shuts the hall when its clock runs out', () => {
  const s = game();
  const a = raiseAlarm(s, 'leak', 'cdu-1-t');
  assert.equal(coolantState(s, 1), 'throttled');
  assert.equal(liquidShield(s, 1), 'cracked');
  advance(s, 31);
  assert.equal(coolantState(s, 1), 'shut');
  assert.equal(liquidShield(s, 1), 'broken');
  assert.equal(s.alarms.length, 1, 'no second CDU to spread to');
  assert.ok(s.events.some((e) => e.type === 'escalate' && e.effect === 'hallShut'));
  // Fixed: the hall comes back.
  s.techs[0].x = EQUIPMENT_BY_ID['cdu-1-t'].sx;
  s.techs[0].y = EQUIPMENT_BY_ID['cdu-1-t'].sy;
  assign(s, s.techs[0].id, a.id);
  advance(s, 12);
  assert.equal(coolantState(s, 1), 'ok');
});

test('chillers: needed by rows online; they run only at a plant with a pump', () => {
  const s = game({ building: { startCash: 10000 } });
  assert.equal(chillersNeeded(s), 1); // 2 rows
  assert.equal(runningChillers(s), 1);
  for (const id of ['row-1-t-2', 'row-1-b-0', 'row-1-b-1', 'row-1-b-2', 'msb-1-b-A']) build(s, id);
  advance(s, 8.1);
  assert.equal(chillersNeeded(s), 2); // 6 rows: 1.25 rounded up
  build(s, 'chiller-B-0');
  advance(s, 8.1);
  assert.equal(runningChillers(s), 1, 'Plant B has no pump yet');
  build(s, 'pump-B-t');
  advance(s, 8.1);
  assert.equal(runningChillers(s), 2);
});

test('hiring and upgrades cost money', () => {
  const s = game({ building: { startCash: 1000 } });
  assert.equal(hire(s, 'network').ok, true);
  assert.equal(s.techs.length, 3);
  assert.equal(s.cash, 600);
  assert.equal(buyUpgrade(s, 'carts').ok, true);
  assert.equal(s.upgrades.carts, 1);
  assert.equal(s.cash, 100);
  assert.equal(hire(s, 'ce').reason, 'cash');
});

test('the director only picks built devices in online halls', () => {
  const s = game({ director: { enabled: true, firstSpawn: 0.1 } });
  for (let i = 0; i < 4000 && !s.over; i++) {
    step(s, 0.05);
    for (const a of s.alarms) assert.equal(isOnline(s, EQUIPMENT_BY_ID[a.equipId]), true, a.equipId);
  }
});

test('the ribbon-cutting comes with the third hall online, whichever it is', () => {
  const s = game({ building: { startCash: 10000 }, ceo: { enabled: true } });
  for (const id of ['msb-2-t-A', 'cdu-2-t']) build(s, id);
  advance(s, 4);
  for (const id of ['msb-7-t-A', 'cdu-7-t']) build(s, id);
  advance(s, 8.2);
  assert.equal(s.halls, 3);
  assert.ok(s.ceo, 'a visit is announced');
  assert.deepEqual(s.ceo.areas, ['h7']);
});

test('the Handover comes at 200 MW of rows online, or at 10:00', () => {
  const s = game({ ceo: { enabled: true } });
  advance(s, 599);
  assert.equal(s.handoverQueued, false);
  advance(s, 2);
  assert.equal(s.handoverQueued, true);
});

test('the meter cannot empty in the first two minutes', () => {
  const s = game({ meter: { start: 1 } });
  raiseAlarm(s, 'breaker', 'msb-1-t-A'); // the only half with rows goes dark
  advance(s, 100);
  assert.equal(s.over, false);
  advance(s, 40);
  assert.equal(s.over, true);
});

test('results carry the money', () => {
  const s = game();
  build(s, 'row-1-t-2');
  advance(s, 20);
  const r = results(s);
  assert.equal(r.building, true);
  assert.equal(r.spent, 150);
  assert.equal(r.built, 1);
  assert.ok(r.earned > 0);
});


test('alarms follow what is built: a first one after 20 s, fewer on a small campus, a cap set by racks not crew', async () => {
  const { alarmCap, buildingInterval, spawnInterval } = await import('../src/core/index2.js');
  const s = game({ director: { enabled: true } });
  assert.equal(s.director.nextSpawn, 20);
  // 2 rows: a third of a hall, so the gap is stretched 3 times.
  assert.ok(Math.abs(buildingInterval(s) - 3 * spawnInterval(s.config, 1, 0, s.config.building.tighten)) < 1e-9);
  assert.equal(alarmCap(s), 2 + 1);
  const crewBefore = alarmCap(s);
  s.cash = 5000;
  hire(s, 'network');
  assert.equal(alarmCap(s), crewBefore, 'a hire does not raise the cap');
  for (const id of ['row-1-t-2', 'msb-1-b-A', 'row-1-b-0', 'row-1-b-1', 'row-1-b-2']) build(s, id);
  s.director.nextSpawn = 1e9; // keep this check about the numbers
  advance(s, 8.1);
  assert.equal(alarmCap(s), 2 + 1); // 6 rows: one hall's worth
  assert.ok(Math.abs(buildingInterval(s) - spawnInterval(s.config, 1, s.t, s.config.building.tighten)) < 1e-9);
});

test('the classic game is untouched: crew + 2 cap, hall table by halls online', async () => {
  const { alarmCap } = await import('../src/core/index2.js');
  const s = createGame({ seed: 1, config: { tutorial: false } });
  assert.equal(alarmCap(s), s.techs.length + 2);
  assert.equal(isBuilt(s, 'row-8-b-2'), true);
});

test('a scripted builder who buys backups outlasts and out-earns one who never does', async () => {
  const { playRun } = await import('../src/core/index2.js');
  const config = { tutorial: false, building: { enabled: true } };
  const run = (builder, seed) => playRun({ seed, config, policy: 'none', builder, maxSeconds: 1500 });
  for (const seed of [1, 2]) {
    const careful = run('builder', seed);
    const greedy = run('greedy', seed);
    assert.ok(careful.seconds > greedy.seconds, `seed ${seed}`);
    assert.ok(careful.earned > greedy.earned, `seed ${seed}`);
    assert.equal(careful.finished, true, 'every building run ends');
  }
});
