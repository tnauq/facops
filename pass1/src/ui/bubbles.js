// Which options each alarm bubble is drawn with (spec section 6.4). Pure, so it can be tested.

import { EQUIPMENT_BY_ID, alarmInfo, getTech } from '../core/index.js';

export const BUBBLE_RADIUS = 15; // px
export const BUBBLE_RAISE = 6; // px above the equipment's icon center
const PULSE_BELOW = 0.25; // pulse while less than this share of the clock is left
const PULSE_SPEED = 8; // radians per second of game time

/** Options for drawAlarmBubble, from the alarm's info, the game time and the current selection. */
export function bubbleOptions(state, info, selectedAlarmId = null) {
  const tech = info.techId ? getTech(state, info.techId) : null;
  const urgent = !info.attended && Number.isFinite(info.clockLeft) && info.clockFraction < PULSE_BELOW;
  return {
    selected: info.id === selectedAlarmId,
    pulse: urgent ? 0.5 + 0.5 * Math.sin(state.t * PULSE_SPEED) : 0,
    assignedTrade: tech && tech.state === 'walking' ? tech.trade : null,
    queued: info.queued,
  };
}

/** Every bubble to draw: world position of its center plus info and options. */
export function bubbleList(state, selectedAlarmId = null) {
  return state.alarms.map((alarm) => {
    const info = alarmInfo(state, alarm);
    const e = EQUIPMENT_BY_ID[alarm.equipId];
    return { x: e.x, y: e.y, info, options: bubbleOptions(state, info, selectedAlarmId) };
  });
}
