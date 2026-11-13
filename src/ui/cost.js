// What each alarm costs right now (pass 3 spec 2.1), and the rail's triage order (2.2). Pure.
//
// Cost now = the MW that would come back if this alarm alone were fixed this instant. It is worked
// out from the rules engine's public state and config (row health, the MSB pairs, the CDU pair,
// the cooling target), not from the rows' current levels, which recover over 3 s: a ticket shows
// what the fault is costing, not where the recovery has got to. Tests check it against the engine.

import { EQUIPMENT, EQUIPMENT_BY_ID, chillersNeeded, runningChillers } from '../core/index2.js';

const ROWS = EQUIPMENT.filter((e) => e.type === 'row');

// A row's level with its hall's faults, as the rules set it (pass 2 spec 4.1), with one change
// applied: `fix` is the id of a piece of equipment treated as healthy.
function rowLevel(state, row, fix) {
  const ok = (id) => id === fix;
  const netDown = state.equip[row.id].netDown && !ok(row.id);
  const tripped = (side) => state.equip[`msb-${row.hall}-${row.half}-${side}`].tripped && !ok(`msb-${row.hall}-${row.half}-${side}`);
  const dark = tripped('A') && tripped('B');
  if (netDown || dark) return 0;
  const leaks = ['t', 'b'].filter((h) => state.equip[`cdu-${row.hall}-${h}`].leaking && !ok(`cdu-${row.hall}-${h}`)).length;
  if (leaks === 2) return 0;
  return leaks === 1 ? state.config.leakThrottle : 1;
}

// Sum of row levels across one hall (the only hall a non-cooling alarm can affect).
function hallLevels(state, hall, fix) {
  let sum = 0;
  for (const row of ROWS) if (row.hall === hall) sum += rowLevel(state, row, fix);
  return sum;
}

// Sum of row levels across every online hall.
function campusLevels(state) {
  let sum = 0;
  for (const row of ROWS) if (row.hall <= state.halls) sum += rowLevel(state, row, null);
  return sum;
}

const coolingTarget = (state, extra) => Math.min(1, (runningChillers(state) + extra) / Math.max(1, chillersNeeded(state)));

/** MW this alarm is costing now, rounded to whole MW (0 when it costs nothing yet). */
export function alarmCost(state, alarm) {
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
