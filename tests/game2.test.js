// The pass 2 rules (spec docs/pass2-spec.md, sections 4 to 6).
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  EQUIPMENT,
  UPGRADES,
  advance,
  alarmCap,
  buildProgress,
  setScripted,
  arrivalPoint,
  assign,
  choose,
  chillersNeeded,
  coolingShield,
  createGame,
  eligibleEquipment,
  fixDuration,
  isOnline,
  liquidShield,
  load,
  playRun,
  powerShield,
  pumpLoop,
  raiseAlarm,
  results,
  resultsText,
  runningChillers,
  spawnInterval,
  step,
  walkSpeed,
} from '../src/core/index2.js';

const near = (a, b, tol = 1e-6) => Math.abs(a - b) <= tol;
const quiet = (config = {}, seed = 1) => createGame({ seed, config: { ...config, director: { enabled: false, ...(config.director ?? {}) } } });
const tick = (s, seconds) => advance(s, seconds, 0.05);
const lost = (s, f) => {
  const full = load(s).deliveredMw;
  f();
  tick(s, 0.1);
  return full - load(s).deliveredMw;
};
// Finish construction so the next step is a Delivery.
function deliverNow(s) {
  s.build = s.config.build.every - 0.01;
  step(s, 0.05);
}
function deliverTo(s, halls) {
  while (s.halls < halls) {
    deliverNow(s);
    if (s.pendingPick) choose(s, 0);
  }
}

// ---- Start of a run ----

test('a run starts with hall 1, Electrical and Mechanical, 37.5 MW', () => {
  const s = createGame({ seed: 3 });
  assert.equal(s.halls, 1);
  assert.deepEqual(s.techs.map((t) => t.trade), ['electrical', 'mechanical']);
  assert.deepEqual(load(s), { deliveredMw: 37.5, capacityMw: 37.5, fraction: 1, band: 'green' });
  assert.equal(s.meter, 40);
});

test('the full building is 300 MW', () => {
  const s = quiet({ startHalls: 8 });
  assert.equal(load(s).capacityMw, 300);
  assert.equal(load(s).deliveredMw, 300);
});

test('starting with more halls brings the automatic hires too', () => {
  const s = quiet({ startHalls: 3 });
  assert.deepEqual(s.techs.map((t) => t.trade), ['electrical', 'mechanical', 'ce', 'network']);
  assert.deepEqual({ x: s.techs[3].x, y: s.techs[3].y }, arrivalPoint(3));
});

test('only online equipment can have alarms', () => {
  const s = quiet();
  assert.throws(() => raiseAlarm(s, 'leak', 'cdu-2-t'), /not online/);
  assert.throws(() => raiseAlarm(s, 'chiller', 'chiller-B-0'), /not online/);
  assert.ok(raiseAlarm(s, 'leak', 'cdu-1-t'));
});

// ---- Load and losses (spec 4.1 to 4.3a) ----

test('a network failure costs one row: 6.25 MW', () => {
  const s = quiet();
  assert.ok(near(lost(s, () => raiseAlarm(s, 'network', 'row-1-t-1')), 6.25));
});

test('one CDU leaking throttles the hall to 90%: 3.75 MW, and hall 1 stays green', () => {
  const s = quiet();
  assert.ok(near(lost(s, () => raiseAlarm(s, 'leak', 'cdu-1-b')), 3.75));
  assert.equal(load(s).band, 'green');
  assert.equal(liquidShield(s, 1), 'cracked');
});

test('both CDUs leaking shut every row of the hall', () => {
  const s = quiet();
  raiseAlarm(s, 'leak', 'cdu-1-t');
  tick(s, 0.1);
  assert.ok(near(lost(s, () => raiseAlarm(s, 'leak', 'cdu-1-b')), 33.75));
  assert.equal(load(s).deliveredMw, 0);
  assert.equal(liquidShield(s, 1), 'broken');
});

test('an ignored leak spreads to the hall\'s other CDU after 30 s', () => {
  const s = quiet();
  raiseAlarm(s, 'leak', 'cdu-1-t');
  tick(s, 29.9);
  assert.equal(s.equip['cdu-1-b'].leaking, false);
  tick(s, 0.2);
  assert.equal(s.equip['cdu-1-b'].leaking, true);
  assert.equal(s.alarms.length, 2);
  assert.equal(results(s).leakSpreads, 1);
});

test('one MSB of a pair down costs nothing; both darken that half: 18.75 MW', () => {
  const s = quiet();
  assert.equal(lost(s, () => raiseAlarm(s, 'breaker', 'msb-1-t-A')), 0);
  assert.equal(powerShield(s, 1), 'cracked');
  assert.ok(near(lost(s, () => raiseAlarm(s, 'breaker', 'msb-1-t-B')), 18.75));
  assert.equal(powerShield(s, 1), 'broken');
  // The bottom pair still feeds the bottom rows.
  assert.ok(near(load(s).deliveredMw, 18.75));
  assert.ok(s.events.some((e) => e.type === 'halfDark' && e.hall === 1 && e.half === 't'));
});

test('an ignored breaker trips the other MSB of the same pair after 45 s', () => {
  const s = quiet();
  raiseAlarm(s, 'breaker', 'msb-1-b-B');
  tick(s, 45.1);
  assert.equal(s.equip['msb-1-b-A'].tripped, true);
  assert.equal(s.equip['msb-1-t-A'].tripped, false);
});

test('an ignored network failure takes down the next row in the same half', () => {
  const s = quiet({ startHalls: 2 });
  raiseAlarm(s, 'network', 'row-2-b-0');
  tick(s, 30.1);
  assert.equal(s.equip['row-2-b-1'].netDown, true);
  assert.equal(s.alarms.length, 2);
  for (const id of ['row-2-t-0', 'row-2-t-1']) assert.equal(s.equip[id].netDown, false);
});

test('fixing a leak brings the rows back over 3 s', () => {
  const s = quiet();
  const a = raiseAlarm(s, 'leak', 'cdu-1-t');
  assign(s, 'tech-0', a.id);
  let guard = 0;
  while (s.alarms.length && guard++ < 2000) step(s, 0.05);
  assert.equal(s.alarms.length, 0);
  assert.ok(load(s).deliveredMw < 37.5);
  tick(s, 3.1);
  assert.equal(load(s).deliveredMw, 37.5);
});

// ---- Cooling (spec 4.4) ----

test('chillers needed follow the spec table', () => {
  const s = quiet();
  const want = [2, 3, 4, 5, 7, 8, 9, 10];
  for (let h = 1; h <= 8; h++) {
    s.halls = h;
    assert.equal(chillersNeeded(s), want[h - 1], `${h} halls`);
  }
});

test('Plant A runs 8 chillers; Plant B adds 8 with hall 6', () => {
  const s = quiet();
  assert.equal(runningChillers(s), 8);
  deliverTo(s, 5);
  assert.equal(runningChillers(s), 8);
  deliverTo(s, 6);
  assert.equal(runningChillers(s), 16);
});

test('the cooling shield shows the spares left', () => {
  const s = quiet({ startHalls: 4 }); // needs 5 of 8
  assert.equal(coolingShield(s), 'whole');
  for (const i of [0, 1]) raiseAlarm(s, 'chiller', `chiller-A-${i}`);
  assert.equal(coolingShield(s), 'cracked'); // 6 running, 1 spare
  raiseAlarm(s, 'chiller', 'chiller-A-2');
  assert.equal(coolingShield(s), 'cracked'); // 5 running, 0 spare
  raiseAlarm(s, 'chiller', 'chiller-A-3');
  assert.equal(coolingShield(s), 'broken'); // 4 running, short by 1
});

test('short of chillers, cooling drifts down to running ÷ needed', () => {
  const s = quiet({ startHalls: 4 }); // needs 5
  for (const i of [0, 1, 2, 3]) raiseAlarm(s, 'chiller', `chiller-A-${i}`);
  tick(s, 5);
  assert.ok(near(s.thermal, 0.9, 1e-6)); // 0.02 a second
  tick(s, 15); // before the ignored chillers escalate at 60 s
  assert.ok(near(s.thermal, 0.8, 1e-6)); // 4 of 5
});

test('a spare chiller tripping costs nothing', () => {
  const s = quiet();
  assert.equal(lost(s, () => raiseAlarm(s, 'chiller', 'chiller-A-4')), 0);
  tick(s, 10);
  assert.equal(s.thermal, 1);
});

// ---- Pumps (spec 4.5) ----

test('before Plant B, Plant A\'s top pump feeds every online top CDU', () => {
  const s = quiet({ startHalls: 5 });
  assert.deepEqual(pumpLoop(s, 'pump-A-t').map((c) => c.id).sort(), ['cdu-1-t', 'cdu-2-t', 'cdu-3-t', 'cdu-4-t', 'cdu-5-t']);
  assert.equal(pumpLoop(s, 'pump-A-b').every((c) => c.half === 'b'), true);
});

test('after Plant B, each plant\'s pumps feed the halls in its half', () => {
  const s = quiet({ startHalls: 8 });
  assert.deepEqual(pumpLoop(s, 'pump-A-b').map((c) => c.hall).sort(), [1, 2, 3, 4]);
  assert.deepEqual(pumpLoop(s, 'pump-B-b').map((c) => c.hall).sort(), [5, 6, 7, 8]);
});

test('a burst leaks only on its own loop, never both CDUs of one hall', () => {
  for (let seed = 1; seed <= 10; seed++) {
    const s = quiet({ startHalls: 8 }, seed);
    raiseAlarm(s, 'pump', 'pump-B-t');
    tick(s, 20.1);
    const leaks = s.alarms.filter((a) => a.type === 'leak').map((a) => a.equipId);
    assert.equal(leaks.length, 2);
    for (const id of leaks) assert.match(id, /^cdu-[5-8]-t$/);
    assert.equal(s.alarms.some((a) => a.type === 'pump'), false, 'the pump alarm ends');
  }
});

// ---- Deliveries and crew (spec 4.6 and 6) ----

test('finished construction brings the next hall; the meter keeps its value; 5 quiet seconds', () => {
  const s = createGame({ seed: 2 });
  tick(s, 6); // past the first alarm
  const meter = s.meter;
  deliverNow(s);
  assert.equal(s.halls, 2);
  assert.ok(Math.abs(s.meter - meter) < 0.2, 'no reset: the meter is the survival buffer');
  assert.equal(s.build, 0);
  assert.ok(near(s.director.nextSpawn, s.t + 5));
  assert.equal(load(s).capacityMw, 75);
  assert.ok(s.events.some((e) => e.type === 'delivery' && e.hall === 2 && e.plantB === false));
});

test('Deliveries 1 and 2 bring Critical Environment and Network automatically', () => {
  const s = quiet();
  deliverNow(s);
  assert.equal(s.pendingPick, null);
  assert.equal(s.techs.at(-1).trade, 'ce');
  assert.deepEqual({ x: s.techs.at(-1).x, y: s.techs.at(-1).y }, arrivalPoint(2));
  deliverNow(s);
  assert.equal(s.techs.at(-1).trade, 'network');
  assert.equal(s.techs.length, 4);
});

test('from hall 4 a Delivery offers two Hire cards and an Upgrade, and the game waits', () => {
  const s = quiet({}, 5);
  deliverTo(s, 3);
  deliverNow(s);
  assert.equal(s.halls, 4);
  const pick = s.pendingPick;
  assert.ok(pick);
  assert.equal(pick.hall, 4);
  assert.deepEqual(pick.cards.map((c) => c.kind), ['hire', 'hire', 'upgrade']);
  // One of each trade so far; ties go Network, Mechanical, Critical Environment, Electrical.
  assert.deepEqual(pick.cards.slice(0, 2).map((c) => c.trade), ['network', 'mechanical']);
  const t = s.t;
  step(s, 1);
  assert.equal(s.t, t, 'the game waits while the cards are up');
  assert.deepEqual(choose(s, 0), { ok: true });
  assert.equal(s.techs.at(-1).trade, 'network');
  assert.equal(s.pendingPick, null);
});

test('upgrades: Carts walk faster, Better tools fix faster, Radios hold progress longer', () => {
  const s = quiet();
  const walk0 = walkSpeed(s);
  const fix0 = fixDuration(s, 'leak', 'ce');
  s.upgrades.carts = 2;
  s.upgrades.tools = 1;
  assert.ok(near(walkSpeed(s), walk0 * 1.4));
  assert.ok(near(fixDuration(s, 'leak', 'ce'), fix0 * 0.85));
  s.upgrades.radios = 1;
  const a = raiseAlarm(s, 'leak', 'cdu-1-t');
  const b = raiseAlarm(s, 'breaker', 'msb-1-t-A');
  assign(s, 'tech-0', a.id);
  assign(s, 'tech-0', b.id); // a redirect
  assert.ok(near(s.alarms.find((x) => x.id === a.id).holdUntil - s.t, UPGRADES.radios.progressHold));
});

test('a maxed upgrade is not offered again', () => {
  const s = quiet({}, 9);
  deliverTo(s, 3);
  s.upgrades = { carts: 2, tools: 2, radios: 1 };
  deliverNow(s);
  assert.deepEqual(s.pendingPick.cards.map((c) => c.kind), ['hire', 'hire', 'hire']);
});

test('Plant B comes online with hall 6', () => {
  const s = quiet();
  deliverTo(s, 5);
  assert.equal(isOnline(s, EQUIPMENT.find((e) => e.id === 'chiller-B-0')), false);
  deliverTo(s, 6);
  assert.equal(isOnline(s, EQUIPMENT.find((e) => e.id === 'chiller-B-0')), true);
  assert.ok(s.events.some((e) => e.type === 'delivery' && e.hall === 6 && e.plantB));
});

test('hall 8 coming online is Full campus; then the cap starts to rise', () => {
  const s = quiet({ startHalls: 7 });
  deliverNow(s);
  if (s.pendingPick) choose(s, 0);
  const cap = alarmCap(s);
  assert.equal(s.halls, 8);
  assert.ok(s.fullCampusAt !== null);
  assert.ok(s.events.some((e) => e.type === 'fullCampus'));
  tick(s, s.config.director.capGrowEvery + 0.1);
  assert.equal(alarmCap(s), cap + 1);
});

test('the run cannot be lost before the first Delivery, and the first Delivery always comes', () => {
  // The owner found that a meter-driven Delivery could stall hall 1 for ever. Now nobody playing
  // still gets hall 2 on the timer, and the run then ends.
  const s = createGame({ seed: 4 });
  let lowest = Infinity;
  while (s.halls < 2 && s.t < 600) {
    step(s, 0.05);
    lowest = Math.min(lowest, s.meter);
  }
  assert.equal(s.halls, 2);
  assert.ok(s.t <= s.config.build.every + 0.1, `hall 2 at ${s.t.toFixed(0)} s`);
  assert.ok(lowest >= 1);
  while (!s.over && s.pendingPick === null && s.t < 1500) step(s, 0.05);
  assert.equal(s.over, true);
});

test('construction: a hall every 90 s, 1.5 times faster while green, paused while scripted', () => {
  const green = quiet();
  let t = 0;
  while (green.halls < 2) { step(green, 0.05); t += 0.05; }
  assert.ok(Math.abs(t - 60) < 0.1, `all green: ${t.toFixed(2)} s`);
  const red = quiet();
  raiseAlarm(red, 'breaker', 'msb-1-t-A');
  raiseAlarm(red, 'breaker', 'msb-1-t-B'); // half the hall dark: red
  tick(red, 1);
  assert.equal(load(red).band, 'red');
  assert.ok(Math.abs(buildProgress(red) - 1 / 90) < 0.002);
  const tut = quiet();
  setScripted(tut, true);
  tick(tut, 30);
  assert.equal(buildProgress(tut), 0);
});

// ---- The director (spec 4.7) ----

test('with one hall only Breaker, Chiller and Leak appear; from hall 2, all five', () => {
  const s = quiet();
  assert.deepEqual(eligibleEquipment(s, 'network'), []);
  assert.deepEqual(eligibleEquipment(s, 'pump'), []);
  assert.ok(eligibleEquipment(s, 'breaker').length > 0);
  deliverNow(s);
  assert.ok(eligibleEquipment(s, 'network').length > 0);
  assert.ok(eligibleEquipment(s, 'pump').length > 0);
});

test('the director picks only online equipment', () => {
  const s = quiet({ startHalls: 3 });
  for (const type of ['network', 'leak', 'breaker', 'chiller', 'pump']) {
    for (const e of eligibleEquipment(s, type)) assert.ok(isOnline(s, e), `${type} on ${e.id}`);
  }
});

test('mercy: never the second MSB of a pair, never a leak beside a leak, chillers only with a spare', () => {
  const s = quiet({ startHalls: 5 }); // needs 7 of 8 chillers
  raiseAlarm(s, 'breaker', 'msb-2-t-A');
  raiseAlarm(s, 'leak', 'cdu-3-t');
  const msbs = eligibleEquipment(s, 'breaker').map((e) => e.id);
  assert.ok(!msbs.includes('msb-2-t-B'));
  assert.ok(msbs.includes('msb-2-b-A'));
  assert.ok(!eligibleEquipment(s, 'leak').some((e) => e.id === 'cdu-3-b'));
  assert.ok(eligibleEquipment(s, 'chiller').length > 0); // 1 spare
  raiseAlarm(s, 'chiller', 'chiller-A-0');
  assert.deepEqual(eligibleEquipment(s, 'chiller'), []); // 0 spare
});

test('phase intervals follow the table and tighten 5% every 10 s', () => {
  const cfg = createGame().config;
  assert.deepEqual([1, 2, 3, 4, 5, 6, 7, 8].map((h) => spawnInterval(cfg, h, 0)), [12, 9, 7.5, 6.5, 5.5, 5, 4.5, 4]);
  assert.ok(near(spawnInterval(cfg, 1, 10), 12 * 0.95));
  assert.equal(spawnInterval(cfg, 8, 10000), 1.5);
});

test('the cap is crew size + 2', () => {
  const s = createGame();
  assert.equal(alarmCap(s), 4);
  for (let i = 0; i < 2000; i++) {
    step(s, 0.05);
    assert.ok(s.alarms.filter((a) => a.cause === 'director').length <= alarmCap(s) + 2);
  }
});

// ---- Whole runs ----

test('the same seed gives the same run', () => {
  const a = playRun({ seed: 7, maxSeconds: 400 });
  const b = playRun({ seed: 7, maxSeconds: 400 });
  assert.equal(resultsText(a.state), resultsText(b.state));
});

test('results and the Copy text include halls, Deliveries, crew and picks', () => {
  const r = playRun({ seed: 3, maxSeconds: 1500 });
  assert.ok(r.halls >= 4, `reached ${r.halls} halls`);
  assert.equal(r.deliveries.length, r.halls - 1);
  assert.equal(r.crew.length, r.state.techs.length);
  const text = resultsText(r.state);
  assert.match(text, /^FacOps pass 2 results/);
  assert.match(text, /Halls: \d of 8/);
  assert.match(text, /Deliveries: H2 \d+:\d\d/);
  assert.match(text, /Crew: /);
  assert.match(text, /Picks: /);
});

test('pacing (spec 4.6, 4.7): hall 2 within 90 s, hall 8 at about 6 to 9 minutes, runs of 6 to 13 minutes', () => {
  const runs = [1, 2, 3, 4, 5, 6].map((seed) => playRun({ seed, maxSeconds: 1500 }));
  for (const r of runs) {
    assert.ok(r.deliveries[0].t <= 90.1, `hall 2 at ${r.deliveries[0].t.toFixed(0)} s`);
    assert.ok(r.finished, 'every run ends');
    const h8 = r.deliveries.find((d) => d.hall === 8);
    if (h8) assert.ok(h8.t >= 360 && h8.t <= 560, `hall 8 at ${h8.t.toFixed(0)} s`);
  }
  const avgLen = runs.reduce((x, r) => x + r.seconds, 0) / runs.length;
  assert.ok(avgLen >= 360 && avgLen <= 780, `runs last ${avgLen.toFixed(0)} s on average`);
  assert.ok(runs.every((r) => r.halls === 8), 'a good scripted player reaches hall 8');
});
