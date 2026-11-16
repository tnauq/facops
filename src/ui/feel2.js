// Feel for pass 2 (spec M13): floating MW losses worked out from the pass 2 rules, the HUD flash on
// entering red, and a short celebration when a hall comes online. Pure, on game time, so it all
// freezes while the game is paused (including under the Delivery card).
// Reuses pass 1's float and flash bookkeeping (src/ui/feel.js); only the figures and places differ.

import { EQUIPMENT_BY_ID, HALLS, MID_Y, onlineHallIds } from '../core/index2.js';
import { FLASH_TIME, createFeel as createFeel1, flashAlpha, liveFloats } from './feel.js';
import { hallOnlineText } from './crewAdvice.js';

export { flashAlpha, liveFloats };
export const CELEBRATE_TIME = 2; // seconds a new hall's celebration lasts
export const COMMISSION_STAGGER = 0.35; // seconds between one hall lighting and the next when Commissioned

const ROWS_PER_HALF = 3;

/** New effects state: pass 1's floats and flash, plus celebrations. */
export function createFeel2() {
  return { ...createFeel1(), celebrations: [] };
}

/**
 * The MW a fresh loss costs under the pass 2 rules (spec 4.1), rounded to whole MW for the label,
 * and where it shows. Null for events that cost nothing at once.
 */
export function lossFloat2(event, state) {
  const cfg = state.config;
  const hallRows = 2 * ROWS_PER_HALF;
  let mw = 0;
  let at = null;
  if (event.type === 'spawn' && event.alarmType === 'network') {
    mw = cfg.rowMw;
    at = EQUIPMENT_BY_ID[event.equipId];
  } else if (event.type === 'spawn' && event.alarmType === 'leak') {
    const e = EQUIPMENT_BY_ID[event.equipId];
    const other = state.equip[`cdu-${e.hall}-${e.half === 't' ? 'b' : 't'}`];
    // The first leak throttles the hall; the second shuts what was left of it.
    mw = other.leaking ? hallRows * cfg.rowMw * cfg.leakThrottle : hallRows * cfg.rowMw * (1 - cfg.leakThrottle);
    at = e;
  } else if (event.type === 'halfDark') {
    const hall = HALLS[event.hall];
    mw = ROWS_PER_HALF * cfg.rowMw;
    at = { x: hall.cx, y: event.half === 't' ? (hall.y + MID_Y) / 2 : (MID_Y + hall.y + hall.h) / 2 };
  }
  if (!at || mw <= 0) return null;
  return { text: `-${Math.round(mw)} MW`, x: at.x, y: at.y };
}

/** Feed this frame's events in. */
export function feelEvents2(feel, events, state) {
  for (const e of events) {
    const f = lossFloat2(e, state);
    if (f) feel.floats.push({ ...f, born: e.t });
    if (e.type === 'band' && e.to === 'red') feel.flashUntil = e.t + FLASH_TIME;
    if (e.type === 'delivery') feel.celebrations.push({ hall: e.hall, born: e.t, mw: hallMw(state) });
    // Building mode (pass 4): a hall the player brought online, and a device a contractor finished.
    // Pass 5 (spec 6.3): with the crew advice when the crew is short of it.
    if (e.type === 'hallOnline') feel.celebrations.push({ hall: e.hall, born: e.t, mw: null, text: hallOnlineText(state, e.hall) });
    // Pass 5 (spec 5.2): Commissioned is bigger than a hall: every hall lights in turn.
    if (e.type === 'commissioned') {
      onlineHallIds(state).forEach((hall, i) => feel.celebrations.push({ hall, born: e.t + i * COMMISSION_STAGGER, mw: null, text: 'Commissioned' }));
    }
    if (e.type === 'buildStart') {
      const eq = EQUIPMENT_BY_ID[e.equipId];
      feel.floats.push({ text: `-$${e.price}`, x: eq.x, y: eq.y, born: e.t });
    }
  }
}

const hallMw = (state) => 2 * ROWS_PER_HALF * state.config.rowMw;

/** Celebrations still showing at game time t: [{ hall, k, text }] with k from 0 to 1. */
export function liveCelebrations(feel, t) {
  feel.celebrations = feel.celebrations.filter((c) => t - c.born < CELEBRATE_TIME);
  // A hall waiting for its turn (Commissioned) does not show yet.
  return feel.celebrations.filter((c) => t >= c.born).map((c) => ({
    hall: c.hall,
    k: Math.max(0, (t - c.born) / CELEBRATE_TIME),
    text: c.text ?? (c.mw === null ? `Hall ${c.hall} online` : `Hall ${c.hall} online · +${Math.round(c.mw)} MW`),
  }));
}
