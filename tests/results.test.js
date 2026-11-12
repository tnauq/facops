import test from 'node:test';
import assert from 'node:assert/strict';
import { playRound, raiseAlarm, results, resultsText } from '../src/core/index.js';
import { near, quietGame, tick } from './helpers.js';

test('energy: one real second is one plant minute', () => {
  const g = quietGame();
  tick(g, 60); // 500 MW for 60 plant minutes = 500 MWh
  const r = results(g);
  assert.ok(near(r.energyGwh, 0.5, 1e-6));
  assert.ok(near(r.shareOfPossible, 1, 1e-9));
  assert.ok(near(r.green + r.yellow + r.red, 1, 1e-9));
});

test('results count what happened', () => {
  const g = quietGame();
  raiseAlarm(g, 'leak', 'cdu-1-0');
  tick(g, 31);
  const r = results(g);
  assert.equal(r.raised, 1);
  assert.equal(r.cleared, 0);
  assert.equal(r.rowShutdowns, 1);
  assert.ok(r.shareOfPossible < 1);
  assert.ok(near(r.lowestFraction, 0.75, 1e-9));
});

test('the copy text names the mode, seed, score and any tuning changes', () => {
  const plain = quietGame({}, 77);
  tick(plain, 5);
  const text = resultsText(plain);
  assert.match(text, /^FacOps pass 1 results/);
  assert.match(text, /Mode: two-tap \| Seed: 77/);
  assert.match(text, /Survived: 0:05/);
  assert.match(text, /Tuning: director\.enabled=false$/);

  const tuned = quietGame({ walkSpeed: 150, oneTap: true });
  tick(tuned, 1);
  assert.match(resultsText(tuned), /Mode: one-tap/);
  assert.match(resultsText(tuned), /walkSpeed=150/);
});

test('a scripted player always reaches the end of a round, in a few minutes', () => {
  const lengths = [];
  for (let seed = 1; seed <= 24; seed++) {
    const r = playRound({ seed });
    assert.equal(r.finished, true, `seed ${seed} never ended`);
    lengths.push(r.seconds);
  }
  lengths.sort((a, b) => a - b);
  const median = lengths[12];
  assert.ok(median > 150 && median < 420, `median round was ${Math.round(median)} s`);
});

test('one-tap rounds end too', () => {
  const r = playRound({ seed: 4, config: { oneTap: true } });
  assert.equal(r.finished, true);
});
