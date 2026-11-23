// How it works and later runs' lines (pass 10 spec 5, M62).
import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../src/core/index2.js';
import { FIRSTS } from '../src/ui/firsts.js';
import { REFERENCE_IDS, REFERENCE_KEY, loadKnown, mergeKnown, referenceEntry, referenceList, saveKnown } from '../src/ui/reference.js';
import { createIntros, updateIntros } from '../src/ui/intros.js';
import { reduceFlow } from '../src/ui/flow.js';

const game = () => createGame({ seed: 1, config: { building: { enabled: true }, director: { enabled: false }, ceo: { enabled: false } } });

test('every first has an entry in How it works, and nothing else does', () => {
  assert.deepEqual([...REFERENCE_IDS].sort(), FIRSTS.map((f) => f.id).sort());
});

test('the list shows only the firsts this device has been shown, grouped in the spec order', () => {
  assert.deepEqual(referenceList([]), []);
  const list = referenceList(['alarm-leak', 'goal', 'alarm-breaker', 'loan']);
  assert.deepEqual(list.map((g) => g.group), ['The build', 'Failures', 'Money and customers']);
  assert.deepEqual(list[1].entries, [{ id: 'alarm-breaker', title: 'Breaker trip' }, { id: 'alarm-leak', title: 'Coolant leak' }]);
  assert.equal(list[2].entries[0].title, 'The construction loan', 'a note gets a title of its own');
  assert.ok(referenceList(REFERENCE_IDS).flatMap((g) => g.entries).every((e) => e.title && e.title !== e.id), 'every entry has a readable title');
});

test("an entry opened: the first card's words, for this run's numbers, and its picture", () => {
  const s = game();
  const leak = referenceEntry('alarm-leak', s);
  assert.equal(leak.title, 'Coolant leak');
  assert.match(leak.text, /leaking/);
  assert.equal(leak.picture, 'cdu');
  assert.match(referenceEntry('contractors', s).text, new RegExp(`${s.config.building.buildTime} s`));
  assert.equal(referenceEntry('goal', s).picture, null);
  assert.equal(referenceEntry('nope', s), null);
});

test('what the device knows grows, and only with real firsts', () => {
  assert.deepEqual(mergeKnown(['goal'], ['goal', 'racks', 'made-up']), ['goal', 'racks']);
  assert.equal(mergeKnown(['goal'], ['goal']), null);
});

test('kept on the device, and fine without storage', () => {
  const box = new Map();
  const storage = { getItem: (k) => box.get(k) ?? null, setItem: (k, v) => box.set(k, v) };
  saveKnown(storage, ['goal', 'racks']);
  assert.deepEqual(loadKnown(storage), ['goal', 'racks']);
  box.set(REFERENCE_KEY, 'not json');
  assert.deepEqual(loadKnown(storage), []);
  const broken = { getItem: () => { throw new Error('no'); }, setItem: () => { throw new Error('no'); } };
  assert.deepEqual(loadKnown(broken), []);
  assert.doesNotThrow(() => saveKnown(broken, ['goal']));
  assert.deepEqual(loadKnown(null), []);
});

test('the pause menu opens How it works, and Back returns to it', () => {
  assert.equal(reduceFlow('paused', 'howto').mode, 'howto');
  assert.equal(reduceFlow('howto', 'back').mode, 'paused');
  assert.equal(reduceFlow('playing', 'howto').mode, 'playing', 'only from the pause menu');
});

// Run the introductions for a while with the state set up so that a line is due.
function lines(intros, s, seconds) {
  const out = [];
  for (let i = 0; i < seconds * 10; i++) {
    s.t += 0.1;
    const text = updateIntros(intros, s);
    if (text && !out.includes(text)) out.push(text);
  }
  return out;
}

test('a later run keeps the notices: the loan paid off and the deadline countdown', () => {
  const s = game();
  s.loanPaidAt = s.t;
  s.deadlineSaid = [300];
  const out = lines(createIntros({ devices: false, bundles: false, notices: 'later' }), s, 20);
  assert.equal(out.some((t) => /Loan paid off/.test(t)), true);
  assert.equal(out.some((t) => /five minutes/.test(t)), true);
});

test('a later run drops the explanations: the Handover, the uptime bonus, the strikes, bundles', () => {
  const s = game();
  s.handoverQueued = true;
  s.stats.uptime = 30;
  const later = lines(createIntros({ devices: false, bundles: false, notices: 'later' }), s, 30);
  assert.deepEqual(later, []);
  // Before pass 10 these all showed in every run.
  const s2 = game();
  s2.handoverQueued = true;
  s2.stats.uptime = 30;
  assert.ok(lines(createIntros({ devices: false, bundles: true }), s2, 30).length >= 2);
});
