// The pass 2 tuning drawer (pass 2 spec, section 9), saved under localStorage['facops.tuning.v2']
// so it never mixes with pass 1's settings. Pass 1's controls carry over except "First alarm
// interval": pass 2 starts each phase from the table in spec 4.7 instead. Then the new controls
// from spec section 9, including Skip tutorial.

import { gameDefaults2 } from '../core/index2.js';
import { createTuning } from './tuning.js';

export const TUNING2_KEY = 'facops.tuning.v2';
// The drawer starts from the game's settings: building mode on (pass 4 M25).
const D = gameDefaults2();

// The burn's numbers sit one level below building, and the config merges only one level, so a change
// to one of them carries the rest of the burn with it (pass 5 spec 3.2).
const setBurn = (o, key, v) => {
  o.building = { ...(o.building ?? {}), burn: { ...D.building.burn, ...(o.building?.burn ?? {}), [key]: v } };
};

// The pumps' numbers sit one level below building too (pass 6 spec 5, M40).
const setPumps = (o, key, v) => {
  o.building = { ...(o.building ?? {}), pumps: { ...D.building.pumps, ...(o.building?.pumps ?? {}), [key]: v } };
};
// Pass 7 (M41): nested settings that must keep their other keys when one changes.
const setNested = (group) => (o, key, v) => {
  o.building = { ...(o.building ?? {}), [group]: { ...D.building[group], ...(o.building?.[group] ?? {}), [key]: v } };
};
const setCredits = setNested('credits');
const setSale = setNested('sale');
const setUptime = setNested('uptime');
const setPosts = setNested('posts');
const setWarnings = setNested('warnings');
const setSpells = setNested('spells');
const setPromises = setNested('promises');
const setSurges = setNested('surges');
const setPerks = setNested('perks');
const setRescue = setNested('rescue');

export const TUNING2_FIELDS = [
  { id: 'tighten', label: 'Tightening per 10 s (%)', kind: 'range', min: 0, max: 10, step: 0.5,
    get: (c) => c.director.tighten * 100, set: (o, v) => { o.director.tighten = v / 100; } },
  { id: 'floor', label: 'Shortest interval (s)', kind: 'range', min: 1, max: 5, step: 0.25,
    get: (c) => c.director.floor, set: (o, v) => { o.director.floor = v; } },
  { id: 'walkSpeed', label: 'Walk speed', kind: 'range', min: 60, max: 240, step: 10,
    get: (c) => c.walkSpeed, set: (o, v) => { o.walkSpeed = v; } },
  { id: 'tradeBonus', label: 'Matching-hat bonus (%)', kind: 'range', min: 0, max: 50, step: 5,
    get: (c) => c.tradeBonus * 100, set: (o, v) => { o.tradeBonus = v / 100; } },
  { id: 'clockScale', label: 'Clock length (x)', kind: 'range', min: 0.5, max: 2, step: 0.1,
    get: (c) => c.clockScale, set: (o, v) => { o.clockScale = v; } },
  { id: 'waves', label: 'Waves', kind: 'toggle',
    get: (c) => c.director.waveEvery > 0, set: (o, v) => { o.director.waveEvery = v ? D.director.waveEvery : 0; } },
  { id: 'oneTap', label: 'One-tap dispatch', kind: 'toggle',
    get: (c) => c.oneTap, set: (o, v) => { o.oneTap = v; } },
  // New in pass 2 (spec section 9).
  { id: 'buildEvery', label: 'Hall build time (s)', kind: 'range', min: 30, max: 180, step: 5,
    get: (c) => c.build.every, set: (o, v) => { o.build = { ...(o.build ?? {}), every: v }; } },
  { id: 'meterFill', label: 'Meter fill per second', kind: 'range', min: 0.5, max: 3, step: 0.25,
    get: (c) => c.meter.fill, set: (o, v) => { o.meter = { ...(o.meter ?? {}), fill: v }; } },
  { id: 'chillersPerHall', label: 'Chillers needed per hall', kind: 'range', min: 0.5, max: 2, step: 0.25,
    get: (c) => c.chillersPerHall, set: (o, v) => { o.chillersPerHall = v; } },
  { id: 'startHalls', label: 'Start with halls', kind: 'range', min: 1, max: 8, step: 1,
    get: (c) => c.startHalls, set: (o, v) => { o.startHalls = v; } },
  // New in pass 3 (spec 4.6).
  { id: 'ceoVisits', label: 'CEO visits', kind: 'toggle',
    get: (c) => c.ceo.enabled, set: (o, v) => { o.ceo = { ...(o.ceo ?? {}), enabled: v }; } },
  { id: 'carryOver', label: 'Tightening kept between halls (%)', kind: 'range', min: 0, max: 100, step: 10,
    get: (c) => c.director.carryOver * 100, set: (o, v) => { o.director.carryOver = v / 100; } },
  { id: 'capGrow', label: 'Extra alarm after full campus every (s, 0 = off)', kind: 'range', min: 0, max: 120, step: 15,
    get: (c) => c.director.capGrowEvery, set: (o, v) => { o.director.capGrowEvery = v; } },
  { id: 'darkDrain', label: 'Drain per dark half-hall', kind: 'range', min: 0, max: 3, step: 0.25,
    get: (c) => c.meter.darkDrain, set: (o, v) => { o.meter = { ...(o.meter ?? {}), darkDrain: v }; } },
  // New in pass 4 (spec 2.6, 3.4).
  { id: 'building', label: 'Building mode (off: the classic game)', kind: 'toggle',
    get: (c) => c.building.enabled, set: (o, v) => { o.building = { ...(o.building ?? {}), enabled: v }; } },
  { id: 'autoDispatch', label: 'Techs pick their own jobs', kind: 'toggle',
    get: (c) => c.autoDispatch.enabled, set: (o, v) => { o.autoDispatch = { ...(o.autoDispatch ?? {}), enabled: v }; } },
  { id: 'realtime', label: 'Real-time mode (no hold or speed buttons)', kind: 'toggle',
    get: (c) => c.realtime, set: (o, v) => { o.realtime = v; } },
  // New in pass 5 (spec 3.2): the construction loan, the site overhead, and pass 4's doubling base.
  { id: 'loan', label: 'Construction loan ($)', kind: 'range', min: 0, max: 4000, step: 100,
    get: (c) => c.building.burn.loan, set: (o, v) => setBurn(o, 'loan', v) },
  { id: 'loanRate', label: 'Loan repaid per second ($)', kind: 'range', min: 1, max: 12, step: 0.5,
    get: (c) => c.building.burn.loanRate, set: (o, v) => setBurn(o, 'loanRate', v) },
  { id: 'siteOverhead', label: 'Site overhead per second ($)', kind: 'range', min: 0, max: 6, step: 0.5,
    get: (c) => c.building.burn.base, set: (o, v) => setBurn(o, 'base', v) },
  { id: 'doubling', label: 'Overhead doubles every (s, 0 = never; pass 4: 150)', kind: 'range', min: 0, max: 300, step: 10,
    get: (c) => c.building.burn.doubling, set: (o, v) => setBurn(o, 'doubling', v) },
  // New in pass 5 (spec 4.1): the CEO's strikes. 1 strike with a $0 fine is pass 3's zero tolerance.
  { id: 'strikes', label: 'CEO strikes before fired (1 = zero tolerance)', kind: 'range', min: 1, max: 6, step: 1,
    get: (c) => c.ceo.strikes, set: (o, v) => { o.ceo = { ...(o.ceo ?? {}), strikes: v }; } },
  { id: 'strikeFine', label: 'Fine per sighting on a strike visit ($)', kind: 'range', min: 0, max: 8000, step: 250,
    get: (c) => c.ceo.strikeFine, set: (o, v) => { o.ceo = { ...(o.ceo ?? {}), strikeFine: v }; } },
  { id: 'capSteps', label: 'Alarm cap +2 at 14:00 and +2 at 17:00', kind: 'toggle',
    get: (c) => (c.building.capSteps ?? []).length > 0, set: (o, v) => { o.building = { ...(o.building ?? {}), capSteps: v ? D.building.capSteps : [] }; } },
  // New in pass 6 (spec 5): what each pump carries.
  { id: 'chillersPerGlycolPump', label: 'Chillers per glycol pump', kind: 'range', min: 1, max: 4, step: 1,
    get: (c) => c.building.pumps.chillersPerGlycolPump, set: (o, v) => setPumps(o, 'chillersPerGlycolPump', v) },
  { id: 'cdusPerGlycolPump', label: 'Coolant units per glycol pump', kind: 'range', min: 1, max: 6, step: 1,
    get: (c) => c.building.pumps.cdusPerGlycolPump, set: (o, v) => setPumps(o, 'cdusPerGlycolPump', v) },
  { id: 'hallsPerWaterPump', label: 'Halls per water pump', kind: 'range', min: 1, max: 8, step: 1,
    get: (c) => c.building.pumps.hallsPerWaterPump, set: (o, v) => setPumps(o, 'hallsPerWaterPump', v) },
  { id: 'noWaterFactor', label: 'Output of a hall without water (%)', kind: 'range', min: 0, max: 100, step: 10,
    get: (c) => c.building.pumps.noWaterFactor * 100, set: (o, v) => setPumps(o, 'noWaterFactor', v / 100) },
  // Pass 7 spec 3 (M41): the three ways out.
  { id: 'creditRate', label: 'Service credits per row short ($/s, 0 = off)', kind: 'range', min: 0, max: 5, step: 0.25,
    get: (c) => c.building.credits.rate, set: (o, v) => setCredits(o, 'rate', v) },
  { id: 'creditDoubling', label: 'Service credits double every (s)', kind: 'range', min: 60, max: 600, step: 5,
    get: (c) => c.building.credits.doubling, set: (o, v) => setCredits(o, 'doubling', v) },
  { id: 'strikeGapMin', label: 'Gap before a strike visit, shortest (s)', kind: 'range', min: 5, max: 60, step: 1,
    get: (c) => c.ceo.strikeGap[0], set: (o, v) => { o.ceo = { ...(o.ceo ?? {}), strikeGap: [v, Math.max(v, (o.ceo?.strikeGap ?? D.ceo.strikeGap)[1])] }; } },
  { id: 'saleIncomeSeconds', label: 'Sale price: seconds of income the buyer pays', kind: 'range', min: 0, max: 600, step: 30,
    get: (c) => c.building.sale.incomeSeconds, set: (o, v) => setSale(o, 'incomeSeconds', v) },
  { id: 'saleAnytime', label: 'Sell during outages and CEO warnings', kind: 'toggle',
    get: (c) => c.building.sale.anytime, set: (o, v) => setSale(o, 'anytime', v) },
  // Pass 7 spec 4.1 (M42).
  { id: 'uptimeOn', label: 'Uptime bonus', kind: 'toggle',
    get: (c) => c.building.uptime.enabled, set: (o, v) => setUptime(o, 'enabled', v) },
  { id: 'uptimeBonus', label: 'Uptime bonus per rack row a minute ($)', kind: 'range', min: 0, max: 120, step: 5,
    get: (c) => c.building.uptime.bonus, set: (o, v) => setUptime(o, 'bonus', v) },
  // Pass 8 spec 3 (M46).
  { id: 'postsOn', label: 'Posts and the priority area', kind: 'toggle',
    get: (c) => c.building.posts.enabled, set: (o, v) => setPosts(o, 'enabled', v) },
  // Pass 8 spec 4 (M47).
  { id: 'warningsOn', label: 'Warnings before failures', kind: 'toggle',
    get: (c) => c.building.warnings.enabled, set: (o, v) => setWarnings(o, 'enabled', v) },
  { id: 'warnFor', label: 'Warning before a failure (s)', kind: 'range', min: 5, max: 30, step: 1,
    get: (c) => c.building.warnings.warnFor, set: (o, v) => setWarnings(o, 'warnFor', v) },
  // Pass 8 spec 5 (M48).
  { id: 'spellsOn', label: 'Busy and quiet spells', kind: 'toggle',
    get: (c) => c.building.spells.enabled, set: (o, v) => setSpells(o, 'enabled', v) },
  { id: 'ceoWaits', label: 'The CEO waits for a quiet spell', kind: 'toggle',
    get: (c) => c.building.spells.ceoWaits, set: (o, v) => setSpells(o, 'ceoWaits', v) },
  // Pass 8 spec 6 (M49).
  { id: 'promisesOn', label: "The CEO's promises", kind: 'toggle',
    get: (c) => c.building.promises.enabled, set: (o, v) => setPromises(o, 'enabled', v) },
  // Pass 8 spec 6.5 (M50).
  { id: 'surgesOn', label: 'Surges', kind: 'toggle',
    get: (c) => c.building.surges.enabled, set: (o, v) => setSurges(o, 'enabled', v) },
  // Pass 9 spec 3 (M54).
  { id: 'finishOn', label: 'Win at the finish', kind: 'toggle',
    get: (c) => c.building.finish.enabled, set: (o, v) => setNested('finish')(o, 'enabled', v) },
  // Pass 9 spec 4 (M55).
  { id: 'deadlineOn', label: 'Board deadline', kind: 'toggle',
    get: (c) => c.building.deadline.enabled, set: (o, v) => setNested('deadline')(o, 'enabled', v) },
  { id: 'deadlineAt', label: 'Board deadline (min)', kind: 'range', min: 8, max: 30, step: 0.5,
    get: (c) => c.building.deadline.at / 60, set: (o, v) => setNested('deadline')(o, 'at', v * 60) },
  // Pass 9 spec 5 (M56).
  { id: 'enduranceOn', label: 'Endurance after a win', kind: 'toggle',
    get: (c) => c.building.endurance.enabled, set: (o, v) => setNested('endurance')(o, 'enabled', v) },
  // Pass 8 spec 7 (M51).
  { id: 'perksOn', label: 'Pick of two after a clean visit', kind: 'toggle',
    get: (c) => c.building.perks.enabled, set: (o, v) => setPerks(o, 'enabled', v) },
  { id: 'rescueOn', label: 'Rescue call', kind: 'toggle',
    get: (c) => c.building.rescue.enabled, set: (o, v) => setRescue(o, 'enabled', v) },
  // Pass 7 spec 4.2 (M43): the advisor mark all run long (it shows by itself only early in a first
  // run). Screen only; also the Settings card's switch.
  { id: 'advisorMark', label: 'Advisor mark all run', kind: 'toggle',
    get: (c) => Boolean(c.advisorMark), set: (o, v) => { o.advisorMark = v; } },
  { id: 'skipTutorial', label: 'Skip tutorial', kind: 'toggle',
    get: (c) => !c.tutorial, set: (o, v) => { o.tutorial = !v; } },
];

export const tuning2 = createTuning(TUNING2_FIELDS, D, TUNING2_KEY);
