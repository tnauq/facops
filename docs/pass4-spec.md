# FacOps pass 4 build spec: build and manage

Version 0.4, 15 November 2026. 0.4: the yard outside the building (section 7: M28 built; M29 and M30 proposed for the owner's approval). 0.3: the owner's compute-first economy after M24 (sections 2.5, 2.8, 4.2): cash burns, money is the lifeline, backups are a mid-game buy. 0.2 (14 November) was **approved by the owner**, with the answers to section 5 folded in; 0.1 was the draft. Written after the owner played M21: the pressure still turns "very crazy around 6 minutes", the rail's switch from tickets to tiles causes misclicks, and the owner wants to move from a pure dispatch game towards a Prison Architect-style management game **on the existing layout, with tap-to-build in predetermined spots**.

When approved, this becomes the source of truth for pass 4, as `docs/pass3-spec.md` was for pass 3. Pass 3's rules and screen carry over except where this spec says otherwise. Numbers marked *starting value* are for M24's scripted checks to settle. Items marked **[Recommended]** are choices made for the owner, kept unless the owner changes them.

## 0. The owner's answers (14 November)

| Question | Answer |
|---|---|
| Who sends techs to alarms? | Techs pick their own jobs; the player can override |
| What can be built? | Every current device. A data hall comes online once it has at least 1 switchboard (MSB), 1 coolant unit (CDU) and there is at least 1 chiller |
| What pays for building? | Money from the MW delivered |
| Pause and speed controls? | An option: on by default; real-time mode (no pause or speed buttons) is for experienced players |
| Pumps? | Buildable, and a plant's chillers need one (as drafted) |
| How does a run start? | Hall 1 already has the bare minimum: one pump, one chiller, one switchboard, one coolant unit and a few rack rows |
| CEO triggers? | As drafted (2.8) |
| After M24 (15 Nov) | "Mandatory backups is too harsh. There should be a lot of pressure to get compute online: a burn rate on your cash, and more compute online is how you stay afloat. Backups should be a mid-game or endgame thing, after the compute is up and running." (2.5, 2.8) |

## 1. What changes, in one paragraph

The building's layout stays exactly as it is. Every device spot in it (rack rows, switchboards, coolant units, chillers, pumps) starts **empty**, drawn as a pale outline. Tap an empty spot to buy and build that device. Racks earn money while they deliver; the money buys more racks, the equipment that powers and cools them, the backups that protect them, and more techs. Techs walk to alarms by themselves; the player steps in to redirect. The skill moves from "who goes where, right now" to "what to build next, and how much backup to buy before growing".

The design pillars change one word: **Redundancy is the drama, and now it is your choice.** A hall with one switchboard per half earns as much as one with two, until the first breaker trip darkens it.

## 2. Rules

### 2.1 Spots and building

- Every piece of equipment in `src/core/layout2.js` is a **spot** with a fixed device type. Nothing new is added to the layout.
- A spot is `empty`, `building` or `built`. Only built devices work, can alarm, or count for anything.
- **Tap to build:** an empty spot shows its device and price; a second tap confirms (section 3.2). The money is taken at once.
- **Build time:** 8 s (*starting value*), shown as a ring on the spot. A contractor builds it; no tech is needed.
- No selling or demolishing in pass 4.
- Halls can be built in any order. Plant B's spots are open from the start.
- **The run starts with the bare minimum for one hall** (owner): Plant A's top pump and one chiller, and in Hall 1 the top half's A switchboard, the top coolant unit and 2 rack rows in the top half. Everything else is empty. Starting cash: **$600**.

### 2.2 Prices (*starting values*)

Money is shown as `$`, in whole dollars (`$1,240`).

| Device | Price | Notes |
|---|---|---|
| Rack row | $150 | 3 racks, 6.25 MW; the only thing that earns |
| Switchboard (MSB) | $200 | Each half-hall has an A and a B spot |
| Coolant unit (CDU) | $250 | Each hall has a top and a bottom spot |
| Chiller | $300 | 8 spots per plant |
| Pump | $200 | 2 spots per plant; a plant's chillers need one |
| Hire a tech | $400 | Pick the trade (section 2.6) |
| Upgrade (Carts, Better tools, Radios) | $500 | As in pass 2, same limits |

Everything on the campus costs about $23,000.

### 2.3 What works

A rack row delivers its 6.25 MW (times the cooling factor, as now) only when **all** of these hold:

- **Power:** its half-hall has at least one built switchboard that is not tripped.
- **Coolant:** its hall has at least one built coolant unit that is not shut by a leak.
- **Cooling:** the campus has enough chillers running (below).

A **hall is online** when it has at least 1 built switchboard and 1 built coolant unit, and at least 1 chiller is built anywhere (owner's rule). Online halls show their title; offline halls stay pale. A row built in a hall that is not online yet earns nothing until it is.

**Chillers needed** = one per hall's worth of racks online (rows ÷ 6, rounded up; pass 2's 1.25 made the fifth rack wait for a $300 chiller). Too few running and the cooling factor falls as now. A plant's chillers only run while that plant has at least 1 built pump (owner).

### 2.4 Redundancy is the player's choice

The alarms keep their pass 3 behaviour; what changes is that the backup may not exist.

| Alarm | With the backup built | Without it |
|---|---|---|
| Breaker Trip | Partner carries the half; after its clock, the partner trips too (as now) | That half-hall goes dark at once |
| CDU Leak | Hall throttles to 90%; after its clock, the other CDU leaks (as now) | Hall throttles to 90%; after its clock, the hall shuts |
| Chiller Trip | Spares cover it | The cooling factor starts to fall at once |

The shields on the strip keep their meaning: a hall with no B switchboards shows a **broken-outline** power shield ("no backup") instead of whole, so the risk is visible before anything fails.

### 2.5 Money in and out (owner, 15 November: compute first)

- **Income:** $4 a second per rack row at full output, scaled by its actual output. A rack pays for itself in under 40 s.
- **The burn:** cash burns every second: a base of $3 a second that **doubles every 140 s**, plus $0.25 a second upkeep for every piece of infrastructure built (switchboards, coolant units, chillers, pumps) and $0.50 a second wages for every tech. The base is gentle while the campus is small, then the pressure to keep adding compute; in the end it outgrows what a full campus earns, so every run ends.
- **Backups are a mid-game buy:** a backup earns nothing and costs upkeep, so early on racks come first. Later the burn is high, outages hurt, and the CEO's visits only fine outages (2.8), so backups pay.
- **In the red:** below $0 a 15 s countdown runs. Back above $0 in time and the run goes on; still in the red when it ends, the run is over ("Went broke").
- **No Stability meter** in building mode: money is the lifeline. (A drawer switch can bring the meter back for comparison.)
- Shown in the HUD as `$1,240 · +$85/s` (income minus burn), and the red countdown when it runs.
- **Score** is money earned over the run (GWh stays in the results).

### 2.6 Techs pick their own jobs  [owner's answer]

- **Auto-dispatch:** whenever a tech is free and an alarm has had nobody on it for 1 s (`autoDispatch.delay`, so the player sees it arrive), the alarm that matters most goes to the free tech who would finish it soonest (walk plus fix). "Matters most" is the rail's triage order: highest cost now (pass 3's `alarmCost`, moved into the rules as `src/core/cost.js`), then least clock left, then oldest.
- Auto-dispatch holds off while the tutorial's scripted lessons run, which teach sending techs by hand (until M27 rewrites the tutorial).
- Auto-dispatch never pulls a busy tech off a job. **The player can:** tap an alarm, then any tech, exactly as now. A job the player gave is kept until it is done.
- During a CEO warning, auto-dispatch prefers alarms on the CEO's route (the scripted player's CEO rule).
- A drawer switch turns auto-dispatch off, for comparison.
- **Crew:** the run starts with Electrical and Mechanical. More techs are bought from a **Hire** card in the crew bar (trade chosen on the card). Deliveries and the pick-of-3 cards are gone; upgrades are bought from the same card.

### 2.7 Alarms and pacing

- The director only picks built devices in online halls.
- **The interval follows what is built, not time.** The start-of-phase table is read by **rows online ÷ 6, rounded up** (so a full hall's worth of racks counts as one more hall) and tightens 1.5% every 10 s from the start of the run, with no reset (M24's checks; the draft had 1%). More equipment means more alarms; the player controls the pace by how fast they grow.
- **A small campus gets fewer alarms still:** under one hall's worth of racks, the gap between alarms is stretched by 6 ÷ rows, up to 3 times (M24: with 2 racks every fault is most of the load).
- **The first alarm comes after 20 s**, time to look round and buy a first backup (M24).
- **The alarm cap follows what is built:** 2 plus one per hall's worth of racks online, whatever the crew (M24: with crew + 2, never hiring meant fewer alarms, and hiring made no difference).
- Pass 3's dark-half-hall drain is 0.25 a second in building mode, not 1: the lost income is already the main cost of an outage (M24's checks).
- A half-hall with no racks built is never dark, whatever its switchboards.

### 2.8 Stability and the end of a run

- The load band is delivered MW against the MW of the rows in online halls, as now, shown in the HUD; there is no Stability meter (2.5).
- A run ends when the cash stays in the red for 15 s, or the CEO fires you under zero tolerance.
- **The CEO only cares about outages** (15 Nov): only an unattended alarm that is costing power counts as a sighting. A tripped switchboard whose backup carries the load, or a chiller trip with spares running, is not. This is what makes backups worth buying before the late visits.
- **A sighting is a fine** instead of a Stability hit: $50 per point the visit would have cost (ribbon-cutting $750, Handover $1,750, walkthroughs $2,500 and $3,500); zero tolerance still ends the run.
- **CEO visits [Recommended]:** the ribbon-cutting comes when the 3rd hall comes online; the Handover when the campus reaches 200 MW of rows in online halls, or at 10:00, whichever is first; walkthroughs then follow as now, and zero tolerance from the third. (See open question 2.)


## 3. Screen

### 3.1 Empty spots

- An empty spot draws its device in pale outline (the supplied drawing at low alpha, with a dashed edge) and a small `+`. A spot being built shows the device fading in with a progress ring.
- Spots are tap targets at least 44 x 44 px, like bubbles. Alarms and techs win over spots when they overlap.

### 3.2 Build card

- Tapping an empty spot opens a small card next to it: the device's picture and name, its price, one line on what it does (`Powers the top half of Hall 3`, `Backup: keeps Hall 3's top half lit if A trips`), and **Build** (greyed with `Need $80 more` when short).
- Tap Build, or tap the same spot again, to confirm. Tap elsewhere to cancel.
- The card names the device, so the map still needs no captions. Infrastructure shows its upkeep ("+$0.25/s upkeep"), so a backup is a visible choice. A rack row warns when it would not earn yet: "Needs a switchboard in this half to earn", "Earns once Hall 3 has a switchboard and a coolant unit", "Cooling will run short: build a chiller too".
- The card sits beside the spot, or above or below it on a narrow map, never over it.
- In building mode the pipework is drawn complete from the start (the building is being fitted out); halls not yet online are pale, with just their name (owner, 15 Nov: "needs power and coolant" was a bit much; the tutorial explains the order).
- **Until M27:** building mode has no tutorial (the classic tutorial's lessons need Hall 1's backups). The device introductions for network and pump alarms still show. The drawer's **Building mode** switch, off, brings back the classic game with its tutorial.

### 3.3 HUD and crew bar

- The HUD shows **Cash** in place of the Stability meter: the cash, then what it is doing a second (income minus burn, red when falling), and "In the red · 0:12" while the red countdown runs. The note says "3 halls online".
- The crew bar ends with a **Hire** card (`+ Hire $400`), which opens the **Hire and upgrade** card as an overlay, like the Delivery card did: the four trades ($400 each, with how many are on the crew) and the three upgrades ($500, with their level, "Done" at the limit), greyed when the cash is short. The game waits while it is open; buying keeps it open with the new cash; Close goes back to the game. It shows the wages per tech.
- Crew cards keep Idle / Walking / Fixing; an auto-dispatched tech is shown the same as a player-sent one.

### 3.4 Speed controls  [owner: an option]

- On by default. A drawer switch, **Real-time mode**, takes them away, for experienced players (owner).
- With the buttons, the HUD's right end holds three 44 px buttons: **Hold** (`❚❚`, turning to `▶` while held), **Speed** (`1x` / `2x`), and the **menu** (the gear, which opens the pause card with Resume, Restart and Tuning).
- While held, nothing moves, but the player can still select, assign and redirect (and, from M25, build). The space bar holds and releases.
- 2x runs the game twice as fast; everything (clocks, walking, money) keeps the same rate in game time.
- In real-time mode the HUD is as in pass 3: the gear opens the drawer, `❚❚` opens the pause card.

### 3.5 The rail

- **Fix for the misclicks:** the rail only switches from tickets to tiles when it would overflow, and only switches back when the alarms fit with 3 slots to spare (hysteresis), so it no longer flips back and forth under a finger.
- With auto-dispatch, the rail is mostly for watching and overriding.

### 3.6 Tutorial (built in M27)

Seamless, on Hall 1 and Plant A, one lesson at a time with one-line callouts, teaching **the build order** (owner, 15 Nov). While the lessons run, no director alarms come and **nothing burns**; the burn, the alarm tightening and the 10:00 Handover all count from the hand-over, so a slow reader loses nothing. Techs go to alarms by themselves throughout.

| Lesson | Callout | Moves on when |
|---|---|---|
| Racks | `Your hall has power, coolant and cooling. Racks earn money: tap a + on a rack spot.` | A rack is bought |
| The other half | `The bottom half needs its own switchboard first. Build Switchboard A there, then a rack.` | Both are bought |
| No backup | `A switchboard tripped with no backup: that half is dark and earns nothing. A tech goes on their own.` | The trip is fixed |
| Backups | `Switchboard B would have kept it lit. Backups cost upkeep: buy them once your racks earn.` | 9 s |
| A new hall | `For a new hall: switchboard and coolant unit first, then racks. One chiller cools a hall's racks.` | 9 s |
| Hand-over | `Now your cash burns, faster and faster. Keep adding racks, and hire techs from the crew bar.` | 9 s; the game is on |

- A lesson nobody answers for 60 s moves on, so nothing stalls.
- After the tutorial, the first network failure and pump overpressure are introduced as in pass 3.
- After the first finished run, Skip tutorial turns on by itself, as before.
- Building mode keeps its own best score, in money earned.

## 4. Milestones

One per session. Commit titles start with the milestone so the action tags them.

| Milestone | Build | Size |
|---|---|---|
| M22 | Rail hysteresis (the misclick fix); pause and speed buttons as an option (3.4, 3.5) | Small |
| M23 | Auto-dispatch with player override, and its drawer switch (2.6, rules only; the crew still arrives as in pass 3) | Medium |
| M24 | Rules for building: spots, prices, money, the online rule, what works, redundancy without backups, director by rows built, CEO triggers, hiring and upgrades for money (the commands; their screen is M26); scripted builder player and checks (2.1 to 2.8). Behind `building.enabled`, off until M25 can show it | Large |
| M25 | Building on screen: empty spots, the build card, cash in the HUD, build rings, the no-backup shield (3.1 to 3.3). Building mode on by default (drawer switch); `#auto` builds compute first | Large |
| M26 | Hire card and upgrades for money (the rules came in M24; Deliveries were already gone in building mode) | Medium |
| M27 | The new tutorial (3.6). The balance pass waits for the owner's runs: the only note so far is that the money pressure feels about right | Medium |

M22 and M23 help the current game right away and are worth having whatever comes after. M24 to M27 are the pivot proper: about four to six sessions.

### 4.1 Scripted checks (M24)

A scripted **builder** player: builds in a fixed sensible order (one hall's minimum, then racks, then backups once a hall has 4 rows, then the next hall), hires when idle time is low. A **greedy** builder that never buys backups, and a **no-hire** builder, for comparison. Targets (*starting*):

| Check | Target |
|---|---|
| Builder: first income | Within 60 s |
| Builder: 150 MW of rows | Around 6 to 9 minutes |
| Builder: run length | 10 to 15 minutes, most ended by the CEO |
| Greedy builder (no backups) | Earns more early, ends sooner; scores at least 15% less |
| Very slow player (4 s reactions, auto-dispatch on) | More alarms waiting than free techs under 25% of the time before minute 8 |

### 4.2 Scripted checks after the compute-first economy (15 November)

12 seeds, tutorial off, auto-dispatch on. The builders keep 3 s of burn in hand.

| Scripted builder | Run length (range) | Earned | 150 MW at | Halls | Crew | Ended by zero tolerance / CEO fine / broke | Short-handed before 8:00 |
|---|---|---|---|---|---|---|---|
| Compute first, backups from hall 4, hires | 11:51 (3:17 to 17:01) | $73,855 | 5:41 | 7.0 | 7.6 | 8 / 0 / 4 | 22% |
| The same, also getting ready for the CEO | 11:44 (3:17 to 17:03) | $72,710 | 5:42 | 6.8 | 7.3 | 5 / 0 / 7 | 21% |
| Compute first, backups from hall 6 | 11:32 (3:17 to 17:19) | $74,183 | 4:49 | 7.1 | 7.8 | 8 / 0 / 4 | 21% |
| Careful (backups as soon as a hall has 4 racks) | 7:47 (6:28 to 9:43) | $9,283 | never | 1.9 | 2.0 | 0 / 0 / 12 | 7% |
| Greedy (never a backup) | 11:42 (3:17 to 17:14) | $73,234 | 4:49 | 7.0 | 7.5 | 6 / 0 / 6 | 21% |
| Never hires | 8:02 (3:17 to 13:56) | $31,354 | 5:38 | 6.3 | 2.0 | 2 / 0 / 10 | 45% |
| Decides every 4 s | 14:00 (4:01 to 16:31) | $88,310 | 6:01 | 7.6 | 8.4 | 7 / 0 / 5 | 20% |

Compute first is clearly right: backups early earn 87% less. Mid-game backups and none at all come out about even for scripted players, who never panic; your play decides whether backups need to be worth more. Hiring matters (never hiring earns 58% less). Two seeds in twelve go broke at about 3:15, after spending everything just before the ribbon-cutting fine.

(M24's first economy, with the Stability meter and no burn, made backups mandatory: a builder without them collapsed by 3:30. The owner found that too harsh.)

## 7. The yard outside the building (owner, 15 November)

"Each MSB should have a corresponding transformer on the outside of the building with a direct connection, and the transformers feeding MSB A and MSB B will be fed off the same RMU. The RMU will be hooked up to a power line which comes from out of view, from left to right. There will also be a dry cooler block outside each CUP, east and west, with pipes connected to the south and north pumps. Also make all the pipes black." The owner chose to make the yard **part of the game**, with **a power line on each side**.

### 7.1 M28. The yard on the map (built)

- **Layout** (`src/core/outdoor.js`, layout only in M28): a transformer straight outside the wall from every switchboard (32), joined to it by a bus duct; an RMU between and beyond each pair's two transformers (16), cabled to both; a power line along the north and one along the south, on poles, running in from out of view on the left and off to the right, with a drop to every RMU; a dry cooler block of 8 units outside each plant (west of Plant A, east of Plant B), with a black pipe from each of the plant's north and south pumps.
- **The yard is wider:** the camera can look 330 units past the ends and 280 past the long sides. The tyre tracks moved out beyond the power lines.
- **Every pipe is black:** the overhead chilled-water pipes, the dry cooler pipes, the coolant units' stubs and the chillers' nozzles. (The pump gauge's needle stays red: it is a needle.)
- In building mode a transformer is pale until its switchboard is built, and an RMU until either of its pair is; in the classic game, until its hall is online.
- **Concrete under the yard** (owner, after M28): one long piece along the whole north wall, from the wall out past the RMUs, and one along the south. The ends (east and west, with the dry coolers) stay dirt, as does the ground beyond the power lines.

### 7.2 M29. Building the yard (built)

- **New spots:** every transformer, RMU and dry cooler unit is a buildable spot with the build card ("Transformer B · Feeds Switchboard B of Hall 1's top half", "RMU · Feeds Hall 1's bottom transformers from the power line", "Dry cooler · Lets 2 of Plant A's chillers run"); the power lines are always there. Prices (set by M29's checks): transformer $75, RMU $100, dry cooler $150, switchboard $150 (was $200). All infrastructure costs upkeep.
- **The power chain:** a switchboard works only while its transformer and that transformer's RMU are built (and, from M30, working). The hall-online rule: a switchboard **with its transformer and RMU**, a coolant unit, and a chiller anywhere. The build card warns "Needs its transformer and RMU outside to work".
- **Heat out:** each built dry cooler unit lets two of its plant's chillers run.
- **The start:** Hall 1's top RMU and A transformer, and one dry cooler at Plant A, join the bare minimum. Starting cash $800.
- **Upkeep** $0.15 a second per piece of infrastructure (was $0.25) and the burn's base doubling every 150 s (was 140), since every half now needs three pieces of infrastructure (M29's checks).
- **The tutorial's** second lesson asks for the bottom half's RMU, transformer and switchboard, and the "new hall" lesson names the whole chain and the dry coolers.
- The yard's devices have no walking route yet; M30 adds one along with their alarms.

M29's checks (12 seeds): compute first with backups from hall 4 earns $71,885 in 12:28 and reaches 150 MW at 6:22; backups from hall 6 $70,372; never a backup $67,285 (6% less); backups early $10,147 (86% less); never hiring $25,335 (65% less).

### 7.3 M30. Yard failures (built; owner's answers 15 November)

Three new alarm types, each with its own picture on the bubble and ticket, so eight in all. **Transformers do not trip: they short, and a short must be disconnected at the RMU before the transformer can be fixed** (owner).

| Alarm | Fastest trade | When it fires | If ignored | Fix |
|---|---|---|---|---|
| Transformer short | Electrical | Its switchboard loses power at once (the pair's other side carries it, if built) | [Recommended] After 45 s, still connected, the short takes out its RMU: an RMU fault | Two places: **disconnect** at the RMU (3 s), then **repair** at the transformer (8 s) |
| RMU fault | Electrical | Both of the pair's transformers lose power: **the half goes dark, backups or not** (owner: yes) | Nothing more: it is already the worst | 10 s at the RMU |
| Dry cooler fan failure | Mechanical | That unit stops: its two chillers may stop if there is no spare | After 60 s the next unit at that plant fails | 6 s |

- **The short's two-step fix:** one tech does both. Sent to a short, they walk to the RMU first, disconnect it (a pip on the fix ring), then walk to the transformer and repair it. Once disconnected the short can no longer spread, so its clock stops for good; the switchboard stays off until the repair is done. A tech pulled off between the steps leaves it disconnected, and the next tech goes straight to the transformer. Auto-dispatch and the ticket's walk time count both legs.
- The RMU is the shared single point of failure: rare (a low weight in the director's mix), but always costly, so it is the alarm to run for. An ignored short is the other way to get one.
- Breaker trips stay as they are.
- The CEO only cares about outages, as now: an RMU fault, or a short on a switchboard with no backup, is a sighting until a tech is on it.
- **The way out** (M30): five doors in each long wall (at the plant lanes, the gaps between hall pairs and the centre line) lead to a walkway along the yard between the transformers and the RMUs, where techs stand to work on either; a door in each end wall leads to a walkway through the middle of each dry cooler block.
- **Mercy:** no yard failures until 3 halls are online (`building.yardFromHalls`), since a small campus runs through a single RMU: without it, an early RMU fault could end a run in its first minute.
- New pictures: a short is two coils with a spark; an RMU fault an open switch; a fan failure a three-bladed fan. A failed yard device is greyed with the red slash a tripped chiller has. Each gets an introduction the first time, and the CEO has lines for each.

M30's checks (12 seeds): compute first with backups from hall 6 earns $80,180 in 13:40; from hall 4 $61,653; never a backup $64,949 (19% less than from hall 6); backups early $10,147; never hiring $42,824. **Mid-game backups now pay**: the yard's failures are what they protect against.

### 7.4 Milestones

| Milestone | Build | Size |
|---|---|---|
| M28 | The yard on the map, black pipes (7.1) | Medium (built) |
| M29 | Building the yard: spots, prices, the power chain, dry coolers, the start, card and tutorial text (7.2) | Large (built) |
| M30 | Yard failures: transformer short (disconnect at the RMU, then repair), RMU fault, dry cooler fan failure, with pictures; the way out to the yard; scripted checks (7.3) | Large (built) |

## 5. Open questions for the owner

All answered on 14 November (section 0).

## 6. Out of pass 4

Selling and demolishing, wages and bills, tech stations (staging), puddles, sound, saving a run, any change to the layout.
