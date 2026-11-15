// Where the scripted builders put chillers: Plant A's eight first, then Plant B's pump and its
// eight. Not part of the game (see builder.js).

import { spotState } from './sites.js';

export const CHILLERS_ORDER = [
  ...[0, 1, 2, 3, 4, 5, 6, 7].map((i) => `chiller-A-${i}`),
  ...[0, 1, 2, 3, 4, 5, 6, 7].map((i) => `chiller-B-${i}`),
];

/** The next chiller spot to fill (or Plant B's pump first, when Plant B is next), or null. */
export function nextChillerSpot(state) {
  const id = CHILLERS_ORDER.find((c) => spotState(state, c) === 'empty');
  if (!id) return null;
  if (id.startsWith('chiller-B') && spotState(state, 'pump-B-t') === 'empty') return 'pump-B-t';
  return id;
}
