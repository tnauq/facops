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

import { BUILDING, EQUIPMENT_BY_ID, HALLS, MID_Y, START_POINT, WORLD, assign, build, buildingOn, buyUpgrade, finishOn, hire, spotState, choose, createGame, dispatch, formatClock, getTech, greedyMove, pickFor, results, resultsText, sell, step } from './core/index2.js';
import { drawFocusFrame, drawPulse } from './render/focus.js';
import { COMMISSION_CARD_DELAY, commissionedCard, sellButton, sellConfirm } from './ui/sale.js';
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
import { createTutorial4, hireCardOpened, lessonAlarms4, updateTutorial4 } from './ui/tutorial4.js';
import { closeFirst, createFirsts, markFirst, updateFirsts } from './ui/firsts.js';
import { livePulses, openingModel, updateOpening } from './ui/opening.js';
import { cardLayout, spotAt, spotInfo } from './ui/spots.js';
import { hireCardText, shopModel } from './ui/shop.js';
import { drawBuildCard, drawDevicePicture, drawInspectCard } from './render/spots.js';
import { deviceAt, inspectInfo } from './ui/inspect.js';
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
import { BEST2_KEY, BEST4_KEY, BEST5_KEY, bestText, buildingBestText, defaultStorage, loadBest, recordBest, saveBest } from './ui/best.js';
import { tuning2 } from './ui/tuning2.js';
import { buildingSite, centreOn, createCamera, glide, isVisible, panBy, passOneScale, visibleSize } from './ui/camera.js';
import { endGesture, moveGesture, startGesture } from './ui/drag.js';
import { inStripTarget, regions3, stripModel, stripX, stripY, worldXAt } from './ui/strip.js';
import { markerAt } from './ui/offmap.js';
import { advisorLabel, advisorSpot } from './ui/advisor.js';
import { drawAdvisor } from './render/advisor.js';
import { bundleCard, buyBundle, hallNameAt, piecesText } from './ui/bundles.js';
import { setBundles, setHowTo, setLedger, setPerk, setPromises, setRescue } from './render/overlays.js';
import { loadKnown, mergeKnown, referenceEntry, referenceList, saveKnown } from './ui/reference.js';
import { callOpen, choosePerk, closeCall, takeFunding } from './core/index2.js';
import { perkCard, rescueCard, warrantyHalls } from './ui/perksView.js';
import { fannedCrew } from './ui/crew.js';
import { loadRecords, recordRun, recordsLine, recordsText, saveRecords } from './ui/records.js';
import { winCard } from './ui/finishView.js';
import { endEndurance, enduranceOn, inEndurance, startEndurance } from './core/index2.js';
import { layerModel, layersTarget, nextLayer, stripWithLayers } from './ui/layers.js';
import { drawLayer, drawLayersButton } from './render/layers.js';
import { cancelPromise, takePromise } from './core/index2.js';
import { promisesCard, promisesLine } from './ui/promisesView.js';
import { postTech, postsOn, setPriority } from './core/index2.js';
import { areaAtStrip, flagTarget, postFor, stripPins, stripWithFlag } from './ui/postsView.js';
import { drawPostsOnStrip } from './render/posts.js';
import { sendToWarning } from './core/index2.js';
import { stripWrenches, warningAt, warningMarks } from './ui/warningsView.js';
import { drawStripWrenches, drawWarnings } from './render/warnings.js';
import { ledger } from './ui/ledger.js';
import { partingLine, soFarLines, soFarText } from './ui/runOver.js';
import { OLD_SAVE_TEXT, SAVE_EVERY, clearSave, readSave, restoreRun, resumeLabel, writeSave } from './ui/savedRun.js';

const SITE = buildingSite(BUILDING); // the building and the ground round it (pass 3 spec 4b.3); pass 6: wall to wall

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
let mode = 'menu'; // see src/ui/flow.js
// Building mode keeps its own best, in money (pass 4 M27); the classic game keeps pass 2's.
// Pass 5 (M34): building mode's best is the new score, under its own key; pass 4's best stays as it
// was and shows, labelled, until a pass 5 run sets one.
const bests = { classic: loadBest(defaultStorage(), BEST2_KEY), building: loadBest(defaultStorage(), BEST5_KEY) };
const olderBest = loadBest(defaultStorage(), BEST4_KEY);
let known = loadKnown(defaultStorage()); // pass 10 (M62): every first this device has been shown
// Pass 9 (M54): the fastest win and the high score, for runs with the win at the finish.
let records = loadRecords(defaultStorage());
const bestKind = () => (tuning.building ? 'building' : 'classic');
let tuning = tuning2.loadTuning(defaultStorage());
let tuningBack = null;
let settingsBack = null; // the card Settings returns to (pass 6 M37)
let saved = { status: 'none' }; // pass 7 (M44): what the main menu found saved
let pendingStart = 'start'; // what Start over does: 'start' or 'tutorial'
let lastSave = 0; // performance.now() of the last save

const isAuto = () => window.location.hash === '#auto';
const portrait = () => size.h > size.w;

// ---- Rounds and screens ----

function newRound({ tutorial = false, restored = null } = {}) {
  held = false;
  const config = tuning2.tuningToConfig(tuning);
  if (tutorial) config.tutorial = true; // the saved Skip tutorial switch is left as it is
  round = {
    state: restored ? restored.state : createGame({ seed: Date.now() % 1000000000, config }),
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
    inspect: null, // pass 5: { id } of the built device whose inspect card is open (spec 7.1)
    commissionCardAt: null, // pass 5: game time the Commissioned card opens, after the celebration
    bundleHall: null, // pass 7 (M43): the hall whose bundles card is open
    firstRun: isFirstRun(), // pass 7 (M43): the advisor mark shows by itself in a player's first run
  };
  lastSave = performance.now();
  if (restored) {
    // Pass 7 (M44): a resumed run gets its lesson and introductions back, and starts held so the
    // player can look before anything moves, whatever Real-time mode says.
    round.tutorial = restored.tutorial;
    round.firsts = restored.firsts ?? null; // pass 10 (M59)
    round.intros = restored.intros ?? createIntros({ devices: false, bundles: true });
    round.firstRun = restored.firstRun;
    held = true;
    if (cam) cam = centreOn(cam, START_POINT.x, START_POINT.y);
    gliding = null;
    window.facops = round;
    return;
  }
  // The tutorial is for hall 1 only, and never for the scripted player.
  const cfg = round.state.config;
  // Building mode has its own tutorial (pass 4 M27): the build order, a trip with no backup, growing.
  if (buildingOn(round.state)) {
    if (cfg.tutorial && !round.auto) {
      // Pass 10 (M59): the first run plays as normal and stops for each first; the introductions
      // keep only the lines that report the run. (Pass 4's script, createTutorial4, is retired.)
      round.firsts = createFirsts();
      round.intros = createIntros({ devices: false, bundles: false, notices: true });
    } else {
      // Pass 10 (M62): a run after the first keeps only the lines that report the run (question 6).
      round.intros = createIntros({ devices: false, bundles: false, notices: 'later' });
    }
  } else if (cfg.tutorial && cfg.startHalls === 1 && !round.auto) {
    round.tutorial = createTutorial(promptVerb());
    round.intros = createIntros();
  }
  if (cam) cam = centreOn(cam, START_POINT.x, START_POINT.y);
  gliding = null;
  window.facops = round; // handy in the browser console; the page never reads it back
}

// Pass 7 (M43): a first run is one before any building run has finished (no best, Skip tutorial
// not yet turned on by a finished run).
function isFirstRun() {
  if (bests.building || olderBest || records.high) return false;
  try {
    return !defaultStorage()?.getItem(TUTORIAL_SEEN_KEY);
  } catch {
    return true;
  }
}

// The advisor mark's spot now, or null (pass 7 spec 4.2).
function advisorNow() {
  if (!round || round.auto) return null;
  const cardOpen = Boolean(round.card || round.inspect) || mode !== 'playing';
  return advisorSpot(round.state, { firstRun: round.firstRun, setting: Boolean(tuning.advisorMark), cardOpen, shown: opening().spot });
}

// The bundles card for the hall it was opened on (pass 7 spec 4.2).
function showBundles() {
  setBundles(bundleCard(round.state, round.bundleHall), (b) => piecesText(round.state, b));
  showOverlay('bundles');
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

// The menu (pass 5 spec 5.2): after the Handover it offers the sale, greyed with the reason when it
// cannot be done now.
function showPaused() {
  let b = round ? sellButton(round.state) : null;
  const row = document.getElementById('sell-row');
  const button = document.getElementById('sell-button');
  const why = document.querySelector('[data-overlay="paused"] [data-field="sellWhy"]');
  // Pass 9 (M56): in endurance the sale's place holds End endurance.
  if (round && inEndurance(round.state)) {
    row.hidden = false;
    why.hidden = true;
    button.textContent = 'End endurance';
    button.disabled = false;
    button.dataset.action = 'endEndurance';
    showOverlay('paused');
    return;
  }
  button.dataset.action = 'sellAsk';
  // Pass 10 (M61): a first run offers Sell early only from the Handover, when its card explains it.
  if (!opening().sellEarly) b = null;
  row.hidden = !b;
  why.hidden = !b || b.enabled;
  if (b) {
    button.textContent = b.label;
    button.disabled = !b.enabled;
    why.textContent = b.why;
  }
  showOverlay('paused');
}

// The Commissioned card (spec 5.2): it waits for the player. The run is paused while it shows.
function showCommissioned() {
  const card = commissionedCard(round.state);
  mode = reduceFlow(mode, 'commissioned').mode;
  showOverlay('commissioned', { title: card.title, quote: card.quote, price: card.price, sell: card.sell });
  document.querySelector('[data-overlay="commissioned"] [data-action="sell"]').disabled = !card.enabled;
}

// Pass 10 (M59): a first's card. The camera goes to what it is about, which stays ringed; the card sits
// at the top or bottom of the screen, whichever is clear of it.
function lookAt(target) {
  const e = target && EQUIPMENT_BY_ID[target];
  if (e && !isVisible(cam, e.x, e.y, 60)) glideTo(e.x, e.y, 600);
}

function showLesson(card) {
  mode = reduceFlow(mode, 'lesson').mode;
  round.lessonTarget = EQUIPMENT_BY_ID[card.target] ? card.target : null;
  const e = round.lessonTarget && EQUIPMENT_BY_ID[round.lessonTarget];
  // With a subject, the camera puts it in the upper part of the map and the card sits at the bottom;
  // without one, the card sits at the top, clear of the middle of the map.
  if (e) glideTo(e.x, e.y + visibleSize(cam).h * 0.2, 600);
  const el = document.querySelector('[data-overlay="lesson"]');
  el.classList.toggle('at-top', !e);
  el.classList.toggle('at-bottom', Boolean(e));
  showOverlay('lesson', { title: card.title, text: card.text });
  rememberFirst(card.id); // pass 10 (M62)
  round.selection = NOTHING;
}

// The win card (pass 9 spec 3.2): the finish time, the score, the CEO's line. The game is over.
function showWon() {
  if (!round.auto) clearSave(defaultStorage());
  mode = reduceFlow(mode, 'won').mode;
  showOverlay('won', winCard(results(round.state), formatClock));
  document.getElementById('endurance-button').hidden = !enduranceOn(round.state); // pass 9 (M56)
}

// The main menu (pass 6 spec 2.1): the best score and its milestone under the buttons. Pass 7 (M44):
// Resume run first when a run is saved, with New run second; a save from an older build is dropped
// and the menu says so, once.
function showMenu() {
  const kind = bestKind();
  saved = readSave(defaultStorage());
  const resume = document.getElementById('resume-button');
  resume.hidden = saved.status !== 'ok';
  if (saved.status === 'ok') resume.textContent = resumeLabel(saved.save);
  document.getElementById('start-button').classList.toggle('primary', saved.status !== 'ok');
  const note = document.querySelector('[data-field="saveNote"]');
  note.hidden = saved.status !== 'old';
  // Pass 9 (M54): the fastest win and the high score, once there are any; else the older bests.
  const buildingBest = recordsText(records, formatClock) ?? buildingBestText(bests.building, olderBest, formatClock);
  showOverlay('menu', { best: kind === 'building' ? buildingBest : bestText(bests.classic, formatClock), saveNote: saved.status === 'old' ? OLD_SAVE_TEXT : '' });
}

// Save the run now (pass 7 spec 5): building mode, a real run in progress, not the scripted player.
function saveNow() {
  if (!round || round.auto || !buildingOn(round.state) || round.state.over) return;
  if (mode === 'menu' || mode === 'over' || mode === 'startOver') return;
  writeSave(defaultStorage(), round);
  lastSave = performance.now();
}

// Settings (pass 6 spec 2.2): Classic mode is the drawer's Building mode switch, the other way round.
function showSettings() {
  document.getElementById('classic-switch').checked = !tuning.building;
  document.getElementById('advisor-switch').checked = Boolean(tuning.advisorMark);
  showOverlay('settings');
}

// Hold and speed (pass 4 spec 3.4). While held nothing moves, but taps still select, assign and
// redirect. Both belong to the screen, not the rules: 2x simply runs two rules steps per step.
let held = false;
let speed = 1;
// Pass 7 (M44): a resumed run starts held even in Real-time mode, so the buttons show until it carries on.
const speedButtons = () => round && (!round.state.config.realtime || held);

function pressButton(id) {
  if (id === 'hold') held = !held;
  else if (id === 'speed') speed = speed === 1 ? 2 : 1;
  else if (id === 'settings') act('pause');
  else if (id === 'cash') act('ledger'); // pass 7 (M45): the cash opens the ledger
  else if (id === 'promises') act('promises'); // pass 8 (M49): the note opens the CEO's promises // the gear opens the pause menu, which has Settings (pass 6 M37)
  else act('pause');
  draw();
}

// Pass 10 (M62): a first was shown; How it works keeps it, across runs.
function rememberFirst(id) {
  const more = id ? mergeKnown(known, [id]) : null;
  if (!more) return;
  known = more;
  saveKnown(defaultStorage(), known);
}

// How it works (pass 10 M62): the list, or one entry opened (round.howtoEntry).
function showHowTo() {
  const entry = round.howtoEntry ? referenceEntry(round.howtoEntry, round.state) : null;
  setHowTo(referenceList(known), entry, (ctx, size, picture) => {
    if (picture === 'tech') drawTech(ctx, size / 2, size / 2 + 2, size * 0.9, 'elec');
    else drawDevicePicture(ctx, picture, size / 2, size / 2, size * 0.8);
  });
  showOverlay('howto');
}

function act(action) {
  // Pass 10 (M62): How it works, from the pause menu. Back closes an open entry first.
  if (action === 'howto' || action === 'howtoBack' || action.startsWith('howto-')) {
    if (action === 'howto') {
      if (mode !== 'paused') return;
      mode = reduceFlow(mode, 'howto').mode;
      round.howtoEntry = null;
    } else if (mode !== 'howto') return;
    else if (action === 'howtoBack') {
      if (!round.howtoEntry) {
        act('back');
        return;
      }
      round.howtoEntry = null;
    } else round.howtoEntry = action.slice(6);
    showHowTo();
    return;
  }
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
  // Pass 5 (spec 5.2): hand over the keys, from the confirm card or the Commissioned card.
  if (action === 'sell') {
    if (mode !== 'sell' && mode !== 'commissioned') return;
    if (sell(round.state).ok) roundOver();
    return;
  }
  // Pass 7 (M43): buy a bundle from the bundles card, all or nothing; the card closes once bought.
  if (action.startsWith('bundle-')) {
    if (mode !== 'bundles') return;
    const b = bundleCard(round.state, round.bundleHall).bundles.find((x) => x.key === action.slice(7));
    if (buyBundle(round.state, b).ok) act('continue');
    else showBundles();
    return;
  }
  // Pass 8 (M51): the pick of two. The Warranty asks for a hall first; taking a perk closes the card.
  if (action.startsWith('perk-')) {
    if (mode !== 'perk') return;
    if (action === 'perk-take-warranty') setPerk(perkCard(round.state), warrantyHalls(round.state));
    else if (action === 'perk-back') setPerk(perkCard(round.state), null);
    else {
      const hall = action.startsWith('perk-hall-') ? Number(action.slice(10)) : undefined;
      if (choosePerk(round.state, hall === undefined ? action.slice(10) : 'warranty', hall).ok) act('continue');
    }
    return;
  }
  // Pass 8 (M51): the CEO's call. Every way out hangs up, so the red countdown starts from then.
  if (action.startsWith('rescue-')) {
    if (mode !== 'rescue') return;
    if (action === 'rescue-fund') takeFunding(round.state);
    closeCall(round.state);
    act(action === 'rescue-offers' ? 'promises' : action === 'rescue-sell' ? 'sellAsk' : 'continue');
    return;
  }
  // Pass 8 (M49): the promises card; accepting or cancelling keeps it open, showing the change.
  if (action.startsWith('promise-')) {
    if (mode !== 'promises') return;
    const id = Number(action.split('-').pop());
    if (action.startsWith('promise-take-')) takePromise(round.state, id);
    else cancelPromise(round.state, id);
    setPromises(promisesCard(round.state));
    draw();
    return;
  }
  if (action === 'promises') {
    if (mode !== 'playing' && mode !== 'rescue') return;
    mode = reduceFlow(mode, 'promises').mode;
    setPromises(promisesCard(round.state));
    showOverlay('promises');
    round.selection = NOTHING;
    draw();
    return;
  }
  if (action === 'gotIt') {
    if (mode !== 'lesson') return;
    closeFirst(round.firsts, round.state);
    round.lessonTarget = null;
    mode = reduceFlow(mode, 'continue').mode;
    showOverlay('playing');
    draw();
    return;
  }
  if (action === 'results') {
    if (mode !== 'won') return;
    roundOver();
    return;
  }
  // Pass 9 (M56): play on into endurance from the win card; end it from the pause menu.
  if (action === 'endurance') {
    if (mode !== 'won' || !startEndurance(round.state).ok) return;
    mode = reduceFlow(mode, 'endurance').mode;
    showOverlay('playing');
    lastSave = 0; // save the endurance run soon
    draw();
    return;
  }
  if (action === 'endEndurance') {
    if (mode !== 'paused' || !endEndurance(round.state).ok) return;
    mode = reduceFlow(mode, 'resume').mode;
    roundOver();
    return;
  }
  if (action === 'ledger') {
    if (mode !== 'playing' || !buildingOn(round.state)) return;
    mode = reduceFlow(mode, 'ledger').mode;
    setLedger(ledger(round.state));
    showOverlay('ledger');
    round.selection = NOTHING;
    draw();
    return;
  }
  if (action === 'bundles') {
    if (mode !== 'playing' || round.bundleHall === null) return;
    mode = reduceFlow(mode, 'bundles').mode;
    showBundles();
    round.selection = NOTHING;
    draw();
    return;
  }
  if (action === 'shop') {
    if (mode !== 'playing') return;
    setShop(shopModel(round.state), drawChoice);
    if (round.tutorial && round.tutorial.building) hireCardOpened(round.tutorial); // the roles lesson moves on
  }
  if (action === 'copy') {
    copyResults();
    return;
  }
  // Pass 7 (M44): with a run saved, New run and Tutorial ask first; Start over then does what was asked.
  if ((action === 'start' || action === 'tutorial') && mode === 'menu' && saved.status === 'ok') {
    pendingStart = action;
    action = 'startAsk';
  }
  if (action === 'startConfirm') {
    if (mode !== 'startOver') return;
    action = pendingStart;
  }
  if (action === 'resume') {
    if (mode !== 'menu' || saved.status !== 'ok') return;
    const restored = restoreRun(saved.save);
    if (!restored) {
      clearSave(defaultStorage());
      showMenu();
      return;
    }
    newRound({ restored });
  }
  if (action.startsWith('pick-')) {
    // Take a card (spec 6), then carry on as Continue does.
    if (round.state.pendingPick) choose(round.state, Number(action.slice(5)));
    action = 'continue';
  }
  // Continue never skips a pick: the rules wait until a card is taken.
  if (action === 'continue' && round.state.pendingPick) return;
  if (action === 'continue' && mode === 'delivery') glideTo(HALLS[round.state.halls].cx, MID_Y, DELIVERY_GLIDE_MS);
  const next = reduceFlow(mode, action, tuningBack, settingsBack);
  if (next.back) tuningBack = next.back;
  if (next.settingsBack) settingsBack = next.settingsBack;
  // Tutorial (pass 6 spec 2.2): a run with the lessons on, whatever Skip tutorial says.
  // A new run replaces any saved one (pass 7 M44: one run at a time).
  if (next.newRound) {
    clearSave(defaultStorage());
    newRound({ tutorial: action === 'tutorial' });
  }
  mode = next.mode;
  if (mode === 'menu') showMenu();
  else if (mode === 'settings') showSettings();
  else if (mode === 'over') showOverlay('over');
  else if (mode === 'paused') showPaused();
  else if (mode === 'sell') showOverlay('sell', sellConfirm(round.state));
  else if (mode === 'tuning') {
    setTuningControls(tuning, tuning2.tuningLabel);
    showOverlay('tuning');
  } else showOverlay(mode);
  markMenuBackdrop();
  round.selection = NOTHING;
  draw();
}

// Pass 6 (M37): Settings and the drawer reached from the main menu keep the blueprint behind them.
function markMenuBackdrop() {
  const fromMenu = mode === 'menu' || mode === 'startOver' || (mode === 'settings' && settingsBack === 'menu') || (mode === 'tuning' && tuningBack === 'settings' && settingsBack === 'menu');
  document.getElementById('overlay').classList.toggle('bp-backdrop', fromMenu);
}

function changeTuning(values) {
  tuning = values;
  tuning2.saveTuning(tuning, defaultStorage());
  setTuningControls(tuning, tuning2.tuningLabel);
}

function roundOver() {
  if (!round.auto) clearSave(defaultStorage()); // pass 7 (M44): a finished run clears the save
  const r = results(round.state);
  const kind = r.building ? 'building' : 'classic';
  let record;
  let recordText = null;
  if (r.building && r.finish) {
    // Pass 9 (M54): the fastest win and the high score replace the single best.
    const rec = recordRun(records, r);
    records = rec.records;
    if (!round.auto && (rec.newHigh || rec.newFastest || rec.newLevel)) saveRecords(records, defaultStorage());
    recordText = recordsLine(rec, formatClock);
    record = { best: { energyGwh: r.energyGwh, seconds: r.seconds, score: r.score }, isNew: false };
  } else {
    record = recordBest(bests[kind], r);
    bests[kind] = record.best;
    if (record.isNew) saveBest(record.best, defaultStorage(), kind === 'building' ? BEST5_KEY : BEST2_KEY);
  }
  mode = reduceFlow(mode, 'over').mode;
  // When the CEO ended the run, the card carries the CEO's parting line (spec 4.7).
  const panel = resultsPanel(r, record, formatClock);
  if (recordText !== null) panel.bestLine = recordText;
  if (r.firedByCeo) panel.quote = `“${pickLine(LINES.fire, round.state.seed)}”`;
  // Pass 7 (M45): in building mode the CEO always has a parting line, chosen from the run's own
  // numbers, and the card adds the ledger's run so far.
  if (r.building) {
    panel.quote = `“${partingLine(round.state, r)}”`;
    const promised = promisesLine(round.state); // pass 8 (M49)
    if (promised) panel.lines.push(['Promises', promised]);
    panel.lines.push(...soFarLines(round.state));
  }
  setResults(panel);
  showOverlay('over');
  markTutorialSeen();
}

// Runs inside the button's click handler: Safari only allows clipboard writes during a tap.
function copyResults() {
  const extra = buildingOn(round.state) ? `\n${soFarText(round.state)}` : ''; // pass 7 (M45)
  copyText(resultsText(round.state) + extra, { clipboard: navigator.clipboard, selectFallback: selectResultsText })
    .then((outcome) => setCopyLabel(copyLabel(outcome)));
}

// ---- Layout and camera ----

// Pass 10 (M61): what a first run shows yet (everything, in any other run).
const opening = () => openingModel(round ? round.firsts ?? null : null);
// The crew bar holds the techs and, in building mode, the Hire card (pass 4 M26; M61: once it matters).
const hireShown = () => buildingOn(round.state) && opening().hire;
const crewCount = () => round.state.techs.length + (hireShown() ? 1 : 0);
const columnsNow = () => crewColumns(size.h, crewCount());
// Pass 3: the overview strip takes 30 px off the bottom of the map region (spec 3.2).
// Pass 8 (M46): with posts in play the strip gives up its right end to the priority flag button.
const layout = () => {
  const r = regions3(size.w, size.h, { crewColumns: columnsNow() });
  const open = opening();
  // Pass 10 (M61): until a first run's second hall, there is no strip and the map has its room.
  if (!open.strip) return { ...r, map: regions(size.w, size.h, { crewColumns: columnsNow() }).map, strip: null, layersButton: null };
  // Pass 8 (M52): in building mode the strip also gives up its left end to the Layers button.
  const layers = round && buildingOn(round.state) && open.layers;
  const strip = layers ? stripWithLayers(r.strip) : r.strip;
  return { ...r, strip: flagShown() ? stripWithFlag(strip, true) : strip, layersButton: layers ? layersTarget(r.strip) : null };
};
// The priority flag sits on the strip's right end (pass 8 M46; M61: from a first run's fourth tech).
const flagShown = () => Boolean(round && postsOn(round.state) && opening().flag);

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
  markers = drawMap2(ctx, cam, size, s, { alarmId, techId }, { floats: liveFloats(round.feel, s.t), celebrations: liveCelebrations(round.feel, s.t), ceo: ceoFx, shown: opening().spot });
  // Pass 8 (M52): a layer dims everything outside it; the banner, wrenches and cards stay on top.
  if (round.layer) drawLayer(ctx, cameraView(cam), cam.rect, layerModel(s, round.layer), round.layer, fannedCrew(s.techs, cameraView(cam).scale));
  // The CEO's banner across the top of the map (pass 3 spec 4.7): one line when the map is narrow.
  drawBanner(ctx, cam.rect, bannerModel(s, cam.rect.w < 560));
  for (const m of markers) if (m.ceo) drawCeoMarker(ctx, m); // never hidden by the banner
  // Pass 8 (M47): warnings' wrenches, over the map and under the cards.
  drawWarnings(ctx, warningMarks(s, cam), sel.kind === 'warning' ? sel.id : null);
  // Pass 7 (M43): the advisor mark, under the cards; its edge arrow taps like an alarm's.
  // Pass 10 (M59): what a first's card is about stays ringed while the card shows.
  if (round.lessonTarget) drawAdvisor(ctx, cam, round.lessonTarget, performance.now());
  const advise = advisorNow();
  if (advise) {
    const arrow = drawAdvisor(ctx, cam, advise, performance.now(), advisorLabel(s, advise)); // pass 9 (M57): with its words
    if (arrow) markers.push(arrow);
  }
  const open = openCard();
  if (open) drawBuildCard(ctx, open.layout, open.info);
  const look = inspectCard();
  if (look) drawInspectCard(ctx, look.layout, look.info);
  if (regs.strip) {
    drawStrip(ctx, regs.strip, stripModel(s, regs.strip, cam));
    drawStripWrenches(ctx, stripWrenches(s, regs.strip)); // pass 8 (M47)
    if (regs.layersButton) drawLayersButton(ctx, regs.strip, regs.layersButton, round.layer); // pass 8 (M52)
    if (flagShown()) drawPostsOnStrip(ctx, regs.strip, stripPins(s, regs.strip), s.priorityArea, flagTarget(regs.strip), Boolean(round.flagging));
    drawCeoOnStrip(ctx, s, (x) => stripX(regs.strip, x), (y) => stripY(regs.strip, y));
  }
  const hireCard = hireShown();
  const crewFocus = Boolean(round.tutorial && round.tutorial.crewFocus);
  const crew = crewCards(s, regs.crew, techId, { columns: columnsNow(), hire: hireCard, alarmType: alarmId !== null ? s.alarms.find((a) => a.id === alarmId)?.type : null }).map((c) => (c.kind === 'hire' ? { ...c, ...hireCardText(s) } : c));
  drawCrewBar(ctx, crew);
  drawPulses(regs, crew);
  if (crewFocus) drawFocusFrame(ctx, regs.crew, performance.now()); // the roles lesson (pass 5 spec 6.1)
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

// Pass 10 (M61): the pulse on each part of a first run's screen that has just appeared.
function drawPulses(regs, crew) {
  const live = livePulses(round.pulses, performance.now());
  if (!live.length) return;
  const v = cameraView(cam);
  for (const { part, k } of live) {
    let rect = null;
    if (part === 'strip') rect = regs.strip;
    else if (part === 'layers') rect = regs.layersButton;
    else if (part === 'flag' && regs.strip) rect = flagTarget(regs.strip);
    else if (part === 'hire') rect = crew.find((c) => c.kind === 'hire') ?? null;
    else if (part.startsWith('hall-')) {
      // A hall's spots: the hall's floor, on the map (and only there).
      const h = HALLS[Number(part.slice(5))];
      rect = { x: v.ox + h.x * v.scale, y: v.oy + h.y * v.scale, w: h.w * v.scale, h: h.h * v.scale };
      ctx.save();
      ctx.beginPath();
      ctx.rect(cam.rect.x, cam.rect.y, cam.rect.w, cam.rect.h);
      ctx.clip();
      drawPulse(ctx, rect, k);
      ctx.restore();
      continue;
    }
    if (rect) drawPulse(ctx, rect, k);
  }
}

function frame(now) {
  const { state } = round;
  const paused = mode !== 'playing' || document.hidden || portrait() || state.over || held;
  runFrame(round.clock, now, (dt) => {
    // #auto takes the first card; a player chooses on the Delivery card (step waits until then).
    if (round.auto && state.pendingPick) choose(state, pickFor(state, 'first'));
    // Pass 8 (M51): the scripted player takes the first perk (Warranty on Hall 1) and hangs up at once.
    if (round.auto && state.perks?.offer) choosePerk(state, state.perks.offer[0], 1);
    if (round.auto && callOpen(state)) closeCall(state);
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
  // Pass 10 (M59): a first's pause card holds the game; its notes take the callout (one voice).
  if (round.firsts && mode === 'playing' && !state.over) {
    const out = updateFirsts(round.firsts, state, events);
    if (out.pause) showLesson(out.pause);
    else if (out.note) {
      round.callout = out.note;
      rememberFirst(round.firsts.note?.id); // pass 10 (M62)
    }
    if (round.firsts.note && round.firsts.note.target && !round.firsts.noteSeen?.has(round.firsts.note.id)) {
      (round.firsts.noteSeen ??= new Set()).add(round.firsts.note.id);
      lookAt(round.firsts.note.target);
    }
  }
  // Pass 10 (M61): parts of a first run's screen appear as they come to matter, each with a pulse.
  if (mode === 'playing') for (const part of updateOpening(round.firsts ?? null, state)) (round.pulses ??= {})[part] = now;
  // A build card closes once its spot is no longer empty.
  if (round.card && spotState(state, round.card.id) !== 'empty') round.card = null;
  const card = deliveryCard(state, events);
  if (card && mode === 'playing') onDelivery(card);
  // Pass 5: once the halls have lit up, the Commissioned card asks whether to sell (never under #auto).
  // Pass 9 (M54): with the win at the finish, Commissioned brings the last inspection, not this card.
  if (!round.auto && !finishOn(state) && events.some((e) => e.type === 'commissioned')) round.commissionCardAt = state.t + COMMISSION_CARD_DELAY;
  if (round.commissionCardAt !== null && mode === 'playing' && !state.over && state.t >= round.commissionCardAt) {
    round.commissionCardAt = null;
    showCommissioned();
  }
  // Pass 8 (M51): the pick of two after a clean visit, and the CEO's call the first time in the red.
  if (!round.auto && mode === 'playing' && !state.over && state.perks?.offer) {
    mode = reduceFlow(mode, 'perk').mode;
    setPerk(perkCard(state), null);
    showOverlay('perk');
  } else if (!round.auto && mode === 'playing' && !state.over && callOpen(state)) {
    mode = reduceFlow(mode, 'rescue').mode;
    setRescue(rescueCard(state));
    showOverlay('rescue');
  }
  // Pass 9 (M54): a won run shows the win card first; its Results button opens the run-over card.
  if (state.over && mode === 'playing' && state.overReason === 'won' && !round.auto) showWon();
  else if (state.over && mode === 'playing') roundOver();
  else if (now - lastSave >= SAVE_EVERY * 1000) saveNow(); // pass 7 (M44): every 10 s
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
  // Pass 8 (M47): a warning and a tech: send the tech to check it.
  if (result.warn) sendToWarning(round.state, result.warn.techId, result.warn.warnId);
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
  const targets = railTargets2(round.state, regs, columnsNow(), round.railFirst, round.railCompact, { speedButtons: Boolean(speedButtons()), hire: hireShown() });
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
  // Pass 8 (M52): the Layers button steps through none, Power, Cooling, Crew.
  if (regs.layersButton && inside(p, regs.layersButton)) {
    round.layer = nextLayer(round.layer);
    draw();
    return;
  }
  // Pass 8 (M46): the flag button arms the priority area; then a tap on the strip marks (or clears) it.
  if (flagShown() && inside(p, flagTarget(regs.strip))) {
    round.flagging = !round.flagging;
    return;
  }
  if (regs.strip && inStripTarget(regs.strip, p) && flagShown() && (round.flagging || round.selection.kind === 'tech')) {
    const area = areaAtStrip(regs.strip, p.x);
    if (round.flagging) {
      setPriority(round.state, round.state.priorityArea === area ? null : area);
      round.flagging = false;
    } else {
      // A tech selected: post it there, or clear its post if it is posted there already.
      const tech = round.state.techs.find((t) => t.id === round.selection.id);
      if (tech) postTech(round.state, tech.id, postFor(tech, area));
      round.selection = NOTHING;
    }
    return;
  }
  if (regs.strip && inStripTarget(regs.strip, p)) {
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
  const targets = railTargets2(round.state, layout(), columnsNow(), round.railFirst, round.railCompact, { hire: hireShown() });
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

// The open inspect card's layout and contents, or null (pass 5 spec 7.1).
function inspectCard() {
  if (!round.inspect) return null;
  const e = EQUIPMENT_BY_ID[round.inspect.id];
  const v = cameraView(cam);
  return { layout: cardLayout(cam.rect, v.ox + e.x * v.scale, v.oy + e.y * v.scale), info: inspectInfo(round.state, round.inspect.id) };
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
  const look = inspectCard();
  if (look && inside(tap, look.layout)) return true;
  const hit = hitTest(tap, mapTargets2(round.state, cam));
  const spot = hit.kind === 'empty' ? spotAt(round.state, cam, tap, opening().spot) : null;
  round.inspect = null;
  if (!spot) {
    round.card = null;
    // Pass 7 (M43): a hall's name opens its bundles card. Spots, alarms and techs win over it.
    // Pass 10 (M61): not a hall whose spots a first run does not show yet.
    const hall = hit.kind === 'empty' ? hallNameAt(cam, tap) : null;
    if (hall !== null && opening().spot(`row-${hall}-t-0`)) {
      round.bundleHall = hall;
      act('bundles');
      return true;
    }
    // Pass 5 (spec 7.1): a built device opens the inspect card; alarms and techs still win.
    const device = hit.kind === 'empty' ? deviceAt(round.state, cam, tap) : null;
    if (!device) return false;
    round.inspect = { id: device };
    round.selection = NOTHING;
    return true;
  }
  if (round.card && round.card.id === spot.id) buildSpot(spot.id); // a second tap on the spot confirms
  else {
    round.card = { id: spot.id };
    markFirst(round.firsts, 'buildCard'); // pass 10 (M59)
  }
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
  // Pass 8 (M47): a warning's wrench, before spots and devices (it sits over its device).
  const warnHit = warningAt(warningMarks(round.state, cam), tap);
  if (warnHit !== null && hitTest(tap, mapTargets2(round.state, cam)).kind === 'empty') {
    round.card = null;
    round.inspect = null;
    applyTap({ kind: 'warning', id: warnHit });
    return;
  }
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
  mode = isAuto() ? 'playing' : 'menu';
  if (mode === 'menu') showMenu();
  else showOverlay('playing');
}

bindOverlays(act);
// Settings' Classic mode switch (pass 6 spec 2.2): saved like any drawer setting, for the next run.
document.getElementById('classic-switch').addEventListener('change', (e) => changeTuning(tuning2.setTuning(tuning, 'building', !e.target.checked)));
// Pass 7 (M43): the advisor mark all run long; it applies at once.
document.getElementById('advisor-switch').addEventListener('change', (e) => changeTuning(tuning2.setTuning(tuning, 'advisorMark', e.target.checked)));
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
  if (document.hidden) saveNow(); // pass 7 (M44): and whenever the page is hidden
  if (document.hidden && mode === 'playing' && !round.auto) act('pause');
});
window.addEventListener('pagehide', saveNow);
resize();
begin();
syncCamera();
requestAnimationFrame(frame);
window.facopsCam = () => cam; // for checks in the browser console
