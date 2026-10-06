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
