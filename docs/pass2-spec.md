# FacOps pass 2 build spec

Draft 0.3, 12 November 2026. **Waiting for the owner's approval.** Nothing in this document is built yet. Once approved it becomes the source of truth for pass 2, exactly as `docs/pass1-spec.md` was for pass 1. If the code and this spec disagree, the spec wins. If the spec is silent or looks wrong, stop and ask the owner.

Items marked **[Recommended]** are choices made for the owner, kept unless the owner changes them. Everything else follows from the owner's map drawing (12 November) and answers. Drafts 0.2 and 0.3 take in the owner's changes: a 300 MW building, 8 chillers and 2 pumps per plant, pass 1's zoom with a map that scrolls in every direction, and both CDUs of a hall feeding all 6 rows.

## 0. Where things stand

Pass 1 is complete (milestones M1 to M7, tag `m7`): one fixed screen, plant yard plus two halls, three techs, all five alarms, tuning drawer, results with Copy.

The pass 1 test question (spec section 13: ten rounds, does triage feel interesting?) has not been answered yet. The design doc says to fix dispatch before adding content. Pass 2 goes ahead at the owner's request; pass 1 stays playable at `/pass1/` (milestone M8) so the two can be compared.

**Owner agreement on rule changes.** The owner asked for the new map, eight halls, Deliveries, the Network tech and crew growth on 12 November 2026. That is the agreement `CLAUDE.md` requires for changing `src/core/` and replacing the pass 1 rule tests with pass 2 equivalents. Rule tests may be rewritten for the new map; they may not be weakened (every pass 1 rule that survives keeps a test).

## 1. What pass 2 is

The full Commissioning Run from the design doc, on a new, bigger map:

- One long building of **300 MW**: **8 data halls** in **4 pairs**, with a **plant area at each end** (8 chillers and 2 pumps each).
- The map keeps **pass 1's zoom** and **scrolls** in every direction, with small arrows at the edges pointing to alarms out of view.
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

The owner's drawing shows the right half of the building. The left half is its mirror image across the centre line (the pink line in the drawing), and the building is open along that line: no wall. The building is also symmetric top to bottom about the middle aisle of the halls.

World units are the same size as pass 1's, so every icon keeps its pass 1 size (`ICON_SIZE` in `src/render/icons.js`: rack 44, MSB 66, CDU 44, chiller 100, pump 80, tech 46). The building is **3920 wide and 780 tall**, origin top-left, y down. The centre line is x = 1960. Everything in the left half is the mirror of the right half: **x' = 3920 - x**. The bottom half mirrors the top: **y' = 780 - y**.

From left to right:

```
| Plant B | 8 | 7 |   | 6 | 5 |  :  | 4 | 3 |   | 2 | 1 | Plant A |
            pair       pair     centre  pair       pair
```

Halls come online in order 1 to 8, so the campus grows from Plant A outward across the building. Hall 5 mirrors hall 4, 6 mirrors 3, 7 mirrors 2 and 8 mirrors 1.

### 3.2 Right half, exact positions

Every hall is 320 wide and 430 tall, from y = 175 to y = 605. Its middle aisle is at y = 390, the building's horizontal centre line.

| Thing | x | y | Notes |
|---|---|---|---|
| Hall 4 | 2040 to 2360 | 175 to 605 | Pair with hall 3, shared wall at x = 2360 |
| Hall 3 | 2360 to 2680 | 175 to 605 | |
| Hall 2 | 2800 to 3120 | 175 to 605 | Pair with hall 1, shared wall at x = 3120 |
| Hall 1 | 3120 to 3440 | 175 to 605 | |
| Plant A chiller area | 3490 to 3830 | 170 to 610 | 8 chillers in two columns of four |
| Plant A top pump | icon (3870, 40) | | Service point (3870, 95) |
| Plant A bottom pump | icon (3870, 740) | | Service point (3870, 685) |
| Building outline | 0 to 3920 | 0 to 780 | Outer walls on all sides except along the centre line |

Chillers in Plant A: two columns at x = 3550 and x = 3770, four in each at y = 225, 335, 445, 555 (`chiller-A-0` to `chiller-A-7`, top to bottom, west column first). The plant lane runs between the columns at x = 3660; every chiller's service point is on it at the chiller's y.

### 3.3 Inside a hall

Positions inside a hall use **s**, the distance from the hall's shared wall toward its outer wall (0 to 320). For hall 1, s grows to the right from x = 3120; for hall 2, s grows to the left from x = 3120.

| Thing | Position | From the drawing |
|---|---|---|
| Rack rows | 3 columns at s = 90, 160, 230. Each column is split by the middle aisle into a **top row** and a **bottom row**: **6 rows per hall.** A row is drawn as 3 rack cabinets, at y = 238, 284, 330 (top row) and 450, 496, 542 (bottom row). | Purple lines |
| Outer aisle | s = 290, the full height of the hall, continuing out through the doors to both corridors | |
| Inner aisle | s = 30, y 200 to 580 | |
| Middle aisle | y = 390, from s = 30 to s = 290 | |
| Outer doors | In the top and bottom walls at s = 290 | Red, at the outer corners |
| Shared-wall doors | In the shared wall at y = 270 and y = 510, joining the inner aisles of the two halls in a pair | Red, on the middle wall |

A rack row's service point is where its column meets the middle aisle: (column x, 390).

### 3.4 Around a hall

Each hall has **4 MSBs** in **2 pairs** and **2 CDUs**. The MSB pairs each feed one half of the hall; the two CDUs are a redundant pair that **together feed all 6 rows**:

| Equipment | Icon centre | Service point | Feeds |
|---|---|---|---|
| Top MSB pair, sides A and B | (hall centre ∓ 60, 40) | (same x, 95) on the top corridor | The top 3 rows |
| Top CDU | (hall centre, 140) | (hall centre, 95) | All 6 rows, shared with the bottom CDU |
| Bottom CDU | (hall centre, 640) | (hall centre, 685) | All 6 rows, shared with the top CDU |
| Bottom MSB pair, sides A and B | (hall centre ∓ 60, 740) | (same x, 685) on the bottom corridor | The bottom 3 rows |

### 3.5 Walking

Techs walk only along lanes, and pass through walls only at doors:

| Lane | Where |
|---|---|
| Top corridor | y = 95, x 50 to 3870 |
| Bottom corridor | y = 685, x 50 to 3870 |
| Plant lanes | x = 3660 and x = 260, y 95 to 685 |
| Centre lane (the open centre line) | x = 1960, y 95 to 685 |
| Gaps between pairs | x = 2740 and x = 1180, y 95 to 685 |
| In every hall | Outer aisle (corridor to corridor, through both outer doors), inner aisle, middle aisle, and the two shared-wall links |

`route(from, to)` returns the shortest path; every hop is horizontal or vertical.

Walk speed rises from 120 to **150** units per second because the building is much bigger than pass 1's map. Hall 1 to hall 4 is then about 9 s, and Plant A to hall 8 about 25 s. Long walks are on purpose (they were the first lever pass 1 named for adding depth); M9 checks the pacing.

The crew starts on Plant A's lane at (3660, 390). A tech who joins later appears at the top outer door of the hall that just came online.

### 3.6 Equipment ids and labels

| Equipment | Id | Location tag |
|---|---|---|
| Rack row | `row-<hall>-<t or b>-<column 0 to 2>` | `H3 top`, `H3 bottom` |
| CDU | `cdu-<hall>-<t or b>` | `H3 top` |
| MSB | `msb-<hall>-<t or b>-<A or B>` | `H3 top A` |
| Chiller | `chiller-<A or B>-<0 to 7>` | `Plant A` |
| Pump | `pump-<A or B>-<t or b>` | `Plant A` |

## 4. The rules

Pass 1 rules carry over except where this section says otherwise.

### 4.1 Load

The whole building is **300 MW**.

| Value | Number |
|---|---|
| Full building (8 halls) | 300 MW |
| One hall (6 rows) | 37.5 MW |
| One rack row | 6.25 MW |

- Capacity online is the sum of online halls. The HUD shows load in MW, for example `68 / 75 MW`.
- Row output = 6.25 MW x row level x cooling factor.
- Row level is 0 if the row has a network failure, if its half of the hall is dark, or if **both** of the hall's CDUs are leaking; 0.8 if **one** of them is leaking (the other CDU carries most of the load); otherwise 1. Recovery over 3 s, as in pass 1.
- Losses on screen are rounded to whole MW: about -6 for a row, -8 for a first leak, -30 more when the second CDU goes, -19 for half a hall dark, -38 for a whole hall.

### 4.2 Alarms

| Alarm | On | When it fires | Clock | When the clock runs out | Fix time |
|---|---|---|---|---|---|
| Network Failure | A rack row | That row drops to zero (-6.25 MW) | 30 s | Takes down the next row in the same half of the hall, which becomes its own alarm. Repeats every 30 s. | 3 s |
| CDU Leak | A CDU | The hall's 6 rows throttle to 80% (-7.5 MW) | 30 s | The hall's other CDU starts leaking too, as its own alarm. Both leaking: all 6 rows shut down (-37.5 MW in all) until either is fixed. | 8 s |
| Breaker Trip | One MSB of a pair | Nothing lost | 45 s | The other MSB of the same pair trips. Both down: that half of the hall is dark (-18.75 MW) until either is reset. | 6 s |
| Chiller Trip | A chiller | Nothing lost while enough chillers run (4.4) | 60 s | Another running chiller trips | 10 s |
| Pump Overpressure | A pump | Nothing lost | 20 s | The loop bursts: up to two CDU Leaks on that pump's loop (4.5), and the pump alarm ends | 6 s |

All the pass 1 rules for every alarm stay: one alarm per piece of equipment, clocks stand still while a tech is on site fixing, the matching trade is 15% faster, nothing is ever permanently lost.

### 4.3 Power

Each half of a hall (top or bottom) has its own MSB pair. One MSB of a pair down costs nothing. Both down: that half is dark. A whole hall is dark only if both pairs are down. The power shield shows the worse of the hall's two pairs.

### 4.3a Liquid cooling (CDUs)

The hall's two CDUs are a redundant pair feeding all 6 rows, the same idea as an MSB pair. One leaking costs a little (the rows throttle to 80%) because the other CDU carries most of the load; both leaking shuts every row down. Ignoring a leak lets it spread to the other CDU, the way an ignored breaker trips the other side.

### 4.4 Cooling

Redundancy is a theme: most single failures cost nothing at first, and the player chooses between a problem close by and a backup that is quietly running out.

- Each plant has **8 chillers** and **2 pumps**. The chillers of both plants share one cooling loop.
- Chillers needed = online halls x 1.25, rounded up. Plant A alone, then both plants from hall 6:

| Halls online | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
|---|---|---|---|---|---|---|---|---|
| Chillers needed | 2 | 3 | 4 | 5 | 7 | 8 | 9 | 10 |
| Chillers installed | 8 | 8 | 8 | 8 | 8 | 16 | 16 | 16 |
| Spares | 6 | 5 | 4 | 3 | 1 | 8 | 7 | 6 |

- Cooling factor target = running chillers ÷ needed, at most 1. It drifts 0.02 per second, as in pass 1.
- The cooling shield is **whole** with 2 or more spares running, **cracked** with 1 or 0 spares, **broken** when fewer than needed run.

The spares shrink as the campus grows, down to a single spare at 5 halls, which is why Plant B arrives with hall 6. A chiller trip early on can wait; the same trip at 5 halls cannot.

### 4.5 Pumps

Each plant has a top pump and a bottom pump. A top pump's loop is the top CDUs, a bottom pump's loop the bottom CDUs. Until Plant B is online, Plant A's pumps feed every online hall. After that, each plant's pumps feed the four halls in its half. A burst puts leaks only on online CDUs of its loop that have no alarm. Because a loop holds only top or only bottom CDUs, a burst never hits both CDUs of one hall.

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
- Mercy: the director never trips the second MSB of a pair, never starts a leak on a hall whose other CDU is already leaking, and trips a chiller only when at least one spare is running. Several chiller alarms may be open at once while spares remain; that is the redundancy choice.
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

## 6. Crew growth  **[Recommended; kept unless the owner changes it]**

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
- **Zoom**: the same as pass 1 on the same screen, so equipment, bubbles and techs are exactly as big as in the prototype. In numbers: the scale is what pass 1's `fitView` gives its 1000 x 500 world in that map region (about 0.66 px per world unit at 844 x 390, 0.47 at 660 x 300). There is no zoom control.
- At 844 x 390 the map shows about a quarter of the building's width and two thirds of its height, so the view **scrolls both ways**.
- **Pan**: drag the map in any direction with a finger or mouse; mouse wheel or trackpad; arrow keys. The view stops at the building's edges. A touch that moves more than 8 px is a drag, not a tap, so map taps now act on finger-up. The rails and HUD still act on finger-down.
- **Start of run**: the view shows hall 1 and Plant A.
- **Off-map indicators**: every alarm out of view gets a small arrow on the edge of the map, on the line from the centre of the view to the alarm, pointing toward it and showing the alarm's fault picture. Indicators that would overlap merge into one with a count. Tapping one pans the view to that alarm (tap area at least 44 x 44). They follow the same art rule as bubbles: never tinted green, yellow or red.
- **Tapping a ticket** or a crew card whose alarm or tech is out of view also pans the view to it, without changing what the tap does.
- **A Delivery** glides the view to the new hall for about 1.5 s.
- Offline halls and Plant B before hall 6 are drawn as **under construction**: pale floor, outlined equipment, no alarms.

### 7.2 Crew bar

With up to 9 techs, cards would be too short. When cards in one column would be shorter than 48 px, the crew bar becomes two columns (148 px wide) and the map region narrows to match.

### 7.3 HUD

Unchanged, plus a short "Hall 3 of 8" text in the free space after the Stability meter. The load readout is in MW against online capacity (for example `68 / 75 MW`).

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
| Chillers needed per hall | `chillersPerHall` | 0.5 to 2, step 0.25 | 1.25 |
| Start with halls | `startHalls` | 1 to 8 | 1 |
| Skip tutorial | `tutorial` off | | Off on the first run |

"Start with halls" lets the owner jump straight to a busy campus to test the late game.

## 10. Milestones

One per session, as before. Commit titles start with the milestone (`M8: ...`) so the action tags them.

### M8. Pass 1 snapshot and the new map

Build: copy the pass 1 build into `/pass1/` so it stays playable. The new layout data (section 3) with route tests (doors, mirror symmetry, every service point reachable, counts). A camera module (pass 1 zoom, pan in both directions, clamp at the edges) and the off-map indicator placement, each with tests. A renderer for the new building with online and offline halls. The main page shows the new map, scrollable, with a `#halls=N` switch to see N halls online.

Owner's checklist: drag the map end to end and top to bottom on the phone; is everything as readable as pass 1, and can you tell the halls apart? Does `/pass1/` still play?

### M9. Rules engine for pass 2

Build: section 4 and 5 in `src/core/`, with the rule tests rewritten for the new map and new tests for MSB pairs, cooling with spares, pump loops, Plant B, Deliveries and the director by phase. Scripted-player checks of the pacing targets in 4.7. `#auto` plays a whole run on the new map (taking the first card at each pick).

Owner's checklist: watch an `#auto` run from 1 hall to as far as it gets; halls come online, Plant B arrives at hall 6.

### M10. Playable on the new map

Build: tap versus drag, off-map indicators, panning to tickets and cards, the two-column crew bar, "Hall N of 8" in the HUD, the Network tech. Deliveries take the first card automatically until M11.

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
| CDU pair | A hall's top and bottom CDUs, which together feed all 6 rows |
| Plant A, Plant B | The chiller and pump areas at the right and left ends |
| Delivery | A full Stability meter: the next hall comes online |
| Full campus | A full meter with all 8 halls online |
