// Milestone 1: the live map. A round plays in real time; add #auto to the address to watch
// the scripted player. Tapping, the HUD and the overlays come in later milestones.

import { createGame, step } from './core/index.js';
import { PAGE_COLOR, fitView } from './render/campus.js';
import { drawMap } from './render/map.js';
import { createClock, runFrame } from './ui/loop.js';
import { autoplayStep, createAutoplay } from './ui/autoplay.js';
import { readoutText } from './ui/readout.js';

const READOUT_HEIGHT = 34; // px, the strip the HUD will use from milestone 3
const INK = '#1F3A5F';
const FONT = "system-ui, -apple-system, 'Segoe UI', sans-serif";

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
let size = { w: 0, h: 0 };
let round = null;

function newRound() {
  const auto = window.location.hash === '#auto';
  round = {
    state: createGame({ seed: Date.now() % 1000000000 }),
    clock: createClock(),
    auto: auto ? createAutoplay() : null,
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
  const view = fitView({ x: 8, y: READOUT_HEIGHT + 2, w: w - 16, h: h - READOUT_HEIGHT - 6 });
  drawMap(ctx, view, round.state);
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

window.addEventListener('resize', () => { resize(); draw(); });
window.addEventListener('hashchange', start);
resize();
start();
