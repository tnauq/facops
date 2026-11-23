// Save and resume (pass 7 spec 5, M44). Pure: a run's whole state as plain data that JSON can hold,
// and back. The rules keep the whole run in one state object and draw every random number from two
// seeded generators, so a run saved and loaded plays on exactly as if it had never been saved.
//
// What JSON cannot hold is tagged: the generators (their position), Sets, and numbers that are not
// finite. The event list is not saved: the screen drains it every frame.

import { createRng } from './rng.js';

// The save format and the build it came from. Bump SAVE_VERSION whenever a milestone changes the
// rules or the shape of the state, so an older save is dropped rather than loaded wrongly.
export const SAVE_VERSION = 'm61'; // M51: perks and the rescue call in the state; M53: the balance pass's numbers

function encode(v) {
  if (typeof v === 'number') return Number.isFinite(v) ? v : { $num: String(v) };
  if (v === null || typeof v !== 'object') return v;
  if (v instanceof Set) return { $set: [...v].map(encode) };
  if (typeof v.getState === 'function' && typeof v.next === 'function') return { $rng: v.getState() };
  if (Array.isArray(v)) return v.map(encode);
  const out = {};
  for (const [k, x] of Object.entries(v)) {
    if (x === undefined || typeof x === 'function') continue;
    out[k] = encode(x);
  }
  return out;
}

function decode(v) {
  if (v === null || typeof v !== 'object') return v;
  if (Array.isArray(v)) return v.map(decode);
  if ('$num' in v) return Number(v.$num);
  if ('$set' in v) return new Set(v.$set.map(decode));
  if ('$rng' in v) {
    const rng = createRng(0);
    rng.setState(v.$rng);
    return rng;
  }
  const out = {};
  for (const [k, x] of Object.entries(v)) out[k] = decode(x);
  return out;
}

/** The run as plain data: { version, state }. JSON.stringify can write it as it is. */
export function saveGame(state) {
  return { version: SAVE_VERSION, state: encode({ ...state, events: [] }) };
}

/** A run from saveGame's data, or null if the data is from another version or not a save. */
export function loadGame(data) {
  if (!data || data.version !== SAVE_VERSION || !data.state) return null;
  return decode(data.state);
}
