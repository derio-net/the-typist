import { describe, expect, it } from 'vitest';
import { cpSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { build } from 'vite';
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
  it('leaves ?raw and ?url imports alone', () => {
    expect(p.transform(read('invalid.yaml'), '/repo/lists/bad.yaml?raw')).toBeNull();
    expect(p.transform(read('invalid.yaml'), '/repo/lists/bad.yaml?url')).toBeNull();
  });
});

describe('listsPlugin in a real Vite build', () => {
  const project = (list: string) => {
    const root = mkdtempSync(join(tmpdir(), 'typist-build-'));
    mkdirSync(join(root, 'lists'));
    cpSync(`tests/fixtures/lists/${list}`, join(root, 'lists', 'l.yaml'));
    writeFileSync(join(root, 'index.html'), '<script type="module" src="/main.js"></script>');
    writeFileSync(join(root, 'main.js'), "import l from './lists/l.yaml'; console.log(l.list.id);");
    return root;
  };
  const run = (root: string) =>
    build({ root, logLevel: 'silent', configFile: false, plugins: [listsPlugin()], build: { write: false } });

  it('builds with a valid list', async () => {
    const root = project('valid.yaml');
    try { await expect(run(root)).resolves.toBeDefined(); } finally { rmSync(root, { recursive: true }); }
  }, 30_000);
  it('fails the build with an invalid list', async () => {
    const root = project('invalid.yaml');
    try { await expect(run(root)).rejects.toThrow(/records\[0\]/); } finally { rmSync(root, { recursive: true }); }
  }, 30_000);
});
