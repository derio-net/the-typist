import { describe, expect, it } from 'vitest';
import { canvasSize, pickWidth } from '../../src/render/canvas-size';

describe('canvasSize', () => {
  it('fits the window at the logical aspect ratio', () => {
    const s = canvasSize(1280, 640, 1, 960, 640);
    expect(s.css).toEqual({ width: 960 * (640 / 640) * 1, height: 640 });
    const wide = canvasSize(1920, 640, 1, 960, 640);
    expect(wide.css.height).toBeLessThanOrEqual(640);
    expect(wide.css.width / wide.css.height).toBeCloseTo(960 / 640, 9);
  });

  it('dpr 2 doubles the backing store without changing the CSS size', () => {
    const one = canvasSize(480, 320, 1, 960, 640);
    const two = canvasSize(480, 320, 2, 960, 640);
    expect(two.css).toEqual(one.css);
    expect(two.backing.width).toBe(one.backing.width * 2);
    expect(two.backing.height).toBe(one.backing.height * 2);
    expect(two.scale).toBe(one.scale);
  });

  it('a 600 px wide window with logical 720x640 gets CSS width 600 and no overflow', () => {
    const s = canvasSize(600, 900, 2, 720, 640);
    expect(s.css.width).toBe(600);
    expect(s.css.height).toBeLessThanOrEqual(900);
    expect(s.backing.width).toBe(Math.round(720 * s.scale * 2));
  });

  it('never exceeds the window height either', () => {
    const s = canvasSize(1600, 400, 1, 960, 640);
    expect(s.css.height).toBe(400);
    expect(s.css.width).toBeLessThanOrEqual(1600);
  });
});

describe('pickWidth', () => {
  it('is the window aspect times 640, clamped to 720-1280', () => {
    expect(pickWidth(960, 640)).toBe(960);
    expect(pickWidth(300, 900)).toBe(720);
    expect(pickWidth(3000, 600)).toBe(1280);
  });
});
