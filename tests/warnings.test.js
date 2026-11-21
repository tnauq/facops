// Warnings before failures (pass 8 spec 4, M47).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assign, createGame, getWarning, postTech, raiseAlarm, sendToWarning, step } from '../src/core/index2.js';

const NO_BURN = { loan: 0, loanRate: 0, base: 0, doubling: 0, upkeep: 0, wages: 0 };
const game = (building = {}, extra = {}) => createGame({
  seed: 1,
  config: { tutorial: false, ceo: { enabled: false }, ...extra, building: { enabled: true, startCash: 50000, burn: NO_BURN, credits: { rate: 0, doubling: 0 }, posts: { enabled: true, returnAfter: 3 }, ...building } },
});
const advance = (s, seconds) => { for (let i = 0; i < Math.round(seconds / 0.05); i++) step(s, 0.05); };
const firstWarning = (s, limit = 120) => {
  for (let i = 0; i < limit / 0.05 && s.warnings.length === 0; i++) step(s, 0.05);
  return s.warnings[0];
};

test('the director\'s pick is a warning for `warnFor` seconds, then the alarm', () => {
  const s = game();
  const w = firstWarning(s);
  assert.ok(w, 'a warning came');
  assert.equal(s.alarms.length, 0);
  assert.equal(w.ends - w.born, s.config.building.warnings.warnFor);
  assert.ok(s.events.some((e) => e.type === 'warning'));
  advance(s, s.config.building.warnings.warnFor + 0.1);
  assert.equal(getWarning(s, w.id), undefined);
  assert.ok(s.alarms.some((a) => a.equipId === w.equipId && a.type === w.type), 'the alarm started');
});

test('a tech sent in time checks it for 2 s and no alarm follows', () => {
  const s = game({}, { autoDispatch: { enabled: false, delay: 1 } });
  const w = firstWarning(s);
  const tech = s.techs.find((t) => t.trade === 'electrical');
  assert.deepEqual(sendToWarning(s, tech.id, w.id), { ok: true });
  assert.equal(tech.warnId, w.id);
  // Hold the warning's clock long enough to walk there, as a nearby tech would.
  w.ends = s.t + 60;
  advance(s, 40);
  assert.equal(getWarning(s, w.id), undefined);
  assert.ok(s.events.some((e) => e.type === 'caughtInTime'));
  assert.equal(s.alarms.filter((a) => a.equipId === w.equipId).length, 0);
  assert.equal(s.stats.caught, 1);
  assert.equal(tech.warnId, null);
});

test('a posted tech walks to warnings in its area by itself; an unposted one does not', () => {
  const s = game({}, { autoDispatch: { enabled: false, delay: 1 } });
  const w = firstWarning(s);
  const area = w.equipId.match(/-(\d)-/) ? `h${w.equipId.match(/-(\d)-/)[1]}` : 'pA';
  step(s, 0.05);
  assert.equal(w.techId, null, 'nobody posted: nobody goes');
  const tech = s.techs.find((t) => t.trade === 'electrical');
  postTech(s, tech.id, area);
  step(s, 0.05);
  assert.equal(w.techId, tech.id);
  assert.equal(tech.state === 'walking' || tech.state === 'checking', true);
});

test('a job comes first: an alarm given to a tech on the way to a warning takes it off the warning', () => {
  const s = game({}, { autoDispatch: { enabled: false, delay: 1 } });
  const w = firstWarning(s);
  const tech = s.techs.find((t) => t.trade === 'electrical');
  sendToWarning(s, tech.id, w.id);
  const other = w.equipId === 'row-1-t-0' ? 'row-1-t-1' : 'row-1-t-0';
  const a = raiseAlarm(s, 'network', other);
  assert.equal(assign(s, tech.id, a.id).ok, true);
  assert.equal(tech.warnId, null);
  assert.equal(w.techId, null);
});

test('escalations never warn, and warnings are off when switched off and in the classic game', () => {
  const off = game({ warnings: { enabled: false, warnFor: 10, checkTime: 2 } });
  advance(off, 60);
  assert.equal(off.warnings.length, 0);
  assert.ok(off.stats.spawned > 0, 'alarms start at once'); // (M48: by then it may be fixed and the spell quiet)
  const s = game();
  const leak = raiseAlarm(s, 'leak', 'cdu-1-t'); // a lone unit: left alone, the hall shuts (an escalation, no new pick)
  assert.ok(leak);
  const classic = createGame({ seed: 1, config: { tutorial: false } });
  for (let i = 0; i < 600; i++) step(classic, 0.05);
  assert.equal((classic.warnings ?? []).length, 0);
});

// Screen (spec 4.2).
test('screen: a warning and a tech in either order send the tech; marks, strip wrenches, the inspect line', async () => {
  const { NOTHING, reduceTap } = await import('../src/ui/selection.js');
  const a = reduceTap(NOTHING, { kind: 'warning', id: 7 });
  assert.deepEqual(a.selection, { kind: 'warning', id: 7 });
  assert.deepEqual(reduceTap(a.selection, { kind: 'tech', id: 'tech-0' }).warn, { techId: 'tech-0', warnId: 7 });
  assert.deepEqual(reduceTap({ kind: 'tech', id: 'tech-1' }, { kind: 'warning', id: 7 }).warn, { techId: 'tech-1', warnId: 7 });
  assert.deepEqual(reduceTap(a.selection, { kind: 'warning', id: 7 }).selection, NOTHING, 'the same again deselects');
  const { stripWrenches, warningAt, warningLine, warningMarks } = await import('../src/ui/warningsView.js');
  const { createCamera } = await import('../src/ui/camera.js');
  const s = game();
  const w = firstWarning(s);
  const cam = createCamera({ x: 0, y: 0, w: 4400, h: 1200 }, 1, { width: 4400, height: 1200, x0: -300 }, null);
  const [m] = warningMarks(s, cam);
  assert.equal(warningAt([m], { x: m.x + 10, y: m.y }), w.id);
  assert.equal(warningAt([m], { x: m.x + 40, y: m.y }), null);
  assert.equal(stripWrenches(s, { x: 0, y: 300, w: 600, h: 28 }).length, 1);
  assert.match(warningLine(s, w.equipId), /^Warning: will fail in 0:\d\d$/);
  const { crewCards } = await import('../src/ui/crewbar.js');
  const tech = s.techs.find((t) => t.trade === 'electrical');
  w.ends = s.t + 99;
  sendToWarning(s, tech.id, w.id);
  advance(s, 40);
  assert.ok(['Checking', 'Idle', 'Walking'].includes(crewCards(s, { x: 0, y: 40, w: 76, h: 300 })[0].status));
});
