// The hall 1 tutorial (pass 2 spec 8; design doc section 9, steps 1 to 5). Seamless: it runs inside
// a real run on hall 1, raises scripted alarms one lesson at a time, shows one-line callouts, and
// hands over to the normal game. The first Delivery ends it; there is no "tutorial complete" screen.
// Pure apart from the rules commands it issues (raiseAlarm, setScripted).
//
// Lessons:
//   assign   - a breaker trip: "tap the alarm, then a tech". One MSB of a pair down costs nothing.
//   hat      - a chiller trip: the red dot means the red hat fixes it a little faster.
//   leak     - a CDU leak: power is lost straight away.
//   choose   - a leak and a breaker at once: losing power now, or about to lose more?
//   redirect - both techs busy, then a leak: tap it, then a busy tech.
//   free     - the director takes over: keep the load green to bring hall 2 online.

import { raiseAlarm, setScripted } from '../core/index2.js';

const REDIRECT_WAIT = 8; // seconds to wait for both techs to be busy before raising the leak anyway

/** A new tutorial. `verb` is "Tap" on a touch screen, "Click" with a mouse (spec 9: prompts say which). */
export function createTutorial(verb = 'Tap') {
  // focus: equipment to bring into view when a lesson starts; the screen reads it and clears it.
  return { step: 'start', verb, ids: [], since: 0, done: false, callout: '', focus: null };
}

const alive = (state, id) => state.alarms.some((a) => a.id === id);
const allCleared = (state, ids) => ids.every((id) => !alive(state, id));
const busy = (state) => state.techs.every((t) => t.state !== 'idle');

function begin(tut, state, step, alarms, callout) {
  tut.step = step;
  tut.ids = alarms.map(([type, equip]) => raiseAlarm(state, type, equip)?.id).filter((id) => id !== undefined);
  tut.since = state.t;
  tut.callout = callout;
  tut.focus = alarms[0][1];
}

/** Alarm ids the current lesson is about, so the screen can keep the callout clear of them. */
export function lessonAlarms(tut) {
  return tut.step === 'redirect' ? [tut.leak] : tut.ids;
}

/**
 * Advance the tutorial for one frame. `events` are this frame's rules events. Returns the callout
 * to show (empty when none). Once `done`, it does nothing.
 */
export function updateTutorial(tut, state, events) {
  if (tut.done) return '';
  const v = tut.verb;
  switch (tut.step) {
    case 'start':
      setScripted(state, true);
      begin(tut, state, 'assign', [['breaker', 'msb-1-t-A']], `Alarm! ${v} the alarm, then ${v.toLowerCase()} a tech to send them.`);
      break;
    case 'assign':
      if (events.some((e) => e.type === 'assign' && tut.ids.includes(e.alarmId))) {
        tut.callout = 'One switchboard down costs nothing yet: its partner carries the load.';
      }
      if (allCleared(state, tut.ids)) {
        begin(tut, state, 'hat', [['chiller', 'chiller-A-0']], 'The red dot means the red hat fixes it a little faster. Any hat can fix anything.');
      }
      break;
    case 'hat':
      if (allCleared(state, tut.ids)) {
        begin(tut, state, 'leak', [['leak', 'cdu-1-t']], 'A leak costs power straight away. Watch the load at the top.');
      }
      break;
    case 'leak':
      if (allCleared(state, tut.ids)) {
        begin(tut, state, 'choose', [['leak', 'cdu-1-b'], ['breaker', 'msb-1-b-A']], 'Two at once. Losing power now, or about to lose more? Your call.');
      }
      break;
    case 'choose':
      if (allCleared(state, tut.ids)) {
        begin(tut, state, 'busy', [['chiller', 'chiller-A-1'], ['breaker', 'msb-1-t-B']], 'Send a tech to each alarm.');
      }
      break;
    case 'busy':
      // Once both techs are busy (or after a short wait), a leak arrives that needs a redirect.
      if (busy(state) || state.t - tut.since > REDIRECT_WAIT) {
        tut.step = 'redirect';
        tut.leak = raiseAlarm(state, 'leak', 'cdu-1-t')?.id;
        tut.focus = 'cdu-1-t';
        tut.callout = `A leak! ${v} it, then ${v.toLowerCase()} a busy tech: they drop their job, which keeps its progress for a moment.`;
      }
      break;
    case 'redirect': {
      const redirected = events.some((e) => e.type === 'redirect' && e.to === tut.leak);
      if (redirected || !alive(state, tut.leak)) {
        tut.step = 'free';
        setScripted(state, false);
        tut.callout = 'Keep the load in the green to fill the Stability meter and bring Hall 2 online.';
      }
      break;
    }
    case 'free':
      if (state.deliveries > 0 || events.some((e) => e.type === 'delivery')) {
        tut.done = true;
        tut.callout = '';
      }
      break;
    default:
      break;
  }
  return tut.callout;
}
