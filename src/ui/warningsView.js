// Warnings on the screen (pass 8 spec 4.2, M47). Pure: where each warning's wrench sits on the map
// (raised like an alarm bubble, so it reads the same and taps the same), the small wrenches on the
// strip, which warning a tap hits, and the inspect card's line.

import { EQUIPMENT_BY_ID, formatClock, getWarning } from '../core/index2.js';
import { BUBBLE_RAISE } from './bubbles.js';
import { cameraView } from './camera.js';
import { stripX, stripY } from './strip.js';

export const WRENCH_RADIUS = 14;
export const WRENCH_TAP = 22; // px from the mark's centre: a 44 px target

/** Marks on the map, in screen px: [{ id, x, y, left, share, techId, equipId }] (share: of the 0..1 clock left). */
export function warningMarks(state, cam) {
  const v = cameraView(cam);
  return (state.warnings ?? []).map((w) => {
    const e = EQUIPMENT_BY_ID[w.equipId];
    const span = Math.max(1e-9, w.ends - w.born);
    return {
      id: w.id,
      equipId: w.equipId,
      x: v.ox + e.x * v.scale,
      y: v.oy + e.y * v.scale - BUBBLE_RAISE,
      left: Math.max(0, w.ends - state.t),
      share: Math.max(0, Math.min(1, (w.ends - state.t) / span)),
      techId: w.techId,
      checking: w.progress > 0 ? w.progress : null,
    };
  });
}

/** The warning under screen point p (within WRENCH_TAP px, the nearest), or null. */
export function warningAt(marks, p) {
  let best = null;
  let bestD = WRENCH_TAP;
  for (const m of marks) {
    const d = Math.hypot(m.x - p.x, m.y - p.y);
    if (d <= bestD) {
      best = m;
      bestD = d;
    }
  }
  return best ? best.id : null;
}

/** Small wrenches on the overview strip: [{ x, y }]. */
export const stripWrenches = (state, strip) => (state.warnings ?? []).map((w) => {
  const e = EQUIPMENT_BY_ID[w.equipId];
  return { x: stripX(strip, e.x), y: stripY(strip, e.y) };
});

/** The inspect card's line for a device with a warning: "Warning: will fail in 0:07", or null. */
export function warningLine(state, equipId) {
  const w = (state.warnings ?? []).find((x) => x.equipId === equipId);
  if (!w) return null;
  return `Warning: will fail in ${formatClock(Math.ceil(Math.max(0, w.ends - state.t)))}`;
}

export { getWarning };
