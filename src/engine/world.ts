import { displayForm, formsText } from '../schema/display';
import { RECOGNISED_TAGS, type VocabRecord } from '../schema/record';
import { charWidths, hullExtent, sizes, type MeasureFont } from '../render/theme';
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
  /** Where a mothership enters. */
  entryY: 40,
  /** Break-up: each child slides sideways at a random speed in this range (px/s)... */
  burstMinVx: 8,
  burstMaxVx: 22,
  /** ...after one shared upward kick (px/s) that decays with this time constant (s). */
  burstKick: 220,
  kickDecayS: 0.45,
  /** Vertical gap between the children's bands. */
  bandGap: 6,
} as const;

/** Pixel width of `text` in a theme font; ship text includes the strip's padding (not the hull's end caps). */
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
  /** Reach of the drawn hull above and below the ship's centre. */
  above: number;
  below: number;
}

export interface Bounds { x0: number; y0: number; x1: number; y1: number }

/** Full bounding box: hull plus gloss / chip / translation rows. */
export function shipBounds(s: WorldShip): Bounds {
  return {
    x0: s.x - s.w / 2,
    x1: s.x + s.w / 2,
    y0: s.y - s.above,
    y1: s.y + s.below,
  };
}


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
  /** Records whose mothership has not entered yet, in order. */
  queue: string[];
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


function makeShip(
  m: Measure, id: string, recordId: string, kind: ShipKind, text: string, x: number, y: number, wave: number,
  extra: Partial<WorldShip> = {},
): WorldShip {
  // gloss, chip and translation are printed on the hull itself, so they only widen the box when longer than it
  const ext = hullExtent(kind);
  const rows = [extra.label && m(extra.label, 'gloss'), extra.chip && m(extra.chip, 'chip'), extra.translation && m(extra.translation, 'translation')];
  const w = Math.max(m(text) + 2 * ext.side, ...rows.map((r) => r || 0));
  return { id, recordId, kind, text, x, y, speed: shipSpeed(text.length, wave), vx: 0, vy: 0, w, above: ext.above, below: ext.below, ...extra };
}

/** A new wave: the first record's mothership enters; the rest wait in the queue (one record on screen at a time). */
export function createWorld(records: VocabRecord[], opts: WorldOptions = {}): World {
  const wave = opts.wave ?? 0;
  const measure = opts.measure ?? defaultMeasure;
  const w: Draft = {
    time: 0, acc: 0, wave, lives: opts.lives ?? WORLD.lives, score: 0, status: 'playing',
    ships: [],
    typing: createTyping([]),
    records: Object.fromEntries(
      records.map((r) => [r.id, { record: r, open: 0, stats: { typos: 0, expectedChars: 0, activeMs: 0, escaped: false } }]),
    ),
    results: {},
    events: [],
    measure,
    minReactionS: opts.minReactionS ?? WORLD.minReactionS,
    rng: opts.seed ?? 1,
    queue: records.map((r) => r.id),
  };
  enterNext(w);
  return { ...w, events: [] };
}

interface Draft extends World {}

function spawn(w: Draft, ship: WorldShip) {
  w.ships.push(ship);
  w.typing = addShip(w.typing, { id: ship.id, recordId: ship.recordId, text: ship.text, y: ship.y });
  const rs = w.records[ship.recordId];
  w.records[ship.recordId] = { ...rs, open: rs.open + 1 };
  w.events.push({ type: 'spawned', shipId: ship.id, kind: ship.kind });
}

/** The next queued record's mothership enters at the top, at a random x. */
function enterNext(w: Draft) {
  const id = w.queue[0];
  if (id === undefined) return;
  w.queue = w.queue.slice(1);
  const r = w.records[id].record;
  const m = makeShip(w.measure, `${r.id}:m`, r.id, 'mothership', displayForm(r), 0, WORLD.entryY, w.wave, {
    label: r.gloss.join('; '),
  });
  let u: number;
  [u, w.rng] = random(w.rng);
  const lo = m.w / 2;
  const hi = WORLD.width - m.w / 2;
  spawn(w, { ...m, x: lo > hi ? WORLD.width / 2 : lo + u * (hi - lo) });
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
  if (children.length === 0) return;
  // One shared speed and kick, so the bands move as one and never cross.
  const speed = Math.min(...children.map((c) => c.speed));
  const stack = children.reduce((a, c) => a + c.above + c.below, 0) + WORLD.bandGap * (children.length - 1);
  const first = children[0];
  const last = children[children.length - 1];
  const lastOffset = stack - first.above - last.below; // first centre → last centre
  const rise = WORLD.burstKick * WORLD.kickDecayS; // total upward travel of the kick
  // centre of the first band: around the wreck, low enough that the kick keeps it below the HUD,
  // high enough that the last band keeps the reaction distance (that one wins)
  let y = m.y - stack / 2 + first.above;
  y = Math.max(y, WORLD.minY + rise);
  y = Math.min(y, WORLD.playerY - speed * w.minReactionS - lastOffset);
  children.forEach((child, k) => {
    let u: number;
    let side: number;
    [u, w.rng] = random(w.rng);
    [side, w.rng] = random(w.rng);
    const vx = (side < 0.5 ? -1 : 1) * (WORLD.burstMinVx + u * (WORLD.burstMaxVx - WORLD.burstMinVx));
    spawn(w, keepInside({ ...child, speed, x: m.x, y, vx, vy: -WORLD.burstKick }));
    const next = children[k + 1];
    if (next) y += child.below + WORLD.bandGap + next.above;
  });
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
    if (w.lives > 0) enterNext(w);
  }
}

function finish(w: Draft): World {
  if (w.status === 'playing') {
    if (w.lives <= 0) {
      w.status = 'game-over';
      w.events.push({ type: 'game-over' });
    } else if (w.queue.length === 0 && Object.values(w.records).every((r) => r.open === 0)) {
      w.status = 'wave-complete';
      w.events.push({ type: 'wave-complete' });
    }
  }
  return w;
}

const draft = (w: World): Draft => ({
  ...w, ships: [...w.ships], records: { ...w.records }, results: { ...w.results }, queue: [...w.queue], events: [],
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
    return keepInside({ ...s, x: s.x + s.vx * dt, vy, y: s.y + (s.speed + vy) * dt });
  });
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
