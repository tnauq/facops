// The pass 2 map page, before the game moves onto it in milestone 10.
//   (no hash) or #halls=N: the map preview from M8, with − and + for halls online and sample alarms.
//   #auto: the scripted player runs a whole pass 2 run on the new rules (M9). A speed button
//          (×1, ×2, ×4) and New run; the view glides to each hall as it comes online.
// Both: drag, mouse wheel or arrow keys scroll; tapping an off-map arrow glides to its alarm.
// Pass 1 stays playable at ./pass1/.

import { HALLS, MID_Y, START_POINT, WORLD, choose, createGame, formatClock, greedyMove, load, pickFor, plantBOnline as plantBOnline2, step } from './core/index2.js';
import { drawBuilding } from './render/campus2.js';
import { drawCrew } from './render/campus.js';
import { drawAlarmBubble, drawFaultGlyph } from './render/icons.js';
import { BUBBLE_RADIUS, BUBBLE_RAISE } from './ui/bubbles.js';
import { cameraView, centreOn, createCamera, glide, panBy, passOneScale } from './ui/camera.js';
import { fannedCrew } from './ui/crew.js';
import { endGesture, moveGesture, startGesture } from './ui/drag.js';
import { popScale } from './ui/feel.js';
import { BAND_COLOR } from './ui/hud.js';
import { createClock, runFrame } from './ui/loop.js';
import { MARKER_RADIUS, markerAt, offMapMarkers } from './ui/offmap.js';
import { MAX_HALLS, hallsFromHash, plantBOnline, sampleAlarms, sampleStatus } from './ui/preview.js';
import { HUD_HEIGHT, regions } from './ui/regions.js';
import { bubbles2, equipmentStatus } from './ui/view2.js';

const INK = '#1F3A5F';
const MUTED = '#56606E';
const EDGE = '#C9D1DB';
const FONT = "system-ui, -apple-system, 'Segoe UI', sans-serif";
const GLIDE_TIME = 350; // ms, tapping an arrow
const DELIVERY_GLIDE = 1500; // ms, spec 7.1
const AUTO_GAP = 0.8; // seconds between the scripted player's commands, as in pass 1's #auto
const SPEEDS = [1, 2, 4];

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
let size = { w: 0, h: 0 };
let halls = hallsFromHash(window.location.hash);
let cam = null;
let gliding = null; // { from, to, start, time }
let gesture = null;
let dirty = true;
let markers = [];
let run = null; // #auto: { state, clock, nextAction, speed, virtual, last }

const isAuto = () => window.location.hash.includes('auto');

function newRun() {
  run = { state: createGame({ seed: Date.now() % 1000000000 }), clock: createClock(), nextAction: 0, speed: run?.speed ?? 1, virtual: 0, last: null };
  if (cam) cam = centreOn(cam, START_POINT.x, START_POINT.y);
  window.facopsRun = run; // handy in the browser console; the page never reads it back
  dirty = true;
}

// ---- Camera ----

function layoutCamera() {
  const rect = { x: 0, y: HUD_HEIGHT, w: size.w, h: size.h - HUD_HEIGHT };
  const scale = passOneScale(regions(size.w, size.h).map); // the zoom the game's map region will use
  if (cam) {
    const mid = { x: cam.x + cam.rect.w / cam.scale / 2, y: cam.y + cam.rect.h / cam.scale / 2 };
    cam = centreOn(createCamera(rect, scale, WORLD), mid.x, mid.y);
  } else {
    cam = createCamera(rect, scale, WORLD, START_POINT);
  }
}

function resize() {
  const dpr = window.devicePixelRatio || 1;
  size = { w: canvas.clientWidth, h: canvas.clientHeight };
  canvas.width = Math.round(size.w * dpr);
  canvas.height = Math.round(size.h * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  layoutCamera();
  dirty = true;
}

const glideTo = (x, y, time) => {
  gliding = { from: cam, to: centreOn(cam, x, y), start: performance.now(), time };
};

// ---- HUD ----

function hudButtons() {
  const right = [{ id: 'pass1', w: 72, label: 'Pass 1' }];
  const left = [];
  if (run) {
    right.unshift({ id: 'new', w: 84, label: 'New run' });
    right.unshift({ id: 'speed', w: 52, label: `×${run.speed}` });
  } else {
    left.push({ id: 'less', x: 150, w: 44, label: '−' }, { id: 'more', x: 238, w: 44, label: '+' });
  }
  let x = size.w - 4;
  for (const b of [...right].reverse()) {
    x -= b.w;
    b.x = x;
  }
  return [...left, ...right].map((b) => ({ ...b, y: 0, h: HUD_HEIGHT }));
}

function hudText(text, x, { weight = 400, px = 11, color = MUTED, align = 'left' } = {}) {
  ctx.font = `${weight} ${px}px ${FONT}`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.fillText(text, x, HUD_HEIGHT / 2);
  return ctx.measureText(text).width;
}

function drawHud() {
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, size.w, HUD_HEIGHT);
  ctx.fillStyle = EDGE;
  ctx.fillRect(0, HUD_HEIGHT - 1, size.w, 1);
  ctx.textBaseline = 'middle';
  const buttons = hudButtons();
  if (run) {
    const s = run.state;
    const l = load(s);
    let x = 10;
    x += hudText(formatClock(s.t), x, { weight: 600, px: 15, color: INK }) + 12;
    ctx.fillStyle = BAND_COLOR[l.band];
    ctx.beginPath();
    ctx.arc(x + 5, HUD_HEIGHT / 2, 5, 0, Math.PI * 2);
    ctx.fill();
    x += 14;
    x += hudText(`${Math.round(l.deliveredMw)} / ${Math.round(l.capacityMw)} MW`, x, { weight: 600, px: 15, color: INK }) + 12;
    const limit = buttons[0].x - 8;
    const parts = [`Hall ${s.halls} of ${MAX_HALLS}`, `Stability ${Math.ceil(s.meter)}`, `Crew ${s.techs.length}`, s.over ? 'Run over' : 'Auto'];
    for (const p of parts) {
      ctx.font = `11px ${FONT}`;
      if (x + ctx.measureText(p).width > limit) break;
      x += hudText(p, x) + 12;
    }
  } else {
    hudText('Pass 2 map', 10, { weight: 600, px: 15, color: INK });
    hudText('Halls', 108);
    hudText(`${halls} / ${MAX_HALLS}`, 216, { weight: 600, px: 15, color: INK, align: 'center' });
    if (size.w > 600) hudText('Drag to scroll · arrows point to alarms off screen', 296);
  }
  for (const b of buttons) {
    ctx.beginPath();
    ctx.roundRect(b.x + 3, b.y + 3, b.w - 6, b.h - 6, 8);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.strokeStyle = EDGE;
    ctx.lineWidth = 1;
    ctx.stroke();
    const big = b.label.length === 1;
    ctx.font = `600 ${big ? 18 : 13}px ${FONT}`;
    ctx.fillStyle = INK;
    ctx.textAlign = 'center';
    ctx.fillText(b.label, b.x + b.w / 2, HUD_HEIGHT / 2 + (big ? -1 : 0));
  }
}

// ---- Off-map arrows ----

function drawMarker(m) {
  ctx.save();
  ctx.translate(m.x, m.y);
  ctx.save();
  ctx.rotate(m.angle);
  ctx.beginPath();
  ctx.moveTo(MARKER_RADIUS - 2, -7);
  ctx.lineTo(MARKER_RADIUS + 6, 0);
  ctx.lineTo(MARKER_RADIUS - 2, 7);
  ctx.closePath();
  ctx.fillStyle = INK;
  ctx.fill();
  ctx.restore();
  const r = 15;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = INK;
  ctx.stroke();
  drawFaultGlyph(ctx, 0, 0, 16, m.type, INK);
  if (m.count > 1) {
    ctx.beginPath();
    ctx.arc(r * 0.8, -r * 0.8, 8, 0, Math.PI * 2);
    ctx.fillStyle = INK;
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `700 10px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(m.count), r * 0.8, -r * 0.8 + 0.5);
  }
  ctx.restore();
}

// ---- Frame ----

function draw() {
  const view = cameraView(cam);
  ctx.save();
  ctx.beginPath();
  ctx.rect(cam.rect.x, cam.rect.y, cam.rect.w, cam.rect.h);
  ctx.clip();
  let points;
  if (run) {
    const s = run.state;
    drawBuilding(ctx, view, size, { online: s.halls, plantB: plantBOnline2(s), status: equipmentStatus(s) });
    drawCrew(ctx, view, fannedCrew(s.techs, view.scale), null);
    points = bubbles2(s);
    for (const b of points) {
      const r = BUBBLE_RADIUS * popScale(b.info.age);
      if (r > 0.5) drawAlarmBubble(ctx, view.ox + b.x * view.scale, view.oy + b.y * view.scale - BUBBLE_RAISE, r, b.info, b.options);
    }
  } else {
    points = sampleAlarms(halls);
    drawBuilding(ctx, view, size, { online: halls, plantB: plantBOnline(halls), status: sampleStatus(points) });
    for (const a of points) drawAlarmBubble(ctx, view.ox + a.x * view.scale, view.oy + a.y * view.scale - BUBBLE_RAISE, BUBBLE_RADIUS, a.info, {});
  }
  markers = offMapMarkers(points, cam);
  for (const m of markers) drawMarker(m);
  ctx.restore();
  drawHud();
}

function stepRun(now) {
  const s = run.state;
  // Speed: feed the fixed-step clock a virtual time that runs ×1, ×2 or ×4.
  const elapsed = run.last === null ? 0 : now - run.last;
  run.last = now;
  run.virtual += elapsed * run.speed;
  const paused = document.hidden || size.h > size.w || s.over;
  runFrame(run.clock, run.virtual, (dt) => {
    if (s.pendingPick) choose(s, pickFor(s, 'first')); // #auto takes the first card (spec M9)
    step(s, dt);
    if (s.t >= run.nextAction && greedyMove(s, { reaction: 1 })) run.nextAction = s.t + AUTO_GAP;
  }, paused);
  for (const e of s.events.splice(0)) {
    if (e.type === 'delivery') glideTo(HALLS[e.hall].cx, MID_Y, DELIVERY_GLIDE);
  }
}

function frame(now) {
  if (run) {
    stepRun(now);
    dirty = true;
  }
  if (gliding) {
    const k = Math.min(1, (now - gliding.start) / gliding.time);
    cam = glide(gliding.from, gliding.to, k);
    if (k >= 1) gliding = null;
    dirty = true;
  }
  if (dirty) {
    dirty = false;
    if (size.w > 0 && size.h > 0 && size.w >= size.h) draw();
  }
  requestAnimationFrame(frame);
}

// ---- Input ----

function setHalls(n) {
  halls = Math.max(1, Math.min(MAX_HALLS, n));
  try {
    history.replaceState(null, '', `#halls=${halls}`);
  } catch {
    // Some embedded browsers refuse; the switch still works for this visit.
  }
  dirty = true;
}

function pan(dx, dy) {
  gliding = null;
  cam = panBy(cam, dx, dy);
  dirty = true;
}

const point = (e) => {
  const box = canvas.getBoundingClientRect();
  return { x: e.clientX - box.left, y: e.clientY - box.top };
};

function hudTap(p) {
  // Buttons keep a 44 px tall tap area, reaching a little below the strip.
  const b = hudButtons().find((q) => p.x >= q.x && p.x < q.x + q.w && p.y >= 0 && p.y < 44);
  if (!b) return false;
  if (b.id === 'less') setHalls(halls - 1);
  if (b.id === 'more') setHalls(halls + 1);
  if (b.id === 'speed') run.speed = SPEEDS[(SPEEDS.indexOf(run.speed) + 1) % SPEEDS.length];
  if (b.id === 'new') newRun();
  if (b.id === 'pass1') window.location.href = './pass1/';
  dirty = true;
  return true;
}

canvas.addEventListener('pointerdown', (e) => {
  const p = point(e);
  e.preventDefault();
  if (hudTap(p)) return; // HUD acts at once, as in the game
  gesture = startGesture(p);
  canvas.setPointerCapture?.(e.pointerId);
});

canvas.addEventListener('pointermove', (e) => {
  if (!gesture) return;
  const r = moveGesture(gesture, point(e));
  gesture = r.gesture;
  if (r.pan) pan(r.pan.dx, r.pan.dy);
});

function finish(e) {
  if (!gesture) return;
  const tap = endGesture(gesture);
  gesture = null;
  if (e.type === 'pointercancel' || !tap) return;
  const m = markerAt(markers, tap);
  if (m) glideTo(m.target.x, m.target.y, GLIDE_TIME);
}
canvas.addEventListener('pointerup', finish);
canvas.addEventListener('pointercancel', finish);

canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  // Shift turns an up-down wheel into a sideways one, for mice without a sideways wheel.
  const dx = e.shiftKey && !e.deltaX ? e.deltaY : e.deltaX;
  const dy = e.shiftKey && !e.deltaX ? 0 : e.deltaY;
  pan(-dx, -dy);
}, { passive: false });

const KEY_PAN = { ArrowLeft: [160, 0], ArrowRight: [-160, 0], ArrowUp: [0, 160], ArrowDown: [0, -160] };
window.addEventListener('keydown', (e) => {
  const k = KEY_PAN[e.key];
  if (!k) return;
  e.preventDefault();
  pan(k[0], k[1]);
});

function applyHash() {
  if (isAuto()) {
    if (!run) newRun();
  } else {
    run = null;
    halls = hallsFromHash(window.location.hash);
  }
  dirty = true;
}

window.addEventListener('hashchange', applyHash);
window.addEventListener('resize', resize);
resize();
applyHash();
requestAnimationFrame(frame);
window.facopsPreview = { get cam() { return cam; }, get markers() { return markers; }, get halls() { return halls; } };
