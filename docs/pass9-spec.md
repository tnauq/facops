# FacOps pass 9 build spec

Version 0.3, 22 November 2026 (v0.3: free play becomes endurance, with levels, at the owner's word with M56). **The owner answered section 1's questions and approved the spec on 22 November** ("M54 go", with section 1's reading on selling early as written). It is the source of truth for pass 9, as `docs/pass8-spec.md` is for pass 8. Pass 8's rules and screen carry over except where this spec says otherwise. If the spec is silent or looks wrong, stop and ask the owner.

Values marked *starting value* are for scripted checks to settle; everything else is the owner's decision.

## 0. What pass 9 is

**A run you win by finishing the campus.** The owner, 22 November: refocus on selling as the win condition. A finite game is more narrowly scoped and shippable, keeps a continue option, and fixes an endgame that feels unfinished. Things that move a run towards the win (a fully built campus) should be handled differently from things that help only indirectly.

1. **The win:** a fully built campus at full output, handed over, ends the run as a win. Going broke, the CEO and the board's deadline are the ways to lose.
2. **The board's deadline:** the finish line has a date on it.
3. **Endurance:** after the win, the same campus plays on in levels, like Pac-Man or Tetris, for a high score: alarms, the CEO and the price of compute all climb.
4. **The score is compute delivered,** counted in dollars.
5. **Progress and support:** every build either moves the campus towards the win or protects what is there, and the game says which.
6. **A balance check** against targets for a game you can win.

**Not in pass 9:**

- **The tutorial.** It waits until the rules settle, so it teaches the finished game; a research deep dive on good tutorials comes first (section 9).
- **The final balance pass.** M58 balances the new structure. A last pass, with every remaining feature in, comes before shipping.

### 0.1 Why now, and not after a final balance pass

The win decides what every other number is for. Pass 8's targets measure an endless game: runs of 14 to 20 minutes, and a third of endings each to selling, the CEO and going broke. In a game you win, those turn into a win rate, a time to win, and how losses split. Balancing again to the old targets would be work thrown away, and every later feature (the tutorial first) should be designed around the finish line. So pass 9 changes the structure now and balances it once, against the new targets, and a final pass waits for the finished feature set.

### 0.2 What the numbers say today (M53, 24 seeds)

| Player | Reaches Commissioned | At (median) |
|---|---|---|
| Compute first | 21 of 24 | 11:49 |
| Also gets ready for the CEO | 22 of 24 | 11:09 |
| Never a backup | 13 of 24 | 10:46 |
| Backups early | 0 of 24 | |
| Uses every pass 8 tool | **24 of 24** | **4:55** |
| Uses no pass 8 tool | 23 of 24 | 11:21 |

Most runs already finish the campus at about minute 11, then play on for nine minutes until the CEO or the credits end them. That is the unfinished endgame. Ending the run at the finish would make nearly every run a win, and a player using every pass 8 tool would win in five minutes (promise payments fund the build). **So the win needs pressure before the finish, not after it.** The deadline (M55) and the balance check (M58) are part of this change, not optional extras.

### 0.3 Owner agreement on rule changes

M54 to M57 change rules. Each change sits behind a drawer switch, off until its scripted checks pass and then on by default. Switched off, a run plays as pass 8 does. M58 changes config values only. Nothing else in `src/core/` changes, and no test is loosened, except the tests that pin today's score (money earned plus the sale price), which change with question 5 and say so. Every milestone that changes the rules or the state bumps `SAVE_VERSION`.

## 1. The owner's answers (22 November)

| # | Question | Answer |
|---|---|---|
| 1 | **What counts as finished?** | **Built and at full output:** all 48 rack rows built and delivering full output at the same moment, as Commissioned is today |
| 2 | **After the win** | **Endurance, with a high score to chase** ("free play" until v0.3): the win is locked in; the campus plays on with alarms and CEO visits coming more and more often |
| 3 | **Selling before the finish** | **Yes:** "Sold early" stays, and is not a win |
| 4 | **The board's deadline** | **Yes** |
| 5 | **The score** | **Compute delivered,** shown in dollars. In endurance the price of compute (the rent customers pay) rises alongside the alarm frequency |
| 6 | **The targets** (section 7) | **As written** |

**One reading to confirm.** With the score as compute delivered, the sale price no longer adds to the score. Selling early then ends a run with the compute delivered so far, recorded as "Sold early" rather than a loss: a cleaner exit, not a bigger score. Section 3.1 is written that way. If the owner wants an early sale to pay something into the score, say how much.

## 2. Milestones

One per session, in order. Commit titles start with the milestone so the action tags them.

| Milestone | Build | Touches | Size |
|---|---|---|---|
| M54 | The win and the score (3) | Rules (behind a switch), screen, scripted players | Medium to large |
| M55 | The board's deadline (4) | Rules (behind a switch), screen | Small to medium |
| M56 | Endurance (5) | Rules (behind a switch), screen | Medium |
| M57 | Progress and support (6) | Rules helper, screen | Medium |
| M58 | The balance check (7) | Config, checks | Medium |

The win and the score come first because everything after measures against them.

## 3. M54. The win and the score

### 3.1 Rules (`building.finish`, switch "Win at the finish")

- **Finished** (question 1): the first moment all 48 rack rows are built and delivering full output at once. This is today's Commissioned; the word stays. Recorded once. Event `commissioned`, as now.
- **The last inspection.** On Commissioned, the CEO comes for one walkthrough of the whole campus with no warning (*starting value*: the Handover visit's pace). It fines sightings as any visit does, and a sighting is a strike if strike visits have begun. Outages that open during it still count as sightings.
- **The win.** When the inspection ends, the keys are handed over and the run is won. If the inspection's strike was the third, the CEO fires you at the last door: no win. Event `won`.
- **The score** (question 5): **the compute the campus delivered, in dollars.** Each rack row earns its income for every second it delivers, as now (`building.income`, $4 a second at full output); the score is the total of that income over the run. In the main run the price is fixed. Endurance raises it (section 5). Service credits, wages and spending do not lower the score: they spend cash, and cash is what keeps the run alive.
  - The results also show the energy: "1.42 GWh delivered" (MW delivered over time).
  - The uptime bonus and promise payments are cash, not compute, and do not count.
- **Selling early** (question 3): from the Handover, as now. The run ends "Sold early", with the compute delivered so far as its score. It is not a win, and not a loss. The sale price still shows on the confirm card, as what the buyer pays you; it no longer joins the score.
- **How runs end:** Won, Sold early, Went broke, Fired by the CEO, and Missed the deadline (M55).
- **Scripted players** (`playRun`): every player wins if it finishes and passes the inspection. The pass 7 sellers become early sellers: they sell early on their rule, and win if they finish first. `playRun` returns `won`, `wonAt` and `delivered`.
- With the switch off, a run plays and scores as pass 8 does.

### 3.2 Screen

- **The finish:** the Commissioned celebration (every hall title lights in turn) and the CEO's line *"Fine. It's finished. Let me look at it."*, then the banner for the last inspection.
- **The win card** after the inspection: **"Campus handed over"**, the time large ("Finished in 12:40"), the score, and two buttons: **Results** (primary) and **Endurance** (M56).
- **The HUD:** the score in place of today's run total, as "Delivered $48,200".
- **Results and the run-over card** lead with the outcome: *Won*, *Sold early*, *Went broke*, *Fired*, *Missed the deadline*. A win shows the finish time large; every run shows the score and the GWh.
- **The main menu** shows two records: **the fastest win** ("Fastest win 12:40") and **the high score** ("High score $182,300"). Bests from older rules stay, labeled as now.
- **Introduction**, once per run at the Handover: *"Get all 48 rows running at once and the CEO signs it off. That's the win."*

### 3.3 Checks

- With the switch on, `scripts/pacing4.mjs` shows Won / Sold early / Broke / Fired / Missed per player, a win rate, a median time to win and the median score.
- With the switch off: pass 8's standing targets, unchanged.
- Expect nearly every competent player to win at about 11 to 12 minutes until M55 and M58. M54 only reports it.

### 3.4 Owner's checklist

- Getting all 48 rows running feels like the end of something, and the win card says so.
- The score climbs as the campus delivers, and an outage visibly slows it.
- Selling before the finish says "Sold early", not "Won".

## 4. M55. The board's deadline

### 4.1 Rules (`building.deadline`, switch "Board deadline")

- **A date to finish by,** on the run's economy clock (*starting value* 16:00, the same clock as the Handover's 10:00). It is set at the start and never moves.
- **Miss it** and the run ends: "The board pulled the plug." A loss. The score is the compute delivered.
- **The CEO counts down:** a line at 5:00 left (*"The board wants this live in five minutes."*) and at 1:00 left. Nothing else changes: the walkthroughs, the strikes and the fines run as now.
- The last inspection (3.1) counts as in time if Commissioned came before the deadline.
- Endurance has no deadline.

### 4.2 Screen

- **The HUD** shows the date beside the clock while a run is unfinished: "0:42 · due 16:00". From 5:00 left it shows the time left instead, in ink ("3:12 left"). No new colour.
- **The progress meter** (M57) sits next to it, so the two are read together.
- **Results:** "Missed the deadline", with how far the campus got ("41 of 48 rows").

### 4.3 Checks

- A scripted builder that never hires misses the deadline more often than it goes broke.
- Compute first still finishes before the deadline in most runs (M58 settles how many).

### 4.4 Owner's checklist

- From the first minute, you know when the campus is due.
- When a run misses the deadline, you can see where the time went.

## 5. M56. Endurance

**The owner, 22 November (with "M56 go"):** not "free play", which suggests low-stress creative building, but an **endurance mode that scales like Pac-Man or Tetris**. v0.3 renames it and gives it levels.

### 5.1 Rules (`building.endurance`, switch "Endurance after a win")

- **Endurance** starts from the win card. The run's outcome (Won) and finish time are locked. The score keeps counting.
- **Levels, as in an arcade game:** level 1 as endurance starts, and one level more every minute (`levelEvery: 60`, *starting value*).
- **Everything climbs with the level** (question 2), on one dial: the **heat**, 1.1 times the last level's (`heatPerLevel: 0.1`, *starting value*): 1× at level 1, 1.61× at level 6, 2.59× at level 11.
  - **Alarms:** the director's gaps are divided by the heat, and its cap rises by one alarm for each 0.5 of heat above 1 (`capPerHeat: 0.5`, *starting value*).
  - **The CEO:** visits keep coming, at their usual gap divided by the heat. Three strikes still fire you.
  - **The price of compute** (question 5): every row earns its income times the heat.
- **Endurance ends** when you go broke or are fired, or when you choose End endurance from the pause menu. However it ends, the run stays a win; the score is final.
- **Records:** the high score counts the whole run, endurance included, and a third record keeps the **best endurance level**. The fastest win does not change in endurance.
- Endurance is only offered after a win. It has no deadline.

### 5.2 Screen

- **The win card:** **Endurance** beside Results.
- **The HUD's note** leads with "Endurance · level 3 · 1.21×" ("L3 · 1.21×" on a narrow phone). The cash rate shows the higher price.
- **Each level** gets a callout: "Level 4: alarms 1.33× as often, compute pays 1.33×."
- **Pause menu:** **End endurance** in place of the sale.
- **Results:** "Endurance · Level 7 · 6:10 · went broke", with the records ("New best endurance level!").
- **Main menu:** "Fastest win 12:40 · High score $261,400 · Endurance level 7".
- **Introduction**, once, when endurance starts: *"Endurance. Every minute is a new level: more alarms, closer CEO visits, and compute pays more. How long can you last?"*

### 5.3 Checks

- A competent scripted player in endurance (compute first, `endurance: true`) lasts a median of 4 to 10 minutes (*starting value*): long enough to matter, short enough to end.
- Endurance adds at least a quarter to its score, so it is worth playing.

### 5.4 Owner's checklist

- Each level is felt: busier, and better paid.
- When endurance ends, the run still says Won, and the level you reached is on the card.

## 6. M57. Progress and support

### 6.1 Rules (`building.split`, switch "Progress and support")

- **Every build is progress or support,** worked out live by a pure helper (`buildRole(state, id)` in `src/core/`, with tests). It changes no price or rule: with the score as compute delivered (question 5), progress already earns score directly and support protects it, so the difference is shown, not charged.
  - **Progress** raises how many rack rows the campus can run, or is a rack row: the rows themselves; the first power path into each half (the RMU, one transformer and one switchboard); the first CDU in each hall; and plant equipment up to what the rows built so far need (chillers, dry coolers, glycol and water pumps).
  - **Support** is everything else: the B side of each half, a hall's second CDU, spare chillers, dry coolers and pumps beyond the need, hires, upgrades, and the pass 8 tools.
  - A piece's role is decided when it is bought. If a backup later becomes what keeps rows running (its partner was never built), it counts as progress from then on.
- **The progress meter:** rack rows built in online halls, out of 48, and how many of them are at full output.

### 6.2 Screen

- **The HUD:** a progress meter, "Rows 31 / 48", with a bar, beside the MW meter. It fills in ink; rows built but not at full output show pale in the bar. Full and all 48 is the finish (3.1).
- **Build cards** say which a piece is: **"Progress · +1 row"** or **"Progress · lets 3 more rows run"**; **"Support · backup for Hall 3 top"** or **"Support · spare chiller"**. Progress spots draw their "+" solid, support spots outlined, so the map shows at a glance where the finish is.
- **The ledger:** spending splits into **"Building the campus"** and **"Keeping it running"**.
- **The advisor mark** (pass 7) names what it rings: "Next: progress" or "Next: support".
- **Results:** "Spent on progress $X · on support $Y".

### 6.3 Checks

- `buildRole` matches a hand-made list for a starting campus, a half-built one and a full one (tests).
- The scripted builder's spending splits about as expected: compute first spends most on progress before Hall 4, never a backup spends nothing on support pieces.

### 6.4 Owner's checklist

- At any moment you can see how far the campus is from finished.
- When you buy something, you know whether it gets you closer or keeps you safe.

## 7. M58. The balance check

### 7.1 The targets for pass 9 (question 6), replacing pass 8's

Every pass 9 switch on. `scripts/pacing4.mjs`, 12 and 24 seeds.

| Check | Target |
|---|---|
| Compute first (no early sale) | **Wins 50% to 70%** of runs |
| Its time to win | **Median 11 to 15 minutes** (GDD v0.9: a strong run finishes at about minute 12) |
| Its losses | Neither going broke nor the CEO (fired, or the deadline) below a third of losses |
| Gets ready for the CEO | Wins more often than compute first |
| Uses every pass 8 tool | Wins more often than one who uses none, **and no sooner than a median 9:00** |
| Never a backup | Wins less often than compute first |
| Backups early | Broke in at least half the runs |
| 150 MW | 6 to 9 minutes |
| Every tool against none | At least a quarter higher score (pass 8's, kept) |
| Endurance | As in 5.3 |

The owner's earlier split (a third each to outages, the CEO and the sale) becomes, for a competent player: **about half won, and the losses shared between the money and the CEO.**

### 7.2 Levers, in order

1. **Promise payments** (the every-tool player finishes at 4:55 today).
2. **The deadline** (M55).
3. **Build prices** for progress pieces.
4. **The director's tightening.**
5. The credits' doubling and the strike gap, last.
6. For endurance only: the heat's rise per level.

Report every change, with the table, in `docs/PROGRESS.md`.

### 7.3 Owner's checklist

- About half your runs are wins, and the losses feel like your doing.
- Finishing faster feels possible, and risky.

## 8. Carried over

- Classic mode, saves, the drawer, Layers and every pass 8 system work as now.
- The three pass 8 misses become pass 9 targets: run length becomes time to win, the ending split becomes the win rate, and perks for a player who always takes the first one are rechecked in M58.

## 9. Later

- **The tutorial (pass 10).** The research deep dive is done: `docs/tutorial-research.md` (23 November). It starts with a research deep dive: which game tutorials stand out and why, from games such as **Old School RuneScape** (Tutorial Island), Mini Metro, Into the Breach, Portal, Factorio, Overcooked, Prison Architect and Two Point Hospital. The deep dive becomes a project doc, then a pass 10 spec that rewrites the lessons for the finished game: the finish line first, then progress and support, then the crew, then endurance.
- **Every word on screen (pass 11, after the tutorial).** The owner, 23 November: review and rewrite all text a player sees (tutorial lessons, introductions, the CEO's lines, cards, menus, results, the HUD), one line at a time; the owner agrees or supplies a new line. The scope is listed in `docs/tutorial-research.md` section 7.
- **A final balance pass** before shipping, with every feature in.
- From pass 8's list: the blueprint look for the results, Hire, Commissioned and sale cards; sound; a Settings card with reduce flashing and text size; the Home Screen icon; the comedy; scenarios, device upgrades, site events, decommissioning, Overclock, a choice of pace, a head start after a sale.
- By the owner's decision: support rooms, generators, Operate mode, more campuses.
- A full rewrite of the GDD, folding in passes 5 to 9.
