import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { readFileSync } from 'node:fs';
import { EQUIVALENCES, isTypeable, normaliseTyped } from '../../src/schema/typeable';
import { RecordSchema } from '../../src/schema/record';

describe('normaliseTyped', () => {
  it.each([
    ['’', "'"], ['‘', "'"], ['„', '"'], ['“', '"'], ['”', '"'], ['«', '"'], ['»', '"'],
    ['–', '-'], ['—', '-'], ['₂', '2'],
  ])('maps %s to %s', (from, to) => {
    expect(normaliseTyped(from)).toBe(to);
    expect(EQUIVALENCES[from]).toBe(to);
  });
  it('leaves umlauts alone', () => {
    expect(normaliseTyped('Straße Ärger')).toBe('Straße Ärger');
  });
});

describe('isTypeable', () => {
  it.each(['Die Börse schloss gestern.', 'CO₂-Ausstoß', 'Er sagte: „Ja“ – und ging.', 'sich anmelden'])(
    'accepts %s',
    (s) => expect(isTypeable(s)).toBe(true),
  );
  it.each(['Sehr geehrte(r)...', 'dass…', 'der Fuß (e)', 'a · b', 'Hallo 😀', 'Tab\there', 'x...'])(
    'rejects %s',
    (s) => expect(isTypeable(s)).toBe(false),
  );
});

describe('record typeability', () => {
  const fixture = parse(readFileSync('tests/fixtures/lists/valid.yaml', 'utf8'));
  it('names the example index when an example is untypeable', () => {
    const r = JSON.parse(JSON.stringify(fixture.records[0]));
    r.examples[1].de = 'Die Börsen · öffnen.';
    const res = RecordSchema.safeParse(r);
    expect(res.success).toBe(false);
    expect(res.error!.issues.map((i) => i.message).join()).toMatch(/examples\[1\]/);
  });
  it('does not check raw records', () => {
    expect(
      RecordSchema.safeParse({ id: 'phrase-x', type: 'phrase', lemma: 'Sehr geehrte(r)...', gloss: ['x'], status: 'raw', source_lines: [1] })
        .success,
    ).toBe(true);
  });
  it('rejects an untypeable lemma on an enriched record', () => {
    const r = JSON.parse(JSON.stringify(fixture.records[0]));
    r.lemma = 'Bör·se';
    expect(RecordSchema.safeParse(r).success).toBe(false);
  });
});
