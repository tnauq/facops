// A send the rules refuse (owner, after M30): a transformer short or an RMU fault is for
// electricians only. Rather than dropping the tap, the alarm stays selected so the next tap on an
// electrician sends them, and a short label rises from the alarm saying why. Pure.

import { EQUIPMENT_BY_ID } from '../core/layout2.js';
import { TRADES } from '../core/config2.js';

const PLURAL = { electrical: 'Electricians', mechanical: 'Mechanics', ce: 'CE techs', network: 'Network techs' };

/**
 * cmd: the { techId, alarmId } the tap asked for; result: what assign() returned.
 * Returns null when nothing was refused, else { selection, float } with float { text, x, y, born }
 * for the effects list (world units, game time).
 */
export function refusedTap(state, cmd, result) {
  if (!result || result.ok || result.reason !== 'trade') return null;
  const alarm = state.alarms.find((a) => a.id === cmd.alarmId);
  const where = alarm ? EQUIPMENT_BY_ID[alarm.equipId] : null;
  const who = PLURAL[result.trade] ?? `${TRADES[result.trade]?.label ?? 'Matching'} techs`;
  return {
    selection: { kind: 'alarm', id: cmd.alarmId },
    float: where ? { text: `${who} only`, x: where.x, y: where.y, born: state.t } : null,
  };
}
