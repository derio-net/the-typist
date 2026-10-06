import { createWorld, type RecordStats, type World, type WorldEvent, type WorldOptions } from '../engine/world';
import type { VocabRecord } from '../schema/record';
import { grade, type Grade } from '../srs/grade';
import { schedule } from '../srs/scheduler';
import { localDay, withGrade, type CardStore } from '../srs/store';

export type SessionMode = 'study' | 'free-play';

/** What the controller needs of the World between waves: the values that carry over. */
export type WorldState = Pick<World, 'lives' | 'score'>;

export interface Summary {
  /** Records graded, by grade. */
  counts: Record<Grade, number>;
  graded: number;
  /** Typed characters that were right: expected / (expected + typos); 1 when nothing was typed. */
  accuracy: number;
  /** Expected characters per second of active typing; 0 when nothing was typed. */
  charsPerSecond: number;
  score: number;
  lives: number;
  /** How the session ended. */
  reason: 'finished' | 'game-over' | 'quit';
}

export type SessionEvent =
  | {
      type: 'between-wave';
      /** Zero-based index of the wave just finished. */
      wave: number;
      /** Ids of this wave's Records graded Again or Hard (for the recap cards). */
      weak: string[];
      /** Whether another wave follows. */
      more: boolean;
      lives: number;
      score: number;
    }
  | { type: 'summary'; summary: Summary };

export interface ControllerOptions {
  waves: VocabRecord[][];
  store: CardStore;
  listId: string;
  mode: SessionMode;
  /** Passed to every `createWorld`; `wave`, `lives` and `score` are managed here (`lives` seeds the first wave). */
  worldOptions?: WorldOptions;
  now: () => Date;
}

export interface Controller {
  /** Creates the first wave's World. */
  start(): World;
  /** Grades `resolved`, and reacts to `wave-complete` and `game-over`. `state` is the World's lives and score. */
  onWorldEvents(events: readonly WorldEvent[], state: WorldState): void;
  /** After a between-wave panel: the next wave's World (lives and score carried), or the summary when none is left. */
  nextWave(): World | undefined;
  /** Ends the session; on-screen Records stay ungraded. */
  quit(state?: WorldState): void;
  subscribe(listener: (e: SessionEvent) => void): () => void;
  /** Resolves when every store write so far has landed. */
  flush(): Promise<void>;
  readonly ended: boolean;
}

export function createController(opts: ControllerOptions): Controller {
  const listeners = new Set<(e: SessionEvent) => void>();
  const emit = (e: SessionEvent) => listeners.forEach((l) => l(e));
  const counts: Record<Grade, number> = { Again: 0, Hard: 0, Good: 0, Easy: 0 };
  const totals = { graded: 0, expectedChars: 0, typos: 0, activeMs: 0 };
  let wave = -1;
  let weak: string[] = [];
  let state: WorldState = { lives: opts.worldOptions?.lives ?? 3, score: opts.worldOptions?.score ?? 0 };
  let ended = false;
  let queue: Promise<void> = Promise.resolve();

  const write = (recordId: string, g: Grade, stats: RecordStats) => {
    queue = queue
      .then(async () => {
        const now = opts.now();
        const prev = await opts.store.get(opts.listId, recordId);
        await opts.store.put(opts.listId, recordId, withGrade(prev, schedule(prev?.card, g, now), stats));
        if (!prev) await opts.store.bumpNew(opts.listId, localDay(now));
      })
      .catch(() => undefined); // a failed write must not stop later ones; the session keeps playing
  };

  const onResolved = (recordId: string, stats: RecordStats) => {
    const g = grade(stats);
    counts[g] += 1;
    totals.graded += 1;
    totals.expectedChars += stats.expectedChars;
    totals.typos += stats.typos;
    totals.activeMs += stats.activeMs;
    if (g === 'Again' || g === 'Hard') weak.push(recordId);
    write(recordId, g, stats);
  };

  const finish = (reason: Summary['reason']) => {
    ended = true;
    const typed = totals.expectedChars + totals.typos;
    emit({
      type: 'summary',
      summary: {
        counts: { ...counts },
        graded: totals.graded,
        accuracy: typed === 0 ? 1 : totals.expectedChars / typed,
        charsPerSecond: totals.activeMs > 0 ? totals.expectedChars / (totals.activeMs / 1000) : 0,
        score: state.score,
        lives: state.lives,
        reason,
      },
    });
  };

  const makeWorld = () =>
    createWorld(opts.waves[wave], { ...opts.worldOptions, wave, lives: state.lives, score: state.score });

  return {
    start() {
      wave = 0;
      weak = [];
      return makeWorld();
    },
    onWorldEvents(events, next) {
      if (ended) return;
      state = { lives: next.lives, score: next.score };
      for (const e of events) {
        if (e.type === 'resolved') onResolved(e.recordId, e.stats);
        else if (e.type === 'wave-complete') {
          emit({ type: 'between-wave', wave, weak, more: wave + 1 < opts.waves.length, ...state });
        } else if (e.type === 'game-over') {
          finish('game-over');
          return;
        }
      }
    },
    nextWave() {
      if (ended) return undefined;
      if (wave + 1 >= opts.waves.length) {
        finish('finished');
        return undefined;
      }
      wave += 1;
      weak = [];
      return makeWorld();
    },
    quit(next) {
      if (ended) return;
      if (next) state = { lives: next.lives, score: next.score };
      finish('quit');
    },
    subscribe(l) {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    flush: () => queue,
    get ended() {
      return ended;
    },
  };
}
