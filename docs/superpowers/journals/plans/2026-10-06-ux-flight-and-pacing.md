# Journal: 2026-10-06-ux-flight-and-pacing

<!-- fr:journal kind=decision scope=plan id=p1-speed-fixed-point created=2026-10-06T16:41:10+00:00 phase=1 -->
### p1-speed-fixed-point · decision · Stack speed and reaction distance are solved by fixed-point iteration (phase 1)

R4 measures band distances at the apex, the apex depends on the kick, the kick on the speed, and rule 4 (reaction distance) on the speed again. The apex top is pinned at minY by construction, so the apex rise is max(0, y0 - above - minY) and needs no speed; only rule 4 is circular (speed depends on y, y bound depends on speed). placeStack iterates up to 40 times; the contraction ratio is minReactionS/(slack x budget) < 1 so it converges.

<!-- fr:journal kind=discovery scope=plan id=p1-controller-test-order created=2026-10-06T16:41:10+00:00 phase=1 -->
### p1-controller-test-order · discovery · The old controller drive-through test typed ships[0] first (phase 1)

With longest-first stacks ships[0] is the top band, which the pace budget assumes is typed last. The test now types the lowest ship first (the natural order); the fast simulated typist otherwise lets the top bands escape.

<!-- fr:journal kind=discovery scope=plan id=p1-neg-zero-kick created=2026-10-06T16:41:10+00:00 phase=1 -->
### p1-neg-zero-kick · discovery · A zero kick spawns vy = -0 (phase 1)

spawn uses vy: -kick, so kick 0 gives -0; tests compare with Math.abs. Harmless to the simulation.

<!-- fr:journal kind=discovery scope=plan id=no-refactor-p1-t1 created=2026-10-06T16:41:10+00:00 phase=1 -->
### no-refactor-p1-t1 · discovery · no-refactor-because P1.T1 (phase 1)

Baseline run plus a 12-line module; nothing to clean.

<!-- fr:journal kind=discovery scope=plan id=no-refactor-p1-t3 created=2026-10-06T16:41:10+00:00 phase=1 -->
### no-refactor-p1-t3 · discovery · no-refactor-because P1.T3 (phase 1)

spawnChildren already read cleanly after the sort; no duplication to remove.

<!-- fr:journal kind=discovery scope=plan id=no-refactor-p1-t4 created=2026-10-06T16:41:10+00:00 phase=1 -->
### no-refactor-p1-t4 · discovery · no-refactor-because P1.T4 (phase 1)

placeStack was rewritten in one pass with kickApex/solveKick as small helpers; no leftover to clean.

<!-- fr:journal kind=discovery scope=plan id=no-refactor-p1-t6 created=2026-10-06T16:41:10+00:00 phase=1 -->
### no-refactor-p1-t6 · discovery · no-refactor-because P1.T6 (phase 1)

pace-store mirrors the settings store and the controller/app edits are one-line carries; nothing to clean.

<!-- fr:journal kind=discovery scope=plan id=no-refactor-p1-t7 created=2026-10-06T16:41:10+00:00 phase=1 -->
### no-refactor-p1-t7 · discovery · no-refactor-because P1.T7 (phase 1)

Matrix and report edits only; no code touched.

<!-- fr:journal kind=finding scope=plan id=p1-r1 created=2026-10-06T16:59:43+00:00 phase=1 state=open review_scope=in -->
### p1-r1 · finding [open] (reviewer: in scope) · The observe-before-spawn test passes even with the order swapped (every speed is clamped to 8) (phase 1)

tests/engine/world.test.ts, pace-driven speeds (R4). The reviewer's mutation (observe after spawnChildren) kept all tests green. Use a fast pace so the speed is unclamped, and assert it differs from the speed at the pre-observe pace.

<!-- fr:journal kind=finding scope=plan id=p1-r2 created=2026-10-06T16:59:43+00:00 phase=1 state=open review_scope=in -->
### p1-r2 · finding [open] (reviewer: in scope) · Nothing tests that budgets use requiredLength (phase 1)

world.ts:241,263. Swapping to text.length kept the engine tests green. Add punctuated-mothership and unclamped-stack cases.

<!-- fr:journal kind=finding scope=plan id=p1-r3 created=2026-10-06T16:59:43+00:00 phase=1 state=open review_scope=in -->
### p1-r3 · finding [open] (reviewer: in scope) · At very fast paces, rule 4 feedback lifts a light stack behind the HUD (phase 1)

world.ts:340-347. At 0.05-0.08 s/char a stack spawned with its top hull at y 3-31 at up to 140 px/s.

<!-- fr:journal kind=finding scope=plan id=p1-r4 created=2026-10-06T16:59:43+00:00 phase=1 state=open review_scope=in -->
### p1-r4 · finding [open] (reviewer: in scope) · The adaptive-pace row is missing the tests/ui/app.test.ts level (phase 1)

The only save/load-across-sessions test lives there.

<!-- fr:journal kind=finding scope=plan id=p1-r5 created=2026-10-06T16:59:43+00:00 phase=1 state=open review_scope=in -->
### p1-r5 · finding [open] (reviewer: in scope) · The high-wreck R2 case is the rise-0 floor, so the world-level test never exercises the solve (phase 1)

it.each([120,300,520]): label 120 as the floor case, and assert kick > 0 for 300 and 520.

<!-- fr:journal kind=discovery scope=plan id=p1-tdd-order created=2026-10-06T16:59:43+00:00 phase=1 -->
### p1-tdd-order · discovery · The phase 1 executor wrote the T2–T6 code before its tests (phase 1)

Disclosed by the executor. The reviewer's mutation tests found two surviving mutants (p1-r1, p1-r2), and both are now fixed with tests verified to fail under the mutation.

<!-- fr:journal kind=review scope=plan id=p1-review-1 created=2026-10-06T16:59:43+00:00 phase=1 -->
### p1-review-1 · review · Phase 1 review (8170c9f..78b7b4b): 5 findings, all in scope, all fixed (phase 1)

The reviewer was an independent general-purpose agent on opus. It checked R1–R5 against the spec, ran the suite (523/523) and the build, and ran 7 mutation tests on a copy; 2 mutants survived (p1-r1, p1-r2). It confirmed the discrete-step kick solve by simulating tick() for wrecks at 120, 300, 520, the entry y and a tall stack, and drove the UI itself with 13 fresh shots covering every stack-flight state and interaction plus the limits.
It raised p1-r1 (Important) and p1-r2 to p1-r5 (Minor), all in scope. The fixes are b0d8221 (r1, r2, r5; the r1 and r2 tests verified to fail under the mutation), d863b5c (r3: rule 4 caps the speed before lifting the stack; the spec is updated in 377b4c3) and b62a92c (r4, with reports regenerated in 377b4c3). After the fixes the suite has 529/529 passing (scratchpad/p1-fix-suite.log), and the build passes.
Declined to judge: the 8 px/s floor is spec tuning; tall 6+ band stacks are plan 2's R13 fallback; quitting mid-record is not saved by spec; well-typed corrupt pace values are accepted; R6–R10 belong to later phases.

<!-- fr:journal kind=finding scope=plan id=p1-r1-resolved created=2026-10-06T16:59:43+00:00 phase=1 state=fixed resolves=p1-r1 -->
### p1-r1-resolved · finding [fixed] · resolves p1-r1: The observe-before-spawn test passes even with the order swapped (every speed is clamped to 8) (phase 1)

b0d8221: a fast pace with an unclamped speed asserts the post-observe speed; it fails with observe moved after spawnChildren.

<!-- fr:journal kind=finding scope=plan id=p1-r2-resolved created=2026-10-06T16:59:43+00:00 phase=1 state=fixed resolves=p1-r2 -->
### p1-r2-resolved · finding [fixed] · resolves p1-r2: Nothing tests that budgets use requiredLength (phase 1)

b0d8221: a punctuated mothership and an unclamped stack assert requiredLength budgets; they fail under text.length.

<!-- fr:journal kind=finding scope=plan id=p1-r3-resolved created=2026-10-06T16:59:43+00:00 phase=1 state=fixed resolves=p1-r3 -->
### p1-r3-resolved · finding [fixed] · resolves p1-r3: At very fast paces, rule 4 feedback lifts a light stack behind the HUD (phase 1)

d863b5c: rule 4 caps the shared speed to the room before lifting, and lifts only when the stack is too tall at minSpeed. The test at spc 0.05 from wrecks at 450 and at the entry y fails before the fix. The spec is updated (377b4c3).

<!-- fr:journal kind=finding scope=plan id=p1-r4-resolved created=2026-10-06T16:59:43+00:00 phase=1 state=fixed resolves=p1-r4 -->
### p1-r4-resolved · finding [fixed] · resolves p1-r4: The adaptive-pace row is missing the tests/ui/app.test.ts level (phase 1)

b62a92c adds the app.test.ts level; reports regenerated and fr acceptance check passes (377b4c3).

<!-- fr:journal kind=finding scope=plan id=p1-r5-resolved created=2026-10-06T16:59:43+00:00 phase=1 state=fixed resolves=p1-r5 -->
### p1-r5-resolved · finding [fixed] · resolves p1-r5: The high-wreck R2 case is the rise-0 floor, so the world-level test never exercises the solve (phase 1)

b0d8221: 120 is labelled as the floor case, and kick > 0 is asserted for 300 and 520.
