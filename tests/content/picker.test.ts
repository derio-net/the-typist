// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadFile, loadText } from '../../src/content/picker';

const fixture = (name: string) => new File([readFileSync(`tests/fixtures/lists/${name}`)], name, { type: 'text/yaml' });

describe('picker', () => {
  it('rejects an invalid list with one line per error', async () => {
    const res = await loadFile(fixture('invalid.yaml'));
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.errors.length).toBeGreaterThan(0);
      for (const e of res.errors) expect(e).not.toContain('\n');
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
