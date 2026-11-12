import test from 'node:test';
import assert from 'node:assert/strict';
import { createRng } from '../src/core/index.js';

test('same seed gives the same sequence', () => {
  const a = createRng(42);
  const b = createRng(42);
  for (let i = 0; i < 50; i++) assert.equal(a.next(), b.next());
});

test('different seeds give different sequences', () => {
  const a = createRng(1);
  const b = createRng(2);
  const same = Array.from({ length: 20 }, () => a.next() === b.next()).every(Boolean);
  assert.equal(same, false);
});

test('next() stays in [0, 1) and range() stays in its bounds', () => {
  const r = createRng(7);
  for (let i = 0; i < 2000; i++) {
    const v = r.next();
    assert.ok(v >= 0 && v < 1);
    const w = r.range(-1, 1);
    assert.ok(w >= -1 && w < 1);
  }
});

test('weighted() follows the weights', () => {
  const r = createRng(9);
  const counts = { a: 0, b: 0 };
  for (let i = 0; i < 4000; i++) counts[r.weighted([{ id: 'a', weight: 3 }, { id: 'b', weight: 1 }]).id] += 1;
  const share = counts.a / 4000;
  assert.ok(share > 0.7 && share < 0.8, `share of a was ${share}`);
});
