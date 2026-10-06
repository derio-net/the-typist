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
