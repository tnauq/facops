// What the screen shows of the CEO (pass 3 spec 4.7 and 4.8). Pure, on game time.
// The banner's words, the CEO's lines and when they are said, the assistant's place a step behind,
// and the effects of a sighting (a float, the HUD flash, a shaken bubble).

import { EQUIPMENT_BY_ID, areaName, formatClock } from '../core/index2.js';
import { FLASH_TIME } from './feel.js';

// ---------------------------------------------------------------- lines (spec 4.8; all original)

export const LINES = {
  arrive: ['Walk with me. Fast. I have a rocket at four.', 'Show me the future. Quickly.', "I was told this building is fine. Let's find out."],
  ribbon: ["Big scissors. Bigger hall. Let's cut something.", 'I already announced this hall. Twice.'],
  handover: ['Eight halls. Now make them never break.', "Congratulations. Now it's mine."],
  leak: ['Why is the computer wet?', 'Water is just liquid downtime.'],
  breaker: ['Who turned off the money?', 'That box looks sad. Fix its feelings.'],
  network: ['That rack has stopped believing in us.', 'Have you tried turning it on?'],
  chiller: ["It's warm in here. Warm is a choice.", 'Is the snowflake supposed to be off?'],
  pump: ['Is that needle supposed to be up there? Rhetorical.', 'That gauge is very excited.'],
  any: ['Nobody is fixing that. Interesting.', "I'm going to post about this.", 'Add that to the all-hands.'],
  leaveGood: ['Acceptable. Barely. Keep shipping.', 'Great hustle. Do it again, faster.'],
  leaveBad: ["We'll talk about this at the offsite.", "I'm adding a dashboard to your dashboard."],
  zeroTolerance: ['Next visit I want zero problems. Not few. Zero.'],
  fire: ["You're done. I'll get an AI to run this.", 'Clear your desk. Take a cart.'],
};

/** A line from a list, chosen by a number from the run (so the same run says the same things). */
export const pickLine = (list, key) => list[Math.abs(Math.floor(key)) % list.length];

/** The line for a sighting: the alarm's own lines and the general ones, chosen by alarm id. */
export const sightingLine = (alarmType, alarmId) => pickLine([...(LINES[alarmType] ?? []), ...LINES.any], alarmId);

export const SAY_TIME = 3; // seconds a speech bubble shows
export const SHAKE_TIME = 0.6;

/** New view state for one run. */
export function createCeoView() {
  return { say: null, lastAt: null, trail: [], shakes: {}, nextIsZeroTolerance: false, visits: 0 };
}

/**
 * Feed this frame's events in. `feel` is the run's effects state (src/ui/feel2.js): a sighting
 * adds a float ("−50", or "Fired" under zero tolerance) and the HUD flash.
 */
export function ceoEvents(view, events, state, feel) {
  for (const e of events) {
    if (e.type === 'ceoWarning') view.nextIsZeroTolerance = e.nextIsZeroTolerance;
    if (e.type === 'ceoArrive') {
      view.visits += 1;
      const list = e.kind === 'ribbon' ? LINES.ribbon : e.kind === 'handover' ? LINES.handover : LINES.arrive;
      view.say = { text: pickLine(list, state.seed + view.visits), until: e.t + SAY_TIME };
    }
    if (e.type === 'ceoSighting') {
      view.say = { text: sightingLine(e.alarmType, e.alarmId), until: e.t + SAY_TIME };
      view.shakes[e.alarmId] = e.t + SHAKE_TIME;
      const at = EQUIPMENT_BY_ID[e.equipId];
      // Beside the alarm, so it never sits on the alarm's own MW label.
      feel.floats.push({ text: e.zeroTolerance ? 'Fired' : `−${e.cost} Stability`, x: at.x + 90, y: at.y, born: e.t });
      feel.flashUntil = e.t + FLASH_TIME;
    }
    if (e.type === 'ceoLeave') {
      const list = view.nextIsZeroTolerance ? LINES.zeroTolerance : e.sightings > 0 ? LINES.leaveBad : LINES.leaveGood;
      view.say = { text: pickLine(list, state.seed + view.visits), until: e.t + SAY_TIME };
      view.nextIsZeroTolerance = false;
    }
  }
}

/** The speech bubble to show at game time t, or null. */
export const liveSay = (view, t) => (view.say && t < view.say.until ? view.say.text : null);

/** How far (0 to 1) to shake each alarm's bubble now: { alarmId: phase }. */
export function liveShakes(view, t) {
  const out = {};
  for (const [id, until] of Object.entries(view.shakes)) {
    if (t >= until) delete view.shakes[id];
    else out[id] = (until - t) / SHAKE_TIME;
  }
  return out;
}

// ---------------------------------------------------------------- the assistant

const TRAIL_MAX = 60;
export const ASSISTANT_BEHIND = 34; // world units: a step behind

/** Remember where the CEO is (call every frame); the trail is cleared between visits. */
export function trackCeo(view, state) {
  const c = state.ceo;
  if (!c || c.phase !== 'visit') {
    if (!c) view.trail = [];
    if (c) view.lastAt = { x: c.x, y: c.y };
    return;
  }
  view.lastAt = { x: c.x, y: c.y };
  const last = view.trail[view.trail.length - 1];
  if (!last || Math.hypot(last.x - c.x, last.y - c.y) >= 2) view.trail.push({ x: c.x, y: c.y });
  if (view.trail.length > TRAIL_MAX) view.trail.shift();
}

/** Where the assistant stands: `behind` world units back along the CEO's trail (or at its start). */
export function assistantAt(trail, behind = ASSISTANT_BEHIND) {
  if (trail.length === 0) return null;
  let left = behind;
  for (let i = trail.length - 1; i > 0; i--) {
    const a = trail[i];
    const b = trail[i - 1];
    const d = Math.hypot(a.x - b.x, a.y - b.y);
    if (d >= left) return { x: a.x + ((b.x - a.x) * left) / d, y: a.y + ((b.y - a.y) * left) / d };
    left -= d;
  }
  return { ...trail[0] };
}

// ---------------------------------------------------------------- the banner

/** Areas still to be inspected on this visit, in order. */
export function areasLeft(ceo) {
  if (ceo.phase === 'warning') return [...ceo.areas];
  const out = [];
  for (let i = ceo.step; i < ceo.steps.length; i++) if (ceo.steps[i].kind === 'inspect') out.push(ceo.steps[i].area);
  return out;
}

// "Halls 4, 5", "Plant A, Hall 1", "every hall".
function placesText(areas, all) {
  if (areas.length === 0) return 'on the way out';
  if (all && areas.length >= 8) return 'every hall';
  if (areas.every((a) => a[0] === 'h')) return `${areas.length > 1 ? 'Halls' : 'Hall'} ${areas.map((a) => a.slice(1)).join(', ')}`;
  return areas.map(areaName).join(', ');
}
const shortPlaces = (areas) => (areas.length === 0 ? 'leaving' : areas.length >= 8 ? 'all halls' : areas.map((a) => (a[0] === 'h' ? `H${a.slice(1)}` : `P${a.slice(1)}`)).join(', '));

/**
 * The banner across the top of the map, or null between visits. { lines, zeroTolerance }: two lines
 * on a wide map, one on a narrow one (spec 4.7).
 */
export function bannerModel(state, narrow = false) {
  const c = state.ceo;
  if (!c) return null;
  const warning = c.phase === 'warning';
  const left = areasLeft(c);
  const clock = formatClock(Math.max(0, Math.ceil(c.warningEnd - state.t)));
  const zt = c.zeroTolerance;
  if (narrow) {
    const parts = ['CEO', shortPlaces(left), ...(warning ? [clock] : []), zt ? 'zero tolerance' : `−${c.cost}`];
    return { lines: [parts.join(' · ')], zeroTolerance: zt };
  }
  const where = placesText(left, c.kind === 'handover');
  const title = zt
    ? `Zero tolerance · ${warning ? where : `${where} left`}${warning ? ` · ${clock}` : ''}`
    : warning ? `The CEO is coming · ${where} · ${clock}` : `The CEO is here · ${left.length > 0 ? `${where} left` : where}`;
  const sub = zt ? 'Any unattended alarm seen ends the run' : `Each unattended alarm seen: −${c.cost}${c.nextIsZeroTolerance ? ' · Next visit: zero tolerance' : ''}`;
  return { lines: [title, sub], zeroTolerance: zt };
}
