# FacOps pass 9 build spec

Version 0.1, 22 November 2026. **A draft for the owner's approval.** Once approved, it is the source of truth for pass 9, as `docs/pass8-spec.md` is for pass 8. Pass 8's rules and screen carry over except where this spec says otherwise. If the spec is silent or looks wrong, stop and ask the owner.

Values marked *starting value* are for scripted checks to settle; everything else is the owner's decision.

## 0. What pass 9 is

**A run you win by finishing the campus.** The owner, 22 November: refocus on selling as the win condition. A finite game is more narrowly scoped and shippable, keeps a continue option, and fixes an endgame that feels unfinished. Things that move a run towards the win (a fully built campus) should be handled differently from things that help only indirectly.

1. **The win:** a fully built campus, handed over, ends the run as a win. Going broke and the CEO are the two ways to lose.
2. **The board's deadline** (if the owner says yes to question 4): the finish line has a date on it.
3. **Progress and support:** every build either moves the campus towards the win or protects what is there. The game says which, and the score treats them differently.
4. **A balance check** against new targets, made for a game you can win.

**Not in pass 9:**

- **The tutorial.** It waits until the rules settle, so it teaches the finished game; a research deep dive on good tutorials comes first (section 8).
- **The final balance pass.** M57 balances the new structure. A last pass, with every remaining feature in, comes before shipping.

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

Most runs already finish the campus at about minute 11, then play on for nine minutes until the CEO or the credits end them. That is the unfinished endgame. Ending the run at the finish would make nearly every run a win, and a player using every pass 8 tool would win in five minutes (promise payments fund the build). **So the win needs pressure before the finish, not after it**, and M57 is part of this change, not an optional extra.

### 0.3 Owner agreement on rule changes

M54 to M56 change rules. Each change sits behind a drawer switch, off until its scripted checks pass and then on by default. Switched off, a run plays as pass 8 does. M57 changes config values only. Nothing else in `src/core/` changes, and no test is loosened. Every milestone that changes the rules or the state bumps `SAVE_VERSION`.

## 1. Questions for the owner

Each has a recommendation. "Approved" means all as recommended.

| # | Question | Options | Recommended |
|---|---|---|---|
| 1 | **What counts as finished?** Today Commissioned is the first moment all 48 rack rows deliver full output at once, so one open outage at the wrong second holds the win back. | **A.** Fully built: all 48 rack rows built, in online halls. **B.** As today: all 48 at full output at once. | **A.** The finish is something the player builds, not a moment they have to catch. The CEO's last inspection (2.1) keeps the drama |
| 2 | **After the win.** What does the continue option do? | **A. Push your luck:** play on; the price keeps rising; sell later to win bigger, but going broke or fired loses it all. **B. Free play:** the win and its score are locked in at the finish; Keep playing carries on with the same campus, unscored, until you quit or lose. | **B.** The run is finished when the campus is. Free play is for enjoying what you built. A lets the endless game back in by the side door |
| 3 | **Selling before the finish.** Today you can sell from the Handover on (200 MW or 10:00). | **A. Sold early:** still allowed, ends the run with its score, but it is not a win. **B.** Removed. | **A.** It is the rescue call's way out of the red, and a fair bail-out when a run is going wrong |
| 4 | **The board's deadline.** A finite game can still be finished slowly. Should there be a date to finish by? | **A.** No deadline: the losses are going broke and the CEO's strikes. **B.** A deadline (*starting value* 16:00): miss it and the board pulls the plug, a loss. | **B.** It makes "build now or protect first" the run's central decision, which is the progress-and-support split the owner asked for. It also gives the CEO a reason to visit before the finish |
| 5 | **How support counts in the score.** Today the score is money earned plus the sale price, and the sale price includes backups. Spending never lowers the score unless it sends you broke. | **A.** Screen and words only: the game labels progress and support, the score stays. **B.** The score becomes what the campus is worth at the sale: cash on hand plus the sale price, less any loan still owed. The buyer pays for capacity (progress) and nothing for spares (support). | **B.** Every dollar spent on support has to earn itself back by preventing losses. That is the trade the owner described |
| 6 | **The targets** for a game you can win (section 6). | As written, or changed. | **As written** |

## 2. Milestones

One per session, in order. Commit titles start with the milestone so the action tags them.

| Milestone | Build | Touches | Size |
|---|---|---|---|
| M54 | The win (3) | Rules (behind a switch), screen, scripted players | Medium |
| M55 | The board's deadline (4), if question 4 is B | Rules (behind a switch), screen | Small to medium |
| M56 | Progress and support (5) | Rules (behind a switch), screen | Medium |
| M57 | The balance check (6) | Config, checks | Medium |

The win comes first because the deadline and the split both measure against it.

## 3. M54. The win

### 3.1 Rules (`building.finish`, switch "Win at the finish")

- **Finished** (question 1, A): the first moment all 48 rack rows are built in online halls. Recorded once. Event `finished`. Commissioned (all 48 at full output at once) stays as an honour on the results, as now.
- **The last inspection.** On finishing, the CEO comes for one walkthrough of the whole campus, no warning (*starting value*: the Handover visit's pace). It fines sightings as any visit does, and strikes count if strike visits have begun. The finish waits for it to end.
- **The win.** When the inspection ends, the run is won: the sale goes through at that moment's price, and the run's score is fixed. If the inspection's strike was the third, the CEO fires you first: no win. The keys are handed over in the inspection, so a fired player has failed at the last door.
- **After the win** (question 2, B): **Keep playing** carries the same campus on in free play. Nothing in free play changes the run's result or score. Going broke or being fired in free play just ends it.
- **Selling early** (question 3, A): from the Handover, as now. The run ends "Sold early", with its score. It is not a win.
- **How runs end:** Won, Sold early, Went broke, Fired by the CEO (and Missed the deadline with M55).
- **Scripted players** (`playRun`): every player now wins if it finishes. The pass 7 sellers become early sellers: they sell early on their rule and win if they finish first. A new option `freePlay: true` plays on after the win, for checks that need the late game.
- With the switch off, a run plays as pass 8 does.

### 3.2 Screen

- **The finish:** the Commissioned celebration moves here (every hall title lights in turn), with the CEO's line *"Fine. It's finished. Let me look at it."* and the banner for the last inspection.
- **The win card** after the inspection: **"Campus handed over"**, the time ("Finished in 12:40"), the sale price, the score, and two buttons: **Results** (primary) and **Keep playing**.
- **Results and the run-over card** lead with the outcome: *Won*, *Sold early*, *Went broke*, *Fired*. A win shows the finish time large.
- **The main menu** shows the best win ("Best: won in 12:40 · $182,300"), or the best score if there is no win yet. Bests from older rules stay, labeled as now.
- **Free play:** a small "Free play" tag in the HUD's note. The pause menu has **End free play** instead of the sale.
- **Introduction**, once per run at the Handover: *"Build all eight halls and the CEO signs it off. That's the win."*

### 3.3 Checks

- With the switch on, `scripts/pacing4.mjs` shows a Won / Sold early / Broke / Fired column, a win rate and a median time to win, per player.
- Run pass 8's standing targets with the switch off: unchanged.
- Expect wins for nearly every competent player at about 11 to 12 minutes (0.2). M57 fixes that; M54 only reports it.

### 3.4 Owner's checklist

- Finishing the eighth hall feels like the end of something, and the win card says so.
- Keep playing works, and nothing you do afterwards changes the result.
- Selling before the finish says "Sold early", not "Won".

## 4. M55. The board's deadline (question 4, B)

### 4.1 Rules (`building.deadline`, switch "Board deadline")

- **A date to finish by,** on the run's economy clock (*starting value* 16:00, the same clock as the Handover's 10:00). It is set at the start and never moves.
- **Miss it** and the run ends: "The board pulled the plug." A loss, with no sale.
- **The CEO counts down:** a line at 5:00 left (*"The board wants this live in five minutes."*) and at 1:00 left. Nothing else changes: the walkthroughs, the strikes and the fines run as now.
- The rescue call (pass 8) also offers selling early, as now. Free play has no deadline.

### 4.2 Screen

- **The HUD** shows the date beside the clock while a run is unfinished: "0:42 · due 16:00". From 5:00 left it shows the time left instead, in ink ("3:12 left"). The deadline uses no new colour.
- **The progress meter** (M56) sits next to it, so the two are read together.
- **Results:** "Missed the deadline", with how far the campus got ("41 of 48 rows").

### 4.3 Checks

- A scripted builder that never hires misses the deadline more often than it goes broke.
- Compute first still finishes before the deadline in most runs (M57 settles how many).

### 4.4 Owner's checklist

- From the first minute, you know when the campus is due.
- When a run misses the deadline, you can see where the time went.

## 5. M56. Progress and support

### 5.1 Rules (`building.split`, switch "Progress and support")

- **Every build is progress or support**, worked out live by a pure helper (`buildRole(state, id)` in `src/core/`, with tests):
  - **Progress** raises how many rack rows the campus can run, or is a rack row: the rows themselves; the first power path into each half (the RMU, one transformer and one switchboard); the first CDU in each hall; and plant equipment up to what the rows built so far need (chillers, dry coolers, glycol and water pumps).
  - **Support** is everything else: the B side of each half, a hall's second CDU, spare chillers, dry coolers and pumps beyond the need, hires, upgrades, and the pass 8 tools.
  - A piece's role is decided when it is bought. If a backup is later what keeps rows running (its partner was never built), it counts as progress from then on.
- **The progress meter:** rack rows built in online halls, out of 48. It is the win bar: 48 of 48 is the finish (3.1).
- **The score** (question 5, B): what the campus is worth when the run ends: **cash on hand plus the sale price, less any loan still owed**. A run that does not sell is worth its cash less its loans. The highest score is no longer just the longest run.
- **The sale price** counts progress only: the price of every progress piece built, plus 2:30 of income as now. It is half as much again after the finish, as Commissioned is today. Support adds nothing to the price.

### 5.2 Screen

- **The HUD:** a progress meter, "Rows 31 / 48", with a bar, beside the MW meter. It fills in ink. The last row gets the finish celebration (3.2).
- **Build cards** say which a piece is: **"Progress · +1 row"** or **"Progress · lets 3 more rows run"**; **"Support · backup for Hall 3 top"** or **"Support · spare chiller"**. Progress spots draw their "+" solid, support spots outlined, so the map shows at a glance where the finish is.
- **The ledger:** spending splits into **"Building the campus"** and **"Keeping it running"**.
- **The advisor mark** (pass 7) names what it rings: "Next: progress" or "Next: support".
- **Results:** "Spent on progress $X · on support $Y".

### 5.3 Checks

- `buildRole` matches a hand-made list for a starting campus, a half-built one and a full one (tests).
- With the split on, never-a-backup's score falls behind compute first's by at least as much as today (28%). Support must still pay.

### 5.4 Owner's checklist

- At any moment you can see how far the campus is from finished.
- When you buy something, you know whether it gets you closer or keeps you safe.

## 6. M57. The balance check

### 6.1 The targets for pass 9 (question 6), replacing pass 8's

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

The owner's earlier split (a third each to outages, the CEO and the sale) becomes, for a competent player: **about half won, and the losses shared between the money and the CEO.**

### 6.2 Levers, in order

1. **Promise payments** (the every-tool player finishes at 4:55 today).
2. **The deadline** (M55).
3. **Build prices** for progress pieces.
4. **The director's tightening.**
5. The credits' doubling and the strike gap, last.

Report every change, with the table, in `docs/PROGRESS.md`.

### 6.3 Owner's checklist

- About half your runs are wins, and the losses feel like your doing.
- Finishing faster feels possible, and risky.

## 7. Carried over

- Classic mode, saves, the drawer, Layers and every pass 8 system work as now.
- The three pass 8 misses stay on the list for M57: run length (now measured as time to win), the ending split (now win rate), and perks paying for a player who always takes the first one.

## 8. Later

- **The tutorial (pass 10).** It starts with a research deep dive: which game tutorials stand out and why, from games such as Mini Metro, Into the Breach, Portal, Factorio, Overcooked, Prison Architect and Two Point Hospital. The deep dive becomes a project doc, then a pass 10 spec that rewrites the lessons for the finished game: the finish line first, then progress and support, then the crew.
- **A final balance pass** before shipping, with every feature in.
- From pass 8's list: the blueprint look for the results, Hire, Commissioned and sale cards; sound; a Settings card with reduce flashing and text size; the Home Screen icon; the comedy; scenarios, device upgrades, site events, decommissioning, Overclock, a choice of pace, a head start after a sale.
- By the owner's decision: support rooms, generators, Operate mode, more campuses.
- A full rewrite of the GDD, folding in passes 5 to 9.
