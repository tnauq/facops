// Which screen the game is on (spec section 6.7): the start overlay, playing, paused, round over,
// or the tuning drawer. Pure reducer. The rules only run while the mode is 'playing'.

export const MODES = ['start', 'playing', 'paused', 'over', 'tuning'];

// The tuning drawer opens from the start, pause and round-over cards, and from the HUD's settings
// button during play. Done goes back to the card it came from; from play it goes to the pause card
// rather than straight back into the action, since changes only apply from the next round anyway.
const TUNING_BACK = { start: 'start', paused: 'paused', over: 'over', playing: 'paused' };

// mode -> action -> { mode, newRound }. Anything not listed leaves the mode alone.
const TABLE = {
  start: { start: { mode: 'playing', newRound: true } },
  playing: {
    pause: { mode: 'paused', newRound: false },
    togglePause: { mode: 'paused', newRound: false },
    over: { mode: 'over', newRound: false },
  },
  paused: {
    resume: { mode: 'playing', newRound: false },
    togglePause: { mode: 'playing', newRound: false },
    restart: { mode: 'playing', newRound: true },
  },
  over: { again: { mode: 'playing', newRound: true } },
};

/**
 * Returns { mode, newRound } (plus `back` when the tuning drawer opens). newRound tells the caller
 * to throw the old round away. `back` is the card to return to when the drawer closes: pass it in
 * again with the 'done' action.
 */
export function reduceFlow(mode, action, back = null) {
  if (action === 'tuning' && TUNING_BACK[mode]) return { mode: 'tuning', newRound: false, back: TUNING_BACK[mode] };
  if (mode === 'tuning') return action === 'done' && back ? { mode: back, newRound: false } : { mode, newRound: false };
  return TABLE[mode]?.[action] ?? { mode, newRound: false };
}
