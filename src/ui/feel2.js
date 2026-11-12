// Feel for pass 2 (spec M13): floating MW losses worked out from the pass 2 rules, the HUD flash on
// entering red, and a short celebration when a hall comes online. Pure, on game time, so it all
// freezes while the game is paused (including under the Delivery card).
// Reuses pass 1's float and flash bookkeeping (src/ui/feel.js); only the figures and places differ.

import { EQUIPMENT_BY_ID, HALLS, MID_Y } from '../core/index2.js';
import { FLASH_TIME, createFeel as createFeel1, flashAlpha, liveFloats } from './feel.js';

export { flashAlpha, liveFloats };
export const CELEBRATE_TIME = 2; // seconds a new hall's celebration lasts

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
  }
}

const hallMw = (state) => 2 * ROWS_PER_HALF * state.config.rowMw;

/** Celebrations still showing at game time t: [{ hall, k, text }] with k from 0 to 1. */
export function liveCelebrations(feel, t) {
  feel.celebrations = feel.celebrations.filter((c) => t - c.born < CELEBRATE_TIME);
  return feel.celebrations.map((c) => ({
    hall: c.hall,
    k: Math.max(0, (t - c.born) / CELEBRATE_TIME),
    text: `Hall ${c.hall} online · +${Math.round(c.mw)} MW`,
  }));
}
