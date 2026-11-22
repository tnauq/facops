// The pick of two and the rescue call (pass 8 spec 7, M51).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build, burnRate, buyPrice, callOpen, choosePerk, closeCall, createGame, creditsRate, eligibleEquipment, hire, raiseAlarm, step, takeFunding } from '../src/core/index2.js';
import { visitEnded } from '../src/core/perks.js';

const NO_BURN = { loan: 0, loanRate: 0, base: 0, doubling: 0, upkeep: 0, wages: 0 };
const game = (building = {}) => createGame({
  seed: 1,
  config: { tutorial: false, director: { enabled: false }, ceo: { enabled: false }, autoDispatch: { enabled: false, delay: 1 }, building: { enabled: true, startCash: 50000, burn: NO_BURN, ...building } },
});
const advance = (s, seconds) => { for (let i = 0; i < Math.round(seconds / 0.05); i++) step(s, 0.05); };
const offer = (s, perks) => { visitEnded(s, 0); s.perks.offer = perks; };

test('a clean visit earns the pick of two, drawn apart; a visit with a sighting does not', () => {
  const s = game();
  visitEnded(s, 2);
  assert.equal(s.perks?.offer ?? null, null);
  visitEnded(s, 0);
  assert.equal(s.perks.offer.length, 2);
  assert.notEqual(s.perks.offer[0], s.perks.offer[1]);
  assert.ok(s.events.some((e) => e.type === 'perkOffered'));
  assert.deepEqual(choosePerk(s, 'nonsense'), { ok: false, reason: 'not offered' });
});

test('Bulk order: the next six rack rows are half price', () => {
  const s = game();
  offer(s, ['bulk', 'fast']);
  choosePerk(s, 'bulk');
  assert.equal(buyPrice(s, 'row-1-t-2'), 75);
  const cash = s.cash;
  build(s, 'row-1-t-2');
  assert.equal(cash - s.cash, 75);
  assert.equal(s.perks.bulkRows, 5);
});

test('Signing bonus: the next hire is free; Fast contractor: builds take 4 s', () => {
  const s = game();
  offer(s, ['signing', 'fast']);
  choosePerk(s, 'signing');
  const cash = s.cash;
  hire(s, 'ce');
  assert.equal(s.cash, cash);
  assert.equal(buyPrice(s, 'hire'), 400);
  offer(s, ['fast', 'loyal']);
  choosePerk(s, 'fast');
  const r = build(s, 'cdu-1-b');
  assert.ok(Math.abs(r.until - s.t - 4) < 1e-9);
});

test('Warranty: nothing in the chosen hall can fail; Patient customers: no credits', () => {
  const s = game({ credits: { rate: 1, doubling: 0 } });
  offer(s, ['warranty', 'patient']);
  assert.deepEqual(choosePerk(s, 'warranty'), { ok: false, reason: 'hall' });
  choosePerk(s, 'warranty', 1);
  assert.equal(eligibleEquipment(s, 'leak').some((e) => e.hall === 1), false);
  advance(s, 91);
  assert.ok(eligibleEquipment(s, 'leak').some((e) => e.hall === 1), 'over after 90 s');
  raiseAlarm(s, 'network', 'row-1-t-0');
  advance(s, 2);
  assert.ok(creditsRate(s) > 0);
  offer(s, ['patient', 'bulk']);
  choosePerk(s, 'patient');
  assert.equal(creditsRate(s), 0);
});

test('Loyal customers doubles the uptime bonus for two minutes', () => {
  const s = game();
  offer(s, ['loyal', 'bulk']);
  choosePerk(s, 'loyal');
  advance(s, 60.1);
  const e = s.events.find((x) => x.type === 'uptimeBonus');
  assert.equal(e.total, 2 * 2 * s.config.building.uptime.bonus);
});

test('the rescue call: the first time below $0, the countdown waits for the call to close', () => {
  const s = game({ startCash: 10, burn: { ...NO_BURN, base: 30 } });
  advance(s, 2);
  assert.ok(s.cash < 0);
  assert.equal(callOpen(s), true);
  assert.equal(s.redSince, null, 'no countdown while the call is open');
  advance(s, 30);
  assert.equal(s.over, false);
  closeCall(s);
  advance(s, 1);
  assert.notEqual(s.redSince, null);
  advance(s, 15);
  assert.equal(s.overReason, 'bankrupt');
});

test('the funding round: once per run, $2,000 now and a second loan at $8 a second', () => {
  const s = game({ startCash: 10, burn: { ...NO_BURN, base: 1 } });
  const before = burnRate(s);
  assert.deepEqual(takeFunding(s), { ok: true });
  assert.equal(s.cash, 2010);
  assert.equal(burnRate(s) - before, 8);
  assert.deepEqual(takeFunding(s), { ok: false, reason: 'used' });
  advance(s, 251);
  assert.equal(s.rescue.loanLeft, 0);
  assert.ok(Math.abs(burnRate(s) - before) < 1e-9, 'repaid');
});

test('off when switched off', () => {
  const s = game({ perks: { enabled: false }, rescue: { enabled: false, funding: 2000, rate: 8 }, startCash: 1, burn: { ...NO_BURN, base: 30 } });
  visitEnded(s, 0);
  assert.equal(s.perks?.offer ?? null, null);
  advance(s, 1);
  assert.equal(callOpen(s), false);
  assert.notEqual(s.redSince, null);
});
