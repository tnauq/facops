// Every cell of the table in spec section 7.2.
import test from 'node:test';
import assert from 'node:assert/strict';
import { NOTHING, pruneSelection, reduceTap } from '../src/ui/selection.js';
import { assign, raiseAlarm } from '../src/core/index.js';
import { quietGame, tick } from './helpers.js';

const alarm = (id) => ({ kind: 'alarm', id });
const tech = (id) => ({ kind: 'tech', id });
const empty = { kind: 'empty', id: null };

test('nothing selected + alarm: select it', () => {
  assert.deepEqual(reduceTap(NOTHING, alarm(5)), { selection: alarm(5), assign: null });
});
test('nothing selected + tech: select it', () => {
  assert.deepEqual(reduceTap(NOTHING, tech('tech-1')), { selection: tech('tech-1'), assign: null });
});
test('nothing selected + empty space: nothing', () => {
  assert.deepEqual(reduceTap(NOTHING, empty), { selection: NOTHING, assign: null });
});

test('alarm selected + another alarm: select the new one', () => {
  assert.deepEqual(reduceTap(alarm(5), alarm(6)), { selection: alarm(6), assign: null });
});
test('alarm selected + the same alarm: deselect', () => {
  assert.deepEqual(reduceTap(alarm(5), alarm(5)), { selection: NOTHING, assign: null });
});
test('alarm selected + tech: assign that tech, then clear', () => {
  assert.deepEqual(reduceTap(alarm(5), tech('tech-2')), { selection: NOTHING, assign: { techId: 'tech-2', alarmId: 5 } });
});
test('alarm selected + empty space: clear', () => {
  assert.deepEqual(reduceTap(alarm(5), empty), { selection: NOTHING, assign: null });
});

test('tech selected + alarm: assign, then clear', () => {
  assert.deepEqual(reduceTap(tech('tech-0'), alarm(3)), { selection: NOTHING, assign: { techId: 'tech-0', alarmId: 3 } });
});
test('tech selected + another tech: select the new one', () => {
  assert.deepEqual(reduceTap(tech('tech-0'), tech('tech-1')), { selection: tech('tech-1'), assign: null });
});
test('tech selected + the same tech: deselect', () => {
  assert.deepEqual(reduceTap(tech('tech-0'), tech('tech-0')), { selection: NOTHING, assign: null });
});
test('tech selected + empty space: clear', () => {
  assert.deepEqual(reduceTap(tech('tech-0'), empty), { selection: NOTHING, assign: null });
});

test('a HUD button leaves the selection alone', () => {
  assert.deepEqual(reduceTap(alarm(5), { kind: 'button', id: 'pause' }), { selection: alarm(5), assign: null });
});

test('the selection clears when its alarm disappears', () => {
  const s = quietGame();
  const a = raiseAlarm(s, 'network', 'rack-1-0-0');
  assert.deepEqual(pruneSelection(alarm(a.id), s), alarm(a.id));
  assign(s, 'tech-0', a.id);
  tick(s, 12); // walk there and fix it
  assert.equal(s.alarms.length, 0);
  assert.deepEqual(pruneSelection(alarm(a.id), s), NOTHING);
  assert.deepEqual(pruneSelection(tech('tech-0'), s), tech('tech-0'));
});

test('assigning a busy tech through the reducer is a redirect', () => {
  const s = quietGame();
  const a = raiseAlarm(s, 'leak', 'cdu-1-0');
  const b = raiseAlarm(s, 'chiller', 'chiller-0');
  for (const tap of [[NOTHING, alarm(a.id)], [alarm(a.id), tech('tech-1')]]) {
    const r = reduceTap(...tap);
    if (r.assign) assign(s, r.assign.techId, r.assign.alarmId);
  }
  tick(s, 1);
  const r = reduceTap(tech('tech-1'), alarm(b.id));
  assert.equal(assign(s, r.assign.techId, r.assign.alarmId).ok, true);
  assert.equal(s.techs[1].alarmId, b.id);
  assert.equal(s.stats.redirects, 1);
});
