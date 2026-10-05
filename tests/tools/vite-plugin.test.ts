import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { listsPlugin } from '../../tools/vite-plugin-lists';

const read = (f: string) => readFileSync(`tests/fixtures/lists/${f}`, 'utf8');

describe('listsPlugin', () => {
  const p = listsPlugin();
  it('turns a valid list into a JSON module', () => {
    const out = p.transform(read('valid.yaml'), '/repo/lists/valid.yaml') as string;
    expect(out.startsWith('export default {')).toBe(true);
    const json = JSON.parse(out.slice('export default '.length).replace(/;\s*$/, ''));
    expect(json.records).toHaveLength(3);
  });
  it('throws naming file and record for an invalid list', () => {
    expect(() => p.transform(read('invalid.yaml'), '/repo/lists/bad.yaml')).toThrow(/lists\/bad\.yaml.*records\[0\] \(noun-boerse\)/s);
  });
  it('ignores other files', () => {
    expect(p.transform('a: 1', '/repo/src/other.yaml')).toBeNull();
    expect(p.transform('x', '/repo/lists/readme.md')).toBeNull();
  });
});
