import { displayForm, formsText } from '../schema/display';
import { RECOGNISED_TAGS, type VocabRecord } from '../schema/record';
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
  baseSpeed: 34,
  speedPerWave: 0.2,
  /** Texts up to this many characters descend at full speed; longer ones in proportion. */
  referenceLength: 12,
  /** Rough glyph width used only to keep escorts on screen. */
  charWidth: 9,
} as const;

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
  /** Gloss, shown under motherships. */
  label?: string;
  /** English translation and grammar chip, for escorts. */
  translation?: string;
  chip?: string;
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
  /** Events produced by the last `tick` / `typeChar`. */
  events: WorldEvent[];
}

export interface WorldOptions {
  wave?: number;
  lives?: number;
}

export function shipSpeed(length: number, wave: number): number {
  const factor = Math.max(1, length / WORLD.referenceLength);
  return (WORLD.baseSpeed * (1 + WORLD.speedPerWave * wave)) / factor;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function makeShip(
  id: string, recordId: string, kind: ShipKind, text: string, x: number, y: number, wave: number,
  extra: Partial<WorldShip> = {},
): WorldShip {
  return { id, recordId, kind, text, x, y, speed: shipSpeed(text.length, wave), ...extra };
}

/** A new wave: every record's mothership is on screen, in staggered lanes. */
export function createWorld(records: VocabRecord[], opts: WorldOptions = {}): World {
  const wave = opts.wave ?? 0;
  const n = records.length;
  const ships = records.map((r, i) =>
    makeShip(`${r.id}:m`, r.id, 'mothership', displayForm(r), ((i + 1) / (n + 1)) * WORLD.width, 40 + (i % 3) * 45, wave, {
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

function spawnChildren(w: Draft, m: WorldShip) {
  const record = w.records[m.recordId].record;
  const forms = formsText(record);
  if (forms !== null) spawn(w, makeShip(`${record.id}:f`, record.id, 'forms', forms, m.x, m.y, w.wave));
  (record.examples ?? []).forEach((e, k) => {
    const half = (e.de.length * WORLD.charWidth) / 2 + 10;
    const side = k % 2 === 0 ? -1 : 1;
    const x = clamp(m.x + side * 150, half, WORLD.width - half);
    const y = clamp(m.y - 10 + k * 52, 30, WORLD.playerY - 60);
    const chip = e.tags.filter((t) => (RECOGNISED_TAGS as readonly string[]).includes(t)).join(', ');
    spawn(w, makeShip(`${record.id}:e${k}`, record.id, 'escort', e.de, x, y, w.wave, {
      translation: e.en,
      ...(chip ? { chip } : {}),
    }));
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
  w.ships = w.ships.map((s) => ({ ...s, y: s.y + s.speed * dt }));
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

/** Runs as many whole 60 Hz steps as `elapsedMs` allows, carrying the remainder. */
export function advance(world: World, elapsedMs: number): World {
  let w = world;
  let acc = w.acc + elapsedMs;
  while (acc >= STEP_MS - 1e-9 && w.status === 'playing') {
    w = tick(w);
    acc -= STEP_MS;
  }
  return { ...w, acc, events: w === world ? [] : w.events };
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
