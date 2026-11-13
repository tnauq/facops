// The pass 3 alarm rail (pass 3 spec, section 2). Pure.
// Tickets in triage order (costly first, see cost.js), each showing what its alarm costs now.
// When they do not all fit, the rail scrolls a ticket at a time: `first` is the index of the top
// ticket shown. A "+N more" chip at the bottom pages down, a "▲ N" chip at the top pages up; both
// are 44 px tap targets and take one ticket slot each.

import { alarmInfo, getTech, locationTag } from '../core/index2.js';
import { triageOrder } from './cost.js';
import { ALARM_SHORT, GAP, TICKET_HEIGHT, TICKET_WIDTH, ticketBar } from './rail.js';

export const SLOT = TICKET_HEIGHT + GAP;
export const CHIP2_HEIGHT = TICKET_HEIGHT; // a full 44 px tap target

/** Ticket slots in a rail this tall. */
export const slotsIn = (railHeight) => Math.max(1, Math.floor((railHeight - GAP) / SLOT));

/** The furthest the rail can scroll for `count` alarms: the last page shows the up chip and the rest. */
export function maxFirst(railHeight, count) {
  const slots = slotsIn(railHeight);
  return count <= slots ? 0 : Math.max(0, count - (slots - 1));
}

export const clampFirst = (first, railHeight, count) => Math.max(0, Math.min(Math.round(first), maxFirst(railHeight, count)));

/** { up, shown, down }: whether each chip shows and how many tickets fit between them. */
export function railPage(railHeight, count, first) {
  const slots = slotsIn(railHeight);
  if (count <= slots) return { up: false, shown: count, down: false };
  const f = clampFirst(first, railHeight, count);
  const up = f > 0;
  const room = slots - (up ? 1 : 0);
  const down = count - f > room;
  const shown = down ? room - 1 : count - f;
  return { up, shown: Math.max(0, shown), down };
}

/** Where the rail goes when a chip is tapped: down one page, or up one page. */
export function pageTo(railHeight, count, first, direction) {
  const page = railPage(railHeight, count, first);
  const step = Math.max(1, direction > 0 ? page.shown : slotsIn(railHeight) - 2);
  return clampFirst(first + direction * step, railHeight, count);
}

/**
 * { tickets, up, down, first }. Tickets as in rail.js, plus `cost` (whole MW, 0 when free) and
 * `costText` ("−6 MW" or ""). up and down are chips { id: 'rail-up' | 'rail-down', x, y, w, h, text }
 * or null. `first` is the scroll position after clamping.
 */
export function railTickets2(state, rect, selectedAlarmId = null, first = 0) {
  const order = triageOrder(state);
  const f = clampFirst(first, rect.h, order.length);
  const page = railPage(rect.h, order.length, f);
  const x = rect.x + (rect.w - TICKET_WIDTH) / 2;
  const slotY = (i) => rect.y + GAP + i * SLOT;
  const top = page.up ? 1 : 0;
  const tickets = order.slice(f, f + page.shown).map(({ alarm, cost }, i) => {
    const info = alarmInfo(state, alarm);
    const tech = info.techId !== null ? getTech(state, info.techId) : null;
    return {
      id: alarm.id,
      x,
      y: slotY(top + i),
      w: TICKET_WIDTH,
      h: TICKET_HEIGHT,
      type: info.type,
      name: ALARM_SHORT[info.type],
      place: locationTag(info.equipId),
      cost,
      costText: cost > 0 ? `−${cost} MW` : '',
      trade: info.trade,
      bar: ticketBar(info),
      assignedTrade: tech ? tech.trade : null,
      queued: info.queued && !tech,
      selected: alarm.id === selectedAlarmId,
    };
  });
  const chip = (id, slot, text) => ({ id, x, y: slotY(slot), w: TICKET_WIDTH, h: CHIP2_HEIGHT, text });
  const below = order.length - f - page.shown;
  return {
    tickets,
    up: page.up ? chip('rail-up', 0, `▲ ${f}`) : null,
    down: page.down ? chip('rail-down', top + page.shown, `+${below} more`) : null,
    first: f,
  };
}

/**
 * Back to the top when an alarm newly starts costing more than everything in view (spec 2.3).
 * known: Set of alarm ids that were costing something last time. Returns { first, known }.
 */
export function autoTop(state, rect, first, known) {
  const order = triageOrder(state);
  const now = new Set(order.filter((x) => x.cost > 0).map((x) => x.alarm.id));
  let f = clampFirst(first, rect.h, order.length);
  if (f > 0) {
    const page = railPage(rect.h, order.length, f);
    const inView = order.slice(f, f + page.shown);
    const best = Math.max(0, ...inView.map((x) => x.cost));
    const fresh = order.some((x) => x.cost > best && !known.has(x.alarm.id) && now.has(x.alarm.id));
    if (fresh) f = 0;
  }
  return { first: f, known: now };
}

/** Rail scroll from a vertical drag of `dy` px (finger up = positive = further down the list). */
export const scrollByDrag = (first, dy, railHeight, count) => clampFirst(first + dy / SLOT, railHeight, count);
