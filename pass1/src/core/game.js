// FacOps pass 1 rules engine. Pure logic: no DOM, no timers, no Math.random().
// The spec (docs/pass1-spec.md) is the source of truth for every rule in this file.
//
// Typical use:
//   const game = createGame({ seed: 7 });
//   step(game, 0.05);                 // advance the rules by 50 ms
//   assign(game, 'tech-0', alarmId);  // two-tap dispatch or redirect
//   dispatch(game, alarmId);          // one-tap dispatch
//   const events = game.events.splice(0); // drain what happened, for drawing and sound

import { ALARMS, DEFAULT_CONFIG, makeConfig } from './config.js';
import { createRng } from './rng.js';
import { EQUIPMENT, EQUIPMENT_BY_ID, HALLS, START_POINT, route } from './layout.js';

const EPS = 1e-9;
const RACKS = EQUIPMENT.filter((e) => e.type === 'rack');
const CDUS = EQUIPMENT.filter((e) => e.type === 'cdu');
const MSBS = EQUIPMENT.filter((e) => e.type === 'msb');
const CHILLERS = EQUIPMENT.filter((e) => e.type === 'chiller');
const PUMPS = EQUIPMENT.filter((e) => e.type === 'pump');

// ---------------------------------------------------------------- creation

export function createGame({ seed = 1, config = {} } = {}) {
  const cfg = makeConfig(config);
  const equip = {};
  for (const e of EQUIPMENT) {
    const dyn = { alarmId: null };
    if (e.type === 'rack') Object.assign(dyn, { netDown: false, level: 1 });
    if (e.type === 'cdu') dyn.leak = 0; // 0 none, 1 throttling the row, 2 row shut down
    if (e.type === 'msb') dyn.tripped = false;
    if (e.type === 'chiller') dyn.running = true;
    if (e.type === 'pump') dyn.overpressure = false;
    equip[e.id] = dyn;
  }
  const techs = cfg.crew.map((trade, index) => ({
    id: `tech-${index}`,
    index,
    trade,
    x: START_POINT.x,
    y: START_POINT.y,
    state: 'idle', // idle | walking | fixing
    alarmId: null,
    path: [],
    leg: 0,
  }));
  return {
    seed,
    config: cfg,
    rng: createRng(seed),
    t: 0,
    over: false,
    overReason: null,
    equip,
    thermal: 1, // campus cooling factor, 0..1
    alarms: [], // active alarms only
    nextAlarmId: 1,
    techs,
    meter: cfg.meter.start,
    band: 'green',
    hallDark: Object.fromEntries(Object.keys(HALLS).map((h) => [h, false])),
    director: { nextSpawn: cfg.director.firstSpawn, nextWave: cfg.director.waveEvery },
    stats: {
      energyMwh: 0,
      possibleMwh: 0,
      bandTime: { green: 0, yellow: 0, red: 0 },
      spawned: 0, // raised by the director
      escalationSpawns: 0, // raised by an ignored alarm
      cleared: 0,
      clearTimeSum: 0,
      longestAlarm: 0,
      matchedFixes: 0,
      redirects: 0,
      hallDark: 0,
      rowShutdowns: 0,
      spreads: 0,
      bursts: 0,
      secondChillers: 0,
      lowestFraction: 1,
      peakAlarms: 0,
    },
    events: [],
  };
}

// ---------------------------------------------------------------- queries

export const getAlarm = (state, alarmId) => state.alarms.find((a) => a.id === alarmId) ?? null;
export const getTech = (state, techId) => state.techs.find((t) => t.id === techId) ?? null;

/** Both switchboard sides of a hall are tripped. */
export function isHallDark(state, hallId) {
  return state.equip[`msb-${hallId}-A`].tripped && state.equip[`msb-${hallId}-B`].tripped;
}

/** 'whole' | 'cracked' | 'broken' for a hall's power (A and B sides). */
export function powerShield(state, hallId) {
  const a = state.equip[`msb-${hallId}-A`].tripped;
  const b = state.equip[`msb-${hallId}-B`].tripped;
  if (a && b) return 'broken';
  return a || b ? 'cracked' : 'whole';
}

/** 'whole' | 'cracked' | 'broken' for campus cooling (3 chillers, 2 needed). */
export function coolingShield(state) {
  const running = runningChillers(state);
  if (running >= CHILLERS.length) return 'whole';
  return running >= state.config.chillersNeeded ? 'cracked' : 'broken';
}

function runningChillers(state) {
  return CHILLERS.filter((c) => state.equip[c.id].running).length;
}

function rackTarget(state, rack) {
  const dyn = state.equip[rack.id];
  if (dyn.netDown || state.hallDark[rack.hall]) return 0;
  const leak = state.equip[`cdu-${rack.hall}-${rack.row}`].leak;
  if (leak === 2) return 0;
  return leak === 1 ? state.config.leakThrottle : 1;
}

export function bandOf(fraction, config = DEFAULT_CONFIG) {
  if (fraction >= config.band.green - EPS) return 'green';
  return fraction < config.band.red - EPS ? 'red' : 'yellow';
}

/** Live load: { deliveredMw, capacityMw, fraction, band }. */
export function gw(state) {
  const capacityMw = RACKS.length * state.config.rackMw;
  let deliveredMw = 0;
  for (const rack of RACKS) deliveredMw += state.equip[rack.id].level * state.thermal * state.config.rackMw;
  const fraction = deliveredMw / capacityMw;
  return { deliveredMw, capacityMw, fraction, band: bandOf(fraction, state.config) };
}

/** Seconds a given trade needs for a given alarm type. */
export function fixDuration(state, alarmType, trade) {
  const def = ALARMS[alarmType];
  return def.fixTime * (def.trade === trade ? 1 - state.config.tradeBonus : 1);
}

/** Everything the screen needs to draw one alarm. */
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
    trade: def.trade, // the hat that fixes it fastest
    clockTotal: total,
    clockLeft: left, // Infinity once the alarm has done its worst
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

/** Walking distance from a tech to an alarm's service point, in world units. */
export function walkDistance(state, tech, alarm) {
  const e = EQUIPMENT_BY_ID[alarm.equipId];
  return route({ x: tech.x, y: tech.y }, { x: e.sx, y: e.sy }).length;
}

/** The idle tech with the shortest walk to the alarm, or null. Ties go to the lower crew index. */
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
  if (type === 'leak') dyn.leak = 1;
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
    progress: 0, // 0..1
    holdUntil: null, // a dropped job keeps its progress until this time
    queuedAt: null, // one-tap: waiting for the next free tech
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

/**
 * Raise a specific alarm by hand: for tests, a scripted tutorial, or a debug button.
 * Returns the alarm, or null if that equipment already has one.
 */
export function raiseAlarm(state, type, equipId) {
  if (!ALARMS[type]) throw new Error(`Unknown alarm type: ${type}`);
  if (!EQUIPMENT_BY_ID[equipId] || EQUIPMENT_BY_ID[equipId].type !== ALARMS[type].equipment) {
    throw new Error(`${type} alarms belong on ${ALARMS[type].equipment} equipment, not ${equipId}`);
  }
  return spawnAlarm(state, type, equipId, 'script');
}

/** Equipment the director may pick for a new alarm of this type (includes the mercy rules). */
export function eligibleEquipment(state, type) {
  const free = (e) => state.equip[e.id].alarmId === null;
  switch (type) {
    case 'network':
      return RACKS.filter((e) => free(e) && !state.equip[e.id].netDown);
    case 'leak':
      return CDUS.filter((e) => free(e) && state.equip[e.id].leak === 0);
    case 'breaker':
      // Mercy: the director never trips a side while the hall's other side is already down.
      return MSBS.filter((e) => {
        const other = state.equip[`msb-${e.hall}-${e.side === 'A' ? 'B' : 'A'}`];
        return free(e) && !state.equip[e.id].tripped && !other.tripped;
      });
    case 'chiller':
      // Mercy: the director never trips a second chiller.
      return runningChillers(state) === CHILLERS.length ? CHILLERS.filter(free) : [];
    case 'pump':
      return PUMPS.filter(free);
    default:
      return [];
  }
}

function removeAlarm(state, alarm) {
  state.equip[alarm.equipId].alarmId = null;
  state.alarms = state.alarms.filter((a) => a !== alarm);
  if (alarm.techId) {
    const tech = getTech(state, alarm.techId);
    if (tech && tech.alarmId === alarm.id) {
      tech.state = 'idle';
      tech.alarmId = null;
      tech.path = [];
      tech.leg = 0;
    }
  }
  const age = state.t - alarm.born;
  state.stats.longestAlarm = Math.max(state.stats.longestAlarm, age);
  return age;
}

function clearAlarm(state, alarm, tech) {
  const dyn = state.equip[alarm.equipId];
  if (alarm.type === 'network') dyn.netDown = false;
  if (alarm.type === 'leak') dyn.leak = 0;
  if (alarm.type === 'breaker') dyn.tripped = false;
  if (alarm.type === 'chiller') dyn.running = true;
  if (alarm.type === 'pump') dyn.overpressure = false;
  const age = removeAlarm(state, alarm);
  state.stats.cleared += 1;
  state.stats.clearTimeSum += age;
  if (tech && ALARMS[alarm.type].trade === tech.trade) state.stats.matchedFixes += 1;
  emit(state, 'clear', { alarmId: alarm.id, alarmType: alarm.type, equipId: alarm.equipId, techId: tech ? tech.id : null });
}

// What happens when an alarm's clock runs out. See the "If ignored" column in the spec.
function escalate(state, alarm) {
  const eq = EQUIPMENT_BY_ID[alarm.equipId];
  const clock = ALARMS[alarm.type].clock * state.config.clockScale;
  switch (alarm.type) {
    case 'network': {
      const neighbors = [eq.idx - 1, eq.idx + 1]
        .filter((i) => i >= 0 && i < 5)
        .map((i) => `rack-${eq.hall}-${eq.row}-${i}`)
        .filter((id) => !state.equip[id].netDown && state.equip[id].alarmId === null);
      if (neighbors.length > 0) {
        const target = state.rng.pick(neighbors);
        spawnAlarm(state, 'network', target, 'escalation');
        state.stats.spreads += 1;
        emit(state, 'escalate', { alarmId: alarm.id, alarmType: 'network', equipId: alarm.equipId, effect: 'spread', target });
      }
      alarm.clockEnd = state.t + clock; // keeps spreading every clock period
      break;
    }
    case 'leak':
      state.equip[alarm.equipId].leak = 2;
      alarm.clockEnd = Infinity;
      state.stats.rowShutdowns += 1;
      emit(state, 'escalate', { alarmId: alarm.id, alarmType: 'leak', equipId: alarm.equipId, effect: 'rowShutdown' });
      break;
    case 'breaker': {
      const otherId = `msb-${eq.hall}-${eq.side === 'A' ? 'B' : 'A'}`;
      alarm.clockEnd = Infinity;
      if (!state.equip[otherId].tripped) {
        spawnAlarm(state, 'breaker', otherId, 'escalation');
        emit(state, 'escalate', { alarmId: alarm.id, alarmType: 'breaker', equipId: alarm.equipId, effect: 'secondSide', target: otherId });
      }
      break;
    }
    case 'chiller': {
      alarm.clockEnd = Infinity;
      const candidates = CHILLERS.filter((c) => state.equip[c.id].running && state.equip[c.id].alarmId === null).map((c) => c.id);
      if (candidates.length > 0) {
        const target = state.rng.pick(candidates);
        spawnAlarm(state, 'chiller', target, 'escalation');
        state.stats.secondChillers += 1;
        emit(state, 'escalate', { alarmId: alarm.id, alarmType: 'chiller', equipId: alarm.equipId, effect: 'secondChiller', target });
      }
      break;
    }
    case 'pump': {
      // The loop bursts: leaks appear on that loop's CDUs and the pump alarm ends by itself.
      const pool = CDUS.filter((c) => HALLS[c.hall].loop === eq.loop && state.equip[c.id].leak === 0 && state.equip[c.id].alarmId === null).map((c) => c.id);
      const targets = [];
      while (targets.length < state.config.burstLeaks && pool.length > 0) {
        const pickIndex = Math.floor(state.rng.next() * pool.length);
        targets.push(pool.splice(pickIndex, 1)[0]);
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

/** Seconds between director spawns at time t, before jitter. */
export function spawnInterval(config, t) {
  const d = config.director;
  const steps = Math.floor(t / d.tightenEvery + EPS);
  return Math.max(d.floor, d.startInterval * Math.pow(1 - d.tighten, steps));
}

/** Largest number of active alarms at which the director still spawns one more. */
export function alarmCap(config, t) {
  const d = config.director;
  const growth = t >= d.capGrowAfter ? Math.floor((t - d.capGrowAfter) / d.capGrowEvery + EPS) : 0;
  return config.crew.length + d.capExtra + growth;
}

function directorSpawnOne(state) {
  if (state.alarms.length >= alarmCap(state.config, state.t)) return null;
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
  if (!d.enabled) return;
  if (state.t >= state.director.nextSpawn - EPS) {
    directorSpawnOne(state);
    const base = spawnInterval(state.config, state.t);
    state.director.nextSpawn = state.t + base * (1 + d.jitter * state.rng.range(-1, 1));
  }
  if (d.waveEvery > 0 && state.t >= state.director.nextWave - EPS) {
    for (let i = 0; i < d.waveSize; i++) directorSpawnOne(state);
    state.director.nextWave = state.t + d.waveEvery * (1 + d.waveJitter * state.rng.range(-1, 1));
  }
}

// ---------------------------------------------------------------- commands

function freeTech(tech) {
  tech.state = 'idle';
  tech.alarmId = null;
  tech.path = [];
  tech.leg = 0;
}

/**
 * Two-tap dispatch, and redirect. Sends `techId` to `alarmId`.
 * A busy tech drops its current job (which keeps its progress for config.progressHold seconds).
 * If another tech was on the alarm, that tech goes idle and the progress carries over.
 * Returns { ok: true } or { ok: false, reason }.
 */
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
      old.holdUntil = state.t + state.config.progressHold;
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

/**
 * One-tap dispatch. Sends the nearest idle tech to the alarm.
 * With config.oneTap on and nobody idle, the alarm is queued for the next tech to come free.
 * Returns { ok: true, techId } | { ok: true, queued: true } | { ok: false, reason }.
 */
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
  let budget = state.config.walkSpeed * dt;
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

/** Advance the rules by dt seconds. Keep dt at or below 0.1; the game loop uses a fixed 0.05. */
export function step(state, dt) {
  if (state.over || !(dt > 0)) return state;
  state.t += dt;

  directorStep(state);

  // Clocks. A clock stands still while a tech is on site fixing the alarm.
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

  // Cooling: drifts toward its target at thermalRate per second.
  const running = runningChillers(state);
  const target = running >= state.config.chillersNeeded ? 1 : running === 1 ? state.config.thermalOneChiller : 0;
  const drift = state.config.thermalRate * dt;
  if (state.thermal < target) state.thermal = Math.min(target, state.thermal + drift);
  else if (state.thermal > target) state.thermal = Math.max(target, state.thermal - drift);

  // Techs walk, then fix.
  for (const tech of state.techs) {
    if (tech.state === 'walking') {
      moveTech(state, tech, dt);
    } else if (tech.state === 'fixing') {
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

  // Halls going dark or coming back.
  for (const hallId of Object.keys(HALLS)) {
    const dark = isHallDark(state, hallId);
    if (dark !== state.hallDark[hallId]) {
      state.hallDark[hallId] = dark;
      if (dark) state.stats.hallDark += 1;
      emit(state, dark ? 'hallDark' : 'hallRestored', { hall: Number(hallId) });
    }
  }

  // Racks drop at once and climb back over recoverTime.
  for (const rack of RACKS) {
    const dyn = state.equip[rack.id];
    const want = rackTarget(state, rack);
    dyn.level = dyn.level > want ? want : Math.min(want, dyn.level + dt / state.config.recoverTime);
  }

  // Load, band, Stability meter, score.
  const load = gw(state);
  if (load.band !== state.band) {
    emit(state, 'band', { from: state.band, to: load.band });
    state.band = load.band;
  }
  const m = state.config.meter;
  if (load.band === 'green') state.meter = Math.min(m.max, state.meter + m.fill * dt);
  else if (load.band === 'yellow') state.meter -= m.yellowDrain * dt;
  else state.meter -= m.redDrain * dt;

  const hours = (dt * state.config.timeScale) / 3600;
  state.stats.energyMwh += load.deliveredMw * hours;
  state.stats.possibleMwh += load.capacityMw * hours;
  state.stats.bandTime[load.band] += dt;
  state.stats.lowestFraction = Math.min(state.stats.lowestFraction, load.fraction);

  if (state.meter <= EPS) {
    state.meter = 0;
    state.over = true;
    state.overReason = 'stability';
    emit(state, 'over', { reason: 'stability' });
  }
  return state;
}

/** Advance by `seconds` in fixed ticks. Handy for tests and scripted players. */
export function advance(state, seconds, dt = 0.05) {
  const ticks = Math.round(seconds / dt);
  for (let i = 0; i < ticks && !state.over; i++) step(state, dt);
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
  walk(config, DEFAULT_CONFIG, '');
  return out;
}

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
    rowShutdowns: s.rowShutdowns,
    hallDark: s.hallDark,
    spreads: s.spreads,
    bursts: s.bursts,
    secondChillers: s.secondChillers,
    lowestFraction: s.lowestFraction,
    peakAlarms: s.peakAlarms,
    tuning: changedTuning(state.config),
  };
}

/** Seconds as m:ss. The small nudge hides floating-point drift from adding many 0.05 s ticks. */
export function formatClock(seconds) {
  const whole = Math.floor(seconds + 1e-6);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}
const pct = (v) => `${Math.round(v * 100)}%`;

/** Plain text for the Copy button, so a run can be pasted into a chat. */
export function resultsText(state) {
  const r = results(state);
  return [
    'FacOps pass 1 results',
    `Mode: ${r.mode} | Seed: ${r.seed}`,
    `Survived: ${formatClock(r.seconds)}`,
    `Delivered: ${r.energyGwh.toFixed(2)} GWh (${pct(r.shareOfPossible)} of possible)`,
    `Time in green / yellow / red: ${pct(r.green)} / ${pct(r.yellow)} / ${pct(r.red)}`,
    `Alarms: ${r.raised} raised, ${r.cleared} cleared, average ${r.averageClear.toFixed(1)} s to clear, longest ${Math.round(r.longestAlarm)} s, peak ${r.peakAlarms} at once`,
    `Escalations: ${r.rowShutdowns} row shutdowns, ${r.hallDark} dark halls, ${r.spreads} network spreads, ${r.bursts} pump bursts, ${r.secondChillers} second chillers`,
    `Redirects: ${r.redirects} | Matching-hat fixes: ${pct(r.matchedShare)} | Lowest load: ${pct(r.lowestFraction)}`,
    `Tuning: ${r.tuning.length > 0 ? r.tuning.join(', ') : 'defaults'}`,
  ].join('\n');
}
