// The win at the finish (pass 9 spec 3.1, M54). A Commissioned campus (all 48 rack rows built and at
// full output at once) gets the CEO's last inspection; when it ends, the keys are handed over and the
// run is won. The score is the compute the campus delivered, in dollars.

/** Is the win at the finish in play? Building mode, switched on. */
export const finishOn = (state) => Boolean(state.config.building && state.config.building.enabled && state.config.building.finish && state.config.building.finish.enabled);

/** Has the run been won? */
export const won = (state) => Boolean(state.won);

/** End the run as a win (once). The score is already counted: compute delivered. */
export function winRun(state) {
  if (state.over) return;
  state.won = { t: state.t };
  state.over = true;
  state.overReason = 'won';
  state.events.push({ t: state.t, type: 'won', delivered: state.stats.delivered ?? 0 });
}
