// The chilled-water pipes (M19): every pump, chiller and CDU is on the loop; the pipes run overhead,
// slope down to their units, and are marked where they pass over a walkway.
import test from 'node:test';
import assert from 'node:assert/strict';
import { EQUIPMENT, HALLS, PLANTS, WORLD } from '../src/core/index2.js';
import { HEADER_Y, INCLINE, nearPiece, onlineSpan, pipePieces, pipeRuns, pipeTaps } from '../src/ui/pipes.js';
import { PUMP_DISCHARGE_X } from '../src/render/icons.js';

const runs = pipeRuns();
const pieces = pipePieces();
const touches = (x, y, d = 2) => runs.some((r) => x >= r.x1 - d && x <= r.x2 + d && y >= r.y1 - d && y <= r.y2 + d);
const near = (a, b) => Math.abs(a - b) < 0.01;

test('every run is straight, ordered and inside the building', () => {
  for (const r of runs) {
    assert.ok(r.x1 === r.x2 || r.y1 === r.y2, JSON.stringify(r));
    assert.ok(r.x1 <= r.x2 && r.y1 <= r.y2);
    for (const v of [r.x1, r.x2]) assert.ok(v >= 0 && v <= WORLD.width);
    for (const v of [r.y1, r.y2]) assert.ok(v >= 0 && v <= WORLD.height);
  }
});

test('each pump\'s discharge tip is where its riser comes down to it', () => {
  for (const e of EQUIPMENT.filter((x) => x.type === 'pump')) {
    const x = e.x + (e.plant === 'A' ? 1 : -1) * PUMP_DISCHARGE_X;
    const tipY = e.y + (e.half === 't' ? 32 : -32);
    const riser = runs.find((r) => r.kind === 'riser' && near(r.x1, x) && r.drop === 'both');
    assert.ok(riser, e.id);
    assert.ok(near(e.half === 't' ? riser.y1 : riser.y2, tipY), e.id);
    const end = pieces.find((p) => near(p.x1, x) && (near(p.y1, tipY) || near(p.y2, tipY)));
    assert.equal(near(end.y1, tipY) ? end.h1 : end.h2, 0, `${e.id} meets its pump at floor level`);
  }
});

test('every chiller has a branch that slopes down to it, and every CDU has a tap on its header', () => {
  for (const e of EQUIPMENT.filter((x) => x.type === 'chiller')) {
    const edges = [e.x - 50, e.x + 50];
    const p = pieces.find((q) => q.kind === 'branch' && near(q.y1, e.y) && edges.some((x) => near(q.x1, x) || near(q.x2, x)));
    assert.ok(p, e.id);
    assert.ok(p.h1 === 0 || p.h2 === 0, `${e.id} branch reaches the floor`);
  }
  const taps = pipeTaps();
  for (const e of EQUIPMENT.filter((x) => x.type === 'cdu')) {
    const t = taps.find((q) => q.id === e.id);
    assert.ok(t && near(t.x, e.x) && near(t.y, HEADER_Y[e.half]), e.id);
    assert.ok(touches(t.x, t.y), e.id);
  }
});

test('slopes: overhead (1) away from units, 0 at them, never longer than the incline', () => {
  for (const p of pieces) {
    for (const h of [p.h1, p.h2]) assert.ok(h >= 0 && h <= 1);
    if (p.h1 < 1 || p.h2 < 1) assert.ok(Math.abs(p.x2 - p.x1) + Math.abs(p.y2 - p.y1) <= INCLINE + 0.01);
  }
  assert.ok(pieces.filter((p) => p.kind === 'header').every((p) => p.h1 === 1 && p.h2 === 1));
});

test('pipes over walkways are marked: the headers cross the plant lanes and the halls\' outer aisles', () => {
  const crossing = (x, y) => pieces.some((p) => p.overWalk && nearPiece(p, x, y, 1));
  assert.ok(crossing(PLANTS.A.lane, HEADER_Y.t));
  assert.ok(crossing(PLANTS.A.lane, HEADER_Y.b));
  assert.ok(crossing(1180, HEADER_Y.t)); // the gap between pairs
  assert.ok(crossing(1960, HEADER_Y.b)); // the centre line
  assert.ok(crossing(65.5, 95)); // a riser over the top corridor
  assert.ok(!pieces.some((p) => p.overWalk && p.kind === 'branch'));
  assert.ok(!crossing(HALLS[1].cx, HEADER_Y.t)); // over the CDU, not a walkway
});

test('the pieces cover every run exactly', () => {
  for (const r of runs) {
    const len = r.x2 - r.x1 + r.y2 - r.y1;
    const sum = pieces.filter((p) => p.kind === r.kind && p.x1 >= r.x1 - 0.01 && p.x2 <= r.x2 + 0.01 && p.y1 >= r.y1 - 0.01 && p.y2 <= r.y2 + 0.01)
      .reduce((a, p) => a + Math.abs(p.x2 - p.x1) + Math.abs(p.y2 - p.y1), 0);
    assert.ok(sum >= len - 0.01, `${r.kind} at ${r.x1},${r.y1}`);
  }
});

test('the online span grows with the halls and covers everything once Plant B is online', () => {
  assert.equal(onlineSpan(1, false).x2, HALLS[1].x + HALLS[1].w);
  assert.equal(onlineSpan(5, false).x2, HALLS[5].x + HALLS[5].w);
  assert.deepEqual(onlineSpan(6, true), { x1: 0, x2: WORLD.width });
});
