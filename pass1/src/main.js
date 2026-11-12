// FacOps pass 1, complete through milestone 7: the live map, the HUD strip, the crew bar and alarm rail, the
// start, pause and round-over overlays (with full results, Copy and a saved best score), the tuning
// drawer, a rotate screen (pure CSS in index.html), and the feel effects: floating MW losses, a HUD
// flash on entering red, bubbles popping in and hats bobbing. The game pauses when the page is hidden.
// Two-tap mode (the default): tap an alarm (bubble or ticket) then a tech (on the map or its card),
// or the other way round, to send that tech; a busy tech is redirected. One-tap mode (a switch in
// the drawer): tapping an alarm sends the nearest free tech, or queues the alarm if nobody is free;
// a tech then an alarm still sends that tech. Keys 1 to 3 tap the crew cards. Add #auto to watch
// the scripted player.

import { assign, createGame, dispatch, formatClock, results, resultsText, step } from './core/index.js';
import { PAGE_COLOR, fitView } from './render/campus.js';
import { drawMap } from './render/map.js';
import { drawHud, drawHudFlash } from './render/hud.js';
import { drawCrewBar, drawRail } from './render/rails.js';
import { bindOverlays, buildTuningControls, selectResultsText, setCopyLabel, setResults, setTuningControls, showOverlay } from './render/overlays.js';
import { resultsPanel } from './ui/results.js';
import { copyLabel, copyText } from './ui/copy.js';
import { createClock, runFrame } from './ui/loop.js';
import { autoplayStep, createAutoplay } from './ui/autoplay.js';
import { hitTest } from './ui/hittest.js';
import { NOTHING, pruneSelection, reduceTap } from './ui/selection.js';
import { screenTargets } from './ui/targets.js';
import { HUD_HEIGHT, hudLayout, regions } from './ui/regions.js';
import { createFeel, feelEvents, flashAlpha, liveFloats } from './ui/feel.js';
import { crewCards, techForKey } from './ui/crewbar.js';
import { railTickets } from './ui/rail.js';
import { hudModel } from './ui/hud.js';
import { reduceFlow } from './ui/flow.js';
import { bestText, defaultStorage, loadBest, recordBest, saveBest } from './ui/best.js';
import { TUNING_FIELDS, defaultTuning, loadTuning, saveTuning, setTuning, tuningLabel, tuningToConfig } from './ui/tuning.js';

const INK = '#1F3A5F';
const FONT = "system-ui, -apple-system, 'Segoe UI', sans-serif";

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
let size = { w: 0, h: 0 };
let round = null;
let view = null; // where the map sits on screen, set by draw()
let mode = 'start'; // see src/ui/flow.js
let best = loadBest(); // null when there is none or storage is blocked
let tuning = loadTuning(defaultStorage()); // the drawer's values; used when the next round starts
let tuningBack = null; // the card the drawer returns to

const isAuto = () => window.location.hash === '#auto';

function newRound() {
  round = {
    state: createGame({ seed: Date.now() % 1000000000, config: tuningToConfig(tuning) }),
    clock: createClock(),
    auto: isAuto() ? createAutoplay() : null,
    selection: NOTHING,
    feel: createFeel(),
  };
  window.facops = round; // handy in the browser console; the page never reads it back
}

function showStart() {
  showOverlay('start', { best: bestText(best, formatClock) });
}

function act(action) {
  if (action === 'reset') {
    changeTuning(defaultTuning());
    return;
  }
  if (action === 'copy') {
    copyResults();
    return;
  }
  const next = reduceFlow(mode, action, tuningBack);
  if (next.back) tuningBack = next.back;
  if (next.newRound) newRound();
  mode = next.mode;
  if (mode === 'start') showStart();
  else if (mode === 'over') showOverlay('over'); // its contents were filled in when the round ended
  else if (mode === 'tuning') {
    setTuningControls(tuning, tuningLabel);
    showOverlay('tuning');
  } else showOverlay(mode); // 'playing' hides every card
  round.selection = NOTHING;
  draw();
}

// Every change is saved at once; it takes effect when the next round starts.
function changeTuning(values) {
  tuning = values;
  saveTuning(tuning, defaultStorage());
  setTuningControls(tuning, tuningLabel);
}

function roundOver() {
  const r = results(round.state);
  const record = recordBest(best, r);
  best = record.best;
  if (record.isNew) saveBest(best);
  mode = reduceFlow(mode, 'over').mode;
  setResults(resultsPanel(r, record, formatClock));
  showOverlay('over');
}

// Runs inside the button's click handler: Safari only allows clipboard writes during a tap.
function copyResults() {
  copyText(resultsText(round.state), { clipboard: navigator.clipboard, selectFallback: selectResultsText })
    .then((outcome) => setCopyLabel(copyLabel(outcome)));
}

function resize() {
  const dpr = window.devicePixelRatio || 1;
  size = { w: canvas.clientWidth, h: canvas.clientHeight };
  canvas.width = Math.round(size.w * dpr);
  canvas.height = Math.round(size.h * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

const portrait = () => size.h > size.w;

function draw() {
  const { w, h } = size;
  ctx.fillStyle = PAGE_COLOR;
  ctx.fillRect(0, 0, w, h);
  if (portrait()) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = INK;
    ctx.font = `600 18px ${FONT}`;
    ctx.fillText('Turn your phone sideways', w / 2, h / 2);
    return;
  }
  const regs = regions(w, h);
  view = fitView(regs.map);
  const sel = round.selection;
  const alarmId = sel.kind === 'alarm' ? sel.id : null;
  const techId = sel.kind === 'tech' ? sel.id : null;
  drawMap(ctx, view, round.state, { alarmId, techId }, liveFloats(round.feel, round.state.t));
  drawCrewBar(ctx, crewCards(round.state, regs.crew, techId));
  drawRail(ctx, railTickets(round.state, regs.rail, alarmId));
  const note = round.auto ? 'Auto' : round.state.config.oneTap ? 'One-tap' : '';
  drawHud(ctx, w, hudLayout(w), hudModel(round.state), note);
  drawHudFlash(ctx, w, HUD_HEIGHT, flashAlpha(round.feel, round.state.t));
}

function frame(now) {
  const { state, auto } = round;
  // The rules run only while playing, and pause while the page is hidden or held upright.
  const paused = mode !== 'playing' || document.hidden || portrait() || state.over;
  runFrame(round.clock, now, (dt) => {
    step(state, dt);
    if (auto) autoplayStep(auto, state);
  }, paused);
  feelEvents(round.feel, state.events.splice(0), state.config); // drained every frame so the list never grows
  if (state.over && mode === 'playing') roundOver();
  round.selection = pruneSelection(round.selection, state); // a fixed alarm drops out of the selection
  draw();
  requestAnimationFrame(frame);
}

function onTap(event) {
  if (!view || mode !== 'playing' || round.state.over || portrait()) return;
  event.preventDefault();
  const box = canvas.getBoundingClientRect();
  const p = { x: event.clientX - box.left, y: event.clientY - box.top };
  const hit = hitTest(p, screenTargets(round.state, view, regions(size.w, size.h)));
  if (hit.kind === 'button') {
    act(hit.id === 'settings' ? 'tuning' : 'pause');
    return;
  }
  applyTap(hit);
}

function applyTap(hit) {
  // The mode belongs to the round: one-tap is switched on in the drawer and applies from the next round.
  const result = reduceTap(round.selection, hit, { oneTap: round.state.config.oneTap });
  round.selection = result.selection;
  if (result.assign) assign(round.state, result.assign.techId, result.assign.alarmId);
  if (result.dispatch !== undefined) dispatch(round.state, result.dispatch);
  draw(); // show the selection at once, even between frames
}

function onKey(event) {
  if (event.repeat) return;
  if (event.code === 'Space') {
    event.preventDefault();
    act('togglePause');
    return;
  }
  // Keys 1 to 3 tap the crew cards (spec 7.4), only while playing.
  const hit = techForKey(round.state, event.key);
  if (hit && mode === 'playing' && !round.state.over && !portrait()) applyTap(hit);
}

function begin() {
  newRound();
  // With #auto the scripted player starts at once; otherwise the start card comes first.
  mode = isAuto() ? 'playing' : 'start';
  if (mode === 'start') showStart();
  else showOverlay('playing');
}

bindOverlays(act);
buildTuningControls(TUNING_FIELDS, (id, raw) => changeTuning(setTuning(tuning, id, raw)));
canvas.addEventListener('pointerdown', onTap);
window.addEventListener('keydown', onKey);
window.addEventListener('resize', () => { resize(); draw(); });
window.addEventListener('hashchange', begin);
// Leaving the page (switching apps, locking the phone) pauses the round and shows the pause card,
// so coming back never drops the player straight into the action.
document.addEventListener('visibilitychange', () => {
  if (document.hidden && mode === 'playing' && !round.auto) act('pause');
});
resize();
begin();
requestAnimationFrame(frame);
