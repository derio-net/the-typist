# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

"the-typist" is a clone of ZType (https://zty.pe), the browser typing shoot-'em-up where enemies carry words and you destroy them by typing those words. **Development has not begun.** The repo has no commits, no source, no build tooling, and no README. When the stack is chosen, add the build/lint/test commands (including how to run a single test) and an architecture section to this file; until then, don't invent them.

## What exists today

- `wordlist.raw.txt` (untracked) — the only file. Raw, unprocessed vocabulary of **German words at B2 level with English glosses**, evidently intended as the game's word source (i.e. this is a German-learning typing game, not an English one).
  - Format: one entry per line, blank line between entries: `<article> <German word> – <English gloss>`, e.g. `die Fakultät – faculty`. Verbs have no article (`publizieren – to publish`).
  - Grouped into ~21 themed sections introduced by an emoji + number header (`📚 1. Academic & Higher Education`, …, `✍️ 20. Rhetoric & Argumentation`, `🌐 21. Global Issues & Sustainability`). Section 10 is missing from the numbering. Headers are followed by a prose intro line.
  - Irregularities a parser must handle: dual-gender entries (`der Dozent / die Dozentin`), multiple glosses separated by commas, sections of non-nouns (`6. Idiomatic Expressions`, `7. Separable Verbs`, `11.`–`21.`), and umlauts/ß/typographic quotes (`’`), which matter for typing input.

## Design implications to keep in mind

- Typing targets contain non-ASCII characters (ä, ö, ü, ß). Decide early whether the player must type them literally or whether input normalizes (ä→ae, etc.), and apply that consistently to matching.
- The raw list needs a cleaning step (strip headers/intro prose, split article/word/gloss, normalize dashes and whitespace) before the game can consume it. Keep the raw file as the source of truth and generate the processed list from it rather than editing by hand.
