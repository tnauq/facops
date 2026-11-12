// Milestone 8: the pass 2 map, scrollable, at pass 1's zoom. Drag (finger or mouse), the mouse
// wheel or the arrow keys scroll it. Sample alarms show the off-map arrows; tapping an arrow glides
// to its alarm. The − and + buttons (or #halls=N in the address) set how many halls are online.
// The game itself returns on this map in milestone 10; pass 1 stays playable at ./pass1/.

import { START_POINT, WORLD } from './core/layout2.js';
import { drawBuilding } from './render/campus2.js';
import { drawAlarmBubble, drawFaultGlyph } from './render/icons.js';
import { BUBBLE_RADIUS, BUBBLE_RAISE } from './ui/bubbles.js';
import { cameraView, centreOn, createCamera, glide, panBy, passOneScale } from './ui/camera.js';
import { endGesture, moveGesture, startGesture } from './ui/drag.js';
import { MARKER_RADIUS, markerAt, offMapMarkers } from './ui/offmap.js';
import { MAX_HALLS, hallsFromHash, plantBOnline, sampleAlarms, sampleStatus } from './ui/preview.js';
import { HUD_HEIGHT, regions } from './ui/regions.js';

const INK = '#1F3A5F';
const MUTED = '#56606E';
const EDGE = '#C9D1DB';
const FONT = "system-ui, -apple-system, 'Segoe UI', sans-serif";
const GLIDE_TIME = 350; // ms

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
let size = { w: 0, h: 0 };
let halls = hallsFromHash(window.location.hash);
let cam = null;
let gliding = null; // { from, to, start }
let gesture = null;
let dirty = true;
let markers = [];

// The map fills the space below the HUD for now; the zoom is the one the game's map region will use.
function layoutCamera() {
  const rect = { x: 0, y: HUD_HEIGHT, w: size.w, h: size.h - HUD_HEIGHT };
  const scale = passOneScale(regions(size.w, size.h).map);
  if (cam) {
    // Keep looking at the same world point through a resize or a turn of the phone.
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

// ---- HUD: title, halls online with − and +, a link to pass 1 ----

function hudButtons() {
  return [
    { id: 'less', x: 150, w: 44, label: '−' },
    { id: 'more', x: 238, w: 44, label: '+' },
    { id: 'pass1', x: size.w - 76, w: 72, label: 'Pass 1' },
  ].map((b) => ({ ...b, y: 0, h: HUD_HEIGHT }));
}

function drawHud() {
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, size.w, HUD_HEIGHT);
  ctx.fillStyle = EDGE;
  ctx.fillRect(0, HUD_HEIGHT - 1, size.w, 1);
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = INK;
  ctx.font = `600 15px ${FONT}`;
  ctx.fillText('Pass 2 map', 10, HUD_HEIGHT / 2);
  ctx.font = `11px ${FONT}`;
  ctx.fillStyle = MUTED;
  ctx.fillText('Halls', 108, HUD_HEIGHT / 2);
  ctx.textAlign = 'center';
  ctx.font = `600 15px ${FONT}`;
  ctx.fillStyle = INK;
  ctx.fillText(`${halls} / ${MAX_HALLS}`, 216, HUD_HEIGHT / 2);
  if (size.w > 600) {
    ctx.textAlign = 'left';
    ctx.font = `11px ${FONT}`;
    ctx.fillStyle = MUTED;
    ctx.fillText('Drag to scroll · arrows point to alarms off screen', 296, HUD_HEIGHT / 2);
  }
  for (const b of hudButtons()) {
    ctx.beginPath();
    ctx.roundRect(b.x + 3, b.y + 3, b.w - 6, b.h - 6, 8);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.strokeStyle = EDGE;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = INK;
    ctx.textAlign = 'center';
    ctx.font = `600 ${b.label.length > 1 ? 13 : 18}px ${FONT}`;
    ctx.fillText(b.label, b.x + b.w / 2, HUD_HEIGHT / 2 + (b.label.length > 1 ? 0 : -1));
  }
}

// ---- Off-map arrows ----

function drawMarker(m) {
  ctx.save();
  ctx.translate(m.x, m.y);
  // The arrow tip, pointing toward the alarm.
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
  const alarms = sampleAlarms(halls);
  const view = cameraView(cam);
  ctx.save();
  ctx.beginPath();
  ctx.rect(cam.rect.x, cam.rect.y, cam.rect.w, cam.rect.h);
  ctx.clip();
  drawBuilding(ctx, view, size, { online: halls, plantB: plantBOnline(halls), status: sampleStatus(alarms) });
  for (const a of alarms) {
    drawAlarmBubble(ctx, view.ox + a.x * view.scale, view.oy + a.y * view.scale - BUBBLE_RAISE, BUBBLE_RADIUS, a.info, {});
  }
  markers = offMapMarkers(alarms, cam);
  for (const m of markers) drawMarker(m);
  ctx.restore();
  drawHud();
}

function frame(now) {
  if (gliding) {
    const k = Math.min(1, (now - gliding.start) / GLIDE_TIME);
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
  if (b.id === 'pass1') window.location.href = './pass1/';
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
  if (m) {
    gliding = { from: cam, to: centreOn(cam, m.target.x, m.target.y), start: performance.now() };
  }
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

window.addEventListener('hashchange', () => {
  halls = hallsFromHash(window.location.hash);
  dirty = true;
});
window.addEventListener('resize', resize);
resize();
requestAnimationFrame(frame);
window.facopsPreview = { get cam() { return cam; }, get markers() { return markers; }, get halls() { return halls; } };
