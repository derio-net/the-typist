/**
 * Every visual constant of the game lives here. Placeholder values; the renderer
 * contains no colours, fonts or magic sizes of its own. Swap `drawShip` for a
 * sprite hook to retheme the ships.
 */
export const palette = {
  background: '#0b1020',
  star: '#2a3556',
  text: '#e8ecf8',
  textDim: '#8d97b5',
  typed: '#5df2a0',
  typo: '#ff5d6c',
  gloss: '#f6d365',
  chip: '#7cc4ff',
  translation: '#9aa6c9',
  lock: '#ffffff',
  bullet: '#fffb9a',
  explosion: '#ffb347',
  player: '#5df2a0',
  hud: '#e8ecf8',
  hudLife: '#ff5d6c',
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
  ship: '18px ui-monospace, Menlo, Consolas, monospace',
  gloss: 'italic 15px system-ui, sans-serif',
  chip: '12px system-ui, sans-serif',
  translation: '13px system-ui, sans-serif',
  hud: '16px ui-monospace, Menlo, Consolas, monospace',
  banner: '32px system-ui, sans-serif',
} as const;

export const sizes = {
  shipPaddingX: 12,
  shipHeight: 30,
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
  playerLineWidth: 1,
} as const;

export const effects = {
  bulletMs: 120,
  explosionMs: 450,
} as const;

export const labels = {
  score: 'Score',
  wave: 'Wave',
  waveComplete: 'Wave complete',
  gameOver: 'Game over',
} as const;

export type ShipKindName = 'mothership' | 'forms' | 'escort';

export interface ShipBox {
  /** Top-left corner and size. */
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Sprite hook: draws the hull behind a ship's text. Placeholder shapes. */
export function drawShip(ctx: CanvasRenderingContext2D, kind: ShipKindName, box: ShipBox): void {
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
