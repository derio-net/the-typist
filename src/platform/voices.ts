/** The slice of a `SpeechSynthesisVoice` used for ranking. */
export interface VoiceLike {
  name: string;
  voiceURI: string;
  lang: string;
}

const QUALITY = /\b(premium|enhanced|natural|neural|online)\b/i;
const NOVELTY = new Set(['eddy', 'flo', 'grandma', 'grandpa', 'reed', 'rocko', 'sandy', 'shelley']);

/** 0 best: quality marker, Google Deutsch, any other, then the macOS novelty voices. */
function rank(name: string): number {
  if (NOVELTY.has(name.trim().split(/[\s(]/)[0].toLowerCase())) return 3;
  if (QUALITY.test(name)) return 0;
  if (/^google deutsch/i.test(name)) return 1;
  return 2;
}

const locale = (lang: string) => (lang.replace('_', '-').toLowerCase() === 'de-de' ? 0 : 1);

/** German voices only, best first: by rank, then `de-DE` before other German locales, then by name. */
export function rankGermanVoices<T extends VoiceLike>(voices: readonly T[]): T[] {
  return voices
    .filter((v) => v.lang.toLowerCase().startsWith('de'))
    .sort((a, b) => rank(a.name) - rank(b.name) || locale(a.lang) - locale(b.lang) || a.name.localeCompare(b.name));
}
