# FacOps: working rules for the coding agent

You are building pass 1 of FacOps, a small web game. The owner does not write code and tests every build in Safari on an iPhone 17e, in landscape. Work so that each session ends with something the owner can open and try.

## Start of every session

1. Read `docs/pass1-spec.md`. It is the source of truth for what to build.
2. Read `docs/PROGRESS.md` to see which milestone is next.
3. Run `node --test`. If anything fails, fix that before starting new work.

## Hard rules

- Build exactly one milestone per session, in order. Do not start the next one.
- Do not change anything in `src/core/`, and do not loosen or delete tests in `tests/`, unless the owner has agreed to a rule change. If a rule looks wrong, or the spec is silent or contradicts itself, stop and ask the owner in plain words.
- No dependencies, no frameworks, no CDN scripts, no build step, no TypeScript. Plain JavaScript ES modules that run as they are.
- Every rule number comes from `src/core/config.js`. Never hard-code one anywhere else.
- No `Math.random()` in `src/core/`. No network requests and no analytics anywhere.
- `localStorage` only inside `try`/`catch`; the game must work when storage is unavailable.
- Use the supplied drawing code in `src/render/icons.js` and `src/render/campus.js`. Do not redraw the crew or the equipment in a different style. Hat colors mean trade only: never tint an alarm green, yellow or red.
- Every tap target is at least 44 x 44 CSS pixels. Nothing may depend on hover.

## How to structure new code

- Pure logic the screen needs (screen regions, hit testing, the tap state machine, ticket order) goes in small modules under `src/ui/`, each with tests in `tests/`.
- Drawing goes under `src/render/`. Overlays (start, pause, results, tuning) are plain HTML on top of the canvas.
- Keep files and functions small. Comment the reason for anything that is not obvious.

## Finishing a milestone

1. `node --test` passes, including the new tests for this milestone.
2. Serve the folder (`python3 -m http.server 8000`) and go through the milestone's checks in the spec. If you can drive a browser, do it at 844 x 390 and at 660 x 300.
3. Commit to `main` with a message that says what changed, and push. The owner has asked for work to go straight to `main`.
4. Tag the commit with the milestone's tag (`m1`, `m2`, ...) and push the tag.
5. Update `docs/PROGRESS.md`: mark the milestone done, say what was built, list anything the owner should know, and copy in the owner's checklist from the spec.
6. Tell the owner what to try on the phone, in plain words, with the link.

## If something goes wrong

- A milestone that cannot be finished in one session: commit what works behind the previous behavior, say exactly what is left in `docs/PROGRESS.md`, and do not tag.
- A bad build that reached `main`: revert to the last tag, push, and tell the owner.
