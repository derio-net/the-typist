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

<!-- fr:journal kind=finding scope=plan id=p2-r1 created=2026-10-06T05:32:24+00:00 phase=2 state=open review_scope=in -->
### p2-r1 · finding [open] (reviewer: in scope) · starfield collapses to a right-edge strip at widths 720/800/880 (phase 2)

starfield collapses to a right-edge strip at widths 720/800/880

<!-- fr:journal kind=finding scope=plan id=p2-r2 created=2026-10-06T05:32:24+00:00 phase=2 state=open review_scope=in -->
### p2-r2 · finding [open] (reviewer: in scope) · muzzle dy -23 starts bullets ~33px below the gun tips (phase 2)

muzzle dy -23 starts bullets ~33px below the gun tips

<!-- fr:journal kind=finding scope=plan id=p2-r3 created=2026-10-06T05:32:24+00:00 phase=2 state=open review_scope=in -->
### p2-r3 · finding [open] (reviewer: in scope) · renderer logical width fixed at creation while World width can change per wave (phase 2)

renderer logical width fixed at creation while World width can change per wave

<!-- fr:journal kind=finding scope=plan id=p2-r4 created=2026-10-06T05:32:24+00:00 phase=2 state=open review_scope=in -->
### p2-r4 · finding [open] (reviewer: in scope) · resize listener never removed; DPR-only changes not observed (phase 2)

resize listener never removed; DPR-only changes not observed

<!-- fr:journal kind=finding scope=plan id=p2-r5 created=2026-10-06T05:32:24+00:00 phase=2 state=open review_scope=in -->
### p2-r5 · finding [open] (reviewer: in scope) · index.html hard-codes #0b1020 outside theme.ts (phase 2)

index.html hard-codes #0b1020 outside theme.ts

<!-- fr:journal kind=finding scope=plan id=p2-r6 created=2026-10-06T05:32:24+00:00 phase=2 state=open review_scope=in -->
### p2-r6 · finding [open] (reviewer: in scope) · typo-flash overlay redraws ship.text as one run, misaligned with the pending split (phase 2)

typo-flash overlay redraws ship.text as one run, misaligned with the pending split

<!-- fr:journal kind=finding scope=plan id=p2-r7 created=2026-10-06T05:32:24+00:00 phase=2 state=open review_scope=in -->
### p2-r7 · finding [open] (reviewer: in scope) · game-over no-escape test never had an escaped record; clamp test could not fail (phase 2)

game-over no-escape test never had an escaped record; clamp test could not fail

<!-- fr:journal kind=finding scope=plan id=p2-r8 created=2026-10-06T05:32:24+00:00 phase=2 state=open review_scope=in -->
### p2-r8 · finding [open] (reviewer: in scope) · palette.pending barely distinct from the text colour (phase 2)

palette.pending barely distinct from the text colour

<!-- fr:journal kind=review scope=plan id=p2-review created=2026-10-06T05:32:24+00:00 phase=2 -->
### p2-review · review · phase 2 code review: 8 minor findings, all fixed (phase 2)

Independent reviewer read 112eac1..175f2e3 (R11-R13, WorldOptions, game-over grading), ran npm test, and re-captured every play-feel state itself under shots/review-p2/ (including 360px at DPR3, a 1280-wide lock and a resize round trip), opening each shot. No Critical or Important issues; p2-r1..p2-r8 Minor, all in scope, all fixed in 21b7445 and fd3fb02 (suite 328 tests and the build green).

<!-- fr:journal kind=finding scope=plan id=p2-r1-resolved created=2026-10-06T05:32:24+00:00 phase=2 state=fixed resolves=p2-r1 -->
### p2-r1-resolved · finding [fixed] · resolves p2-r1: starfield collapses to a right-edge strip at widths 720/800/880 (phase 2)

fd3fb02: pure starField(width,height) wraps seeds at 960 and scales to width; tests/render/stars.test.ts checks ≥80% span at 720/800/880/960/1280; re-captured at 600px DPR2 and 360px DPR3.

<!-- fr:journal kind=finding scope=plan id=p2-r2-resolved created=2026-10-06T05:32:24+00:00 phase=2 state=fixed resolves=p2-r2 -->
### p2-r2-resolved · finding [fixed] · resolves p2-r2: muzzle dy -23 starts bullets ~33px below the gun tips (phase 2)

fd3fb02: muzzle.dy -55 fitted to the sprite top (-56), comment fixed; tests/render/muzzles.test.ts asserts within 3px.

<!-- fr:journal kind=finding scope=plan id=p2-r3-resolved created=2026-10-06T05:32:24+00:00 phase=2 state=fixed resolves=p2-r3 -->
### p2-r3-resolved · finding [fixed] · resolves p2-r3: renderer logical width fixed at creation while World width can change per wave (phase 2)

fd3fb02: draw() refits the canvas and rebuilds stars when world.width changes; tests/render/renderer.test.ts.

<!-- fr:journal kind=finding scope=plan id=p2-r4-resolved created=2026-10-06T05:32:24+00:00 phase=2 state=fixed resolves=p2-r4 -->
### p2-r4-resolved · finding [fixed] · resolves p2-r4: resize listener never removed; DPR-only changes not observed (phase 2)

fd3fb02: Renderer.dispose() removes the resize and matchMedia resolution listeners; the DPR listener re-arms on change; tests in tests/render/renderer.test.ts.

<!-- fr:journal kind=finding scope=plan id=p2-r5-resolved created=2026-10-06T05:32:24+00:00 phase=2 state=fixed resolves=p2-r5 -->
### p2-r5-resolved · finding [fixed] · resolves p2-r5: index.html hard-codes #0b1020 outside theme.ts (phase 2)

fd3fb02: hex removed from index.html; renderer sets body background from palette.background; a test asserts both.

<!-- fr:journal kind=finding scope=plan id=p2-r6-resolved created=2026-10-06T05:32:24+00:00 phase=2 state=fixed resolves=p2-r6 -->
### p2-r6-resolved · finding [fixed] · resolves p2-r6: typo-flash overlay redraws ship.text as one run, misaligned with the pending split (phase 2)

fd3fb02: the overlay draws the same typed/pending/rest runs at their positions; verified visually in the re-captured typo-flash shot (rendering only, no unit test).

<!-- fr:journal kind=finding scope=plan id=p2-r7-resolved created=2026-10-06T05:32:24+00:00 phase=2 state=fixed resolves=p2-r7 -->
### p2-r7-resolved · finding [fixed] · resolves p2-r7: game-over no-escape test never had an escaped record; clamp test could not fail (phase 2)

21b7445: the game-over test has Record A (escaped, open) and Record B (open, no escape) and asserts only A resolves before game-over; the clamp test uses width 100 with playerX forced outside. Orchestrator confirmed the clamp test fails with the clamp removed.

<!-- fr:journal kind=finding scope=plan id=p2-r8-resolved created=2026-10-06T05:32:24+00:00 phase=2 state=fixed resolves=p2-r8 -->
### p2-r8-resolved · finding [fixed] · resolves p2-r8: palette.pending barely distinct from the text colour (phase 2)

fd3fb02: palette.pending is amber #ffb347; verified in the re-captured pending-digraph shot.

<!-- fr:journal kind=decision scope=plan id=p3-controller-api created=2026-10-06T05:37:46+00:00 phase=3 -->
### p3-controller-api · decision · Controller takes the World's lives/score as a second argument and writes through a queue (phase 3)

onWorldEvents(events, {lives, score}) so the controller never holds the World; store writes
are chained on a promise queue (flush() awaits it) so grading stays synchronous for the UI,
and a failed write is swallowed without stopping later ones. nextWave() returns undefined
and emits the summary after the last wave's between-wave; the summary has a reason
(finished, game-over, quit).

<!-- fr:journal kind=decision scope=plan id=p3-store-shape created=2026-10-06T05:37:46+00:00 phase=3 -->
### p3-store-shape · decision · Store API: get/put/all/newCount/bumpNew plus a pure withGrade for the counters (phase 3)

openStores(factory) takes an IDBFactory or null (tests inject fake-indexeddb); the IDB
store has a probe() that writes, reads back and deletes a meta key. Accuracy in the summary
is expected / (expected + typos).

<!-- fr:journal kind=discovery scope=plan id=no-refactor-p3-t1 created=2026-10-06T05:37:46+00:00 phase=3 -->
### no-refactor-p3-t1 · discovery · no-refactor-because P3.T1 (phase 3)

One small pure function; nothing to clean.

<!-- fr:journal kind=discovery scope=plan id=no-refactor-p3-t2 created=2026-10-06T05:37:46+00:00 phase=3 -->
### no-refactor-p3-t2 · discovery · no-refactor-because P3.T2 (phase 3)

Thin wrapper over ts-fsrs; nothing to clean.

<!-- fr:journal kind=discovery scope=plan id=no-refactor-p3-t3 created=2026-10-06T05:37:46+00:00 phase=3 -->
### no-refactor-p3-t3 · discovery · no-refactor-because P3.T3 (phase 3)

Written once as a shared contract over both stores; nothing to clean.

<!-- fr:journal kind=discovery scope=plan id=no-refactor-p3-t4 created=2026-10-06T05:37:46+00:00 phase=3 -->
### no-refactor-p3-t4 · discovery · no-refactor-because P3.T4 (phase 3)

Pure builders sharing helpers from the start; nothing to clean.

<!-- fr:journal kind=finding scope=plan id=p3-r1 created=2026-10-06T05:43:56+00:00 phase=3 state=open review_scope=in -->
### p3-r1 · finding [open] (reviewer: in scope) · Controller had no guard against duplicate resolved events; a test codified double grading (phase 3)

Controller had no guard against duplicate resolved events; a test codified double grading

<!-- fr:journal kind=finding scope=plan id=p3-r2 created=2026-10-06T05:43:56+00:00 phase=3 state=open review_scope=in -->
### p3-r2 · finding [open] (reviewer: in scope) · openStores hangs forever if indexedDB.open never settles (phase 3)

openStores hangs forever if indexedDB.open never settles

<!-- fr:journal kind=finding scope=plan id=p3-r3 created=2026-10-06T05:43:56+00:00 phase=3 state=open review_scope=in -->
### p3-r3 · finding [open] (reviewer: in scope) · Store write failures swallowed silently (phase 3)

Store write failures swallowed silently

<!-- fr:journal kind=finding scope=plan id=p3-r4 created=2026-10-06T05:43:56+00:00 phase=3 state=open review_scope=in -->
### p3-r4 · finding [open] (reviewer: in scope) · Store keys collide when ids contain ':'; all() leaks other lists' cards (phase 3)

Store keys collide when ids contain ':'; all() leaks other lists' cards

<!-- fr:journal kind=finding scope=plan id=p3-r5 created=2026-10-06T05:43:56+00:00 phase=3 state=open review_scope=in -->
### p3-r5 · finding [open] (reviewer: in scope) · Summary emitted before queued grade writes land (phase 3)

Summary emitted before queued grade writes land

<!-- fr:journal kind=finding scope=plan id=p3-r6 created=2026-10-06T05:43:56+00:00 phase=3 state=open review_scope=in -->
### p3-r6 · finding [open] (reviewer: in scope) · now read at write time, not resolve time (phase 3)

now read at write time, not resolve time

<!-- fr:journal kind=finding scope=plan id=p3-r7 created=2026-10-06T05:43:56+00:00 phase=3 state=open review_scope=in -->
### p3-r7 · finding [open] (reviewer: in scope) · put and bumpNew in separate transactions (phase 3)

put and bumpNew in separate transactions

<!-- fr:journal kind=finding scope=plan id=p3-r8 created=2026-10-06T05:43:56+00:00 phase=3 state=open review_scope=in -->
### p3-r8 · finding [open] (reviewer: in scope) · Real-World controller test dropped advance() events (phase 3)

Real-World controller test dropped advance() events

<!-- fr:journal kind=finding scope=plan id=p3-r9 created=2026-10-06T05:43:56+00:00 phase=3 state=open review_scope=in -->
### p3-r9 · finding [open] (reviewer: in scope) · ControllerOptions.mode unused (phase 3)

ControllerOptions.mode unused

<!-- fr:journal kind=finding scope=plan id=p3-r10 created=2026-10-06T05:43:56+00:00 phase=3 state=open review_scope=in -->
### p3-r10 · finding [open] (reviewer: in scope) · start() unguarded: empty waves crash, re-start keeps stale counts (phase 3)

start() unguarded: empty waves crash, re-start keeps stale counts

<!-- fr:journal kind=finding scope=plan id=p3-r11 created=2026-10-06T05:43:56+00:00 phase=3 state=open review_scope=in -->
### p3-r11 · finding [open] (reviewer: in scope) · buildStudy copied arrays per push and recomputed overdue in the comparator (phase 3)

buildStudy copied arrays per push and recomputed overdue in the comparator

<!-- fr:journal kind=finding scope=plan id=p3-r12 created=2026-10-06T05:43:56+00:00 phase=3 state=open review_scope=in -->
### p3-r12 · finding [open] (reviewer: in scope) · openStores read globalThis.indexedDB outside its try (phase 3)

openStores read globalThis.indexedDB outside its try

<!-- fr:journal kind=finding scope=plan id=p3-r13 created=2026-10-06T05:43:56+00:00 phase=3 state=open review_scope=in -->
### p3-r13 · finding [open] (reviewer: in scope) · Summary accuracy and chars/s skewed by escaped ships and activeMs-0 records (phase 3)

Summary accuracy and chars/s skewed by escaped ships and activeMs-0 records

<!-- fr:journal kind=review scope=plan id=p3-review created=2026-10-06T05:43:56+00:00 phase=3 -->
### p3-review · review · phase 3 code review: 3 important and 10 minor findings, all fixed (phase 3)

Independent reviewer read fd3fb02..224b933 (R1-R4, R10 storage fallback) and ran npm test. Important: p3-r1 duplicate grading, p3-r2 open hang, p3-r3 silent write failures; Minor p3-r4..p3-r13. All in scope and fixed in 9f02190, 8402713 and ffa42cd, with red-first tests where testable; the suite (387 tests) and the build are green.

<!-- fr:journal kind=finding scope=plan id=p3-r1-resolved created=2026-10-06T05:43:56+00:00 phase=3 state=fixed resolves=p3-r1 -->
### p3-r1-resolved · finding [fixed] · resolves p3-r1: Controller had no guard against duplicate resolved events; a test codified double grading (phase 3)

8402713: per-session Set of graded ids; the test is rewritten (a repeat gives seen 1, reps 1) plus a pre-seeded-card-is-not-new test; seen red.

<!-- fr:journal kind=finding scope=plan id=p3-r2-resolved created=2026-10-06T05:43:56+00:00 phase=3 state=fixed resolves=p3-r2 -->
### p3-r2-resolved · finding [fixed] · resolves p3-r2: openStores hangs forever if indexedDB.open never settles (phase 3)

9f02190: open+probe raced against a 2000 ms timeout (injectable) with memory fallback; tests for a never-settling open and an async onerror.

<!-- fr:journal kind=finding scope=plan id=p3-r3-resolved created=2026-10-06T05:43:56+00:00 phase=3 state=fixed resolves=p3-r3 -->
### p3-r3-resolved · finding [fixed] · resolves p3-r3: Store write failures swallowed silently (phase 3)

8402713: the queue continues; the controller counts writeErrors, emits storage-error once, and the summary carries writeErrors; test with a rejecting store, seen red.

<!-- fr:journal kind=finding scope=plan id=p3-r4-resolved created=2026-10-06T05:43:56+00:00 phase=3 state=fixed resolves=p3-r4 -->
### p3-r4-resolved · finding [fixed] · resolves p3-r4: Store keys collide when ids contain ':'; all() leaks other lists' cards (phase 3)

9f02190: IDB array keys [l,r] and ['new',l,day], all() via IDBKeyRange.bound; memory store keys on JSON of the same arrays; contract test on both stores, seen red.

<!-- fr:journal kind=finding scope=plan id=p3-r5-resolved created=2026-10-06T05:43:56+00:00 phase=3 state=fixed resolves=p3-r5 -->
### p3-r5-resolved · finding [fixed] · resolves p3-r5: Summary emitted before queued grade writes land (phase 3)

8402713: the summary emit is chained onto the write queue; a test reads the store inside the summary listener, seen red.

<!-- fr:journal kind=finding scope=plan id=p3-r6-resolved created=2026-10-06T05:43:56+00:00 phase=3 state=fixed resolves=p3-r6 -->
### p3-r6-resolved · finding [fixed] · resolves p3-r6: now read at write time, not resolve time (phase 3)

8402713: now captured in onResolved and passed to the write; midnight test seen red.

<!-- fr:journal kind=finding scope=plan id=p3-r7-resolved created=2026-10-06T05:43:56+00:00 phase=3 state=fixed resolves=p3-r7 -->
### p3-r7-resolved · finding [fixed] · resolves p3-r7: put and bumpNew in separate transactions (phase 3)

9f02190/8402713: putGraded writes the card and the meta bump in one readwrite transaction (both stores); contract test seen red.

<!-- fr:journal kind=finding scope=plan id=p3-r8-resolved created=2026-10-06T05:43:56+00:00 phase=3 state=fixed resolves=p3-r8 -->
### p3-r8-resolved · finding [fixed] · resolves p3-r8: Real-World controller test dropped advance() events (phase 3)

8402713: every advance/typeChar step's events are fed to the controller (it was green before the change).

<!-- fr:journal kind=finding scope=plan id=p3-r9-resolved created=2026-10-06T05:43:56+00:00 phase=3 state=fixed resolves=p3-r9 -->
### p3-r9-resolved · finding [fixed] · resolves p3-r9: ControllerOptions.mode unused (phase 3)

8402713: mode labels the summary (summary.mode), asserted in the study test.

<!-- fr:journal kind=finding scope=plan id=p3-r10-resolved created=2026-10-06T05:43:56+00:00 phase=3 state=fixed resolves=p3-r10 -->
### p3-r10-resolved · finding [fixed] · resolves p3-r10: start() unguarded: empty waves crash, re-start keeps stale counts (phase 3)

8402713: start() throws on no waves, on a second call and after the session ended; seen red.

<!-- fr:journal kind=finding scope=plan id=p3-r11-resolved created=2026-10-06T05:43:56+00:00 phase=3 state=fixed resolves=p3-r11 -->
### p3-r11-resolved · finding [fixed] · resolves p3-r11: buildStudy copied arrays per push and recomputed overdue in the comparator (phase 3)

ffa42cd: in-place push and oldest due computed once per category; existing build tests green before and after.

<!-- fr:journal kind=finding scope=plan id=p3-r12-resolved created=2026-10-06T05:43:56+00:00 phase=3 state=fixed resolves=p3-r12 -->
### p3-r12-resolved · finding [fixed] · resolves p3-r12: openStores read globalThis.indexedDB outside its try (phase 3)

9f02190: read inside the try; a throwing-getter test falls back to memory, seen red.

<!-- fr:journal kind=finding scope=plan id=p3-r13-resolved created=2026-10-06T05:43:56+00:00 phase=3 state=fixed resolves=p3-r13 -->
### p3-r13-resolved · finding [fixed] · resolves p3-r13: Summary accuracy and chars/s skewed by escaped ships and activeMs-0 records (phase 3)

8402713: accuracy over non-escaped records; chars/s over non-escaped records with activeMs > 0; definitions in a doc comment; seen red.
