import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parse as parseYaml, stringify } from 'yaml';
import { findDuplicates, mergeRecords, nextBatch, stats, type OrganiseList } from '../../tools/organise/index';

const rec = (id: string, over: Record<string, unknown> = {}) => ({
  id,
  type: 'noun',
  lemma: 'der Test',
  gloss: ['test'],
  categories: ['a'],
  status: 'raw',
  source_lines: [1],
  ...over,
});

const list = (records: Record<string, unknown>[]): OrganiseList =>
  ({
    categories: [
      { id: 'a', title: 'A', order: 2 },
      { id: 'b', title: 'B', order: 1 },
    ],
    records,
  }) as unknown as OrganiseList;

describe('findDuplicates', () => {
  it('groups records with the same type and lemma, in list order', () => {
    const l = list([
      rec('noun-test', { lemma: 'der Test' }),
      rec('noun-x', { lemma: 'der X' }),
      rec('noun-test-2', { lemma: 'der Test' }),
      rec('verb-test', { type: 'verb', lemma: 'der Test' }),
      rec('noun-test-3', { lemma: 'der Test' }),
    ]);
    expect(findDuplicates(l)).toEqual([['noun-test', 'noun-test-2', 'noun-test-3']]);
  });
  it('finds none in a clean list', () => {
    expect(findDuplicates(list([rec('a'), rec('b', { lemma: 'die Tür' })]))).toEqual([]);
  });
});

describe('mergeRecords', () => {
  const l = list([
    rec('noun-test', { categories: ['a'], source_lines: [5], gloss: ['test', 'exam'], status: 'raw' }),
    rec('noun-mid', { lemma: 'der Mid' }),
    rec('noun-test-2', { categories: ['b', 'a'], source_lines: [2, 5], gloss: ['exam', 'trial'], status: 'enriched' }),
  ]);
  const out = mergeRecords(l, ['noun-test', 'noun-test-2']);
  it('keeps the first id and drops the rest', () => {
    expect(out.records.map((r) => r.id)).toEqual(['noun-test', 'noun-mid']);
  });
  it('unions categories with the first staying primary, and source_lines', () => {
    expect(out.records[0].categories).toEqual(['a', 'b']);
    expect(out.records[0].source_lines).toEqual([2, 5]);
  });
  it('merges glosses without duplicates and keeps the most advanced status', () => {
    expect(out.records[0].gloss).toEqual(['test', 'exam', 'trial']);
    expect(out.records[0].status).toBe('enriched');
  });
  it('does not mutate its input', () => {
    expect(l.records).toHaveLength(3);
  });
});

describe('nextBatch', () => {
  const l = list([
    rec('r1', { categories: ['a'] }),
    rec('r2', { categories: ['b'] }),
    rec('done', { categories: ['b'], status: 'enriched' }),
    rec('r3', { categories: ['a'] }),
    rec('r4', { categories: ['b'] }),
  ]);
  it('returns raw ids by primary-category order then list order', () => {
    expect(nextBatch(l)).toEqual(['r2', 'r4', 'r1', 'r3']);
  });
  it('honours n and the category scope', () => {
    expect(nextBatch(l, 2)).toEqual(['r2', 'r4']);
    expect(nextBatch(l, 25, 'a')).toEqual(['r1', 'r3']);
  });
  it('defaults to 25', () => {
    const big = list(Array.from({ length: 30 }, (_, i) => rec(`n${i}`)));
    expect(nextBatch(big)).toHaveLength(25);
  });
});

describe('stats', () => {
  it('counts by status and type', () => {
    const s = stats(list([rec('a'), rec('b', { status: 'enriched', type: 'verb' }), rec('c')]));
    expect(s).toEqual({
      total: 3,
      status: { raw: 2, enriched: 1, reviewed: 0 },
      type: { noun: 2, verb: 1, adjective: 0, phrase: 0 },
    });
  });
});

describe('cli', () => {
  const dir = mkdtempSync(join(tmpdir(), 'typist-organise-'));
  const file = join(dir, 'l.yaml');
  const doc = {
    schema: 1,
    list: { id: 'l', title: 'L', lang: 'de', gloss_lang: 'en' },
    categories: [{ id: 'a', title: 'A', order: 1 }],
    records: [rec('noun-test'), rec('noun-other', { lemma: 'die Tür', source_lines: [2] }), rec('noun-test-2', { source_lines: [3] })],
  };
  writeFileSync(file, stringify(doc));
  const tsx = (...args: string[]) => spawnSync('node_modules/.bin/tsx', ['tools/cli.ts', ...args], { encoding: 'utf8' });

  it('dupes prints groups, stats prints counts, next-batch prints ids', () => {
    expect(tsx('dupes', file).stdout).toContain('noun-test noun-test-2');
    expect(tsx('stats', file).stdout).toContain('raw: 3');
    expect(tsx('next-batch', file, '--n', '2').stdout.trim().split('\n')).toEqual(['noun-test', 'noun-other']);
  });
  it('merge-dupes applies in place and the result still validates', () => {
    const r = tsx('merge-dupes', file);
    expect(r.status).toBe(0);
    const out = parseYaml(readFileSync(file, 'utf8'));
    expect(out.records.map((x: { id: string }) => x.id)).toEqual(['noun-test', 'noun-other']);
    expect(out.records[0].source_lines).toEqual([1, 3]);
    expect(out.list.id).toBe('l');
    expect(tsx('validate', file).status).toBe(0);
    expect(tsx('dupes', file).stdout).toContain('no duplicates');
  });
  it('rejects a missing file argument', () => {
    expect(tsx('stats').status).toBe(1);
  });
});
