// Tap targets for the pass 2 game: HUD buttons, crew cards, tickets, then what is on the scrolling
// map. Pure. Bubbles and techs are only targets while they are inside the map region.

import { EQUIPMENT_BY_ID, buildingOn } from '../core/index2.js';
import { cameraView } from './camera.js';
import { BUBBLE_RAISE } from './bubbles.js';
import { fannedCrew } from './crew.js';
import { crewCards } from './crewbar.js';
import { railTickets2 } from './rail2.js';
import { BUTTON_TAP_HEIGHT, hudButtonTargets, hudLayout } from './regions.js';

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

/** The cash readout as a tap target (pass 7 M45): "Cash", the cash, its rate; 44 px tall. */
export function cashTarget(W) {
  const l = hudLayout(W);
  return { id: 'cash', x: l.meterLabel.x, y: 0, w: l.meter.x + l.meter.w - l.meterLabel.x, h: BUTTON_TAP_HEIGHT };
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
 * scroll position (pass 3 spec 4b.2). `scrolls` says whether the rail overflows even as tiles
 * (then it acts on finger-up, so a drag can scroll it). There are no chips any more.
 */
export function railTargets2(state, regs, crewColumns, railFirst = 0, railCompact = false, { speedButtons = !state.config.realtime } = {}) {
  const rail = railTickets2(state, regs.rail, null, railFirst, railCompact);
  const tickets = rail.tickets.map(rectOf);
  // Pass 7 (M45): in building mode the cash readout is a button too: it opens the ledger.
  const cash = buildingOn(state) ? [cashTarget(regs.hud.w)] : [];
  return {
    buttons: [...hudButtonTargets(regs.hud.w, { speedButtons }).map((b) => trimAbove(b, tickets)), ...cash],
    cards: crewCards(state, regs.crew, null, { columns: crewColumns, hire: buildingOn(state) }).map(rectOf),
    tickets,
    scrolls: rail.more !== null || rail.first > 0,
  };
}
