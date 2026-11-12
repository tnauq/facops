# FacOps pass 2 build spec

Draft 0.1, 12 November 2026. **Waiting for the owner's approval.** Nothing in this document is built yet. Once approved it becomes the source of truth for pass 2, exactly as `docs/pass1-spec.md` was for pass 1. If the code and this spec disagree, the spec wins. If the spec is silent or looks wrong, stop and ask the owner.

Items marked **[Decide]** are open choices the owner should confirm or change before approval. Everything else follows from the owner's map drawing (12 November) and answers.

## 0. Where things stand

Pass 1 is complete (milestones M1 to M7, tag `m7`): one fixed screen, plant yard plus two halls, three techs, all five alarms, tuning drawer, results with Copy.

The pass 1 test question (spec section 13: ten rounds, does triage feel interesting?) has not been answered yet. The design doc says to fix dispatch before adding content. Pass 2 goes ahead at the owner's request; pass 1 stays playable at `/pass1/` (milestone M8) so the two can be compared.

**Owner agreement on rule changes.** The owner asked for the new map, eight halls, Deliveries, the Network tech and crew growth on 12 November 2026. That is the agreement `CLAUDE.md` requires for changing `src/core/` and replacing the pass 1 rule tests with pass 2 equivalents. Rule tests may be rewritten for the new map; they may not be weakened (every pass 1 rule that survives keeps a test).

## 1. What pass 2 is

The full Commissioning Run from the design doc, on a new, bigger map:

- One long building: **8 data halls** in **4 pairs**, with a **plant area at each end** (chillers and two pumps).
- The map is **wider than the screen and scrolls sideways**, so equipment and alarms stay big enough to read and tap.
- The run starts with **hall 1** and grows. Each full Stability meter is a **Delivery**: the next hall comes online with its own MSBs and CDUs.
- When **hall 6** comes online, the **second plant** (mirrored chillers and pumps) comes online with it.
- **Four trades**, including the new blue **Network** tech, and a **growing crew** (section 6).
- A short **tutorial** on hall 1.

Questions pass 2 answers:

1. Is the run fun from 1 hall to 8? Do runs end in a sensible time (target: 6 to 12 minutes for a good player)?
2. Does the scrolling map stay readable and quick to play on the iPhone?
3. Do the crew choices at each Delivery add anything?

Not in pass 2: the CEO, sound, puddles, staging, final art, anything online.

## 2. Rules of the build

Unchanged from pass 1 section 2 (plain JavaScript, no libraries, no build step, GitHub Pages, `node --test`, numbers in `src/core/config.js`, seeded randomness, no network, `localStorage` in `try`/`catch`, iPhone 17e landscape, 660 x 300 floor, 44 px tap targets). Milestone tags are made automatically by the `Tag milestones` action from commit titles (`M8: ...`).

## 3. The map

### 3.1 Shape

The owner's drawing shows the right half of the building. The left half is its mirror image across the centre line (the pink line in the drawing), and the building is open along that line: no wall.

World units: the whole building is **2000 wide and 560 tall**, origin top-left, y down. The centre line is x = 1000. Everything in the left half is the mirror of the right half: **x' = 2000 - x**.

From left to right:

```
| Plant B | 8 | 7 |   | 6 | 5 |  :  | 4 | 3 |   | 2 | 1 | Plant A |
            pair       pair     centre  pair       pair
```

Halls come online in order 1 to 8, so the campus grows from Plant A outward across the building. Hall 5 mirrors hall 4, 6 mirrors 3, 7 mirrors 2 and 8 mirrors 1.

### 3.2 Right half, exact positions

Every hall is 160 wide and 360 tall, from y = 100 to y = 460.

| Thing | x | y | Notes |
|---|---|---|---|
| Hall 4 | 1080 to 1240 | 100 to 460 | Pair with hall 3, shared wall at x = 1240 |
| Hall 3 | 1240 to 1400 | 100 to 460 | |
| Hall 2 | 1480 to 1640 | 100 to 460 | Pair with hall 1, shared wall at x = 1640 |
| Hall 1 | 1640 to 1800 | 100 to 460 | |
| Plant A chiller area | 1840 to 1950 | 130 to 430 | Three chillers |
| Plant A top pump | icon (1955, 26) | | Service point (1955, 56) |
| Plant A bottom pump | icon (1955, 534) | | Service point (1955, 504) |
| Building outline | 0 to 2000 | 0 to 560 | Outer walls on all sides |

### 3.3 Inside a hall

Positions inside a hall use **s**, the distance from the hall's shared wall toward its outer wall (0 to 160). For hall 1, s grows to the right from x = 1640; for hall 2, s grows to the left from x = 1640.

| Thing | Position | From the drawing |
|---|---|---|
| Rack rows | 3 columns at s = 50, 80, 110. Each column is split by the middle aisle into a **top row** (y 120 to 255) and a **bottom row** (y 305 to 440). **6 rows per hall.** | Purple lines |
| Outer aisle | s = 145, the full height of the hall, continuing out through the doors to both corridors | |
| Inner aisle | s = 15, y 115 to 445 | |
| Middle aisle | y = 280, from s = 15 to s = 145 | |
| Outer doors | In the top and bottom walls at s = 145 | Red, at the outer corners |
| Shared-wall doors | In the shared wall at y = 170 and y = 390, joining the inner aisles of the two halls in a pair | Red, on the middle wall |

### 3.4 Around a hall

Each hall has **4 MSBs** in **2 pairs** and **2 CDUs**:

| Equipment | Icon centre | Service point | Feeds |
|---|---|---|---|
| Top MSB pair, sides A and B | (hall centre ∓ 38, 26) | (same x, 56) on the top corridor | The top 3 rows |
| Top CDU | (hall centre, 82) | (hall centre, 56) | The top 3 rows |
| Bottom CDU | (hall centre, 478) | (hall centre, 504) | The bottom 3 rows |
| Bottom MSB pair, sides A and B | (hall centre ∓ 38, 534) | (same x, 504) on the bottom corridor | The bottom 3 rows |

A rack row's service point is where its column meets the middle aisle: (column x, 280).

Chillers in Plant A: icons at (1895, 170), (1895, 280), (1895, 390); service points at (1820, same y) on the plant lane.

### 3.5 Walking

Techs walk only along lanes, and pass through walls only at doors:

| Lane | Where |
|---|---|
| Top corridor | y = 56, x 45 to 1955 |
| Bottom corridor | y = 504, x 45 to 1955 |
| Plant lanes | x = 1820 and x = 180, y 56 to 504 |
| Centre lane (the open centre line) | x = 1000, y 56 to 504 |
| Gaps between pairs | x = 1440 and x = 560, y 56 to 504 |
| In every hall | Outer aisle (corridor to corridor, through both outer doors), inner aisle, middle aisle, and the two shared-wall links |

`route(from, to)` returns the shortest path; every hop is horizontal or vertical. Walk speed stays 120 units per second, so the far end of the building is about 15 s from Plant A. That is on purpose: longer walks were the first lever pass 1 named for adding depth.

The crew starts on Plant A's lane at (1820, 280). A tech who joins later appears at the top outer door of the hall that just came online.

### 3.6 Equipment ids and labels

| Equipment | Id | Location tag |
|---|---|---|
| Rack row | `row-<hall>-<t or b>-<column 0 to 2>` | `H3 top`, `H3 bottom` |
| CDU | `cdu-<hall>-<t or b>` | `H3 top` |
| MSB | `msb-<hall>-<t or b>-<A or B>` | `H3 top A` |
| Chiller | `chiller-<A or B>-<0 to 2>` | `Plant A` |
| Pump | `pump-<A or B>-<t or b>` | `Plant A` |

## 4. The rules

Pass 1 rules carry over except where this section says otherwise.

### 4.1 Load

| Value | Number |
|---|---|
| One healthy rack row | 50 MW |
| One hall (6 rows) | 300 MW |
| Full campus (8 halls) | 2.4 GW |

**[Decide]** The drawing has 6 rows per hall. 50 MW a row gives round losses on screen (-50, -60, -90, -150, -300) and a 2.4 GW campus. The alternative, 250 MW halls for a round 2 GW campus, gives losses like -42 MW.

- Capacity online is the sum of online halls.
- Row output = 50 MW x row level x cooling factor.
- Row level is 0 if the row has a network failure, if its half of the hall is dark, or if its CDU's rows are shut down; 0.6 if its CDU is leaking; otherwise 1. Recovery over 3 s, as in pass 1.

### 4.2 Alarms

| Alarm | On | When it fires | Clock | When the clock runs out | Fix time |
|---|---|---|---|---|---|
| Network Failure | A rack row | That row drops to zero (-50 MW) | 30 s | Takes down the next row in the same half of the hall, which becomes its own alarm. Repeats every 30 s. | 3 s |
| CDU Leak | A CDU | Its 3 rows throttle to 60% (-60 MW) | 30 s | Those 3 rows shut down (-150 MW in all) until fixed | 8 s |
| Breaker Trip | One MSB of a pair | Nothing lost | 45 s | The other MSB of the same pair trips. Both down: that half of the hall is dark (-150 MW) until either is reset. | 6 s |
| Chiller Trip | A chiller | Nothing lost while enough chillers run (4.4) | 60 s | Another running chiller trips | 10 s |
| Pump Overpressure | A pump | Nothing lost | 20 s | The loop bursts: up to two CDU Leaks on that pump's loop (4.5), and the pump alarm ends | 6 s |

All the pass 1 rules for every alarm stay: one alarm per piece of equipment, clocks stand still while a tech is on site fixing, the matching trade is 15% faster, nothing is ever permanently lost.

### 4.3 Power

Each half of a hall (top or bottom) has its own MSB pair. One MSB of a pair down costs nothing. Both down: that half is dark. A whole hall is dark only if both pairs are down. The power shield shows the worse of the hall's two pairs.

### 4.4 Cooling

- The chillers of both plants share one cooling loop.
- Chillers needed = online halls ÷ 2, rounded up (1 hall needs 1, 4 halls need 2, 5 need 3, 8 need 4).
- Cooling factor target = running chillers ÷ needed, at most 1. It drifts 0.02 per second, as in pass 1. (With 2 needed and 1 running this gives pass 1's 50%.)
- Plant A has 3 chillers from the start. Plant B adds 3 more when hall 6 comes online.

This is why Plant B arrives at hall 6: with 5 halls, Plant A's three chillers are all needed and there is no spare.

**[Decide]** With 5 halls the cooling shield has no redundancy until Plant B arrives. That is tense on purpose; the alternative is one chiller per 3 halls, which keeps a spare at every stage.

### 4.5 Pumps

Each plant has a top pump and a bottom pump. A top pump's loop is the top CDUs, a bottom pump's loop the bottom CDUs. Until Plant B is online, Plant A's pumps feed every online hall. After that, each plant's pumps feed the four halls in its half. A burst puts leaks only on online CDUs of its loop that have no alarm.

### 4.6 Deliveries

- The Stability meter starts at 40. Green fills it **1.5 points per second** (pass 1: 1), so about 40 s of green brings a Delivery. Yellow and red drain as in pass 1.
- **Full meter: a Delivery.** The next hall comes online with its 4 MSBs, 2 CDUs and 6 rows, at full health. Hall 6 also brings Plant B. A crew reward follows (section 6). The meter resets to 40 and the director holds off for 5 s.
- After hall 8 the meter is a buffer only. A full meter at 8 halls is the **Full campus** milestone, shown on the results.
- The meter cannot empty before the first Delivery: it stops at 1.
- **Run over**: the meter empties. Score: energy delivered in GWh (one real second counts as one plant minute).

### 4.7 The alarm director

| Value | Number |
|---|---|
| Interval at the start of each phase, by halls online (1 to 8) | 12, 9, 7.5, 6.5, 5.5, 5, 4.5, 4 s |
| Tightening | 3% every 10 s, reset at each Delivery |
| Shortest interval | 1.5 s |
| Jitter | ± 30% |
| Waves | From 3 halls online, about every 45 s, two extra alarms |
| Cap | No new director alarms while active alarms are at crew size + 2. After Full campus the cap rises by 1 every 45 s. |
| Alarm types | Hall 1: Breaker, Chiller, Leak only. From hall 2: all five. |
| Mix (among unlocked types) | Network 35, CDU Leak 25, Breaker 15, Pump 15, Chiller 10 |

- Only online equipment is ever picked.
- Mercy: the director never trips the second MSB of a pair, and trips a chiller only when at least one spare chiller is running and no chiller alarm is active.
- Escalations ignore the cap.

These are starting values. M9 checks them with scripted players: target a first Delivery at 1:30 to 2:00 and hall 8 at 6 to 9 minutes for a good scripted player.

## 5. Technicians

| Trade | Hat | Faster on |
|---|---|---|
| Electrical | Yellow, bolt | Breaker Trip |
| Mechanical | Red, snowflake | Chiller Trip, Pump Overpressure |
| Critical Environment | Green, droplet | CDU Leak |
| Network (new) | Blue, linked nodes | Network Failure |

Trades stay flavor: 15% faster on the matching alarm, never required. The Network hat and its drawing already exist in `src/render/icons.js`.

## 6. Crew growth  **[Decide: this is the recommended scheme]**

| Delivery | Hall online | Crew change |
|---|---|---|
| Start | 1 | Electrical, Mechanical |
| 1 | 2 | + Critical Environment (automatic) |
| 2 | 3 | + Network (automatic) |
| 3 to 7 | 4 to 8 | **Pick 1 of 3 cards** |

The cards at each pick:

- **Two Hire cards**: one tech each, for the two trades with the fewest techs (ties: Network, Mechanical, Critical Environment, Electrical).
- **One Upgrade card**, chosen by the seeded generator from those not yet maxed:

| Upgrade | Effect | Max |
|---|---|---|
| Carts | Whole crew walks 20% faster | 2 |
| Better tools | All fixes 15% faster (stacks with the matching hat) | 2 |
| Radios | A dropped job keeps its progress 20 s instead of 10 | 1 |

A player who always hires ends with 9 techs for 8 halls; one who always upgrades stays at 4. There is always a Hire on offer. The game pauses while the cards are up. The choice is recorded for the results.

## 7. The screen

Pass 1 sections 6 and 7 carry over, with these changes.

### 7.1 The scrolling map

- The map region is the same as pass 1 (between the crew bar and the alarm rail, below the HUD).
- **Zoom**: the building's full height fits the map region. At 844 x 390 that is about 0.62 px per world unit, so a hall is about 100 px wide and the visible map shows roughly half the building.
- **Pan**: drag the map sideways with a finger or mouse, mouse wheel or trackpad, or the arrow keys. The view stops at the ends of the building. A tap that moves more than 8 px is a drag, not a tap, so map taps now act on finger-up. The rails and HUD still act on finger-down.
- **Start of run**: the view shows the right end (Plant A and hall 1).
- **Off-screen alarms**: a marker at the left or right edge of the map shows how many alarms are out of view on that side. Tapping it pans there. It is at least 44 x 44.
- **Tapping a ticket** or a crew card whose alarm or tech is out of view also pans the view to it, without changing what the tap does.
- **A Delivery** glides the view to the new hall for about 1.5 s.
- Offline halls and Plant B before hall 6 are drawn as **under construction**: pale floor, outlined equipment, no alarms.

**[Decide]** If equipment is still too small to read at this zoom on the phone, the fallback is a closer zoom with up-and-down panning too. That is easy to add later; it is not in this draft.

### 7.2 Crew bar

With up to 9 techs, cards would be too short. When cards in one column would be shorter than 48 px, the crew bar becomes two columns (148 px wide) and the map region narrows to match.

### 7.3 HUD

Unchanged, plus a short "Hall 3 of 8" text in the free space after the Stability meter. The load readout shows online capacity (for example `0.88 / 0.90 GW`).

### 7.4 Delivery card

An overlay like the others. It says which hall is online (and "Plant B online" at hall 6) and which tech joined, or shows the three cards to pick from. Each card is at least 44 px tall and shows a hat or an upgrade picture with one line of text.

### 7.5 Results

Pass 1's results plus: halls reached, Full campus yes or no, the time of each Delivery, the final crew, and the upgrades taken. `resultsText` gains the same lines so Copy still gives everything.

## 8. Tutorial (hall 1)

Short and seamless, following the design doc section 9, steps 1 to 5 only: assign, a matching hat, a leak's immediate loss, choosing between two alarms, and a redirect. One-line callouts, scripted alarms, no "tutorial complete" screen. The first Delivery ends it. A "Skip tutorial" switch in the tuning drawer, on by default after the first finished run.

## 9. Tuning drawer

Pass 1's controls stay. New ones:

| Label | Config key | Range | Default |
|---|---|---|---|
| Meter fill per second | `meter.fill` | 0.5 to 3, step 0.25 | 1.5 |
| Halls per chiller | `hallsPerChiller` | 1 to 3 | 2 |
| Start with halls | `startHalls` | 1 to 8 | 1 |
| Skip tutorial | `tutorial` off | | Off on the first run |

"Start with halls" lets the owner jump straight to a busy campus to test the late game.

## 10. Milestones

One per session, as before. Commit titles start with the milestone (`M8: ...`) so the action tags them.

### M8. Pass 1 snapshot and the new map

Build: copy the pass 1 build into `/pass1/` so it stays playable. The new layout data (section 3) with route tests (doors, mirror symmetry, every service point reachable, counts). A camera module (fit height, pan, clamp) with tests. A renderer for the new building with online and offline halls. The main page shows the new map, scrollable, with a `#halls=N` switch to see N halls online.

Owner's checklist: drag the map end to end on the phone; can you read every machine and tell the halls apart? Does `/pass1/` still play?

### M9. Rules engine for pass 2

Build: section 4 and 5 in `src/core/`, with the rule tests rewritten for the new map and new tests for MSB pairs, cooling by halls, pump loops, Plant B, Deliveries and the director by phase. Scripted-player checks of the pacing targets in 4.7. `#auto` plays a whole run on the new map (taking the first card at each pick).

Owner's checklist: watch an `#auto` run from 1 hall to as far as it gets; halls come online, Plant B arrives at hall 6.

### M10. Playable on the new map

Build: tap versus drag, off-screen markers, panning to tickets and cards, the two-column crew bar, "Hall N of 8" in the HUD, the Network tech. Deliveries take the first card automatically until M11.

Owner's checklist: play a run with your thumbs; is panning comfortable? Do you lose track of alarms off screen?

### M11. Deliveries and crew picks

Build: the Delivery card and crew picks (section 6), the camera glide to the new hall, the results additions, the new tuning controls.

Owner's checklist: do the picks feel like real choices?

### M12. Tutorial

Build: section 8.

Owner's checklist: hand the phone to someone new; can they get through hall 1 unaided?

### M13. Feel and phone check for pass 2

Build: floating losses for the new figures, a celebration when a hall comes online, a check that the phone holds 60 frames per second with 8 halls and 15 alarms.

Owner's checklist: play five full runs and paste the results.

## 11. Words

| Word | Meaning |
|---|---|
| Pair (of halls) | Two halls sharing a wall, joined by two doors |
| MSB pair | The two MSBs (A and B) feeding one half of a hall |
| Plant A, Plant B | The chiller and pump areas at the right and left ends |
| Delivery | A full Stability meter: the next hall comes online |
| Full campus | A full meter with all 8 halls online |
