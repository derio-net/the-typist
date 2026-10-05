import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';

const run = (...files: string[]) =>
  spawnSync('node_modules/.bin/tsx', ['tools/cli.ts', 'validate', ...files], { encoding: 'utf8' });

describe('cli validate', () => {
  it('exits 0 and prints ok for a valid list', () => {
    const r = run('tests/fixtures/lists/valid.yaml');
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('ok tests/fixtures/lists/valid.yaml (3 records)');
  });
  it('exits 1 and prefixes each error with the file name', () => {
    const r = run('tests/fixtures/lists/invalid.yaml');
    expect(r.status).toBe(1);
    const lines = r.stderr.trim().split('\n');
    expect(lines.length).toBeGreaterThan(0);
    for (const l of lines) expect(l.startsWith('tests/fixtures/lists/invalid.yaml: ')).toBe(true);
    expect(r.stderr).toContain('records[0] (noun-boerse)');
  });
  it('exits 1 when one of several files is invalid and still reports the valid one', () => {
    const r = run('tests/fixtures/lists/valid.yaml', 'tests/fixtures/lists/invalid.yaml');
    expect(r.status).toBe(1);
    expect(r.stdout).toContain('ok tests/fixtures/lists/valid.yaml');
  });
  it('exits 1 for a missing file and for no arguments', () => {
    expect(run('nope.yaml').status).toBe(1);
    expect(run().status).toBe(1);
  });
});
