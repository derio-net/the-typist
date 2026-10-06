import { currentSprites, drawHull } from './sprites';
import { sizes, hullSprite, type ShipKindName } from '../layout/metrics';

export { sizes, charWidths, hullSprite, hullExtent, type MeasureFont, type ShipKindName, type HullExtent } from '../layout/metrics';

/**
 * Every visual constant of the game lives here. Placeholder values; the renderer
 * contains no colours, fonts or magic sizes of its own. Swap `drawShip` for a
 * sprite hook to retheme the ships.
 */
export const palette = {
  background: '#0b1020',
  star: '#2a3556',
  text: '#e8ecf8',
  typed: '#5df2a0',
  /** ASCII prefix typed towards a digraph (the `o` of `oe`). */
  pending: '#9fd8ff',
  /** Tint of a locked ship's hull and text right after a typo. */
  typoFlash: '#ff5d6c',
  gloss: '#ffd970',
  chip: '#b9e4ff',
  translation: '#e3e8f8',
  /** Dark plate behind text printed on a hull, so it reads on any hull colour. */
  plate: 'rgba(6, 10, 24, 0.72)',
  lock: '#ffffff',
  bullet: '#fffb9a',
  explosion: '#ffb347',
  player: '#5df2a0',
  hud: '#e8ecf8',
  hudLife: '#ff5d6c',
  textShadow: 'rgba(0, 0, 0, 0.85)',
  shipFill: {
    mothership: '#3b2a6b',
    forms: '#1f4d6b',
    escort: '#2b3a55',
  },
  shipStroke: {
    mothership: '#b18cff',
    forms: '#5fc3ff',
    escort: '#6c7ea8',
  },
} as const;

export const fonts = {
  ship: '14px ui-monospace, Menlo, Consolas, monospace',
  gloss: 'italic 13px system-ui, sans-serif',
  chip: '600 11px system-ui, sans-serif',
  translation: '12px system-ui, sans-serif',
  hud: '16px ui-monospace, Menlo, Consolas, monospace',
  banner: '32px system-ui, sans-serif',
} as const;

export const effects = {
  bulletMs: 120,
  /** A typo flash fades out over this long; `typoFlashAlpha` is its strongest hull tint. */
  typoFlashMs: 260,
  typoFlashAlpha: 0.55,
  explosionMs: 560,
  explosionFrames: 8,
  debrisMs: 900,
  msPerSecond: 1000,
} as const;

export const labels = {
  score: 'Score',
  wave: 'Wave',
  waveComplete: 'Wave complete',
  gameOver: 'Game over',
} as const;

/**
 * Where the player sprite's twin cannons are, relative to its x and to `WORLD.playerY`:
 * fitted to the sprite (cannon tips at +-25 of 180 source px, near the top of its 213 px).
 */
export const muzzle = { dx: 7.5, dy: -23 } as const;

/** Start of the next bullet: the left gun on even shots, the right gun on odd ones (`y` is relative to the player line). */
export function muzzles(playerX: number, shotIndex: number): { x: number; y: number } {
  return { x: playerX + (shotIndex % 2 === 0 ? -muzzle.dx : muzzle.dx), y: muzzle.dy };
}

export interface ShipBox {
  /** Top-left corner and size. */
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Sprite hook: draws the hull behind a ship's text, its dark strip on `box`.
 * Falls back to placeholder shapes until the sprites have loaded.
 */
export function drawShip(ctx: CanvasRenderingContext2D, kind: ShipKindName, box: ShipBox): void {
  const sprites = currentSprites();
  if (sprites) {
    drawHull(ctx, sprites[hullSprite[kind]], box, sizes.capSquash, sizes.capBleed);
    return;
  }
  ctx.fillStyle = palette.shipFill[kind];
  ctx.strokeStyle = palette.shipStroke[kind];
  ctx.lineWidth = sizes.shipLineWidth;
  ctx.beginPath();
  if (kind === 'mothership') {
    ctx.roundRect(box.x, box.y, box.w, box.h, sizes.shipCorner);
  } else if (kind === 'forms') {
    const cx = box.x + box.w / 2;
    ctx.moveTo(box.x, box.y + box.h / 2);
    ctx.lineTo(cx, box.y);
    ctx.lineTo(box.x + box.w, box.y + box.h / 2);
    ctx.lineTo(cx, box.y + box.h);
    ctx.closePath();
  } else {
    ctx.rect(box.x, box.y, box.w, box.h);
  }
  ctx.fill();
  ctx.stroke();
}

/** Every token in one object. */
export const theme = { palette, fonts, effects, labels, sizes, muzzle } as const;
