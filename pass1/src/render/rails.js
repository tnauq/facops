// Draws the crew bar (spec 6.5) and the alarm rail (6.6). What each card and ticket shows comes
// from src/ui/crewbar.js and src/ui/rail.js; this file only paints it.

import { drawFaultGlyph, drawHatDot, drawTech } from './icons.js';

const PANEL = '#FFFFFF';
const EDGE = '#C9D1DB';
const INK = '#1F3A5F';
const MUTED = '#56606E';
const WORK = '#2F6DBC'; // fix progress, as on the alarm bubbles
const TRACK = '#E8ECF1';
const FONT = "system-ui, -apple-system, 'Segoe UI', sans-serif";

function panel(ctx, r, selected) {
  ctx.beginPath();
  ctx.roundRect(r.x, r.y, r.w, r.h, 8);
  ctx.fillStyle = PANEL;
  ctx.fill();
  if (selected) {
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(r.x + 1, r.y + 1, r.w - 2, r.h - 2, 7);
  } else {
    ctx.strokeStyle = EDGE;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1, 8);
  }
  ctx.stroke();
}

function bar(ctx, x, y, w, h, fraction, color) {
  ctx.fillStyle = TRACK;
  ctx.fillRect(x, y, w, h);
  if (fraction > 0) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w * Math.min(1, fraction), h);
  }
}

function text(ctx, s, x, y, { weight = 400, color = INK, align = 'left' } = {}) {
  ctx.font = `${weight} 11px ${FONT}`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(s, x, y);
}

/** cards: crewCards(...). Tech on top, then trade name, state, and a thin bar while fixing. */
export function drawCrewBar(ctx, cards) {
  for (const c of cards) {
    panel(ctx, c, c.selected);
    const cx = c.x + c.w / 2;
    // Spread the three lines over the card's height, which shrinks on small screens.
    const top = c.y + Math.min(26, c.h * 0.3);
    drawTech(ctx, cx, top, 40, c.trade, { busy: c.status === 'Fixing' });
    const lines = c.y + c.h * 0.62;
    text(ctx, c.name, cx, lines, { weight: 600, align: 'center' });
    text(ctx, c.status, cx, lines + 13, { color: MUTED, align: 'center' });
    if (c.progress !== null) bar(ctx, c.x + 8, c.y + c.h - 7, c.w - 16, 3, c.progress, WORK);
  }
}

const BAR_COLOR = { clock: INK, progress: WORK, spent: INK };

/** rail: railTickets(...). Glyph and name, place, fastest hat top-right, assigned hat, bar along the bottom. */
export function drawRail(ctx, rail) {
  for (const t of rail.tickets) {
    panel(ctx, t, t.selected);
    drawFaultGlyph(ctx, t.x + 14, t.y + 14, 16, t.type, INK);
    text(ctx, t.name, t.x + 26, t.y + 14, { weight: 600 });
    text(ctx, t.place, t.x + 26, t.y + 28, { color: MUTED });
    drawHatDot(ctx, t.x + t.w - 10, t.y + 10, 5, t.trade);
    // Who is on it: the hat of the assigned tech at the left edge, or a hollow dot when queued.
    if (t.assignedTrade) drawHatDot(ctx, t.x + 14, t.y + 29, 5, t.assignedTrade);
    else if (t.queued) {
      ctx.beginPath();
      ctx.arc(t.x + 14, t.y + 29, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = PANEL;
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    bar(ctx, t.x + 6, t.y + t.h - 7, t.w - 12, 3, t.bar.fraction, BAR_COLOR[t.bar.kind]);
  }
  const chip = rail.chip;
  if (chip) {
    ctx.beginPath();
    ctx.roundRect(chip.x, chip.y, chip.w, chip.h, chip.h / 2);
    ctx.fillStyle = PANEL;
    ctx.fill();
    ctx.strokeStyle = EDGE;
    ctx.lineWidth = 1;
    ctx.stroke();
    text(ctx, chip.text, chip.x + chip.w / 2, chip.y + chip.h / 2, { weight: 600, color: MUTED, align: 'center' });
  }
}
