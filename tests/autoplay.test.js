import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, results, step } from '../src/core/index.js';
import { AUTO_GAP, autoplayStep, createAutoplay } from '../src/ui/autoplay.js';
import { createClock, runFrame } from '../src/ui/loop.js';

// Plays a round the way the page does: 60 frames a second through the fixed-step clock.
function playLikeThePage(seed, maxSeconds = 900) {
  const state = createGame({ seed });
  const clock = createClock();
  const auto = createAutoplay();
  const commands = [];
  for (let frame = 0; !state.over && state.t < maxSeconds; frame++) {
    runFrame(clock, (frame * 1000) / 60, (dt) => {
      step(state, dt);
      if (autoplayStep(auto, state)) commands.push(state.t);
    });
  }
  return { state, commands };
}

test('the scripted player waits 0.8 s between commands', () => {
  const { commands } = playLikeThePage(7);
  for (let i = 1; i < commands.length; i++) assert.ok(commands[i] - commands[i - 1] >= AUTO_GAP - 1e-6);
});

test('#auto rounds end in roughly four minutes', () => {
  const lengths = [1, 2, 3, 4, 5, 6].map((seed) => playLikeThePage(seed).state.t);
  const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  assert.ok(lengths.every((t) => t < 900), 'a round never ended');
  assert.ok(mean > 150 && mean < 400, `mean round ${mean.toFixed(0)} s`);
});

test('without the scripted player the round ends within about two minutes', () => {
  for (const seed of [1, 2, 3]) {
    const state = createGame({ seed });
    while (!state.over && state.t < 300) step(state, 0.05);
    assert.ok(state.over && state.t < 150, `seed ${seed} lasted ${state.t.toFixed(0)} s`);
  }
});

test('the scripted player does nothing once the round is over', () => {
  const { state } = playLikeThePage(3);
  assert.equal(autoplayStep(createAutoplay(), state), false);
  assert.ok(results(state).cleared > 10);
});
