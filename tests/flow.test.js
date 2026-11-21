import test from 'node:test';
import assert from 'node:assert/strict';
import { reduceFlow } from '../src/ui/flow.js';

const go = (mode, action) => reduceFlow(mode, action);

test('New run on the main menu begins a new round (pass 6: the start card is the menu)', () => {
  assert.deepEqual(go('menu', 'start'), { mode: 'playing', newRound: true });
  assert.deepEqual(go('menu', 'tutorial'), { mode: 'playing', newRound: true });
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
  assert.deepEqual(go('menu', 'togglePause'), { mode: 'menu', newRound: false });
  assert.deepEqual(go('over', 'togglePause'), { mode: 'over', newRound: false });
  assert.deepEqual(go('over', 'pause'), { mode: 'over', newRound: false });
  assert.deepEqual(go('playing', 'again'), { mode: 'playing', newRound: false });
  assert.deepEqual(go('paused', 'over'), { mode: 'paused', newRound: false });
});

test('Settings opens from the menu and the pause menu, and Back returns there (pass 6 M37)', () => {
  for (const from of ['menu', 'paused']) {
    const open = reduceFlow(from, 'settings');
    assert.deepEqual(open, { mode: 'settings', newRound: false, settingsBack: from });
    assert.deepEqual(reduceFlow('settings', 'settingsBack', null, open.settingsBack), { mode: from, newRound: false });
  }
  assert.deepEqual(go('playing', 'settings'), { mode: 'playing', newRound: false }, 'not from play');
  // The drawer opened from Settings returns to Settings, which still knows its own way back.
  const drawer = reduceFlow('settings', 'tuning');
  assert.deepEqual(drawer, { mode: 'tuning', newRound: false, back: 'settings' });
  assert.deepEqual(reduceFlow('tuning', 'done', drawer.back), { mode: 'settings', newRound: false });
});

test('M43: the bundles card opens from play, holds the game, and Close carries on', () => {
  assert.equal(reduceFlow('playing', 'bundles').mode, 'bundles');
  assert.equal(reduceFlow('bundles', 'continue').mode, 'playing');
  assert.equal(reduceFlow('bundles', 'togglePause').mode, 'playing');
  assert.equal(reduceFlow('menu', 'bundles').mode, 'menu');
});
