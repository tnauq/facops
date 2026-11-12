// The pass 2 map (spec docs/pass2-spec.md, section 3).
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CENTRE_X,
  DOORS,
  EQUIPMENT,
  EQUIPMENT_BY_ID,
  HALLS,
  HALL_BOTTOM,
  HALL_TOP,
  LANES,
  MID_Y,
  PLANTS,
  START_POINT,
  WORLD,
  isOnNetwork,
  locationTag,
  route,
} from '../src/core/layout2.js';

const count = (type) => EQUIPMENT.filter((e) => e.type === type).length;
const near = (a, b) => Math.abs(a - b) < 1e-6;

test('counts: 8 halls, 48 rows, 32 MSBs, 16 CDUs, 16 chillers, 4 pumps', () => {
  assert.equal(Object.keys(HALLS).length, 8);
  assert.equal(count('row'), 48);
  assert.equal(count('msb'), 32);
  assert.equal(count('cdu'), 16);
  assert.equal(count('chiller'), 16);
  assert.equal(count('pump'), 4);
  assert.equal(new Set(EQUIPMENT.map((e) => e.id)).size, EQUIPMENT.length, 'ids are unique');
});

test('the left half matches the spec table: the campus grows left to right', () => {
  assert.deepEqual([1, 2, 3, 4].map((id) => [HALLS[id].x, HALLS[id].x + HALLS[id].w]), [[480, 800], [800, 1120], [1240, 1560], [1560, 1880]]);
  for (let id = 2; id <= 8; id++) assert.ok(HALLS[id].x > HALLS[id - 1].x, `hall ${id} is right of hall ${id - 1}`);
  for (const h of Object.values(HALLS)) {
    assert.equal(h.y, HALL_TOP);
    assert.equal(h.y + h.h, HALL_BOTTOM);
  }
  assert.deepEqual(EQUIPMENT_BY_ID['pump-A-t'], { ...EQUIPMENT_BY_ID['pump-A-t'], x: 50, y: 40, sx: 50, sy: 95 });
  assert.deepEqual([EQUIPMENT_BY_ID['chiller-A-0'].x, EQUIPMENT_BY_ID['chiller-A-0'].y], [370, 225]);
  assert.deepEqual([EQUIPMENT_BY_ID['chiller-A-7'].x, EQUIPMENT_BY_ID['chiller-A-7'].y], [150, 555]);
  assert.deepEqual(START_POINT, { x: 260, y: 390 });
  assert.ok(PLANTS.A.x < PLANTS.B.x, 'Plant A is on the left');
});

test('hall pairs share a wall: 1 and 2, 3 and 4, 5 and 6, 7 and 8', () => {
  for (const [a, b] of [[1, 2], [3, 4], [5, 6], [7, 8]]) {
    assert.equal(HALLS[a].shared, HALLS[b].shared);
    const touching = HALLS[a].x === HALLS[b].x + HALLS[b].w || HALLS[b].x === HALLS[a].x + HALLS[a].w;
    assert.ok(touching, `halls ${a} and ${b} touch`);
  }
});

test('the right half mirrors the left across the centre line', () => {
  for (const [l, r] of [[5, 4], [6, 3], [7, 2], [8, 1]]) {
    assert.equal(HALLS[l].x, WORLD.width - (HALLS[r].x + HALLS[r].w));
  }
  for (const e of EQUIPMENT.filter((q) => q.x < CENTRE_X)) {
    const twinId = e.id
      .replace(/^(row|cdu|msb)-(\d)/, (m, t, h) => `${t}-${{ 1: 8, 2: 7, 3: 6, 4: 5 }[h]}`)
      .replace(/^(chiller|pump)-A/, '$1-B');
    const twin = EQUIPMENT_BY_ID[twinId];
    assert.ok(twin, `${e.id} has a mirror twin ${twinId}`);
    assert.ok(near(twin.x, WORLD.width - e.x), `${e.id} x`);
    assert.ok(near(twin.y, e.y), `${e.id} y`);
  }
});

test('the top half mirrors the bottom about the middle aisle', () => {
  for (const e of EQUIPMENT.filter((q) => q.half === 't')) {
    const twin = EQUIPMENT_BY_ID[e.id.replace('-t', '-b')];
    assert.ok(near(twin.x, e.x));
    assert.ok(near(twin.y, WORLD.height - e.y), `${e.id}`);
  }
  assert.equal(MID_Y, WORLD.height / 2);
});

test('each hall has 6 rows, two MSB pairs and a CDU pair', () => {
  for (const id of Object.keys(HALLS)) {
    const mine = EQUIPMENT.filter((e) => e.hall === Number(id));
    assert.equal(mine.filter((e) => e.type === 'row').length, 6);
    assert.deepEqual(mine.filter((e) => e.type === 'msb').map((e) => e.half + e.side).sort(), ['bA', 'bB', 'tA', 'tB']);
    assert.deepEqual(mine.filter((e) => e.type === 'cdu').map((e) => e.half).sort(), ['b', 't']);
  }
});

test('rows sit inside their hall, MSBs and CDUs outside it', () => {
  for (const e of EQUIPMENT) {
    if (!e.hall) continue;
    const h = HALLS[e.hall];
    const inside = e.x > h.x && e.x < h.x + h.w && e.y > h.y && e.y < h.y + h.h;
    assert.equal(inside, e.type === 'row', e.id);
  }
});

test('every service point is on a lane and reachable from the start', () => {
  for (const e of EQUIPMENT) {
    const p = { x: e.sx, y: e.sy };
    assert.ok(isOnNetwork(p), `${e.id} service point is off the lanes`);
    const r = route(START_POINT, p);
    assert.ok(r.length > 0);
  }
});

test('every hop of a route is horizontal or vertical and on a lane', () => {
  const far = EQUIPMENT_BY_ID['row-8-b-2'];
  const r = route(START_POINT, { x: far.sx, y: far.sy });
  for (let i = 1; i < r.points.length; i++) {
    const a = r.points[i - 1];
    const b = r.points[i];
    assert.ok(a.x === b.x || a.y === b.y);
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    assert.ok(isOnNetwork(mid), `hop ${i} leaves the lanes`);
  }
});

// A hop crosses a hall wall only at a door.
function crossings(points) {
  const out = [];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    for (const h of Object.values(HALLS)) {
      for (const wy of [h.y, h.y + h.h]) {
        if (a.x === b.x && a.x > h.x && a.x < h.x + h.w && Math.min(a.y, b.y) < wy && Math.max(a.y, b.y) > wy) out.push({ x: a.x, y: wy });
      }
      for (const wx of [h.x, h.x + h.w]) {
        if (a.y === b.y && a.y > h.y && a.y < h.y + h.h && Math.min(a.x, b.x) < wx && Math.max(a.x, b.x) > wx) out.push({ x: wx, y: a.y });
      }
    }
  }
  return out;
}

test('techs pass through walls only at doors', () => {
  const targets = EQUIPMENT.filter((e, i) => i % 7 === 0);
  for (const from of [START_POINT, { x: CENTRE_X, y: MID_Y }]) {
    for (const e of targets) {
      for (const c of crossings(route(from, { x: e.sx, y: e.sy }).points)) {
        assert.ok(DOORS.some((d) => near(d.x, c.x) && near(d.y, c.y)), `wall crossed at (${c.x}, ${c.y}) on the way to ${e.id}`);
      }
    }
  }
});

test('the shared-wall doors make the pair partner close', () => {
  const a = EQUIPMENT_BY_ID['row-1-t-0'];
  const b = EQUIPMENT_BY_ID['row-2-t-0'];
  const r = route({ x: a.sx, y: a.sy }, { x: b.sx, y: b.sy });
  // Through the middle aisle, the inner aisle and a shared door: 420. Round by the corridor it is about 1570.
  assert.equal(r.length, 420);
});

test('walks are long on purpose: Plant A to hall 8 is over 3000 units', () => {
  const far = EQUIPMENT_BY_ID['cdu-8-t'];
  assert.ok(route(START_POINT, { x: far.sx, y: far.sy }).length > 3000);
});

test('plants and lanes stay inside the building', () => {
  for (const p of Object.values(PLANTS)) assert.ok(p.x >= 0 && p.x + p.w <= WORLD.width);
  for (const l of LANES) {
    for (const v of [l.x1, l.x2]) assert.ok(v >= 0 && v <= WORLD.width);
    for (const v of [l.y1, l.y2]) assert.ok(v >= 0 && v <= WORLD.height);
  }
});

test('location tags', () => {
  assert.equal(locationTag('row-3-t-1'), 'H3 top');
  assert.equal(locationTag('cdu-6-b'), 'H6 bottom');
  assert.equal(locationTag('msb-2-t-A'), 'H2 top A');
  assert.equal(locationTag('chiller-B-4'), 'Plant B');
  assert.equal(locationTag('pump-A-b'), 'Plant A');
});
