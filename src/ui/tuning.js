// The tuning drawer's settings (spec section 9). Pure: the list of controls, turning their values
// into config overrides, and saving them under localStorage['facops.tuning.v1'].
// Values are kept in the units the drawer shows (percent for tighten and the hat bonus).
// Defaults always come from DEFAULT_CONFIG, so no rule number is repeated here.

import { DEFAULT_CONFIG } from '../core/index.js';

export const TUNING_KEY = 'facops.tuning.v1';

const D = DEFAULT_CONFIG;

// kind 'range': a slider. `get` reads the drawer value from a config, `set` writes it into overrides.
// kind 'toggle': a checkbox.
export const TUNING_FIELDS = [
  { id: 'startInterval', label: 'First alarm interval (s)', kind: 'range', min: 4, max: 20, step: 0.5,
    get: (c) => c.director.startInterval, set: (o, v) => { o.director.startInterval = v; } },
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
  // Waves on means the default wave spacing; off is 0, which the rules read as no waves.
  { id: 'waves', label: 'Waves', kind: 'toggle',
    get: (c) => c.director.waveEvery > 0, set: (o, v) => { o.director.waveEvery = v ? D.director.waveEvery : 0; } },
  { id: 'oneTap', label: 'One-tap dispatch', kind: 'toggle',
    get: (c) => c.oneTap, set: (o, v) => { o.oneTap = v; } },
];

/**
 * The drawer's logic for a list of fields, the default config they read, and a storage key.
 * Pass 1 and pass 2 each make their own (pass 2 in src/ui/tuning2.js).
 */
export function createTuning(fields, defaults, key) {
  const FIELD = Object.fromEntries(fields.map((f) => [f.id, f]));

  const defaultTuning = () => {
    const out = {};
    for (const f of fields) out[f.id] = f.kind === 'range' ? snap(f, f.get(defaults)) : Boolean(f.get(defaults));
    return out;
  };

  const cleanTuning = (values) => {
    const out = defaultTuning();
    if (!values || typeof values !== 'object') return out;
    for (const f of fields) {
      const v = values[f.id];
      if (f.kind === 'range' && Number.isFinite(v) && v >= f.min && v <= f.max) out[f.id] = snap(f, v);
      if (f.kind === 'toggle' && typeof v === 'boolean') out[f.id] = v;
    }
    return out;
  };

  const tuningToConfig = (values) => {
    const clean = cleanTuning(values);
    const overrides = { director: {} };
    for (const f of fields) f.set(overrides, clean[f.id]);
    return overrides;
  };

  const setTuning = (values, id, raw) => {
    const f = FIELD[id];
    if (!f) return values;
    const v = f.kind === 'range' ? snap(f, Number(raw)) : Boolean(raw);
    return { ...cleanTuning(values), [id]: v };
  };

  const tuningLabel = (id, value) => {
    const f = FIELD[id];
    if (f.kind === 'toggle') return value ? 'On' : 'Off';
    return String(Number(value.toFixed(2)));
  };

  const loadTuning = (storage) => {
    try {
      const raw = storage?.getItem(key);
      return cleanTuning(raw ? JSON.parse(raw) : null);
    } catch {
      return defaultTuning();
    }
  };

  const saveTuning = (values, storage) => {
    try {
      if (!storage) return false;
      storage.setItem(key, JSON.stringify(cleanTuning(values)));
      return true;
    } catch {
      return false;
    }
  };

  return { fields, key, defaultTuning, cleanTuning, tuningToConfig, setTuning, tuningLabel, loadTuning, saveTuning };
}

/** Snap a slider value to its step and range; hides float noise such as 15.000000000000002. */
export function snap(field, value) {
  const n = Math.round((value - field.min) / field.step);
  const v = field.min + n * field.step;
  return Math.min(field.max, Math.max(field.min, Number(v.toFixed(6))));
}

// Pass 1's drawer, with the names the pass 1 code and tests use.
const pass1 = createTuning(TUNING_FIELDS, D, TUNING_KEY);
export const { defaultTuning, cleanTuning, tuningToConfig, setTuning, tuningLabel, loadTuning, saveTuning } = pass1;
