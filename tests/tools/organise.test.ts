import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parse as parseYaml, stringify } from 'yaml';
import { findDuplicates, mergeRecords, nextBatch, stats, type OrganiseList } from '../../tools/organise/index';

type R = Record<string, unknown>;

const noun = (id: string, lemma: string, gender: string, plural: string | null, over: R = {}): R => ({
  id,
  type: 'noun',
  lemma,
  gloss: ['x'],
  categories: ['a'],
  status: 'raw',
  source_lines: [1],
  noun: { gender, plural },
  ...over,
});
const verb = (id: string, lemma: string, over: R = {}): R => ({
  id,
  type: 'verb',
  lemma,
  gloss: ['v'],
  categories: ['a'],
  status: 'raw',
  source_lines: [1],
  ...over,
});
const phrase = (id: string, lemma: string, over: R = {}): R => ({
  id,
  type: 'phrase',
  lemma,
  gloss: ['p'],
  categories: ['a'],
  status: 'raw',
  source_lines: [1],
  ...over,
});

const EXAMPLES = [
  { de: 'Der Vertrag liegt auf dem Tisch.', en: 'The contract is on the table.', tags: ['singular'] },
  { de: 'Die Verträge sind unterschrieben.', en: 'The contracts are signed.', tags: ['plural'] },
  { de: 'Wir lesen den Vertrag genau.', en: 'We read the contract closely.', tags: ['singular', 'Präsens'] },
];
const enrichedNoun = (id: string, over: R = {}): R =>
  noun(id, 'Vertrag', 'm', 'Verträge', { status: 'enriched', examples: EXAMPLES, source_note: 'checked', ...over });

const list = (records: R[]): OrganiseList =>
  ({
    categories: [
      { id: 'a', title: 'A', order: 2 },
      { id: 'b', title: 'B', order: 1 },
    ],
    records,
  }) as unknown as OrganiseList;

describe('findDuplicates', () => {
  it('groups nouns with the same lemma and gender, in list order', () => {
    const l = list([
      noun('noun-test', 'Test', 'm', null),
      noun('noun-x', 'X', 'm', null),
      noun('noun-test-2', 'Test', 'm', 'Tests'),
      verb('verb-test', 'Test'),
      noun('noun-test-3', 'Test', 'm', null),
    ]);
    expect(findDuplicates(l)).toEqual([['noun-test', 'noun-test-2', 'noun-test-3']]);
  });
  it('finds none in a clean list', () => {
    expect(findDuplicates(list([noun('a', 'Test', 'm', null), noun('b', 'Tür', 'f', null)]))).toEqual([]);
  });
  it('does not group gender homonyms', () => {
    const l = list([noun('noun-see-m', 'See', 'm', 'Seen'), noun('noun-see-f', 'See', 'f', null)]);
    expect(findDuplicates(l)).toEqual([]);
  });
  it('does not group reflexive and plain verbs, before sich moves out of the lemma', () => {
    const l = list([verb('verb-vorstellen', 'vorstellen'), verb('verb-sich-vorstellen', 'sich vorstellen')]);
    expect(findDuplicates(l)).toEqual([]);
  });
  it('does not group reflexive and plain verbs after sich moved out of the lemma', () => {
    const parts = { praesens_3sg: 'stellt vor', praeteritum: 'stellte vor', partizip2: 'vorgestellt' };
    const l = list([
      verb('verb-vorstellen', 'vorstellen', { verb: { auxiliary: 'haben', reflexive: false, parts } }),
      verb('verb-sich-vorstellen', 'vorstellen', { verb: { auxiliary: 'haben', reflexive: true, parts } }),
    ]);
    expect(findDuplicates(l)).toEqual([]);
  });
  it('groups a raw reflexive verb with its enriched twin', () => {
    const parts = { praesens_3sg: 'stellt vor', praeteritum: 'stellte vor', partizip2: 'vorgestellt' };
    const l = list([
      verb('verb-sich-vorstellen', 'sich vorstellen'),
      verb('verb-sich-vorstellen-2', 'vorstellen', { verb: { auxiliary: 'haben', reflexive: true, parts } }),
    ]);
    expect(findDuplicates(l)).toEqual([['verb-sich-vorstellen', 'verb-sich-vorstellen-2']]);
  });
  it('groups phrases by type and lemma', () => {
    expect(findDuplicates(list([phrase('p1', 'zum Beispiel'), phrase('p2', 'zum Beispiel')]))).toEqual([['p1', 'p2']]);
  });
});

describe('mergeRecords', () => {
  it('keeps the first id, drops the rest, unions categories (first primary), source_lines, glosses', () => {
    const l = list([
      noun('noun-test', 'Test', 'm', null, { categories: ['a'], source_lines: [5], gloss: ['test', 'exam'] }),
      noun('noun-mid', 'Mid', 'm', null),
      noun('noun-test-2', 'Test', 'm', null, { categories: ['b', 'a'], source_lines: [2, 5], gloss: ['Exam', 'trial'] }),
    ]);
    const { list: out, conflicts } = mergeRecords(l, ['noun-test', 'noun-test-2']);
    expect(conflicts).toEqual([]);
    expect(out.records.map((r) => r.id)).toEqual(['noun-test', 'noun-mid']);
    expect(out.records[0].categories).toEqual(['a', 'b']);
    expect(out.records[0].source_lines).toEqual([2, 5]);
    expect(out.records[0].gloss).toEqual(['test', 'exam', 'trial']);
    expect(l.records).toHaveLength(3);
  });
  it('merges type blocks field by field, filling a null plural from a later record', () => {
    const l = list([noun('noun-vertrag', 'Vertrag', 'm', null), noun('noun-vertrag-2', 'Vertrag', 'm', 'Verträge')]);
    const { list: out } = mergeRecords(l, ['noun-vertrag', 'noun-vertrag-2']);
    expect(out.records).toHaveLength(1);
    expect(out.records[0].noun).toEqual({ gender: 'm', plural: 'Verträge' });
    expect(out.records[0].status).toBe('raw');
  });
  it('takes block, examples and source_note from the most advanced record', () => {
    const l = list([
      noun('noun-vertrag', 'Vertrag', 'm', null, { source_note: 'raw note' }),
      enrichedNoun('noun-vertrag-2'),
    ]);
    const { list: out } = mergeRecords(l, ['noun-vertrag', 'noun-vertrag-2']);
    const r = out.records[0];
    expect(r.id).toBe('noun-vertrag');
    expect(r.status).toBe('enriched');
    expect(r.examples).toEqual(EXAMPLES);
    expect(r.source_note).toBe('checked');
    expect(r.noun?.plural).toBe('Verträge');
  });
  it('never escalates to reviewed', () => {
    const l = list([noun('n1', 'Vertrag', 'm', null), enrichedNoun('n2', { status: 'reviewed' })]);
    expect(mergeRecords(l, ['n1', 'n2']).list.records[0].status).toBe('enriched');
  });
  it('does not merge a group with conflicting values and reports it', () => {
    const l = list([noun('n1', 'See', 'm', null), noun('n2', 'See', 'f', null)]);
    const res = mergeRecords(l, ['n1', 'n2']);
    expect(res.list.records).toHaveLength(2);
    expect(res.conflicts.join('\n')).toMatch(/noun\.gender/);
  });
});

describe('nextBatch', () => {
  const l = list([
    phrase('r1', 'eins', { categories: ['a'] }),
    phrase('r2', 'zwei', { categories: ['b'] }),
    phrase('done', 'drei', { categories: ['b'], status: 'enriched' }),
    phrase('r3', 'vier', { categories: ['a'] }),
    phrase('r4', 'fünf', { categories: ['b'] }),
  ]);
  it('returns raw ids by primary-category order then list order', () => {
    expect(nextBatch(l)).toEqual(['r2', 'r4', 'r1', 'r3']);
  });
  it('honours n and the category scope', () => {
    expect(nextBatch(l, 2)).toEqual(['r2', 'r4']);
    expect(nextBatch(l, 25, 'a')).toEqual(['r1', 'r3']);
  });
  it('defaults to 25', () => {
    expect(nextBatch(list(Array.from({ length: 30 }, (_, i) => phrase(`n${i}`, `w${i}`))))).toHaveLength(25);
  });
});

describe('stats', () => {
  it('counts by status and type and reports raw/total per primary category in order', () => {
    const s = stats(
      list([
        phrase('a', 'eins', { categories: ['a'] }),
        verb('b', 'zwei', { status: 'enriched', categories: ['b', 'a'] }),
        phrase('c', 'drei', { categories: ['a'] }),
      ]),
    );
    expect(s.total).toBe(3);
    expect(s.status).toEqual({ raw: 2, enriched: 1, reviewed: 0 });
    expect(s.type).toEqual({ noun: 0, verb: 1, adjective: 0, phrase: 2 });
    expect(s.categories).toEqual([
      { id: 'b', order: 1, raw: 0, total: 1 },
      { id: 'a', order: 2, raw: 2, total: 2 },
    ]);
  });
});

describe('cli', () => {
  const dir = mkdtempSync(join(tmpdir(), 'typist-organise-'));
  const tsx = (...args: string[]) => spawnSync('node_modules/.bin/tsx', ['tools/cli.ts', ...args], { encoding: 'utf8' });
  const header = {
    schema: 1,
    list: { id: 'l', title: 'L', lang: 'de', gloss_lang: 'en' },
    categories: [{ id: 'a', title: 'A', order: 1 }],
  };
  let n = 0;
  const write = (records: R[]): string => {
    const file = join(dir, `l${n++}.yaml`);
    writeFileSync(file, stringify({ ...header, records }));
    return file;
  };
  const ids = (file: string) => parseYaml(readFileSync(file, 'utf8')).records.map((x: { id: string }) => x.id);

  it('dupes prints groups, stats prints counts and categories, next-batch prints ids', () => {
    const f = write([noun('noun-test', 'Test', 'm', null), noun('noun-other', 'Tür', 'f', null, { source_lines: [2] }), noun('noun-test-2', 'Test', 'm', null, { source_lines: [3] })]);
    expect(tsx('dupes', f).stdout).toContain('noun-test noun-test-2');
    const s = tsx('stats', f).stdout;
    expect(s).toContain('raw: 3');
    expect(s).toMatch(/a.*3\/3|a.*raw 3/);
    expect(tsx('next-batch', f, '--n', '2').stdout.trim().split('\n')).toEqual(['noun-test', 'noun-other']);
    expect(tsx('next-batch', f, '--n=1').stdout.trim().split('\n')).toEqual(['noun-test']);
  });
  it('dupes reports a conflicting group', () => {
    const f = write([enrichedNoun('n1', { noun: { gender: 'm', plural: 'Verträge' } }), enrichedNoun('n2', { noun: { gender: 'm', plural: 'Verträge' } })]);
    expect(tsx('dupes', f).stdout).toMatch(/CONFLICT.*noun\.plural/);
  });
  it('merge-dupes merges a raw+enriched pair in place and the result validates', () => {
    const f = write([noun('noun-vertrag', 'Vertrag', 'm', null), enrichedNoun('noun-vertrag-2', { source_lines: [3] })]);
    const r = tsx('merge-dupes', f);
    expect(r.status).toBe(0);
    expect(ids(f)).toEqual(['noun-vertrag']);
    expect(parseYaml(readFileSync(f, 'utf8')).records[0].source_lines).toEqual([1, 3]);
    expect(tsx('validate', f).status).toBe(0);
    expect(tsx('dupes', f).stdout).toContain('no duplicates');
  });
  it('merge-dupes skips conflicting groups (reporting them) and --skip ids', () => {
    const f = write([
      enrichedNoun('n1', { noun: { gender: 'm', plural: 'Verträge' } }),
      enrichedNoun('n2', { noun: { gender: 'm', plural: 'Verträge' } }),
      phrase('p1', 'zum Beispiel'),
      phrase('p2', 'zum Beispiel'),
    ]);
    const r = tsx('merge-dupes', f, '--skip', 'p1');
    expect(r.stderr).toMatch(/conflict/i);
    expect(ids(f)).toEqual(['n1', 'n2', 'p1', 'p2']);
  });
  it('merge-dupes with no groups does not rewrite the file', () => {
    const f = write([noun('noun-test', 'Test', 'm', null)]);
    const before = statSync(f).mtimeMs;
    const text = readFileSync(f, 'utf8');
    expect(tsx('merge-dupes', f).status).toBe(0);
    expect(readFileSync(f, 'utf8')).toBe(text);
    expect(statSync(f).mtimeMs).toBe(before);
  });
  it('merge merges only the named ids and refuses conflicts or unknown ids', () => {
    const f = write([phrase('p1', 'zum Beispiel'), phrase('p2', 'zum Beispiel'), phrase('p3', 'zum Beispiel')]);
    expect(tsx('merge', f, 'p1', 'p3').status).toBe(0);
    expect(ids(f)).toEqual(['p1', 'p2']);
    expect(tsx('merge', f, 'p1', 'nope').status).toBe(1);
    const g = write([noun('n1', 'See', 'm', null), noun('n2', 'See', 'f', null)]);
    expect(tsx('merge', g, 'n1', 'n2').status).toBe(1);
    expect(ids(g)).toEqual(['n1', 'n2']);
  });
  it('next-batch errors on a missing or undeclared --category and unknown flags', () => {
    const f = write([phrase('p1', 'eins')]);
    expect(tsx('next-batch', f, '--category').status).toBe(1);
    const r = tsx('next-batch', f, '--category', 'nope');
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('nope');
    expect(tsx('next-batch', f, '--bogus', '1').status).toBe(1);
    expect(tsx('next-batch', f, '--n', 'x').status).toBe(1);
    expect(tsx('next-batch', f, '--category=a').stdout.trim()).toBe('p1');
  });
  it('rejects a missing file argument', () => {
    expect(tsx('stats').status).toBe(1);
  });
});
