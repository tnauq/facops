// The ledger (pass 7 spec 6.1, M45): where the money goes, now and over the run so far.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame, hire, raiseAlarm, step } from '../src/core/index2.js';
import { buildMove } from '../src/core/builder.js';
import { greedyMove } from '../src/core/bot2.js';
import { ledger } from '../src/ui/ledger.js';

function play(s, seconds) {
  const end = s.t + seconds;
  let next = Math.ceil(s.t);
  while (s.t < end - 1e-9 && !s.over) {
    step(s, 0.05);
    if (s.t >= next) {
      buildMove(s, 'builder');
      greedyMove(s, { reaction: 1 });
      next += 1;
    }
  }
}

for (const seed of [2, 9]) {
  test(`the run so far adds up to the cash, through the loan, credits, bonuses and fines (seed ${seed})`, () => {
    const s = createGame({ seed, config: { tutorial: false, building: { enabled: true } } });
    for (const at of [1, 200, 400, 900]) {
      play(s, at - s.t);
      const l = ledger(s);
      assert.ok(Math.abs(l.total - s.cash) < 1e-6, `at ${at} s: ${l.total} against ${s.cash}`);
    }
    assert.ok(s.stats.credits > 0 || s.stats.ceoFines > 0 || s.over, 'the run got to the late game');
  });
}

test('now: income by online hall, the loan with what is left, upkeep, wages and credits with their notes', () => {
  const s = createGame({ seed: 1, config: { tutorial: false, autoDispatch: { enabled: false }, director: { enabled: false }, ceo: { enabled: false }, building: { enabled: true, startCash: 5000 } } });
  for (let i = 0; i < 100; i++) step(s, 0.05);
  hire(s, 'network');
  const l = ledger(s);
  const labels = l.now.map((x) => x.label);
  assert.deepEqual(labels, ['Hall 1', 'Loan repayment', 'Site overhead', 'Upkeep', 'Wages', 'Service credits']);
  assert.equal(l.now[0].value, '+$8.00/s');
  assert.match(l.now[1].note, /^\$1,7\d\d left, paid off at 5:00$/);
  assert.equal(l.now[3].note, '9 devices');
  assert.equal(l.now[4].note, '3 techs');
  assert.equal(l.now[5].note, 'from 5:00, for racks that are down');
  assert.equal(l.soFar.find((x) => x.label === 'Spent on hiring and upgrades').value, '−$400');
  assert.equal(l.startText, '$5,000');
  // Customers live, a row down: credits a second, and when they next double.
  s.economyStart = -400;
  s.customersLive = true;
  raiseAlarm(s, 'network', 'row-1-t-0');
  for (let i = 0; i < 60; i++) step(s, 0.05);
  const c = ledger(s).now.find((x) => x.label === 'Service credits');
  assert.match(c.value, /^−\$\d+\.\d\d\/s$/);
  assert.match(c.note, /^\$\d+\/s a row short, doubles in \d:\d\d$/);
});

// The run-over card (spec 6.2).
// Pass 9 (M54): pass 7's run-over lines, so with the win at the finish off (tests/finish.test.js has its own).
const quiet = (building = {}) => createGame({ seed: 1, config: { tutorial: false, autoDispatch: { enabled: false }, director: { enabled: false }, ceo: { enabled: false }, building: { enabled: true, startCash: 5000, finish: { enabled: false }, ...building } } });

test('the CEO\'s parting line: the first that applies', async () => {
  const { idleBackupSpend, partingLine } = await import('../src/ui/runOver.js');
  const { build, results } = await import('../src/core/index2.js');
  const s = quiet();
  const r = (over) => ({ ...results(s), ...over });
  assert.equal(partingLine(s, r({ sold: true, commissioned: true })), "Pleasure doing business. Don't call me.");
  assert.equal(partingLine(s, r({ firedByCeo: true })), 'Not one backup. Bold. Also, fired.');
  build(s, 'xfmr-1-t-B');
  build(s, 'msb-1-t-B');
  build(s, 'cdu-1-b');
  for (let i = 0; i < 200; i++) step(s, 0.05);
  assert.equal(idleBackupSpend(s), 75 + 150 + 250);
  assert.equal(partingLine(s, r({ firedByCeo: true })), 'You spent $475 on backups that never tripped.');
  raiseAlarm(s, 'breaker', 'msb-1-t-A');
  raiseAlarm(s, 'leak', 'cdu-1-t');
  assert.equal(idleBackupSpend(s), 0, 'once they had something to cover');
  assert.equal(partingLine(s, r({ firedByCeo: true })), "I'll get an AI to run this.");
  assert.equal(partingLine(s, r({ bankrupt: true, seconds: 120 })), 'The loan wanted its money. So did I.');
  assert.equal(partingLine(s, r({ bankrupt: true, seconds: 900, brokeOnCredits: true })), "Our customers have sent a thank-you card. It's an invoice.");
  assert.equal(partingLine(s, r({ sold: true, hallsEverDry: 1 })), 'Half the building ran at half. I did the maths.');
  assert.equal(partingLine(s, r({ sold: true })), "I'll get an AI to run this.");
});

test('the card and Copy carry the ledger\'s run so far, from the starting cash to the cash at the end', async () => {
  const { soFarLines, soFarText } = await import('../src/ui/runOver.js');
  const s = quiet();
  hire(s, 'network');
  for (let i = 0; i < 200; i++) step(s, 0.05);
  const lines = soFarLines(s);
  assert.deepEqual(lines[0], ['Starting cash', '$5,000']);
  assert.equal(lines.at(-1)[0], 'Cash at the end');
  assert.ok(lines.some(([k, v]) => k === 'Spent on hiring and upgrades' && v === '−$400'));
  assert.ok(!lines.some(([k]) => k === 'CEO fines'), 'nothing for what never happened');
  assert.match(soFarText(s), /^Ledger: Starting cash \$5,000 \| /);
});

test('the cash readout is a 44 px button in building mode only', async () => {
  const { cashTarget, railTargets2 } = await import('../src/ui/targets2.js');
  const { regions } = await import('../src/ui/regions.js');
  const regs = regions(844, 390);
  const b = cashTarget(844);
  assert.ok(b.w >= 44 && b.h >= 44);
  assert.ok(railTargets2(quiet(), regs, 1).buttons.some((x) => x.id === 'cash'));
  const classic = createGame({ seed: 1, config: { tutorial: false } });
  assert.ok(!railTargets2(classic, regs, 1).buttons.some((x) => x.id === 'cash'));
  // Every other HUD button sits clear of it.
  for (const x of railTargets2(quiet(), regs, 1).buttons.filter((y) => y.id !== 'cash')) assert.ok(x.x >= b.x + b.w, x.id);
});
