// FacOps pass 1, up to milestone 4: the live map with two-tap dispatch, the HUD strip, the crew bar
// and alarm rail, and the start, pause and round-over overlays with a saved best score. Tap an alarm
// (bubble or ticket) then a tech (on the map or its card), or the other way round, to send that
// tech; a busy tech is redirected. Keys 1 to 3 tap the crew cards. Add #auto to watch the scripted
// player.

import { assign, createGame, formatClock, results, step } from './core/index.js';
import { PAGE_COLOR, fitView } from './render/campus.js';
import { drawMap } from './render/map.js';
import { drawHud } from './render/hud.js';
import { drawCrewBar, drawRail } from './render/rails.js';
import { bindOverlays, showOverlay } from './render/overlays.js';
import { createClock, runFrame } from './ui/loop.js';
import { autoplayStep, createAutoplay } from './ui/autoplay.js';
import { hitTest } from './ui/hittest.js';
import { NOTHING, pruneSelection, reduceTap } from './ui/selection.js';
import { screenTargets } from './ui/targets.js';
import { hudLayout, regions } from './ui/regions.js';
import { crewCards, techForKey } from './ui/crewbar.js';
import { railTickets } from './ui/rail.js';
import { hudModel } from './ui/hud.js';
import { reduceFlow } from './ui/flow.js';
import { bestText, loadBest, recordBest, saveBest } from './ui/best.js';

const INK = '#1F3A5F';
const FONT = "system-ui, -apple-system, 'Segoe UI', sans-serif";

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
let size = { w: 0, h: 0 };
let round = null;
let view = null; // where the map sits on screen, set by draw()
let mode = 'start'; // see src/ui/flow.js
let best = loadBest(); // null when there is none or storage is blocked

const isAuto = () => window.location.hash === '#auto';

function newRound() {
  round = {
    state: createGame({ seed: Date.now() % 1000000000 }),
    clock: createClock(),
    auto: isAuto() ? createAutoplay() : null,
    selection: NOTHING,
  };
  window.facops = round; // handy in the browser console; the page never reads it back
}

function showStart() {
  showOverlay('start', { best: bestText(best, formatClock) });
}

function act(action) {
  const next = reduceFlow(mode, action);
  if (next.newRound) newRound();
  mode = next.mode;
  if (mode === 'playing') showOverlay('playing');
  else if (mode === 'paused') showOverlay('paused');
  round.selection = NOTHING;
  draw();
}

function roundOver() {
  const r = results(round.state);
  const record = recordBest(best, r);
  best = record.best;
  if (record.isNew) saveBest(best);
  mode = reduceFlow(mode, 'over').mode;
  showOverlay('over', {
    time: formatClock(r.seconds),
    energy: `${r.energyGwh.toFixed(2)} GWh`,
    bestLine: record.isNew ? 'New best!' : `Best: ${bestText(best, formatClock)}`,
  });
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
  drawMap(ctx, view, round.state, { alarmId, techId });
  drawCrewBar(ctx, crewCards(round.state, regs.crew, techId));
  drawRail(ctx, railTickets(round.state, regs.rail, alarmId));
  drawHud(ctx, w, hudLayout(w), hudModel(round.state), round.auto ? 'Auto' : '');
}

function frame(now) {
  const { state, auto } = round;
  // The rules run only while playing, and pause while the page is hidden or held upright.
  const paused = mode !== 'playing' || document.hidden || portrait() || state.over;
  runFrame(round.clock, now, (dt) => {
    step(state, dt);
    if (auto) autoplayStep(auto, state);
  }, paused);
  state.events.splice(0); // nothing listens yet; drained so the list never grows
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
    // Settings opens the pause card for now; the tuning drawer behind it arrives in milestone 5.
    act('pause');
    return;
  }
  applyTap(hit);
}

function applyTap(hit) {
  const result = reduceTap(round.selection, hit);
  round.selection = result.selection;
  if (result.assign) assign(round.state, result.assign.techId, result.assign.alarmId);
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
canvas.addEventListener('pointerdown', onTap);
window.addEventListener('keydown', onKey);
window.addEventListener('resize', () => { resize(); draw(); });
window.addEventListener('hashchange', begin);
resize();
begin();
requestAnimationFrame(frame);
