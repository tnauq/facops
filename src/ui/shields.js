// What the redundancy shields show (pass 3 spec, section 1). Pure.
// The states come from the rules engine; this module only adds the ring: on a cracked shield, how
// much clock is left on the alarm that will break it.

import { alarmInfo, coolingShield, getAlarm, liquidShield, powerShield, spareChillers } from '../core/index2.js';

// Fraction of clock left on the alarm open on this piece of equipment, or null if none (or spent).
function clockOn(state, equipId) {
  const dyn = state.equip[equipId];
  const alarm = dyn && dyn.alarmId !== null && dyn.alarmId !== undefined ? getAlarm(state, dyn.alarmId) : null;
  if (!alarm) return null;
  const info = alarmInfo(state, alarm);
  return Number.isFinite(info.clockLeft) ? info.clockFraction : null;
}

// The least clock left among some pieces of equipment, or null.
function soonest(state, ids) {
  let best = null;
  for (const id of ids) {
    const f = clockOn(state, id);
    if (f !== null && (best === null || f < best)) best = f;
  }
  return best;
}

function powerRing(state, hall) {
  const ids = [];
  for (const half of ['t', 'b']) {
    const a = `msb-${hall}-${half}-A`;
    const b = `msb-${hall}-${half}-B`;
    // Only a cracked pair (exactly one side down) has a clock that will break the shield.
    if (state.equip[a].tripped !== state.equip[b].tripped) ids.push(state.equip[a].tripped ? a : b);
  }
  return soonest(state, ids);
}

function liquidRing(state, hall) {
  return soonest(state, ['t', 'b'].map((h) => `cdu-${hall}-${h}`).filter((id) => state.equip[id].leaking));
}

function coolingRing(state) {
  return soonest(state, state.alarms.filter((a) => a.type === 'chiller').map((a) => a.equipId));
}

/**
 * { halls: [{ hall, power, liquid }], cooling } for the halls online. Each shield is
 * { status: 'whole' | 'cracked' | 'broken', ring: fraction of clock left, or null };
 * cooling also has `spare`, running chillers beyond those needed (negative when short).
 */
export function shieldsModel(state) {
  const halls = [];
  for (let hall = 1; hall <= state.halls; hall++) {
    const p = powerShield(state, hall);
    const l = liquidShield(state, hall);
    halls.push({
      hall,
      power: { status: p, ring: p === 'cracked' ? powerRing(state, hall) : null },
      liquid: { status: l, ring: l === 'cracked' ? liquidRing(state, hall) : null },
    });
  }
  const c = coolingShield(state);
  return { halls, cooling: { status: c, ring: c === 'cracked' ? coolingRing(state) : null, spare: spareChillers(state) } };
}

/** The words after the cooling shield: "3 spare", "0 spare", "2 short". */
export function spareText(spare) {
  return spare < 0 ? `${-spare} short` : `${spare} spare`;
}
