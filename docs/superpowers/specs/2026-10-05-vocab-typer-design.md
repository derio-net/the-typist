# the-typist — ZType-style vocabulary typing game: design

Date: 2026-10-05 · Branch: `feat/vocab-typer` · Status: approved in brainstorm, revised after spec review

## Goal

A browser typing shoot-'em-up in the style of ZType whose purpose is learning a
language (vocabulary, grammar rules, usage), not only typing. Its content is a
structured YAML list of **Records**. Each Record is presented according to the
rules for its type. The first list is built from `wordlist.raw.txt`, which has
1000 German B2 entry lines in 20 themed sections (numbered 1–21, with 10
missing). Two Claude Code skills produce lists: one structures raw lists, the
other organises and enriches them.

## Requirements

R1. A list is a YAML file of Records (schema version 1) with a list header, an optional set of categories, and records; one shared schema module validates it everywhere it is read, including list-level checks: ids are unique, every category a record names is declared, and in a list that declares categories every record names at least one.
R2. A Record has a stable id, a type (`noun`, `verb`, `adjective`, `phrase`), a lemma, one or more glosses, zero or more categories, a status (`raw`, `enriched`, `reviewed`), the source lines it came from, an optional government (e.g. `in + Akk.`) and abbreviation, type-specific grammar fields, and example sentences with English translations and grammar tags.
R3. Enriched or reviewed Records must satisfy per-type rules: noun ≥3 examples with at least one singular and one plural (unless it has no plural or is plural-only); verb ≥3 examples across ≥2 distinct tenses, and a separable verb has one example with the prefix split; adjective ≥2 examples including an attributive form, plus a comparative/superlative example when gradable; phrase ≥2 examples. A list header may raise the example minimums. All typed text (display form, forms, example sentences) must be typeable: after the input-equivalence table in R6 is applied, it uses only letters (including ä ö ü ß), digits, spaces and ASCII punctuation, and contains no templates such as `(r)` or `...`.
R4. A Record appears in play as a mothership carrying its display form (article + noun, infinitive, adjective, or full phrase) and its gloss; destroying it releases a forms ship (noun plural; verb principal parts with auxiliary; adjective comparative and superlative when gradable) and one escort ship per example sentence. Plural-only nouns, nouns without a plural, non-gradable adjectives and phrases have no forms ship.
R5. Play is copy-typing: the player types exactly the text shown on a ship; the first keystroke locks onto the ship whose text it matches, and later keystrokes go only to that ship until it is destroyed.
R6. Matching is case- and umlaut-sensitive and accepts typed equivalents: `ae`/`oe`/`ue`/`ss` (and capitalised variants) for `ä`/`ö`/`ü`/`ß`, ASCII `'` for ’ ‘, ASCII `"` for „ “ ” « », `-` for – —, `2` for `₂`. Composition from macOS dead keys (e.g. Option-U then A) yields the composed letter, and the dead-key mark is never counted as a typo. A sentence's final punctuation is pre-typed; mid-sentence punctuation must be typed.
R7. The game keeps spaced-repetition (FSRS) state per Record per list in the browser. Each Record is graded once, when its last ship is resolved: Again if any of its ships reached the player; otherwise Hard if typos ÷ expected characters exceeds 0.10; otherwise Easy if it had no typos and its typing speed (expected characters ÷ seconds from lock to destruction, summed over its ships) exceeds 2.5 characters per second; otherwise Good.
R8. A Study session for a chosen list contains the `enriched`/`reviewed` Records that are due plus up to a daily cap of new Records (default 10), grouped into waves by category (max 6 motherships per wave, shuffled within the wave). Categories are played most-overdue first. A list without categories is chunked into waves in record order.
R9. Free play runs every `enriched`/`reviewed` Record of one chosen category (or, for a list without categories, the whole list in record order), regardless of due dates. Its results also update SRS state, and a Record first graded in free play counts toward that day's new-Record cap.
R10. Four learning aids, each toggleable in settings and remembered: a grammar chip on each sentence ship, the English translation under each sentence ship, German text-to-speech of a destroyed ship's text, and a post-wave recap card for each Record graded Again or Hard, showing its forms and sentences.
R11. Lists in the repository's `lists/` directory are validated at build time, and an invalid list fails the build; valid lists are bundled. The player can also load a YAML file from disk, which is validated in the browser and, if invalid, rejected with per-record error messages. `raw` Records in a valid list are never played.
R12. The game is a static site deployed to GitHub Pages by a workflow in the repository.
R13. When a study session would be empty, the game offers free play; when browser storage is unavailable, it warns and plays without saving SRS state or settings; when no German voice exists, the TTS toggle is disabled with an explanation.
R14. A `typist-structure` skill turns a raw word list into a `raw`-status list. A deterministic parser handles the documented line shapes (see Parser) and reports every other entry line as unresolved. Then the skill resolves those lines, proposes categories (with operator confirmation) when the source has none, and finishes only when validation passes.
R15. A `typist-enrich` skill organises and enriches a list. Organising merges duplicate lemmas into one Record, checks categories, and verifies and corrects gender, plural and plural-only, recording each correction in the Record's `source_note`. It may edit any field of any Record except `id`. Enriching moves `raw` Records to `enriched` in batches of about 25 per turn, satisfying R3, and validates and commits after each batch. It resumes after an interruption from the remaining `raw` Records and never sets `reviewed`.
R16. The repository ships `lists/de-b2-1000.yaml`, built from `wordlist.raw.txt` with both skills: every one of the 1000 entry lines is covered by at least one Record's source lines, the 20 source sections are its 20 categories, every Record is `enriched`, and the list passes validation.

## Design

### Stack

TypeScript + Vite, a hand-rolled Canvas 2D game loop, `zod` for the schema,
`yaml` for parsing, `ts-fsrs` for scheduling, IndexedDB for SRS state,
`localStorage` for settings, Vitest (with jsdom for platform code) for unit
tests, Playwright for one smoke test. Node tooling CLIs run with `tsx`.
The devcontainer also provisions Python and uv; the game doesn't use them.

### Repository layout

```
lists/                    enriched lists (de-b2-1000.yaml); validated + bundled at build
wordlist.raw.txt          seed source, tracked, never edited; corrections live in the list
tools/cli.ts              `parse <raw.txt> [-o out.yaml]`, `validate <list.yaml…>`
tools/vite-plugin-lists.ts  transforms lists/*.yaml into validated JSON modules; fails the build on error
.claude/skills/typist-structure/SKILL.md
.claude/skills/typist-enrich/SKILL.md
.github/workflows/pages.yml  build + test + deploy to GitHub Pages on push to main
src/schema/               zod schema, per-type rules, list-level checks, typeability check
src/content/              bundled-list loader + file-picker loader
src/srs/                  ts-fsrs wrapper, grade.ts, IndexedDB store
src/session/              study-session + free-play builders, wave chunking
src/engine/               TypingEngine, World (pure, fixed timestep, no DOM)
src/render/               Canvas 2D renderer
src/platform/             keyboard capture (hidden input), TTS, settings store
src/ui/                   menus, recap card, summary
CLAUDE.md                 updated: npm scripts, single-test command, architecture, 20 sections
```

`vite.config.ts` sets `base: '/the-typist/'` for the Pages project site.

### Schema (`src/schema`)

```yaml
schema: 1
list: { id: de-b2-1000, title: "German B2 – 1000 words", lang: de, gloss_lang: en,
        rules: { noun_examples: 3, verb_examples: 3 } }      # rules optional
categories:
  - { id: economics-finance, title: "Economics & Finance", order: 13 }
records:
  - id: noun-boerse
    type: noun
    categories: [economics-finance]   # first entry is the primary category
    status: enriched
    source_lines: [1272]              # 1-based line numbers in the source file
    lemma: Börse
    gloss: [stock exchange]
    noun: { gender: f, plural: Börsen }   # plural: null → no plural; plural_only: true
    # variants: [{ lemma: Anlegerin, gender: f, plural: Anlegerinnen }]
    examples:
      - { de: "Die Börse schloss gestern mit leichten Verlusten.",
          en: "The stock exchange closed with slight losses yesterday.",
          tags: [singular, Präteritum] }
  - id: verb-anlegen
    type: verb
    lemma: anlegen
    gloss: [to invest]
    government: "in + Akk."           # shared by all types, optional
    verb: { separable: an, auxiliary: haben, reflexive: false,
            parts: { praesens_3sg: "legt an", praeteritum: "legte an", partizip2: "angelegt" } }
    examples: [...]
  # abbreviation: "KI"                 shared, optional (from "(KI)" in the source)
  # source_note: "source had 'die Cybermobbing'; corrected to das"   optional
  # adjective: { gradable: true, comparative: wichtiger, superlative: am wichtigsten }
  # phrase:    { register: formal|informal|neutral, literal: "..." }   (both optional)
```

**Ids**
- An id is `<type>-<ascii-lemma>` (ä→ae, ö→oe, ü→ue, ß→ss, lowercase,
  non-alphanumerics → `-`).
- The rare remaining collision between different words gets a
  disambiguating suffix: gender for nouns (`noun-see-m`, `noun-see-f`),
  otherwise `-2` in source order.
- Once a list is committed, its ids are frozen: SRS state is keyed on
  `listId:recordId`, and no tool regenerates or renames an existing id.

**Status and checks**
- `raw` records need only id, type, lemma, gloss and source_lines. The type
  block and examples are optional.
- The R3 rules are zod `superRefine`s on `enriched` and `reviewed` records.
  Example tags are free strings, but a fixed vocabulary is recognised:
  `singular`, `plural`, `separated`, `attributive`, `comparative`,
  `superlative`, and tenses/moods (`Präsens`, `Präteritum`, `Perfekt`,
  `Plusquamperfekt`, `Futur I`, `Konjunktiv II`, `Passiv`, `Imperativ`). The
  rules count only recognised tags.
- List-level `superRefine`s enforce R1: unique ids, declared categories, and
  every record categorised when the list declares categories.
- The typeability check (R3) maps each typed string through the R6
  equivalence table. It then rejects any remaining character outside
  `[A-Za-zÄÖÜäöüß0-9 .,;:!?'"()\-/%&+]`, as well as `(r)`, `(e)`, `...` and `…`.
- `validate` prints one line per error: `list.yaml: records[12] (verb-anlegen): <message>`.

**Type assignment**
- **noun:** article plus a capitalised noun, optionally with a declined
  adjective (`das akademische Jahr`).
- **verb:** infinitives, including reflexive (`sich anmelden`) and separable.
  The modal triple on source line 516 is split into the three infinitives
  (`dürfen`, `mögen`, `können`), each with a Konjunktiv II example.
- **adjective:** adjectives that are used attributively.
- **phrase:** everything else. That covers idioms (including those starting
  with an article, such as `die Daumen drücken`), fixed formulae, adverbs and
  connectors (`jedoch`, `abschließend`), copula constructions
  (`verschuldet sein`), and multi-word expressions (`ethisch vertretbar`).

### Parser (`tools/cli.ts parse`)

Only lines containing ` – ` (space, U+2013, space) are entry lines. Every
other line (headers excepted) is skipped silently: intro prose, "Usage
Notes:" blocks, stray text. The split happens on the first ` – ` only, and
dashes are never normalised before splitting.

**Recognised shapes.** Each has one Vitest fixture from the seed.

| shape | example | result |
|---|---|---|
| section header: emoji + `N.` + title | `💶 13. Economics & Finance` | category `{id: slug(title), title, order: N}` |
| article + capitalised noun [+ plural] | `die Börse, -n` | noun f, plural `Börsen` |
| article + adjective + capitalised noun | `das akademische Jahr` | noun |
| plural forms | `, -n` `, -e` `, -s` `, -` (unchanged) `, -länder` `, Ämter` `, Museen` `, -men` | full plural, or `needs_plural: true` → unresolved when it is a stem/umlaut form the parser can't build |
| `(pl.)` | `die Nebenkosten (pl.)` | noun, plural_only |
| dual gender | `der Dozent / die Dozentin`, `der/die Vorgesetzte` | one noun + `variants`, only if the second lemma is the same lemma, or the first lemma's stem (minus final `-e`, with optional umlaut) + `in` |
| article-less lowercase single word or `sich …` | `publizieren`, `sich anmelden` | verb if it ends in `-en`/`-ern`/`-eln`, else unresolved |
| parenthetical government | `anlegen (in)`, `(an + D)` | `government` |
| parenthetical abbreviation | `die künstliche Intelligenz (KI)` | `abbreviation` |
| postposed `(sich)` | `freuen (sich)` | reflexive verb |

**Sent to `unresolved:`** (with line number and reason), for the skill to
decide:
- every other slash line: distinct words, opposites, synonym pairs,
  shared-head pairs such as `die Hauptrolle / Nebenrolle`;
- lists of three or more items;
- `und` compounds;
- article lines whose second token isn't capitalised (idioms);
- template phrases (`Sehr geehrte(r)...`);
- plural forms the parser can't build.

The skill expands these by these rules:
- a pair of distinct words becomes one record each, and each takes its own
  side of a `/`-split gloss;
- a synonym pair with one gloss becomes two records with the same gloss;
- a shared head is expanded into full lemmas;
- templates become full typeable phrases, with the original kept in
  `source_note`.

### Display forms

| type | mothership | forms ship |
|---|---|---|
| noun | `die Börse` (variants: `der Anleger / die Anlegerin`) | `die Börsen`; none if plural is null or plural_only |
| verb | `anlegen` (reflexive: `sich anmelden`) | `legte an, hat angelegt` |
| adjective | `wichtig` | `wichtiger, am wichtigsten` (only if gradable) |
| phrase | full phrase | none |

The gloss is shown beneath the mothership and is never typed. The separator
in forms ships is `, `, so it can be typed on any keyboard.

### Keyboard capture (`src/platform/keyboard`)

- A hidden, always-focused `<input>` receives all typing.
- `input` events whose `isComposing` is true or whose `inputType` is
  `insertCompositionText` are ignored. Committed text comes from
  `compositionend.data` and from non-composing `input` events.
- After each read, the input is cleared.
- In committed text, a standalone combining mark that didn't compose
  (`¨ ´ ` ^ ~`) is dropped. So Option-U then A yields `ä`, and Option-U then X
  yields `x` with no typo.
- Committed characters are passed to the engine one by one.
- This layer is tested in Vitest + jsdom with synthetic event sequences:
  - plain keys;
  - Option-U + A (compositionstart → input(insertCompositionText "¨") →
    compositionend "ä");
  - Option-U + X;
  - Option-S (`ß` as a plain input).

### Typing engine (`src/engine/TypingEngine`)

- The engine is pure: (state, char) → (state, events). It is unit-tested
  with table-driven cases.
- **Target lock:** with no lock, a character locks onto the ship closest to
  the player whose next expected text accepts it. With a lock, characters go
  only to that ship. A non-matching character counts as a typo for the locked
  Record. Backspace is a no-op, as in ZType.
- **Equivalence (R6):** an expected `ä` accepts `ä`, or `a` followed by `e`.
  After `a`, the engine holds a pending state that accepts only `e`. Likewise
  `ö`/`oe`, `ü`/`ue`, `ß`/`ss`, and the capitals `Ä`/`Ae`. Expected
  ’ ‘ „ “ ” « » – — ₂ also accept their ASCII equivalents.
- **Final punctuation:** trailing `.`, `!`, `?`, `…` and closing quotes are
  marked pre-typed when the ship spawns.
- **Timing:** each ship records its lock time and destroy time, for R7.

### World and waves (`src/engine/World`)

- The world runs a fixed 60 Hz step. Motherships fall straight toward the
  player. Their speed rises per wave, and long texts fall more slowly (speed
  divided by the square root of length over a reference length).
- Destroying a mothership breaks it up. Its forms ship (if any) and its
  escorts burst out of the wreck: each child gets a random sideways velocity
  and a short upward kick that decays. After that the children drift down at
  one shared, slower speed.
- Children bounce off the left and right screen edges, and off each other
  horizontally, so sentences stay readable. The locked ship is drawn on top.
  No child spawns closer to the player than a minimum reaction distance.
- All randomness comes from a seeded generator passed into the World, so tests
  are deterministic. Every motion constant (speeds, burst velocities, kick
  decay, reaction distance) lives in one tunable block.
- A ship reaching the player costs a life (default 3), and the session ends
  at 0 lives. Score depends on characters and accuracy.
- A wave ends when all its Records are resolved. Each Record is graded once,
  when its last ship is destroyed or escapes, using `srs/grade.ts` (R7).
  Grading tests cover the boundaries: typo rate exactly 0.10, speed exactly
  2.5 cps, and one escape with zero typos.

### SRS (`src/srs`)

- `ts-fsrs` runs with default parameters.
- The IndexedDB database `typist` has two object stores:
  - `cards`, key `listId:recordId`, holding the FSRS card plus counters
    (seen, typos, escapes);
  - `meta`, key `new:<listId>:<local yyyy-mm-dd>`, holding the count of
    Records first graded that day. It is incremented on a Record's first
    grade, in study or free play.

### Sessions (`src/session`)

Only `enriched` and `reviewed` Records are played; `raw` Records are skipped.
A Record's wave grouping uses its primary (first) category.

- **Study:**
  - Take the due cards, plus never-graded Records in list order up to the
    remaining daily cap.
  - Group them by primary category. Order the categories by their most
    overdue card, with categories holding only new Records last, in category
    `order`.
  - Chunk into waves of ≤6, shuffled within each wave.
- **Free play:** every playable Record whose `categories` include the chosen
  one, shuffled, in waves of ≤6. On an uncategorised list it covers the whole
  list in record order.
- **Uncategorised lists:** Records are chunked in list order.
- **Empty study session:** the game offers free play (R13).
- **No playable Records:** a list with zero playable Records loads, but shows
  "no enriched records to play".

### Learning aids (`src/platform`, `src/ui`)

There are four toggles in settings, stored in `localStorage`, all on by
default:
- **Grammar chip:** a sentence ship's recognised tags.
- **Translation:** the English line under each sentence ship.
- **TTS:** uses `speechSynthesis` with the first `de-*` voice. If no German
  voice exists, the toggle is disabled with a note.
- **Recap:** between waves, one card per Record graded Again or Hard,
  showing its display form, gloss, forms, and all its sentences with
  translations.

If `localStorage` or IndexedDB throws, a banner says progress and settings
won't be saved, and the game uses in-memory stores.

### Content loading (`src/content`)

- **Build time:** `tools/vite-plugin-lists.ts` reads each `lists/*.yaml`,
  validates it with the shared schema, and turns it into a JSON module.
  `src/content` loads these with `import.meta.glob`. Any error fails the
  build and names the file and record.
- **Runtime:** a "Load list…" file picker parses and validates the file. An
  invalid file is rejected with its errors listed. A valid one is held for
  the session, while its SRS state persists under its `list.id`.

### Skills (`.claude/skills/`)

**`typist-structure`**
1. Runs `tools/cli.ts parse`, which emits the YAML plus an `unresolved:`
   section.
2. Resolves each unresolved line by the Parser rules above.
3. Proposes thematic categories, and asks the operator to confirm them, when
   the source has none.
4. Removes `unresolved:` and runs `validate`.

**`typist-enrich`**
1. **Organise.** This pass:
   - merges Records with the same type and lemma into one. Their
     `categories` and `source_lines` are unioned, the id is the first
     Record's, and glosses are merged;
   - checks categories;
   - fixes mis-typed Records;
   - verifies gender, plural and plural_only against its own German
     knowledge (e.g. `die Cybermobbing` → `das`, `der Müll` → no plural),
     recording each change in `source_note`.

   It may edit any field of any Record except `id`, so merging happens
   before a list is first committed, and later merges keep the surviving id.
2. **Enrich.** Loops over `raw` records in batches of about 25. For each
   batch it fills the type block and examples to satisfy R3, including
   typeability, sets `status: enriched`, runs `validate`, fixes errors, and
   commits.
3. There is no per-record `claude -p`. A run can stop at any point, and the
   next run continues from the remaining `raw` records.
4. It never writes `reviewed`.

These skills' judgement steps (resolution, merging, correction) are verified
manually on the seed run. Their outputs are verified by the tests below.

### Testing

**Vitest**
- schema: per-type rules, list-level checks, and typeability, with valid and
  invalid fixtures;
- parser: one fixture per shape in the Parser table, plus the
  `unresolved:` cases;
- keyboard capture (jsdom event sequences);
- TypingEngine: lock, typos, the equivalence table, auto-skip and timing;
- grading boundaries;
- sessions: due ordering, new cap shared with free play, raw exclusion,
  uncategorised free play, and the forms-ship rules for plural-only nouns;
- settings store with `localStorage` stubbed to throw;
- the IndexedDB-unavailable fallback;
- TTS voice selection with no `de-*` voice;
- the file-picker loader's per-record error list;
- the Vite plugin rejecting an invalid fixture.

**Seed test (`lists/de-b2-1000.yaml`)**
- passes validation;
- has exactly the 20 category ids derived from the source headers;
- every record is `enriched`;
- the union of `source_lines` covers all 1000 ` – ` lines of
  `wordlist.raw.txt`.

**Playwright smoke**
- A fixture list with two Records is loaded through the file picker
  (`setInputFiles`), so it is never bundled.
- The test types the mothership, forms and escorts, including an `ae`
  fallback, then checks that the recap appears and that the SRS card exists
  in IndexedDB.

**Deploy:** the Pages workflow runs `npm test` and `npm run build` before
deploying.

### Out of scope

Accounts or sync; any server; recall/cloze modes (copy-typing only); in-game
LLM calls; audio other than browser TTS; mobile/touch play; other languages'
grammar rules. The schema is German-shaped, and `lang` is recorded for later.

## Implementation Plans

| Plan | Repo | File | Depends on |
|------|------|------|------------|
| 2026-10-05-vocab-typer | `derio-net/the-typist` | `2026-10-05-vocab-typer` | — |
