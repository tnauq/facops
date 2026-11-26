// The leaderboards (pass 10 spec 6.1, M63): GW delivered and time to full build, top ten each, on
// the device, with three initials.
import test from 'node:test';
import assert from 'node:assert/strict';
import { BOARDS_KEY, TOP, addRun, boardDate, boardRows, cleanBoards, countsForBoards, entriesFor, loadBoards, placeOn, placesFor, placesLine, saveBoards, stepLetter } from '../src/ui/boards.js';
import { reduceFlow } from '../src/ui/flow.js';

const run = (gwh, fullAt = null, extra = {}) => ({ building: true, finish: true, energyGwh: gwh, score: gwh * 1000, commissioned: fullAt !== null, commissionedAt: fullAt ?? 0, ...extra });
const clock = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const fill = (n) => {
  let b = cleanBoards(null);
  for (let i = 0; i < n; i++) b = addRun(b, entriesFor(run(i + 1, 600 + i * 10), '1 Nov'), 'ABC');
  return b;
};

test('which runs count: not the tutorial run, not the scripted player, not classic or a finish-less run', () => {
  assert.equal(countsForBoards(run(1)), true);
  assert.equal(countsForBoards(run(1), { tutorial: true }), false);
  assert.equal(countsForBoards(run(1), { auto: true }), false);
  assert.equal(countsForBoards(run(1, null, { building: false })), false);
  assert.equal(countsForBoards(run(1, null, { finish: false })), false);
});

test('a run goes on the GW board; only a full build goes on the time board', () => {
  assert.deepEqual(entriesFor(run(2.5), '26 Nov'), { gw: { gwh: 2.5, score: 2500, date: '26 Nov' }, full: null });
  assert.deepEqual(entriesFor(run(2.5, 640), '26 Nov').full, { fullAt: 640, date: '26 Nov' });
  assert.equal(entriesFor(run(0), 'x').gw, null, 'nothing delivered, no entry');
});

test('the GW board ranks most first; the time board fastest first; ties go below', () => {
  const b = fill(3); // GWh 1, 2, 3; full at 600, 610, 620
  assert.deepEqual(b.gw.map((e) => e.gwh), [3, 2, 1]);
  assert.deepEqual(b.full.map((e) => e.fullAt), [600, 610, 620]);
  assert.equal(placeOn(b.gw, 'gw', 2.5), 1);
  assert.equal(placeOn(b.gw, 'gw', 2), 2, 'a tie goes below the older entry');
  assert.equal(placeOn(b.full, 'full', 599), 0);
  assert.equal(placeOn(b.full, 'full', 610), 2);
});

test('only the top ten stay; a run that misses gets no place', () => {
  const b = fill(12);
  assert.equal(b.gw.length, TOP);
  assert.equal(b.full.length, TOP);
  assert.equal(b.gw.at(-1).gwh, 3);
  assert.deepEqual(placesFor(b, entriesFor(run(0.5, 900), 'x')), { gw: null, full: null });
  const p = placesFor(b, entriesFor(run(20, 100), 'x'));
  assert.deepEqual(p, { gw: 0, full: 0 });
  assert.equal(placesLine(p), '#1 for GW delivered · #1 for time to full build');
  assert.equal(placesLine({ gw: null, full: 4 }), '#5 for time to full build');
  assert.equal(placesLine({ gw: null, full: null }), '');
});

test('initials: three letters, wrapping, and remembered for next time', () => {
  assert.equal(stepLetter('AAA', 0, -1), 'ZAA');
  assert.equal(stepLetter('AZA', 1, 1), 'AAA');
  assert.equal(stepLetter('bad', 2, 1), 'AAB', 'anything odd starts from AAA');
  const b = addRun(cleanBoards(null), entriesFor(run(1, 700), 'x'), 'TQN');
  assert.equal(b.initials, 'TQN');
  assert.equal(b.gw[0].initials, 'TQN');
  assert.equal(b.full[0].initials, 'TQN');
});

test('the rows the card shows', () => {
  const rows = boardRows(fill(2), clock);
  assert.deepEqual(rows.gw[0], { rank: 1, initials: 'ABC', value: '2.00 GWh', detail: '$2,000', date: '1 Nov' });
  assert.deepEqual(rows.full[1], { rank: 2, initials: 'ABC', value: '10:10', detail: '', date: '1 Nov' });
  assert.equal(boardDate(new Date(2026, 10, 26)), '26 Nov');
});

test('kept on the device; anything malformed is dropped; fine without storage', () => {
  const box = new Map();
  const storage = { getItem: (k) => box.get(k) ?? null, setItem: (k, v) => box.set(k, v) };
  assert.equal(saveBoards(fill(2), storage), true);
  assert.deepEqual(loadBoards(storage), fill(2));
  box.set(BOARDS_KEY, JSON.stringify({ gw: [{ initials: 'ab', gwh: 1, date: 'x' }, { initials: 'ABC', gwh: 'no', date: 'x' }], initials: 7 }));
  assert.deepEqual(loadBoards(storage), { gw: [], full: [], initials: null });
  box.set(BOARDS_KEY, '{oops');
  assert.deepEqual(loadBoards(storage).gw, []);
  const broken = { getItem: () => { throw new Error('no'); }, setItem: () => { throw new Error('no'); } };
  assert.deepEqual(loadBoards(broken).gw, []);
  assert.equal(saveBoards(fill(1), broken), false);
  assert.equal(saveBoards(fill(1), null), false);
});

test('the flow: the menu opens the boards and Back returns; initials come before the results', () => {
  assert.equal(reduceFlow('menu', 'boards').mode, 'boards');
  assert.equal(reduceFlow('boards', 'back').mode, 'menu');
  assert.equal(reduceFlow('initials', 'over').mode, 'over');
  assert.equal(reduceFlow('initials', 'resume').mode, 'initials', 'nothing else leaves it');
});
