# Journal: 2026-10-06-vocab-typer-plan2

<!-- fr:journal kind=discovery scope=spec id=operator-brief created=2026-10-05T22:03:31+00:00 input=true -->
### operator-brief · discovery · Operator brief for plan 2

/super-fr:fr-brainstorming Plan 2 from the implemented spec (docs/superpowers/implemented/specs/2026-10-05-vocab-typer-design.md)

Follow-up during the turn: "also do a sweep on the open issues and incorporate whatever you need (e.g. #2)"

Open issues at brainstorm start: #2 UX polish for plan 2; #3 typing input edge cases; #4 engine/spec tidy-ups; #5 seed list follow-ups; #6 schema list-level errors hidden by record shape errors.

<!-- fr:journal kind=decision scope=spec id=ux-pass-is-issue-2 created=2026-10-05T22:03:31+00:00 -->
### ux-pass-is-issue-2 · decision · The manual UX pass is done; issue #2 is its output; no manual phase in plan 2

Operator chose "Done; #2 is the output". SFX are synthesized via Web Audio; music plays only when public/assets/audio/music-game.mp3 exists (none yet), so audio needs no manual asset phase.

<!-- fr:journal kind=decision scope=spec id=issues-in-scope created=2026-10-05T22:03:31+00:00 -->
### issues-in-scope · decision · Plan 2 fixes and closes issues #2, #3, #4, #5 and #6

Operator selected all four optional issues (#3 typing edge cases, #4 engine/theme split, #5 seed follow-ups, #6 single-pass validation) in addition to #2.

<!-- fr:journal kind=discovery scope=spec id=pages-needs-public-repo created=2026-10-05T22:03:31+00:00 -->
### pages-needs-public-repo · discovery · GitHub Pages is unavailable for this repo as it stands

derio-net/the-typist is PRIVATE and the derio-net org is on the free plan, so Pages cannot serve it; the org's existing Pages sites (frank, super-fr) are public repos.

<!-- fr:journal kind=decision scope=spec id=hosting-public-repo created=2026-10-05T22:03:31+00:00 -->
### hosting-public-repo · decision · Make the repo public and keep GitHub Pages (R18)

Operator chose to make the repo public over a separate build repo, another host, or deferring. The plan adds an identifier sweep of tracked files before publication; flipping visibility and enabling Pages is an operator-run script, never run by an agent. Git history is not rewritten.

<!-- fr:journal kind=decision scope=spec id=ui-dom-overlay created=2026-10-05T22:03:31+00:00 -->
### ui-dom-overlay · decision · Screens are DOM panels over the game canvas

Operator chose the DOM overlay (themed via CSS variables from theme.ts) over canvas-drawn typed menus or a hybrid.

<!-- fr:journal kind=decision scope=spec id=tts-immediate-interrupt created=2026-10-05T22:03:31+00:00 -->
### tts-immediate-interrupt · decision · TTS reads every destroyed ship aloud immediately, interrupting speech still playing

Operator approved the design "with the addition to also read the word/sentence aloud as soon as it's destroyed". Read as: speech starts on the destroyed event for the mothership, forms ship and sentence ships, and cancels any utterance in progress (replacing the drafted queueing default).

<!-- fr:journal kind=decision scope=spec id=design-defaults created=2026-10-05T22:03:31+00:00 -->
### design-defaults · decision · Defaults approved with the design

Daily new cap adjustable in settings (1-50, default 10); Esc pause freezes the world clock; accented loanword letters accept their unaccented base letter; Records that never came on screen stay ungraded; filled-in null plurals get no source_note (issue #5).

<!-- fr:journal kind=decision scope=spec id=restated-rows-repointed created=2026-10-05T22:03:31+00:00 -->
### restated-rows-repointed · decision · Restated requirements reuse the plan-1 acceptance rows, re-pointed at the plan-2 spec

srs-sessions (plan-2 R1-R3), learning-aids (R6), degraded-states (R10) and list-loading (R8, R18) keep their ids; the plan adds plan-2 spec origins to them and repairs every row's stale docs/superpowers/specs/ ref to implemented/specs/. New rows cover only capabilities new in this spec. R16, R17, R19 and R20 are engineering/hygiene requirements with no business-level row.

<!-- fr:journal kind=finding scope=spec id=sr-1 created=2026-10-06T03:43:44+00:00 state=open review_scope=in -->
### sr-1 · finding [open] (reviewer: in scope) · Recap never shows for the last wave, so the R19 smoke test cannot see a recap

target: spec
evidence: R6/R5/Design Sessions/R19: the last wave went straight to the summary; R19's two-Record fixture is a single wave and typed cleanly, so no recap could appear.

<!-- fr:journal kind=finding scope=spec id=sr-2 created=2026-10-06T03:43:44+00:00 state=open review_scope=in -->
### sr-2 · finding [open] (reviewer: in scope) · Records still on screen at game-over or quit are never resolved, so they are never graded

target: spec
evidence: world.ts:251-264 resolves only when open reaches 0; a life-ending escape on a Record with open ships was never graded.

<!-- fr:journal kind=finding scope=spec id=sr-3 created=2026-10-06T03:43:44+00:00 state=open review_scope=in -->
### sr-3 · finding [open] (reviewer: in scope) · Moving hullExtent into src/engine/layout.ts still depends on src/render

target: spec
evidence: hullExtent reads src/render/sprite-atlas.json via hullSprite/SpriteInfo (theme.ts:1-2,127,133-140).

<!-- fr:journal kind=finding scope=spec id=sr-4 created=2026-10-06T03:43:44+00:00 state=open review_scope=in -->
### sr-4 · finding [open] (reviewer: in scope) · The per-record validation step names a non-existent `recordSchema` and drops the list's rules

target: spec
evidence: RecordSchema calls checkEnriched without the list rules (record.ts:72-74 vs list.ts:47); duplicate category ids (list.ts:34-38) were missing from R9.

<!-- fr:journal kind=finding scope=spec id=sr-5 created=2026-10-06T03:43:44+00:00 state=open review_scope=in -->
### sr-5 · finding [open] (reviewer: in scope) · No mechanism for the chip and translation toggles to reach World-created ships

target: spec
evidence: spawnChildren always attaches the chip and translation (world.ts:218-223), and they widen the hull.

<!-- fr:journal kind=finding scope=spec id=sr-6 created=2026-10-06T03:43:44+00:00 state=open review_scope=in -->
### sr-6 · finding [open] (reviewer: in scope) · The design does not say how a window-sized width reaches the World, and the placement "slot" rules do not exist

target: spec
evidence: WORLD.width is a const 960; placement uses two clamps, and the reaction-distance clamp wins.

<!-- fr:journal kind=finding scope=spec id=sr-7 created=2026-10-06T03:43:44+00:00 state=open review_scope=in -->
### sr-7 · finding [open] (reviewer: in scope) · The R11 drift speed "at the enemy ships' sideways drift speed" is not a single value

target: spec
evidence: Children get a random vx between burstMinVx 8 and burstMaxVx 22 (world.ts:27-28,243).

<!-- fr:journal kind=finding scope=spec id=sr-8 created=2026-10-06T03:43:44+00:00 state=open review_scope=in -->
### sr-8 · finding [open] (reviewer: in scope) · keyboard.ts always steals focus back, which conflicts with panels that take input

target: spec
evidence: keyboard.ts:40-45 refocuses unconditionally, and there is no Esc listener.

<!-- fr:journal kind=finding scope=spec id=sr-9 created=2026-10-06T03:43:44+00:00 state=open review_scope=in -->
### sr-9 · finding [open] (reviewer: in scope) · The Hosting section's pages.yml steps leave out the Playwright run that Testing puts in the workflow

target: spec
evidence: Hosting and Testing disagreed; there was no e2e script and no Playwright config.

<!-- fr:journal kind=finding scope=spec id=sr-10 created=2026-10-06T03:43:44+00:00 state=open review_scope=in -->
### sr-10 · finding [open] (reviewer: in scope) · R2 and R3 drop details from plan-1 R8/R9 that the builders' table tests need

target: spec
evidence: New Records filled the cap in an unstated order, category overdueness was unstated, and free-play membership and shuffle were dropped.

<!-- fr:journal kind=finding scope=spec id=sr-11 created=2026-10-06T03:43:44+00:00 state=open review_scope=in -->
### sr-11 · finding [open] (reviewer: in scope) · The "What exists" section misdescribes RecordStats and treats the sibling-speed rule as new

target: spec
evidence: RecordStats is typos, expectedChars, activeMs and escaped:boolean (world.ts:83-88); the shared slowest speed already exists (world.ts:226-227).

<!-- fr:journal kind=finding scope=spec id=sr-12 created=2026-10-06T03:43:44+00:00 state=open review_scope=in -->
### sr-12 · finding [open] (reviewer: in scope) · The Test Plan omits several requirements the design promises

target: spec
evidence: R11-R13, R16, R8 empty list and R3 cap counter had no named test.

<!-- fr:journal kind=finding scope=spec id=sr-13 created=2026-10-06T03:43:44+00:00 state=open review_scope=in -->
### sr-13 · finding [open] (reviewer: in scope) · Three spec-journal decision bodies are truncated

target: spec
evidence: Cause: the brainstorm record's plain YAML scalars treated ' #' as a comment start, so the bodies were cut at '#2', '#4' and '#5'.

<!-- fr:journal kind=review scope=spec id=spec-review-1 created=2026-10-06T03:43:44+00:00 -->
### spec-review-1 · review · independent spec review: 13 findings

Reviewed docs/superpowers/specs/2026-10-06-vocab-typer-plan2-design.md against the journal decisions, the codebase (file:line verified for the World events, WorldOptions, matchChar, PRETYPED, typeable.ts, parseList, theme.ts metrics, the vite list plugin and the validate CLI), and itself. Raised 13 findings, all in scope: sr-1..sr-13. The decisions are honoured; the main problems were the recap and summary flow, grading at game-over, the R16 atlas dependency and the R9 rules regression.

<!-- fr:journal kind=finding scope=spec id=sr-1-resolved created=2026-10-06T03:43:44+00:00 state=fixed resolves=sr-1 -->
### sr-1-resolved · finding [fixed] · resolves sr-1: Recap never shows for the last wave, so the R19 smoke test cannot see a recap

R5 and Sessions: the between-wave panel shows after every wave, including the last, before the summary. R6: recap cards cover that wave's Again or Hard Records. R19: forces a Hard grade with typos, and checks the recap card, then the summary, then FSRS cards for both Records.

<!-- fr:journal kind=finding scope=spec id=sr-2-resolved created=2026-10-06T03:43:44+00:00 state=fixed resolves=sr-2 -->
### sr-2-resolved · finding [fixed] · resolves sr-2: Records still on screen at game-over or quit are never resolved, so they are never graded

R4: at 0 lives, every on-screen Record with an escaped ship is graded Again, and the others stay ungraded; on quit, on-screen Records stay ungraded. Sessions: on game-over the World emits resolved (escaped: true) for those Records before the summary. Testing: covers game-over grading.

<!-- fr:journal kind=finding scope=spec id=sr-3-resolved created=2026-10-06T03:43:44+00:00 state=fixed resolves=sr-3 -->
### sr-3-resolved · finding [fixed] · resolves sr-3: Moving hullExtent into src/engine/layout.ts still depends on src/render

R16 and the split section: the metrics, hullSprite, hullExtent, the sprite types and sprite-atlas.json move to src/layout/; slice.ts writes the atlas there; engine depends only on layout; a Vitest import-boundary test is added.

<!-- fr:journal kind=finding scope=spec id=sr-4-resolved created=2026-10-06T03:43:44+00:00 state=fixed resolves=sr-4 -->
### sr-4-resolved · finding [fixed] · resolves sr-4: The per-record validation step names a non-existent `recordSchema` and drops the list's rules

Loading: records are validated against RecordBase plus checkEnriched(r, header rules); if the header fails, the default minimums apply and its errors are reported. R9 now lists unique category ids.

<!-- fr:journal kind=finding scope=spec id=sr-5-resolved created=2026-10-06T03:43:44+00:00 state=fixed resolves=sr-5 -->
### sr-5-resolved · finding [fixed] · resolves sr-5: No mechanism for the chip and translation toggles to reach World-created ships

WorldOptions gains aids; rows that are off are not attached, so they don't widen the hull or take band height; a test is added.

<!-- fr:journal kind=finding scope=spec id=sr-6-resolved created=2026-10-06T03:43:44+00:00 state=fixed resolves=sr-6 -->
### sr-6-resolved · finding [fixed] · resolves sr-6: The design does not say how a window-sized width reaches the World, and the placement "slot" rules do not exist

WorldOptions.width is fixed per World, picked by the controller at wave start (aspect × 640, clamped to 720-1280); a mid-wave resize only rescales the canvas. Placement is restated against the existing clamps: the apex hull top stays at or below minY, spacing uses shipBounds plus bandGap, reaction distance still wins, and the fallback reduces the kick. R13 is reworded to match.

<!-- fr:journal kind=finding scope=spec id=sr-7-resolved created=2026-10-06T03:43:44+00:00 state=fixed resolves=sr-7 -->
### sr-7-resolved · finding [fixed] · resolves sr-7: The R11 drift speed "at the enemy ships' sideways drift speed" is not a single value

R11 and Play feel: a named WORLD.playerDriftVx = burstMaxVx (22 px/s) keeps pace with the fastest child; playerX becomes World state.

<!-- fr:journal kind=finding scope=spec id=sr-8-resolved created=2026-10-06T03:43:44+00:00 state=fixed resolves=sr-8 -->
### sr-8-resolved · finding [fixed] · resolves sr-8: keyboard.ts always steals focus back, which conflicts with panels that take input

Module layout lists keyboard.ts as changed: setEnabled(on), which disables emitting and refocusing, and an onEscape callback. app.ts disables it while panels are open. The jsdom test covers a control that keeps focus.

<!-- fr:journal kind=finding scope=spec id=sr-9-resolved created=2026-10-06T03:43:44+00:00 state=fixed resolves=sr-9 -->
### sr-9-resolved · finding [fixed] · resolves sr-9: The Hosting section's pages.yml steps leave out the Playwright run that Testing puts in the workflow

Hosting lists the Playwright install and npm run e2e against vite preview before deploy; Module layout adds playwright.config.ts and the e2e script.

<!-- fr:journal kind=finding scope=spec id=sr-10-resolved created=2026-10-06T03:43:44+00:00 state=fixed resolves=sr-10 -->
### sr-10-resolved · finding [fixed] · resolves sr-10: R2 and R3 drop details from plan-1 R8/R9 that the builders' table tests need

R2: new Records fill the cap in list order, and categories are ordered by their most overdue card. R3: Records whose categories include the chosen category (primary or not), shuffled.

<!-- fr:journal kind=finding scope=spec id=sr-11-resolved created=2026-10-06T03:43:44+00:00 state=fixed resolves=sr-11 -->
### sr-11-resolved · finding [fixed] · resolves sr-11: The "What exists" section misdescribes RecordStats and treats the sibling-speed rule as new

What exists names the real fields and the current imports; the cards counters are defined against the boolean escaped. The archived plan-1 spec is NOT edited; the sibling-speed rule for issue #4 p3-r17 is stated in this spec, citing spawnChildren.

<!-- fr:journal kind=finding scope=spec id=sr-12-resolved created=2026-10-06T03:43:44+00:00 state=fixed resolves=sr-12 -->
### sr-12-resolved · finding [fixed] · resolves sr-12: The Test Plan omits several requirements the design promises

Testing names unit tests for game-over grading, the builders' ordering and cap, the free-play cap counter, placement and the fallback, the drift cap, gun alternation, width and aids options, the flash and prefix helpers, the DPR backing store, the import boundary, the zero-playable list and panel focus; visual results go to the play-feel and session-screens screenshots.

<!-- fr:journal kind=finding scope=spec id=sr-13-resolved created=2026-10-06T03:43:44+00:00 state=fixed resolves=sr-13 -->
### sr-13-resolved · finding [fixed] · resolves sr-13: Three spec-journal decision bodies are truncated

Restored the full text of ux-pass-is-issue-2, issues-in-scope and design-defaults in the spec journal from the brainstorm record's intended content.

<!-- fr:journal kind=decision scope=spec id=phase-split-2026-10-06-vocab-typer-plan2-p2 created=2026-10-06T03:47:26+00:00 -->
### phase-split-2026-10-06-vocab-typer-plan2-p2 · decision · ask: play feel from issue #2 (R11-R13) is independently reviewable

<!-- fr:journal kind=decision scope=spec id=phase-split-2026-10-06-vocab-typer-plan2-p3 created=2026-10-06T03:47:28+00:00 -->
### phase-split-2026-10-06-vocab-typer-plan2-p3 · decision · ask: the learning loop core (R1-R4) is pure TS reviewable on its own

<!-- fr:journal kind=decision scope=spec id=phase-split-2026-10-06-vocab-typer-plan2-p4 created=2026-10-06T03:47:31+00:00 -->
### phase-split-2026-10-06-vocab-typer-plan2-p4 · decision · ask: screens, list loading and degraded states (R5, R8, R10)

<!-- fr:journal kind=decision scope=spec id=phase-split-2026-10-06-vocab-typer-plan2-p5 created=2026-10-06T03:47:33+00:00 -->
### phase-split-2026-10-06-vocab-typer-plan2-p5 · decision · ask: learning aids and audio (R6, R7)

<!-- fr:journal kind=decision scope=spec id=phase-split-2026-10-06-vocab-typer-plan2-p6 created=2026-10-06T03:47:36+00:00 -->
### phase-split-2026-10-06-vocab-typer-plan2-p6 · decision · ask: hosting, smoke test and docs (R18-R20)
