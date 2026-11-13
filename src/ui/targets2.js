// Tap targets for the pass 2 game: HUD buttons, crew cards, tickets, then what is on the scrolling
// map. Pure. Bubbles and techs are only targets while they are inside the map region.

import { EQUIPMENT_BY_ID } from '../core/index2.js';
import { cameraView } from './camera.js';
import { BUBBLE_RAISE } from './bubbles.js';
import { fannedCrew } from './crew.js';
import { crewCards } from './crewbar.js';
import { railTickets2 } from './rail2.js';
import { hudButtonTargets } from './regions.js';

const rectOf = ({ id, x, y, w, h }) => ({ id, x, y, w, h });
const inRect = (p, r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;

/** Screen positions of bubbles and techs on the scrolling map, for those inside it. */
export function mapTargets2(state, cam) {
  const v = cameraView(cam);
  const at = (x, y) => ({ x: v.ox + x * v.scale, y: v.oy + y * v.scale });
  const bubbles = state.alarms
    .map((a) => {
      const e = EQUIPMENT_BY_ID[a.equipId];
      const p = at(e.x, e.y);
      return { id: a.id, x: p.x, y: p.y - BUBBLE_RAISE };
    })
    .filter((b) => inRect(b, cam.rect));
  const techs = fannedCrew(state.techs, v.scale)
    .map((t) => ({ id: t.id, ...at(t.x, t.y) }))
    .filter((t) => inRect(t, cam.rect));
  return { bubbles, techs };
}

// The HUD buttons reach 10 px below the strip; a drawn ticket wins over that extra reach.
function trimAbove(button, tickets) {
  let h = button.h;
  for (const t of tickets) {
    const overlapsX = t.x < button.x + button.w && button.x < t.x + t.w;
    if (overlapsX && t.y < button.y + h) h = Math.max(0, t.y - button.y);
  }
  return { ...button, h };
}

/**
 * Targets on the rails and HUD. `regs` is regions(W, H, { crewColumns }); `railFirst` is the rail's
 * scroll position (pass 3 spec 2.3). `chips` are the rail's ▲ and "+N more" chips, ids 'rail-up'
 * and 'rail-down'; `scrolls` says whether the rail overflows (then it acts on finger-up, so a drag
 * can scroll it).
 */
export function railTargets2(state, regs, crewColumns, railFirst = 0) {
  const rail = railTickets2(state, regs.rail, null, railFirst);
  const tickets = rail.tickets.map(rectOf);
  const chips = [rail.up, rail.down].filter(Boolean).map(rectOf);
  return {
    buttons: hudButtonTargets(regs.hud.w).map((b) => trimAbove(b, [...chips, ...tickets])),
    cards: crewCards(state, regs.crew, null, { columns: crewColumns }).map(rectOf),
    tickets,
    chips,
    scrolls: chips.length > 0 || rail.first > 0,
  };
}

/** The rail chip under p, or null. */
export const chipAt = (targets, p) => (targets.chips ?? []).find((c) => inRect(p, c)) ?? null;
