// Posts and the priority area on the overview strip (pass 8 spec 3.2, M46): a pin in the tech's hat
// colour for each posted tech, a flag over the priority area, and the flag button at the strip's end.
// Hat colours mark techs only, as everywhere.

import { HATS } from './icons.js';
import { areaCentreX } from '../ui/postsView.js';

const INK = '#1F3A5F';

function flag(ctx, x, y, s, fill, pole = INK) {
  ctx.fillStyle = pole;
  ctx.fillRect(x - s * 0.08, y - s * 0.5, s * 0.12, s);
  ctx.beginPath();
  ctx.moveTo(x, y - s * 0.5);
  ctx.lineTo(x + s * 0.55, y - s * 0.32);
  ctx.lineTo(x, y - s * 0.12);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = pole;
  ctx.lineWidth = 1;
  ctx.stroke();
}

/** pins: stripPins(...); priority: an area or null; button: flagTarget(...) or null; armed: waiting for an area. */
export function drawPostsOnStrip(ctx, strip, pins, priority, button, armed) {
  ctx.save();
  for (const p of pins) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = HATS[p.trade].dome;
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = INK;
    ctx.stroke();
  }
  if (priority) flag(ctx, areaCentreX(strip, priority), strip.y + 11, 16, '#FFFFFF');
  if (button) {
    const b = { x: button.x, y: strip.y, w: button.w, h: strip.h };
    ctx.beginPath();
    ctx.roundRect(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1, 6);
    ctx.fillStyle = armed ? INK : '#FFFFFF';
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1;
    ctx.stroke();
    flag(ctx, b.x + b.w / 2 - 4, b.y + b.h / 2 + 2, 18, armed ? INK : '#FFFFFF', armed ? '#FFFFFF' : INK);
  }
  ctx.restore();
}
