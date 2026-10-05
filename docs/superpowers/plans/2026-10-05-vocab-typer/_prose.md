# Plan: the-typist — vocab typing game

Spec: `docs/superpowers/specs/2026-10-05-vocab-typer-design.md` (R1–R16).

## Shape

Nine phases. All of them run serially in the `feat/vocab-typer` fr-isolation
worktree and are delivered as one PR.

1. **List format and validation** *(walking skeleton)*. This phase scaffolds
   the project, makes a trivial test pass, then builds the shared zod schema,
   the `validate` CLI and the Vite list plugin. Every later phase imports the
   schema.
2. **Parser + `typist-structure` skill** (R14).
3. **Typing core and ships** (R4–R6). This covers keyboard capture with macOS
   composition, the pure TypingEngine and World, and a themeable Canvas
   renderer. The result is a fixture list playable at `/?dev=fixture`. All
   visual constants live in `src/render/theme.ts`, so phase 4 can restyle the
   game without touching logic.
4. **[manual] UX direction, aesthetic and assets.** You play the phase-3
   build, fix the look, and commit `docs/style-guide.md`, the theme values
   and the assets. Phase 5 depends on this phase, and the orchestrator holds
   the run here until the guide is committed.
5. **Learning loop** (R7–R10, R13). Grading, FSRS + IndexedDB, sessions,
   aids, settings, and the screens, built from the style guide.
6. **Loading and hosting** (R11–R12). The file-picker loader, the Playwright
   smoke test, the Pages workflow, and the CLAUDE.md update.
7. **`typist-enrich` skill** (R15), with deterministic organise helpers in
   the CLI.
8. **Seed I.** Structure the whole seed, organise it, and enrich the
   categories with order 1–11. Ids are frozen after organising.
9. **Seed II.** Enrich categories 12–21. The seed test is written red first
   and goes green at the end.

## Notes for executors

- **TDD** throughout: red → green, then refactor where a step says so.
- **Placeholder visuals in phase 3** must come only from `theme.ts` tokens and
  the `drawShip` hook. No other colours or fonts are allowed anywhere else.
- **Seed phases** are content work. Batches of up to 25 records, with
  validate and commit after each batch, keep every commit reviewable and let
  a phase resume after interruption.
- The full seed is never enriched by calling an external LLM per record.
