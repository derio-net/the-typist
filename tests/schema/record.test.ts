import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { readFileSync } from 'node:fs';
import { RecordSchema, checkRecordRules, type VocabRecord } from '../../src/schema/record';

const fixture = parse(readFileSync('tests/fixtures/lists/valid.yaml', 'utf8'));
const noun: VocabRecord = fixture.records[0];
const verb: VocabRecord = fixture.records[1];

const ex = (de: string, ...tags: string[]) => ({ de, en: 'x', tags });
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));
const withExamples = (r: VocabRecord, examples: unknown[]) => ({ ...clone(r), examples });
const ok = (r: unknown) => RecordSchema.safeParse(r).success;
const messages = (r: unknown) => {
  const res = RecordSchema.safeParse(r);
  return res.success ? [] : res.error.issues.map((i) => i.message);
};

const adjective = (over: object = {}) => ({
  id: 'adjective-wichtig', type: 'adjective', lemma: 'wichtig', gloss: ['important'],
  status: 'enriched', source_lines: [3],
  adjective: { gradable: true, comparative: 'wichtiger', superlative: 'am wichtigsten' },
  examples: [
    ex('Das ist ein wichtiger Punkt.', 'attributive'),
    ex('Das ist wichtiger als Geld.', 'comparative'),
  ],
  ...over,
});
const phrase = (examples: unknown[]) => ({
  id: 'phrase-jedoch', type: 'phrase', lemma: 'jedoch', gloss: ['however'],
  status: 'enriched', source_lines: [4], examples,
});

describe('RecordSchema', () => {
  it('accepts a raw record with only the minimum fields', () => {
    expect(ok({ id: 'noun-x', type: 'noun', lemma: 'X', gloss: ['x'], status: 'raw', source_lines: [1] })).toBe(true);
  });

  it('accepts valid enriched noun, verb, adjective and phrase', () => {
    expect(ok(noun)).toBe(true);
    expect(ok(verb)).toBe(true);
    expect(ok(adjective())).toBe(true);
    expect(ok(phrase([ex('Er kam jedoch zu spät.'), ex('Jedoch blieb sie.')]))).toBe(true);
  });

  it('rejects structural problems', () => {
    expect(ok({ ...clone(noun), gloss: [] })).toBe(false);
    expect(ok({ ...clone(noun), source_lines: [] })).toBe(false);
    expect(ok({ ...clone(noun), status: 'done' })).toBe(false);
    expect(ok({ ...clone(noun), type: 'adverb' })).toBe(false);
  });

  it('rejects an enriched record missing its type block', () => {
    const r: any = clone(noun);
    delete r.noun;
    expect(ok(r)).toBe(false);
  });

  describe('noun', () => {
    it('fails with only 2 examples', () => {
      expect(ok(withExamples(noun, noun.examples!.slice(0, 2)))).toBe(false);
    });
    it('fails with no plural-tagged example', () => {
      const r = withExamples(noun, [ex('A a.', 'singular'), ex('B b.', 'singular'), ex('C c.', 'singular')]);
      expect(messages(r).join()).toMatch(/plural/);
    });
    it('fails with no singular-tagged example', () => {
      const r = withExamples(noun, [ex('A a.', 'plural'), ex('B b.', 'plural'), ex('C c.', 'plural')]);
      expect(messages(r).join()).toMatch(/singular/);
    });
    it('passes without a plural example when plural is null', () => {
      const r: any = withExamples(noun, [ex('A a.', 'singular'), ex('B b.'), ex('C c.')]);
      r.noun = { gender: 'f', plural: null };
      expect(ok(r)).toBe(true);
    });
    it('passes without a plural example when plural_only', () => {
      const r: any = withExamples(noun, [ex('A a.'), ex('B b.'), ex('C c.')]);
      r.noun = { gender: 'f', plural: 'Nebenkosten', plural_only: true };
      expect(ok(r)).toBe(true);
    });
    it('ignores unrecognised tags', () => {
      const r = withExamples(noun, [ex('A a.', 'singular'), ex('B b.', 'plural'), ex('C c.', 'whatever')]);
      expect(ok(r)).toBe(true);
    });
  });

  describe('verb', () => {
    it('fails with examples in only one tense', () => {
      const r = withExamples(verb, [
        ex('A a.', 'Präsens', 'separated'), ex('B b.', 'Präsens'), ex('C c.', 'Präsens'),
      ]);
      expect(messages(r).join()).toMatch(/tense/);
    });
    it('fails for a separable verb with no separated example', () => {
      const r = withExamples(verb, [ex('A a.', 'Präsens'), ex('B b.', 'Perfekt'), ex('C c.', 'Perfekt')]);
      expect(messages(r).join()).toMatch(/separated/);
    });
    it('passes a non-separable verb without a separated example', () => {
      const r: any = withExamples(verb, [ex('A a.', 'Präsens'), ex('B b.', 'Perfekt'), ex('C c.', 'Perfekt')]);
      r.verb.separable = undefined;
      expect(ok(r)).toBe(true);
    });
    it('fails with 2 examples', () => {
      expect(ok(withExamples(verb, verb.examples!.slice(0, 2)))).toBe(false);
    });
  });

  describe('adjective', () => {
    it('fails without an attributive example', () => {
      const r = adjective({ examples: [ex('A a.', 'comparative'), ex('B b.', 'superlative')] });
      expect(messages(r).join()).toMatch(/attributive/);
    });
    it('fails when gradable without comparative/superlative example', () => {
      const r = adjective({ examples: [ex('A a.', 'attributive'), ex('B b.', 'attributive')] });
      expect(messages(r).join()).toMatch(/comparative/);
    });
    it('passes when not gradable and attributive present', () => {
      const r = adjective({
        adjective: { gradable: false },
        examples: [ex('A a.', 'attributive'), ex('B b.')],
      });
      expect(ok(r)).toBe(true);
    });
    it('fails with one example', () => {
      expect(ok(adjective({ examples: [ex('A a.', 'attributive')] }))).toBe(false);
    });
  });

  describe('phrase', () => {
    it('fails with 1 example', () => {
      expect(ok(phrase([ex('Er kam jedoch.')]))).toBe(false);
    });
  });

  describe('rules from list header', () => {
    it('noun_examples: 4 raises the minimum', () => {
      expect(checkRecordRules(noun, { noun_examples: 4 }).length).toBeGreaterThan(0);
      expect(checkRecordRules(noun, { noun_examples: 3 })).toEqual([]);
    });
    it('verb_examples raises the minimum', () => {
      expect(checkRecordRules(verb, { verb_examples: 4 }).length).toBeGreaterThan(0);
    });
  });
});
