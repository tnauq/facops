import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../src/core/index.js';
import { fitView } from '../src/render/campus.js';
import { FAN_PX, fannedCrew } from '../src/ui/crew.js';
import { hitTest } from '../src/ui/hittest.js';
import { mapTargets } from '../src/ui/targets.js';

test('techs on the same spot are spread FAN_PX apart, centered, in crew order', () => {
  const techs = createGame().techs; // all three start at one point
  const f = fannedCrew(techs, 0.5);
  const step = FAN_PX / 0.5;
  assert.deepEqual(f.map((t) => t.id), ['tech-0', 'tech-1', 'tech-2']);
  assert.deepEqual(f.map((t) => t.x - techs[0].x), [-step, 0, step]);
  assert.ok(f.every((t) => t.y === techs[0].y));
});

test('a tech alone is drawn where it stands, and the game is not changed', () => {
  const techs = [{ id: 'a', x: 10, y: 10 }, { id: 'b', x: 300, y: 10 }];
  assert.deepEqual(fannedCrew(techs, 1), techs);
  const s = createGame();
  fannedCrew(s.techs, 1);
  assert.ok(s.techs.every((t) => t.x === 270));
});

test('at the start of a round every tech can be tapped, at both phone sizes', () => {
  for (const [w, h] of [[844, 390], [660, 300]]) {
    const view = fitView({ x: 8, y: 36, w: w - 16, h: h - 40 });
    const t = mapTargets(createGame(), view);
    for (const tech of t.techs) assert.equal(hitTest(tech, t).id, tech.id, `${tech.id} at ${w} x ${h}`);
  }
});
