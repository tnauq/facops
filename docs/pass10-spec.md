# FacOps pass 10 build spec: the tutorial

Version 0.2, 23 November 2026. **The owner approved it on 23 November, with questions 5 to 8 as recommended.** It is the source of truth for pass 10, as `docs/pass9-spec.md` is for pass 9. Pass 9's rules and screen carry over except where this spec says otherwise. If the spec is silent or looks wrong, stop and ask the owner.

Values marked *starting value* are for scripted checks or the owner's playtests to settle; everything else is the owner's decision. Every line of text here is a **draft**: pass 11 reviews all text a player sees, and the owner agrees each line or supplies a new one.

## 0. What pass 10 is

The research is `docs/tutorial-research.md`. Pass 10 replaces the pass 4 tutorial (a fixed script of seven one-line lessons on Hall 1) with **a real first run that stops to explain each thing the first time it happens**, on easier rules, with the screen opening up as the run goes.

1. **The first run ever is the tutorial,** from 0:00. After it, the tutorial switches itself off in Settings; every later run starts from 0:00 without it. *(The game already does this: Skip tutorial switches itself on after the first finished run. Pass 10 keeps it.)*
2. **Firsts.** The run plays as normal, with the director's randomness. The first time each device, failure, system or action comes up, the game holds and a card explains it, pointing the camera at the thing. Then the run carries on.
3. **A gentler first run:** more money, a later deadline and a slower-tightening director.
4. **The screen opens up** during the first run: controls and parts of the map appear when they first matter.
5. **A reference card,** if the owner says yes (question 5).

**Not in pass 10:** rewriting text (pass 11), sound, scenarios.

### 0.1 Owner agreement on rule changes

The gentler first run is the only rules change: config values that apply only while the tutorial is on (`building.firstRun`), behind the tutorial's own switch. Everything else is screen. No test is loosened. Milestones that change the state bump `SAVE_VERSION`.

## 1. The owner's answers (23 November) and open questions

| # | Question | Answer |
|---|---|---|
| 1 | Goal first, and how the first run is chosen | **The first run ever has the tutorial from 0:00; then it switches itself off in Settings; later runs start from 0:00 without it.** The goal is the tutorial's first card (2.3) rather than a separate opening |
| 2 | A scripted tour, or goals with freedom? | **Either; probably a normal run, with its randomness, that pauses to explain each first-time action and device.** This spec builds that (section 2) |
| 3 | A gentler first run? | **Yes** (section 3) |
| 4 | Reveal the screen in stages? | **Yes, the game gradually opens up, at least in the first run** (section 4) |

Questions 5 to 8, answered **as recommended** ("Agree", 23 November):

| # | Question | Recommended |
|---|---|---|
| 5 | **A "How it works" reference card** from the pause menu: one short entry per system that has had its first, each with its picture, so a player who missed a card can look it up | **Yes** (section 5) |
| 6 | **Later runs' one-line introductions.** Today about twenty one-line introductions show in every run (the first leak, pumps, the sale, promises, posts and so on). With the firsts teaching all of this in the first run, should later runs drop them? | **Drop the explanations; keep the notices that report the run** (the loan paid off, credits outrunning income, the deadline's countdown, endurance levels). Everything explained once is in the reference card |
| 7 | **How much pausing?** A first run could stop twenty-five times | **At most one card every 20 s** (*starting value*); a first that comes sooner waits in a queue, and a few small ones show as a callout without stopping the game (2.2) |
| 8 | **Hiding the map** (section 4): in the first run, show build spots only in Hall 1, the next hall and the plants, and more as halls come online | **Yes** |

## 2. Firsts (M59)

### 2.1 What a first is

A first is a moment the player meets something new. The tutorial keeps a list of firsts (`src/ui/firsts.js`, pure, with tests), each with:

- **a trigger:** an event or a state the rules already report (for example `alarm` of type `leak`, `hallOnline` with two halls, `ceoWarning`, `promiseOffered`);
- **a card:** a title, one or two short sentences, and what it points at (a device, a hall, a HUD control or the crew bar);
- **a kind:** a **pause** (the game holds until the card is closed) or a **note** (a callout, the game keeps running), see 2.2;
- **what it opens** (section 4), if anything.

Each first shows once per tutorial run. The order the player meets them is the run's own: two first runs can teach in different orders, as the owner asked.

### 2.2 How a pause works

- The game holds, as the perk card does. The camera glides to what the card is about and rings it.
- The card sits clear of the thing it points at, never over the CEO's banner, with one button: **Got it** (44 px).
- **One voice:** while a card or note shows, no other callout, introduction or advisor line shows. The CEO's speech bubbles still show, as the CEO's.
- **Spacing:** at most one pause card every 20 s (*starting value*); firsts that come sooner wait in order. A failure's first is never held back while its alarm runs: if one is waiting, the newer failure's card goes ahead and the other waits.
- **Not during a CEO visit's warning**, unless the first is about the CEO.
- Small firsts are **notes**, not pauses (marked in 2.3).

### 2.3 The firsts (draft text; pass 11 rewrites it)

**The goal and the build (the first minute):**

| First | Trigger | Kind | Card (draft) | Opens |
|---|---|---|---|---|
| The goal | Run start | Pause | "Your job: get all 48 rack rows running before the board's deadline. Then the CEO signs it off." Points at the rows meter and the deadline | Rows meter |
| Racks | 3 s after the goal, no rack bought | Note | "Racks earn money. Tap a + on a rack spot." Rings a rack spot | |
| The build card | First build card opened | Note | "Progress pieces get you closer to finished. Support pieces keep you safe." | |
| Contractors | First build started | Note | "A contractor builds it in 8 s. It costs a little upkeep once it's running." | |
| The bottom half | First rack in a half with no power | Pause | "Each half needs its own power: RMU outside, transformer, then a switchboard inside." Points at the half's RMU spot | |

**Failures (the first of each kind):**

| First | Trigger | Kind | Card (draft) |
|---|---|---|---|
| A breaker trip | First `breaker` alarm | Pause | "A switchboard tripped: that half is dark and earns nothing. A tech goes on their own." |
| A half kept lit | First trip where the other side carried the load | Note | "The backup carried the load. That's what support is for." |
| Network | First `network` | Pause | "A rack row lost its network. Down racks deliver nothing." |
| Leak | First `leak` | Pause | "A coolant unit is leaking. Left alone, it shuts the hall." |
| Chiller | First `chiller` | Pause | "A chiller stopped. Too few chillers and every hall runs hot." |
| Pump | First `pump` | Pause | "A pump's pressure is climbing. Fix it before it bursts." |
| Yard: short, RMU, fan | First of each | Pause | One line each, as the introductions say today; RMU and short add "Electricians only." |
| A warning | First wrench | Pause | "A wrench means a device is about to fail. A tech who gets there in time stops it." |
| A dry CDU, a hall without water | First of each | Pause | As today's introductions |

**Growing (as the campus grows):**

| First | Trigger | Kind | Card (draft) | Opens |
|---|---|---|---|---|
| A new hall | First hall spot outside Hall 1 bought | Pause | "A new hall needs power, a coolant unit and, every two halls, a water pump. Then racks." | Map: the next hall (4) |
| Hall 2 online | `hallOnline`, 2 halls | Note | "Two halls. The strip at the bottom shows the whole campus: tap it to look around." | Strip |
| Short-handed | First time alarms outnumber free techs for 10 s | Pause | "More failures than techs. Hire from the crew bar: a matching hat fixes faster." Points at Hire | Hire card |
| Bundles | First time the cash covers a hall in one go | Note | "Tap a hall's name to buy what it needs in one go." | |
| Hall 3 | `hallOnline`, 3 halls | Note | "Layers show one system at a time: power, cooling or crew." | Layers button |
| Four techs | Fourth tech hired | Note | "Tap a tech, then a hall on the strip, to post them there." | Priority flag |

**Money and customers:**

| First | Trigger | Kind | Card (draft) | Opens |
|---|---|---|---|---|
| The loan | 0:30 of economy time | Note | "The construction loan: $6 a second until it's paid." | Ledger (cash tap) |
| Customers live | Loan paid | Pause | "Customers are live. Every rack that's down now costs service credits." | |
| Uptime bonus | First bonus | Note | As today's introduction | |
| Going red | Rescue call | (The call's own card) | | |

**The CEO and the finish:**

| First | Trigger | Kind | Card (draft) | Opens |
|---|---|---|---|---|
| The CEO | First `ceoWarning` | Pause | "The CEO is coming. Every outage they see costs you. Fix what you can before they arrive." | |
| A promise | First offer | Pause | "The CEO makes promises to the board. Take one for cash now and more when you deliver." | Promises note |
| A perk | First pick of two | (The card's own) | | |
| The Handover | Handover | Pause | "Halfway there. You can sell early from the menu, but only finishing wins." | Sell early |
| Strikes | First strike visit warning | Pause | "From now on, every outage the CEO sees is a strike. Three and you're out." | |
| The deadline | 5:00 left | Pause | "The board wants this in five minutes." | |
| The last inspection | Commissioned | (The finish's own banner) | | |
| Endurance | Endurance starts | (Today's line) | | |

### 2.4 The old tutorial

The pass 4 script (`src/ui/tutorial4.js`) is retired when firsts ship: no forced trip, no fixed order. Its one scripted moment, a breaker trip with no backup, now comes when the director first trips a breaker. Classic mode keeps pass 2's tutorial as it is.

### 2.5 Checks

- **Tests:** each first fires once, from its trigger, in a run that meets it; spacing and the queue; nothing pauses with the tutorial off.
- **Scripted first runs** (12 seeds, compute first, the tutorial on, the "Got it" pressed after 4 s): how many cards, how much time held in total, and when each first comes. *Starting targets:* under 20 pause cards, under 2:30 held in all, and every pause card before 12:00.

### 2.6 Owner's checklist

- Your first run teaches you by stopping when something new happens, and never twice for the same thing.
- Nothing else talks over a card.
- Your second run starts with no tutorial, and the Settings show it switched off.

## 3. A gentler first run (M60)

### 3.1 Rules (`building.firstRun`, only while the tutorial is on)

*Starting values:*

- **Starting cash:** $1,600 (later runs $800).
- **The board's deadline:** 18:00 (later runs 13:30).
- **The director tightens** 1.5% every 10 s (later runs 2%), as before pass 9.
- Everything else as a normal run, the CEO included.

The tutorial's switch decides it: Settings' "Skip tutorial" off gives the gentle rules with the firsts; the main menu's Tutorial button the same.

### 3.2 Checks

- A compute-first builder on first-run rules wins at least 80% of runs (*starting value*), against 63% on normal rules (pass 9).
- The cards' held time does not count against the deadline (the economy clock holds with the game).

### 3.3 Owner's checklist

- The first run feels winnable, and the second one feels like the real thing.

## 4. The screen opens up (M61)

In the first run, parts of the screen appear when their first does (2.3). In later runs everything shows from the start, as now.

| Part | Hidden until |
|---|---|
| Rows meter, cash, clock, deadline | Always shown |
| The overview strip | Hall 2 online |
| The Layers button | Hall 3 online |
| The priority flag | The fourth tech |
| The crew bar's Hire card | The first short-handed moment, or the first time the cash covers a hire after 2:00 |
| The promises note | The first offer |
| Sell early in the pause menu | The Handover |
| Hold and speed buttons | Always shown (the player may need them for the first card) |
| **Build spots on the map** (question 8) | Hall 1, Plant A and the yard by Hall 1 from the start; each further hall's spots (and its yard) when the hall before it has a rack built; Plant B's when Hall 5 is reached |

- A part appearing gets a short pulse, once.
- The advisor mark (pass 7) shows only on spots that are showing.

### 4.1 Checks

- Tests: what is shown at each step, for a first run and a later run.
- Browser at 844 x 390 and 660 x 300: the opening screen of a first run, after Hall 2, after Hall 3.

### 4.2 Owner's checklist

- The first screen is calm: a hall, a plant, a few spots, and the goal.
- Each new control arrives with its reason.

## 5. The reference card (M62, question 5: yes)

- **"How it works"** in the pause menu: a list of the systems met so far in this player's runs (every first ever shown, kept on the device), each opening its card's text and its picture of the device.
- **Replay the tutorial** stays on the main menu ("Tutorial").
- Later runs drop the explanations and keep the notices (question 6): the loan paid off, credits outrunning income, the deadline's countdown, endurance levels.

### 5.1 Owner's checklist

- If you missed a card, you can find it again.

## 6. Milestones

| Milestone | Build | Touches | Size |
|---|---|---|---|
| M59 | Firsts (2) | Screen, tests, scripted checks | Large |
| M60 | A gentler first run (3) | Config, checks | Small |
| M61 | The screen opens up (4) | Screen | Medium |
| M62 | The reference card, and later runs' introductions (5) | Screen | Medium |

Firsts come first: the opening-up and the reference card both hang off them.

## 7. Later

- **Pass 11: every word on screen** (`docs/tutorial-research.md` section 7). Every line, the firsts' cards included, rewritten for the owner to agree or replace.
- **Leaderboards** (the owner, 23 November, with "M59 go"): one for compute delivered (GW) and one for the time to win (the sale at the finish). **The owner chose boards kept on the device** (23 November, with "go m60"): no network requests, so no rule changes. Not yet specified: a later milestone, for example the top ten runs on each board, from the main menu.
- A final balance pass before shipping.
- From pass 9's list: the blueprint look for the remaining cards, sound, a Settings card with reduce flashing and text size, the Home Screen icon, scenarios and the rest.
