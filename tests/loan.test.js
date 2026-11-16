// The construction loan (pass 5 spec 3, M32): repaid at a fixed rate from the start of the economy
// until it is paid off; then only the site overhead, upkeep and wages. Pass 4's doubling is off.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { burnRate, createGame, incomeRate, loanLeft, loanText, loanTimeLeft, results, setScripted, step } from '../src/core/index2.js';
import { hudModel2, moneyModel } from '../src/ui/hud2.js';
import { createIntros, INTRO_TEXT, updateIntros } from '../src/ui/intros.js';
import { handOverLine } from '../src/ui/tutorial4.js';

const game = (building = {}) => createGame({ seed: 1, config: { tutorial: false, autoDispatch: { enabled: false }, director: { enabled: false }, building: { enabled: true, startCash: 5000, ...building } } });
const advance = (s, seconds) => { for (let i = 0; i < Math.round(seconds / 0.05); i++) step(s, 0.05); };

test('the loan is repaid at its rate on top of the site overhead, upkeep and wages', () => {
  const s = game();
  const b = s.config.building.burn;
  assert.equal(b.doubling, 0, 'no doubling by default');
  assert.equal(loanLeft(s), b.loan);
  assert.ok(Math.abs(loanTimeLeft(s) - b.loan / b.loanRate) < 1e-9);
  // At the start: the loan, the overhead, upkeep on seven pieces of infrastructure, two techs' wages.
  assert.ok(Math.abs(burnRate(s) - (b.loanRate + b.base + 7 * b.upkeep + 2 * b.wages)) < 1e-9);
  advance(s, 60);
  assert.ok(Math.abs(loanLeft(s) - (b.loan - 60 * b.loanRate)) < 0.5);
});

test('once paid off, only the overhead, upkeep and wages remain, and the overhead never grows', () => {
  const s = game();
  const b = s.config.building.burn;
  const events = [];
  for (let t = 0; t < b.loan / b.loanRate + 1; t += 0.05) { step(s, 0.05); events.push(...s.events.splice(0)); }
  assert.equal(loanLeft(s), 0);
  assert.equal(events.filter((e) => e.type === 'loanPaid').length, 1);
  assert.ok(Math.abs(s.loanPaidAt - b.loan / b.loanRate) < 0.1);
  const late = burnRate(s);
  assert.ok(Math.abs(late - (b.base + 7 * b.upkeep + 2 * b.wages)) < 1e-9);
  advance(s, 600);
  assert.ok(Math.abs(burnRate(s) - late) < 1e-9, 'flat: no doubling');
});

test('nothing is repaid while the tutorial runs; the loan starts at the hand-over', () => {
  const s = game();
  setScripted(s, true);
  advance(s, 100);
  assert.equal(loanLeft(s), s.config.building.burn.loan);
  setScripted(s, false);
  advance(s, 10);
  assert.ok(Math.abs(loanLeft(s) - (s.config.building.burn.loan - 10 * s.config.building.burn.loanRate)) < 0.5);
});

test('a full campus covers the late burn many times over', () => {
  const s = game();
  // Every rack earning, every other spot built, ten techs: still far in profit after the loan.
  const b = s.config.building.burn;
  const infra = 180 - 48;
  const fullIncome = 48 * s.config.building.income;
  assert.ok(fullIncome > 5 * (b.base + infra * b.upkeep + 10 * b.wages));
});

test('no loan, or pass 4\'s doubling, is still possible from config', () => {
  const none = game({ burn: { loan: 0, loanRate: 6, base: 1, doubling: 0, upkeep: 0, wages: 0 } });
  assert.equal(loanLeft(none), 0);
  assert.equal(burnRate(none), 1);
  assert.equal(loanText(results(none)), '');
  const old = game({ burn: { base: 3, doubling: 150, upkeep: 0, wages: 0 } });
  old.t = 150;
  assert.ok(Math.abs(burnRate(old) - 6) < 1e-9);
});

test('the HUD names the loan while it is owed, and drops it once paid', () => {
  const s = game();
  const m = moneyModel(s);
  assert.equal(m.loan, 'Loan $1,800');
  assert.equal(m.loanShare, 1);
  const h = hudModel2(s);
  assert.ok(h.note.startsWith('Loan $1,800 · '));
  assert.ok(h.noteShorter.length <= 12, 'the shortest wording fits a narrow screen');
  advance(s, s.config.building.burn.loan / s.config.building.burn.loanRate + 1);
  assert.equal(moneyModel(s).loan, null);
  assert.equal(moneyModel(s).loanShare, 0);
  assert.ok(!hudModel2(s).note.includes('Loan'));
});

test('results say when the loan was paid off, or that it was not', () => {
  const s = game();
  assert.equal(loanText(results(s)), 'Loan not paid off');
  advance(s, s.config.building.burn.loan / s.config.building.burn.loanRate + 1);
  assert.match(loanText(results(s)), /^Loan paid off at [45]:\d\d$/);
});

test('the paid-off line shows once, for a few seconds, and waits for a CEO warning', () => {
  const s = game();
  const intros = createIntros({ devices: false });
  s.loanPaidAt = s.t;
  s.ceo = { phase: 'warning' };
  assert.equal(updateIntros(intros, s), '');
  s.ceo = null;
  assert.equal(updateIntros(intros, s), INTRO_TEXT.loan);
  s.t += 5;
  assert.equal(updateIntros(intros, s), '');
  assert.equal(intros.queue.length, 0);
});

test('without the tutorial only the loan line is shown, never the device introductions', () => {
  const s = game();
  const intros = createIntros({ devices: false });
  s.alarms.push({ id: 99, type: 'network', equipId: 'row-1-t-0' });
  assert.equal(updateIntros(intros, s), '');
});

test('the hand-over line states the loan from config, on one line', () => {
  const s = game();
  const line = handOverLine(s);
  assert.ok(line.includes('$6 a second for 5 minutes'), line);
  assert.ok(line.length <= 110);
  const other = game({ burn: { loan: 1500, loanRate: 5, base: 1, doubling: 0, upkeep: 0.15, wages: 0.5 } });
  assert.ok(handOverLine(other).includes('$5 a second for 5 minutes'));
  assert.ok(incomeRate(s) > 0);
});
