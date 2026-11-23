# FacOps tutorial research

23 November 2026. The deep dive that comes before the pass 10 spec (the tutorial). It looks at how well-regarded games teach, what the one large study of tutorials found, and what that means for FacOps as it stands after pass 9. It ends with directions for pass 10 and questions for the owner. Nothing here is decided.

## 1. The short version

Seven ideas carry most of the weight, and most of them point the same way:

1. **Teach the goal first.** The first minute should show what the game is about. FacOps' is the finish line: 48 rows running, then the CEO signs it off.
2. **Teach each thing when it first matters,** not all at the start. The tutorial can be spread across the whole first run, and beyond.
3. **Let the player do it, not follow arrows.** Set a small goal and let them find the way; show one example, then hand over.
4. **Make the first threat gentle and safe to meet.** The first failure should be one the player can recover from, with a clear reason.
5. **Show, don't tell.** A short demonstration or a visible signal beats a sentence. FacOps' wrenches, shields and layers already do this.
6. **Never block, and keep one voice.** Restricting what the player may do did not help in the one big study; competing channels of text do hurt.
7. **Playtest it, and measure it.** Every source that did this well watched new players and cut what they skipped or misread.

## 2. What the evidence says

The one large controlled study is Andersen and colleagues at the University of Washington (CHI 2012). They built eight tutorial variants into three games and measured over 45,000 players. Their headline: **how much a tutorial helps depends on how complex the game is.**

- In the most complex game (Foldit), tutorials helped a lot. Tutorials shown **in context, at the moment they apply**, gave 75% more levels completed and 29% more play time than no tutorial; tutorials shown out of context helped less (25% and 12%).
- In the two simpler games, tutorials made no significant difference, and in one, context-sensitive tutorials slightly lowered the share of players who came back.
- **Blocking** the player (stencils that stop them doing anything but the step) showed no real benefit in any game.
- An **on-demand help button** helped in the complex game, hurt in one simple game (only 31% of players ever pressed it), and was mixed in the third.

FacOps is closer to the complex end: it now has power chains, cooling and pumps, a crew, a CEO, money, promises, perks, a deadline and endurance. The study suggests a tutorial is worth investing in, that it should teach **in context**, and that it should not lock the player in.

## 3. Game by game

### Old School RuneScape: Tutorial Island

- **Structure.** A fixed walk across a small island. Each building has one instructor who teaches one cluster of skills, in order: a guide in the starting house, then survival (fishing, woodcutting, fire, cooking), a chef, a quest guide, mining and smithing, combat, the bank, a chapel, and magic. The last step casts a teleport to the mainland.
- **Each screen appears when its lesson does.** The skills menu arrives with the first skill, the combat panel with combat, the quest journal in the quest house, the spellbook with magic. A new player never faces every panel at once.
- **Progress is gated by tasks, not walls.** You finish the instructor's task before the next one will help; the combat instructor lets you kill one rat with each style and then moves you on.
- **One place for instructions,** with a nudge if you stall. A guide in the corner suggests the next action after a short delay, and the right objects and panel icons get a soft highlight.
- **It asks who you are.** The first guide asks whether you are brand new, returning, or experienced; experienced players can skip it, and the answer shapes what help follows on the mainland.
- **What it shows about the long run.** Jagex later wrote that the steep curve *after* the island was still losing players, and proposed small optional milestone tasks with minor rewards, plus clearer direction. A good first lesson does not finish the job; the first hours need goals too.

**For FacOps:** Hall 1 and Plant A are already a small island. One "station" per system, each opening its own screen element (the rows meter, the ledger, the shields, the strip, layers), maps directly. So does asking new, returning or experienced at the start.

### Super Mario Bros.: World 1-1

- Built to teach the whole game in one level with no words. Miyamoto has said the first enemy is the slow, ground-bound Goomba precisely because a jumping enemy would frustrate a new player seconds in.
- The level's layout pushes the player into each lesson: blocks of different heights teach that holding jump goes higher; safe pits teach running before dangerous ones.
- The designers built later, harder levels first and came back to 1-1 at the end, testing it repeatedly.

**For FacOps:** the first failure the player meets should be the gentle, readable one (today it is a tripped switchboard that a tech fixes alone, which fits). Write the tutorial last, once the rest is settled; that is pass 10's place in the plan.

### Portal

- Each early chamber teaches one idea, then the next chamber combines it with the last. Valve's commentary describes cutting a puzzle that introduced too many concepts at once.
- They noticed playtesters understood portals much faster when they caught sight of themselves through one, so they placed the first portal to guarantee that view. Seeing it beat being told.
- When early testers ran past the thing that mattered, the room was changed until they could not miss it.

**For FacOps:** one idea per lesson, and a moment where the player *sees* the system work (a half going dark and coming back, a backup carrying the load) rather than reading about it.

### Mini Metro and Mini Motorways

- Almost no tutorial. The game starts with three stations and plenty of trains; the screen holds only what is needed, and interface elements (the line menu, the clock) appear as they become relevant.
- Mini Motorways' team describe giving the player one task at first and making them feel good for doing it, and starting slowly on purpose.
- The cost: some players, especially on mobile, said they had no idea what to do at first. Minimal works for a small rule set; FacOps has more rules than either game.

**For FacOps:** reveal the HUD and strip in stages during the first run (the strip, layers, the ledger, the promises note), instead of showing every control from the first second.

### Into the Breach

- Enemies **telegraph** their next attack, so every turn is a readable puzzle; the designers wanted the lessons a game teaches tied directly to how it plays.
- Its designers singled out the short **animated previews** of each weapon as one of the best teaching tools they built: the player sees what a weapon does before using it.
- Losing a mech is cheap (mechs are restored after each battle); losing the power grid is what matters. The thing to protect is always clear.

**For FacOps:** the warnings (wrenches) are FacOps' telegraph, and the shields and the rows meter are its "power grid". A build card could show a small looping picture of what a piece does (a backup taking over, a pump feeding two halls) instead of a line of text.

### Factorio

Wube rebuilt its new player experience after finding problems that read like a checklist of what to avoid:

- The first mission did not look like the real game (hand-mining made it feel like a different genre), and automation, "what the game is about", took 30 to 45 minutes to reach.
- Missions constrained the player so tightly that they learned to solve the tutorial, not the ideas.
- Missions did not carry over from one to the next, and grindy tasks had no purpose beyond ticking a box.
- Three information channels competed for attention, and too many messages buried the important ones.

Their goals for the new version: an immediately gripping start that shows the real game; core concepts in the first level with as little else as possible; goals delivered by the game's own progression systems; learning by experiment; one information channel; and a finish that leaves the player ready for the real game.

**For FacOps:** the tutorial should be a real run that carries on into the game (it already is), should reach the core loop fast, and should use one voice. Today the callout, the CEO's bubbles, the banner and the HUD note can all speak at once (the M54 to M57 screenshots show a callout sitting on top of the CEO's banner).

### Overcooked

- The first kitchen has one recipe (onion soup) and a layout chosen to make the lesson obvious; later kitchens add one complication at a time.
- Passing a level (one star) is easy; the stars above it are where the challenge lives, so a new player always gets through and has a reason to replay.
- Many advanced tricks are never taught and are left to be discovered.

**For FacOps:** a first run that a new player is very likely to win (or at least to reach the Handover in), with the harder targets (fast wins, endurance levels) as the reason to come back.

### Prison Architect

- The first chapter is a guided, story-led scenario (building an execution chamber for one prisoner) that teaches the basics of construction, power and staff through a single concrete goal, and gives the game its tone.
- Later chapters do not teach step by step; each hands you an existing prison with problems to solve.

**For FacOps:** a single concrete goal with a little story (the CEO, the board's date) teaches faster than a list of steps. "Problem prisons" suggest short scenarios later: a campus with a known weakness to fix.

### Two Point Hospital

- The first hospital is small, forgiving and generous with money, and is effectively the tutorial; each following hospital introduces new rooms and illnesses, so the whole campaign keeps teaching.
- Reviewers describe it as a "living tutorial" that never feels heavy.

**For FacOps:** the first run can be gentler (more cash, fewer failures) without being labelled a tutorial, with the full rules switching on as it goes.

### Strategy and management games more widely

Mark Brown's survey of tutorials in complex games (Game Maker's Toolkit) adds techniques that suit FacOps:

- **Delay lessons until they matter**, when the player is invested enough to care (Frostpunk teaches each system as it arrives; the Plants vs. Zombies designer made the same argument).
- **Split learning across runs**: a stripped-down first run, then more systems on the next.
- **One example, then hand over**: Planet Zoo fixes one animal's welfare for you and leaves you to fix the rest.
- **Fast feedback and an advisor** who speaks up when you make a mistake, at the moment you make it.
- **Lean on what players already know**: familiar icons and conventions need no lesson.
- **Reference help** for when a player is stuck: a place to look things up, and lessons that can be replayed.

## 4. FacOps today

The building tutorial (`src/ui/tutorial4.js`, pass 4, extended in passes 5 and 6) runs inside a real run on Hall 1 and Plant A, with failures and costs paused while it runs. Seven one-line lessons:

| Lesson | What it says (short) | Moves on when |
|---|---|---|
| Rack | Your hall has power, coolant and cooling; racks earn: tap a + | A rack is bought |
| Half | The bottom half needs its own RMU, transformer and switchboard, then a rack | The chain and a rack are bought |
| Trip | A switchboard tripped with no backup: that half is dark. A tech goes on their own | The alarm is fixed |
| Backup | Switchboard B would have kept it lit; backups cost upkeep, buy them later | 9 s |
| Grow | New hall: RMU, transformer, switchboard, coolant unit, water pump, then racks | 9 s |
| Roles | Any tech fixes anything indoors; electricians only on the yard | 9 s, or the Hire card opens |
| Free | Your construction loan starts now; build racks fast, hire from the crew bar | 9 s |

Around it, about twenty once-per-run **introductions** (`src/ui/intros.js`) explain systems as they first appear: the first alarms of each kind, pumps and water, the loan, customers and credits, the uptime bonus, the sale, bundles, posts, promises, warnings, strikes, the deadline's countdown, endurance and its levels. The **advisor mark** rings the next spot in a first run.

Measured against the research:

- **Strong:** it is a real run, not a separate mode (Factorio's lesson); it teaches by doing for the first two lessons; the first failure is gentle and recovers by itself (Mario); later systems are introduced in context as they appear (Andersen, Frostpunk); the wrenches, shields and layers already show rather than tell (Into the Breach).
- **Gaps:**
  1. **It never says what the goal is.** The finish line (48 rows, the CEO's sign-off), the board's deadline and the score all arrived in pass 9, after the tutorial was written. The first thing taught is "racks earn money", not "finish the campus".
  2. **Three of seven lessons are read, not done** (Backup, Grow, Roles), on 9-second timers, and Grow lists six things in one line.
  3. **Every control is on screen from the first second**: the strip, Layers, the flag, the HUD's cash and note, the promises note. Nothing is revealed in stages.
  4. **Many voices.** Lesson callouts, introductions, the CEO's speech bubbles, the CEO's banner and the HUD's note all carry text, and can overlap.
  5. **The introductions are many, and one line each.** Some arrive while the player is busy, and a CEO warning holds them back, so they can come late.
  6. **No reference.** A player who misses a line cannot look it up.
  7. **No "who are you?"** A returning player sits through the same lessons, or skips them all with the drawer's switch.
  8. **The tutorial does not reach the core tension.** It ends before progress against support, the CEO's visits, or the deadline matter.

## 5. Directions for pass 10

Not a spec: the shapes a spec could take, for the owner to choose between.

1. **Open on the finish line.** The first callout names the goal ("Get all 48 rows running and the CEO signs it off") with the rows meter lit, before the first rack.
2. **Hall 1 as Tutorial Island.** One station per system, in build order: a rack (progress), the bottom half's power chain, a trip and a backup (support), the plant (cooling and pumps), the crew. Each station brings its own screen element into view: the rows meter, the shields, the strip, the crew bar, the ledger.
3. **Do, don't read.** Turn the read-only lessons into small goals with the player free to find the way: "Keep the bottom half lit if its switchboard trips" instead of "Switchboard B would have kept it lit". One example, then hand over (Planet Zoo).
4. **Reveal the screen in stages** during the first run: Layers, the priority flag, the promises note and the ledger appear when the first reason for them does (Mini Metro, Tutorial Island).
5. **One voice.** A single place for lessons and introductions, with the CEO's lines kept to the CEO. A callout never sits on the CEO's banner.
6. **Fewer, later introductions.** Group the twenty or so introductions into a handful of moments (the first CEO visit, the Handover, the first strike visit, five minutes before the deadline), each teaching one idea when it starts to matter.
7. **A gentle first run.** Generous money and a later deadline in a player's first run (Two Point Hospital), with the normal rules from the second run on.
8. **Show what a piece does.** A short looping picture on the build card for the less obvious pieces (a backup taking over, a pump serving two halls) (Into the Breach).
9. **A place to look things up.** A short "How it works" card from the pause menu, one paragraph and one picture per system, with each lesson replayable.
10. **Ask who the player is**: new, returning, or experienced (Tutorial Island).
11. **Measure it.** Add scripted checks for a first run (time to the first rack, to Hall 2, to the Handover), and ask the owner's playtesters where they got stuck.

## 6. Questions for the owner before the pass 10 spec

1. **Goal-first opening:** start every first run with the finish line, or keep the opening on "racks earn money" and introduce the finish at Hall 2?
2. **How guided?** A scripted island (Tutorial Island: lessons in a fixed order) or goals with freedom (Factorio and Planet Zoo: a small objective, then hands off)?
3. **Gentle first run:** easier rules in a first run, or the same rules with the tutorial carrying it?
4. **Revealing the screen:** hide Layers, the flag and the promises note until they are useful, or keep everything visible?
5. **Reference card:** worth building a "How it works" card?
6. **New, returning, experienced:** ask at the start of a first run?

## 7. Pass 11: every word on screen

Added at the owner's request on 23 November, to follow pass 10: **review and rewrite all text a player sees.** Every line gets a proposed rewrite, and the owner agrees or supplies a new line. It covers, at least:

- The tutorial's lessons (`src/ui/tutorial4.js`, and pass 2's in `src/ui/tutorial.js` if classic mode stays).
- The introductions (`src/ui/intros.js`).
- The CEO's lines and banner (`src/ui/ceoView.js`), the parting lines (`src/ui/runOver.js`), the win and Commissioned lines, the deadline and endurance lines.
- Cards and menus: the main menu, Settings, the pause menu, the Hire card, bundles, the build and inspect cards (`src/ui/spots.js`, `src/ui/inspect.js`), the sale and win cards, promises and perks, the rescue call, the ledger and the results (`index.html`, `src/ui/*View.js`, `src/ui/results.js`, `src/ui/ledger.js`).
- The HUD's note, the alarm tickets, refusals (`src/ui/refusal.js`) and the drawer's labels.

It comes after the tutorial so the tutorial's new lines are reviewed with the rest, in one consistent voice.

## Sources

- Andersen, O'Rourke, Liu et al., "The Impact of Tutorials on Games of Varying Complexity", CHI 2012: https://grail.cs.washington.edu/projects/game-abtesting/chi2012/
- Old School RuneScape Wiki, Tutorial Island: https://oldschool.runescape.wiki/w/Tutorial_Island
- Old School RuneScape, Dev Blog: New Player Experience: https://oldschool.runescape.wiki/w/Update:Dev_Blog:_New_Player_Experience
- Miyamoto on World 1-1 (Game Developer): https://gamedeveloper.com/design/how-miyamoto-built-i-super-mario-bros-i-legendary-world-1-1 and https://hothardware.com/news/gaming-legend-shigeru-miyamoto-explains-design-philosophy-behind-super-mario-bros-world-1-1
- Portal developer commentary: https://theportalwiki.com/wiki/Portal_developer_commentary
- Game Maker's Toolkit, "Can We Make Better Tutorials for Complex Games?" (transcript): https://amara.org/subtitles/JcxvgxWY0awb/en/1/download/Can%20We%20Make%20Better%20Tutorials%20for%20Complex%20Games.en.sbv
- Mini Motorways development (Gfinity): https://www.Gfinityesports.Com/features/the-making-of-mini-motorways-steam/
- Into the Breach: Newsweek interview (animated weapon tutorials): https://www.newsweek.com/entertainment/video-games/breach-mods-soundtrack-mobile-nintendo-860670 and Game Developer on its design: https://www.gamedeveloper.com/design/reimagining-failure-in-strategy-game-design-in-i-into-the-breach-i-
- Factorio Friday Facts #241, New player experience: https://factorio.com/blog/post/fff-241
- Overcooked design (Superjump): https://superjumpmagazine.com/overcooked-how-design-creates-teamwork
- Prison Architect's first chapter (Vice; PC Gamer review): https://www.vice.com/en/article/a-little-window-of-light-how-mechanics-make-meaning-in-prison-architect and https://www.pcgamer.com/au/prison-architect-review
- Two Point Hospital's first level (SEGA support; GamesXtreme review): https://support.sega.com/hc/en-gb/articles/360000328457-Getting-Started and https://gamesxtreme.com/article/5061/two-point-hospital-review
