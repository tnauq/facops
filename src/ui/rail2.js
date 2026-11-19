// The pass 3 alarm rail (pass 3 spec, sections 2 and 4b.2). Pure.
// Tickets in triage order (costly first, see cost.js), each showing what its alarm costs now.
// While every alarm fits as a full ticket, the rail is a column of tickets. When they do not, every
// ticket shrinks to a 44 x 44 tile, two across, so twice as many fit and nothing hides on a second
// page (owner, 14 Nov: no pages to tab through). Only if even the tiles overflow can the rail be
// dragged, a row of tiles at a time; a "+N" note (not a button) then says how many are below.

import { alarmInfo, buildingOn, creditPerRow, getTech, locationTag } from '../core/index2.js';
import { triageOrder } from './cost.js';
import { ALARM_SHORT, GAP, TICKET_HEIGHT, TICKET_WIDTH, ticketBar } from './rail.js';

export const SLOT = TICKET_HEIGHT + GAP;
export const TILE = 44; // a full tap target
export const TILE_SLOT = TILE + GAP;
export const TILES_ACROSS = 2;

/** Ticket slots in a rail this tall. */
export const slotsIn = (railHeight) => Math.max(1, Math.floor((railHeight - GAP) / SLOT));

/** Rows of tiles in a rail this tall. */
export const tileRowsIn = (railHeight) => Math.max(1, Math.floor((railHeight - GAP) / TILE_SLOT));

// Tiles stay until the alarms fit as tickets with this many slots to spare (pass 4 spec 3.5), so
// the rail does not flip back and forth under a finger as alarms come and go.
export const BACK_TO_TICKETS = 3;

// A tap on the rail this soon after it changed between tickets and tiles is ignored: the finger was
// aiming at where a ticket used to be (pass 4 spec 3.5).
export const RAIL_SETTLE_MS = 400;

/** Whether a tap on the rail at `now` (ms) counts, given when the rail last changed layout. */
export const railTapCounts = (switchedAt, now) => switchedAt === null || now - switchedAt >= RAIL_SETTLE_MS;

/**
 * How the rail shows `count` alarms: { compact, rows, capacity } (rows of tiles or tickets).
 * wasCompact: whether the rail showed tiles last frame.
 */
export function railMode(railHeight, count, wasCompact = false) {
  const slots = slotsIn(railHeight);
  const tiles = count > slots || (wasCompact && count > slots - BACK_TO_TICKETS);
  if (!tiles) return { compact: false, rows: slots, capacity: slots };
  const rows = tileRowsIn(railHeight);
  return { compact: true, rows, capacity: rows * TILES_ACROSS };
}

/** The furthest the rail can scroll, in rows of tiles (0 unless even the tiles overflow). */
export function maxFirst(railHeight, count, wasCompact = false) {
  const m = railMode(railHeight, count, wasCompact);
  if (!m.compact || count <= m.capacity) return 0;
  return Math.ceil((count - m.capacity) / TILES_ACROSS);
}

export const clampFirst = (first, railHeight, count, wasCompact = false) => Math.max(0, Math.min(Math.round(first), maxFirst(railHeight, count, wasCompact)));

/**
 * What an outage costs, for its ticket: "−6 MW" in the classic game; in building mode dollars a second
 * (pass 7 spec 3.5, v0.9 open decision 8): the income it stops plus the service credits it runs up.
 */
export function costText(state, cost) {
  if (!(cost > 0)) return '';
  if (!buildingOn(state)) return `−${cost} MW`;
  const rows = cost / state.config.rowMw;
  return `−$${Math.max(1, Math.round(rows * (state.config.building.income + creditPerRow(state)))).toLocaleString('en-US')}/s`;
}

/** The short form, for tiles and edge arrows: "−6" (MW) in the classic game, "−$4" (a second) in building mode. */
export function costShort(state, cost) {
  const t = costText(state, cost);
  return t.replace(/ MW$/, '').replace(/\/s$/, '');
}

function ticketOf(state, alarm, cost, selectedAlarmId, box) {
  const info = alarmInfo(state, alarm);
  const tech = info.techId !== null ? getTech(state, info.techId) : null;
  return {
    id: alarm.id,
    ...box,
    type: info.type,
    name: ALARM_SHORT[info.type],
    place: locationTag(info.equipId),
    cost,
    costText: costText(state, cost),
    costShort: costShort(state, cost),
    trade: info.trade,
    bar: ticketBar(info),
    assignedTrade: tech ? tech.trade : null,
    queued: info.queued && !tech,
    selected: alarm.id === selectedAlarmId,
    info, // for drawing a tile as the alarm's bubble
  };
}

/**
 * { tickets, compact, more, first }. Tickets as in rail.js, plus `cost` (whole MW, 0 when free),
 * `costText` ("−6 MW", in building mode "−$4/s", or "") and `info`. compact: whether they are tiles. more: null, or the note
 * { x, y, w, h, text: "+N" } over the bottom of the rail when tiles are hidden below. first: the
 * scroll position (rows of tiles) after clamping. wasCompact: whether the rail showed tiles last
 * frame (the screen keeps it; see BACK_TO_TICKETS).
 */
export function railTickets2(state, rect, selectedAlarmId = null, first = 0, wasCompact = false) {
  const order = triageOrder(state);
  const mode = railMode(rect.h, order.length, wasCompact);
  const f = clampFirst(first, rect.h, order.length, wasCompact);
  const left = rect.x + (rect.w - TICKET_WIDTH) / 2;
  if (!mode.compact) {
    const tickets = order.map(({ alarm, cost }, i) =>
      ticketOf(state, alarm, cost, selectedAlarmId, { x: left, y: rect.y + GAP + i * SLOT, w: TICKET_WIDTH, h: TICKET_HEIGHT }));
    return { tickets, compact: false, more: null, first: 0 };
  }
  const across = TILES_ACROSS * TILE + (TILES_ACROSS - 1) * GAP;
  const tx = rect.x + (rect.w - across) / 2;
  const start = f * TILES_ACROSS;
  const tickets = order.slice(start, start + mode.capacity).map(({ alarm, cost }, i) => {
    const row = Math.floor(i / TILES_ACROSS);
    const col = i % TILES_ACROSS;
    return ticketOf(state, alarm, cost, selectedAlarmId, { x: tx + col * TILE_SLOT, y: rect.y + GAP + row * TILE_SLOT, w: TILE, h: TILE });
  });
  const below = order.length - start - tickets.length;
  const more = below > 0 ? { x: tx, y: rect.y + GAP + mode.rows * TILE_SLOT - 18, w: across, h: 18, text: `+${below}` } : null;
  return { tickets, compact: true, more, first: f };
}

/**
 * Back to the top when an alarm newly starts costing more than everything in view (spec 2.3).
 * known: Set of alarm ids that were costing something last time. Returns { first, known }.
 */
export function autoTop(state, rect, first, known, wasCompact = false) {
  const order = triageOrder(state);
  const now = new Set(order.filter((x) => x.cost > 0).map((x) => x.alarm.id));
  let f = clampFirst(first, rect.h, order.length, wasCompact);
  if (f > 0) {
    const mode = railMode(rect.h, order.length, wasCompact);
    const inView = order.slice(f * TILES_ACROSS, f * TILES_ACROSS + mode.capacity);
    const best = Math.max(0, ...inView.map((x) => x.cost));
    const fresh = order.some((x) => x.cost > best && !known.has(x.alarm.id) && now.has(x.alarm.id));
    if (fresh) f = 0;
  }
  return { first: f, known: now };
}

/** Rail scroll from a vertical drag of `dy` px (finger up = positive = further down the list). */
export const scrollByDrag = (first, dy, railHeight, count, wasCompact = false) => clampFirst(first + dy / TILE_SLOT, railHeight, count, wasCompact);
