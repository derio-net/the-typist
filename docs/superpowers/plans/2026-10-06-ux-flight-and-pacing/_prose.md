# Flight, pacing, speech and portable progress — plan

Spec: `docs/superpowers/specs/2026-10-06-ux-flight-and-pacing-design.md` (R1–R10).

The plan has three agentic phases, one per independently reviewable ask:

1. **Flight and pacing (R1–R5), the skeleton.** These are engine changes: the
   stack order, the kick solved to reach the HUD, the pure typing-rate
   estimate, and speeds from that estimate. The phase also covers pace
   carried by the controller and saved by the app. It removes `burstKick`,
   `baseSpeed`, `speedPerWave` and `referenceLength`, and rewrites the tests
   that pinned them.
2. **Speech on attack and voices (R6–R8).** Speech moves from `destroyed` to
   `lock` (looked up in `prev`). The phase also adds the voice ranking, voice
   selection in `tts.ts`, the saved voice, and the Settings picker with Test
   and the install hint.
3. **Protected and portable progress (R9–R10).** It adds `persist()` with a
   status line, the progress file format and merge rules, store
   export/import in one transaction, title-only Export/Import controls, and
   an E2E round trip.

Every phase is TDD (red, then green, then refactor where a cleanup is due).
Each ends with its visual capture (hermetic browser: `--mute-audio`, stubbed
`speechSynthesis`), its acceptance rows and a green full suite run after its
last code commit.

The Test Plan is post-merge and operator-driven (the `live-session-check`
row), not a phase.
