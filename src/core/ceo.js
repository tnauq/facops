// The CEO's visits (pass 3 spec, sections 4.1 to 4.3). Pure rules: no DOM, no Math.random().
//
// A visit is announced with a warning, then the CEO walks a route of areas along the same lanes as
// the crew, inspecting each area (facing the top half, then the bottom), and leaves. Anything in
// the CEO's view cone that is not being fixed by a tech on site is a sighting: it costs the visit's
// Stability hit, or, under zero tolerance, ends the run. Each alarm costs at most once per visit.
//
// game2.js owns the state; it calls ceoStep every tick and queueCeoVisit when a hall comes online.

import { CORRIDOR_TOP, EQUIPMENT, EQUIPMENT_BY_ID, HALLS, MID_Y, PLANTS, S_OUTER, hallX, route } from './layout2.js';

const EPS = 1e-9;
const UP = -Math.PI / 2; // y grows downwards
const DOWN = Math.PI / 2;

// ---------------------------------------------------------------- areas

/** The area a piece of equipment is in: 'h3' for hall 3, 'pA' for Plant A. */
export const areaOf = (e) => (e.hall ? `h${e.hall}` : `p${e.plant}`);

/** Online areas in order along the building: Plant A, halls 1 to N, then Plant B once online. */
export function onlineAreas(state) {
  const out = ['pA'];
  for (let h = 1; h <= state.halls; h++) out.push(`h${h}`);
  if (state.halls >= state.config.plantBHall) out.push('pB');
  return out;
}

/** Where the CEO stands to inspect an area: a hall's centre on its middle aisle; a plant's lane. */
export function inspectPoint(area) {
  if (area[0] === 'h') {
    const row = EQUIPMENT_BY_ID[`row-${area.slice(1)}-t-1`]; // the middle column's service point
    return { x: row.sx, y: row.sy };
  }
  return { x: PLANTS[area.slice(1)].lane, y: MID_Y };
}

/** Where the CEO appears and leaves: the top corridor at the area's outer door (or plant lane). */
export function entryPoint(area) {
  if (area[0] === 'h') return { x: hallX(HALLS[Number(area.slice(1))], S_OUTER), y: CORRIDOR_TOP };
  return { x: PLANTS[area.slice(1)].lane, y: CORRIDOR_TOP };
}

/** Short names for the banner: "Hall 4", "Plant B". */
export const areaName = (area) => (area[0] === 'h' ? `Hall ${area.slice(1)}` : `Plant ${area.slice(1)}`);

// 2 or 3 neighbouring online areas, starting from a random one (spec 4.2).
export function pickRoute(state) {
  const cfg = state.config.ceo;
  const rng = state.ceoRng;
  const all = onlineAreas(state);
  const want = Math.min(all.length, cfg.areasMin + Math.floor(rng.next() * (cfg.areasMax - cfg.areasMin + 1)));
  let start = Math.floor(rng.next() * all.length);
  let dir = rng.next() < 0.5 ? -1 : 1;
  if (start + dir * (want - 1) < 0 || start + dir * (want - 1) >= all.length) dir = -dir;
  start = Math.max(0, Math.min(start, all.length - 1));
  if (start + dir * (want - 1) < 0) start = want - 1;
  if (start + dir * (want - 1) >= all.length) start = all.length - want;
  const out = [];
  for (let i = 0; i < want; i++) out.push(all[start + dir * i]);
  return out;
}

// ---------------------------------------------------------------- the plan

// Steps: walk in, inspect each area with walks between, walk out. Every point is on the lanes.
function planSteps(areas, inspectSeconds) {
  const steps = [];
  const walk = (from, to, leaving = false) => steps.push({ kind: 'walk', points: route(from, to).points, leaving });
  walk(entryPoint(areas[0]), inspectPoint(areas[0]));
  areas.forEach((area, i) => {
    steps.push({ kind: 'inspect', area, seconds: inspectSeconds });
    if (i + 1 < areas.length) walk(inspectPoint(area), inspectPoint(areas[i + 1]));
  });
  walk(inspectPoint(areas[areas.length - 1]), entryPoint(areas[areas.length - 1]), true);
  return steps;
}

// Equipment the CEO could see from anywhere on the route: within the view radius of some point of
// the path, whichever way the CEO faces. Worked out once per visit.
const SAMPLE = 20; // world units between sample points along the path
function coverage(steps, radius) {
  const pts = [];
  for (const s of steps) {
    if (s.kind !== 'walk') continue;
    for (let i = 1; i < s.points.length; i++) {
      const a = s.points[i - 1];
      const b = s.points[i];
      const n = Math.max(1, Math.ceil((Math.abs(b.x - a.x) + Math.abs(b.y - a.y)) / SAMPLE));
      for (let k = 0; k <= n; k++) pts.push({ x: a.x + ((b.x - a.x) * k) / n, y: a.y + ((b.y - a.y) * k) / n });
    }
  }
  const covered = {};
  for (const e of EQUIPMENT) if (pts.some((p) => Math.hypot(e.x - p.x, e.y - p.y) <= radius)) covered[e.id] = true;
  return covered;
}

/** Every point of the route in order, for drawing it. */
export function routePoints(ceo) {
  const out = [];
  for (const s of ceo.steps) if (s.kind === 'walk') for (const p of s.points) out.push(p);
  return out;
}

// What the next visit of this kind is: its areas, warning, cost and zero tolerance.
function visitFor(state, kind) {
  const cfg = state.config.ceo;
  if (kind === 'ribbon') return { areas: [`h${cfg.ribbonHall}`], ...cfg.ribbon, inspect: cfg.inspect, zeroTolerance: false };
  if (kind === 'handover') {
    const areas = onlineAreas(state).filter((a) => a[0] === 'h');
    return { areas, ...cfg.handover, inspect: cfg.inspectHandover, zeroTolerance: false };
  }
  const n = state.ceoWalks + 1; // this walkthrough's number
  const walk = cfg.walks[n - 1];
  if (walk) return { areas: pickRoute(state), ...walk, inspect: cfg.inspect, zeroTolerance: false, walk: n, nextIsZeroTolerance: n === cfg.walks.length };
  const late = n - cfg.walks.length - 1; // 0 for the first zero-tolerance visit
  const warning = Math.max(cfg.ztWarningMin, cfg.ztWarning - late);
  return { areas: pickRoute(state), warning, cost: null, inspect: cfg.inspect, zeroTolerance: true, walk: n };
}

function emit(state, type, data = {}) {
  state.events.push({ t: state.t, type, ...data });
}

function startVisit(state, kind) {
  const v = visitFor(state, kind);
  if (kind === 'walk') state.ceoWalks += 1;
  const steps = planSteps(v.areas, v.inspect);
  const first = steps[0].points[0];
  state.ceo = {
    kind,
    number: state.ceoVisits + 1,
    walk: v.walk ?? null,
    areas: v.areas,
    cost: v.cost,
    zeroTolerance: v.zeroTolerance,
    nextIsZeroTolerance: Boolean(v.nextIsZeroTolerance),
    phase: 'warning',
    warningEnd: state.t + v.warning,
    steps,
    step: 0,
    leg: 1,
    stepEnd: null,
    x: first.x,
    y: first.y,
    facing: DOWN,
    covered: coverage(steps, state.config.ceo.viewRadius), // equipment id -> true if the CEO may see it
    counted: {}, // alarm id -> true once it has cost something this visit
    sightings: 0,
  };
  emit(state, 'ceoWarning', {
    kind,
    areas: v.areas,
    seconds: v.warning,
    cost: v.cost,
    zeroTolerance: v.zeroTolerance,
    nextIsZeroTolerance: Boolean(v.nextIsZeroTolerance),
  });
}

/** A hall came online (game2.js deliver): the ribbon-cutting at hall 3, the Handover at the last hall. */
export function queueCeoVisit(state, hall) {
  const cfg = state.config.ceo;
  if (!cfg.enabled) return;
  if (hall === cfg.ribbonHall) state.ceoQueue.push('ribbon');
  if (hall >= state.config.maxHalls) state.ceoQueue.push('handover');
}

// ---------------------------------------------------------------- what the CEO sees

/** { x, y, facing, radius, angle } while the CEO is walking the floor, else null. Angles in radians. */
export function ceoCone(state) {
  const c = state.ceo;
  if (!c || c.phase !== 'visit') return null;
  const cfg = state.config.ceo;
  return { x: c.x, y: c.y, facing: c.facing, radius: cfg.viewRadius, angle: (cfg.viewAngle * Math.PI) / 180 };
}

/** Is world point (x, y) inside the CEO's view cone right now? */
export function ceoSeesPoint(state, x, y) {
  const cone = ceoCone(state);
  if (!cone) return false;
  const dx = x - cone.x;
  const dy = y - cone.y;
  const d = Math.hypot(dx, dy);
  if (d > cone.radius + EPS) return false;
  if (d < EPS) return true;
  let diff = Math.atan2(dy, dx) - cone.facing;
  while (diff > Math.PI) diff -= 2 * Math.PI;
  while (diff < -Math.PI) diff += 2 * Math.PI;
  return Math.abs(diff) <= cone.angle / 2 + EPS;
}

/** Does the CEO see this piece of equipment now? */
export function ceoSees(state, equipId) {
  const e = EQUIPMENT_BY_ID[equipId];
  return Boolean(e) && ceoSeesPoint(state, e.x, e.y);
}

/**
 * Could the CEO see this equipment on the current visit (warning included)? Everything within the
 * view radius of the route counts, so the fairness rule and getting ready cover all of it.
 */
export function onCeoRoute(state, e) {
  return Boolean(state.ceo) && Boolean(state.ceo.covered[e.id]);
}

// ---------------------------------------------------------------- the tick

function move(state, c, dt) {
  const step = c.steps[c.step];
  let budget = state.config.ceo.speed * dt;
  while (budget > EPS && c.leg < step.points.length) {
    const target = step.points[c.leg];
    const dx = target.x - c.x;
    const dy = target.y - c.y;
    const dist = Math.abs(dx) + Math.abs(dy);
    if (dist > EPS) c.facing = Math.atan2(dy, dx);
    if (dist <= budget + EPS) {
      c.x = target.x;
      c.y = target.y;
      c.leg += 1;
      budget -= dist;
    } else {
      c.x += Math.sign(dx) * Math.min(Math.abs(dx), budget);
      c.y += Math.sign(dy) * Math.min(Math.abs(dy), budget);
      budget = 0;
    }
  }
  return c.leg >= step.points.length;
}

// Move to the next step; returns false when the route is finished.
function nextStep(state, c) {
  c.step += 1;
  c.leg = 1;
  c.stepEnd = null;
  return c.step < c.steps.length;
}

function attended(state, alarm) {
  if (!alarm.techId) return false;
  const tech = state.techs.find((t) => t.id === alarm.techId);
  return Boolean(tech && tech.state === 'fixing' && tech.alarmId === alarm.id);
}

function endRun(state) {
  state.meter = Math.max(0, state.meter);
  state.over = true;
  state.overReason = 'ceo';
  emit(state, 'over', { reason: 'ceo' });
}

function judge(state, c) {
  for (const alarm of state.alarms) {
    if (c.counted[alarm.id] || attended(state, alarm) || !ceoSees(state, alarm.equipId)) continue;
    c.counted[alarm.id] = true;
    c.sightings += 1;
    state.stats.ceoSightings += 1;
    emit(state, 'ceoSighting', { alarmId: alarm.id, alarmType: alarm.type, equipId: alarm.equipId, cost: c.cost, zeroTolerance: c.zeroTolerance });
    if (c.zeroTolerance) {
      endRun(state);
      return;
    }
    state.meter -= c.cost;
    if (state.meter <= EPS) {
      endRun(state);
      return;
    }
  }
}

function finish(state, c) {
  state.ceo = null;
  state.ceoVisits += 1;
  emit(state, 'ceoLeave', { kind: c.kind, sightings: c.sightings });
  // Walkthroughs follow the Handover, and each other, after a seeded gap.
  if (c.kind === 'handover' || c.kind === 'walk') {
    const [lo, hi] = state.config.ceo.gap;
    state.ceoNext = { at: state.t + state.ceoRng.range(lo, hi), kind: 'walk' };
  }
}

/** Advance the CEO by dt seconds. Called by game2.js step, after the meter has been updated. */
export function ceoStep(state, dt) {
  const cfg = state.config.ceo;
  if (!cfg.enabled || state.scripted || state.over) return;
  if (!state.ceo) {
    if (state.ceoQueue.length > 0) startVisit(state, state.ceoQueue.shift());
    else if (state.ceoNext && state.t >= state.ceoNext.at - EPS) {
      const { kind } = state.ceoNext;
      state.ceoNext = null;
      startVisit(state, kind);
    } else return;
  }
  const c = state.ceo;
  if (c.phase === 'warning') {
    if (state.t < c.warningEnd - EPS) return;
    c.phase = 'visit';
    emit(state, 'ceoArrive', { kind: c.kind, areas: c.areas });
  }
  const step = c.steps[c.step];
  if (step.kind === 'walk') {
    if (move(state, c, dt) && !nextStep(state, c)) {
      finish(state, c);
      return;
    }
  } else {
    if (c.stepEnd === null) c.stepEnd = state.t + step.seconds;
    // First half facing the top of the hall, second half the bottom.
    c.facing = state.t < c.stepEnd - step.seconds / 2 ? UP : DOWN;
    if (state.t >= c.stepEnd - EPS) nextStep(state, c);
  }
  if (state.ceo) judge(state, c);
}
