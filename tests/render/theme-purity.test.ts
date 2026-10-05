import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('theme discipline', () => {
  const src = readFileSync('src/render/renderer.ts', 'utf8');
  it('renderer.ts has no colour or font literals', () => {
    expect(src).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(src).not.toMatch(/\brgba?\(|\bhsla?\(/);
    expect(src).not.toMatch(/\d+px/);
  });
  it('theme.ts exports the drawShip hook', async () => {
    const theme = await import('../../src/render/theme');
    expect(typeof theme.drawShip).toBe('function');
  });
});
