# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

"the-typist" is a ZType-style (https://zty.pe) browser typing shoot-'em-up for learning German. Enemies carry vocabulary Records: a mothership shows the headword and its gloss, and destroying it releases a forms ship and one ship per example sentence. The player copy-types them.

- **Plan 1** delivered the list format and validation, the parser and the two list skills, the typing core with sprites, and the enriched seed list.
  - Design: `docs/superpowers/implemented/specs/2026-10-05-vocab-typer-design.md` (R1–R16).
- **Plan 2** delivered the learning loop and shipping:
  - FSRS study and free-play sessions, aids (chips, translations, TTS, recap cards), menus, settings, audio and play feel;
  - file-picker list loading, degraded-state handling, a Playwright smoke test, and the GitHub Pages deploy.
  - Design: `docs/superpowers/implemented/specs/2026-10-06-vocab-typer-plan2-design.md` (R1–R20).
- Publishing is operator-run: `scripts/publish-pages.sh` makes the repo public and enables Pages. Nothing else does.

## Commands

- `npm run dev`: dev server. The playable core is at `http://localhost:5173/the-typist/?dev=fixture`.
- `npm test`: Vitest, the full suite, including the seed test.
  - Run one file with `npx vitest run tests/engine/typing.test.ts`.
  - Run one test with `npx vitest run tests/engine/typing.test.ts -t '<name>'`.
- `npm run e2e`: the Playwright smoke test (`tests/e2e/`). It builds the app and serves it with `vite preview` on port 4173. It needs `npx playwright install chromium` once. `tests/e2e/*.spec.ts` are Playwright's: Vitest only includes `*.test.ts`, so they stay out of `npm test`. The run is silent: `--mute-audio` plus a stubbed `speechSynthesis`.
- `npm run build`: type-checks `src/` (browser-only, `tsconfig.json`) and `tests/`, `tools/` (`tsconfig.node.json`), then builds with Vite.
- `npm run typist -- <cmd>`: list tooling (`tools/cli.ts`).
  - `parse <raw.txt> -o <list.yaml>`
  - `validate <list.yaml…>`
  - `dupes`, `merge-dupes [--skip id…]`, `merge <list> <id> <id>…`
  - `next-batch <list> [--n 25] [--category <id>]`
  - `stats <list>`
- `npm run sprites`: cuts `public/assets/sprites/sheet.png` into sprites and writes `src/layout/sprite-atlas.json`.

## Architecture

- **`src/schema/`:** the zod Record and list schema. It holds the per-type R3 rules, typeability (the input-equivalence table) and display forms. It is shared by the game and the tools, and its objects are strict, so unknown keys fail.
- **`src/engine/`:** pure logic with no DOM.
  - `typing.ts`: target lock, ae/oe/ue/ss and quote/dash equivalences, pre-typed final punctuation.
  - `world.ts`: a 60 Hz fixed step. One Record is on screen at a time; children break up into bands; seeded RNG; per-Record stats for grading.
- **`src/platform/`:**
  - `keyboard.ts`: a hidden input with IME composition handling, so macOS dead keys work.
  - `settings.ts`: aid, audio and recap toggles, persisted in localStorage.
  - `tts.ts`: German speech synthesis, spoken when a ship is locked, with a ranked voice list (`voices.ts`), a saved voice choice and a degraded state when no voice exists.
  - `audio.ts`: sound effects and looping music (`public/assets/audio/music-game.mp3`, a CC0 track credited in `CREDITS.md`).
- **`src/render/` also holds** `canvas-size.ts` (sharp, narrow-window-safe playfield sizing), `feedback.ts` (typo flash, pending digraph prefix, muzzle effects) and `stars.ts` (the backdrop).
- **`src/layout/`:** playfield metrics and the sprite atlas.
- **`src/srs/`:** grading (`grade.ts`), the ts-fsrs scheduler and the IndexedDB card store (database `typist`, store `cards`, keys `[listId, recordId]`), with a memory fallback. A `meta` store holds the per-day new-card counts under keys `['new', listId, day]`. `exportAll` and `importAll` move progress between browsers: `portable.ts` holds the progress file format (zod-validated, ISO dates) and the merge rules (a card is replaced only by a later `last_review`; counts take the max; the typing-rate estimate is taken when it has seen more characters). The import runs in one IndexedDB transaction. Settings offers Export and Import from the title only, and asks the browser for persistent storage at startup.
- **`src/session/`:** `build.ts` builds study and free-play waves; `controller.ts` runs a session of waves with shared lives and produces the summary.
- **`src/content/`:** bundled lists and the list picker.
- **`src/ui/`:** the app shell (`app.ts`), DOM helpers and the panels (title, mode, category, pause, between-wave with recap cards, summary, settings, load errors, banner).
- **`src/render/`:**
  - `theme.ts`: every visual constant, plus the `drawShip` sprite hook.
  - `sprites.ts`: loading, 3-slice hulls, the reticle.
  - `renderer.ts`: two passes, hulls first and then text.
- **`tools/`:** Node-only.
  - `parse/`: raw list to Records.
  - `organise/`: merge, batches, stats.
  - `sprites/slice.ts`
  - `vite-plugin-lists.ts`: validates `lists/*.yaml` and turns each into a JSON module.
- **`lists/de-b2-1000.yaml`:** the seed list. It has 968 enriched Records covering all 1000 lines of `wordlist.raw.txt`, in 20 categories. Record ids are frozen, because SRS state keys on them.
- **`wordlist.raw.txt`:** the seed source. Never edit it. Corrections live in the list, recorded in `source_note`.

## Deploy

`.github/workflows/pages.yml` runs on push to `main` (and manually): `npm test`, `npm run build`, the Playwright smoke, then the deploy job publishes `dist` to GitHub Pages (main only). The app is served under the `/the-typist/` base path.

`scripts/publish-pages.sh` is the one-time operator step: it makes the repo public, enables Pages with `build_type=workflow`, and triggers the workflow when `pages.yml` is already on main. Order: run the script, then merge. If the merge happens first, the first deploy fails (Pages is not enabled yet); run the script, then `gh workflow run pages.yml --repo derio-net/the-typist --ref main` to redeploy.

## Skills

- **`.claude/skills/typist-structure`:** turns a raw list into a `raw`-status list.
- **`.claude/skills/typist-enrich`:** organises a list and enriches it in batches of about 25, validating and committing each batch.

Follow these skills literally when building or extending a list.
