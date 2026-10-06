import { displayForm, formsText } from '../schema/display';
import { RECOGNISED_TAGS, type VocabRecord } from '../schema/record';
import { charWidths, hullExtent, sizes, type MeasureFont } from '../layout/metrics';
import { createPace, observe, type Pace } from './pace';
import {
  addShip, createTyping, removeShip, requiredLength, setPositions, step, type TypingEvent, type TypingState,
} from './typing';

/** Fixed simulation step: 60 Hz. */
export const STEP_MS = 1000 / 60;
const BURST_MAX_VX = 22;
export const WORLD = {
  width: 960,
  height: 640,
  playerY: 590,
  lives: 3,
  /** Time budget of a ship is this many times its estimated typing time... */
  slack: 1.5,
  /** ...plus this many seconds per ship to retarget (find it, lock on). */
  retargetS: 0.6,
  /** Descent speed bounds, px/s. */
  minSpeed: 8,
  maxSpeed: 140,
  /** Children spawn at least this many seconds of descent above the player line. */
  minReactionS: 3,
  /** Bottom of the HUD (score, wave): ship centres stay below it. */
  minY: 64,
  /** Gap between the HUD and the top of an entering mothership's hull. */
  entryGap: 4,
  /** Break-up: each child slides sideways at a random speed in this range (px/s)... */
  burstMinVx: 8,
  burstMaxVx: BURST_MAX_VX,
  /** ...after one shared upward kick (solved per release) that decays with this time constant (s). */
  kickDecayS: 0.45,
  /** Sideways speed (px/s) of the player ship toward the ship it has locked: as fast as the fastest burst child (`burstMaxVx`). */
  playerDriftVx: BURST_MAX_VX,
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
  /** Player ship x: drifts toward the locked ship. */
  playerX: number;
  /** Logical canvas width (the height is fixed): ships stay inside [0, width]. */
  width: number;
  /** Which learning aids escorts carry. */
  aids: Aids;
  /** Seeded PRNG state: all randomness in the world comes from here. */
  rng: number;
  /** The typist's measured rate; sets the speed of every ship that spawns. */
  pace: Pace;
  /** Records whose mothership has not entered yet, in order. */
  queue: string[];
}

/** Learning aids shown on escorts: the grammar chip and the English translation. */
export interface Aids { chip: boolean; translation: boolean }

export interface WorldOptions {
  /** Starting score (carried between waves). */
  score?: number;
  /** Logical canvas width; defaults to `WORLD.width`. */
  width?: number;
  aids?: Partial<Aids>;
  wave?: number;
  lives?: number;
  /** Text measurer; the renderer supplies real glyph widths. */
  measure?: Measure;
  minReactionS?: number;
  /** PRNG seed; the same seed gives the same game. */
  seed?: number;
  /** Starting typing-rate estimate (carried between waves and sessions); a fresh calibration when absent. */
  pace?: Pace;
}

/** mulberry32: pure, returns a value in [0, 1) and the next state. */
function random(state: number): [number, number] {
  const next = (state + 0x6d2b79f5) | 0;
  let t = next;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, next];
}

/**
 * Descent speed (px/s) that gives a ship `distance` px to cover in `slack` times the time the typist needs for it and
 * every ship still below it: `chars` lists the required characters of this ship and the ones under it, in order.
 */
export function budgetSpeed(distance: number, chars: readonly number[], pace: Pace): number {
  const budget = WORLD.slack * chars.reduce((a, c) => a + c * pace.spc + WORLD.retargetS, 0);
  return Math.min(WORLD.maxSpeed, Math.max(WORLD.minSpeed, distance / budget));
}


function makeShip(
  m: Measure, id: string, recordId: string, kind: ShipKind, text: string, x: number, y: number,
  extra: Partial<WorldShip> = {},
): WorldShip {
  // gloss, chip and translation are printed on the hull itself, so they only widen the box when longer than it
  const ext = hullExtent(kind);
  const rows = [extra.label && m(extra.label, 'gloss'), extra.chip && m(extra.chip, 'chip'), extra.translation && m(extra.translation, 'translation')];
  const w = Math.max(m(text) + 2 * ext.side, ...rows.map((r) => r || 0));
  return { id, recordId, kind, text, x, y, speed: 0, vx: 0, vy: 0, w, above: ext.above, below: ext.below, ...extra };
}

/** A new wave: the first record's mothership enters; the rest wait in the queue (one record on screen at a time). */
export function createWorld(records: VocabRecord[], opts: WorldOptions = {}): World {
  const wave = opts.wave ?? 0;
  const measure = opts.measure ?? defaultMeasure;
  const w: Draft = {
    time: 0, acc: 0, wave, lives: opts.lives ?? WORLD.lives, score: opts.score ?? 0, status: 'playing',
    ships: [],
    typing: createTyping([]),
    records: Object.fromEntries(
      records.map((r) => [r.id, { record: r, open: 0, stats: { typos: 0, expectedChars: 0, activeMs: 0, escaped: false } }]),
    ),
    results: {},
    events: [],
    measure,
    minReactionS: opts.minReactionS ?? WORLD.minReactionS,
    width: opts.width ?? WORLD.width,
    playerX: (opts.width ?? WORLD.width) / 2,
    aids: { chip: opts.aids?.chip ?? true, translation: opts.aids?.translation ?? true },
    rng: opts.seed ?? 1,
    pace: createPace(opts.pace),
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
  const m = makeShip(w.measure, `${r.id}:m`, r.id, 'mothership', displayForm(r), 0, 0, {
    label: r.gloss.join('; '),
  });
  let u: number;
  [u, w.rng] = random(w.rng);
  const lo = m.w / 2;
  const hi = w.width - m.w / 2;
  // enters with its whole hull below the HUD
  const y = WORLD.minY + WORLD.entryGap + m.above;
  const speed = budgetSpeed(WORLD.playerY - y, [requiredLength(m.text)], w.pace);
  spawn(w, { ...m, speed, x: lo > hi ? w.width / 2 : lo + u * (hi - lo), y });
}

function spawnChildren(w: Draft, m: WorldShip) {
  const record = w.records[m.recordId].record;
  const forms = formsText(record);
  // Sentences by length, longest first (a stable sort keeps example order on ties), then the forms ship at the bottom.
  const examples = (record.examples ?? []).map((e, k) => ({ e, k }));
  const children: WorldShip[] = examples
    .sort((a, b) => b.e.de.length - a.e.de.length)
    .map(({ e, k }) => {
      const chip = e.tags.filter((t) => (RECOGNISED_TAGS as readonly string[]).includes(t)).join(', ');
      return makeShip(w.measure, `${record.id}:e${k}`, record.id, 'escort', e.de, m.x, m.y, {
        ...(w.aids.translation ? { translation: e.en } : {}),
        ...(w.aids.chip && chip ? { chip } : {}),
      });
    });
  if (forms !== null) children.push(makeShip(w.measure, `${record.id}:f`, record.id, 'forms', forms, m.x, m.y));
  if (children.length === 0) return;
  // One shared speed and kick, so the bands move as one and never cross.
  const { ys, kick, speed } = placeStack({
    rows: children.map((c) => ({ above: c.above, below: c.below, chars: requiredLength(c.text) })),
    wreckY: m.y, pace: w.pace, minReactionS: w.minReactionS,
  });
  children.forEach((child, k) => {
    let u: number;
    let side: number;
    [u, w.rng] = random(w.rng);
    [side, w.rng] = random(w.rng);
    const vx = (side < 0.5 ? -1 : 1) * (WORLD.burstMinVx + u * (WORLD.burstMaxVx - WORLD.burstMinVx));
    spawn(w, keepInside(w.width, { ...child, speed, x: m.x, y: ys[k], vx, vy: -kick }));
  });
}

export interface StackRow { above: number; below: number; /** Required characters of the ship. */ chars: number }

/** Rise (px) of a ship kicked up at `kick` px/s while descending at `speed`: the maximum over whole `tick()` steps. */
export function kickApex(kick: number, speed: number): number {
  const dt = STEP_MS / 1000;
  const d = Math.exp(-dt / WORLD.kickDecayS);
  let sum = 0;
  let pow = 1;
  let best = 0;
  for (let n = 1; n < 2000; n++) {
    pow *= d;
    sum += pow;
    if (kick * pow <= speed) break; // the net step is downward from here on
    best = Math.max(best, kick * dt * sum - speed * n * dt);
  }
  return best;
}

/** The kick (px/s) whose apex rise is `rise` (px), within a micro-pixel and never above it. */
function solveKick(rise: number, speed: number): number {
  if (rise <= 0) return 0;
  let lo = 0;
  let hi = 1e5;
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    if (kickApex(mid, speed) <= rise) lo = mid;
    else hi = mid;
  }
  return lo;
}

/**
 * Places a released stack of rows (top to bottom) around a destroyed mothership at `wreckY`.
 * Returns each row's centre y, the upward kick speed (px/s, >= 0) and the shared descent speed. Rules, in order:
 *
 * 1. Spacing: consecutive rows' boxes (`above` + `below` around the centre) are `WORLD.bandGap` apart.
 * 2. Position: the stack is centred on the wreck.
 * 3. Rise-0 floor: the first row's hull top is at or below `WORLD.minY`, so a wreck right under the HUD
 *    does not put the stack where no kick could bring it down.
 * 4. Reaction distance: the last row stays `minReactionS` seconds of descent above the player line.
 *    This wins over rule 3: the stack moves up again if needed.
 * 5. Kick: solved so that the apex of the flight puts the first row's hull top at `WORLD.minY` (never above it);
 *    it is 0 when the stack already sits at the HUD, or above it after rule 4.
 *
 * The shared speed is the minimum, over each row, of `budgetSpeed` from the row's apex position and the rows
 * below it; the rise is free extra time, so distances are taken at the apex.
 */
export function placeStack(
  p: { rows: StackRow[]; wreckY: number; pace: Pace; minReactionS: number },
): { ys: number[]; kick: number; speed: number } {
  const { rows } = p;
  if (rows.length === 0) return { ys: [], kick: 0, speed: WORLD.minSpeed };
  const first = rows[0];
  const offsets = [0];
  for (let k = 1; k < rows.length; k++) offsets.push(offsets[k - 1] + rows[k - 1].below + WORLD.bandGap + rows[k].above);
  const stack = rows.reduce((a, r) => a + r.above + r.below, 0) + WORLD.bandGap * (rows.length - 1);
  const lastOffset = offsets[offsets.length - 1];
  const riseFor = (y: number) => Math.max(0, y - first.above - WORLD.minY);
  const speedAt = (y: number) => {
    const rise = riseFor(y);
    return Math.min(...rows.map((_, i) => budgetSpeed(
      WORLD.playerY - (y + offsets[i] - rise), rows.slice(i).map((r) => r.chars), p.pace,
    )));
  };
  let y = Math.max(p.wreckY - stack / 2 + first.above, WORLD.minY + first.above);
  // the speed depends on where the stack sits and the reaction distance on the speed: iterate to the fixed point
  for (let i = 0; i < 40; i++) {
    const bound = WORLD.playerY - speedAt(y) * p.minReactionS - lastOffset;
    if (y <= bound) break;
    y = bound;
  }
  const speed = speedAt(y);
  return { ys: offsets.map((o) => y + o), kick: solveKick(riseFor(y), speed), speed };
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
      // records still on screen with an escaped ship are graded now: the session ends before they resolve
      for (const [recordId, rs] of Object.entries(w.records)) {
        if (!rs.stats.escaped || rs.open <= 0) continue;
        w.results[recordId] = rs.stats;
        w.events.push({ type: 'resolved', recordId, stats: rs.stats });
      }
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
    return keepInside(w.width, { ...s, x: s.x + s.vx * dt, vy, y: s.y + (s.speed + vy) * dt });
  });
  const target = w.typing.lock ? w.ships.find((s) => s.id === w.typing.lock) : undefined;
  if (target) {
    const reach = WORLD.playerDriftVx * dt;
    const gap = target.x - w.playerX;
    w.playerX = Math.min(w.width, Math.max(0, w.playerX + Math.sign(gap) * Math.min(Math.abs(gap), reach)));
  }
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
function keepInside(width: number, s: WorldShip): WorldShip {
  const lo = s.w / 2;
  const hi = width - s.w / 2;
  if (lo > hi) return { ...s, x: width / 2, vx: 0 };
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
      // the sample counts before anything this event triggers, so the children's speed already reflects it
      w.pace = observe(w.pace, ev.expectedChars, ev.destroyedAt - ev.lockAt);
      const accuracy = ev.expectedChars / (ev.expectedChars + ev.typos);
      w.score += Math.round(ev.expectedChars * 10 * accuracy);
      if (ship.kind === 'mothership') spawnChildren(w, ship);
      shipDone(w, ev.recordId, {}, { expectedChars: ev.expectedChars, activeMs: ev.destroyedAt - ev.lockAt });
    }
  }
  return finish(w);
}
