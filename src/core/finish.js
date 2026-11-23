// The win at the finish (pass 9 spec 3.1, M54). A Commissioned campus (all 48 rack rows built and at
// full output at once) gets the CEO's last inspection; when it ends, the keys are handed over and the
// run is won. The score is the compute the campus delivered, in dollars.

/** Is the win at the finish in play? Building mode, switched on. */
export const finishOn = (state) => Boolean(state.config.building && state.config.building.enabled && state.config.building.finish && state.config.building.finish.enabled);

/** Is the board's deadline in play? With the win at the finish, switched on. */
export const deadlineOn = (state) => finishOn(state) && Boolean(state.config.building.deadline && state.config.building.deadline.enabled);

/** Has the run been won? */
export const won = (state) => Boolean(state.won);

/** End the run as a win (once). The score is already counted: compute delivered. */
export function winRun(state) {
  if (state.over || state.won) return;
  state.won = { t: state.t };
  state.over = true;
  state.overReason = 'won';
  state.events.push({ t: state.t, type: 'won', delivered: state.stats.delivered ?? 0 });
}

// ---------------------------------------------------------------- endurance (pass 9 spec 5, M56)
// After the win, the same campus can play on as an arcade endurance run: every `levelEvery` seconds
// the level goes up, and with it the heat (`heatPerLevel` compounding per level). Alarms come heat
// times as often, the director's cap grows, strike visits come closer, and compute pays heat times
// as much. The run stays won however endurance ends; the score keeps counting.

const ecfg = (state) => state.config.building.endurance;

/** Is endurance offered after a win? With the win at the finish, switched on. */
export const enduranceOn = (state) => finishOn(state) && Boolean(state.config.building.endurance && state.config.building.endurance.enabled);

/** Is an endurance run under way (or was one played)? */
export const inEndurance = (state) => Boolean(state.endurance);

/** The heat: 1 outside endurance; (1 + heatPerLevel) to the power of (level - 1) in it. */
export function heat(state) {
  if (!state.endurance) return 1;
  return Math.pow(1 + ecfg(state).heatPerLevel, state.endurance.level - 1);
}

/** Extra alarms the director may keep open: one for each `capPerHeat` of heat above 1. */
export const enduranceCapExtra = (state) => (state.endurance ? Math.floor((heat(state) - 1) / ecfg(state).capPerHeat + 1e-9) : 0);

/** Start endurance from a won run. Returns { ok } or { ok: false, reason }. */
export function startEndurance(state) {
  if (!enduranceOn(state)) return { ok: false, reason: 'off' };
  if (!state.won || state.endurance) return { ok: false, reason: state.endurance ? 'started' : 'not won' };
  state.over = false;
  state.overReason = null;
  state.endurance = { startedAt: state.t, level: 1, endedBy: null, endedAt: null };
  // The CEO keeps visiting: the next visit comes at the usual gap, shortened by the heat as it rises.
  if (state.config.ceo.enabled) {
    const cfg = state.config.ceo;
    const nextIsStrike = state.ceoWalks >= cfg.walks.length;
    const [lo, hi] = nextIsStrike && cfg.strikeGap ? cfg.strikeGap : cfg.gap;
    state.ceoNext = { at: state.t + state.ceoRng.range(lo, hi), kind: 'walk' };
  }
  state.events.push({ t: state.t, type: 'enduranceStart' });
  return { ok: true };
}

/** End an endurance run by choice (the pause menu's End endurance). */
export function endEndurance(state) {
  if (!state.endurance || state.over) return { ok: false };
  state.over = true;
  state.overReason = 'ended';
  enduranceEnded(state);
  return { ok: true };
}

/** Each step: the level from the time in endurance, with an event when it rises. */
export function enduranceStep(state) {
  const e = state.endurance;
  if (!e || state.over) return;
  const level = 1 + Math.floor((state.t - e.startedAt) / ecfg(state).levelEvery + 1e-9);
  if (level > e.level) {
    e.level = level;
    state.events.push({ t: state.t, type: 'levelUp', level, heat: heat(state) });
  }
}

/** When the endurance run ended, record how (game2.js calls this as any run ends). */
export function enduranceEnded(state) {
  const e = state.endurance;
  if (!e || e.endedAt !== null) return;
  e.endedAt = state.t;
  e.endedBy = state.overReason;
}
