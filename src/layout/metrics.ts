import atlas from './sprite-atlas.json';

/** Sprite names produced by `npm run sprites` from public/assets/sprites/sheet.png. */
export type SpriteName = keyof typeof atlas;

export interface StripRect { x0: number; y0: number; x1: number; y1: number }
export interface SpriteInfo { w: number; h: number; strip?: StripRect }

export const sizes = {
  shipPaddingX: 10,
  /** Height of the hull's text strip; the whole hull scales from it. */
  shipHeight: 21,
  /** Gap between the strip and the gloss / chip / translation printed on the hull. */
  onHullGap: 8,
  /** Plate behind on-hull text: height, horizontal padding, corner radius. */
  plateHeight: 15,
  platePadX: 6,
  plateRadius: 4,
  /** End caps are squashed horizontally by this factor so short words don't get huge ships. */
  capSquash: 0.5,
  /** Source pixels of the strip each cap overlaps, so the seams don't show. */
  capBleed: 6,
  playerSpriteHeight: 63,
  playerSpriteOffsetY: 7,
  bulletSpriteHeight: 32,
  reticleSize: 12,
  reticleInset: 6,
  explosionSize: { mothership: 150, forms: 105, escort: 105 },
  debrisCount: 3,
  debrisHeight: 26,
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
  glossBaseline: 6,
  rowHalf: 8,
  lifeGap: 6,
  starSeedX: 7919,
  starSeedY: 104729,
} as const;

/** Estimated glyph widths (px/char) for the fonts above; the renderer measures for real. */
export const charWidths = { ship: 8.4, gloss: 6.2, chip: 6, translation: 6 } as const;

export type MeasureFont = 'ship' | 'gloss' | 'chip' | 'translation';

export type ShipKindName = 'mothership' | 'forms' | 'escort';

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
