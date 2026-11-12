import test from 'node:test';
import assert from 'node:assert/strict';
import { fitView } from '../src/render/campus.js';
import { cameraView, centreOn, clampCamera, createCamera, glide, isVisible, panBy, passOneScale, visibleSize } from '../src/ui/camera.js';
import { MARKER_RADIUS, markerAt, offMapMarkers } from '../src/ui/offmap.js';
import { regions } from '../src/ui/regions.js';
import { WORLD } from '../src/core/layout2.js';

const SIZES = [
  [844, 390],
  [750, 340],
  [660, 300],
];

// ---- Zoom ----

for (const [W, H] of SIZES) {
  test(`at ${W} x ${H} the zoom is exactly pass 1's`, () => {
    const map = regions(W, H).map;
    assert.equal(passOneScale(map), fitView(map).scale);
  });
}

test('at 844 x 390 the view shows about a quarter of the width and two thirds of the height', () => {
  const map = regions(844, 390).map;
  const v = visibleSize(createCamera(map, passOneScale(map), WORLD));
  assert.ok(v.w / WORLD.width > 0.2 && v.w / WORLD.width < 0.3, `${v.w / WORLD.width}`);
  assert.ok(v.h / WORLD.height > 0.6 && v.h / WORLD.height < 0.75, `${v.h / WORLD.height}`);
});

// ---- Panning ----

const cam0 = () => createCamera({ x: 80, y: 36, w: 656, h: 350 }, 0.5, WORLD);

test('dragging moves the map with the finger', () => {
  const c = centreOn(cam0(), 2000, 390);
  const moved = panBy(c, 100, 0); // finger moves right: we look further left
  assert.equal(moved.x, c.x - 200);
  assert.equal(moved.y, c.y);
  const down = panBy(c, 0, -10); // finger moves up: we look further down
  assert.equal(down.y, c.y + 20);
});

test('the view stops at the building edges', () => {
  const v = visibleSize(cam0());
  const farLeft = panBy(cam0(), 1e6, 1e6);
  assert.equal(farLeft.x, 0);
  assert.equal(farLeft.y, 0);
  const farRight = panBy(cam0(), -1e6, -1e6);
  assert.equal(farRight.x, WORLD.width - v.w);
  assert.equal(farRight.y, WORLD.height - v.h);
});

test('a building smaller than the view is centred instead', () => {
  const c = clampCamera(createCamera({ x: 0, y: 0, w: 1000, h: 1000 }, 1, { width: 400, height: 200 }));
  assert.equal(c.x, -300);
  assert.equal(c.y, -400);
});

test('centring on a point puts it in the middle of the map, as edges allow', () => {
  const c = centreOn(cam0(), 2000, 390);
  const view = cameraView(c);
  const sx = view.ox + 2000 * view.scale;
  const sy = view.oy + 390 * view.scale;
  assert.ok(Math.abs(sx - (80 + 656 / 2)) < 1e-9);
  assert.ok(Math.abs(sy - (36 + 350 / 2)) < 1e-9);
  // Near a corner the edge wins.
  const corner = centreOn(cam0(), 0, 0);
  assert.deepEqual([corner.x, corner.y], [0, 0]);
});

test('cameraView matches the drawing code: world to screen and back', () => {
  const c = centreOn(cam0(), 3000, 200);
  const v = cameraView(c);
  assert.ok(isVisible(c, 3000, 200));
  assert.ok(!isVisible(c, 100, 200));
  assert.equal(v.ox + c.x * v.scale, c.rect.x);
});

test('a glide eases from one camera to the other', () => {
  const a = centreOn(cam0(), 1000, 390);
  const b = centreOn(cam0(), 3000, 390);
  assert.equal(glide(a, b, 0).x, a.x);
  assert.equal(glide(a, b, 1).x, b.x);
  const half = glide(a, b, 0.5).x;
  assert.ok(half > (a.x + b.x) / 2 && half < b.x, 'eases out: past halfway at half time');
});

// ---- Off-map indicators ----

test('alarms on screen get no indicator', () => {
  const c = centreOn(cam0(), 2000, 390);
  assert.deepEqual(offMapMarkers([{ id: 1, x: 2000, y: 390, type: 'leak' }], c), []);
});

test('an alarm off to the right gets an arrow on the right edge, pointing right', () => {
  const c = centreOn(cam0(), 2000, 390);
  const [m] = offMapMarkers([{ id: 7, x: 3500, y: 390, type: 'pump' }], c);
  const r = c.rect;
  assert.ok(Math.abs(m.x - (r.x + r.w - MARKER_RADIUS - 2)) < 1e-6);
  assert.ok(Math.abs(m.y - (r.y + r.h / 2)) < 1e-6);
  assert.ok(Math.abs(m.angle) < 1e-9);
  assert.deepEqual(m.ids, [7]);
  assert.equal(m.type, 'pump');
  assert.deepEqual(m.target, { x: 3500, y: 390 });
});

test('arrows sit on the line from the view centre toward the alarm, inside the map', () => {
  const c = centreOn(cam0(), 2000, 390);
  const pts = [
    { id: 1, x: 100, y: 50, type: 'network' },
    { id: 2, x: 3800, y: 740, type: 'breaker' },
    { id: 3, x: 2000, y: 0, type: 'chiller' },
  ];
  const r = c.rect;
  for (const m of offMapMarkers(pts, c)) {
    assert.ok(m.x - MARKER_RADIUS >= r.x && m.x + MARKER_RADIUS <= r.x + r.w, 'inside horizontally');
    assert.ok(m.y - MARKER_RADIUS >= r.y && m.y + MARKER_RADIUS <= r.y + r.h, 'inside vertically');
    const v = cameraView(c);
    const tx = v.ox + m.target.x * v.scale;
    const ty = v.oy + m.target.y * v.scale;
    const toward = Math.atan2(ty - (r.y + r.h / 2), tx - (r.x + r.w / 2));
    assert.ok(Math.abs(toward - m.angle) < 1e-9);
  }
});

test('arrows that would overlap merge into one with a count, nearest alarm first', () => {
  const c = centreOn(cam0(), 2000, 390);
  const pts = [
    { id: 'far', x: 3800, y: 400, type: 'leak' },
    { id: 'near', x: 3000, y: 395, type: 'network' },
    { id: 'other', x: 100, y: 390, type: 'pump' },
  ];
  const ms = offMapMarkers(pts, c);
  assert.equal(ms.length, 2);
  const right = ms.find((m) => m.ids.includes('far'));
  assert.equal(right.count, 2);
  assert.deepEqual(right.ids, ['near', 'far']);
  assert.equal(right.type, 'network');
  assert.deepEqual(right.target, { x: 3000, y: 395 });
});

test('a tap within 22 px picks the marker', () => {
  const ms = [{ x: 100, y: 100, ids: [1] }, { x: 140, y: 100, ids: [2] }];
  assert.deepEqual(markerAt(ms, { x: 105, y: 100 }).ids, [1]);
  assert.deepEqual(markerAt(ms, { x: 135, y: 100 }).ids, [2]);
  assert.equal(markerAt(ms, { x: 100, y: 130 }), null);
});
