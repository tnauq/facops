// Screen positions of the things a tap can hit, for hitTest.

import { toScreen } from '../render/campus.js';
import { EQUIPMENT_BY_ID } from '../core/index.js';
import { BUBBLE_RAISE } from './bubbles.js';
import { fannedCrew } from './crew.js';
import { crewCards } from './crewbar.js';
import { railTickets } from './rail.js';
import { hudButtonTargets } from './regions.js';

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

const rectOf = ({ id, x, y, w, h }) => ({ id, x, y, w, h });

/** Every tap target on screen: HUD buttons, crew cards, tickets, then the map. `regs` is regions(W, H). */
export function screenTargets(state, view, regs) {
  const tickets = railTickets(state, regs.rail).tickets.map(rectOf);
  return {
    buttons: hudButtonTargets(regs.hud.w).map((b) => trimAbove(b, tickets)),
    cards: crewCards(state, regs.crew).map(rectOf),
    tickets,
    ...mapTargets(state, view),
  };
}

// The HUD buttons' tap areas reach 10 px below the strip (see regions.js), which would cover the
// top of the first ticket. Where a ticket is drawn, the ticket wins: the button stops above it.
function trimAbove(button, tickets) {
  let h = button.h;
  for (const t of tickets) {
    const overlapsX = t.x < button.x + button.w && button.x < t.x + t.w;
    if (overlapsX && t.y < button.y + h) h = Math.max(0, t.y - button.y);
  }
  return { ...button, h };
}
