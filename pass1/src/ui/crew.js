// Where each tech is drawn and tapped. The rules let techs share a spot (all three start at the
// same point, and two can finish at the same machine), which would draw them on top of each
// other and make all but one impossible to tap. Techs on the same spot are fanned out side by
// side on screen; the rules engine never sees these offsets.

export const FAN_PX = 28; // screen px between the centers of techs that share a spot
const SAME_SPOT = 1; // world units

/** Copies of the techs with x moved so none overlap. `scale` is view.scale (px per world unit). */
export function fannedCrew(techs, scale) {
  const groups = [];
  for (const tech of techs) {
    const g = groups.find((grp) => Math.hypot(grp[0].x - tech.x, grp[0].y - tech.y) < SAME_SPOT);
    if (g) g.push(tech);
    else groups.push([tech]);
  }
  const step = FAN_PX / scale;
  const out = new Map();
  for (const g of groups) {
    g.forEach((tech, i) => out.set(tech.id, { ...tech, x: tech.x + (i - (g.length - 1) / 2) * step }));
  }
  return techs.map((t) => out.get(t.id)); // keep crew order
}
