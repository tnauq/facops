import test from 'node:test';
import assert from 'node:assert/strict';
import { DRAG_PX, endGesture, moveGesture, startGesture } from '../src/ui/drag.js';
import { hallsFromHash, plantBOnline, sampleAlarms, sampleStatus } from '../src/ui/preview.js';
import { EQUIPMENT_BY_ID } from '../src/core/layout2.js';

// ---- Tap versus drag ----

test('a touch that barely moves is a tap at its starting point', () => {
  let g = startGesture({ x: 100, y: 100 });
  const r = moveGesture(g, { x: 100 + DRAG_PX - 1, y: 100 });
  assert.equal(r.pan, null);
  g = r.gesture;
  assert.deepEqual(endGesture(g), { x: 100, y: 100 });
});

test('a touch that moves more than 8 px is a drag: it pans and is not a tap', () => {
  let g = startGesture({ x: 100, y: 100 });
  let r = moveGesture(g, { x: 112, y: 95 });
  assert.deepEqual(r.pan, { dx: 12, dy: -5 }); // the whole distance so far
  g = r.gesture;
  r = moveGesture(g, { x: 130, y: 95 });
  assert.deepEqual(r.pan, { dx: 18, dy: 0 }); // then only the new movement
  assert.equal(endGesture(r.gesture), null);
});

test('once a drag, always a drag, even back at the start', () => {
  let g = startGesture({ x: 0, y: 0 });
  g = moveGesture(g, { x: 20, y: 0 }).gesture;
  const r = moveGesture(g, { x: 0, y: 0 });
  assert.deepEqual(r.pan, { dx: -20, dy: 0 });
  assert.equal(endGesture(r.gesture), null);
});

// ---- Preview switches ----

test('#halls=N picks how many halls are online; anything else is 1', () => {
  assert.equal(hallsFromHash('#halls=5'), 5);
  assert.equal(hallsFromHash('#halls=8'), 8);
  assert.equal(hallsFromHash(''), 1);
  assert.equal(hallsFromHash('#halls=0'), 1);
  assert.equal(hallsFromHash('#halls=12'), 1);
  assert.equal(hallsFromHash('#auto'), 1);
});

test('Plant B comes online with hall 6', () => {
  assert.equal(plantBOnline(5), false);
  assert.equal(plantBOnline(6), true);
});

test('sample alarms sit only on online equipment', () => {
  for (let halls = 1; halls <= 8; halls++) {
    for (const a of sampleAlarms(halls)) {
      const e = EQUIPMENT_BY_ID[a.equipId];
      if (e.hall) assert.ok(e.hall <= halls, `${a.equipId} with ${halls} halls`);
      else assert.ok(e.plant === 'A' || halls >= 6);
      assert.ok(a.info.clockFraction > 0 && a.info.clockFraction < 1);
    }
  }
  assert.ok(sampleAlarms(1).length >= 3);
  assert.equal(sampleAlarms(8).length, 12);
});

test('sample alarms show on their icons', () => {
  const status = sampleStatus(sampleAlarms(8));
  assert.deepEqual(status(EQUIPMENT_BY_ID['cdu-1-b']), { leak: 1 });
  assert.deepEqual(status(EQUIPMENT_BY_ID['msb-2-t-A']), { tripped: true });
  assert.deepEqual(status(EQUIPMENT_BY_ID['chiller-A-0']), {});
});
