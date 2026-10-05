---
name: typist-structure
description: Use when turning a raw vocabulary list into a raw-status the-typist list
---

# typist-structure

Turn a raw vocabulary text file (one `lemma – gloss` entry per line, optional
`<emoji> N. Title` section headers) into a valid `status: raw` the-typist list
in `lists/<id>.yaml`. The parser does the mechanical part; you resolve what it
could not. You never enrich (no type blocks, no examples): that is
`typist-enrich`.

## Steps

1. **Parse.** `npm run typist -- parse <raw> -o lists/<id>.yaml [--id <id>] [--title "<title>"]`.
   The output has `list`, `categories` (from the headers), `records` (all
   `status: raw`) and a top-level `unresolved:` list of `{line, text, reason}`.
   Every ` – ` line of the source is in exactly one of `records[].source_lines`
   or `unresolved`. Prose, "Usage Notes:" blocks and stray text are skipped.
2. **Categories.** If the source has no section headers, `categories` is absent:
   propose thematic categories (id, title, order) and **ask the operator to
   confirm them before applying**; then give every record at least one.
   (A list that declares categories needs a category on every record.)
3. **Resolve every `unresolved` entry** by its `reason`, below. Each becomes one
   or more records in `records`, keeping `source_lines: [<line>]` (the entry's
   `line`) and the category of the surrounding section (the nearest earlier
   header's category id; use the neighbouring records). Records use exactly the
   schema's keys, and stay `status: raw` with only id, type, lemma, gloss,
   categories, source_lines (plus `noun`, `government`, `abbreviation`,
   `source_note` where noted).
4. **Remove the `unresolved:` key**, then run `npm run typist -- validate lists/<id>.yaml`
   and fix until it is clean. (`validate` rejects the leftover key on purpose.)

## Expansion rules (all reasons the parser emits)

- **`slash`**: a two-item `/` line the parser did not take as dual gender.
  - *Distinct words or opposites* (`der Gewinn / der Verlust`, `die Mehrheit / die Minderheit`,
    `befristet / unbefristet`): one record each. If the gloss is `a / b`, each
    record takes its own side; if there is one gloss, see synonyms.
  - *Synonym pair, one gloss* (`das Darlehen / der Kredit` — "loan"): two records
    with the same gloss.
  - *Shared head* (`die Hauptrolle / Nebenrolle`, `das Pflichtmodul / Wahlmodul`,
    `gut / schlecht gelaunt`): expand to full lemmas (`die Nebenrolle`,
    `das Wahlmodul`, `schlecht gelaunt`), each with its side of the gloss.
  - *Dual gender the parser's `-in` rule missed* (`der Herr / die Frau`,
    `die Dame / der Herr`): distinct words, so one record each.
  - A verb pair with a shared reflexive (`sich anmelden / abmelden`): two verb
    records, `sich anmelden` and `abmelden`/`sich abmelden` as the sense requires.
- **`list`**: three or more items. Split into one record per item. The modal
  triple (`dürfen / möchten / könnten`) becomes the verbs **dürfen**, **mögen**,
  **können** (lemma = infinitive; the source's `möchten`/`könnten` are
  Konjunktiv II forms), with glosses taken from the source gloss. Connector
  lists (`zunächst / außerdem / …`) become one `phrase` record per item with its
  own gloss.
- **`und`**: `und` compounds (`das Angebot und die Nachfrage`, `das A und O sein`)
  are a single `phrase` record (lemma = the source text), unless it is clearly two
  independent words, in which case split.
- **Category:** every unresolved entry carries the `category` of its section;
  give the resolved record(s) `categories: [<that id>]`.
- **`phrase`**: multi-word lines that are not a noun shape: idioms, adverbs,
  connectors, greetings, `X sein` forms, `etwas …` constructions. One `phrase`
  record, lemma = the source text **minus any trailing parenthesis**: a trailing
  abbreviation (`(UN)`, `(EU)`) goes to `abbreviation`, a trailing preposition
  (`zuständig sein (für)`) goes to `government`. A noun phrase with an article
  that merely failed the shape check is a `noun` when it is plainly one,
  including proper names with a capitalised adjective (`die Vereinten Nationen`
  → noun, plural_only; `die Europäische Union` → noun f); otherwise `phrase`.
- **`word`**: a single article-less word that is not a verb (adjectives, adverbs,
  nouns without article): `type: adjective` for adjectives, `type: phrase` for
  adverbs and connectors; a noun gets its article and `noun: { gender, plural: null }`
  once the gender is certain. Keep the source's spelling.
- **`template`**: lines with `...`, `(r)` or `(e)` (`Sehr geehrte(r)...`,
  `Darf ich Sie bitten...?`): a `phrase` record whose lemma is a **full typeable
  phrase** (`Sehr geehrte Damen und Herren,`), with the original text kept in
  `source_note: "source: <original>"`. Write it so it contains no `...`.
- **`plural`**: a plural the parser could not build (adjective + noun, or a
  stem/umlaut form). Write the **full plural out** in `noun.plural`, exactly as
  it reads after `die` — an adjective takes its weak plural ending:
  `das soziale Netzwerk` → `plural: sozialen Netzwerke` (shown as
  "die sozialen Netzwerke"). Gender comes from the singular's article.
- **`parenthetical`**: a parenthesis that is not a government preposition,
  `(pl.)`, `(sich)` or an abbreviation. `government` only ever holds a
  preposition, optionally with its case (`für`, `an + D`). A parenthesis naming
  an object (`verabschieden (ein Gesetz)`) is a sense hint: keep the verb as
  lemma, leave `government` unset, and keep the hint in the gloss
  (`to pass (a law)`) or `source_note`. If the id then collides with another
  sense of the same verb, the `-2` suffix is correct: they are different senses.
  Expansion of an abbreviation (`der NC (Numerus Clausus)`):
  `abbreviation: NC`, lemma the long form.
- **`gloss`**: the right-hand side was empty: ask the operator, never invent it.

## Conventions the parser uses

- A reflexive verb keeps `sich` in the lemma and the id (`sich vorstellen` →
  `verb-sich-vorstellen`), so it never collides with the plain verb
  (`vorstellen` → `verb-vorstellen`). `typist-enrich` later converts it to
  `lemma: vorstellen` with `verb.reflexive: true`.
- Nouns with no plural in the source get `plural: null`; `typist-enrich`
  verifies that against its own German knowledge.
- Ids are `<type>-<ascii-lemma>`; the parser suffixes `-2`, `-3` (or a gender
  for nouns that differ in gender) on repeats. **Repeats of one word are not
  deleted here**: `typist-enrich` merges them. Do not renumber ids.
- Ids you create when resolving follow the same rule (`phrase-<ascii-lemma>`,
  ä→ae ö→oe ü→ue ß→ss, lowercase, non-alphanumerics → `-`), checked for
  collisions against the whole list.
- **Never invent ids for records that already exist in a committed list.** When
  re-running on a list that is already committed, keep every existing id and
  `source_lines`; only add records for new lines.
