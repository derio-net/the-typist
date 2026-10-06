# Journal: 2026-10-06-ux-flight-and-pacing

<!-- fr:journal kind=discovery scope=spec id=operator-brief created=2026-10-06T16:20:57+00:00 input=true -->
### operator-brief · discovery · Operator brief (verbatim)

I want a few UX improvements. The explosion once the mothership is destroyed should push the children all the way up to the top of the screen (while still keeping to their own horizontal bands). The plural/secondary ship that is not a sentence should be the lowest down, not the highest up. The sentences should be higher up, the longer they are. The speed of the ships must be calculated on the fly, by the typing speed of the typist, calibrated over the first 50 letters or so. The goal is to give the typist a good chance to type everything. The TTS should come when a ship is first attacked, not once it is destroyed. Questions: The voice is pretty awful, isn't anything better available? Is it possible to have persistence when playing via the github published page? How?

<!-- fr:journal kind=decision scope=spec id=q1-speed-model created=2026-10-06T16:20:57+00:00 -->
### q1-speed-model · decision · Speed model is a bottom-up stack budget

Each released stack descends at a speed where typing it bottom-up at the measured rate, with slack, finishes before each band lands; motherships get the same rule. Set at spawn. (R4)

<!-- fr:journal kind=decision scope=spec id=q2-calibration-memory created=2026-10-06T16:20:57+00:00 -->
### q2-calibration-memory · decision · Calibrated rate is remembered across sessions

Stored in localStorage; a fresh browser starts from a 2.0 chars/s prior and calibrates over the first 50 letters. (R3, R5)

<!-- fr:journal kind=decision scope=spec id=q3-slack created=2026-10-06T16:20:57+00:00 -->
### q3-slack · decision · Slack 1.5x typing time

Fixed, no setting. (R4)

<!-- fr:journal kind=decision scope=spec id=q4-no-wave-ramp created=2026-10-06T16:20:57+00:00 -->
### q4-no-wave-ramp · decision · No difficulty ramp across waves

Speed tracks only the typing rate; the wave number no longer changes speed. (R4)

<!-- fr:journal kind=decision scope=spec id=q5-voice created=2026-10-06T16:20:57+00:00 -->
### q5-voice · decision · Voice ranking, picker with Test, and install hint

Rank German voices (quality markers, Google Deutsch, others, novelty last); Settings voice picker with Test and an install hint. Pre-recorded neural audio declined. (R7, R8)

<!-- fr:journal kind=decision scope=spec id=q6-persistence created=2026-10-06T16:20:57+00:00 -->
### q6-persistence · decision · persist() plus export/import progress

Progress already persists per browser on Pages (IndexedDB). Add navigator.storage.persist() and Export/Import of a JSON progress file. Cloud sync out of scope. (R9, R10)

<!-- fr:journal kind=decision scope=spec id=q7-test-plan created=2026-10-06T16:20:57+00:00 -->
### q7-test-plan · decision · Post-merge Test Plan is one live session on Pages

Operator plays one session on the live site per the spec's Test Plan.

<!-- fr:journal kind=finding scope=spec id=sr-1 created=2026-10-06T16:28:37+00:00 state=open review_scope=in -->
### sr-1 · finding [open] (reviewer: in scope) · Dropping placeStack rule 3 leaves the top band above the HUD for a high wreck; a kick of 0 cannot fix it

Evidence: world.ts:283-284, world.test.ts:536-539. Keep a rise-0 floor at spawn (top hull at or below minY), with rule 4 still winning.

<!-- fr:journal kind=finding scope=spec id=sr-2 created=2026-10-06T16:28:37+00:00 state=open review_scope=in -->
### sr-2 · finding [open] (reviewer: in scope) · The kick is solved on continuous time but the World steps discretely, so the apex misses 4 px on large rises

Evidence: world.ts:334-339. tick() decays vy, then integrates, so the rise is about 1.8% short (about 7 px on 400 px). Solve on the step model and assert with tick().

<!-- fr:journal kind=finding scope=spec id=sr-3 created=2026-10-06T16:28:37+00:00 state=open review_scope=in -->
### sr-3 · finding [open] (reviewer: in scope) · The spec does not say what happens to burstKick or list the existing tests it breaks

Evidence: world.ts:31,267-287; world.test.ts:66-77,278-281,512,533-545; app.test.ts:477-487,629-635.

<!-- fr:journal kind=finding scope=spec id=sr-4 created=2026-10-06T16:28:37+00:00 state=open review_scope=in -->
### sr-4 · finding [open] (reviewer: in scope) · R3's wording differs from the pace.ts formula, and R4 does not name its character count

Evidence: in the design the prior counts toward the 50, and a = c/(50+c) is an EMA, not a window. typing.ts:52-56: expectedChars = requiredLength.

<!-- fr:journal kind=finding scope=spec id=sr-5 created=2026-10-06T16:28:37+00:00 state=open review_scope=in -->
### sr-5 · finding [open] (reviewer: in scope) · Two things are unspecified, when the pace updates on a mothership's destruction and how the saved pace enters a session

Evidence: world.ts:399-400 and controller.ts:84-87,148-149. Observe before spawnChildren; load once per session; the controller seeds the pace and overrides it on every wave.

<!-- fr:journal kind=finding scope=spec id=sr-6 created=2026-10-06T16:28:37+00:00 state=open review_scope=in -->
### sr-6 · finding [open] (reviewer: in scope) · Speech on lock must look the ship up in prev, not the current World, and reactTo is at line 160

Evidence: app.ts:141-160; typing.ts:113-144. lock and destroyed can arrive in the same step.

<!-- fr:journal kind=finding scope=spec id=sr-7 created=2026-10-06T16:28:37+00:00 state=open review_scope=in -->
### sr-7 · finding [open] (reviewer: in scope) · The TTS rework needs a wider SynthLike, re-ranking on every voiceschanged and the app applying settings.voice

Evidence: tts.ts:3, 50-57 and 59-69. Chrome adds Google Deutsch late. Add the tests.

<!-- fr:journal kind=finding scope=spec id=sr-8 created=2026-10-06T16:28:37+00:00 state=open review_scope=in -->
### sr-8 · finding [open] (reviewer: in scope) · Importing during a paused session is unspecified, and the pace cannot be in the IndexedDB transaction

Evidence: app.ts:306-328, store.ts:113-169. Offer Export/Import only from the title screen's Settings; savePace after commit.

<!-- fr:journal kind=finding scope=spec id=sr-9 created=2026-10-06T16:28:37+00:00 state=open review_scope=in -->
### sr-9 · finding [open] (reviewer: in scope) · In the E2E, clearing IndexedDB is blocked by the app's open connection

Evidence: store.ts:114-115, smoke.spec.ts:55-66. Clear the stores in a readwrite transaction instead.

<!-- fr:journal kind=finding scope=spec id=sr-10 created=2026-10-06T16:28:37+00:00 state=open review_scope=in -->
### sr-10 · finding [open] (reviewer: in scope) · The supersession note omits plan 1's parts and the matrix rows to update

Evidence: plan-1 spec:26,232; plan-2 spec:175,278; matrix.yaml:137-138,312. Also add a post-merge row for the Test Plan.

<!-- fr:journal kind=review scope=spec id=spec-review-1 created=2026-10-06T16:28:37+00:00 -->
### spec-review-1 · review · Spec review of 2026-10-06-ux-flight-and-pacing: 10 findings

fr-spec-reviewer checked the spec against the brief, decisions q1–q7 and the codebase, with file:line evidence. It raised 10 findings, all in scope. The decisions are honoured, and the R4 bottom-up budget matches the typing engine's lowest-first lock (typing.ts:108-111).

<!-- fr:journal kind=finding scope=spec id=sr-1-resolved created=2026-10-06T16:28:37+00:00 state=fixed resolves=sr-1 -->
### sr-1-resolved · finding [fixed] · resolves sr-1: Dropping placeStack rule 3 leaves the top band above the HUD for a high wreck; a kick of 0 cannot fix it

Design adds rule 3, a rise-0 floor at spawn, with reaction distance still winning; tests cover a wreck just under the HUD.

<!-- fr:journal kind=finding scope=spec id=sr-2-resolved created=2026-10-06T16:28:37+00:00 state=fixed resolves=sr-2 -->
### sr-2-resolved · finding [fixed] · resolves sr-2: The kick is solved on continuous time but the World steps discretely, so the apex misses 4 px on large rises

The kick solve uses the discrete integrator's rise formula, and the tests assert the apex by running tick().

<!-- fr:journal kind=finding scope=spec id=sr-3-resolved created=2026-10-06T16:28:37+00:00 state=fixed resolves=sr-3 -->
### sr-3-resolved · finding [fixed] · resolves sr-3: The spec does not say what happens to burstKick or list the existing tests it breaks

burstKick is removed and kickDecayS kept as tau; Testing lists the world.test.ts and app.test.ts tests to rewrite or retire, with what replaces the vacuous one.

<!-- fr:journal kind=finding scope=spec id=sr-4-resolved created=2026-10-06T16:28:37+00:00 state=fixed resolves=sr-4 -->
### sr-4-resolved · finding [fixed] · resolves sr-4: R3's wording differs from the pace.ts formula, and R4 does not name its character count

R3 is reworded: the prior does not count toward 50, and the average is exponentially weighted with an effective window of 50. The pace.ts formula matches, and R4 names requiredLength.

<!-- fr:journal kind=finding scope=spec id=sr-5-resolved created=2026-10-06T16:28:37+00:00 state=fixed resolves=sr-5 -->
### sr-5-resolved · finding [fixed] · resolves sr-5: Two things are unspecified, when the pace updates on a mothership's destruction and how the saved pace enters a session

R4 and the design say the sample is observed before spawnChildren; loadPace runs once per session; the controller seeds the pace and overrides it on every wave.

<!-- fr:journal kind=finding scope=spec id=sr-6-resolved created=2026-10-06T16:28:37+00:00 state=fixed resolves=sr-6 -->
### sr-6-resolved · finding [fixed] · resolves sr-6: Speech on lock must look the ship up in prev, not the current World, and reactTo is at line 160

The design looks the ship up in prev, R6 covers a lock and destroy in one keystroke, the line references are fixed and a test is added.

<!-- fr:journal kind=finding scope=spec id=sr-7-resolved created=2026-10-06T16:28:37+00:00 state=fixed resolves=sr-7 -->
### sr-7-resolved · finding [fixed] · resolves sr-7: The TTS rework needs a wider SynthLike, re-ranking on every voiceschanged and the app applying settings.voice

SynthLike is widened; voiceschanged is always subscribed and re-ranks; onChange fires on list changes; the app applies settings.voice; tests are added.

<!-- fr:journal kind=finding scope=spec id=sr-8-resolved created=2026-10-06T16:28:37+00:00 state=fixed resolves=sr-8 -->
### sr-8-resolved · finding [fixed] · resolves sr-8: Importing during a paused session is unspecified, and the pace cannot be in the IndexedDB transaction

R10 offers Export/Import only from the title screen's Settings; cards and counts merge in one transaction, and the pace is saved after commit.

<!-- fr:journal kind=finding scope=spec id=sr-9-resolved created=2026-10-06T16:28:37+00:00 state=fixed resolves=sr-9 -->
### sr-9-resolved · finding [fixed] · resolves sr-9: In the E2E, clearing IndexedDB is blocked by the app's open connection

The E2E clears the cards and meta stores in a readwrite transaction and imports the downloaded file through the file input.

<!-- fr:journal kind=finding scope=spec id=sr-10-resolved created=2026-10-06T16:28:37+00:00 state=fixed resolves=sr-10 -->
### sr-10-resolved · finding [fixed] · resolves sr-10: The supersession note omits plan 1's parts and the matrix rows to update

The Goal lists the superseded plan-1 and plan-2 parts and the matrix rows to update; a post-merge row covers the Test Plan.

<!-- fr:journal kind=decision scope=spec id=phase-split-2026-10-06-ux-flight-and-pacing-p2 created=2026-10-06T16:30:50+00:00 -->
### phase-split-2026-10-06-ux-flight-and-pacing-p2 · decision · ask: speech on attack and a better voice (R6–R8) is its own ask, reviewable apart from the engine

Operator asked separately for TTS timing and about the voice.

<!-- fr:journal kind=decision scope=spec id=phase-split-2026-10-06-ux-flight-and-pacing-p3 created=2026-10-06T16:30:54+00:00 -->
### phase-split-2026-10-06-ux-flight-and-pacing-p3 · decision · ask: persistence on the published page (R9–R10) is its own ask

Operator asked separately about persistence on GitHub Pages.
