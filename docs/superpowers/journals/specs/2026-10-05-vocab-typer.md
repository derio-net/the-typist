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
