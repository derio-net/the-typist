# Journal: 2026-10-05-vocab-typer

<!-- fr:journal kind=discovery scope=spec id=brief created=2026-10-05T06:37:02+00:00 input=true -->
### brief · discovery · Operator brief (verbatim)

I want to build a ZType game clone (https://zty.pe). It should be able to accept a List and display the entries in such a way for it to be instructive and conductive to learning. My goal is not only typing, but learning vocabulary, rules and how to use the language. As an initial list I have the 1000 most common B2 words in German. This list is only the seed, the input of the game will be some other structure, probably a yaml that allows more control. The atomic part is a "Record". As the game is played, for each selected list I should be presented with the Records in random order, as would happen with ZType, but each Record is presented according to its rules. As an example, a verb is shown in various ways: the english translation, the german verb, N x usages in a sentence (2+) where tenses and forms are shown. I have added a seed list (wordlist.raw.txt) for the 1000 most common german words for B2 that helpfully separates the list in categories, e.g. 18. Politics & International Relations. This can be part of the Record so Records of the same category can be in one Wave. If a wordlist has no categories, then the Waves can be decided in some other way. For nouns, it should be similar but I want to see multiple sentences, using the noun in plural and singular form. We should have a Skill to turn raw lists into structured Records and another Skill to organize and enrich the Records with sentences etc.

<!-- fr:journal kind=decision scope=spec id=isolation-profile created=2026-10-05T06:37:02+00:00 -->
### isolation-profile · decision · Single dev devcontainer profile (node+uv+python), no secrets

Operator chose fr-init; one least-privileged dev profile.

<!-- fr:journal kind=decision scope=spec id=copy-typing created=2026-10-05T06:37:02+00:00 -->
### copy-typing · decision · Play is copy-typing only

Operator chose copy-typing over recall/cloze; learning comes from context shown around typed text.

<!-- fr:journal kind=decision scope=spec id=mothership created=2026-10-05T06:37:02+00:00 -->
### mothership · decision · Record = mothership + forms ship + sentence escorts

Operator chose mothership+escorts over independent or staged enemies.

<!-- fr:journal kind=decision scope=spec id=input-rules created=2026-10-05T06:37:02+00:00 -->
### input-rules · decision · Literal matching with ae/oe/ue/ss fallback; final punctuation auto-skipped

Operator also noted Mac UK layout uses Option-U dead key for umlauts; engine must treat Dead keys as neutral.

<!-- fr:journal kind=decision scope=spec id=srs created=2026-10-05T06:37:02+00:00 -->
### srs · decision · Full FSRS spaced repetition, graded from typing performance

Operator chose full SRS over local stats / stateless.

<!-- fr:journal kind=decision scope=spec id=session created=2026-10-05T06:37:02+00:00 -->
### session · decision · Study = due + capped new, waves by category; free play also updates SRS

Operator choice.

<!-- fr:journal kind=decision scope=spec id=delivery created=2026-10-05T06:37:02+00:00 -->
### delivery · decision · Bundled lists + load-your-own YAML; static hosting

Operator choice.

<!-- fr:journal kind=decision scope=spec id=aids created=2026-10-05T06:37:02+00:00 -->
### aids · decision · Grammar chip, translation, TTS, recap card — all toggleable

Operator selected all four and asked for each to be toggleable.

<!-- fr:journal kind=decision scope=spec id=approach created=2026-10-05T06:37:02+00:00 -->
### approach · decision · Approach A: all-TypeScript, Vite + Canvas 2D, shared zod schema, ts-fsrs

Operator chose A over Python tooling or Phaser.

<!-- fr:journal kind=decision scope=spec id=seed-scope created=2026-10-05T06:37:02+00:00 -->
### seed-scope · decision · Enrich the full 1000-word seed as part of this feature

Operator approved Section 2 including full seed enrichment.

<!-- fr:journal kind=finding scope=spec id=s1 created=2026-10-05T06:43:38+00:00 state=open review_scope=in -->
### s1 · finding [open] (reviewer: in scope) · R14 parser rules miss most seed line shapes

severity: high

<!-- fr:journal kind=finding scope=spec id=s2 created=2026-10-05T06:43:38+00:00 state=open review_scope=in -->
### s2 · finding [open] (reviewer: in scope) · R16 entry→record mapping and duplicates undefined

severity: high

<!-- fr:journal kind=finding scope=spec id=s3 created=2026-10-05T06:43:38+00:00 state=open review_scope=in -->
### s3 · finding [open] (reviewer: in scope) · Untypeable characters in typed text

severity: high

<!-- fr:journal kind=finding scope=spec id=s4 created=2026-10-05T06:43:38+00:00 state=open review_scope=in -->
### s4 · finding [open] (reviewer: in scope) · Dead-key handling targeted the wrong events/layer

severity: high

<!-- fr:journal kind=finding scope=spec id=s5 created=2026-10-05T06:43:38+00:00 state=open review_scope=in -->
### s5 · finding [open] (reviewer: in scope) · Grade bands gap and undefined metrics

severity: medium

<!-- fr:journal kind=finding scope=spec id=s6 created=2026-10-05T06:43:38+00:00 state=open review_scope=in -->
### s6 · finding [open] (reviewer: in scope) · Types do not fit adverbs/connectors/X sein; government verb-only

severity: medium

<!-- fr:journal kind=finding scope=spec id=s7 created=2026-10-05T06:43:38+00:00 state=open review_scope=in -->
### s7 · finding [open] (reviewer: in scope) · No mandate to correct source errors

severity: medium

<!-- fr:journal kind=finding scope=spec id=s8 created=2026-10-05T06:43:38+00:00 state=open review_scope=in -->
### s8 · finding [open] (reviewer: in scope) · Dedupe ids contradicts frozen ids; list-level checks unspecified

severity: medium

<!-- fr:journal kind=finding scope=spec id=s9 created=2026-10-05T06:43:38+00:00 state=open review_scope=in -->
### s9 · finding [open] (reviewer: in scope) · Free play for uncategorised lists and new-cap interaction

severity: medium

<!-- fr:journal kind=finding scope=spec id=s10 created=2026-10-05T06:43:38+00:00 state=open review_scope=in -->
### s10 · finding [open] (reviewer: in scope) · Raw records in play and plural-only forms ship

severity: medium

<!-- fr:journal kind=finding scope=spec id=s11 created=2026-10-05T06:43:38+00:00 state=open review_scope=in -->
### s11 · finding [open] (reviewer: in scope) · Test plan gaps

severity: medium

<!-- fr:journal kind=finding scope=spec id=s12 created=2026-10-05T06:43:38+00:00 state=open review_scope=in -->
### s12 · finding [open] (reviewer: in scope) · YAML import and Pages base/deploy

severity: low

<!-- fr:journal kind=finding scope=spec id=s13 created=2026-10-05T06:43:38+00:00 state=open review_scope=in -->
### s13 · finding [open] (reviewer: in scope) · R4 omits adjective forms ship

severity: low

<!-- fr:journal kind=finding scope=spec id=s14 created=2026-10-05T06:43:38+00:00 state=open review_scope=in -->
### s14 · finding [open] (reviewer: in scope) · Overdue ordering lost; meta counter underspecified

severity: low

<!-- fr:journal kind=finding scope=spec id=s15 created=2026-10-05T06:43:38+00:00 state=open review_scope=in -->
### s15 · finding [open] (reviewer: in scope) · Seed/CLAUDE.md untracked; CLAUDE.md update

severity: low

<!-- fr:journal kind=review scope=spec id=spec-review created=2026-10-05T06:43:38+00:00 -->
### spec-review · review · independent spec review: 15 findings, all in scope

fr-spec-reviewer, read-only, separate context. All findings fixed in the revised spec.

<!-- fr:journal kind=finding scope=spec id=s1-resolved created=2026-10-05T06:43:38+00:00 state=fixed resolves=s1 -->
### s1-resolved · finding [fixed] · resolves s1: R14 parser rules miss most seed line shapes

Parser section added: entry = lines with " – ", shape table incl. plural forms, dual-gender rule, parentheticals, idiom guard; everything else to unresolved with expansion rules; fixture per shape.

<!-- fr:journal kind=finding scope=spec id=s2-resolved created=2026-10-05T06:43:38+00:00 state=fixed resolves=s2 -->
### s2-resolved · finding [fixed] · resolves s2: R16 entry→record mapping and duplicates undefined

Multi-lemma lines split by stated rules; duplicates merged by organise with categories[] + source_lines unioned; R16 now = source_lines cover all 1000 lines, 20 categories, all enriched; seed test added.

<!-- fr:journal kind=finding scope=spec id=s3-resolved created=2026-10-05T06:43:38+00:00 state=fixed resolves=s3 -->
### s3-resolved · finding [fixed] · resolves s3: Untypeable characters in typed text

Forms separator now ", "; R6 equivalence table for quotes/dashes/₂; R3 typeability check rejects templates and stray chars; enrich rewrites templates.

<!-- fr:journal kind=finding scope=spec id=s4-resolved created=2026-10-05T06:43:38+00:00 state=fixed resolves=s4 -->
### s4-resolved · finding [fixed] · resolves s4: Dead-key handling targeted the wrong events/layer

Keyboard capture section: ignore composing input events, take compositionend, drop uncomposed marks, clear input; jsdom tests with composition sequences.

<!-- fr:journal kind=finding scope=spec id=s5-resolved created=2026-10-05T06:43:38+00:00 state=fixed resolves=s5 -->
### s5-resolved · finding [fixed] · resolves s5: Grade bands gap and undefined metrics

R7 now a total ordering with typo rate = typos/expected chars and speed = chars / summed lock-to-destroy seconds; boundary tests.

<!-- fr:journal kind=finding scope=spec id=s6-resolved created=2026-10-05T06:43:38+00:00 state=fixed resolves=s6 -->
### s6-resolved · finding [fixed] · resolves s6: Types do not fit adverbs/connectors/X sein; government verb-only

Type-assignment rules added (these are phrase; modal triple split into verbs); government and abbreviation shared on all types.

<!-- fr:journal kind=finding scope=spec id=s7-resolved created=2026-10-05T06:43:38+00:00 state=fixed resolves=s7 -->
### s7-resolved · finding [fixed] · resolves s7: No mandate to correct source errors

R15 organise verifies/corrects gender, plural, plural_only, recorded in source_note.

<!-- fr:journal kind=finding scope=spec id=s8-resolved created=2026-10-05T06:43:38+00:00 state=fixed resolves=s8 -->
### s8-resolved · finding [fixed] · resolves s8: Dedupe ids contradicts frozen ids; list-level checks unspecified

R1 list-level checks (unique ids, declared categories, categorised); R15 merges duplicate lemmas, edits anything but id; id freezing stated.

<!-- fr:journal kind=finding scope=spec id=s9-resolved created=2026-10-05T06:43:38+00:00 state=fixed resolves=s9 -->
### s9-resolved · finding [fixed] · resolves s9: Free play for uncategorised lists and new-cap interaction

R9: uncategorised free play = whole list; free-play first grades count toward cap; R13 reworded to "study session would be empty".

<!-- fr:journal kind=finding scope=spec id=s10-resolved created=2026-10-05T06:43:38+00:00 state=fixed resolves=s10 -->
### s10-resolved · finding [fixed] · resolves s10: Raw records in play and plural-only forms ship

R11/Sessions: raw never played, zero-playable message; R4/table: no forms ship for plural-only, no-plural, non-gradable, phrases.

<!-- fr:journal kind=finding scope=spec id=s11-resolved created=2026-10-05T06:43:38+00:00 state=fixed resolves=s11 -->
### s11-resolved · finding [fixed] · resolves s11: Test plan gaps

Testing expanded: settings/storage/TTS fallbacks, loader errors, vite plugin, seed test, Playwright via setInputFiles; skill judgement steps verified manually.

<!-- fr:journal kind=finding scope=spec id=s12-resolved created=2026-10-05T06:43:38+00:00 state=fixed resolves=s12 -->
### s12-resolved · finding [fixed] · resolves s12: YAML import and Pages base/deploy

vite-plugin-lists transforms YAML to validated JSON modules; base /the-typist/; R12 Pages workflow in repo.

<!-- fr:journal kind=finding scope=spec id=s13-resolved created=2026-10-05T06:43:38+00:00 state=fixed resolves=s13 -->
### s13-resolved · finding [fixed] · resolves s13: R4 omits adjective forms ship

R4 includes adjective comparative and superlative when gradable.

<!-- fr:journal kind=finding scope=spec id=s14-resolved created=2026-10-05T06:43:38+00:00 state=fixed resolves=s14 -->
### s14-resolved · finding [fixed] · resolves s14: Overdue ordering lost; meta counter underspecified

Categories ordered by most overdue card; separate meta store, local date, increment on first grade.

<!-- fr:journal kind=finding scope=spec id=s15-resolved created=2026-10-05T06:43:38+00:00 state=fixed resolves=s15 -->
### s15-resolved · finding [fixed] · resolves s15: Seed/CLAUDE.md untracked; CLAUDE.md update

Both committed on the branch (1569f7e); CLAUDE.md update added to layout/scope.

<!-- fr:journal kind=decision scope=spec id=phase-split-2026-10-05-vocab-typer-p2 created=2026-10-05T06:55:03+00:00 -->
### phase-split-2026-10-05-vocab-typer-p2 · decision · ask: R14 parser and structure skill

<!-- fr:journal kind=decision scope=spec id=phase-split-2026-10-05-vocab-typer-p3 created=2026-10-05T06:55:05+00:00 -->
### phase-split-2026-10-05-vocab-typer-p3 · decision · ask: R4-R6 typing core and ships
