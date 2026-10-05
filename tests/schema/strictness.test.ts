import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { readFileSync } from 'node:fs';
import { RecordSchema } from '../../src/schema/record';
import { ListSchema } from '../../src/schema/list';

const fixture = parse(readFileSync('tests/fixtures/lists/valid.yaml', 'utf8'));
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));
const listMessages = (l: unknown) => {
  const res = ListSchema.safeParse(l);
  return res.success ? [] : res.error.issues.map((i) => i.message);
};

describe('unknown keys are rejected (p1-r1)', () => {
  it('rejects a misspelled key on a record', () => {
    const r = { ...clone(fixture.records[0]), plurl_only: true };
    expect(RecordSchema.safeParse(r).success).toBe(false);
  });
  it('rejects a misspelled key inside a type block', () => {
    const r = clone(fixture.records[1]);
    r.verb.separabel = 'an';
    expect(RecordSchema.safeParse(r).success).toBe(false);
  });
  it('rejects a misspelled header rule and category key', () => {
    const l = clone(fixture);
    l.list.rules = { noun_example: 5 };
    expect(ListSchema.safeParse(l).success).toBe(false);
    const m = clone(fixture);
    m.categories[0].ordr = 1;
    expect(ListSchema.safeParse(m).success).toBe(false);
  });
});

describe('gradable adjectives need both forms (p1-r2)', () => {
  const adj = (block: object) => ({
    id: 'adjective-wichtig', type: 'adjective', lemma: 'wichtig', gloss: ['important'],
    status: 'enriched', source_lines: [3], adjective: block,
    examples: [
      { de: 'Das ist ein wichtiger Punkt.', en: 'x', tags: ['attributive'] },
      { de: 'Das ist wichtiger als Geld.', en: 'x', tags: ['comparative'] },
    ],
  });
  it('fails when the superlative is missing', () => {
    expect(RecordSchema.safeParse(adj({ gradable: true, comparative: 'wichtiger' })).success).toBe(false);
  });
  it('passes with both forms', () => {
    const ok = adj({ gradable: true, comparative: 'wichtiger', superlative: 'am wichtigsten' });
    expect(RecordSchema.safeParse(ok).success).toBe(true);
  });
});

describe('list header and source lines (p1-r3, p1-r4, p1-r5)', () => {
  it('header rules may raise but not lower the minimums', () => {
    const l = clone(fixture);
    l.list.rules = { noun_examples: 1 };
    expect(ListSchema.safeParse(l).success).toBe(false);
  });
  it('source_lines are 1-based', () => {
    const r = { ...clone(fixture.records[0]), source_lines: [0] };
    expect(RecordSchema.safeParse(r).success).toBe(false);
  });
  it('duplicate category ids are rejected', () => {
    const l = clone(fixture);
    l.categories.push(clone(l.categories[0]));
    expect(listMessages(l).some((m) => m.includes('duplicate category'))).toBe(true);
  });
});
