// Screen positions of the things a tap can hit on the map, for hitTest.

import { toScreen } from '../render/campus.js';
import { EQUIPMENT_BY_ID } from '../core/index.js';
import { BUBBLE_RAISE } from './bubbles.js';
import { fannedCrew } from './crew.js';

/** { bubbles, techs } in CSS pixels for the given view. Everything is hit where it is drawn. */
export function mapTargets(state, view) {
  const bubbles = state.alarms.map((a) => {
    const e = EQUIPMENT_BY_ID[a.equipId];
    const p = toScreen(view, e.x, e.y);
    return { id: a.id, x: p.x, y: p.y - BUBBLE_RAISE };
  });
  const techs = fannedCrew(state.techs, view.scale).map((t) => ({ id: t.id, ...toScreen(view, t.x, t.y) }));
  return { bubbles, techs };
}
