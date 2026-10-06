# Journal: 2026-10-06-vocab-typer-plan2

<!-- fr:journal kind=decision scope=plan id=matrix-repointed-at-plan created=2026-10-06T04:55:10+00:00 phase=6 -->
### matrix-repointed-at-plan · decision · Matrix origins re-pointed at planning time, not in phase 6 (phase 6)

fr plan self-review requires each agentic phase's rows to cite this spec, so the stale plan-1 refs were moved to implemented/specs/ and the plan-2 origins added to srs-sessions, learning-aids, degraded-states and list-loading now, with the reports regenerated. Phase 6's matrix step keeps only the levels and status moves.

<!-- fr:journal kind=discovery scope=plan id=p1-baseline created=2026-10-06T05:01:17+00:00 phase=1 -->
### p1-baseline · discovery · Baseline smoke green (phase 1)

npm ci, npm test (19 files, 256 tests) and npm run build were green before any change.
After phase 1: 20 files, 282 tests, build green.

<!-- fr:journal kind=decision scope=plan id=p1-exact-first-guard created=2026-10-06T05:01:17+00:00 phase=1 -->
### p1-exact-first-guard · decision · matchChar exact-letter shortcut limited to digraph letters (phase 1)

The exact `expected === typed` check precedes the pending branch only when pending is empty
or the expected letter has a digraph; the existing case matchChar('b','a','b') must stay a miss.

<!-- fr:journal kind=decision scope=plan id=p1-listlevel-shared created=2026-10-06T05:01:17+00:00 phase=1 -->
### p1-listlevel-shared · decision · List-level checks extracted as checkListLevel (phase 1)

ListSchema keeps its superRefine (tests use it directly) but both it and the new
single-pass parseList call the shared checkListLevel, so the rules live in one place.

<!-- fr:journal kind=decision scope=plan id=p1-burnout-kept-masculine created=2026-10-06T05:01:17+00:00 phase=1 -->
### p1-burnout-kept-masculine · decision · noun-burnout keeps der Burnout (phase 1)

Kept the source gender and spelling (der Burnout, unhyphenated), noted that Duden prefers
das Burn-out in source_note; examples already agree with masculine.

<!-- fr:journal kind=discovery scope=plan id=no-refactor-p1-t3 created=2026-10-06T05:01:17+00:00 phase=1 -->
### no-refactor-p1-t3 · discovery · no-refactor-because P1.T3 (phase 1)

Two-line change (exact-first check, three PRETYPED entries); nothing to clean.

<!-- fr:journal kind=discovery scope=plan id=no-refactor-p1-t6 created=2026-10-06T05:01:17+00:00 phase=1 -->
### no-refactor-p1-t6 · discovery · no-refactor-because P1.T6 (phase 1)

Test tweak plus one YAML source_note; nothing to clean.

<!-- fr:journal kind=finding scope=plan id=p1-r1 created=2026-10-06T05:08:16+00:00 phase=1 state=open review_scope=in -->
### p1-r1 · finding [open] (reviewer: in scope) · parseList reports a missing list header twice, including a confusing "expected nonoptional" message (phase 1)

parseList reports a missing list header twice, including a confusing "expected nonoptional" message

<!-- fr:journal kind=finding scope=plan id=p1-r2 created=2026-10-06T05:08:16+00:00 phase=1 state=open review_scope=in -->
### p1-r2 · finding [open] (reviewer: in scope) · List-level checks also run on records that failed their schema, giving redundant category errors (phase 1)

List-level checks also run on records that failed their schema, giving redundant category errors

<!-- fr:journal kind=finding scope=plan id=p1-r3 created=2026-10-06T05:08:16+00:00 phase=1 state=open review_scope=in -->
### p1-r3 · finding [open] (reviewer: in scope) · An invalid categories block makes every record report undeclared category (phase 1)

An invalid categories block makes every record report undeclared category

<!-- fr:journal kind=finding scope=plan id=p1-r4 created=2026-10-06T05:08:16+00:00 phase=1 state=open review_scope=in -->
### p1-r4 · finding [open] (reviewer: in scope) · Boundary test misses side-effect and dynamic imports and transitive reachability (phase 1)

Boundary test misses side-effect and dynamic imports and transitive reachability

<!-- fr:journal kind=finding scope=plan id=p1-r5 created=2026-10-06T05:08:16+00:00 phase=1 state=open review_scope=in -->
### p1-r5 · finding [open] (reviewer: in scope) · ListIssue doc comment says index is null for categories (phase 1)

ListIssue doc comment says index is null for categories

<!-- fr:journal kind=finding scope=plan id=p1-r6 created=2026-10-06T05:08:16+00:00 phase=1 state=open review_scope=in -->
### p1-r6 · finding [open] (reviewer: in scope) · Leftover consecutive blank lines in src/render/theme.ts (phase 1)

Leftover consecutive blank lines in src/render/theme.ts

<!-- fr:journal kind=review scope=plan id=p1-review created=2026-10-06T05:08:16+00:00 phase=1 -->
### p1-review · review · phase 1 code review: 6 minor findings, all fixed (phase 1)

Independent reviewer read 359b46d..35c26ed (R9, R14, R15, R16, R17). Raised p1-r1..p1-r6, all Minor and in scope; none Critical or Important. All six were verified against the code and fixed in the follow-up commit with regression tests; the full suite (287 tests) and the build are green.

<!-- fr:journal kind=finding scope=plan id=p1-r1-resolved created=2026-10-06T05:08:16+00:00 phase=1 state=fixed resolves=p1-r1 -->
### p1-r1-resolved · finding [fixed] · resolves p1-r1: parseList reports a missing list header twice, including a confusing "expected nonoptional" message (phase 1)

Top.list is now optional, so ListHeader reports the missing header once; regression test added (red without the fix).

<!-- fr:journal kind=finding scope=plan id=p1-r2-resolved created=2026-10-06T05:08:16+00:00 phase=1 state=fixed resolves=p1-r2 -->
### p1-r2-resolved · finding [fixed] · resolves p1-r2: List-level checks also run on records that failed their schema, giving redundant category errors (phase 1)

Kept failed records with a readable id in the duplicate-id check, which is useful and now stated in spec R9. Category checks are skipped (categories: null) when the record's categories field is malformed. Tests cover both.

<!-- fr:journal kind=finding scope=plan id=p1-r3-resolved created=2026-10-06T05:08:16+00:00 phase=1 state=fixed resolves=p1-r3 -->
### p1-r3-resolved · finding [fixed] · resolves p1-r3: An invalid categories block makes every record report undeclared category (phase 1)

When the categories block fails, per-record category checks are skipped and the categories error stands alone; regression test added.

<!-- fr:journal kind=finding scope=plan id=p1-r4-resolved created=2026-10-06T05:08:16+00:00 phase=1 state=fixed resolves=p1-r4 -->
### p1-r4-resolved · finding [fixed] · resolves p1-r4: Boundary test misses side-effect and dynamic imports and transitive reachability (phase 1)

Rewrote tests/engine/boundary.test.ts: a specifier regex covering from/side-effect/dynamic imports (with its own test), plus a DFS over the relative imports reachable from src/engine that fails on any file under src/render.

<!-- fr:journal kind=finding scope=plan id=p1-r5-resolved created=2026-10-06T05:08:16+00:00 phase=1 state=fixed resolves=p1-r5 -->
### p1-r5-resolved · finding [fixed] · resolves p1-r5: ListIssue doc comment says index is null for categories (phase 1)

Reworded: index is the position of the record or category, per `where`.

<!-- fr:journal kind=finding scope=plan id=p1-r6-resolved created=2026-10-06T05:08:16+00:00 phase=1 state=fixed resolves=p1-r6 -->
### p1-r6-resolved · finding [fixed] · resolves p1-r6: Leftover consecutive blank lines in src/render/theme.ts (phase 1)

Collapsed.

<!-- fr:journal kind=decision scope=plan id=p2-placestack-direct created=2026-10-06T05:22:24+00:00 phase=2 -->
### p2-placestack-direct · decision · placeStack written as a pure function straight away (P2.T4.S2 and S3 together) (phase 2)

The placement rewrite was written directly as the pure `placeStack` in world.ts, so the
S3 refactor needed no separate step. Rule order is documented on the function: spacing,
centred on the wreck, HUD apex clearance, reaction distance wins, reduced-kick fallback.

<!-- fr:journal kind=decision scope=plan id=p2-feedback-module created=2026-10-06T05:22:24+00:00 phase=2 -->
### p2-feedback-module · decision · flashLevel and splitText live in src/render/feedback.ts, canvasSize and pickWidth in src/render/canvas-size.ts (phase 2)

Pure helpers in their own render modules so tests import them without a canvas. `theme`
also gained a `theme` aggregate export and `muzzle`/`muzzles`; the typo flash tokens are
`palette.typoFlash`, `palette.pending`, `effects.typoFlashMs` and `effects.typoFlashAlpha`.

<!-- fr:journal kind=discovery scope=plan id=p2-browser-check-clock created=2026-10-06T05:22:24+00:00 phase=2 -->
### p2-browser-check-clock · discovery · Capturing sub-120 ms effects needs a faked clock (phase 2)

Bullets live 120 ms and typo flashes 260 ms, too short for a real screenshot. The capture
script installs Playwright's fake clock and steps it with runFor, so each shot is
deterministic. The mothership x is random (the fixture seed is random), so the script
reads states, not positions. index.html got a margin:0 / overflow:hidden style so a
600 px window has no horizontal scroll (measured scrollWidth 600 = innerWidth 600).

<!-- fr:journal kind=discovery scope=plan id=p2-dev-port created=2026-10-06T05:22:24+00:00 phase=2 -->
### p2-dev-port · discovery · Dev server came up on 5174, not 5173 (phase 2)

Port 5173 was taken, so the browser check ran against http://localhost:5174/the-typist/.

<!-- fr:journal kind=discovery scope=plan id=no-refactor-p2-t1 created=2026-10-06T05:22:24+00:00 phase=2 -->
### no-refactor-p2-t1 · discovery · no-refactor-because P2.T1 (phase 2)

Field plumbing (score, width, aids) and keepInside taking the width; nothing to clean.

<!-- fr:journal kind=discovery scope=plan id=no-refactor-p2-t2 created=2026-10-06T05:22:24+00:00 phase=2 -->
### no-refactor-p2-t2 · discovery · no-refactor-because P2.T2 (phase 2)

One loop added to finish(); nothing to clean.

<!-- fr:journal kind=discovery scope=plan id=no-refactor-p2-t3 created=2026-10-06T05:22:24+00:00 phase=2 -->
### no-refactor-p2-t3 · discovery · no-refactor-because P2.T3 (phase 2)

Small additive state and helper; nothing to clean.

<!-- fr:journal kind=discovery scope=plan id=no-refactor-p2-t5 created=2026-10-06T05:22:24+00:00 phase=2 -->
### no-refactor-p2-t5 · discovery · no-refactor-because P2.T5 (phase 2)

Two pure helpers and token additions; nothing to clean.

<!-- fr:journal kind=discovery scope=plan id=no-refactor-p2-t6 created=2026-10-06T05:22:24+00:00 phase=2 -->
### no-refactor-p2-t6 · discovery · no-refactor-because P2.T6 (phase 2)

Two pure helpers and a resize hook; nothing to clean.
