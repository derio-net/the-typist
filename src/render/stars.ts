import { sizes } from './theme';

/** The seed positions wrap at this width, so the pattern spreads evenly whatever the playfield width is. */
const SEED_SPAN = 960;

/** Star positions across a `width` x `height` playfield: spread independently of the width (no collapsing strips). */
export function starField(width: number, height: number): { x: number; y: number }[] {
  return Array.from({ length: sizes.starCount }, (_, i) => ({
    x: (((i * sizes.starSeedX) % SEED_SPAN) / SEED_SPAN) * width,
    y: (i * sizes.starSeedY) % height,
  }));
}
