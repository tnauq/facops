// FacOps pass 2, through milestone 10: the game on the new scrolling map (pass 2 spec, section 7).
// The pass 1 screen (HUD, crew bar, alarm rail, overlays, tuning drawer, results with Copy) runs on
// the pass 2 rules engine (src/core/index2.js). New here:
//   - The map scrolls at pass 1's zoom: drag (finger or mouse), mouse wheel, arrow keys. A touch that
//     moves more than 8 px scrolls; one that does not is a tap, acted on when the finger lifts.
//     The rails and HUD still act at finger-down.
//   - Off-map arrows point to alarms out of view; tapping one glides to it. Tapping a ticket or a
//     crew card whose alarm or tech is out of view glides there too.
//   - The crew bar grows a second column when the crew gets big.
//   - Deliveries take the first card automatically until milestone 11 brings the pick.
// Two-tap and one-tap dispatch work as in pass 1. Keys 1 to 9 tap the crew cards. #auto watches
// the scripted player. Pass 1 stays at ./pass1/; the M8 map preview at ./map.html.

import * as api2 from './core/index2.js';
import { EQUIPMENT_BY_ID, START_POINT, WORLD, assign, choose, createGame, dispatch, formatClock, getTech, greedyMove, pickFor, results, resultsText, step } from './core/index2.js';
import { PAGE_COLOR } from './render/campus.js';
import { drawMap2 } from './render/map2.js';
import { drawHud, drawHudFlash } from './render/hud.js';
import { drawCrewBar, drawRail } from './render/rails.js';
import { bindOverlays, buildTuningControls, selectResultsText, setCopyLabel, setResults, setTuningControls, showOverlay } from './render/overlays.js';
import { resultsPanel } from './ui/results.js';
import { copyLabel, copyText } from './ui/copy.js';
import { createClock, runFrame } from './ui/loop.js';
import { hitTest } from './ui/hittest.js';
import { NOTHING, pruneSelection, reduceTap } from './ui/selection.js';
import { mapTargets2, railTargets2 } from './ui/targets2.js';
import { HUD_HEIGHT, crewColumns, hudLayout, regions } from './ui/regions.js';
import { createFeel, feelEvents, flashAlpha } from './ui/feel.js';
import { crewCards, techForKey } from './ui/crewbar.js';
import { railTickets } from './ui/rail.js';
import { hudModel2 } from './ui/hud2.js';
import { reduceFlow } from './ui/flow.js';
import { BEST2_KEY, bestText, defaultStorage, loadBest, recordBest, saveBest } from './ui/best.js';
import { tuning2 } from './ui/tuning2.js';
import { centreOn, createCamera, glide, isVisible, panBy, passOneScale } from './ui/camera.js';
import { endGesture, moveGesture, startGesture } from './ui/drag.js';
import { markerAt } from './ui/offmap.js';

const INK = '#1F3A5F';
const FONT = "system-ui, -apple-system, 'Segoe UI', sans-serif";
const GLIDE_MS = 350;
const AUTO_GAP = 0.8; // seconds between the scripted player's commands, as in pass 1's #auto
const KEY_PAN = { ArrowLeft: [160, 0], ArrowRight: [-160, 0], ArrowUp: [0, 160], ArrowDown: [0, -160] };

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
let size = { w: 0, h: 0 };
let round = null;
let cam = null;
let gliding = null; // { from, to, start }
let gesture = null;
let markers = [];
let mode = 'start'; // see src/ui/flow.js
let best = loadBest(defaultStorage(), BEST2_KEY);
let tuning = tuning2.loadTuning(defaultStorage());
let tuningBack = null;

const isAuto = () => window.location.hash === '#auto';
const portrait = () => size.h > size.w;

// ---- Rounds and screens ----

function newRound() {
  round = {
    state: createGame({ seed: Date.now() % 1000000000, config: tuning2.tuningToConfig(tuning) }),
    clock: createClock(),
    auto: isAuto(),
    nextAuto: 0,
    selection: NOTHING,
    feel: createFeel(),
  };
  if (cam) cam = centreOn(cam, START_POINT.x, START_POINT.y);
  gliding = null;
  window.facops = round; // handy in the browser console; the page never reads it back
}

function showStart() {
  showOverlay('start', { best: bestText(best, formatClock) });
}

function act(action) {
  if (action === 'reset') {
    changeTuning(tuning2.defaultTuning());
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
  else if (mode === 'over') showOverlay('over');
  else if (mode === 'tuning') {
    setTuningControls(tuning, tuning2.tuningLabel);
    showOverlay('tuning');
  } else showOverlay(mode);
  round.selection = NOTHING;
  draw();
}

function changeTuning(values) {
  tuning = values;
  tuning2.saveTuning(tuning, defaultStorage());
  setTuningControls(tuning, tuning2.tuningLabel);
}

function roundOver() {
  const r = results(round.state);
  const record = recordBest(best, r);
  best = record.best;
  if (record.isNew) saveBest(best, defaultStorage(), BEST2_KEY);
  mode = reduceFlow(mode, 'over').mode;
  setResults(resultsPanel(r, record, formatClock));
  showOverlay('over');
}

// Runs inside the button's click handler: Safari only allows clipboard writes during a tap.
function copyResults() {
  copyText(resultsText(round.state), { clipboard: navigator.clipboard, selectFallback: selectResultsText })
    .then((outcome) => setCopyLabel(copyLabel(outcome)));
}

// ---- Layout and camera ----

const columnsNow = () => crewColumns(size.h, round.state.techs.length);
const layout = () => regions(size.w, size.h, { crewColumns: columnsNow() });

// The zoom is pass 1's on this screen (one crew column); a second crew column only narrows the view.
function syncCamera() {
  const rect = layout().map;
  const scale = passOneScale(regions(size.w, size.h).map);
  if (!cam) {
    cam = createCamera(rect, scale, WORLD, START_POINT);
    return;
  }
  const same = cam.rect.x === rect.x && cam.rect.w === rect.w && cam.rect.h === rect.h && cam.scale === scale;
  if (!same) {
    // Keep the same world point in the middle of the view.
    const mid = { x: cam.x + cam.rect.w / cam.scale / 2, y: cam.y + cam.rect.h / cam.scale / 2 };
    cam = centreOn(createCamera(rect, scale, WORLD), mid.x, mid.y);
    gliding = null;
  }
}

function resize() {
  const dpr = window.devicePixelRatio || 1;
  size = { w: canvas.clientWidth, h: canvas.clientHeight };
  canvas.width = Math.round(size.w * dpr);
  canvas.height = Math.round(size.h * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (round) syncCamera();
}

function glideTo(x, y) {
  gliding = { from: cam, to: centreOn(cam, x, y), start: performance.now() };
}

function pan(dx, dy) {
  gliding = null;
  cam = panBy(cam, dx, dy);
}

// ---- Drawing ----

function draw() {
  const { w, h } = size;
  ctx.fillStyle = PAGE_COLOR;
  ctx.fillRect(0, 0, w, h);
  if (portrait() || !round) {
    if (portrait()) {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = INK;
      ctx.font = `600 18px ${FONT}`;
      ctx.fillText('Turn your phone sideways', w / 2, h / 2);
    }
    return;
  }
  syncCamera();
  const regs = layout();
  const s = round.state;
  const sel = round.selection;
  const alarmId = sel.kind === 'alarm' ? sel.id : null;
  const techId = sel.kind === 'tech' ? sel.id : null;
  markers = drawMap2(ctx, cam, size, s, { alarmId, techId });
  drawCrewBar(ctx, crewCards(s, regs.crew, techId, { columns: columnsNow() }));
  drawRail(ctx, railTickets(s, regs.rail, alarmId, api2));
  const model = hudModel2(s, { auto: round.auto });
  drawHud(ctx, w, hudLayout(w), model, model.note);
  drawHudFlash(ctx, w, HUD_HEIGHT, flashAlpha(round.feel, s.t));
}

function frame(now) {
  const { state } = round;
  const paused = mode !== 'playing' || document.hidden || portrait() || state.over;
  runFrame(round.clock, now, (dt) => {
    // Until milestone 11 brings the Delivery card, a pick takes the first card (always a Hire).
    if (state.pendingPick) choose(state, pickFor(state, 'first'));
    step(state, dt);
    if (round.auto && state.t >= round.nextAuto && greedyMove(state, { reaction: 1 })) round.nextAuto = state.t + AUTO_GAP;
  }, paused);
  feelEvents(round.feel, state.events.splice(0), state.config); // drained every frame so the list never grows
  if (state.over && mode === 'playing') roundOver();
  round.selection = pruneSelection(round.selection, state);
  if (gliding) {
    const k = Math.min(1, (now - gliding.start) / GLIDE_MS);
    cam = glide(gliding.from, gliding.to, k);
    if (k >= 1) gliding = null;
  }
  draw();
  requestAnimationFrame(frame);
}

// ---- Input ----

const point = (e) => {
  const box = canvas.getBoundingClientRect();
  return { x: e.clientX - box.left, y: e.clientY - box.top };
};
const inMap = (p) => cam && p.x >= cam.rect.x && p.x <= cam.rect.x + cam.rect.w && p.y >= cam.rect.y && p.y <= cam.rect.y + cam.rect.h;
const canPlay = () => round && mode === 'playing' && !round.state.over && !portrait();

function applyTap(hit) {
  // The mode belongs to the round: one-tap is switched on in the drawer and applies from the next round.
  const result = reduceTap(round.selection, hit, { oneTap: round.state.config.oneTap });
  round.selection = result.selection;
  if (result.assign) assign(round.state, result.assign.techId, result.assign.alarmId);
  if (result.dispatch !== undefined) dispatch(round.state, result.dispatch);
}

// A ticket or card for something out of view also brings it into view (spec 7.1).
function revealFor(hit) {
  const s = round.state;
  let target = null;
  if (hit.kind === 'alarm') {
    const a = s.alarms.find((x) => x.id === hit.id);
    if (a) target = EQUIPMENT_BY_ID[a.equipId];
  } else if (hit.kind === 'tech') {
    target = getTech(s, hit.id);
  }
  if (target && !isVisible(cam, target.x, target.y, 30)) glideTo(target.x, target.y);
}

function onDown(e) {
  if (!canPlay()) return;
  e.preventDefault();
  const p = point(e);
  // HUD buttons, crew cards and tickets act at finger-down, as in pass 1.
  const hit = hitTest(p, railTargets2(round.state, layout(), columnsNow()));
  if (hit.kind === 'button') {
    act(hit.id === 'settings' ? 'tuning' : 'pause');
    return;
  }
  if (hit.kind !== 'empty') {
    applyTap(hit);
    revealFor(hit);
    return;
  }
  if (inMap(p)) {
    gesture = startGesture(p);
    canvas.setPointerCapture?.(e.pointerId);
  } else {
    applyTap(hit); // a tap in the gaps between the rails clears the selection
  }
}

function onMove(e) {
  if (!gesture) return;
  const r = moveGesture(gesture, point(e));
  gesture = r.gesture;
  if (r.pan) pan(r.pan.dx, r.pan.dy);
}

function onUp(e) {
  if (!gesture) return;
  const tap = endGesture(gesture);
  gesture = null;
  if (e.type === 'pointercancel' || !tap || !canPlay()) return;
  const m = markerAt(markers, tap);
  if (m) {
    glideTo(m.target.x, m.target.y);
    return;
  }
  applyTap(hitTest(tap, mapTargets2(round.state, cam)));
}

function onKey(e) {
  if (e.repeat && !KEY_PAN[e.key]) return;
  if (e.code === 'Space') {
    e.preventDefault();
    act('togglePause');
    return;
  }
  if (KEY_PAN[e.key] && cam) {
    e.preventDefault();
    pan(...KEY_PAN[e.key]);
    return;
  }
  // Keys 1 to 9 tap the crew cards, only while playing.
  const hit = techForKey(round.state, e.key);
  if (hit && canPlay()) {
    applyTap(hit);
    revealFor(hit);
  }
}

function onWheel(e) {
  e.preventDefault();
  if (!cam || !inMap(point(e))) return;
  // Shift turns an up-down wheel into a sideways one, for mice without a sideways wheel.
  const dx = e.shiftKey && !e.deltaX ? e.deltaY : e.deltaX;
  const dy = e.shiftKey && !e.deltaX ? 0 : e.deltaY;
  pan(-dx, -dy);
}

function begin() {
  newRound();
  mode = isAuto() ? 'playing' : 'start';
  if (mode === 'start') showStart();
  else showOverlay('playing');
}

bindOverlays(act);
buildTuningControls(tuning2.fields, (id, raw) => changeTuning(tuning2.setTuning(tuning, id, raw)));
canvas.addEventListener('pointerdown', onDown);
canvas.addEventListener('pointermove', onMove);
canvas.addEventListener('pointerup', onUp);
canvas.addEventListener('pointercancel', onUp);
canvas.addEventListener('wheel', onWheel, { passive: false });
window.addEventListener('keydown', onKey);
window.addEventListener('resize', () => { resize(); draw(); });
window.addEventListener('hashchange', begin);
// Leaving the page (switching apps, locking the phone) pauses the round and shows the pause card.
document.addEventListener('visibilitychange', () => {
  if (document.hidden && mode === 'playing' && !round.auto) act('pause');
});
resize();
begin();
syncCamera();
requestAnimationFrame(frame);
window.facopsCam = () => cam; // for checks in the browser console
