import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parse as parseYaml, stringify } from 'yaml';

const tsx = (...args: string[]) => spawnSync('node_modules/.bin/tsx', ['tools/cli.ts', ...args], { encoding: 'utf8' });
const dir = mkdtempSync(join(tmpdir(), 'typist-parse-'));

describe('cli parse', () => {
  const out = join(dir, 'out.yaml');
  const raw = 'tests/fixtures/raw/section1-head.txt';

  it('writes raw records, categories from headers, a list header from the file stem and an unresolved key', () => {
    const src = join(dir, 'mini-list.txt');
    writeFileSync(src, readFileSync(raw, 'utf8') + '\ndie Daumen drücken – to keep one’s fingers crossed\n');
    const r = tsx('parse', src, '-o', out);
    expect(r.status).toBe(0);
    const doc = parseYaml(readFileSync(out, 'utf8'));
    expect(doc.schema).toBe(1);
    expect(doc.list).toMatchObject({ id: 'mini-list', lang: 'de', gloss_lang: 'en' });
    expect(doc.categories).toEqual([
      { id: 'academic-and-higher-education', title: 'Academic & Higher Education', order: 1 },
    ]);
    expect(doc.records).toHaveLength(4);
    for (const rec of doc.records) expect(rec.status).toBe('raw');
    expect(doc.unresolved).toEqual([
      { line: 14, text: 'die Daumen drücken – to keep one’s fingers crossed', reason: 'phrase' },
    ]);
    expect(Object.keys(doc).at(-1)).toBe('unresolved');
  });

  it('validate passes once unresolved is removed, and rejects it while present', () => {
    expect(tsx('validate', out).status).toBe(1);
    const doc = parseYaml(readFileSync(out, 'utf8'));
    delete doc.unresolved;
    const clean = join(dir, 'clean.yaml');
    writeFileSync(clean, stringify(doc));
    const r = tsx('validate', clean);
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('(4 records)');
  });

  it('exits 1 for a missing input, a missing -o, and prints usage', () => {
    expect(tsx('parse', join(dir, 'nope.txt'), '-o', out).status).toBe(1);
    expect(tsx('parse', raw).status).toBe(1);
    expect(tsx('parse').status).toBe(1);
  });
});
