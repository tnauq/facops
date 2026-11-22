// Surges (pass 8 spec 6.5, M50).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build, createGame, incomeRate, step, surging, takePromise } from '../src/core/index2.js';

const NO_BURN = { loan: 0, loanRate: 0, base: 0, doubling: 0, upkeep: 0, wages: 0 };
const game = (building = {}, extra = {}) => createGame({
  seed: 1,
  config: { tutorial: false, ceo: { enabled: false }, ...extra, building: { enabled: true, startCash: 50000, burn: NO_BURN, credits: { rate: 0, doubling: 0 }, uptime: { enabled: false, bonus: 20, floor: 0.9 }, ...building } },
});
const advance = (s, seconds) => { for (let i = 0; i < Math.round(seconds / 0.05); i++) step(s, 0.05); };
// Bring halls 2 and 3 online.
function threeHalls(s) {
  for (const h of [2, 3]) for (const id of [`rmu-${h}-t`, `xfmr-${h}-t-A`, `msb-${h}-t-A`, `cdu-${h}-t`, `row-${h}-t-0`]) build(s, id);
  build(s, 'wpump-A-1');
  advance(s, 9);
}
const surgeOffer = (s, limit = 12000) => {
  for (let i = 0; i < limit; i++) {
    const o = s.promises?.offers.find((x) => x.key === 'surge');
    if (o) return o;
    step(s, 0.05);
  }
  return null;
};

test('no surge before the third hall; then the CEO sells one among the offers', () => {
  const s = game({}, { director: { enabled: false } });
  advance(s, 300);
  assert.equal(s.promises.offers.some((o) => o.key === 'surge'), false);
  threeHalls(s);
  assert.equal(s.halls, 3);
  assert.ok(surgeOffer(s), 'a surge was offered');
});

test('a surge: 60 s of half as much again, holding no place, one at a time', () => {
  const s = game({}, { director: { enabled: false } });
  threeHalls(s);
  const o = surgeOffer(s);
  const before = incomeRate(s);
  s.promises.held = [{ id: 1, key: 'hallTwo', window: 999, advance: 0, payment: 0, deadline: 1e9 }, { id: 2, key: 'belt', window: 999, advance: 0, payment: 0, deadline: 1e9 }];
  assert.deepEqual(takePromise(s, o.id), { ok: true }, 'two held: a surge still starts');
  assert.ok(surging(s));
  assert.ok(Math.abs(incomeRate(s) - before * 1.5) < 1e-6);
  assert.ok(s.events.some((e) => e.type === 'surgeStart'));
  advance(s, 59.9);
  assert.ok(surging(s));
  advance(s, 0.2);
  assert.equal(surging(s), false);
  assert.ok(s.events.some((e) => e.type === 'surgeEnd'));
  assert.ok(Math.abs(incomeRate(s) - before) < 1e-6);
});

test("the director's gaps shrink during a surge (here halved)", () => {
  const gaps = (surge) => {
    const s = game({ surges: { enabled: true, length: 60, incomeFactor: 1.5, gapFactor: 0.5, fromHalls: 3 }, warnings: { enabled: false, warnFor: 20, checkTime: 2, capCounts: false }, spells: { enabled: false, busy: [35, 45], quiet: [15, 25], busyFactor: 0.5, easeAfter: 10, ceoWaits: false, fromHalls: 3 } }, { autoDispatch: { enabled: true, delay: 1 } });
    threeHalls(s);
    if (surge) s.surge = { until: 1e9, startedAt: s.t };
    const start = s.stats.spawned;
    advance(s, 300);
    return s.stats.spawned - start;
  };
  const calm = gaps(false);
  const busy = gaps(true);
  // The cap on open alarms holds the count back, so it is not quite double.
  assert.ok(busy > calm * 1.2, `${busy} alarms with a surge against ${calm}`);
});

test('not during a CEO visit; off when switched off', () => {
  const s = game({}, { director: { enabled: false } });
  threeHalls(s);
  const o = surgeOffer(s);
  s.ceo = { phase: 'warning', areas: [] };
  assert.deepEqual(takePromise(s, o.id), { ok: false, reason: 'ceo' });
  const off = game({ surges: { enabled: false, length: 60, incomeFactor: 1.5, gapFactor: 0.5, fromHalls: 3 } }, { director: { enabled: false } });
  threeHalls(off);
  advance(off, 300);
  assert.equal(off.promises.offers.some((x) => x.key === 'surge'), false);
});

test('screen: the HUD note, the card line and the cash rate', async () => {
  const { promiseNote, promisesCard, promisesLine } = await import('../src/ui/promisesView.js');
  const { moneyModel } = await import('../src/ui/hud2.js');
  const s = game({}, { director: { enabled: false } });
  threeHalls(s);
  const o = surgeOffer(s);
  const line = promisesCard(s).offers.find((x) => x.id === o.id);
  assert.equal(line.title, 'A surge');
  assert.equal(line.money, 'Nothing up front');
  assert.match(line.asks, /half as much again/);
  assert.equal(line.take, 'Take the surge');
  const rate = moneyModel(s).rate;
  takePromise(s, o.id);
  advance(s, 18);
  assert.deepEqual(promiseNote(s), { long: 'Surge · 0:42', short: '0:42' });
  assert.notEqual(moneyModel(s).rate, rate, 'the cash rate shows the extra');
  assert.match(promisesLine(s), /1 surge/);
});
