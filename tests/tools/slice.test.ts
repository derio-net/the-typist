import { describe, expect, it } from 'vitest';
import { PNG } from 'pngjs';
import { keyMagenta, splitAt } from '../../tools/sprites/slice';

const onePixel = (r: number, g: number, b: number) => {
  const png = new PNG({ width: 1, height: 1 });
  png.data.set([r, g, b, 255]);
  keyMagenta(png);
  return [...png.data];
};

describe('keyMagenta', () => {
  it('makes pure key magenta transparent', () => {
    expect(onePixel(255, 0, 255)[3]).toBe(0);
  });
  it('leaves violet and pink art fully opaque and unchanged', () => {
    expect(onePixel(120, 60, 200)).toEqual([120, 60, 200, 255]);
    expect(onePixel(230, 120, 200)).toEqual([230, 120, 200, 255]);
  });
  it('softens near-key edge pixels and pulls the magenta tint out of them', () => {
    const [r, g, b, a] = onePixel(220, 40, 220);
    expect(a).toBeGreaterThan(0);
    expect(a).toBeLessThan(255);
    expect(Math.min(r, b) - g).toBeLessThan(220 - 40);
  });
});

describe('splitAt', () => {
  it('cuts at the lowest valleys, never in the empty margins', () => {
    //            margin   A       gap    B        gap    C       margin
    const cov = [0, 0, 0, 5, 5, 5, 0, 0, 5, 5, 5, 1, 1, 5, 5, 5, 0, 0];
    const parts = splitAt(cov, 0, cov.length, 3, 2);
    expect(parts).toHaveLength(3);
    expect(parts[0][0]).toBe(3);
    expect(parts[2][1]).toBe(16);
    expect(parts[0][1]).toBeGreaterThanOrEqual(6);
    expect(parts[0][1]).toBeLessThanOrEqual(8);
    expect(parts[1][1]).toBeGreaterThanOrEqual(11);
    expect(parts[1][1]).toBeLessThanOrEqual(13);
  });
});
