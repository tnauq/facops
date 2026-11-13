// Draws the redundancy shields on the pass 2 map (pass 3 spec, section 1): a power shield (bolt)
// and a liquid shield (droplet) at the top of every online hall, either side of its title, and the
// cooling shield with the spare-chiller count beside each online plant's title. A cracked shield
// carries an ink ring running down with the clock of the alarm that will break it.
// The shield picture is the supplied drawShield; what it shows comes from src/ui/shields.js.

import { HALLS, PLANTS } from '../core/index2.js';
import { drawFaultGlyph, drawShield } from './icons.js';
import { spareText } from '../ui/shields.js';

const INK = '#1F3A5F';
const TRACK = 'rgba(31, 58, 95, 0.18)';
const FONT = "system-ui, -apple-system, 'Segoe UI', sans-serif";
const SHIELD_WORLD = 30; // world units, about 20 px at the iPhone's zoom
const SHIELD_MIN_PX = 18;
const HALL_SHIELD_DX = 105; // world units either side of the hall's centre, clear of the title and walls
const HALL_SHIELD_DY = 26; // below the hall's top wall

const sizeFor = (v) => Math.max(SHIELD_MIN_PX, SHIELD_WORLD * v.scale);

/** One shield with its ring when cracked. ring: fraction of clock left, or null. */
export function drawShieldWithRing(ctx, x, y, size, shield) {
  if (shield.ring !== null) {
    const r = size * 0.72;
    ctx.save();
    ctx.lineWidth = Math.max(2, size * 0.11);
    ctx.lineCap = 'round';
    ctx.strokeStyle = TRACK;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = INK;
    ctx.beginPath();
    // Runs down clockwise from the top, like the alarm bubbles' clocks.
    ctx.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(0, Math.min(1, shield.ring)));
    ctx.stroke();
    ctx.restore();
  }
  drawShield(ctx, x, y, size, shield.status);
}

function onScreen(screen, x, y, pad) {
  return x > -pad && x < screen.w + pad && y > -pad && y < screen.h + pad;
}

/** view: { scale, ox, oy }. model: shieldsModel(state). screen: { w, h } for culling. */
export function drawShields(ctx, view, screen, model, { plantB = false } = {}) {
  const v = view;
  const size = sizeFor(v);
  const glyph = size * 0.7;
  for (const h of model.halls) {
    const hall = HALLS[h.hall];
    const y = v.oy + (hall.y + HALL_SHIELD_DY) * v.scale;
    // Power on the left, liquid on the right; each glyph sits between its shield and the title, which
    // keeps the group inside the hall's walls at the smallest zoom.
    const items = [
      [hall.cx - HALL_SHIELD_DX, h.power, 'breaker', -1],
      [hall.cx + HALL_SHIELD_DX, h.liquid, 'leak', 1],
    ];
    for (const [wx, shield, type, side] of items) {
      const x = v.ox + wx * v.scale;
      if (!onScreen(screen, x, y, size * 2)) continue;
      drawShieldWithRing(ctx, x, y, size, shield);
      drawFaultGlyph(ctx, x - side * size * 1.05, y, glyph, type, INK);
    }
  }

  // Cooling: beside each online plant's title, as drawn by campus2.js (centred, top at p.y - 26).
  const titlePx = Math.max(10, Math.min(15, 22 * v.scale));
  ctx.save();
  ctx.font = `600 ${titlePx}px ${FONT}`;
  for (const p of Object.values(PLANTS)) {
    if (p.id === 'B' && !plantB) continue;
    const titleW = ctx.measureText(`Plant ${p.id}`).width;
    const cx = v.ox + (p.x + p.w / 2) * v.scale;
    const y = v.oy + (p.y - 26) * v.scale + titlePx / 2;
    const x = cx + titleW / 2 + 8 + size / 2;
    if (!onScreen(screen, x, y, 120)) continue;
    drawShieldWithRing(ctx, x, y, size, model.cooling);
    ctx.fillStyle = INK;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.font = `600 ${Math.max(11, titlePx - 1)}px ${FONT}`;
    ctx.fillText(spareText(model.cooling.spare), x + size * 0.85, y);
    ctx.font = `600 ${titlePx}px ${FONT}`;
  }
  ctx.restore();
}
