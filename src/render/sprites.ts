import atlas from '../layout/sprite-atlas.json';
import type { SpriteName, SpriteInfo, StripRect } from '../layout/metrics';

export type { SpriteName, SpriteInfo, StripRect };

export interface Sprite extends SpriteInfo {
  img: CanvasImageSource;
}

export type Sprites = Record<SpriteName, Sprite>;

let loaded: Sprites | null = null;

/** The loaded sprites, or null while they load (callers fall back to placeholder shapes). */
export function currentSprites(): Sprites | null {
  return loaded;
}

/** Loads every sprite in the atlas from `<base>assets/sprites/<name>.png`. Browser only. */
export async function loadSprites(base: string): Promise<Sprites> {
  const entries = await Promise.all(
    (Object.keys(atlas) as SpriteName[]).map(
      (name) =>
        new Promise<[SpriteName, Sprite]>((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve([name, { ...(atlas[name] as SpriteInfo), img }]);
          img.onerror = () => reject(new Error(`sprite ${name} failed to load`));
          img.src = `${base}assets/sprites/${name}.png`;
        }),
    ),
  );
  loaded = Object.fromEntries(entries) as Sprites;
  return loaded;
}

export interface Box { x: number; y: number; w: number; h: number }

/**
 * Draws a hull so its dark text strip lands exactly on `box`: left cap, the
 * strip's centre column stretched to the box width, right cap. Caps are scaled
 * uniformly with the strip, then squashed horizontally by `capSquash`.
 */
export function drawHull(ctx: CanvasRenderingContext2D, s: Sprite, box: Box, capSquash: number, capBleed: number): void {
  const strip = s.strip!;
  const k = box.h / (strip.y1 - strip.y0);
  const top = box.y - strip.y0 * k;
  const h = s.h * k;
  const leftSrc = strip.x0 + capBleed;
  const rightSrc = strip.x1 - capBleed;
  const leftW = leftSrc * k * capSquash;
  const rightW = (s.w - rightSrc) * k * capSquash;
  const midSrc = (strip.x0 + strip.x1) / 2;
  const bleed = capBleed * k * capSquash;
  ctx.drawImage(s.img, 0, 0, leftSrc, s.h, box.x - leftW + bleed, top, leftW, h);
  ctx.drawImage(s.img, midSrc, 0, 1, s.h, box.x + bleed, top, box.w - 2 * bleed, h);
  ctx.drawImage(s.img, rightSrc, 0, s.w - rightSrc, s.h, box.x + box.w - bleed, top, rightW, h);
}

/** Draws a sprite centred on (cx, cy) at the given height, optionally rotated. */
export function drawCentred(ctx: CanvasRenderingContext2D, s: Sprite, cx: number, cy: number, height: number, angle = 0): void {
  const k = height / s.h;
  ctx.save();
  ctx.translate(cx, cy);
  if (angle) ctx.rotate(angle);
  ctx.drawImage(s.img, (-s.w * k) / 2, (-s.h * k) / 2, s.w * k, s.h * k);
  ctx.restore();
}

/** Draws the reticle's four corner quadrants around `box`, each at `size` px. */
export function drawReticle(ctx: CanvasRenderingContext2D, s: Sprite, box: Box, size: number, inset: number): void {
  const qw = s.w / 2;
  const qh = s.h / 2;
  const x0 = box.x - inset;
  const y0 = box.y - inset;
  const x1 = box.x + box.w + inset;
  const y1 = box.y + box.h + inset;
  ctx.drawImage(s.img, 0, 0, qw, qh, x0, y0, size, size);
  ctx.drawImage(s.img, qw, 0, qw, qh, x1 - size, y0, size, size);
  ctx.drawImage(s.img, 0, qh, qw, qh, x0, y1 - size, size, size);
  ctx.drawImage(s.img, qw, qh, qw, qh, x1 - size, y1 - size, size, size);
}
