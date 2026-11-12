import test from 'node:test';
import assert from 'node:assert/strict';
import { MAX_STEPS, STEP, createClock, runFrame } from '../src/ui/loop.js';

const count = (clock, now, paused) => {
  let n = 0;
  runFrame(clock, now, () => { n += 1; }, paused);
  return n;
};

test('the first frame only starts the clock', () => {
  assert.equal(count(createClock(), 1000), 0);
});

test('steps are fixed at 0.05 s and leftover time carries to the next frame', () => {
  const clock = createClock();
  const sizes = [];
  runFrame(clock, 0, () => {});
  runFrame(clock, 120, (dt) => sizes.push(dt)); // 0.12 s: two steps, 0.02 s left
  assert.deepEqual(sizes, [STEP, STEP]);
  assert.equal(count(clock, 150), 1); // 0.02 + 0.03 = one more step
});

test('sixty frames a second run one second of rules', () => {
  const clock = createClock();
  let steps = 0;
  for (let i = 0; i <= 60; i++) steps += count(clock, (i * 1000) / 60);
  assert.ok(Math.abs(steps - 20) <= 1, `ran ${steps} steps`);
});

test('a slow frame runs at most 5 steps and drops the rest', () => {
  const clock = createClock();
  count(clock, 0);
  assert.equal(count(clock, 3000), MAX_STEPS);
  assert.ok(count(clock, 3016) <= 1, 'the backlog was not dropped');
});

test('no steps run while paused, and paused time is not saved up', () => {
  const clock = createClock();
  count(clock, 0);
  assert.equal(count(clock, 5000, true), 0);
  assert.equal(count(clock, 5016), 0);
});
