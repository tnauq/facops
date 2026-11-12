// Every number in the rules lives here. The spec (docs/pass1-spec.md, section 4) lists the same values.
// The tuning drawer edits a copy of DEFAULT_CONFIG; nothing else may hard-code a rule number.

export const TRADES = {
  electrical: { id: 'electrical', label: 'Electrical', hat: 'yellow' },
  mechanical: { id: 'mechanical', label: 'Mechanical', hat: 'red' },
  ce: { id: 'ce', label: 'Critical Environment', hat: 'green' },
  network: { id: 'network', label: 'Network', hat: 'blue' },
};

// fixTime: seconds for any tech. clock: seconds until the "if ignored" event.
// steps: pips shown on the fix ring. weight: share of director spawns.
export const ALARMS = {
  network: { id: 'network', label: 'Network Failure', equipment: 'rack', trade: 'network', fixTime: 3, clock: 30, steps: 2, weight: 35 },
  leak: { id: 'leak', label: 'CDU Leak', equipment: 'cdu', trade: 'ce', fixTime: 8, clock: 30, steps: 3, weight: 25 },
  breaker: { id: 'breaker', label: 'Breaker Trip', equipment: 'msb', trade: 'electrical', fixTime: 6, clock: 45, steps: 3, weight: 15 },
  pump: { id: 'pump', label: 'Pump Overpressure', equipment: 'pump', trade: 'mechanical', fixTime: 6, clock: 20, steps: 2, weight: 15 },
  chiller: { id: 'chiller', label: 'Chiller Trip', equipment: 'chiller', trade: 'mechanical', fixTime: 10, clock: 60, steps: 3, weight: 10 },
};

export const DEFAULT_CONFIG = {
  rackMw: 25, // MW delivered by one healthy rack
  crew: ['electrical', 'mechanical', 'ce'], // pass 1 crew, in crew-bar order
  tradeBonus: 0.15, // the matching trade fixes this much faster
  walkSpeed: 120, // world units per second
  progressHold: 10, // seconds a dropped job keeps its progress
  recoverTime: 3, // seconds for a rack to climb from 0 to full after its fault clears
  leakThrottle: 0.6, // row output while its CDU leaks
  thermalRate: 0.02, // cooling factor change per second (10% per 5 s)
  thermalOneChiller: 0.5, // cooling factor target with one chiller running
  chillersNeeded: 2, // chillers needed for full cooling
  burstLeaks: 2, // CDU leaks caused by a pump burst
  clockScale: 1, // multiplies every alarm clock
  band: { green: 0.9, red: 0.8 }, // green at or above 90%, red below 80%
  meter: { start: 40, max: 100, fill: 1, yellowDrain: 0.5, redDrain: 2 }, // points and points per second
  director: {
    enabled: true,
    firstSpawn: 5, // seconds before the first alarm
    startInterval: 10, // seconds between alarms at the start
    tighten: 0.05, // interval shrinks by this share...
    tightenEvery: 10, // ...every this many seconds
    floor: 2, // shortest interval
    jitter: 0.3, // each interval varies by plus or minus this share
    waveEvery: 45, // seconds between waves (0 turns waves off)
    waveJitter: 0.15,
    waveSize: 2, // extra alarms per wave
    capExtra: 2, // director stops spawning at crew size + capExtra active alarms
    capGrowAfter: 120, // seconds before the cap starts rising
    capGrowEvery: 45, // the cap rises by 1 every this many seconds after that
  },
  oneTap: false, // true: dispatch() queues an alarm when nobody is free
  timeScale: 60, // plant seconds per real second (1 real second = 1 plant minute)
};

/** Deep copy of the defaults with optional overrides merged in (one level of nesting). */
export function makeConfig(overrides = {}) {
  const base = structuredClone(DEFAULT_CONFIG);
  for (const [key, value] of Object.entries(overrides)) {
    if (value && typeof value === 'object' && !Array.isArray(value) && typeof base[key] === 'object') {
      base[key] = { ...base[key], ...value };
    } else {
      base[key] = value;
    }
  }
  return base;
}
