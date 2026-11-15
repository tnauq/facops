// Scripted builders for pass 4's checks (spec 4.1). Not part of the game: tests and tuning use them
// to play whole building runs alongside auto-dispatch. They only use the public commands.
//
// plans:
//   'builder'  each hall in turn: its minimum (top switchboard and coolant unit), the top racks, the
//              bottom switchboard and a rack, then the backups (both B switchboards and the second
//              coolant unit) before the last two racks; keeps one spare chiller; hires when swamped.
//   'greedy'   the same without ever buying a backup, and no spare chiller.
//   'nohire'   'builder' that never hires.

import { CHILLERS_ORDER, nextChillerSpot } from './builderSpots.js';
import { build, cannotBuild, hire, onlineRows, priceOf, runningChillers } from './game2.js';
import { spotState } from './sites.js';

const BACKUP = (h) => [`msb-${h}-t-B`, `msb-${h}-b-B`, `cdu-${h}-b`];

function hallPlan(h, backups) {
  const list = [`msb-${h}-t-A`, `cdu-${h}-t`, `row-${h}-t-0`, `row-${h}-t-1`, `row-${h}-t-2`, `msb-${h}-b-A`, `row-${h}-b-0`];
  if (backups) list.push(...BACKUP(h));
  list.push(`row-${h}-b-1`, `row-${h}-b-2`);
  return list;
}

const PLANS = {
  builder: { backups: true, spare: 1, hires: true },
  greedy: { backups: false, spare: 0, hires: true },
  nohire: { backups: true, spare: 1, hires: false },
};

/** The next device this plan wants, or null once the campus is done. */
export function nextWanted(state, planName = 'builder') {
  const plan = PLANS[planName];
  for (let h = 1; h <= 8; h++) {
    for (const id of hallPlan(h, plan.backups)) {
      if (spotState(state, id) !== 'empty') continue;
      // Before another rack, make sure the cooling keeps up (with the plan's spare).
      if (id.startsWith('row-')) {
        const rowsAfter = onlineRows(state).length + 1;
        const needed = Math.ceil((rowsAfter * state.config.chillersPerHall) / 6 - 1e-9);
        if (runningChillers(state) + pendingChillers(state) < needed + plan.spare) {
          const chiller = nextChillerSpot(state);
          if (chiller) return chiller;
        }
      }
      return id;
    }
  }
  return null;
}

// Chillers (and the pump they need) already being built count towards the cooling.
const pendingChillers = (state) => CHILLERS_ORDER.filter((id) => spotState(state, id) === 'building').length;

function leastTrade(state) {
  const order = state.config.hireTieOrder;
  const count = (trade) => state.techs.filter((t) => t.trade === trade).length;
  return [...order].sort((a, b) => count(a) - count(b) || order.indexOf(a) - order.indexOf(b))[0];
}

/**
 * One building decision. When every tech is busy and two or more alarms wait (and the plan hires),
 * hire, or save up to; otherwise build the next wanted device once it can be paid for. Returns true if it acted.
 */
export function buildMove(state, planName = 'builder', { maxCrew = 9 } = {}) {
  const plan = PLANS[planName];
  const idle = state.techs.filter((t) => t.state === 'idle').length;
  const waiting = state.alarms.filter((a) => a.techId === null).length;
  // Swamped: save up for a hire rather than spend on building.
  if (plan.hires && idle === 0 && waiting >= 2 && state.techs.length < maxCrew) {
    return state.cash >= priceOf(state, 'hire') ? hire(state, leastTrade(state)).ok : false;
  }
  const id = nextWanted(state, planName);
  if (id && cannotBuild(state, id) === null) return build(state, id).ok;
  return false;
}
