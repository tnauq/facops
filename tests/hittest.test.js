import test from 'node:test';
import assert from 'node:assert/strict';
import { HIT_RADIUS, hitTest } from '../src/ui/hittest.js';

const at = (x, y) => ({ x, y });

test('empty space hits nothing', () => {
  assert.deepEqual(hitTest(at(5, 5), { bubbles: [{ id: 1, x: 100, y: 100 }] }), { kind: 'empty', id: null });
});

test('a bubble is hit within 22 px of its center and not beyond', () => {
  const t = { bubbles: [{ id: 7, x: 100, y: 100 }] };
  assert.deepEqual(hitTest(at(100 + HIT_RADIUS, 100), t), { kind: 'alarm', id: 7 });
  assert.deepEqual(hitTest(at(115, 115), t), { kind: 'alarm', id: 7 }); // 21.2 px away
  assert.equal(hitTest(at(100 + HIT_RADIUS + 0.5, 100), t).kind, 'empty');
});

test('when two bubbles are in reach, the nearest center wins', () => {
  const t = { bubbles: [{ id: 1, x: 100, y: 100 }, { id: 2, x: 120, y: 100 }] };
  assert.equal(hitTest(at(108, 100), t).id, 1);
  assert.equal(hitTest(at(112, 100), t).id, 2);
});

test('the same goes for techs', () => {
  const t = { techs: [{ id: 'tech-0', x: 50, y: 50 }, { id: 'tech-1', x: 50, y: 60 }] };
  assert.deepEqual(hitTest(at(50, 58), t), { kind: 'tech', id: 'tech-1' });
});

test('a bubble beats a tech standing under it', () => {
  const t = { bubbles: [{ id: 3, x: 100, y: 94 }], techs: [{ id: 'tech-2', x: 100, y: 100 }] };
  assert.deepEqual(hitTest(at(100, 100), t), { kind: 'alarm', id: 3 });
});

test('order: HUD buttons, crew cards, tickets, bubbles, techs', () => {
  const box = { x: 0, y: 0, w: 50, h: 50 };
  const all = {
    buttons: [{ id: 'pause', ...box }],
    cards: [{ id: 'tech-0', ...box }],
    tickets: [{ id: 9, ...box }],
    bubbles: [{ id: 8, x: 10, y: 10 }],
    techs: [{ id: 'tech-1', x: 10, y: 10 }],
  };
  assert.deepEqual(hitTest(at(10, 10), all), { kind: 'button', id: 'pause' });
  assert.deepEqual(hitTest(at(10, 10), { ...all, buttons: [] }), { kind: 'tech', id: 'tech-0' });
  assert.deepEqual(hitTest(at(10, 10), { ...all, buttons: [], cards: [] }), { kind: 'alarm', id: 9 });
  assert.deepEqual(hitTest(at(10, 10), { bubbles: all.bubbles, techs: all.techs }), { kind: 'alarm', id: 8 });
  assert.deepEqual(hitTest(at(10, 10), { techs: all.techs }), { kind: 'tech', id: 'tech-1' });
});

test('rectangles include their top-left edge and exclude the far edge', () => {
  const t = { tickets: [{ id: 4, x: 10, y: 10, w: 96, h: 44 }] };
  assert.equal(hitTest(at(10, 10), t).id, 4);
  assert.equal(hitTest(at(105.9, 53.9), t).id, 4);
  assert.equal(hitTest(at(106, 30), t).kind, 'empty');
});
