/** Typed-input equivalents (R6): the displayed char maps to the ASCII char a player may type. */
export const EQUIVALENCES: Readonly<Record<string, string>> = {
  '’': "'", '‘': "'",
  '„': '"', '“': '"', '”': '"', '«': '"', '»': '"',
  '–': '-', '—': '-',
  '₂': '2',
};

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
  return ALLOWED.test(n);
}
