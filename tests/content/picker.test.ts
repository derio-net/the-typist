// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadFile, loadText } from '../../src/content/picker';
import { parseList } from '../../src/schema';

const fixture = (name: string) => new File([readFileSync(`tests/fixtures/lists/${name}`)], name, { type: 'text/yaml' });

describe('picker', () => {
  it('rejects an invalid list with one entry per error, unsplit (p4-r9)', async () => {
    const res = await loadFile(fixture('invalid.yaml'));
    const direct = parseList(readFileSync('tests/fixtures/lists/invalid.yaml', 'utf8'));
    expect(res.ok).toBe(false);
    if (!res.ok && !direct.ok) expect(res.errors).toEqual(direct.errors);
  });

  it('gives a YAML syntax error as one clean message, with no dangling colon (p4-r9)', () => {
    const res = loadText('{ this: is: [not yaml');
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.errors).toHaveLength(1);
      expect(res.errors[0]).toMatch(/^invalid YAML: .*line 1, column 22$/);
    }
  });

  it.each([['empty', ''], ['plain text', 'just text'], ['a sequence', '- a\n- b'], ['binary-ish', '\u0000\u0001\u0002binary']])(
    'says "not a YAML list file" for %s input (p4-r9)', (_n, text) => {
      const res = loadText(text);
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.errors).toHaveLength(1);
        expect(res.errors[0]).toMatch(/^not a YAML list file/);
      }
    });

  it('accepts a valid list and counts its playable records', async () => {
    const res = await loadFile(fixture('two-records.yaml'));
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.list.list.id).toBe('fixture-two');
      expect(res.playable).toBe(2);
    }
  });

  it('reports a parse message for non-YAML text', async () => {
    const res = await loadFile(new File(['{ this: is: [not yaml'], 'x.yaml'));
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.errors[0]).toMatch(/\S/);
  });

  it('loads a list whose records are all raw, with playable 0', () => {
    const text = `schema: 1
list: { id: raws, title: Raws, lang: de, gloss_lang: en }
records:
  - { id: noun-a, type: noun, status: raw, source_lines: [1], lemma: Haus, gloss: [house] }
`;
    const res = loadText(text);
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.playable).toBe(0);
  });
});
