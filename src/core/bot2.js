// A scripted player for pass 2. Not part of the game: tests and tuning use it to play whole runs,
// and #auto shows it on the map. It only uses the public commands.

import { ALARMS2 as ALARMS } from './config2.js';
import { EQUIPMENT_BY_ID } from './layout2.js';
import { assign, choose, createGame, fixDuration, results, spareChillers, step, walkSpeed, walkDistance } from './game2.js';

const otherHalf = (half) => (half === 't' ? 'b' : 't');
const otherSide = (side) => (side === 'A' ? 'B' : 'A');

// Lower is more urgent. A competent player: real losses and nearly-out backups first, then
// first failures with plenty of redundancy left.
function urgency(state, alarm) {
  const left = Number.isFinite(alarm.clockEnd) ? alarm.clockEnd - state.t : Infinity;
  const eq = EQUIPMENT_BY_ID[alarm.equipId];
  switch (alarm.type) {
    case 'breaker': {
      const partner = state.equip[`msb-${eq.hall}-${eq.half}-${otherSide(eq.side)}`].tripped;
      if (partner) return 0; // half the hall is dark: fix either side
      return left < 15 ? 0.5 : 4;
    }
    case 'leak': {
      const both = state.equip[`cdu-${eq.hall}-${otherHalf(eq.half)}`].leaking;
      if (both) return 0;
      return left < 12 ? 0.8 : 2;
    }
    case 'chiller':
      if (spareChillers(state) < 0) return 0.2;
      return spareChillers(state) === 0 || left < 20 ? 1 : 5;
    case 'pump':
      return left < 12 ? 1 : 2.5;
    default:
      return 1.5; // a network failure is losing power now
  }
}

/**
 * One decision: the most urgent unassigned alarm that has been up for `reaction` seconds, sent to
 * the idle tech who would finish it soonest. Returns true if it issued a command.
 */
export function greedyMove(state, { reaction = 1 } = {}) {
  const idle = state.techs.filter((t) => t.state === 'idle');
  if (idle.length === 0) return false;
  const waiting = state.alarms
    .filter((a) => a.techId === null && state.t - a.born >= reaction)
    .sort((a, b) => urgency(state, a) - urgency(state, b) || a.born - b.born || a.id - b.id);
  if (waiting.length === 0) return false;
  const alarm = waiting[0];
  let best = null;
  let bestCost = Infinity;
  for (const tech of idle) {
    const cost = walkDistance(state, tech, alarm) / walkSpeed(state) + fixDuration(state, alarm.type, tech.trade);
    if (cost < bestCost - 1e-9) {
      best = tech;
      bestCost = cost;
    }
  }
  return assign(state, best.id, alarm.id).ok;
}

/** Which card the scripted player takes: 'first' (the #auto default), 'hire' or 'upgrade'. */
export function pickFor(state, policy = 'first') {
  const cards = state.pendingPick.cards;
  if (policy === 'upgrade') {
    const i = cards.findIndex((c) => c.kind === 'upgrade');
    return i >= 0 ? i : 0;
  }
  return 0; // the first card is always a Hire
}

/**
 * Play a whole run and return results(state) plus the final state.
 * `actionGap` is the shortest time between two commands; `maxSeconds` stops a run that never ends.
 */
export function playRun({ seed = 1, config = {}, reaction = 1, actionGap = 0.8, picks = 'first', maxSeconds = 1800, dt = 0.05 } = {}) {
  const state = createGame({ seed, config });
  let nextAction = 0;
  while (!state.over && state.t < maxSeconds) {
    if (state.pendingPick) choose(state, pickFor(state, picks));
    step(state, dt);
    if (state.t >= nextAction && greedyMove(state, { reaction })) nextAction = state.t + actionGap;
  }
  return { ...results(state), finished: state.over, state };
}

export { ALARMS };
