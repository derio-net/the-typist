import type { VocabRecord } from './record';

const ARTICLE = { m: 'der', f: 'die', n: 'das' } as const;

export function displayForm(r: VocabRecord): string {
  if (r.type === 'noun' && r.noun) {
    const main = `${ARTICLE[r.noun.gender]} ${r.lemma}`;
    const variants = (r.noun.variants ?? []).map((v) => `${ARTICLE[v.gender]} ${v.lemma}`);
    return [main, ...variants].join(' / ');
  }
  if (r.type === 'verb' && r.verb?.reflexive) return `sich ${r.lemma}`;
  return r.lemma;
}

/** Text of the forms ship, or null when the record has none. Separator is ', '. */
export function formsText(r: VocabRecord): string | null {
  if (r.type === 'noun' && r.noun) {
    if (r.noun.plural === null || r.noun.plural_only) return null;
    return `die ${r.noun.plural}`;
  }
  if (r.type === 'verb' && r.verb) {
    const { auxiliary, parts } = r.verb;
    return `${parts.praeteritum}, ${auxiliary === 'sein' ? 'ist' : 'hat'} ${parts.partizip2}`;
  }
  if (r.type === 'adjective' && r.adjective?.gradable) {
    const { comparative, superlative } = r.adjective;
    return comparative && superlative ? `${comparative}, ${superlative}` : null;
  }
  return null;
}
