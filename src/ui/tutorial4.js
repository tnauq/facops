// The building tutorial (pass 4 spec 3.6, M27). Seamless, like pass 2's: it runs inside a real run,
// on Hall 1 and Plant A, one lesson at a time with one-line callouts, and hands over to the normal
// game. It teaches the build order (owner, 15 Nov), since the map no longer says it.
// While it runs the rules are scripted: no director alarms and no burn (src/core/game2.js), so a
// slow reader loses nothing. Pure apart from the rules commands it issues (raiseAlarm, setScripted).
//
// Lessons:
//   rack    - the hall has power, coolant and cooling; racks earn: build one.
//   half    - the bottom half needs its own power chain first (RMU, transformer, switchboard), then a rack.
//   trip    - a switchboard with no backup trips: half the hall goes dark; a tech goes by themselves.
//   backup  - a B switchboard is a backup: it costs upkeep, so buy backups once racks are earning.
//   grow    - a new hall: switchboard and coolant unit first, then racks; one chiller per 6 racks.
//   free    - the construction loan starts (pass 5 M32): build racks fast; hire from the crew bar. Then done.

import { raiseAlarm, setScripted, spotState } from '../core/index2.js';

export const LESSON_LIMIT = 60; // a lesson nobody answers for this long moves on, so nothing stalls
export const READ_TIME = 9; // seconds a lesson with nothing to do stays up

/** A new building tutorial. `verb` is "Tap" on a touch screen, "Click" with a mouse. */
export function createTutorial4(verb = 'Tap') {
  return { building: true, step: 'start', verb, ids: [], since: 0, done: false, callout: '', focus: null };
}

const started = (state, id) => spotState(state, id) !== 'empty';
const anyStarted = (state, ids) => ids.some((id) => started(state, id));
const BOTTOM_ROWS = ['row-1-b-0', 'row-1-b-1', 'row-1-b-2'];
const BOTTOM_CHAIN = ['rmu-1-b', 'xfmr-1-b-A', 'msb-1-b-A']; // the bottom half's power chain (M29)

function go(tut, state, step, callout, focus = null) {
  tut.step = step;
  tut.since = state.t;
  tut.callout = callout;
  tut.focus = focus;
}

/** Alarm ids the current lesson is about, so the screen can keep the callout clear of them. */
export const lessonAlarms4 = (tut) => tut.ids;

/** The hand-over's callout: the construction loan's terms from config (pass 5 spec 3.2). */
export function handOverLine(state) {
  const { loan, loanRate } = state.config.building.burn;
  if (!loan || !loanRate) return 'Now your costs start. Keep adding racks, and hire techs from the crew bar.';
  const seconds = loan / loanRate;
  const span = seconds % 60 === 0 ? `${seconds / 60} minute${seconds === 60 ? '' : 's'}` : `${Math.round(seconds)} s`;
  return `Your construction loan starts now: $${loanRate} a second for ${span}. Build racks fast, and hire from the crew bar.`;
}

/** Advance one frame. Returns the callout to show ('' when none). Once `done`, it does nothing. */
export function updateTutorial4(tut, state, events) {
  if (tut.done) return '';
  const v = tut.verb;
  const waited = state.t - tut.since;
  switch (tut.step) {
    case 'start':
      setScripted(state, true);
      go(tut, state, 'rack', `Your hall has power, coolant and cooling. Racks earn money: ${v.toLowerCase()} a + on a rack spot.`, 'row-1-t-2');
      break;
    case 'rack':
      if (events.some((e) => e.type === 'buildStart' && e.equipId.startsWith('row-')) || waited > LESSON_LIMIT) {
        go(tut, state, 'half', 'The bottom half needs its own RMU, transformer and switchboard first (outside, then in), then a rack.', 'xfmr-1-b-A');
      }
      break;
    case 'half':
      if ((BOTTOM_CHAIN.every((id) => started(state, id)) && anyStarted(state, BOTTOM_ROWS)) || waited > LESSON_LIMIT) {
        const alarm = raiseAlarm(state, 'breaker', 'msb-1-t-A');
        tut.ids = alarm ? [alarm.id] : [];
        go(tut, state, 'trip', 'A switchboard tripped with no backup: that half is dark and earns nothing. A tech goes on their own.', 'msb-1-t-A');
      }
      break;
    case 'trip':
      if (tut.ids.every((id) => !state.alarms.some((a) => a.id === id)) || waited > LESSON_LIMIT) {
        tut.ids = [];
        go(tut, state, 'backup', 'Switchboard B and its transformer would have kept it lit. Backups cost upkeep: buy them later.');
      }
      break;
    case 'backup':
      if (waited > READ_TIME) go(tut, state, 'grow', 'New hall: RMU, transformer, switchboard and coolant unit, then racks. Each chiller needs a dry cooler.');
      break;
    case 'grow':
      if (waited > READ_TIME) {
        setScripted(state, false);
        go(tut, state, 'free', handOverLine(state));
      }
      break;
    case 'free':
      if (waited > READ_TIME) {
        tut.done = true;
        tut.callout = '';
      }
      break;
    default:
      break;
  }
  return tut.callout;
}
