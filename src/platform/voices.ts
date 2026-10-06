/** The slice of a `SpeechSynthesisVoice` used for ranking. */
export interface VoiceLike {
  name: string;
  voiceURI: string;
  lang: string;
}

const QUALITY = /\b(premium|enhanced|natural|neural|online)\b/i;
// macOS Eloquence voices: the adult ones speak German better than the compact Anna; the character voices don't
const ELOQUENCE = new Set(['eddy', 'flo', 'reed', 'sandy', 'shelley']);
const NOVELTY = new Set(['grandma', 'grandpa', 'rocko']);

/** 0 best: quality marker, Google Deutsch, adult Eloquence voices, any other, then the macOS character voices. */
function rank(name: string, uri = ''): number {
  const first = name.trim().split(/[\s(]/)[0].toLowerCase();
  if (NOVELTY.has(first)) return 4;
  if (QUALITY.test(name) || QUALITY.test(uri)) return 0;
  if (/^google deutsch/i.test(name)) return 1;
  if (ELOQUENCE.has(first)) return 2;
  return 3;
}

const locale = (lang: string) => (lang.replace('_', '-').toLowerCase() === 'de-de' ? 0 : 1);

/** German voices only, best first: by rank, then `de-DE` before other German locales, then by name. */
export function rankGermanVoices<T extends VoiceLike>(voices: readonly T[]): T[] {
  return voices
    .filter((v) => v.lang.toLowerCase().startsWith('de'))
    .sort((a, b) => rank(a.name, a.voiceURI) - rank(b.name, b.voiceURI) || locale(a.lang) - locale(b.lang) || a.name.localeCompare(b.name));
}
