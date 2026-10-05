# Journal: 2026-10-05-vocab-typer

<!-- fr:journal kind=decision scope=plan id=p1-rules-in-rules-ts created=2026-10-05T07:36:22+00:00 phase=1 -->
### p1-rules-in-rules-ts · decision · Per-type rules and typeability live in src/schema/rules.ts (phase 1)

record.ts re-exports RECOGNISED_TAGS/TENSE_TAGS/checkRecordRules. checkEnriched (type-block presence + per-type rules + typeability) is shared by RecordSchema (default minimums) and ListSchema (header rules). ListSchema builds on RecordBase (no refine) so header rules.* apply instead of defaults.

<!-- fr:journal kind=decision scope=plan id=p1-rule-interpretations created=2026-10-05T07:36:22+00:00 phase=1 -->
### p1-rule-interpretations · decision · Interpretations of R3 edge cases (phase 1)

plural_only/plural:null nouns skip the singular/plural tag requirement but still need >=3 examples; gradable adjective needs a comparative OR superlative tagged example; phrase needs no type block; header rules also accept adjective_examples/phrase_examples; forms for a gradable adjective is null unless both comparative and superlative are present.

<!-- fr:journal kind=discovery scope=plan id=p1-cli-exits-on-import created=2026-10-05T07:36:22+00:00 phase=1 -->
### p1-cli-exits-on-import · discovery · tools/cli.ts runs its dispatch at module top level (phase 1)

It calls process.exit on import, so it must not be imported by tests or other modules. Phase 2 adds the parse subcommand; keep logic in importable modules and tests spawning node_modules/.bin/tsx (as validate.test.ts does).

<!-- fr:journal kind=discovery scope=plan id=p1-vitest-plugin-config created=2026-10-05T07:36:22+00:00 phase=1 -->
### p1-vitest-plugin-config · discovery · vite.config.ts imports defineConfig from vitest/config (phase 1)

Single config carries both the base/plugins and the vitest test block (node environment, tests/**/*.test.ts); jsdom tests in later phases should opt in with a per-file '// @vitest-environment jsdom' docblock.

<!-- fr:journal kind=discovery scope=plan id=no-refactor-p1-t1 created=2026-10-05T07:36:22+00:00 phase=1 -->
### no-refactor-p1-t1 · discovery · no-refactor-because P1.T1 (phase 1)

Scaffold plus a trivial smoke test; nothing to clean.

<!-- fr:journal kind=discovery scope=plan id=no-refactor-p1-t4 created=2026-10-05T07:36:22+00:00 phase=1 -->
### no-refactor-p1-t4 · discovery · no-refactor-because P1.T4 (phase 1)

CLI and plugin are each a thin wrapper over parseList; nothing duplicated to extract.

<!-- fr:journal kind=finding scope=plan id=p1-r1 created=2026-10-05T07:40:15+00:00 phase=1 state=open review_scope=in -->
### p1-r1 · finding [open] (reviewer: in scope) · Non-strict zod objects silently strip unknown keys (phase 1)

<!-- fr:journal kind=finding scope=plan id=p1-r2 created=2026-10-05T07:40:15+00:00 phase=1 state=open review_scope=in -->
### p1-r2 · finding [open] (reviewer: in scope) · Gradable adjective with one missing form validates; forms ship vanishes (phase 1)

<!-- fr:journal kind=finding scope=plan id=p1-r3 created=2026-10-05T07:40:15+00:00 phase=1 state=open review_scope=in -->
### p1-r3 · finding [open] (reviewer: in scope) · Header rules can lower example minimums (phase 1)

<!-- fr:journal kind=finding scope=plan id=p1-r4 created=2026-10-05T07:40:15+00:00 phase=1 state=open review_scope=in -->
### p1-r4 · finding [open] (reviewer: in scope) · source_lines accepts 0 and negatives (phase 1)

<!-- fr:journal kind=finding scope=plan id=p1-r5 created=2026-10-05T07:40:15+00:00 phase=1 state=open review_scope=in -->
### p1-r5 · finding [open] (reviewer: in scope) · Duplicate category ids not rejected (phase 1)

<!-- fr:journal kind=finding scope=plan id=p1-r6 created=2026-10-05T07:40:15+00:00 phase=1 state=open review_scope=in -->
### p1-r6 · finding [open] (reviewer: in scope) · Vite plugin transforms ?raw/?url imports (phase 1)

<!-- fr:journal kind=finding scope=plan id=p1-r7 created=2026-10-05T07:40:15+00:00 phase=1 state=open review_scope=in -->
### p1-r7 · finding [open] (reviewer: in scope) · No test runs the plugin through a real Vite build (phase 1)

<!-- fr:journal kind=finding scope=plan id=p1-r8 created=2026-10-05T07:40:15+00:00 phase=1 state=open review_scope=in -->
### p1-r8 · finding [open] (reviewer: in scope) · tsconfig puts Node types on browser src/ (phase 1)

<!-- fr:journal kind=finding scope=plan id=p1-r9 created=2026-10-05T07:40:15+00:00 phase=1 state=open review_scope=out -->
### p1-r9 · finding [open] (reviewer: out of scope) · List-level errors masked until record shape errors fixed (zod abort) (phase 1)

<!-- fr:journal kind=review scope=plan id=p1-review created=2026-10-05T07:40:15+00:00 phase=1 -->
### p1-review · review · phase 1 code review: with fixes; 8 in-scope findings fixed, 1 out of scope (phase 1)

<!-- fr:journal kind=finding scope=plan id=p1-r1-resolved created=2026-10-05T07:40:15+00:00 phase=1 state=fixed resolves=p1-r1 -->
### p1-r1-resolved · finding [fixed] · resolves p1-r1: Non-strict zod objects silently strip unknown keys (phase 1)

All schema objects are z.strictObject; tests/schema/strictness.test.ts covers record, block, header rules and category typos.

<!-- fr:journal kind=finding scope=plan id=p1-r2-resolved created=2026-10-05T07:40:15+00:00 phase=1 state=fixed resolves=p1-r2 -->
### p1-r2-resolved · finding [fixed] · resolves p1-r2: Gradable adjective with one missing form validates; forms ship vanishes (phase 1)

adjectiveRules requires both comparative and superlative when gradable; test added.

<!-- fr:journal kind=finding scope=plan id=p1-r3-resolved created=2026-10-05T07:40:15+00:00 phase=1 state=fixed resolves=p1-r3 -->
### p1-r3-resolved · finding [fixed] · resolves p1-r3: Header rules can lower example minimums (phase 1)

Rules floor at the R3 defaults (3/3/2/2); test added.

<!-- fr:journal kind=finding scope=plan id=p1-r4-resolved created=2026-10-05T07:40:15+00:00 phase=1 state=fixed resolves=p1-r4 -->
### p1-r4-resolved · finding [fixed] · resolves p1-r4: source_lines accepts 0 and negatives (phase 1)

int().min(1); test added.

<!-- fr:journal kind=finding scope=plan id=p1-r5-resolved created=2026-10-05T07:40:15+00:00 phase=1 state=fixed resolves=p1-r5 -->
### p1-r5-resolved · finding [fixed] · resolves p1-r5: Duplicate category ids not rejected (phase 1)

List-level check reports duplicate category id; test added.

<!-- fr:journal kind=finding scope=plan id=p1-r6-resolved created=2026-10-05T07:40:15+00:00 phase=1 state=fixed resolves=p1-r6 -->
### p1-r6-resolved · finding [fixed] · resolves p1-r6: Vite plugin transforms ?raw/?url imports (phase 1)

Plugin returns null for any id with a query; test added.

<!-- fr:journal kind=finding scope=plan id=p1-r7-resolved created=2026-10-05T07:40:15+00:00 phase=1 state=fixed resolves=p1-r7 -->
### p1-r7-resolved · finding [fixed] · resolves p1-r7: No test runs the plugin through a real Vite build (phase 1)

tests/tools/vite-plugin.test.ts builds a temp project with valid and invalid lists via vite build().

<!-- fr:journal kind=finding scope=plan id=p1-r8-resolved created=2026-10-05T07:40:15+00:00 phase=1 state=fixed resolves=p1-r8 -->
### p1-r8-resolved · finding [fixed] · resolves p1-r8: tsconfig puts Node types on browser src/ (phase 1)

tsconfig.json (src, vite/client only) + tsconfig.node.json (tests/tools/config); build runs both; probe confirmed process is rejected in src.

<!-- fr:journal kind=finding scope=plan id=p1-r9-resolved created=2026-10-05T07:40:15+00:00 phase=1 state=open resolves=p1-r9 out_of_scope=true -->
### p1-r9-resolved · finding [out-of-scope] · resolves p1-r9: List-level errors masked until record shape errors fixed (zod abort) (phase 1)

Inherent to zod superRefine ordering; errors surface on the next validate run; acceptable per reviewer.

<!-- fr:journal kind=discovery scope=plan id=p2-seed-dry-run created=2026-10-05T07:48:45+00:00 phase=2 -->
### p2-seed-dry-run · discovery · Seed dry run: 1000 entry lines covered exactly once; 861 records, 20 categories, 139 unresolved (phase 2)

`typist parse wordlist.raw.txt` (scratch output outside the repo). 1000 lines containing ' – ';
every one is in exactly one of records[].source_lines or unresolved (checked: no gaps, no overlaps).
861 records (735 noun, 126 verb, all status raw, 861 unique ids, 57 of them -2/-3 suffixed: repeats
of the same word across sections, e.g. noun-gesetz, noun-nachhaltigkeit-4; typist-enrich's organise
pass merges these). 20 categories (headers numbered 1-9, 11-21; there is no section 10).
139 unresolved by reason: phrase 56, word 38, slash 28, template 8, und 3, parenthetical 2,
list 2, plural 2 (gloss 0). With unresolved: removed the output validates (861 records).
No seed line hits the plural reason except two adjective+noun lines (das soziale Netzwerk, -e;
der rhetorische Mittel, -): every stem/umlaut plural (-schläge, -stände, -hälter ...) is built
by the tail-replacement rule. Every reason has an instruction in the typist-structure skill.

<!-- fr:journal kind=decision scope=plan id=p2-reflexive-lemma created=2026-10-05T07:48:45+00:00 phase=2 -->
### p2-reflexive-lemma · decision · Raw reflexive verbs keep 'sich' in the lemma; id uses the bare verb (phase 2)

VerbBlock needs auxiliary and parts, so a raw record has nowhere to say reflexive. The parser
emits lemma 'sich vorstellen' with id verb-vorstellen; typist-enrich converts to
lemma vorstellen + verb.reflexive true. Likewise a raw noun with no plural in the source gets
noun {gender, plural: null}, which enrich verifies.

<!-- fr:journal kind=decision scope=plan id=p2-list-schema-strict created=2026-10-05T07:48:45+00:00 phase=2 -->
### p2-list-schema-strict · decision · ListSchema made z.strictObject so a leftover top-level 'unresolved:' fails validate (phase 2)

Phase 1 left the top-level object non-strict (unknown keys were stripped silently), so validate
did not reject 'unresolved:'. Changed src/schema/list.ts to strictObject and added a strictness
test; the skill's 'remove unresolved, run validate' step now has teeth.

<!-- fr:journal kind=discovery scope=plan id=p2-category-slug-and created=2026-10-05T07:48:45+00:00 phase=2 -->
### p2-category-slug-and · discovery · Header slug maps & to 'and' (plan), differing from the spec's economics-finance example (phase 2)

Per P2.T1.S2, '&' becomes 'and', so 'Economics & Finance' is economics-and-finance, while the
spec schema example and tests/fixtures/lists/valid.yaml say economics-finance. The seed test
derives ids from headers, so it is consistent; the example in the spec is only illustrative.

<!-- fr:journal kind=discovery scope=plan id=p2-container-node-modules created=2026-10-05T07:48:45+00:00 phase=2 -->
### p2-container-node-modules · discovery · fr isolation exec npm test fails: node_modules has host (darwin) rolldown bindings (phase 2)

Inside the devcontainer (linux) vitest dies with 'Cannot find native binding'; node_modules in
the worktree was installed on the host. The phase suite was therefore run on the host. Needs an
in-container npm install (or a per-platform node_modules) before the exec-bridge can run tests.

<!-- fr:journal kind=discovery scope=plan id=no-refactor-p2-t1 created=2026-10-05T07:48:45+00:00 phase=2 -->
### no-refactor-p2-t1 · discovery · no-refactor-because P2.T1 (phase 2)

lines.ts and headers.ts are two tiny single-purpose functions written clean; nothing to extract.

<!-- fr:journal kind=discovery scope=plan id=no-refactor-p2-t3 created=2026-10-05T07:48:45+00:00 phase=2 -->
### no-refactor-p2-t3 · discovery · no-refactor-because P2.T3 (phase 2)

the parse subcommand is one small function beside validate; nothing duplicated.

<!-- fr:journal kind=discovery scope=plan id=no-refactor-p2-t4 created=2026-10-05T07:48:45+00:00 phase=2 -->
### no-refactor-p2-t4 · discovery · no-refactor-because P2.T4 (phase 2)

the deliverable is a prose skill; no code to clean.

<!-- fr:journal kind=finding scope=plan id=p2-r1 created=2026-10-05T07:57:12+00:00 phase=2 state=open review_scope=in -->
### p2-r1 · finding [open] (reviewer: in scope) · verbShape types -en adjectives as verbs, freezing a verb- id prefix (phase 2)

<!-- fr:journal kind=finding scope=plan id=p2-r2 created=2026-10-05T07:57:12+00:00 phase=2 state=open review_scope=in -->
### p2-r2 · finding [open] (reviewer: in scope) · Skill plural example teaches "die soziale Netzwerke" (phase 2)

<!-- fr:journal kind=finding scope=plan id=p2-r3 created=2026-10-05T07:57:12+00:00 phase=2 state=open review_scope=in -->
### p2-r3 · finding [open] (reviewer: in scope) · Reflexive id from bare verb collides with the plain verb (phase 2)

<!-- fr:journal kind=finding scope=plan id=p2-r4 created=2026-10-05T07:57:12+00:00 phase=2 state=open review_scope=out -->
### p2-r4 · finding [open] (reviewer: out of scope) · 368 nouns get plural: null when the source omitted the plural (phase 2)

<!-- fr:journal kind=finding scope=plan id=p2-r5 created=2026-10-05T07:57:12+00:00 phase=2 state=open review_scope=in -->
### p2-r5 · finding [open] (reviewer: in scope) · Skill phrase rule keeps trailing (UN)/(für) in the lemma (phase 2)

<!-- fr:journal kind=finding scope=plan id=p2-r6 created=2026-10-05T07:57:12+00:00 phase=2 state=open review_scope=in -->
### p2-r6 · finding [open] (reviewer: in scope) · Skill maps a direct object into government (phase 2)

<!-- fr:journal kind=finding scope=plan id=p2-r7 created=2026-10-05T07:57:12+00:00 phase=2 state=open review_scope=in -->
### p2-r7 · finding [open] (reviewer: in scope) · Unresolved entries drop the section category (phase 2)

<!-- fr:journal kind=review scope=plan id=p2-review created=2026-10-05T07:57:12+00:00 phase=2 -->
### p2-review · review · phase 2 code review (retry on opus after a safeguard false-positive killed the first reviewer): with fixes; 6 fixed, 1 out-of-scope deferred to phase 4 (phase 2)

<!-- fr:journal kind=finding scope=plan id=p2-r1-resolved created=2026-10-05T07:57:12+00:00 phase=2 state=fixed resolves=p2-r1 -->
### p2-r1-resolved · finding [fixed] · resolves p2-r1: verbShape types -en adjectives as verbs, freezing a verb- id prefix (phase 2)

Verb result now also requires a gloss starting with "to "; zufrieden etc. go to unresolved word; fixture test from seed line 763.

<!-- fr:journal kind=finding scope=plan id=p2-r2-resolved created=2026-10-05T07:57:12+00:00 phase=2 state=fixed resolves=p2-r2 -->
### p2-r2-resolved · finding [fixed] · resolves p2-r2: Skill plural example teaches "die soziale Netzwerke" (phase 2)

Example corrected to plural: sozialen Netzwerke with the weak-plural rule stated.

<!-- fr:journal kind=finding scope=plan id=p2-r3-resolved created=2026-10-05T07:57:12+00:00 phase=2 state=fixed resolves=p2-r3 -->
### p2-r3-resolved · finding [fixed] · resolves p2-r3: Reflexive id from bare verb collides with the plain verb (phase 2)

Ids derive from the full lemma: verb-sich-vorstellen vs verb-vorstellen; test updated; seed suffixed ids 57 → 54.

<!-- fr:journal kind=finding scope=plan id=p2-r4-resolved created=2026-10-05T07:57:12+00:00 phase=2 state=open resolves=p2-r4 out_of_scope=true -->
### p2-r4-resolved · finding [out-of-scope] · resolves p2-r4: 368 nouns get plural: null when the source omitted the plural (phase 2)

Plan phase 4 (typist-enrich) step now requires re-checking every plural: null; the parser cannot know the plural.

<!-- fr:journal kind=finding scope=plan id=p2-r5-resolved created=2026-10-05T07:57:12+00:00 phase=2 state=fixed resolves=p2-r5 -->
### p2-r5-resolved · finding [fixed] · resolves p2-r5: Skill phrase rule keeps trailing (UN)/(für) in the lemma (phase 2)

Skill moves trailing abbreviation/preposition to abbreviation/government and types capitalised-adjective proper names as nouns.

<!-- fr:journal kind=finding scope=plan id=p2-r6-resolved created=2026-10-05T07:57:12+00:00 phase=2 state=fixed resolves=p2-r6 -->
### p2-r6-resolved · finding [fixed] · resolves p2-r6: Skill maps a direct object into government (phase 2)

government is a preposition (+case) only; object hints go to gloss/source_note.

<!-- fr:journal kind=finding scope=plan id=p2-r7-resolved created=2026-10-05T07:57:12+00:00 phase=2 state=fixed resolves=p2-r7 -->
### p2-r7-resolved · finding [fixed] · resolves p2-r7: Unresolved entries drop the section category (phase 2)

Unresolved now carries category; skill applies it; CLI test updated.

<!-- fr:journal kind=discovery scope=plan id=p3-s2-screenshots-owed created=2026-10-05T08:06:14+00:00 phase=3 -->
### p3-s2-screenshots-owed · discovery · P3.T4.S2 browser verification partly done (phase 3)

No browser available to the executor. Done: World-level play-through test (both fixture records, one 'ae' fallback, zero escapes), npm run build green, npm run dev serving /?dev=fixture with HTTP 200 and the dev module transformed. NOT done: typing in a real browser and the three screenshots (mothership-with-gloss, escorts-spawned, locked-ship-typed-prefix) for the record-ships visual row - left for the orchestrator.

<!-- fr:journal kind=decision scope=plan id=p3-engine-api created=2026-10-05T08:06:14+00:00 phase=3 -->
### p3-engine-api · decision · Engine and world API shapes (phase 3)

TypingEngine is step(state, char, now) over TypingState {ships, lock, typos}; ships carry y (largest = closest to the player) and the world syncs y each tick. Trailing pre-typed punctuation = . ! ? … and closing quotes, never the whole text. World is immutable-style: tick/typeChar/advance return a new World with `events` for the last call; RecordStats.escaped is a boolean; expectedChars counts destroyed ships only (an escaped mothership contributes 0). Motherships all spawn on screen in staggered lanes so the offscreen is never targetable.

<!-- fr:journal kind=discovery scope=plan id=p3-composition-echo created=2026-10-05T08:06:14+00:00 phase=3 -->
### p3-composition-echo · discovery · Composition echo guard (phase 3)

keyboard.ts ignores input events whose inputType is insertCompositionText or insertFromComposition, so a browser that echoes the composed char as a non-composing input after compositionend (Safari-style) is not double-counted. Tested synthetically only; real macOS Safari/Chrome ordering is unverified.

<!-- fr:journal kind=discovery scope=plan id=p3-browser-check created=2026-10-05T08:06:14+00:00 phase=3 -->
### p3-browser-check · discovery · Orchestrator browser check (headless Chrome via playwright-core; extension offline) (phase 3)

Mothership+gloss, typed-prefix highlight, oe→ö fallback destroying "die Börse", escorts with chips+translations all work. Defects: escort sentence clipped off the left edge; forms ship overlaps escorts; escorts overlap the other mothership; one 404 (likely favicon). Routed to review-phase.

<!-- fr:journal kind=discovery scope=plan id=no-refactor-p3-t1 created=2026-10-05T08:06:14+00:00 phase=3 -->
### no-refactor-p3-t1 · discovery · no-refactor-because P3.T1 (phase 3)

single small module written straight to spec; nothing to clean

<!-- fr:journal kind=discovery scope=plan id=no-refactor-p3-t3 created=2026-10-05T08:06:14+00:00 phase=3 -->
### no-refactor-p3-t3 · discovery · no-refactor-because P3.T3 (phase 3)

world.ts was written in one pass with shared helpers (spawn, shipDone, finish); nothing duplicated

<!-- fr:journal kind=discovery scope=plan id=no-refactor-p3-t4 created=2026-10-05T08:06:14+00:00 phase=3 -->
### no-refactor-p3-t4 · discovery · no-refactor-because P3.T4 (phase 3)

renderer/theme/dev page are new code with no repetition; purity test already guards the theme boundary

<!-- fr:journal kind=finding scope=plan id=p3-r1 created=2026-10-05T08:17:52+00:00 phase=3 state=open review_scope=in -->
### p3-r1 · finding [open] (reviewer: in scope) · Escort x-clamp used a 9px/char estimate; ships spawned off the left edge (phase 3)

<!-- fr:journal kind=finding scope=plan id=p3-r2 created=2026-10-05T08:17:52+00:00 phase=3 state=open review_scope=in -->
### p3-r2 · finding [open] (reviewer: in scope) · Child placement had no collision handling (phase 3)

<!-- fr:journal kind=finding scope=plan id=p3-r3 created=2026-10-05T08:17:52+00:00 phase=3 state=open review_scope=in -->
### p3-r3 · finding [open] (reviewer: in scope) · Forms ship spawned near the player line escaped unavoidably (phase 3)

<!-- fr:journal kind=finding scope=plan id=p3-r4 created=2026-10-05T08:17:52+00:00 phase=3 state=open review_scope=in -->
### p3-r4 · finding [open] (reviewer: in scope) · advance() dropped intermediate ticks' events (phase 3)

<!-- fr:journal kind=finding scope=plan id=p3-r5 created=2026-10-05T08:17:52+00:00 phase=3 state=open review_scope=in -->
### p3-r5 · finding [open] (reviewer: in scope) · Keyboard cleared input.value mid-composition (phase 3)

<!-- fr:journal kind=finding scope=plan id=p3-r6 created=2026-10-05T08:17:52+00:00 phase=3 state=open review_scope=out -->
### p3-r6 · finding [open] (reviewer: out of scope) · Pending o then precomposed ö stays a typo until e (phase 3)

<!-- fr:journal kind=finding scope=plan id=p3-r7 created=2026-10-05T08:17:52+00:00 phase=3 state=open review_scope=in -->
### p3-r7 · finding [open] (reviewer: in scope) · Renderer magic numbers; unused theme tokens (phase 3)

<!-- fr:journal kind=finding scope=plan id=p3-r8 created=2026-10-05T08:17:52+00:00 phase=3 state=open review_scope=out -->
### p3-r8 · finding [open] (reviewer: out of scope) · No typo / pending-digraph feedback (phase 3)

<!-- fr:journal kind=finding scope=plan id=p3-r9 created=2026-10-05T08:17:52+00:00 phase=3 state=open review_scope=out -->
### p3-r9 · finding [open] (reviewer: out of scope) · No devicePixelRatio scaling / responsive fit (phase 3)

<!-- fr:journal kind=finding scope=plan id=p3-r10 created=2026-10-05T08:17:52+00:00 phase=3 state=open review_scope=in -->
### p3-r10 · finding [open] (reviewer: in scope) · Synchronous refocus in blur ignored by Firefox (phase 3)

<!-- fr:journal kind=finding scope=plan id=p3-r11 created=2026-10-05T08:17:52+00:00 phase=3 state=open review_scope=in -->
### p3-r11 · finding [open] (reviewer: in scope) · favicon 404 (phase 3)

<!-- fr:journal kind=finding scope=plan id=p3-r12 created=2026-10-05T08:17:52+00:00 phase=3 state=open review_scope=out -->
### p3-r12 · finding [open] (reviewer: out of scope) · ‘ ’ ) not pre-typed (phase 3)

<!-- fr:journal kind=finding scope=plan id=p3-r13 created=2026-10-05T08:17:52+00:00 phase=3 state=open review_scope=in -->
### p3-r13 · finding [open] (reviewer: in scope) · Missing tests (phase 3)

<!-- fr:journal kind=finding scope=plan id=p3-r18 created=2026-10-05T08:17:52+00:00 phase=3 state=open review_scope=in -->
### p3-r18 · finding [open] (reviewer: in scope) · Short sibling ships overtook long ones after spawn (seen in browser re-check) (phase 3)

<!-- fr:journal kind=finding scope=plan id=p3-r14 created=2026-10-05T08:17:52+00:00 phase=3 state=open review_scope=out -->
### p3-r14 · finding [open] (reviewer: out of scope) · world.ts imports layout metrics from render/theme (engine→render dependency) (phase 3)

<!-- fr:journal kind=finding scope=plan id=p3-r15 created=2026-10-05T08:17:52+00:00 phase=3 state=open review_scope=out -->
### p3-r15 · finding [open] (reviewer: out of scope) · findSlot ignores the HUD rectangle (phase 3)

<!-- fr:journal kind=finding scope=plan id=p3-r16 created=2026-10-05T08:17:52+00:00 phase=3 state=open review_scope=out -->
### p3-r16 · finding [open] (reviewer: out of scope) · Child boxes may touch exactly; no-slot fallback untested (phase 3)

<!-- fr:journal kind=finding scope=plan id=p3-r17 created=2026-10-05T08:17:52+00:00 phase=3 state=open review_scope=out -->
### p3-r17 · finding [open] (reviewer: out of scope) · Siblings share the slowest speed, deviating from per-text speed (phase 3)

<!-- fr:journal kind=review scope=plan id=p3-review created=2026-10-05T08:17:52+00:00 phase=3 -->
### p3-review · review · phase 3 code review: with fixes; 10 fixed (incl. p3-r18 found in the post-fix browser check), 8 out of scope; reviewer re-verified fixes visually (phase 3)

<!-- fr:journal kind=finding scope=plan id=p3-r1-resolved created=2026-10-05T08:17:52+00:00 phase=3 state=fixed resolves=p3-r1 -->
### p3-r1-resolved · finding [fixed] · resolves p3-r1: Escort x-clamp used a 9px/char estimate; ships spawned off the left edge (phase 3)

Measured width injected into World (ctx.measureText in the renderer); wider-than-canvas text centred; browser re-check shows no clipping.

<!-- fr:journal kind=finding scope=plan id=p3-r2-resolved created=2026-10-05T08:17:52+00:00 phase=3 state=fixed resolves=p3-r2 -->
### p3-r2-resolved · finding [fixed] · resolves p3-r2: Child placement had no collision handling (phase 3)

Full bounding boxes + nearest-free-slot search; tests at three mothership heights.

<!-- fr:journal kind=finding scope=plan id=p3-r3-resolved created=2026-10-05T08:17:52+00:00 phase=3 state=fixed resolves=p3-r3 -->
### p3-r3-resolved · finding [fixed] · resolves p3-r3: Forms ship spawned near the player line escaped unavoidably (phase 3)

All children capped at playerY - speed*minReactionS; test destroys a mothership 5px above the line.

<!-- fr:journal kind=finding scope=plan id=p3-r4-resolved created=2026-10-05T08:17:52+00:00 phase=3 state=fixed resolves=p3-r4 -->
### p3-r4-resolved · finding [fixed] · resolves p3-r4: advance() dropped intermediate ticks' events (phase 3)

Events accumulated across steps; multi-step escape test.

<!-- fr:journal kind=finding scope=plan id=p3-r5-resolved created=2026-10-05T08:17:52+00:00 phase=3 state=fixed resolves=p3-r5 -->
### p3-r5-resolved · finding [fixed] · resolves p3-r5: Keyboard cleared input.value mid-composition (phase 3)

Early return on composing events, clear only on compositionend/non-composing reads, WebKit echo dedupe; jsdom tests; real Chromium IME composition (CDP imeSetComposition ¨ + insertText ö) verified in the capture script.

<!-- fr:journal kind=finding scope=plan id=p3-r6-resolved created=2026-10-05T08:17:52+00:00 phase=3 state=open resolves=p3-r6 out_of_scope=true -->
### p3-r6-resolved · finding [out-of-scope] · resolves p3-r6: Pending o then precomposed ö stays a typo until e (phase 3)

Spec-conformant ("accepts only e"); candidate for plan 2 UX polish.

<!-- fr:journal kind=finding scope=plan id=p3-r7-resolved created=2026-10-05T08:17:52+00:00 phase=3 state=fixed resolves=p3-r7 -->
### p3-r7-resolved · finding [fixed] · resolves p3-r7: Renderer magic numbers; unused theme tokens (phase 3)

Moved into theme sizes; unused tokens removed; purity test rejects numeric literals other than 0/1/2.

<!-- fr:journal kind=finding scope=plan id=p3-r8-resolved created=2026-10-05T08:17:52+00:00 phase=3 state=open resolves=p3-r8 out_of_scope=true -->
### p3-r8-resolved · finding [out-of-scope] · resolves p3-r8: No typo / pending-digraph feedback (phase 3)

UX feedback belongs to the plan-2 UX direction phase.

<!-- fr:journal kind=finding scope=plan id=p3-r9-resolved created=2026-10-05T08:17:52+00:00 phase=3 state=open resolves=p3-r9 out_of_scope=true -->
### p3-r9-resolved · finding [out-of-scope] · resolves p3-r9: No devicePixelRatio scaling / responsive fit (phase 3)

Belongs to the plan-2 UX direction phase.

<!-- fr:journal kind=finding scope=plan id=p3-r10-resolved created=2026-10-05T08:17:52+00:00 phase=3 state=fixed resolves=p3-r10 -->
### p3-r10-resolved · finding [fixed] · resolves p3-r10: Synchronous refocus in blur ignored by Firefox (phase 3)

Deferred with setTimeout, skipped after dispose; async test.

<!-- fr:journal kind=finding scope=plan id=p3-r11-resolved created=2026-10-05T08:17:52+00:00 phase=3 state=fixed resolves=p3-r11 -->
### p3-r11-resolved · finding [fixed] · resolves p3-r11: favicon 404 (phase 3)

<link rel="icon" href="data:,">; browser capture shows no console errors.

<!-- fr:journal kind=finding scope=plan id=p3-r12-resolved created=2026-10-05T08:17:52+00:00 phase=3 state=open resolves=p3-r12 out_of_scope=true -->
### p3-r12-resolved · finding [out-of-scope] · resolves p3-r12: ‘ ’ ) not pre-typed (phase 3)

Not in the spec list; trivial follow-up when real content shows the need.

<!-- fr:journal kind=finding scope=plan id=p3-r13-resolved created=2026-10-05T08:17:52+00:00 phase=3 state=fixed resolves=p3-r13 -->
### p3-r13-resolved · finding [fixed] · resolves p3-r13: Missing tests (phase 3)

Placement/bounds, multi-tick events, lock release on escape, escaped-child stats, WebKit order, pre-typed » « ” added.

<!-- fr:journal kind=finding scope=plan id=p3-r18-resolved created=2026-10-05T08:17:52+00:00 phase=3 state=fixed resolves=p3-r18 -->
### p3-r18-resolved · finding [fixed] · resolves p3-r18: Short sibling ships overtook long ones after spawn (seen in browser re-check) (phase 3)

Children of one mothership share the group's slowest speed; test advances 2s and asserts no sibling overlap.

<!-- fr:journal kind=finding scope=plan id=p3-r14-resolved created=2026-10-05T08:17:52+00:00 phase=3 state=open resolves=p3-r14 out_of_scope=true -->
### p3-r14-resolved · finding [out-of-scope] · resolves p3-r14: world.ts imports layout metrics from render/theme (engine→render dependency) (phase 3)

Refactor candidate for plan 2; theme.ts is DOM-free so the engine stays pure today.

<!-- fr:journal kind=finding scope=plan id=p3-r15-resolved created=2026-10-05T08:17:52+00:00 phase=3 state=open resolves=p3-r15 out_of_scope=true -->
### p3-r15-resolved · finding [out-of-scope] · resolves p3-r15: findSlot ignores the HUD rectangle (phase 3)

Plan 2 UX phase defines the HUD layout; add it as an obstacle then.

<!-- fr:journal kind=finding scope=plan id=p3-r16-resolved created=2026-10-05T08:17:52+00:00 phase=3 state=open resolves=p3-r16 out_of_scope=true -->
### p3-r16-resolved · finding [out-of-scope] · resolves p3-r16: Child boxes may touch exactly; no-slot fallback untested (phase 3)

Cosmetic; revisit with real assets in plan 2.

<!-- fr:journal kind=finding scope=plan id=p3-r17-resolved created=2026-10-05T08:17:52+00:00 phase=3 state=open resolves=p3-r17 out_of_scope=true -->
### p3-r17-resolved · finding [out-of-scope] · resolves p3-r17: Siblings share the slowest speed, deviating from per-text speed (phase 3)

Deliberate (p3-r18); spec wording to be amended with plan 2 spec updates.
