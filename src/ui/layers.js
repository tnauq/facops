// Layers (pass 8 spec 8.1, M52): Power, Cooling and Crew views over the map. Pure, screen only.
// Everything here is in world units; src/render/layers.js turns it into pixels and dims the rest.
// A layer is made of: `items` (equipment ids drawn undimmed), `links` (lines between two world
// points, each 'live', 'unbuilt' or 'failed'), and `marks` (a shield or a few words at a point).

import {
  AREAS, EQUIPMENT, EQUIPMENT_BY_ID, HALLS, MID_Y, PLANTS, POWER_LINES,
  areaName, chillersNeeded, coolantState, getAlarm, hallOnline, isBuilt, isFree, isHalfDark,
  postPoint, route, runningPumps, walkSpeed,
} from '../core/index2.js';

export const LAYERS = [null, 'power', 'cooling', 'crew'];
export const LAYER_NAME = { power: 'Power', cooling: 'Cooling', crew: 'Crew' };
export const LAYER_W = 44; // px: the Layers button, 44 x 44 at the strip's left end

/** The next layer after this one: none, Power, Cooling, Crew, none. */
export const nextLayer = (layer) => LAYERS[(LAYERS.indexOf(layer ?? null) + 1) % LAYERS.length];

/** The Layers button: at the strip's left end, 44 px square, reaching up into the map like the flag. */
export const layersTarget = (strip) => ({ x: strip.x, y: strip.y + strip.h - LAYER_W, w: LAYER_W, h: LAYER_W });

/** Narrow the strip from the left for the Layers button: returns the strip to draw and use. */
export const stripWithLayers = (strip) => ({ ...strip, x: strip.x + LAYER_W + 2, w: strip.w - LAYER_W - 2 });

const byType = (type) => EQUIPMENT.filter((e) => e.type === type);
const at = (e) => ({ x: e.x, y: e.y });
const dyn = (state, id) => state.equip[id] ?? {};

// ---------------------------------------------------------------- Power

/** Is this side of a half fed all the way from the power line? Built and working at every step. */
function sideParts(state, hall, half, side) {
  const rmu = `rmu-${hall}-${half}`;
  const xfmr = `xfmr-${hall}-${half}-${side}`;
  const msb = `msb-${hall}-${half}-${side}`;
  const rmuOk = isBuilt(state, rmu) && !dyn(state, rmu).faulted;
  const xfmrOk = rmuOk && isBuilt(state, xfmr) && !dyn(state, xfmr).shorted;
  const msbOk = xfmrOk && isBuilt(state, msb) && !dyn(state, msb).tripped;
  return { rmu, xfmr, msb, rmuOk, xfmrOk, msbOk };
}

// A link's state: not built at its far end, live when the far end works and is fed, else failed.
const linkState = (state, id, ok) => (!isBuilt(state, id) ? 'unbuilt' : ok ? 'live' : 'failed');

const halfRows = (state, hall, half) => byType('row').filter((r) => r.hall === hall && r.half === half && isBuilt(state, r.id));

/**
 * A half's power: 'backup' (both sides live), 'single' (one side live: one failure from dark),
 * 'dark' (racks and no live side), or 'none' (no racks yet, nothing to lose).
 */
export function halfPower(state, hall, half) {
  if (halfRows(state, hall, half).length === 0) return 'none';
  if (isHalfDark(state, hall, half)) return 'dark';
  const live = ['A', 'B'].filter((s) => sideParts(state, hall, half, s).msbOk).length;
  return live >= 2 ? 'backup' : live === 1 ? 'single' : 'dark';
}

// The shield shapes the marks use: backed up is whole, single is single, dark is broken.
const POWER_SHIELD = { backup: 'whole', single: 'single', dark: 'broken' };
// Backed up still hangs on the half's one RMU; single is the next to go dark.
const POWER_WORDS = { backup: '1 RMU', single: 'Next to go dark', dark: 'Dark' };

/**
 * The Power layer: every chain from the power line to the racks in each half that has anything
 * built. Each half gets a mark (its shield shape) and, on a single RMU, the words "1 RMU" when that
 * RMU is all that stands between a backed-up half and the dark. `next` lists the halves that would
 * go dark on the next failure: single halves, and any half whose one RMU is down to one live side.
 */
export function powerLayer(state) {
  const items = [];
  const links = [];
  const marks = [];
  const next = [];
  for (const hallId of Object.keys(HALLS).map(Number)) {
    for (const half of ['t', 'b']) {
      const rmuId = `rmu-${hallId}-${half}`;
      const parts = ['A', 'B'].map((s) => sideParts(state, hallId, half, s));
      const rows = halfRows(state, hallId, half);
      const anything = rows.length > 0 || isBuilt(state, rmuId) || parts.some((p) => isBuilt(state, p.xfmr) || isBuilt(state, p.msb));
      if (!anything) continue;
      const rmu = EQUIPMENT_BY_ID[rmuId];
      const line = POWER_LINES.find((l) => l.side === half);
      items.push(rmuId);
      links.push({ a: { x: rmu.x, y: line.y }, b: at(rmu), state: linkState(state, rmuId, parts[0].rmuOk) });
      for (const p of parts) {
        const x = EQUIPMENT_BY_ID[p.xfmr];
        const m = EQUIPMENT_BY_ID[p.msb];
        items.push(p.xfmr, p.msb);
        links.push({ a: at(rmu), b: at(x), state: linkState(state, p.xfmr, p.xfmrOk) });
        links.push({ a: at(x), b: at(m), state: linkState(state, p.msb, p.msbOk) });
        // The switchboard feeds every rack row in its half: one line to each built row.
        for (const r of rows) links.push({ a: at(m), b: at(r), state: p.msbOk ? 'live' : isBuilt(state, p.msb) ? 'failed' : 'unbuilt' });
      }
      for (const r of rows) items.push(r.id);
      const status = halfPower(state, hallId, half);
      if (status === 'none') continue;
      const hall = HALLS[hallId];
      // In the middle aisle, just above or below the centre line, clear of the racks.
      const y = half === 't' ? MID_Y - 34 : MID_Y + 34;
      marks.push({ x: hall.cx, y, shield: POWER_SHIELD[status], text: POWER_WORDS[status], hall: hallId, half });
      if (status === 'single') next.push({ hall: hallId, half });
    }
  }
  return { items, links, marks, next };
}

// ---------------------------------------------------------------- Cooling

/**
 * Counts by plant: chillers { running, built }, dry coolers { working, built }, glycol and water
 * pumps { running, built }. The campus needs `needed` chillers in all; `spare` is running beyond that.
 */
export function coolingCounts(state) {
  const plant = (p) => {
    const mine = (type, extra = () => true) => byType(type).filter((e) => e.plant === p && extra(e) && isBuilt(state, e.id));
    const chillers = mine('chiller');
    const dry = mine('dry');
    return {
      chillers: { running: chillers.filter((c) => dyn(state, c.id).running).length, built: chillers.length },
      dry: { working: dry.filter((d) => !dyn(state, d.id).stopped).length, built: dry.length },
      glycol: { running: runningPumps(state, 'glycol')[p], built: mine('pump', (e) => e.loop === 'glycol').length },
      water: { running: runningPumps(state, 'water')[p], built: mine('pump', (e) => e.loop === 'water').length },
    };
  };
  const A = plant('A');
  const B = plant('B');
  const needed = chillersNeeded(state);
  return { A, B, needed, spare: A.chillers.running + B.chillers.running - needed };
}

/**
 * The Cooling layer: dry coolers, chillers, both kinds of pump and the CDUs undimmed; counts by each
 * plant; a 'single' shield on halls with one coolant unit, 'broken' with a dry CDU or no water.
 */
export function coolingLayer(state) {
  const items = EQUIPMENT.filter((e) => ['dry', 'chiller', 'pump', 'cdu'].includes(e.type) && isBuilt(state, e.id)).map((e) => e.id);
  const counts = coolingCounts(state);
  const sup = state.supply;
  const marks = [];
  const spare = counts.spare < 0 ? `${-counts.spare} short` : `${counts.spare} spare`;
  for (const p of ['A', 'B']) {
    const c = counts[p];
    if (c.chillers.built + c.dry.built + c.glycol.built + c.water.built === 0) continue;
    const plant = PLANTS[p];
    // On the plant's lane below its techs; the campus's need and spare go with Plant A's counts.
    marks.push({ x: plant.lane, y: MID_Y + 120, shield: null, lines: [
      `Chillers ${c.chillers.running} of ${c.chillers.built}`,
      `Dry coolers ${c.dry.working} of ${c.dry.built}`,
      `Pumps ${c.glycol.running} glycol, ${c.water.running} water`,
      ...(p === 'A' ? [`Campus needs ${counts.needed} · ${spare}`] : []),
    ] });
  }
  for (const hallId of Object.keys(HALLS).map(Number)) {
    if (!hallOnline(state, hallId)) continue;
    const cdus = byType('cdu').filter((c) => c.hall === hallId && isBuilt(state, c.id));
    const dryCdus = sup ? cdus.filter((c) => sup.dryCdus.has(c.id)).length : 0;
    const noWater = Boolean(sup && sup.dryHalls.has(hallId));
    const shut = coolantState(state, hallId) === 'shut';
    const words = [noWater && 'No water', dryCdus > 0 && `${dryCdus} CDU dry`, cdus.length === 1 && '1 CDU'].filter(Boolean);
    if (words.length === 0) continue;
    const hall = HALLS[hallId];
    marks.push({ x: hall.cx, y: hall.y + hall.h / 2, shield: noWater || dryCdus > 0 || shut ? 'broken' : 'single', text: words.join(' · '), hall: hallId });
  }
  return { items, links: [], marks, counts };
}

// ---------------------------------------------------------------- Crew

/** Seconds the free tech nearest this point would take to walk there, or null with nobody free. */
export function nearestFreeSeconds(state, point) {
  let best = null;
  for (const t of state.techs) {
    if (!isFree(t)) continue;
    const d = route({ x: t.x, y: t.y }, point).length;
    if (best === null || d < best) best = d;
  }
  return best === null ? null : best / walkSpeed(state);
}

/**
 * The Crew layer: each tech's post (a line from where it stands to the post) and the route it is
 * walking; open warnings undimmed; and in every area in play, how long the nearest free tech would
 * take to reach it ("0:12", or "nobody free").
 */
export function crewLayer(state) {
  const items = (state.warnings ?? []).map((w) => w.equipId);
  const links = [];
  const marks = [];
  for (const t of state.techs) {
    // The route still to walk: from where the tech stands through the points it has not reached.
    if (t.path && t.leg < t.path.length) {
      const pts = [{ x: t.x, y: t.y }, ...t.path.slice(t.leg)];
      for (let i = 0; i + 1 < pts.length; i++) links.push({ a: pts[i], b: pts[i + 1], state: 'route', trade: t.trade });
    }
    if (t.post) links.push({ a: { x: t.x, y: t.y }, b: postPoint(t.post), state: 'post', trade: t.trade });
    if (t.alarmId !== null && t.alarmId !== undefined) {
      const alarm = getAlarm(state, t.alarmId);
      if (alarm) items.push(alarm.equipId);
    }
  }
  for (const area of AREAS) {
    const inPlay = area[0] === 'p' ? area === 'pA' || EQUIPMENT.some((e) => e.plant === 'B' && isBuilt(state, e.id)) : hallOnline(state, Number(area.slice(1)));
    if (!inPlay) continue;
    const p = postPoint(area);
    const s = nearestFreeSeconds(state, p);
    const posted = state.techs.filter((t) => t.post === area).length;
    // Above the post, where the techs stand, so the words never cover them.
    marks.push({ x: p.x, y: p.y - 90, shield: null, text: s === null ? 'Nobody free' : `${clock(s)} away`, sub: posted ? `${posted} posted` : null, area, name: areaName(area) });
  }
  return { items, links, marks };
}

const clock = (s) => {
  const r = Math.ceil(s);
  return `${Math.floor(r / 60)}:${String(r % 60).padStart(2, '0')}`;
};

/** The layer's model, or null with no layer on. */
export function layerModel(state, layer) {
  if (layer === 'power') return powerLayer(state);
  if (layer === 'cooling') return coolingLayer(state);
  if (layer === 'crew') return crewLayer(state);
  return null;
}
