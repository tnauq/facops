// Scripted builders for pass 4's checks (spec 4.1). Not part of the game: tests and tuning use them
// to play whole building runs alongside auto-dispatch. They only use the public commands.
//
// plans:
//   'builder'  compute first (owner, 15 Nov): each hall's switchboards, coolant unit and racks, hall
//              after hall; once `backupsFrom` halls are online, the backups (B switchboards, second
//              coolant unit) of the halls already built come before the next hall; one spare chiller
//              from then on; hires when swamped.
//   'careful'  backups as soon as a hall has 4 racks, and a spare chiller from the start.
//   'greedy'   never a backup, never a spare chiller.
//   'nohire'   'builder' that never hires.
//   'mid', 'late'  'builder' with backups from 6 halls, or only once all 8 are online.
// Every plan keeps a reserve of `reserveSeconds` of burn, so building never makes it go broke.

import { CHILLERS_ORDER, nextChillerSpot } from './builderSpots.js';
import { build, burnRate, cannotBuild, hire, onlineRows, priceOf, runningChillers } from './game2.js';
import { spotState } from './sites.js';

const BACKUPS = (h) => [`msb-${h}-t-B`, `msb-${h}-b-B`, `cdu-${h}-b`];
const COMPUTE = (h) => [`msb-${h}-t-A`, `cdu-${h}-t`, `row-${h}-t-0`, `row-${h}-t-1`, `row-${h}-t-2`, `msb-${h}-b-A`, `row-${h}-b-0`, `row-${h}-b-1`, `row-${h}-b-2`];

const PLANS = {
  builder: { backupsFrom: 4, early: false, hires: true },
  careful: { backupsFrom: 1, early: true, hires: true },
  greedy: { backupsFrom: Infinity, early: false, hires: true },
  nohire: { backupsFrom: 4, early: false, hires: false },
  late: { backupsFrom: 8, early: false, hires: true }, // backups only once the campus is complete
  mid: { backupsFrom: 6, early: false, hires: true },
};

const empty = (state, id) => spotState(state, id) === 'empty';

// The plan's order of spots, given how many halls are online now.
function wishList(state, plan) {
  const list = [];
  for (let h = 1; h <= 8; h++) {
    if (plan.early) {
      // Careful: backups once the hall has four racks (as M24's builder did).
      const c = COMPUTE(h);
      list.push(...c.slice(0, 7), ...BACKUPS(h), ...c.slice(7));
    } else {
      // Backups for the halls already up come before the next hall, once there are enough halls.
      if (state.halls >= plan.backupsFrom) for (let k = 1; k < h; k++) list.push(...BACKUPS(k));
      list.push(...COMPUTE(h));
    }
  }
  return list;
}

/** The next device this plan wants, or null once the campus is done. */
export function nextWanted(state, planName = 'builder') {
  const plan = PLANS[planName];
  const spare = plan.early || state.halls >= plan.backupsFrom ? 1 : 0;
  for (const id of wishList(state, plan)) {
    if (!empty(state, id)) continue;
    // Before another rack, make sure the cooling keeps up (with the plan's spare).
    if (id.startsWith('row-')) {
      // Racks already being built count too, or several go up at once and outrun the cooling.
      const rows = onlineRows(state).length + pendingRows(state) + 1;
      const needed = Math.ceil((rows * state.config.building.chillersPerHall) / 6 - 1e-9);
      if (runningChillers(state) + pendingChillers(state) < needed + spare) {
        const chiller = nextChillerSpot(state);
        if (chiller) return chiller;
      }
    }
    return id;
  }
  return null;
}

// Racks being built (they will need cooling), and chillers being built (they will give it).
const pendingRows = (state) => Object.keys(state.equip).filter((id) => id.startsWith('row-') && spotState(state, id) === 'building').length;
// Chillers already being built count towards the cooling.
const pendingChillers = (state) => CHILLERS_ORDER.filter((id) => spotState(state, id) === 'building').length;

function leastTrade(state) {
  const order = state.config.hireTieOrder;
  const count = (trade) => state.techs.filter((t) => t.trade === trade).length;
  return [...order].sort((a, b) => count(a) - count(b) || order.indexOf(a) - order.indexOf(b))[0];
}

/**
 * One building decision. When every tech is busy and two or more alarms wait (and the plan hires),
 * hire, or save up to; otherwise build the next wanted device once it can be paid for with the
 * reserve left over. Returns true if it acted.
 */
export function buildMove(state, planName = 'builder', { maxCrew = 9, reserveSeconds = 3 } = {}) {
  const plan = PLANS[planName];
  const reserve = burnRate(state) * reserveSeconds;
  const afford = (price) => state.cash - price >= reserve;
  const idle = state.techs.filter((t) => t.state === 'idle').length;
  const waiting = state.alarms.filter((a) => a.techId === null).length;
  if (plan.hires && idle === 0 && waiting >= 2 && state.techs.length < maxCrew) {
    return afford(priceOf(state, 'hire')) ? hire(state, leastTrade(state)).ok : false;
  }
  const id = nextWanted(state, planName);
  if (id && cannotBuild(state, id) === null && afford(priceOf(state, id))) return build(state, id).ok;
  return false;
}
