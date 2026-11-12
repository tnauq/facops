// The tutorial's one-line callouts (pass 2 spec 8): white box, ink text, at the top or bottom edge
// of the map, whichever is clear of the lesson's alarms. Wraps onto a second line if needed.

const INK = '#1F3A5F';
const EDGE = '#C9D1DB';
const FONT = "600 13px system-ui, -apple-system, 'Segoe UI', sans-serif";
const PAD = 10;
const LINE = 17;

function wrap(ctx, text, width) {
  const words = text.split(' ');
  const lines = [''];
  for (const w of words) {
    const tryLine = lines.at(-1) ? `${lines.at(-1)} ${w}` : w;
    if (ctx.measureText(tryLine).width <= width || !lines.at(-1)) lines[lines.length - 1] = tryLine;
    else lines.push(w);
  }
  return lines;
}

/** rect: the map region. avoidYs: screen y of the lesson's alarms; the box goes to the other edge. */
export function drawCallout(ctx, rect, text, avoidYs = []) {
  if (!text) return;
  ctx.save();
  ctx.font = FONT;
  const maxW = Math.min(rect.w - 96, 460); // clear of the off-map arrows in the corners
  const lines = wrap(ctx, text, maxW - 2 * PAD);
  const w = Math.min(maxW, Math.max(...lines.map((l) => ctx.measureText(l).width)) + 2 * PAD);
  const h = lines.length * LINE + 2 * PAD - 4;
  const mid = rect.y + rect.h / 2;
  const top = avoidYs.some((y) => y < mid);
  const x = rect.x + (rect.w - w) / 2;
  const y = top ? rect.y + rect.h - h - 8 : rect.y + 8;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 8);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.96)';
  ctx.fill();
  ctx.strokeStyle = EDGE;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = INK;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  lines.forEach((l, i) => ctx.fillText(l, x + w / 2, y + PAD - 2 + LINE / 2 + i * LINE));
  ctx.restore();
}
