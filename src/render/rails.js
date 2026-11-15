// Draws the crew bar (spec 6.5) and the alarm rail (6.6). What each card and ticket shows comes
// from src/ui/crewbar.js and src/ui/rail.js; this file only paints it.

import { drawAlarmBubble, drawFaultGlyph, drawHatDot, drawTech } from './icons.js';

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

// The Hire card at the end of the crew bar (pass 4 M26): a "+" in a dashed circle, "Hire" and the price.
function drawHireCard(ctx, c) {
  ctx.beginPath();
  ctx.roundRect(c.x + 0.5, c.y + 0.5, c.w - 1, c.h - 1, 8);
  ctx.fillStyle = '#F6F8FA';
  ctx.fill();
  ctx.setLineDash([4, 3]);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.setLineDash([]);
  const tall = c.h >= 70;
  const cx = tall ? c.x + c.w / 2 : c.x + 17;
  const cy = tall ? c.y + c.h / 2 - 12 : c.y + c.h / 2;
  const r = tall ? 13 : Math.min(12, c.h / 2 - 6);
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = INK;
  ctx.fill();
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 2.4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - r * 0.5, cy);
  ctx.lineTo(cx + r * 0.5, cy);
  ctx.moveTo(cx, cy - r * 0.5);
  ctx.lineTo(cx, cy + r * 0.5);
  ctx.stroke();
  if (tall) {
    text(ctx, c.title, cx, c.y + c.h - 25, { weight: 600, align: 'center' });
    text(ctx, c.price, cx, c.y + c.h - 13, { color: MUTED, align: 'center' });
  } else {
    text(ctx, c.title, c.x + 33, c.y + c.h / 2 - 7, { weight: 600 });
    text(ctx, c.price, c.x + 33, c.y + c.h / 2 + 7, { color: MUTED });
  }
}

/** cards: crewCards(...). Tech on top, then trade name, state, and a thin bar while fixing. */
export function drawCrewBar(ctx, cards) {
  for (const c of cards) {
    if (c.kind === 'hire') {
      drawHireCard(ctx, c);
      continue;
    }
    panel(ctx, c, c.selected);
    const cx = c.x + c.w / 2;
    if (c.h >= 70) {
      // Tall card: the tech on top, two text lines at the bottom.
      const textTop = c.h - 33;
      drawTech(ctx, cx, c.y + 2 + textTop / 2, 40, c.trade, { busy: c.status === 'Fixing' });
      text(ctx, c.name, cx, c.y + c.h - 25, { weight: 600, align: 'center' });
      text(ctx, c.status, cx, c.y + c.h - 13, { color: MUTED, align: 'center' });
    } else {
      // Short card (a big crew or a small phone): the tech on the left, the text beside it, so
      // neither has to shrink much.
      const mid = c.y + c.h / 2 - 2;
      drawTech(ctx, c.x + 17, mid, Math.min(30, (c.h - 8) / 0.85), c.trade, { busy: c.status === 'Fixing' });
      text(ctx, c.name, c.x + 33, mid - 7, { weight: 600 });
      text(ctx, c.status, c.x + 33, mid + 7, { color: MUTED });
    }
    if (c.progress !== null) bar(ctx, c.x + 8, c.y + c.h - 5, c.w - 16, 3, c.progress, WORK);
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

// A tile (pass 3 spec 4b.2): the alarm's bubble, with its cost underneath when it costs something.
function drawTile(ctx, t) {
  panel(ctx, t, t.selected);
  const costly = t.cost > 0;
  const cy = costly ? t.y + 17 : t.y + t.h / 2;
  drawAlarmBubble(ctx, t.x + t.w / 2, cy, costly ? 12 : 14, t.info, { assignedTrade: t.assignedTrade, queued: t.queued });
  if (costly) {
    ctx.font = `700 10px ${FONT}`;
    ctx.fillStyle = INK;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`−${t.cost}`, t.x + t.w / 2, t.y + t.h - 7);
  }
}

// "+N" over a fade at the bottom of an overflowing rail: a note, not a button.
function drawMore(ctx, m) {
  const g = ctx.createLinearGradient(0, m.y - 10, 0, m.y + m.h);
  g.addColorStop(0, 'rgba(255, 255, 255, 0)');
  g.addColorStop(0.5, 'rgba(255, 255, 255, 0.9)');
  g.addColorStop(1, 'rgba(255, 255, 255, 0.95)');
  ctx.fillStyle = g;
  ctx.fillRect(m.x - 2, m.y - 10, m.w + 4, m.h + 10);
  text(ctx, m.text, m.x + m.w / 2, m.y + m.h / 2 + 1, { weight: 700, color: INK, align: 'center' });
}

/**
 * The pass 3 rail (railTickets2 in src/ui/rail2.js). Full tickets are as drawRail, except that a
 * ticket whose alarm costs something shows the cost ("−34 MW") in bold on its first line in place
 * of the alarm's name: the fault picture still says what it is. When the rail is full, every ticket
 * is a tile instead (spec 4b.2), and a "+N" note shows if even the tiles overflow.
 */
export function drawRail2(ctx, rail) {
  if (!rail.compact) {
    drawRail(ctx, { tickets: rail.tickets.map((t) => ({ ...t, name: t.costText || t.name })), chip: null });
    return;
  }
  for (const t of rail.tickets) drawTile(ctx, t);
  if (rail.more) drawMore(ctx, rail.more);
}
