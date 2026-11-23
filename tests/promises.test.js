// The CEO's promises (pass 8 spec 6.1, M49).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build, cancelPromise, createGame, hire, promisesOn, step, takePromise } from '../src/core/index2.js';

const NO_BURN = { loan: 0, loanRate: 0, base: 0, doubling: 0, upkeep: 0, wages: 0 };
// Pass 9 (M58) cut the promises' amounts to a quarter; these tests check pass 8's mechanics with pass 8's
// amounts, so they set that table (the amounts now are config, as the screen reads them).
const PASS8_PROMISES = {
  enabled: true, offers: 3, held: 2, offerGap: 30, offerLife: 60, quietFor: 120,
  table: {
    lightsOn: { window: 120, advance: 150, payment: 250 },
    hallTwo: { window: 120, advance: 300, payment: 300 },
    moreMw: { window: 150, seconds: 15 },
    belt: { window: 180, advance: 350, payment: 400 },
    spare: { window: 180, advance: 300, payment: 300 },
    oneOfEach: { window: 180, advance: 200, payment: 200 },
    quietFloor: { window: 180, advance: 0, payment: 600 },
  },
};
const game = (building = {}, extra = {}) => createGame({
  seed: 1,
  config: { tutorial: false, director: { enabled: false }, ceo: { enabled: false }, ...extra, building: { enabled: true, startCash: 50000, burn: NO_BURN, credits: { rate: 0, doubling: 0 }, uptime: { enabled: false, bonus: 20, floor: 0.9 }, promises: PASS8_PROMISES, ...building } },
});
const advance = (s, seconds) => { for (let i = 0; i < Math.round(seconds / 0.05); i++) step(s, 0.05); };
const keys = (s) => s.promises.offers.map((o) => o.key);

test('the first offers are the build order: Lights on, then Hall two', () => {
  const s = game();
  step(s, 0.05);
  assert.deepEqual(keys(s), ['lightsOn']);
  advance(s, 30);
  assert.deepEqual(keys(s), ['lightsOn', 'hallTwo']);
  advance(s, 60); // a third at 1:00 replaces the expired Lights on; another at 1:30 makes three
  assert.equal(s.promises.offers.length, 3, 'up to three');
  assert.ok(s.events.some((e) => e.type === 'promiseOffered'));
});

test('accepting pays the advance; delivering pays the rest; both count as earned', () => {
  const s = game();
  step(s, 0.05);
  const o = s.promises.offers[0];
  const cash = s.cash;
  const earned = s.stats.earned;
  assert.deepEqual(takePromise(s, o.id), { ok: true });
  assert.equal(s.cash - cash, 150);
  assert.equal(s.stats.earned - earned, 150);
  for (const id of ['row-1-t-2', 'rmu-1-b', 'xfmr-1-b-A', 'msb-1-b-A', 'row-1-b-0', 'row-1-b-1', 'row-1-b-2']) build(s, id);
  advance(s, 25);
  assert.equal(s.promises.held.length, 0);
  assert.equal(s.promises.kept, 1);
  assert.ok(s.events.some((e) => e.type === 'promiseKept' && e.payment === 250));
  assert.equal(s.stats.promises, 400);
});

test('missing the deadline, or cancelling, hands the advance back and nothing more', () => {
  const s = game();
  step(s, 0.05);
  const o = s.promises.offers[0];
  takePromise(s, o.id);
  advance(s, 119.9);
  const cash = s.cash;
  advance(s, 0.3);
  assert.equal(s.promises.missed, 1);
  assert.ok(Math.abs(cash - s.cash - 150) < 5, 'the advance went back (less 0.3 s of income)');
  assert.equal(s.stats.promises, 0);
  advance(s, 31);
  const next = s.promises.offers.find((x) => x.advance > 0);
  takePromise(s, next.id);
  const c2 = s.cash;
  assert.deepEqual(cancelPromise(s, next.id), { ok: true });
  assert.equal(c2 - s.cash, next.advance);
  assert.equal(s.promises.cancelled, 1);
});

test('two held at most; offers expire after 60 s; an offer is never already true', () => {
  const s = game();
  advance(s, 91);
  const [a, b, c] = s.promises.offers;
  assert.ok(a && b && c);
  takePromise(s, a.id);
  takePromise(s, b.id);
  assert.deepEqual(takePromise(s, c.id), { ok: false, reason: 'full' });
  advance(s, 61);
  assert.ok(!s.promises.offers.some((o) => o.id === c.id), 'replaced');
  const t = game();
  hire(t, 'ce');
  hire(t, 'network');
  advance(t, 200);
  assert.ok(!t.promises.offers.some((o) => o.key === 'oneOfEach'), 'every trade already on the crew');
});

test("More megawatts asks for a quarter more racks and pays 15 s of that load's income each way", () => {
  const s = game();
  s.promises = { offers: [], held: [], nextId: 1, nextOfferAt: 0, growthNext: true, kept: 0, missed: 0, cancelled: 0, rngState: 1, firstDone: { lightsOn: true, hallTwo: true } };
  for (let i = 0; i < 400 && !s.promises.offers.some((o) => o.key === 'moreMw'); i++) {
    s.promises.offers = [];
    s.promises.nextOfferAt = 0;
    step(s, 0.05);
  }
  const o = s.promises.offers.find((x) => x.key === 'moreMw');
  assert.ok(o);
  assert.equal(o.target, 3);
  assert.equal(o.advance, 3 * 4 * 15);
  assert.equal(o.payment, o.advance);
});

test('Quiet floor pays only after 2:00 with no dark half and no credits', () => {
  const s = game();
  s.promises = { offers: [{ id: 99, key: 'quietFloor', window: 180, advance: 0, payment: 600, offeredAt: s.t }], held: [], nextId: 100, nextOfferAt: 1e9, growthNext: true, kept: 0, missed: 0, cancelled: 0, rngState: 1 };
  takePromise(s, 99);
  advance(s, 119);
  assert.equal(s.promises.kept, 0);
  advance(s, 2);
  assert.equal(s.promises.kept, 1);
});

test('none during a CEO visit, none in the tutorial, off when switched off or in the classic game', () => {
  const s = game();
  s.ceo = { phase: 'warning', areas: [] };
  advance(s, 5);
  assert.equal((s.promises?.offers ?? []).length, 0);
  const off = game({ promises: { ...s.config.building.promises, enabled: false } });
  advance(off, 60);
  assert.equal(promisesOn(off), false);
  assert.equal(off.promises, undefined);
  const classic = createGame({ seed: 1, config: { tutorial: false } });
  assert.equal(promisesOn(classic), false);
});

// Screen (spec 6.2).
test('screen: the HUD note, the card, the results line and the ledger', async () => {
  const { promiseNote, promisesCard, promisesLine } = await import('../src/ui/promisesView.js');
  const { hudModel2 } = await import('../src/ui/hud2.js');
  const { ledger } = await import('../src/ui/ledger.js');
  const { reduceFlow } = await import('../src/ui/flow.js');
  const s = game();
  step(s, 0.05);
  assert.deepEqual(promiseNote(s), { long: 'CEO: 1 offer', short: 'CEO 1' });
  assert.match(hudModel2(s).note, /^CEO: 1 offer · /);
  const card = promisesCard(s);
  assert.equal(card.offers[0].title, 'Lights on');
  assert.equal(card.offers[0].money, '$150 now, $250 on delivery');
  assert.equal(card.offers[0].within, 'Within 2:00');
  takePromise(s, card.offers[0].id);
  advance(s, 10);
  assert.deepEqual(promiseNote(s), { long: 'Lights on · 1:50', short: '1:50' });
  assert.equal(promisesCard(s).held[0].cancel, 'Cancel · hand back $150');
  const l = ledger(s);
  assert.ok(l.now.some((x) => x.label === 'Promise: Lights on' && x.value === '+$250'));
  assert.ok(l.soFar.some((x) => x.label === 'Promises' && x.value === '$150'));
  assert.ok(Math.abs(l.total - s.cash) < 1e-6, 'the ledger still adds up');
  assert.equal(promisesLine(s), '0 kept · $150');
  cancelPromise(s, s.promises.held[0].id);
  assert.equal(promisesLine(s), '0 kept, 1 cancelled · $0');
  assert.equal(reduceFlow('playing', 'promises').mode, 'promises');
  assert.equal(reduceFlow('promises', 'continue').mode, 'playing');
});

test('screen: the note is a 44 px button while promises are in play', async () => {
  const { railTargets2 } = await import('../src/ui/targets2.js');
  const { regions } = await import('../src/ui/regions.js');
  const b = railTargets2(game(), regions(844, 390), 1).buttons.find((x) => x.id === 'promises');
  assert.ok(b && b.w >= 44 && b.h >= 44);
  const off = game({ promises: { ...game().config.building.promises, enabled: false } });
  assert.ok(!railTargets2(off, regions(844, 390), 1).buttons.some((x) => x.id === 'promises'));
});
