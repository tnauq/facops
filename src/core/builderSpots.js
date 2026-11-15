// Where the scripted builders put chillers: Plant A's eight first, then Plant B's pump and its
// eight, each with the dry coolers they need. Not part of the game (see builder.js).

import { spotState } from './sites.js';

export const CHILLERS_ORDER = [
  ...[0, 1, 2, 3, 4, 5, 6, 7].map((i) => `chiller-A-${i}`),
  ...[0, 1, 2, 3, 4, 5, 6, 7].map((i) => `chiller-B-${i}`),
];

const DRY_ORDER = (plant) => [0, 1, 2, 3, 4, 5, 6, 7].map((i) => `dry-${plant}-${i}`);
const started = (state, id) => spotState(state, id) !== 'empty';

/**
 * The next chiller spot to fill, or first what it needs to run: Plant B's pump when Plant B is next,
 * and a dry cooler when the plant's dry coolers already let all its chillers run (M29). Or null.
 */
export function nextChillerSpot(state) {
  const id = CHILLERS_ORDER.find((c) => spotState(state, c) === 'empty');
  if (!id) return null;
  const plant = id.split('-')[1];
  if (plant === 'B' && spotState(state, 'pump-B-t') === 'empty') return 'pump-B-t';
  const chillers = CHILLERS_ORDER.filter((c) => c.startsWith(`chiller-${plant}`) && started(state, c)).length;
  const dryUnits = DRY_ORDER(plant).filter((d) => started(state, d)).length;
  if (dryUnits * state.config.building.chillersPerDryCooler < chillers + 1) {
    const dry = DRY_ORDER(plant).find((d) => !started(state, d));
    if (dry) return dry;
  }
  return id;
}
