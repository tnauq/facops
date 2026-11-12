// The scrolling map's camera (pass 2 spec, section 7.1). Pure.
// The zoom is pass 1's: the scale pass 1's fitView gave its 1000 x 500 world in the map region,
// so equipment, bubbles and techs are exactly as big as in the prototype. The camera only pans.

// Pass 1's world, kept here only as the reference for the zoom level.
export const PASS1_WORLD = { width: 1000, height: 500 };

/** Pixels per world unit for a map region { w, h }: the same as pass 1 on the same screen. */
export function passOneScale(region) {
  return Math.min(region.w / PASS1_WORLD.width, region.h / PASS1_WORLD.height);
}

/**
 * A camera: `rect` is where the map is drawn on screen (CSS px), `scale` px per world unit,
 * `world` the building's size, and (x, y) the world point at the rect's top-left corner.
 */
export function createCamera(rect, scale, world, focus = null) {
  const cam = { rect, scale, world, x: 0, y: 0 };
  return focus ? centreOn(cam, focus.x, focus.y) : clampCamera(cam);
}

/** Size of the visible area in world units. */
export const visibleSize = (cam) => ({ w: cam.rect.w / cam.scale, h: cam.rect.h / cam.scale });

function clampAxis(pos, visible, size) {
  if (visible >= size) return (size - visible) / 2; // smaller than the view: centre it
  return Math.min(Math.max(pos, 0), size - visible);
}

/** The camera moved back inside the building's edges. Returns a new camera. */
export function clampCamera(cam) {
  const v = visibleSize(cam);
  return { ...cam, x: clampAxis(cam.x, v.w, cam.world.width), y: clampAxis(cam.y, v.h, cam.world.height) };
}

/** Drag by (dx, dy) screen pixels: the map follows the finger, so the camera moves the other way. */
export function panBy(cam, dx, dy) {
  return clampCamera({ ...cam, x: cam.x - dx / cam.scale, y: cam.y - dy / cam.scale });
}

/** Put world point (wx, wy) in the middle of the view, as near as the edges allow. */
export function centreOn(cam, wx, wy) {
  const v = visibleSize(cam);
  return clampCamera({ ...cam, x: wx - v.w / 2, y: wy - v.h / 2 });
}

/** The camera as a `view` for the drawing code: screen = offset + world * scale. */
export function cameraView(cam) {
  return { scale: cam.scale, ox: cam.rect.x - cam.x * cam.scale, oy: cam.rect.y - cam.y * cam.scale };
}

/** True when world point (wx, wy) is on screen, at least `inset` px inside the map's edges. */
export function isVisible(cam, wx, wy, inset = 0) {
  const sx = cam.rect.x + (wx - cam.x) * cam.scale;
  const sy = cam.rect.y + (wy - cam.y) * cam.scale;
  return sx >= cam.rect.x + inset && sx <= cam.rect.x + cam.rect.w - inset && sy >= cam.rect.y + inset && sy <= cam.rect.y + cam.rect.h - inset;
}

/** Linear blend between two cameras, for a short glide (k from 0 to 1, eased). */
export function glide(from, to, k) {
  const e = k >= 1 ? 1 : 1 - (1 - k) * (1 - k) * (1 - k); // ease-out
  return { ...to, x: from.x + (to.x - from.x) * e, y: from.y + (to.y - from.y) * e };
}
