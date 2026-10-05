import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseList } from '../src/schema';
import { parseHeader } from '../tools/parse/headers';

const rawLines = readFileSync('wordlist.raw.txt', 'utf8').split(/\r?\n/);
const parsed = parseList(readFileSync('lists/de-b2-1000.yaml', 'utf8'));

describe('seed list de-b2-1000', () => {
  it('parses and validates', () => {
    expect(parsed.ok ? [] : parsed.errors).toEqual([]);
  });

  it('declares exactly the 20 categories derived from the raw headers', () => {
    if (!parsed.ok) throw new Error('list does not parse');
    const headerIds = rawLines.map(parseHeader).flatMap((c) => (c ? [c.id] : []));
    expect(headerIds).toHaveLength(20);
    expect(parsed.list.categories.map((c) => c.id)).toEqual(headerIds);
  });

  it('has every record enriched', () => {
    if (!parsed.ok) throw new Error('list does not parse');
    const notEnriched = parsed.list.records.filter((r) => r.status !== 'enriched').map((r) => r.id);
    expect(notEnriched).toEqual([]);
  });

  it("covers exactly the 1000 source lines containing ' – '", () => {
    if (!parsed.ok) throw new Error('list does not parse');
    const entryLines = rawLines.flatMap((l, i) => (l.includes(' – ') ? [i + 1] : []));
    expect(entryLines).toHaveLength(1000);
    const covered = new Set(parsed.list.records.flatMap((r) => r.source_lines));
    expect([...covered].sort((a, b) => a - b)).toEqual(entryLines);
  });
});
