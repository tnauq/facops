// Draws one frame of the map (spec section 6.4), bottom to top: campus, crew, alarm bubbles, then
// floating loss labels. New bubbles pop in and walking techs bob (spec section 11).

import { drawCampus, drawCrew, toScreen } from './campus.js';
import { drawAlarmBubble } from './icons.js';
import { BUBBLE_RADIUS, BUBBLE_RAISE, bubbleList } from '../ui/bubbles.js';
import { fannedCrew } from '../ui/crew.js';
import { bobOffset, popScale } from '../ui/feel.js';

const INK = '#1F3A5F';
const FONT = "system-ui, -apple-system, 'Segoe UI', sans-serif";

/** floats: liveFloats(...) from src/ui/feel.js, or an empty list. */
export function drawMap(ctx, view, state, selection = {}, floats = []) {
  drawCampus(ctx, view, state);
  // The bob only moves the drawing; tap targets stay where the rules put each tech.
  const crew = fannedCrew(state.techs, view.scale).map((t) => ({ ...t, y: t.y + bobOffset(t, state.t) / view.scale }));
  drawCrew(ctx, view, crew, selection.techId ?? null);
  for (const b of bubbleList(state, selection.alarmId ?? null)) {
    const scale = popScale(b.info.age);
    if (scale <= 0.01) continue;
    const p = toScreen(view, b.x, b.y);
    drawAlarmBubble(ctx, p.x, p.y - BUBBLE_RAISE, BUBBLE_RADIUS * scale, b.info, b.options);
  }
  drawFloats(ctx, view, floats);
}

function drawFloats(ctx, view, floats) {
  if (floats.length === 0) return;
  ctx.save();
  ctx.font = `700 13px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#FFFFFF';
  ctx.fillStyle = INK;
  for (const f of floats) {
    const p = toScreen(view, f.x, f.y);
    // Start just above the bubble so the label never sits on top of it.
    const y = p.y - BUBBLE_RAISE - BUBBLE_RADIUS - 10 - f.rise;
    ctx.globalAlpha = f.alpha;
    ctx.strokeText(f.text, p.x, y);
    ctx.fillText(f.text, p.x, y);
  }
  ctx.restore();
}
