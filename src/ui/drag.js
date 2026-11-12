// Tap versus drag on the map (pass 2 spec, section 7.1). Pure.
// A touch that moves more than 8 px is a drag and pans the map; one that does not is a tap,
// acted on when the finger lifts.

export const DRAG_PX = 8;

/** A new gesture at screen point p. */
export const startGesture = (p) => ({ start: p, last: p, dragging: false });

/** The finger moved to p. Returns { gesture, pan } where pan is { dx, dy } px to move the map, or null. */
export function moveGesture(g, p) {
  const dragging = g.dragging || Math.hypot(p.x - g.start.x, p.y - g.start.y) > DRAG_PX;
  if (!dragging) return { gesture: g, pan: null };
  // On the move that turns it into a drag, pan by the whole distance so far, so nothing is lost.
  const from = g.dragging ? g.last : g.start;
  return { gesture: { ...g, last: p, dragging: true }, pan: { dx: p.x - from.x, dy: p.y - from.y } };
}

/** The finger lifted. Returns the tap point, or null if this gesture was a drag. */
export const endGesture = (g) => (g.dragging ? null : g.start);
