// The CEO's visits and the two pacing changes (pass 3 spec, sections 4.1 to 4.4).
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  EQUIPMENT_BY_ID,
  advance,
  assign,
  ceoSees,
  ceoSeesPoint,
  choose,
  createGame,
  eligibleEquipment,
  load,
  onlineAreas,
  raiseAlarm,
  spawnInterval,
  step,
} from '../src/core/index2.js';
import { pickRoute } from '../src/core/ceo.js';

const quiet = (config = {}, seed = 1) => createGame({ seed, config: { tutorial: false, ...config, director: { enabled: false, ...(config.director ?? {}) } } });

// Finish building the next hall now, taking the first card if there is a pick.
function deliverNow(s) {
  s.build = s.config.build.every;
  step(s, 0.05);
  if (s.pendingPick) choose(s, 0);
}
const eventsOf = (s, type) => s.events.filter((e) => e.type === type);
function stepUntil(s, done, limit = 600) {
  const end = s.t + limit;
  while (!done(s) && !s.over && s.t < end) {
    step(s, 0.05);
    if (s.pendingPick) choose(s, 0);
  }
  assert.ok(done(s), `condition not met by ${s.t.toFixed(1)} s`);
}
const UP = -Math.PI / 2;

test('the ribbon-cutting is announced when hall 3 comes online, for hall 3 only, with a 20 s warning', () => {
  const s = quiet({ startHalls: 2 });
  deliverNow(s);
  step(s, 0.05);
  const [w] = eventsOf(s, 'ceoWarning');
  assert.equal(w.kind, 'ribbon');
  assert.deepEqual(w.areas, ['h3']);
  assert.equal(w.seconds, 20);
  assert.equal(w.cost, 15);
  assert.equal(s.ceo.phase, 'warning');
  advance(s, 19.5);
  assert.equal(s.ceo.phase, 'warning');
  advance(s, 1);
  assert.equal(s.ceo.phase, 'visit');
  assert.equal(eventsOf(s, 'ceoArrive').length, 1);
});

test('no visits before hall 3, none with Start with halls 3 to 7 until hall 8, and none when switched off', () => {
  const early = quiet();
  advance(early, 50);
  assert.equal(eventsOf(early, 'ceoWarning').length, 0);
  const mid = quiet({ startHalls: 5 });
  advance(mid, 60);
  assert.equal(mid.ceo, null);
  const off = quiet({ startHalls: 2, ceo: { enabled: false } });
  deliverNow(off);
  advance(off, 5);
  assert.equal(off.ceo, null);
});

test('the Handover comes with hall 8 and tours every hall; Start with halls 8 gets it 30 s in', () => {
  const s = quiet({ startHalls: 7 });
  deliverNow(s);
  step(s, 0.05);
  assert.equal(s.ceo.kind, 'handover');
  assert.deepEqual(s.ceo.areas, ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'h7', 'h8']);
  assert.equal(s.ceo.cost, 35);
  const eight = quiet({ startHalls: 8 });
  advance(eight, 29.9);
  assert.equal(eight.ceo, null);
  advance(eight, 0.2);
  assert.equal(eight.ceo.kind, 'handover');
});

test('walkthroughs follow the Handover: −50, −70, then zero tolerance with shrinking warnings', () => {
  const s = quiet({ startHalls: 8 });
  const seen = [];
  for (let i = 0; i < 6; i++) {
    stepUntil(s, (g) => g.ceo !== null && g.ceo.number === i + 1, 900);
    const ended = s.t;
    seen.push({ kind: s.ceo.kind, cost: s.ceo.cost, zt: s.ceo.zeroTolerance, warning: Math.round(s.ceo.warningEnd - s.t), next: s.ceo.nextIsZeroTolerance });
    stepUntil(s, (g) => g.ceo === null, 900);
    if (i > 0) assert.ok(ended > 0);
  }
  assert.deepEqual(seen.map((v) => v.kind), ['handover', 'walk', 'walk', 'walk', 'walk', 'walk']);
  assert.deepEqual(seen.slice(1, 3).map((v) => [v.cost, v.warning, v.zt]), [[50, 20, false], [70, 15, false]]);
  assert.equal(seen[2].next, true); // walkthrough 2 announces zero tolerance
  assert.deepEqual(seen.slice(3).map((v) => [v.zt, v.warning]), [[true, 12], [true, 11], [true, 10]]);
});

test('the gap between visits is drawn from 45 to 60 s', () => {
  for (const seed of [1, 2, 3, 4, 5]) {
    const s = quiet({ startHalls: 8 }, seed);
    stepUntil(s, (g) => g.ceo !== null);
    stepUntil(s, (g) => g.ceo === null);
    const left = s.t;
    stepUntil(s, (g) => g.ceo !== null);
    assert.ok(s.t - left >= 45 - 0.06 && s.t - left <= 60 + 0.06, `${(s.t - left).toFixed(1)} s`);
  }
});

test('walkthrough routes are 2 or 3 neighbouring online areas', () => {
  for (const halls of [3, 5, 8]) {
    for (let seed = 1; seed <= 25; seed++) {
      const s = quiet({ startHalls: halls }, seed);
      const all = onlineAreas(s);
      const r = pickRoute(s);
      assert.ok(r.length >= 2 && r.length <= 3, JSON.stringify(r));
      const idx = r.map((a) => all.indexOf(a));
      assert.ok(idx.every((i) => i >= 0), `offline area in ${JSON.stringify(r)}`);
      for (let k = 1; k < idx.length; k++) assert.equal(Math.abs(idx[k] - idx[k - 1]), 1);
    }
  }
  assert.deepEqual(onlineAreas(quiet({ startHalls: 6 })), ['pA', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'pB']);
});

test('the view cone: inside, beyond the radius, outside the angle', () => {
  const s = quiet();
  s.ceo = { phase: 'visit', x: 1000, y: 400, facing: UP };
  assert.ok(ceoSeesPoint(s, 1000, 200)); // straight ahead
  assert.ok(ceoSeesPoint(s, 1080, 200)); // 22° off
  assert.ok(!ceoSeesPoint(s, 1000, 130)); // 270 away
  assert.ok(!ceoSeesPoint(s, 1200, 380)); // 84° off
  assert.ok(!ceoSeesPoint(s, 1000, 500)); // behind
  s.ceo.phase = 'warning';
  assert.ok(!ceoSeesPoint(s, 1000, 200)); // nothing is seen before the CEO arrives
});

// Start the ribbon-cutting and walk until the CEO is inspecting hall 3, facing its top half.
function ribbonInspectingTop() {
  const s = quiet({ startHalls: 2 });
  deliverNow(s);
  stepUntil(s, (g) => g.ceo && g.ceo.phase === 'visit' && g.ceo.steps[g.ceo.step].kind === 'inspect' && g.ceo.facing === UP && g.ceo.stepEnd !== null);
  return s;
}

test('inspecting a hall: the top CDU and rows are seen facing up, the bottom ones facing down; MSBs in the corridor are not', () => {
  const s = ribbonInspectingTop();
  assert.ok(ceoSees(s, 'cdu-3-t'));
  assert.ok(ceoSees(s, 'row-3-t-0') && ceoSees(s, 'row-3-t-2'));
  assert.ok(!ceoSees(s, 'cdu-3-b'));
  assert.ok(!ceoSees(s, 'msb-3-t-A') && !ceoSees(s, 'msb-3-t-B'));
  advance(s, 2.05);
  assert.ok(ceoSees(s, 'cdu-3-b'));
  assert.ok(!ceoSees(s, 'cdu-3-t'));
});

test('an unattended alarm seen costs the visit\'s hit once; a tech on site and fixing is fine; a dropped job is a sighting', () => {
  const s = ribbonInspectingTop();
  // An alarm in view, with a tech already on site and fixing it.
  const a = raiseAlarm(s, 'leak', 'cdu-3-t');
  const tech = s.techs[0];
  const e = EQUIPMENT_BY_ID['cdu-3-t'];
  Object.assign(tech, { x: e.sx, y: e.sy });
  assign(s, tech.id, a.id);
  assert.equal(tech.state, 'fixing');
  const before = s.meter;
  advance(s, 0.5);
  assert.equal(eventsOf(s, 'ceoSighting').length, 0);
  // The tech is pulled off while the CEO is still looking: that is a sighting.
  const elsewhere = raiseAlarm(s, 'chiller', 'chiller-A-0');
  assign(s, tech.id, elsewhere.id);
  step(s, 0.05);
  const sightings = eventsOf(s, 'ceoSighting');
  assert.equal(sightings.length, 1);
  assert.equal(sightings[0].alarmId, a.id);
  assert.ok(Math.abs(s.meter - (before - 15)) < 2, `${before} -> ${s.meter}`);
  // Still in view and still unattended: no second hit this visit.
  advance(s, 1);
  assert.equal(eventsOf(s, 'ceoSighting').length, 1);
  assert.equal(s.stats.ceoSightings, 1);
});

test('a tech still walking to the alarm does not count', () => {
  const s = ribbonInspectingTop();
  s.config.walkSpeed = 1; // nobody arrives in time
  const a = raiseAlarm(s, 'network', 'row-3-t-1');
  assign(s, s.techs[0].id, a.id);
  assert.equal(s.techs[0].state, 'walking');
  step(s, 0.05);
  assert.equal(eventsOf(s, 'ceoSighting').length, 1);
});

test('zero tolerance: one unattended alarm seen ends the run, fired by the CEO', () => {
  const s = ribbonInspectingTop();
  s.ceo.zeroTolerance = true;
  s.ceo.cost = null;
  raiseAlarm(s, 'leak', 'cdu-3-t');
  step(s, 0.05);
  assert.equal(s.over, true);
  assert.equal(s.overReason, 'ceo');
  assert.ok(s.events.some((e) => e.type === 'over' && e.reason === 'ceo'));
});

test('a CEO hit that empties the meter ends the run, with the CEO as the cause', () => {
  const s = ribbonInspectingTop();
  s.meter = 10;
  raiseAlarm(s, 'leak', 'cdu-3-t');
  step(s, 0.05);
  assert.equal(s.over, true);
  assert.equal(s.overReason, 'ceo');
});

test('fairness: during the warning alarms may still start on the route; once the CEO arrives, none can', () => {
  const s = quiet({ startHalls: 2 });
  deliverNow(s);
  step(s, 0.05);
  assert.equal(s.ceo.phase, 'warning');
  assert.ok(eligibleEquipment(s, 'network').some((e) => e.hall === 3));
  stepUntil(s, (g) => g.ceo && g.ceo.phase === 'visit');
  for (const type of ['network', 'leak', 'breaker']) {
    assert.ok(!eligibleEquipment(s, type).some((e) => s.ceo.covered[e.id]), type);
    assert.ok(eligibleEquipment(s, type).length > 0, `${type}: elsewhere still allowed`);
  }
  assert.ok(s.ceo.covered['cdu-3-t'] && s.ceo.covered['row-3-b-1']);
  assert.ok(!s.ceo.covered['row-1-t-0']);
});

test('pacing: a new phase keeps the set share of the tightening already earned', () => {
  const keep = quiet({ startHalls: 3, build: { every: 1000 }, director: { carryOver: 0.5 } }); // no hall on the timer meanwhile
  advance(keep, 100);
  deliverNow(keep);
  const sincePhase = keep.t - keep.phaseStart;
  assert.ok(Math.abs(sincePhase - 50) < 0.2, `${sincePhase}`);
  assert.ok(spawnInterval(keep.config, 4, sincePhase) < spawnInterval(keep.config, 4, 0));
  const reset = quiet({ startHalls: 3, build: { every: 1000 }, director: { carryOver: 0 } });
  advance(reset, 100);
  deliverNow(reset);
  assert.ok(reset.t - reset.phaseStart < 0.1);
});

test('pacing: a dark half-hall drains the meter even while the load is green, at any campus size', () => {
  for (const halls of [5, 8]) {
    const s = quiet({ startHalls: halls });
    s.meter = 50;
    raiseAlarm(s, 'breaker', 'msb-2-t-A');
    raiseAlarm(s, 'breaker', 'msb-2-t-B');
    advance(s, 4);
    assert.equal(load(s).band, 'green', `${halls} halls`);
    const before = s.meter;
    advance(s, 10);
    assert.ok(Math.abs(s.meter - (before - 10 * s.config.meter.darkDrain)) < 0.3, `${halls} halls: ${before} -> ${s.meter}`);
  }
  // A hall shut by two leaks counts as both halves.
  const shut = quiet({ startHalls: 8 });
  shut.meter = 50;
  raiseAlarm(shut, 'leak', 'cdu-4-t');
  raiseAlarm(shut, 'leak', 'cdu-4-b');
  advance(shut, 4);
  const before = shut.meter;
  const band = load(shut).band;
  advance(shut, 10);
  const bandDrain = band === 'yellow' ? shut.config.meter.yellowDrain : 0;
  assert.ok(Math.abs(shut.meter - (before - 10 * (2 * shut.config.meter.darkDrain + bandDrain))) < 0.3, `${before} -> ${shut.meter}`);
});

test('the CEO in a few words; the HUD note keeps the halls, since the banner says it (M18)', async () => {
  const { ceoNote, hudModel2 } = await import('../src/ui/hud2.js');
  const s = quiet({ startHalls: 2 });
  assert.equal(ceoNote(s), null);
  deliverNow(s);
  step(s, 0.05);
  assert.deepEqual(ceoNote(s), { long: 'CEO 0:20 · H3 · −15', short: 'CEO 0:20 −15' });
  assert.match(hudModel2(s).note, /^Hall 3 of 8/);
  stepUntil(s, (g) => g.ceo && g.ceo.phase === 'visit');
  assert.equal(ceoNote(s).long, 'CEO in H3 · −15');
  s.ceo.zeroTolerance = true;
  assert.equal(ceoNote(s).short, 'CEO in ZT');
});
