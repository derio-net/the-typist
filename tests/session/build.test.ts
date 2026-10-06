import { createEmptyCard } from 'ts-fsrs';
import { describe, expect, it } from 'vitest';
import { buildFreePlay, buildStudy, seededRng, shuffle } from '../../src/session/build';
import type { VocabList } from '../../src/schema/list';
import type { VocabRecord } from '../../src/schema/record';
import type { StoredCard } from '../../src/srs/store';

const now = new Date('2026-10-06T12:00:00Z');
const day = (n: number) => new Date(now.getTime() + n * 86_400_000);

const rec = (id: string, categories: string[] | undefined, status: VocabRecord['status'] = 'enriched'): VocabRecord =>
  ({ id, type: 'phrase', lemma: id, gloss: ['g'], status, source_lines: [1], ...(categories ? { categories } : {}) }) as VocabRecord;
const mk = (records: VocabRecord[], categories?: string[]): VocabList => ({
  schema: 1,
  list: { id: 'L', title: 'T', lang: 'de', gloss_lang: 'en' },
  ...(categories ? { categories: categories.map((id, i) => ({ id, title: id, order: i })) } : {}),
  records,
}) as VocabList;
const card = (due: Date): StoredCard => ({ card: { ...createEmptyCard(due), due }, seen: 1, typos: 0, escapes: 0 });
const ids = (waves: VocabRecord[][] | undefined) => (waves ?? []).map((w) => w.map((r) => r.id).sort());

const list = mk(
  [
    rec('a1', ['A']), rec('a2', ['A']), rec('b1', ['B']), rec('b2', ['B']), rec('c1', ['C']), rec('c2', ['C']),
    rec('raw1', ['A'], 'raw'),
  ],
  ['A', 'B', 'C'],
);

describe('buildStudy (R2)', () => {
  it('orders categories by their most overdue card; new-only categories last, in order', () => {
    const cards = { c1: card(day(-1)), b1: card(day(-5)), a1: card(day(2)) };
    const r = buildStudy(list, cards, 0, 0, now, seededRng(1));
    expect(ids(r.waves)).toEqual([['b1'], ['c1']]);
    const r2 = buildStudy(list, cards, 0, 10, now, seededRng(1));
    // b (5 days overdue), c (1 day), then A holds only new records (a2; a1 is not yet due)
    expect(ids(r2.waves)).toEqual([['b1', 'b2'], ['c1', 'c2'], ['a2']]);
  });
  it('takes new records in list order up to cap - newCountToday', () => {
    const r = buildStudy(list, {}, 7, 10, now, seededRng(1));
    expect(ids(r.waves)).toEqual([['a1', 'a2'], ['b1']]);
  });
  it('excludes raw records', () => {
    expect(ids(buildStudy(list, {}, 0, 50, now, seededRng(1)).waves).flat()).not.toContain('raw1');
  });
  it('splits a category into waves of at most 6', () => {
    const big = mk(Array.from({ length: 14 }, (_, i) => rec(`r${i}`, ['A'])), ['A']);
    const r = buildStudy(big, {}, 0, 50, now, seededRng(1));
    expect((r.waves ?? []).map((w) => w.length)).toEqual([6, 6, 2]);
  });
  it('shuffles within a wave, deterministically for a seed', () => {
    const big = mk(Array.from({ length: 6 }, (_, i) => rec(`r${i}`, ['A'])), ['A']);
    const run = (seed: number) => buildStudy(big, {}, 0, 50, now, seededRng(seed)).waves?.[0].map((r) => r.id);
    expect(run(3)).toEqual(run(3));
    expect(run(3)).not.toEqual(['r0', 'r1', 'r2', 'r3', 'r4', 'r5']);
    expect([...run(3)!].sort()).toEqual(['r0', 'r1', 'r2', 'r3', 'r4', 'r5']);
  });
  it('chunks an uncategorised list in record order', () => {
    const flat = mk(Array.from({ length: 8 }, (_, i) => rec(`r${i}`, undefined)));
    const r = buildStudy(flat, {}, 0, 50, now, seededRng(1));
    expect(ids(r.waves)).toEqual([['r0', 'r1', 'r2', 'r3', 'r4', 'r5'], ['r6', 'r7']]);
  });
  it('reports no-playable and nothing-due', () => {
    expect(buildStudy(mk([rec('x', undefined, 'raw')]), {}, 0, 10, now, seededRng(1))).toEqual({ empty: 'no-playable' });
    expect(buildStudy(mk([]), {}, 0, 10, now, seededRng(1))).toEqual({ empty: 'no-playable' });
    const cards = Object.fromEntries(list.records.map((r) => [r.id, card(day(3))]));
    expect(buildStudy(list, cards, 0, 10, now, seededRng(1))).toEqual({ empty: 'nothing-due' });
    expect(buildStudy(list, {}, 10, 10, now, seededRng(1))).toEqual({ empty: 'nothing-due' });
  });
});

describe('buildFreePlay (R3)', () => {
  it('takes every playable record in the category, a non-primary member included', () => {
    const l = mk([rec('x', ['A', 'B']), rec('y', ['B']), rec('z', ['A']), rec('w', ['B'], 'raw')], ['A', 'B']);
    const r = buildFreePlay(l, 'B', seededRng(1));
    expect(ids(r.waves)).toEqual([['x', 'y']]);
  });
  it('splits into waves of at most 6', () => {
    const l = mk(Array.from({ length: 13 }, (_, i) => rec(`r${i}`, ['A'])), ['A']);
    expect((buildFreePlay(l, 'A', seededRng(1)).waves ?? []).map((w) => w.length)).toEqual([6, 6, 1]);
  });
  it('plays an uncategorised list whole, in order', () => {
    const flat = mk(Array.from({ length: 7 }, (_, i) => rec(`r${i}`, undefined)));
    const w = buildFreePlay(flat, null, seededRng(1)).waves ?? [];
    expect(w.flat().map((r) => r.id)).toEqual(['r0', 'r1', 'r2', 'r3', 'r4', 'r5', 'r6']);
  });
  it('reports no-playable', () => {
    expect(buildFreePlay(mk([rec('x', undefined, 'raw')]), null, seededRng(1))).toEqual({ empty: 'no-playable' });
  });
});

describe('shuffle', () => {
  it('does not mutate its input', () => {
    const a = [1, 2, 3, 4];
    shuffle(a, seededRng(2));
    expect(a).toEqual([1, 2, 3, 4]);
  });
});
