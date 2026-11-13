// The CEO on screen (pass 3 spec 4.7). The CEO and the assistant seen from above, in the crew's
// style but plainly not crew: a dark suit, no vest, and a white hardhat (white is no trade's
// colour); the assistant a step behind with a clipboard and a pale grey hat. The view cone is a
// translucent ink wedge; the route a dashed ink line with a ring at each inspection point; the
// banner and the speech bubble are ink and white. Nothing here is green, yellow or red.

import { ceoCone, inspectPoint, routePoints } from '../core/index2.js';

const INK = '#1F3A5F';
const SUIT = '#2E3440';
const SUIT_EDGE = '#1B1F27';
const SHIRT = '#F4F6F9';
const TIE = '#6B4FA0'; // purple: no trade's colour
const HAT = '#FFFFFF';
const HAT_BRIM = '#C9D1DB';
const SKIN = '#E6B98F';
const CARDIGAN = '#8A93A3';
const CLIP = '#A07A4F';
const PAPER = '#FFFFFF';
const FONT = "system-ui, -apple-system, 'Segoe UI', sans-serif";

function disc(ctx, x, y, r, fill, stroke = null, width = 1) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = width;
    ctx.stroke();
  }
}

/** The CEO from above, `size` px across like a tech (ICON_SIZE.tech x scale). */
export function drawCeoFigure(ctx, x, y, size) {
  const u = size / 54;
  ctx.save();
  ctx.translate(x, y);
  // Shoulders in a dark suit, a white shirt front and a purple tie.
  ctx.beginPath();
  ctx.ellipse(0, 5 * u, 27 * u, 15 * u, 0, 0, Math.PI * 2);
  ctx.fillStyle = SUIT;
  ctx.fill();
  ctx.strokeStyle = SUIT_EDGE;
  ctx.lineWidth = 1.5 * u;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-7 * u, 8 * u);
  ctx.lineTo(0, 20 * u);
  ctx.lineTo(7 * u, 8 * u);
  ctx.closePath();
  ctx.fillStyle = SHIRT;
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-2.2 * u, 10 * u);
  ctx.lineTo(0, 19 * u);
  ctx.lineTo(2.2 * u, 10 * u);
  ctx.closePath();
  ctx.fillStyle = TIE;
  ctx.fill();
  disc(ctx, -21 * u, 12 * u, 3.6 * u, SKIN); // hands, no gloves
  disc(ctx, 21 * u, 12 * u, 3.6 * u, SKIN);
  // A spotless white hardhat, worn slightly askew.
  disc(ctx, 0.8 * u, -3 * u, 20 * u, HAT_BRIM);
  disc(ctx, 0.8 * u, -4.5 * u, 16 * u, HAT, HAT_BRIM, 1.2 * u);
  ctx.fillStyle = INK;
  ctx.font = `800 ${8 * u}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('CEO', 0.8 * u, -4.5 * u);
  ctx.restore();
}

/** The assistant from above: a grey cardigan, a clipboard held out, a pale grey hat. */
export function drawAssistant(ctx, x, y, size) {
  const u = size / 54;
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  ctx.ellipse(0, 4 * u, 22 * u, 12 * u, 0, 0, Math.PI * 2);
  ctx.fillStyle = CARDIGAN;
  ctx.fill();
  ctx.save();
  ctx.translate(10 * u, 13 * u);
  ctx.rotate(-0.25);
  ctx.fillStyle = CLIP;
  ctx.fillRect(-7 * u, -9 * u, 14 * u, 18 * u);
  ctx.fillStyle = PAPER;
  ctx.fillRect(-5.5 * u, -6 * u, 11 * u, 13.5 * u);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.9 * u;
  for (const ly of [-3, 0, 3]) {
    ctx.beginPath();
    ctx.moveTo(-4 * u, ly * u);
    ctx.lineTo(4 * u, ly * u);
    ctx.stroke();
  }
  ctx.restore();
  disc(ctx, -15 * u, 11 * u, 3.2 * u, SKIN);
  disc(ctx, 0, -2.5 * u, 16 * u, '#B9C0CB');
  disc(ctx, 0, -3.5 * u, 12.5 * u, '#E3E7EC');
  ctx.restore();
}

/** The route (dashed) with a ring at each inspection point, from the warning on. view: { scale, ox, oy }. */
export function drawCeoRoute(ctx, view, state) {
  const c = state.ceo;
  if (!c) return;
  const sx = (x) => view.ox + x * view.scale;
  const sy = (y) => view.oy + y * view.scale;
  ctx.save();
  ctx.setLineDash([7, 6]);
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(31, 58, 95, 0.6)';
  ctx.beginPath();
  routePoints(c).forEach((p, i) => (i === 0 ? ctx.moveTo(sx(p.x), sy(p.y)) : ctx.lineTo(sx(p.x), sy(p.y))));
  ctx.stroke();
  ctx.setLineDash([]);
  for (const area of c.areas) {
    const p = inspectPoint(area);
    disc(ctx, sx(p.x), sy(p.y), 9, 'rgba(255, 255, 255, 0.85)', INK, 2.5);
    disc(ctx, sx(p.x), sy(p.y), 3, INK);
  }
  ctx.restore();
}

/** The view cone, then the assistant and the CEO, while the CEO is on the floor. */
export function drawCeoOnFloor(ctx, view, state, assistant) {
  const cone = ceoCone(state);
  if (!cone) return;
  const x = view.ox + cone.x * view.scale;
  const y = view.oy + cone.y * view.scale;
  ctx.save();
  ctx.fillStyle = 'rgba(31, 58, 95, 0.13)';
  ctx.strokeStyle = 'rgba(31, 58, 95, 0.4)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, cone.radius * view.scale, cone.facing - cone.angle / 2, cone.facing + cone.angle / 2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  const size = 46 * view.scale;
  if (assistant) drawAssistant(ctx, view.ox + assistant.x * view.scale, view.oy + assistant.y * view.scale, size * 0.85);
  drawCeoFigure(ctx, x, y, size * 1.05);
}

// Words to lines no wider than `max` px.
function wrap(ctx, text, max) {
  const lines = [];
  let line = '';
  for (const word of text.split(' ')) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > max && line) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

/** A speech bubble above (x, y), kept inside `rect`. */
export function drawSpeech(ctx, rect, x, y, text) {
  ctx.save();
  ctx.font = `600 12px ${FONT}`;
  const lines = wrap(ctx, text, Math.min(190, rect.w - 24));
  const w = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 18;
  const h = lines.length * 15 + 10;
  let bx = Math.max(rect.x + 4, Math.min(x - w / 2, rect.x + rect.w - w - 4));
  let by = y - 34 - h;
  const below = by < rect.y + 4;
  if (below) by = y + 30;
  by = Math.max(rect.y + 4, Math.min(by, rect.y + rect.h - h - 4));
  ctx.beginPath();
  ctx.roundRect(bx, by, w, h, 8);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.stroke();
  // The tail points at the speaker.
  const tx = Math.max(bx + 12, Math.min(x, bx + w - 12));
  ctx.beginPath();
  if (below) {
    ctx.moveTo(tx - 6, by);
    ctx.lineTo(x, by - 10);
    ctx.lineTo(tx + 6, by);
  } else {
    ctx.moveTo(tx - 6, by + h);
    ctx.lineTo(x, by + h + 10);
    ctx.lineTo(tx + 6, by + h);
  }
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = INK;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  lines.forEach((l, i) => ctx.fillText(l, bx + w / 2, by + 5 + 7.5 + i * 15));
  ctx.restore();
}

/** Height in px the banner needs for this model. */
export const bannerHeight = (model) => (model ? 8 + model.lines.length * 15 : 0);

/** The banner across the top of the map, as wide as its words: white with ink text, or solid ink under zero tolerance. */
export function drawBanner(ctx, rect, model) {
  if (!model) return;
  const h = bannerHeight(model);
  ctx.save();
  const font = (i) => `${i === 0 ? 700 : 500} ${i === 0 ? 13 : 12}px ${FONT}`;
  let textW = 0;
  model.lines.forEach((l, i) => {
    ctx.font = font(i);
    textW = Math.max(textW, ctx.measureText(l).width);
  });
  const w = Math.min(rect.w - 12, textW + 28);
  const x = rect.x + (rect.w - w) / 2;
  ctx.beginPath();
  ctx.roundRect(x, rect.y + 4, w, h, 8);
  ctx.fillStyle = model.zeroTolerance ? INK : 'rgba(255, 255, 255, 0.94)';
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = model.zeroTolerance ? '#FFFFFF' : INK;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  model.lines.forEach((l, i) => {
    ctx.font = font(i);
    ctx.fillText(l, rect.x + rect.w / 2, rect.y + 4 + 4 + 7.5 + i * 15);
  });
  ctx.restore();
}

/** The edge arrow pointing to the CEO (or to where the CEO will appear): an ink disc marked CEO. */
export function drawCeoMarker(ctx, m) {
  ctx.save();
  ctx.translate(m.x, m.y);
  ctx.save();
  ctx.rotate(m.angle);
  ctx.beginPath();
  ctx.moveTo(18, -8);
  ctx.lineTo(28, 0);
  ctx.lineTo(18, 8);
  ctx.closePath();
  ctx.fillStyle = INK;
  ctx.fill();
  ctx.restore();
  disc(ctx, 0, 0, 17, INK, '#FFFFFF', 2);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `800 10px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('CEO', 0, 0.5);
  ctx.restore();
}

/** The CEO on the overview strip: the route dashed and a diamond where the CEO walks. */
export function drawCeoOnStrip(ctx, state, toX, toY) {
  const c = state.ceo;
  if (!c) return;
  ctx.save();
  ctx.setLineDash([3, 3]);
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = INK;
  ctx.beginPath();
  routePoints(c).forEach((p, i) => (i === 0 ? ctx.moveTo(toX(p.x), toY(p.y)) : ctx.lineTo(toX(p.x), toY(p.y))));
  ctx.stroke();
  ctx.setLineDash([]);
  const cone = ceoCone(state);
  if (cone) {
    const x = toX(cone.x);
    const y = toY(cone.y);
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
  }
  ctx.restore();
}
