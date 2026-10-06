# Plan 2 of 2: the-typist — learning loop, screens, polish and hosting

Spec: `docs/superpowers/specs/2026-10-06-vocab-typer-plan2-design.md`. It
restates plan-1 R7–R13 and adds the work from issues #2–#6.

This plan delivers R1–R20 as one PR. The PR closes issues #2, #3, #4, #5 and
#6.

## Phases

1. **Foundations** *(walking skeleton)*. Smoke the workspace (the local suite
   on the trivial test, since `ci none`), then the fixes everything else builds
   on:
   - the engine/render split into `src/layout/` (R16);
   - typing edge cases (R14, R15);
   - single-pass validation (R9);
   - seed follow-ups (R17).
2. **Play feel** (R11–R13). The player ship drifts and fires from its front
   guns, with typo flash, a pending-prefix display, DPR and window fit, and
   HUD-clear placement. The World gains the options the session layer needs:
   `score`, `width`, `aids` and game-over grading.
3. **Learning loop core** (R1–R4). Grading, the ts-fsrs wrapper, IndexedDB and
   memory stores, the study and free-play builders, and the session
   controller. All of it is pure TS, unit-tested and DOM-free.
4. **Screens, settings, loading, degraded states** (R5, R8, R10). The DOM
   panels, the app state machine, the keyboard suspend and Esc, the settings
   store, and the bundled and file-picker loaders.
5. **Learning aids and audio** (R6, R7). Toggles reach the World, with recap
   cards, interrupting German TTS, and Web Audio SFX with optional music.
6. **Ship it** (R18–R20):
   - the Playwright smoke test;
   - the Pages workflow;
   - the identifier sweep;
   - the operator publish script;
   - the acceptance matrix brought up to date;
   - `CLAUDE.md`.
7. **[manual] Publish.** The operator reviews the sweep and runs
   `scripts/publish-pages.sh` to make the repo public and enable Pages. This
   phase is back-loaded and no agentic phase depends on it. The PR ships it
   unimplemented.

## Notes for executors

- **TDD** throughout: red → green, then refactor where a step says so (or
  record a `refactor:` reason in the step record).
- **Visual tokens:** every colour, font and size stays in `src/render/theme.ts`
  (the theme-purity test enforces it). Panels get their palette through CSS
  custom properties generated from those tokens.
- **Purity:** `src/engine` stays pure and DOM-free, and imports nothing from
  `src/render` once phase 1 lands. `src/srs` and `src/session` are DOM-free.
- **Browser checks:** phases 2, 4 and 5 capture the visual states their
  acceptance rows name. Screenshots go in a git-ignored dir the host can see,
  never the container's `/tmp`, and every one is opened before it's recorded.
- **Outward-facing actions:** making the repository public and enabling Pages
  is the operator's step (phase 7). No agent runs `scripts/publish-pages.sh`
  or changes repository settings.
- **Seed ids are frozen:** R17 edits `noun-burnout`'s `source_note`, never its
  id.

## Test Plan (post-merge, operator-driven)

- With the repo public and Pages enabled, merging to `main` runs
  `pages.yml`: the tests, the build and the Playwright smoke, then the
  deploy.
- Open https://derio-net.github.io/the-typist/:
  1. Pick "German B2 – 1000 words", play a Study session to the summary, and
     reload. Due and new counts reflect the graded Records.
  2. Load a YAML list of your own through "Load list…"; an invalid one shows
     its errors.
  3. Check TTS reads destroyed ships aloud, and that sound effects and the
     music toggle behave. Music needs `public/assets/audio/music-game.mp3`;
     without it the game stays silent apart from effects.
