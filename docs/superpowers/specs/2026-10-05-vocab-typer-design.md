# the-typist — ZType-style vocabulary typing game: design

Date: 2026-10-05 · Branch: `feat/vocab-typer` · Status: approved in brainstorm

## Goal

A browser typing shoot-'em-up in the style of ZType whose purpose is learning a
language (vocabulary, grammar rules, usage), not only typing. Its content is a
structured YAML list of **Records**. Each Record is presented according to the
rules for its type. The first list is built from `wordlist.raw.txt`, which has
1000 German B2 words grouped into 20 themed sections. Two Claude Code skills
produce lists: one structures raw lists, the other organises and enriches them.

## Requirements

R1. A list is a YAML file of Records (schema version 1) with a list header, an optional set of categories, and records; one shared schema module validates it everywhere it is read.
R2. A Record has a stable id, a type (`noun`, `verb`, `adjective`, `phrase`), lemma, one or more glosses, an optional category, a status (`raw`, `enriched`, `reviewed`), type-specific grammar fields, and example sentences with English translations and grammar tags.
R3. Enriched or reviewed Records must satisfy per-type rules: noun ≥3 examples with at least one singular and one plural (unless it has no plural or is plural-only); verb ≥3 examples across ≥2 distinct tenses, and a separable verb has one example with the prefix split; adjective ≥2 examples including an attributive form, plus a comparative/superlative example when gradable; phrase ≥2 examples. A list header may raise the example minimums.
R4. A Record appears in play as a mothership carrying its display form (article + noun, infinitive, adjective, or full phrase) and its gloss; destroying it releases a forms ship (noun plural, or verb principal parts with auxiliary) and one escort ship per example sentence.
R5. Play is copy-typing: the player types exactly the text shown on a ship; the first keystroke locks onto the ship whose text it matches, and later keystrokes go only to that ship until it is destroyed.
R6. Matching is case- and umlaut-sensitive, accepts `ae`/`oe`/`ue`/`ss` (and capitalised variants) as typed equivalents of `ä`/`ö`/`ü`/`ß`, treats macOS dead-key events (e.g. Option-U then A) as neutral rather than as typos, and auto-skips a sentence's final punctuation while still requiring mid-sentence punctuation.
R7. The game keeps spaced-repetition (FSRS) state per Record per list in the browser, and each Record's grade comes from performance: Again if any of its ships reached the player, Hard if its typo rate exceeds 10%, Good if clean, Easy if clean and faster than the target characters-per-second.
R8. A Study session for a chosen list contains the Records that are due plus up to a daily cap of new Records (default 10), grouped into waves by category (max 6 motherships per wave, shuffled within the wave); a list without categories is chunked into waves in record order.
R9. Free play runs every Record of one chosen category regardless of due dates, and its results also update the SRS state.
R10. Four learning aids, each toggleable in settings and remembered: a grammar chip on each sentence ship, the English translation under each sentence ship, German text-to-speech of a destroyed ship's text, and a post-wave recap card for each Record graded Again or Hard, showing its forms and sentences.
R11. Lists in the repository's `lists/` directory are validated at build time and bundled; the player can also load a YAML file from disk, which is validated in the browser and, if invalid, rejected with per-record error messages.
R12. The game is a static site that can be hosted on GitHub Pages.
R13. When nothing is due and the daily new cap is used up, the game offers free play; when browser storage is unavailable, it warns and plays without saving SRS state; when no German voice exists, the TTS toggle is disabled with an explanation.
R14. A `typist-structure` skill turns a raw word list into a `raw`-status list: a deterministic parser handles known line shapes (section headers → categories, `<article> <Lemma>[, -suffix] – <glosses>`, dual-gender pairs, `(pl.)`, article-less verbs, `x / y` pairs) and reports lines it can't classify; the skill resolves those, expands irregular plurals, proposes categories (with operator confirmation) when the source has none, and finishes only when validation passes.
R15. A `typist-enrich` skill organises a list (deduplicates ids, checks categories, flags mis-typed records) and enriches `raw` Records in batches of about 25 per turn to satisfy R3, validating and committing after each batch; it only touches `raw` Records, so it can resume after an interruption, and it never sets `reviewed`.
R16. The repository ships `lists/de-b2-1000.yaml`, built from `wordlist.raw.txt` with both skills: all 1000 entries, structured into the 20 source categories, enriched, and passing validation.

## Design

### Stack

TypeScript + Vite, a hand-rolled Canvas 2D game loop, `zod` for the schema,
`yaml` for parsing, `ts-fsrs` for scheduling, IndexedDB for SRS state,
`localStorage` for settings, Vitest for unit tests, Playwright for one smoke
test. Node tooling CLIs run with `tsx`. The devcontainer also provisions Python and uv;
the game doesn't use them.

### Repository layout

```
lists/                    enriched lists (de-b2-1000.yaml); validated + bundled at build
wordlist.raw.txt          seed source of truth (never hand-edited into the list)
tools/cli.ts              `parse <raw.txt> [-o out.yaml]`, `validate <list.yaml…>`
.claude/skills/typist-structure/SKILL.md
.claude/skills/typist-enrich/SKILL.md
src/schema/               zod schema + per-type rule refinements (imported by tools/ and src/)
src/content/              bundled-list loader (import.meta.glob) + file-picker loader
src/srs/                  ts-fsrs wrapper, grade-from-performance, IndexedDB store
src/session/              study-session + free-play builders, wave chunking
src/engine/               TypingEngine, World (pure, fixed timestep, no DOM)
src/render/               Canvas 2D renderer
src/platform/             keyboard capture (hidden input), TTS, settings store
src/ui/                   menus, recap card, summary
```

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
    category: economics-finance
    status: enriched
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
    verb: { separable: an, auxiliary: haben, reflexive: false, government: "in + Akk.",
            parts: { praesens_3sg: "legt an", praeteritum: "legte an", partizip2: "angelegt" } }
    examples: [...]
  # adjective: { gradable: true, comparative: wichtiger, superlative: am wichtigsten }
  # phrase:    { register: formal|informal|neutral, literal: "..." }   (both optional)
```

- Record ids are unique slugs (`<type>-<ascii-lemma>`, with a numeric suffix
  on collision). SRS state is keyed on `listId:recordId`, so ids must never be
  regenerated for existing records.
- `raw` records need only id, type, lemma and gloss. The type block and
  examples are optional.
- The R3 rules are zod `superRefine`s that run only for `enriched` and
  `reviewed` records. Example tags are free strings, but a fixed vocabulary is
  recognised: `singular`, `plural`, `separated`, `attributive`, `comparative`,
  `superlative`, and tenses/moods (`Präsens`, `Präteritum`, `Perfekt`,
  `Plusquamperfekt`, `Futur I`, `Konjunktiv II`, `Passiv`, `Imperativ`). The
  rules count only recognised tags.
- `validate` prints one line per error: `list.yaml: records[12] (verb-anlegen): <message>`.

### Display forms

| type | mothership | forms ship |
|---|---|---|
| noun | `die Börse` (variants as `der Anleger / die Anlegerin`) | `die Börsen` (`(kein Plural)` → no forms ship) |
| verb | `anlegen` (reflexive: `sich …`) | `legte an · hat angelegt` |
| adjective | `wichtig` | `wichtiger · am wichtigsten` (only if gradable) |
| phrase | full phrase | none |

The gloss is shown beneath the mothership and is never typed.

### Typing engine (`src/engine/TypingEngine`)

- Input comes from a hidden, always-focused `<input>`. The engine consumes
  committed characters from `input`/`compositionend` events and ignores
  `keydown` with `key === "Dead"`, so Option-U + A delivers one `ä`.
- **Target lock:** with no lock, a character locks onto the ship closest to
  the player whose next expected text accepts it. With a lock, characters go
  only to that ship. A non-matching character counts as a typo for the locked
  Record. Backspace is a no-op, as in ZType.
- **Fallback:** an expected `ä` accepts `ä`, or `a` followed by `e`. After
  `a`, the engine holds a pending state that accepts only `e`. Likewise
  `ö`/`oe`, `ü`/`ue`, `ß`/`ss`, and the capitals `Ä`/`Ae` etc.
- **Final punctuation:** trailing `.`, `!`, `?`, `…` and closing quotes are
  marked pre-typed when the ship spawns.
- The engine is pure: (state, char) → (state, events). It is unit-tested with
  table-driven cases.

### World and waves (`src/engine/World`)

- The world runs a fixed 60 Hz step. Ships descend toward the player; speed
  rises per wave, and long sentences descend more slowly in proportion to
  their length.
- Destroying a mothership spawns its forms ship and its escorts around it.
- A ship reaching the player costs a life, and the session ends at 0 lives.
  Score depends on characters and accuracy.
- A wave ends when all its Records are resolved. Each Record is graded once,
  when its last ship is destroyed or escapes (R7). The target speed is
  2.5 characters/second, a constant in `srs/grade.ts`.

### SRS (`src/srs`)

`ts-fsrs` with default parameters. The store is IndexedDB database `typist`,
object store `cards`, key `listId:recordId`, holding the FSRS card plus
counters (seen, typos, escapes). The new-per-day counter is stored under
`meta:<listId>:<yyyy-mm-dd>`. Free play applies the same grading and update.

### Sessions (`src/session`)

- **Study:** due cards, most overdue first, plus up to the daily new cap of
  never-seen Records in list order. The result is grouped by category in
  category `order` and chunked into waves of ≤6, shuffled within each wave.
- **Free play:** every Record of one category, shuffled, in waves of ≤6.
- **Uncategorised lists:** Records are chunked in list order.
- **Empty study session:** the game offers free play (R13).

### Learning aids (`src/platform`, `src/ui`)

There are four toggles in settings, stored in `localStorage`, all on by
default:
- **Grammar chip:** a sentence ship's recognised tags.
- **Translation:** the English line under each sentence ship.
- **TTS:** uses `speechSynthesis` with the first `de-*` voice. If no German
  voice exists, the toggle is disabled with a note.
- **Recap:** between waves, one card per Record graded Again or Hard, showing
  its display form, gloss, forms, and all its sentences with translations.

### Content loading (`src/content`)

- **Build time:** `import.meta.glob('/lists/*.yaml')` loads the lists, and a
  Vite plugin validates every file. The build fails on any error.
- **Runtime:** a "Load list…" file picker parses and validates the file. An
  invalid file is rejected with its errors listed. A valid one is held for
  the session, while its SRS state persists under its `list.id`.

### Skills (`.claude/skills/`)

- **`typist-structure`** runs `tools/cli.ts parse`, which emits the YAML plus
  an `unresolved:` section. The skill then:
  - resolves the unresolved lines (type, lemma, gloss);
  - expands plural suffixes that the parser marked as needing an umlaut or
    irregular form;
  - proposes thematic categories, and asks the operator to confirm them, when
    the source has none;
  - removes `unresolved:` and runs `validate`.
- **`typist-enrich`:**
  - organises the list: duplicate ids, records without a category in a
    categorised list, suspicious types;
  - loops over `raw` records in batches of about 25. For each batch it fills
    the type block and examples to satisfy R3, sets `status: enriched`, runs
    `validate`, fixes errors, and commits;
  - uses no per-record `claude -p`. A run can stop at any point, and the next
    run continues from the remaining `raw` records;
  - never writes `reviewed`.

### Testing

- **Vitest:** schema rules (valid and invalid fixtures per type), the parser
  against seed excerpts (headers, suffix plurals, dual gender, `(pl.)`,
  phrases), the TypingEngine (lock, typos, dead key, fallback, auto-skip),
  grading, session building, and wave chunking.
- **`validate lists/`:** runs in `npm test`.
- **Playwright smoke:** a fixture list with two Records. The test types the
  mothership, forms and escorts, then checks that the recap appears and that
  SRS state was written.

### Out of scope

Accounts or sync; any server; recall/cloze modes (copy-typing only); in-game
LLM calls; audio other than browser TTS; mobile/touch play; other languages'
grammar rules. The schema is German-shaped, and `lang` is recorded for later.
