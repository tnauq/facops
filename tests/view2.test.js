import test from 'node:test';
import assert from 'node:assert/strict';
import { EQUIPMENT_BY_ID, advance, assign, createGame, raiseAlarm } from '../src/core/index2.js';
import { bubbles2, equipmentStatus } from '../src/ui/view2.js';

const quiet = (config = {}) => createGame({ seed: 1, config: { ...config, director: { enabled: false } } });

test('icons show the live faults', () => {
  const s = quiet();
  raiseAlarm(s, 'network', 'row-1-t-0');
  advance(s, 0.1);
  const st = equipmentStatus(s);
  assert.deepEqual(st(EQUIPMENT_BY_ID['row-1-t-0']), { level: 0, netDown: true });
  assert.deepEqual(st(EQUIPMENT_BY_ID['row-1-t-1']), { level: 1, netDown: false });
  raiseAlarm(s, 'leak', 'cdu-1-t');
  assert.deepEqual(st(EQUIPMENT_BY_ID['cdu-1-t']), { leak: 1 });
  raiseAlarm(s, 'leak', 'cdu-1-b');
  assert.deepEqual(st(EQUIPMENT_BY_ID['cdu-1-b']), { leak: 2 });
  raiseAlarm(s, 'breaker', 'msb-1-t-A');
  assert.deepEqual(st(EQUIPMENT_BY_ID['msb-1-t-A']), { tripped: true });
  raiseAlarm(s, 'chiller', 'chiller-A-3');
  assert.deepEqual(st(EQUIPMENT_BY_ID['chiller-A-3']), { running: false });
});

test('a pump\'s gauge climbs as its clock runs down', () => {
  const s = quiet({ startHalls: 2 });
  raiseAlarm(s, 'pump', 'pump-A-b');
  advance(s, 10);
  const p = equipmentStatus(s)(EQUIPMENT_BY_ID['pump-A-b']).pressure;
  assert.ok(p > 0.45 && p < 0.55, `${p}`);
});

test('bubbles sit on their equipment and carry pass 1\'s options', () => {
  const s = quiet();
  const a = raiseAlarm(s, 'leak', 'cdu-1-b');
  assign(s, 'tech-1', a.id);
  const [b] = bubbles2(s, a.id);
  assert.deepEqual([b.x, b.y], [EQUIPMENT_BY_ID['cdu-1-b'].x, EQUIPMENT_BY_ID['cdu-1-b'].y]);
  assert.equal(b.options.selected, true);
  assert.equal(b.options.assignedTrade, 'mechanical');
  assert.equal(b.info.type, 'leak');
});

test('an unattended bubble pulses only in the last quarter of its clock', () => {
  const s = quiet();
  raiseAlarm(s, 'breaker', 'msb-1-b-A');
  assert.equal(bubbles2(s)[0].options.pulse, 0);
  advance(s, 40);
  assert.ok(bubbles2(s)[0].info.clockFraction < 0.25);
});
