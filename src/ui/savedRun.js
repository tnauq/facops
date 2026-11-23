// Save and resume on the screen (pass 7 spec 5, M44). Pure apart from the storage passed in: what
// goes in the device's storage, what the main menu's Resume button says, and the screen's own state
// (the tutorial's lesson, the introductions given) that a resumed run needs back.
// Storage is used only inside try/catch: without it nothing is saved and the game still works.

import { formatClock, loadGame, saveGame, SAVE_VERSION } from '../core/index2.js';
import { firstsFromSave, firstsToSave } from './firsts.js';

export const SAVE_KEY = 'facops.save.v1';
export const SAVE_EVERY = 10; // seconds of real time between saves, and the page being hidden

const money = (n) => `${n < 0 ? '−' : ''}$${Math.round(Math.abs(n)).toLocaleString('en-US')}`;

/** The screen's part of a run, as plain data. */
function screenPart(round) {
  const intros = round.intros ? { ...round.intros, given: [...round.intros.given] } : null;
  return { tutorial: round.tutorial ? { ...round.tutorial } : null, intros, firstRun: Boolean(round.firstRun), firsts: firstsToSave(round.firsts) };
}

/** Write the run to storage. Returns true if it was saved. */
export function writeSave(storage, round) {
  try {
    if (!storage) return false;
    const data = { version: SAVE_VERSION, clock: round.state.t, cash: round.state.cash, game: saveGame(round.state), screen: screenPart(round) };
    storage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

/** Forget the saved run (a finished run, or a new one started). */
export function clearSave(storage) {
  try {
    storage?.removeItem(SAVE_KEY);
  } catch {
    // nothing to do: no storage means nothing was saved
  }
}

/**
 * What is saved: { status: 'none' } | { status: 'old' } (from another version; it is removed) |
 * { status: 'ok', save } where save is { clock, cash, game, screen }.
 */
export function readSave(storage) {
  let raw = null;
  try {
    raw = storage ? storage.getItem(SAVE_KEY) : null;
  } catch {
    return { status: 'none' };
  }
  if (!raw) return { status: 'none' };
  let data = null;
  try {
    data = JSON.parse(raw);
  } catch {
    data = null;
  }
  if (!data || data.version !== SAVE_VERSION || !data.game || data.game.version !== SAVE_VERSION) {
    clearSave(storage);
    return { status: 'old' };
  }
  return { status: 'ok', save: data };
}

/** "Resume run · 12:40 · $3,210" */
export const resumeLabel = (save) => `Resume run · ${formatClock(save.clock)} · ${money(save.cash)}`;

export const OLD_SAVE_TEXT = 'Your saved run was from an older version.';
export const START_OVER_TEXT = 'Start over? Your saved run will be lost.';

/**
 * The run and the screen's part, from a save: { state, tutorial, intros, firstRun }, or null if the
 * run cannot be loaded.
 */
export function restoreRun(save) {
  const state = loadGame(save.game);
  if (!state) return null;
  const s = save.screen ?? {};
  const intros = s.intros ? { ...s.intros, given: new Set(s.intros.given ?? []) } : null;
  return { state, tutorial: s.tutorial ?? null, intros, firstRun: Boolean(s.firstRun), firsts: firstsFromSave(s.firsts ?? null) };
}
