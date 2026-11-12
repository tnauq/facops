// "#auto" in the address: the scripted player from src/core/bot.js plays the round,
// with a 1 s reaction and at most one command every 0.8 s (spec milestone 1).

import { greedyMove } from '../core/index.js';

export const AUTO_REACTION = 1;
export const AUTO_GAP = 0.8;

export function createAutoplay() {
  return { nextAction: 0 };
}

/** Call after every rules step. Returns true if the scripted player sent a tech. */
export function autoplayStep(auto, state) {
  if (state.over || state.t < auto.nextAction) return false;
  if (!greedyMove(state, { reaction: AUTO_REACTION })) return false;
  auto.nextAction = state.t + AUTO_GAP;
  return true;
}
