// Shields on screen (pass 3 spec, section 1).
import test from 'node:test';
import assert from 'node:assert/strict';
import { advance, assign, createGame, raiseAlarm } from '../src/core/index2.js';
import { shieldsModel, spareText } from '../src/ui/shields.js';

const quiet = (config = {}) => createGame({ seed: 1, config: { ...config, director: { enabled: false } } });

test('one shield pair per online hall, all whole at the start', () => {
  const s = quiet({ startHalls: 3 });
  const m = shieldsModel(s);
  assert.deepEqual(m.halls.map((h) => h.hall), [1, 2, 3]);
  for (const h of m.halls) {
    assert.deepEqual(h.power, { status: 'whole', ring: null });
    assert.deepEqual(h.liquid, { status: 'whole', ring: null });
  }
  assert.equal(m.cooling.status, 'whole');
  assert.equal(m.cooling.spare, 4); // 8 installed, 4 needed at 3 halls
});

test('a breaker trip cracks the power shield; its ring runs down with the clock, then the shield breaks', () => {
  const s = quiet({ startHalls: 2 });
  raiseAlarm(s, 'breaker', 'msb-2-b-A');
  let h = shieldsModel(s).halls[1];
  assert.equal(h.power.status, 'cracked');
  assert.ok(Math.abs(h.power.ring - 1) < 0.01);
  advance(s, 22.5); // half the 45 s clock
  h = shieldsModel(s).halls[1];
  assert.ok(Math.abs(h.power.ring - 0.5) < 0.02, `${h.power.ring}`);
  assert.equal(shieldsModel(s).halls[0].power.status, 'whole');
  advance(s, 23);
  h = shieldsModel(s).halls[1];
  assert.equal(h.power.status, 'broken');
  assert.equal(h.power.ring, null);
});

test('with both pairs cracked the ring follows the one with least time left', () => {
  const s = quiet();
  raiseAlarm(s, 'breaker', 'msb-1-t-B');
  advance(s, 20);
  raiseAlarm(s, 'breaker', 'msb-1-b-A');
  const ring = shieldsModel(s).halls[0].power.ring;
  assert.ok(Math.abs(ring - 25 / 45) < 0.02, `${ring}`);
});

test('a leak cracks the liquid shield; the other CDU leaking breaks it', () => {
  const s = quiet();
  raiseAlarm(s, 'leak', 'cdu-1-t');
  advance(s, 15);
  const l = shieldsModel(s).halls[0].liquid;
  assert.equal(l.status, 'cracked');
  assert.ok(Math.abs(l.ring - 0.5) < 0.02, `${l.ring}`);
  raiseAlarm(s, 'leak', 'cdu-1-b');
  assert.deepEqual(shieldsModel(s).halls[0].liquid, { status: 'broken', ring: null });
});

test('the ring stands still while a tech is fixing', () => {
  const s = quiet();
  const alarm = raiseAlarm(s, 'leak', 'cdu-1-t');
  const tech = s.techs[0];
  assign(s, tech.id, alarm.id ?? alarm);
  let guard = 0;
  while (tech.state !== 'fixing' && guard++ < 400) advance(s, 0.05);
  const before = shieldsModel(s).halls[0].liquid.ring;
  advance(s, 1);
  assert.equal(tech.state, 'fixing');
  assert.ok(Math.abs(shieldsModel(s).halls[0].liquid.ring - before) < 1e-6);
});

test('cooling: spares shrink as halls come online; low spares crack it, a short loop breaks it', () => {
  assert.equal(shieldsModel(quiet({ startHalls: 4 })).cooling.spare, 3);
  const five = quiet({ startHalls: 5 });
  let c = shieldsModel(five).cooling;
  assert.equal(c.spare, 1);
  assert.equal(c.status, 'cracked');
  assert.equal(c.ring, null); // low because the campus grew, not because of an alarm
  raiseAlarm(five, 'chiller', 'chiller-A-0');
  advance(five, 30);
  c = shieldsModel(five).cooling;
  assert.equal(c.spare, 0);
  assert.ok(Math.abs(c.ring - 0.5) < 0.02, `${c.ring}`);
  raiseAlarm(five, 'chiller', 'chiller-A-1');
  c = shieldsModel(five).cooling;
  assert.equal(c.status, 'broken');
  assert.equal(c.spare, -1);
  assert.equal(c.ring, null);
  assert.equal(shieldsModel(quiet({ startHalls: 6 })).cooling.spare, 8); // Plant B arrives
});

test('spare text', () => {
  assert.equal(spareText(3), '3 spare');
  assert.equal(spareText(0), '0 spare');
  assert.equal(spareText(-2), '2 short');
});
