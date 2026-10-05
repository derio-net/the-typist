/** An entry line contains ' – ' (space, U+2013, space); everything else is skipped. */
export const SEPARATOR = ' – ';

export interface Split {
  lhs: string;
  rhs: string;
}

/** Split on the first separator only; dashes are never normalised. */
export function splitEntry(line: string): Split | null {
  const at = line.indexOf(SEPARATOR);
  if (at < 0) return null;
  return { lhs: line.slice(0, at).trim(), rhs: line.slice(at + SEPARATOR.length).trim() };
}
