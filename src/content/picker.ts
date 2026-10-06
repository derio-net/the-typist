import { parseList, type VocabList } from '../schema';
import { isPlayable } from '../session/build';

export type LoadResult = { ok: true; list: VocabList; playable: number } | { ok: false; errors: string[] };

/** Makes a parser message readable: no dangling colon after a YAML position, a plain verdict for a non-list document. */
function tidy(message: string): string {
  if (message.startsWith('Invalid input: expected object')) return 'not a YAML list file: the top level must be a mapping with `list` and `records`';
  return message.replace(/(line \d+, column \d+):$/, '$1');
}

/** Validates YAML text as a list: every error on its own line, none when it is valid. */
export function loadText(text: string): LoadResult {
  const res = parseList(text);
  if (!res.ok) return { ok: false, errors: res.errors.map(tidy) };
  return { ok: true, list: res.list, playable: res.list.records.filter(isPlayable).length };
}

/** File picker input: read the file and validate it in the browser (R8). */
export async function loadFile(file: File): Promise<LoadResult> {
  let text: string;
  try {
    text = await file.text();
  } catch (e) {
    return { ok: false, errors: [`could not read ${file.name}: ${e instanceof Error ? e.message : String(e)}`] };
  }
  return loadText(text);
}
