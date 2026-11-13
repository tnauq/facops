// The chilled-water pipes (M19): every pump, chiller and CDU is on the loop.
import test from 'node:test';
import assert from 'node:assert/strict';
import { EQUIPMENT, HALLS, WORLD } from '../src/core/index2.js';
import { HEADER_Y, onlineSpan, pipeRuns } from '../src/ui/pipes.js';
import { PUMP_DISCHARGE_X } from '../src/render/icons.js';

const runs = pipeRuns();
// Does a run pass within `d` world units of (x, y)?
const touches = (x, y, d = 2) => runs.some((r) => x >= Math.min(r.x1, r.x2) - d && x <= Math.max(r.x1, r.x2) + d && y >= Math.min(r.y1, r.y2) - d && y <= Math.max(r.y1, r.y2) + d);

test('every run is straight and inside the building', () => {
  for (const r of runs) {
    assert.ok(r.x1 === r.x2 || r.y1 === r.y2, JSON.stringify(r));
    for (const v of [r.x1, r.x2]) assert.ok(v >= 0 && v <= WORLD.width);
    for (const v of [r.y1, r.y2]) assert.ok(v >= 0 && v <= WORLD.height);
  }
});

test('every pump and chiller is on a pipe, and every CDU sits on a header', () => {
  // Each pump's discharge (15.5 to the hall side of its centre, as drawn) is on its riser.
  for (const e of EQUIPMENT.filter((x) => x.type === 'pump')) {
    const dx = (e.plant === 'A' ? 1 : -1) * PUMP_DISCHARGE_X;
    assert.ok(runs.some((r) => r.kind === 'riser' && Math.abs(r.x1 - (e.x + dx)) < 0.01 && e.y >= Math.min(r.y1, r.y2) - 0.01 && e.y <= Math.max(r.y1, r.y2) + 0.01), e.id);
  }
  for (const e of EQUIPMENT.filter((x) => x.type === 'chiller')) assert.ok(touches(e.x - 50, e.y) || touches(e.x + 50, e.y), e.id);
  for (const e of EQUIPMENT.filter((x) => x.type === 'cdu')) {
    assert.ok(Math.abs(HEADER_Y[e.half] - e.y) <= 22, e.id); // within the CDU's drawing
    assert.ok(touches(e.x, HEADER_Y[e.half]), e.id);
  }
});

test('the risers meet the headers, so it is all one loop', () => {
  for (const r of runs.filter((x) => x.kind === 'riser')) {
    assert.ok(touches(r.x1, HEADER_Y.t) && touches(r.x1, HEADER_Y.b));
  }
});

test('pipes stay clear of the corridors and the hall walls', () => {
  for (const y of Object.values(HEADER_Y)) {
    assert.ok(Math.abs(y - 95) > 20 && Math.abs(y - 685) > 20);
    assert.ok(y < HALLS[1].y - 20 || y > HALLS[1].y + HALLS[1].h + 20);
  }
});

test('the online span grows with the halls and covers everything once Plant B is online', () => {
  assert.equal(onlineSpan(1, false).x2, HALLS[1].x + HALLS[1].w);
  assert.equal(onlineSpan(5, false).x2, HALLS[5].x + HALLS[5].w);
  assert.deepEqual(onlineSpan(6, true), { x1: 0, x2: WORLD.width });
});
