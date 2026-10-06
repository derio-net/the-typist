import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { parse, stringify } from 'yaml';
import { parseList } from '../../src/schema';

describe('parseList', () => {
  it('parses a valid list', () => {
    const r = parseList(readFileSync('tests/fixtures/lists/valid.yaml', 'utf8'));
    expect(r.ok && r.list.records).toHaveLength(3);
  });
  it('formats record errors with index and id', () => {
    const r = parseList(readFileSync('tests/fixtures/lists/invalid.yaml', 'utf8'));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors).toEqual([expect.stringMatching(/^records\[0\] \(noun-boerse\): noun needs at least 3 examples/)]);
  });
  it('reports YAML syntax errors', () => {
    const r = parseList('a: [');
    expect(r.ok).toBe(false);
  });
  it('reports non-list documents', () => {
    expect(parseList('42').ok).toBe(false);
  });
  it('prefixes field paths inside records', () => {
    const r = parseList('schema: 1\nlist: {id: a, title: b, lang: de, gloss_lang: en}\nrecords:\n  - {id: x, type: noun, lemma: X, gloss: [], status: raw, source_lines: [1]}\n');
    expect(!r.ok && r.errors[0]).toMatch(/^records\[0\] \(x\): gloss: /);
  });

  describe('single pass (R9)', () => {
    const base = () => parse(readFileSync('tests/fixtures/lists/valid.yaml', 'utf8'));
    const errs = (l: unknown) => {
      const r = parseList(stringify(l));
      return r.ok ? [] : r.errors;
    };
    it('reports record and list errors together', () => {
      const l = base();
      delete l.records[0].gloss; // malformed record
      l.records[2].id = l.records[1].id; // duplicate record id among valid records
      l.categories.push({ ...l.categories[0] }); // duplicate category id
      l.records[1].categories = ['nope']; // undeclared category
      const e = errs(l);
      expect(e).toEqual(
        expect.arrayContaining([
          expect.stringMatching(/^records\[0\] \(noun-boerse\): gloss: /),
          expect.stringMatching(/^records\[2\] \(verb-anlegen\): duplicate id 'verb-anlegen'/),
          expect.stringMatching(/duplicate category id 'economics-finance'/),
          expect.stringMatching(/^records\[1\] \(verb-anlegen\): undeclared category 'nope'/),
        ]),
      );
      expect(e).toHaveLength(4);
    });
    it('header rules still apply to enriched records', () => {
      const l = base();
      l.list.rules = { noun_examples: 4 };
      expect(errs(l).join()).toMatch(/records\[0\] \(noun-boerse\): .*at least 4 examples/);
    });
    it('a broken header is reported and records use default minimums', () => {
      const l = base();
      delete l.list.title;
      l.records[0].examples.pop();
      const e = errs(l);
      expect(e.some((m) => /^list\./.test(m) || /title/.test(m))).toBe(true);
      expect(e.join()).toMatch(/records\[0\] \(noun-boerse\): noun needs at least 3 examples/);
    });
  });
});
