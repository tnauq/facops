// Techs pick their own jobs (pass 4 spec 2.6, owner 14 Nov). Called from step() in game2.js.
//
// Whenever a tech is free and an alarm has had nobody on it for `autoDispatch.delay` seconds, the
// alarm that matters most goes to the free tech who would finish it soonest (walk plus fix):
//   1. while the CEO is announced or walking, alarms the CEO could see from the route first;
//   2. then the triage order of the rail (src/core/cost.js): costing most, then least clock left,
//      then oldest.
// It never pulls a busy tech off a job, so a job the player gave is kept until it is done; the
// player can still redirect anyone with assign(). It holds off while the classic tutorial's scripted
// lessons run, since those teach the player to send techs themselves.

import { EQUIPMENT_BY_ID } from './layout2.js';
import { onCeoRoute } from './ceo.js';
import { triageOrder } from './cost.js';
import { assign, canFix, fixDuration, walkDistance, walkSpeed } from './game2.js';
import { buildingOn } from './sites.js';

const finishTime = (state, tech, alarm) => walkDistance(state, tech, alarm) / walkSpeed(state) + fixDuration(state, alarm.type, tech.trade);

function soonestTech(state, techs, alarm) {
  let best = null;
  let bestTime = Infinity;
  for (const tech of techs) {
    if (!canFix(alarm.type, tech.trade)) continue; // electricians only for the yard's power faults
    const t = finishTime(state, tech, alarm);
    if (t < bestTime - 1e-9) {
      best = tech;
      bestTime = t;
    }
  }
  return best;
}

/** Alarms waiting for a tech, most important first, as auto-dispatch sees them. */
export function autoOrder(state) {
  const delay = state.config.autoDispatch.delay;
  const waiting = triageOrder(state).filter(({ alarm }) => alarm.techId === null && state.t - alarm.born >= delay - 1e-9);
  if (!state.ceo) return waiting.map((x) => x.alarm);
  const route = (a) => onCeoRoute(state, EQUIPMENT_BY_ID[a.equipId]);
  // A stable sort keeps the triage order within each group.
  return waiting.map((x) => x.alarm).sort((a, b) => Number(route(b)) - Number(route(a)));
}

/** Send free techs to waiting alarms. Returns how many it sent. */
export function autoDispatch(state) {
  const auto = state.config.autoDispatch;
  // The classic tutorial teaches sending techs by hand, so its lessons hold auto-dispatch off; the
  // building tutorial (pass 4 M27) shows techs going by themselves.
  if (!auto || !auto.enabled || state.over || (state.scripted && !buildingOn(state))) return 0;
  let sent = 0;
  for (const alarm of autoOrder(state)) {
    const idle = state.techs.filter((t) => t.state === 'idle');
    if (idle.length === 0) break;
    const tech = soonestTech(state, idle, alarm);
    if (tech && assign(state, tech.id, alarm.id).ok) {
      sent += 1;
      state.stats.autoSent = (state.stats.autoSent ?? 0) + 1;
    }
  }
  return sent;
}
