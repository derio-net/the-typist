import { WORLD, type World, type WorldEvent, type WorldShip } from '../engine/world';
import { drawShip, effects, fonts, labels, palette, sizes, type MeasureFont, type ShipBox } from './theme';

interface Bullet { shipId: string; fromX: number; at: number; lastX: number; lastY: number }
interface Explosion { x: number; y: number; at: number }

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
  const lastPos = new Map<string, { x: number; y: number }>();
  let bullets: Bullet[] = [];
  let explosions: Explosion[] = [];
  const playerX = WORLD.width / 2;

  /** Pixel width of `text` in the given font; ship text includes its hull padding. */
  const measure = (text: string, font: MeasureFont = 'ship'): number => {
    ctx.font = fonts[font];
    return ctx.measureText(text).width + (font === 'ship' ? 2 * sizes.shipPaddingX : 0);
  };

  function boxOf(ship: WorldShip): ShipBox {
    const w = measure(ship.text);
    return { x: ship.x - w / 2, y: ship.y - sizes.shipHeight / 2, w, h: sizes.shipHeight };
  }

  function drawShipText(ship: WorldShip, world: World, locked: boolean) {
    const box = boxOf(ship);
    drawShip(ctx, ship.kind, box);
    if (locked) {
      ctx.strokeStyle = palette.lock;
      ctx.lineWidth = sizes.lockLineWidth;
      ctx.strokeRect(box.x - sizes.lockInset, box.y - sizes.lockInset, box.w + 2 * sizes.lockInset, box.h + 2 * sizes.lockInset);
    }
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

    ctx.textAlign = 'center';
    let under = box.y + box.h;
    if (ship.label) {
      under += sizes.glossGap;
      ctx.font = fonts.gloss;
      ctx.fillStyle = palette.gloss;
      ctx.fillText(ship.label, ship.x, under + sizes.glossBaseline);
    }
    if (ship.kind === 'escort') {
      // chip and translation slots are always drawn in this phase
      under += sizes.chipGap;
      ctx.font = fonts.chip;
      ctx.fillStyle = palette.chip;
      ctx.fillText(ship.chip ?? '', ship.x, under);
      under += sizes.translationGap;
      ctx.font = fonts.translation;
      ctx.fillStyle = palette.translation;
      ctx.fillText(ship.translation ?? '', ship.x, under);
    }
  }

  return {
    measure,
    push(events, now) {
      for (const ev of events) {
        const p = 'shipId' in ev ? lastPos.get(ev.shipId) : undefined;
        if (ev.type === 'hit' && p) bullets.push({ shipId: ev.shipId, fromX: playerX, at: now, lastX: p.x, lastY: p.y });
        if (ev.type === 'destroyed' && p) explosions.push({ x: p.x, y: p.y, at: now });
      }
    },
    draw(world, now) {
      ctx.fillStyle = palette.background;
      ctx.fillRect(0, 0, WORLD.width, WORLD.height);
      ctx.fillStyle = palette.star;
      for (const s of stars) ctx.fillRect(s.x, s.y, sizes.starSize, sizes.starSize);

      for (const s of world.ships) lastPos.set(s.id, { x: s.x, y: s.y });
      const byId = new Map(world.ships.map((s) => [s.id, s]));

      // player
      ctx.fillStyle = palette.player;
      ctx.beginPath();
      ctx.moveTo(playerX, WORLD.playerY - sizes.playerHeight);
      ctx.lineTo(playerX - sizes.playerWidth / 2, WORLD.playerY);
      ctx.lineTo(playerX + sizes.playerWidth / 2, WORLD.playerY);
      ctx.closePath();
      ctx.fill();

      for (const s of world.ships) drawShipText(s, world, s.id === world.typing.lock);

      bullets = bullets.filter((b) => now - b.at < effects.bulletMs);
      ctx.fillStyle = palette.bullet;
      for (const b of bullets) {
        const target = byId.get(b.shipId);
        const tx = target?.x ?? b.lastX;
        const ty = target?.y ?? b.lastY;
        const t = (now - b.at) / effects.bulletMs;
        ctx.beginPath();
        ctx.arc(b.fromX + (tx - b.fromX) * t, WORLD.playerY + (ty - WORLD.playerY) * t, sizes.bulletRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      explosions = explosions.filter((e) => now - e.at < effects.explosionMs);
      for (const e of explosions) {
        const t = (now - e.at) / effects.explosionMs;
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
