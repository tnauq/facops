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
  // The yard's failures (pass 4 spec 7.3, M30), building mode only. A short is fixed in two places:
  // disconnected at its RMU (disconnectTime), then repaired at the transformer (fixTime). An RMU
  // fault has no clock: it is already the worst. Weights against the five above, which sum to 100.
  // tradeOnly (owner, after M30): high-voltage work in the yard is for electricians only.
  short: { id: 'short', label: 'Transformer Short', equipment: 'xfmr', trade: 'electrical', tradeOnly: true, fixTime: 8, disconnectTime: 3, clock: 45, steps: 2, weight: 8 },
  rmu: { id: 'rmu', label: 'RMU Fault', equipment: 'rmu', trade: 'electrical', tradeOnly: true, fixTime: 10, clock: Infinity, steps: 3, weight: 3 },
  fan: { id: 'fan', label: 'Dry Cooler Fan Failure', equipment: 'dry', trade: 'mechanical', fixTime: 6, clock: 60, steps: 2, weight: 7 },
};

/** The yard's alarm types (M30): only in building mode. */
export const YARD_ALARMS = ['short', 'rmu', 'fan'];

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
  leakThrottle: 0.9, // a hall's rows while one of its two CDUs leaks (owner, 12 Nov: 0.8 stalled hall 1)
  thermalRate: 0.02, // cooling factor change per second
  chillersPerHall: 1.25, // chillers needed = halls online x this, rounded up
  burstLeaks: 2, // CDU leaks caused by a pump burst
  clockScale: 1, // multiplies every alarm clock
  startHalls: 1, // halls online when a run begins
  maxHalls: 8,
  plantBHall: 6, // Plant B comes online with this hall
  band: { green: 0.9, red: 0.8 }, // green at or above 90%, red below 80%
  meter: { start: 40, max: 100, fill: 1.25, yellowDrain: 0.5, redDrain: 2, safeFloor: 1, tutorialCap: 80, darkDrain: 1 }, // the survival buffer. safeFloor: until Delivery 1; tutorialCap: while the tutorial runs; darkDrain: per second for each dark half-hall, whatever the band (pass 3 spec 4.4)
  // The next hall is built on a timer that runs faster while the load is green (spec 4.6).
  build: { every: 90, greenBoost: 1.5 }, // seconds per hall at normal speed; speed-up while green
  director: {
    enabled: true,
    firstSpawn: 5, // seconds before the first alarm of a run
    phaseIntervals: [12, 10, 9, 8, 7, 6.5, 6, 5.5], // seconds between alarms at the start of a phase, by halls online (pass 3 spec 4b.1: gentler)
    tighten: 0.03, // the interval shrinks by this share... (pass 3 spec 4b.1: was 0.05)
    tightenEvery: 10, // ...every this many seconds
    carryOver: 0.5, // share of the tightening a new phase keeps after a Delivery (pass 3 spec 4.4, 4b.1; 0 = reset as in pass 2)
    floor: 1.5, // shortest interval
    jitter: 0.3, // each interval varies by plus or minus this share
    waveEvery: 45, // seconds between waves (0 turns waves off)
    waveFromHalls: 3, // waves start with this many halls online
    waveJitter: 0.15,
    waveSize: 2, // extra alarms per wave
    chillersPerHall: 1, // replaces chillersPerHall: one chiller per hall's worth of racks (owner's compute-first economy)
    capExtra: 2, // the director stops at crew size + capExtra active alarms
    capGrowEvery: 0, // after Full campus the cap rises by 1 every this many seconds; 0 = never (owner, 13 Nov: the CEO decides the late game)
    quietAfterDelivery: 5, // seconds without director alarms after a Delivery
    firstHallTypes: ['breaker', 'chiller', 'leak'], // with one hall online, only these
  },
  // The CEO's visits (pass 3 spec 4.1 to 4.3). Costs are Stability points per unattended alarm seen.
  ceo: {
    enabled: true,
    speed: 90, // world units per second: a stroll
    viewRadius: 260,
    viewAngle: 140, // degrees, the whole cone
    inspect: 4, // seconds at each area: half facing the top, half the bottom
    inspectHandover: 2,
    gap: [45, 60], // seconds between the end of one visit and the next walkthrough's warning
    strikeGap: [12, 18], // the gap before each strike visit (walkthroughs keep 45 to 60 s). M33: 20 to 30; pass 7 spec 3.3 (M41): 12 to 18, so the CEO ends about a third of runs
    ribbonHall: 3, // the ribbon-cutting comes with this hall
    ribbon: { warning: 20, cost: 15 },
    handover: { warning: 20, cost: 35 },
    handoverDelay: 30, // a run that starts with every hall online gets its Handover this far in
    walks: [{ warning: 20, cost: 50 }, { warning: 15, cost: 70 }], // walkthroughs 1 and 2; after these, strike visits
    // Pass 5 spec 4.1 (M33): from walkthrough 3 every visit is a strike visit. Each sighting is fined
    // `strikeFine` dollars (building mode), and a visit with any sighting is one strike; `strikes`
    // strikes and the CEO fires you. `strikes: 1` with `strikeFine: 0` is pass 3's zero tolerance.
    strikes: 3,
    strikeFine: 3500, // dollars: walkthrough 2's fine (70 points x building.ceoFine)
    ztWarning: 12, // the first strike visit's warning, then 1 s less each visit...
    ztWarningMin: 8, // ...down to this
    areasMin: 2,
    areasMax: 3,
  },
  // Building and money (pass 4 spec 2.1 to 2.8). All numbers are starting values for the scripted
  // checks to settle.
  building: {
    enabled: false, // the rules' default is the classic game; the screen starts in building mode (GAME_CONFIG2)
    buildTime: 8, // seconds for a contractor to build a device
    startCash: 800, // M29: the start also needs Hall 1's top RMU and transformer, and a dry cooler
    income: 4, // dollars a second from one rack row at full output
    prices: { row: 150, msb: 150, cdu: 250, chiller: 300, pump: 200, xfmr: 75, rmu: 100, dry: 150, hire: 400, upgrade: 500 },
    // The bare minimum for one hall (owner): Plant A's top pump and one chiller; in Hall 1 the top
    // half's A switchboard, the top coolant unit and two rack rows.
    // M29: with the RMU and transformer that feed that switchboard, and one dry cooler at Plant A.
    // Pass 6 (M38): two glycol pumps and one water pump in place of the one pump.
    start: ['gpump-A-0', 'gpump-A-1', 'wpump-A-0', 'chiller-A-0', 'dry-A-0', 'rmu-1-t', 'xfmr-1-t-A', 'msb-1-t-A', 'cdu-1-t', 'row-1-t-0', 'row-1-t-1'],
    chillersPerDryCooler: 2, // each dry cooler unit lets this many of its plant's chillers run
    yardFromHalls: 3, // the director starts yard failures (M30) once this many halls are online
    tighten: 0.015, // the director tightens this much every tightenEvery seconds, with no reset (M24's checks)
    firstSpawn: 20, // seconds before the first alarm: time to look round and buy a first backup
    chillersPerHall: 1, // replaces chillersPerHall: one chiller per hall's worth of racks (owner's compute-first economy)
    capExtra: 2, // the director stops at this many alarms plus one per hall's worth of racks online, whatever the crew
    // Owner, 16 Nov (after M33's checks): the cap rises late so the late game outruns the crew. Each
    // [seconds on the run's clock, extra alarms]: +2 at 14:00 and +2 more at 17:00. [] = never.
    capSteps: [[840, 2], [1020, 2]],
    smallStretch: 3, // under a hall's worth of racks, the gap between alarms grows by 6 / rows, up to this
    handoverMw: 200, // the Handover comes once rows in online halls reach this many MW...
    handoverAt: 600, // ...or at this many seconds, whichever is first
    safeUntil: 120, // the meter cannot empty before this
    darkDrain: 0.25, // replaces meter.darkDrain: lost income is already the main cost of a dark half (M24's checks)
    // The burn (pass 5 spec 3, owner 15 Nov): pressure early, not late. The campus was built on a
    // construction loan, repaid at `loanRate` dollars a second from the start of the economy until all
    // `loan` dollars are repaid; then only a small fixed site overhead (`base`), upkeep x infrastructure
    // built and wages x techs. A full campus covers it easily: the late game's pressure is the CEO.
    // `doubling` > 0 brings back pass 4's base that doubled every that many seconds, for comparison.
    // Infrastructure costs upkeep and earns nothing, so backups are still a mid-game purchase.
    burn: { loan: 1800, loanRate: 6, base: 1, doubling: 0, upkeep: 0.15, wages: 0.5 }, // M32 (pass 4: base 3, doubling 150, no loan)
    debtGrace: 15, // seconds in the red before the run ends: time to recover from a fine or a bad spell
    stability: false, // false: no Stability meter in building mode; outages cost income instead
    ceoFine: 50, // dollars per Stability point a CEO sighting would have cost (15 points: $750)
    // Pass 5 spec 6.2 (M35): advice only, these change no rule. The Hire card recommends a crew of
    // crewBase, plus crewPerHall for each hall online after the first (the scripted builders end with
    // about one tech per hall).
    crewBase: 2,
    crewPerHall: 1,
    // Pass 6 spec 4.1 (M39, owner 16 Nov): what a running pump carries. Each loop is one header for the
    // whole campus; with too few pumps the farthest CDUs (glycol) or halls (water) go without.
    pumps: { chillersPerGlycolPump: 2, cdusPerGlycolPump: 2, hallsPerWaterPump: 2, noWaterFactor: 0.5 },
    // Pass 5 spec 5.1 (M34): handing over the keys. The sale price is the price of everything built;
    // a Commissioned campus (all rows at full output at once) sells for `commissionedBonus` more.
    // fromHandover false: the campus may be sold at any time (for comparison).
    // Pass 7 spec 3.4 (M41, owner 18 Nov: a third of runs should end in a sale): `anytime` lets the
    // campus be sold with outages open and during a CEO warning, only not while the CEO walks; the
    // buyer also pays `incomeSeconds` of the campus's current income. anytime false and incomeSeconds 0
    // are M34's rules.
    sale: { fromHandover: true, commissionedBonus: 0.5, anytime: true, incomeSeconds: 150 },
    // Pass 7 spec 3.2 (M41, owner 17 Nov): service credits. Customers go live when the construction
    // loan is paid off (at once when there is no loan). From then every online rack row that is short of
    // full output costs `rate` dollars a second for each row short, doubling every `doubling` seconds
    // since they went live. Nothing is charged while every row delivers. rate 0 turns them off.
    credits: { rate: 1, doubling: 210 },
    // Pass 7 spec 4.1 (M42): the uptime bonus. At each full minute of the economy, every rack row that
    // stayed up the whole minute (online at its start, never below `floor` of full output) pays `bonus`.
    // The spec's starting value was $40; M42's checks lowered it to $20 (spec 4.1: the bonus is the
    // first lever): at $40 runs ran to 21:09 and getting ready for the CEO stopped paying.
    uptime: { enabled: true, bonus: 20, floor: 0.9 },
  },
  tutorial: true, // the hall 1 tutorial (spec 8); the screen runs it, the rules only hold back while it does
  oneTap: false, // true: dispatch() queues an alarm when nobody is free
  // Techs pick their own jobs (pass 4 spec 2.6): a free tech takes an alarm nobody is on once it has
  // been up this long. The player can still send or redirect anyone.
  autoDispatch: { enabled: true, delay: 1 },
  realtime: false, // screen only (pass 4 spec 3.4): true takes away the hold and speed buttons, for experienced players
  timeScale: 60, // plant seconds per real second (1 real second = 1 plant minute)
};

/**
 * The game's starting settings, as the screen and its tuning drawer use them: building mode on (pass 4
 * M25). The rules engine's own default stays the classic game, which its tests check.
 */
export function gameDefaults2() {
  return makeConfig2({ building: { enabled: true } });
}

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
