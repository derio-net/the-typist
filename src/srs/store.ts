import type { Card } from 'ts-fsrs';
import type { RecordStats } from '../engine/world';

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

const cardKey = (listId: string, recordId: string) => `${listId}:${recordId}`;
const newKey = (listId: string, day: string) => `new:${listId}:${day}`;
const clone = <T>(v: T): T => structuredClone(v);

export function createMemoryStore(): CardStore {
  const cards = new Map<string, StoredCard>();
  const meta = new Map<string, number>();
  return {
    async get(l, r) {
      const v = cards.get(cardKey(l, r));
      return v && clone(v);
    },
    async put(l, r, stored) {
      cards.set(cardKey(l, r), clone(stored));
    },
    async all(l) {
      const out: Record<string, StoredCard> = {};
      const prefix = `${l}:`;
      for (const [k, v] of cards) if (k.startsWith(prefix)) out[k.slice(prefix.length)] = clone(v);
      return out;
    },
    async newCount(l, day) {
      return meta.get(newKey(l, day)) ?? 0;
    },
    async bumpNew(l, day) {
      meta.set(newKey(l, day), (meta.get(newKey(l, day)) ?? 0) + 1);
    },
  };
}

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
  const store = async (name: 'cards' | 'meta', mode: IDBTransactionMode) => {
    db ??= open(factory);
    return (await db).transaction(name, mode).objectStore(name);
  };
  const bump = async (key: string) => {
    // one readwrite transaction, so concurrent bumps cannot lose a count
    const s = await store('meta', 'readwrite');
    const n = ((await done(s.get(key))) as number | undefined) ?? 0;
    await done(s.put(n + 1, key));
  };
  return {
    async get(l, r) {
      return (await done((await store('cards', 'readonly')).get(cardKey(l, r)))) as StoredCard | undefined;
    },
    async put(l, r, stored) {
      await done((await store('cards', 'readwrite')).put(stored, cardKey(l, r)));
    },
    async all(l) {
      const s = await store('cards', 'readonly');
      const prefix = `${l}:`;
      const range = IDBKeyRange.bound(prefix, `${prefix}￿`);
      const [keys, values] = await Promise.all([done(s.getAllKeys(range)), done(s.getAll(range))]);
      const out: Record<string, StoredCard> = {};
      keys.forEach((k, i) => (out[String(k).slice(prefix.length)] = values[i] as StoredCard));
      return out;
    },
    async newCount(l, day) {
      return ((await done((await store('meta', 'readonly')).get(newKey(l, day)))) as number | undefined) ?? 0;
    },
    bumpNew: (l, day) => bump(newKey(l, day)),
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

/** IndexedDB when it works (checked with a write/read probe), else in-memory. */
export async function openStores(factory: IDBFactory | null = globalThis.indexedDB ?? null): Promise<Stores> {
  try {
    if (factory) {
      const idb = createIdbStore(factory);
      if (await idb.probe()) return { cards: idb, persistent: true };
    }
  } catch {
    // fall through to memory
  }
  return { cards: createMemoryStore(), persistent: false };
}
