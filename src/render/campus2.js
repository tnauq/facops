// Draws the pass 2 building (spec docs/pass2-spec.md, sections 3 and 7.1): walls with door gaps,
// corridors and aisles, 8 halls and 2 plants, every piece of equipment with the supplied icons at
// pass 1's size. Halls not yet online and Plant B before hall 6 are drawn pale, "under construction".
// Only what is on screen is drawn, so the long building costs no more than one screen of it.

import { DOORS, EQUIPMENT, HALLS, LANES, PLANTS, WORLD } from '../core/layout2.js';
import { ICON_SIZE, drawChiller, drawCdu, drawLabel, drawMsb, drawPump, drawRack } from './icons.js';
import { drawJoints, fillConcrete, fillTiles } from './floors.js';
import { drawPipes } from './pipes.js';

const COLOR = {
  page: '#D5DBE3',
  building: '#E7EBF0',
  hall: '#F3F5F8',
  pad: 'rgba(60, 64, 56, 0.07)', // the plants' equipment pads, a shade darker than the concrete
  padEdge: 'rgba(70, 76, 66, 0.35)',
  lane: 'rgba(255, 255, 255, 0.22)', // walkways on the concrete: a lighter band...
  laneEdge: 'rgba(90, 96, 106, 0.22)', // ...between two faint painted edges
  aisle: 'rgba(31, 58, 95, 0.045)', // aisles on the tiles
  wall: '#5C6573',
  muted: '#56606E',
  plantInk: '#56624B',
};
const OFFLINE_ALPHA = 0.35;
const LANE_HALF = 11;
const DOOR_HALF = 24;
const ROW_SIZE = ICON_SIZE.rack;

const sx = (v, x) => v.ox + x * v.scale;
const sy = (v, y) => v.oy + y * v.scale;

function rect(ctx, v, x, y, w, h, fill) {
  ctx.fillStyle = fill;
  ctx.fillRect(sx(v, x), sy(v, y), w * v.scale, h * v.scale);
}

// Is a world box (centre, half sizes) anywhere on the canvas? Skips drawing what cannot be seen.
function onScreen(v, screen, x, y, hw, hh) {
  const l = sx(v, x - hw);
  const r = sx(v, x + hw);
  const t = sy(v, y - hh);
  const b = sy(v, y + hh);
  return r >= 0 && l <= screen.w && b >= 0 && t <= screen.h;
}

/** A wall from (x1, y1) to (x2, y2), axis-aligned, with gaps at the given door points. */
function wall(ctx, v, x1, y1, x2, y2, doors, width) {
  const vertical = x1 === x2;
  const along = vertical ? [y1, y2] : [x1, x2];
  const gaps = doors
    .filter((d) => (vertical ? d.vertical && d.x === x1 : !d.vertical && d.y === y1))
    .map((d) => (vertical ? d.y : d.x))
    .filter((c) => c > Math.min(...along) && c < Math.max(...along))
    .sort((a, b) => a - b);
  const cuts = [Math.min(...along)];
  for (const g of gaps) cuts.push(g - DOOR_HALF, g + DOOR_HALF);
  cuts.push(Math.max(...along));
  ctx.strokeStyle = COLOR.wall;
  ctx.lineWidth = Math.max(1.5, width * v.scale);
  ctx.lineCap = 'square';
  ctx.beginPath();
  for (let i = 0; i < cuts.length; i += 2) {
    if (vertical) {
      ctx.moveTo(sx(v, x1), sy(v, cuts[i]));
      ctx.lineTo(sx(v, x1), sy(v, cuts[i + 1]));
    } else {
      ctx.moveTo(sx(v, cuts[i]), sy(v, y1));
      ctx.lineTo(sx(v, cuts[i + 1]), sy(v, y1));
    }
  }
  ctx.stroke();
}

function laneStrip(ctx, v, lane, fill) {
  const x = Math.min(lane.x1, lane.x2) - LANE_HALF;
  const y = Math.min(lane.y1, lane.y2) - LANE_HALF;
  rect(ctx, v, x, y, Math.abs(lane.x2 - lane.x1) + 2 * LANE_HALF, Math.abs(lane.y2 - lane.y1) + 2 * LANE_HALF, fill);
}

// A walkway on the concrete: a lighter band with faint painted edges.
function walkway(ctx, v, lane) {
  laneStrip(ctx, v, lane, COLOR.lane);
  const x = Math.min(lane.x1, lane.x2) - LANE_HALF;
  const y = Math.min(lane.y1, lane.y2) - LANE_HALF;
  const w = Math.abs(lane.x2 - lane.x1) + 2 * LANE_HALF;
  const h = Math.abs(lane.y2 - lane.y1) + 2 * LANE_HALF;
  ctx.strokeStyle = COLOR.laneEdge;
  ctx.lineWidth = 1;
  ctx.beginPath();
  if (w > h) {
    ctx.moveTo(sx(v, x), sy(v, y));
    ctx.lineTo(sx(v, x + w), sy(v, y));
    ctx.moveTo(sx(v, x), sy(v, y + h));
    ctx.lineTo(sx(v, x + w), sy(v, y + h));
  } else {
    ctx.moveTo(sx(v, x), sy(v, y));
    ctx.lineTo(sx(v, x), sy(v, y + h));
    ctx.moveTo(sx(v, x + w), sy(v, y));
    ctx.lineTo(sx(v, x + w), sy(v, y + h));
  }
  ctx.stroke();
}

/** Healthy status for every icon, or what `status(e)` says (for demos and, later, the game state). */
function drawOne(ctx, v, e, st) {
  const x = sx(v, e.x);
  const y = sy(v, e.y);
  const s = v.scale;
  if (e.type === 'row') {
    for (const ry of e.racks) drawRack(ctx, x, sy(v, ry), ROW_SIZE * s, st);
  } else if (e.type === 'chiller') drawChiller(ctx, x, y, ICON_SIZE.chiller * s, st);
  else if (e.type === 'pump') drawPump(ctx, x, y, ICON_SIZE.pump * s, st);
  else if (e.type === 'cdu') drawCdu(ctx, x, y, ICON_SIZE.cdu * s, st);
  else if (e.type === 'msb') drawMsb(ctx, x, y, ICON_SIZE.msb * s, st);
}

// Half sizes in world units, for culling.
const EXTENT = { row: [24, 75], chiller: [52, 40], pump: [42, 34], cdu: [26, 30], msb: [34, 30] };

// Captions, in world units below the icon centre (above for the bottom-row MSBs, which sit at the edge).
function captionY(e) {
  if (e.type === 'msb') return e.half === 't' ? e.y + 30 : e.y - 44;
  if (e.type === 'chiller') return e.y + 38;
  return null;
}

/**
 * Draw the building. view: { scale, ox, oy } (see src/ui/camera.js cameraView).
 * screen: { w, h } of the canvas, for culling. opts.online: halls online (1 to 8);
 * opts.plantB: whether Plant B is online; opts.status(e): icon options for one piece of equipment.
 */
export function drawBuilding(ctx, view, screen, { online = 1, plantB = false, status = () => ({}) } = {}) {
  const v = view;
  const live = (e) => (e.hall ? e.hall <= online : e.plant === 'A' || plantB);
  const labelPx = Math.max(9, Math.min(13, 19 * v.scale));
  const titlePx = Math.max(10, Math.min(15, 22 * v.scale));

  ctx.fillStyle = COLOR.page;
  ctx.fillRect(0, 0, screen.w, screen.h);
  // Floors (M19): smoothed concrete with control joints, the plants' pads, walkways, then the
  // halls' white raised-floor tiles with their aisles.
  fillConcrete(ctx, v, 0, 0, WORLD.width, WORLD.height);
  drawJoints(ctx, v, 0, 0, WORLD.width, WORLD.height);
  for (const p of Object.values(PLANTS)) {
    ctx.globalAlpha = p.id === 'A' || plantB ? 1 : OFFLINE_ALPHA;
    rect(ctx, v, p.x, p.y, p.w, p.h, COLOR.pad);
    ctx.strokeStyle = COLOR.padEdge;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(sx(v, p.x), sy(v, p.y), p.w * v.scale, p.h * v.scale);
  }
  ctx.globalAlpha = 1;
  // Corridors, plant lanes and the outer aisles' runs out to the corridors.
  for (const lane of LANES) if (!/^h\d|^door/.test(lane.id) || lane.id.endsWith('-outer')) walkway(ctx, v, lane);
  for (const h of Object.values(HALLS)) {
    if (!onScreen(v, screen, h.cx, h.y + h.h / 2, h.w / 2 + 10, h.h / 2 + 10)) continue;
    ctx.globalAlpha = h.id <= online ? 1 : OFFLINE_ALPHA;
    fillTiles(ctx, v, h.x, h.y, h.w, h.h);
    for (const lane of LANES) if (lane.id.startsWith(`h${h.id}-`)) laneStrip(ctx, v, clipToHall(lane, h), COLOR.aisle);
  }
  ctx.globalAlpha = 1;

  // Walls: the building outline, then every hall with gaps at its doors.
  wall(ctx, v, 0, 0, WORLD.width, 0, [], 8);
  wall(ctx, v, 0, WORLD.height, WORLD.width, WORLD.height, [], 8);
  wall(ctx, v, 0, 0, 0, WORLD.height, [], 8);
  wall(ctx, v, WORLD.width, 0, WORLD.width, WORLD.height, [], 8);
  for (const h of Object.values(HALLS)) {
    ctx.globalAlpha = h.id <= online ? 1 : OFFLINE_ALPHA;
    const doors = DOORS;
    wall(ctx, v, h.x, h.y, h.x + h.w, h.y, doors, 6);
    wall(ctx, v, h.x, h.y + h.h, h.x + h.w, h.y + h.h, doors, 6);
    wall(ctx, v, h.x, h.y, h.x, h.y + h.h, doors, 6);
    wall(ctx, v, h.x + h.w, h.y, h.x + h.w, h.y + h.h, doors, 6);
  }
  ctx.globalAlpha = 1;

  // Chilled-water pipes, under the equipment so each CDU, chiller and pump sits on its pipe.
  drawPipes(ctx, v, { online, plantB });

  // Titles.
  for (const h of Object.values(HALLS)) {
    if (!onScreen(v, screen, h.cx, h.y + 20, 120, 20)) continue;
    const up = h.id <= online;
    drawLabel(ctx, up ? `Hall ${h.id}` : `Hall ${h.id} · under construction`, sx(v, h.cx), sy(v, h.y + 8), up ? titlePx : labelPx, COLOR.muted);
  }
  for (const p of Object.values(PLANTS)) {
    const up = p.id === 'A' || plantB;
    drawLabel(ctx, up ? `Plant ${p.id}` : `Plant ${p.id} · under construction`, sx(v, p.x + p.w / 2), sy(v, p.y - 26), up ? titlePx : labelPx, COLOR.plantInk);
  }

  // Equipment.
  for (const e of EQUIPMENT) {
    const [hw, hh] = EXTENT[e.type];
    if (!onScreen(v, screen, e.x, e.y, hw, hh + 20)) continue;
    const up = live(e);
    ctx.globalAlpha = up ? 1 : OFFLINE_ALPHA;
    drawOne(ctx, v, e, up ? status(e) : {});
    const cy = captionY(e);
    if (cy !== null && e.label) drawLabel(ctx, e.label, sx(v, e.x), sy(v, cy), labelPx);
  }
  ctx.globalAlpha = 1;
}

// A hall's aisle strips stop at its walls (the outer aisle runs on out to the corridors, but the
// corridor strips already cover that part).
function clipToHall(lane, h) {
  const y1 = Math.max(Math.min(lane.y1, lane.y2), h.y + LANE_HALF);
  const y2 = Math.min(Math.max(lane.y1, lane.y2), h.y + h.h - LANE_HALF);
  return { ...lane, y1, y2 };
}
