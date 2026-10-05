import { displayForm, formsText } from '../schema/display';
import { RECOGNISED_TAGS, type VocabRecord } from '../schema/record';
import { charWidths, sizes, type MeasureFont } from '../render/theme';
import {
  addShip, createTyping, removeShip, setPositions, step, type TypingEvent, type TypingState,
} from './typing';

/** Fixed simulation step: 60 Hz. */
export const STEP_MS = 1000 / 60;
export const WORLD = {
  width: 960,
  height: 640,
  playerY: 590,
  lives: 3,
  /** Descent speed (px/s) of a short ship on wave 0. */
  baseSpeed: 20,
  speedPerWave: 0.2,
  /** Texts up to this many characters descend at full speed; longer ones slow with the square root of their length. */
  referenceLength: 12,
  /** Children spawn at least this many seconds of descent above the player line. */
  minReactionS: 3,
  /** Top margin for ship centres (keeps clear of the HUD). */
  minY: 30,
  /** Candidate grid for child placement. */
  slotStepX: 20,
  slotStepY: 15,
  /** Break-up: children leave the wreck with a random sideways speed in this range (px/s)... */
  burstMinVx: 40,
  burstMaxVx: 110,
  /** ...and an upward kick (px/s) that decays with this time constant (s). */
  burstKick: 70,
  kickDecayS: 0.4,
} as const;

/** Pixel width of `text` in a theme font; ship text includes the hull padding. */
export type Measure = (text: string, font?: MeasureFont) => number;

/** Default measurer derived from the theme's glyph-width estimates. */
export const defaultMeasure: Measure = (text, font = 'ship') =>
  text.length * charWidths[font] + (font === 'ship' ? 2 * sizes.shipPaddingX : 0);

export type ShipKind = 'mothership' | 'forms' | 'escort';

export interface WorldShip {
  id: string;
  recordId: string;
  kind: ShipKind;
  text: string;
  /** Centre position. */
  x: number;
  y: number;
  /** Descent speed, px/s. */
  speed: number;
  /** Sideways velocity (px/s; 0 for motherships) and the decaying extra vertical velocity of the burst kick. */
  vx: number;
  vy: number;
  /** Gloss, shown under motherships. */
  label?: string;
  /** English translation and grammar chip, for escorts. */
  translation?: string;
  chip?: string;
  /** Width of the whole bounding box (text hull plus the rows under it) and height of those rows. */
  w: number;
  below: number;
}

export interface Bounds { x0: number; y0: number; x1: number; y1: number }

/** Full bounding box: hull plus gloss / chip / translation rows. */
export function shipBounds(s: WorldShip): Bounds {
  return {
    x0: s.x - s.w / 2,
    x1: s.x + s.w / 2,
    y0: s.y - sizes.shipHeight / 2,
    y1: s.y + sizes.shipHeight / 2 + s.below,
  };
}

const overlaps = (a: Bounds, b: Bounds) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;

export interface RecordStats {
  typos: number;
  expectedChars: number;
  activeMs: number;
  escaped: boolean;
}

export type WorldEvent =
  | TypingEvent
  | { type: 'spawned'; shipId: string; kind: ShipKind }
  | { type: 'escaped'; shipId: string; recordId: string }
  | { type: 'resolved'; recordId: string; stats: RecordStats }
  | { type: 'wave-complete' }
  | { type: 'game-over' };

interface RecordState {
  record: VocabRecord;
  open: number;
  stats: RecordStats;
}

export interface World {
  time: number;
  /** Milliseconds not yet consumed by a whole step (see `advance`). */
  acc: number;
  wave: number;
  lives: number;
  score: number;
  status: 'playing' | 'wave-complete' | 'game-over';
  ships: WorldShip[];
  typing: TypingState;
  records: Record<string, RecordState>;
  /** Stats of every resolved record. */
  results: Record<string, RecordStats>;
  /** Events produced by the last `tick` / `typeChar` / `advance`. */
  events: WorldEvent[];
  measure: Measure;
  minReactionS: number;
  /** Seeded PRNG state: all randomness in the world comes from here. */
  rng: number;
}

export interface WorldOptions {
  wave?: number;
  lives?: number;
  /** Text measurer; the renderer supplies real glyph widths. */
  measure?: Measure;
  minReactionS?: number;
  /** PRNG seed; the same seed gives the same game. */
  seed?: number;
}

/** mulberry32: pure, returns a value in [0, 1) and the next state. */
function random(state: number): [number, number] {
  const next = (state + 0x6d2b79f5) | 0;
  let t = next;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, next];
}

export function shipSpeed(length: number, wave: number): number {
  // sqrt: long sentences fall slower, but not so slowly that they stall on screen
  const factor = Math.sqrt(Math.max(1, length / WORLD.referenceLength));
  return (WORLD.baseSpeed * (1 + WORLD.speedPerWave * wave)) / factor;
}

const clamp = (v: number, lo: number, hi: number) => (lo > hi ? (lo + hi) / 2 : Math.min(hi, Math.max(lo, v)));

function rowsBelow(kind: ShipKind, hasLabel: boolean): number {
  if (kind === 'mothership') return hasLabel ? sizes.glossGap + sizes.glossHeight : 0;
  if (kind === 'escort') return sizes.chipGap + sizes.translationGap + sizes.rowHalf;
  return 0;
}

function makeShip(
  m: Measure, id: string, recordId: string, kind: ShipKind, text: string, x: number, y: number, wave: number,
  extra: Partial<WorldShip> = {},
): WorldShip {
  const rows = [extra.label && m(extra.label, 'gloss'), extra.chip && m(extra.chip, 'chip'), extra.translation && m(extra.translation, 'translation')];
  const w = Math.max(m(text), ...rows.map((r) => r || 0));
  return { id, recordId, kind, text, x, y, speed: shipSpeed(text.length, wave), vx: 0, vy: 0, w, below: rowsBelow(kind, !!extra.label), ...extra };
}

/** A new wave: every record's mothership is on screen, in staggered lanes. */
export function createWorld(records: VocabRecord[], opts: WorldOptions = {}): World {
  const wave = opts.wave ?? 0;
  const measure = opts.measure ?? defaultMeasure;
  const n = records.length;
  const ships = records.map((r, i) =>
    makeShip(measure, `${r.id}:m`, r.id, 'mothership', displayForm(r), ((i + 1) / (n + 1)) * WORLD.width, 40 + (i % 3) * 45, wave, {
      label: r.gloss.join('; '),
    }),
  );
  return {
    time: 0, acc: 0, wave, lives: opts.lives ?? WORLD.lives, score: 0, status: 'playing',
    ships,
    typing: createTyping(ships.map((s) => ({ id: s.id, recordId: s.recordId, text: s.text, y: s.y }))),
    records: Object.fromEntries(
      records.map((r) => [r.id, { record: r, open: 1, stats: { typos: 0, expectedChars: 0, activeMs: 0, escaped: false } }]),
    ),
    results: {},
    events: [],
    measure,
    minReactionS: opts.minReactionS ?? WORLD.minReactionS,
    rng: opts.seed ?? 1,
  };
}

interface Draft extends World {}

function spawn(w: Draft, ship: WorldShip) {
  w.ships.push(ship);
  w.typing = addShip(w.typing, { id: ship.id, recordId: ship.recordId, text: ship.text, y: ship.y });
  const rs = w.records[ship.recordId];
  w.records[ship.recordId] = { ...rs, open: rs.open + 1 };
  w.events.push({ type: 'spawned', shipId: ship.id, kind: ship.kind });
}

/**
 * Nearest free slot to (px, py): the child's whole box must stay on the canvas,
 * clear of every live ship, and keep its centre `maxY` or higher. If no slot is
 * free, falls back to the top row.
 */
function findSlot(w: Draft, child: WorldShip, px: number, py: number): { x: number; y: number } {
  const maxY = Math.max(WORLD.minY, WORLD.playerY - child.speed * w.minReactionS);
  const lo = child.w / 2;
  const hi = WORLD.width - child.w / 2;
  const xs: number[] = lo > hi ? [WORLD.width / 2] : [];
  if (lo <= hi) for (let x = lo; x <= hi; x += WORLD.slotStepX) xs.push(x);
  const others = w.ships.map(shipBounds);
  let best: { x: number; y: number; d: number } | null = null;
  for (let y = WORLD.minY; y <= maxY; y += WORLD.slotStepY) {
    for (const x of xs) {
      const d = (x - px) ** 2 + (y - py) ** 2;
      if (best && d >= best.d) continue;
      const box = shipBounds({ ...child, x, y });
      if (others.some((o) => overlaps(box, o))) continue;
      best = { x, y, d };
    }
  }
  if (best) return best;
  return { x: clamp(px, lo, hi), y: WORLD.minY };
}

function spawnChildren(w: Draft, m: WorldShip) {
  const record = w.records[m.recordId].record;
  const forms = formsText(record);
  const children: WorldShip[] = [];
  if (forms !== null) children.push(makeShip(w.measure, `${record.id}:f`, record.id, 'forms', forms, m.x, m.y, w.wave));
  (record.examples ?? []).forEach((e, k) => {
    const chip = e.tags.filter((t) => (RECOGNISED_TAGS as readonly string[]).includes(t)).join(', ');
    children.push(makeShip(w.measure, `${record.id}:e${k}`, record.id, 'escort', e.de, m.x, m.y, w.wave, {
      translation: e.en,
      ...(chip ? { chip } : {}),
    }));
  });
  // Siblings descend together at the group's slowest speed, so a short ship never overtakes a long one.
  const speed = Math.min(...children.map((c) => c.speed));
  for (const child of children) {
    const same = { ...child, speed };
    const at = findSlot(w, same, m.x, m.y);
    // Burst away from the wreck; a child placed straight above/below picks a random side.
    let r: number;
    [r, w.rng] = random(w.rng);
    let dir = Math.sign(at.x - m.x);
    if (dir === 0) {
      let side: number;
      [side, w.rng] = random(w.rng);
      dir = side < 0.5 ? -1 : 1;
    }
    const vx = dir * (WORLD.burstMinVx + r * (WORLD.burstMaxVx - WORLD.burstMinVx));
    spawn(w, { ...same, ...at, vx, vy: -WORLD.burstKick });
  }
}

/** Marks one of the record's ships as done; resolves the record when it was the last. */
function shipDone(w: Draft, recordId: string, patch: Partial<RecordStats>, add: Partial<RecordStats> = {}) {
  const rs = w.records[recordId];
  const stats: RecordStats = {
    ...rs.stats, ...patch,
    expectedChars: rs.stats.expectedChars + (add.expectedChars ?? 0),
    activeMs: rs.stats.activeMs + (add.activeMs ?? 0),
  };
  w.records[recordId] = { ...rs, open: rs.open - 1, stats };
  if (rs.open - 1 === 0) {
    w.results[recordId] = stats;
    w.events.push({ type: 'resolved', recordId, stats });
  }
}

function finish(w: Draft): World {
  if (w.status === 'playing') {
    if (w.lives <= 0) {
      w.status = 'game-over';
      w.events.push({ type: 'game-over' });
    } else if (Object.values(w.records).every((r) => r.open === 0)) {
      w.status = 'wave-complete';
      w.events.push({ type: 'wave-complete' });
    }
  }
  return w;
}

const draft = (w: World): Draft => ({
  ...w, ships: [...w.ships], records: { ...w.records }, results: { ...w.results }, events: [],
});

/** One fixed step: ships descend; any ship reaching the player line escapes. */
export function tick(world: World): World {
  if (world.status !== 'playing') return world;
  const w = draft(world);
  const dt = STEP_MS / 1000;
  w.time += STEP_MS;
  const decay = Math.exp(-dt / WORLD.kickDecayS);
  w.ships = w.ships.map((s) => {
    const vy = s.vy * decay;
    return { ...s, x: s.x + s.vx * dt, vy, y: Math.max(WORLD.minY, s.y + (s.speed + vy) * dt) };
  });
  bounce(w);
  const ys: Record<string, number> = {};
  for (const s of w.ships) ys[s.id] = s.y;
  w.typing = setPositions(w.typing, ys);
  for (const s of w.ships.filter((s) => s.y >= WORLD.playerY)) {
    w.ships = w.ships.filter((x) => x.id !== s.id);
    w.typing = removeShip(w.typing, s.id);
    w.lives -= 1;
    w.events.push({ type: 'escaped', shipId: s.id, recordId: s.recordId });
    shipDone(w, s.recordId, { escaped: true });
  }
  return finish(w);
}

/** Keeps a ship inside the canvas, reflecting its sideways velocity at the edges. */
function keepInside(s: WorldShip): WorldShip {
  const lo = s.w / 2;
  const hi = WORLD.width - s.w / 2;
  if (lo > hi) return { ...s, x: WORLD.width / 2, vx: 0 };
  if (s.x < lo) return { ...s, x: lo, vx: Math.abs(s.vx) };
  if (s.x > hi) return { ...s, x: hi, vx: -Math.abs(s.vx) };
  return s;
}

/**
 * Edge and ship-to-ship bounces. Overlapping pairs (at least one child) are
 * pushed apart horizontally and sent away from each other; a mothership is an
 * immovable obstacle that only the child bounces off.
 */
function bounce(w: Draft) {
  const ships = w.ships.map(keepInside);
  for (let i = 0; i < ships.length; i++) {
    for (let j = i + 1; j < ships.length; j++) {
      let a = ships[i];
      let b = ships[j];
      if (a.kind === 'mothership' && b.kind === 'mothership') continue;
      const [ba, bb] = [shipBounds(a), shipBounds(b)];
      if (!overlaps(ba, bb)) continue;
      const leftFirst = a.x <= b.x;
      const overlap = Math.min(ba.x1, bb.x1) - Math.max(ba.x0, bb.x0) + 0.01;
      const away = (s: WorldShip, left: boolean, by: number) =>
        ({ ...s, x: s.x + (left ? -by : by), vx: left ? -Math.abs(s.vx) : Math.abs(s.vx) });
      if (a.kind === 'mothership') b = away(b, !leftFirst, overlap);
      else if (b.kind === 'mothership') a = away(a, leftFirst, overlap);
      else {
        a = away(a, leftFirst, overlap / 2);
        b = away(b, !leftFirst, overlap / 2);
      }
      ships[i] = keepInside(a);
      ships[j] = keepInside(b);
    }
  }
  w.ships = ships;
}

/** Runs as many whole 60 Hz steps as `elapsedMs` allows, carrying the remainder. */
export function advance(world: World, elapsedMs: number): World {
  let w = world;
  let acc = w.acc + elapsedMs;
  const events: WorldEvent[] = [];
  while (acc >= STEP_MS - 1e-9 && w.status === 'playing') {
    w = tick(w);
    events.push(...w.events);
    acc -= STEP_MS;
  }
  return { ...w, acc, events };
}

/** Feeds one committed character to the typing engine and applies the consequences. */
export function typeChar(world: World, char: string): World {
  if (world.status !== 'playing') return { ...world, events: [] };
  const w = draft(world);
  const res = step(w.typing, char, w.time);
  w.typing = res.state;
  for (const ev of res.events) {
    w.events.push(ev);
    if (ev.type === 'typo') {
      const rs = w.records[ev.recordId];
      w.records[ev.recordId] = { ...rs, stats: { ...rs.stats, typos: rs.stats.typos + 1 } };
    } else if (ev.type === 'destroyed') {
      const ship = w.ships.find((s) => s.id === ev.shipId)!;
      w.ships = w.ships.filter((s) => s.id !== ev.shipId);
      const accuracy = ev.expectedChars / (ev.expectedChars + ev.typos);
      w.score += Math.round(ev.expectedChars * 10 * accuracy);
      if (ship.kind === 'mothership') spawnChildren(w, ship);
      shipDone(w, ev.recordId, {}, { expectedChars: ev.expectedChars, activeMs: ev.destroyedAt - ev.lockAt });
    }
  }
  return finish(w);
}
