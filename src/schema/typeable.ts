/** Typed-input equivalents (R6): the displayed char maps to the ASCII char a player may type. */
export const EQUIVALENCES: Readonly<Record<string, string>> = {
  '’': "'", '‘': "'",
  '„': '"', '“': '"', '”': '"', '«': '"', '»': '"',
  '–': '-', '—': '-',
  '₂': '2',
};

/**
 * Accented loanword letters (R15): the displayed letter maps to the base letter a
 * player may type instead (typing the exact accented letter always works too).
 */
const ACCENT_PAIRS: Readonly<Record<string, string>> = {
  é: 'e', è: 'e', ê: 'e', ë: 'e', à: 'a', â: 'a', á: 'a', î: 'i', ï: 'i',
  ô: 'o', ó: 'o', û: 'u', ù: 'u', ç: 'c', ñ: 'n',
};
export const ACCENTS: Readonly<Record<string, string>> = Object.fromEntries(
  Object.entries(ACCENT_PAIRS).flatMap(([k, v]) => [[k, v], [k.toUpperCase(), v.toUpperCase()]]),
);

/** Does typing `typed` stand in for displayed `expected` via EQUIVALENCES (punctuation) or ACCENTS (base letters)? */
export function typedEquivalent(expected: string, typed: string): boolean {
  return EQUIVALENCES[expected] === typed || ACCENTS[expected] === typed;
}

const ALLOWED = /^[A-Za-zÄÖÜäöüß0-9 .,;:!?'"()\-/%&+]*$/;
const TEMPLATES = ['(r)', '(e)', '...', '…'];

export function normaliseTyped(s: string): string {
  let out = '';
  for (const ch of s) out += EQUIVALENCES[ch] ?? ch;
  return out;
}

export function isTypeable(s: string): boolean {
  const n = normaliseTyped(s);
  if (TEMPLATES.some((t) => s.includes(t) || n.includes(t))) return false;
  let base = '';
  for (const ch of n) base += ACCENTS[ch] ?? ch;
  return ALLOWED.test(base);
}
