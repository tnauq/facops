// The pass 2 tuning drawer (pass 2 spec, section 9), saved under localStorage['facops.tuning.v2']
// so it never mixes with pass 1's settings. Pass 1's controls carry over except "First alarm
// interval": pass 2 starts each phase from the table in spec 4.7 instead. Then the new controls
// from spec section 9, including Skip tutorial.

import { DEFAULT_CONFIG2 } from '../core/index2.js';
import { createTuning } from './tuning.js';

export const TUNING2_KEY = 'facops.tuning.v2';
const D = DEFAULT_CONFIG2;

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
  { id: 'darkDrain', label: 'Drain per dark half-hall', kind: 'range', min: 0, max: 3, step: 0.25,
    get: (c) => c.meter.darkDrain, set: (o, v) => { o.meter = { ...(o.meter ?? {}), darkDrain: v }; } },
  { id: 'skipTutorial', label: 'Skip tutorial', kind: 'toggle',
    get: (c) => !c.tutorial, set: (o, v) => { o.tutorial = !v; } },
];

export const tuning2 = createTuning(TUNING2_FIELDS, D, TUNING2_KEY);
