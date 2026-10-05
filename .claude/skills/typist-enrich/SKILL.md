---
name: typist-enrich
description: Use when organising or enriching a the-typist list with grammar and example sentences
---

# typist-enrich

Take a valid raw-status the-typist list (`lists/<id>.yaml`, from `typist-structure`)
and turn `raw` records into `enriched` ones: the right type block, grammar
facts, and example sentences. Two phases: **organise** once, then the **enrich
loop** in batches of at most 25 records.

All commands run from the repo root as `npm run typist -- <cmd> …`. You write
every sentence yourself: **no per-record external LLM calls**, no `claude -p`.
You never set `status: reviewed` (that is a human step) and you **never change an
id**: not when merging, not when a lemma changes.

## Rules you must meet (R3)

Records use exactly the schema's keys (the schema is strict: unknown keys fail).
A list's `rules:` header values are minimums that can only be raised, never lowered.

- **Counts:** noun ≥ 3 examples, verb ≥ 3, adjective ≥ 2, phrase ≥ 2.
- **Tags** on each example must come from this set (the game shows exactly them as
  the grammar chip): `singular`, `plural`, `separated`, `attributive`,
  `comparative`, `superlative`, `Präsens`, `Präteritum`, `Perfekt`,
  `Plusquamperfekt`, `Futur I`, `Konjunktiv II`, `Passiv`, `Imperativ`.
  Untagged or unrecognised tags do not count toward the rules.
- **Typeable text:** the display form, the forms text (`, ` separated) and every
  `examples[].de` must be typeable on a keyboard: letters (incl. äöüß), digits,
  space and `. , ; : ! ? ' " ( ) - / % & +`. **No** `...` or `…`, no `(r)`/`(e)`,
  no `·`, no emoji, no other symbols. Typographic quotes (`„ “ ” ’`) and dashes
  (`– —`) are fine. End each sentence with normal punctuation.
- `en` is a natural English translation of that sentence.

## Phase A: organise (once per list, before enriching)

1. `npm run typist -- stats lists/<id>.yaml`: see the raw/enriched split and type mix.
2. `npm run typist -- dupes lists/<id>.yaml`; for each group decide whether it is
   really the same word. If so run `npm run typist -- merge-dupes lists/<id>.yaml`
   (keeps the first id, unions categories and source_lines, merges glosses, keeps
   the most advanced status). Distinct senses stay separate (different lemma or
   a `-2` id the parser added on purpose); if `merge-dupes` would merge senses you
   want kept, edit the lemma/gloss first so they are not duplicates.
3. **Categories:** every record has a category from the list's `categories`; the
   first entry of `categories` is the primary one. Fix a misfiled record by
   reordering/adding in its `categories` array.
4. **Fix mis-typed records:** a record typed `phrase` that is plainly a noun, verb
   or adjective (or the reverse) gets the right `type` and the matching block
   (never change the id; the id keeps its old type prefix).
5. **Nouns: verify gender, plural and `plural_only` for EVERY noun**, from your
   own German knowledge, not from the parser:
   - **Re-check EVERY `plural: null` noun.** The parser emits `plural: null`
     whenever the source omitted a plural (e.g. *Fakultät*, *Abteilung*); that is
     not evidence the noun has none. For each: set the real plural
     (`Fakultäten`, `Abteilungen`), or `plural_only: true` for a plural-only
     noun (*Betriebskosten*), or keep `null` only when the noun genuinely has no
     plural (*Müll*, *Chaos*).
   - Correct wrong genders/plurals (typical: *Cybermobbing* is **das**, *rhetorische
     Mittel* is **das** *Mittel*, *Müll* has no plural, *Betriebskosten* is
     `plural_only`).
   - Record each correction in `source_note` (e.g. `source_note: "gender corrected
     from der to das"`; append to any existing note, never delete `source: …`).
   - `noun.plural` is the text after `die` (`Fakultäten`); an adjective noun takes
     the weak plural (`sozialen Netzwerke`).
6. `npm run typist -- validate lists/<id>.yaml`, then commit:
   `git commit -m "content(<list>): organise"`.

## Phase B: enrich loop

Repeat until a stop condition:

1. `npm run typist -- next-batch lists/<id>.yaml [--n 25] [--category <category-id>]`
   prints up to 25 raw ids (primary-category order, then list order). Use
   `--category` when the caller scoped the work to one category.
2. For each id, edit that record in the YAML (find it by `id:`):
   - Fill the **type block** and **examples** below.
   - **Reflexive verbs** (lemma `sich vorstellen`): change `lemma` to `vorstellen`
     and set `verb.reflexive: true`. The display form re-adds `sich`. **The id
     stays `verb-sich-vorstellen`.**
   - Set `status: enriched`. Keep `id`, `source_lines`, `categories`, `gloss`.
3. `npm run typist -- validate lists/<id>.yaml`; fix every error it prints
   (`records[N] (id): message`) and re-run until `ok`.
4. Commit: `git add lists/<id>.yaml && git commit -m "content(<list>): enrich <id1> <id2> …"`
   (all ids of the batch; keep the subject on one line).
5. Back to step 1.

**Stop** when `next-batch` prints nothing (no raw left), or when the caller's
`--category` scope prints nothing. Report which; never set `reviewed`.

### What to write per type

**Noun** — `noun: {gender: m|f|n, plural: <text>|null, plural_only?: true}`.
Examples: ≥ 3, B2-level, natural sentences; at least one tagged `singular` and
one tagged `plural` (unless plural is null/`plural_only`); vary the cases
(Nominativ, Akkusativ, Dativ, Genitiv) across the examples. Tag a second
dimension only if it is in the recognised set (tense tags are fine on a noun
sentence).

**Verb** — `verb: {separable?: <prefix>, auxiliary: haben|sein, reflexive: bool,
parts: {praesens_3sg, praeteritum, partizip2}}`. For a separable verb the parts are
written as they appear in a main clause (`legt an`, `legte an`) with
`separable: an` and `partizip2: angelegt`. Examples: ≥ 3 covering **≥ 2 distinct
tense tags including `Perfekt`** with the correct auxiliary (haben/sein);
a separable verb needs an example tagged `separated` (prefix split off, e.g.
*Sie legt ihr Geld an.*). A `government` preposition stays as parsed.

**Adjective** — `adjective: {gradable: bool, comparative?, superlative?}`.
Examples: ≥ 2, at least one `attributive` (declined form before a noun:
*ein befristeter Vertrag*). When gradable, give **both** `comparative` and
`superlative` (`besser`, `am besten`-style superlative as `am besten`) and an example
tagged `comparative` or `superlative`.

**Phrase** — `phrase: {register?: formal|informal|neutral, literal?}`. Examples:
≥ 2 realistic contexts that show the register (letter closings, spoken
connectors, idioms in use). Tag only with recognised tags; an untagged example
still counts toward the example minimum.

### Example format

```yaml
examples:
  - { de: "Die Fakultät lädt zum Info-Tag ein.", en: "The faculty invites people to an open day.", tags: [singular, Präsens, separated] }
  - { de: "Alle Fakultäten sind erreichbar.", en: "All faculties are reachable.", tags: [plural] }
```

Quote `de`/`en` strings that contain `:` or start with a quote. `tags: []` is
valid for an example with nothing to tag.

## Do not

- change ids, `source_lines`, or lower `rules:` header minimums;
- invent keys (the schema is strict) or leave a `plural: null` noun unchecked;
- set `status: reviewed`;
- commit a scratch copy of a list or leave `unresolved:` in a list.
