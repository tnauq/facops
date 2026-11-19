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

const RED = '#D9483B'; // the HUD's red band colour

// Building mode (pass 4 spec 3.3): "Cash" then the cash and its rate, where Stability was; in the red,
// the cash and the countdown in the red band colour.
function drawMoney(ctx, layout, money) {
  const { cy } = layout;
  ctx.font = `11px ${FONT}`;
  ctx.fillStyle = MUTED;
  ctx.fillText('Cash', layout.meterLabel.x + 18, cy);
  let x = layout.meter.x;
  ctx.font = `600 15px ${FONT}`;
  ctx.fillStyle = money.red ? RED : INK;
  ctx.fillText(money.cash, x, cy);
  x += ctx.measureText(money.cash).width + 8;
  ctx.font = `600 12px ${FONT}`;
  ctx.fillStyle = money.falling ? RED : MUTED;
  ctx.fillText(money.rate, x, cy);
  x += ctx.measureText(money.rate).width + 8;
  // Pass 5 spec 7.3: how long the cash lasts at this rate, in the falling rate's red.
  if (money.runway && !money.red) {
    const text = `· ${money.runway}`;
    ctx.fillStyle = RED;
    ctx.fillText(text, x - 4, cy);
    x += ctx.measureText(text).width + 4;
  }
  // Pass 5 spec 3.2: a thin bar under the cash and its rate that empties as the loan is repaid, so the
  // loan reads even when the note has no room to name it. Ink, not a band colour: it is not a warning.
  if (money.loanShare > 0) {
    const w = x - 8 - layout.meter.x;
    ctx.fillStyle = TRACK;
    ctx.fillRect(layout.meter.x, cy * 2 - 5, w, 2);
    ctx.fillStyle = MUTED;
    ctx.fillRect(layout.meter.x, cy * 2 - 5, w * money.loanShare, 2);
  }
  // Pass 7 spec 3.5: service credits, small and red beneath the cash, where the loan's bar was (the
  // loan is always paid off before credits start, so the two never share the line).
  if (money.credits && !money.loanShare) {
    ctx.font = `600 9px ${FONT}`;
    ctx.fillStyle = RED;
    ctx.fillText(money.credits, layout.meter.x, cy * 2 - 6);
  }
  if (money.red) {
    ctx.font = `700 12px ${FONT}`;
    ctx.fillStyle = RED;
    ctx.fillText(`In the red · ${money.red}`, x, cy);
  }
}

// A hardhat seen side on: a dome over a brim. Filled in ink for a strike given, an outline for one to come.
function drawHardhat(ctx, cx, by, r, filled) {
  ctx.beginPath();
  ctx.arc(cx, by, r, Math.PI, 0);
  ctx.closePath();
  ctx.moveTo(cx - r * 1.4, by);
  ctx.lineTo(cx + r * 1.4, by);
  ctx.lineWidth = 1.6;
  ctx.strokeStyle = INK;
  if (filled) {
    ctx.fillStyle = INK;
    ctx.fill();
  }
  ctx.stroke();
}

/**
 * The CEO's strikes (pass 5 spec 4.2): under the clock, which moves up to make room, one hardhat per
 * strike to give. The CEO's hardhat is white, but white vanishes on the white HUD, so a strike given
 * is filled in ink and one to come is an ink outline: never a trade colour.
 */
function drawStrikes(ctx, x, cy, strikes) {
  const gap = Math.min(15, 30 / Math.max(1, strikes.of - 1)); // narrower when the drawer sets more strikes
  const r = Math.min(5.5, gap / 2.8);
  for (let i = 0; i < strikes.of; i++) drawHardhat(ctx, x + 7 + i * gap, cy + 11, r, i < strikes.given);
}

function drawPlay(ctx, cx, cy, r) {
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.moveTo(cx - r * 0.6, cy - r);
  ctx.lineTo(cx + r * 0.9, cy);
  ctx.lineTo(cx - r * 0.6, cy + r);
  ctx.closePath();
  ctx.fill();
}

/**
 * layout: hudLayout(W). model: hudModel(state). note: optional muted text (or wordings, longest
 * first). buttons: { held, speed } for the hold and speed buttons (pass 4 spec 3.4).
 */
export function drawHud(ctx, W, layout, model, note = '', buttons = { held: false, speed: 1 }) {
  const { cy } = layout;
  // The strip: a white panel with an edge along the bottom.
  ctx.fillStyle = PANEL;
  ctx.fillRect(0, 0, W, cy * 2);
  ctx.fillStyle = EDGE;
  ctx.fillRect(0, cy * 2 - 1, W, 1);

  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = INK;
  if (model.strikes) {
    ctx.font = `600 13px ${FONT}`;
    ctx.fillText(model.clock, layout.clock.x, cy - 7);
    drawStrikes(ctx, layout.clock.x, cy, model.strikes);
    ctx.font = `600 15px ${FONT}`;
  } else {
    ctx.font = `600 15px ${FONT}`;
    ctx.fillText(model.clock, layout.clock.x, cy);
  }

  drawBandMark(ctx, layout.bandMark.cx, cy, layout.bandMark.size, model.band);
  ctx.fillStyle = INK;
  ctx.fillText(model.load, layout.load.x, cy);

  if (model.money) drawMoney(ctx, layout, model.money);
  else {
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
  }

  if (note) {
    // `note` may be a list of wordings, longest first: use the first that fits before the buttons.
    const room = layout.buttons[0].x - 8 - layout.note.x;
    const options = Array.isArray(note) ? note : [note];
    const fit = options.find((n) => ctx.measureText(n).width <= room) ?? '';
    ctx.fillStyle = MUTED;
    ctx.fillText(fit, layout.note.x, cy);
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
    else if (b.id === 'hold') (buttons.held ? drawPlay : drawPauseBars)(ctx, cx, cy, 7);
    else if (b.id === 'speed') {
      ctx.font = `700 14px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillStyle = INK;
      ctx.fillText(`${buttons.speed}x`, cx, cy + 1);
      ctx.textAlign = 'left';
    } else drawPauseBars(ctx, cx, cy, 7);
  }
}

/** The flash on entering red (spec 11): the strip washed in the red band color, fading out. */
export function drawHudFlash(ctx, W, h, alpha) {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = 0.45 * alpha;
  ctx.fillStyle = BAND_COLOR.red;
  ctx.fillRect(0, 0, W, h);
  ctx.restore();
}
