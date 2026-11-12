// Two-tap dispatch (spec section 7.2). The selection is nothing, one alarm or one tech.
// Pure reducer: it never touches the game; it returns the new selection and, when the second
// tap pairs a tech with an alarm, the assign command for the caller to run.

export const NOTHING = Object.freeze({ kind: 'none', id: null });

/**
 * Returns { selection, assign } where assign is { techId, alarmId } or null.
 * One-tap mode (spec 7.3): tapping an alarm with no tech selected returns { selection: NOTHING,
 * assign: null, dispatch: alarmId } instead, for the caller to send the nearest free tech (or queue
 * it). A tech then an alarm still assigns exactly as in two-tap mode: that is the manual override.
 */
export function reduceTap(selection, hit, { oneTap = false } = {}) {
  const none = { selection: NOTHING, assign: null };
  if (oneTap && hit.kind === 'alarm' && selection.kind !== 'tech') return { ...none, dispatch: hit.id };
  const keep = { selection, assign: null };
  const pick = { selection: { kind: hit.kind, id: hit.id }, assign: null };

  if (hit.kind === 'empty') return none;
  if (hit.kind !== 'alarm' && hit.kind !== 'tech') return keep; // HUD buttons do their own thing

  if (selection.kind === 'none') return pick;
  if (selection.kind === hit.kind) return selection.id === hit.id ? none : pick; // same again deselects
  // One alarm and one tech: send that tech (a busy tech is redirected), then clear.
  const assign = hit.kind === 'tech' ? { techId: hit.id, alarmId: selection.id } : { techId: selection.id, alarmId: hit.id };
  return { selection: NOTHING, assign };
}

/** Clear the selection if its alarm is gone (fixed, or replaced) or its tech no longer exists. */
export function pruneSelection(selection, state) {
  if (selection.kind === 'alarm' && !state.alarms.some((a) => a.id === selection.id)) return NOTHING;
  if (selection.kind === 'tech' && !state.techs.some((t) => t.id === selection.id)) return NOTHING;
  return selection;
}
