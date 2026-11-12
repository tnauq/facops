// The crew bar (spec section 6.5): one card per tech, in crew order, stacked from the top of the
// bar with 4 px gaps. Cards are 68 wide and share the height evenly, up to 88 tall. Pure.

import { getAlarm } from '../core/index.js';

export const CARD_WIDTH = 68;
export const CARD_MAX_HEIGHT = 88;
export const GAP = 4;

export const TRADE_SHORT = { electrical: 'Elec', mechanical: 'Mech', ce: 'CE', network: 'Net' };
const STATE_WORD = { idle: 'Idle', walking: 'Walking', fixing: 'Fixing' };

/**
 * One entry per tech: its card rectangle { id, x, y, w, h } (also its tap target) and what the card
 * shows: trade, short name, state word, fix progress (0 to 1, or null when not fixing), selected.
 */
export function crewCards(state, rect, selectedTechId = null) {
  const n = state.techs.length;
  const h = Math.min(CARD_MAX_HEIGHT, (rect.h - GAP * (n + 1)) / n);
  const x = rect.x + (rect.w - CARD_WIDTH) / 2;
  return state.techs.map((tech, i) => {
    const alarm = tech.state === 'fixing' && tech.alarmId !== null ? getAlarm(state, tech.alarmId) : null;
    return {
      id: tech.id,
      x,
      y: rect.y + GAP + i * (h + GAP),
      w: CARD_WIDTH,
      h,
      trade: tech.trade,
      name: TRADE_SHORT[tech.trade],
      status: STATE_WORD[tech.state],
      progress: alarm ? alarm.progress : null,
      selected: tech.id === selectedTechId,
    };
  });
}

/** Keys 1 to 3 act as taps on the crew cards (spec 7.4). Returns a tap hit, or null for other keys. */
export function techForKey(state, key) {
  const n = Number(key);
  if (!Number.isInteger(n) || n < 1 || n > state.techs.length) return null;
  return { kind: 'tech', id: state.techs[n - 1].id };
}
