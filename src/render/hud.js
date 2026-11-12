// Draws the HUD strip (spec section 6.3): clock, band mark and load, Stability meter, and the
// settings and pause buttons. Positions come from hudLayout; the numbers from hudModel.

import { BAND_COLOR, BAND_SHAPE } from '../ui/hud.js';

const PANEL = '#FFFFFF';
const EDGE = '#C9D1DB';
const INK = '#1F3A5F';
const MUTED = '#56606E';
const TRACK = '#E8ECF1';
const FONT = "system-ui, -apple-system, 'Segoe UI', sans-serif";

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

/** The band mark: a filled circle, triangle or square in the band color. */
export function drawBandMark(ctx, cx, cy, size, band) {
  const s = size / 2;
  ctx.fillStyle = BAND_COLOR[band];
  ctx.beginPath();
  const shape = BAND_SHAPE[band];
  if (shape === 'circle') ctx.arc(cx, cy, s, 0, Math.PI * 2);
  else if (shape === 'triangle') {
    ctx.moveTo(cx, cy - s);
    ctx.lineTo(cx + s * 1.1, cy + s * 0.85);
    ctx.lineTo(cx - s * 1.1, cy + s * 0.85);
    ctx.closePath();
  } else ctx.rect(cx - s * 0.9, cy - s * 0.9, s * 1.8, s * 1.8);
  ctx.fill();
}

function drawGear(ctx, cx, cy, r) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = INK;
  for (let i = 0; i < 8; i++) {
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-r * 0.2, -r * 1.15, r * 0.4, r * 0.5);
  }
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PANEL;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.35, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawPauseBars(ctx, cx, cy, r) {
  ctx.fillStyle = INK;
  ctx.fillRect(cx - r * 0.8, cy - r, r * 0.55, r * 2);
  ctx.fillRect(cx + r * 0.25, cy - r, r * 0.55, r * 2);
}

/** layout: hudLayout(W). model: hudModel(state). note: optional muted text, e.g. "Auto". */
export function drawHud(ctx, W, layout, model, note = '') {
  const { cy } = layout;
  // The strip: a white panel with an edge along the bottom.
  ctx.fillStyle = PANEL;
  ctx.fillRect(0, 0, W, cy * 2);
  ctx.fillStyle = EDGE;
  ctx.fillRect(0, cy * 2 - 1, W, 1);

  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = INK;
  ctx.font = `600 15px ${FONT}`;
  ctx.fillText(model.clock, layout.clock.x, cy);

  drawBandMark(ctx, layout.bandMark.cx, cy, layout.bandMark.size, model.band);
  ctx.fillStyle = INK;
  ctx.fillText(model.load, layout.load.x, cy);

  ctx.font = `11px ${FONT}`;
  ctx.fillStyle = MUTED;
  ctx.fillText('Stability', layout.meterLabel.x, cy);
  const m = layout.meter;
  roundRect(ctx, m.x, m.y, m.w, m.h, m.h / 2);
  ctx.fillStyle = TRACK;
  ctx.fill();
  if (model.meter > 0) {
    ctx.save();
    roundRect(ctx, m.x, m.y, m.w, m.h, m.h / 2);
    ctx.clip();
    ctx.fillStyle = BAND_COLOR[model.band];
    ctx.fillRect(m.x, m.y, (m.w * model.meter) / 100, m.h);
    ctx.restore();
  }
  roundRect(ctx, m.x, m.y, m.w, m.h, m.h / 2);
  ctx.strokeStyle = EDGE;
  ctx.lineWidth = 1;
  ctx.stroke();

  if (note) {
    ctx.fillStyle = MUTED;
    ctx.fillText(note, layout.note.x, cy);
  }

  for (const b of layout.buttons) {
    const bx = b.x + 3;
    roundRect(ctx, bx, b.y + 3, b.w - 6, b.h - 6, 8);
    ctx.fillStyle = PANEL;
    ctx.fill();
    ctx.strokeStyle = EDGE;
    ctx.stroke();
    const cx = b.x + b.w / 2;
    if (b.id === 'settings') drawGear(ctx, cx, cy, 7);
    else drawPauseBars(ctx, cx, cy, 7);
  }
}
