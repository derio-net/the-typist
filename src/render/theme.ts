import atlas from './sprite-atlas.json';
import { currentSprites, drawHull, type SpriteName, type SpriteInfo } from './sprites';

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
  gloss: '#f6d365',
  chip: '#7cc4ff',
  translation: '#9aa6c9',
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
  ship: '16px ui-monospace, Menlo, Consolas, monospace',
  gloss: 'italic 15px system-ui, sans-serif',
  chip: '12px system-ui, sans-serif',
  translation: '13px system-ui, sans-serif',
  hud: '16px ui-monospace, Menlo, Consolas, monospace',
  banner: '32px system-ui, sans-serif',
} as const;

export const sizes = {
  shipPaddingX: 12,
  /** Height of the hull's text strip; the whole hull scales from it. */
  shipHeight: 24,
  /** Gap between the strip and the gloss / chip / translation printed on the hull. */
  onHullGap: 9,
  /** End caps are squashed horizontally by this factor so short words don't get huge ships. */
  capSquash: 0.5,
  /** Source pixels of the strip each cap overlaps, so the seams don't show. */
  capBleed: 6,
  playerSpriteHeight: 72,
  playerSpriteOffsetY: 8,
  bulletSpriteHeight: 36,
  reticleSize: 14,
  reticleInset: 7,
  explosionSize: { mothership: 170, forms: 120, escort: 120 },
  debrisCount: 3,
  debrisHeight: 30,
  debrisSpeed: 170,
  debrisSpin: 6,
  textShadowBlur: 4,
  shipCorner: 8,
  lockLineWidth: 2,
  shipLineWidth: 1.5,
  glossGap: 8,
  chipGap: 10,
  translationGap: 16,
  bulletRadius: 3,
  explosionMaxRadius: 46,
  playerWidth: 36,
  playerHeight: 22,
  hudMargin: 16,
  hudLineHeight: 22,
  lifeSize: 10,
  starCount: 60,
  starSize: 2,
  lockInset: 3,
  glossHeight: 14,
  glossBaseline: 7,
  rowHalf: 8,
  lifeGap: 6,
  starSeedX: 7919,
  starSeedY: 104729,
} as const;

/** Estimated glyph widths (px/char) for the fonts above; the renderer measures for real. */
export const charWidths = { ship: 9.6, gloss: 7, chip: 6.5, translation: 6.5 } as const;

export const effects = {
  bulletMs: 120,
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

export type MeasureFont = 'ship' | 'gloss' | 'chip' | 'translation';

export type ShipKindName = 'mothership' | 'forms' | 'escort';

export interface ShipBox {
  /** Top-left corner and size. */
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Which hull sprite each ship kind uses. */
export const hullSprite: Record<ShipKindName, SpriteName> = { mothership: 'mothership', forms: 'forms', escort: 'sentence' };

/** How far a kind's drawn hull reaches beyond its text strip: up and down from the strip's centre, and out from each side. */
export interface HullExtent { above: number; below: number; side: number }

/** Hull extents from the sprite atlas, so layout, bands and edge bounces match what is drawn. */
export function hullExtent(kind: ShipKindName): HullExtent {
  const s = atlas[hullSprite[kind]] as SpriteInfo;
  const strip = s.strip!;
  const k = sizes.shipHeight / (strip.y1 - strip.y0);
  const cy = (strip.y0 + strip.y1) / 2;
  const capSrc = Math.max(strip.x0, s.w - strip.x1);
  return { above: cy * k, below: (s.h - cy) * k, side: capSrc * k * sizes.capSquash };
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
