// Pass 1 map: plant yard plus Halls 1 and 2, in world units (1000 x 500, origin top-left, y down).
// Each piece of equipment has an icon center (x, y) and a service point (sx, sy) where a tech stands.
// Techs only ever walk along the lanes below, so every service point sits on a lane.

export const WORLD = { width: 1000, height: 500 };

export const YARD = { x: 20, y: 20, w: 230, h: 460, walkX: 150 };
export const CORRIDOR_X = 270;
export const HALLS = {
  1: { id: 1, x: 300, y: 20, w: 680, h: 220, aisleY: 130, loop: 0 },
  2: { id: 2, x: 300, y: 260, w: 680, h: 220, aisleY: 370, loop: 1 },
};
export const START_POINT = { x: CORRIDOR_X, y: 250 }; // where the crew stands when a round begins

// Walkable lanes: axis-aligned segments. Junctions are where they meet.
export const LANES = [
  { id: 'yard', x1: 150, y1: 95, x2: 150, y2: 405 },
  { id: 'link1', x1: 150, y1: 130, x2: 270, y2: 130 },
  { id: 'link2', x1: 150, y1: 370, x2: 270, y2: 370 },
  { id: 'corridor', x1: 270, y1: 130, x2: 270, y2: 370 },
  { id: 'aisle1', x1: 270, y1: 130, x2: 925, y2: 130 },
  { id: 'aisle2', x1: 270, y1: 370, x2: 925, y2: 370 },
];
export const JUNCTIONS = [
  { x: 150, y: 130 },
  { x: 150, y: 370 },
  { x: 270, y: 130 },
  { x: 270, y: 370 },
];

const RACK_X0 = 215;
const RACK_DX = 85;
const ROW_DY = [62, 158];
const CDU_DX = 135;

function buildEquipment() {
  const list = [];
  const chillerY = [95, 250, 405];
  chillerY.forEach((y, i) => {
    list.push({ id: `chiller-${i}`, type: 'chiller', index: i, label: `Chiller ${i + 1}`, x: 80, y, sx: YARD.walkX, sy: y });
  });
  const pumpY = [190, 310];
  pumpY.forEach((y, i) => {
    list.push({ id: `pump-${i}`, type: 'pump', index: i, loop: i, label: i === 0 ? 'Pump W' : 'Pump E', x: 205, y, sx: YARD.walkX, sy: y });
  });
  for (const hall of Object.values(HALLS)) {
    list.push({ id: `msb-${hall.id}-A`, type: 'msb', hall: hall.id, side: 'A', label: 'MSB A', x: hall.x + 55, y: hall.y + 45, sx: hall.x + 55, sy: hall.aisleY });
    list.push({ id: `msb-${hall.id}-B`, type: 'msb', hall: hall.id, side: 'B', label: 'MSB B', x: hall.x + 625, y: hall.y + 168, sx: hall.x + 625, sy: hall.aisleY });
    for (let row = 0; row < 2; row++) {
      const y = hall.y + ROW_DY[row];
      list.push({ id: `cdu-${hall.id}-${row}`, type: 'cdu', hall: hall.id, row, label: 'CDU', x: hall.x + CDU_DX, y, sx: hall.x + CDU_DX, sy: hall.aisleY });
      for (let idx = 0; idx < 5; idx++) {
        const x = hall.x + RACK_X0 + RACK_DX * idx;
        list.push({ id: `rack-${hall.id}-${row}-${idx}`, type: 'rack', hall: hall.id, row, idx, label: '', x, y, sx: x, sy: hall.aisleY });
      }
    }
  }
  return list;
}

/** Static equipment list. Dynamic status lives in the game state, keyed by the same ids. */
export const EQUIPMENT = buildEquipment();
export const EQUIPMENT_BY_ID = Object.fromEntries(EQUIPMENT.map((e) => [e.id, e]));

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

const same = (a, b) => Math.abs(a.x - b.x) < EPS && Math.abs(a.y - b.y) < EPS;
const manhattan = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

/**
 * Shortest walk between two points that both lie on the lane network.
 * Returns { points, length }: points starts at `from` and ends at `to`; every hop is axis-aligned.
 */
export function route(from, to) {
  const start = { x: from.x, y: from.y };
  const goal = { x: to.x, y: to.y };
  if (same(start, goal)) return { points: [start], length: 0 };

  const nodes = [start, goal];
  for (const j of JUNCTIONS) if (!nodes.some((n) => same(n, j))) nodes.push({ x: j.x, y: j.y });

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

/** Short place name for tickets: "Yard", "H1 A" (switchboard side), "H2 R1" (rack row 1 or 2). */
export function locationTag(equipId) {
  const e = EQUIPMENT_BY_ID[equipId];
  if (!e) return '';
  if (e.type === 'chiller' || e.type === 'pump') return 'Yard';
  if (e.type === 'msb') return `H${e.hall} ${e.side}`;
  return `H${e.hall} R${e.row + 1}`;
}
