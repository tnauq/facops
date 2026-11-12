// Every number in the pass 2 rules lives here (spec docs/pass2-spec.md, sections 4 to 6).
// The tuning drawer edits a copy of DEFAULT_CONFIG2; nothing else may hard-code a rule number.
// Pass 1's config.js stays as it was for the frozen pass 1 engine.

import { ALARMS as PASS1_ALARMS, TRADES } from './config.js';

export { TRADES };

// The five alarms keep pass 1's clocks, fix times, steps and mix. A network failure is now on a
// rack row rather than a single rack.
export const ALARMS2 = {
  ...PASS1_ALARMS,
  network: { ...PASS1_ALARMS.network, equipment: 'row' },
};

export const UPGRADES = {
  carts: { id: 'carts', label: 'Carts', text: 'Whole crew walks 20% faster', max: 2, walkBonus: 0.2 },
  tools: { id: 'tools', label: 'Better tools', text: 'All fixes 15% faster', max: 2, fixBonus: 0.15 },
  radios: { id: 'radios', label: 'Radios', text: 'Dropped jobs keep progress 20 s', max: 1, progressHold: 20 },
};

export const DEFAULT_CONFIG2 = {
  rowMw: 6.25, // MW from one healthy rack row: 6 rows a hall, 8 halls, 300 MW
  startCrew: ['electrical', 'mechanical'], // in crew-bar order
  autoHires: ['ce', 'network'], // Deliveries 1 and 2 bring these; later Deliveries offer a pick
  hireTieOrder: ['network', 'mechanical', 'ce', 'electrical'], // ties between Hire cards
  tradeBonus: 0.15, // the matching trade fixes this much faster
  walkSpeed: 150, // world units per second
  progressHold: 10, // seconds a dropped job keeps its progress
  recoverTime: 3, // seconds for a row to climb from 0 to full after its fault clears
  leakThrottle: 0.8, // a hall's rows while one of its two CDUs leaks
  thermalRate: 0.02, // cooling factor change per second
  chillersPerHall: 1.25, // chillers needed = halls online x this, rounded up
  burstLeaks: 2, // CDU leaks caused by a pump burst
  clockScale: 1, // multiplies every alarm clock
  startHalls: 1, // halls online when a run begins
  maxHalls: 8,
  plantBHall: 6, // Plant B comes online with this hall
  band: { green: 0.9, red: 0.8 }, // green at or above 90%, red below 80%
  meter: { start: 40, max: 100, fill: 1.25, yellowDrain: 0.5, redDrain: 2, safeFloor: 1, tutorialCap: 80 }, // safeFloor: until Delivery 1; tutorialCap: while the tutorial runs
  director: {
    enabled: true,
    firstSpawn: 5, // seconds before the first alarm of a run
    phaseIntervals: [12, 9, 7.5, 6.5, 5.5, 5, 4.5, 4], // seconds between alarms at the start of a phase, by halls online
    tighten: 0.05, // the interval shrinks by this share...
    tightenEvery: 10, // ...every this many seconds, reset at each Delivery
    floor: 1.5, // shortest interval
    jitter: 0.3, // each interval varies by plus or minus this share
    waveEvery: 45, // seconds between waves (0 turns waves off)
    waveFromHalls: 3, // waves start with this many halls online
    waveJitter: 0.15,
    waveSize: 2, // extra alarms per wave
    capExtra: 2, // the director stops at crew size + capExtra active alarms
    capGrowEvery: 45, // after Full campus the cap rises by 1 every this many seconds
    quietAfterDelivery: 5, // seconds without director alarms after a Delivery
    firstHallTypes: ['breaker', 'chiller', 'leak'], // with one hall online, only these
  },
  tutorial: true, // the hall 1 tutorial (spec 8); the screen runs it, the rules only hold back while it does
  oneTap: false, // true: dispatch() queues an alarm when nobody is free
  timeScale: 60, // plant seconds per real second (1 real second = 1 plant minute)
};

/** Deep copy of the defaults with optional overrides merged in (one level of nesting). */
export function makeConfig2(overrides = {}) {
  const base = structuredClone(DEFAULT_CONFIG2);
  for (const [key, value] of Object.entries(overrides)) {
    if (value && typeof value === 'object' && !Array.isArray(value) && base[key] && typeof base[key] === 'object' && !Array.isArray(base[key])) {
      base[key] = { ...base[key], ...value };
    } else {
      base[key] = value;
    }
  }
  return base;
}
