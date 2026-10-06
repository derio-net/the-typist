import { createWorld, type RecordStats, type World, type WorldEvent, type WorldOptions } from '../engine/world';
import type { VocabRecord } from '../schema/record';
import { grade, type Grade } from '../srs/grade';
import { schedule } from '../srs/scheduler';
import { localDay, withGrade, type CardStore } from '../srs/store';

export type SessionMode = 'study' | 'free-play';

/** What the controller needs of the World between waves: the values that carry over. */
export type WorldState = Pick<World, 'lives' | 'score'>;

export interface Summary {
  mode: SessionMode;
  /** Records graded, by grade (escaped Records included). */
  counts: Record<Grade, number>;
  graded: number;
  /**
   * Right characters over typed characters, expected / (expected + typos), summed over the Records that did not
   * escape (an escaped Record's typing is cut short, so it would skew both rates); 1 when nothing was typed.
   */
  accuracy: number;
  /** Expected characters per second of active typing over the non-escaped Records that took time; 0 when none. */
  charsPerSecond: number;
  /** Store writes that failed: when above 0, progress is not being saved. */
  writeErrors: number;
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
  /** The first failed store write of the session: the UI shows the R10 "not saved" banner. */
  | { type: 'storage-error' }
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
  /** Resolves when every store write so far has landed, and the summary (when one is due) has been emitted. */
  flush(): Promise<void>;
  readonly ended: boolean;
  /** Store writes that failed so far. */
  readonly writeErrors: number;
}

export function createController(opts: ControllerOptions): Controller {
  const listeners = new Set<(e: SessionEvent) => void>();
  const emit = (e: SessionEvent) => listeners.forEach((l) => l(e));
  const counts: Record<Grade, number> = { Again: 0, Hard: 0, Good: 0, Easy: 0 };
  // rate inputs come from non-escaped Records only; chars/s also needs time on the clock
  const totals = { graded: 0, expectedChars: 0, typos: 0, timedChars: 0, activeMs: 0 };
  const gradedIds = new Set<string>();
  let wave = -1;
  let weak: string[] = [];
  let state: WorldState = { lives: opts.worldOptions?.lives ?? 3, score: opts.worldOptions?.score ?? 0 };
  let started = false;
  let ended = false;
  let writeErrors = 0;
  let queue: Promise<void> = Promise.resolve();

  const write = (recordId: string, g: Grade, stats: RecordStats, now: Date) => {
    queue = queue.then(async () => {
      try {
        const prev = await opts.store.get(opts.listId, recordId);
        await opts.store.putGraded(
          opts.listId, recordId, withGrade(prev, schedule(prev?.card, g, now), stats), localDay(now), !prev,
        );
      } catch {
        // a failed write must not stop later ones; it is counted and reported once
        writeErrors += 1;
        if (writeErrors === 1) emit({ type: 'storage-error' });
      }
    });
  };

  const onResolved = (recordId: string, stats: RecordStats) => {
    if (gradedIds.has(recordId)) return; // each Record is graded once per session
    gradedIds.add(recordId);
    const g = grade(stats);
    counts[g] += 1;
    totals.graded += 1;
    if (!stats.escaped) {
      totals.expectedChars += stats.expectedChars;
      totals.typos += stats.typos;
      if (stats.activeMs > 0) {
        totals.timedChars += stats.expectedChars;
        totals.activeMs += stats.activeMs;
      }
    }
    if (g === 'Again' || g === 'Hard') weak.push(recordId);
    write(recordId, g, stats, opts.now());
  };

  /** Ends the session; the summary follows once every grade has been written. */
  const finish = (reason: Summary['reason']) => {
    ended = true;
    queue = queue.then(() => {
      const typed = totals.expectedChars + totals.typos;
      emit({
        type: 'summary',
        summary: {
          mode: opts.mode,
          counts: { ...counts },
          graded: totals.graded,
          accuracy: typed === 0 ? 1 : totals.expectedChars / typed,
          charsPerSecond: totals.activeMs > 0 ? totals.timedChars / (totals.activeMs / 1000) : 0,
          writeErrors,
          score: state.score,
          lives: state.lives,
          reason,
        },
      });
    });
  };

  const makeWorld = () =>
    createWorld(opts.waves[wave], { ...opts.worldOptions, wave, lives: state.lives, score: state.score });

  return {
    start() {
      if (started || ended) throw new Error('session already started');
      if (opts.waves.length === 0) throw new Error('session has no waves');
      started = true;
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
    get writeErrors() {
      return writeErrors;
    },
  };
}
