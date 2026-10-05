---
name: typist-enrich
description: Use when organising or enriching a the-typist list with grammar and example sentences
---

# typist-enrich

Take a valid raw-status the-typist list (`lists/<list-id>.yaml`, from
`typist-structure`) and turn `raw` records into `enriched` ones: the right type
block, grammar facts, and example sentences. Two phases: **organise** once,
then the **enrich loop** in batches of at most 25 records.

Placeholders: `<list-id>` is the list's id (e.g. `de-b2-1000`); `<record-id>` is a
record's id (e.g. `noun-vertrag`). All commands run from the repo root as
`npm run typist -- <cmd> …`. You write every sentence yourself: **no per-record
external LLM calls**, no `claude -p`. You never set `status: reviewed` (a human
step) and you **never change an id**: not when merging, not when a lemma
changes, not when retyping.

Precondition: the list validates and has no `unresolved:` key (that was
`typist-structure`'s job).

**Edit discipline.** Make targeted edits to the records you are working on only;
never rewrite or regenerate the whole file (no scripts that load and dump the
list, no reformatting). The one exception is `merge-dupes`/`merge`, which rewrite
the file as plain YAML (comments are not preserved; generated lists have none).

## Rules you must meet (R3)

Records use exactly the schema's keys (strict: unknown keys fail). A list's
`rules:` header values are minimums that can only be raised.

- **Counts:** noun ≥ 3 examples, verb ≥ 3, adjective ≥ 2, phrase ≥ 2.
- **Tags** must come from this set (the game shows exactly them as the grammar
  chip): `singular`, `plural`, `separated`, `attributive`, `comparative`,
  `superlative`, `Präsens`, `Präteritum`, `Perfekt`, `Plusquamperfekt`,
  `Futur I`, `Konjunktiv II`, `Passiv`, `Imperativ`. Only recognised tags count
  toward the rules.
- **Typeable text:** the display form, the forms text (`, ` separated) and every
  `examples[].de` must be typeable: letters (incl. äöüß), digits, space and
  `. , ; : ! ? ' " ( ) - / % & +`. **No** `...` or `…`, no `(r)`/`(e)`, no `·`, no
  emoji. Typographic double quotes (`„ “ ”`), `’` and dashes (`– —`) are fine.
  Do **not** use `‚…‘` (U+201A / U+2018 single low-9 / left quotes for quoting): the
  typeability table only knows `’` (U+2019) and `‘` is mapped but easy to
  confuse; use `„…“` or plain `"…"` instead. End each sentence with normal
  punctuation.
- `en` is a natural English translation of that sentence.

## Phase A: organise (once per list, before enriching)

1. `npm run typist -- stats lists/<list-id>.yaml`: totals by status/type, and
   `raw/total` per **primary** category in category order. Note the starting numbers.
2. **Duplicates.** `npm run typist -- dupes lists/<list-id>.yaml` prints groups of
   records that are the same word. Gender homonyms (*der See* / *die See*) and
   reflexive vs plain verbs (*vorstellen* / *sich vorstellen*) are **never**
   grouped automatically. A group the tool could not merge safely (conflicting
   values such as two different plurals) is printed with a `CONFLICT` line.
   - `npm run typist -- merge-dupes lists/<list-id>.yaml [--skip <record-id>…]`
     merges every conflict-free group (conflicts are reported on stderr and left
     alone; `--skip` leaves groups containing those ids alone). The first id
     survives, categories/source_lines are unioned, type blocks are merged field
     by field (a null plural is filled from the other record), enriched content
     beats raw, and the status never goes above `enriched`.
   - For a conflict, decide by hand: either edit the wrong value in one record
     and re-run, merge exactly the ones you mean with
     `npm run typist -- merge lists/<list-id>.yaml <record-id> <record-id>…`
     (also refuses conflicts), or leave them as separate records when they really
     are different senses.
   - After merging, tidy near-duplicate glosses (e.g. `fixed-term` /
     `fixed term`) by hand.
3. **Categories:** every record has a category from the list's `categories`; the
   first entry of `categories` is the primary one. Fix a misfiled record by
   reordering/adding in its `categories` array.
4. **Fix mis-typed records** (type assignment rules; when retyping, **delete the
   old type block**, never change the id, and give a phrase its full text in
   `lemma`):
   - **noun:** article plus a capitalised noun, optionally with a declined
     adjective (`das akademische Jahr`).
   - **verb:** infinitives, including reflexive (`sich anmelden`) and separable.
     The modal triple is three verbs, `dürfen`, `mögen`, `können`, each needing a
     Konjunktiv II example (tag `Konjunktiv II`).
   - **adjective:** only if it is used attributively (*befristet*, *schriftlich*).
   - **phrase:** everything else: adverbs and connectors (`jedoch`,
     `abschließend`), copulas (`verschuldet sein`), idioms including those starting
     with an article (`die Daumen drücken`), fixed formulae, multi-word
     expressions (`ethisch vertretbar`).
5. **Nouns: verify gender, plural and `plural_only` for EVERY noun**, from your
   own German knowledge, not from the parser:
   - **Re-check EVERY `plural: null` noun.** The parser emits `plural: null`
     whenever the source omitted a plural (e.g. *Fakultät*, *Abteilung*); that is
     not evidence the noun has none. For each: set the real plural
     (`Fakultäten`, `Abteilungen`), or make it plural-only (below), or keep `null`
     only when the noun genuinely has no plural (*Müll*, *Chaos*).
   - Correct wrong genders/plurals (typical: *Cybermobbing* is **das**, *rhetorische
     Mittel* is **das** *Mittel*, *Müll* has no plural).
   - **Plural-only nouns** (*Betriebskosten*, *Eltern*): `lemma` is the plural form,
     `noun.plural_only: true`, and `gender: f` so the display reads "die …". Do
     **not** "correct" the gender to the singular's.
   - **Dual-gender `variants`** (*der Kollege / die Kollegin*): keep them; set
     `variants[].plural` when known (`Kolleginnen`). Examples may use either form.
   - Record each correction in `source_note` (e.g. `source_note: "gender corrected
     from der to das"`); append to an existing note, never delete `source: …`.
   - `noun.plural` is the text after `die` (`Fakultäten`); a noun with an adjective
     takes the weak plural (`sozialen Netzwerke`).
6. `npm run typist -- validate lists/<list-id>.yaml`, then
   `git add lists/<list-id>.yaml && git commit -m "content(<list-id>): organise"`.

## Phase B: enrich loop

Keep a list of **attempted ids** for this run (for the "cannot enrich" exit below).
Repeat until a stop condition:

1. `npm run typist -- stats lists/<list-id>.yaml` and note `total`.
   `npm run typist -- next-batch lists/<list-id>.yaml [--n 25] [--category <category-id>]`
   prints up to 25 raw ids (primary-category order, then list order). An
   undeclared category id is an error. Ignore ids already in your attempted list.
2. For each id, edit **that record only**:
   - Fill the **type block** and **examples** below.
   - **Reflexive verbs** (lemma `sich vorstellen`): change `lemma` to `vorstellen`
     and set `verb.reflexive: true`. The display form re-adds `sich`. **The id
     stays `verb-sich-vorstellen`.** `verb.parts` never contain `sich`
     (`stellte vor`, `vorgestellt`; the forms read "stellte vor, hat vorgestellt").
   - Set `status: enriched`. Keep `id`, `source_lines`, `categories`, `gloss`.
3. `npm run typist -- validate lists/<list-id>.yaml`; fix every error it prints
   (`records[N] (id): message`) and re-run until `ok`.
4. **Before each commit check the diff is only the batch:** `stats` total is
   unchanged from step 1, and `git diff --stat` / `git diff` touches only this
   batch's records (no reordered, reformatted or deleted records).
5. Commit: `git add lists/<list-id>.yaml && git commit -m "content(<list-id>): enrich <record-id> <record-id> …"`
   (all ids of the batch, one line, e.g.
   `content(de-b2-1000): enrich noun-fakultaet verb-sich-vorstellen adjective-befristet`;
   a reflexive verb keeps its old `verb-sich-…` id).
6. Back to step 1.

**A record you cannot enrich with confidence** (unclear sense, unknown word):
enrich it best-effort anyway, add `source_note: "needs operator attention: <why>"`,
and still set `enriched` if it validates. If it truly cannot validate, leave it
`raw`, add the `source_note` and put its id on your attempted list so `next-batch`
does not make you retry it forever (the tool will keep returning it; skip it). **List
every flagged record (and every skipped raw id) in your final report.**

**Stop** when `next-batch` prints nothing (exit 0), when everything it prints is
already on your attempted list, or when the caller's `--category` scope is done.
Report which condition ended the run; never set `reviewed`.

### What to write per type

**Noun** — `noun: {gender: m|f|n, plural: <text>|null, plural_only?: true}`.
Examples: ≥ 3, B2-level, natural sentences; at least one tagged `singular` and
one tagged `plural` (unless plural is null/`plural_only`); vary the cases
(Nominativ, Akkusativ, Dativ, Genitiv). Tags are only for the recognised set.

**Verb** — `verb: {separable?: <prefix>, auxiliary: haben|sein, reflexive: bool,
parts: {praesens_3sg, praeteritum, partizip2}}`. For a separable verb the parts are
as in a main clause (`legt an`, `legte an`) with `separable: an` and
`partizip2: angelegt`. Never include `sich` in `parts`. Examples: ≥ 3 covering
**≥ 2 distinct tense tags including `Perfekt`** with the correct auxiliary; a
separable verb needs an example tagged `separated` (*Sie legt ihr Geld an.*).
The modal triple needs a `Konjunktiv II` example each. `government` stays as parsed.

**Adjective** — `adjective: {gradable: bool, comparative?, superlative?}`.
Examples: ≥ 2, at least one `attributive` (*ein befristeter Vertrag*). When
gradable give **both** `comparative` and `superlative` (`besser`, `am besten`) and
an example tagged `comparative` or `superlative`. A non-gradable adjective is just
`adjective: {gradable: false}`.

**Phrase** — `phrase: {register?: formal|informal|neutral, literal?}`. `literal`
is optional: the word-for-word English meaning of an idiom (*die Daumen drücken*
→ "to press the thumbs"), omit it for plain phrases. Examples: ≥ 2 realistic
contexts that show the register. An untagged example (`tags: []`) still counts
toward the minimum.

### Example format

Always **double-quote** `de` and `en` (flow mappings break on commas and colons).
Inside the quotes use `„…“` or escape `\"`; never `‚…‘`.

```yaml
examples:
  - { de: "Der Dekan der Fakultät hält eine Rede.", en: "The dean of the faculty gives a speech.", tags: [singular, Präsens] }
  - { de: "Alle Fakultäten haben neue Räume bekommen.", en: "All faculties have received new rooms.", tags: [plural, Perfekt] }
```

## Do not

- change ids, `source_lines`, or lower `rules:` header minimums;
- invent keys or leave a `plural: null` noun unchecked;
- rewrite the whole file, or set `status: reviewed`;
- commit a scratch copy of a list or leave `unresolved:` in a list.
