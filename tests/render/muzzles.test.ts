import { describe, expect, it } from 'vitest';
import { muzzles, theme } from '../../src/render/theme';

describe('muzzles', () => {
  it('alternates left and right guns, offset by the theme muzzle token', () => {
    const { dx, dy } = theme.muzzle;
    expect(dx).toBeGreaterThan(0);
    expect(muzzles(300, 0)).toEqual({ x: 300 - dx, y: dy });
    expect(muzzles(300, 1)).toEqual({ x: 300 + dx, y: dy });
    expect(muzzles(300, 2)).toEqual(muzzles(300, 0));
  });
});
