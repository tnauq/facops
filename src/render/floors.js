// Floors (M19, at the owner's request): smoothed concrete outside the data halls, with saw-cut
// control joints, and white raised-floor tiles inside them. The concrete is a small tiled texture
// made once in code (no image files); where a canvas cannot be made (tests) it is a flat colour.

const CONCRETE = '#CBCAC5';
const JOINT = 'rgba(70, 70, 64, 0.22)';
const TILE = '#FBFCFD';
const TILE_LINE = 'rgba(128, 140, 156, 0.38)';
const TEX_PX = 256; // texture size in pixels...
const TEX_WORLD = 240; // ...covering this many world units
export const TILE_WORLD = 32; // one raised-floor tile, in world units
export const JOINT_EVERY = 280; // control joints in the concrete, in world units

let texture = null;
let textureTried = false;

// A seamless mottled-concrete texture: soft blotches a shade darker or lighter, and fine grit.
function concreteTexture() {
  if (textureTried) return texture;
  textureTried = true;
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = TEX_PX;
  c.height = TEX_PX;
  const g = c.getContext('2d');
  if (!g) return null;
  g.fillStyle = CONCRETE;
  g.fillRect(0, 0, TEX_PX, TEX_PX);
  let seed = 7;
  const rand = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 4294967296);
  const blot = (x, y, r, color) => {
    for (const dx of [-TEX_PX, 0, TEX_PX]) for (const dy of [-TEX_PX, 0, TEX_PX]) {
      g.beginPath();
      g.arc(x + dx, y + dy, r, 0, Math.PI * 2);
      g.fillStyle = color;
      g.fill();
    }
  };
  // Many small, faint blotches read as smooth trowelled concrete; big ones read as spots.
  for (let i = 0; i < 420; i++) {
    const dark = rand() < 0.5;
    blot(rand() * TEX_PX, rand() * TEX_PX, 3 + rand() * 14, dark ? `rgba(60, 58, 52, ${0.008 + rand() * 0.018})` : `rgba(255, 255, 250, ${0.012 + rand() * 0.025})`);
  }
  for (let i = 0; i < 1400; i++) {
    g.fillStyle = rand() < 0.5 ? 'rgba(40, 40, 36, 0.07)' : 'rgba(255, 255, 255, 0.12)';
    g.fillRect(Math.floor(rand() * TEX_PX), Math.floor(rand() * TEX_PX), 1, 1);
  }
  texture = c;
  return texture;
}

/** Fill a world rectangle with smoothed concrete. view: { scale, ox, oy }. */
export function fillConcrete(ctx, v, x, y, w, h) {
  const tex = concreteTexture();
  let fill = CONCRETE;
  if (tex) {
    const pattern = ctx.createPattern(tex, 'repeat');
    if (pattern && typeof pattern.setTransform === 'function' && typeof DOMMatrix !== 'undefined') {
      const k = (TEX_WORLD / TEX_PX) * v.scale;
      pattern.setTransform(new DOMMatrix([k, 0, 0, k, v.ox, v.oy]));
      fill = pattern;
    }
  }
  ctx.fillStyle = fill;
  ctx.fillRect(v.ox + x * v.scale, v.oy + y * v.scale, w * v.scale, h * v.scale);
}

/** Saw-cut joints across a concrete rectangle, on a grid fixed to the building. */
export function drawJoints(ctx, v, x, y, w, h) {
  ctx.save();
  ctx.strokeStyle = JOINT;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let jx = Math.ceil(x / JOINT_EVERY) * JOINT_EVERY; jx < x + w; jx += JOINT_EVERY) {
    const sx = Math.round(v.ox + jx * v.scale) + 0.5;
    ctx.moveTo(sx, v.oy + y * v.scale);
    ctx.lineTo(sx, v.oy + (y + h) * v.scale);
  }
  for (let jy = Math.ceil(y / JOINT_EVERY) * JOINT_EVERY; jy < y + h; jy += JOINT_EVERY) {
    const sy = Math.round(v.oy + jy * v.scale) + 0.5;
    ctx.moveTo(v.ox + x * v.scale, sy);
    ctx.lineTo(v.ox + (x + w) * v.scale, sy);
  }
  ctx.stroke();
  ctx.restore();
}

/** White raised-floor tiles over a hall's floor, the grid starting at the hall's corner. */
export function fillTiles(ctx, v, x, y, w, h) {
  const px = v.ox + x * v.scale;
  const py = v.oy + y * v.scale;
  ctx.fillStyle = TILE;
  ctx.fillRect(px, py, w * v.scale, h * v.scale);
  ctx.save();
  ctx.strokeStyle = TILE_LINE;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let tx = TILE_WORLD; tx < w; tx += TILE_WORLD) {
    const sx = Math.round(px + tx * v.scale) + 0.5;
    ctx.moveTo(sx, py);
    ctx.lineTo(sx, py + h * v.scale);
  }
  for (let ty = TILE_WORLD; ty < h; ty += TILE_WORLD) {
    const sy = Math.round(py + ty * v.scale) + 0.5;
    ctx.moveTo(px, sy);
    ctx.lineTo(px + w * v.scale, sy);
  }
  ctx.stroke();
  ctx.restore();
}
