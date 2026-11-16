# FacOps pass 5 build spec: manage

Version 0.2, 15 November 2026. **Approved by the owner on 16 November 2026**, including the rule changes in M32 to M34. 0.2: the burn becomes a construction loan that front-loads the pressure, and a run ends by the CEO's strikes or by a win (sections 0, 1, 3 to 5). 0.1 had the burn rise in steps. Written after the first outside playtest (`claude/FacOps_Playtest_1.md` in the project) and GDD v0.9. It is the source of truth for pass 5, as `docs/pass4-spec.md` was for pass 4. Pass 4's rules and screen carry over except where this spec says otherwise. Numbers marked *starting value* are for scripted checks to settle.

## 0. The owner's answers (15 November)

| Question | Answer |
|---|---|
| The playtester "randomly" loses money while things go well | The burn as built is **unsatisfactory** (section 1) |
| What should the burn be? | "A larger factor early game and less late game. The racks should easily compensate for it at full capacity. The burn is just an incentive to hit the ground running." **A construction loan**, repaid at a fixed rate until it is paid off |
| What ends a run, then? | **A win, or the CEO's strikes.** Win at Commissioned (all 300 MW) or by selling the campus; lose on three CEO strikes in place of one sighting under zero tolerance. Going broke stays as the early-game failure |
| "You need x people to keep one hall up" | Show a recommended crew size. No rule change |
| Trades don't matter until the second or third hall | Leave the rules as they are; teach the roles in the tutorial |

GDD v0.9 sections 2, 3, 6 and 9 describe the old burn and zero tolerance. They are out of date on those points until the GDD's next version.

## 1. Why the burn changes

**As built (M31).** A base of $3 a second doubling every 150 s, plus $0.15 a second upkeep per piece of infrastructure and $0.50 a second wages per tech. The base was the run's clock: it outgrew a full campus at about 14:30, so every run ended by the bill.

**What was wrong with it (owner, 15 November: unsatisfactory).**

- It was invisible. The playtester read it as money vanishing "randomly".
- It was not the player's doing. Good play only delayed the minute at which the curve won.
- Every run ended at about the same minute, with late margins so thin that one dark rack sent the cash down even with a tech on the way.
- It pressed hardest late, when the player has the most to manage, and least early, when the owner wants the pressure.

**The new shape.** The pressure is at the start: the loan makes the first minutes a race to get compute online. Once racks are earning, they cover it easily, and once it is paid off the money is the score, not the threat. The late game's pressure is operations: the alarm director keeps tightening, the CEO's walkthroughs keep coming, and three bad visits cost the job.

**What the scripted checks already show** (12 seeds, before any tuning, zero tolerance still in place): a loan of $6 a second for 5:00 with a $1 site overhead gives the compute-first builder runs of about 17 minutes, ended by the CEO in 10 of 12; a builder who buys backups early goes broke in 8 of 12, and one who never hires in 8 of 12. At $8 a second for 4:00, buying backups early goes broke every time. A flat $6 a second for the whole run sends half of all runs broke before 5:00. So the loan gives the early bite the owner wants without a late one.

## 2. Milestones

One per session, in order, as before. Commit titles start with the milestone so the action tags them.

| Milestone | Build | Touches | Size |
|---|---|---|---|
| M32 | The construction loan (3) | Rules (owner agreed), screen, checks | Medium |
| M33 | The CEO's strikes (4) | Rules (owner agreed), screen, checks | Medium |
| M34 | Commissioned and selling the campus (5) | Rules (owner agreed), screen | Medium |
| M35 | Crew guidance: the roles lesson, trade lines and a recommended crew (6) | Screen | Small |
| M36 | Inspect card, solid and hollow plus marks, runway (7) | Screen | Small to medium |

M32 to M34 replace how a run ends, so the balance check in 4.4 runs after M33 and again after M34. The rest of pass 5 (GDD section 14: bundles and the advisor mark, save and resume, the ledger, the uptime bonus, posts and warnings, promises, spells, perks and the rescue call, layers) is specified in a later version of this spec, after the owner has played M32 to M36.

## 3. M32. The construction loan

### 3.1 Rules

- **The loan.** The campus was built on a construction loan. From the start of the economy (`economyTime`: the run's start, or the tutorial's hand-over) it is repaid at a fixed rate until it is paid off. *Starting values:* **$1,800, at $6 a second, so paid off at 5:00.**
- Repayment runs whatever the cash, including in the red. It is not interest and never grows.
- **Site overhead.** A small fixed cost for the whole run: **$1 a second** (*starting value*). It replaces the doubling base.
- **Upkeep and wages** are unchanged: $0.15 a second per piece of infrastructure, $0.50 a second per tech.
- So the burn is: loan repayment (until paid off) + site overhead + upkeep + wages. With the starting values and the starting campus, about $9 a second goes out against $8 a second coming in, so the third rack is urgent; a full campus with every spot built and ten techs pays about $26 a second against $192 earned.
- **Config** (`src/core/config2.js`, `building.burn`): `loan: 1800`, `loanRate: 6`, `base: 1`, and `doubling: 0`, meaning no doubling. A non-zero `doubling` brings back the old curve, for comparison in the drawer. The tests for the old curve stay and run with it set.
- **Rules events:** `loanPaid` when the last of it is repaid. Pure helpers for the screen: `loanLeft(state)` and `loanTimeLeft(state)`.
- **In the red** is unchanged: 15 s below $0 ends the run ("Went broke"). It now mostly happens in the first five minutes, which is where the owner wants that risk.

### 3.2 Screen

- **The HUD** shows what is left on the loan beside the cash while it is being repaid: `$1,240 · +$3/s · Loan $940`. On a narrow screen (660 px) the loan shortens to a thin bar under the cash that empties as it is repaid.
- **Paid off.** When `loanPaid` fires, the cash rate pulses and one line shows for 4 s, in the place the device introductions use: *"Loan paid off. The money is yours now."* It never covers a CEO warning; it waits for the banner to go.
- **The tutorial's hand-over** line becomes: *"Your construction loan starts now: $6 a second for five minutes. Build racks fast, and hire techs from the crew bar."*
- **Results** add "Loan paid off at 4:58", or "Loan not paid off" if the run ended first.
- The drawer gets the loan, its rate, the site overhead and the doubling switch.

### 3.3 Scripted checks

Run `scripts/pacing4.mjs` (12 seeds). Zero tolerance is still in place in this milestone, so run length is not judged yet. Targets:

| Check | Target |
|---|---|
| Compute-first builder | Never broke because of the loan in more than 2 of 12 runs |
| Builder who buys backups early | Broke in at least half the runs, mostly before 5:00 |
| Builder who never hires | Earns well under half of the compute-first builder |
| Net rate | Positive for the compute-first builder in every minute after 5:00 with nothing broken |

If the starting values miss, try $1,500 at $6 and $2,000 at $8, and report which is closest.

### 3.4 Owner's checklist

- The first five minutes feel like a race. The loan in the HUD runs down.
- When the loan is paid off, money stops being the worry.
- Later in the run, when the cash rate drops, there is something broken that you can see.

## 4. M33. The CEO's strikes

### 4.1 Rules

- **Strikes replace zero tolerance.** The visits run as now: the ribbon-cutting, the Handover, walkthroughs 1 and 2 with their fines. From walkthrough 3 on (where zero tolerance began), every walkthrough is a **strike visit**.
- **A strike visit** fines each sighting as walkthrough 2 does ($3,500, *starting value*), and if it has any sighting the player gets **one strike**: one per visit, however many sightings.
- **Three strikes and you are fired.** The run ends, "Fired by the CEO", the moment the third strike is given.
- **A clean strike visit** takes nothing away (*starting value*; clearing a strike after two clean visits in a row is an option for later).
- **The rest of the CEO is unchanged:** the gap between walkthroughs (45 to 60 s), warnings that shrink from 12 s to 8 s, only outages counting, attended meaning a tech on site and fixing. The alarm director keeps tightening 1.5% every 10 s with no reset, so the late game keeps getting harder until the player cannot keep up.
- **Config:** `ceo.strikes: 3`, and `ceo.strikeFine: 3500`. `ceo.strikes: 1` with no fine is the old zero tolerance, for comparison in the drawer.
- **Rules events:** `ceoStrike` with the count, and `ceoFired`.

### 4.2 Screen

- **The banner** names a strike visit: `CEO · Halls 3, 4 · 0:09 · strike 2 of 3`. The visit before the first strike visit says "next: strikes".
- **The HUD** shows the strikes from the first one on: three small hardhat outlines by the clock, filled for each strike (plain white hardhats, the CEO's own; never a trade color).
- **A strike** gets its own line from the CEO, as sightings do now (*starting set*): "That's one. I count to three.", "Two. My assistant is writing this down.", "Three. You're done. I'll get an AI to run this."
- **Results** headline "Fired by the CEO: three strikes", with the minute of each strike.

### 4.3 The tutorial

No lesson. The first strike visit's banner and the HUD's hardhats are introduced once, in one line: *"From now on, every CEO visit that sees an outage is a strike. Three and you're out."*

### 4.4 Scripted checks

Run after this milestone, with the loan from M32. 12 seeds. Targets (*starting*):

| Check | Target |
|---|---|
| Compute-first builder's run length | Median 14 to 20 minutes |
| How runs end | Mostly three strikes; going broke mostly before 5:00 |
| Builder who gets ready for the CEO | Lasts longer and earns more than one who does not |
| Builder with backups from hall 4 or 6 | Earns more than the one with no backups (grow-or-protect should matter again) |
| Short-handed before 8:00 | Under 25% of the time |

If runs run long, the first lever is the director's tightening (1.5% every 10 s), then the gap between walkthroughs. Report what was changed.

*M33's result:* tightening had no effect late (the director sits at its alarm cap), so strike visits now come 20 to 30 s apart (`ceo.strikeGap`); the compute-first median is 21:14. The classic game keeps zero tolerance. Details in `docs/PROGRESS.md`.

### 4.5 Owner's checklist

- Play past the Handover. The banner says when strikes begin, and the hardhats fill one by one.
- When you are fired, can you name the visit you should have prepared for?
- Does the end of a run feel like your doing, not the clock's?

## 5. M34. Commissioned and selling the campus

The ways to win. From GDD v0.9 section 3 ("A run you can win", proposed; "Selling the campus", decided), now both chosen.

### 5.1 Rules

- **Commissioned.** The first moment all 48 rack rows are delivering at full output at once (300 MW), the campus is Commissioned. It is recorded once and never lost. Event `commissioned`.
- **Selling: hand over the keys.** From the Handover on, the player may sell the campus. The run ends by choice.
  - **Not** during a CEO visit (warning included) or while any outage is open; the button says why it is greyed.
  - **Sale price:** the price of everything built (*starting value*). A Commissioned campus sells for half as much again (*starting value*), so getting there is worth the risk.
- **Score:** money earned, plus the sale price if sold. Going broke or being fired gives no sale.
- **After Commissioned** the run carries on until the player sells or the CEO fires them. The results keep "Commissioned" either way; selling after it is the full win.
- **Config:** `building.sale: { fromHandover: true, commissionedBonus: 0.5 }`.

### 5.2 Screen

- **Commissioned:** a celebration bigger than "Hall online" (every hall title lights in turn), a grudging CEO line ("Fine. It's finished. Don't touch anything."), and a card that waits for the player: **Hand over the keys** (with the sale price) or **Keep running**.
- **Selling at other times:** the menu gains **Hand over the keys · $14,250** after the Handover. A confirm card shows the sale price and the score it would give.
- **Results** lead with how the run ended (Sold, Fired, Went broke), then the score, then the highest milestone: ribbon-cutting, Handover or Commissioned. A sold, Commissioned campus is headed "Commissioned and sold".
- The best score kept on the device is the new score. Old bests stay as they are, labeled with the older rules (in money earned).

### 5.3 Owner's checklist

- After the Handover, the menu offers the sale, and refuses it during a visit or an outage, saying why.
- Selling ends the run with a score that includes the price.
- If you reach all 300 MW, the game makes a fuss and asks whether to sell.

## 6. M35. Crew guidance

All screen. No rules change.

### 6.1 The roles lesson

A seventh lesson in `src/ui/tutorial4.js`, between "grow" and "free":

| Lesson | Callout | Moves on when |
|---|---|---|
| Roles | `Any tech can fix anything indoors; a matching hat is faster. Only electricians (yellow) work on the yard's high voltage.` | 9 s, or the Hire card is opened |

While it shows, the crew bar's cards are the focus. It names the yard even though the yard does not fail yet: the electrician rule is the one that catches players out.

### 6.2 The Hire card

- **A line under each trade** saying what it is faster at, built from the trade table in config, never a copy: "Faster on breaker trips. The only trade for shorts and RMU faults." / "Faster on chillers, pumps and dry coolers." / "Faster on coolant leaks." / "Faster on network failures."
- **A recommended crew size** at the top: `Crew 3 · 4 recommended`. The recommendation is 2, plus 1 for each hall online after the first (*starting value*: the scripted builders end with about one tech per hall). It turns amber when the crew is short of it (a band color, never a hat color); nothing else happens.
- **A suggested trade:** with three or more halls online and only one electrician, the Electrical line shows "Suggested". Otherwise the trade with fewest on the crew, as the scripted builder chooses.
- The numbers live in config as `building.crewBase: 2` and `building.crewPerHall: 1`, with a comment that they change no rule, read by a pure helper `recommendedCrew(state)` in `src/ui/`, with tests.

### 6.3 When a hall comes online

The celebration line adds the advice when the crew is short of it: "Hall 3 online · crew of 4 recommended".

### 6.4 Owner's checklist

- With the tutorial on, the roles lesson appears before the hand-over and reads in one go.
- Open the Hire card at 1, 3 and 5 halls online. The recommendation rises, and goes amber when you are short.
- Does the recommendation match what feels right to keep a hall running?

## 7. M36. Inspect card, plus marks, runway

As proposed in GDD v0.9 sections 5 and 6. Screen only.

### 7.1 Inspect card

- Tap a built device and a card opens beside it, in the build card's frame. Tap elsewhere to close. Alarms and techs still win where they overlap a device.
- **A rack row:** what it is earning now (`$4.00/s`), or the one reason it is not, in the order the rules check: "No power: switchboard A tripped, no backup", "No power: the RMU outside has a fault", "Coolant unit leaking: hall at 90%", "Cooling short: build a chiller", "Network failure".
- **Infrastructure:** what it feeds and what feeds it ("Feeds Hall 3's top switchboards · fed by the north power line"), whether it is the only one or the backup, its upkeep, and its state.
- The reasons come from a pure helper in `src/ui/` that reads the rules' state, with a test for each reason.

### 7.2 Solid and hollow plus marks

The `+` on an empty spot is solid when the cash covers its price and hollow when it does not. With the game held, the map shows what the cash will buy.

### 7.3 Runway in the HUD

When the net rate is negative, the money readout adds how long the cash lasts at this rate: `$1,240 · −$32/s · 0:38`. Hidden when the rate is positive or the runway is over 5:00. On a narrow screen, the loan (3.2) shortens first.

### 7.4 Owner's checklist

- Tap a dark rack: the card says why in a few words.
- Tap a B switchboard: it says it is the backup and what it costs.
- Hold the game with $300: the plus marks show what you can afford.
- When money falls, the runway says how long you have.

## 8. Out of this version

Requiring a crew size; any change to trades indoors (open decision 9 stays); a head start after a sale; everything else in GDD section 14 until the next version of this spec; any change to the layout.
