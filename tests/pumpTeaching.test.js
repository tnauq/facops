// Teaching the pumps (pass 6 spec 5, M40): the new-hall lesson, two introductions, the drawer.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, step } from '../src/core/index2.js';
import { INTRO_TEXT, createIntros, updateIntros, waterText } from '../src/ui/intros.js';
import { GROW_LINE } from '../src/ui/tutorial4.js';
import { TUNING2_FIELDS } from '../src/ui/tuning2.js';
import { tradeLine } from '../src/ui/crewAdvice.js';

const game = () => createGame({ seed: 1, config: { tutorial: false, autoDispatch: { enabled: false }, director: { enabled: false }, building: { enabled: true, startCash: 20000 } } });

test('the new-hall lesson names the water pumps, within the callout limit', () => {
  assert.equal(GROW_LINE, 'New hall: RMU, transformer, switchboard, coolant unit, a water pump for every 2 halls, then racks.');
  assert.ok(GROW_LINE.length <= 110);
});

test('the first dry CDU and the first hall without water get one line each, in any building run', () => {
  const s = game();
  const intros = createIntros({ devices: false }); // a run without the tutorial still gets them
  const seen = [];
  const run = (n) => { for (let i = 0; i < n; i++) { step(s, 0.05); const t = updateIntros(intros, s); if (t && seen.at(-1) !== t) seen.push(t); } };
  run(20);
  assert.deepEqual(seen, []);
  for (const id of ['cdu-1-b', 'cdu-2-t', 'cdu-2-b', 'cdu-3-t']) s.equip[id].built = true;
  s.hallsUp[2] = s.hallsUp[3] = true;
  s.halls = 3;
  run(400);
  assert.deepEqual(seen, [INTRO_TEXT.dryCdu, waterText(3)]);
  assert.equal(waterText(3), 'Water pumps serve two halls each. Hall 3 has none: it runs at half.');
  assert.equal(INTRO_TEXT.dryCdu, 'Not enough glycol pumps: the farthest coolant unit has gone dry. Build another.');
  // Once each: going dry again later says nothing.
  s.equip['gpump-A-2'].built = true;
  s.equip['wpump-A-1'].built = true;
  run(20);
  s.equip['gpump-A-2'].built = false;
  s.equip['wpump-A-1'].built = false;
  run(400);
  assert.equal(seen.length, 2);
});

test('the drawer carries what each pump does', () => {
  const ids = TUNING2_FIELDS.map((f) => f.id);
  for (const id of ['chillersPerGlycolPump', 'cdusPerGlycolPump', 'hallsPerWaterPump', 'noWaterFactor']) assert.ok(ids.includes(id), id);
  const f = TUNING2_FIELDS.find((x) => x.id === 'noWaterFactor');
  const o = {};
  f.set(o, 30);
  assert.equal(o.building.pumps.noWaterFactor, 0.3);
  assert.equal(o.building.pumps.cdusPerGlycolPump, 2, 'the other pump numbers come along');
  const s = createGame({ seed: 1, config: { tutorial: false, ...o, building: { enabled: true, ...o.building } } });
  assert.equal(f.get(s.config), 30);
});

test("the Mechanical line still names the pumps", () => {
  assert.equal(tradeLine('mechanical'), 'Faster on chillers, pumps and dry coolers.');
});
