# the-typist plan 2 — learning loop, screens, polish and hosting: design

Date: 2026-10-06 · Branch: `feat/vocab-typer-plan2` · Status: approved in brainstorm

## Goal

Turn plan 1's playable core into the learning game that the original design
describes (`docs/superpowers/implemented/specs/2026-10-05-vocab-typer-design.md`,
"the plan-1 spec" below):
- FSRS grading;
- Study and Free-play sessions;
- the four learning aids;
- menus;
- loading your own lists;
- hosting on GitHub Pages.

On top of that, plan 2 adds audio and works off the open issues:
- #2, the operator's UX notes from playing plan 1, which serve as the manual
  UX pass;
- #3–#6, the typing, engine, seed and schema follow-ups.

This spec restates plan-1 R7–R13 in its own numbering. Where it differs from
the plan-1 spec, this spec wins.

## Requirements

R1. Each Record is graded once, when its last ship is destroyed or escapes: Again if any of its ships reached the player; otherwise Hard if typos ÷ expected characters exceeds 0.10; otherwise Easy if it had no typos and its typing speed (expected characters ÷ seconds from lock to destruction, summed over its ships) exceeds 2.5 characters per second; otherwise Good. The grade updates the Record's FSRS state, which the browser keeps per Record per list.
R2. A Study session for a chosen list contains the `enriched`/`reviewed` Records that are due, plus never-graded Records up to the remaining daily new cap (default 10, adjustable in settings). They are grouped into waves by primary category: at most 6 Records per wave, shuffled within the wave, and categories in most-overdue-first order. Categories holding only new Records come last, in category `order`. A list without categories is chunked into waves in record order.
R3. Free play runs every `enriched`/`reviewed` Record of one chosen category in waves of at most 6, regardless of due dates. For a list without categories, it runs the whole list in record order. Its grades also update FSRS state, and a Record first graded in free play counts toward that day's new cap.
R4. A session is one run of waves with shared lives (default 3) and score. It ends when its waves are done, when lives reach 0, or when the player quits. Records that never came on screen stay ungraded.
R5. The game has these screens, drawn as DOM panels over the game canvas: a title and list screen (bundled lists plus "Load list…"); a mode choice showing the counts of due and new Records, with Study and Free play (Free play opens a category picker); a between-wave panel; a session summary (grade counts, accuracy, characters per second, score); settings; and a pause panel that Esc opens during play (Resume, Settings, Quit to menu). While the game is paused, the game clock is frozen, so a pause never counts toward typing speed. When a panel closes, typing focus returns to the game.
R6. Four learning aids, each toggleable in settings, remembered, and on by default:
- a grammar chip with the recognised tags on each sentence ship;
- the English translation under each sentence ship;
- German text-to-speech that reads a destroyed ship's text aloud the moment it is destroyed, cutting off any speech still playing;
- a recap card in the between-wave panel for each Record graded Again or Hard, showing its display form, gloss, forms and all its sentences with translations.

The mothership, the forms ship and the sentence ships are all read aloud.
R7. The game plays synthesized sound effects for a hit, a typo, a small and a big explosion, an escape, a cleared wave and an entering mothership. It loops `public/assets/audio/music-game.mp3` during play when that file exists, and plays no music when it doesn't. Sound effects and music each have a remembered toggle in settings. Audio starts only after the player's first interaction.
R8. Lists in the repository's `lists/` directory are validated at build time, and an invalid list fails the build; valid lists are bundled. The player can load a YAML list from disk, which is validated in the browser. If it is invalid, it is rejected with its error messages. If it is valid, it is played for that browser session, and its FSRS state persists under its `list.id`. `raw` Records are never played. A list with no playable Records loads and says there is nothing to play.
R9. Validation reports record-level and list-level errors in one pass. List-level checks (unique ids, declared categories, every record categorised when the list declares categories) run over the records that parsed, even when other records have errors.
R10. When a study session would be empty, the game offers free play. When `localStorage` or IndexedDB is unavailable, a banner warns that progress and settings won't be saved, and the game plays with in-memory stores. When no German voice exists, the TTS toggle is disabled with an explanation.
R11. The player ship fires from its front guns. While a ship is locked, the player ship drifts horizontally toward it at the enemy ships' sideways drift speed, and bullets leave from its current position.
R12. A typo flashes the locked ship. A pending ASCII digraph prefix (e.g. the `o` of `oe`) is shown on the locked ship until it resolves.
R13. The canvas renders sharply at the device pixel ratio and fits the window, including narrow ones, without horizontal scrolling. Ships released from a mothership never overlap the HUD, and their rows keep a minimum vertical gap; when no slot satisfies the placement rules, a tested fallback still places every ship.
R14. While an ASCII digraph is pending, typing the exact expected character (e.g. `ö` after `o` of `oe`) is accepted. Closing single quotes `‘` `’` and `)` at the end of a sentence are pre-typed, like the other final punctuation.
R15. Accented Latin letters in loanwords (`é è ê ë à â á î ï ô ó û ù ç ñ` and their capitals) are typeable: the schema's typeability check accepts them, and the typing engine accepts either the exact letter or its unaccented base letter.
R16. The game engine (`src/engine`) does not depend on the renderer (`src/render`). Layout metrics the World needs reach it through a shared module or `WorldOptions`.
R17. The seed test accepts records whose status is `enriched` or `reviewed`. `noun-burnout` carries a `source_note` about the Duden-preferred *das Burn-out*.
R18. The game is a static site deployed to GitHub Pages from `main` by a workflow in the repository, which runs the tests and the build before deploying. Before the repository is made public, a sweep masks personal identifiers in tracked files.
R19. A Playwright smoke test loads a two-Record fixture list through the file picker, types every ship (including an `ae` fallback), and checks that the recap appears and that an FSRS card exists in IndexedDB.
R20. `CLAUDE.md` describes the finished game: screens, sessions, stores, aids, audio, deploy and the smoke test.

## Design

### What exists (plan 1)

- `World` (`src/engine/world.ts`) already emits these events:
  - `resolved {recordId, stats}`, where the per-Record stats are typos,
    expected characters, typing time and escapes;
  - `wave-complete`;
  - `game-over`;
  - `escaped`.
- `createWorld(records, opts)` runs one batch of Records.
- The renderer already draws the optional `chip` and `translation` strings on
  sentence ships.
- `src/main.ts` is a stub, and the only playable page is `/?dev=fixture`.

### Stack additions

| package | role |
|---|---|
| `ts-fsrs` | scheduling, default parameters |
| `@playwright/test` (dev) | the R19 smoke test |
| `fake-indexeddb` (dev) | store tests under Vitest |

Sound effects are synthesized with the Web Audio API, so there are no audio
files besides the optional music.

### Module layout (new or changed)

```
src/srs/grade.ts          R1 thresholds → Rating (pure)
src/srs/scheduler.ts      ts-fsrs wrapper: (card | undefined, rating, now) → card
src/srs/store.ts          CardStore interface; IndexedDB + in-memory implementations
src/session/build.ts      study / free-play builders, wave chunking (pure, seeded shuffle)
src/session/controller.ts drives the World wave by wave, grades on `resolved`, owns lives/score
src/content/bundled.ts    import.meta.glob over the plugin's JSON modules
src/content/picker.ts     File → parseList → { ok, list } | { ok: false, errors }
src/platform/settings.ts  typed settings over localStorage, in-memory fallback
src/platform/tts.ts       German voice selection + speak-and-interrupt
src/platform/audio.ts     Web Audio SFX synth + optional music loop
src/ui/                   panels: title, mode, category, settings, pause, between-wave, summary, banner
src/ui/app.ts             screen state machine; wires keyboard, world, renderer, controller
src/engine/layout.ts      metrics moved out of render/theme.ts (R16)
.github/workflows/pages.yml
tests/e2e/smoke.spec.ts
```

`src/main.ts` boots `ui/app.ts`. The `?dev=fixture` page stays as a dev aid.

### Grading and FSRS (R1)

`grade(stats)` is pure, and its boundaries are tested:
- typo rate exactly 0.10 is Good, not Hard;
- exactly 2.5 cps is Good, not Easy;
- one escape with zero typos is Again.

The scheduler maps a grade onto `ts-fsrs` `Rating`. A never-graded Record is
a fresh `createEmptyCard()`.

IndexedDB database `typist`:
- **`cards`**: key `listId:recordId`. Each value holds the FSRS card plus the
  counters seen, typos and escapes.
- **`meta`**: key `new:<listId>:<local yyyy-mm-dd>`. Each value is the count
  of Records first graded that day.

A Record's first grade increments `meta` in study and free play alike.

### Sessions (R2–R4)

- Builders are pure functions of (list, cards, newCountToday, cap, now, rng).
  Study ordering, the shared cap, raw exclusion and uncategorised chunking are
  table-tested.
- The controller creates a World per wave (`createWorld(waveRecords, {wave,
  lives, score, …})`; `WorldOptions` gains `score`, and already takes `wave`
  and `lives`), so lives and score carry over between waves. On each
  `resolved` event it grades the Record and writes the store.
- On `wave-complete` it shows the between-wave panel, then starts the next
  wave. On `game-over` or the last wave it shows the summary.
- Quitting from pause ends the session. Grades already written stay written.

### Screens (R5)

- Panels are plain TypeScript building DOM. They sit absolutely positioned
  over the canvas, and CSS custom properties are generated from `theme.ts`
  tokens, so canvas and panels share one palette.
- `app.ts` is a small state machine: `title → mode → (category) → play ⇄
  pause → between-wave → … → summary → mode`. Settings opens from the title
  screen and from pause.
- While a panel is open, the hidden typing input doesn't receive characters.
  Closing a panel refocuses it.
- Pause sets a flag that stops `advance()` from being called. The World clock
  is the fixed-step clock, so lock-to-destroy time excludes the pause by
  construction.

### Learning aids and audio (R6, R7)

- The settings store keeps the four aid toggles, the SFX and music toggles,
  and the daily new cap (1–50, default 10) under one `localStorage` key.
- Chips and translations are attached to sentence ships when a wave is
  created, and only if their toggles are on.
- **TTS:**
  - It uses the first `speechSynthesis` voice whose `lang` starts with `de`.
  - On a ship's `destroyed` event it calls `speechSynthesis.cancel()`, then
    speaks that ship's full text: the display form, the forms text or the
    sentence.
  - Voices load asynchronously. If no German voice appears after
    `voiceschanged` or a short timeout, the toggle is disabled with the
    reason.
- **Audio:**
  - `audio.ts` creates one `AudioContext` on the first keydown or click.
  - Each effect is a short oscillator or noise envelope, specified by a
    parameter table that lives with the theme's tunables.
  - Music is fetched with `HEAD` at startup. If the file is present, it loops
    through an `<audio loop>` element at low volume during play and pauses
    with the game.

### Loading (R8, R9)

- `parseList` is restructured for R9:
  1. Parse the header and the `records` array loosely.
  2. Validate each record on its own (`recordSchema.safeParse`) and collect
     its errors with the index and id.
  3. Run the list-level checks over the records that parsed.

  Messages keep the existing `records[12] (verb-anlegen): <message>` shape.
  The Vite plugin and the `validate` CLI pick this up unchanged.
- "Load list…" uses a hidden `<input type=file accept=".yaml,.yml">`.
- An invalid file shows a panel listing every error. A valid list is held in
  memory for the browser session and appears in the list screen next to the
  bundled ones.

### Degraded states (R10)

- The stores probe on startup with a write and a read. If either throws, the
  in-memory implementation is used and the banner shows.
- An empty Study session turns the Study button into "Nothing due — free
  play?", which opens the category picker.

### Play feel (R11–R13)

- **Muzzle (R11):**
  - `theme.ts` gains a `muzzle` token: offsets of the front guns relative to
    the player sprite.
  - Bullets alternate between the two guns.
- **Player drift (R11):**
  - The player ship's x position is state the renderer reads, advanced by
    the World at `WORLD` side-drift speed toward the locked ship's x, clamped
    to the screen.
  - It doesn't move without a lock.
- **Typo flash (R12):** the renderer keeps a short flash timer per ship on
  `typo` events and tints the hull and text.
- **Pending digraph (R12):** the pending prefix is drawn after the typed
  prefix in a distinct token colour.
- **DPR (R13):** the canvas backing store is `cssSize × devicePixelRatio`,
  with the context scaled once.
- **Window fit (R13):**
  - The world's logical width follows the window, down to a minimum.
  - Below the minimum the whole canvas scales down.
- **Child placement (R13):**
  - It takes the HUD rectangle as an obstacle and adds a minimum gap between
    rows.
  - The no-free-slot fallback stacks the rows below the HUD and is
    unit-tested.

### Typing fixes (R14, R15)

- `matchChar` checks `expected === typed` before applying the pending-digraph
  rule.
- `PRETYPED` gains `‘ ’ )`.
- An `ACCENTS` table maps each accented letter to its base letter.
  - `typeable.ts` admits the accented letters.
  - `matchChar` accepts the base letter as an equivalent.
  - Composition from macOS dead keys already yields the exact letter.

### Engine/render split (R16)

`sizes`, `charWidths` and `hullExtent` move to `src/engine/layout.ts`.
`theme.ts` re-exports them for the renderer. The plan-1 spec's World section
also gets a stated rule (issue #4, p3-r17): siblings released from one
mothership share the group's slowest fall speed, so rows never cross.

### Seed follow-ups (R17)

- The seed test checks `status ∈ {enriched, reviewed}`.
- `noun-burnout` gets a `source_note`.
- The 197 filled-in null plurals get no note: filling in a missing plural
  isn't a correction. The issue records that decision.

### Hosting (R18)

- `pages.yml` runs on push to `main`: `npm ci`, `npm test`, `npm run build`,
  `actions/upload-pages-artifact` and `actions/deploy-pages`.
- `vite.config.ts` keeps `base: '/the-typist/'`.
- **Identifier sweep:** before going public, a sweep greps tracked files for
  `/Users/<name>`, home paths, personal key names and email addresses, and
  replaces them with placeholders such as `$PROJECTS` and `~/…`. This sweep
  covers the working tree only. Git history still holds the old text, and
  the operator accepts that when making the repo public.
- **Operator step:** flipping visibility and enabling Pages (Source: GitHub
  Actions) is a one-time outward-facing step. The plan ships it as a script
  for the operator to run; no agent runs it.

### Testing

**Vitest**
- grade boundaries;
- scheduler round trip;
- both store implementations (`fake-indexeddb`), including the throwing
  probe;
- session builders;
- controller wave flow with a stub World clock;
- settings with `localStorage` throwing;
- TTS voice selection and interrupt with a stubbed `speechSynthesis`;
- the audio module's no-file path;
- the picker's error list;
- single-pass validation (a list with both a bad record and a duplicate id
  reports both);
- the typing fixes;
- the HUD-avoiding placement and its fallback;
- player drift;
- panels in jsdom: focus return, and the pause freezing `advance`.

**Seed test:** as amended by R17.

**Playwright:** the R19 smoke test runs against `vite preview`. It runs
locally via `npm run e2e` and in the Pages workflow before deploy.

### Out of scope

Accounts or sync; any server; recall/cloze modes; in-game LLM calls;
mobile/touch play; typed menu commands; generated SFX files. Music files are
supplied by the operator from `docs/ux/audio-prompts.md` whenever they like.

## Implementation Plans

| Plan | Repo | File | Depends on |
|------|------|------|------------|
| 2026-10-06-vocab-typer-plan2 | `derio-net/the-typist` | `2026-10-06-vocab-typer-plan2` | — |
