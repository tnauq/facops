// The pipes (M19; pass 6 M38: a glycol loop and a water loop): every pump, chiller, CDU and hall is
// on its loop; the pipes run overhead, slope down to their units, and are marked where they pass
// over a walkway.
import test from 'node:test';
import assert from 'node:assert/strict';
import { BUILDING, EQUIPMENT, HALLS, PLANTS, PUMP_LANE_X, PUMP_ROOM_HEADER_X, WORLD } from '../src/core/index2.js';
import { FLOOR_DIVE, HEADER_Y, INCLINE, WATER_Y, nearPiece, onlineSpan, pipePieces, pipeRuns, pipeTaps } from '../src/ui/pipes.js';
import { PUMP_DISCHARGE_X } from '../src/render/icons.js';

const runs = pipeRuns();
const pieces = pipePieces();
const touches = (x, y, d = 2) => runs.some((r) => x >= r.x1 - d && x <= r.x2 + d && y >= r.y1 - d && y <= r.y2 + d);
const near = (a, b) => Math.abs(a - b) < 0.01;

test('every run is straight, ordered and inside the building', () => {
  for (const r of runs) {
    assert.ok(r.x1 === r.x2 || r.y1 === r.y2, JSON.stringify(r));
    assert.ok(r.x1 <= r.x2 && r.y1 <= r.y2);
    for (const v of [r.x1, r.x2]) assert.ok(v >= BUILDING.x1 && v <= BUILDING.x2);
    for (const v of [r.y1, r.y2]) assert.ok(v >= 0 && v <= WORLD.height);
  }
});

test('each glycol pump\'s short pipe runs right to its room\'s header; each water pump drops off the water line', () => {
  const taps = pipeTaps();
  for (const e of EQUIPMENT.filter((x) => x.type === 'pump')) {
    const out = e.plant === 'A' ? 1 : -1;
    if (e.loop === 'glycol') {
      const tip = e.x + out * 40; // the pump drawing's right-hand stub (size 80)
      const stub = runs.find((r) => r.kind === 'stub' && near(r.y1, e.y) && (near(r.x1, tip) || near(r.x2, tip)));
      assert.ok(stub, e.id);
      const header = e.plant === 'A' ? PUMP_ROOM_HEADER_X : WORLD.width - PUMP_ROOM_HEADER_X;
      assert.ok(near(stub.x1, header) || near(stub.x2, header), `${e.id} reaches the header`);
      assert.ok(runs.some((r) => r.kind === 'room' && near(r.x1, header) && e.y > r.y1 && e.y < r.y2), `${e.id} header runs past it`);
      const end = pieces.find((p) => p.kind === 'stub' && near(p.y1, e.y) && (near(p.x1, tip) || near(p.x2, tip)));
      assert.equal(near(end.x1, tip) ? end.h1 : end.h2, 0, `${e.id} meets its pump at floor level`);
    } else {
      const t = taps.find((q) => q.id === e.id);
      assert.ok(t && near(t.x, e.x + out * PUMP_DISCHARGE_X) && near(t.y, WATER_Y[e.half]), e.id);
      assert.ok(touches(t.x, t.y), e.id);
    }
  }
});

test('every chiller takes glycol into its top half and water into its bottom half; every CDU has a glycol tap', () => {
  for (const e of EQUIPMENT.filter((x) => x.type === 'chiller')) {
    const edges = [e.x - 52, e.x + 52];
    for (const [loop, dy] of [['glycol', -14], ['water', 14]]) {
      const p = pieces.find((q) => q.kind === 'branch' && near(q.y1, e.y + dy) && edges.some((x) => near(q.x1, x) || near(q.x2, x)));
      assert.ok(p, `${e.id} ${loop}`);
      assert.ok(p.h1 === 0 || p.h2 === 0, `${e.id} ${loop} branch reaches the floor`);
    }
    // The headers stay on the column's outer side (owner, 16 Nov): the middle aisle is open.
    const ownBranches = runs.filter((r) => r.kind === 'branch' && (near(r.y1, e.y - 14) || near(r.y1, e.y + 14)) && (near(r.x1, e.x + 52) || near(r.x2, e.x - 52)));
    for (const r of ownBranches) {
      const riserX = near(r.x1, e.x + 52) ? r.x2 : r.x1;
      assert.ok(Math.abs(riserX - PLANTS[e.plant].lane) > Math.abs(e.x - PLANTS[e.plant].lane), `${e.id}: risers outside the column`);
    }
  }
  const taps = pipeTaps();
  for (const e of EQUIPMENT.filter((x) => x.type === 'cdu')) {
    const t = taps.find((q) => q.id === e.id);
    assert.ok(t && near(t.x, e.x) && near(t.y, HEADER_Y[e.half]), e.id);
    assert.ok(touches(t.x, t.y), e.id);
    // The water dives into the hall's wall either side of the CDU, meeting it at floor level.
    const hall = HALLS[e.hall];
    const wallY = e.half === 't' ? hall.y : hall.y + hall.h;
    for (const k of [-1, 1]) {
      const dive = pieces.find((q) => q.kind === 'dive' && near(q.x1, e.x + k * FLOOR_DIVE) && (near(q.y1, wallY) || near(q.y2, wallY)));
      assert.ok(dive, `${e.id} water ${k}`);
      assert.equal(near(dive.y1, wallY) ? dive.h1 : dive.h2, 0);
    }
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
  assert.ok(crossing(PLANTS.A.lane, WATER_Y.t)); // the water line too
  assert.ok(pieces.some((p) => p.overWalk && p.kind === 'main' && nearPiece(p, PUMP_LANE_X, p.y1, 1))); // a pump room's main over the pump lane
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
  assert.deepEqual(onlineSpan(6, true), { x1: BUILDING.x1, x2: BUILDING.x2 });
});
