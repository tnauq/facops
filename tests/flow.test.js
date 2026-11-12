import test from 'node:test';
import assert from 'node:assert/strict';
import { reduceFlow } from '../src/ui/flow.js';

const go = (mode, action) => reduceFlow(mode, action);

test('Start begins a new round', () => {
  assert.deepEqual(go('start', 'start'), { mode: 'playing', newRound: true });
});

test('pause and resume keep the same round', () => {
  assert.deepEqual(go('playing', 'pause'), { mode: 'paused', newRound: false });
  assert.deepEqual(go('paused', 'resume'), { mode: 'playing', newRound: false });
});

test('Space toggles pause both ways', () => {
  assert.deepEqual(go('playing', 'togglePause'), { mode: 'paused', newRound: false });
  assert.deepEqual(go('paused', 'togglePause'), { mode: 'playing', newRound: false });
});

test('Restart from pause and Play again from round over start a new round', () => {
  assert.deepEqual(go('paused', 'restart'), { mode: 'playing', newRound: true });
  assert.deepEqual(go('over', 'again'), { mode: 'playing', newRound: true });
});

test('the round ending moves to round over', () => {
  assert.deepEqual(go('playing', 'over'), { mode: 'over', newRound: false });
});

test('actions that make no sense where they land change nothing', () => {
  assert.deepEqual(go('start', 'togglePause'), { mode: 'start', newRound: false });
  assert.deepEqual(go('over', 'togglePause'), { mode: 'over', newRound: false });
  assert.deepEqual(go('over', 'pause'), { mode: 'over', newRound: false });
  assert.deepEqual(go('playing', 'again'), { mode: 'playing', newRound: false });
  assert.deepEqual(go('paused', 'over'), { mode: 'paused', newRound: false });
});
