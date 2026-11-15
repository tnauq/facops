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

// ---- The ground around the building (pass 3 spec 4b.3, owner 14 Nov) ----
// Bare earth: a seamless brown texture with soft patches, grit and small stones, made once in
// code. Tyre tracks are drawn on top in world space (drawTyreTracks), so they line up with the walls.

const DIRT = '#A88D6C';
const DIRT_TEX_WORLD = 300;
let dirtTex = null;
let dirtTried = false;

function dirtTexture() {
  if (dirtTried) return dirtTex;
  dirtTried = true;
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = TEX_PX;
  c.height = TEX_PX;
  const g = c.getContext('2d');
  if (!g) return null;
  g.fillStyle = DIRT;
  g.fillRect(0, 0, TEX_PX, TEX_PX);
  let seed = 23;
  const rand = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 4294967296);
  const wrap = (draw) => {
    for (const dx of [-TEX_PX, 0, TEX_PX]) for (const dy of [-TEX_PX, 0, TEX_PX]) draw(dx, dy);
  };
  // Patches: damp darker earth and dry paler earth.
  for (let i = 0; i < 160; i++) {
    const x = rand() * TEX_PX;
    const y = rand() * TEX_PX;
    const r = 8 + rand() * 26;
    const color = rand() < 0.55 ? `rgba(70, 50, 30, ${0.03 + rand() * 0.05})` : `rgba(235, 215, 180, ${0.04 + rand() * 0.06})`;
    wrap((dx, dy) => {
      g.beginPath();
      g.ellipse(x + dx, y + dy, r, r * (0.5 + rand() * 0.4), rand() * Math.PI, 0, Math.PI * 2);
      g.fillStyle = color;
      g.fill();
    });
  }
  // Grit.
  for (let i = 0; i < 2200; i++) {
    g.fillStyle = rand() < 0.6 ? 'rgba(60, 42, 24, 0.18)' : 'rgba(250, 238, 215, 0.22)';
    g.fillRect(Math.floor(rand() * TEX_PX), Math.floor(rand() * TEX_PX), 1, 1);
  }
  // Small stones: a pale pebble with a shadow on its lower right.
  for (let i = 0; i < 46; i++) {
    const x = rand() * TEX_PX;
    const y = rand() * TEX_PX;
    const r = 1.2 + rand() * 2.6;
    const shade = 150 + Math.floor(rand() * 60);
    wrap((dx, dy) => {
      g.beginPath();
      g.ellipse(x + dx + 0.8, y + dy + 0.9, r, r * 0.75, 0.4, 0, Math.PI * 2);
      g.fillStyle = 'rgba(50, 35, 20, 0.35)';
      g.fill();
      g.beginPath();
      g.ellipse(x + dx, y + dy, r, r * 0.75, 0.4, 0, Math.PI * 2);
      g.fillStyle = `rgb(${shade}, ${shade - 8}, ${shade - 20})`;
      g.fill();
    });
  }
  dirtTex = c;
  return dirtTex;
}

/** Fill the whole canvas with earth, fixed to the world so it moves with the map. */
export function fillDirt(ctx, v, screen) {
  const tex = dirtTexture();
  let fill = DIRT;
  if (tex) {
    const pattern = ctx.createPattern(tex, 'repeat');
    if (pattern && typeof pattern.setTransform === 'function' && typeof DOMMatrix !== 'undefined') {
      const k = (DIRT_TEX_WORLD / TEX_PX) * v.scale;
      pattern.setTransform(new DOMMatrix([k, 0, 0, k, v.ox, v.oy]));
      fill = pattern;
    }
  }
  ctx.fillStyle = fill;
  ctx.fillRect(0, 0, screen.w, screen.h);
}

/**
 * Faint tyre tracks in the earth along the building's long sides: pairs of tread lines, as left by
 * the delivery trucks. world: { width, height }.
 */
export function drawTyreTracks(ctx, v, world) {
  ctx.save();
  ctx.strokeStyle = 'rgba(70, 50, 30, 0.22)';
  ctx.lineCap = 'butt';
  const tread = Math.max(1, 5 * v.scale);
  ctx.lineWidth = tread;
  ctx.setLineDash([2 * v.scale, 3 * v.scale]);
  const sx = (x) => v.ox + x * v.scale;
  const sy = (y) => v.oy + y * v.scale;
  // One gentle wave per track, so they read as driven rather than ruled.
  const track = (y0, amp, phase) => {
    for (const off of [0, 22]) {
      ctx.beginPath();
      for (let x = -120; x <= world.width + 120; x += 40) {
        const y = y0 + off + amp * Math.sin(x / 520 + phase);
        if (x === -120) ctx.moveTo(sx(x), sy(y));
        else ctx.lineTo(sx(x), sy(y));
      }
      ctx.stroke();
    }
  };
  // Beyond the power lines (M28): the yard nearer the walls holds the transformers and RMUs.
  track(-272, 6, 0.4);
  track(world.height + 248, 7, 2.1);
  ctx.restore();
}

/** A narrow concrete apron just outside the building's outside wall. */
export function drawApron(ctx, v, world, width = 16) {
  ctx.save();
  ctx.fillStyle = 'rgba(203, 202, 197, 0.92)';
  const x = v.ox - width * v.scale;
  const y = v.oy - width * v.scale;
  const w = (world.width + 2 * width) * v.scale;
  const h = (world.height + 2 * width) * v.scale;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(80, 64, 44, 0.35)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  ctx.restore();
}
