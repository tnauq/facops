// Draws the pass 2 game on the scrolling map (pass 2 spec 7.1), clipped to the map region:
// the building with live faults, the crew (walking hats bob), alarm bubbles (new ones pop in),
// then the off-map arrows. Returns the arrows so taps can find them.

import { plantBOnline } from '../core/index2.js';
import { drawBuilding } from './campus2.js';
import { drawCrew } from './campus.js';
import { drawAlarmBubble } from './icons.js';
import { drawMarker } from './markers.js';
import { BUBBLE_RADIUS, BUBBLE_RAISE } from '../ui/bubbles.js';
import { cameraView } from '../ui/camera.js';
import { fannedCrew } from '../ui/crew.js';
import { bobOffset, popScale } from '../ui/feel.js';
import { offMapMarkers } from '../ui/offmap.js';
import { bubbles2, equipmentStatus } from '../ui/view2.js';

/** selection: { alarmId, techId }. screen: { w, h } of the canvas. */
export function drawMap2(ctx, cam, screen, state, selection = {}) {
  const v = cameraView(cam);
  ctx.save();
  ctx.beginPath();
  ctx.rect(cam.rect.x, cam.rect.y, cam.rect.w, cam.rect.h);
  ctx.clip();
  drawBuilding(ctx, v, screen, { online: state.halls, plantB: plantBOnline(state), status: equipmentStatus(state) });
  // The bob only moves the drawing; tap targets stay where the rules put each tech.
  const crew = fannedCrew(state.techs, v.scale).map((t) => ({ ...t, y: t.y + bobOffset(t, state.t) / v.scale }));
  drawCrew(ctx, v, crew, selection.techId ?? null);
  const list = bubbles2(state, selection.alarmId ?? null);
  for (const b of list) {
    const r = BUBBLE_RADIUS * popScale(b.info.age);
    if (r > 0.5) drawAlarmBubble(ctx, v.ox + b.x * v.scale, v.oy + b.y * v.scale - BUBBLE_RAISE, r, b.info, b.options);
  }
  const markers = offMapMarkers(list, cam);
  for (const m of markers) drawMarker(ctx, m);
  ctx.restore();
  return markers;
}
