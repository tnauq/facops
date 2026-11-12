// The live map with two-tap dispatch (milestones 1 and 2). Tap an alarm then a tech, or a tech
// then an alarm, to send that tech; a busy tech is redirected. Add #auto to the address to watch
// the scripted player. The HUD, rails and overlays come in later milestones.

import { assign, createGame, step } from './core/index.js';
import { PAGE_COLOR, fitView } from './render/campus.js';
import { drawMap } from './render/map.js';
import { createClock, runFrame } from './ui/loop.js';
import { autoplayStep, createAutoplay } from './ui/autoplay.js';
import { readoutText } from './ui/readout.js';
import { hitTest } from './ui/hittest.js';
import { NOTHING, pruneSelection, reduceTap } from './ui/selection.js';
import { mapTargets } from './ui/targets.js';

const READOUT_HEIGHT = 34; // px, the strip the HUD will use from milestone 3
const INK = '#1F3A5F';
const FONT = "system-ui, -apple-system, 'Segoe UI', sans-serif";

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
let size = { w: 0, h: 0 };
let round = null;
let view = null; // where the map sits on screen, set by draw()

function newRound() {
  const auto = window.location.hash === '#auto';
  round = {
    state: createGame({ seed: Date.now() % 1000000000 }),
    clock: createClock(),
    auto: auto ? createAutoplay() : null,
    selection: NOTHING,
  };
  window.facops = round; // handy in the browser console; the page never reads it back
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
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = INK;
  if (portrait()) {
    ctx.font = `600 18px ${FONT}`;
    ctx.fillText('Turn your phone sideways', w / 2, h / 2);
    return;
  }
  ctx.font = `600 13px ${FONT}`;
  ctx.fillText(readoutText(round.state, { auto: Boolean(round.auto) }), w / 2, READOUT_HEIGHT / 2);
  view = fitView({ x: 8, y: READOUT_HEIGHT + 2, w: w - 16, h: h - READOUT_HEIGHT - 6 });
  const sel = round.selection;
  drawMap(ctx, view, round.state, {
    alarmId: sel.kind === 'alarm' ? sel.id : null,
    techId: sel.kind === 'tech' ? sel.id : null,
  });
}

function frame(now) {
  const { state, auto } = round;
  // Pause while the page is hidden or held upright; the loop stops once the round is over.
  const paused = document.hidden || portrait() || state.over;
  runFrame(round.clock, now, (dt) => {
    step(state, dt);
    if (auto) autoplayStep(auto, state);
  }, paused);
  state.events.splice(0); // nothing listens yet; drained so the list never grows
  round.selection = pruneSelection(round.selection, state); // a fixed alarm drops out of the selection
  draw();
  if (!state.over || !round.drewOver) {
    round.drewOver = state.over;
    requestAnimationFrame(frame);
  }
}

function start() {
  const running = round && !round.drewOver;
  newRound();
  if (!running) requestAnimationFrame(frame);
}

function onTap(event) {
  const { state } = round;
  if (!view || state.over || portrait()) return;
  event.preventDefault();
  const box = canvas.getBoundingClientRect();
  const hit = hitTest({ x: event.clientX - box.left, y: event.clientY - box.top }, mapTargets(state, view));
  const result = reduceTap(round.selection, hit);
  round.selection = result.selection;
  if (result.assign) assign(state, result.assign.techId, result.assign.alarmId);
  draw(); // show the selection at once, even between frames
}

canvas.addEventListener('pointerdown', onTap);
window.addEventListener('resize', () => { resize(); draw(); });
window.addEventListener('hashchange', start);
resize();
start();
