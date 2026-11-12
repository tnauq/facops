import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_CONFIG, createGame, dispatch, makeConfig, raiseAlarm, results, step } from '../src/core/index.js';
import {
  TUNING_FIELDS,
  TUNING_KEY,
  cleanTuning,
  defaultTuning,
  loadTuning,
  saveTuning,
  setTuning,
  tuningLabel,
  tuningToConfig,
} from '../src/ui/tuning.js';
import { NOTHING, reduceTap } from '../src/ui/selection.js';
import { reduceFlow } from '../src/ui/flow.js';
import { quietGame, tick } from './helpers.js';

function memoryStorage() {
  const data = new Map();
  return { getItem: (k) => (data.has(k) ? data.get(k) : null), setItem: (k, v) => data.set(k, String(v)), data };
}
const blocked = {
  getItem() { throw new Error('SecurityError'); },
  setItem() { throw new Error('SecurityError'); },
};

// ---- The drawer's values ----

test('the drawer defaults match the table in spec 9', () => {
  assert.deepEqual(defaultTuning(), {
    startInterval: 10, tighten: 5, floor: 2, walkSpeed: 120, tradeBonus: 15, clockScale: 1, waves: true, oneTap: false,
  });
});

test('the defaults give exactly the default rules', () => {
  const cfg = makeConfig(tuningToConfig(defaultTuning()));
  assert.deepEqual(cfg, makeConfig());
  assert.deepEqual(results(createGame({ config: tuningToConfig(defaultTuning()) })).tuning, []);
});

test('every control changes its own config key', () => {
  const expect = {
    startInterval: [15, (c) => c.director.startInterval, 15],
    tighten: [7.5, (c) => c.director.tighten, 0.075],
    floor: [1.25, (c) => c.director.floor, 1.25],
    walkSpeed: [80, (c) => c.walkSpeed, 80],
    tradeBonus: [30, (c) => c.tradeBonus, 0.3],
    clockScale: [1.5, (c) => c.clockScale, 1.5],
    waves: [false, (c) => c.director.waveEvery, 0],
    oneTap: [true, (c) => c.oneTap, true],
  };
  assert.deepEqual(Object.keys(expect).sort(), TUNING_FIELDS.map((f) => f.id).sort());
  for (const [id, [value, read, want]] of Object.entries(expect)) {
    const values = setTuning(defaultTuning(), id, value);
    const cfg = makeConfig(tuningToConfig(values));
    assert.equal(read(cfg), want, id);
    // Nothing else moved.
    const changed = results(createGame({ config: tuningToConfig(values) })).tuning;
    assert.equal(changed.length, 1, `${id}: ${changed}`);
  }
});

test('waves back on restore the default wave spacing', () => {
  const off = setTuning(defaultTuning(), 'waves', false);
  const on = setTuning(off, 'waves', true);
  assert.equal(makeConfig(tuningToConfig(on)).director.waveEvery, DEFAULT_CONFIG.director.waveEvery);
});

test('slider values snap to their step and stay in range', () => {
  assert.equal(setTuning(defaultTuning(), 'tradeBonus', '17').tradeBonus, 15);
  assert.equal(setTuning(defaultTuning(), 'floor', '1.3').floor, 1.25);
  assert.equal(setTuning(defaultTuning(), 'walkSpeed', '999').walkSpeed, 240);
  assert.equal(setTuning(defaultTuning(), 'clockScale', '0.7').clockScale, 0.7);
  assert.equal(tuningLabel('clockScale', 0.7), '0.7');
  assert.equal(tuningLabel('waves', true), 'On');
  assert.equal(tuningLabel('oneTap', false), 'Off');
});

test('Reset to defaults restores DEFAULT_CONFIG', () => {
  let v = defaultTuning();
  for (const f of TUNING_FIELDS) v = setTuning(v, f.id, f.kind === 'range' ? f.max : !v[f.id]);
  assert.notDeepEqual(makeConfig(tuningToConfig(v)), makeConfig());
  assert.deepEqual(makeConfig(tuningToConfig(defaultTuning())), structuredClone(DEFAULT_CONFIG));
});

test('saved tuning survives a reload; junk and blocked storage fall back to defaults', () => {
  const store = memoryStorage();
  assert.deepEqual(loadTuning(store), defaultTuning());
  const v = setTuning(setTuning(defaultTuning(), 'walkSpeed', 90), 'oneTap', true);
  assert.equal(saveTuning(v, store), true);
  assert.ok(store.data.has(TUNING_KEY));
  assert.deepEqual(loadTuning(store), v);
  store.setItem(TUNING_KEY, '{"walkSpeed": 5000, "oneTap": "yes", "extra": 1}');
  assert.deepEqual(loadTuning(store), defaultTuning());
  store.setItem(TUNING_KEY, 'not json');
  assert.deepEqual(loadTuning(store), defaultTuning());
  assert.deepEqual(loadTuning(blocked), defaultTuning());
  assert.equal(saveTuning(v, blocked), false);
  assert.deepEqual(loadTuning(null), defaultTuning());
  assert.deepEqual(cleanTuning(null), defaultTuning());
});

// ---- One-tap taps ----

const alarm = (id) => ({ kind: 'alarm', id });
const tech = (id) => ({ kind: 'tech', id });
const empty = { kind: 'empty', id: null };
const ONE = { oneTap: true };

test('one-tap: an alarm with no tech selected is dispatched at once', () => {
  assert.deepEqual(reduceTap(NOTHING, alarm(4), ONE), { selection: NOTHING, assign: null, dispatch: 4 });
});

test('one-tap: a tech then an alarm is the manual override, as in two-tap mode', () => {
  const r1 = reduceTap(NOTHING, tech('tech-2'), ONE);
  assert.deepEqual(r1, { selection: tech('tech-2'), assign: null });
  assert.deepEqual(reduceTap(r1.selection, alarm(4), ONE), { selection: NOTHING, assign: { techId: 'tech-2', alarmId: 4 } });
});

test('one-tap: techs select, deselect and switch as in two-tap mode; empty clears', () => {
  assert.deepEqual(reduceTap(tech('tech-1'), tech('tech-1'), ONE), { selection: NOTHING, assign: null });
  assert.deepEqual(reduceTap(tech('tech-1'), tech('tech-0'), ONE), { selection: tech('tech-0'), assign: null });
  assert.deepEqual(reduceTap(tech('tech-1'), empty, ONE), { selection: NOTHING, assign: null });
});

test('two-tap mode is unchanged when the option is off', () => {
  assert.deepEqual(reduceTap(NOTHING, alarm(4), { oneTap: false }), { selection: alarm(4), assign: null });
});

test('one-tap: with nobody free the alarm queues and the next free tech takes it', () => {
  const s = quietGame({ oneTap: true });
  const ids = [
    raiseAlarm(s, 'network', 'rack-1-0-0').id,
    raiseAlarm(s, 'network', 'rack-1-0-4').id,
    raiseAlarm(s, 'network', 'rack-2-1-0').id,
  ];
  for (const id of ids) assert.equal(dispatch(s, id).ok, true);
  const q = raiseAlarm(s, 'pump', 'pump-0').id;
  const r = reduceTap(NOTHING, alarm(q), ONE);
  assert.deepEqual(dispatch(s, r.dispatch), { ok: true, queued: true });
  assert.equal(s.alarms.find((a) => a.id === q).techId, null);
  // A network fix is short; when the first tech is free it picks up the queued pump.
  let guard = 0;
  while (s.alarms.find((a) => a.id === q).techId === null && guard++ < 1000) step(s, 0.05);
  assert.ok(s.alarms.find((a) => a.id === q).techId !== null, 'the queued alarm was taken');
  tick(s, 0.05);
});

// ---- Opening and closing the drawer ----

test('the drawer opens from every card and Done goes back to it', () => {
  for (const from of ['start', 'paused', 'over']) {
    const open = reduceFlow(from, 'tuning');
    assert.deepEqual(open, { mode: 'tuning', newRound: false, back: from });
    assert.deepEqual(reduceFlow('tuning', 'done', open.back), { mode: from, newRound: false });
  }
});

test('the settings button during play opens the drawer, and Done lands on the pause card', () => {
  const open = reduceFlow('playing', 'tuning');
  assert.equal(open.mode, 'tuning');
  assert.deepEqual(reduceFlow('tuning', 'done', open.back), { mode: 'paused', newRound: false });
});

test('inside the drawer, other actions do nothing', () => {
  for (const a of ['start', 'resume', 'restart', 'again', 'togglePause', 'over', 'tuning']) {
    assert.deepEqual(reduceFlow('tuning', a, 'paused'), { mode: 'tuning', newRound: false });
  }
});
