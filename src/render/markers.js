// Draws one off-map arrow (pass 2 spec 7.1): a white disc with the alarm's fault picture, an arrow
// tip pointing toward the alarm, and a count when several alarms share the arrow. Pass 3 (spec 2.4)
// adds the lead alarm's clock as a ring round the disc, as on a bubble, and what it costs ("−6")
// on the side away from the arrow. Ink and the bubbles' work blue only: never green, yellow or red.

import { drawFaultGlyph } from './icons.js';
import { MARKER_RADIUS } from '../ui/offmap.js';

const INK = '#1F3A5F';
const FONT = "system-ui, -apple-system, 'Segoe UI', sans-serif";
const DISC = 15;
const TRACK = '#C9D1DB';
const WORK = '#2F6DBC'; // fix progress, as on the bubbles

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
  ctx.lineWidth = 3;
  ctx.strokeStyle = m.info ? TRACK : INK;
  ctx.stroke();
  if (m.info) {
    // The lead alarm's clock (or fix progress while a tech is on site), as on its bubble.
    const i = m.info;
    const spent = !Number.isFinite(i.clockLeft);
    const share = i.attended ? i.progress : spent ? 1 : i.clockFraction;
    if (share > 0) {
      ctx.beginPath();
      ctx.arc(0, 0, DISC, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, share));
      ctx.strokeStyle = i.attended ? WORK : INK;
      ctx.stroke();
    }
  }
  drawFaultGlyph(ctx, 0, 0, 16, m.type, INK);
  if (m.cost > 0) {
    // Opposite the arrow tip, so the two never collide.
    const lx = -Math.cos(m.angle) * (DISC + 11);
    const ly = -Math.sin(m.angle) * (DISC + 9);
    ctx.font = `700 11px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#FFFFFF';
    ctx.strokeText(`−${m.cost}`, lx, ly);
    ctx.fillStyle = INK;
    ctx.fillText(`−${m.cost}`, lx, ly);
  }
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
