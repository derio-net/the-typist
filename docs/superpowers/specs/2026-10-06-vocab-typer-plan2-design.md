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
R2. A Study session for a chosen list contains the `enriched`/`reviewed` Records that are due, plus never-graded Records in list order up to the remaining daily new cap (default 10, adjustable in settings). They are grouped into waves by primary (first) category, with at most 6 Records per wave, shuffled within the wave. Categories are ordered by their most overdue card, oldest due date first. Categories holding only new Records come last, in category `order`. A list without categories is chunked into waves in record order.
R3. Free play runs every `enriched`/`reviewed` Record whose `categories` include the chosen category (primary or not), shuffled, in waves of at most 6, regardless of due dates. For a list without categories, it runs the whole list in record order. Its grades also update FSRS state, and a Record first graded in free play counts toward that day's new cap.
R4. A session is one run of waves with shared lives (default 3) and score. It ends when its waves are done, when lives reach 0, or when the player quits. Records that never came on screen stay ungraded. When lives reach 0, every on-screen Record with an escaped ship is graded Again, and the other on-screen Records stay ungraded. When the player quits, on-screen Records stay ungraded.
R5. The game has these screens, drawn as DOM panels over the game canvas: a title and list screen (bundled lists plus "Load list…"); a mode choice showing the counts of due and new Records, with Study and Free play (Free play opens a category picker); a between-wave panel, shown after every wave including the last; a session summary (grade counts, accuracy, characters per second, score); settings; and a pause panel that Esc opens during play (Resume, Settings, Quit to menu). While the game is paused, the game clock is frozen, so a pause never counts toward typing speed. When a panel closes, typing focus returns to the game.
R6. Four learning aids, each toggleable in settings, remembered, and on by default:
- a grammar chip with the recognised tags on each sentence ship;
- the English translation under each sentence ship;
- German text-to-speech that reads a destroyed ship's text aloud the moment it is destroyed, cutting off any speech still playing;
- a recap card in the between-wave panel for each Record of that wave graded Again or Hard, showing its display form, gloss, forms and all its sentences with translations.

The mothership, the forms ship and the sentence ships are all read aloud.
R7. The game plays synthesized sound effects for a hit, a typo, a small and a big explosion, an escape, a cleared wave and an entering mothership. It loops `public/assets/audio/music-game.mp3` during play when that file exists, and plays no music when it doesn't. Sound effects and music each have a remembered toggle in settings. Audio starts only after the player's first interaction.
R8. Lists in the repository's `lists/` directory are validated at build time, and an invalid list fails the build; valid lists are bundled. The player can load a YAML list from disk, which is validated in the browser. If it is invalid, it is rejected with its error messages. If it is valid, it is played for that browser session, and its FSRS state persists under its `list.id`. `raw` Records are never played. A list with no playable Records loads and says there is nothing to play.
R9. Validation reports record-level and list-level errors in one pass. List-level checks (unique record ids, unique category ids, declared categories, every record categorised when the list declares categories) run over the records that parsed, even when other records have errors.
R10. When a study session would be empty, the game offers free play. When `localStorage` or IndexedDB is unavailable, a banner warns that progress and settings won't be saved, and the game plays with in-memory stores. When no German voice exists, the TTS toggle is disabled with an explanation.
R11. The player ship fires from its front guns. While a ship is locked, the player ship drifts horizontally toward it at the fastest sideways drift speed of enemy ships (`WORLD.burstMaxVx`, as the named constant `WORLD.playerDriftVx`), and bullets leave from its current position.
R12. A typo flashes the locked ship. A pending ASCII digraph prefix (e.g. the `o` of `oe`) is shown on the locked ship until it resolves.
R13. The canvas renders sharply at the device pixel ratio and fits the window, including narrow ones, without horizontal scrolling. Ships released from a mothership never overlap the HUD, even at the top of their upward kick, and their rows, chip and translation lines included, keep a minimum vertical gap. When the HUD clearance and the reaction distance cannot both hold, the reaction distance wins and the upward kick is reduced, so that the top row still clears the HUD; this fallback is tested.
R14. While an ASCII digraph is pending, typing the exact expected character (e.g. `ö` after `o` of `oe`) is accepted. Closing single quotes `‘` `’` and `)` at the end of a sentence are pre-typed, like the other final punctuation.
R15. Accented Latin letters in loanwords (`é è ê ë à â á î ï ô ó û ù ç ñ` and their capitals) are typeable: the schema's typeability check accepts them, and the typing engine accepts either the exact letter or its unaccented base letter.
R16. The game engine (`src/engine`) does not import from the renderer (`src/render`), as a test enforces. The layout metrics and sprite-atlas data that both need live in a shared `src/layout/` module.
R17. The seed test accepts records whose status is `enriched` or `reviewed`. `noun-burnout` carries a `source_note` about the Duden-preferred *das Burn-out*.
R18. The game is a static site deployed to GitHub Pages from `main` by a workflow in the repository, which runs the tests and the build before deploying. Before the repository is made public, a sweep masks personal identifiers in tracked files.
R19. A Playwright smoke test loads a two-Record fixture list through the file picker and types every ship, using an `ae` fallback and enough typos on one Record to grade it Hard. It then checks that the between-wave panel shows that Record's recap card, that the summary follows, and that FSRS cards for both Records exist in IndexedDB.
R20. `CLAUDE.md` describes the finished game: screens, sessions, stores, aids, audio, deploy and the smoke test.

## Design

### What exists (plan 1)

- `World` (`src/engine/world.ts`) already emits these events:
  - `resolved {recordId, stats}`, where `RecordStats` holds `typos`,
    `expectedChars`, `activeMs` and a boolean `escaped`;
  - `wave-complete`;
  - `game-over`;
  - `escaped`.
- `createWorld(records, opts)` runs one batch of Records. `WorldOptions`
  takes `wave`, `lives`, `measure`, `minReactionS` and `seed`.
- `src/engine/world.ts` imports `sizes`, `charWidths` and `hullExtent` from
  `src/render/theme.ts`, and `hullExtent` reads
  `src/render/sprite-atlas.json` (issue #4).
- `src/platform/keyboard.ts` refocuses its hidden input on every blur and
  has no key listener.
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
src/layout/metrics.ts     sizes, charWidths, hullSprite, hullExtent, SpriteInfo (R16)
src/layout/sprite-atlas.json  moved from src/render/; `npm run sprites` writes it here
src/platform/keyboard.ts  changed: setEnabled(on), onEscape callback (R5)
.github/workflows/pages.yml
playwright.config.ts      webServer `vite preview`, baseURL …/the-typist/
tests/e2e/smoke.spec.ts   run by `npm run e2e` (outside Vitest's tests/**/*.test.ts)
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
  counters `seen` (grades), `typos` (summed) and `escapes` (grades whose
  stats had `escaped`).
- **`meta`**: key `new:<listId>:<local yyyy-mm-dd>`. Each value is the count
  of Records first graded that day.

A Record's first grade increments `meta` in study and free play alike.

### Sessions (R2–R4)

- Builders are pure functions of (list, cards, newCountToday, cap, now, rng).
  Study ordering, the shared cap, raw exclusion and uncategorised chunking are
  table-tested.
- The controller creates a World per wave: `createWorld(waveRecords, {wave,
  lives, score, width, aids, …})`. `WorldOptions` gains `score`, `width` and
  `aids`, so lives and score carry over between waves. On each `resolved`
  event it grades the Record and writes the store.
- On `wave-complete` it shows the between-wave panel (recap cards for that
  wave's Again or Hard Records, or "wave cleared"). The panel shows after the
  last wave too, before the summary.
- On `game-over` the World first emits `resolved` (with `escaped: true`) for
  every on-screen Record that has an escaped ship but open ships left, so the
  controller grades it Again (R4). The controller then shows the summary.
- Quitting from pause ends the session. Grades already written stay written,
  and on-screen Records stay ungraded.

### Screens (R5)

- Panels are plain TypeScript building DOM. They sit absolutely positioned
  over the canvas, and CSS custom properties are generated from `theme.ts`
  tokens, so canvas and panels share one palette.
- `app.ts` is a small state machine: `title → mode → (category) → play ⇄
  pause → between-wave → … → summary → mode`. Settings opens from the title
  screen and from pause.
- `keyboard.ts` gains `setEnabled(on)`. While disabled it neither emits
  characters nor reclaims focus, so panel controls (the cap field, the
  toggles, the file input) keep focus. `app.ts` disables it while any panel
  is open and enables it, refocusing the input, when the last panel closes.
  An `onEscape` callback fires on Esc in either state. During play it opens
  pause, and in pause it resumes.
- Pause sets a flag that stops `advance()` from being called. The World clock
  is the fixed-step clock, so lock-to-destroy time excludes the pause by
  construction.

### Learning aids and audio (R6, R7)

- The settings store keeps the four aid toggles, the SFX and music toggles,
  and the daily new cap (1–50, default 10) under one `localStorage` key.
- The World attaches chips and translations to sentence ships only when
  `WorldOptions.aids` turns them on (both default on). A row that is off is
  not attached, so it neither widens the hull nor takes band height.
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
  1. Parse the top level loosely: the header, `categories` and `records` as
     an array. Validate the header and the categories on their own. If the
     header fails, report its errors and fall back to the default example
     minimums.
  2. Validate each record on its own against `RecordBase` plus
     `checkEnriched(r, rules)` with the header's `rules`, which the current
     `ListSchema` also applies. Collect each record's errors with its index
     and id.
  3. Run the list-level checks (unique record and category ids, declared
     categories, categorised records) over the records and categories that
     parsed.

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
  - The player ship's x is World state (`playerX`, starting at the centre)
    that the renderer reads. Each step the World moves it toward the locked
    ship's x by at most `WORLD.playerDriftVx` (= `burstMaxVx`, 22 px/s),
    clamped to the screen.
  - It doesn't move without a lock.
- **Typo flash (R12):** the renderer keeps a short flash timer per ship on
  `typo` events and tints the hull and text.
- **Pending digraph (R12):** the pending prefix is drawn after the typed
  prefix in a distinct token colour.
- **DPR (R13):** the canvas backing store is `cssSize × devicePixelRatio`,
  with the context scaled once.
- **Window fit (R13):**
  - Each World has a fixed logical `width` (`WorldOptions.width`, default
    960). The height stays 640.
  - The controller picks the width when a wave starts: the window's aspect
    ratio × 640, clamped to 720–1280.
  - The canvas is CSS-scaled to fit the window at that aspect ratio, so a
    window narrower than 720 logical px scales the whole canvas down.
  - A resize mid-wave only rescales; the new width applies from the next
    wave.
- **Child placement (R13):** the current rule keeps ship centres below
  `minY` and places the stack with two clamps.
  - New: the hull top of the first row must stay at or below `minY` (the HUD
    bottom) at the apex of the kick. `minY` already spans the full width, so
    the HUD rectangle is the strip above it.
  - New: band spacing uses each ship's full `shipBounds` height (chip and
    translation lines included) plus `bandGap`.
  - Kept: the reaction-distance clamp wins.
  - New fallback: when the clamps conflict, the kick velocity is reduced
    until the apex clears the HUD, down to zero.

### Typing fixes (R14, R15)

- `matchChar` checks `expected === typed` before applying the pending-digraph
  rule.
- `PRETYPED` gains `‘ ’ )`.
- An `ACCENTS` table maps each accented letter to its base letter.
  - `typeable.ts` admits the accented letters.
  - `matchChar` accepts the base letter as an equivalent.
  - Composition from macOS dead keys already yields the exact letter.

### Engine/render split (R16)

- `sizes`, `charWidths`, `hullSprite`, `hullExtent`, the `SpriteInfo` and
  `SpriteName` types, and `sprite-atlas.json` move to `src/layout/`.
- `tools/sprites/slice.ts` writes the atlas there.
- `theme.ts` and `sprites.ts` re-export what the renderer uses, so
  `src/render` depends on `src/layout`, and `src/engine` depends on
  `src/layout` only.
- A Vitest test scans `src/engine/**` imports and fails on any path into
  `src/render`.
- The World rule from issue #4 (p3-r17) is stated here, not edited into the
  archived plan-1 spec: siblings released from one mothership all fall at the
  group's slowest speed (`spawnChildren` in `src/engine/world.ts`), so rows
  never cross.

### Seed follow-ups (R17)

- The seed test checks `status ∈ {enriched, reviewed}`.
- `noun-burnout` gets a `source_note`.
- The 197 filled-in null plurals get no note: filling in a missing plural
  isn't a correction. The issue records that decision.

### Hosting (R18)

- `pages.yml` runs on push to `main` with these steps:
  1. `npm ci`
  2. `npm test`
  3. `npm run build`
  4. `npx playwright install --with-deps chromium`
  5. `npm run e2e` (Playwright against `vite preview` of the build)
  6. `actions/upload-pages-artifact` of `dist/`
  7. `actions/deploy-pages`
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
- grade boundaries, plus game-over grading: an on-screen Record with an
  escaped ship becomes Again, others stay ungraded;
- scheduler round trip;
- both store implementations (`fake-indexeddb`), including the throwing
  probe;
- session builders: due ordering by most overdue card, the new cap filled
  in list order, a free-play first grade counting toward the cap, raw
  exclusion and uncategorised chunking;
- controller wave flow with a stub World clock;
- settings with `localStorage` throwing;
- TTS voice selection and interrupt with a stubbed `speechSynthesis`;
- the audio module's no-file path;
- the picker's error list;
- single-pass validation (a list with both a bad record and a duplicate id
  reports both);
- the typing fixes;
- the HUD-avoiding placement (apex hull top ≥ `minY`), row spacing by
  `shipBounds` plus `bandGap`, and the reduced-kick fallback;
- player drift capped at `playerDriftVx`, and still without a lock;
- muzzle offsets alternating between the two guns (a pure helper);
- `WorldOptions.width` driving entry range and edge bounces, and
  `WorldOptions.aids` off giving narrower hulls with no chip or translation;
- the renderer's typo-flash timer and pending-prefix split (pure helpers),
  and the DPR backing-store size;
- the R16 import boundary;
- a valid list with zero playable Records showing its message;
- panels in jsdom: a settings control keeps focus while keyboard is
  disabled, focus returns on close, Esc toggles pause, and pause freezes
  `advance`.

Visual results (the sharp Retina render, the look of the flash and the
prefix, the narrow-window fit) are captured by screenshot for the
`play-feel` and `session-screens` rows.

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
