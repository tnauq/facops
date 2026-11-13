// Draws the campus overview strip (pass 3 spec, section 3) from stripModel (src/ui/strip.js):
// the plants and halls as boxes, each online hall's power and liquid shields and each online
// plant's cooling shield with its spare count (the supplied shield drawing, whose crack line means
// colour is never the only sign), techs as hat dots, alarms as ink dots (ringed when they cost
// something), and a frame for what the map shows. Alarms are ink only: never green, yellow or red.

import { drawHatDot, drawShield } from './icons.js';

const PANEL = '#FFFFFF';
const EDGE = '#C9D1DB';
const INK = '#1F3A5F';
const HALL = '#F3F5F8';
const PLANT = '#E2E8DC';
const WALL = '#5C6573';
const OFFLINE_ALPHA = 0.35;
const FONT = "system-ui, -apple-system, 'Segoe UI', sans-serif";

function box(ctx, x, y, w, h, fill, online) {
  ctx.globalAlpha = online ? 1 : OFFLINE_ALPHA;
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = WALL;
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  ctx.globalAlpha = 1;
}

/** strip: the strip's rectangle. m: stripModel(...). */
export function drawStrip(ctx, strip, m) {
  const { x, y, w, h } = strip;
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 6);
  ctx.fillStyle = PANEL;
  ctx.fill();
  ctx.strokeStyle = EDGE;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.clip();

  const top = y + 3;
  const inner = h - 6;
  const mid = y + h / 2;
  const shield = Math.min(12, inner * 0.5);
  for (const p of m.plants) {
    box(ctx, p.x, top, p.w, inner, PLANT, p.online);
    if (!p.online) continue;
    // The cooling shield and the spare count, side by side in the middle of the plant.
    const text = `${m.cooling.spare}`; // negative when cooling is short
    ctx.font = `700 10px ${FONT}`;
    const tw = ctx.measureText(text).width;
    const gx = p.x + p.w / 2 - (shield + 2 + tw) / 2;
    drawShield(ctx, gx + shield / 2, mid, shield, m.cooling.status);
    ctx.fillStyle = INK;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, gx + shield + 2, mid + 0.5);
  }
  for (const hall of m.halls) {
    box(ctx, hall.x, top, hall.w, inner, HALL, hall.online);
    if (!hall.online) continue;
    // Power on the left, liquid on the right, as on the map.
    drawShield(ctx, hall.x + hall.w * 0.3, mid, shield, hall.power);
    drawShield(ctx, hall.x + hall.w * 0.7, mid, shield, hall.liquid);
  }
  for (const t of m.techs) drawHatDot(ctx, t.x, t.y, 3, t.trade);
  for (const a of m.alarms) {
    ctx.beginPath();
    ctx.arc(a.x, a.y, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = INK;
    ctx.fill();
    ctx.strokeStyle = PANEL;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    if (a.costly) {
      ctx.beginPath();
      ctx.arc(a.x, a.y, 6.5, 0, Math.PI * 2);
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }
  // What the map shows now.
  ctx.beginPath();
  ctx.roundRect(m.frame.x + 1, y + 1, m.frame.w - 2, h - 2, 5);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}
