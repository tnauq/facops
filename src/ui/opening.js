// The screen opens up (pass 10 spec 4, M61). Pure.
//
// In a player's first run (the firsts are on), parts of the screen appear when they first matter;
// in every other run everything shows from the start. Once a part has appeared it stays: what has
// opened is kept in the firsts' own record (f.opened), so a resumed run keeps it.
//
//   the overview strip   Hall 2 online
//   the Layers button    Hall 3 online
//   the priority flag    the fourth tech (and the strip, which it sits on)
//   the Hire card        the short-handed card, or the cash covering a hire after HIRE_AFTER
//   Sell early           the Handover
//   build spots          Hall 1, Plant A and Hall 1's yard from the start; each further hall (with its
//                        yard) once the hall before it has a rack built; Plant B with Hall 5
//
// The rows meter, cash, clock, deadline and the hold and speed buttons always show. The promises note
// needs nothing here: it only ever appears once the CEO has offered a promise.

import { EQUIPMENT_BY_ID, HALL_IDS, buyPrice, isBuilt } from '../core/index2.js';

export const HIRE_AFTER = 120; // seconds: from 2:00 the Hire card appears once the cash covers a hire
export const PULSE_MS = 1600; // how long a part's pulse lasts when it appears
const START_GRACE = 1; // seconds: what opens this early was there from the start

export const PARTS = ['strip', 'layers', 'flag', 'hire', 'sellEarly'];

const ROWS_PER_HALL = ['t', 'b'].flatMap((half) => [0, 1, 2].map((i) => `${half}-${i}`));
const hasRack = (state, h) => ROWS_PER_HALL.some((r) => isBuilt(state, `row-${h}-${r}`));

// Does this part (or 'hall-N') open now? Checked every frame until it does.
function opensNow(state, f, part, opened) {
  switch (part) {
    case 'strip': return state.halls >= 2;
    case 'layers': return state.halls >= 3;
    case 'flag': return state.techs.length >= 4 && opened.has('strip');
    case 'hire': return f.seen.has('shortHanded') || (state.t >= HIRE_AFTER && state.cash + 1e-9 >= buyPrice(state, 'hire'));
    case 'sellEarly': return Boolean(state.handoverQueued);
    default: {
      const h = Number(part.slice(5)); // 'hall-N'
      return h === 1 || (opened.has(`hall-${h - 1}`) && hasRack(state, h - 1));
    }
  }
}

/**
 * Advance one frame. f: the firsts (null when this run has none, so everything shows). Returns the
 * parts that opened this frame (for their pulse), in order: [] in a run without firsts.
 */
export function updateOpening(f, state) {
  if (!f) return [];
  const opened = new Set(f.opened ?? []);
  const fresh = [];
  // Halls in order along the building, so one frame can open several in a row (a resumed old save).
  for (const part of [...PARTS, ...HALL_IDS.map((h) => `hall-${h}`)]) {
    if (opened.has(part) || !opensNow(state, f, part, opened)) continue;
    opened.add(part);
    fresh.push(part);
  }
  if (fresh.length) f.opened = [...opened];
  // What is there from the start (Hall 1, and Hall 2 since Hall 1 starts with racks) gets no pulse.
  return state.t < START_GRACE ? [] : fresh;
}

/**
 * What shows now: { strip, layers, flag, hire, sellEarly, spot(id) }. spot(id): is this build spot
 * shown? With no firsts, everything is true.
 */
export function openingModel(f) {
  if (!f) return { strip: true, layers: true, flag: true, hire: true, sellEarly: true, spot: () => true };
  const opened = new Set(f.opened ?? []);
  const hall = (h) => h === 1 || opened.has(`hall-${h}`);
  return {
    strip: opened.has('strip'),
    layers: opened.has('layers'),
    flag: opened.has('flag'),
    hire: opened.has('hire'),
    sellEarly: opened.has('sellEarly'),
    spot: (id) => {
      const e = EQUIPMENT_BY_ID[id];
      if (!e) return true;
      if (e.hall) return hall(e.hall);
      return e.plant === 'B' ? hall(5) : true; // Plant A (chillers, pumps, dry coolers) from the start
    },
  };
}

/** How far through its pulse a part is (0 to 1), or null once it is over. */
export function pulseAt(startMs, nowMs) {
  if (startMs === undefined || startMs === null) return null;
  const k = (nowMs - startMs) / PULSE_MS;
  return k >= 0 && k < 1 ? k : null;
}

/** The pulses still running: [{ part, k }], k from 0 to 1. pulses: { part: startMs }. */
export const livePulses = (pulses, nowMs) =>
  Object.entries(pulses ?? {})
    .map(([part, start]) => ({ part, k: pulseAt(start, nowMs) }))
    .filter((p) => p.k !== null);
