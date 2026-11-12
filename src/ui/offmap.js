// Off-map indicators (pass 2 spec, section 7.1). Pure.
// Every alarm out of view gets a small arrow on the edge of the map, on the line from the centre of
// the view to the alarm, pointing at it. Arrows that would overlap merge into one with a count.

export const MARKER_RADIUS = 22; // px: a 44 px tap target
const EDGE_INSET = MARKER_RADIUS + 2; // keeps the whole marker inside the map
export const MERGE_PX = 48; // markers closer than this become one (a marker is 30 px across plus its arrow)

/**
 * points: [{ id, x, y, type }] in world units. cam: a camera (src/ui/camera.js).
 * Returns [{ x, y, angle, ids, type, count, target }] in screen px, where `target` is the world
 * point of the first alarm in the marker (for panning to it) and `angle` points toward it.
 */
export function offMapMarkers(points, cam) {
  const r = cam.rect;
  const cx = r.x + r.w / 2;
  const cy = r.y + r.h / 2;
  const halfW = r.w / 2 - EDGE_INSET;
  const halfH = r.h / 2 - EDGE_INSET;
  const raw = [];
  for (const p of points) {
    const sx = r.x + (p.x - cam.x) * cam.scale;
    const sy = r.y + (p.y - cam.y) * cam.scale;
    if (sx >= r.x && sx <= r.x + r.w && sy >= r.y && sy <= r.y + r.h) continue; // on screen
    const dx = sx - cx;
    const dy = sy - cy;
    // Shrink the ray from the centre until it touches the inset edge.
    const t = Math.min(halfW / Math.abs(dx || 1e-9), halfH / Math.abs(dy || 1e-9));
    raw.push({ x: cx + dx * t, y: cy + dy * t, angle: Math.atan2(dy, dx), ids: [p.id], type: p.type, target: { x: p.x, y: p.y }, dist: Math.hypot(dx, dy) });
  }
  // Nearest alarms first, so a merged marker leads to the closest one.
  raw.sort((a, b) => a.dist - b.dist);
  const merged = [];
  for (const m of raw) {
    const near = merged.find((q) => Math.hypot(q.x - m.x, q.y - m.y) < MERGE_PX);
    if (near) near.ids.push(...m.ids);
    else merged.push({ ...m });
  }
  return merged.map(({ dist, ...m }) => ({ ...m, count: m.ids.length }));
}

/** The marker under a tap, or null. */
export function markerAt(markers, p) {
  let best = null;
  let bestD = Infinity;
  for (const m of markers) {
    const d = Math.hypot(p.x - m.x, p.y - m.y);
    if (d <= MARKER_RADIUS && d < bestD) {
      best = m;
      bestD = d;
    }
  }
  return best;
}
