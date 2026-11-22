// The win at the finish (pass 9 spec 3, M54): Commissioned, the CEO's last inspection, the win, and
// the score as compute delivered.
import test from 'node:test';
import assert from 'node:assert/strict';
import { EQUIPMENT, advance, build, cannotSell, commissioned, createGame, raiseAlarm, results, score, sell, step } from '../src/core/index2.js';

const NO_BURN = { loan: 0, loanRate: 0, base: 0, doubling: 0, upkeep: 0, wages: 0 };
const game = (config = {}) => createGame({
  seed: 1,
  config: { tutorial: false, autoDispatch: { enabled: false }, director: { enabled: false }, ...config, building: { enabled: true, startCash: 100000, burn: NO_BURN, ...(config.building ?? {}) } },
});
const eventsOf = (s, type) => s.events.filter((e) => e.type === type);

// Build every spot at once, then run until Commissioned.
function finished(config = {}) {
  const s = game(config);
  for (const e of EQUIPMENT) if (!s.equip[e.id].built) build(s, e.id);
  while (!commissioned(s) && s.t < 120) step(s, 0.05);
  return s;
}

test('with no CEO, Commissioned is the win at once', () => {
  const s = finished({ ceo: { enabled: false } });
  assert.equal(commissioned(s), true);
  assert.equal(s.over, true);
  assert.equal(s.overReason, 'won');
  const r = results(s);
  assert.equal(r.won, true);
  assert.equal(r.outcome, 'won');
  assert.ok(r.wonAt > 0);
  assert.equal(eventsOf(s, 'won').length, 1);
});

test('with the CEO, Commissioned brings the last inspection, and the win when it ends', () => {
  const s = finished();
  assert.equal(commissioned(s), true);
  assert.equal(s.over, false, 'not won until the inspection ends');
  assert.equal(cannotSell(s), 'finishing', 'the keys go over in the inspection, not from the menu');
  // A Handover queued by the full campus may come first; the last inspection is next.
  while (!(s.ceo && s.ceo.kind === 'final') && s.t < 300) step(s, 0.05);
  assert.equal(s.ceo.kind, 'final');
  while (!s.over && s.t < 600) step(s, 0.05);
  assert.equal(s.overReason, 'won');
  assert.ok(eventsOf(s, 'ceoArrive').some((e) => e.kind === 'final'));
});

test('the last inspection walks every area in play and fines what it sees', () => {
  const s = finished();
  while (!(s.ceo && s.ceo.kind === 'final') && s.t < 300) step(s, 0.05);
  assert.deepEqual(s.ceo.areas, ['pA', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'h7', 'h8', 'pB']);
  assert.equal(s.ceo.strike, false, 'no strike visits had begun');
  assert.equal(s.ceo.cost, s.config.ceo.final.cost);
});

test('a third strike in the last inspection fires you at the last door: no win', () => {
  const s = finished();
  while (!(s.ceo && s.ceo.kind === 'final') && s.t < 300) step(s, 0.05);
  // As if strike visits had begun and two strikes were given already.
  s.ceo.strike = true;
  s.ceo.cost = null;
  s.ceoStrikes = 2;
  s.ceo.strikeNumber = 3;
  while (s.ceo && s.ceo.phase !== 'visit' && s.t < 300) step(s, 0.05);
  for (const e of EQUIPMENT.filter((x) => x.type === 'row')) if (!s.over) raiseAlarm(s, 'network', e.id);
  while (!s.over && s.t < 600) step(s, 0.05);
  assert.equal(s.overReason, 'ceo');
  assert.equal(results(s).won, false);
});

test('the score is the compute delivered, in dollars: not the sale, not the uptime bonus', () => {
  const s = game({ ceo: { enabled: false } });
  advance(s, 60);
  assert.ok(s.stats.delivered > 0);
  assert.equal(score(s), s.stats.delivered);
  assert.ok(s.stats.earned >= s.stats.delivered, 'earnings also hold the uptime bonus');
});

test('selling before the finish is "Sold early": the score is still the compute delivered', () => {
  const s = game({ building: { handoverAt: 5 }, ceo: { enabled: false } });
  advance(s, 6);
  s.handoverQueued = true;
  assert.equal(cannotSell(s), null);
  const delivered = s.stats.delivered;
  assert.equal(sell(s).ok, true);
  const r = results(s);
  assert.equal(r.outcome, 'soldEarly');
  assert.equal(r.won, false);
  assert.ok(Math.abs(r.score - delivered) < 1e-6);
});

test('switched off, Commissioned does not end the run and the score is as in pass 8', () => {
  const s = finished({ ceo: { enabled: false }, building: { finish: { enabled: false } } });
  assert.equal(commissioned(s), true);
  assert.equal(s.over, false);
  assert.equal(score(s), s.stats.earned);
  assert.equal(results(s).outcome, null);
});
