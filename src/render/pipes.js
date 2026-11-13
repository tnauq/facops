// Draws the chilled-water pipes (M19) from pipeRuns (src/ui/pipes.js): insulated blue pipes with a
// dark edge and a highlight. Pipes past the online part of the building, and Plant B's before it
// opens, are pale, like the halls under construction. Drawn under the equipment, so every CDU,
// chiller and pump sits on its pipe.

import { onlineSpan, pipeRuns } from '../ui/pipes.js';

const RUNS = pipeRuns();
const EDGE = '#2A5E9C';
const BODY = '#4A86C8';
const SHINE = 'rgba(255, 255, 255, 0.45)';
const WIDTH = 9; // world units
const OFFLINE_ALPHA = 0.3;

function stroke(ctx, v, segs, width, color, dy = 0) {
  ctx.beginPath();
  for (const r of segs) {
    ctx.moveTo(v.ox + r.x1 * v.scale, v.oy + (r.y1 + dy) * v.scale);
    ctx.lineTo(v.ox + r.x2 * v.scale, v.oy + (r.y2 + dy) * v.scale);
  }
  ctx.lineWidth = Math.max(1, width * v.scale);
  ctx.strokeStyle = color;
  ctx.stroke();
}

function drawSet(ctx, v, segs) {
  if (segs.length === 0) return;
  ctx.lineCap = 'square';
  stroke(ctx, v, segs, WIDTH + 3, EDGE);
  stroke(ctx, v, segs, WIDTH, BODY);
  ctx.lineCap = 'butt';
  // A highlight along each pipe: on the upper side of horizontal runs, the left of vertical ones.
  const flat = segs.filter((r) => r.y1 === r.y2);
  stroke(ctx, v, flat, 2, SHINE, -2);
  ctx.beginPath();
  for (const r of segs.filter((s) => s.x1 === s.x2)) {
    ctx.moveTo(v.ox + (r.x1 - 2) * v.scale, v.oy + r.y1 * v.scale);
    ctx.lineTo(v.ox + (r.x2 - 2) * v.scale, v.oy + r.y2 * v.scale);
  }
  ctx.lineWidth = Math.max(1, 2 * v.scale);
  ctx.strokeStyle = SHINE;
  ctx.stroke();
}

/** view: { scale, ox, oy }. online: halls online; plantB: whether Plant B is online. */
export function drawPipes(ctx, view, { online = 1, plantB = false } = {}) {
  const span = onlineSpan(online, plantB);
  const live = [];
  const pale = [];
  for (const r of RUNS) {
    if (r.plant === 'B' && !plantB) pale.push(r);
    else if (r.kind === 'header' && r.x2 > span.x2) {
      live.push({ ...r, x2: span.x2 });
      pale.push({ ...r, x1: span.x2 });
    } else live.push(r);
  }
  ctx.save();
  ctx.globalAlpha = OFFLINE_ALPHA;
  drawSet(ctx, view, pale);
  ctx.globalAlpha = 1;
  drawSet(ctx, view, live);
  ctx.restore();
}
