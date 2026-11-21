// Posts and the priority area on the screen (pass 8 spec 3.2, M46). Pure: which area a point on the
// overview strip is, the pins that mark posted techs on the strip, the crew card's post label, and the
// flag button at the strip's right end.

import { AREAS, BUILDING, HALLS, PLANTS, postsOn } from '../core/index2.js';
import { STRIP_REACH, stripX, worldXAt } from './strip.js';

export const FLAG_W = 44; // px: the priority flag button, 44 x 44

// Each area's span along the building, in world x: a plant from its end wall to its edge, a hall its box.
const SPANS = AREAS.map((a) => {
  if (a === 'pA') return { area: a, x1: BUILDING.x1, x2: PLANTS.A.x + PLANTS.A.w };
  if (a === 'pB') return { area: a, x1: PLANTS.B.x, x2: BUILDING.x2 };
  const h = HALLS[a.slice(1)];
  return { area: a, x1: h.x, x2: h.x + h.w };
});

/** The area at strip px x: the area whose span holds it, else the nearest (the gaps between pairs). */
export function areaAtStrip(strip, px) {
  const wx = worldXAt(strip, px);
  const inside = SPANS.find((s) => wx >= s.x1 && wx <= s.x2);
  if (inside) return inside.area;
  return SPANS.reduce((best, s) => (Math.abs((s.x1 + s.x2) / 2 - wx) < Math.abs((best.x1 + best.x2) / 2 - wx) ? s : best)).area;
}

/** The middle of an area on the strip, in px. */
export const areaCentreX = (strip, area) => {
  const s = SPANS.find((x) => x.area === area);
  return stripX(strip, (s.x1 + s.x2) / 2);
};

/** "H5", "PA": an area as the crew card shows it. */
export const areaLabel = (area) => (area ? area.toUpperCase() : '');

/** Pins for posted techs: [{ techId, area, x, y, trade }], side by side under each area. */
export function stripPins(state, strip) {
  if (!postsOn(state)) return [];
  const count = new Map();
  return state.techs.filter((t) => t.post).map((t) => {
    const k = count.get(t.post) ?? 0;
    count.set(t.post, k + 1);
    return { techId: t.id, area: t.post, x: areaCentreX(strip, t.post) - 6 + k * 7, y: strip.y + strip.h - 5, trade: t.trade };
  });
}

/** The flag button's tap area at the strip's right end, 44 x 44 (the strip is narrowed to make room). */
export const flagTarget = (strip) => ({ x: strip.x + strip.w + 2, y: strip.y + strip.h - FLAG_W, w: FLAG_W, h: FLAG_W });

/** Narrow the strip for the flag button when posts are in play: returns the strip to draw and use. */
export const stripWithFlag = (strip, on) => (on ? { ...strip, w: strip.w - FLAG_W - 2 } : strip);

/** What a tap on the strip does with a tech selected: post it there, or clear the post if it is there already. */
export const postFor = (tech, area) => (tech.post === area ? null : area);

export { STRIP_REACH };
