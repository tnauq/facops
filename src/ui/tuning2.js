// The pass 2 tuning drawer (pass 2 spec, section 9), saved under localStorage['facops.tuning.v2']
// so it never mixes with pass 1's settings. Pass 1's controls carry over except "First alarm
// interval": pass 2 starts each phase from the table in spec 4.7 instead. Then the new controls
// from spec section 9. (Skip tutorial arrives with the tutorial in milestone 12.)

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
  { id: 'meterFill', label: 'Meter fill per second', kind: 'range', min: 0.5, max: 3, step: 0.25,
    get: (c) => c.meter.fill, set: (o, v) => { o.meter = { ...(o.meter ?? {}), fill: v }; } },
  { id: 'chillersPerHall', label: 'Chillers needed per hall', kind: 'range', min: 0.5, max: 2, step: 0.25,
    get: (c) => c.chillersPerHall, set: (o, v) => { o.chillersPerHall = v; } },
  { id: 'startHalls', label: 'Start with halls', kind: 'range', min: 1, max: 8, step: 1,
    get: (c) => c.startHalls, set: (o, v) => { o.startHalls = v; } },
];

export const tuning2 = createTuning(TUNING2_FIELDS, D, TUNING2_KEY);
