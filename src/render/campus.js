// Draws the campus: floors, lanes, equipment with its live status, labels, shields and the crew.
// A "view" maps world units (see src/core/layout.js) to canvas pixels: screen = offset + world * scale.

import { EQUIPMENT, HALLS, LANES, WORLD, YARD, alarmInfo, coolingShield, getAlarm, powerShield } from '../core/index.js';
import { ICON_SIZE, drawEquipment, drawLabel, drawShield, drawTech } from './icons.js';

const FLOOR = {
  page: '#D5DBE3',
  yard: '#E2E8DC',
  hall: '#F3F5F8',
  edge: '#AEB6C2',
  lane: '#E3E7ED',
  yardLane: '#D6DDCF',
};

/** Largest view of the whole world that fits inside rect { x, y, w, h }, centered. */
export function fitView(rect) {
  const scale = Math.min(rect.w / WORLD.width, rect.h / WORLD.height);
  return {
    scale,
    ox: rect.x + (rect.w - WORLD.width * scale) / 2,
    oy: rect.y + (rect.h - WORLD.height * scale) / 2,
  };
}

export const toScreen = (view, x, y) => ({ x: view.ox + x * view.scale, y: view.oy + y * view.scale });
export const toWorld = (view, px, py) => ({ x: (px - view.ox) / view.scale, y: (py - view.oy) / view.scale });

function box(ctx, view, x, y, w, h, fill, stroke) {
  const p = toScreen(view, x, y);
  ctx.fillStyle = fill;
  ctx.fillRect(p.x, p.y, w * view.scale, h * view.scale);
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = Math.max(1, 1.5 * view.scale);
    ctx.strokeRect(p.x, p.y, w * view.scale, h * view.scale);
  }
}

function equipmentStatus(state, e) {
  if (!state) return {};
  const dyn = state.equip[e.id];
  if (e.type === 'rack') return { level: dyn.level * state.thermal, netDown: dyn.netDown };
  if (e.type === 'cdu') return { leak: dyn.leak };
  if (e.type === 'msb') return { tripped: dyn.tripped };
  if (e.type === 'chiller') return { running: dyn.running };
  if (e.type === 'pump') {
    const alarm = dyn.alarmId === null ? null : getAlarm(state, dyn.alarmId);
    return { pressure: alarm ? 1 - alarmInfo(state, alarm).clockFraction : 0 };
  }
  return {};
}

// Where each caption goes, in world units from the icon center.
function labelOffset(e) {
  if (e.type === 'chiller') return 40;
  if (e.type === 'pump') return 22;
  if (e.type === 'msb') return 30;
  if (e.type === 'cdu') return e.row === 0 ? -42 : 30;
  return 0;
}

/** Draw the whole campus. Pass the game state for live status, or null for a healthy plant. */
export function drawCampus(ctx, view, state = null) {
  const labelPx = Math.max(9, Math.min(13, 19 * view.scale));
  const titlePx = Math.max(9, Math.min(14, 21 * view.scale));

  box(ctx, view, YARD.x, YARD.y, YARD.w, YARD.h, FLOOR.yard, FLOOR.edge);
  for (const hall of Object.values(HALLS)) box(ctx, view, hall.x, hall.y, hall.w, hall.h, FLOOR.hall, FLOOR.edge);

  for (const lane of LANES) {
    const inYard = lane.id === 'yard';
    const half = 11;
    const x = Math.min(lane.x1, lane.x2) - half;
    const y = Math.min(lane.y1, lane.y2) - half;
    const w = Math.abs(lane.x2 - lane.x1) + half * 2;
    const h = Math.abs(lane.y2 - lane.y1) + half * 2;
    box(ctx, view, x, y, w, h, inYard ? FLOOR.yardLane : FLOOR.lane);
  }

  const yardTitle = toScreen(view, YARD.x + YARD.w / 2, YARD.y + 5);
  drawLabel(ctx, 'Plant yard', yardTitle.x, yardTitle.y, titlePx, '#56624B');
  for (const hall of Object.values(HALLS)) {
    const t = toScreen(view, hall.x + hall.w / 2, hall.y + 5);
    drawLabel(ctx, `Hall ${hall.id}`, t.x, t.y, titlePx, '#56606E');
  }

  for (const e of EQUIPMENT) {
    const p = toScreen(view, e.x, e.y);
    drawEquipment(ctx, e.type, p.x, p.y, ICON_SIZE[e.type] * view.scale, equipmentStatus(state, e));
    if (e.label) {
      const l = toScreen(view, e.x, e.y + labelOffset(e));
      drawLabel(ctx, e.label, l.x, l.y, labelPx);
    }
  }

  const shieldSize = 26 * view.scale;
  const cool = toScreen(view, YARD.x + YARD.w - 22, YARD.y + 22);
  drawShield(ctx, cool.x, cool.y, shieldSize, state ? coolingShield(state) : 'whole');
  for (const hall of Object.values(HALLS)) {
    const s = toScreen(view, hall.x + hall.w - 22, hall.y + 22);
    drawShield(ctx, s.x, s.y, shieldSize, state ? powerShield(state, hall.id) : 'whole');
  }
}

/** Draw the crew on top of the campus. `selectedId` rings one tech. */
export function drawCrew(ctx, view, techs, selectedId = null) {
  for (const tech of techs) {
    const p = toScreen(view, tech.x, tech.y);
    drawTech(ctx, p.x, p.y, ICON_SIZE.tech * view.scale, tech.trade, { selected: tech.id === selectedId, busy: tech.state === 'fixing' });
  }
}

export const PAGE_COLOR = FLOOR.page;
