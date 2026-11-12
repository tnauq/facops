import test from 'node:test';
import assert from 'node:assert/strict';
import { EQUIPMENT_BY_ID, HALLS, createGame, gw, raiseAlarm, step } from '../src/core/index.js';
import {
  FLASH_TIME,
  FLOAT_LIFE,
  FLOAT_RISE,
  POP_TIME,
  bobOffset,
  createFeel,
  feelEvents,
  flashAlpha,
  liveFloats,
  lossFloat,
  lossMw,
  popScale,
} from '../src/ui/feel.js';
import { quietGame, tick } from './helpers.js';

const drain = (s) => s.events.splice(0);

test('the loss labels match spec 11: -25, -50, -75 and -250 MW', () => {
  const s = quietGame();
  const cfg = s.config;
  assert.equal(lossFloat({ type: 'spawn', alarmType: 'network', equipId: 'rack-1-0-2', t: 0 }, cfg).text, '-25 MW');
  assert.equal(lossFloat({ type: 'spawn', alarmType: 'leak', equipId: 'cdu-2-1', t: 0 }, cfg).text, '-50 MW');
  assert.equal(lossFloat({ type: 'escalate', effect: 'rowShutdown', equipId: 'cdu-2-1', t: 0 }, cfg).text, '-75 MW');
  assert.equal(lossFloat({ type: 'hallDark', hall: 1, t: 0 }, cfg).text, '-250 MW');
});

test('the labels agree with what the rules actually take away', () => {
  const s = quietGame();
  const full = gw(s).deliveredMw;
  raiseAlarm(s, 'leak', 'cdu-1-0');
  tick(s, 0.1); // losses land on the next step
  assert.equal(full - gw(s).deliveredMw, lossMw(s.config, 'leak', EQUIPMENT_BY_ID['cdu-1-0']));
  const s2 = quietGame();
  raiseAlarm(s2, 'breaker', 'msb-2-A');
  raiseAlarm(s2, 'breaker', 'msb-2-B');
  tick(s2, 0.1);
  assert.equal(full - gw(s2).deliveredMw, lossMw(s2.config, 'hallDark', HALLS[2]));
});

test('labels sit on the equipment, or the middle of a dark hall', () => {
  const s = quietGame();
  const f = lossFloat({ type: 'spawn', alarmType: 'network', equipId: 'rack-2-1-3', t: 0 }, s.config);
  assert.deepEqual([f.x, f.y], [EQUIPMENT_BY_ID['rack-2-1-3'].x, EQUIPMENT_BY_ID['rack-2-1-3'].y]);
  const d = lossFloat({ type: 'hallDark', hall: 2, t: 0 }, s.config);
  assert.deepEqual([d.x, d.y], [HALLS[2].x + HALLS[2].w / 2, HALLS[2].aisleY]);
});

test('alarms that cost nothing at first get no label', () => {
  const cfg = quietGame().config;
  for (const alarmType of ['breaker', 'pump', 'chiller']) {
    assert.equal(lossFloat({ type: 'spawn', alarmType, equipId: 'pump-0', t: 0 }, cfg), null);
  }
  assert.equal(lossFloat({ type: 'escalate', effect: 'secondSide', equipId: 'msb-1-A', t: 0 }, cfg), null);
  assert.equal(lossFloat({ type: 'clear', alarmType: 'leak', equipId: 'cdu-1-0', t: 0 }, cfg), null);
});

test('a label rises 20 px and fades over 1 s, then is gone', () => {
  const feel = createFeel();
  const s = quietGame();
  raiseAlarm(s, 'network', 'rack-1-0-0');
  feelEvents(feel, drain(s), s.config);
  let [f] = liveFloats(feel, s.t);
  assert.equal(f.rise, 0);
  assert.equal(f.alpha, 1);
  [f] = liveFloats(feel, s.t + FLOAT_LIFE / 2);
  assert.equal(f.rise, FLOAT_RISE / 2);
  assert.equal(f.alpha, 0.5);
  assert.deepEqual(liveFloats(feel, s.t + FLOAT_LIFE), []);
  assert.equal(feel.floats.length, 0);
});

test('a leak left alone gives -50 MW, then -75 MW when its row shuts down', () => {
  const feel = createFeel();
  const s = quietGame();
  raiseAlarm(s, 'leak', 'cdu-1-1');
  feelEvents(feel, drain(s), s.config);
  assert.deepEqual(liveFloats(feel, s.t).map((f) => f.text), ['-50 MW']);
  tick(s, 30.5); // the shutdown comes at 30 s; its label is half a second old
  feelEvents(feel, drain(s), s.config);
  assert.deepEqual(liveFloats(feel, s.t).map((f) => f.text), ['-75 MW']);
});

test('the HUD flashes for 300 ms when the band turns red, and not for yellow', () => {
  const feel = createFeel();
  feelEvents(feel, [{ type: 'band', from: 'green', to: 'yellow', t: 5 }], {});
  assert.equal(flashAlpha(feel, 5), 0);
  feelEvents(feel, [{ type: 'band', from: 'yellow', to: 'red', t: 10 }], {});
  assert.equal(flashAlpha(feel, 10), 1);
  assert.ok(flashAlpha(feel, 10 + FLASH_TIME / 2) > 0);
  assert.equal(flashAlpha(feel, 10 + FLASH_TIME), 0);
});

test('a real round that goes red flashes', () => {
  const feel = createFeel();
  const s = createGame({ seed: 3 });
  let flashed = false;
  while (!s.over) {
    step(s, 0.05);
    feelEvents(feel, drain(s), s.config);
    if (flashAlpha(feel, s.t) > 0) flashed = true;
  }
  assert.ok(flashed);
});

test('a new bubble pops in over 150 ms', () => {
  assert.ok(Math.abs(popScale(0)) < 1e-9);
  assert.equal(popScale(POP_TIME), 1);
  assert.equal(popScale(10), 1);
  assert.ok(popScale(POP_TIME * 0.5) > 0.5);
  // A small overshoot near the end is the "pop".
  const peak = Math.max(...Array.from({ length: 30 }, (_, i) => popScale((i / 30) * POP_TIME)));
  assert.ok(peak > 1 && peak < 1.15);
});

test('only walking techs bob, by at most 1 px', () => {
  const walking = { state: 'walking', index: 0 };
  let moved = false;
  for (let t = 0; t < 2; t += 0.01) {
    const b = bobOffset(walking, t);
    assert.ok(b <= 0 && b >= -1);
    if (b < -0.5) moved = true;
    assert.equal(bobOffset({ state: 'idle', index: 0 }, t), 0);
    assert.equal(bobOffset({ state: 'fixing', index: 1 }, t), 0);
  }
  assert.ok(moved);
});
