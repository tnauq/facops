// The pipes (M19, at the owner's request; pass 6 M38: two loops). Pure: where every pipe runs, in
// world units. Drawing only: the rules do not use pipes.
//
// Pass 6 (the owner's sketches of 16 Nov). Both loops run overhead and are drawn alike, in black:
//   - Glycol: each glycol pump room's four pumps feed the room's header by a short pipe to the
//     right; each header joins a riser down the outer side of the outer chiller column; a riser
//     down the outer side of the inner column too. Every chiller takes a stub into its top half.
//     A header runs the length of the building at y = 125 (and 655) and feeds every CDU by a drop.
//   - Water: the water pumps feed a line at y = 160 (and 620), just inside the glycol header on the
//     hall side, which runs the length of the building. Risers just inside the glycol risers take a
//     stub into every chiller's bottom half. At each hall the water turns down into the hall's wall
//     either side of the CDU (owner, 16 Nov: a short pipe into the wall shows it going under the
//     floor) and comes back out the other side: under the floor it is not drawn.
// Where a pipe meets a unit it slopes down to it (height 1 overhead, 0 at the unit). Pieces over a
// walkway are marked so the screen can fade them while someone walks underneath.

import { BUILDING, EQUIPMENT, HALLS, LANES, PLANTS, PUMP_ROOM_HEADER_X, WORLD } from '../core/index2.js';

export const HEADER_Y = { t: 125, b: 655 }; // glycol, to the CDUs
export const WATER_Y = { t: 160, b: 620 }; // water, into the halls' floors
// Risers beside each chiller column, outer side (pass 6: the middle aisle stays open). Glycol is
// the outermost; water just inside it. Plant A's numbers; Plant B mirrors them.
const RISER = { outer: { glycol: 70, water: 84 }, inner: { glycol: 450, water: 436 } };
const CHILLER_HALF_W = 52;
const CHILLER_STUB_DY = { glycol: -14, water: 14 }; // the chiller drawing's top and bottom halves
const PUMP_SUCTION = 40; // a pump's short pipe to the right ends this far from its centre (size 80)
const PUMP_DISCHARGE_X = 15.5; // a water pump's discharge, as in src/render/icons.js
export const FLOOR_DIVE = 42; // the water dives into a hall's floor this far either side of its CDU
export const INCLINE = 26; // world units over which a pipe slopes from overhead down to its unit
export const WALK_HALF = 11; // half a walkway's width, as drawn in src/render/campus2.js

const mirror = (x) => WORLD.width - x;
const run = (x1, y1, x2, y2, extra) => ({ x1: Math.min(x1, x2), y1: Math.min(y1, y2), x2: Math.max(x1, x2), y2: Math.max(y1, y2), ...extra });

// The chiller column a chiller stands in: 'outer' (by the end wall) or 'inner' (by the halls).
const columnOf = (c) => (Math.abs(c.x - (c.plant === 'A' ? PLANTS.A.cols[1] : mirror(PLANTS.A.cols[1]))) < 1 ? 'outer' : 'inner');

/**
 * Pipe runs: [{ x1, y1, x2, y2, plant, loop, kind, drop }] where plant is 'A' or 'B' (null for the
 * runs the length of the building), loop 'glycol' or 'water', kind 'room' (a pump room's header),
 * 'stub' (a pump's pipe to it), 'main' (the room to its riser), 'riser', 'branch' (into a chiller),
 * 'header' or 'dive' (the water into a hall's wall), and drop says which ends slope down to a unit: 'start', 'end', 'both' or
 * null. Every run is horizontal or vertical; x1 <= x2 and y1 <= y2.
 */
export function pipeRuns() {
  const runs = [];
  for (const plant of Object.values(PLANTS)) {
    const p = plant.id;
    const fx = p === 'A' ? (x) => x : mirror;
    const pumps = EQUIPMENT.filter((e) => e.type === 'pump' && e.plant === p);
    // Glycol pump rooms: a header per room, each pump's pipe to it, and a branch to the outer riser.
    for (const half of ['t', 'b']) {
      const room = pumps.filter((e) => e.loop === 'glycol' && e.half === half);
      const ys = room.map((e) => e.y);
      const y1 = Math.min(...ys) - 28;
      const y2 = Math.max(...ys) + 28;
      const hx = fx(PUMP_ROOM_HEADER_X);
      runs.push(run(hx, y1, hx, y2, { plant: p, loop: 'glycol', kind: 'room', drop: null }));
      for (const e of room) {
        const tip = e.x + (p === 'A' ? PUMP_SUCTION : -PUMP_SUCTION);
        runs.push(run(tip, e.y, hx, e.y, { plant: p, loop: 'glycol', kind: 'stub', drop: p === 'A' ? 'start' : 'end' }));
      }
      const midY = (y1 + y2) / 2;
      runs.push(run(hx, midY, fx(RISER.outer.glycol), midY, { plant: p, loop: 'glycol', kind: 'main', drop: null }));
    }
    // Risers beside both chiller columns.
    for (const col of ['outer', 'inner']) {
      runs.push(run(fx(RISER[col].glycol), HEADER_Y.t, fx(RISER[col].glycol), HEADER_Y.b, { plant: p, loop: 'glycol', kind: 'riser', drop: null }));
      runs.push(run(fx(RISER[col].water), WATER_Y.t, fx(RISER[col].water), WATER_Y.b, { plant: p, loop: 'water', kind: 'riser', drop: null }));
    }
    // A stub from each riser into each chiller: glycol into its top half, water into its bottom.
    for (const c of EQUIPMENT.filter((e) => e.type === 'chiller' && e.plant === p)) {
      const col = columnOf(c);
      for (const loop of ['glycol', 'water']) {
        const riser = fx(RISER[col][loop]);
        const edge = c.x + (riser < c.x ? -CHILLER_HALF_W : CHILLER_HALF_W);
        const y = c.y + CHILLER_STUB_DY[loop];
        runs.push(run(riser, y, edge, y, { plant: p, loop, kind: 'branch', drop: edge < riser ? 'start' : 'end' }));
      }
    }
  }
  // The glycol headers, the length of the building.
  for (const y of [HEADER_Y.t, HEADER_Y.b]) runs.push(run(RISER.outer.glycol, y, mirror(RISER.outer.glycol), y, { plant: null, loop: 'glycol', kind: 'header', drop: null }));
  // The water lines, the length of the building, diving under each hall's floor either side of its CDU.
  for (const half of ['t', 'b']) {
    const y = WATER_Y[half];
    const dives = EQUIPMENT.filter((e) => e.type === 'cdu' && e.half === half).sort((a, b) => a.x - b.x);
    let x = RISER.outer.water;
    for (const c of dives) {
      runs.push(run(x, y, c.x - FLOOR_DIVE, y, { plant: null, loop: 'water', kind: 'header', drop: null }));
      // Down into the hall's wall either side of the CDU, sloping to the floor at the wall.
      const hall = HALLS[c.hall];
      const wallY = half === 't' ? hall.y : hall.y + hall.h;
      for (const k of [-1, 1]) runs.push(run(c.x + k * FLOOR_DIVE, y, c.x + k * FLOOR_DIVE, wallY, { plant: null, loop: 'water', kind: 'dive', drop: half === 't' ? 'end' : 'start', hall: c.hall }));
      x = c.x + FLOOR_DIVE;
    }
    runs.push(run(x, y, mirror(RISER.outer.water), y, { plant: null, loop: 'water', kind: 'header', drop: null }));
  }
  return runs;
}

/**
 * Where a pipe turns straight down, seen from above as a round flange: each CDU's drop off the
 * glycol header, and each water pump's drop off the water line. [{ x, y, id, hall, plant, loop }];
 * hall is null for a pump's.
 */
export function pipeTaps() {
  const out = [];
  for (const e of EQUIPMENT) {
    if (e.type === 'cdu') {
      out.push({ x: e.x, y: HEADER_Y[e.half], id: e.id, hall: e.hall, plant: null, loop: 'glycol' });
    }
    if (e.type === 'pump' && e.loop === 'water') {
      const x = e.x + (e.plant === 'A' ? PUMP_DISCHARGE_X : -PUMP_DISCHARGE_X);
      out.push({ x, y: WATER_Y[e.half], id: e.id, hall: null, plant: e.plant, loop: 'water' });
    }
  }
  return out;
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
  if (plantB) return { x1: BUILDING.x1, x2: BUILDING.x2 };
  let x2 = PLANTS.A.x + PLANTS.A.w;
  for (let h = 1; h <= online; h++) x2 = Math.max(x2, HALLS[h].x + HALLS[h].w);
  return { x1: BUILDING.x1, x2 };
}

/** Is world point (x, y) within `near` units of a piece? (For fading pipes over people.) */
export function nearPiece(piece, x, y, near) {
  const cx = Math.max(Math.min(piece.x1, piece.x2), Math.min(x, Math.max(piece.x1, piece.x2)));
  const cy = Math.max(Math.min(piece.y1, piece.y2), Math.min(y, Math.max(piece.y1, piece.y2)));
  return Math.hypot(x - cx, y - cy) <= near;
}
