// The chilled-water pipes (M19, at the owner's request). Pure: where every pipe runs, in world units.
// Each plant: a riser beside the outer column of chillers joins its top and bottom pumps, a second
// riser beside the inner column, and a short branch to every chiller. Two headers run the length of
// the building, at y = 125 and 655, between the corridors and the halls; every CDU sits on one, so
// the pumps, chillers and CDUs are all one loop. Plant B mirrors Plant A. Drawing only: the rules
// do not use pipes.

import { EQUIPMENT, HALLS, PLANTS, WORLD } from '../core/index2.js';

export const HEADER_Y = { t: 125, b: 655 };
// In line with the pumps' discharge (x = 50 + 15.5: see PUMP_DISCHARGE_X in src/render/icons.js),
// between the pumps and the outer chillers (x = 100 to 200).
const OUTER_RISER = 65.5;
const INNER_RISER = 445; // between the inner chillers (x = 320 to 420) and hall 1 (x = 480)
const CHILLER_HALF_W = 50;
const PUMP_Y = { t: 40, b: 740 };

const mirror = (x) => WORLD.width - x;

/**
 * Pipe runs: [{ x1, y1, x2, y2, plant, kind }] where plant is 'A' or 'B' (null for the headers)
 * and kind is 'riser', 'branch' or 'header'. Every run is horizontal or vertical.
 */
export function pipeRuns() {
  const runs = [];
  for (const plant of Object.values(PLANTS)) {
    const fx = plant.id === 'A' ? (x) => x : mirror;
    const p = plant.id;
    runs.push({ x1: fx(OUTER_RISER), y1: PUMP_Y.t, x2: fx(OUTER_RISER), y2: PUMP_Y.b, plant: p, kind: 'riser' });
    runs.push({ x1: fx(INNER_RISER), y1: HEADER_Y.t, x2: fx(INNER_RISER), y2: HEADER_Y.b, plant: p, kind: 'riser' });
    for (const c of EQUIPMENT.filter((e) => e.type === 'chiller' && e.plant === p)) {
      // Outer column to the outer riser, inner column to the inner riser.
      const outer = Math.abs(c.x - fx(PLANTS.A.cols[1])) < 1;
      const riser = fx(outer ? OUTER_RISER : INNER_RISER);
      const edge = c.x + (riser < c.x ? -CHILLER_HALF_W : CHILLER_HALF_W);
      runs.push({ x1: Math.min(riser, edge), y1: c.y, x2: Math.max(riser, edge), y2: c.y, plant: p, kind: 'branch' });
    }
  }
  for (const y of [HEADER_Y.t, HEADER_Y.b]) runs.push({ x1: OUTER_RISER, y1: y, x2: mirror(OUTER_RISER), y2: y, plant: null, kind: 'header' });
  return runs;
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
