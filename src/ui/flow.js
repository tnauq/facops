// Which screen the game is on (spec section 6.7): the start overlay, playing, paused, or round over.
// Pure reducer. The rules only run while the mode is 'playing'.

export const MODES = ['start', 'playing', 'paused', 'over'];

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

/** Returns { mode, newRound }. newRound tells the caller to throw the old round away. */
export function reduceFlow(mode, action) {
  return TABLE[mode]?.[action] ?? { mode, newRound: false };
}
