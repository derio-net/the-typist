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

<!-- fr:journal kind=discovery scope=plan id=p2-tdd-red-first created=2026-10-06T17:08:31+00:00 phase=2 -->
### p2-tdd-red-first · discovery · Phase 2 was red-first with mutation checks (phase 2)

Each task's tests were run and seen failing before the implementation. Mutants checked and killed: speak looked up in the new World instead of prev (needed a one-keystroke ship test, added), novelty/Google rank collapsed, de-DE order flipped, dropped list-change notify, preview gated on enabled, setVoice/startup wiring removed, Test not disabled with no voice. One equivalent mutant survives: a saved uri that is gone shows Automatic whether or not the panel checks, because a select assigned an unknown value reads empty.

<!-- fr:journal kind=discovery scope=plan id=p2-stub-utterance created=2026-10-06T17:08:31+00:00 phase=2 -->
### p2-stub-utterance · discovery · A browser stub needs its own SpeechSynthesisUtterance (phase 2)

The real utterance's voice setter throws for a plain-object voice, which createTts swallows, so a stub that only fakes getVoices silently speaks nothing. scripts/tmp/capture-voices.mjs stubs the utterance class too.

<!-- fr:journal kind=discovery scope=plan id=p2-lock-covers-one-key created=2026-10-06T17:08:31+00:00 phase=2 -->
### p2-lock-covers-one-key · discovery · A one-keystroke ship emits lock and destroyed in the same step (phase 2)

typing emits lock before destroyed, so speaking on lock covers it, but only if the ship is looked up in prev; the app test uses an A. example (one keystroke, final stop pre-typed) to pin it.

<!-- fr:journal kind=discovery scope=plan id=p2-removed-order-test created=2026-10-06T17:08:31+00:00 phase=2 -->
### p2-removed-order-test · discovery · The grading-before-speech test was removed (phase 2)

It only asserted that say ran before anything else, which is vacuous once speech happens at lock; the throwing-say-on-lock test covers that speech failure cannot cost a grade.

<!-- fr:journal kind=discovery scope=plan id=p2-no-voice-layout created=2026-10-06T17:08:31+00:00 phase=2 -->
### p2-no-voice-layout · discovery · The no-voice reason squeezed the Test button onto two lines (phase 2)

Seen in the screenshot; the reason now sits in its own line under the picker (a one-line change in settingsPanel).

<!-- fr:journal kind=discovery scope=plan id=no-refactor-p2-t1 created=2026-10-06T17:08:31+00:00 phase=2 -->
### no-refactor-p2-t1 · discovery · no-refactor-because P2.T1 (phase 2)

reactTo gained one branch and lost one; nothing to clean.

<!-- fr:journal kind=discovery scope=plan id=no-refactor-p2-t2 created=2026-10-06T17:08:31+00:00 phase=2 -->
### no-refactor-p2-t2 · discovery · no-refactor-because P2.T2 (phase 2)

voices.ts is a 25-line pure module written once; nothing to clean.

<!-- fr:journal kind=discovery scope=plan id=no-refactor-p2-t3 created=2026-10-06T17:08:31+00:00 phase=2 -->
### no-refactor-p2-t3 · discovery · no-refactor-because P2.T3 (phase 2)

createTts was restructured while adding the ranked list (speak shared by say and preview); no leftover duplication.

<!-- fr:journal kind=discovery scope=plan id=no-refactor-p2-t4 created=2026-10-06T17:08:31+00:00 phase=2 -->
### no-refactor-p2-t4 · discovery · no-refactor-because P2.T4 (phase 2)

a settings field and two one-line app calls; nothing to clean.

<!-- fr:journal kind=discovery scope=plan id=no-refactor-p2-t5 created=2026-10-06T17:08:31+00:00 phase=2 -->
### no-refactor-p2-t5 · discovery · no-refactor-because P2.T5 (phase 2)

the panel additions are one block; the no-voice reason was moved under the picker after the screenshot, which was the cleanup.

<!-- fr:journal kind=discovery scope=plan id=no-refactor-p2-t6 created=2026-10-06T17:08:31+00:00 phase=2 -->
### no-refactor-p2-t6 · discovery · no-refactor-because P2.T6 (phase 2)

matrix, docs and capture only; no code to clean.

<!-- fr:journal kind=finding scope=plan id=p2-r1 created=2026-10-06T17:19:13+00:00 phase=2 state=open review_scope=in -->
### p2-r1 · finding [open] (reviewer: in scope) · Voice select has no width constraint; long (real Edge) names push Test off the panel; select unstyled (phase 2)

src/ui/panels/settings.ts:50,67. At 1000/1280px Test wraps and spills; at 390px Test sits at x=483, off-screen.

<!-- fr:journal kind=finding scope=plan id=p2-r2 created=2026-10-06T17:19:13+00:00 phase=2 state=open review_scope=in -->
### p2-r2 · finding [open] (reviewer: in scope) · The 'saved voice gone shows Automatic' test also passes a blank select (phase 2)

tests/ui/panels.test.ts:223 asserts value===''; the mutant pick.value = s.voice ?? '' survives.

<!-- fr:journal kind=finding scope=plan id=p2-r3 created=2026-10-06T17:19:13+00:00 phase=2 state=open review_scope=in -->
### p2-r3 · finding [open] (reviewer: in scope) · Quality ranking reads only name (phase 2)

src/platform/voices.ts:8,12-17. Apple premium/enhanced voiceURIs carry the marker even when the name is localized.

<!-- fr:journal kind=review scope=plan id=p2-review-1 created=2026-10-06T17:19:13+00:00 phase=2 -->
### p2-review-1 · review · Phase 2 review (311a9f8^..c0a016b): 3 findings, all in scope, all fixed (phase 2)

The reviewer was an independent general-purpose agent on opus. It checked R6–R8, ran the suite (550/550) and the build, and ran 17 mutants on a copy; 16 were killed. It checked the real-browser concerns: Chrome's late voiceschanged, voiceURI stability across a reload, Safari's fallback timeout, the open-panel refresh, Test while unavailable, and the speech cut-off, which R6 allows. It drove the UI itself and took 13 fresh shots, covering all four voice-choice names plus the limits.
Findings: p2-r1 (Important), p2-r2 and p2-r3 (Minor), all in scope. The fixes are 496dedf (r1: voiceLabel, styled and width-constrained select, wrapping row; re-captured at 1280 and 390 px with no horizontal scroll), 8559446 (r2; the mutant now killed) and 04dcb07 (r3). After the fixes the suite passes 553/553 (scratchpad/p2-fix-suite.log), and the build passes.
Declined to judge: speech over the between-wave panel (predates phase 2); the reason shown twice (an R8 design choice); duplicate voiceURIs (speculative); focus reset on re-render (the spec asks for the refresh); the chunk-size warning.

<!-- fr:journal kind=finding scope=plan id=p2-r1-resolved created=2026-10-06T17:19:13+00:00 phase=2 state=fixed resolves=p2-r1 -->
### p2-r1-resolved · finding [fixed] · resolves p2-r1: Voice select has no width constraint; long (real Edge) names push Test off the panel; select unstyled (phase 2)

496dedf: voiceLabel drops a redundant (lang) suffix; the .panel select is styled with min-width 0 / max-width 100% / flex 1; the voice row wraps and Test is nowrap. The tests failed first. Shots at 1280 and 390 px show no overflow.

<!-- fr:journal kind=finding scope=plan id=p2-r2-resolved created=2026-10-06T17:19:13+00:00 phase=2 state=fixed resolves=p2-r2 -->
### p2-r2-resolved · finding [fixed] · resolves p2-r2: The 'saved voice gone shows Automatic' test also passes a blank select (phase 2)

8559446: asserts selectedIndex 0 and the option text 'Automatic (best available)'; the mutant now fails.

<!-- fr:journal kind=finding scope=plan id=p2-r3-resolved created=2026-10-06T17:19:13+00:00 phase=2 state=fixed resolves=p2-r3 -->
### p2-r3-resolved · finding [fixed] · resolves p2-r3: Quality ranking reads only name (phase 2)

04dcb07: the quality marker is also matched against voiceURI; the test failed first.

<!-- fr:journal kind=discovery scope=plan id=p3-idb-await-rule created=2026-10-06T17:30:55+00:00 phase=3 -->
### p3-idb-await-rule · discovery · IDB import awaits only IndexedDB requests (phase 3)

importAll reads each local card with done(get) inside the readwrite transaction and puts after it; the file is parsed and validated in app.ts before the transaction opens, and savePace runs only after importAll resolves. A mutant that skips tx.abort() on a mid-import failure is killed by the one-transaction test (an uncloneable card is the injected failure, in both stores).

<!-- fr:journal kind=discovery scope=plan id=p3-persist-nonblocking created=2026-10-06T17:30:55+00:00 phase=3 -->
### p3-persist-nonblocking · discovery · persist() is not awaited at startup (phase 3)

Firefox may show a prompt for persist(), so startApp does not wait for it: it is tracked via track() and the Settings panel re-renders when the answer arrives. Status is protected when persist() or persisted() is true, else may-be-cleared; memory stores never call it.

<!-- fr:journal kind=discovery scope=plan id=p3-surviving-mutant created=2026-10-06T17:30:55+00:00 phase=3 -->
### p3-surviving-mutant · discovery · A meta-key range mutant survived until a stray-key test (phase 3)

Removing the ['new'] key range from the IDB meta cursor survived because the probe key is deleted after use. Added a test that writes stray string meta keys through the raw factory; the mutant is now killed. The picker.value reset after a file choice has no unit test (jsdom cannot assert it).

<!-- fr:journal kind=discovery scope=plan id=no-refactor-p3-t1 created=2026-10-06T17:30:55+00:00 phase=3 -->
### no-refactor-p3-t1 · discovery · no-refactor-because P3.T1 (phase 3)

portable.ts was written once to a final shape; nothing to clean.

<!-- fr:journal kind=discovery scope=plan id=no-refactor-p3-t2 created=2026-10-06T17:30:55+00:00 phase=3 -->
### no-refactor-p3-t2 · discovery · no-refactor-because P3.T2 (phase 3)

the IDB and memory implementations share only the merge helpers from portable.ts, already factored.

<!-- fr:journal kind=discovery scope=plan id=no-refactor-p3-t3 created=2026-10-06T17:30:55+00:00 phase=3 -->
### no-refactor-p3-t3 · discovery · no-refactor-because P3.T3 (phase 3)

one status variable and one request function; nothing duplicated.

<!-- fr:journal kind=discovery scope=plan id=no-refactor-p3-t4 created=2026-10-06T17:30:55+00:00 phase=3 -->
### no-refactor-p3-t4 · discovery · no-refactor-because P3.T4 (phase 3)

the panel report helper serves both Export and Import; the app functions are single-purpose.

<!-- fr:journal kind=discovery scope=plan id=no-refactor-p3-t6 created=2026-10-06T17:30:55+00:00 phase=3 -->
### no-refactor-p3-t6 · discovery · no-refactor-because P3.T6 (phase 3)

capture script, matrix and docs only; no code to clean.

<!-- fr:journal kind=finding scope=plan id=p3-r1 created=2026-10-06T17:46:48+00:00 phase=3 state=open review_scope=in -->
### p3-r1 · finding [open] (reviewer: in scope) · Card schema accepts nonsense FSRS values and a future last_review; a corrupt card permanently wins merges (phase 3)

portable.ts:26-38. stability -5 with last_review 115 days ahead imported and replaced good progress; the loose-schema mutant survived.

<!-- fr:journal kind=finding scope=plan id=p3-r2 created=2026-10-06T17:46:48+00:00 phase=3 state=open review_scope=in -->
### p3-r2 · finding [open] (reviewer: in scope) · A Settings re-render detaches the transfer status, so an in-flight result is lost (phase 3)

app.ts:137,157 (requestPersistence and tts onChange re-render).

<!-- fr:journal kind=finding scope=plan id=p3-r3 created=2026-10-06T17:46:48+00:00 phase=3 state=open review_scope=in -->
### p3-r3 · finding [open] (reviewer: in scope) · importAll does one awaited get per card; 100k cards take 34 s with no busy state (phase 3)

store.ts:229.

<!-- fr:journal kind=finding scope=plan id=p3-r4 created=2026-10-06T17:46:48+00:00 phase=3 state=open review_scope=in -->
### p3-r4 · finding [open] (reviewer: in scope) · Duplicate entries in a file make the IDB and memory stores diverge (phase 3)

store.ts:100 vs :229.

<!-- fr:journal kind=finding scope=plan id=p3-r5 created=2026-10-06T17:46:48+00:00 phase=3 state=open review_scope=in -->
### p3-r5 · finding [open] (reviewer: in scope) · persisted() is skipped when persist() throws (phase 3)

app.ts:131.

<!-- fr:journal kind=finding scope=plan id=p3-r6 created=2026-10-06T17:46:48+00:00 phase=3 state=open review_scope=in -->
### p3-r6 · finding [open] (reviewer: in scope) · No test that the file input resets for re-choosing the same file (phase 3)

settings.ts:99; the picker.value mutant survived.

<!-- fr:journal kind=finding scope=plan id=p3-r7 created=2026-10-06T17:46:48+00:00 phase=3 state=open review_scope=in -->
### p3-r7 · finding [open] (reviewer: in scope) · E2E round trip checks only keys, not values (phase 3)

tests/e2e/smoke.spec.ts R10 block.

<!-- fr:journal kind=review scope=plan id=p3-review-1 created=2026-10-06T17:46:48+00:00 phase=3 -->
### p3-review-1 · review · Phase 3 review (6ad1c14^..d71e975): 7 findings, all in scope, all fixed (phase 3)

The reviewer was an independent general-purpose agent on opus. It checked R9–R10, with data safety first: validation runs before any write; the IDB import is one transaction awaiting only IDB requests; the pace is saved after the commit; ties keep the local card; dates round-trip in real Chromium; there is no injection or prototype pollution; and Export/Import are title-only. The suite passed 602/602 and the build and e2e passed. It ran 25 mutants on a copy; 23 were killed (survivors M8 and M23). It took 14 fresh shots covering all 7 declared names plus the limits: non-JSON, empty, future-version, injection, __proto__ and a 100k-card file at 390 px.
Findings p3-r1 (Important) and p3-r2 to p3-r7 (Minor) are all in scope. The fixes are 23568dc (r1, r4), a4bc6b6 and b7da34c (r2, r3, r5, r6) and ab932fa (r7), each with a red-then-green test. After the fixes the suite passes 625/625 (scratchpad/p3-fix-suite.log), and the build and e2e pass. One residual: the runTransfer busy guard is untested, but it is redundant with the disabled buttons, which are tested.
Declined to judge: Export/Import in memory mode; error wording; empty-file wording; cross-device clock skew; the Firefox persist prompt; the memory line duplicating the banner.

<!-- fr:journal kind=finding scope=plan id=p3-r1-resolved created=2026-10-06T17:46:48+00:00 phase=3 state=fixed resolves=p3-r1 -->
### p3-r1-resolved · finding [fixed] · resolves p3-r1: Card schema accepts nonsense FSRS values and a future last_review; a corrupt card permanently wins merges (phase 3)

23568dc: bounded FSRS fields, int counters, state 0..3; last_review must be at most exportedAt + 1 day, and exportedAt at most now + 1 day; a strict-schema extra-key test kills the mutant.

<!-- fr:journal kind=finding scope=plan id=p3-r2-resolved created=2026-10-06T17:46:48+00:00 phase=3 state=fixed resolves=p3-r2 -->
### p3-r2-resolved · finding [fixed] · resolves p3-r2: A Settings re-render detaches the transfer status, so an in-flight result is lost (phase 3)

b7da34c: the app owns the transfer state, so a re-render keeps Importing… and the result.

<!-- fr:journal kind=finding scope=plan id=p3-r3-resolved created=2026-10-06T17:46:48+00:00 phase=3 state=fixed resolves=p3-r3 -->
### p3-r3-resolved · finding [fixed] · resolves p3-r3: importAll does one awaited get per card; 100k cards take 34 s with no busy state (phase 3)

a4bc6b6: getAll/getAllKeys in the same transaction, with a test asserting no per-card get. b7da34c: the busy state, disabled buttons and a 50 MB cap.

<!-- fr:journal kind=finding scope=plan id=p3-r4-resolved created=2026-10-06T17:46:48+00:00 phase=3 state=fixed resolves=p3-r4 -->
### p3-r4-resolved · finding [fixed] · resolves p3-r4: Duplicate entries in a file make the IDB and memory stores diverge (phase 3)

23568dc: parseProgress deduplicates (latest last_review, max count); both stores give the same result.

<!-- fr:journal kind=finding scope=plan id=p3-r5-resolved created=2026-10-06T17:46:48+00:00 phase=3 state=fixed resolves=p3-r5 -->
### p3-r5-resolved · finding [fixed] · resolves p3-r5: persisted() is skipped when persist() throws (phase 3)

b7da34c: persisted() runs in its own try block.

<!-- fr:journal kind=finding scope=plan id=p3-r6-resolved created=2026-10-06T17:46:48+00:00 phase=3 state=fixed resolves=p3-r6 -->
### p3-r6-resolved · finding [fixed] · resolves p3-r6: No test that the file input resets for re-choosing the same file (phase 3)

b7da34c: a same-file-twice panel test kills the picker.value mutant.

<!-- fr:journal kind=finding scope=plan id=p3-r7-resolved created=2026-10-06T17:46:48+00:00 phase=3 state=fixed resolves=p3-r7 -->
### p3-r7-resolved · finding [fixed] · resolves p3-r7: E2E round trip checks only keys, not values (phase 3)

ab932fa: the e2e asserts Date instances and counter values in IndexedDB after the import.

<!-- fr:journal kind=discovery scope=plan id=operator-feedback-pr10 created=2026-10-06T18:58:25+00:00 phase=3 -->
### operator-feedback-pr10 · discovery · Operator play-test of PR #10: motherships too fast, no music, compact Anna mangles German (phase 3)

Operator chose: 3 s reading time per ship; the CC0 'Space Shooter (Loop)' track by Alex McCulloch; Eddy tolerable, so the adult Eloquence voices rank above Anna. Commits 5649813, fbec3b7, 241c893, 56e7ad6, plus a tts fixture fix.

<!-- fr:journal kind=review scope=plan id=p3-review-2 created=2026-10-06T18:59:15+00:00 phase=3 -->
### p3-review-2 · review · Follow-up review of the operator-feedback commits (5649813^..56e7ad6): 4 minor findings (phase 3)

An independent general-purpose reviewer on opus. All three changes are correct and pinned: the mutations readS back to 0.6, the Eloquence/other rank swap and the missing mp3 each fail tests. It checked the pace tables, the music file (82 s, 128 kbps, no edge silence, served and looped by audio.ts), the silent e2e, and the ranking on Windows, Android and iOS. Findings: p3-r9 (in); p3-r8, p3-r10 and p3-r11 (out).

<!-- fr:journal kind=finding scope=plan id=p3-r8 created=2026-10-06T19:00:42+00:00 phase=3 state=open review_scope=out -->
### p3-r8 · finding [open] (reviewer: out of scope) · readS sits inside the 1.5x slack; a fast typist's stack may lose tension (phase 3)

Tuning call; the post-merge Test Plan item 2 settles it.

<!-- fr:journal kind=finding scope=plan id=p3-r9 created=2026-10-06T19:00:55+00:00 phase=3 state=open review_scope=in -->
### p3-r9 · finding [open] (reviewer: in scope) · Matrix wording stale: game-audio 'when a track is supplied'; live-session-check 'non-novelty' (phase 3)

<!-- fr:journal kind=finding scope=plan id=p3-r10 created=2026-10-06T19:01:07+00:00 phase=3 state=open review_scope=out -->
### p3-r10 · finding [open] (reviewer: out of scope) · Music credit lives only in CREDITS.md, not in the game UI (phase 3)

Courtesy only (CC0); the operator decides.
