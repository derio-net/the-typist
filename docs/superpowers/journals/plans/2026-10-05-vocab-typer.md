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
