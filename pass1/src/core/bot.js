// A scripted player. Not part of the game: it exists so tests and tuning can play whole rounds,
// and so a later build can run an attract mode. It only uses the public commands.

import { ALARMS } from './config.js';
import { EQUIPMENT_BY_ID } from './layout.js';
import { assign, createGame, fixDuration, getTech, results, step, walkDistance } from './game.js';

function urgency(state, alarm) {
  const left = Number.isFinite(alarm.clockEnd) ? alarm.clockEnd - state.t : Infinity;
  const eq = EQUIPMENT_BY_ID[alarm.equipId];
  switch (alarm.type) {
    case 'breaker':
      if (state.hallDark[eq.hall]) return 0;
      return left < 15 ? 0.5 : 4;
    case 'chiller':
      if (state.thermal < 1 || left === Infinity) return 0;
      return left < 20 ? 0.5 : 5;
    case 'leak':
      return 1;
    case 'pump':
      return left < 14 ? 1.5 : 2.5;
    default:
      return 3;
  }
}

/**
 * One decision of a competent but not clever player: take the most urgent unassigned alarm
 * that has been on screen for at least `reaction` seconds and send the idle tech who would
 * finish it soonest. Returns true if it issued a command.
 */
export function greedyMove(state, { reaction = 1, ignoreTrades = false } = {}) {
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
    const walk = walkDistance(state, tech, alarm) / state.config.walkSpeed;
    const cost = walk + (ignoreTrades ? ALARMS[alarm.type].fixTime : fixDuration(state, alarm.type, tech.trade));
    if (cost < bestCost - 1e-9) {
      best = tech;
      bestCost = cost;
    }
  }
  return assign(state, best.id, alarm.id).ok;
}

/**
 * Play a whole round with the scripted player and return results(state).
 * `actionGap` is the shortest time between two commands; `maxSeconds` stops a round that never ends.
 */
export function playRound({ seed = 1, config = {}, reaction = 1, actionGap = 0.8, ignoreTrades = false, maxSeconds = 1800, dt = 0.05 } = {}) {
  const state = createGame({ seed, config });
  let nextAction = 0;
  while (!state.over && state.t < maxSeconds) {
    step(state, dt);
    if (state.t >= nextAction && greedyMove(state, { reaction, ignoreTrades })) nextAction = state.t + actionGap;
  }
  return { ...results(state), finished: state.over, techs: state.techs.map((t) => getTech(state, t.id).trade) };
}
