// The win's screen (pass 9 spec 3.2, M54): records, the win card, results and the sale's words.
import test from 'node:test';
import assert from 'node:assert/strict';
import { formatClock } from '../src/core/index2.js';
import { cleanRecords, loadRecords, recordRun, recordsLine, recordsText, saveRecords } from '../src/ui/records.js';
import { winCard } from '../src/ui/finishView.js';
import { resultsPanel } from '../src/ui/results.js';
import { reduceFlow } from '../src/ui/flow.js';

const run = (over) => ({ building: true, finish: true, score: 100000, seconds: 900, won: false, wonAt: null, energyGwh: 1.2, ...over });

test('any run can set the high score; only a win sets the fastest win', () => {
  let rec = recordRun(null, run({ score: 50000 }));
  assert.equal(rec.newHigh, true);
  assert.equal(rec.newFastest, false);
  assert.equal(rec.records.fastest, null);
  rec = recordRun(rec.records, run({ won: true, wonAt: 760, score: 40000 }));
  assert.equal(rec.newHigh, false);
  assert.equal(rec.newFastest, true);
  rec = recordRun(rec.records, run({ won: true, wonAt: 800, score: 90000 }));
  assert.equal(rec.newHigh, true);
  assert.equal(rec.newFastest, false, 'a slower win is not the fastest');
  assert.equal(recordsText(rec.records, formatClock), 'Fastest win 12:40 · High score $90,000');
  assert.equal(recordsLine(rec, formatClock), 'New high score!');
  assert.equal(recordsText(cleanRecords(null), formatClock), null);
});

test('records survive storage that throws or holds rubbish', () => {
  const broken = { getItem() { throw new Error('no'); }, setItem() { throw new Error('no'); } };
  assert.deepEqual(loadRecords(broken), { high: null, fastest: null, level: null });
  assert.equal(saveRecords({ high: { score: 1, seconds: 2 } }, broken), false);
  const mem = new Map();
  const store = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v) };
  store.setItem('facops.records.v9', '{"high":{"score":"x"}}');
  assert.deepEqual(loadRecords(store), { high: null, fastest: null, level: null });
  saveRecords({ high: { score: 5, seconds: 6 }, fastest: { wonAt: 700, score: 5 } }, store);
  assert.deepEqual(loadRecords(store).fastest, { wonAt: 700, score: 5 });
});

test('the win card: the time large, the score as compute delivered', () => {
  assert.equal(winCard(run({}), formatClock), null);
  const c = winCard(run({ won: true, wonAt: 760, score: 123456 }), formatClock);
  assert.equal(c.title, 'Campus handed over');
  assert.equal(c.time, 'Finished in 12:40');
  assert.match(c.score, /^Score \$123,456 · compute delivered \(1\.20 GWh\)$/);
});

test('the run-over card leads with the outcome', () => {
  const base = { mode: 'building', earned: 1, spent: 0, burned: 0, raised: 0, cleared: 0, green: 1, yellow: 0, red: 0, redirects: 0, matchedShare: 0, shareOfPossible: 0.5, energyGwh: 1.2, seconds: 900, strikes: 0, strikesToFire: 3, strikeTimes: [] };
  const record = { isNew: false, best: { score: 1, seconds: 1, energyGwh: 1 } };
  const won = resultsPanel({ ...base, ...run({ won: true, wonAt: 760 }) }, record, formatClock);
  assert.equal(won.title, 'Campus handed over');
  assert.deepEqual(won.big[1], { value: '12:40', label: 'finished in' });
  assert.equal(won.big[0].label, 'score · compute delivered');
  const early = resultsPanel({ ...base, ...run({ sold: true, salePrice: 9000 }) }, record, formatClock);
  assert.equal(early.title, 'Sold early');
  assert.deepEqual(early.lines[0], ['Sale', 'The buyer paid $9,000']);
});

test('the win card holds the game; Results opens the run-over card', () => {
  assert.equal(reduceFlow('playing', 'won').mode, 'won');
  assert.equal(reduceFlow('won', 'over').mode, 'over');
});

test('the last inspection has its own banner, wide and narrow', async () => {
  const { bannerModel } = await import('../src/ui/ceoView.js');
  const { createGame } = await import('../src/core/index2.js');
  const s = createGame({ seed: 1, config: { tutorial: false, building: { enabled: true } } });
  s.ceo = { kind: 'final', phase: 'visit', areas: ['pA', 'h1'], steps: [], step: 0, warningEnd: 0, cost: 35, strike: false, zeroTolerance: false, nextIsStrike: false };
  const wide = bannerModel(s, false);
  assert.match(wide.lines[0], /^The last inspection/);
  assert.match(wide.lines[1], /keys are handed over/);
  assert.match(bannerModel(s, true).lines[0], /^CEO · last inspection/);
});
