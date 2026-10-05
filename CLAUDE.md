# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

"the-typist" is a ZType-style (https://zty.pe) browser typing shoot-'em-up for learning German. Enemies carry vocabulary Records: a mothership shows the headword and its gloss, and destroying it releases a forms ship and one ship per example sentence. The player copy-types them.

- **Design:** `docs/superpowers/specs/2026-10-05-vocab-typer-design.md` (requirements R1–R16).
- **Plan 1** (`docs/superpowers/plans/2026-10-05-vocab-typer/`) delivered:
  - the list format and validation;
  - the parser and the two list skills;
  - the typing core with sprites;
  - the enriched seed list.
- **Plan 2 is still to come.** It will cover the learning loop (FSRS, study and free-play sessions, aids, menus), file-picker loading, the GitHub Pages deploy and audio, after a manual UX pass.

## Commands

- `npm run dev`: dev server. The playable core is at `http://localhost:5173/the-typist/?dev=fixture`.
- `npm test`: Vitest, the full suite, including the seed test.
  - Run one file with `npx vitest run tests/engine/typing.test.ts`.
  - Run one test with `npx vitest run tests/engine/typing.test.ts -t '<name>'`.
- `npm run build`: type-checks `src/` (browser-only, `tsconfig.json`) and `tests/`, `tools/` (`tsconfig.node.json`), then builds with Vite.
- `npm run typist -- <cmd>`: list tooling (`tools/cli.ts`).
  - `parse <raw.txt> -o <list.yaml>`
  - `validate <list.yaml…>`
  - `dupes`, `merge-dupes [--skip id…]`, `merge <list> <id> <id>…`
  - `next-batch <list> [--n 25] [--category <id>]`
  - `stats <list>`
- `npm run sprites`: cuts `public/assets/sprites/sheet.png` into sprites and writes `src/render/sprite-atlas.json`.

## Architecture

- **`src/schema/`:** the zod Record and list schema. It holds the per-type R3 rules, typeability (the input-equivalence table) and display forms. It is shared by the game and the tools, and its objects are strict, so unknown keys fail.
- **`src/engine/`:** pure logic with no DOM.
  - `typing.ts`: target lock, ae/oe/ue/ss and quote/dash equivalences, pre-typed final punctuation.
  - `world.ts`: a 60 Hz fixed step. One Record is on screen at a time; children break up into bands; seeded RNG; per-Record stats for grading.
- **`src/platform/keyboard.ts`:** a hidden input with IME composition handling, so macOS dead keys work.
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

## Skills

- **`.claude/skills/typist-structure`:** turns a raw list into a `raw`-status list.
- **`.claude/skills/typist-enrich`:** organises a list and enriches it in batches of about 25, validating and committing each batch.

Follow these skills literally when building or extending a list.
