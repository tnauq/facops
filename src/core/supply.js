// What the pumps supply (pass 6 spec 4.1, M39). Pure rules: no DOM, no Math.random().
//
// Building mode only. Each loop is one header for the whole campus, so the running pumps of both
// plants count together:
//   - Glycol: each running glycol pump feeds `cdusPerGlycolPump` CDUs. With more built CDUs than
//     that, the extra CDUs go dry, farthest from the pumps first.
//   - Water: each running water pump serves `hallsPerWaterPump` online halls. With more than that,
//     the extra halls lose their water, farthest first, and run at `noWaterFactor`.
// "Farthest" is from the hall's centre to the lane of the nearest plant with a running pump of that
// kind. Ties: the higher-numbered hall first; within a hall, the bottom CDU before the top.
// A pump in overpressure has stopped (owner, 16 Nov). Glycol pumps also carry chillers (game2.js).

import { EQUIPMENT, HALLS, PLANTS } from './layout2.js';
import { buildingOn, hallOnline, isBuilt } from './sites.js';

const PUMPS = EQUIPMENT.filter((e) => e.type === 'pump');
const CDUS = EQUIPMENT.filter((e) => e.type === 'cdu');

/**
 * Is this pump running? Built and not in overpressure. `change` (optional) tries a what-if: { fix }
 * treats that pump as running, { stop } as stopped.
 */
export function pumpRunning(state, pump, change = {}) {
  if (pump.id === change.stop) return false;
  if (!isBuilt(state, pump.id)) return false;
  return !state.equip[pump.id].overpressure || pump.id === change.fix;
}

/** Running pumps of one kind at each plant: { A, B }. */
export function runningPumps(state, loop, change = {}) {
  const out = { A: 0, B: 0 };
  for (const p of PUMPS) if (p.loop === loop && pumpRunning(state, p, change)) out[p.plant] += 1;
  return out;
}

// Distance from a hall to the nearest plant with running pumps (Infinity when none run).
function distance(hallId, running) {
  let d = Infinity;
  for (const plant of ['A', 'B']) if (running[plant] > 0) d = Math.min(d, Math.abs(HALLS[hallId].cx - PLANTS[plant].lane));
  return d;
}

// Nearest first; ties to the lower-numbered hall, then the top CDU, so the far end of the list is
// what goes first.
const byNearest = (a, b) => a.d - b.d || a.hall - b.hall || (a.half === b.half ? 0 : a.half === 't' ? -1 : 1);

/**
 * The supply now (or with a what-if `change`): { dryCdus: Set of CDU ids without glycol, dryHalls:
 * Set of hall ids without water, glycol: { A, B, cap, built }, water: { A, B, cap, online } }.
 * Nothing is ever dry in the classic game.
 */
export function supply(state, change = {}) {
  const dryCdus = new Set();
  const dryHalls = new Set();
  if (!buildingOn(state)) return { dryCdus, dryHalls, glycol: null, water: null };
  const cfg = state.config.building.pumps;
  const g = runningPumps(state, 'glycol', change);
  const w = runningPumps(state, 'water', change);
  const cdus = CDUS.filter((c) => isBuilt(state, c.id)).map((c) => ({ id: c.id, hall: c.hall, half: c.half, d: distance(c.hall, g) })).sort(byNearest);
  const gCap = cfg.cdusPerGlycolPump * (g.A + g.B);
  cdus.slice(gCap).forEach((c) => dryCdus.add(c.id));
  const halls = Object.keys(HALLS).map(Number).filter((h) => hallOnline(state, h)).map((h) => ({ hall: h, half: 't', d: distance(h, w) })).sort(byNearest);
  const wCap = cfg.hallsPerWaterPump * (w.A + w.B);
  halls.slice(wCap).forEach((h) => dryHalls.add(h.hall));
  return {
    dryCdus,
    dryHalls,
    glycol: { ...g, cap: gCap, built: cdus.length },
    water: { ...w, cap: wCap, online: halls.length },
  };
}

/** Has this CDU got glycol? (Always, in the classic game.) Uses the supply worked out this step. */
export const glycolFed = (state, cduId) => !(state.supply && state.supply.dryCdus.has(cduId));

/** Has this hall got water? (Always, in the classic game.) */
export const waterFed = (state, hallId) => !(state.supply && state.supply.dryHalls.has(hallId));
