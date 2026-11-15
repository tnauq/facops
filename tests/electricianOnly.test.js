// Electricians only for the yard's power faults (owner, after M30).
import test from 'node:test';
import assert from 'node:assert/strict';
import { advance, assign, canFix, createGame, dispatch, getAlarm, raiseAlarm, step } from '../src/core/index2.js';
import { autoDispatch } from '../src/core/auto.js';
import { greedyMove } from '../src/core/bot2.js';
import { crewCards, unableFor } from '../src/ui/crewbar.js';
import { refusedTap } from '../src/ui/refusal.js';

const NO_BURN = { base: 0, doubling: 150, upkeep: 0, wages: 0 };
const game = (auto = false) => createGame({ seed: 1, config: { tutorial: false, autoDispatch: { enabled: auto, delay: 1 }, director: { enabled: false }, building: { enabled: true, startCash: 10000, burn: NO_BURN } } });
const techOf = (s, trade) => s.techs.find((t) => t.trade === trade);

test('only electricians may work on a transformer short or an RMU fault; anyone may fix the rest', () => {
  for (const trade of ['mechanical', 'ce', 'network']) {
    assert.equal(canFix('short', trade), false);
    assert.equal(canFix('rmu', trade), false);
    assert.equal(canFix('fan', trade), true, 'a fan is mechanical work, but not high-voltage');
    assert.equal(canFix('breaker', trade), true);
  }
  assert.equal(canFix('short', 'electrical'), true);
  assert.equal(canFix('rmu', 'electrical'), true);
});

test('sending a mechanic to a short is refused and changes nothing', () => {
  const s = game();
  const a = raiseAlarm(s, 'short', 'xfmr-1-t-A');
  const mech = techOf(s, 'mechanical');
  const r = assign(s, mech.id, a.id);
  assert.deepEqual([r.ok, r.reason, r.trade], [false, 'trade', 'electrical']);
  assert.equal(a.techId, null);
  assert.equal(mech.state, 'idle');
  assert.equal(assign(s, techOf(s, 'electrical').id, a.id).ok, true);
});

test('a busy mechanic is not pulled off their job by a refused send', () => {
  const s = game();
  const fan = raiseAlarm(s, 'fan', 'dry-A-0');
  const mech = techOf(s, 'mechanical');
  assign(s, mech.id, fan.id);
  const rmu = raiseAlarm(s, 'rmu', 'rmu-1-t');
  assert.equal(assign(s, mech.id, rmu.id).ok, false);
  assert.equal(mech.alarmId, fan.id);
  assert.equal(fan.techId, mech.id);
});

test('auto-dispatch sends the electrician to a short, never the nearer mechanic, and waits for one', () => {
  const s = game(true);
  const elec = techOf(s, 'electrical');
  const mech = techOf(s, 'mechanical');
  const other = raiseAlarm(s, 'breaker', 'msb-1-t-A');
  assign(s, elec.id, other.id); // the electrician is busy
  const a = raiseAlarm(s, 'short', 'xfmr-1-t-A');
  advance(s, 1.5);
  assert.equal(autoDispatch(s), 0);
  assert.equal(a.techId, null, 'nobody may go yet');
  assert.equal(mech.state, 'idle');
  for (let i = 0; i < 2400 && getAlarm(s, other.id); i++) step(s, 0.05);
  for (let i = 0; i < 40 && a.techId === null; i++) step(s, 0.05);
  assert.equal(a.techId, elec.id);
});

test('one-tap dispatch and the scripted player only send electricians to the yard power faults', () => {
  const s = game();
  const a = raiseAlarm(s, 'rmu', 'rmu-1-t');
  dispatch(s, a.id);
  assert.equal(a.techId, techOf(s, 'electrical').id);
  const t = game();
  assign(t, techOf(t, 'electrical').id, raiseAlarm(t, 'breaker', 'msb-1-t-A').id);
  const short = raiseAlarm(t, 'short', 'xfmr-1-t-A');
  const fan = raiseAlarm(t, 'fan', 'dry-A-0');
  advance(t, 2);
  assert.equal(greedyMove(t, { ceo: false }), true, 'the mechanic takes the fan instead of stalling');
  assert.equal(short.techId, null);
  assert.equal(fan.techId, techOf(t, 'mechanical').id);
});

test('on screen: a refused send keeps the alarm selected, says why, and fades who cannot go', () => {
  const s = game();
  const a = raiseAlarm(s, 'short', 'xfmr-1-t-A');
  const mech = techOf(s, 'mechanical');
  const cmd = { techId: mech.id, alarmId: a.id };
  const r = refusedTap(s, cmd, assign(s, mech.id, a.id));
  assert.deepEqual(r.selection, { kind: 'alarm', id: a.id });
  assert.equal(r.float.text, 'Electricians only');
  assert.equal(refusedTap(s, cmd, { ok: true }), null);
  assert.equal(unableFor('short', 'mechanical'), true);
  assert.equal(unableFor('short', 'electrical'), false);
  assert.equal(unableFor('breaker', 'mechanical'), false);
  assert.equal(unableFor(null, 'mechanical'), false);
  const cards = crewCards(s, { x: 0, y: 0, w: 80, h: 300 }, null, { alarmType: 'rmu' });
  assert.deepEqual(cards.map((c) => [c.trade, c.unable]), s.techs.map((t) => [t.trade, t.trade !== 'electrical']));
});
