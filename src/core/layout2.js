// Pass 2 map (spec docs/pass2-spec.md, section 3): one building of 8 halls in 4 pairs with a plant
// at each end. World units are pass 1's size, so every icon keeps its pass 1 size.
// The campus grows left to right: Plant A and halls 1 to 4 are the left half, laid out by hand
// from the owner's drawing (flipped so it reads left to right); the right half is its mirror
// (x' = WORLD.width - x). The bottom half mirrors the top about the middle aisle (y' = 780 - y).
// Until milestone M9 the rules engine still runs on the pass 1 map (layout.js); this file is only
// drawn and tested.

export const WORLD = { width: 3920, height: 780 };
export const CENTRE_X = WORLD.width / 2;
const mx = (x) => WORLD.width - x; // mirror across the centre line
const my = (y) => WORLD.height - y; // mirror top to bottom

export const HALL_W = 320;
export const HALL_TOP = 175;
export const HALL_BOTTOM = 605;
export const MID_Y = 390; // the halls' middle aisle, the building's horizontal centre line
export const CORRIDOR_TOP = 95;
export const CORRIDOR_BOTTOM = my(CORRIDOR_TOP); // 685

// Hall x ranges in the left half; `shared` is the x of the wall it shares with its pair partner.
const LEFT_HALLS = [
  { id: 1, x: 480, shared: 800 },
  { id: 2, x: 800, shared: 800 },
  { id: 3, x: 1240, shared: 1560 },
  { id: 4, x: 1560, shared: 1560 },
];
// Hall 5 mirrors 4, 6 mirrors 3, 7 mirrors 2, 8 mirrors 1.
const MIRROR_OF = { 5: 4, 6: 3, 7: 2, 8: 1 };

function makeHall(id, x, shared) {
  // dir: +1 when s (distance from the shared wall) grows to the right, -1 when it grows to the left.
  const dir = shared === x ? 1 : -1;
  const plant = id <= 4 ? 'A' : 'B';
  return { id, x, y: HALL_TOP, w: HALL_W, h: HALL_BOTTOM - HALL_TOP, shared, dir, plant, cx: x + HALL_W / 2 };
}

export const HALLS = (() => {
  const out = {};
  for (const h of LEFT_HALLS) out[h.id] = makeHall(h.id, h.x, h.shared);
  for (const [id, of] of Object.entries(MIRROR_OF)) {
    const src = LEFT_HALLS.find((h) => h.id === of);
    out[id] = makeHall(Number(id), mx(src.x + HALL_W), mx(src.shared));
  }
  return out;
})();

/** x of a point s units from a hall's shared wall, toward its outer wall. */
export const hallX = (hall, s) => hall.shared + hall.dir * s;

// Inside a hall (spec 3.3).
export const S_INNER = 30;
export const S_OUTER = 290;
export const ROW_S = [90, 160, 230];
// A row is drawn as 2 rack cabinets at pass 1's size (each 70 tall); three would not fit.
export const RACK_Y = { t: [252, 322], b: [my(322), my(252)] };
export const SHARED_DOOR_Y = [270, my(270)];
const INNER_Y = [200, my(200)];

// Plants (spec 3.2). Plant B mirrors Plant A.
// cols: the column nearer the halls first.
const PLANT_A = { id: 'A', x: 90, w: 340, y: 170, h: 440, lane: 260, cols: [370, 150], pumpX: 50 };
export const CHILLER_Y = [225, 335, 445, 555];
const PUMP_Y = { t: 40, b: my(40) };
const MSB_Y = { t: 40, b: my(40) };
const CDU_Y = { t: 140, b: my(140) };
const MSB_DX = 60;

export const PLANTS = {
  A: PLANT_A,
  B: { id: 'B', x: mx(PLANT_A.x + PLANT_A.w), w: PLANT_A.w, y: PLANT_A.y, h: PLANT_A.h, lane: mx(PLANT_A.lane), cols: [mx(PLANT_A.cols[0]), mx(PLANT_A.cols[1])], pumpX: mx(PLANT_A.pumpX) },
};

/** Where the crew stands when a run begins: Plant A's lane at the middle aisle. */
export const START_POINT = { x: PLANT_A.lane, y: MID_Y };

// ---------------------------------------------------------------- equipment

function buildEquipment() {
  const list = [];
  for (const plant of Object.values(PLANTS)) {
    let i = 0;
    for (const x of plant.cols) {
      for (const y of CHILLER_Y) {
        list.push({ id: `chiller-${plant.id}-${i}`, type: 'chiller', plant: plant.id, index: i, label: `Chiller ${plant.id}${i + 1}`, x, y, sx: plant.lane, sy: y });
        i += 1;
      }
    }
    for (const half of ['t', 'b']) {
      const sy = half === 't' ? CORRIDOR_TOP : CORRIDOR_BOTTOM;
      list.push({ id: `pump-${plant.id}-${half}`, type: 'pump', plant: plant.id, half, label: half === 't' ? 'Pump top' : 'Pump bottom', x: plant.pumpX, y: PUMP_Y[half], sx: plant.pumpX, sy });
    }
  }
  for (const hall of Object.values(HALLS)) {
    for (const half of ['t', 'b']) {
      const sy = half === 't' ? CORRIDOR_TOP : CORRIDOR_BOTTOM;
      // Side A is on the shared-wall side of the hall, side B on the outer side.
      for (const side of ['A', 'B']) {
        const x = hall.cx + (side === 'A' ? -1 : 1) * hall.dir * MSB_DX;
        list.push({ id: `msb-${hall.id}-${half}-${side}`, type: 'msb', hall: hall.id, half, side, label: `MSB ${side}`, x, y: MSB_Y[half], sx: x, sy });
      }
      list.push({ id: `cdu-${hall.id}-${half}`, type: 'cdu', hall: hall.id, half, label: 'CDU', x: hall.cx, y: CDU_Y[half], sx: hall.cx, sy });
      ROW_S.forEach((s, col) => {
        const x = hallX(hall, s);
        const ys = RACK_Y[half];
        list.push({ id: `row-${hall.id}-${half}-${col}`, type: 'row', hall: hall.id, half, col, label: '', x, y: (ys[0] + ys[1]) / 2, racks: ys, sx: x, sy: MID_Y });
      });
    }
  }
  return list;
}

export const EQUIPMENT = buildEquipment();
export const EQUIPMENT_BY_ID = Object.fromEntries(EQUIPMENT.map((e) => [e.id, e]));

// ---------------------------------------------------------------- lanes (spec 3.5)

function buildLanes() {
  const lanes = [];
  const v = (id, x, y1, y2) => lanes.push({ id, x1: x, y1, x2: x, y2 });
  const h = (id, y, x1, x2) => lanes.push({ id, x1, y1: y, x2, y2: y });
  h('corridor-top', CORRIDOR_TOP, 50, WORLD.width - 50);
  h('corridor-bottom', CORRIDOR_BOTTOM, 50, WORLD.width - 50);
  for (const plant of Object.values(PLANTS)) v(`plant-${plant.id}`, plant.lane, CORRIDOR_TOP, CORRIDOR_BOTTOM);
  v('centre', CENTRE_X, CORRIDOR_TOP, CORRIDOR_BOTTOM);
  v('gap-left', 1180, CORRIDOR_TOP, CORRIDOR_BOTTOM);
  v('gap-right', mx(1180), CORRIDOR_TOP, CORRIDOR_BOTTOM);
  for (const hall of Object.values(HALLS)) {
    const outer = hallX(hall, S_OUTER);
    const inner = hallX(hall, S_INNER);
    // The outer aisle runs corridor to corridor through the top and bottom outer doors.
    v(`h${hall.id}-outer`, outer, CORRIDOR_TOP, CORRIDOR_BOTTOM);
    v(`h${hall.id}-inner`, inner, INNER_Y[0], INNER_Y[1]);
    h(`h${hall.id}-middle`, MID_Y, Math.min(inner, outer), Math.max(inner, outer));
  }
  // Shared-wall doors: each link joins the inner aisles of the two halls of a pair.
  const pairs = [[1, 2], [3, 4], [5, 6], [7, 8]];
  for (const [a, b] of pairs) {
    const xa = hallX(HALLS[a], S_INNER);
    const xb = hallX(HALLS[b], S_INNER);
    SHARED_DOOR_Y.forEach((y, k) => h(`door-${a}-${b}-${k}`, y, Math.min(xa, xb), Math.max(xa, xb)));
  }
  return lanes;
}

export const LANES = buildLanes();

// Doors, for drawing gaps in walls: { x, y, vertical } where vertical means the wall runs up-down.
export const DOORS = (() => {
  const out = [];
  for (const hall of Object.values(HALLS)) {
    const outer = hallX(hall, S_OUTER);
    out.push({ hall: hall.id, x: outer, y: HALL_TOP, vertical: false });
    out.push({ hall: hall.id, x: outer, y: HALL_BOTTOM, vertical: false });
  }
  for (const [a] of [[1], [3], [5], [7]]) {
    for (const y of SHARED_DOOR_Y) out.push({ hall: a, x: HALLS[a].shared, y, vertical: true });
  }
  return out;
})();

// ---------------------------------------------------------------- walking

const EPS = 1e-6;

function onLane(p, lane) {
  if (Math.abs(lane.x1 - lane.x2) < EPS) {
    return Math.abs(p.x - lane.x1) < EPS && p.y >= Math.min(lane.y1, lane.y2) - EPS && p.y <= Math.max(lane.y1, lane.y2) + EPS;
  }
  return Math.abs(p.y - lane.y1) < EPS && p.x >= Math.min(lane.x1, lane.x2) - EPS && p.x <= Math.max(lane.x1, lane.x2) + EPS;
}

/** True when the point lies on at least one lane. */
export function isOnNetwork(p) {
  return LANES.some((lane) => onLane(p, lane));
}

// Every point where two lanes meet, found once.
export const JUNCTIONS = (() => {
  const out = [];
  const add = (p) => {
    if (!out.some((q) => Math.abs(q.x - p.x) < EPS && Math.abs(q.y - p.y) < EPS)) out.push(p);
  };
  for (const a of LANES) {
    for (const b of LANES) {
      if (a === b) continue;
      const aV = Math.abs(a.x1 - a.x2) < EPS;
      const bV = Math.abs(b.x1 - b.x2) < EPS;
      if (aV === bV) {
        // Collinear lanes that touch end to end.
        for (const p of [{ x: b.x1, y: b.y1 }, { x: b.x2, y: b.y2 }]) if (onLane(p, a)) add(p);
        continue;
      }
      const p = aV ? { x: a.x1, y: b.y1 } : { x: b.x1, y: a.y1 };
      if (onLane(p, a) && onLane(p, b)) add(p);
    }
  }
  return out;
})();

const same = (a, b) => Math.abs(a.x - b.x) < EPS && Math.abs(a.y - b.y) < EPS;
const manhattan = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

/**
 * Shortest walk between two points that both lie on the lanes.
 * Returns { points, length }: points starts at `from` and ends at `to`; every hop is axis-aligned.
 */
export function route(from, to) {
  const start = { x: from.x, y: from.y };
  const goal = { x: to.x, y: to.y };
  if (same(start, goal)) return { points: [start], length: 0 };
  const nodes = [start, goal];
  for (const j of JUNCTIONS) if (!nodes.some((n) => same(n, j))) nodes.push(j);
  const edges = nodes.map(() => []);
  for (const lane of LANES) {
    const vertical = Math.abs(lane.x1 - lane.x2) < EPS;
    const members = nodes
      .map((n, i) => ({ n, i }))
      .filter(({ n }) => onLane(n, lane))
      .sort((a, b) => (vertical ? a.n.y - b.n.y : a.n.x - b.n.x));
    for (let k = 0; k + 1 < members.length; k++) {
      const a = members[k];
      const b = members[k + 1];
      const w = manhattan(a.n, b.n);
      edges[a.i].push({ to: b.i, w });
      edges[b.i].push({ to: a.i, w });
    }
  }
  const dist = nodes.map(() => Infinity);
  const prev = nodes.map(() => -1);
  const done = nodes.map(() => false);
  dist[0] = 0;
  for (;;) {
    let u = -1;
    for (let i = 0; i < nodes.length; i++) if (!done[i] && (u === -1 || dist[i] < dist[u])) u = i;
    if (u === -1 || dist[u] === Infinity) break;
    done[u] = true;
    for (const e of edges[u]) {
      if (dist[u] + e.w < dist[e.to] - EPS) {
        dist[e.to] = dist[u] + e.w;
        prev[e.to] = u;
      }
    }
  }
  if (dist[1] === Infinity) throw new Error(`No route from (${from.x}, ${from.y}) to (${to.x}, ${to.y}): is a point off the lanes?`);
  const points = [];
  for (let i = 1; i !== -1; i = prev[i]) points.unshift(nodes[i]);
  return { points, length: dist[1] };
}

/** Short place name for tickets (spec 3.6): "H3 top", "H3 top A", "Plant A". */
export function locationTag(equipId) {
  const e = EQUIPMENT_BY_ID[equipId];
  if (!e) return '';
  if (e.type === 'chiller' || e.type === 'pump') return `Plant ${e.plant}`;
  const half = e.half === 't' ? 'top' : 'bottom';
  if (e.type === 'msb') return `H${e.hall} ${half} ${e.side}`;
  return `H${e.hall} ${half}`;
}
