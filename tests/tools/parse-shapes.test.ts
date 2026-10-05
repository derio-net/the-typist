import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseRaw } from '../../tools/parse/index';
import { buildPlural } from '../../tools/parse/entry';
import { splitEntry } from '../../tools/parse/lines';

const FIXTURE = readFileSync('tests/fixtures/raw/shapes.txt', 'utf8').split('\n').filter(Boolean);

/** The real seed line whose left side is `lhs` (throws when the capture lacks it). */
const seedLine = (lhs: string): string => {
  const line = FIXTURE.find((l) => splitEntry(l)?.lhs === lhs);
  if (!line) throw new Error(`not in tests/fixtures/raw/shapes.txt: ${lhs}`);
  return line;
};
const one = (lhs: string) => {
  const res = parseRaw(`📚 1. Test Section\n\n${seedLine(lhs)}\n`, { id: 'fixture', title: 'F' });
  return { records: res.records, unresolved: res.unresolved };
};
const rec = (lhs: string) => {
  const { records, unresolved } = one(lhs);
  expect(unresolved).toEqual([]);
  expect(records).toHaveLength(1);
  return records[0];
};
const unresolved = (lhs: string) => {
  const { records, unresolved: u } = one(lhs);
  expect(records).toEqual([]);
  expect(u).toHaveLength(1);
  return u[0];
};

describe('resolved shapes', () => {
  it('article + noun + plural: die Börse, -n', () => {
    const r = rec('die Börse, -n');
    expect(r).toMatchObject({
      id: 'noun-boerse', type: 'noun', lemma: 'Börse', gloss: ['stock exchange'], status: 'raw',
      source_lines: [3], categories: ['test-section'], noun: { gender: 'f', plural: 'Börsen' },
    });
  });
  it('article + adjective + noun: das akademische Jahr', () => {
    expect(rec('das akademische Jahr')).toMatchObject({
      id: 'noun-akademische-jahr', lemma: 'akademische Jahr', noun: { gender: 'n', plural: null },
    });
  });
  it.each([
    ['das Gesetz, -e', 'Gesetze'],
    ['der Schock, -s', 'Schocks'],
    ['das Verfahren, -', 'Verfahren'],
    ['das Bundesland, -länder', 'Bundesländer'],
    ['das Amt, Ämter', 'Ämter'],
    ['das Museum, Museen', 'Museen'],
    ['der Algorithmus, -men', 'Algorithmen'],
    ['der Zustand, -stände', 'Zustände'],
  ])('plural form %s', (lhs, plural) => {
    expect(rec(lhs).noun?.plural).toBe(plural);
  });
  it('plural form the parser cannot build is undefined', () => {
    expect(buildPlural('Zustand', '-xyz')).toBeNull();
  });
  it('(pl.) is plural_only', () => {
    expect(rec('die Nebenkosten (pl.)').noun).toEqual({ gender: 'f', plural: null, plural_only: true });
  });
  it('dual gender: the second lemma is the first plus -in (optionally umlauted)', () => {
    expect(rec('der Dozent / die Dozentin')).toMatchObject({
      lemma: 'Dozent', gloss: ['lecturer'],
      noun: { gender: 'm', plural: null, variants: [{ lemma: 'Dozentin', gender: 'f' }] },
    });
    expect(rec('der Anwalt / die Anwältin').noun?.variants).toEqual([{ lemma: 'Anwältin', gender: 'f' }]);
    expect(rec('der Künstler / die Künstlerin').noun?.variants?.[0].lemma).toBe('Künstlerin');
  });
  it('dual gender with the same lemma', () => {
    expect(rec('der Vorgesetzte / die Vorgesetzte').noun?.variants).toEqual([{ lemma: 'Vorgesetzte', gender: 'f' }]);
  });
  it('article-less single -en word is a verb', () => {
    expect(rec('publizieren')).toMatchObject({ id: 'verb-publizieren', type: 'verb', lemma: 'publizieren', gloss: ['to publish'] });
  });
  it('reflexive verbs keep sich in the lemma but not in the id', () => {
    expect(rec('sich vorstellen')).toMatchObject({ id: 'verb-vorstellen', type: 'verb', lemma: 'sich vorstellen' });
    expect(rec('verabschieden (sich)')).toMatchObject({ id: 'verb-verabschieden', type: 'verb', lemma: 'sich verabschieden' });
    expect(rec('verabschieden (sich)').government).toBeUndefined();
  });
  it('parenthetical government', () => {
    expect(rec('anlegen (in)')).toMatchObject({ type: 'verb', lemma: 'anlegen', government: 'in' });
    expect(rec('forschen (an + D)').government).toBe('an + D');
    expect(rec('der Bedarf (an + D)')).toMatchObject({ type: 'noun', lemma: 'Bedarf', government: 'an + D' });
    expect(rec('sich bedanken (für)')).toMatchObject({ lemma: 'sich bedanken', government: 'für' });
    expect(rec('auseinandersetzen (sich mit)')).toMatchObject({ lemma: 'sich auseinandersetzen', government: 'mit' });
  });
  it('parenthetical abbreviation', () => {
    expect(rec('die künstliche Intelligenz (KI)')).toMatchObject({
      lemma: 'künstliche Intelligenz', abbreviation: 'KI', noun: { gender: 'f' },
    });
  });
  it('splits the gloss on top-level commas', () => {
    expect(rec('der Vorgesetzte / die Vorgesetzte').gloss).toEqual(['superior', 'manager']);
    expect(rec('der Zustand, -stände').gloss).toEqual(['state', 'condition']);
    expect(rec('das Amt, Ämter').gloss).toEqual(['office (public administration)']);
  });
});

describe('unresolved shapes', () => {
  it.each([
    ['der Herr / die Frau', 'slash'],
    ['der Gewinn / der Verlust', 'slash'],
    ['das Darlehen / der Kredit', 'slash'],
    ['die Hauptrolle / Nebenrolle', 'slash'],
    ['gut / schlecht gelaunt', 'slash'],
    ['sich anmelden / abmelden', 'slash'],
    ['zunächst / außerdem / jedoch / dennoch / schließlich', 'list'],
    ['dürfen / möchten / könnten', 'list'],
    ['das Angebot und die Nachfrage', 'und'],
    ['das ist nicht mein Bier', 'phrase'],
    ['die Daumen drücken', 'phrase'],
    ['Sehr geehrte(r)...', 'template'],
    ['traurig', 'word'],
    ['verabschieden (ein Gesetz)', 'parenthetical'],
  ])('%s lands in unresolved with reason %s', (lhs, reason) => {
    const u = unresolved(lhs);
    expect(u.reason).toBe(reason);
    expect(u.text).toBe(seedLine(lhs));
    expect(u.line).toBe(3);
  });
});
