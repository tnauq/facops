// The advisor mark (pass 7 spec 4.2, M43): a slowly pulsing ring round the spot the scripted builder
// would buy next, white with an ink outline (never a hat or band colour), and an arrow at the map's
// edge in the alarm arrows' style, without a clock, when the spot is out of view.

import { EQUIPMENT_BY_ID } from '../core/index2.js';
import { cameraView } from '../ui/camera.js';
import { extentOf } from '../ui/spots.js';
import { MARKER_RADIUS, offMapMarkers } from '../ui/offmap.js';

const INK = '#1F3A5F';
const DISC = 15;

/** Draw the ring, or the edge arrow. Returns the arrow (a marker to tap) or null. now: ms, for the pulse. */
export function drawAdvisor(ctx, cam, id, now) {
  const e = EQUIPMENT_BY_ID[id];
  const v = cameraView(cam);
  const [m] = offMapMarkers([{ id: 'advisor', x: e.x, y: e.y, type: 'advisor' }], cam);
  if (m) {
    drawArrow(ctx, m);
    return { ...m, ids: [], advisor: true };
  }
  const [hw, hh] = extentOf(e);
  const pulse = 0.5 + 0.5 * Math.sin(now / 350);
  const r = Math.max(hw, hh) * v.scale + 10 + 4 * pulse;
  const x = v.ox + e.x * v.scale;
  const y = v.oy + e.y * v.scale;
  ctx.save();
  ctx.globalAlpha = 0.65 + 0.35 * pulse;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.lineWidth = 6;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#FFFFFF';
  ctx.stroke();
  ctx.restore();
  return null;
}

// The alarm arrows' shape (src/render/markers.js), with a "+" in place of the fault picture.
function drawArrow(ctx, m) {
  ctx.save();
  ctx.translate(m.x, m.y);
  ctx.save();
  ctx.rotate(m.angle);
  ctx.beginPath();
  ctx.moveTo(MARKER_RADIUS - 2, -7);
  ctx.lineTo(MARKER_RADIUS + 6, 0);
  ctx.lineTo(MARKER_RADIUS - 2, 7);
  ctx.closePath();
  ctx.fillStyle = INK;
  ctx.fill();
  ctx.restore();
  ctx.beginPath();
  ctx.arc(0, 0, DISC, 0, Math.PI * 2);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.fillStyle = INK;
  ctx.fillRect(-7, -1.5, 14, 3);
  ctx.fillRect(-1.5, -7, 3, 14);
  ctx.restore();
}
