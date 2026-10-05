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
