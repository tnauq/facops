// Shared helpers for the rule tests.
import { advance, createGame } from '../src/core/index.js';

/** A game where nothing happens unless the test makes it happen. */
export function quietGame(config = {}, seed = 1) {
  return createGame({ seed, config: { ...config, director: { enabled: false, ...(config.director ?? {}) } } });
}

export const tick = (state, seconds) => advance(state, seconds, 0.05);

export const near = (actual, expected, tolerance = 0.51) => Math.abs(actual - expected) <= tolerance;
