# FacOps pass 4 build spec: build and manage

Version 0.3, 15 November 2026. 0.3: the owner's compute-first economy after M24 (sections 2.5, 2.8, 4.2): cash burns, money is the lifeline, backups are a mid-game buy. 0.2 (14 November) was **approved by the owner**, with the answers to section 5 folded in; 0.1 was the draft. Written after the owner played M21: the pressure still turns "very crazy around 6 minutes", the rail's switch from tickets to tiles causes misclicks, and the owner wants to move from a pure dispatch game towards a Prison Architect-style management game **on the existing layout, with tap-to-build in predetermined spots**.

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
- The card names the device, so the map still needs no captions.

### 3.3 HUD and crew bar

- The HUD shows cash and income in place of "Hall 3 of 8".
- The crew bar ends with a **Hire** card (`+ Hire $400`), which opens the hire and upgrade choices as an overlay, like the Delivery card did.
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

### 3.6 Tutorial

Rewritten for building, one step at a time, on Hall 1 and Plant A:

1. Build a pump, then a chiller (`Chillers cool everything. They need a pump.`)
2. Build a switchboard and a coolant unit in Hall 1 (`A hall needs power and coolant.`); the hall comes online.
3. Build a rack row; money starts coming in.
4. A breaker trips with no backup: half the hall goes dark. Build the B switchboard (`Backups cost money but keep the lights on.`)
5. A leak: watch a tech go by themselves; then redirect one (`Techs go on their own. Tap an alarm, then a tech, to change who goes.`)
6. Hire a tech. Then the director takes over.

The pass 3 device introductions (network, pump) stay.

## 4. Milestones

One per session. Commit titles start with the milestone so the action tags them.

| Milestone | Build | Size |
|---|---|---|
| M22 | Rail hysteresis (the misclick fix); pause and speed buttons as an option (3.4, 3.5) | Small |
| M23 | Auto-dispatch with player override, and its drawer switch (2.6, rules only; the crew still arrives as in pass 3) | Medium |
| M24 | Rules for building: spots, prices, money, the online rule, what works, redundancy without backups, director by rows built, CEO triggers, hiring and upgrades for money (the commands; their screen is M26); scripted builder player and checks (2.1 to 2.8). Behind `building.enabled`, off until M25 can show it | Large |
| M25 | Building on screen: empty spots, the build card, cash in the HUD, build rings, the no-backup shield (3.1 to 3.3) | Large |
| M26 | Hire card and upgrades for money; Deliveries removed | Medium |
| M27 | The new tutorial, and a balance pass from the owner's runs (3.6) | Medium |

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

## 5. Open questions for the owner

All answered on 14 November (section 0).

## 6. Out of pass 4

Selling and demolishing, wages and bills, tech stations (staging), puddles, sound, saving a run, any change to the layout.
