// The chilled-water pipes (M19, at the owner's request). Pure: where every pipe runs, in world units.
//
// The pipes run overhead. Each plant: a riser beside the outer column of chillers between its top
// and bottom pumps, a second riser beside the inner column, and a branch to every chiller. Two
// headers run the length of the building, at y = 125 and 655, between the corridors and the halls.
// Where a pipe meets a unit it slopes down to it (height 1 overhead, 0 at the unit): at each chiller,
// and at each pump's discharge. Each CDU is fed by a short vertical drop off its header (a "tap").
// Pieces over a walkway are marked so the screen can fade them while someone walks underneath.
// Drawing only: the rules do not use pipes.

import { EQUIPMENT, HALLS, LANES, PLANTS, WORLD } from '../core/index2.js';

export const HEADER_Y = { t: 125, b: 655 };
// In line with the pumps' discharge (x = 50 + 15.5: see PUMP_DISCHARGE_X in src/render/icons.js),
// between the pumps and the outer chillers (x = 100 to 200).
const OUTER_RISER = 65.5;
const INNER_RISER = 445; // between the inner chillers (x = 320 to 420) and hall 1 (x = 480)
const CHILLER_HALF_W = 50;
const PUMP_Y = { t: 40, b: 740 };
const DISCHARGE_TIP = 32; // the discharge stub ends this far from the pump's centre (size 80)
export const INCLINE = 26; // world units over which a pipe slopes from overhead down to its unit
export const WALK_HALF = 11; // half a walkway's width, as drawn in src/render/campus2.js

const mirror = (x) => WORLD.width - x;

/**
 * Pipe runs: [{ x1, y1, x2, y2, plant, kind, drop }] where plant is 'A' or 'B' (null for the
 * headers), kind is 'riser', 'branch' or 'header', and drop says which ends slope down to a unit:
 * 'start', 'end', 'both' or null. Every run is horizontal or vertical; x1 <= x2 and y1 <= y2.
 */
export function pipeRuns() {
  const runs = [];
  for (const plant of Object.values(PLANTS)) {
    const fx = plant.id === 'A' ? (x) => x : mirror;
    const p = plant.id;
    // The outer riser ends on each pump's discharge.
    runs.push({ x1: fx(OUTER_RISER), y1: PUMP_Y.t + DISCHARGE_TIP, x2: fx(OUTER_RISER), y2: PUMP_Y.b - DISCHARGE_TIP, plant: p, kind: 'riser', drop: 'both' });
    runs.push({ x1: fx(INNER_RISER), y1: HEADER_Y.t, x2: fx(INNER_RISER), y2: HEADER_Y.b, plant: p, kind: 'riser', drop: null });
    for (const c of EQUIPMENT.filter((e) => e.type === 'chiller' && e.plant === p)) {
      // Outer column to the outer riser, inner column to the inner riser; the chiller end slopes down.
      const outer = Math.abs(c.x - fx(PLANTS.A.cols[1])) < 1;
      const riser = fx(outer ? OUTER_RISER : INNER_RISER);
      const edge = c.x + (riser < c.x ? -CHILLER_HALF_W : CHILLER_HALF_W);
      runs.push({ x1: Math.min(riser, edge), y1: c.y, x2: Math.max(riser, edge), y2: c.y, plant: p, kind: 'branch', drop: edge < riser ? 'start' : 'end' });
    }
  }
  for (const y of [HEADER_Y.t, HEADER_Y.b]) runs.push({ x1: OUTER_RISER, y1: y, x2: mirror(OUTER_RISER), y2: y, plant: null, kind: 'header', drop: null });
  return runs;
}

/** Where each CDU is fed: a vertical drop off its header, at the CDU's centre line. [{ x, y, id, hall }]. */
export function pipeTaps() {
  return EQUIPMENT.filter((e) => e.type === 'cdu').map((e) => ({ x: e.x, y: HEADER_Y[e.half], id: e.id, hall: e.hall }));
}

// Walkway strips as rectangles (the lanes outside the halls' interiors: corridors, plant lanes,
// the gaps between pairs, the centre line, and each hall's outer aisle out to the corridors).
const WALKWAYS = LANES.filter((l) => !/^h\d|^door/.test(l.id) || l.id.endsWith('-outer')).map((l) => ({
  x1: Math.min(l.x1, l.x2) - WALK_HALF,
  x2: Math.max(l.x1, l.x2) + WALK_HALF,
  y1: Math.min(l.y1, l.y2) - WALK_HALF,
  y2: Math.max(l.y1, l.y2) + WALK_HALF,
}));

// Intervals along a run (in the run's own axis) that lie over a walkway.
function walkIntervals(r) {
  const flat = r.y1 === r.y2;
  const out = [];
  for (const w of WALKWAYS) {
    if (flat) {
      if (r.y1 < w.y1 || r.y1 > w.y2) continue;
      // Skip walkways the pipe runs along (none do; this keeps it honest if the layout changes).
      if (w.x2 - w.x1 > w.y2 - w.y1) continue;
      const a = Math.max(r.x1, w.x1);
      const b = Math.min(r.x2, w.x2);
      if (b > a) out.push([a, b]);
    } else {
      if (r.x1 < w.x1 || r.x1 > w.x2) continue;
      if (w.y2 - w.y1 > w.x2 - w.x1) continue;
      const a = Math.max(r.y1, w.y1);
      const b = Math.min(r.y2, w.y2);
      if (b > a) out.push([a, b]);
    }
  }
  return out;
}

/**
 * The runs cut into pieces for drawing: [{ x1, y1, x2, y2, h1, h2, overWalk, plant, kind }].
 * h is the pipe's height at each end (1 overhead, 0 at a unit); overWalk marks pieces over a
 * walkway. Cuts fall at the start of each slope and at the edges of each walkway.
 */
export function pipePieces(runs = pipeRuns()) {
  const pieces = [];
  for (const r of runs) {
    const flat = r.y1 === r.y2;
    const a0 = flat ? r.x1 : r.y1;
    const a1 = flat ? r.x2 : r.y2;
    const len = a1 - a0;
    const downAtStart = r.drop === 'start' || r.drop === 'both';
    const downAtEnd = r.drop === 'end' || r.drop === 'both';
    const height = (a) => {
      let h = 1;
      if (downAtStart) h = Math.min(h, (a - a0) / INCLINE);
      if (downAtEnd) h = Math.min(h, (a1 - a) / INCLINE);
      return Math.max(0, Math.min(1, h));
    };
    const walks = walkIntervals(r);
    const cuts = new Set([a0, a1]);
    if (downAtStart && len > INCLINE) cuts.add(a0 + INCLINE);
    if (downAtEnd && len > INCLINE) cuts.add(a1 - INCLINE);
    for (const [p, q] of walks) {
      cuts.add(p);
      cuts.add(q);
    }
    const sorted = [...cuts].filter((c) => c >= a0 && c <= a1).sort((p, q) => p - q);
    for (let i = 0; i + 1 < sorted.length; i++) {
      const p = sorted[i];
      const q = sorted[i + 1];
      if (q - p < 1e-6) continue;
      const mid = (p + q) / 2;
      const overWalk = walks.some(([s, e]) => mid > s && mid < e);
      pieces.push({
        x1: flat ? p : r.x1,
        y1: flat ? r.y1 : p,
        x2: flat ? q : r.x1,
        y2: flat ? r.y1 : q,
        h1: height(p),
        h2: height(q),
        overWalk,
        plant: r.plant,
        kind: r.kind,
      });
    }
  }
  return pieces;
}

/**
 * The x range of the building that is online: from Plant A to the far wall of the last online hall,
 * or the whole building once Plant B is online. Pipes beyond it are drawn as under construction.
 */
export function onlineSpan(online, plantB) {
  if (plantB) return { x1: 0, x2: WORLD.width };
  let x2 = PLANTS.A.x + PLANTS.A.w;
  for (let h = 1; h <= online; h++) x2 = Math.max(x2, HALLS[h].x + HALLS[h].w);
  return { x1: 0, x2 };
}

/** Is world point (x, y) within `near` units of a piece? (For fading pipes over people.) */
export function nearPiece(piece, x, y, near) {
  const cx = Math.max(Math.min(piece.x1, piece.x2), Math.min(x, Math.max(piece.x1, piece.x2)));
  const cy = Math.max(Math.min(piece.y1, piece.y2), Math.min(y, Math.max(piece.y1, piece.y2)));
  return Math.hypot(x - cx, y - cy) <= near;
}
