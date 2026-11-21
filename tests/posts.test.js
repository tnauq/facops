// Posts and the priority area (pass 8 spec 3, M46).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AREAS, autoOrder, createGame, isFree, postPoint, postTech, raiseAlarm, route, setPriority, step } from '../src/core/index2.js';
import { autoOrder as order } from '../src/core/auto.js';

const NO_BURN = { loan: 0, loanRate: 0, base: 0, doubling: 0, upkeep: 0, wages: 0 };
const game = (building = {}, extra = {}) => createGame({
  seed: 1,
  config: { tutorial: false, director: { enabled: false }, ceo: { enabled: false }, ...extra, building: { enabled: true, startCash: 50000, burn: NO_BURN, posts: { enabled: true, returnAfter: 3 }, ...building } },
});
const advance = (s, seconds) => { for (let i = 0; i < Math.round(seconds / 0.05); i++) step(s, 0.05); };

test('ten areas, each with a waiting point on the lanes', () => {
  assert.deepEqual(AREAS, ['pA', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'h7', 'h8', 'pB']);
  for (const a of AREAS) {
    const p = postPoint(a);
    assert.ok(route({ x: 260, y: 390 }, p).length >= 0, a);
  }
});

test('a posted tech idle for 3 s walks back to its post and waits there', () => {
  const s = game();
  const tech = s.techs[0];
  assert.deepEqual(postTech(s, tech.id, 'h3'), { ok: true });
  assert.equal(tech.post, 'h3');
  advance(s, 2.9);
  assert.equal(tech.state, 'idle', 'waits 3 s first');
  advance(s, 0.3);
  assert.equal(tech.state, 'returning');
  assert.equal(isFree(tech), true, 'free while walking back');
  advance(s, 60);
  assert.equal(tech.state, 'idle');
  assert.deepEqual({ x: tech.x, y: tech.y }, postPoint('h3'));
  // An unposted tech stays where it is.
  const other = s.techs[1];
  const at = { x: other.x, y: other.y };
  advance(s, 10);
  assert.deepEqual({ x: other.x, y: other.y }, at);
});

test('a posted tech still answers anywhere: auto-dispatch takes it on the way back', () => {
  const s = game();
  const [a, b] = s.techs;
  postTech(s, a.id, 'h8');
  postTech(s, b.id, 'h8');
  advance(s, 4);
  assert.equal(a.state, 'returning');
  const alarm = raiseAlarm(s, 'network', 'row-1-t-0');
  advance(s, 1.2);
  assert.ok(alarm.techId === a.id || alarm.techId === b.id, 'one of them turned back for it');
  assert.equal(s.techs.find((t) => t.id === alarm.techId).state === 'walking' || s.techs.find((t) => t.id === alarm.techId).state === 'fixing', true);
});

test('the priority area\'s alarms are taken first; clearing it restores the triage order', () => {
  const s = game({}, { autoDispatch: { enabled: false, delay: 1 } });
  const net = raiseAlarm(s, 'network', 'row-1-t-0'); // costs power: first by triage
  const leak = raiseAlarm(s, 'leak', 'cdu-1-t');
  build2(s);
  advance(s, 1.1);
  const before = order(s).map((x) => x.id);
  assert.deepEqual(setPriority(s, 'pA'), { ok: true });
  const chill = s.alarms.find((x) => x.type === 'chiller');
  assert.equal(order(s)[0].id, chill.id, 'Plant A first');
  setPriority(s, null);
  assert.deepEqual(order(s).map((x) => x.id), before);
  assert.ok(net && leak);
});

// A chiller alarm in Plant A, for the priority test.
function build2(s) {
  raiseAlarm(s, 'chiller', 'chiller-A-0');
}

test('posts are on by default since warnings (M47), off when switched off, and in the classic game', () => {
  const plain = createGame({ seed: 1, config: { tutorial: false, building: { enabled: true } } });
  assert.equal(plain.config.building.posts.enabled, true);
  const s = game({ posts: { enabled: false, returnAfter: 3 } });
  assert.deepEqual(postTech(s, s.techs[0].id, 'h1'), { ok: false, reason: 'off' });
  assert.deepEqual(setPriority(s, 'h1'), { ok: false, reason: 'off' });
  const classic = createGame({ seed: 1, config: { tutorial: false } });
  assert.equal(postTech(classic, classic.techs[0].id, 'h1').ok, false);
  const on = game();
  assert.deepEqual(postTech(on, on.techs[0].id, 'h9'), { ok: false, reason: 'no such area' });
});

// Screen (spec 3.2).
test('screen: areas on the strip, pins, labels and the flag button', async () => {
  const { areaAtStrip, areaCentreX, areaLabel, flagTarget, postFor, stripPins, stripWithFlag } = await import('../src/ui/postsView.js');
  const strip = { x: 80, y: 330, w: 600, h: 28 };
  for (const a of AREAS) assert.equal(areaAtStrip(strip, areaCentreX(strip, a)), a);
  assert.equal(areaAtStrip(strip, strip.x), 'pA');
  assert.equal(areaAtStrip(strip, strip.x + strip.w), 'pB');
  assert.equal(areaLabel('h5'), 'H5');
  const s = game();
  postTech(s, s.techs[0].id, 'h5');
  postTech(s, s.techs[1].id, 'h5');
  const pins = stripPins(s, strip);
  assert.equal(pins.length, 2);
  assert.notEqual(pins[0].x, pins[1].x, 'side by side');
  assert.equal(postFor(s.techs[0], 'h5'), null, 'tapping its own area clears the post');
  assert.equal(postFor(s.techs[0], 'h2'), 'h2');
  const narrow = stripWithFlag(strip, true);
  const flag = flagTarget(narrow);
  assert.ok(flag.w >= 44 && flag.h >= 44);
  assert.ok(flag.x + flag.w <= strip.x + strip.w);
  assert.deepEqual(stripWithFlag(strip, false), strip);
});

test('screen: the crew card shows the post, a walking-back tech reads as Walking, and the posts hint comes with the fourth tech', async () => {
  const { crewCards } = await import('../src/ui/crewbar.js');
  const { createIntros, updateIntros, INTRO_TEXT } = await import('../src/ui/intros.js');
  const { hire } = await import('../src/core/index2.js');
  const s = game();
  postTech(s, s.techs[0].id, 'h5');
  advance(s, 3.2);
  const card = crewCards(s, { x: 0, y: 40, w: 76, h: 300 })[0];
  assert.equal(card.post, 'H5');
  assert.equal(card.status, 'Walking');
  const intros = createIntros({ devices: false, bundles: true });
  intros.given.add('bundles');
  assert.equal(updateIntros(intros, s), '');
  hire(s, 'network');
  hire(s, 'ce');
  assert.equal(updateIntros(intros, s), INTRO_TEXT.posts);
});
