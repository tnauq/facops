// The screen opens up (pass 10 spec 4, M61): in a first run, parts of the screen appear when they
// first matter; in every other run everything shows from the start.
import test from 'node:test';
import assert from 'node:assert/strict';
import { EQUIPMENT_BY_ID, WORLD, createGame, buyPrice } from '../src/core/index2.js';
import { createFirsts, firstsFromSave, firstsToSave } from '../src/ui/firsts.js';
import { HIRE_AFTER, PULSE_MS, livePulses, openingModel, updateOpening } from '../src/ui/opening.js';
import { spotTargets, spotsModel } from '../src/ui/spots.js';
import { advisorSpot } from '../src/ui/advisor.js';
import { createCamera } from '../src/ui/camera.js';

const game = () => createGame({ seed: 1, config: { tutorial: true, director: { enabled: false }, ceo: { enabled: false }, building: { enabled: true } } });
const start = () => {
  const s = game();
  const f = createFirsts();
  s.t = 0.1;
  updateOpening(f, s);
  return { s, f };
};
const later = (s, f, t) => {
  s.t = t;
  return updateOpening(f, s);
};
const built = (s, id) => {
  s.equip[id].built = true;
};

test('a later run (no firsts) shows everything from the start', () => {
  const m = openingModel(null);
  for (const part of ['strip', 'layers', 'flag', 'hire', 'sellEarly']) assert.equal(m[part], true, part);
  assert.equal(m.spot('row-8-b-2'), true);
  assert.equal(m.spot('chiller-B-0'), true);
  assert.deepEqual(updateOpening(null, game()), []);
});

test("a first run's opening screen: Hall 1, Hall 2 (Hall 1 starts with racks) and Plant A, nothing else", () => {
  const { s, f } = start();
  const m = openingModel(f);
  for (const part of ['strip', 'layers', 'flag', 'hire', 'sellEarly']) assert.equal(m[part], false, part);
  assert.equal(m.spot('row-1-b-0'), true);
  assert.equal(m.spot('rmu-1-b'), true, "Hall 1's yard");
  assert.equal(m.spot('cdu-2-t'), true, 'the next hall');
  assert.equal(m.spot('xfmr-2-t-B'), true, "the next hall's yard");
  assert.equal(m.spot('row-3-t-0'), false);
  assert.equal(m.spot('rmu-3-t'), false, "Hall 3's yard waits with Hall 3");
  assert.equal(m.spot('chiller-A-3'), true);
  assert.equal(m.spot('dry-A-5'), true);
  assert.equal(m.spot('chiller-B-0'), false);
  assert.equal(m.spot('dry-B-0'), false);
  assert.equal(s.t < 1, true);
});

test('what is there from the start gets no pulse', () => {
  const s = game();
  s.t = 0.1;
  assert.deepEqual(updateOpening(createFirsts(), s), []);
});

test('each further hall opens once the hall before it has a rack built; Plant B with Hall 5', () => {
  const { s, f } = start();
  assert.deepEqual(later(s, f, 30), []);
  built(s, 'row-2-b-1');
  assert.deepEqual(later(s, f, 31), ['hall-3']);
  assert.equal(openingModel(f).spot('row-3-t-0'), true);
  assert.equal(openingModel(f).spot('row-4-t-0'), false);
  built(s, 'row-3-t-0');
  later(s, f, 32);
  assert.equal(openingModel(f).spot('chiller-B-0'), false, 'Hall 4 open, not yet Hall 5');
  built(s, 'row-4-t-0');
  assert.deepEqual(later(s, f, 33), ['hall-5']);
  assert.equal(openingModel(f).spot('chiller-B-0'), true);
  assert.equal(openingModel(f).spot('gpump-B-2'), true);
  assert.equal(openingModel(f).spot('row-6-t-0'), false);
});

test('the strip with Hall 2 online, Layers with Hall 3, the flag with the fourth tech', () => {
  const { s, f } = start();
  // Four techs before a second hall: the flag waits for the strip it sits on.
  while (s.techs.length < 4) s.techs.push({ ...s.techs[0], id: s.techs.length + 100 });
  assert.deepEqual(later(s, f, 10), []);
  assert.equal(openingModel(f).flag, false);
  s.halls = 2;
  assert.deepEqual(later(s, f, 20), ['strip', 'flag']);
  assert.equal(openingModel(f).layers, false);
  s.halls = 3;
  assert.deepEqual(later(s, f, 40), ['layers']);
  assert.deepEqual(later(s, f, 41), [], 'each part opens once');
});

test('the Hire card: the short-handed card, or the cash covering a hire from 2:00', () => {
  const { s, f } = start();
  s.cash = buyPrice(s, 'hire') + 1000;
  assert.deepEqual(later(s, f, HIRE_AFTER - 1), [], 'not before 2:00, however much cash');
  assert.deepEqual(later(s, f, HIRE_AFTER), ['hire']);

  const two = start();
  two.s.cash = 0;
  assert.deepEqual(later(two.s, two.f, 200), [], 'from 2:00 but the cash does not cover it');
  two.f.seen.add('shortHanded');
  assert.deepEqual(later(two.s, two.f, 201), ['hire']);
  two.s.cash = 0;
  later(two.s, two.f, 202);
  assert.equal(openingModel(two.f).hire, true, 'once shown it stays');
});

test('Sell early from the Handover', () => {
  const { s, f } = start();
  assert.equal(openingModel(f).sellEarly, false);
  s.handoverQueued = true;
  assert.ok(later(s, f, 300).includes('sellEarly'));
  assert.equal(openingModel(f).sellEarly, true);
});

test('what has opened survives a save', () => {
  const { s, f } = start();
  s.halls = 2;
  later(s, f, 20);
  const back = firstsFromSave(JSON.parse(JSON.stringify(firstsToSave(f))));
  assert.equal(openingModel(back).strip, true);
  assert.equal(openingModel(back).spot('cdu-2-b'), true);
  assert.equal(openingModel(back).spot('cdu-3-b'), false);
});

test("a hidden spot is a ghost: not tappable, and the advisor mark never rings it", () => {
  const { s, f } = start();
  const shown = openingModel(f).spot;
  const model = spotsModel(s, shown);
  assert.equal(model.find((x) => x.id === 'row-3-t-0').state, 'hidden');
  assert.equal(model.find((x) => x.id === 'row-1-t-2').state, 'empty');
  assert.equal(spotsModel(s).find((x) => x.id === 'row-3-t-0').state, 'empty', 'everything shows by default');
  const e = EQUIPMENT_BY_ID['row-3-t-0'];
  const cam = createCamera({ x: 0, y: 0, w: 800, h: 400 }, 1, WORLD, { x: e.x, y: e.y });
  const ids = spotTargets(s, cam, shown).map((r) => r.id);
  assert.equal(ids.includes('row-3-t-0'), false);
  assert.equal(spotTargets(s, cam).some((r) => r.id === 'row-3-t-0'), true);
  assert.equal(advisorSpot(s, { setting: true, shown: () => false }), null);
  assert.notEqual(advisorSpot(s, { setting: true }), null);
});

test('a pulse runs for PULSE_MS', () => {
  assert.deepEqual(livePulses({ strip: 1000 }, 1000 + PULSE_MS / 2), [{ part: 'strip', k: 0.5 }]);
  assert.deepEqual(livePulses({ strip: 1000 }, 1000 + PULSE_MS), []);
  assert.deepEqual(livePulses(undefined, 5), []);
});
