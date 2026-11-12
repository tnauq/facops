import test from 'node:test';
import assert from 'node:assert/strict';
import { formatClock } from '../src/core/index.js';
import { BEST_KEY, bestText, loadBest, recordBest, saveBest } from '../src/ui/best.js';

function memoryStorage() {
  const data = new Map();
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => data.set(k, String(v)),
    data,
  };
}

const blocked = {
  getItem() {
    throw new Error('SecurityError');
  },
  setItem() {
    throw new Error('QuotaExceededError');
  },
};

test('the first round is always a new best', () => {
  assert.deepEqual(recordBest(null, { energyGwh: 1.2, seconds: 200 }), { best: { energyGwh: 1.2, seconds: 200 }, isNew: true });
});

test('more energy wins; less keeps the old best', () => {
  const old = { energyGwh: 1.5, seconds: 250 };
  assert.equal(recordBest(old, { energyGwh: 1.6, seconds: 100 }).isNew, true);
  const r = recordBest(old, { energyGwh: 1.4, seconds: 300 });
  assert.equal(r.isNew, false);
  assert.deepEqual(r.best, old);
});

test('on equal energy the longer round wins', () => {
  const old = { energyGwh: 1.5, seconds: 250 };
  assert.equal(recordBest(old, { energyGwh: 1.5, seconds: 260 }).isNew, true);
  assert.equal(recordBest(old, { energyGwh: 1.5, seconds: 250 }).isNew, false);
});

test('a saved best survives a reload', () => {
  const store = memoryStorage();
  assert.equal(loadBest(store), null);
  assert.equal(saveBest({ energyGwh: 1.93, seconds: 251.5 }, store), true);
  assert.deepEqual(JSON.parse(store.data.get(BEST_KEY)), { energyGwh: 1.93, seconds: 251.5 });
  assert.deepEqual(loadBest(store), { energyGwh: 1.93, seconds: 251.5 });
});

test('blocked or missing storage never throws', () => {
  assert.equal(loadBest(blocked), null);
  assert.equal(saveBest({ energyGwh: 1, seconds: 1 }, blocked), false);
  assert.equal(loadBest(null), null);
  assert.equal(saveBest({ energyGwh: 1, seconds: 1 }, null), false);
});

test('junk in storage is ignored', () => {
  const store = memoryStorage();
  for (const junk of ['not json', '42', 'null', '{"energyGwh":"lots","seconds":3}', '{}']) {
    store.setItem(BEST_KEY, junk);
    assert.equal(loadBest(store), null, junk);
  }
});

test('best text', () => {
  assert.equal(bestText({ energyGwh: 1.926, seconds: 252.4 }, formatClock), '1.93 GWh in 4:12');
  assert.equal(bestText(null, formatClock), 'None yet');
});
