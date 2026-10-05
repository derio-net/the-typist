# Plan 1 of 2: the-typist — content pipeline and playable core

Spec: `docs/superpowers/specs/2026-10-05-vocab-typer-design.md`.

This plan delivers R1–R6 and R14–R16 as one PR. Plan 2 delivers R7–R13
(learning loop, aids, loading, hosting) after merge.

## Why there are two plans

The operator wants the UX direction, aesthetic and assets settled before the
game's UI is built. In the fr-goal shape a `[manual]` phase is never
dispatched and never blocks the run, so an agentic phase can't wait on it.
The gate therefore sits between two runs:

- **Plan 1 (this one)** builds everything that doesn't depend on the look,
  and leaves a playable core to judge the look on.
- **Plan 2** starts with a front-loaded `[manual]` UX/assets phase. The
  operator ticks it before the run starts. The plan then builds:
  - the learning loop: grading, FSRS, sessions, aids, settings and screens
    (R7–R10, R13);
  - loading, the Pages deploy, the Playwright smoke test and the CLAUDE.md
    update (R11 runtime, R12).

  Its phase drafts were cut from this plan's first draft.

## Phases

1. **List format and validation** *(walking skeleton)*. This phase
   scaffolds the project, makes a trivial test pass, then builds the shared
   zod schema, the `validate` CLI and the Vite list plugin (R1–R3, and the
   build half of R11).
2. **Parser + `typist-structure` skill** (R14).
3. **Typing core and ships** (R4–R6). This covers keyboard capture with
   macOS composition, the pure TypingEngine and World, and a themeable Canvas
   renderer. A fixture list is playable at `npm run dev` → `/?dev=fixture`.
   All visual constants live in `src/render/theme.ts`; this is what the
   operator restyles between plans.
4. **`typist-enrich` skill** (R15), with deterministic organise helpers in
   the CLI.
5. **Seed I.** Structure the whole seed, organise it, and enrich the
   categories with order 1–11. Ids are frozen after organising.
6. **Seed II.** Enrich categories 12–21. The seed test is written red first
   and goes green at the end.

## Notes for executors

- **TDD** throughout: red → green, then refactor where a step says so.
- **Placeholder visuals in phase 3** must come only from `theme.ts` tokens
  and the `drawShip` hook.
- **Seed phases** are content work. Batches of up to 25 records, with
  validate and commit after each batch, keep every commit reviewable and let
  a phase resume after interruption. The seed is never enriched by calling
  an external LLM per record.
- **Acceptance rows owed by plan 2** stay `not-implemented` in this PR:
  srs-sessions, learning-aids, degraded-states, list-loading.
