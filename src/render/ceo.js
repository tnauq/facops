// The CEO on the map, plain for now (pass 3 spec 4.9: M17 shows the rules through the existing
// screen; M18 brings the CEO and assistant drawings, the banner and the lines). While a visit is
// announced: the route as a dashed ink line. While the CEO walks: the view cone as a translucent
// ink wedge and a white disc marked "CEO". Ink only: never green, yellow or red.

import { ceoCone, routePoints } from '../core/index2.js';

const INK = '#1F3A5F';
const FONT = "system-ui, -apple-system, 'Segoe UI', sans-serif";

/** view: { scale, ox, oy }. */
export function drawCeo(ctx, view, state) {
  const c = state.ceo;
  if (!c) return;
  const sx = (x) => view.ox + x * view.scale;
  const sy = (y) => view.oy + y * view.scale;
  ctx.save();
  // The route.
  const pts = routePoints(c);
  ctx.setLineDash([6, 5]);
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(31, 58, 95, 0.55)';
  ctx.beginPath();
  pts.forEach((p, i) => (i === 0 ? ctx.moveTo(sx(p.x), sy(p.y)) : ctx.lineTo(sx(p.x), sy(p.y))));
  ctx.stroke();
  ctx.setLineDash([]);
  const cone = ceoCone(state);
  if (cone) {
    const x = sx(cone.x);
    const y = sy(cone.y);
    ctx.fillStyle = 'rgba(31, 58, 95, 0.12)';
    ctx.strokeStyle = 'rgba(31, 58, 95, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.arc(x, y, cone.radius * view.scale, cone.facing - cone.angle / 2, cone.facing + cone.angle / 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, y, 14, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = INK;
    ctx.stroke();
    ctx.fillStyle = INK;
    ctx.font = `800 9px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('CEO', x, y + 0.5);
  }
  ctx.restore();
}

/** The CEO on the overview strip: an ink diamond where the CEO is walking. */
export function drawCeoOnStrip(ctx, strip, state, toX, toY) {
  const cone = ceoCone(state);
  if (!cone) return;
  const x = toX(cone.x);
  const y = toY(cone.y);
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x, y - 6);
  ctx.lineTo(x + 6, y);
  ctx.lineTo(x, y + 6);
  ctx.lineTo(x - 6, y);
  ctx.closePath();
  ctx.fillStyle = INK;
  ctx.fill();
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
}
