// The advisor mark (pass 7 spec 4.2, M43). Pure: which empty spot the compute-first scripted builder
// would buy next, for a ring on the map. It only points; it never buys anything.
//
// It shows by itself for the first ADVISOR_SECONDS of economy time in a player's first building run,
// and after that only with the Settings switch. It hides while a card is open, during a CEO warning,
// while the tutorial's lessons run, and when the builder wants nothing it could ring.

import { buildRole, buildingOn, economyTime, splitOn, spotState } from '../core/index2.js';
import { nextWanted } from '../core/builder.js';

export const ADVISOR_SECONDS = 180; // starting value (spec 4.2): the first 3:00 of a first run

/** Should the mark show in this run at all, now? firstRun: no run finished yet. setting: the switch. */
export function advisorOn(state, { firstRun = false, setting = false } = {}) {
  if (!buildingOn(state) || state.over || state.scripted) return false;
  return setting || (firstRun && economyTime(state) < ADVISOR_SECONDS);
}

/** Pass 9 (M57): the mark's words, "Next: progress" or "Next: support", or null with the split off. */
export const advisorLabel = (state, id) => (splitOn(state) && id ? `Next: ${buildRole(state, id)}` : null);

/**
 * The spot to ring, or null. cardOpen: a build, inspect, hire or bundle card is open.
 */
export function advisorSpot(state, { firstRun = false, setting = false, cardOpen = false } = {}) {
  if (cardOpen || !advisorOn(state, { firstRun, setting })) return null;
  if (state.ceo && state.ceo.phase === 'warning') return null;
  const id = nextWanted(state, 'builder');
  return id && spotState(state, id) === 'empty' ? id : null;
}
