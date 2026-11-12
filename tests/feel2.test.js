import test from 'node:test';
import assert from 'node:assert/strict';
import { EQUIPMENT_BY_ID, advance, createGame, load, raiseAlarm, step } from '../src/core/index2.js';
import { CELEBRATE_TIME, createFeel2, feelEvents2, flashAlpha, liveCelebrations, liveFloats, lossFloat2 } from '../src/ui/feel2.js';

const quiet = (config = {}) => createGame({ seed: 1, config: { ...config, director: { enabled: false } } });
const drain = (s) => s.events.splice(0);

function floatsFor(s, f) {
  const feel = createFeel2();
  f();
  feelEvents2(feel, drain(s), s);
  return liveFloats(feel, s.t).map((x) => x.text);
}

test('the labels match spec 4.1: -6, -4, -34 and -19 MW', () => {
  const s = quiet({ startHalls: 2 });
  assert.deepEqual(floatsFor(s, () => raiseAlarm(s, 'network', 'row-2-t-1')), ['-6 MW']);
  assert.deepEqual(floatsFor(s, () => raiseAlarm(s, 'leak', 'cdu-1-t')), ['-4 MW']);
  assert.deepEqual(floatsFor(s, () => raiseAlarm(s, 'leak', 'cdu-1-b')), ['-34 MW']);
  raiseAlarm(s, 'breaker', 'msb-2-b-A');
  raiseAlarm(s, 'breaker', 'msb-2-b-B');
  drain(s);
  const feel = createFeel2();
  advance(s, 0.1);
  feelEvents2(feel, drain(s), s);
  assert.ok(liveFloats(feel, s.t).some((x) => x.text === '-19 MW'));
});

test('each label is what the rules actually take away, to the nearest MW', () => {
  const s = quiet();
  const before = load(s).deliveredMw;
  raiseAlarm(s, 'leak', 'cdu-1-t');
  advance(s, 0.1);
  assert.equal(`-${Math.round(before - load(s).deliveredMw)} MW`, '-4 MW');
});

test('labels sit on the equipment, or the middle of the half hall that went dark', () => {
  const s = quiet();
  const f = lossFloat2({ type: 'spawn', alarmType: 'network', equipId: 'row-1-b-2', t: 0 }, s);
  assert.deepEqual([f.x, f.y], [EQUIPMENT_BY_ID['row-1-b-2'].x, EQUIPMENT_BY_ID['row-1-b-2'].y]);
  const d = lossFloat2({ type: 'halfDark', hall: 1, half: 't', t: 0 }, s);
  assert.ok(d.y < 390, 'the top half');
});

test('alarms that cost nothing at first get no label', () => {
  const s = quiet();
  for (const alarmType of ['breaker', 'pump', 'chiller']) {
    assert.equal(lossFloat2({ type: 'spawn', alarmType, equipId: 'msb-1-t-A', t: 0 }, s), null);
  }
});

test('a new hall gets a 2 s celebration saying what it adds', () => {
  const s = quiet();
  const feel = createFeel2();
  s.build = s.config.build.every - 0.01;
  step(s, 0.05);
  feelEvents2(feel, drain(s), s);
  const [c] = liveCelebrations(feel, s.t);
  assert.equal(c.hall, 2);
  assert.equal(c.text, 'Hall 2 online · +38 MW');
  assert.equal(c.k, 0);
  assert.equal(liveCelebrations(feel, s.t + CELEBRATE_TIME / 2)[0].k, 0.5);
  assert.deepEqual(liveCelebrations(feel, s.t + CELEBRATE_TIME + 0.01), []);
});

test('the HUD still flashes on entering red', () => {
  const s = quiet();
  const feel = createFeel2();
  feelEvents2(feel, [{ type: 'band', from: 'yellow', to: 'red', t: 3 }], s);
  assert.ok(Math.abs(flashAlpha(feel, 3) - 1) < 1e-9);
});
