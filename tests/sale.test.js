// Commissioned and selling the campus (pass 5 spec 5, M34).
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  EQUIPMENT, advance, build, cannotSell, commissioned, createGame, formatClock, load, milestone, priceOf, raiseAlarm, results, resultsText, salePrice, score, sell, step,
} from '../src/core/index2.js';
import { reduceFlow } from '../src/ui/flow.js';
import { commissionedCard, sellButton, sellConfirm } from '../src/ui/sale.js';
import { resultsPanel } from '../src/ui/results.js';
import { buildingBestText, recordBest } from '../src/ui/best.js';
import { createFeel2, feelEvents2, liveCelebrations } from '../src/ui/feel2.js';

const NO_BURN = { loan: 0, loanRate: 0, base: 0, doubling: 0, upkeep: 0, wages: 0 };
const game = (config = {}) => createGame({
  seed: 1,
  config: { tutorial: false, autoDispatch: { enabled: false }, director: { enabled: false }, ...config, building: { enabled: true, startCash: 100000, burn: NO_BURN, ...(config.building ?? {}) } },
});
// M34's sale rules, which pass 7 (M41) replaced: kept to check them as they were.
const M34_SALE = { fromHandover: true, commissionedBonus: 0.5, anytime: false, incomeSeconds: 0 };
const builtPrice = (s) => EQUIPMENT.filter((e) => s.equip[e.id].built).reduce((sum, e) => sum + priceOf(s, e.id), 0);
const eventsOf = (s, type) => s.events.filter((e) => e.type === type);

// Build every spot on the campus at once, then let the rows power up and the cooling settle.
function everything(config = {}) {
  const s = game({ ceo: { enabled: false }, ...config });
  for (const e of EQUIPMENT) if (!s.equip[e.id].built) build(s, e.id);
  return s;
}

test('Commissioned: the first moment all 48 rows deliver full output, recorded once and kept', () => {
  const s = everything();
  advance(s, 8.2);
  assert.equal(commissioned(s), false, 'rows are still powering up');
  let n = 0;
  while (!commissioned(s) && s.t < 120) step(s, 0.05);
  assert.equal(commissioned(s), true);
  assert.ok(load(s).deliveredMw >= 300 - 1e-6);
  n += eventsOf(s, 'commissioned').length;
  // A rack row goes down: the campus stays Commissioned, and no second event.
  raiseAlarm(s, 'network', 'row-1-t-0');
  advance(s, 5);
  assert.ok(load(s).deliveredMw < 300);
  assert.equal(commissioned(s), true);
  assert.equal(n + eventsOf(s, 'commissioned').length - n, 1);
  assert.equal(milestone(s), 'commissioned');
});

test('the sale price is the price of everything built, half as much again once Commissioned (M34 rules)', () => {
  const s = game({ building: { sale: M34_SALE } });
  const start = builtPrice(s);
  assert.ok(start > 0);
  assert.equal(salePrice(s), start);
  build(s, 'row-1-t-2');
  advance(s, 8.2);
  assert.equal(salePrice(s), start + s.config.building.prices.row);
  const c = everything({ building: { sale: M34_SALE } });
  while (!commissioned(c) && c.t < 120) step(c, 0.05);
  assert.equal(salePrice(c), Math.round(builtPrice(c) * 1.5));
  assert.equal(eventsOf(c, 'commissioned')[0].price, salePrice(c));
});

test('selling: not before the Handover, not during a CEO visit, not with an outage open (M34 rules)', () => {
  const s = game({ ceo: { enabled: true }, building: { handoverAt: 30, sale: M34_SALE } });
  assert.equal(cannotSell(s), 'early');
  assert.equal(sell(s).ok, false);
  advance(s, 30.1); // the Handover comes at 30 s here, with its warning
  assert.ok(s.handoverQueued);
  assert.equal(cannotSell(s), 'ceo');
  while (s.ceo && s.t < 300) step(s, 0.05);
  assert.equal(cannotSell(s), null);
  const a = raiseAlarm(s, 'network', 'row-1-t-0'); // a rack row down costs power: an outage
  assert.equal(cannotSell(s), 'outage');
  s.alarms = s.alarms.filter((x) => x !== a);
  assert.equal(cannotSell(s), null);
  // fromHandover off: any time.
  assert.equal(cannotSell(game({ building: { sale: { fromHandover: false, commissionedBonus: 0.5 } } })), null);
  assert.equal(cannotSell(createGame({ seed: 1, config: { tutorial: false } })), 'off', 'the classic game has no sale');
});

test('selling ends the run, and the score is money earned plus the sale price', () => {
  const s = game({ building: { sale: { fromHandover: false, commissionedBonus: 0.5 } } });
  advance(s, 20);
  const earned = s.stats.earned;
  const price = salePrice(s);
  const out = sell(s);
  assert.deepEqual(out, { ok: true, price });
  assert.equal(s.over, true);
  assert.equal(s.overReason, 'sold');
  assert.equal(score(s), earned + price);
  const r = results(s);
  assert.equal(r.sold, true);
  assert.equal(r.salePrice, price);
  assert.equal(r.score, earned + price);
  assert.equal(r.firedByCeo, false);
  const panel = resultsPanel(r, { isNew: true, best: r }, formatClock);
  assert.equal(panel.title, 'Sold');
  assert.equal(panel.big[0].value, `$${Math.round(earned + price).toLocaleString('en-US')}`);
  assert.equal(panel.big[0].label, 'score · earned + sale');
  assert.ok(panel.lines.some(([k]) => k === 'Sale'));
  assert.match(resultsText(s), /Score: \$[\d,]+ \| Sold for \$[\d,]+/);
  assert.equal(sell(s).ok, false, 'once is enough');
});

test('going broke or being fired gives no sale: the score is money earned', () => {
  const s = game({ building: { startCash: 100, burn: { ...NO_BURN, base: 80 }, rescue: { enabled: false, funding: 2000, rate: 8 } } });
  advance(s, 120);
  assert.equal(s.overReason, 'bankrupt');
  const r = results(s);
  assert.equal(r.sold, false);
  assert.equal(r.salePrice, 0);
  assert.equal(r.score, r.earned);
});

test('a Commissioned campus sold is "Commissioned and sold", and Commissioned is the milestone', () => {
  const s = everything({ building: { sale: { fromHandover: false, commissionedBonus: 0.5 } } });
  while (!commissioned(s) && s.t < 120) step(s, 0.05);
  assert.equal(sell(s).ok, true);
  const panel = resultsPanel(results(s), { isNew: false, best: { energyGwh: 1, seconds: 1, earned: 1, score: 9e9 } }, formatClock);
  assert.equal(panel.title, 'Commissioned and sold');
  assert.equal(panel.big[1].value, 'Commissioned');
  assert.match(panel.lines.find(([k]) => k === 'Sale')[1], /Commissioned/);
  assert.match(panel.bestLine, /^Best: \$9,000,000,000/);
});

test('the highest milestone: none, then the ribbon-cutting, then the Handover', () => {
  const s = game();
  assert.equal(milestone(s), null);
  s.ribbonQueued = true;
  assert.equal(milestone(s), 'ribbon');
  s.handoverQueued = true;
  assert.equal(milestone(s), 'handover');
});

test('the menu offers the sale after the Handover, greyed with the reason when it cannot be done (M34 rules)', () => {
  const s = game({ building: { sale: M34_SALE } });
  assert.deepEqual(sellButton(s), { label: `Hand over the keys · $${salePrice(s).toLocaleString('en-US')}`, enabled: false, why: 'You can sell after the Handover' });
  s.handoverQueued = true;
  assert.equal(sellButton(s).enabled, true);
  raiseAlarm(s, 'network', 'row-1-t-0');
  assert.equal(sellButton(s).why, 'Not with an outage open');
  assert.equal(sellButton(createGame({ seed: 1, config: { tutorial: false } })), null, 'none in the classic game');
  const c = sellConfirm(game({ building: { sale: M34_SALE } }));
  assert.match(c.price, /^The campus sells for \$[\d,]+\.$/);
  assert.match(c.score, /^Your score would be \$[\d,]+: \$[\d,]+ earned plus the sale\.$/);
});

test('the Commissioned card: the CEO\'s line, the price, and a greyed sale while an outage is open (M34 rules)', () => {
  const s = everything({ building: { sale: M34_SALE } });
  while (!commissioned(s) && s.t < 120) step(s, 0.05);
  s.handoverQueued = true;
  const card = commissionedCard(s);
  assert.equal(card.title, 'Commissioned · 300 MW');
  assert.equal(card.quote, "“Fine. It's finished. Don't touch anything.”");
  assert.equal(card.sell, `Hand over the keys · $${salePrice(s).toLocaleString('en-US')}`);
  assert.equal(card.enabled, true);
  raiseAlarm(s, 'network', 'row-1-t-0');
  assert.equal(commissionedCard(s).enabled, false);
  assert.match(commissionedCard(s).price, /Not with an outage open: sell from the menu later\.$/);
});

test('Commissioned lights every hall in turn', () => {
  const s = everything();
  const feel = createFeel2();
  while (!commissioned(s) && s.t < 120) {
    step(s, 0.05);
    feelEvents2(feel, s.events.splice(0), s);
  }
  const lit = liveCelebrations(feel, s.t).filter((c) => c.text === 'Commissioned');
  assert.deepEqual(lit.map((c) => c.hall), [1], 'one hall at first');
  const later = liveCelebrations(feel, s.t + 1).filter((c) => c.text === 'Commissioned').map((c) => c.hall);
  assert.deepEqual(later, [1, 2, 3]);
  const all = new Set();
  for (let t = s.t; t < s.t + 5; t += 0.1) for (const c of liveCelebrations({ ...feel, celebrations: [...feel.celebrations] }, t)) all.add(c.hall);
  assert.equal(all.size, 8, 'all eight halls light up');
});

test('flow: the menu asks before selling; the Commissioned card sells or keeps running', () => {
  assert.equal(reduceFlow('paused', 'sellAsk').mode, 'sell');
  assert.equal(reduceFlow('sell', 'back').mode, 'paused');
  assert.equal(reduceFlow('sell', 'over').mode, 'over');
  assert.equal(reduceFlow('playing', 'commissioned').mode, 'commissioned');
  assert.equal(reduceFlow('commissioned', 'keep').mode, 'playing');
  assert.equal(reduceFlow('commissioned', 'over').mode, 'over');
});

test('the best is the new score; the old best shows, labelled, until a pass 5 run sets one', () => {
  const r = recordBest({ energyGwh: 1, seconds: 100, earned: 90000 }, { building: true, energyGwh: 1, seconds: 200, earned: 1000, score: 5000 });
  assert.equal(r.isNew, true, 'a pass 4 best has no score, so it is not compared');
  assert.equal(r.best.score, 5000);
  const r2 = recordBest(r.best, { building: true, energyGwh: 1, seconds: 200, earned: 4000, score: 4000 });
  assert.equal(r2.isNew, false);
  assert.equal(buildingBestText(null, { energyGwh: 1, seconds: 100, earned: 90000 }, formatClock), '$90,000 in 1:40 (older rules: money earned)');
  assert.equal(buildingBestText(r.best, { energyGwh: 1, seconds: 100, earned: 90000 }, formatClock), '$5,000 in 3:20');
  assert.equal(buildingBestText(null, null, formatClock), 'None yet');
});

test('the main menu\'s best names the highest milestone (pass 6 M37)', () => {
  const r = recordBest(null, { building: true, energyGwh: 1, seconds: 1090, earned: 100000, score: 142300, milestone: 'commissioned' });
  assert.equal(r.best.milestone, 'commissioned');
  assert.equal(buildingBestText(r.best, null, formatClock), '$142,300 in 18:10 · Commissioned');
  const plain = recordBest(null, { building: true, energyGwh: 1, seconds: 60, earned: 10, score: 10, milestone: null });
  assert.equal(buildingBestText(plain.best, null, formatClock), '$10 in 1:00');
});

// Pass 7 spec 3.4 (M41): a sale you can make.
test('M41: the sale price adds 2:30 of current income, so an outage lowers it', async () => {
  const { incomeRate } = await import('../src/core/index2.js');
  const s = game();
  assert.equal(s.config.building.sale.incomeSeconds, 150);
  advance(s, 5); // the start's rows power up
  const income = incomeRate(s);
  assert.ok(income > 0);
  assert.equal(salePrice(s), Math.round(builtPrice(s) + income * 150));
  raiseAlarm(s, 'network', 'row-1-t-0');
  advance(s, 4);
  assert.ok(incomeRate(s) < income);
  assert.equal(salePrice(s), Math.round(builtPrice(s) + incomeRate(s) * 150));
  assert.ok(salePrice(s) < Math.round(builtPrice(s) + income * 150));
  const c = everything();
  while (!commissioned(c) && c.t < 120) step(c, 0.05);
  assert.equal(salePrice(c), Math.round((builtPrice(c) + incomeRate(c) * 150) * 1.5));
});

test('M41: selling is allowed with an outage open and during a CEO warning, not while the CEO walks', () => {
  const s = game({ ceo: { enabled: true }, building: { handoverAt: 30 } });
  assert.equal(cannotSell(s), 'early');
  advance(s, 30.1);
  assert.ok(s.handoverQueued);
  assert.equal(s.ceo.phase, 'warning');
  assert.equal(cannotSell(s), null, 'the warning does not stop a sale');
  while (s.ceo && s.ceo.phase === 'warning' && s.t < 300) step(s, 0.05);
  assert.equal(s.ceo.phase, 'visit');
  assert.equal(cannotSell(s), 'ceo');
  assert.equal(sell(s).ok, false);
  while (s.ceo && s.t < 300) step(s, 0.05);
  raiseAlarm(s, 'network', 'row-1-t-0');
  assert.equal(cannotSell(s), null, 'an open outage does not stop a sale');
  assert.equal(sell(s).ok, true);
});

test('M41: the confirm card says the buyer pays for what the campus earns', () => {
  const c = sellConfirm(game());
  assert.match(c.price, /^The campus sells for \$[\d,]+: the equipment, plus 2:30 of what it earns now\.$/);
});
