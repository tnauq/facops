// Draws one frame of the map: campus, crew, then alarm bubbles on top (spec section 6.4).

import { drawCampus, drawCrew, toScreen } from './campus.js';
import { drawAlarmBubble } from './icons.js';
import { BUBBLE_RADIUS, BUBBLE_RAISE, bubbleList } from '../ui/bubbles.js';
import { fannedCrew } from '../ui/crew.js';

export function drawMap(ctx, view, state, selection = {}) {
  drawCampus(ctx, view, state);
  drawCrew(ctx, view, fannedCrew(state.techs, view.scale), selection.techId ?? null);
  for (const b of bubbleList(state, selection.alarmId ?? null)) {
    const p = toScreen(view, b.x, b.y);
    drawAlarmBubble(ctx, p.x, p.y - BUBBLE_RAISE, BUBBLE_RADIUS, b.info, b.options);
  }
}
