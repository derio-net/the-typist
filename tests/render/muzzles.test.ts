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

describe('muzzle fit', () => {
  it('sits at the top of the player sprite (the cannon tips), not inside it', async () => {
    const { sizes } = await import('../../src/layout/metrics');
    const top = sizes.playerSpriteOffsetY - sizes.playerSpriteHeight; // sprite top relative to the player line
    expect(Math.abs(theme.muzzle.dy - top)).toBeLessThanOrEqual(3);
  });
});
