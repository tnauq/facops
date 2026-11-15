// What is built and which halls are online (pass 4 spec 2.1, 2.3). Pure.
//
// In the classic game (building off) every device is built and halls come online in order on the
// construction timer: hall h is online while h <= state.halls. In building mode every device spot
// starts empty, and a hall is online once it has at least one built switchboard and one built
// coolant unit, and at least one chiller is built anywhere (owner's rule). Everything in the rules
// asks these functions instead of comparing against state.halls, so both modes share one engine.

import { EQUIPMENT, EQUIPMENT_BY_ID, HALLS } from './layout2.js';

export const HALL_IDS = Object.keys(HALLS).map(Number).sort((a, b) => a - b);
const BY_HALL = new Map(HALL_IDS.map((h) => [h, EQUIPMENT.filter((e) => e.hall === h)]));
const CHILLERS = EQUIPMENT.filter((e) => e.type === 'chiller');
const PUMPS = EQUIPMENT.filter((e) => e.type === 'pump');

export const buildingOn = (state) => Boolean(state.config.building && state.config.building.enabled);

/** Is this device built? Always, in the classic game. */
export const isBuilt = (state, id) => !buildingOn(state) || state.equip[id].built === true;

// Building mode: work out which halls are online from what is built. Cached on the state as
// `hallsUp` (hall id -> true); refreshSites() is called whenever something finishes building.
function computeHallsUp(state) {
  const up = {};
  const anyChiller = CHILLERS.some((c) => isBuilt(state, c.id));
  for (const h of HALL_IDS) {
    const list = BY_HALL.get(h);
    const msb = list.some((e) => e.type === 'msb' && isBuilt(state, e.id));
    const cdu = list.some((e) => e.type === 'cdu' && isBuilt(state, e.id));
    up[h] = anyChiller && msb && cdu;
  }
  return up;
}

/**
 * Recompute which halls are online (building mode). Returns the halls that have just come online,
 * in order. Keeps state.halls as the number of halls online, for counts and the HUD.
 */
export function refreshSites(state) {
  if (!buildingOn(state)) return [];
  const before = state.hallsUp ?? {};
  state.hallsUp = computeHallsUp(state);
  state.halls = HALL_IDS.filter((h) => state.hallsUp[h]).length;
  return HALL_IDS.filter((h) => state.hallsUp[h] && !before[h]);
}

/** Is hall h online? */
export function hallOnline(state, h) {
  if (!buildingOn(state)) return h <= state.halls;
  return Boolean(state.hallsUp && state.hallsUp[h]);
}

/** Online hall ids, in order along the building. */
export const onlineHallIds = (state) => HALL_IDS.filter((h) => hallOnline(state, h));

/** Does this plant have a built pump? A plant's chillers only run with one (pass 4 spec 2.3). */
export const plantHasPump = (state, plant) => PUMPS.some((p) => p.plant === plant && isBuilt(state, p.id));

/** Built devices of one type in one half of a hall: the MSB pair, or the hall's CDUs. */
export function builtMsbs(state, hall, half) {
  return ['A', 'B'].map((side) => `msb-${hall}-${half}-${side}`).filter((id) => isBuilt(state, id));
}
export function builtCdus(state, hall) {
  return ['t', 'b'].map((half) => `cdu-${hall}-${half}`).filter((id) => isBuilt(state, id));
}

/** A spot's state: 'built', 'building' (with its finish time) or 'empty'. */
export function spotState(state, id) {
  if (isBuilt(state, id)) return 'built';
  return state.equip[id].buildEnd !== null && state.equip[id].buildEnd !== undefined ? 'building' : 'empty';
}

export const typeOf = (id) => EQUIPMENT_BY_ID[id].type;
