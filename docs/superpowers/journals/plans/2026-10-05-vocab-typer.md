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
