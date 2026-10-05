import { WORLD, type World, type WorldEvent, type WorldShip } from '../engine/world';
import { drawShip, effects, fonts, labels, palette, sizes, type MeasureFont, type ShipBox } from './theme';
import { currentSprites, drawCentred, drawReticle, type SpriteName } from './sprites';
import type { ShipKind } from '../engine/world';

interface Bullet { shipId: string; fromX: number; at: number; lastX: number; lastY: number }
interface Explosion { x: number; y: number; at: number; kind: ShipKind }
interface Debris { x: number; y: number; vx: number; vy: number; spin: number; at: number; sprite: SpriteName }

const DEBRIS: SpriteName[] = ['debris1', 'debris2', 'debris3', 'debris4'];
const EXPLOSION: SpriteName[] = [
  'explosion1', 'explosion2', 'explosion3', 'explosion4', 'explosion5', 'explosion6', 'explosion7', 'explosion8',
];

export interface Renderer {
  /** Text measurer for `createWorld({ measure })`, so layout uses real glyph widths. */
  measure(text: string, font?: MeasureFont): number;
  /** Feed events from `tick` / `typeChar` so effects can be spawned. */
  push(events: WorldEvent[], now: number): void;
  draw(world: World, now: number): void;
}

export function createRenderer(canvas: HTMLCanvasElement): Renderer {
  const ctx = canvas.getContext('2d')!;
  canvas.width = WORLD.width;
  canvas.height = WORLD.height;

  const stars = Array.from({ length: sizes.starCount }, (_, i) => ({
    x: (i * sizes.starSeedX) % WORLD.width,
    y: (i * sizes.starSeedY) % WORLD.height,
  }));
  const lastPos = new Map<string, { x: number; y: number; kind: ShipKind }>();
  let bullets: Bullet[] = [];
  let explosions: Explosion[] = [];
  let debris: Debris[] = [];
  const playerX = WORLD.width / 2;

  /** Pixel width of `text` in the given font; ship text includes the strip's padding. */
  const measure = (text: string, font: MeasureFont = 'ship'): number => {
    ctx.font = fonts[font];
    return ctx.measureText(text).width + (font === 'ship' ? 2 * sizes.shipPaddingX : 0);
  };

  /** The text strip of a ship (its hull's end caps lie outside it). */
  function boxOf(ship: WorldShip): ShipBox {
    const w = measure(ship.text);
    return { x: ship.x - w / 2, y: ship.y - sizes.shipHeight / 2, w, h: sizes.shipHeight };
  }

  function drawLock(box: ShipBox) {
    const sprites = currentSprites();
    if (sprites) {
      drawReticle(ctx, sprites.reticle, box, sizes.reticleSize, sizes.reticleInset);
      return;
    }
    ctx.strokeStyle = palette.lock;
    ctx.lineWidth = sizes.lockLineWidth;
    ctx.strokeRect(box.x - sizes.lockInset, box.y - sizes.lockInset, box.w + 2 * sizes.lockInset, box.h + 2 * sizes.lockInset);
  }

  function drawShipText(ship: WorldShip, world: World, locked: boolean) {
    const box = boxOf(ship);
    if (locked) drawLock(box);
    ctx.shadowColor = palette.textShadow;
    ctx.shadowBlur = sizes.textShadowBlur;
    const typing = world.typing.ships.find((s) => s.id === ship.id);
    const pos = typing?.pos ?? 0;
    ctx.font = fonts.ship;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    const typed = ship.text.slice(0, pos);
    const left = box.x + sizes.shipPaddingX;
    ctx.fillStyle = palette.typed;
    ctx.fillText(typed, left, ship.y);
    ctx.fillStyle = palette.text;
    ctx.fillText(ship.text.slice(pos), left + ctx.measureText(typed).width, ship.y);

    // gloss and translation go on the hull below the strip, the grammar chip above it
    ctx.textAlign = 'center';
    const below = box.y + box.h + sizes.onHullGap + sizes.glossBaseline;
    const above = box.y - sizes.onHullGap - sizes.glossBaseline;
    if (ship.label) {
      ctx.font = fonts.gloss;
      ctx.fillStyle = palette.gloss;
      ctx.fillText(ship.label, ship.x, below);
    }
    if (ship.kind === 'escort') {
      ctx.font = fonts.chip;
      ctx.fillStyle = palette.chip;
      ctx.fillText(ship.chip ?? '', ship.x, above);
      ctx.font = fonts.translation;
      ctx.fillStyle = palette.translation;
      ctx.fillText(ship.translation ?? '', ship.x, below);
    }
    ctx.shadowBlur = 0;
  }

  return {
    measure,
    push(events, now) {
      for (const ev of events) {
        const p = 'shipId' in ev ? lastPos.get(ev.shipId) : undefined;
        if (ev.type === 'hit' && p) bullets.push({ shipId: ev.shipId, fromX: playerX, at: now, lastX: p.x, lastY: p.y });
        if (ev.type === 'destroyed' && p) {
          explosions.push({ x: p.x, y: p.y, at: now, kind: p.kind });
          for (let i = 0; i < sizes.debrisCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = sizes.debrisSpeed * (1 + Math.random()) / 2;
            debris.push({
              x: p.x, y: p.y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
              spin: (Math.random() - 1 / 2) * 2 * sizes.debrisSpin, at: now,
              sprite: DEBRIS[Math.floor(Math.random() * DEBRIS.length)],
            });
          }
        }
      }
    },
    draw(world, now) {
      ctx.fillStyle = palette.background;
      ctx.fillRect(0, 0, WORLD.width, WORLD.height);
      ctx.fillStyle = palette.star;
      for (const s of stars) ctx.fillRect(s.x, s.y, sizes.starSize, sizes.starSize);

      for (const s of world.ships) lastPos.set(s.id, { x: s.x, y: s.y, kind: s.kind });
      const sprites = currentSprites();
      const byId = new Map(world.ships.map((s) => [s.id, s]));

      // player
      if (sprites) {
        drawCentred(ctx, sprites.player, playerX, WORLD.playerY + sizes.playerSpriteOffsetY - sizes.playerSpriteHeight / 2, sizes.playerSpriteHeight);
      } else {
        ctx.fillStyle = palette.player;
        ctx.beginPath();
        ctx.moveTo(playerX, WORLD.playerY - sizes.playerHeight);
        ctx.lineTo(playerX - sizes.playerWidth / 2, WORLD.playerY);
        ctx.lineTo(playerX + sizes.playerWidth / 2, WORLD.playerY);
        ctx.closePath();
        ctx.fill();
      }

      // two passes: every hull first, then every text, so overlapping hulls never hide words;
      // the locked ship goes last in each pass
      const lock = world.typing.lock;
      const order = [...world.ships.filter((s) => s.id !== lock), ...world.ships.filter((s) => s.id === lock)];
      for (const s of order) drawShip(ctx, s.kind, boxOf(s));
      for (const s of order) drawShipText(s, world, s.id === lock);

      bullets = bullets.filter((b) => now - b.at < effects.bulletMs);
      ctx.fillStyle = palette.bullet;
      for (const b of bullets) {
        const target = byId.get(b.shipId);
        const tx = target?.x ?? b.lastX;
        const ty = target?.y ?? b.lastY;
        const t = (now - b.at) / effects.bulletMs;
        const bx = b.fromX + (tx - b.fromX) * t;
        const by = WORLD.playerY + (ty - WORLD.playerY) * t;
        if (sprites) {
          ctx.globalCompositeOperation = 'lighter';
          drawCentred(ctx, sprites.bullet, bx, by, sizes.bulletSpriteHeight, Math.atan2(ty - WORLD.playerY, tx - b.fromX) + Math.PI / 2);
          ctx.globalCompositeOperation = 'source-over';
        } else {
          ctx.beginPath();
          ctx.arc(bx, by, sizes.bulletRadius, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      debris = debris.filter((d) => now - d.at < effects.debrisMs);
      if (sprites) {
        for (const d of debris) {
          const t = (now - d.at) / effects.msPerSecond;
          ctx.globalAlpha = 1 - (now - d.at) / effects.debrisMs;
          drawCentred(ctx, sprites[d.sprite], d.x + d.vx * t, d.y + d.vy * t, sizes.debrisHeight, d.spin * t);
          ctx.globalAlpha = 1;
        }
      }

      explosions = explosions.filter((e) => now - e.at < effects.explosionMs);
      for (const e of explosions) {
        const t = (now - e.at) / effects.explosionMs;
        if (sprites) {
          const frame = EXPLOSION[Math.min(effects.explosionFrames - 1, Math.floor(t * effects.explosionFrames))];
          drawCentred(ctx, sprites[frame], e.x, e.y, sizes.explosionSize[e.kind]);
          continue;
        }
        ctx.globalAlpha = 1 - t;
        ctx.strokeStyle = palette.explosion;
        ctx.lineWidth = sizes.lockLineWidth;
        ctx.beginPath();
        ctx.arc(e.x, e.y, sizes.explosionMaxRadius * t, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      // HUD
      ctx.font = fonts.hud;
      ctx.textBaseline = 'top';
      ctx.textAlign = 'left';
      ctx.fillStyle = palette.hud;
      ctx.fillText(`${labels.score} ${world.score}`, sizes.hudMargin, sizes.hudMargin);
      ctx.fillText(`${labels.wave} ${world.wave + 1}`, sizes.hudMargin, sizes.hudMargin + sizes.hudLineHeight);
      ctx.fillStyle = palette.hudLife;
      for (let i = 0; i < world.lives; i++) {
        ctx.fillRect(WORLD.width - sizes.hudMargin - (i + 1) * (sizes.lifeSize + sizes.lifeGap), sizes.hudMargin, sizes.lifeSize, sizes.lifeSize);
      }
      if (world.status !== 'playing') {
        ctx.font = fonts.banner;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = palette.hud;
        ctx.fillText(world.status === 'game-over' ? labels.gameOver : labels.waveComplete, WORLD.width / 2, WORLD.height / 2);
      }
    },
  };
}
