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
