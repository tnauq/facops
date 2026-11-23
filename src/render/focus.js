// A lesson's focus on part of the screen (pass 5 spec 6.1): a pulsing ink frame just inside the
// region, here the crew bar during the roles lesson. Ink only: hat colours mean trade.

const INK = '#1F3A5F';

/** rect: { x, y, w, h } in CSS pixels; nowMs drives the pulse. */
export function drawFocusFrame(ctx, rect, nowMs) {
  const pulse = 0.5 + 0.5 * Math.sin(nowMs / 220);
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.globalAlpha = 0.45 + 0.45 * pulse;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(rect.x + 2.5, rect.y + 2.5, rect.w - 5, rect.h - 5, 8);
  ctx.stroke();
  ctx.restore();
}

/**
 * Pass 10 (M61): a part of the screen has just appeared. An ink ring that grows from the part and
 * fades, k from 0 to 1, twice over.
 */
export function drawPulse(ctx, rect, k) {
  const beat = (k * 2) % 1;
  const grow = 2 + 8 * beat;
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.globalAlpha = 0.85 * (1 - beat);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(rect.x - grow, rect.y - grow, rect.w + 2 * grow, rect.h + 2 * grow, 8 + grow);
  ctx.stroke();
  ctx.restore();
}
