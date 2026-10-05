import { parse } from 'yaml';
import { ListSchema, type VocabList } from './list';

export type ParseResult = { ok: true; list: VocabList } | { ok: false; errors: string[] };

/** Parse and validate list YAML. Errors read `records[12] (verb-anlegen): <message>`. */
export function parseList(text: string): ParseResult {
  let data: unknown;
  try {
    data = parse(text);
  } catch (e) {
    return { ok: false, errors: [`invalid YAML: ${(e as Error).message.split('\n')[0]}`] };
  }
  const res = ListSchema.safeParse(data);
  if (res.success) return { ok: true, list: res.data };
  const records = (data as { records?: { id?: unknown }[] } | null)?.records;
  const errors = res.error.issues.map((issue) => {
    const [head, idx, ...rest] = issue.path;
    if (head === 'records' && typeof idx === 'number') {
      const id = records?.[idx]?.id;
      const field = rest.length ? `${rest.join('.')}: ` : '';
      return `records[${idx}] (${typeof id === 'string' ? id : '?'}): ${field}${issue.message}`;
    }
    const where = issue.path.join('.');
    return where ? `${where}: ${issue.message}` : issue.message;
  });
  return { ok: false, errors };
}

export { ListSchema, type VocabList } from './list';
export { RecordSchema, type VocabRecord } from './record';
export { displayForm, formsText } from './display';
export { EQUIVALENCES, normaliseTyped, isTypeable } from './typeable';
