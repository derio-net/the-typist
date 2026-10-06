import { describe, expect, it } from 'vitest';
import { rankGermanVoices } from '../../src/platform/voices';

const v = (name: string, lang = 'de-DE') => ({ name, voiceURI: `uri:${name}`, lang });
const names = (xs: { name: string }[]) => xs.map((x) => x.name);

describe('rankGermanVoices (R7)', () => {
  it('drops non-German voices', () => {
    expect(names(rankGermanVoices([v('Sam', 'en-US'), v('Anna'), v('Thomas', 'fr-FR')]))).toEqual(['Anna']);
  });

  it('ranks quality markers, then Google Deutsch, then others, then novelty voices', () => {
    const all = [v('Eddy'), v('Anna'), v('Yannick'), v('Google Deutsch'), v('Flo'), v('Katja Online (Natural)'), v('Markus Premium'), v('Petra Enhanced'), v('Conrad Neural'), v('Grandma'), v('Reed'), v('Rocko'), v('Sandy'), v('Shelley'), v('Grandpa')];
    const r = names(rankGermanVoices(all));
    const at = (n: string) => r.indexOf(n);
    for (const q of ['Katja Online (Natural)', 'Markus Premium', 'Petra Enhanced', 'Conrad Neural']) expect(at(q)).toBeLessThan(at('Google Deutsch'));
    expect(at('Google Deutsch')).toBeLessThan(at('Anna'));
    for (const n of ['Eddy', 'Flo', 'Grandma', 'Grandpa', 'Reed', 'Rocko', 'Sandy', 'Shelley']) expect(at('Yannick')).toBeLessThan(at(n));
    expect(r.slice(0, 4).sort()).toEqual(['Conrad Neural', 'Katja Online (Natural)', 'Markus Premium', 'Petra Enhanced']);
  });

  it('puts de-DE before de-AT and de-CH within a rank, then by name', () => {
    const r = rankGermanVoices([v('Zed', 'de-CH'), v('Max', 'de-AT'), v('Yves', 'de-DE'), v('Ada', 'de-DE')]);
    expect(names(r)).toEqual(['Ada', 'Yves', 'Max', 'Zed']);
  });

  it('ranks Anna first in the macOS set', () => {
    const mac = [v('Eddy (Deutsch (Deutschland))'), v('Flo (Deutsch (Deutschland))'), v('Grandma (Deutsch (Deutschland))'), v('Anna'), v('Reed (Deutsch (Deutschland))'), v('Sandy (Deutsch (Deutschland))'), v('Shelley (Deutsch (Deutschland))'), v('Rocko (Deutsch (Deutschland))'), v('Grandpa (Deutsch (Deutschland))'), v('Alex', 'en-US')];
    expect(rankGermanVoices(mac)[0].name).toBe('Anna');
  });

  it('does not mutate its input', () => {
    const input = [v('Eddy'), v('Anna')];
    rankGermanVoices(input);
    expect(names(input)).toEqual(['Eddy', 'Anna']);
  });
});
