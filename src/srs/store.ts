import type { Card } from 'ts-fsrs';
import type { RecordStats } from '../engine/world';
import { mergeCard, mergeCount, type ImportReport, type ProgressData } from './portable';

/** A Record's FSRS card plus lifetime counters. */
export interface StoredCard {
  card: Card;
  /** Grades received. */
  seen: number;
  /** Typos, summed over all grades. */
  typos: number;
  /** Grades whose stats had `escaped`. */
  escapes: number;
}

/** The card after one more grade: counters advance, the card is replaced. */
export function withGrade(prev: StoredCard | undefined, card: Card, stats: RecordStats): StoredCard {
  return {
    card,
    seen: (prev?.seen ?? 0) + 1,
    typos: (prev?.typos ?? 0) + stats.typos,
    escapes: (prev?.escapes ?? 0) + (stats.escaped ? 1 : 0),
  };
}

export interface CardStore {
  get(listId: string, recordId: string): Promise<StoredCard | undefined>;
  put(listId: string, recordId: string, stored: StoredCard): Promise<void>;
  /** Every stored card of a list, by Record id. */
  all(listId: string): Promise<Record<string, StoredCard>>;
  /** Records first graded on `day` (local yyyy-mm-dd). */
  newCount(listId: string, day: string): Promise<number>;
  bumpNew(listId: string, day: string): Promise<void>;
  /** Writes the card and, when `isNew`, bumps the day's new count, atomically (one transaction). */
  putGraded(listId: string, recordId: string, stored: StoredCard, day: string, isNew: boolean): Promise<void>;
  /** Every list's cards and the daily new-card counts (the typing-rate estimate lives elsewhere). */
  exportAll(): Promise<ProgressData>;
  /** Merges `data` in atomically: all of it is written, or none. The caller validates the data first. */
  importAll(data: ProgressData): Promise<ImportReport>;
}

export interface Stores {
  cards: CardStore;
  /** False when progress will not survive a reload. */
  persistent: boolean;
}

/** Local calendar day, yyyy-mm-dd. */
export function localDay(now: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
}

// Array keys (IndexedDB-native; JSON-encoded in memory), so ids containing ':' cannot collide.
const cardKey = (listId: string, recordId: string): [string, string] => [listId, recordId];
const newKey = (listId: string, day: string): [string, string, string] => ['new', listId, day];
const clone = <T>(v: T): T => structuredClone(v);

export function createMemoryStore(): CardStore {
  const cards = new Map<string, { listId: string; recordId: string; value: StoredCard }>();
  const meta = new Map<string, number>();
  const id = (k: unknown[]) => JSON.stringify(k);
  const put = (l: string, r: string, v: StoredCard) => cards.set(id(cardKey(l, r)), { listId: l, recordId: r, value: clone(v) });
  const bump = (l: string, day: string) => meta.set(id(newKey(l, day)), (meta.get(id(newKey(l, day))) ?? 0) + 1);
  return {
    async get(l, r) {
      const v = cards.get(id(cardKey(l, r)));
      return v && clone(v.value);
    },
    async put(l, r, stored) {
      put(l, r, stored);
    },
    async all(l) {
      const out: Record<string, StoredCard> = {};
      for (const e of cards.values()) if (e.listId === l) out[e.recordId] = clone(e.value);
      return out;
    },
    async newCount(l, day) {
      return meta.get(id(newKey(l, day))) ?? 0;
    },
    async bumpNew(l, day) {
      bump(l, day);
    },
    async putGraded(l, r, stored, day, isNew) {
      put(l, r, stored);
      if (isNew) bump(l, day);
    },
    async exportAll() {
      const newCounts: ProgressData['newCounts'] = [];
      for (const [k, count] of meta) {
        const [, listId, day] = JSON.parse(k) as [string, string, string];
        newCounts.push({ listId, day, count });
      }
      return { cards: [...cards.values()].map((e) => ({ listId: e.listId, recordId: e.recordId, stored: clone(e.value) })), newCounts };
    },
    async importAll(data) {
      // decide and clone everything first, so a failure part-way leaves the maps untouched
      const writes: [string, { listId: string; recordId: string; value: StoredCard }][] = [];
      let replaced = 0;
      for (const { listId, recordId, stored } of data.cards) {
        const k = id(cardKey(listId, recordId));
        const local = cards.get(k)?.value;
        if (mergeCard(local, stored) !== 'import') continue;
        if (local) replaced++;
        writes.push([k, { listId, recordId, value: clone(stored) }]);
      }
      const counts: [string, number][] = data.newCounts.map((c) => {
        const k = id(newKey(c.listId, c.day));
        return [k, mergeCount(meta.get(k) ?? 0, c.count)];
      });
      for (const [k, v] of writes) cards.set(k, v);
      for (const [k, v] of counts) meta.set(k, v);
      return { imported: writes.length, replaced };
    },
  };
}

// ['new', list, day] keys only: every other meta key is a string
const NEW_RANGE = () => IDBKeyRange.bound(['new'], ['new', []]);
const DB_NAME = 'typist';
const DB_VERSION = 1;

export interface IdbStore extends CardStore {
  /** Writes then reads a throwaway meta key; false when either fails. */
  probe(): Promise<boolean>;
}

const done = <T>(req: IDBRequest<T>): Promise<T> =>
  new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

function open(factory: IDBFactory): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = factory.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      req.result.createObjectStore('cards');
      req.result.createObjectStore('meta');
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error('indexedDB open blocked'));
  });
}

export function createIdbStore(factory: IDBFactory = indexedDB): IdbStore {
  let db: Promise<IDBDatabase> | undefined;
  const database = () => (db ??= open(factory));
  const store = async (name: 'cards' | 'meta', mode: IDBTransactionMode) =>
    (await database()).transaction(name, mode).objectStore(name);
  return {
    async get(l, r) {
      return (await done((await store('cards', 'readonly')).get(cardKey(l, r)))) as StoredCard | undefined;
    },
    async put(l, r, stored) {
      await done((await store('cards', 'readwrite')).put(stored, cardKey(l, r)));
    },
    async all(l) {
      const s = await store('cards', 'readonly');
      // [l] < [l, anything] < [l, []]: every key of exactly this list, and no other
      const range = IDBKeyRange.bound([l], [l, []]);
      const [keys, values] = await Promise.all([done(s.getAllKeys(range)), done(s.getAll(range))]);
      const out: Record<string, StoredCard> = {};
      keys.forEach((k, i) => (out[(k as string[])[1]] = values[i] as StoredCard));
      return out;
    },
    async newCount(l, day) {
      return ((await done((await store('meta', 'readonly')).get(newKey(l, day)))) as number | undefined) ?? 0;
    },
    async bumpNew(l, day) {
      const s = await store('meta', 'readwrite');
      const n = ((await done(s.get(newKey(l, day)))) as number | undefined) ?? 0;
      await done(s.put(n + 1, newKey(l, day)));
    },
    async putGraded(l, r, stored, day, isNew) {
      const tx = (await database()).transaction(['cards', 'meta'], 'readwrite');
      const finished = new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error ?? new Error('transaction aborted'));
      });
      tx.objectStore('cards').put(stored, cardKey(l, r));
      if (isNew) {
        const meta = tx.objectStore('meta');
        const n = ((await done(meta.get(newKey(l, day)))) as number | undefined) ?? 0;
        meta.put(n + 1, newKey(l, day));
      }
      await finished;
    },
    async exportAll() {
      const db = await database();
      const tx = db.transaction(['cards', 'meta'], 'readonly');
      const each = (req: IDBRequest<IDBCursorWithValue | null>, f: (c: IDBCursorWithValue) => void) =>
        new Promise<void>((resolve, reject) => {
          req.onsuccess = () => {
            const c = req.result;
            if (!c) return resolve();
            f(c);
            c.continue();
          };
          req.onerror = () => reject(req.error);
        });
      const out: ProgressData = { cards: [], newCounts: [] };
      await Promise.all([
        each(tx.objectStore('cards').openCursor(), (c) => {
          const [listId, recordId] = c.key as [string, string];
          out.cards.push({ listId, recordId, stored: c.value as StoredCard });
        }),
        // ['new', list, day] keys only: every other meta key is a string
        each(tx.objectStore('meta').openCursor(NEW_RANGE()), (c) => {
          const [, listId, day] = c.key as [string, string, string];
          out.newCounts.push({ listId, day, count: c.value as number });
        }),
      ]);
      return out;
    },
    async importAll(data) {
      const tx = (await database()).transaction(['cards', 'meta'], 'readwrite');
      const finished = new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error ?? new Error('transaction aborted'));
      });
      let imported = 0;
      let replaced = 0;
      try {
        // inside the transaction, only IndexedDB requests are awaited: anything else would let it auto-commit early
        const cards = tx.objectStore('cards');
        const meta = tx.objectStore('meta');
        // two bulk reads, not a get per card: 100k cards would otherwise take half a minute
        const [cardKeys, cardValues, countKeys, countValues] = await Promise.all([
          done(cards.getAllKeys()),
          done(cards.getAll()),
          done(meta.getAllKeys(NEW_RANGE())),
          done(meta.getAll(NEW_RANGE())),
        ]);
        const id = (k: unknown) => JSON.stringify(k);
        const existing = new Map(cardKeys.map((k, i) => [id(k), cardValues[i] as StoredCard]));
        const counts = new Map(countKeys.map((k, i) => [id(k), countValues[i] as number]));
        for (const { listId, recordId, stored } of data.cards) {
          const local = existing.get(id(cardKey(listId, recordId)));
          if (mergeCard(local, stored) !== 'import') continue;
          cards.put(stored, cardKey(listId, recordId));
          imported++;
          if (local) replaced++;
        }
        for (const { listId, day, count } of data.newCounts) {
          meta.put(mergeCount(counts.get(id(newKey(listId, day))) ?? 0, count), newKey(listId, day));
        }
      } catch (e) {
        finished.catch(() => undefined);
        try {
          tx.abort();
        } catch {
          /* already finished */
        }
        throw e;
      }
      await finished;
      return { imported, replaced };
    },
    async probe() {
      try {
        const s = await store('meta', 'readwrite');
        await done(s.put('ok', 'probe'));
        const back = await done((await store('meta', 'readonly')).get('probe'));
        await done((await store('meta', 'readwrite')).delete('probe'));
        return back === 'ok';
      } catch {
        return false;
      }
    },
  };
}

export interface OpenOptions {
  /** The IndexedDB factory; `null` means none. Defaults to `globalThis.indexedDB`, read lazily. */
  factory?: IDBFactory | null;
  /** Give up on IndexedDB after this long (a blocked or hung open never settles). */
  timeoutMs?: number;
}

/** IndexedDB when it works (checked with a write/read probe, within a timeout), else in-memory. */
export async function openStores(opts: OpenOptions = {}): Promise<Stores> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const factory = 'factory' in opts ? opts.factory : globalThis.indexedDB;
    if (factory) {
      const idb = createIdbStore(factory);
      const timeout = new Promise<false>((resolve) => {
        timer = setTimeout(() => resolve(false), opts.timeoutMs ?? 2000);
      });
      if (await Promise.race([idb.probe(), timeout])) return { cards: idb, persistent: true };
    }
  } catch {
    // fall through to memory
  } finally {
    clearTimeout(timer);
  }
  return { cards: createMemoryStore(), persistent: false };
}
