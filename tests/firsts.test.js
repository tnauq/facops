// Firsts (pass 10 spec 2, M59): the first run stops to explain each thing the first time it comes up.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, raiseAlarm, step, build } from '../src/core/index2.js';
import { FIRSTS, NOTE_SECONDS, PAUSE_GAP, closeFirst, createFirsts, firstsFromSave, firstsToSave, markFirst, updateFirsts } from '../src/ui/firsts.js';
import { createIntros, updateIntros } from '../src/ui/intros.js';

// Promises off, so their first offer (at the start) does not queue a card in tests about other things.
const game = () => {
  const s = createGame({ seed: 1, config: { tutorial: false, autoDispatch: { enabled: false }, director: { enabled: false }, ceo: { enabled: false }, building: { enabled: true } } });
  s.config.building.promises.enabled = false;
  return s;
};
// Run the game and the firsts together, pressing "Got it" on any pause card after `read` seconds.
function play(s, f, seconds, { read = 0 } = {}) {
  const seen = [];
  let openedAt = null;
  for (let i = 0; i < Math.round(seconds / 0.05); i++) {
    if (f.current) {
      if (openedAt === null) openedAt = s.t;
      if (s.t - openedAt >= read) { closeFirst(f, s); openedAt = null; }
      else { s.t += 0.05; continue; } // the game is held; only the reader's clock moves
    }
    step(s, 0.05);
    const out = updateFirsts(f, s, s.events.splice(0));
    if (out.pause && !seen.includes(out.pause.id)) seen.push(out.pause.id);
    if (out.note && !seen.includes(`note:${out.note}`)) seen.push(`note:${out.note}`);
  }
  return seen;
}

test('every first has an id, a kind, words and a trigger', () => {
  const ids = new Set();
  for (const f of FIRSTS) {
    assert.ok(!ids.has(f.id), f.id);
    ids.add(f.id);
    assert.ok(['pause', 'note'].includes(f.kind), f.id);
    assert.equal(typeof f.check, 'function');
    if (f.kind === 'pause') assert.ok(f.title, `${f.id} has a title`);
  }
  assert.ok(FIRSTS.length >= 25);
});

test('the run opens on the goal, then points at a rack spot if none is bought', () => {
  const s = game();
  const f = createFirsts();
  step(s, 0.6);
  let out = updateFirsts(f, s, s.events.splice(0));
  assert.equal(out.pause.id, 'goal');
  assert.match(out.pause.text, /48 rack rows/);
  closeFirst(f, s);
  for (let i = 0; i < 20; i++) step(s, 0.05);
  out = updateFirsts(f, s, s.events.splice(0));
  assert.equal(out.note, '');
  for (let i = 0; i < 50; i++) step(s, 0.05);
  out = updateFirsts(f, s, s.events.splice(0));
  assert.equal(out.note, 'Racks earn money. Tap a + on a rack spot.');
  assert.equal(f.note.target, 'row-1-t-2');
});

test('each first shows once; pauses are spaced, but a failure goes ahead of anything waiting', () => {
  const s = game();
  const f = createFirsts();
  step(s, 0.6);
  updateFirsts(f, s, s.events.splice(0)); // the goal
  closeFirst(f, s);
  // A failure right after: it shows at once, without waiting PAUSE_GAP.
  const a = raiseAlarm(s, 'leak', 'cdu-1-t');
  let out = updateFirsts(f, s, s.events.splice(0));
  assert.equal(out.pause.id, 'alarm-leak');
  assert.equal(out.pause.target, a.equipId);
  closeFirst(f, s);
  // Another leak is no first.
  s.alarms = [];
  raiseAlarm(s, 'leak', 'cdu-1-t');
  out = updateFirsts(f, s, s.events.splice(0));
  assert.notEqual(out.pause?.id, 'alarm-leak');
  // A non-failure pause waits out the spacing.
  s.handoverQueued = true;
  out = updateFirsts(f, s, s.events.splice(0));
  assert.equal(out.pause, null, `held back for ${PAUSE_GAP} s`);
  s.t += PAUSE_GAP;
  out = updateFirsts(f, s, []);
  assert.equal(out.pause.id, 'handover');
});

test('during a CEO warning only the CEO\'s own cards show; notes never show over a pause', () => {
  const s = game();
  const f = createFirsts();
  f.seen.add('goal');
  s.ceo = { phase: 'warning' };
  s.handoverQueued = true;
  let out = updateFirsts(f, s, [{ type: 'ceoWarning', strike: false }]);
  assert.equal(out.pause.id, 'ceo');
  assert.equal(out.note, '');
  closeFirst(f, s);
  s.t += PAUSE_GAP;
  out = updateFirsts(f, s, []);
  assert.equal(out.pause, null, 'the Handover waits for the warning to end');
  s.ceo = null;
  out = updateFirsts(f, s, []);
  assert.equal(out.pause.id, 'handover');
});

test('the screen reports a build card opening; a note lasts NOTE_SECONDS', () => {
  const s = game();
  const f = createFirsts();
  f.seen.add('goal');
  f.seen.add('racks');
  markFirst(f, 'buildCard');
  let out = updateFirsts(f, s, []);
  assert.match(out.note, /Progress pieces/);
  s.t += NOTE_SECONDS + 0.1;
  out = updateFirsts(f, s, []);
  assert.equal(out.note, '');
});

test('short-handed: more waiting failures than free techs for 10 s', () => {
  const s = game();
  const f = createFirsts();
  for (const id of ['goal', 'racks']) f.seen.add(id);
  f.lastPauseEnd = -1e9;
  for (const [type, id] of [['network', 'row-1-t-0'], ['network', 'row-1-t-1'], ['leak', 'cdu-1-t']]) raiseAlarm(s, type, id);
  for (const a of s.alarms) a.techId = null;
  for (const t of s.techs) t.state = 'fixing';
  updateFirsts(f, s, []);
  f.current = null;
  f.queue = [];
  s.t += 10.1;
  updateFirsts(f, s, []);
  assert.ok(f.seen.has('shortHanded'));
});

test('a first run plays through its firsts in the run\'s own order', () => {
  const s = createGame({ seed: 2, config: { tutorial: false, building: { enabled: true } } });
  const f = createFirsts();
  build(s, 'row-1-t-2');
  const seen = play(s, f, 240, { read: 4 });
  assert.equal(seen[0], 'goal');
  assert.ok(seen.some((x) => x.startsWith('alarm-')), 'a failure was explained');
  assert.ok(seen.includes('promise'), 'the first offer, after the goal');
});

test('saved and resumed, the firsts remember what was seen', () => {
  const f = createFirsts();
  f.seen.add('goal');
  markFirst(f, 'buildCard');
  const back = firstsFromSave(JSON.parse(JSON.stringify(firstsToSave(f))));
  assert.ok(back.seen.has('goal'));
  assert.ok(back.marks.has('buildCard'));
  assert.equal(back.lastPauseEnd, -Infinity);
});

test('with firsts, the introductions keep only the lines that report the run', () => {
  const s = game();
  const intros = createIntros({ devices: false, bundles: true, notices: true });
  s.handoverQueued = true;
  s.stats.uptime = 10;
  for (let i = 0; i < 5; i++) assert.equal(updateIntros(intros, s), '', 'no sale or uptime line');
  s.endurance = { level: 1, startedAt: 0 };
  assert.match(updateIntros(intros, s), /^Endurance/);
});
