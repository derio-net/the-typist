import { describe, expect, it } from 'vitest';
import { starField } from '../../src/render/stars';

describe('starField', () => {
  it.each([720, 800, 880, 960, 1280])('spans the width at %i', (width) => {
    const xs = starField(width, 640).map((s) => s.x);
    expect(Math.min(...xs)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...xs)).toBeLessThan(width);
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThanOrEqual(0.8 * width);
  });
});
