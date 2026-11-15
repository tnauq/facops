// Device introductions after the tutorial (pass 3 spec 4b.4).
import test from 'node:test';
import assert from 'node:assert/strict';
import { advance, createGame, raiseAlarm } from '../src/core/index2.js';
import { INTRO_SECONDS, INTRO_TEXT, createIntros, updateIntros } from '../src/ui/intros.js';

// Games staged by hand: no director alarms, and (pass 4 M23) no techs heading off on their own.
const quiet = () => createGame({ seed: 1, config: { autoDispatch: { enabled: false }, startHalls: 2, tutorial: false, director: { enabled: false } } });

test('the first network failure gets its callout for a few seconds, then it goes', () => {
  const s = quiet();
  const intros = createIntros();
  assert.equal(updateIntros(intros, s), '');
  const a = raiseAlarm(s, 'network', 'row-1-t-0');
  assert.equal(updateIntros(intros, s), INTRO_TEXT.network);
  assert.deepEqual(intros.ids, [a.id]);
  advance(s, INTRO_SECONDS - 0.5);
  assert.equal(updateIntros(intros, s), INTRO_TEXT.network);
  advance(s, 1);
  assert.equal(updateIntros(intros, s), '');
});

test('each device is introduced once a run; two at once come one after the other', () => {
  const s = quiet();
  const intros = createIntros();
  raiseAlarm(s, 'network', 'row-1-t-0');
  raiseAlarm(s, 'pump', 'pump-A-t');
  assert.equal(updateIntros(intros, s), INTRO_TEXT.network);
  advance(s, INTRO_SECONDS + 0.1);
  assert.equal(updateIntros(intros, s), INTRO_TEXT.pump);
  advance(s, INTRO_SECONDS + 0.1);
  raiseAlarm(s, 'network', 'row-2-b-1');
  assert.equal(updateIntros(intros, s), '');
});

test('the callouts are one line, short enough for the phone', () => {
  for (const t of Object.values(INTRO_TEXT)) assert.ok(t.length <= 110, t);
});

test('an introduction waits while the CEO is being announced', () => {
  const s = quiet();
  const intros = createIntros();
  s.ceo = { phase: 'warning' };
  raiseAlarm(s, 'pump', 'pump-A-t');
  assert.equal(updateIntros(intros, s), '');
  s.ceo = null;
  assert.equal(updateIntros(intros, s), INTRO_TEXT.pump);
});
