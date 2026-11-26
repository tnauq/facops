// The crew bar (spec section 6.5): one card per tech, in crew order, stacked from the top of the
// bar with 4 px gaps. Cards are 68 wide and share the height evenly, up to 88 tall. Pass 2 adds a
// second column for a big crew (pass 2 spec 7.2). Pure; works with either rules engine.

import { getAlarm } from '../core/index.js';
import { ALARMS2 } from '../core/config2.js';

export const CARD_WIDTH = 68;
export const CARD_MAX_HEIGHT = 88;
export const GAP = 4;
export const CARD_MIN_HEIGHT = 44; // a full tap target: past this a big crew scrolls (fix, 25 November)

/**
 * A crew too big for the bar at 44 px a card scrolls, a row at a time, like the alarm rail (the
 * owner, 25 November). count: cards (techs and the Hire card). Returns { rows, fit, max }: rows in
 * all, rows that fit, and the furthest the bar can scroll (0 when it all fits).
 */
export function crewScroll(count, rect, columns = 1) {
  const rows = Math.ceil(count / columns);
  const fit = Math.max(1, Math.floor((rect.h - GAP) / (CARD_MIN_HEIGHT + GAP)));
  return { rows, fit, max: Math.max(0, rows - fit) };
}

/** The first row shown, kept in range as the crew changes. */
export const clampCrewFirst = (first, count, rect, columns = 1) => Math.max(0, Math.min(Math.round(first), crewScroll(count, rect, columns).max));

/** A drag of dy px (finger up is positive) from startFirst. */
export const crewByDrag = (startFirst, dy, count, rect, columns = 1) => clampCrewFirst(startFirst + dy / (CARD_MIN_HEIGHT + GAP), count, rect, columns);

/** Cards out of view: { above, below } (cards, not rows), for the bar's markers. */
export function crewMore(count, rect, columns = 1, first = 0) {
  const s = crewScroll(count, rect, columns);
  if (!s.max) return { above: 0, below: 0 };
  const f = clampCrewFirst(first, count, rect, columns);
  return { above: f * columns, below: Math.max(0, count - (f + s.fit) * columns) };
}

export const TRADE_SHORT = { electrical: 'Elec', mechanical: 'Mech', ce: 'CE', network: 'Net' };
const STATE_WORD = { idle: 'Idle', walking: 'Walking', fixing: 'Fixing', returning: 'Walking', checking: 'Checking' }; // pass 8: walking back to a post (M46), checking a warning (M47)

/**
 * One entry per tech: its card rectangle { id, x, y, w, h } (also its tap target) and what the card
 * shows: trade, short name, state word, fix progress (0 to 1, or null when not fixing), selected.
 */
// With an alarm selected that only one trade may fix (a short or an RMU fault: electricians only),
// the other techs' cards are marked `unable` and drawn faded, so the player sees who can go.
export const unableFor = (alarmType, trade) => {
  const def = alarmType ? ALARMS2[alarmType] : null;
  return Boolean(def && def.tradeOnly && def.trade !== trade);
};

// first: the first row shown when the crew is too big for the bar (crewScroll); cards out of view
// are left out, so they are neither drawn nor tapped.
export function crewCards(state, rect, selectedTechId = null, { columns = 1, hire = false, alarmType = null, first = 0 } = {}) {
  // hire (pass 4 M26): one more card at the end, the Hire card, id 'hire'.
  const n = state.techs.length + (hire ? 1 : 0);
  const scroll = crewScroll(n, rect, columns);
  const top = scroll.max ? clampCrewFirst(first, n, rect, columns) : 0;
  const perColumn = scroll.max ? scroll.fit : Math.ceil(n / columns);
  const h = Math.min(CARD_MAX_HEIGHT, (rect.h - GAP * (perColumn + 1)) / perColumn);
  const shown = (i) => {
    const row = columns === 1 ? i : Math.floor(i / columns);
    return row >= top && row < top + perColumn;
  };
  // Two columns fill row by row, so crew order reads left to right, top to bottom.
  const used = columns * CARD_WIDTH + (columns - 1) * GAP;
  const x0 = rect.x + (rect.w - used) / 2;
  const at = (i) => {
    const col = columns === 1 ? 0 : i % columns;
    const row = (columns === 1 ? i : Math.floor(i / columns)) - top;
    return { x: x0 + col * (CARD_WIDTH + GAP), y: rect.y + GAP + row * (h + GAP) };
  };
  const cards = state.techs.map((tech, i) => {
    const { x, y } = at(i);
    const alarm = tech.state === 'fixing' && tech.alarmId !== null ? getAlarm(state, tech.alarmId) : null;
    return {
      id: tech.id,
      x,
      y,
      w: CARD_WIDTH,
      h,
      trade: tech.trade,
      name: TRADE_SHORT[tech.trade],
      status: STATE_WORD[tech.state],
      progress: alarm ? alarm.progress : null,
      selected: tech.id === selectedTechId,
      unable: unableFor(alarmType, tech.trade),
      post: tech.post ? tech.post.toUpperCase() : '', // pass 8 (M46): "H5"
    };
  });
  if (hire) cards.push({ id: 'hire', kind: 'hire', ...at(state.techs.length), w: CARD_WIDTH, h, selected: false });
  return cards.filter((c, i) => shown(i));
}

/** Keys 1 to 3 act as taps on the crew cards (spec 7.4). Returns a tap hit, or null for other keys. */
export function techForKey(state, key) {
  const n = Number(key);
  if (!Number.isInteger(n) || n < 1 || n > state.techs.length) return null;
  return { kind: 'tech', id: state.techs[n - 1].id };
}
