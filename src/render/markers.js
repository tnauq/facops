// Draws one off-map arrow (pass 2 spec 7.1): a white disc with the alarm's fault picture, an arrow
// tip pointing toward the alarm, and a count when several alarms share the arrow. Ink only: never
// tinted green, yellow or red.

import { drawFaultGlyph } from './icons.js';
import { MARKER_RADIUS } from '../ui/offmap.js';

const INK = '#1F3A5F';
const FONT = "system-ui, -apple-system, 'Segoe UI', sans-serif";
const DISC = 15;

/** m: one marker from offMapMarkers (src/ui/offmap.js). */
export function drawMarker(ctx, m) {
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
  ctx.lineWidth = 2;
  ctx.strokeStyle = INK;
  ctx.stroke();
  drawFaultGlyph(ctx, 0, 0, 16, m.type, INK);
  if (m.count > 1) {
    ctx.beginPath();
    ctx.arc(DISC * 0.8, -DISC * 0.8, 8, 0, Math.PI * 2);
    ctx.fillStyle = INK;
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `700 10px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(m.count), DISC * 0.8, -DISC * 0.8 + 0.5);
  }
  ctx.restore();
}
