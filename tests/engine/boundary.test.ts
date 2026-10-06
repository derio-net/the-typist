import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, normalize, relative } from 'node:path';

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : p.endsWith('.ts') ? [p] : [];
  });
}

/** Every module specifier in `src`: static (`from '…'`), side-effect (`import '…'`) and dynamic (`import('…')`). */
export function specifiers(src: string): string[] {
  const re = /(?:\bfrom\s*|\bimport\s*\(?\s*)['"]([^'"]+)['"]/g;
  return [...src.matchAll(re)].map((m) => m[1]);
}

/** Resolves a relative specifier to a repo file (.ts, .json or /index.ts), or null for packages. */
function resolve(from: string, spec: string): string | null {
  if (!spec.startsWith('.')) return null;
  const base = normalize(join(dirname(from), spec));
  for (const c of [base, `${base}.ts`, join(base, 'index.ts')]) if (existsSync(c) && statSync(c).isFile()) return c;
  return null;
}

describe('engine/render boundary (R16)', () => {
  it('finds static, side-effect and dynamic specifiers', () => {
    expect(specifiers(`import a from './a';\nimport './b';\nconst c = import('./c');\nexport { d } from "./d";`)).toEqual([
      './a', './b', './c', './d',
    ]);
  });

  it('nothing reachable from src/engine lives in src/render', () => {
    const seen = new Set<string>();
    const stack = walk('src/engine');
    const bad: string[] = [];
    while (stack.length) {
      const f = stack.pop()!;
      if (seen.has(f)) continue;
      seen.add(f);
      if (relative('src/render', f).split('/')[0] !== '..') bad.push(f);
      if (!f.endsWith('.ts')) continue;
      for (const s of specifiers(readFileSync(f, 'utf8'))) {
        const r = resolve(f, s);
        if (r) stack.push(r);
      }
    }
    expect(bad).toEqual([]);
  });
});
