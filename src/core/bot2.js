// A scripted player for pass 2. Not part of the game: tests and tuning use it to play whole runs,
// and #auto shows it on the map. It only uses the public commands.

import { ALARMS2 as ALARMS } from './config2.js';
import { EQUIPMENT_BY_ID } from './layout2.js';
import { onCeoRoute } from './ceo.js';
import { createRng } from './rng.js';
import { assign, choose, createGame, fixDuration, getAlarm, results, spareChillers, step, walkSpeed, walkDistance } from './game2.js';

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

// Seconds for this tech to walk to the alarm and fix it.
const finishTime = (state, tech, alarm) => walkDistance(state, tech, alarm) / walkSpeed(state) + fixDuration(state, alarm.type, tech.trade);

function soonestTech(state, techs, alarm) {
  let best = null;
  let bestCost = Infinity;
  for (const tech of techs) {
    const cost = finishTime(state, tech, alarm);
    if (cost < bestCost - 1e-9) {
      best = tech;
      bestCost = cost;
    }
  }
  return best;
}

// Getting ready for the CEO (pass 3 spec 4.5): while a visit is announced or under way, alarms on
// the route that nobody is on come first. With nobody free, pull the nearest tech off a job that is
// not on the route.
function ceoMove(state) {
  if (!state.ceo) return false;
  const onRoute = (a) => onCeoRoute(state, EQUIPMENT_BY_ID[a.equipId]);
  const waiting = state.alarms.filter((a) => a.techId === null && onRoute(a));
  if (waiting.length === 0) return false;
  const alarm = waiting.sort((a, b) => urgency(state, a) - urgency(state, b) || a.id - b.id)[0];
  const idle = state.techs.filter((t) => t.state === 'idle');
  if (idle.length > 0) return assign(state, soonestTech(state, idle, alarm).id, alarm.id).ok;
  const movable = state.techs.filter((t) => {
    const job = t.alarmId !== null ? getAlarm(state, t.alarmId) : null;
    return job && !onRoute(job);
  });
  if (movable.length === 0) return false;
  return assign(state, soonestTech(state, movable, alarm).id, alarm.id).ok;
}

/**
 * One decision: the most urgent unassigned alarm that has been up for `reaction` seconds, sent to
 * the idle tech who would finish it soonest. With `ceo` (the default) it gets ready for the CEO
 * first; `ceo: false` is the CEO-blind player. Returns true if it issued a command.
 */
export function greedyMove(state, { reaction = 1, ceo = true } = {}) {
  if (ceo && ceoMove(state)) return true;
  const idle = state.techs.filter((t) => t.state === 'idle');
  if (idle.length === 0) return false;
  const waiting = state.alarms
    .filter((a) => a.techId === null && state.t - a.born >= reaction)
    .sort((a, b) => urgency(state, a) - urgency(state, b) || a.born - b.born || a.id - b.id);
  if (waiting.length === 0) return false;
  const alarm = waiting[0];
  return assign(state, soonestTech(state, idle, alarm).id, alarm.id).ok;
}

/** A player who picks a random waiting alarm and a random free tech (for the scripted checks). */
export function randomMove(state, rng, { reaction = 1 } = {}) {
  const idle = state.techs.filter((t) => t.state === 'idle');
  const waiting = state.alarms.filter((a) => a.techId === null && state.t - a.born >= reaction);
  if (idle.length === 0 || waiting.length === 0) return false;
  return assign(state, rng.pick(idle).id, rng.pick(waiting).id).ok;
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
export function playRun({ seed = 1, config = {}, reaction = 1, actionGap = 0.8, picks = 'first', policy = 'greedy', maxSeconds = 1800, dt = 0.05, onStep = null } = {}) {
  // policy: 'greedy' (gets ready for the CEO), 'blind' (ignores the CEO) or 'random'.
  const state = createGame({ seed, config });
  const rng = createRng((seed * 31 + 7) >>> 0);
  const move = policy === 'random'
    ? () => randomMove(state, rng, { reaction })
    : () => greedyMove(state, { reaction, ceo: policy !== 'blind' });
  let nextAction = 0;
  while (!state.over && state.t < maxSeconds) {
    if (state.pendingPick) choose(state, pickFor(state, picks));
    step(state, dt);
    if (state.t >= nextAction && move()) nextAction = state.t + actionGap;
    if (onStep) onStep(state);
  }
  return { ...results(state), finished: state.over, state };
}

export { ALARMS };
