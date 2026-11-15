// Draws the yard outside the building (M28, owner 15 Nov): transformers with their bus ducts to
// the switchboards, the RMUs cabled to each pair's two transformers, the north and south power
// lines on poles, and the dry cooler blocks piped to the plants' pumps. Seen from above, in the
// style of the equipment inside. Positions come from src/core/outdoor.js.

import { DRY_COOLERS, DRY_PIPES, POLES, POWER_LINES, RMUS, TRANSFORMERS, WORLD } from '../core/layout2.js';
import { RMU, TRANSFORMER, YARD_PAD } from '../core/outdoor.js';
import { drawJoints, fillConcrete } from './floors.js';

const C = {
  tank: '#76837A', tankDark: '#5A665E', fin: '#4E5952', bushing: '#E9ECEF', bushingEdge: '#4A4F55',
  duct: '#8C939B', ductEdge: '#59606A', cable: '#23262B',
  rmu: '#C9CED5', rmuEdge: '#6A717B', rmuPanel: '#AEB5BE',
  pole: '#7A5A3A', poleTop: '#5C4329', wire: 'rgba(30, 32, 36, 0.8)',
  pad: 'rgba(200, 199, 194, 0.95)', padEdge: 'rgba(80, 64, 44, 0.4)',
  dry: '#BFC6CE', dryEdge: '#5E6670', fan: '#3B4148', fanHub: '#D5DAE0',
  pipe: '#1C1D20', pipeEdge: '#050506', pipeShine: 'rgba(255, 255, 255, 0.22)',
  plate: '#FFFFFF', plateInk: '#5A4506',
};
const PALE = 0.35;

const sx = (v, x) => v.ox + x * v.scale;
const sy = (v, y) => v.oy + y * v.scale;
const seen = (v, screen, x, y, r) => sx(v, x + r) >= 0 && sx(v, x - r) <= screen.w && sy(v, y + r) >= 0 && sy(v, y - r) <= screen.h;

function box(ctx, v, cx, cy, w, h, fill, edge, radius = 3, line = 1.2) {
  ctx.beginPath();
  ctx.roundRect(sx(v, cx - w / 2), sy(v, cy - h / 2), w * v.scale, h * v.scale, radius * v.scale);
  ctx.fillStyle = fill;
  ctx.fill();
  if (edge) {
    ctx.strokeStyle = edge;
    ctx.lineWidth = Math.max(1, line * v.scale);
    ctx.stroke();
  }
}

function polyline(ctx, v, points, width, color, dash = null) {
  ctx.beginPath();
  points.forEach((p, i) => (i === 0 ? ctx.moveTo(sx(v, p.x), sy(v, p.y)) : ctx.lineTo(sx(v, p.x), sy(v, p.y))));
  ctx.lineWidth = Math.max(1, width * v.scale);
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.setLineDash(dash ? dash.map((d) => d * v.scale) : []);
  ctx.stroke();
  ctx.setLineDash([]);
}

// ---------------------------------------------------------------- power

// A pad-mounted transformer from above: the tank, cooling fins along both sides, three bushings on
// each end (high voltage towards the RMU, low voltage towards the building), and its side's plate.
function transformer(ctx, v, t) {
  const { w, h } = TRANSFORMER;
  const toWall = t.half === 't' ? 1 : -1; // +y points at the building on the north side
  box(ctx, v, t.x + 1.5, t.y + 2, w, h, 'rgba(30, 30, 24, 0.25)', null, 4); // shadow
  // Fins: a comb along the left and right sides.
  for (const side of [-1, 1]) {
    for (let k = -3; k <= 3; k++) box(ctx, v, t.x + side * (w / 2 + 3), t.y + k * 6.5, 8, 3.2, C.fin, null, 1);
  }
  box(ctx, v, t.x, t.y, w, h, C.tank, C.tankDark, 4, 1.5);
  box(ctx, v, t.x, t.y, w - 14, h - 14, C.tankDark, null, 3); // the lid's raised panel
  box(ctx, v, t.x, t.y, w - 18, h - 18, C.tank, null, 2);
  for (const end of [-1, 1]) {
    for (const k of [-1, 0, 1]) {
      ctx.beginPath();
      ctx.arc(sx(v, t.x + k * 13), sy(v, t.y + end * toWall * (h / 2 - 9)), 3.6 * v.scale, 0, Math.PI * 2);
      ctx.fillStyle = C.bushing;
      ctx.fill();
      ctx.lineWidth = Math.max(0.8, 1 * v.scale);
      ctx.strokeStyle = C.bushingEdge;
      ctx.stroke();
    }
  }
  // The side plate, as on the switchboards (pass 3 4b.3).
  box(ctx, v, t.x - w / 2 + 11, t.y, 12, 14, C.plate, C.tankDark, 2, 1);
  ctx.font = `800 ${11 * v.scale}px system-ui, -apple-system, 'Segoe UI', sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = C.plateInk;
  ctx.fillText(t.side, sx(v, t.x - w / 2 + 11), sy(v, t.y + 0.5));
}

// An RMU from above: a grey cabinet with three switch panels.
function rmu(ctx, v, r) {
  const { w, h } = RMU;
  box(ctx, v, r.x + 1.5, r.y + 2, w, h, 'rgba(30, 30, 24, 0.25)', null, 3);
  box(ctx, v, r.x, r.y, w, h, C.rmu, C.rmuEdge, 3, 1.4);
  for (const k of [-1, 0, 1]) {
    box(ctx, v, r.x + k * 14, r.y, 11, h - 10, C.rmuPanel, C.rmuEdge, 1.5, 0.8);
    box(ctx, v, r.x + k * 14, r.y - 4, 5, 3, C.rmuEdge, null, 0.5);
  }
}

// The bus duct from a switchboard, out through the wall, to its transformer.
function busDuct(ctx, v, t) {
  const wallSide = t.half === 't' ? 1 : -1;
  const from = { x: t.x, y: t.msbY - wallSide * 6 };
  const to = { x: t.x, y: t.y + wallSide * (TRANSFORMER.h / 2) };
  polyline(ctx, v, [from, to], 11, C.ductEdge);
  polyline(ctx, v, [from, to], 8, C.duct);
}

// Buried cables from an RMU to each of its pair's transformers: out of the RMU, along, and in.
function rmuCables(ctx, v, r) {
  const toWall = r.half === 't' ? 1 : -1;
  const midY = (r.y + (r.half === 't' ? TRANSFORMER.y : TRANSFORMERS.find((t) => t.id === r.feeds[0]).y)) / 2;
  for (const id of r.feeds) {
    const t = TRANSFORMERS.find((x) => x.id === id);
    const start = { x: r.x + (t.x < r.x ? -1 : 1) * (RMU.w / 2 - 6), y: r.y + toWall * (RMU.h / 2) };
    const end = { x: t.x, y: t.y - toWall * (TRANSFORMER.h / 2) };
    polyline(ctx, v, [start, { x: start.x, y: midY }, { x: end.x, y: midY }, end], 3.2, C.cable);
  }
}

// The drop from the power line down to an RMU.
function rmuDrop(ctx, v, r, lineY) {
  const toWall = r.half === 't' ? 1 : -1;
  polyline(ctx, v, [{ x: r.x, y: lineY }, { x: r.x, y: r.y - toWall * (RMU.h / 2) }], 2.2, C.cable);
}

// A power line: three conductors on poles, running off both ends of the map.
function powerLine(ctx, v, screen, line) {
  const x1 = Math.max(line.x1, (-v.ox) / v.scale - 50);
  const x2 = Math.min(line.x2, (screen.w - v.ox) / v.scale + 50);
  if (x2 <= x1) return;
  for (const dy of [-6, 0, 6]) polyline(ctx, v, [{ x: x1, y: line.y + dy }, { x: x2, y: line.y + dy }], 1.3, C.wire);
}

function pole(ctx, v, p) {
  polyline(ctx, v, [{ x: p.x, y: p.y - 10 }, { x: p.x, y: p.y + 10 }], 3.5, C.poleTop); // the cross-arm
  ctx.beginPath();
  ctx.arc(sx(v, p.x), sy(v, p.y), 5.5 * v.scale, 0, Math.PI * 2);
  ctx.fillStyle = C.pole;
  ctx.fill();
}

// ---------------------------------------------------------------- cooling

// A dry cooler unit from above: a grey frame with two big fans.
function dryCooler(ctx, v, u) {
  box(ctx, v, u.x + 2, u.y + 2.5, u.w, u.h, 'rgba(30, 30, 24, 0.22)', null, 4);
  box(ctx, v, u.x, u.y, u.w, u.h, C.dry, C.dryEdge, 4, 1.5);
  const along = u.w >= u.h; // the fans sit along the unit's long side
  const r = (along ? Math.min(u.w / 4, u.h / 2) : Math.min(u.h / 4, u.w / 2)) - 5;
  for (const k of [-1, 1]) {
    const fx = u.x + (along ? (k * u.w) / 4 : 0);
    const fy = u.y + (along ? 0 : (k * u.h) / 4);
    ctx.beginPath();
    ctx.arc(sx(v, fx), sy(v, fy), r * v.scale, 0, Math.PI * 2);
    ctx.fillStyle = C.fan;
    ctx.fill();
    // Blades: five light wedges.
    ctx.fillStyle = 'rgba(213, 218, 224, 0.55)';
    for (let b = 0; b < 5; b++) {
      const a = (b * 2 * Math.PI) / 5;
      ctx.beginPath();
      ctx.moveTo(sx(v, fx), sy(v, fy));
      ctx.arc(sx(v, fx), sy(v, fy), r * 0.9 * v.scale, a, a + 0.55);
      ctx.closePath();
      ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(sx(v, fx), sy(v, fy), r * 0.22 * v.scale, 0, Math.PI * 2);
    ctx.fillStyle = C.fanHub;
    ctx.fill();
  }
}

// A pipe along the ground, black as every pipe on the map (owner, 15 Nov).
function groundPipe(ctx, v, points) {
  polyline(ctx, v, points.map((p) => ({ x: p.x + 4, y: p.y + 5 })), 10, 'rgba(30, 30, 24, 0.25)');
  polyline(ctx, v, points, 10, C.pipeEdge);
  polyline(ctx, v, points, 7.5, C.pipe);
  polyline(ctx, v, points.map((p) => ({ x: p.x - 1.5, y: p.y - 1.5 })), 2, C.pipeShine);
}

/**
 * The yard's ground, drawn before the building's walls: concrete under the transformers and RMUs,
 * one piece along the whole north wall and one along the south (owner, 15 Nov). The ends stay dirt.
 */
export function drawYardGround(ctx, v) {
  const depth = -YARD_PAD.y1;
  ctx.save();
  for (const [y, h] of [[YARD_PAD.y1, depth], [WORLD.height, depth]]) {
    fillConcrete(ctx, v, 0, y, WORLD.width, h);
    drawJoints(ctx, v, 0, y, WORLD.width, h);
    ctx.strokeStyle = C.padEdge;
    ctx.lineWidth = 1;
    ctx.strokeRect(sx(v, 0), sy(v, y), WORLD.width * v.scale, h * v.scale);
  }
  ctx.restore();
}

/**
 * Everything in the yard. opts.alpha(id): how solid to draw a transformer, RMU or dry cooler unit
 * (faint while it is only a spot, filling in while it is built). Called after the building's floors
 * and walls, before the equipment inside.
 */
export function drawYard(ctx, v, screen, { alpha = () => 1 } = {}) {
  ctx.save();
  // Dry cooler blocks on their pads, then their pipes to the pumps.
  for (const d of DRY_COOLERS) {
    if (!seen(v, screen, (d.x1 + d.x2) / 2, (d.y1 + d.y2) / 2, 400)) continue;
    ctx.fillStyle = C.pad;
    ctx.fillRect(sx(v, d.x1 - 14), sy(v, d.y1 - 14), (d.x2 - d.x1 + 28) * v.scale, (d.y2 - d.y1 + 28) * v.scale);
    ctx.strokeStyle = C.padEdge;
    ctx.lineWidth = 1;
    ctx.strokeRect(sx(v, d.x1 - 14), sy(v, d.y1 - 14), (d.x2 - d.x1 + 28) * v.scale, (d.y2 - d.y1 + 28) * v.scale);
    for (const u of d.units) {
      ctx.globalAlpha = alpha(u.id);
      dryCooler(ctx, v, u);
    }
    ctx.globalAlpha = 1;
  }
  for (const p of DRY_PIPES) groundPipe(ctx, v, p.points);

  // Power: lines and drops, cables and ducts, then the units on top.
  for (const line of POWER_LINES) powerLine(ctx, v, screen, line);
  for (const r of RMUS) {
    if (!seen(v, screen, r.x, r.y, 160)) continue;
    ctx.globalAlpha = Math.max(PALE, alpha(r.id));
    rmuDrop(ctx, v, r, POWER_LINES.find((l) => l.side === r.half).y);
    rmuCables(ctx, v, r);
  }
  for (const t of TRANSFORMERS) {
    if (!seen(v, screen, t.x, t.y, 140)) continue;
    ctx.globalAlpha = Math.max(PALE, alpha(t.id));
    busDuct(ctx, v, t);
  }
  ctx.globalAlpha = 1;
  for (const p of POLES) if (seen(v, screen, p.x, p.y, 20)) pole(ctx, v, p);
  for (const r of RMUS) {
    if (!seen(v, screen, r.x, r.y, 40)) continue;
    ctx.globalAlpha = alpha(r.id);
    rmu(ctx, v, r);
  }
  for (const t of TRANSFORMERS) {
    if (!seen(v, screen, t.x, t.y, 50)) continue;
    ctx.globalAlpha = alpha(t.id);
    transformer(ctx, v, t);
  }
  ctx.restore();
}

/** A yard device's picture for the build card, centred at (x, y) and about `size` px across. */
export function drawYardPicture(ctx, type, x, y, size, side = 'A') {
  const k = size / 62; // world units to px for the picture
  const v = { scale: k, ox: x, oy: y };
  ctx.save();
  if (type === 'xfmr') transformer(ctx, v, { x: 0, y: 0, half: 't', side });
  else if (type === 'rmu') rmu(ctx, v, { x: 0, y: 0 });
  else if (type === 'dry') dryCooler(ctx, { scale: k * 0.55, ox: x, oy: y }, { x: 0, y: 0, w: 100, h: 92 });
  ctx.restore();
}
