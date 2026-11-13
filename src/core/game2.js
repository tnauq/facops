// FacOps pass 2 rules engine. Pure logic: no DOM, no timers, no Math.random().
// The spec (docs/pass2-spec.md, sections 4 to 6) is the source of truth for every rule here.
// It keeps pass 1's shape: createGame, step, assign, dispatch, and the same events, plus
// Deliveries (halls coming online) and crew picks (choose).
//
//   const game = createGame({ seed: 7 });
//   step(game, 0.05);                   // advance by 50 ms (does nothing while a pick is waiting)
//   assign(game, 'tech-0', alarmId);    // two-tap dispatch or redirect
//   if (game.pendingPick) choose(game, 0); // take a card after a Delivery
//   const events = game.events.splice(0);

import { ALARMS2 as ALARMS, DEFAULT_CONFIG2, UPGRADES, makeConfig2 } from './config2.js';
import { createRng } from './rng.js';
import { CORRIDOR_TOP, EQUIPMENT, EQUIPMENT_BY_ID, HALLS, S_OUTER, START_POINT, hallX, route } from './layout2.js';
import { ceoStep, onCeoRoute, queueCeoVisit } from './ceo.js';

const EPS = 1e-9;
const ROWS = EQUIPMENT.filter((e) => e.type === 'row');
const CDUS = EQUIPMENT.filter((e) => e.type === 'cdu');
const MSBS = EQUIPMENT.filter((e) => e.type === 'msb');
const CHILLERS = EQUIPMENT.filter((e) => e.type === 'chiller');
const PUMPS = EQUIPMENT.filter((e) => e.type === 'pump');
const ROWS_PER_HALL = ROWS.length / Object.keys(HALLS).length;

const otherHalf = (half) => (half === 't' ? 'b' : 't');
const otherSide = (side) => (side === 'A' ? 'B' : 'A');

// ---------------------------------------------------------------- creation

function makeTech(trade, index, at) {
  return { id: `tech-${index}`, index, trade, x: at.x, y: at.y, state: 'idle', alarmId: null, path: [], leg: 0 };
}

/** Where a tech who joins with hall `hallId` appears: that hall's top outer door, on the corridor. */
export function arrivalPoint(hallId) {
  return { x: hallX(HALLS[hallId], S_OUTER), y: CORRIDOR_TOP };
}

export function createGame({ seed = 1, config = {} } = {}) {
  const cfg = makeConfig2(config);
  const equip = {};
  for (const e of EQUIPMENT) {
    const dyn = { alarmId: null };
    if (e.type === 'row') Object.assign(dyn, { netDown: false, level: 1 });
    if (e.type === 'cdu') dyn.leaking = false;
    if (e.type === 'msb') dyn.tripped = false;
    if (e.type === 'chiller') dyn.running = true;
    if (e.type === 'pump') dyn.overpressure = false;
    equip[e.id] = dyn;
  }
  const halls = Math.max(1, Math.min(cfg.maxHalls, cfg.startHalls));
  const techs = cfg.startCrew.map((trade, i) => makeTech(trade, i, START_POINT));
  // Starting with more halls also brings the automatic hires those Deliveries would have made.
  cfg.autoHires.slice(0, halls - 1).forEach((trade, k) => techs.push(makeTech(trade, techs.length, arrivalPoint(k + 2))));
  return {
    seed,
    config: cfg,
    rng: createRng(seed),
    t: 0,
    over: false,
    overReason: null,
    halls, // halls online
    deliveries: 0, // Deliveries so far in this run
    fullCampusAt: halls >= cfg.maxHalls ? 0 : null, // when the last hall came online
    build: 0, // seconds of construction toward the next hall (spec 4.6)
    phaseStart: 0, // when the current phase (number of halls) began
    pendingPick: null, // { hall, cards } while the player chooses a crew reward
    scripted: false, // true while the tutorial runs: no director alarms, meter held at tutorialCap
    upgrades: { carts: 0, tools: 0, radios: 0 },
    equip,
    thermal: 1, // campus cooling factor, 0..1
    alarms: [],
    nextAlarmId: 1,
    techs,
    meter: cfg.meter.start,
    band: 'green',
    halfDark: {}, // "<hall>-<t|b>": true while that half of the hall is dark
    director: { nextSpawn: cfg.director.firstSpawn, nextWave: cfg.director.waveEvery },
    stats: {
      energyMwh: 0,
      possibleMwh: 0,
      bandTime: { green: 0, yellow: 0, red: 0 },
      spawned: 0,
      escalationSpawns: 0,
      cleared: 0,
      clearTimeSum: 0,
      longestAlarm: 0,
      matchedFixes: 0,
      redirects: 0,
      halfDark: 0, // times half a hall went dark
      leakSpreads: 0, // a leak reached the hall's other CDU
      spreads: 0, // network failures that spread to the next row
      bursts: 0,
      secondChillers: 0,
      lowestFraction: 1,
      peakAlarms: 0,
      ceoSightings: 0,
      deliveries: [], // [{ hall, t }]
      picks: [], // [{ hall, card }]
    },
    events: [],
    // The CEO (pass 3 spec 4.1): the visit under way, visits waiting to start, the next walkthrough.
    // The CEO draws from its own seeded generator so the director's sequence is unchanged.
    ceo: null,
    ceoQueue: [],
    ceoNext: cfg.ceo.enabled && halls >= cfg.maxHalls ? { at: cfg.ceo.handoverDelay, kind: 'handover' } : null,
    ceoWalks: 0, // walkthroughs started
    ceoVisits: 0, // visits finished
    ceoRng: createRng((seed * 7919 + 104729) >>> 0),
  };
}

// ---------------------------------------------------------------- queries

export const getAlarm = (state, alarmId) => state.alarms.find((a) => a.id === alarmId) ?? null;
export const getTech = (state, techId) => state.techs.find((t) => t.id === techId) ?? null;

export const plantBOnline = (state) => state.halls >= state.config.plantBHall;

/** Is this piece of equipment part of the running campus yet? */
export function isOnline(state, e) {
  if (e.hall) return e.hall <= state.halls;
  return e.plant === 'A' || plantBOnline(state);
}

/** Both MSBs of one half of a hall are tripped: that half is dark. */
export function isHalfDark(state, hallId, half) {
  return state.equip[`msb-${hallId}-${half}-A`].tripped && state.equip[`msb-${hallId}-${half}-B`].tripped;
}

/** 'whole' | 'cracked' | 'broken' for a hall's power: the worse of its two MSB pairs. */
export function powerShield(state, hallId) {
  let worst = 'whole';
  for (const half of ['t', 'b']) {
    const a = state.equip[`msb-${hallId}-${half}-A`].tripped;
    const b = state.equip[`msb-${hallId}-${half}-B`].tripped;
    if (a && b) return 'broken';
    if (a || b) worst = 'cracked';
  }
  return worst;
}

/** Dark half-halls: a half whose MSB pair is down, or both halves of a hall shut by two leaks. */
export function darkHalves(state) {
  let n = 0;
  for (let h = 1; h <= state.halls; h++) {
    const shut = state.equip[`cdu-${h}-t`].leaking && state.equip[`cdu-${h}-b`].leaking;
    for (const half of ['t', 'b']) if (shut || isHalfDark(state, h, half)) n += 1;
  }
  return n;
}

/** 'whole' | 'cracked' | 'broken' for a hall's CDU pair. */
export function liquidShield(state, hallId) {
  const n = ['t', 'b'].filter((h) => state.equip[`cdu-${hallId}-${h}`].leaking).length;
  return n === 0 ? 'whole' : n === 1 ? 'cracked' : 'broken';
}

/** Chillers needed for the halls online (spec 4.4). */
export function chillersNeeded(state) {
  return Math.ceil(state.halls * state.config.chillersPerHall - EPS);
}

export function runningChillers(state) {
  return CHILLERS.filter((c) => isOnline(state, c) && state.equip[c.id].running).length;
}

/** Running chillers beyond those needed (negative when short). */
export const spareChillers = (state) => runningChillers(state) - chillersNeeded(state);

/** 'whole' with 2 or more spares, 'cracked' with 1 or 0, 'broken' when short. */
export function coolingShield(state) {
  const spare = spareChillers(state);
  if (spare < 0) return 'broken';
  return spare >= 2 ? 'whole' : 'cracked';
}

function rowTarget(state, row) {
  const dyn = state.equip[row.id];
  if (dyn.netDown || state.halfDark[`${row.hall}-${row.half}`]) return 0;
  const leaks = ['t', 'b'].filter((h) => state.equip[`cdu-${row.hall}-${h}`].leaking).length;
  if (leaks === 2) return 0;
  return leaks === 1 ? state.config.leakThrottle : 1;
}

export function bandOf(fraction, config = DEFAULT_CONFIG2) {
  if (fraction >= config.band.green - EPS) return 'green';
  return fraction < config.band.red - EPS ? 'red' : 'yellow';
}

/** Live load: { deliveredMw, capacityMw, fraction, band }. Capacity counts online halls only. */
export function load(state) {
  const capacityMw = state.halls * ROWS_PER_HALL * state.config.rowMw;
  let deliveredMw = 0;
  for (const row of ROWS) if (row.hall <= state.halls) deliveredMw += state.equip[row.id].level * state.thermal * state.config.rowMw;
  const fraction = capacityMw > 0 ? deliveredMw / capacityMw : 1;
  return { deliveredMw, capacityMw, fraction, band: bandOf(fraction, state.config) };
}

/** World units per second, with Carts. */
export const walkSpeed = (state) => state.config.walkSpeed * (1 + UPGRADES.carts.walkBonus * state.upgrades.carts);

/** Seconds a given trade needs for a given alarm type, with the matching hat and Better tools. */
export function fixDuration(state, alarmType, trade) {
  const def = ALARMS[alarmType];
  const hat = def.trade === trade ? 1 - state.config.tradeBonus : 1;
  return def.fixTime * hat * Math.pow(1 - UPGRADES.tools.fixBonus, state.upgrades.tools);
}

const progressHold = (state) => (state.upgrades.radios > 0 ? UPGRADES.radios.progressHold : state.config.progressHold);

/** Everything the screen needs to draw one alarm (same shape as pass 1). */
export function alarmInfo(state, alarm) {
  const def = ALARMS[alarm.type];
  const total = def.clock * state.config.clockScale;
  const left = Number.isFinite(alarm.clockEnd) ? Math.max(0, alarm.clockEnd - state.t) : Infinity;
  const tech = alarm.techId ? getTech(state, alarm.techId) : null;
  return {
    id: alarm.id,
    type: alarm.type,
    label: def.label,
    equipId: alarm.equipId,
    trade: def.trade,
    clockTotal: total,
    clockLeft: left,
    clockFraction: Number.isFinite(left) ? left / total : 0,
    attended: Boolean(tech && tech.state === 'fixing'),
    techId: alarm.techId,
    queued: alarm.queuedAt !== null,
    progress: alarm.progress,
    steps: def.steps,
    pips: Math.min(def.steps, Math.floor(alarm.progress * def.steps + EPS)),
    age: state.t - alarm.born,
  };
}

/** Active alarms, most urgent first: least clock left, then oldest. */
export function sortedAlarms(state) {
  return [...state.alarms].sort((a, b) => {
    const la = Number.isFinite(a.clockEnd) ? a.clockEnd - state.t : Infinity;
    const lb = Number.isFinite(b.clockEnd) ? b.clockEnd - state.t : Infinity;
    if (la !== lb) return la - lb;
    return a.born - b.born || a.id - b.id;
  });
}

export function walkDistance(state, tech, alarm) {
  const e = EQUIPMENT_BY_ID[alarm.equipId];
  return route({ x: tech.x, y: tech.y }, { x: e.sx, y: e.sy }).length;
}

export function nearestIdleTech(state, alarmId) {
  const alarm = getAlarm(state, alarmId);
  if (!alarm) return null;
  let best = null;
  let bestDist = Infinity;
  for (const tech of state.techs) {
    if (tech.state !== 'idle') continue;
    const d = walkDistance(state, tech, alarm);
    if (d < bestDist - EPS) {
      best = tech;
      bestDist = d;
    }
  }
  return best;
}

// ---------------------------------------------------------------- alarms

function emit(state, type, data = {}) {
  state.events.push({ t: state.t, type, ...data });
}

function spawnAlarm(state, type, equipId, cause) {
  const def = ALARMS[type];
  const dyn = state.equip[equipId];
  if (dyn.alarmId !== null) return null;
  if (type === 'network') dyn.netDown = true;
  if (type === 'leak') dyn.leaking = true;
  if (type === 'breaker') dyn.tripped = true;
  if (type === 'chiller') dyn.running = false;
  if (type === 'pump') dyn.overpressure = true;
  const alarm = {
    id: state.nextAlarmId++,
    type,
    equipId,
    born: state.t,
    clockEnd: state.t + def.clock * state.config.clockScale,
    techId: null,
    progress: 0,
    holdUntil: null,
    queuedAt: null,
    cause,
  };
  dyn.alarmId = alarm.id;
  state.alarms.push(alarm);
  if (cause === 'escalation') state.stats.escalationSpawns += 1;
  else state.stats.spawned += 1;
  state.stats.peakAlarms = Math.max(state.stats.peakAlarms, state.alarms.length);
  emit(state, 'spawn', { alarmId: alarm.id, alarmType: type, equipId, cause });
  return alarm;
}

/** Raise a specific alarm by hand (tests, the tutorial, debugging). Null if that equipment already has one. */
export function raiseAlarm(state, type, equipId) {
  if (!ALARMS[type]) throw new Error(`Unknown alarm type: ${type}`);
  const e = EQUIPMENT_BY_ID[equipId];
  if (!e || e.type !== ALARMS[type].equipment) throw new Error(`${type} alarms belong on ${ALARMS[type].equipment} equipment, not ${equipId}`);
  if (!isOnline(state, e)) throw new Error(`${equipId} is not online yet`);
  return spawnAlarm(state, type, equipId, 'script');
}

/** Equipment the director may pick for a new alarm of this type, with the mercy rules (spec 4.7). */
export function eligibleEquipment(state, type) {
  const d = state.config.director;
  if (state.halls < 2 && !d.firstHallTypes.includes(type)) return [];
  // Fairness (pass 3 spec 4.3): once the CEO has arrived, no new alarms on anything the CEO could
  // still see. During the warning alarms still come there: that is what getting ready is for.
  const shielded = (e) => state.ceo !== null && state.ceo.phase === 'visit' && onCeoRoute(state, e);
  const ok = (e) => isOnline(state, e) && state.equip[e.id].alarmId === null && !shielded(e);
  switch (type) {
    case 'network':
      return ROWS.filter((e) => ok(e) && !state.equip[e.id].netDown);
    case 'leak':
      // Mercy: never start a leak on a hall whose other CDU is already leaking.
      return CDUS.filter((e) => ok(e) && !state.equip[e.id].leaking && !state.equip[`cdu-${e.hall}-${otherHalf(e.half)}`].leaking);
    case 'breaker':
      // Mercy: never trip the second MSB of a pair.
      return MSBS.filter((e) => ok(e) && !state.equip[e.id].tripped && !state.equip[`msb-${e.hall}-${e.half}-${otherSide(e.side)}`].tripped);
    case 'chiller':
      // Mercy: only while a spare is running, so the director alone never makes cooling short.
      return spareChillers(state) >= 1 ? CHILLERS.filter((e) => ok(e) && state.equip[e.id].running) : [];
    case 'pump':
      return PUMPS.filter(ok);
    default:
      return [];
  }
}

function freeTech(tech) {
  tech.state = 'idle';
  tech.alarmId = null;
  tech.path = [];
  tech.leg = 0;
}

function removeAlarm(state, alarm) {
  state.equip[alarm.equipId].alarmId = null;
  state.alarms = state.alarms.filter((a) => a !== alarm);
  if (alarm.techId) {
    const tech = getTech(state, alarm.techId);
    if (tech && tech.alarmId === alarm.id) freeTech(tech);
  }
  const age = state.t - alarm.born;
  state.stats.longestAlarm = Math.max(state.stats.longestAlarm, age);
  return age;
}

function clearAlarm(state, alarm, tech) {
  const dyn = state.equip[alarm.equipId];
  if (alarm.type === 'network') dyn.netDown = false;
  if (alarm.type === 'leak') dyn.leaking = false;
  if (alarm.type === 'breaker') dyn.tripped = false;
  if (alarm.type === 'chiller') dyn.running = true;
  if (alarm.type === 'pump') dyn.overpressure = false;
  const age = removeAlarm(state, alarm);
  state.stats.cleared += 1;
  state.stats.clearTimeSum += age;
  if (tech && ALARMS[alarm.type].trade === tech.trade) state.stats.matchedFixes += 1;
  emit(state, 'clear', { alarmId: alarm.id, alarmType: alarm.type, equipId: alarm.equipId, techId: tech ? tech.id : null });
}

/** The CDUs a pump's loop feeds now (spec 4.5). */
export function pumpLoop(state, pumpId) {
  const p = EQUIPMENT_BY_ID[pumpId];
  const split = plantBOnline(state);
  return CDUS.filter((c) => {
    if (c.half !== p.half || c.hall > state.halls) return false;
    if (!split) return p.plant === 'A';
    return (c.hall <= 4 ? 'A' : 'B') === p.plant;
  });
}

// What happens when an alarm's clock runs out (spec 4.2, "When the clock runs out").
function escalate(state, alarm) {
  const eq = EQUIPMENT_BY_ID[alarm.equipId];
  const clock = ALARMS[alarm.type].clock * state.config.clockScale;
  switch (alarm.type) {
    case 'network': {
      const neighbours = [eq.col - 1, eq.col + 1]
        .filter((c) => c >= 0 && c <= 2)
        .map((c) => `row-${eq.hall}-${eq.half}-${c}`)
        .filter((id) => !state.equip[id].netDown && state.equip[id].alarmId === null);
      if (neighbours.length > 0) {
        const target = state.rng.pick(neighbours);
        spawnAlarm(state, 'network', target, 'escalation');
        state.stats.spreads += 1;
        emit(state, 'escalate', { alarmId: alarm.id, alarmType: 'network', equipId: alarm.equipId, effect: 'spread', target });
      }
      alarm.clockEnd = state.t + clock; // keeps spreading every clock period
      break;
    }
    case 'leak': {
      alarm.clockEnd = Infinity;
      const otherId = `cdu-${eq.hall}-${otherHalf(eq.half)}`;
      if (!state.equip[otherId].leaking && state.equip[otherId].alarmId === null) {
        spawnAlarm(state, 'leak', otherId, 'escalation');
        state.stats.leakSpreads += 1;
        emit(state, 'escalate', { alarmId: alarm.id, alarmType: 'leak', equipId: alarm.equipId, effect: 'secondCdu', target: otherId });
      }
      break;
    }
    case 'breaker': {
      alarm.clockEnd = Infinity;
      const otherId = `msb-${eq.hall}-${eq.half}-${otherSide(eq.side)}`;
      if (!state.equip[otherId].tripped && state.equip[otherId].alarmId === null) {
        spawnAlarm(state, 'breaker', otherId, 'escalation');
        emit(state, 'escalate', { alarmId: alarm.id, alarmType: 'breaker', equipId: alarm.equipId, effect: 'secondSide', target: otherId });
      }
      break;
    }
    case 'chiller': {
      alarm.clockEnd = Infinity;
      const candidates = CHILLERS.filter((c) => isOnline(state, c) && state.equip[c.id].running && state.equip[c.id].alarmId === null).map((c) => c.id);
      if (candidates.length > 0) {
        const target = state.rng.pick(candidates);
        spawnAlarm(state, 'chiller', target, 'escalation');
        state.stats.secondChillers += 1;
        emit(state, 'escalate', { alarmId: alarm.id, alarmType: 'chiller', equipId: alarm.equipId, effect: 'secondChiller', target });
      }
      break;
    }
    case 'pump': {
      // The loop bursts: leaks on that loop's CDUs, and the pump alarm ends by itself.
      const pool = pumpLoop(state, alarm.equipId).filter((c) => !state.equip[c.id].leaking && state.equip[c.id].alarmId === null).map((c) => c.id);
      const targets = [];
      while (targets.length < state.config.burstLeaks && pool.length > 0) {
        targets.push(pool.splice(Math.floor(state.rng.next() * pool.length), 1)[0]);
      }
      state.equip[alarm.equipId].overpressure = false;
      removeAlarm(state, alarm);
      for (const id of targets) spawnAlarm(state, 'leak', id, 'escalation');
      state.stats.bursts += 1;
      emit(state, 'burst', { alarmId: alarm.id, equipId: alarm.equipId, targets });
      break;
    }
    default:
      break;
  }
}

// ---------------------------------------------------------------- director

/** Seconds between director alarms with `halls` online, `sincePhase` seconds into the phase, before jitter. */
export function spawnInterval(config, halls, sincePhase) {
  const d = config.director;
  const start = d.phaseIntervals[Math.min(halls, d.phaseIntervals.length) - 1];
  const steps = Math.floor(sincePhase / d.tightenEvery + EPS);
  return Math.max(d.floor, start * Math.pow(1 - d.tighten, steps));
}

/** Largest number of active alarms at which the director still adds one. */
export function alarmCap(state) {
  const d = state.config.director;
  const growth = state.fullCampusAt === null ? 0 : Math.floor((state.t - state.fullCampusAt) / d.capGrowEvery + EPS);
  return state.techs.length + d.capExtra + growth;
}

function directorSpawnOne(state) {
  if (state.alarms.length >= alarmCap(state)) return null;
  const options = Object.values(ALARMS)
    .map((def) => ({ def, weight: def.weight, pool: eligibleEquipment(state, def.id) }))
    .filter((o) => o.pool.length > 0);
  if (options.length === 0) return null;
  const choice = state.rng.weighted(options);
  const target = state.rng.pick(choice.pool);
  return spawnAlarm(state, choice.def.id, target.id, 'director');
}

function directorStep(state) {
  const d = state.config.director;
  if (!d.enabled || state.scripted) return;
  if (state.t >= state.director.nextSpawn - EPS) {
    directorSpawnOne(state);
    const base = spawnInterval(state.config, state.halls, state.t - state.phaseStart);
    state.director.nextSpawn = state.t + base * (1 + d.jitter * state.rng.range(-1, 1));
  }
  if (d.waveEvery > 0 && state.halls >= d.waveFromHalls && state.t >= state.director.nextWave - EPS) {
    for (let i = 0; i < d.waveSize; i++) directorSpawnOne(state);
    state.director.nextWave = state.t + d.waveEvery * (1 + d.waveJitter * state.rng.range(-1, 1));
  }
}

/**
 * The tutorial (spec 8) runs the first minutes by script: while `on`, the director adds no alarms
 * and the meter stops at meter.tutorialCap so no Delivery arrives mid-lesson. Turning it off starts
 * the director a few quiet seconds later, with the phase's tightening starting then.
 */
export function setScripted(state, on) {
  state.scripted = Boolean(on);
  if (!state.scripted) {
    const d = state.config.director;
    state.phaseStart = state.t;
    state.director.nextSpawn = state.t + d.quietAfterDelivery;
    state.director.nextWave = state.t + d.waveEvery;
  }
}

// ---------------------------------------------------------------- Deliveries and crew picks

/** The three cards offered at a pick (spec 6): two Hire cards and one Upgrade, seeded. */
export function pickCards(state) {
  const order = state.config.hireTieOrder;
  const count = (trade) => state.techs.filter((t) => t.trade === trade).length;
  const trades = [...order].sort((a, b) => count(a) - count(b) || order.indexOf(a) - order.indexOf(b));
  const cards = [{ kind: 'hire', trade: trades[0] }, { kind: 'hire', trade: trades[1] }];
  const open = Object.values(UPGRADES).filter((u) => state.upgrades[u.id] < u.max);
  cards.push(open.length > 0 ? { kind: 'upgrade', upgrade: state.rng.pick(open).id } : { kind: 'hire', trade: trades[2] });
  return cards;
}

function addTech(state, trade, hallId) {
  const tech = makeTech(trade, state.techs.length, arrivalPoint(hallId));
  state.techs.push(tech);
  emit(state, 'hire', { techId: tech.id, trade, hall: hallId });
  return tech;
}

/** Share of the next hall built, 0 to 1 (1 once every hall is online). */
export function buildProgress(state) {
  if (state.halls >= state.config.maxHalls) return 1;
  return Math.min(1, state.build / state.config.build.every);
}

// Construction finished: the next hall comes online (spec 4.6). The meter keeps its value: it is the
// survival buffer, not the progress bar.
function deliver(state) {
  const cfg = state.config;
  state.halls += 1;
  state.deliveries += 1;
  state.build = 0;
  // The new phase keeps a share of the tightening already earned (pass 3 spec 4.4).
  state.phaseStart = state.t - cfg.director.carryOver * (state.t - state.phaseStart);
  state.director.nextSpawn = state.t + cfg.director.quietAfterDelivery;
  state.director.nextWave = state.t + cfg.director.waveEvery;
  const hall = state.halls;
  const plantB = hall === cfg.plantBHall;
  state.stats.deliveries.push({ hall, t: state.t });
  emit(state, 'delivery', { hall, plantB });
  if (hall >= cfg.maxHalls && state.fullCampusAt === null) {
    state.fullCampusAt = state.t;
    emit(state, 'fullCampus', {});
  }
  const auto = cfg.autoHires[state.deliveries - 1];
  if (auto) addTech(state, auto, hall);
  else state.pendingPick = { hall, cards: pickCards(state) };
  queueCeoVisit(state, hall);
}

/**
 * Take card `index` of the waiting pick. A Hire card adds a tech at the new hall's door; an Upgrade
 * card applies at once. Returns { ok } or { ok: false, reason }.
 */
export function choose(state, index) {
  const pick = state.pendingPick;
  if (!pick) return { ok: false, reason: 'no pick waiting' };
  const card = pick.cards[index];
  if (!card) return { ok: false, reason: 'no such card' };
  if (card.kind === 'hire') addTech(state, card.trade, pick.hall);
  else {
    state.upgrades[card.upgrade] += 1;
    emit(state, 'upgrade', { upgrade: card.upgrade, level: state.upgrades[card.upgrade] });
  }
  state.stats.picks.push({ hall: pick.hall, card });
  state.pendingPick = null;
  return { ok: true };
}

// ---------------------------------------------------------------- commands

/** Two-tap dispatch and redirect, as in pass 1. Returns { ok } or { ok: false, reason }. */
export function assign(state, techId, alarmId) {
  if (state.over) return { ok: false, reason: 'over' };
  const tech = getTech(state, techId);
  const alarm = getAlarm(state, alarmId);
  if (!tech) return { ok: false, reason: 'no such tech' };
  if (!alarm) return { ok: false, reason: 'no such alarm' };
  if (tech.alarmId === alarm.id) return { ok: true, unchanged: true };
  if (tech.alarmId !== null) {
    const old = getAlarm(state, tech.alarmId);
    if (old) {
      old.techId = null;
      old.holdUntil = state.t + progressHold(state);
    }
    state.stats.redirects += 1;
    emit(state, 'redirect', { techId: tech.id, from: tech.alarmId, to: alarm.id });
  }
  if (alarm.techId !== null) {
    const previous = getTech(state, alarm.techId);
    if (previous) freeTech(previous);
  }
  alarm.techId = tech.id;
  alarm.holdUntil = null;
  alarm.queuedAt = null;
  const eq = EQUIPMENT_BY_ID[alarm.equipId];
  const r = route({ x: tech.x, y: tech.y }, { x: eq.sx, y: eq.sy });
  tech.alarmId = alarm.id;
  tech.path = r.points;
  tech.leg = 1;
  tech.state = r.length < EPS ? 'fixing' : 'walking';
  emit(state, 'assign', { techId: tech.id, alarmId: alarm.id });
  return { ok: true };
}

/** One-tap dispatch, as in pass 1. */
export function dispatch(state, alarmId) {
  if (state.over) return { ok: false, reason: 'over' };
  const alarm = getAlarm(state, alarmId);
  if (!alarm) return { ok: false, reason: 'no such alarm' };
  if (alarm.techId !== null) return { ok: false, reason: 'already assigned' };
  const tech = nearestIdleTech(state, alarmId);
  if (tech) {
    assign(state, tech.id, alarmId);
    return { ok: true, techId: tech.id };
  }
  if (state.config.oneTap) {
    if (alarm.queuedAt === null) alarm.queuedAt = state.t;
    return { ok: true, queued: true };
  }
  return { ok: false, reason: 'nobody free' };
}

function serviceQueue(state) {
  if (!state.config.oneTap) return;
  for (;;) {
    const waiting = state.alarms.filter((a) => a.queuedAt !== null && a.techId === null).sort((a, b) => a.queuedAt - b.queuedAt || a.id - b.id);
    if (waiting.length === 0) return;
    const tech = nearestIdleTech(state, waiting[0].id);
    if (!tech) return;
    assign(state, tech.id, waiting[0].id);
  }
}

// ---------------------------------------------------------------- the tick

function moveTech(state, tech, dt) {
  let budget = walkSpeed(state) * dt;
  while (budget > EPS && tech.leg < tech.path.length) {
    const target = tech.path[tech.leg];
    const dx = target.x - tech.x;
    const dy = target.y - tech.y;
    const dist = Math.abs(dx) + Math.abs(dy);
    if (dist <= budget + EPS) {
      tech.x = target.x;
      tech.y = target.y;
      tech.leg += 1;
      budget -= dist;
    } else {
      tech.x += Math.sign(dx) * Math.min(Math.abs(dx), budget);
      tech.y += Math.sign(dy) * Math.min(Math.abs(dy), budget);
      budget = 0;
    }
  }
  if (tech.leg >= tech.path.length) tech.state = 'fixing';
}

/** Advance the rules by dt seconds. Does nothing once the run is over or while a pick is waiting. */
export function step(state, dt) {
  if (state.over || state.pendingPick || !(dt > 0)) return state;
  state.t += dt;
  directorStep(state);

  for (const alarm of [...state.alarms]) {
    const tech = alarm.techId ? getTech(state, alarm.techId) : null;
    const attended = Boolean(tech && tech.state === 'fixing');
    if (attended) {
      if (Number.isFinite(alarm.clockEnd)) alarm.clockEnd += dt;
    } else if (state.t >= alarm.clockEnd - EPS) {
      escalate(state, alarm);
    }
    if (alarm.techId === null && alarm.holdUntil !== null && state.t >= alarm.holdUntil - EPS) {
      alarm.progress = 0;
      alarm.holdUntil = null;
    }
  }

  // Cooling drifts toward running ÷ needed, at most 1.
  const target = Math.min(1, runningChillers(state) / chillersNeeded(state));
  const drift = state.config.thermalRate * dt;
  if (state.thermal < target) state.thermal = Math.min(target, state.thermal + drift);
  else if (state.thermal > target) state.thermal = Math.max(target, state.thermal - drift);

  for (const tech of state.techs) {
    if (tech.state === 'walking') moveTech(state, tech, dt);
    else if (tech.state === 'fixing') {
      const alarm = getAlarm(state, tech.alarmId);
      if (!alarm) {
        freeTech(tech);
        continue;
      }
      alarm.progress += dt / fixDuration(state, alarm.type, tech.trade);
      if (alarm.progress >= 1 - EPS) clearAlarm(state, alarm, tech);
    }
  }
  serviceQueue(state);

  // Halves of halls going dark or coming back.
  for (let h = 1; h <= state.halls; h++) {
    for (const half of ['t', 'b']) {
      const key = `${h}-${half}`;
      const dark = isHalfDark(state, h, half);
      if (dark !== Boolean(state.halfDark[key])) {
        state.halfDark[key] = dark;
        if (dark) state.stats.halfDark += 1;
        emit(state, dark ? 'halfDark' : 'halfRestored', { hall: h, half });
      }
    }
  }

  for (const row of ROWS) {
    if (row.hall > state.halls) continue;
    const dyn = state.equip[row.id];
    const want = rowTarget(state, row);
    dyn.level = dyn.level > want ? want : Math.min(want, dyn.level + dt / state.config.recoverTime);
  }

  const now = load(state);
  if (now.band !== state.band) {
    emit(state, 'band', { from: state.band, to: now.band });
    state.band = now.band;
  }
  const m = state.config.meter;
  // A dark half-hall (or a hall shut by leaks, both halves) stops the fill and drains the meter
  // whatever the band, so big failures hurt at any campus size (pass 3 spec 4.4).
  const dark = darkHalves(state);
  if (now.band === 'green' && dark === 0) state.meter = Math.min(m.max, state.meter + m.fill * dt);
  else if (now.band === 'yellow') state.meter -= m.yellowDrain * dt;
  else if (now.band === 'red') state.meter -= m.redDrain * dt;
  state.meter -= m.darkDrain * dark * dt;
  // The run cannot be lost before the first Delivery, while a hall is still to be built (pass 3
  // spec 1.1: with every hall online from the start no Delivery comes, and the run must still end).
  if (state.deliveries === 0 && state.halls < state.config.maxHalls) state.meter = Math.max(m.safeFloor, state.meter);
  if (state.scripted) state.meter = Math.min(m.tutorialCap, state.meter);

  const hours = (dt * state.config.timeScale) / 3600;
  state.stats.energyMwh += now.deliveredMw * hours;
  state.stats.possibleMwh += now.capacityMw * hours;
  state.stats.bandTime[now.band] += dt;
  state.stats.lowestFraction = Math.min(state.stats.lowestFraction, now.fraction);

  // Construction: the next hall comes on a timer, faster while the load is green. It waits while
  // the tutorial runs, so no hall arrives mid-lesson.
  if (!state.scripted && state.halls < state.config.maxHalls) {
    const b = state.config.build;
    state.build += dt * (now.band === 'green' ? b.greenBoost : 1);
    if (state.build >= b.every - EPS) deliver(state);
  }

  ceoStep(state, dt);

  if (!state.over && state.meter <= EPS) {
    state.meter = 0;
    state.over = true;
    state.overReason = 'stability';
    emit(state, 'over', { reason: 'stability' });
  }
  return state;
}

/** Advance by `seconds` in fixed ticks; stops early if a pick is waiting or the run ends. */
export function advance(state, seconds, dt = 0.05) {
  const ticks = Math.round(seconds / dt);
  for (let i = 0; i < ticks && !state.over && !state.pendingPick; i++) step(state, dt);
  return state;
}

// ---------------------------------------------------------------- results

function changedTuning(config) {
  const out = [];
  const walk = (now, base, prefix) => {
    for (const key of Object.keys(base)) {
      const a = now[key];
      const b = base[key];
      if (b && typeof b === 'object' && !Array.isArray(b)) walk(a ?? {}, b, `${prefix}${key}.`);
      else if (JSON.stringify(a) !== JSON.stringify(b)) out.push(`${prefix}${key}=${JSON.stringify(a)}`);
    }
  };
  walk(config, DEFAULT_CONFIG2, '');
  return out;
}

const cardText = (c) => (c.kind === 'hire' ? `hire ${c.trade}` : c.upgrade);

/** Numbers for the results screen. */
export function results(state) {
  const s = state.stats;
  const total = s.bandTime.green + s.bandTime.yellow + s.bandTime.red;
  const share = (v) => (total > 0 ? v / total : 0);
  return {
    seed: state.seed,
    mode: state.config.oneTap ? 'one-tap' : 'two-tap',
    seconds: state.t,
    energyGwh: s.energyMwh / 1000,
    shareOfPossible: s.possibleMwh > 0 ? s.energyMwh / s.possibleMwh : 0,
    green: share(s.bandTime.green),
    yellow: share(s.bandTime.yellow),
    red: share(s.bandTime.red),
    raised: s.spawned + s.escalationSpawns,
    cleared: s.cleared,
    averageClear: s.cleared > 0 ? s.clearTimeSum / s.cleared : 0,
    longestAlarm: s.longestAlarm,
    matchedShare: s.cleared > 0 ? s.matchedFixes / s.cleared : 0,
    redirects: s.redirects,
    halfDark: s.halfDark,
    leakSpreads: s.leakSpreads,
    spreads: s.spreads,
    bursts: s.bursts,
    secondChillers: s.secondChillers,
    lowestFraction: s.lowestFraction,
    peakAlarms: s.peakAlarms,
    halls: state.halls,
    fullCampus: state.fullCampusAt !== null,
    ceoVisits: state.ceoVisits,
    ceoSightings: s.ceoSightings,
    firedByCeo: state.overReason === 'ceo',
    deliveries: s.deliveries.map((d) => ({ ...d })),
    crew: state.techs.map((t) => t.trade),
    picks: s.picks.map((p) => ({ hall: p.hall, card: cardText(p.card) })),
    tuning: changedTuning(state.config),
  };
}

export function formatClock(seconds) {
  const whole = Math.floor(seconds + 1e-6);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}
const pct = (v) => `${Math.round(v * 100)}%`;

/** Plain text for the Copy button. */
export function resultsText(state) {
  const r = results(state);
  const count = (list) => Object.entries(list.reduce((m, x) => ({ ...m, [x]: (m[x] ?? 0) + 1 }), {})).map(([k, n]) => `${n} ${k}`).join(', ');
  return [
    'FacOps pass 3 results',
    `Mode: ${r.mode} | Seed: ${r.seed}`,
    `Survived: ${formatClock(r.seconds)} | Halls: ${r.halls} of ${state.config.maxHalls}${r.fullCampus ? ' | Full campus' : ''}`,
    `Delivered: ${r.energyGwh.toFixed(2)} GWh (${pct(r.shareOfPossible)} of possible)`,
    `CEO: ${r.ceoVisits} visits survived, ${r.ceoSightings} unattended alarms seen${r.firedByCeo ? ' | Fired by the CEO' : ''}`,
    `Deliveries: ${r.deliveries.length > 0 ? r.deliveries.map((d) => `H${d.hall} ${formatClock(d.t)}`).join(', ') : 'none'}`,
    `Crew: ${count(r.crew)} | Picks: ${r.picks.length > 0 ? r.picks.map((p) => `H${p.hall} ${p.card}`).join(', ') : 'none'}`,
    `Time in green / yellow / red: ${pct(r.green)} / ${pct(r.yellow)} / ${pct(r.red)}`,
    `Alarms: ${r.raised} raised, ${r.cleared} cleared, average ${r.averageClear.toFixed(1)} s to clear, longest ${Math.round(r.longestAlarm)} s, peak ${r.peakAlarms} at once`,
    `Escalations: ${r.halfDark} half-halls dark, ${r.leakSpreads} leaks spread, ${r.spreads} network spreads, ${r.bursts} pump bursts, ${r.secondChillers} second chillers`,
    `Redirects: ${r.redirects} | Matching-hat fixes: ${pct(r.matchedShare)} | Lowest load: ${pct(r.lowestFraction)}`,
    `Tuning: ${r.tuning.length > 0 ? r.tuning.join(', ') : 'defaults'}`,
  ].join('\n');
}
