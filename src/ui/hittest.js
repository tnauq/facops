// What a tap hits (spec section 7.1). Pure: give it the tap point and the screen targets.
// Checked in order, first hit wins: HUD buttons, crew cards, tickets, alarm bubbles, techs on the map.
// Buttons, cards and tickets arrive in milestones 3 and 4; the lists are simply empty until then.

export const HIT_RADIUS = 22; // px around a bubble or tech center: a 44 px tap target

const inRect = (p, r) => p.x >= r.x && p.x < r.x + r.w && p.y >= r.y && p.y < r.y + r.h;

// Of the circles within reach, the one whose center is nearest.
function nearest(p, circles) {
  let best = null;
  let bestD = Infinity;
  for (const c of circles) {
    const d = Math.hypot(p.x - c.x, p.y - c.y);
    if (d <= HIT_RADIUS && d < bestD) {
      best = c;
      bestD = d;
    }
  }
  return best;
}

/**
 * targets: { buttons, cards, tickets } as rectangles { id, x, y, w, h },
 * and { bubbles, techs } as centers { id, x, y }, all in CSS pixels.
 * Returns { kind: 'button' | 'tech' | 'alarm' | 'empty', id }. A crew card counts as its tech
 * and a ticket as its alarm, so the selection rules do not care where the tap landed.
 */
export function hitTest(p, { buttons = [], cards = [], tickets = [], bubbles = [], techs = [] } = {}) {
  const button = buttons.find((r) => inRect(p, r));
  if (button) return { kind: 'button', id: button.id };
  const card = cards.find((r) => inRect(p, r));
  if (card) return { kind: 'tech', id: card.id };
  const ticket = tickets.find((r) => inRect(p, r));
  if (ticket) return { kind: 'alarm', id: ticket.id };
  const bubble = nearest(p, bubbles);
  if (bubble) return { kind: 'alarm', id: bubble.id };
  const tech = nearest(p, techs);
  if (tech) return { kind: 'tech', id: tech.id };
  return { kind: 'empty', id: null };
}
