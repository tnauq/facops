// Pictures for the upgrade cards (pass 2 spec 7.4), drawn in code in the same flat style as the
// equipment: a cart (Carts), a wrench (Better tools), a radio (Radios). Neutral colours only; hat
// colours mean trade and the band colours are for the HUD.

const INK = '#1F3A5F';
const STEEL = '#C9CED6';
const STEEL_LINE = '#7B8494';
const NAVY = '#2B3A67';

function roundRect(ctx, x, y, w, h, r, fill, stroke) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

function disc(ctx, x, y, r, fill) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
}

/** Draw upgrade `id` centred on (x, y) in a square of side `size`. */
export function drawUpgrade(ctx, x, y, size, id) {
  const u = size / 40;
  ctx.save();
  ctx.translate(x, y);
  if (id === 'carts') {
    // A flat utility cart: deck, handle, two wheels.
    roundRect(ctx, -15 * u, -2 * u, 28 * u, 9 * u, 2 * u, STEEL, STEEL_LINE);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3 * u;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(13 * u, 3 * u);
    ctx.lineTo(16 * u, -14 * u);
    ctx.stroke();
    disc(ctx, -9 * u, 11 * u, 4.5 * u, NAVY);
    disc(ctx, 7 * u, 11 * u, 4.5 * u, NAVY);
  } else if (id === 'tools') {
    // A wrench at an angle.
    ctx.rotate(-Math.PI / 4);
    roundRect(ctx, -3.5 * u, -6 * u, 7 * u, 24 * u, 3 * u, STEEL, STEEL_LINE);
    disc(ctx, 0, -10 * u, 9 * u, STEEL);
    ctx.strokeStyle = STEEL_LINE;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, -10 * u, 9 * u, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(-3.5 * u, -21 * u, 7 * u, 10 * u); // the jaw opening
  } else {
    // A handheld radio: body, aerial, speaker grille.
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3 * u;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(6 * u, -12 * u);
    ctx.lineTo(6 * u, -19 * u);
    ctx.stroke();
    roundRect(ctx, -9 * u, -13 * u, 18 * u, 28 * u, 4 * u, NAVY);
    roundRect(ctx, -6 * u, -9 * u, 12 * u, 7 * u, 1.5 * u, STEEL);
    ctx.fillStyle = STEEL;
    for (const gy of [3, 7, 11]) ctx.fillRect(-5 * u, gy * u, 10 * u, 1.6 * u);
  }
  ctx.restore();
}
