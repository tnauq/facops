# FacOps pass 6 build spec

Version 0.1, 16 November 2026. Drafted from `claude/FacOps_GDD_v1.0_Additions.md` in the owner's project (decided on 16 November from the owner's sketches). This is the source of truth for pass 6, as `docs/pass5-spec.md` is for pass 5. Pass 5's rules and screen carry over except where this spec says otherwise. If the spec is silent or looks wrong, stop and ask the owner.

Values marked *starting value* are for scripted checks to settle; everything else is the owner's decision.

## 0. What pass 6 is

Two things the owner designed on 16 November:

1. **A new main menu and title**, in the blueprint style, with a Settings card and the same style on the pause menu. Screen only.
2. **A plant with two loops.** Each plant's two pumps become eight glycol pumps in two pump rooms and four water pumps; every chiller sits on both loops; a water loop runs under every hall. Glycol pumps carry chillers and CDUs, water pumps carry halls, and when there are too few the farthest go first. This changes the layout, the rules and the art.

**Owner agreement on rule changes.** The owner decided the pump rules on 16 November (GDD v1.0 additions, section 1.3). Building them changes `src/core/` (layout, rules, config, the scripted builders) and the tests that pin the old pumps and coordinates; tests may be updated to the new layout, never loosened in what they check. Nothing else in `src/core/` changes.

**Classic mode** (Building mode off) runs on the same layout. It gets the new building with every device built, and keeps its own rules: a plant's chillers need any running pump, and water does nothing. Its tests must still pass, updated only for the new coordinates.

## 1. Milestones

One per session, in order. Commit titles start with the milestone so the action tags them.

| Milestone | Build | Touches | Size |
|---|---|---|---|
| M37 | Main menu, Settings, pause menu (2) | Screen | Medium |
| M38 | The longer plant: pump rooms, water pumps, both loops on the map (3) | Layout, screen; rules only to keep today's pump rule on the new spots | Large |
| M39 | Pump rules: farthest first, pumps that stop, the scripted builders (4) | Rules (owner agreed), screen, checks | Large |
| M40 | Teaching and the balance check (5) | Screen, checks | Small to medium |

M38 starts with a layout preview the owner approves before any rule moves (3.1).

## 2. M37. Main menu, Settings, pause menu

### 2.1 Look (GDD v1.0 additions 2.1)

- **The sheet:** ink blue `#1F3A5F` with a 20 px drafting grid in `#2A4A73`, filling the screen behind the start card. Plain HTML and CSS, like the other overlays.
- **The title block, left half:** "DWG FO-001 · REV 6" small in `#9FB3CC` with letter spacing; **FacOps** large in white; a line drawing of four hall outlines on a dashed centre line (inline SVG, white and `#9FB3CC`); the tagline "Facility operations manager wanted" in `#9FB3CC`.
- **The menu, right half:** buttons outlined in `#9FB3CC` with white text; the first solid white with ink text. Every button at least 44 px tall.
- **Below the buttons:** the best score and its highest milestone ("Best: $142,300 · Commissioned"), or the older-rules best as M34 shows it, or "No runs yet".
- No hat colours. At 660 x 300 the two halves still sit side by side; the title shrinks before anything wraps.

### 2.2 The cards

| Card | Buttons | Notes |
|---|---|---|
| Main menu (replaces the start card) | New run, Tutorial, Settings | Resume run joins when saving is built (not in pass 6) |
| Settings (new) | Classic mode (a switch), Pass 1, Map preview, Tuning, Back | Classic mode is the drawer's Building mode switch, the other way round. Pass 1 and Map preview are the links the start card has today. Tuning opens the existing drawer, and its Done returns to Settings |
| Pause menu | Resume, Restart, Settings, and Hand over the keys after the Handover (M34) | Same style. Settings returns to the pause menu |

- **New run** starts a run with the drawer's settings, as Start does today.
- **Tutorial** starts a run with the tutorial on, whatever Skip tutorial says, without changing the saved switch.
- The gear and the pause key open the pause menu as now.
- The results card, the Hire card, the Commissioned card and the sale card keep their current look in pass 6.

### 2.3 Flow

`src/ui/flow.js` gains `menu` (the main menu) and `settings`, with tests: `start` becomes `menu`; settings opens from the menu and the pause menu, and Back returns to the card it came from, as the drawer's Done does; the drawer opened from Settings returns to Settings.

### 2.4 Owner's checklist

- The game opens on the blueprint menu. It reads well on the phone, and nothing is cut off.
- Tutorial starts a run with the lessons even with Skip tutorial on.
- Settings has Classic mode, Pass 1, the map preview and Tuning; Back goes back.
- The pause menu has the same look, with the sale after the Handover.

## 3. M38. The longer plant

### 3.1 Layout (GDD v1.0 additions 1.1)

- **Each plant grows outward**, toward its end of the building. The halls, corridors and yard between the plants keep their shape. *(Built in M38 as a building that runs past x = 0 at the west end, so nothing between the plants moved.)* The building is wider by 200 world units at each end, for the pump rooms (built in M38; the water pumps fitted between the corridor and the chillers without more room). The dry cooler blocks move out with the end walls.
- **Glycol pump rooms:** two at each plant against the end wall, north and south, each with four glycol pumps in a line from top to bottom. Each pump has a short pipe to the right into the room's header. The two rooms' headers join one glycol main.
- **Chillers:** as today, eight in two columns of four with the middle aisle open. The glycol header and the water header run down the **outer** side of each column, glycol outermost; each sends a short stub into its half of every chiller: the glycol stub into the chiller drawing's top half, the water stub into its bottom half (the two components of the existing sprite).
- **Water pumps:** two pairs on the hall side of the chillers, north and south, feeding the water main.
- **Ids:** glycol pumps `gpump-A-0` to `gpump-A-7` (0 to 3 the north room, top to bottom; 4 to 7 the south room), water pumps `wpump-A-0` to `wpump-A-3` (0 and 1 north, 2 and 3 south), mirrored for B. The old `pump-*` spots go.
- **Walking:** every pump has a service point on a lane the crew can reach; the pump rooms open onto the plant's aisles.
- **Before any rule changes:** `map.html` shows the new layout, and the owner approves it from a screenshot at 844 x 390 and from the phone. If the owner asks for changes, make them before 3.2.

### 3.2 The pipes (GDD v1.0 additions 1.2)

All black, overhead with shadows, as today.

- **Glycol:** the dry cooler blocks through the end wall to the inlet side of both pump rooms; the pump room headers to the glycol main; the main to the glycol headers of both chiller columns; out along both corridors to **every CDU**, with a drop into each.
- **Water:** the water pumps to the water main; the main to the water headers; out along both corridors **parallel to the glycol** (on the hall side of it), turning down into each hall's wall **either side of its CDU** (owner, 16 Nov: into the walls, not a dashed line). Under the floor the water is not drawn.
- The north corridor feeds the top halves, the south the bottom halves.

### 3.3 Rules in M38

Only what keeps the game running on the new spots:

- **Building mode:** a plant's chillers run only if it has a **built glycol pump** (today's rule, moved to the new pumps). Water pumps can be built, cost upkeep and alarm, and do nothing else yet. Pump Overpressure can land on either kind, with today's escalation (a burst leaks up to two CDUs).
- **Prices:** $200 for each kind.
- **The start:** today's, with `gpump-A-0` and `gpump-A-1` and `wpump-A-0` in place of `pump-A-t`.
- **Classic mode:** every device built; a plant's chillers need any glycol pump; water pumps do nothing.
- The scripted builders buy a glycol pump where they bought a pump, and one water pump for every two halls (so M39's rules don't break them).
- Build card lines: "Glycol pump: runs Plant A's chillers", "Water pump: will serve 2 halls" (M39 fills in the rest).

### 3.4 Checks

`node --test`, with layout tests updated to the new coordinates. `scripts/pacing4.mjs` (12 seeds) should match M33's table within noise, since only the spots moved.

### 3.5 Owner's checklist

- The plants look like the sketch: four pumps in a line in each room, the chiller headers on the outside with the middle open, the water pumps by the hall.
- The corridors carry two pipes; glycol drops into the CDU and water into the floor on either side.
- Nothing else about the game feels different yet.

## 4. M39. Pump rules (GDD v1.0 additions 1.3)

### 4.1 Rules

All in building mode. *Starting values* in config (`building.pumps`).

- **Glycol pumps and chillers.** A plant's chillers that can run are the fewest of: its running chillers, **2 for each running glycol pump** at that plant (`chillersPerGlycolPump: 2`), and its dry cooler capacity (2 each, as today).
- **Glycol pumps and CDUs.** Each running glycol pump feeds **2 CDUs** (`cdusPerGlycolPump: 2`), counting the pumps of both plants together. With more **built** CDUs than that, the extra CDUs lose their glycol, **farthest first**:
  - Distance is from the hall's centre to the lane of the nearest plant that has a running glycol pump.
  - Ties: the higher-numbered hall first; within a hall, the bottom CDU before the top.
  - A CDU without glycol (`dry`) is not an alarm. It counts as not working: the hall's other CDU carries the hall; with neither working, the hall shuts as when both leak. It comes back the moment enough pumps run.
- **Water pumps and halls.** Each running water pump serves **2 online halls** (`hallsPerWaterPump: 2`), both plants together. With more online halls than that, the extra halls lose water, **farthest first** by the same distance and tie rule. A hall without water delivers **50%** (`noWaterFactor: 0.5`), on top of any other throttle.
- **A pump in overpressure stops** (either kind) until fixed. Left 20 s: a glycol pump bursts as today (up to two CDUs leak); a water pump's overpressure spreads to the nearest running water pump with no alarm.
- **Director mercy:** an overpressure starts only on a pump whose kind would still cover everything with that pump stopped.
- **The start:** two glycol pumps and one water pump (M38), which cover Hall 1.
- **Classic mode** is unchanged from M38.
- **Pure helpers** for the screen, with tests: `glycolFed(state, cduId)`, `waterFed(state, hallId)`, `pumpNeeds(state)` (`{ glycol: { running, neededForCdus, neededForChillers }, water: { running, needed } }`).
- **Events:** `cduDry` / `cduWet`, `hallDry` / `hallWet`, with the CDU or hall.

### 4.2 Screen

- **A dry CDU** is drawn greyed with the red slash a failed yard device has. A hall without water: its title gets a small "50%" plate (ink on white, no band colour).
- **Inspect card** (M36): a CDU: "No glycol: too few glycol pumps"; a rack row: "No water: too few water pumps (50%)" and "Coolant units dry: too few glycol pumps"; a glycol pump: "Feeds 2 CDUs and 2 of Plant A's chillers · 9 of 10 CDUs fed"; a water pump: "Serves 2 halls · 3 of 4 halls served".
- **Build card:** a glycol pump "Lets 2 chillers run and feeds 2 CDUs"; a water pump "Serves 2 halls"; and the warning "A new hall needs a water pump: 4 halls, 3 served" when building a hall's first CDU or switchboard would leave it without water.
- **Overview strip:** the cooling shield counts glycol and water pumps with the chillers and dry coolers; a dry CDU breaks that hall's coolant shield.
- **Alarm tickets:** an overpressure on a pump whose stop would dry a CDU or a hall shows that cost, as other alarms do.

### 4.3 The scripted builders

`src/core/builder.js` and `builderSpots.js`: buy a glycol pump whenever the next CDU or chiller would outrun them, and a water pump whenever the next hall would; the "backups" plans also buy one spare of each.

### 4.4 Scripted checks

`scripts/pacing4.mjs`, 12 seeds. Targets (*starting*):

| Check | Target |
|---|---|
| Compute-first builder reaches 150 MW | 6 to 9 minutes |
| Compute-first builder's median run | 14 to 20 minutes |
| A builder with one spare pump of each kind | Earns more than one with none |
| Buying every pump early | Still loses badly (broke in at least half the runs) |
| Halls ever without water / CDUs ever dry, compute-first | Reported; some, but not most of the run |

If 150 MW slips past 9 minutes, the first lever is the start (a second water pump), then the pumps' price. Report what was changed.

### 4.5 Owner's checklist

- Build a fourth hall with one water pump: the farthest hall drops to 50% and says why.
- Let a glycol pump's overpressure sit: the farthest CDU goes dry; fix it and the CDU comes back.
- With both plants pumping, Halls 4 and 5 are the first to suffer.

## 5. M40. Teaching and the balance check

- **The tutorial's "new hall" lesson** names the pumps (within the 110-character limit): "New hall: RMU, transformer, switchboard, coolant unit, a water pump for every 2 halls, then racks."
- **Introductions** (M21's mechanism), once each: the first dry CDU ("Not enough glycol pumps: the farthest coolant unit has gone dry. Build another."), the first hall without water ("Water pumps serve two halls each. Hall 5 has none: it runs at half.").
- **Drawer:** chillers and CDUs per glycol pump, halls per water pump, the no-water factor.
- **Crew guidance** (M35): the Mechanical line reads "Faster on chillers, pumps and dry coolers." unchanged; check it.
- **Balance:** rerun 4.4 with the tutorial off and on; record in `docs/PROGRESS.md`.

### 5.1 Owner's checklist

- A first run with the tutorial teaches the pumps without a wall of text.
- The first dry CDU and the first hall without water each get one line.

## 6. Later

Pass 5's remaining items (GDD section 14: bundles and the advisor mark, save and resume, the ledger, the uptime bonus, posts and warnings, promises, spells, perks and the rescue call, layers) wait for the owner's notes on pass 5's play. The results, Hire, Commissioned and sale cards can take the blueprint look once the owner has lived with the menu.
