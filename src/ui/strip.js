// The campus overview strip (pass 3 spec, section 3). Pure.
// The whole building in one thin bar along the bottom of the map region: both plants and the 8
// halls left to right at true width, squashed top to bottom, with every hall's shields, every
// alarm and tech as a dot, and a frame for what the map shows. Tapping or dragging on it moves
// the view there.

import { EQUIPMENT_BY_ID, HALLS, PLANTS, WORLD, plantBOnline } from '../core/index2.js';
import { regions } from './regions.js';
import { shieldsModel } from './shields.js';
import { alarmCost } from './cost.js';
import { visibleSize } from './camera.js';

export const STRIP_HEIGHT = 28; // drawn
export const STRIP_GAP = 2; // between the map and the strip
export const STRIP_REACH = 16; // the tap area reaches this far up into the map: 44 px in all

/**
 * Pass 2's regions with the strip taken off the bottom of the map: { ...regions, map, strip }.
 * The zoom stays pass 1's (it is worked out from regions(), not from this smaller map).
 */
export function regions3(W, H, opts = {}) {
  const r = regions(W, H, opts);
  const mapH = r.map.h - STRIP_HEIGHT - STRIP_GAP;
  return {
    ...r,
    map: { ...r.map, h: mapH },
    strip: { x: r.map.x, y: r.map.y + mapH + STRIP_GAP, w: r.map.w, h: STRIP_HEIGHT },
  };
}

/** The strip's tap area: as drawn, plus STRIP_REACH px above it, so it is 44 px tall. */
export const stripTarget = (strip) => ({ x: strip.x, y: strip.y - STRIP_REACH, w: strip.w, h: strip.h + STRIP_REACH });

export const inStripTarget = (strip, p) => {
  const t = stripTarget(strip);
  return p.x >= t.x && p.x <= t.x + t.w && p.y >= t.y && p.y <= t.y + t.h;
};

const PAD = 3; // px inside the strip, top and bottom

/** World to strip px, and back (x only: the strip is true to width). */
export const stripX = (strip, wx) => strip.x + (wx / WORLD.width) * strip.w;
export const stripY = (strip, wy) => strip.y + PAD + (wy / WORLD.height) * (strip.h - 2 * PAD);
export const worldXAt = (strip, px) => Math.max(0, Math.min(WORLD.width, ((px - strip.x) / strip.w) * WORLD.width));

/**
 * Everything the strip shows, in screen px:
 * { halls: [{ id, x, w, online, power, liquid }], plants: [{ id, x, w, online }], cooling: { status, spare },
 *   alarms: [{ id, x, y, costly }], techs: [{ id, x, y, trade }], frame: { x, w } }.
 * power, liquid and cooling statuses are 'whole' | 'cracked' | 'broken' (null for offline halls).
 */
export function stripModel(state, strip, cam) {
  const shields = shieldsModel(state);
  const byHall = new Map(shields.halls.map((h) => [h.hall, h]));
  const box = (o) => ({ x: stripX(strip, o.x), w: (o.w / WORLD.width) * strip.w });
  const halls = Object.values(HALLS).map((h) => {
    const s = byHall.get(h.id);
    return { id: h.id, ...box(h), online: h.id <= state.halls, power: s ? s.power.status : null, liquid: s ? s.liquid.status : null };
  });
  const plants = Object.values(PLANTS).map((p) => ({ id: p.id, ...box(p), online: p.id === 'A' || plantBOnline(state) }));
  const alarms = state.alarms.map((a) => {
    const e = EQUIPMENT_BY_ID[a.equipId];
    return { id: a.id, x: stripX(strip, e.x), y: stripY(strip, e.y), costly: alarmCost(state, a) > 0 };
  });
  const techs = state.techs.map((t) => ({ id: t.id, x: stripX(strip, t.x), y: stripY(strip, t.y), trade: t.trade }));
  const v = visibleSize(cam);
  const frame = { x: stripX(strip, cam.x), w: (v.w / WORLD.width) * strip.w };
  return { halls, plants, cooling: { status: shields.cooling.status, spare: shields.cooling.spare }, alarms, techs, frame };
}
