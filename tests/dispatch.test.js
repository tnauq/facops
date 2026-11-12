import test from 'node:test';
import assert from 'node:assert/strict';
import { EQUIPMENT_BY_ID, assign, dispatch, fixDuration, getAlarm, nearestIdleTech, raiseAlarm, step } from '../src/core/index.js';
import { near, quietGame, tick } from './helpers.js';

test('a tech walks at walkSpeed along the lanes, then starts fixing', () => {
  const g = quietGame();
  const a = raiseAlarm(g, 'network', 'rack-1-0-0'); // service point (515, 130); start (270, 250): 365 units
  assert.deepEqual(assign(g, 'tech-0', a.id), { ok: true });
  assert.equal(g.techs[0].state, 'walking');
  tick(g, 3.0);
  assert.equal(g.techs[0].state, 'walking');
  tick(g, 0.1);
  assert.equal(g.techs[0].state, 'fixing');
  assert.equal(g.techs[0].x, 515);
  assert.equal(g.techs[0].y, 130);
});

test('fix time: 15% faster for the matching trade, standard for everyone else', () => {
  const g = quietGame();
  assert.equal(fixDuration(g, 'leak', 'electrical'), 8);
  assert.ok(near(fixDuration(g, 'leak', 'ce'), 6.8, 1e-9));
  assert.ok(near(fixDuration(g, 'chiller', 'mechanical'), 8.5, 1e-9));
  assert.equal(fixDuration(g, 'network', 'ce'), 3);
});

test('a finished fix clears the alarm and leaves the tech idle on the spot', () => {
  const g = quietGame();
  const a = raiseAlarm(g, 'leak', 'cdu-1-0'); // 285 units from the start: 2.375 s walk
  assign(g, 'tech-2', a.id); // ce: 6.8 s fix
  tick(g, 2.4 + 6.7);
  assert.ok(getAlarm(g, a.id), 'not finished yet');
  tick(g, 0.2);
  assert.equal(getAlarm(g, a.id), null);
  assert.equal(g.techs[2].state, 'idle');
  assert.equal(g.techs[2].x, EQUIPMENT_BY_ID['cdu-1-0'].sx);
  assert.equal(g.stats.cleared, 1);
  assert.equal(g.stats.matchedFixes, 1);
  assert.equal(g.equip['cdu-1-0'].leak, 0);
});

test('redirect: a dropped job keeps its progress for 10 s, then resets', () => {
  const g = quietGame();
  const leak = raiseAlarm(g, 'leak', 'cdu-1-0');
  const net = raiseAlarm(g, 'network', 'rack-1-0-0');
  assign(g, 'tech-0', leak.id);
  tick(g, 2.4 + 4); // about half-way through an 8 s fix
  const before = getAlarm(g, leak.id).progress;
  assert.ok(before > 0.45 && before < 0.55);
  assign(g, 'tech-0', net.id);
  assert.equal(getAlarm(g, leak.id).techId, null);
  assert.equal(g.stats.redirects, 1);
  tick(g, 9.5);
  assert.equal(getAlarm(g, leak.id).progress, before, 'progress is held');
  tick(g, 1);
  assert.equal(getAlarm(g, leak.id).progress, 0, 'progress is gone after the hold');
});

test('redirect: coming back inside the hold carries on from the kept progress', () => {
  const g = quietGame();
  const leak = raiseAlarm(g, 'leak', 'cdu-1-0');
  const net = raiseAlarm(g, 'network', 'rack-1-0-0');
  assign(g, 'tech-0', leak.id);
  tick(g, 2.4 + 4);
  const before = getAlarm(g, leak.id).progress;
  assign(g, 'tech-0', net.id);
  tick(g, 2);
  assign(g, 'tech-1', leak.id);
  tick(g, 6);
  const alarm = getAlarm(g, leak.id);
  assert.ok(alarm === null || alarm.progress > before, 'the second tech builds on the first tech\'s work');
});

test('taking over an alarm sends the first tech idle and keeps the progress', () => {
  const g = quietGame();
  const leak = raiseAlarm(g, 'leak', 'cdu-1-0');
  assign(g, 'tech-0', leak.id);
  tick(g, 2.4 + 2);
  const before = getAlarm(g, leak.id).progress;
  assign(g, 'tech-2', leak.id);
  assert.equal(g.techs[0].state, 'idle');
  assert.equal(g.techs[0].alarmId, null);
  assert.equal(getAlarm(g, leak.id).techId, 'tech-2');
  assert.equal(getAlarm(g, leak.id).progress, before);
  assert.equal(g.stats.redirects, 0, 'a takeover is not a redirect');
});

test('assign refuses unknown ids and repeats are harmless', () => {
  const g = quietGame();
  const a = raiseAlarm(g, 'network', 'rack-1-0-0');
  assert.equal(assign(g, 'tech-9', a.id).ok, false);
  assert.equal(assign(g, 'tech-0', 999).ok, false);
  assert.equal(assign(g, 'tech-0', a.id).ok, true);
  assert.deepEqual(assign(g, 'tech-0', a.id), { ok: true, unchanged: true });
});

test('dispatch sends the nearest idle tech; ties go to the lower crew index', () => {
  const g = quietGame();
  const a = raiseAlarm(g, 'network', 'rack-1-0-0');
  assert.equal(nearestIdleTech(g, a.id).id, 'tech-0');
  const far = raiseAlarm(g, 'network', 'rack-2-0-4');
  assign(g, 'tech-0', far.id);
  tick(g, 12); // tech-0 is now idle deep in Hall 2
  const b = raiseAlarm(g, 'network', 'rack-2-0-3');
  assert.deepEqual(dispatch(g, b.id), { ok: true, techId: 'tech-0' });
});

test('dispatch in two-tap mode reports when nobody is free', () => {
  const g = quietGame();
  const alarms = ['rack-1-0-0', 'rack-1-0-1', 'rack-1-0-2', 'rack-1-0-3'].map((id) => raiseAlarm(g, 'network', id));
  g.techs.forEach((t, i) => assign(g, t.id, alarms[i].id));
  assert.deepEqual(dispatch(g, alarms[3].id), { ok: false, reason: 'nobody free' });
  assert.deepEqual(dispatch(g, alarms[0].id), { ok: false, reason: 'already assigned' });
});

test('one-tap mode queues an alarm and the next free tech takes the oldest one', () => {
  const g = quietGame({ oneTap: true });
  const alarms = ['rack-1-0-0', 'rack-1-0-1', 'rack-1-0-2', 'rack-1-0-3', 'rack-1-0-4'].map((id) => raiseAlarm(g, 'network', id));
  for (let i = 0; i < 3; i++) assert.equal(dispatch(g, alarms[i].id).ok, true);
  assert.deepEqual(dispatch(g, alarms[4].id), { ok: true, queued: true });
  step(g, 0.05);
  assert.deepEqual(dispatch(g, alarms[3].id), { ok: true, queued: true });
  tick(g, 8);
  const fifth = getAlarm(g, alarms[4].id);
  assert.ok(fifth === null || fifth.techId !== null, 'the alarm queued first is picked up first');
  tick(g, 20);
  assert.equal(g.alarms.length, 0, 'everything gets cleared without another tap');
});
