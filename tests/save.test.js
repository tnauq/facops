// Save and resume (pass 7 spec 5, M44): a run saved and loaded plays on exactly as one never saved.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SAVE_VERSION, createGame, createRng, loadGame, results, saveGame, step } from '../src/core/index2.js';
import { buildMove } from '../src/core/builder.js';
import { greedyMove } from '../src/core/bot2.js';

test('a restored generator continues the same sequence', () => {
  const a = createRng(42);
  for (let i = 0; i < 17; i++) a.next();
  const b = createRng(0);
  b.setState(a.getState());
  for (let i = 0; i < 50; i++) assert.equal(b.next(), a.next());
  // The numbers themselves are unchanged by the new methods.
  assert.equal(createRng(1).next(), 0.6270739405881613);
});

// The same moves every second: the scripted builder and a crew that gets ready for the CEO.
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

const newGame = (seed) => createGame({ seed, config: { tutorial: false, building: { enabled: true } } });
const snapshot = (s) => JSON.stringify(saveGame(s));

for (const at of [30, 400, 700]) {
  test(`saved at ${at} s and loaded, a run plays on identically for another 5:00`, () => {
    const a = newGame(7);
    play(a, at);
    const data = JSON.parse(JSON.stringify(saveGame(a))); // through JSON, as the screen stores it
    const b = loadGame(data);
    assert.ok(b);
    a.events.length = 0;
    play(a, 300);
    play(b, 300);
    assert.deepEqual(results(b), results(a));
    assert.equal(snapshot(b), snapshot(a));
  });
}

test('Sets, generators and the clock survive; the event list is not saved', () => {
  const s = newGame(3);
  play(s, 130);
  const b = loadGame(JSON.parse(JSON.stringify(saveGame(s))));
  assert.ok(b.uptime.up instanceof Set);
  assert.ok(b.supply.dryCdus instanceof Set);
  assert.equal(b.rng.getState(), s.rng.getState());
  assert.equal(b.ceoRng.getState(), s.ceoRng.getState());
  assert.equal(b.t, s.t);
  assert.equal(b.cash, s.cash);
  assert.deepEqual(b.events, []);
});

test('a save from another version is not loaded', () => {
  const data = saveGame(newGame(1));
  assert.equal(data.version, SAVE_VERSION);
  assert.equal(loadGame({ ...data, version: 'older' }), null);
  assert.equal(loadGame(null), null);
  assert.equal(loadGame({}), null);
});

// The screen's part (spec 5).
function memoryStorage() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), m };
}

test('screen: write, read, the Resume label, restore with the lesson and the introductions', async () => {
  const { SAVE_KEY, clearSave, readSave, restoreRun, resumeLabel, writeSave } = await import('../src/ui/savedRun.js');
  const { createIntros } = await import('../src/ui/intros.js');
  const { createTutorial4 } = await import('../src/ui/tutorial4.js');
  const storage = memoryStorage();
  assert.deepEqual(readSave(storage), { status: 'none' });
  const s = newGame(5);
  play(s, 760);
  const intros = createIntros();
  intros.given.add('loan');
  const tutorial = { ...createTutorial4(), step: 'grow', done: false };
  assert.equal(writeSave(storage, { state: s, intros, tutorial, firstRun: true }), true);
  const read = readSave(storage);
  assert.equal(read.status, 'ok');
  assert.equal(resumeLabel(read.save), `Resume run · 12:40 · $${Math.round(s.cash).toLocaleString('en-US')}`);
  const back = restoreRun(read.save);
  assert.equal(back.state.t, s.t);
  assert.equal(back.tutorial.step, 'grow');
  assert.ok(back.intros.given instanceof Set && back.intros.given.has('loan'));
  assert.equal(back.firstRun, true);
  clearSave(storage);
  assert.equal(storage.m.has(SAVE_KEY), false);
});

test('screen: a save from an older version is dropped and reported once; no storage saves nothing', async () => {
  const { SAVE_KEY, readSave, writeSave } = await import('../src/ui/savedRun.js');
  const storage = memoryStorage();
  storage.setItem(SAVE_KEY, JSON.stringify({ version: 'm1', game: {} }));
  assert.deepEqual(readSave(storage), { status: 'old' });
  assert.deepEqual(readSave(storage), { status: 'none' }, 'it was removed');
  storage.setItem(SAVE_KEY, '{not json');
  assert.deepEqual(readSave(storage), { status: 'old' });
  assert.equal(writeSave(null, { state: newGame(1) }), false);
  const broken = { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('full'); }, removeItem: () => {} };
  assert.deepEqual(readSave(broken), { status: 'none' });
  assert.equal(writeSave(broken, { state: newGame(1) }), false);
});
