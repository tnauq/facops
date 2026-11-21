// Posts and the priority area (pass 8 spec 3, M46). The ten areas of the overview strip, and where a
// tech posted to one waits: the middle lane across a hall, or the lane down a plant, at mid-height.

import { HALLS, LANES, MID_Y, PLANTS } from './layout2.js';

/** The areas, west to east: Plant A, halls 1 to 8, Plant B ('pA', 'h1' ... 'h8', 'pB'). */
export const AREAS = ['pA', ...Object.keys(HALLS).map((h) => `h${h}`), 'pB'];

/** Where a tech posted to `area` waits: a point on the lanes. */
export function postPoint(area) {
  if (area[0] === 'p') return { x: PLANTS[area.slice(1)].lane, y: MID_Y };
  const lane = LANES.find((l) => l.id === `${area}-middle`);
  return { x: (lane.x1 + lane.x2) / 2, y: lane.y1 };
}
