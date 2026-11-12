// Feel (spec section 11): floating MW losses, the HUD flash on entering red, bubbles popping in,
// and hats bobbing while techs walk. Pure: everything runs on game time, so it all stands still
// while the game is paused.
// The MW figures are worked out from the rules config and the map, never typed in here.

import { EQUIPMENT, EQUIPMENT_BY_ID, HALLS } from '../core/index.js';

export const FLOAT_LIFE = 1; // seconds a loss label stays on screen
export const FLOAT_RISE = 20; // px it rises over that time
export const FLASH_TIME = 0.3; // seconds the HUD flashes on entering red
export const POP_TIME = 0.15; // seconds a new bubble takes to grow to full size
export const BOB_PX = 1; // how far a walking tech's hat bobs
const BOB_SPEED = 4 * Math.PI; // radians per second: two bobs a second, a brisk walk

const racksIn = (pred) => EQUIPMENT.filter((e) => e.type === 'rack' && pred(e)).length;
const rowRacks = (cdu) => racksIn((e) => e.hall === cdu.hall && e.row === cdu.row);

/** The MW a fresh loss costs, from config: a rack, a throttled row, a row shut down, a dark hall. */
export function lossMw(config, kind, equip) {
  const rack = config.rackMw;
  if (kind === 'network') return rack;
  if (kind === 'leak') return rowRacks(equip) * rack * (1 - config.leakThrottle);
  if (kind === 'rowShutdown') return rowRacks(equip) * rack * config.leakThrottle; // the rest of the row
  if (kind === 'hallDark') return racksIn((e) => e.hall === equip.id) * rack;
  return 0;
}

/**
 * The floating label for one rules event, or null: { text, x, y } with x, y in world units.
 * A network failure or leak appearing (however it was caused), a row shutting down, a hall going dark.
 */
export function lossFloat(event, config) {
  let kind = null;
  let where = null;
  if (event.type === 'spawn' && (event.alarmType === 'network' || event.alarmType === 'leak')) {
    kind = event.alarmType;
    where = EQUIPMENT_BY_ID[event.equipId];
  } else if (event.type === 'escalate' && event.effect === 'rowShutdown') {
    kind = 'rowShutdown';
    where = EQUIPMENT_BY_ID[event.equipId];
  } else if (event.type === 'hallDark') {
    kind = 'hallDark';
    const hall = HALLS[event.hall];
    where = { ...hall, x: hall.x + hall.w / 2, y: hall.aisleY };
  }
  if (!kind || !where) return null;
  return { text: `-${Math.round(lossMw(config, kind, where))} MW`, x: where.x, y: where.y };
}

/** New effects state. */
export function createFeel() {
  return { floats: [], flashUntil: -Infinity };
}

/** Feed this frame's events in. `config` is state.config. */
export function feelEvents(feel, events, config) {
  for (const e of events) {
    const f = lossFloat(e, config);
    if (f) feel.floats.push({ ...f, born: e.t });
    if (e.type === 'band' && e.to === 'red') feel.flashUntil = e.t + FLASH_TIME;
  }
}

/** The labels still showing at game time t, each with how far it has risen (px) and its opacity. */
export function liveFloats(feel, t) {
  feel.floats = feel.floats.filter((f) => t - f.born < FLOAT_LIFE);
  return feel.floats.map((f) => {
    const k = Math.max(0, (t - f.born) / FLOAT_LIFE);
    return { text: f.text, x: f.x, y: f.y, rise: FLOAT_RISE * k, alpha: 1 - k };
  });
}

/** HUD flash strength from 1 down to 0 over FLASH_TIME after entering red; 0 otherwise. */
export function flashAlpha(feel, t) {
  const left = feel.flashUntil - t;
  return left > 0 ? Math.min(1, left / FLASH_TIME) : 0;
}

/** Bubble size, as a share of full size, for an alarm `age` seconds old: grows over POP_TIME with a small overshoot. */
export function popScale(age) {
  if (age >= POP_TIME) return 1;
  const k = Math.max(0, age / POP_TIME);
  // An ease-out with a slight overshoot ("back" easing), so the bubble pops rather than slides in.
  const c = 1.7;
  const u = k - 1;
  return 1 + (c + 1) * u * u * u + c * u * u;
}

/** Screen px to lift a tech by: a 1 px bob while walking, nothing otherwise. */
export function bobOffset(tech, t) {
  return tech.state === 'walking' ? -BOB_PX * Math.abs(Math.sin(t * BOB_SPEED + tech.index)) : 0;
}
