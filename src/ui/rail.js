// The alarm rail (spec section 6.6): one ticket per alarm, most urgent on top, 96 x 44 with 4 px
// gaps. If they do not all fit, as many as fit and a "+N" chip at the bottom. Pure.

import * as pass1 from '../core/index.js';

export const TICKET_WIDTH = 96;
export const TICKET_HEIGHT = 44;
export const GAP = 4;
export const CHIP_HEIGHT = 22;

export const ALARM_SHORT = { network: 'Network', leak: 'Leak', breaker: 'Breaker', pump: 'Pump', chiller: 'Chiller' };

/**
 * The bar along the bottom of a ticket: clock left while unattended, fix progress while a tech is
 * on site, solid once the clock is spent and nobody is on site.
 */
export function ticketBar(info) {
  if (info.attended) return { kind: 'progress', fraction: info.progress };
  if (!Number.isFinite(info.clockLeft)) return { kind: 'spent', fraction: 1 };
  return { kind: 'clock', fraction: info.clockFraction };
}

/** How many tickets the rail shows out of `count`, leaving room for the chip when some are hidden. */
export function ticketsThatFit(railHeight, count) {
  const slot = TICKET_HEIGHT + GAP;
  const all = Math.floor((railHeight - GAP) / slot);
  if (count <= all) return count;
  return Math.max(0, Math.floor((railHeight - GAP - CHIP_HEIGHT - GAP) / slot));
}

/**
 * { tickets, chip }. Each ticket has its rectangle { id, x, y, w, h } (also its tap target) and what
 * it shows: type, name, place, the fastest trade, the bar, the hat of the assigned tech (or queued),
 * and whether it is selected. chip is { x, y, w, h, text } or null.
 */
export function railTickets(state, rect, selectedAlarmId = null, api = pass1) {
  // `api` is the rules engine's surface: pass 1's by default, pass 2's from the pass 2 game.
  const { alarmInfo, getTech, locationTag, sortedAlarms } = api;
  const alarms = sortedAlarms(state);
  const shown = ticketsThatFit(rect.h, alarms.length);
  const x = rect.x + (rect.w - TICKET_WIDTH) / 2;
  const tickets = alarms.slice(0, shown).map((alarm, i) => {
    const info = alarmInfo(state, alarm);
    const tech = info.techId !== null ? getTech(state, info.techId) : null;
    return {
      id: alarm.id,
      x,
      y: rect.y + GAP + i * (TICKET_HEIGHT + GAP),
      w: TICKET_WIDTH,
      h: TICKET_HEIGHT,
      type: info.type,
      name: ALARM_SHORT[info.type],
      place: locationTag(info.equipId),
      trade: info.trade,
      bar: ticketBar(info),
      assignedTrade: tech ? tech.trade : null,
      queued: info.queued && !tech,
      selected: alarm.id === selectedAlarmId,
    };
  });
  const hidden = alarms.length - shown;
  const chip = hidden > 0
    ? { x, y: rect.y + GAP + shown * (TICKET_HEIGHT + GAP), w: TICKET_WIDTH, h: CHIP_HEIGHT, text: `+${hidden}` }
    : null;
  return { tickets, chip };
}
