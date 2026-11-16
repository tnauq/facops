// FacOps pass 3 (docs/pass3-spec.md): pass 2's game on the scrolling map, plus shields on the map (M14)
// and an alarm rail that triages (M15: costs on tickets, costly alarms first, a rail that scrolls),
// and the campus overview strip under the map (M16: the whole building at a glance; tap or drag to go there).
// Pass 2's notes (pass 2 spec, section 7):
// The pass 1 screen (HUD, crew bar, alarm rail, overlays, tuning drawer, results with Copy) runs on
// the pass 2 rules engine (src/core/index2.js). New here:
//   - The map scrolls at pass 1's zoom: drag (finger or mouse), mouse wheel, arrow keys. A touch that
//     moves more than 8 px scrolls; one that does not is a tap, acted on when the finger lifts.
//     The rails and HUD still act at finger-down.
//   - Off-map arrows point to alarms out of view; tapping one glides to it. Tapping a ticket or a
//     crew card whose alarm or tech is out of view glides there too.
//   - The crew bar grows a second column when the crew gets big.
//   - A new player's first run starts with the hall 1 tutorial (src/ui/tutorial.js): scripted
//     alarms one lesson at a time and one-line callouts, ended by the first Delivery. After the first
//     finished run, Skip tutorial turns on by itself; it is a switch in the drawer.
//   - Feel: floating MW losses at the equipment, the HUD flash on entering red, new bubbles popping
//     in, walking hats bobbing, and a short celebration when a hall comes online.
//   - A Delivery stops play on the Delivery card: the new hall, Plant B at hall 6, and either the
//     tech who joined or three cards to pick from. Closing it glides the view to the new hall.
// Two-tap and one-tap dispatch work as in pass 1. Keys 1 to 9 tap the crew cards. #auto watches
// the scripted player. Pass 1 stays at ./pass1/; the M8 map preview at ./map.html.

import { EQUIPMENT_BY_ID, HALLS, MID_Y, START_POINT, WORLD, assign, build, buildingOn, buyUpgrade, hire, spotState, choose, createGame, dispatch, formatClock, getTech, greedyMove, pickFor, results, resultsText, step } from './core/index2.js';
import { PAGE_COLOR } from './render/campus.js';
import { drawMap2 } from './render/map2.js';
import { drawStrip } from './render/strip.js';
import { drawBanner, drawCeoMarker, drawCeoOnStrip } from './render/ceo.js';
import { LINES, assistantAt, bannerModel, ceoEvents, createCeoView, liveSay, liveShakes, pickLine, trackCeo } from './ui/ceoView.js';
import { drawHud, drawHudFlash } from './render/hud.js';
import { drawCrewBar, drawRail2 } from './render/rails.js';
import { bindOverlays, buildTuningControls, selectResultsText, setCopyLabel, setDelivery, setResults, setShop, setTuningControls, showOverlay } from './render/overlays.js';
import { drawTech } from './render/icons.js';
import { drawUpgrade } from './render/upgrades.js';
import { deliveryCard } from './ui/delivery.js';
import { createTutorial, lessonAlarms, updateTutorial } from './ui/tutorial.js';
import { createIntros, updateIntros } from './ui/intros.js';
import { createTutorial4, lessonAlarms4, updateTutorial4 } from './ui/tutorial4.js';
import { cardLayout, spotAt, spotInfo } from './ui/spots.js';
import { hireCardText, shopModel } from './ui/shop.js';
import { drawBuildCard } from './render/spots.js';
import { buildMove } from './core/builder.js';
import { drawCallout } from './render/callout.js';
import { cameraView } from './ui/camera.js';
import { resultsPanel } from './ui/results.js';
import { copyLabel, copyText } from './ui/copy.js';
import { createClock, runFrame } from './ui/loop.js';
import { hitTest } from './ui/hittest.js';
import { NOTHING, pruneSelection, reduceTap } from './ui/selection.js';
import { mapTargets2, railTargets2 } from './ui/targets2.js';
import { HUD_HEIGHT, crewColumns, hudLayout, regions } from './ui/regions.js';
import { createFeel2, feelEvents2, flashAlpha, liveCelebrations, liveFloats } from './ui/feel2.js';
import { crewCards, techForKey } from './ui/crewbar.js';
import { refusedTap } from './ui/refusal.js';
import { autoTop, railTapCounts, railTickets2, scrollByDrag } from './ui/rail2.js';
import { DRAG_PX } from './ui/drag.js';
import { hudModel2 } from './ui/hud2.js';
import { reduceFlow } from './ui/flow.js';
import { BEST2_KEY, BEST4_KEY, bestText, defaultStorage, loadBest, recordBest, saveBest } from './ui/best.js';
import { tuning2 } from './ui/tuning2.js';
import { centreOn, createCamera, glide, isVisible, panBy, passOneScale, siteOf } from './ui/camera.js';
import { endGesture, moveGesture, startGesture } from './ui/drag.js';
import { inStripTarget, regions3, stripModel, stripX, stripY, worldXAt } from './ui/strip.js';
import { markerAt } from './ui/offmap.js';

const SITE = siteOf(WORLD); // the building and the ground around it (pass 3 spec 4b.3)

const INK = '#1F3A5F';
const FONT = "system-ui, -apple-system, 'Segoe UI', sans-serif";
const GLIDE_MS = 350;
const DELIVERY_GLIDE_MS = 1500; // spec 7.1: a Delivery glides the view to the new hall
const AUTO_GAP = 0.8; // seconds between the scripted player's commands, as in pass 1's #auto
const TUTORIAL_SEEN_KEY = 'facops.tutorialSeen.v2'; // set after the first finished run
const KEY_PAN = { ArrowLeft: [160, 0], ArrowRight: [-160, 0], ArrowUp: [0, 160], ArrowDown: [0, -160] };

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
let size = { w: 0, h: 0 };
let round = null;
let cam = null;
let gliding = null; // { from, to, start, ms }
let gesture = null;
let stripGesture = false; // a finger on the overview strip: the view follows it
let railGesture = null; // a touch on a rail that overflows: { start, startFirst, dragging }
let markers = [];
let mode = 'start'; // see src/ui/flow.js
// Building mode keeps its own best, in money (pass 4 M27); the classic game keeps pass 2's.
const bests = { classic: loadBest(defaultStorage(), BEST2_KEY), building: loadBest(defaultStorage(), BEST4_KEY) };
const bestKind = () => (tuning.building ? 'building' : 'classic');
let tuning = tuning2.loadTuning(defaultStorage());
let tuningBack = null;

const isAuto = () => window.location.hash === '#auto';
const portrait = () => size.h > size.w;

// ---- Rounds and screens ----

function newRound() {
  held = false;
  round = {
    state: createGame({ seed: Date.now() % 1000000000, config: tuning2.tuningToConfig(tuning) }),
    clock: createClock(),
    auto: isAuto(),
    nextAuto: 0,
    selection: NOTHING,
    feel: createFeel2(),
    tutorial: null,
    intros: null, // device introductions after the tutorial (pass 3 spec 4b.4)
    card: null, // building mode: { id } of the spot whose build card is open (pass 4 spec 3.2)
    callout: '',
    railFirst: 0, // the rail's scroll position (pass 3 spec 2.3)
    railKnown: new Set(), // alarms already costing something, for sending the rail back to the top
    railCompact: false, // whether the rail showed tiles last frame (pass 4 spec 3.5)
    railSwitchedAt: null, // when it last changed between tickets and tiles (ms), to ignore stray taps
    ceoView: createCeoView(), // the CEO's lines, the assistant's trail, shaken bubbles
  };
  // The tutorial is for hall 1 only, and never for the scripted player.
  const cfg = round.state.config;
  // Building mode has its own tutorial (pass 4 M27): the build order, a trip with no backup, growing.
  if (buildingOn(round.state)) {
    if (cfg.tutorial && !round.auto) {
      round.tutorial = createTutorial4(promptVerb());
      round.intros = createIntros();
    } else {
      round.intros = createIntros({ devices: false }); // only the loan line (pass 5 spec 3.2)
    }
  } else if (cfg.tutorial && cfg.startHalls === 1 && !round.auto) {
    round.tutorial = createTutorial(promptVerb());
    round.intros = createIntros();
  }
  if (cam) cam = centreOn(cam, START_POINT.x, START_POINT.y);
  gliding = null;
  window.facops = round; // handy in the browser console; the page never reads it back
}

// Prompts say "Tap" on a touch screen and "Click" with a mouse.
const promptVerb = () => (window.matchMedia?.('(pointer: coarse)').matches ? 'Tap' : 'Click');

// After the first finished run, Skip tutorial turns on by itself (spec 8). Only once: if the player
// turns it off again later, it stays off.
function markTutorialSeen() {
  try {
    const storage = defaultStorage();
    if (!storage || storage.getItem(TUTORIAL_SEEN_KEY)) return;
    storage.setItem(TUTORIAL_SEEN_KEY, '1');
  } catch {
    return; // no storage: the tutorial simply shows again next visit
  }
  if (!tuning.skipTutorial) changeTuning(tuning2.setTuning(tuning, 'skipTutorial', true));
}

function showStart() {
  showOverlay('start', { best: bestText(bests[bestKind()], formatClock) });
}

// Hold and speed (pass 4 spec 3.4). While held nothing moves, but taps still select, assign and
// redirect. Both belong to the screen, not the rules: 2x simply runs two rules steps per step.
let held = false;
let speed = 1;
const speedButtons = () => round && !round.state.config.realtime;

function pressButton(id) {
  if (id === 'hold') held = !held;
  else if (id === 'speed') speed = speed === 1 ? 2 : 1;
  else if (id === 'settings') act(speedButtons() ? 'pause' : 'tuning'); // the gear is the menu when the speed buttons show
  else act('pause');
  draw();
}

function act(action) {
  if (action === 'reset') {
    changeTuning(tuning2.defaultTuning());
    return;
  }
  // The hire and upgrade card (pass 4 M26): buying keeps it open, showing the new cash.
  if (action.startsWith('hire-') || action.startsWith('upgrade-')) {
    if (mode !== 'shop') return;
    if (action.startsWith('hire-')) hire(round.state, action.slice(5));
    else buyUpgrade(round.state, action.slice(8));
    setShop(shopModel(round.state), drawChoice);
    draw();
    return;
  }
  if (action === 'shop') {
    if (mode !== 'playing') return;
    setShop(shopModel(round.state), drawChoice);
  }
  if (action === 'copy') {
    copyResults();
    return;
  }
  if (action.startsWith('pick-')) {
    // Take a card (spec 6), then carry on as Continue does.
    if (round.state.pendingPick) choose(round.state, Number(action.slice(5)));
    action = 'continue';
  }
  // Continue never skips a pick: the rules wait until a card is taken.
  if (action === 'continue' && round.state.pendingPick) return;
  if (action === 'continue' && mode === 'delivery') glideTo(HALLS[round.state.halls].cx, MID_Y, DELIVERY_GLIDE_MS);
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
  const kind = r.building ? 'building' : 'classic';
  const record = recordBest(bests[kind], r);
  bests[kind] = record.best;
  if (record.isNew) saveBest(record.best, defaultStorage(), kind === 'building' ? BEST4_KEY : BEST2_KEY);
  mode = reduceFlow(mode, 'over').mode;
  // When the CEO ended the run, the card carries the CEO's parting line (spec 4.7).
  const panel = resultsPanel(r, record, formatClock);
  if (r.firedByCeo) panel.quote = `“${pickLine(LINES.fire, round.state.seed)}”`;
  setResults(panel);
  showOverlay('over');
  markTutorialSeen();
}

// Runs inside the button's click handler: Safari only allows clipboard writes during a tap.
function copyResults() {
  copyText(resultsText(round.state), { clipboard: navigator.clipboard, selectFallback: selectResultsText })
    .then((outcome) => setCopyLabel(copyLabel(outcome)));
}

// ---- Layout and camera ----

// The crew bar holds the techs and, in building mode, the Hire card (pass 4 M26).
const crewCount = () => round.state.techs.length + (buildingOn(round.state) ? 1 : 0);
const columnsNow = () => crewColumns(size.h, crewCount());
// Pass 3: the overview strip takes 30 px off the bottom of the map region (spec 3.2).
const layout = () => regions3(size.w, size.h, { crewColumns: columnsNow() });

// The zoom is pass 1's on this screen (one crew column); a second crew column only narrows the view.
function syncCamera() {
  const rect = layout().map;
  const scale = passOneScale(regions(size.w, size.h).map);
  if (!cam) {
    cam = createCamera(rect, scale, SITE, START_POINT);
    return;
  }
  const same = cam.rect.x === rect.x && cam.rect.w === rect.w && cam.rect.h === rect.h && cam.scale === scale;
  if (!same) {
    // Keep the same world point in the middle of the view.
    const mid = { x: cam.x + cam.rect.w / cam.scale / 2, y: cam.y + cam.rect.h / cam.scale / 2 };
    cam = centreOn(createCamera(rect, scale, SITE), mid.x, mid.y);
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

function glideTo(x, y, ms = GLIDE_MS) {
  gliding = { from: cam, to: centreOn(cam, x, y), start: performance.now(), ms };
}

// A hire card shows the trade's tech; an upgrade card its picture.
function drawChoice(ctx, size, c) {
  if (c.kind === 'hire') drawTech(ctx, size / 2, size / 2 + 2, size * 0.95, c.trade);
  else drawUpgrade(ctx, size / 2, size / 2, size, c.upgrade);
}

// A hall came online: the scripted player just carries on (glide only); a player gets the card.
function onDelivery(card) {
  if (round.auto) {
    glideTo(HALLS[card.hall].cx, MID_Y, DELIVERY_GLIDE_MS);
    return;
  }
  mode = reduceFlow(mode, 'delivery').mode;
  setDelivery(card, drawChoice);
  showOverlay('delivery');
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
  const cv = round.ceoView;
  const ceoFx = { assistant: assistantAt(cv.trail), say: liveSay(cv, s.t), sayAt: cv.lastAt, shakes: liveShakes(cv, s.t) };
  markers = drawMap2(ctx, cam, size, s, { alarmId, techId }, { floats: liveFloats(round.feel, s.t), celebrations: liveCelebrations(round.feel, s.t), ceo: ceoFx });
  // The CEO's banner across the top of the map (pass 3 spec 4.7): one line when the map is narrow.
  drawBanner(ctx, cam.rect, bannerModel(s, cam.rect.w < 560));
  for (const m of markers) if (m.ceo) drawCeoMarker(ctx, m); // never hidden by the banner
  const open = openCard();
  if (open) drawBuildCard(ctx, open.layout, open.info);
  drawStrip(ctx, regs.strip, stripModel(s, regs.strip, cam));
  drawCeoOnStrip(ctx, s, (x) => stripX(regs.strip, x), (y) => stripY(regs.strip, y));
  const hireCard = buildingOn(s);
  drawCrewBar(ctx, crewCards(s, regs.crew, techId, { columns: columnsNow(), hire: hireCard, alarmType: alarmId !== null ? s.alarms.find((a) => a.id === alarmId)?.type : null }).map((c) => (c.kind === 'hire' ? { ...c, ...hireCardText(s) } : c)));
  const rail = railTickets2(s, regs.rail, alarmId, round.railFirst, round.railCompact);
  round.railFirst = rail.first;
  if (rail.compact !== round.railCompact) round.railSwitchedAt = performance.now();
  round.railCompact = rail.compact;
  drawRail2(ctx, rail);
  if (round.callout) {
    // Keep the callout away from the alarms the lesson is about.
    const v = cameraView(cam);
    const lesson = (t) => (t.building ? lessonAlarms4(t) : lessonAlarms(t));
    const ids = round.tutorial && !round.tutorial.done ? lesson(round.tutorial) : round.intros?.ids ?? [];
    const ys = ids
      .map((id) => s.alarms.find((a) => a.id === id))
      .filter(Boolean)
      .map((a) => v.oy + EQUIPMENT_BY_ID[a.equipId].y * v.scale);
    drawCallout(ctx, cam.rect, round.callout, ys);
  }
  const model = hudModel2(s, { auto: round.auto });
  const notes = held ? ['Held: tap ▶ to carry on', 'Held'] : [model.note, model.noteShort, model.noteShorter].filter(Boolean);
  drawHud(ctx, w, hudLayout(w, { speedButtons: speedButtons() }), model, notes, { held, speed });
  drawHudFlash(ctx, w, HUD_HEIGHT, flashAlpha(round.feel, s.t));
}

function frame(now) {
  const { state } = round;
  const paused = mode !== 'playing' || document.hidden || portrait() || state.over || held;
  runFrame(round.clock, now, (dt) => {
    // #auto takes the first card; a player chooses on the Delivery card (step waits until then).
    if (round.auto && state.pendingPick) choose(state, pickFor(state, 'first'));
    for (let k = 0; k < speed && !state.over; k++) step(state, dt);
    if (round.auto && state.t >= round.nextAuto && greedyMove(state, { reaction: 1 })) round.nextAuto = state.t + AUTO_GAP;
    // #auto in building mode also builds, compute first (the scripted builder, src/core/builder.js).
    if (round.auto && buildingOn(state) && state.t >= (round.nextBuild ?? 0)) {
      buildMove(state, 'builder');
      round.nextBuild = state.t + 1;
    }
  }, paused);
  const events = state.events.splice(0); // drained every frame so the list never grows
  feelEvents2(round.feel, events, state);
  ceoEvents(round.ceoView, events, state, round.feel);
  trackCeo(round.ceoView, state);
  if (round.tutorial && mode === 'playing') {
    round.callout = round.tutorial.building ? updateTutorial4(round.tutorial, state, events) : updateTutorial(round.tutorial, state, events);
    // Once the tutorial is over, the first rack-row and pump alarms are introduced by name.
    if (round.tutorial.done && round.intros) round.callout = updateIntros(round.intros, state);
    if (round.tutorial.focus) {
      const e = EQUIPMENT_BY_ID[round.tutorial.focus];
      round.tutorial.focus = null;
      if (!isVisible(cam, e.x, e.y, 40)) glideTo(e.x, e.y, 600);
    }
  }
  if (!round.tutorial && round.intros && mode === 'playing') round.callout = updateIntros(round.intros, state);
  // A build card closes once its spot is no longer empty.
  if (round.card && spotState(state, round.card.id) !== 'empty') round.card = null;
  const card = deliveryCard(state, events);
  if (card && mode === 'playing') onDelivery(card);
  if (state.over && mode === 'playing') roundOver();
  round.selection = pruneSelection(round.selection, state);
  if (!railGesture) {
    const top = autoTop(state, layout().rail, round.railFirst, round.railKnown, round.railCompact);
    round.railFirst = top.first;
    round.railKnown = top.known;
  }
  if (gliding) {
    const k = Math.min(1, (now - gliding.start) / gliding.ms);
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
  if (result.assign) {
    const sent = assign(round.state, result.assign.techId, result.assign.alarmId);
    // Electricians only for a short or an RMU fault: keep the alarm selected and say why.
    const refused = refusedTap(round.state, result.assign, sent);
    if (refused) {
      round.selection = refused.selection;
      if (refused.float) round.feel.floats.push(refused.float);
    }
  }
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
  const regs = layout();
  const targets = railTargets2(round.state, regs, columnsNow(), round.railFirst, round.railCompact);
  // A rail that overflows scrolls with a drag, so its tickets and chips act when the finger lifts
  // (pass 3 spec 2.3). Otherwise HUD buttons, crew cards and tickets act at finger-down, as in pass 1.
  const onRail = p.x >= regs.rail.x && p.y >= regs.rail.y && !hitTest(p, { buttons: targets.buttons }).id;
  if (onRail && targets.scrolls) {
    railGesture = { start: p, startFirst: round.railFirst, dragging: false };
    canvas.setPointerCapture?.(e.pointerId);
    return;
  }
  const hit = hitTest(p, targets);
  if (hit.kind === 'button') {
    pressButton(hit.id);
    return;
  }
  if (hit.kind === 'tech' && hit.id === 'hire') {
    act('shop');
    return;
  }
  if (onRail && !railTapCounts(round.railSwitchedAt, performance.now())) return; // the rail just changed under the finger
  if (hit.kind !== 'empty') {
    applyTap(hit);
    revealFor(hit);
    return;
  }
  if (inStripTarget(regs.strip, p)) {
    // The strip wins over the bottom of the map: tap or drag on it to move the view (spec 3.2).
    stripGesture = true;
    canvas.setPointerCapture?.(e.pointerId);
    lookAtStrip(p);
    return;
  }
  if (inMap(p)) {
    gesture = startGesture(p);
    canvas.setPointerCapture?.(e.pointerId);
  } else {
    applyTap(hit); // a tap in the gaps between the rails clears the selection
  }
}

// Centre the view on the building point under p on the strip, keeping the view's height.
function lookAtStrip(p) {
  const midY = cam.y + cam.rect.h / cam.scale / 2;
  gliding = null;
  cam = centreOn(cam, worldXAt(layout().strip, p.x), midY);
}

function onMove(e) {
  if (stripGesture) {
    lookAtStrip(point(e));
    return;
  }
  if (railGesture) {
    const p = point(e);
    const dy = railGesture.start.y - p.y; // finger up moves further down the list
    if (!railGesture.dragging && Math.abs(dy) > DRAG_PX) railGesture.dragging = true;
    if (railGesture.dragging) round.railFirst = scrollByDrag(railGesture.startFirst, dy, layout().rail.h, round.state.alarms.length, round.railCompact);
    return;
  }
  if (!gesture) return;
  const r = moveGesture(gesture, point(e));
  gesture = r.gesture;
  if (r.pan) pan(r.pan.dx, r.pan.dy);
}

function onRailUp(e) {
  const g = railGesture;
  railGesture = null;
  if (e.type === 'pointercancel' || g.dragging || !canPlay()) return;
  const targets = railTargets2(round.state, layout(), columnsNow(), round.railFirst, round.railCompact);
  if (!railTapCounts(round.railSwitchedAt, performance.now())) return; // the rail just changed under the finger
  const hit = hitTest(g.start, { tickets: targets.tickets });
  applyTap(hit); // a ticket, or the gap between tickets (clears the selection)
  if (hit.kind !== 'empty') revealFor(hit);
}

// The open build card's layout and contents, or null (pass 4 spec 3.2).
function openCard() {
  if (!round.card) return null;
  const e = EQUIPMENT_BY_ID[round.card.id];
  const v = cameraView(cam);
  const layout = cardLayout(cam.rect, v.ox + e.x * v.scale, v.oy + e.y * v.scale);
  return { layout, info: spotInfo(round.state, round.card.id) };
}

const inside = (p, r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;

function buildSpot(id) {
  if (build(round.state, id).ok) round.card = null; // the card stays open, saying what is missing, when it cannot
}

// A tap on the map in building mode: the build card's button, the card itself, or an empty spot.
// Returns true when the tap was used. Alarms and techs win over spots (pass 4 spec 3.1).
function buildingTap(tap) {
  if (!buildingOn(round.state)) return false;
  const open = openCard();
  if (open && inside(tap, open.layout.button)) {
    buildSpot(round.card.id);
    return true;
  }
  if (open && inside(tap, open.layout)) return true;
  const hit = hitTest(tap, mapTargets2(round.state, cam));
  const spot = hit.kind === 'empty' ? spotAt(round.state, cam, tap) : null;
  if (!spot) {
    round.card = null;
    return false;
  }
  if (round.card && round.card.id === spot.id) buildSpot(spot.id); // a second tap on the spot confirms
  else round.card = { id: spot.id };
  round.selection = NOTHING;
  return true;
}

function onUp(e) {
  if (stripGesture) {
    stripGesture = false;
    return;
  }
  if (railGesture) {
    onRailUp(e);
    return;
  }
  if (!gesture) return;
  const tap = endGesture(gesture);
  gesture = null;
  if (e.type === 'pointercancel' || !tap || !canPlay()) return;
  if (buildingTap(tap)) return;
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
    if (speedButtons() && mode === 'playing') pressButton('hold');
    else act('togglePause');
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
