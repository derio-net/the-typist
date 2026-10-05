import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseRaw } from '../../tools/parse/index';
import { parseHeader, slug } from '../../tools/parse/headers';
import { splitEntry } from '../../tools/parse/lines';

const fx = (name: string) => readFileSync(`tests/fixtures/raw/${name}`, 'utf8');
const opts = { id: 'fixture', title: 'Fixture' };

describe('entry detection', () => {
  it("treats only lines containing ' – ' (U+2013 with spaces) as entries", () => {
    expect(splitEntry('die Fakultät – faculty')).toEqual({ lhs: 'die Fakultät', rhs: 'faculty' });
    expect(splitEntry('prose with an em dash — vital for learners')).toBeNull();
    expect(splitEntry('hyphen - not an entry')).toBeNull();
    expect(splitEntry('en–dash without spaces')).toBeNull();
  });
  it('splits on the first separator only and never normalises dashes', () => {
    expect(splitEntry('a – b – c')).toEqual({ lhs: 'a', rhs: 'b – c' });
  });
  it('skips prose, Usage Notes and stray text silently, keeping 1-based source lines', () => {
    const res = parseRaw(fx('section1-head.txt'), opts);
    expect(res.records.map((r) => r.lemma)).toEqual(['Fakultät', 'Institut', 'Bibliothek', 'Mensa']);
    expect(res.records.map((r) => r.source_lines)).toEqual([[6], [8], [10], [12]]);
    expect(res.unresolved).toEqual([]);
  });
  it('does not treat an em-dash intro paragraph as an entry', () => {
    const res = parseRaw(fx('politics-intro.txt'), opts);
    expect(res.records).toHaveLength(1);
    expect(res.records[0].source_lines).toEqual([6]);
    expect(res.unresolved).toEqual([]);
  });
  it('skips Usage Notes blocks and stray text', () => {
    for (const f of ['usage-notes.txt', 'stray.txt']) {
      const res = parseRaw(fx(f), opts);
      expect(res.records).toEqual([]);
      expect(res.unresolved).toEqual([]);
    }
  });
});

describe('headers', () => {
  it('parses `<emoji> N. Title` into a category', () => {
    expect(parseHeader('📚 1. Academic & Higher Education')).toEqual({
      id: 'academic-and-higher-education',
      title: 'Academic & Higher Education',
      order: 1,
    });
    expect(parseHeader('🙋‍♂️ 5. Formal & Informal Address')?.order).toBe(5);
  });
  it('does not mistake prose for a header', () => {
    expect(parseHeader('At B2 level, you’re expected to handle 2. things')).toBeNull();
    expect(parseHeader('Usage Notes:')).toBeNull();
    expect(parseHeader('')).toBeNull();
  });
  it('slugs: lowercase, ascii-fold umlauts, & to and, non-alnum to dash', () => {
    expect(slug('Separable Verbs (Trennbare Verben)')).toBe('separable-verbs-trennbare-verben');
    expect(slug('Größe & Übung')).toBe('groesse-and-uebung');
  });
  it('collects categories from the section headers and tags records with the current one', () => {
    const res = parseRaw(fx('section1-head.txt') + fx('politics-intro.txt'), opts);
    expect(res.categories.map((c) => c.id)).toEqual(['academic-and-higher-education', 'government-and-politics']);
    expect(res.records[0].categories).toEqual(['academic-and-higher-education']);
    expect(res.records.at(-1)?.categories).toEqual(['government-and-politics']);
  });
});
