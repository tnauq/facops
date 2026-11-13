// Draws the pass 2 game on the scrolling map (pass 2 spec 7.1), clipped to the map region:
// the building with live faults, the crew (walking hats bob), alarm bubbles (new ones pop in),
// then the off-map arrows. Returns the arrows so taps can find them.

import { plantBOnline } from '../core/index2.js';
import { drawBuilding } from './campus2.js';
import { drawCrew } from './campus.js';
import { drawAlarmBubble } from './icons.js';
import { drawMarker } from './markers.js';
import { drawShields } from './shields.js';
import { drawFloats } from './map.js';
import { HALLS } from '../core/index2.js';
import { BUBBLE_RADIUS, BUBBLE_RAISE } from '../ui/bubbles.js';
import { cameraView } from '../ui/camera.js';
import { fannedCrew } from '../ui/crew.js';
import { bobOffset, popScale } from '../ui/feel.js';
import { offMapMarkers } from '../ui/offmap.js';
import { bubbles2, equipmentStatus } from '../ui/view2.js';
import { shieldsModel } from '../ui/shields.js';
import { triageOrder } from '../ui/cost.js';

const INK = '#1F3A5F';
const FONT = "system-ui, -apple-system, 'Segoe UI', sans-serif";

// A hall coming online (spec M13): a brief glow, an outline pulsing outwards with a few sparks,
// and "Hall 4 online · +38 MW" rising above it. Ink and white only: hat colours mean trade and the
// band colours belong to the HUD.
function drawCelebration(ctx, v, c) {
  const h = HALLS[c.hall];
  const x = v.ox + h.x * v.scale;
  const y = v.oy + h.y * v.scale;
  const w = h.w * v.scale;
  const hh = h.h * v.scale;
  const fade = 1 - c.k;
  ctx.save();
  ctx.globalAlpha = 0.45 * fade;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(x, y, w, hh);
  const grow = 14 * c.k * v.scale * 2;
  ctx.globalAlpha = fade;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.strokeRect(x - grow, y - grow, w + 2 * grow, hh + 2 * grow);
  // Sparks from the top corners and the middle of the top wall.
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  for (const [sx, dir] of [[x, -1], [x + w / 2, 0], [x + w, 1]]) {
    for (let i = 0; i < 3; i++) {
      const a = -Math.PI / 2 + dir * 0.6 + (i - 1) * 0.45;
      const r0 = 8 + 30 * c.k;
      const r1 = r0 + 10;
      ctx.beginPath();
      ctx.moveTo(sx + Math.cos(a) * r0, y + Math.sin(a) * r0);
      ctx.lineTo(sx + Math.cos(a) * r1, y + Math.sin(a) * r1);
      ctx.stroke();
    }
  }
  // The headline, rising; fully visible for most of the celebration.
  ctx.globalAlpha = c.k < 0.75 ? 1 : (1 - c.k) / 0.25;
  ctx.font = `700 15px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#FFFFFF';
  const ty = y + hh * 0.42 - 24 * c.k;
  ctx.strokeText(c.text, x + w / 2, ty);
  ctx.fillStyle = INK;
  ctx.fillText(c.text, x + w / 2, ty);
  ctx.restore();
}

/**
 * selection: { alarmId, techId }. screen: { w, h } of the canvas.
 * fx: { floats, celebrations } from src/ui/feel2.js (optional).
 */
export function drawMap2(ctx, cam, screen, state, selection = {}, fx = {}) {
  const v = cameraView(cam);
  ctx.save();
  ctx.beginPath();
  ctx.rect(cam.rect.x, cam.rect.y, cam.rect.w, cam.rect.h);
  ctx.clip();
  drawBuilding(ctx, v, screen, { online: state.halls, plantB: plantBOnline(state), status: equipmentStatus(state) });
  drawShields(ctx, v, screen, shieldsModel(state), { plantB: plantBOnline(state) });
  // The bob only moves the drawing; tap targets stay where the rules put each tech.
  const crew = fannedCrew(state.techs, v.scale).map((t) => ({ ...t, y: t.y + bobOffset(t, state.t) / v.scale }));
  drawCrew(ctx, v, crew, selection.techId ?? null);
  const list = bubbles2(state, selection.alarmId ?? null);
  for (const b of list) {
    const r = BUBBLE_RADIUS * popScale(b.info.age);
    if (r > 0.5) drawAlarmBubble(ctx, v.ox + b.x * v.scale, v.oy + b.y * v.scale - BUBBLE_RAISE, r, b.info, b.options);
  }
  for (const c of fx.celebrations ?? []) drawCelebration(ctx, v, c);
  drawFloats(ctx, v, fx.floats ?? [], cam.rect.y);
  // Off-map arrows lead with the most urgent alarm by the rail's order and show its cost (pass 3 spec 2.4).
  const rank = new Map(triageOrder(state).map((x, i) => [x.alarm.id, { rank: i, cost: x.cost }]));
  const markers = offMapMarkers(list.map((b) => ({ ...b, ...rank.get(b.id) })), cam);
  for (const m of markers) drawMarker(ctx, m);
  ctx.restore();
  return markers;
}
