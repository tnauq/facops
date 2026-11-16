// What each alarm costs right now (pass 3 spec 2.1), and the triage order (2.2). Pure. Moved into
// the rules in M23, because techs who pick their own jobs (pass 4 spec 2.6) use the same order.
//
// Cost now = the MW that would come back if this alarm alone were fixed this instant. It is worked
// out from the rules engine's public state and config (row health, the MSB pairs, the CDU pair,
// the cooling target), not from the rows' current levels, which recover over 3 s: a ticket shows
// what the fault is costing, not where the recovery has got to. Tests check it against the engine.

import { EQUIPMENT, EQUIPMENT_BY_ID } from './layout2.js';
import { chillersNeeded, isOnline, runningChillers } from './game2.js';
import { isBuilt, msbFed } from './sites.js';
import { supply } from './supply.js';

const ROWS = EQUIPMENT.filter((e) => e.type === 'row');

// A row's level with its hall's faults, as the rules set it (pass 2 spec 4.1; pass 4 spec 2.4 for
// halls without backups), with one change applied: `fix` is the id of a device treated as healthy.
// Pass 6 (M39): `sup` is the pumps' supply to judge by (this step's, or a what-if): a CDU without
// glycol does not count, and a hall without water runs at noWaterFactor.
function rowLevel(state, row, fix, sup = state.supply) {
  const ok = (id) => id === fix;
  const netDown = state.equip[row.id].netDown && !ok(row.id);
  const msbs = ['A', 'B'].map((side) => `msb-${row.hall}-${row.half}-${side}`).filter((id) => isBuilt(state, id));
  // This row is built, so its half has racks. A switchboard without its transformer and RMU is down.
  const dark = msbs.every((id) => (state.equip[id].tripped && !ok(id)) || !msbFed(state, id));
  if (netDown || dark) return 0;
  const built = ['t', 'b'].map((h) => `cdu-${row.hall}-${h}`).filter((id) => isBuilt(state, id));
  const cdus = sup ? built.filter((id) => !sup.dryCdus.has(id)) : built;
  if (cdus.length === 0 && built.length > 0) return 0; // every CDU dry: the hall is shut
  const water = sup && sup.dryHalls.has(row.hall) ? state.config.building.pumps.noWaterFactor : 1;
  const leaking = cdus.filter((id) => state.equip[id].leaking && !ok(id));
  if (leaking.length === 0) return water;
  const shut = leaking.length === cdus.length && (cdus.length >= 2 || leaking.some((id) => state.equip[id].shut));
  return shut ? 0 : state.config.leakThrottle * water;
}

// Sum of row levels across one hall (the only hall a non-cooling alarm can affect).
function hallLevels(state, hall, fix) {
  let sum = 0;
  for (const row of ROWS) if (row.hall === hall && isOnline(state, row)) sum += rowLevel(state, row, fix);
  return sum;
}

// Sum of row levels across every online hall.
function campusLevels(state, sup = state.supply) {
  let sum = 0;
  for (const row of ROWS) if (isOnline(state, row)) sum += rowLevel(state, row, null, sup);
  return sum;
}

// Pass 6 (M39): what a stopped pump costs. Measured with this step's supply and cooling, then with
// the pump running again (a what-if: nothing in the state changes).
function pumpCost(state, alarm) {
  const target = (chillers) => Math.min(1, chillers / Math.max(1, chillersNeeded(state)));
  const before = campusLevels(state) * target(runningChillers(state));
  const fix = { fix: alarm.equipId };
  const after = campusLevels(state, supply(state, fix)) * target(runningChillers(state, fix));
  return Math.max(0, Math.round((after - before) * state.config.rowMw + 1e-9));
}

const coolingTarget = (state, extra) => Math.min(1, (runningChillers(state) + extra) / Math.max(1, chillersNeeded(state)));

// The yard's faults (M30) and the flag each sets on its device.
const YARD_FLAG = { short: 'shorted', rmu: 'faulted', fan: 'stopped' };

// What fixing a yard fault gives back: measured with the fault in place and with it cleared for a
// moment (the flag is put back at once, so the state is unchanged). A short or RMU fault can only
// cost its own hall; a fan failure works through the cooling, campus-wide.
function yardCost(state, alarm) {
  const e = EQUIPMENT_BY_ID[alarm.equipId];
  const mw = state.config.rowMw;
  const dyn = state.equip[alarm.equipId];
  const flag = YARD_FLAG[alarm.type];
  const measure = () => (alarm.type === 'fan'
    ? campusLevels(state) * mw * coolingTarget(state, 0)
    : hallLevels(state, e.hall, null) * mw * state.thermal);
  const before = measure();
  dyn[flag] = false;
  const after = measure();
  dyn[flag] = true;
  return Math.max(0, Math.round(after - before + 1e-9));
}

/** MW this alarm is costing now, rounded to whole MW (0 when it costs nothing yet). */
export function alarmCost(state, alarm) {
  if (YARD_FLAG[alarm.type]) return yardCost(state, alarm);
  if (alarm.type === 'pump' && state.supply && state.supply.glycol) return pumpCost(state, alarm); // building mode
  const e = EQUIPMENT_BY_ID[alarm.equipId];
  const mw = state.config.rowMw;
  let gain = 0;
  if (alarm.type === 'chiller') {
    // One more running chiller raises the cooling target for every live row.
    gain = campusLevels(state) * mw * (coolingTarget(state, 1) - coolingTarget(state, 0));
  } else if (alarm.type !== 'pump' && e.hall) {
    const now = hallLevels(state, e.hall, null);
    const fixed = hallLevels(state, e.hall, alarm.equipId);
    gain = (fixed - now) * mw * state.thermal;
  }
  return Math.max(0, Math.round(gain + 1e-9));
}

function clockLeft(state, alarm) {
  return Number.isFinite(alarm.clockEnd) ? alarm.clockEnd - state.t : Infinity;
}

/**
 * The rail's order (spec 2.2): alarms that cost something first, biggest first; then the rest by
 * clock, least time left first; then oldest. Returns [{ alarm, cost }].
 */
export function triageOrder(state) {
  return state.alarms
    .map((alarm) => ({ alarm, cost: alarmCost(state, alarm) }))
    .sort((a, b) => {
      if (a.cost !== b.cost) return b.cost - a.cost;
      const la = clockLeft(state, a.alarm);
      const lb = clockLeft(state, b.alarm);
      if (la !== lb) return la - lb;
      return a.alarm.born - b.alarm.born || a.alarm.id - b.alarm.id;
    });
}
