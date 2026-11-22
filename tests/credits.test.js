// Service credits (pass 7 spec 3.2, M41): from the moment the loan is paid off, every online rack row
// short of full output costs credits, at a rate that doubles on a clock. Nothing while every row delivers.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  build, burnRate, createGame, creditPerRow, creditsOn, creditsRate, customersLiveAt, load, raiseAlarm, results, resultsText, rowsShort, setScripted, step,
} from '../src/core/index2.js';

const game = (building = {}, extra = {}) => createGame({
  seed: 1,
  config: { tutorial: false, autoDispatch: { enabled: false }, director: { enabled: false }, ceo: { enabled: false }, ...extra, building: { enabled: true, startCash: 50000, ...building } },
});
const advance = (s, seconds) => { for (let i = 0; i < Math.round(seconds / 0.05); i++) step(s, 0.05); };
const near = (a, b, eps = 1e-6) => Math.abs(a - b) < eps;

test('customers go live when the loan is paid off, and only then', () => {
  const s = game();
  const b = s.config.building.burn;
  assert.equal(customersLiveAt(s), b.loan / b.loanRate);
  assert.equal(creditsOn(s), false);
  raiseAlarm(s, 'network', 'row-1-t-0');
  advance(s, 5);
  assert.ok(rowsShort(s) > 0.9, 'a row is dark');
  assert.equal(creditsRate(s), 0, 'nothing charged before customers go live');
  const events = [];
  while (s.t < customersLiveAt(s) + 1) { step(s, 0.05); events.push(...s.events.splice(0)); }
  assert.equal(creditsOn(s), true);
  assert.equal(events.filter((e) => e.type === 'customersLive').length, 1);
  assert.ok(events.some((e) => e.type === 'credits' && e.rate > 0));
});

test('nothing is charged while every row delivers, however late', () => {
  const s = game();
  advance(s, 1200);
  assert.ok(creditPerRow(s) > 1, 'the rate has grown');
  assert.ok(near(load(s).deliveredMw, load(s).capacityMw));
  assert.equal(creditsRate(s), 0);
  assert.equal(s.stats.credits, 0);
});

test('a dark row costs the full rate per row; the rate doubles every `doubling` seconds', () => {
  const s = game({ burn: { loan: 0, loanRate: 0, base: 0, doubling: 0, upkeep: 0, wages: 0 } });
  const c = s.config.building.credits;
  assert.equal(customersLiveAt(s), 0, 'no loan: customers are live from the start');
  advance(s, 2);
  assert.ok(near(creditPerRow(s), c.rate * Math.pow(2, s.t / c.doubling)));
  raiseAlarm(s, 'network', 'row-1-t-0');
  advance(s, 5);
  assert.ok(near(rowsShort(s), 1, 1e-3));
  assert.ok(near(creditsRate(s), creditPerRow(s) * rowsShort(s)));
  assert.ok(near(burnRate(s), creditsRate(s)), 'credits are part of the burn');
  const before = creditPerRow(s);
  advance(s, c.doubling);
  assert.ok(near(creditPerRow(s), 2 * before, 1e-3));
});

test('a row short of full output is charged its share: a leaking coolant unit\'s 90%, a hall without water\'s half', () => {
  const s = game({ burn: { loan: 0, loanRate: 0, base: 0, doubling: 0, upkeep: 0, wages: 0 } });
  advance(s, 5);
  const rows = load(s).capacityMw / s.config.rowMw;
  assert.equal(rows, 2);
  // Hall 1 gets its second coolant unit; then one leaks: the hall runs at 90%.
  build(s, 'cdu-1-b');
  advance(s, 9);
  const leak = raiseAlarm(s, 'leak', 'cdu-1-t');
  advance(s, 4);
  assert.ok(near(rowsShort(s), rows * (1 - s.config.leakThrottle), 0.02));
  assert.ok(near(creditsRate(s), creditPerRow(s) * rowsShort(s)));
  s.alarms = s.alarms.filter((a) => a !== leak);
  s.equip['cdu-1-t'].leaking = false;
  s.equip['cdu-1-t'].alarmId = null;
  advance(s, 4);
  assert.ok(rowsShort(s) < 1e-3);
  // No water: the water pump serves no hall.
  const dry = game({ burn: { loan: 0, loanRate: 0, base: 0, doubling: 0, upkeep: 0, wages: 0 }, pumps: { chillersPerGlycolPump: 2, cdusPerGlycolPump: 2, hallsPerWaterPump: 0, noWaterFactor: 0.5 } });
  advance(dry, 5);
  assert.ok(near(rowsShort(dry), rows * 0.5, 0.02));
  assert.ok(near(creditsRate(dry), creditPerRow(dry) * rowsShort(dry)));
});

test('none while the tutorial\'s lessons run, and none in the classic game', () => {
  const s = game({ burn: { loan: 0, loanRate: 0, base: 0, doubling: 0, upkeep: 0, wages: 0 } });
  setScripted(s, true);
  raiseAlarm(s, 'network', 'row-1-t-0');
  advance(s, 5);
  assert.equal(creditsRate(s), 0);
  const classic = createGame({ seed: 1, config: { tutorial: false } });
  assert.equal(creditsOn(classic), false);
});

test('going broke on credits: the results say so', () => {
  const s = game({ startCash: 50, burn: { loan: 0, loanRate: 0, base: 0, doubling: 0, upkeep: 0, wages: 0 }, credits: { rate: 50, doubling: 0 }, rescue: { enabled: false, funding: 2000, rate: 8 } });
  raiseAlarm(s, 'network', 'row-1-t-0');
  raiseAlarm(s, 'network', 'row-1-t-1');
  advance(s, 60);
  assert.equal(s.overReason, 'bankrupt');
  const r = results(s);
  assert.ok(r.credits > 50);
  assert.equal(r.brokeOnCredits, true);
  assert.match(resultsText(s), /service credits \$[\d,]+\) \| Went broke: service credits/);
});

test('rate 0 turns credits off', () => {
  const s = game({ burn: { loan: 0, loanRate: 0, base: 0, doubling: 0, upkeep: 0, wages: 0 }, credits: { rate: 0, doubling: 0 } });
  raiseAlarm(s, 'network', 'row-1-t-0');
  advance(s, 5);
  assert.equal(creditsRate(s), 0);
});

test('the results card: "Went broke: service credits" and a Service credits line', async () => {
  const { resultsPanel } = await import('../src/ui/results.js');
  const { formatClock } = await import('../src/core/index2.js');
  const s = game({ startCash: 50, burn: { loan: 0, loanRate: 0, base: 0, doubling: 0, upkeep: 0, wages: 0 }, credits: { rate: 50, doubling: 0 }, rescue: { enabled: false, funding: 2000, rate: 8 } });
  raiseAlarm(s, 'network', 'row-1-t-0');
  advance(s, 60);
  const r = results(s);
  const panel = resultsPanel(r, { isNew: true, best: r }, formatClock);
  assert.equal(panel.title, 'Went broke: service credits');
  assert.ok(panel.lines.some(([k]) => k === 'Service credits'));
});

test('introductions: customers going live, the sale, and credits passing income', async () => {
  const { createIntros, updateIntros, CUSTOMERS_TEXT, INTRO_TEXT } = await import('../src/ui/intros.js');
  const s = game();
  const intros = createIntros();
  const seen = new Set();
  const b = s.config.building.burn;
  while (s.t < b.loan / b.loanRate + 1) { step(s, 0.05); const t = updateIntros(intros, s); if (t) seen.add(t); }
  assert.ok(seen.has(CUSTOMERS_TEXT));
  s.handoverQueued = true;
  for (let i = 0; i < 300; i++) { step(s, 0.05); const t = updateIntros(intros, s); if (t) seen.add(t); }
  assert.ok(seen.has(INTRO_TEXT.sale));
  // Every row dark and a steep rate: credits pass income.
  s.config.building.credits = { rate: 100, doubling: 0 };
  raiseAlarm(s, 'network', 'row-1-t-0');
  for (let i = 0; i < 300; i++) { step(s, 0.05); const t = updateIntros(intros, s); if (t) seen.add(t); }
  assert.ok(seen.has(INTRO_TEXT.creditsOver));
  for (const t of [CUSTOMERS_TEXT, INTRO_TEXT.sale, INTRO_TEXT.creditsOver]) assert.ok(t.length <= 110, t);
});
