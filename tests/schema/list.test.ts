import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { readFileSync } from 'node:fs';
import { ListSchema } from '../../src/schema/list';

const base = () => parse(readFileSync('tests/fixtures/lists/valid.yaml', 'utf8'));
const msgs = (v: unknown) => {
  const r = ListSchema.safeParse(v);
  return r.success ? [] : r.error.issues.map((i) => i.message);
};

describe('ListSchema', () => {
  it('accepts the valid fixture', () => {
    expect(msgs(base())).toEqual([]);
  });
  it('rejects duplicate ids', () => {
    const l = base();
    l.records[1].id = l.records[0].id;
    expect(msgs(l).join()).toMatch(/duplicate id/);
  });
  it('rejects an undeclared category', () => {
    const l = base();
    l.records[0].categories = ['nope'];
    expect(msgs(l).join()).toMatch(/undeclared category/);
  });
  it('rejects an uncategorised record in a list that declares categories', () => {
    const l = base();
    delete l.records[0].categories;
    expect(msgs(l).join()).toMatch(/at least one category/);
  });
  it('accepts a list without categories and uncategorised records', () => {
    const l = base();
    delete l.categories;
    for (const r of l.records) delete r.categories;
    expect(msgs(l)).toEqual([]);
  });
  it('applies header rules to every enriched record', () => {
    const l = base();
    l.list.rules = { noun_examples: 4 };
    expect(msgs(l).join()).toMatch(/at least 4 examples/);
  });
  it('rejects a wrong schema version', () => {
    const l = base();
    l.schema = 2;
    expect(msgs(l).length).toBeGreaterThan(0);
  });
});
