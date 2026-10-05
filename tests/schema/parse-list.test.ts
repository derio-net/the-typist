import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
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
});
