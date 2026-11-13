// The CEO on screen: banner words, lines, assistant, sighting effects (pass 3 spec 4.7, 4.8).
import test from 'node:test';
import assert from 'node:assert/strict';
import { choose, createGame, raiseAlarm, step } from '../src/core/index2.js';
import { createFeel2 } from '../src/ui/feel2.js';
import { LINES, areasLeft, assistantAt, bannerModel, ceoEvents, createCeoView, liveSay, liveShakes, pickLine, sightingLine, trackCeo } from '../src/ui/ceoView.js';

const quiet = (config = {}) => createGame({ seed: 1, config: { tutorial: false, ...config, director: { enabled: false } } });
function deliverNow(s) {
  s.build = s.config.build.every;
  step(s, 0.05);
  if (s.pendingPick) choose(s, 0);
}
function run(s, done, view, feel, limit = 300) {
  const end = s.t + limit;
  while (!done(s) && s.t < end && !s.over) {
    step(s, 0.05);
    if (view) {
      ceoEvents(view, s.events.splice(0), s, feel);
      trackCeo(view, s);
    }
  }
}

test('every line is original text, short enough for a speech bubble, and chosen the same way each time', () => {
  for (const list of Object.values(LINES)) for (const line of list) assert.ok(line.length <= 52, line);
  assert.equal(pickLine(LINES.fire, 7), pickLine(LINES.fire, 7));
  assert.ok([...LINES.leak, ...LINES.any].includes(sightingLine('leak', 3)));
});

test('the banner: warning, visit, zero tolerance, and one line on a narrow map', () => {
  const s = quiet({ startHalls: 2 });
  deliverNow(s);
  step(s, 0.05);
  assert.deepEqual(bannerModel(s).lines, ['The CEO is coming · Hall 3 · 0:20', 'Each unattended alarm seen: −15']);
  assert.deepEqual(bannerModel(s, true).lines, ['CEO · H3 · 0:20 · −15']);
  run(s, (g) => g.ceo && g.ceo.phase === 'visit');
  assert.equal(bannerModel(s).lines[0], 'The CEO is here · Hall 3 left');
  s.ceo.zeroTolerance = true;
  assert.deepEqual(bannerModel(s).lines, ['Zero tolerance · Hall 3 left', 'Any unattended alarm seen ends the run']);
  assert.equal(bannerModel(s, true).lines[0], 'CEO · H3 · zero tolerance');
  run(s, (g) => g.ceo === null);
  assert.equal(bannerModel(s), null);
});

test('the Handover is "every hall"; the visit before zero tolerance says so', () => {
  const s = quiet({ startHalls: 8 });
  run(s, (g) => g.ceo !== null);
  assert.equal(bannerModel(s).lines[0], 'The CEO is coming · every hall · 0:20');
  s.ceo.nextIsZeroTolerance = true;
  assert.match(bannerModel(s).lines[1], /Next visit: zero tolerance$/);
});

test('areas left count down as the CEO inspects them', () => {
  const s = quiet({ startHalls: 8 });
  run(s, (g) => g.ceo !== null);
  assert.equal(areasLeft(s.ceo).length, 8);
  run(s, (g) => g.ceo && g.ceo.phase === 'visit' && areasLeft(g.ceo).length === 5);
  assert.deepEqual(areasLeft(s.ceo), ['h4', 'h5', 'h6', 'h7', 'h8']);
});

test('the CEO speaks on arriving, on a sighting and on leaving; a sighting floats its cost, flashes and shakes', () => {
  const s = quiet({ startHalls: 2 });
  const view = createCeoView();
  const feel = createFeel2();
  deliverNow(s);
  run(s, (g) => g.ceo && g.ceo.phase === 'visit', view, feel);
  assert.ok(LINES.ribbon.includes(liveSay(view, s.t)));
  run(s, (g) => g.ceo.steps[g.ceo.step].kind === 'inspect', view, feel);
  const a = raiseAlarm(s, 'leak', 'cdu-3-t');
  run(s, (g) => g.stats.ceoSightings > 0, view, feel);
  assert.equal(liveSay(view, s.t), sightingLine('leak', a.id));
  assert.ok(feel.floats.some((f) => f.text === '−15 Stability'));
  assert.ok(feel.flashUntil > s.t);
  assert.ok(liveShakes(view, s.t)[a.id] > 0);
  run(s, (g) => g.ceo === null, view, feel);
  assert.ok(LINES.leaveBad.includes(liveSay(view, s.t)));
  assert.equal(liveSay(view, s.t + 5), null);
});

test('the assistant follows a step behind along the CEO\'s path', () => {
  const trail = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 50 }];
  assert.deepEqual(assistantAt(trail, 30), { x: 100, y: 20 });
  assert.deepEqual(assistantAt(trail, 80), { x: 70, y: 0 });
  assert.deepEqual(assistantAt(trail, 500), { x: 0, y: 0 });
  assert.equal(assistantAt([]), null);
});
