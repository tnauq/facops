// The milestone 8 map preview: which halls are online, and a few sample alarms so the off-map
// arrows can be tried. Pure. The real game replaces this in milestone 10.

import { EQUIPMENT_BY_ID } from '../core/layout2.js';
import { ALARMS } from '../core/config.js';

export const MAX_HALLS = 8;
export const PLANT_B_HALL = 6; // spec 4.6: Plant B comes online with hall 6

/** Halls online from the address, "#halls=5"; 1 if missing or out of range. */
export function hallsFromHash(hash) {
  const m = /halls=(\d+)/.exec(hash ?? '');
  const n = m ? Number(m[1]) : 1;
  return Number.isInteger(n) && n >= 1 && n <= MAX_HALLS ? n : 1;
}

export const plantBOnline = (halls) => halls >= PLANT_B_HALL;

// One sample alarm per hall plus some plant ones, spread round the building.
const SAMPLES = [
  ['network', 'row-1-t-1'],
  ['leak', 'cdu-1-b'],
  ['chiller', 'chiller-A-5'],
  ['pump', 'pump-A-t'],
  ['breaker', 'msb-2-t-A'],
  ['network', 'row-3-b-2'],
  ['leak', 'cdu-4-t'],
  ['breaker', 'msb-5-b-B'],
  ['network', 'row-6-t-0'],
  ['chiller', 'chiller-B-2'],
  ['leak', 'cdu-7-b'],
  ['network', 'row-8-t-2'],
];

/** Sample alarms on equipment that is online: [{ id, type, equipId, x, y, info }]. */
export function sampleAlarms(halls) {
  return SAMPLES.filter(([, id]) => {
    const e = EQUIPMENT_BY_ID[id];
    return e.hall ? e.hall <= halls : e.plant === 'A' || plantBOnline(halls);
  }).map(([type, equipId], i) => {
    const e = EQUIPMENT_BY_ID[equipId];
    const def = ALARMS[type];
    // A bubble needs an alarmInfo-shaped object; these clocks are just for show.
    const left = def.clock * (0.3 + 0.1 * (i % 6));
    return {
      id: `sample-${i}`,
      type,
      equipId,
      x: e.x,
      y: e.y,
      info: { id: `sample-${i}`, type, trade: def.trade, clockTotal: def.clock, clockLeft: left, clockFraction: left / def.clock, attended: false, progress: 0, queued: false },
    };
  });
}

/** What a sample alarm does to its icon, so the faults show on the map too. */
export function sampleStatus(alarms) {
  const by = Object.fromEntries(alarms.map((a) => [a.equipId, a.type]));
  return (e) => {
    const t = by[e.id];
    if (!t) return {};
    if (t === 'network') return { netDown: true, level: 0 };
    if (t === 'leak') return { leak: 1 };
    if (t === 'breaker') return { tripped: true };
    if (t === 'chiller') return { running: false };
    if (t === 'pump') return { pressure: 0.6 };
    return {};
  };
}
