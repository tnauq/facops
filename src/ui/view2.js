// What the pass 2 map shows for a live game state: each icon's status and each alarm bubble.
// Pure, so it can be tested; the drawing code only paints what these return.

import { EQUIPMENT_BY_ID, alarmInfo, getAlarm, getTech } from '../core/index2.js';

const PULSE_BELOW = 0.25; // bubbles pulse while less than this share of the clock is left
const PULSE_SPEED = 8; // radians per second of game time

/** status(e): options for the icon's drawing function (see src/render/icons.js). */
export function equipmentStatus(state) {
  return (e) => {
    const dyn = state.equip[e.id];
    if (e.type === 'row') return { level: dyn.level * state.thermal, netDown: dyn.netDown };
    if (e.type === 'cdu') {
      if (!dyn.leaking) return { leak: 0 };
      const other = state.equip[`cdu-${e.hall}-${e.half === 't' ? 'b' : 't'}`];
      return { leak: other.leaking ? 2 : 1 }; // the big puddle when the whole hall is shut
    }
    if (e.type === 'msb') return { tripped: dyn.tripped };
    if (e.type === 'chiller') return { running: dyn.running };
    if (e.type === 'pump') {
      const alarm = dyn.alarmId === null ? null : getAlarm(state, dyn.alarmId);
      return { pressure: alarm ? 1 - alarmInfo(state, alarm).clockFraction : 0 };
    }
    return {};
  };
}

/** Every bubble: world position, alarm info and drawing options, as in pass 1 (spec 6.4). */
export function bubbles2(state, selectedAlarmId = null) {
  return state.alarms.map((alarm) => {
    const info = alarmInfo(state, alarm);
    const e = EQUIPMENT_BY_ID[alarm.equipId];
    const tech = info.techId ? getTech(state, info.techId) : null;
    const urgent = !info.attended && Number.isFinite(info.clockLeft) && info.clockFraction < PULSE_BELOW;
    return {
      id: alarm.id,
      type: alarm.type,
      x: e.x,
      y: e.y,
      info,
      options: {
        selected: alarm.id === selectedAlarmId,
        pulse: urgent ? 0.5 + 0.5 * Math.sin(state.t * PULSE_SPEED) : 0,
        assignedTrade: tech && tech.state === 'walking' ? tech.trade : null,
        queued: info.queued,
      },
    };
  });
}
