// Warnings on the map and the strip (pass 8 spec 4.2, M47): a wrench in a white disc, raised like an
// alarm bubble, with the time left as an ink ring that runs down (the check's progress in the work
// blue while a tech checks it). Never a band or hat colour: a warning is not an alarm.

import { drawUpgrade } from './upgrades.js';
import { WRENCH_RADIUS } from '../ui/warningsView.js';

const INK = '#1F3A5F';
const TRACK = '#C9D1DB';
const WORK = '#2F6DBC';

/** marks: warningMarks(...); selectedId: the selected warning, ringed. */
export function drawWarnings(ctx, marks, selectedId = null) {
  for (const m of marks) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(m.x, m.y, WRENCH_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = TRACK;
    ctx.stroke();
    const share = m.checking !== null ? m.checking : m.share;
    ctx.beginPath();
    ctx.arc(m.x, m.y, WRENCH_RADIUS, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * share);
    ctx.strokeStyle = m.checking !== null ? WORK : INK;
    ctx.stroke();
    if (m.id === selectedId) {
      ctx.beginPath();
      ctx.arc(m.x, m.y, WRENCH_RADIUS + 5, 0, Math.PI * 2);
      ctx.lineWidth = 2;
      ctx.strokeStyle = INK;
      ctx.setLineDash([4, 3]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    drawUpgrade(ctx, m.x, m.y, 22, 'tools');
    ctx.restore();
  }
}

/** Small ink wrench marks on the strip: a dot with a short handle. */
export function drawStripWrenches(ctx, wrenches) {
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.fillStyle = '#FFFFFF';
  ctx.lineWidth = 1.5;
  for (const w of wrenches) {
    ctx.beginPath();
    ctx.arc(w.x, w.y, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(w.x + 2, w.y + 2);
    ctx.lineTo(w.x + 5, w.y + 5);
    ctx.stroke();
  }
  ctx.restore();
}
