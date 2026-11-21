// A scripted player for pass 2. Not part of the game: tests and tuning use it to play whole runs,
// and #auto shows it on the map. It only uses the public commands.

import { ALARMS2 as ALARMS } from './config2.js';
import { EQUIPMENT_BY_ID } from './layout2.js';
import { onCeoRoute } from './ceo.js';
import { buildMove } from './builder.js';
import { createRng } from './rng.js';
import { assign, canFix, choose, createGame, creditsRate, fixDuration, getAlarm, incomeRate, onlineRows, postTech, postsOn, results, sell, setPriority, spareChillers, step, walkSpeed, walkDistance } from './game2.js';
import { onlineHallIds } from './sites.js';

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
    // The yard (M30): an RMU fault is the worst there is; a short threatens its RMU.
    case 'rmu':
      return 0;
    case 'short':
      return left < 15 ? 0.3 : 1;
    case 'fan':
      return left < 20 ? 1 : 3;
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
    if (!canFix(alarm.type, tech.trade)) continue;
    const cost = finishTime(state, tech, alarm);
    if (cost < bestCost - 1e-9) {
      best = tech;
      bestCost = cost;
    }
  }
  return best;
}

// Send the tech who would finish soonest; false when none of them may do this job.
function sendSoonest(state, techs, alarm) {
  const tech = soonestTech(state, techs, alarm);
  return tech ? assign(state, tech.id, alarm.id).ok : false;
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
  if (idle.length > 0) return sendSoonest(state, idle, alarm);
  const movable = state.techs.filter((t) => {
    const job = t.alarmId !== null ? getAlarm(state, t.alarmId) : null;
    return job && !onRoute(job);
  });
  if (movable.length === 0) return false;
  return sendSoonest(state, movable, alarm);
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
  // The most urgent one that a free tech may do (a short waits for an electrician).
  const alarm = waiting.find((a) => idle.some((t) => canFix(a.type, t.trade)));
  return alarm ? sendSoonest(state, idle, alarm) : false;
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
export function playRun({ seed = 1, config = {}, reaction = 1, actionGap = 0.8, picks = 'first', policy = 'greedy', builder = null, buildGap = 1, seller = null, posts = false, maxCrew = 9, maxSeconds = 1800, dt = 0.05, onStep = null } = {}) {
  // builder (pass 4, building mode): a scripted builder plan from builder.js ('builder', 'greedy',
  // 'nohire'), deciding every `buildGap` seconds.
  // policy: 'greedy' (gets ready for the CEO), 'blind' (ignores the CEO), 'random', or 'none' (never
  // gives an order: with auto-dispatch on, the crew runs itself; pass 4 M23).
  // posts (pass 8 spec 3.3): post the crew along the online halls every 10 s, priority on the busiest.
  // seller (pass 7 spec 3.6): { strikes, creditShare } hands over the keys as soon as the run has that
  // many strikes, or service credits pass that share of income, and the sale is allowed.
  const state = createGame({ seed, config });
  const rng = createRng((seed * 31 + 7) >>> 0);
  const move = policy === 'none' ? () => false : policy === 'random'
    ? () => randomMove(state, rng, { reaction })
    : () => greedyMove(state, { reaction, ceo: policy !== 'blind' });
  let nextAction = 0;
  let nextBuild = 0;
  let nextPosts = 0;
  while (!state.over && state.t < maxSeconds) {
    if (state.pendingPick) choose(state, pickFor(state, picks));
    step(state, dt);
    if (state.t >= nextAction && move()) nextAction = state.t + actionGap;
    if (builder && state.t >= nextBuild) {
      buildMove(state, builder, { maxCrew });
      nextBuild = state.t + buildGap;
    }
    if (seller && !state.over && sellerWants(state, seller)) sell(state);
    if (posts && state.t >= nextPosts) {
      postCrew(state, posts !== 'nopriority');
      nextPosts = state.t + 10;
    }
    if (onStep) onStep(state);
  }
  return { ...results(state), finished: state.over, state };
}

// Pass 8 spec 3.3 (M46): a scripted player who posts its crew, spread evenly along the online halls,
// with the priority on the hall with the most rack rows online.
function postCrew(state, priority = true) {
  if (!postsOn(state)) return;
  const halls = onlineHallIds(state);
  if (halls.length === 0) return;
  const n = state.techs.length;
  state.techs.forEach((t, i) => {
    const area = `h${halls[Math.min(halls.length - 1, Math.floor(((i + 0.5) * halls.length) / n))]}`;
    if (t.post !== area) postTech(state, t.id, area);
  });
  if (!priority) return;
  const rows = (h) => onlineRows(state).filter((r) => r.hall === h).length;
  const busiest = halls.reduce((a, b) => (rows(b) > rows(a) ? b : a));
  if (state.priorityArea !== `h${busiest}`) setPriority(state, `h${busiest}`);
}

// A scripted seller's nerve (pass 7 spec 3.6).
function sellerWants(state, s) {
  if (s.strikes != null && (state.ceoStrikes ?? 0) >= s.strikes) return true;
  return s.creditShare != null && creditsRate(state) > s.creditShare * Math.max(1, incomeRate(state));
}

export { ALARMS };
