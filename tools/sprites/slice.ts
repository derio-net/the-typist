/**
 * Cuts public/assets/sprites/sheet.png (magenta-keyed sprite sheet, layout in
 * docs/ux/sprite-prompts.md) into one transparent PNG per sprite plus
 * src/render/sprite-atlas.json (sizes and each hull's text strip). Sprites are found by outline, not by a fixed grid: rows are split
 * at empty horizontal gaps, sprites within a row at empty vertical gaps.
 *
 *   npm run sprites
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { PNG } from 'pngjs';

const DIR = 'public/assets/sprites';
const ATLAS = 'src/render/sprite-atlas.json';
/** Names in sheet order: row by row, left to right. */
export const LAYOUT: string[][] = [
  ['mothership'],
  ['forms'],
  ['sentence'],
  ['player', 'bullet', 'reticle', 'debris1', 'debris2', 'debris3', 'debris4'],
  ['explosion1', 'explosion2', 'explosion3', 'explosion4', 'explosion5', 'explosion6', 'explosion7', 'explosion8'],
];
/**
 * Approximate x of the gap between neighbouring sprites, per row index, for
 * rows where glow, sparks or hollow sprites (the reticle) defeat plain valley
 * finding. Each hint snaps to the emptiest column within HINT_WINDOW of it.
 * Specific to the current sheet.png: update after regenerating the sheet.
 */
const COL_HINTS: Record<number, number[]> = {
  3: [250, 370, 565, 810, 1000, 1240],
  4: [120, 250, 405, 605, 866, 1060, 1250],
};
const HINT_WINDOW = 40;
/** Hulls whose dark glass strip holds the ship's text (3-slice). */
const HULLS = new Set(['mothership', 'forms', 'sentence']);

export interface Rect { x0: number; y0: number; x1: number; y1: number }
export interface AtlasEntry { w: number; h: number; strip?: Rect }

/** Distance from pure key magenta #FF00FF below which a pixel is background, and the edge ramp above it. */
const KEY_INNER = 40;
const KEY_OUTER = 110;

/**
 * Keys out magenta in place. Only colours close to pure #FF00FF are touched,
 * so violet and pink parts of the art keep their colour; the ramp softens
 * edges, and despill pulls the remaining magenta tint out of edge pixels.
 */
export function keyMagenta(png: PNG): void {
  const d = png.data;
  for (let i = 0; i < d.length; i += 4) {
    const [r, g, b] = [d[i], d[i + 1], d[i + 2]];
    const dist = Math.hypot(255 - r, g, 255 - b);
    if (dist >= KEY_OUTER) continue;
    if (dist <= KEY_INNER) {
      d[i + 3] = 0;
      continue;
    }
    const k = (KEY_OUTER - dist) / (KEY_OUTER - KEY_INNER); // 1 at the inner edge, 0 at the outer
    d[i + 3] = Math.round(255 * (1 - k));
    const spill = Math.min(r, b) - g;
    if (spill > 0) {
      d[i] = Math.round(r - k * spill);
      d[i + 2] = Math.round(b - k * spill);
    }
  }
}

/** Drops magenta-tinted pixels on the transparent edge (the fringe left by anti-aliasing against the key), `passes` px deep. */
export function defringe(png: PNG, passes = 2): void {
  const { width: W, height: H, data: d } = png;
  for (let p = 0; p < passes; p++) {
    const drop: number[] = [];
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 4;
        if (d[i + 3] === 0) continue;
        const tinted = d[i] > d[i + 1] + 30 && d[i + 2] > d[i + 1] + 30 && d[i + 2] >= d[i] - 40;
        if (!tinted) continue;
        const edge = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => {
          const nx = x + dx, ny = y + dy;
          return nx < 0 || ny < 0 || nx >= W || ny >= H || d[(ny * W + nx) * 4 + 3] === 0;
        });
        if (edge) drop.push(i);
      }
    for (const i of drop) d[i + 3] = 0;
  }
}

const alphaAt = (png: PNG, x: number, y: number) => png.data[(y * png.width + x) * 4 + 3];

/**
 * Splits [lo, hi) into `n` parts at the n-1 lowest points of `coverage`, each
 * cut at least `minSep` from the others and from the ends. A gap with zero
 * coverage is cut at its middle. Valley-based rather than gap-based, because
 * glow and sparks often bridge the empty space between sprites.
 */
export function splitAt(coverage: number[], lo: number, hi: number, n: number, minSep: number): [number, number][] {
  // never cut in the empty margins: split only between the first and last filled index
  while (lo < hi && coverage[lo] === 0) lo++;
  while (hi > lo && coverage[hi - 1] === 0) hi--;
  const candidates: { at: number; v: number }[] = [];
  for (let i = lo + minSep; i < hi - minSep; i++) {
    // middle of a run of equal coverage counts as one candidate
    let j = i;
    while (j + 1 < hi - minSep && coverage[j + 1] === coverage[i]) j++;
    candidates.push({ at: Math.floor((i + j) / 2), v: coverage[i] });
    i = j;
  }
  candidates.sort((a, b) => a.v - b.v);
  const cuts: number[] = [];
  for (const c of candidates) {
    if (cuts.length === n - 1) break;
    if (cuts.every((k) => Math.abs(k - c.at) >= minSep)) cuts.push(c.at);
  }
  cuts.sort((a, b) => a - b);
  const bounds = [lo, ...cuts, hi];
  return bounds.slice(1).map((b, k) => [bounds[k], b]);
}

const SOLID = 40;

/** Cuts at the emptiest column near each hint. */
function splitNear(coverage: number[], n: number, hints: number[]): [number, number][] {
  const cuts = hints.map((h) => {
    let best = h;
    for (let x = Math.max(1, h - HINT_WINDOW); x <= Math.min(n - 2, h + HINT_WINDOW); x++)
      if (coverage[x] < coverage[best] || (coverage[x] === coverage[best] && Math.abs(x - h) < Math.abs(best - h))) best = x;
    return best;
  });
  const bounds = [0, ...cuts, n];
  return bounds.slice(1).map((b, k) => [bounds[k], b]);
}

/** Bounding box of solid pixels inside `r`. */
function tighten(png: PNG, r: Rect): Rect {
  let x0 = r.x1, y0 = r.y1, x1 = r.x0, y1 = r.y0;
  for (let y = r.y0; y < r.y1; y++)
    for (let x = r.x0; x < r.x1; x++)
      if (alphaAt(png, x, y) > SOLID) {
        x0 = Math.min(x0, x); x1 = Math.max(x1, x + 1);
        y0 = Math.min(y0, y); y1 = Math.max(y1, y + 1);
      }
  return { x0, y0, x1, y1 };
}

export function findSprites(png: PNG, layout: string[][]): Rect[][] {
  const rowCov = Array.from({ length: png.height }, (_, y) => {
    let c = 0;
    for (let x = 0; x < png.width; x++) if (alphaAt(png, x, y) > SOLID) c++;
    return c;
  });
  const rows = splitAt(rowCov, 0, png.height, layout.length, 40);
  return rows.map(([y0, y1], ri) => {
    const colCov = Array.from({ length: png.width }, (_, x) => {
      let c = 0;
      for (let y = y0; y < y1; y++) if (alphaAt(png, x, y) > SOLID) c++;
      return c;
    });
    const hints = COL_HINTS[ri];
    const cols = hints ? splitNear(colCov, png.width, hints) : splitAt(colCov, 0, png.width, layout[ri].length, 30);
    if (cols.length !== layout[ri].length) throw new Error(`row ${ri}: ${cols.length} cells, LAYOUT expects ${layout[ri].length}`);
    return cols.map(([x0, x1]) => tighten(png, { x0, x1, y0, y1 }));
  });
}

function crop(src: PNG, r: Rect): PNG {
  const out = new PNG({ width: r.x1 - r.x0, height: r.y1 - r.y0 });
  PNG.bitblt(src, out, r.x0, r.y0, out.width, out.height, 0, 0);
  return out;
}

/** The dark glass strip around the hull's centre: where luminance stays low. */
export function findStrip(png: PNG): Rect {
  const lum = (x: number, y: number) => {
    const i = (y * png.width + x) * 4;
    return 0.2126 * png.data[i] + 0.7152 * png.data[i + 1] + 0.0722 * png.data[i + 2];
  };
  const cx = Math.floor(png.width / 2);
  const cy = Math.floor(png.height / 2);
  const dark = (x: number, y: number) => alphaAt(png, x, y) > 200 && lum(x, y) < 60;
  let x0 = cx, x1 = cx, y0 = cy, y1 = cy;
  while (x0 > 0 && dark(x0 - 1, cy)) x0--;
  while (x1 < png.width - 1 && dark(x1 + 1, cy)) x1++;
  while (y0 > 0 && dark(cx, y0 - 1)) y0--;
  while (y1 < png.height - 1 && dark(cx, y1 + 1)) y1++;
  return { x0, y0, x1: x1 + 1, y1: y1 + 1 };
}

function main() {
  const sheet = PNG.sync.read(readFileSync(join(DIR, 'sheet.png')));
  keyMagenta(sheet);
  defringe(sheet);
  const found = findSprites(sheet, LAYOUT);
  const atlas: Record<string, AtlasEntry> = {};
  found.forEach((row, ri) =>
    row.forEach((rect, ci) => {
      const name = LAYOUT[ri][ci];
      console.log(`${name}: x ${rect.x0}-${rect.x1}, y ${rect.y0}-${rect.y1}`);
      if (rect.x1 <= rect.x0 || rect.y1 <= rect.y0) throw new Error(`${name}: empty cell; the sheet does not match LAYOUT`);
      const img = crop(sheet, rect);
      writeFileSync(join(DIR, `${name}.png`), PNG.sync.write(img));
      atlas[name] = { w: img.width, h: img.height, ...(HULLS.has(name) ? { strip: findStrip(img) } : {}) };
    }),
  );
  // geometry goes next to the code that uses it; the PNGs are served from public/
  writeFileSync(ATLAS, JSON.stringify(atlas, null, 2) + '\n');
  console.log(`wrote ${Object.keys(atlas).length} sprites to ${DIR}`);
  for (const [n, e] of Object.entries(atlas)) console.log(n, e.w, e.h, e.strip ? JSON.stringify(e.strip) : '');
}

if (process.argv[1]?.endsWith('/tools/sprites/slice.ts')) main();
