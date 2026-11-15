// The building tutorial (pass 4 spec 3.6, M27). Seamless, like pass 2's: it runs inside a real run,
// on Hall 1 and Plant A, one lesson at a time with one-line callouts, and hands over to the normal
// game. It teaches the build order (owner, 15 Nov), since the map no longer says it.
// While it runs the rules are scripted: no director alarms and no burn (src/core/game2.js), so a
// slow reader loses nothing. Pure apart from the rules commands it issues (raiseAlarm, setScripted).
//
// Lessons:
//   rack    - the hall has power, coolant and cooling; racks earn: build one.
//   half    - the bottom half needs its own switchboard first, then a rack.
//   trip    - a switchboard with no backup trips: half the hall goes dark; a tech goes by themselves.
//   backup  - a B switchboard is a backup: it costs upkeep, so buy backups once racks are earning.
//   grow    - a new hall: switchboard and coolant unit first, then racks; one chiller per 6 racks.
//   free    - the burn starts and grows: keep adding racks; hire from the crew bar. Then done.

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

function go(tut, state, step, callout, focus = null) {
  tut.step = step;
  tut.since = state.t;
  tut.callout = callout;
  tut.focus = focus;
}

/** Alarm ids the current lesson is about, so the screen can keep the callout clear of them. */
export const lessonAlarms4 = (tut) => tut.ids;

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
        go(tut, state, 'half', 'The bottom half needs its own switchboard first. Build Switchboard A there, then a rack.', 'msb-1-b-A');
      }
      break;
    case 'half':
      if ((started(state, 'msb-1-b-A') && anyStarted(state, BOTTOM_ROWS)) || waited > LESSON_LIMIT) {
        const alarm = raiseAlarm(state, 'breaker', 'msb-1-t-A');
        tut.ids = alarm ? [alarm.id] : [];
        go(tut, state, 'trip', 'A switchboard tripped with no backup: that half is dark and earns nothing. A tech goes on their own.', 'msb-1-t-A');
      }
      break;
    case 'trip':
      if (tut.ids.every((id) => !state.alarms.some((a) => a.id === id)) || waited > LESSON_LIMIT) {
        tut.ids = [];
        go(tut, state, 'backup', 'Switchboard B would have kept it lit. Backups cost upkeep: buy them once your racks earn.');
      }
      break;
    case 'backup':
      if (waited > READ_TIME) go(tut, state, 'grow', "For a new hall: switchboard and coolant unit first, then racks. One chiller cools a hall's racks.");
      break;
    case 'grow':
      if (waited > READ_TIME) {
        setScripted(state, false);
        go(tut, state, 'free', 'Now your cash burns, faster and faster. Keep adding racks, and hire techs from the crew bar.');
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
