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

import { ALARMS2 as ALARMS, DEFAULT_CONFIG2, UPGRADES, YARD_ALARMS, makeConfig2 } from './config2.js';
import { createRng } from './rng.js';
import { CORRIDOR_TOP, EQUIPMENT, EQUIPMENT_BY_ID, HALLS, S_OUTER, START_POINT, hallX, route } from './layout2.js';
import { ceoStep, onCeoRoute, queueCeo, queueCeoVisit, strikesToFire } from './ceo.js';
import { autoDispatch } from './auto.js';
import { alarmCost } from './cost.js';
import { runningPumps, supply } from './supply.js';
import { HALL_IDS, buildingOn, builtCdus, builtMsbs, dryCapacity, hallOnline, isBuilt, msbFed, onlineHallIds, plantHasPump, refreshSites } from './sites.js';

const EPS = 1e-9;
const ROWS = EQUIPMENT.filter((e) => e.type === 'row');
const CDUS = EQUIPMENT.filter((e) => e.type === 'cdu');
const MSBS = EQUIPMENT.filter((e) => e.type === 'msb');
const CHILLERS = EQUIPMENT.filter((e) => e.type === 'chiller');
const PUMPS = EQUIPMENT.filter((e) => e.type === 'pump');
const XFMRS = EQUIPMENT.filter((e) => e.type === 'xfmr');
const RMU_LIST = EQUIPMENT.filter((e) => e.type === 'rmu');
const DRY_UNITS = EQUIPMENT.filter((e) => e.type === 'dry');
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
    if (e.type === 'cdu') dyn.shut = false; // building mode: a lone CDU's leak ran out of clock (2.4)
    if (cfg.building.enabled) {
      dyn.built = cfg.building.start.includes(e.id);
      dyn.buildEnd = null; // while a contractor builds it: when it will be done
    }
    equip[e.id] = dyn;
  }
  const building = cfg.building.enabled;
  const halls = building ? 0 : Math.max(1, Math.min(cfg.maxHalls, cfg.startHalls));
  const techs = cfg.startCrew.map((trade, i) => makeTech(trade, i, START_POINT));
  // Starting with more halls also brings the automatic hires those Deliveries would have made.
  // In building mode the crew is bought instead (pass 4 spec 2.6).
  if (!building) cfg.autoHires.slice(0, halls - 1).forEach((trade, k) => techs.push(makeTech(trade, techs.length, arrivalPoint(k + 2))));
  const state = {
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
    director: { nextSpawn: cfg.building.enabled ? cfg.building.firstSpawn : cfg.director.firstSpawn, nextWave: cfg.director.waveEvery },
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
      everDryCdus: [], // pass 6 (M39): CDUs that were ever without glycol
      everDryHalls: [], // ...and halls that were ever without water
      dryCduSeconds: 0, // CDU-seconds without glycol
      dryHallSeconds: 0, // hall-seconds without water
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
    ceoStrikes: 0, // pass 5 spec 4.1: strikes given on strike visits
    strikeTimes: [], // game time of each strike
    ceoRng: createRng((seed * 7919 + 104729) >>> 0),
    // Building mode (pass 4 spec 2.1, 2.5).
    cash: building ? cfg.building.startCash : 0,
    hallsUp: null, // hall id -> online (building mode; see sites.js)
    handoverQueued: false,
    redSince: null, // when the cash went below zero (building mode)
    economyStart: 0, // building mode: when the burn and the alarm tightening started (after the tutorial)
    loanPaidAt: null, // building mode: when the construction loan was paid off (pass 5 spec 3.1)
    customersLive: false, // pass 7 spec 3.2: service credits are charged from this moment
    uptime: null, // pass 7 spec 4.1: { minute, up: Set of rows still on track this minute }
    uptimeLast: null, // the last uptime payment: { t, minute, rows: [ids], total }
    ribbonQueued: false,
    commissionedAt: null, // pass 5 spec 5.1: when every rack row first delivered full output at once
    sold: null, // { price, t } once the player handed over the keys
  };
  if (building) {
    state.stats.earned = 0;
    state.stats.spent = 0;
    state.stats.burned = 0;
    state.stats.credits = 0; // pass 7 M41: service credits charged, part of what was burned
    state.stats.uptime = 0; // pass 7 M42: uptime bonuses paid, part of what was earned
    state.stats.built = 0;
    state.stats.hallsOnline = [];
    for (const h of refreshSites(state)) state.stats.hallsOnline.push({ hall: h, t: 0 });
  }
  state.supply = supply(state); // pass 6 M39: which CDUs have glycol and which halls water
  return state;
}

// ---------------------------------------------------------------- queries

export const getAlarm = (state, alarmId) => state.alarms.find((a) => a.id === alarmId) ?? null;
export const getTech = (state, techId) => state.techs.find((t) => t.id === techId) ?? null;

/** Is Plant B part of the campus? Classic: from hall 6. Building: once anything there is built. */
export function plantBOnline(state) {
  if (buildingOn(state)) return [...CHILLERS, ...PUMPS].some((e) => e.plant === 'B' && isBuilt(state, e.id));
  return state.halls >= state.config.plantBHall;
}

/** Is this piece of equipment part of the running campus? Building mode: built, in an online hall. */
export function isOnline(state, e) {
  if (!isBuilt(state, e.id)) return false;
  if (e.hall) return hallOnline(state, e.hall);
  return buildingOn(state) || e.plant === 'A' || plantBOnline(state);
}

// Building mode: does this half of the hall have any rack rows built? A half with no racks is never
// "dark", whatever its switchboards, so an empty half costs nothing.
const halfHasRows = (state, hallId, half) => ROWS.some((r) => r.hall === hallId && r.half === half && isBuilt(state, r.id));

/** A half with racks and no working switchboard (classic: both of its MSBs tripped) is dark. */
export function isHalfDark(state, hallId, half) {
  if (!halfHasRows(state, hallId, half)) return false;
  // Building mode: a switchboard whose transformer or RMU is missing (or down, M30) is as good as tripped.
  return builtMsbs(state, hallId, half).every((id) => state.equip[id].tripped || !msbFed(state, id));
}

// Worst first. 'single' (building mode): working, but with no backup built (pass 4 spec 2.4).
const SHIELD_RANK = { whole: 0, single: 1, cracked: 2, broken: 3 };
const worse = (a, b) => (SHIELD_RANK[b] > SHIELD_RANK[a] ? b : a);

/** 'whole' | 'single' | 'cracked' | 'broken' for a hall's power: the worse of its two MSB pairs. */
export function powerShield(state, hallId) {
  let worst = 'whole';
  for (const half of ['t', 'b']) {
    const built = builtMsbs(state, hallId, half);
    const tripped = built.filter((id) => state.equip[id].tripped || !msbFed(state, id)).length;
    if (built.length === 0) {
      if (isHalfDark(state, hallId, half)) worst = worse(worst, 'broken'); // racks with no switchboard
    } else if (tripped === built.length) worst = worse(worst, isHalfDark(state, hallId, half) ? 'broken' : 'cracked');
    else if (tripped > 0) worst = worse(worst, 'cracked');
    else if (built.length === 1) worst = worse(worst, 'single');
  }
  return worst;
}

/**
 * A hall's coolant: 'ok', 'throttled' (some built CDU leaking, rows at leakThrottle) or 'shut' (every
 * built CDU leaking, or a lone CDU's leak ran out of clock). Classic: one leak throttles, two shut.
 * Pass 6 (M39): a CDU without glycol does not count; with none left the hall shuts.
 */
export function coolantState(state, hallId, dryCdus = state.supply ? state.supply.dryCdus : null) {
  const all = builtCdus(state, hallId);
  const built = dryCdus ? all.filter((id) => !dryCdus.has(id)) : all;
  if (built.length === 0 && all.length > 0) return 'shut';
  const leaking = built.filter((id) => state.equip[id].leaking);
  if (leaking.length === 0) return 'ok';
  if (leaking.length === built.length && (built.length >= 2 || leaking.some((id) => state.equip[id].shut))) return 'shut';
  return 'throttled';
}

/** Dark half-halls: a half with no working switchboard, or both halves of a hall shut by leaks. */
export function darkHalves(state) {
  let n = 0;
  for (const h of onlineHallIds(state)) {
    const shut = coolantState(state, h) === 'shut';
    for (const half of ['t', 'b']) if (shut || isHalfDark(state, h, half)) n += 1;
  }
  return n;
}

/** 'whole' | 'single' | 'cracked' | 'broken' for a hall's coolant units. */
export function liquidShield(state, hallId) {
  const c = coolantState(state, hallId);
  if (c === 'shut') return 'broken';
  if (c === 'throttled') return 'cracked';
  // Pass 6 spec 4.2 (M39): a CDU without glycol breaks the hall's coolant shield.
  if (state.supply && builtCdus(state, hallId).some((id) => state.supply.dryCdus.has(id))) return 'broken';
  return builtCdus(state, hallId).length === 1 && buildingOn(state) ? 'single' : 'whole';
}

/** Rack rows in online halls (all of a hall's rows in the classic game; the built ones when building). */
export const onlineRows = (state) => ROWS.filter((r) => isOnline(state, r));

/** Chillers needed: 1.25 per hall's worth of rows online (spec 4.4; pass 4 spec 2.3). */
export function chillersNeeded(state) {
  const perHall = buildingOn(state) ? state.config.building.chillersPerHall : state.config.chillersPerHall;
  return Math.ceil((onlineRows(state).length * perHall) / ROWS_PER_HALL - EPS);
}

/**
 * Chillers running: built, not tripped, at a plant with a pump (pass 4 spec 2.3). Building mode:
 * no more than each plant's dry coolers (2 each, pass 4 spec 7.2) and running glycol pumps (2 each,
 * pass 6 M39) allow. `change` tries a pump what-if ({ fix } or { stop }), for costs and mercy.
 */
export function runningChillers(state, change = {}) {
  let n = 0;
  const glycol = buildingOn(state) ? runningPumps(state, 'glycol', change) : null;
  for (const plant of ['A', 'B']) {
    n += Math.min(chillersUp(state, plant), dryCapacity(state, plant), glycolCapacity(state, plant, glycol));
  }
  return n;
}

// Chillers built, online and not tripped at a plant; in the classic game, only with a pump there.
const chillersUp = (state, plant) => CHILLERS.filter((c) => c.plant === plant && isOnline(state, c) && state.equip[c.id].running && (buildingOn(state) || plantHasPump(state, c.plant))).length;

// How many chillers a plant's running glycol pumps let run (no limit in the classic game).
const glycolCapacity = (state, plant, glycol) => (glycol ? glycol[plant] * state.config.building.pumps.chillersPerGlycolPump : Infinity);

/** Running chillers beyond those needed (negative when short). */
export const spareChillers = (state) => runningChillers(state) - chillersNeeded(state);

/** 'whole' with 2 or more spares, 'cracked' with 1 or 0, 'broken' when short. */
export function coolingShield(state) {
  const spare = spareChillers(state);
  // Pass 6 (M39): the pumps count too. A CDU without glycol or a hall without water breaks it; a
  // loop with no spare pump cracks it.
  const sup = state.supply;
  if (sup && sup.glycol && (sup.dryCdus.size > 0 || sup.dryHalls.size > 0)) return 'broken';
  if (spare < 0) return 'broken';
  if (sup && sup.glycol && (sup.glycol.cap - sup.glycol.built < state.config.building.pumps.cdusPerGlycolPump || sup.water.cap - sup.water.online < state.config.building.pumps.hallsPerWaterPump)) return 'cracked';
  return spare >= 2 ? 'whole' : 'cracked';
}

function rowTarget(state, row) {
  const dyn = state.equip[row.id];
  if (dyn.netDown || state.halfDark[`${row.hall}-${row.half}`]) return 0;
  const c = coolantState(state, row.hall);
  if (c === 'shut') return 0;
  // Pass 6 (M39): a hall without water runs at noWaterFactor, on top of any other throttle.
  const water = state.supply && state.supply.dryHalls.has(row.hall) ? state.config.building.pumps.noWaterFactor : 1;
  return (c === 'throttled' ? state.config.leakThrottle : 1) * water;
}

/**
 * Pass 6 (M39): work out the pumps' supply again, and say what changed: `cduDry` / `cduWet` for each
 * CDU that lost or got back its glycol, `hallDry` / `hallWet` for each hall and its water.
 */
function supplyStep(state) {
  const before = state.supply;
  const now = supply(state);
  state.supply = now;
  const st = state.stats;
  for (const id of now.dryCdus) if (!st.everDryCdus.includes(id)) st.everDryCdus.push(id);
  for (const h of now.dryHalls) if (!st.everDryHalls.includes(h)) st.everDryHalls.push(h);
  if (!before) return;
  for (const id of now.dryCdus) if (!before.dryCdus.has(id)) emit(state, 'cduDry', { equipId: id });
  for (const id of before.dryCdus) if (!now.dryCdus.has(id)) emit(state, 'cduWet', { equipId: id });
  for (const h of now.dryHalls) if (!before.dryHalls.has(h)) emit(state, 'hallDry', { hall: h });
  for (const h of before.dryHalls) if (!now.dryHalls.has(h)) emit(state, 'hallWet', { hall: h });
}

/**
 * What the pumps need and have (pass 6 spec 4.1), for the screen: { glycol: { running, neededForCdus,
 * neededForChillers, cdus, fed }, water: { running, needed, halls, served } }. Null in the classic game.
 */
export function pumpNeeds(state) {
  if (!buildingOn(state)) return null;
  const cfg = state.config.building.pumps;
  const sup = state.supply ?? supply(state);
  const g = sup.glycol;
  const w = sup.water;
  let forChillers = 0;
  for (const plant of ['A', 'B']) forChillers += Math.ceil(Math.min(chillersUp(state, plant), dryCapacity(state, plant)) / cfg.chillersPerGlycolPump - EPS);
  return {
    glycol: { running: g.A + g.B, neededForCdus: Math.ceil(g.built / cfg.cdusPerGlycolPump - EPS), neededForChillers: forChillers, cdus: g.built, fed: g.built - sup.dryCdus.size },
    water: { running: w.A + w.B, needed: Math.ceil(w.online / cfg.hallsPerWaterPump - EPS), halls: w.online, served: w.online - sup.dryHalls.size },
  };
}

export function bandOf(fraction, config = DEFAULT_CONFIG2) {
  if (fraction >= config.band.green - EPS) return 'green';
  return fraction < config.band.red - EPS ? 'red' : 'yellow';
}

/** Live load: { deliveredMw, capacityMw, fraction, band }. Capacity counts online halls only. */
export function load(state) {
  const rows = onlineRows(state);
  const capacityMw = rows.length * state.config.rowMw;
  let deliveredMw = 0;
  for (const row of rows) deliveredMw += state.equip[row.id].level * state.thermal * state.config.rowMw;
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

/**
 * Whether a tech of this trade may work on this alarm type at all (owner, after M30): a transformer
 * short or an RMU fault is high-voltage work, for electricians only. Every other alarm can be fixed
 * by anyone, faster with the matching hat.
 */
export function canFix(alarmType, trade) {
  const def = ALARMS[alarmType];
  return !def.tradeOnly || def.trade === trade;
}

/**
 * Seconds this tech needs for the alarm's current step (M30): a transformer short is disconnected at
 * its RMU first (disconnectTime), then repaired at the transformer (fixTime).
 */
export function stepDuration(state, alarm, trade) {
  if (alarm.type === 'short' && alarm.stage === 'disconnect') {
    return fixDuration(state, 'short', trade) * (ALARMS.short.disconnectTime / ALARMS.short.fixTime);
  }
  return fixDuration(state, alarm.type, trade);
}

/** Where a tech works on this alarm now: a short's RMU until it is disconnected, else the device. */
export function serviceOf(state, alarm) {
  const e = EQUIPMENT_BY_ID[alarm.equipId];
  if (alarm.type === 'short' && alarm.stage === 'disconnect') {
    const r = EQUIPMENT_BY_ID[e.rmuId];
    return { x: r.sx, y: r.sy };
  }
  return { x: e.sx, y: e.sy };
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
  const to = serviceOf(state, alarm);
  let d = route({ x: tech.x, y: tech.y }, to).length;
  // A short not yet disconnected: on from the RMU to the transformer afterwards.
  if (alarm.type === 'short' && alarm.stage === 'disconnect') {
    const e = EQUIPMENT_BY_ID[alarm.equipId];
    d += route(to, { x: e.sx, y: e.sy }).length;
  }
  return d;
}

export function nearestIdleTech(state, alarmId) {
  const alarm = getAlarm(state, alarmId);
  if (!alarm) return null;
  let best = null;
  let bestDist = Infinity;
  for (const tech of state.techs) {
    if (tech.state !== 'idle' || !canFix(alarm.type, tech.trade)) continue;
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
  if (type === 'short') dyn.shorted = true;
  if (type === 'rmu') dyn.faulted = true;
  if (type === 'fan') dyn.stopped = true;
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
  if (type === 'short') alarm.stage = 'disconnect'; // M30: disconnect at the RMU, then repair
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
  // The yard's failures (M30) only happen in building mode, where the yard is part of the game.
  if (YARD_ALARMS.includes(type) && !buildingOn(state)) return [];
  // Mercy: no yard failures until the campus has a few halls, since a small one runs through one RMU.
  if (YARD_ALARMS.includes(type) && state.halls < state.config.building.yardFromHalls) return [];
  if (state.halls < 2 && !d.firstHallTypes.includes(type) && !YARD_ALARMS.includes(type)) return [];
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
      // Pass 6 (M39): a pump in overpressure stops, so in building mode only one whose kind would
      // still cover everything (chillers, CDUs, halls) with it stopped. Only an ignored first
      // failure takes the campus below what it needs.
      return PUMPS.filter((e) => ok(e) && !state.equip[e.id].overpressure && (!buildingOn(state) || pumpIsSpare(state, e)));
    // M30. A short only where its RMU is working (and its switchboard is built, so it matters).
    case 'short':
      return XFMRS.filter((e) => ok(e) && !state.equip[e.id].shorted && !state.equip[e.rmuId].faulted && isBuilt(state, e.msbId));
    case 'rmu':
      return RMU_LIST.filter((e) => ok(e) && !state.equip[e.id].faulted && e.feeds.some((x) => isBuilt(state, EQUIPMENT_BY_ID[x].msbId)));
    case 'fan':
      // Mercy, as for chillers: only while a spare unit keeps every chiller running.
      return DRY_UNITS.filter((e) => ok(e) && !state.equip[e.id].stopped && dryCapacity(state, e.plant) - state.config.building.chillersPerDryCooler >= runningAt(state, e.plant));
    default:
      return [];
  }
}

// Would stopping this pump leave everything it supplies as it is? (Pass 6 M39 mercy.)
function pumpIsSpare(state, pump) {
  const now = state.supply ?? supply(state);
  const without = supply(state, { stop: pump.id });
  if (without.dryCdus.size > now.dryCdus.size || without.dryHalls.size > now.dryHalls.size) return false;
  return runningChillers(state, { stop: pump.id }) >= runningChillers(state);
}

// Chillers that would run at a plant with all its dry coolers working (for the fan mercy).
function runningAt(state, plant) {
  return Math.min(chillersUp(state, plant), glycolCapacity(state, plant, buildingOn(state) ? runningPumps(state, 'glycol') : null));
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
  if (alarm.type === 'leak') {
    dyn.leaking = false;
    dyn.shut = false;
  }
  if (alarm.type === 'breaker') dyn.tripped = false;
  if (alarm.type === 'chiller') dyn.running = true;
  if (alarm.type === 'pump') dyn.overpressure = false;
  if (alarm.type === 'short') dyn.shorted = false;
  if (alarm.type === 'rmu') dyn.faulted = false;
  if (alarm.type === 'fan') dyn.stopped = false;
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
    if (c.half !== p.half || !isOnline(state, c)) return false;
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
      if (!isBuilt(state, otherId)) {
        // No backup built (pass 4 spec 2.4): the hall shuts until this leak is fixed.
        state.equip[alarm.equipId].shut = true;
        emit(state, 'escalate', { alarmId: alarm.id, alarmType: 'leak', equipId: alarm.equipId, effect: 'hallShut' });
      } else if (!state.equip[otherId].leaking && state.equip[otherId].alarmId === null) {
        spawnAlarm(state, 'leak', otherId, 'escalation');
        state.stats.leakSpreads += 1;
        emit(state, 'escalate', { alarmId: alarm.id, alarmType: 'leak', equipId: alarm.equipId, effect: 'secondCdu', target: otherId });
      }
      break;
    }
    case 'breaker': {
      alarm.clockEnd = Infinity;
      const otherId = `msb-${eq.hall}-${eq.half}-${otherSide(eq.side)}`;
      if (isBuilt(state, otherId) && !state.equip[otherId].tripped && state.equip[otherId].alarmId === null) {
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
    case 'short': {
      // M30: left connected, the short takes out its RMU: both sides of that half go dark.
      alarm.clockEnd = Infinity;
      const rmuId = eq.rmuId;
      if (alarm.stage === 'disconnect' && !state.equip[rmuId].faulted && state.equip[rmuId].alarmId === null) {
        spawnAlarm(state, 'rmu', rmuId, 'escalation');
        emit(state, 'escalate', { alarmId: alarm.id, alarmType: 'short', equipId: alarm.equipId, effect: 'rmuFault', target: rmuId });
      }
      break;
    }
    case 'fan': {
      // M30: the next unit at that plant fails.
      alarm.clockEnd = Infinity;
      const candidates = DRY_UNITS.filter((d) => d.plant === eq.plant && isBuilt(state, d.id) && !state.equip[d.id].stopped && state.equip[d.id].alarmId === null).map((d) => d.id);
      if (candidates.length > 0) {
        const target = state.rng.pick(candidates);
        spawnAlarm(state, 'fan', target, 'escalation');
        emit(state, 'escalate', { alarmId: alarm.id, alarmType: 'fan', equipId: alarm.equipId, effect: 'nextFan', target });
      }
      break;
    }
    case 'pump': {
      if (eq.loop === 'water' && buildingOn(state)) {
        // Pass 6 (M39): a water pump's overpressure spreads to the nearest running water pump.
        alarm.clockEnd = Infinity;
        const near = PUMPS.filter((p) => p.loop === 'water' && isBuilt(state, p.id) && !state.equip[p.id].overpressure && state.equip[p.id].alarmId === null)
          .sort((a, b) => Math.abs(a.x - eq.x) + Math.abs(a.y - eq.y) - (Math.abs(b.x - eq.x) + Math.abs(b.y - eq.y)));
        if (near.length > 0) {
          spawnAlarm(state, 'pump', near[0].id, 'escalation');
          emit(state, 'escalate', { alarmId: alarm.id, alarmType: 'pump', equipId: alarm.equipId, effect: 'nextWaterPump', target: near[0].id });
        }
        break;
      }
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

/**
 * Seconds between director alarms with `halls` online, `sincePhase` seconds into the phase, before
 * jitter. Building mode passes its own tightening (pass 4 spec 2.7).
 */
export function spawnInterval(config, halls, sincePhase, tighten = config.director.tighten) {
  const d = config.director;
  const start = d.phaseIntervals[Math.max(1, Math.min(halls, d.phaseIntervals.length)) - 1];
  const steps = Math.floor(sincePhase / d.tightenEvery + EPS);
  return Math.max(d.floor, start * Math.pow(1 - tighten, steps));
}

/**
 * Building mode (pass 4 spec 2.7): the interval follows what is built, read from the phase table by
 * rows online / 6 rounded up, and tightens slowly from the start of the run with no reset.
 */
export function buildingInterval(state) {
  const b = state.config.building;
  const rows = onlineRows(state).length;
  const halls = Math.ceil(rows / ROWS_PER_HALL - EPS);
  // A campus smaller than one full hall gets fewer alarms still: more equipment, more alarms.
  const stretch = rows >= ROWS_PER_HALL ? 1 : Math.min(b.smallStretch, ROWS_PER_HALL / Math.max(1, rows));
  return spawnInterval(state.config, halls, economyTime(state), b.tighten) * stretch;
}

/** Building mode: the extra alarms the cap allows late in a run (owner, 16 Nov: +2 at 14:00, +2 at 17:00). */
export function lateCapExtra(state) {
  let extra = 0;
  for (const [at, add] of state.config.building.capSteps ?? []) if (state.t >= at - EPS) extra += add;
  return extra;
}

/** Largest number of active alarms at which the director still adds one. */
export function alarmCap(state) {
  const d = state.config.director;
  // Building mode: the cap follows what is built, so a hire is relief, not more alarms (M24's checks).
  if (buildingOn(state)) return state.config.building.capExtra + Math.ceil(onlineRows(state).length / ROWS_PER_HALL - EPS) + lateCapExtra(state);
  const growth = state.fullCampusAt === null || !(d.capGrowEvery > 0) ? 0 : Math.floor((state.t - state.fullCampusAt) / d.capGrowEvery + EPS);
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
    const base = buildingOn(state) ? buildingInterval(state) : spawnInterval(state.config, state.halls, state.t - state.phaseStart);
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
    // Building mode: the burn and the alarm tightening start now, not during the tutorial (M27).
    if (buildingOn(state)) state.economyStart = state.t;
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
  if (buildingOn(state) || state.halls >= state.config.maxHalls) return 1;
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

// ---------------------------------------------------------------- building and money (pass 4)

/** Price of a device (by equipment id or type), or of 'hire' / 'upgrade'. */
export function priceOf(state, what) {
  const prices = state.config.building.prices;
  const type = EQUIPMENT_BY_ID[what] ? EQUIPMENT_BY_ID[what].type : what;
  return prices[type];
}

/** Why a spot cannot be built now, or null if it can: 'off' | 'unknown' | 'built' | 'building' | 'cash' | 'over'. */
export function cannotBuild(state, equipId) {
  if (!buildingOn(state)) return 'off';
  if (state.over) return 'over';
  if (!EQUIPMENT_BY_ID[equipId]) return 'unknown';
  const dyn = state.equip[equipId];
  if (dyn.built) return 'built';
  if (dyn.buildEnd !== null) return 'building';
  if (state.cash + EPS < priceOf(state, equipId)) return 'cash';
  return null;
}

/**
 * Buy and build the device at a spot (pass 4 spec 2.1): the money goes at once, and a contractor
 * finishes it buildTime seconds later. Returns { ok, until } or { ok: false, reason }.
 */
export function build(state, equipId) {
  const reason = cannotBuild(state, equipId);
  if (reason) return { ok: false, reason };
  const price = priceOf(state, equipId);
  state.cash -= price;
  state.stats.spent += price;
  const until = state.t + state.config.building.buildTime;
  state.equip[equipId].buildEnd = until;
  emit(state, 'buildStart', { equipId, price, until });
  return { ok: true, until };
}

/** Hire a tech of this trade for money (pass 4 spec 2.6). They arrive at Hall 1's door. */
export function hire(state, trade) {
  if (!buildingOn(state)) return { ok: false, reason: 'off' };
  if (state.over) return { ok: false, reason: 'over' };
  if (!state.config.hireTieOrder.includes(trade)) return { ok: false, reason: 'unknown' };
  const price = priceOf(state, 'hire');
  if (state.cash + EPS < price) return { ok: false, reason: 'cash' };
  state.cash -= price;
  state.stats.spent += price;
  const tech = addTech(state, trade, 1);
  return { ok: true, techId: tech.id };
}

/** Buy one level of an upgrade (Carts, Better tools, Radios) for money. */
export function buyUpgrade(state, id) {
  if (!buildingOn(state)) return { ok: false, reason: 'off' };
  if (state.over) return { ok: false, reason: 'over' };
  const u = UPGRADES[id];
  if (!u) return { ok: false, reason: 'unknown' };
  if (state.upgrades[id] >= u.max) return { ok: false, reason: 'max' };
  const price = priceOf(state, 'upgrade');
  if (state.cash + EPS < price) return { ok: false, reason: 'cash' };
  state.cash -= price;
  state.stats.spent += price;
  state.upgrades[id] += 1;
  emit(state, 'upgrade', { upgrade: id, level: state.upgrades[id] });
  return { ok: true };
}

// Money in: each rack row earns `income` dollars a second at full output (pass 4 spec 2.5).
function earn(state, deliveredMw, dt) {
  const dollars = (deliveredMw / state.config.rowMw) * state.config.building.income * dt;
  state.cash += dollars;
  state.stats.earned += dollars;
}

/** Seconds since the economy started: the run's start, or the end of the tutorial (pass 4 M27). */
export const economyTime = (state) => Math.max(0, state.t - (state.economyStart ?? 0));

/** Dollars of the construction loan still to repay (pass 5 spec 3.1). 0 when there is no loan. */
export function loanLeft(state) {
  const b = state.config.building.burn;
  if (!b.loan || !b.loanRate) return 0;
  if (state.scripted) return b.loan; // nothing is repaid while the tutorial's lessons run (M27)
  return Math.max(0, b.loan - b.loanRate * economyTime(state));
}

/** Seconds until the loan is paid off, at its fixed rate. 0 when paid off or there is none. */
export function loanTimeLeft(state) {
  const left = loanLeft(state);
  return left > 0 ? left / state.config.building.burn.loanRate : 0;
}

/** Dollars a second the business burns now (pass 4 spec 2.5; pass 5 spec 3.1). */
export function burnRate(state) {
  const b = state.config.building.burn;
  const infra = EQUIPMENT.filter((e) => e.type !== 'row' && isBuilt(state, e.id)).length;
  // Pass 5: a flat site overhead. With `doubling` set, pass 4's base that doubled every that many
  // seconds and in the end outgrew a full campus (the owner found it unsatisfactory, 15 Nov).
  const base = b.doubling > 0 ? b.base * Math.pow(2, economyTime(state) / b.doubling) : b.base;
  const loan = loanLeft(state) > 0 ? b.loanRate : 0;
  return loan + base + b.upkeep * infra + b.wages * state.techs.length + creditsRate(state);
}

// The uptime bonus (pass 7 spec 4.1, M42) ------------------------------------------------------

/** Is the uptime bonus in play? Building mode, switched on, and not while the tutorial's lessons run. */
export function uptimeOn(state) {
  const u = state.config.building.uptime;
  return buildingOn(state) && Boolean(u && u.enabled && u.bonus > 0) && !state.scripted;
}

/** Is this rack row up for the bonus now: online and at or above the floor of full output? */
export function rowUp(state, id) {
  const row = EQUIPMENT_BY_ID[id];
  if (!isOnline(state, row)) return false;
  return state.equip[id].level * state.thermal >= state.config.building.uptime.floor - EPS;
}

const rowsUpNow = (state) => new Set(ROWS.filter((r) => rowUp(state, r.id)).map((r) => r.id));

// Each step: a row that drops below the floor is off track for the minute. At each full minute,
// the rows still on track are paid, and the next minute starts with the rows up at that moment.
function uptimeStep(state) {
  if (!uptimeOn(state)) {
    state.uptime = null; // the tutorial's lessons: the first minute starts at the hand-over
    return;
  }
  const minute = Math.floor(economyTime(state) / 60 + 1e-9);
  if (!state.uptime) {
    state.uptime = { minute, up: rowsUpNow(state) };
    return;
  }
  for (const id of state.uptime.up) if (!rowUp(state, id)) state.uptime.up.delete(id);
  if (minute <= state.uptime.minute) return;
  const rows = [...state.uptime.up];
  const bonus = state.config.building.uptime.bonus;
  const total = rows.length * bonus;
  if (total > 0) {
    state.cash += total;
    state.stats.earned += total;
    state.stats.uptime += total;
  }
  state.uptimeLast = { t: state.t, minute, rows, total };
  emit(state, 'uptimeBonus', { minute, rows, total });
  state.uptime = { minute, up: rowsUpNow(state) };
}

/** Is this row on track for this minute's uptime bonus? null when there is no bonus in play. */
export function uptimeOnTrack(state, id) {
  if (!uptimeOn(state) || !state.uptime) return null;
  return state.uptime.up.has(id);
}

/** Economy seconds at which customers go live (pass 7 spec 3.2): when the loan is paid off. */
export function customersLiveAt(state) {
  const b = state.config.building.burn;
  return b.loan > 0 && b.loanRate > 0 ? b.loan / b.loanRate : 0;
}

/** Are service credits being charged for outages yet? Not in the tutorial's lessons, not before the loan is paid. */
export function creditsOn(state) {
  const c = state.config.building.credits;
  if (!buildingOn(state) || !c || !(c.rate > 0) || state.scripted) return false;
  return economyTime(state) >= customersLiveAt(state) - EPS;
}

/** Dollars a second charged for each rack row short of full output (pass 7 spec 3.2). 0 before customers go live. */
export function creditPerRow(state) {
  if (!creditsOn(state)) return 0;
  const c = state.config.building.credits;
  const since = Math.max(0, economyTime(state) - customersLiveAt(state));
  return c.doubling > 0 ? c.rate * Math.pow(2, since / c.doubling) : c.rate;
}

/** Rack rows' worth of output the online rows are short: a dark row 1, a row at 90% 0.1, a hall without water 0.5 a row. */
export function rowsShort(state) {
  const l = load(state);
  return Math.max(0, (l.capacityMw - l.deliveredMw) / state.config.rowMw);
}

/** Service credits now, in dollars a second. Nothing while every online row delivers. */
export function creditsRate(state) {
  const per = creditPerRow(state);
  if (per <= 0) return 0;
  const short = rowsShort(state);
  return short > EPS ? per * short : 0;
}

/** Income now, in dollars a second, from the racks delivering. */
export const incomeRate = (state) => (load(state).deliveredMw / state.config.rowMw) * state.config.building.income;

// Money out. In the red, a countdown runs: still in the red when it ends, the run is over.
function burn(state, dt) {
  const credits = creditsRate(state);
  const dollars = burnRate(state) * dt;
  state.cash -= dollars;
  state.stats.burned += dollars;
  state.stats.credits = (state.stats.credits ?? 0) + credits * dt;
  if (!state.customersLive && creditsOn(state)) {
    state.customersLive = true;
    emit(state, 'customersLive', { t: state.t });
  }
  // Once a second while any are charged, for the screen (pass 7 spec 3.2).
  if (credits > 0 && Math.floor(state.t) !== Math.floor(state.t - dt)) emit(state, 'credits', { rate: credits });
  // The loan is repaid by time, so it is paid off at the step its balance reaches zero.
  if (state.loanPaidAt === null && state.config.building.burn.loan > 0 && loanLeft(state) <= 0) {
    state.loanPaidAt = state.t;
    emit(state, 'loanPaid', { t: state.t });
  }
  if (state.cash >= 0) {
    if (state.redSince !== null) emit(state, 'outOfRed', {});
    state.redSince = null;
    return;
  }
  if (state.redSince === null) {
    state.redSince = state.t;
    emit(state, 'inRed', { seconds: state.config.building.debtGrace });
  }
  if (state.t - state.redSince >= state.config.building.debtGrace - EPS && !state.over) {
    state.over = true;
    state.overReason = 'bankrupt';
    emit(state, 'over', { reason: 'bankrupt' });
  }
}

/** Seconds left before going broke ends the run, or null while out of the red. */
export const redSecondsLeft = (state) => (state.redSince === null || state.redSince === undefined ? null : Math.max(0, state.config.building.debtGrace - (state.t - state.redSince)));

/** Is the Stability meter in play? Always in the classic game; optional in building mode. */
export const stabilityOn = (state) => !buildingOn(state) || state.config.building.stability;

// Finished devices, halls coming online, and the CEO's first two visits (pass 4 spec 2.1, 2.8).
function buildingStep(state) {
  const cfg = state.config;
  let finished = false;
  for (const e of EQUIPMENT) {
    const dyn = state.equip[e.id];
    if (dyn.buildEnd !== null && state.t >= dyn.buildEnd - EPS) {
      dyn.built = true;
      dyn.buildEnd = null;
      if (e.type === 'row') dyn.level = 0; // a new row powers up over recoverTime, like a recovery
      state.stats.built += 1;
      finished = true;
      emit(state, 'built', { equipId: e.id });
    }
  }
  if (finished) {
    for (const hall of refreshSites(state)) {
      state.stats.hallsOnline.push({ hall, t: state.t });
      emit(state, 'hallOnline', { hall });
      if (state.halls === cfg.ceo.ribbonHall && !state.ribbonQueued) {
        state.ribbonQueued = true;
        queueCeo(state, 'ribbon', hall);
      }
    }
    if (state.halls >= cfg.maxHalls && state.fullCampusAt === null) {
      state.fullCampusAt = state.t;
      emit(state, 'fullCampus', {});
    }
  }
  const b = cfg.building;
  const rowsMw = onlineRows(state).length * cfg.rowMw;
  if (!state.handoverQueued && state.halls > 0 && (rowsMw >= b.handoverMw - EPS || economyTime(state) >= b.handoverAt - EPS)) {
    state.handoverQueued = true;
    queueCeo(state, 'handover');
  }
}

// ---------------------------------------------------------------- the win (pass 5 spec 5, M34)

// Commissioned: the first moment every rack row delivers full output at once. Kept for good.
function checkCommissioned(state, deliveredMw) {
  if (state.commissionedAt !== null || state.scripted) return;
  if (deliveredMw < ROWS.length * state.config.rowMw - 1e-6) return;
  state.commissionedAt = state.t;
  emit(state, 'commissioned', { price: salePrice(state) });
}

/** Has the campus been Commissioned? */
export const commissioned = (state) => state.commissionedAt !== null && state.commissionedAt !== undefined;

/** What the campus sells for now: the price of everything built, plus `incomeSeconds` of current income (M41), half as much again if Commissioned. */
export function salePrice(state) {
  if (!buildingOn(state)) return 0;
  let total = 0;
  for (const e of EQUIPMENT) if (isBuilt(state, e.id)) total += priceOf(state, e.id);
  const sale = state.config.building.sale;
  // Pass 7 (M41): the buyer pays for what the campus earns now, so an outage lowers the price.
  if (sale.incomeSeconds > 0) total += incomeRate(state) * sale.incomeSeconds;
  return Math.round(total * (commissioned(state) ? 1 + sale.commissionedBonus : 1));
}

/**
 * Why the campus cannot be sold now, or null if it can: 'off' (classic game), 'over', 'early' (before
 * the Handover), 'ceo' (a visit or its warning; with `sale.anytime`, only the visit itself) or 'outage'
 * (an alarm costing power is open; never with `sale.anytime`).
 */
export function cannotSell(state) {
  if (!buildingOn(state)) return 'off';
  if (state.over) return 'over';
  const sale = state.config.building.sale;
  if (sale.fromHandover && !state.handoverQueued) return 'early';
  // Pass 7 (M41): outages and a CEO warning no longer stop a sale; only the CEO on the floor does.
  if (sale.anytime) return state.ceo && state.ceo.phase === 'visit' ? 'ceo' : null;
  if (state.ceo) return 'ceo';
  if (state.alarms.some((a) => alarmCost(state, a) > 0)) return 'outage';
  return null;
}

/** Hand over the keys: the run ends by choice and the sale price joins the score. */
export function sell(state) {
  const reason = cannotSell(state);
  if (reason) return { ok: false, reason };
  const price = salePrice(state);
  state.sold = { price, t: state.t };
  state.over = true;
  state.overReason = 'sold';
  emit(state, 'sold', { price });
  emit(state, 'over', { reason: 'sold' });
  return { ok: true, price };
}

/** The score: money earned, plus the sale price if sold (going broke or fired: no sale). */
export const score = (state) => (buildingOn(state) ? state.stats.earned + (state.sold ? state.sold.price : 0) : 0);

/** The highest milestone reached: 'commissioned', 'handover', 'ribbon' or null. */
export function milestone(state) {
  if (commissioned(state)) return 'commissioned';
  if (state.handoverQueued) return 'handover';
  if (state.ribbonQueued) return 'ribbon';
  return null;
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
  if (!canFix(alarm.type, tech.trade)) return { ok: false, reason: 'trade', trade: ALARMS[alarm.type].trade };
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
  const r = route({ x: tech.x, y: tech.y }, serviceOf(state, alarm));
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

// M30: a short disconnected at its RMU can no longer spread; the same tech walks on to repair it.
function disconnected(state, alarm, tech) {
  alarm.stage = 'repair';
  alarm.progress = 0;
  alarm.clockEnd = Infinity;
  emit(state, 'disconnect', { alarmId: alarm.id, equipId: alarm.equipId, techId: tech.id });
  const r = route({ x: tech.x, y: tech.y }, serviceOf(state, alarm));
  tech.path = r.points;
  tech.leg = 1;
  tech.state = r.length < EPS ? 'fixing' : 'walking';
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
      alarm.progress += dt / stepDuration(state, alarm, tech.trade);
      if (alarm.progress >= 1 - EPS) {
        if (alarm.type === 'short' && alarm.stage === 'disconnect') disconnected(state, alarm, tech);
        else clearAlarm(state, alarm, tech);
      }
    }
  }
  serviceQueue(state);
  autoDispatch(state); // techs pick their own jobs (pass 4 spec 2.6)

  // Building mode: devices that contractors finish, and halls coming online (pass 4 spec 2.1).
  if (buildingOn(state)) buildingStep(state);
  // Pass 6 (M39): what the pumps supply, before the rows take their targets.
  if (buildingOn(state)) {
    supplyStep(state);
    state.stats.dryCduSeconds += state.supply.dryCdus.size * dt;
    state.stats.dryHallSeconds += state.supply.dryHalls.size * dt;
  }

  // Halves of halls going dark or coming back.
  for (const h of onlineHallIds(state)) {
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
    if (!isOnline(state, row)) continue;
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
  if (!stabilityOn(state)) state.meter = m.max; // building mode without Stability: money is the lifeline
  else {
    // A dark half-hall (or a hall shut by leaks, both halves) stops the fill and drains the meter
    // whatever the band, so big failures hurt at any campus size (pass 3 spec 4.4).
    const dark = darkHalves(state);
    if (now.band === 'green' && dark === 0) state.meter = Math.min(m.max, state.meter + m.fill * dt);
    else if (now.band === 'yellow') state.meter -= m.yellowDrain * dt;
    else if (now.band === 'red') state.meter -= m.redDrain * dt;
    state.meter -= (buildingOn(state) ? state.config.building.darkDrain : m.darkDrain) * dark * dt;
    // The run cannot be lost before the first Delivery, while a hall is still to be built (pass 3
    // spec 1.1: with every hall online from the start no Delivery comes, and the run must still end).
    if (buildingOn(state)) {
      // Building mode: the meter cannot empty in the first two minutes (pass 4 spec 2.8).
      if (state.t < state.config.building.safeUntil) state.meter = Math.max(m.safeFloor, state.meter);
    } else if (state.deliveries === 0 && state.halls < state.config.maxHalls) state.meter = Math.max(m.safeFloor, state.meter);
    if (state.scripted) state.meter = Math.min(m.tutorialCap, state.meter);
  }

  const hours = (dt * state.config.timeScale) / 3600;
  state.stats.energyMwh += now.deliveredMw * hours;
  state.stats.possibleMwh += now.capacityMw * hours;
  state.stats.bandTime[now.band] += dt;
  state.stats.lowestFraction = Math.min(state.stats.lowestFraction, now.fraction);
  if (buildingOn(state)) {
    earn(state, now.deliveredMw, dt);
    uptimeStep(state);
    checkCommissioned(state, now.deliveredMw);
    if (!state.scripted) burn(state, dt);
  }

  // Construction: the next hall comes on a timer, faster while the load is green. It waits while
  // the tutorial runs, so no hall arrives mid-lesson.
  if (!buildingOn(state) && !state.scripted && state.halls < state.config.maxHalls) {
    const b = state.config.build;
    state.build += dt * (now.band === 'green' ? b.greenBoost : 1);
    if (state.build >= b.every - EPS) deliver(state);
  }

  ceoStep(state, dt);

  if (!state.over && stabilityOn(state) && state.meter <= EPS) {
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
    cdusEverDry: s.everDryCdus.length,
    hallsEverDry: s.everDryHalls.length,
    dryCduSeconds: s.dryCduSeconds,
    dryHallSeconds: s.dryHallSeconds,
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
    // Pass 5 spec 4.2: strikes, and when each was given (economy time, as the loan's).
    strikes: state.ceoStrikes ?? 0,
    strikesToFire: strikesToFire(state),
    strikeTimes: (state.strikeTimes ?? []).map((t) => t - (buildingOn(state) ? state.economyStart ?? 0 : 0)),
    deliveries: s.deliveries.map((d) => ({ ...d })),
    crew: state.techs.map((t) => t.trade),
    picks: s.picks.map((p) => ({ hall: p.hall, card: cardText(p.card) })),
    tuning: changedTuning(state.config),
    // Building mode (pass 4 spec 2.5): money earned is the score.
    building: buildingOn(state),
    earned: buildingOn(state) ? state.stats.earned : 0,
    spent: buildingOn(state) ? state.stats.spent : 0,
    burned: buildingOn(state) ? state.stats.burned : 0,
    bankrupt: state.overReason === 'bankrupt',
    // Pass 7 spec 3.5: service credits charged, and whether they are what broke the bank (after customers went live).
    credits: buildingOn(state) ? state.stats.credits ?? 0 : 0,
    brokeOnCredits: state.overReason === 'bankrupt' && (state.stats.credits ?? 0) > 0,
    uptime: buildingOn(state) ? state.stats.uptime ?? 0 : 0, // pass 7 M42: uptime bonuses paid
    built: buildingOn(state) ? state.stats.built : 0,
    // Pass 5 spec 3.2: when the construction loan was paid off, in economy time; null if not (or none).
    loanPaidAt: buildingOn(state) && state.loanPaidAt !== null ? state.loanPaidAt - (state.economyStart ?? 0) : null,
    hasLoan: buildingOn(state) && state.config.building.burn.loan > 0 && state.config.building.burn.loanRate > 0,
    // Pass 5 spec 5.1: the win.
    sold: state.overReason === 'sold',
    salePrice: state.sold ? state.sold.price : 0,
    commissioned: commissioned(state),
    commissionedAt: commissioned(state) ? state.commissionedAt - (buildingOn(state) ? state.economyStart ?? 0 : 0) : null,
    milestone: milestone(state),
    score: score(state),
  };
}

export function formatClock(seconds) {
  const whole = Math.floor(seconds + 1e-6);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}
const pct = (v) => `${Math.round(v * 100)}%`;

/** "Loan paid off at 4:58", "Loan not paid off", or '' with no loan (pass 5 spec 3.2). */
export function loanText(r) {
  if (!r.hasLoan) return '';
  return r.loanPaidAt === null ? 'Loan not paid off' : `Loan paid off at ${formatClock(r.loanPaidAt)}`;
}

/** Plain text for the Copy button. */
export function resultsText(state) {
  const r = results(state);
  const count = (list) => Object.entries(list.reduce((m, x) => ({ ...m, [x]: (m[x] ?? 0) + 1 }), {})).map(([k, n]) => `${n} ${k}`).join(', ');
  return [
    'FacOps pass 3 results',
    `Mode: ${r.mode} | Seed: ${r.seed}`,
    `Survived: ${formatClock(r.seconds)} | Halls: ${r.halls} of ${state.config.maxHalls}${r.fullCampus ? ' | Full campus' : ''}`,
    `Delivered: ${r.energyGwh.toFixed(2)} GWh (${pct(r.shareOfPossible)} of possible)`,
    `CEO: ${r.ceoVisits} visits survived, ${r.ceoSightings} unattended alarms seen${r.strikes > 0 ? ` | Strikes: ${r.strikeTimes.map(formatClock).join(', ')}` : ''}${r.firedByCeo ? ' | Fired by the CEO' : ''}`,
    `Deliveries: ${r.deliveries.length > 0 ? r.deliveries.map((d) => `H${d.hall} ${formatClock(d.t)}`).join(', ') : 'none'}`,
    `Crew: ${count(r.crew)} | Picks: ${r.picks.length > 0 ? r.picks.map((p) => `H${p.hall} ${p.card}`).join(', ') : 'none'}`,
    `Time in green / yellow / red: ${pct(r.green)} / ${pct(r.yellow)} / ${pct(r.red)}`,
    `Alarms: ${r.raised} raised, ${r.cleared} cleared, average ${r.averageClear.toFixed(1)} s to clear, longest ${Math.round(r.longestAlarm)} s, peak ${r.peakAlarms} at once`,
    `Escalations: ${r.halfDark} half-halls dark, ${r.leakSpreads} leaks spread, ${r.spreads} network spreads, ${r.bursts} pump bursts, ${r.secondChillers} second chillers`,
    ...(r.building ? [`Pumps: ${r.cdusEverDry} CDUs ever dry (${Math.round(r.dryCduSeconds)} CDU-s), ${r.hallsEverDry} halls ever without water (${Math.round(r.dryHallSeconds)} hall-s)`] : []),
    `Redirects: ${r.redirects} | Matching-hat fixes: ${pct(r.matchedShare)} | Lowest load: ${pct(r.lowestFraction)}`,
    ...(r.building ? [`Score: $${Math.round(r.score).toLocaleString('en-US')}${r.sold ? ` | Sold for $${r.salePrice.toLocaleString('en-US')}` : ''} | Reached: ${r.milestone ?? 'none'}${r.commissioned ? ` (Commissioned at ${formatClock(r.commissionedAt)})` : ''}`] : []),
    ...(r.building ? [`Money: $${Math.round(r.earned).toLocaleString('en-US')} earned, $${Math.round(r.spent).toLocaleString('en-US')} spent, $${Math.round(r.burned).toLocaleString('en-US')} burned${r.uptime > 0 ? ` (uptime bonuses $${Math.round(r.uptime).toLocaleString('en-US')})` : ''}${r.credits > 0 ? ` (service credits $${Math.round(r.credits).toLocaleString('en-US')})` : ''}${r.bankrupt ? (r.brokeOnCredits ? ' | Went broke: service credits' : ' | Went broke') : ''} | Devices built: ${r.built}${loanText(r) ? ` | ${loanText(r)}` : ''}`] : []),
    `Tuning: ${r.tuning.length > 0 ? r.tuning.join(', ') : 'defaults'}`,
  ].join('\n');
}
