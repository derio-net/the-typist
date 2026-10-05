export interface Category {
  id: string;
  title: string;
  order: number;
}

const FOLD: Record<string, string> = { ä: 'ae', ö: 'oe', ü: 'ue', ß: 'ss' };

/** Lowercase and fold umlauts and ß to ascii (ä→ae, ö→oe, ü→ue, ß→ss). */
export const asciiFold = (s: string): string => s.toLowerCase().replace(/[äöüß]/g, (c) => FOLD[c]);

/** Lowercase, ascii-fold umlauts, & → and, every non-alphanumeric run → '-'. */
export function slug(s: string): string {
  return asciiFold(s.replace(/&/g, ' and '))
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// `<emoji> N. Title`: a first token with no letters or digits, then a number and a dot.
const HEADER = /^[^\p{L}\p{N}\s]\S*\s+(\d+)\.\s+(.+)$/u;

export function parseHeader(line: string): Category | null {
  const m = HEADER.exec(line.trim());
  if (!m) return null;
  const title = m[2].trim();
  return { id: slug(title), title, order: Number(m[1]) };
}
