// Draws the chilled-water pipes (M19) from src/ui/pipes.js. The pipes run overhead:
//   - On the floor (drawPipeShadows, under the equipment): each pipe's shadow, offset by its
//     height, so the shadow closes in where a pipe slopes down to its unit.
//   - Overhead (drawOverheadPipes, over the crew): insulated blue pipe with a dark edge and a
//     highlight, darkening as it slopes down; a flange where it meets a unit; a round tap (a short
//     vertical drop, seen from above) over each CDU. Solid: a tech walking under a pipe is hidden
//     for a moment (the owner tried a see-through fade and preferred it without).
// Pipes past the online halls, and Plant B's before it opens, are pale like the halls under
// construction.

import { onlineSpan, pipePieces, pipeTaps } from '../ui/pipes.js';

const PIECES = pipePieces();
const TAPS = pipeTaps();
const EDGE = '#2A5E9C';
const HIGH = [74, 134, 200]; // body colour overhead...
const LOW = [47, 95, 150]; // ...and where it meets its unit
const SHINE = 'rgba(255, 255, 255, 0.45)';
const SHADOW = 'rgba(30, 30, 24, 0.30)';
const WIDTH = 9; // world units
const SHADOW_OFFSET = { x: 9, y: 12 }; // world units at full height
const OFFLINE_ALPHA = 0.3;
const mix = (h) => `rgb(${LOW.map((l, i) => Math.round(l + (HIGH[i] - l) * h)).join(', ')})`;

// Cut pieces at the online span's edge; returns [{ ...piece, pale }].
function withSpan(online, plantB) {
  const span = onlineSpan(online, plantB);
  const out = [];
  PIECES.forEach((p, i) => {
    if (p.plant === 'B' && !plantB) return out.push({ ...p, i, pale: true });
    if (p.y1 === p.y2 && p.x1 < span.x2 && p.x2 > span.x2) {
      const k = (span.x2 - p.x1) / (p.x2 - p.x1);
      const h = p.h1 + (p.h2 - p.h1) * k;
      out.push({ ...p, i, x2: span.x2, h2: h, pale: false });
      out.push({ ...p, i, x1: span.x2, h1: h, pale: true });
      return undefined;
    }
    return out.push({ ...p, i, pale: p.x1 >= span.x2 && p.plant !== 'A' });
  });
  return out;
}

const sx = (v, x) => v.ox + x * v.scale;
const sy = (v, y) => v.oy + y * v.scale;

/** The pipes' shadows on the floor. view: { scale, ox, oy }. */
export function drawPipeShadows(ctx, v, { online = 1, plantB = false } = {}) {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = SHADOW;
  ctx.lineWidth = Math.max(1, WIDTH * v.scale);
  for (const pale of [true, false]) {
    ctx.globalAlpha = pale ? OFFLINE_ALPHA : 1;
    ctx.beginPath();
    for (const p of withSpan(online, plantB)) {
      if (p.pale !== pale) continue;
      ctx.moveTo(sx(v, p.x1 + SHADOW_OFFSET.x * p.h1), sy(v, p.y1 + SHADOW_OFFSET.y * p.h1));
      ctx.lineTo(sx(v, p.x2 + SHADOW_OFFSET.x * p.h2), sy(v, p.y2 + SHADOW_OFFSET.y * p.h2));
    }
    // A tap's shadow runs from under the header down to the CDU.
    for (const t of TAPS) {
      if ((t.hall > online) !== pale) continue;
      ctx.moveTo(sx(v, t.x + SHADOW_OFFSET.x), sy(v, t.y + SHADOW_OFFSET.y));
      ctx.lineTo(sx(v, t.x), sy(v, t.y));
    }
    ctx.stroke();
  }
  ctx.restore();
}

function pipePiece(ctx, v, p) {
  const x1 = sx(v, p.x1);
  const y1 = sy(v, p.y1);
  const x2 = sx(v, p.x2);
  const y2 = sy(v, p.y2);
  ctx.lineCap = 'butt';
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.lineWidth = Math.max(1, (WIDTH + 3) * v.scale);
  ctx.strokeStyle = EDGE;
  ctx.stroke();
  let body = mix(p.h1);
  if (p.h1 !== p.h2) {
    const g = ctx.createLinearGradient(x1, y1, x2, y2);
    g.addColorStop(0, mix(p.h1));
    g.addColorStop(1, mix(p.h2));
    body = g;
  }
  ctx.lineWidth = Math.max(1, WIDTH * v.scale);
  ctx.strokeStyle = body;
  ctx.stroke();
  // Highlight: on the upper side of horizontal pieces, the left of vertical ones.
  const flat = p.y1 === p.y2;
  const d = 2 * v.scale;
  ctx.beginPath();
  ctx.moveTo(x1 - (flat ? 0 : d), y1 - (flat ? d : 0));
  ctx.lineTo(x2 - (flat ? 0 : d), y2 - (flat ? d : 0));
  ctx.lineWidth = Math.max(1, 2 * v.scale);
  ctx.strokeStyle = SHINE;
  ctx.stroke();
}

// A pipe end seen from above as it turns straight down: a flanged circle.
function flange(ctx, v, x, y, r) {
  ctx.beginPath();
  ctx.arc(sx(v, x), sy(v, y), r * v.scale, 0, Math.PI * 2);
  ctx.fillStyle = mix(0);
  ctx.fill();
  ctx.lineWidth = Math.max(1, 2 * v.scale);
  ctx.strokeStyle = EDGE;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(sx(v, x), sy(v, y), r * 0.5 * v.scale, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
  ctx.lineWidth = Math.max(1, 1.5 * v.scale);
  ctx.stroke();
}

/** The pipes overhead, drawn after the crew and the CEO. */
export function drawOverheadPipes(ctx, v, { online = 1, plantB = false } = {}) {
  ctx.save();
  for (const p of withSpan(online, plantB)) {
    ctx.globalAlpha = p.pale ? OFFLINE_ALPHA : 1;
    pipePiece(ctx, v, p);
    // Where the piece reaches its unit, the pipe turns down.
    if (p.h1 === 0) flange(ctx, v, p.x1, p.y1, 6.5);
    if (p.h2 === 0) flange(ctx, v, p.x2, p.y2, 6.5);
  }
  for (const t of TAPS) {
    ctx.globalAlpha = t.hall > online ? OFFLINE_ALPHA : 1;
    flange(ctx, v, t.x, t.y, 7.5);
  }
  ctx.restore();
}

/** Both layers at once, for pages with no crew (the map preview). */
export function drawPipes(ctx, v, opts = {}) {
  drawPipeShadows(ctx, v, opts);
  drawOverheadPipes(ctx, v, opts);
}
