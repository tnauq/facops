import test from 'node:test';
import assert from 'node:assert/strict';
import { EQUIPMENT_BY_ID, alarmInfo, assign, getAlarm } from '../src/core/index.js';
import { bubbleList, bubbleOptions } from '../src/ui/bubbles.js';
import { quietGame, tick } from './helpers.js';
import { raiseAlarm } from '../src/core/index.js';

test('one bubble per alarm, centered on its equipment', () => {
  const s = quietGame();
  raiseAlarm(s, 'leak', 'cdu-1-0');
  raiseAlarm(s, 'chiller', 'chiller-2');
  const list = bubbleList(s);
  assert.equal(list.length, 2);
  assert.deepEqual([list[0].x, list[0].y], [EQUIPMENT_BY_ID['cdu-1-0'].x, EQUIPMENT_BY_ID['cdu-1-0'].y]);
});

test('a fresh alarm does not pulse; one with under 25% of its clock left does', () => {
  const s = quietGame();
  const a = raiseAlarm(s, 'pump', 'pump-0'); // 20 s clock
  assert.equal(bubbleOptions(s, alarmInfo(s, a)).pulse, 0);
  tick(s, 16.2);
  const p = bubbleOptions(s, alarmInfo(s, getAlarm(s, a.id))).pulse;
  assert.equal(p, 0.5 + 0.5 * Math.sin(s.t * 8));
});

test('the walking tech shows as the assigned trade; once on site it does not, and the pulse stops', () => {
  const s = quietGame();
  const a = raiseAlarm(s, 'network', 'rack-2-1-4');
  tick(s, 26);
  assign(s, 'tech-0', a.id);
  let o = bubbleOptions(s, alarmInfo(s, getAlarm(s, a.id)));
  assert.equal(o.assignedTrade, 'electrical');
  tick(s, 5); // close enough to arrive? keep walking until on site
  while (s.techs[0].state === 'walking') tick(s, 0.05);
  const info = alarmInfo(s, getAlarm(s, a.id));
  o = bubbleOptions(s, info);
  assert.equal(info.attended, true);
  assert.equal(o.assignedTrade, null);
  assert.equal(o.pulse, 0);
});

test('selection and queued marks pass through', () => {
  const s = quietGame({ oneTap: true });
  const a = raiseAlarm(s, 'breaker', 'msb-1-A');
  const o = bubbleOptions(s, alarmInfo(s, a), a.id);
  assert.equal(o.selected, true);
  assert.equal(o.queued, false);
});

test('a spent clock never pulses', () => {
  const s = quietGame();
  const a = raiseAlarm(s, 'leak', 'cdu-2-1');
  tick(s, 31);
  const info = alarmInfo(s, getAlarm(s, a.id));
  assert.equal(info.clockLeft, Infinity);
  assert.equal(bubbleOptions(s, info).pulse, 0);
});
