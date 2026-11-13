// What each alarm costs now, and the rail's triage order (pass 3 spec 2.1, 2.2).
import test from 'node:test';
import assert from 'node:assert/strict';
import { advance, createGame, load, raiseAlarm } from '../src/core/index2.js';
import { alarmCost, triageOrder } from '../src/ui/cost.js';

const quiet = (config = {}) => createGame({ seed: 1, config: { ...config, director: { enabled: false } } });

// Raise these alarms, let the rows settle, and return the game.
function withFaults(faults, config = {}) {
  const s = quiet(config);
  for (const [type, id] of faults) raiseAlarm(s, type, id);
  advance(s, 5);
  return s;
}
const costOf = (s, equipId) => alarmCost(s, s.alarms.find((a) => a.equipId === equipId));

// The engine's own answer: load with the faults, against load with this one left out.
function engineGain(faults, equipId, config) {
  const all = withFaults(faults, config);
  const without = withFaults(faults.filter(([, id]) => id !== equipId), config);
  return load(without).deliveredMw - load(all).deliveredMw;
}

test('network failure: its row, about 6 MW', () => {
  const s = withFaults([['network', 'row-1-t-0']]);
  assert.equal(costOf(s, 'row-1-t-0'), 6);
});

test('a single leak costs about 4 MW; with both CDUs leaking each ticket shows about 34', () => {
  assert.equal(costOf(withFaults([['leak', 'cdu-1-t']]), 'cdu-1-t'), 4);
  const both = withFaults([['leak', 'cdu-1-t'], ['leak', 'cdu-1-b']]);
  assert.equal(costOf(both, 'cdu-1-t'), 34);
  assert.equal(costOf(both, 'cdu-1-b'), 34);
});

test('a breaker costs nothing until its partner trips; then each shows half a hall, about 19 MW', () => {
  assert.equal(costOf(withFaults([['breaker', 'msb-2-t-A']], { startHalls: 2 }), 'msb-2-t-A'), 0);
  const dark = withFaults([['breaker', 'msb-2-t-A'], ['breaker', 'msb-2-t-B']], { startHalls: 2 });
  assert.equal(costOf(dark, 'msb-2-t-A'), 19);
  assert.equal(costOf(dark, 'msb-2-t-B'), 19);
});

test('a network failure on a dark row costs nothing more until the lights are back', () => {
  const s = withFaults([['breaker', 'msb-1-t-A'], ['breaker', 'msb-1-t-B'], ['network', 'row-1-t-1']]);
  assert.equal(costOf(s, 'row-1-t-1'), 0);
  assert.equal(costOf(s, 'msb-1-t-A'), 13); // the other two rows of that half come back
});

test('pumps cost nothing; chillers cost nothing while spares run, and the shortfall once short', () => {
  assert.equal(costOf(withFaults([['pump', 'pump-A-t']], { startHalls: 2 }), 'pump-A-t'), 0);
  assert.equal(costOf(withFaults([['chiller', 'chiller-A-0']], { startHalls: 5 }), 'chiller-A-0'), 0);
  // Hall 5: 8 chillers, 7 needed. Two down: 6 of 7 running, short by one.
  const s = withFaults([['chiller', 'chiller-A-0'], ['chiller', 'chiller-A-1']], { startHalls: 5 });
  const c = costOf(s, 'chiller-A-0');
  assert.ok(c >= 26 && c <= 27, `${c}`); // 187.5 MW x 1/7
});

test('costs match what the rules engine gives back when the fault is gone', () => {
  const cases = [
    [[['network', 'row-3-b-2']], 'row-3-b-2', { startHalls: 3 }],
    [[['leak', 'cdu-2-b']], 'cdu-2-b', { startHalls: 2 }],
    [[['leak', 'cdu-2-b'], ['leak', 'cdu-2-t']], 'cdu-2-t', { startHalls: 2 }],
    [[['breaker', 'msb-4-b-A'], ['breaker', 'msb-4-b-B']], 'msb-4-b-B', { startHalls: 4 }],
    [[['leak', 'cdu-1-t'], ['network', 'row-1-b-0']], 'row-1-b-0', {}],
  ];
  for (const [faults, id, config] of cases) {
    const s = withFaults(faults, config);
    assert.equal(costOf(s, id), Math.round(engineGain(faults, id, config)), `${id}`);
  }
});

test('triage order: costly alarms first, biggest first; then by clock; then oldest', () => {
  const s = quiet({ startHalls: 2 });
  raiseAlarm(s, 'breaker', 'msb-1-t-A'); // free, 45 s clock
  advance(s, 1);
  raiseAlarm(s, 'pump', 'pump-A-t'); // free, 20 s clock: before the breaker
  raiseAlarm(s, 'network', 'row-2-t-0'); // -6
  raiseAlarm(s, 'leak', 'cdu-2-b'); // -4 now, though its clock is shorter
  advance(s, 4);
  const order = triageOrder(s).map((x) => x.alarm.equipId);
  assert.deepEqual(order, ['row-2-t-0', 'cdu-2-b', 'pump-A-t', 'msb-1-t-A']);
  // The second CDU leaking makes both leak tickets the most expensive.
  raiseAlarm(s, 'leak', 'cdu-2-t');
  advance(s, 4);
  assert.deepEqual(triageOrder(s).slice(0, 2).map((x) => x.alarm.equipId).sort(), ['cdu-2-b', 'cdu-2-t']);
});
