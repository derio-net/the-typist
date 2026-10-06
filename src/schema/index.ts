import { parse } from 'yaml';
import { z } from 'zod';
import { Category, ListHeader, checkListLevel, type VocabList } from './list';
import { RecordBase, checkEnriched } from './record';

/** The document's top level, validated loosely: header, categories and records are checked on their own. */
const Top = z.strictObject({
  schema: z.literal(1),
  // optional here so a missing header is reported once, by ListHeader below
  list: z.unknown().optional(),
  categories: z.unknown().optional(),
  records: z.array(z.unknown()),
});

export type ParseResult = { ok: true; list: VocabList } | { ok: false; errors: string[] };

/** Parse and validate list YAML. Errors read `records[12] (verb-anlegen): <message>`. */
export function parseList(text: string): ParseResult {
  let data: unknown;
  try {
    data = parse(text);
  } catch (e) {
    return { ok: false, errors: [`invalid YAML: ${(e as Error).message.split('\n')[0]}`] };
  }
  const errors: string[] = [];
  const fmt = (path: PropertyKey[], message: string) => {
    const where = path.map(String).join('.');
    return where ? `${where}: ${message}` : message;
  };
  const top = Top.safeParse(data);
  if (!top.success) {
    for (const issue of top.error.issues) errors.push(fmt(issue.path, issue.message));
    // Not a list document at all; nothing further to check.
    if (typeof data !== 'object' || data === null || Array.isArray(data)) return { ok: false, errors };
  }
  const doc = (data ?? {}) as { list?: unknown; categories?: unknown; records?: unknown };

  const header = ListHeader.safeParse(doc.list);
  if (!header.success) for (const issue of header.error.issues) errors.push(fmt(['list', ...issue.path], issue.message));
  const rules = header.success ? header.data.rules : undefined;

  const cats = z.array(Category).optional().safeParse(doc.categories);
  if (!cats.success) for (const issue of cats.error.issues) errors.push(fmt(['categories', ...issue.path], issue.message));
  const rawCats = Array.isArray(doc.categories) ? doc.categories : [];
  const categories = rawCats
    .map((c) => (c as { id?: unknown } | null)?.id)
    .filter((id): id is string => typeof id === 'string')
    .map((id) => ({ id }));

  // An invalid categories block is reported above; checking each record against it would only repeat that error.
  const categoriesKnown = cats.success;

  const rawRecords = Array.isArray(doc.records) ? doc.records : [];
  const listLevel: { id: string; categories?: string[] | null }[] = [];
  rawRecords.forEach((raw, idx) => {
    const id = (raw as { id?: unknown } | null)?.id;
    const label = `records[${idx}] (${typeof id === 'string' ? id : '?'})`;
    const rec = RecordBase.safeParse(raw);
    if (!rec.success) {
      for (const issue of rec.error.issues) {
        const field = issue.path.length ? `${issue.path.join('.')}: ` : '';
        errors.push(`${label}: ${field}${issue.message}`);
      }
      return;
    }
    listLevel[idx] = categoriesKnown ? rec.data : { id: rec.data.id, categories: null };
    for (const message of checkEnriched(rec.data, rules)) errors.push(`${label}: ${message}`);
  });
  // Records that failed their own schema still take part in the duplicate-id check when their id is readable.
  // Their category checks run only when their categories field is a well-formed string list; otherwise the
  // record's own error already covers it (null = unknown, skipped).
  rawRecords.forEach((raw, idx) => {
    if (listLevel[idx]) return;
    const r = raw as { id?: unknown; categories?: unknown } | null;
    if (typeof r?.id !== 'string') return;
    const c = r.categories;
    const wellFormed = c === undefined || (Array.isArray(c) && c.every((x) => typeof x === 'string'));
    listLevel[idx] = { id: r.id, categories: categoriesKnown && wellFormed ? (c as string[] | undefined) : null };
  });
  // Check only the records with a readable id, keeping their original positions for the messages.
  const present = listLevel.map((r, i) => ({ r, i })).filter((x) => x.r);
  for (const issue of checkListLevel(categories, present.map((x) => x.r))) {
    if (issue.where === 'categories') {
      errors.push(`categories.${issue.index}: ${issue.message}`);
    } else {
      const { r, i } = present[issue.index];
      errors.push(`records[${i}] (${r.id}): ${issue.message}`);
    }
  }
  if (errors.length) return { ok: false, errors };
  return { ok: true, list: data as VocabList };
}

export { ListSchema, type VocabList } from './list';
export { RecordSchema, type VocabRecord } from './record';
export { displayForm, formsText } from './display';
export { ACCENTS, EQUIVALENCES, typedEquivalent, normaliseTyped, isTypeable } from './typeable';
