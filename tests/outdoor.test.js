// The yard outside the building (M28, owner 15 Nov): layout only.
import test from 'node:test';
import assert from 'node:assert/strict';
import { DRY_COOLERS, DRY_PIPES, EQUIPMENT, EQUIPMENT_BY_ID, POLES, POWER_LINES, RMUS, TRANSFORMERS, WORLD } from '../src/core/layout2.js';
import { TRANSFORMER, YARD } from '../src/core/outdoor.js';

const MSBS = EQUIPMENT.filter((e) => e.type === 'msb');
const inYard = (x, y) => x >= -YARD.x && x <= WORLD.width + YARD.x && y >= -YARD.y && y <= WORLD.height + YARD.y;

test('every switchboard has a transformer straight outside the wall from it', () => {
  assert.equal(TRANSFORMERS.length, MSBS.length);
  for (const t of TRANSFORMERS) {
    const m = EQUIPMENT_BY_ID[t.msbId];
    assert.equal(t.x, m.x);
    if (m.half === 't') assert.ok(t.y + TRANSFORMER.h / 2 < 0, `${t.id} is outside the north wall`);
    else assert.ok(t.y - TRANSFORMER.h / 2 > WORLD.height, `${t.id} is outside the south wall`);
    assert.ok(inYard(t.x, t.y));
  }
});

test('the A and B transformers of a pair are fed from the same RMU, between them and further out', () => {
  assert.equal(RMUS.length, MSBS.length / 2);
  for (const r of RMUS) {
    const [a, b] = r.feeds.map((id) => TRANSFORMERS.find((t) => t.id === id));
    assert.deepEqual([a.side, b.side], ['A', 'B']);
    assert.equal(a.hall, b.hall);
    assert.equal(a.half, b.half);
    assert.equal(r.x, (a.x + b.x) / 2);
    assert.ok(r.half === 't' ? r.y < a.y : r.y > a.y, 'further from the building than its transformers');
  }
});

test('a power line on each side runs in from out of view on the left to the right, past every RMU, on poles', () => {
  assert.deepEqual(POWER_LINES.map((l) => l.side), ['t', 'b']);
  for (const line of POWER_LINES) {
    assert.ok(line.x1 < -YARD.x && line.x2 > WORLD.width + YARD.x, 'it runs off both ends of the map');
    for (const r of RMUS.filter((x) => x.half === line.side)) {
      assert.ok(line.side === 't' ? line.y < r.y : line.y > r.y);
      assert.ok(POLES.some((p) => p.side === line.side && p.x === r.x), `a pole at ${r.id}'s drop`);
    }
    assert.ok(inYard(0, line.y));
  }
});

test("a dry cooler block outside each plant, west and east, piped to that plant's north and south pumps", () => {
  const [a, b] = DRY_COOLERS;
  assert.equal(a.plant, 'A');
  assert.ok(a.x2 < 0, 'west of the west wall');
  assert.equal(b.plant, 'B');
  assert.ok(b.x1 > WORLD.width, 'east of the east wall');
  for (const d of DRY_COOLERS) {
    assert.equal(d.units.length, 8);
    assert.ok(inYard(d.x1, d.y1) && inYard(d.x2, d.y2));
  }
  assert.equal(DRY_PIPES.length, 4);
  for (const p of DRY_PIPES) {
    const pump = EQUIPMENT_BY_ID[`pump-${p.plant}-${p.half}`];
    const block = DRY_COOLERS.find((d) => d.plant === p.plant);
    assert.equal(p.points[0].y, pump.y, 'starts at its pump');
    const end = p.points.at(-1);
    assert.equal(end.y, p.half === 't' ? block.y1 : block.y2, 'ends at the block');
    assert.ok(end.x > block.x1 && end.x < block.x2);
  }
});
