import type { VocabRecord } from '../../src/schema/index';
import { assignIds, isUnresolved, parseEntry, type Unresolved } from './entry';
import { parseHeader, type Category } from './headers';
import { splitEntry } from './lines';

export interface ParseOptions {
  id: string;
  title: string;
  lang?: string;
  gloss_lang?: string;
}

export interface ParseResult {
  list: { id: string; title: string; lang: string; gloss_lang: string };
  categories: Category[];
  records: VocabRecord[];
  unresolved: Unresolved[];
}

export function parseRaw(text: string, opts: ParseOptions): ParseResult {
  const categories: Category[] = [];
  const records: VocabRecord[] = [];
  const unresolved: Unresolved[] = [];
  let current: string | undefined;
  text.split(/\r?\n/).forEach((raw, i) => {
    const line = raw.trim();
    const header = parseHeader(line);
    if (header) {
      categories.push(header);
      current = header.id;
      return;
    }
    const split = splitEntry(line);
    if (!split) return; // prose, Usage Notes, stray text: skipped silently
    const out = parseEntry(split, i + 1, line, current);
    if (isUnresolved(out)) unresolved.push(out);
    else records.push(out);
  });
  assignIds(records);
  return {
    list: { id: opts.id, title: opts.title, lang: opts.lang ?? 'de', gloss_lang: opts.gloss_lang ?? 'en' },
    categories,
    records,
    unresolved,
  };
}
