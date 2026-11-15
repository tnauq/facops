// Outside the building (owner, 15 Nov; pass 4 spec 7): where the yard equipment stands. Pure layout.
// Since M29 the transformers, RMUs and dry cooler units are equipment like any other: layout2.js
// calls buildYard() and adds them to EQUIPMENT. This file imports nothing from layout2.js, so the
// two can be built in that order.
//
//   - A transformer for every switchboard, straight outside the wall from it, joined by a bus duct.
//   - A ring main unit (RMU) for every switchboard pair, between and beyond its two transformers,
//     cabled to both: the A and B transformers of a pair are fed from the same RMU.
//   - A power line along each side (north and south), coming in from out of view on the left and
//     running right, on poles; each RMU drops off it.
//   - A dry cooler block outside each plant (west of Plant A, east of Plant B), piped to that
//     plant's north and south pumps.
// World units, the same as src/core/layout2.js: the building spans 0..WORLD.width, 0..WORLD.height.

export const TRANSFORMER = { w: 58, h: 52, y: -80 }; // centre y on the north side
export const RMU = { w: 48, h: 34, y: -168 };
export const LINE_Y = -232; // the north power line; the south one mirrors it
export const DRY = { x1: -290, x2: -50, y1: 170, y2: 610, cols: 2, rows: 4 }; // Plant A's block
export const POLE_EVERY = 280;

/**
 * The concrete yard along each long wall (owner, 15 Nov): one piece the whole length of the building,
 * from the wall out past the RMUs. The ends stay dirt. North side: y from YARD_PAD.y1 to 0.
 */
export const YARD_PAD = { y1: RMU.y - RMU.h / 2 - 18 };

/** How far past the walls the yard reaches, for the camera (x: past the ends, y: past the sides). */
export const YARD = { x: 330, y: 280 };

/**
 * Where everything in the yard stands, for the building's switchboards and pumps. world: the
 * building's { width, height }. Returns { TRANSFORMERS, RMUS, POWER_LINES, POLES, DRY_COOLERS, DRY_PIPES }.
 */
export function buildYard(MSBS, PUMPS, world) {
  const ny = (y) => world.height - y; // mirror north to south

  /** Transformers: one per switchboard, { id, msbId, hall, half, side, x, y }. */
  const TRANSFORMERS = MSBS.map((m) => ({
    id: `xfmr-${m.hall}-${m.half}-${m.side}`,
    msbId: m.id,
    hall: m.hall,
    half: m.half,
    side: m.side,
    x: m.x,
    y: m.half === 't' ? TRANSFORMER.y : ny(TRANSFORMER.y),
    msbY: m.y,
  }));

  /** RMUs: one per switchboard pair, between its two transformers, { id, hall, half, x, y, feeds }. */
  const RMUS = (() => {
    const out = [];
    for (const t of TRANSFORMERS.filter((x) => x.side === 'A')) {
      const b = TRANSFORMERS.find((x) => x.hall === t.hall && x.half === t.half && x.side === 'B');
      out.push({
        id: `rmu-${t.hall}-${t.half}`,
        hall: t.hall,
        half: t.half,
        x: (t.x + b.x) / 2,
        y: t.half === 't' ? RMU.y : ny(RMU.y),
        feeds: [t.id, b.id],
      });
    }
    return out;
  })();

  /** The two power lines: { side: 't' | 'b', y, x1, x2 }, from out of view on the left to the right. */
  const POWER_LINES = [
    { side: 't', y: LINE_Y, x1: -YARD.x - 600, x2: world.width + YARD.x + 600 },
    { side: 'b', y: ny(LINE_Y), x1: -YARD.x - 600, x2: world.width + YARD.x + 600 },
  ];

  /** Poles along each line: one at every RMU's drop, and one every POLE_EVERY units between. */
  const POLES = (() => {
    const out = [];
    for (const line of POWER_LINES) {
      const xs = new Set(RMUS.filter((r) => r.half === line.side).map((r) => r.x));
      for (let x = Math.ceil(line.x1 / POLE_EVERY) * POLE_EVERY; x <= line.x2; x += POLE_EVERY) {
        if (![...xs].some((r) => Math.abs(r - x) < POLE_EVERY / 2)) xs.add(x);
      }
      for (const x of [...xs].sort((a, b) => a - b)) out.push({ side: line.side, x, y: line.y });
    }
    return out;
  })();

  /**
   * Dry cooler blocks: { plant, x1, x2, y1, y2, units: [{ id, x, y, w, h }] }. Plant A's is outside
   * the west wall; Plant B's mirrors it outside the east wall.
   */
  const DRY_COOLERS = ['A', 'B'].map((plant) => {
    const x1 = plant === 'A' ? DRY.x1 : world.width - DRY.x2;
    const x2 = plant === 'A' ? DRY.x2 : world.width - DRY.x1;
    const w = (x2 - x1) / DRY.cols;
    const h = (DRY.y2 - DRY.y1) / DRY.rows;
    const units = [];
    for (let r = 0; r < DRY.rows; r++) {
      for (let c = 0; c < DRY.cols; c++) {
        // Plant B's units are numbered as the mirror of Plant A's, as the chillers are.
        const col = plant === 'A' ? c : DRY.cols - 1 - c;
        units.push({ id: `dry-${plant}-${r * DRY.cols + c}`, x: x1 + (col + 0.5) * w, y: DRY.y1 + (r + 0.5) * h, w: w - 12, h: h - 12 });
      }
    }
    return { plant, x1, x2, y1: DRY.y1, y2: DRY.y2, units };
  });

  /**
   * Pipes from each plant's north and south pumps out through the end wall to its dry cooler block:
   * [{ plant, half, points: [{ x, y }] }], each a path along the ground.
   */
  const DRY_PIPES = PUMPS.map((p) => {
    const block = DRY_COOLERS.find((d) => d.plant === p.plant);
    const outward = p.plant === 'A' ? -1 : 1;
    const runX = (block.x1 + block.x2) / 2;
    const edgeY = p.half === 't' ? block.y1 : block.y2;
    return {
      plant: p.plant,
      half: p.half,
      points: [
        { x: p.x + outward * 20, y: p.y },
        { x: runX, y: p.y },
        { x: runX, y: edgeY },
      ],
    };
  });
  return { TRANSFORMERS, RMUS, POWER_LINES, POLES, DRY_COOLERS, DRY_PIPES };
}
