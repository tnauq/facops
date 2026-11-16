// Crew guidance (pass 5 spec 6, M35). Pure. Advice only: nothing here changes a rule.
// What each trade is faster at comes from the alarm table in config (which trade each alarm
// matches, and which are that trade's alone), never from a copy of it.

import { ALARMS2, buildingOn } from '../core/index2.js';

// Screen words for each alarm, in the order a line lists them.
const PHRASE = {
  breaker: 'breaker trips',
  short: 'shorts',
  rmu: 'RMU faults',
  chiller: 'chillers',
  pump: 'pumps',
  fan: 'dry coolers',
  leak: 'coolant leaks',
  network: 'network failures',
};
const ORDER = Object.keys(PHRASE);

// "a", "a and b", "a, b and c".
function list(words) {
  if (words.length <= 1) return words.join('');
  return `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}`;
}

const capital = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * The line under a trade on the Hire card: "Faster on breaker trips. The only trade for shorts and
 * RMU faults." Built from ALARMS2: an alarm the trade matches is "faster"; one marked tradeOnly is
 * that trade's alone.
 */
export function tradeLine(trade, alarms = ALARMS2) {
  const mine = ORDER.filter((id) => alarms[id] && alarms[id].trade === trade);
  const faster = mine.filter((id) => !alarms[id].tradeOnly).map((id) => PHRASE[id]);
  const only = mine.filter((id) => alarms[id].tradeOnly).map((id) => PHRASE[id]);
  const parts = [];
  if (faster.length) parts.push(`Faster on ${list(faster)}.`);
  if (only.length) parts.push(`The only trade for ${list(only)}.`);
  return capital(parts.join(' '));
}

/** The recommended crew: crewBase, plus crewPerHall for each hall online after the first. */
export function recommendedCrew(state) {
  const b = state.config.building;
  return b.crewBase + b.crewPerHall * Math.max(0, state.halls - 1);
}

/** Is the crew short of the recommendation? (Building mode only.) */
export const crewShort = (state) => buildingOn(state) && state.techs.length < recommendedCrew(state);

/** "Crew 3 · 4 recommended", and whether to show it in amber (short of it). */
export function crewText(state) {
  return { text: `Crew ${state.techs.length} · ${recommendedCrew(state)} recommended`, short: crewShort(state) };
}

/**
 * The trade to suggest: with three or more halls online (the yard can fail) and at most one
 * electrician, Electrical; otherwise the trade with fewest on the crew, ties in the scripted
 * builder's order (config hireTieOrder).
 */
export function suggestedTrade(state) {
  const count = (trade) => state.techs.filter((t) => t.trade === trade).length;
  if (state.halls >= state.config.building.yardFromHalls && count('electrical') <= 1) return 'electrical';
  const order = state.config.hireTieOrder;
  return [...order].sort((a, b) => count(a) - count(b) || order.indexOf(a) - order.indexOf(b))[0];
}

/** The hall-online celebration's text, with the crew advice when the crew is short (spec 6.3). */
export function hallOnlineText(state, hall) {
  return crewShort(state) ? `Hall ${hall} online · crew of ${recommendedCrew(state)} recommended` : `Hall ${hall} online`;
}
