// Bundles (pass 7 spec 4.2, M43): what a hall needs next, as one purchase, with the extras it needs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build, createGame, priceOf, spotState, step } from '../src/core/index2.js';
import { anyHallAffordable, bundleCard, bundlesFor, buyBundle, piecesText } from '../src/ui/bundles.js';

const NO_BURN = { loan: 0, loanRate: 0, base: 0, doubling: 0, upkeep: 0, wages: 0 };
const game = (cash = 100000, building = {}) => createGame({
  seed: 1,
  config: { tutorial: false, autoDispatch: { enabled: false }, director: { enabled: false }, ceo: { enabled: false }, building: { enabled: true, startCash: cash, burn: NO_BURN, ...building } },
});
const advance = (s, seconds) => { for (let i = 0; i < Math.round(seconds / 0.05); i++) step(s, 0.05); };
const keys = (s, h) => bundlesFor(s, h).map((b) => b.key);
const of = (s, h, key) => bundlesFor(s, h).find((b) => b.key === key);
const sum = (s, ids) => ids.reduce((t, id) => t + priceOf(s, id), 0);

test('at the start: Hall 1 offers its other half, racks and backups; Hall 2 offers to come online', () => {
  const s = game();
  assert.deepEqual(keys(s, 1), ['half-b', 'racks', 'backup-t', 'coolant']);
  const half = of(s, 1, 'half-b');
  assert.deepEqual(half.ids, ['rmu-1-b', 'xfmr-1-b-A', 'msb-1-b-A']);
  assert.equal(half.price, 325);
  assert.equal(piecesText(s, half), 'RMU, transformer, switchboard');
  assert.deepEqual(of(s, 1, 'racks').ids, ['row-1-t-2']);
  assert.deepEqual(of(s, 1, 'backup-t').ids, ['xfmr-1-t-B', 'msb-1-t-B']);
  assert.equal(of(s, 1, 'backup-t').price, 225);
  assert.deepEqual(of(s, 1, 'coolant').ids, ['cdu-1-b']);
  const online = of(s, 2, 'online');
  assert.deepEqual(online.ids, ['rmu-2-t', 'xfmr-2-t-A', 'msb-2-t-A', 'cdu-2-t']);
  assert.equal(online.price, 575);
  assert.deepEqual(online.extras, []);
  assert.equal(bundleCard(s, 2).title, 'Hall 2');
});

test('bringing a third hall online adds a water pump, with its reason', () => {
  const s = game();
  buyBundle(s, of(s, 2, 'online'));
  advance(s, 9);
  assert.equal(s.halls, 2);
  const b = of(s, 3, 'online');
  assert.equal(b.extras.length, 1);
  assert.match(b.extras[0].id, /^wpump-/);
  assert.match(b.extras[0].reason, /^Water pump: 3 halls need 2$/);
  assert.equal(b.price, 575 + priceOf(s, b.extras[0].id));
});

test('a coolant unit the glycol pumps could not feed brings a glycol pump', () => {
  const s = game();
  // The start's two glycol pumps feed four coolant units: build three more halls' first unit.
  for (const id of ['cdu-2-t', 'cdu-3-t', 'cdu-4-t']) build(s, id);
  const b = of(s, 1, 'coolant');
  assert.equal(b.extras.length, 1);
  assert.match(b.extras[0].id, /^gpump-A-/);
  assert.match(b.extras[0].reason, /^Glycol pump: 5 coolant units need 3$/);
});

test('filling racks adds the chillers the cooling needs, with a dry cooler and glycol pump to run them', () => {
  const s = game();
  buyBundle(s, of(s, 1, 'half-b'));
  advance(s, 9);
  const racks = of(s, 1, 'racks');
  assert.equal(racks.pieces.length, 4, 'the top half\'s last row and the bottom half\'s three');
  assert.equal(racks.title, 'Fill the racks (4)');
  // Six rows need one chiller: the start's one is enough.
  assert.deepEqual(racks.extras, []);
  // A second hall full of racks needs a second chiller, and Plant A's single dry cooler runs two.
  buyBundle(s, racks);
  buyBundle(s, of(s, 2, 'online'));
  advance(s, 9);
  const more = of(s, 2, 'racks');
  assert.ok(more.extras.some((x) => x.id.startsWith('chiller-')), 'a chiller');
  assert.equal(more.price, sum(s, more.ids));
});

test('all or nothing: too little cash buys nothing and says how much more', () => {
  const s = game(400);
  const b = of(s, 2, 'online');
  assert.equal(b.canBuy, false);
  assert.equal(b.button, 'Need $175 more');
  const cash = s.cash;
  assert.deepEqual(buyBundle(s, b), { ok: false, reason: 'cash' });
  assert.equal(s.cash, cash);
  assert.equal(spotState(s, 'rmu-2-t'), 'empty');
});

test('buying builds every piece at its own price through the build command', () => {
  const s = game();
  const b = of(s, 2, 'online');
  assert.equal(b.button, 'Buy · $575');
  const cash = s.cash;
  assert.deepEqual(buyBundle(s, b), { ok: true });
  assert.equal(cash - s.cash, 575);
  for (const id of b.ids) assert.equal(spotState(s, id), 'building');
  assert.equal(s.events.filter((e) => e.type === 'buildStart').length, 4);
  advance(s, 9);
  assert.equal(s.halls, 2);
  assert.equal(keys(s, 2).includes('online'), false);
  assert.deepEqual(buyBundle(s, b), { ok: false, reason: 'taken' });
});

test('the introduction waits until a hall can be opened in one go', () => {
  assert.equal(anyHallAffordable(game(400)), false);
  assert.equal(anyHallAffordable(game(600)), true);
});

// The advisor mark (spec 4.2).
test('advisor: rings the builder\'s next empty spot for the first 3:00 of a first run, then only with the switch', async () => {
  const { ADVISOR_SECONDS, advisorSpot } = await import('../src/ui/advisor.js');
  const { nextWanted } = await import('../src/core/builder.js');
  const s = game(5000);
  const id = advisorSpot(s, { firstRun: true });
  assert.equal(id, nextWanted(s, 'builder'));
  assert.equal(spotState(s, id), 'empty');
  assert.equal(advisorSpot(s, { firstRun: false }), null, 'not after a first run');
  assert.equal(advisorSpot(s, { firstRun: true, cardOpen: true }), null, 'hidden while a card is open');
  build(s, id);
  assert.notEqual(advisorSpot(s, { firstRun: true }), id, 'it moves on once that spot is bought');
  advance(s, ADVISOR_SECONDS + 1);
  assert.equal(advisorSpot(s, { firstRun: true }), null, 'gone after 3:00');
  assert.ok(advisorSpot(s, { setting: true }), 'the Settings switch keeps it');
});

test('advisor: hidden during a CEO warning and while the tutorial\'s lessons run', async () => {
  const { advisorSpot } = await import('../src/ui/advisor.js');
  const { setScripted } = await import('../src/core/index2.js');
  const s = game(5000);
  s.ceo = { phase: 'warning', areas: [] };
  assert.equal(advisorSpot(s, { setting: true }), null);
  s.ceo = null;
  setScripted(s, true);
  assert.equal(advisorSpot(s, { setting: true }), null);
  const classic = createGame({ seed: 1, config: { tutorial: false } });
  assert.equal(advisorSpot(classic, { setting: true }), null);
});

test('a hall\'s name is a 44 px tap target, inside the map only', async () => {
  const { hallNameAt, NAME_TAP_H, NAME_TAP_W } = await import('../src/ui/bundles.js');
  const { buildingSite, createCamera, centreOn } = await import('../src/ui/camera.js');
  const { BUILDING, HALLS } = await import('../src/core/index2.js');
  assert.ok(NAME_TAP_H >= 44 && NAME_TAP_W >= 44);
  const site = buildingSite(BUILDING);
  const cam = centreOn(createCamera({ x: 80, y: 30, w: 600, h: 300 }, 0.5, site), HALLS[2].cx, HALLS[2].y + 100);
  const v = { ox: cam.rect.x - cam.x * cam.scale, oy: cam.rect.y - cam.y * cam.scale };
  const at = { x: v.ox + HALLS[2].cx * cam.scale, y: v.oy + (HALLS[2].y + 8) * cam.scale };
  assert.equal(hallNameAt(cam, at), 2);
  assert.equal(hallNameAt(cam, { x: at.x, y: at.y + 40 }), null);
});

test('the bundles introduction: once, when the cash first covers opening a hall', async () => {
  const { createIntros, updateIntros, INTRO_TEXT } = await import('../src/ui/intros.js');
  assert.equal(INTRO_TEXT.bundles, "Tap a hall's name to buy what it needs in one go.");
  const poor = game(300);
  const a = createIntros({ devices: false, bundles: true });
  assert.equal(updateIntros(a, poor), '');
  const s = game(1000);
  const b = createIntros({ devices: false, bundles: true });
  assert.equal(updateIntros(b, s), INTRO_TEXT.bundles);
  s.t += 10;
  assert.equal(updateIntros(b, s), '');
  assert.equal(b.queue.length, 0);
  assert.equal(updateIntros(createIntros({ devices: false }), s), '', 'off unless the screen asks for it');
});
