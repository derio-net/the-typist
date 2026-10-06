import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { createEmptyCard } from 'ts-fsrs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { parseProgress, serializeProgress } from '../../src/srs/portable';
import { createIdbStore, createMemoryStore, localDay, openStores, withGrade, type CardStore, type StoredCard } from '../../src/srs/store';

const now = new Date('2026-10-06T10:00:00Z');
const stats = (p = {}) => ({ typos: 0, expectedChars: 10, activeMs: 1000, escaped: false, ...p });

const impls: [string, () => CardStore][] = [
  ['memory', () => createMemoryStore()],
  ['idb', () => createIdbStore(new IDBFactory())],
];

describe.each(impls)('CardStore contract: %s', (_n, make) => {
  it('get is undefined for an unknown card; put then get round-trips', async () => {
    const s = make();
    expect(await s.get('L', 'a')).toBeUndefined();
    const stored = withGrade(undefined, createEmptyCard(now), stats());
    await s.put('L', 'a', stored);
    expect(await s.get('L', 'a')).toEqual(stored);
  });
  it('all(listId) returns only that list, by record id', async () => {
    const s = make();
    const c = withGrade(undefined, createEmptyCard(now), stats());
    await s.put('L', 'a', c);
    await s.put('L', 'b', c);
    await s.put('LL', 'c', c);
    expect(Object.keys(await s.all('L')).sort()).toEqual(['a', 'b']);
  });
  it('counters: seen +1 per grade, typos summed, escapes counted', async () => {
    const s = make();
    let cur = await s.get('L', 'a');
    for (const st of [stats({ typos: 2 }), stats({ typos: 1, escaped: true }), stats()]) {
      cur = withGrade(cur, createEmptyCard(now), st);
      await s.put('L', 'a', cur);
    }
    const got = await s.get('L', 'a');
    expect([got?.seen, got?.typos, got?.escapes]).toEqual([3, 3, 1]);
  });
  it('keys with colons do not collide and all() is exact per list', async () => {
    const s = make();
    const one = withGrade(undefined, createEmptyCard(now), stats());
    const two = withGrade(one, createEmptyCard(now), stats({ typos: 3 }));
    await s.put('a', 'b:c', one);
    await s.put('a:b', 'c', two);
    expect((await s.get('a', 'b:c'))?.seen).toBe(1);
    expect((await s.get('a:b', 'c'))?.seen).toBe(2);
    expect(Object.keys(await s.all('a'))).toEqual(['b:c']);
    expect(Object.keys(await s.all('a:b'))).toEqual(['c']);
    await s.bumpNew('a', 'b:2026-10-06');
    expect(await s.newCount('a:b', '2026-10-06')).toBe(0);
  });
  it('putGraded writes the card and bumps the day count together, only when new', async () => {
    const s = make();
    const st = withGrade(undefined, createEmptyCard(now), stats());
    await s.putGraded('L', 'a', st, '2026-10-06', true);
    await s.putGraded('L', 'a', st, '2026-10-06', false);
    expect(await s.get('L', 'a')).toEqual(st);
    expect(await s.newCount('L', '2026-10-06')).toBe(1);
  });
  it('new counts are per list and day', async () => {
    const s = make();
    expect(await s.newCount('L', '2026-10-06')).toBe(0);
    await s.bumpNew('L', '2026-10-06');
    await s.bumpNew('L', '2026-10-06');
    await s.bumpNew('L', '2026-10-07');
    expect(await s.newCount('L', '2026-10-06')).toBe(2);
    expect(await s.newCount('L', '2026-10-07')).toBe(1);
    expect(await s.newCount('M', '2026-10-06')).toBe(0);
  });

  describe('exportAll / importAll (R10)', () => {
    const graded = (reviewed?: string, seen = 1): StoredCard => {
      const c = createEmptyCard(now);
      if (reviewed) c.last_review = new Date(reviewed);
      return { card: c, seen, typos: 0, escapes: 0 };
    };

    it('exportAll returns every list\'s cards and the new counts, and nothing else', async () => {
      const s = make();
      const a = graded('2026-10-01T00:00:00Z');
      await s.put('L', 'a', a);
      await s.put('M', 'b', graded());
      await s.bumpNew('L', '2026-10-06');
      await s.bumpNew('L', '2026-10-06');
      await s.bumpNew('M', '2026-10-05');
      const out = await s.exportAll();
      const key = (c: { listId: string; recordId: string }) => `${c.listId}/${c.recordId}`;
      expect(out.cards.map(key).sort()).toEqual(['L/a', 'M/b']);
      expect(out.cards.find((c) => c.recordId === 'a')?.stored).toEqual(a);
      expect([...out.newCounts].sort((x, y) => x.listId.localeCompare(y.listId))).toEqual([
        { listId: 'L', day: '2026-10-06', count: 2 },
        { listId: 'M', day: '2026-10-05', count: 1 },
      ]);
    });

    it('importAll applies the merge rules and reports imported and replaced counts', async () => {
      const s = make();
      const older = graded('2026-10-01T00:00:00Z', 1);
      const newer = graded('2026-10-03T00:00:00Z', 5);
      await s.put('L', 'older', older);
      await s.put('L', 'newer', newer);
      await s.put('L', 'tie', graded('2026-10-02T00:00:00Z', 7));
      await s.bumpNew('L', 'd1');
      await s.bumpNew('L', 'd1');
      await s.bumpNew('L', 'd1');
      const incoming = graded('2026-10-02T00:00:00Z', 9);
      const rep = await s.importAll({
        cards: [
          { listId: 'L', recordId: 'older', stored: incoming },
          { listId: 'L', recordId: 'newer', stored: incoming },
          { listId: 'L', recordId: 'tie', stored: incoming },
          { listId: 'L', recordId: 'fresh', stored: incoming },
        ],
        newCounts: [
          { listId: 'L', day: 'd1', count: 1 },
          { listId: 'L', day: 'd2', count: 4 },
        ],
      });
      expect(rep).toEqual({ imported: 2, replaced: 1 });
      expect((await s.get('L', 'older'))?.seen).toBe(9);
      expect((await s.get('L', 'newer'))?.seen).toBe(5);
      expect((await s.get('L', 'tie'))?.seen).toBe(7);
      expect((await s.get('L', 'fresh'))?.seen).toBe(9);
      expect(await s.newCount('L', 'd1')).toBe(3);
      expect(await s.newCount('L', 'd2')).toBe(4);
    });

    it('a larger imported count wins', async () => {
      const s = make();
      await s.bumpNew('L', 'd1');
      await s.importAll({ cards: [], newCounts: [{ listId: 'L', day: 'd1', count: 6 }] });
      expect(await s.newCount('L', 'd1')).toBe(6);
    });

    it('a failure mid-import leaves nothing written (one transaction)', async () => {
      const s = make();
      const local = graded('2026-10-01T00:00:00Z', 2);
      await s.put('L', 'a', local);
      await s.bumpNew('L', 'd1');
      const poison = { ...graded('2026-10-05T00:00:00Z'), boom: () => 1 } as unknown as StoredCard; // not cloneable
      await expect(
        s.importAll({
          cards: [
            { listId: 'L', recordId: 'a', stored: graded('2026-10-04T00:00:00Z', 8) },
            { listId: 'L', recordId: 'new1', stored: graded() },
            { listId: 'L', recordId: 'bad', stored: poison },
          ],
          newCounts: [{ listId: 'L', day: 'd1', count: 9 }],
        }),
      ).rejects.toBeDefined();
      expect(await s.get('L', 'a')).toEqual(local);
      expect(await s.get('L', 'new1')).toBeUndefined();
      expect(await s.newCount('L', 'd1')).toBe(1);
    });

    it('a file with duplicate entries imports identically in every store (p3-r4)', async () => {
      const s = make();
      const e = (seen: number, reviewed: string) => ({ listId: 'L', recordId: 'a', stored: graded(reviewed, seen) });
      const text = JSON.stringify({
        ...JSON.parse(serializeProgress({ cards: [], newCounts: [] }, now)),
        cards: [e(1, '2026-10-01T00:00:00.000Z'), e(2, '2026-10-03T00:00:00.000Z'), e(3, '2026-10-02T00:00:00.000Z')].map((c) =>
          JSON.parse(serializeProgress({ cards: [c], newCounts: [] }, now)).cards[0]),
        newCounts: [{ listId: 'L', day: 'd', count: 2 }, { listId: 'L', day: 'd', count: 4 }],
      });
      const parsed = parseProgress(text, now);
      if (!parsed.ok) throw new Error(parsed.reason);
      expect(await s.importAll(parsed.data)).toEqual({ imported: 1, replaced: 0 });
      expect((await s.get('L', 'a'))?.seen).toBe(2);
      expect(await s.newCount('L', 'd')).toBe(4);
    });

    it('export then import into another store reproduces the cards', async () => {
      const a = make();
      const b = make();
      await a.put('L', 'x', graded('2026-10-02T00:00:00Z', 4));
      await a.bumpNew('L', 'd1');
      await b.importAll(await a.exportAll());
      expect(await b.get('L', 'x')).toEqual(await a.get('L', 'x'));
      expect(await b.newCount('L', 'd1')).toBe(1);
    });
  });
});

describe('idb importAll reads existing cards in bulk (p3-r3)', () => {
  it('does not issue one get per card', async () => {
    const s = createIdbStore(new IDBFactory());
    const c = withGrade(undefined, createEmptyCard(now), stats());
    await s.put('L', 'old', c);
    const spy = vi.spyOn(IDBObjectStore.prototype, 'get');
    const cards = Array.from({ length: 200 }, (_x, i) => ({ listId: 'L', recordId: `r${i}`, stored: c }));
    const rep = await s.importAll({ cards, newCounts: [{ listId: 'L', day: 'd', count: 1 }, { listId: 'L', day: 'e', count: 1 }] });
    expect(rep.imported).toBe(200);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
    expect(Object.keys(await s.all('L')).length).toBe(201);
  });
});

describe('idb exportAll', () => {
  it('ignores meta keys that are not new-card counts', async () => {
    const factory = new IDBFactory();
    const s = createIdbStore(factory);
    await s.bumpNew('L', 'd1');
    const db = await new Promise<IDBDatabase>((res) => {
      const r = factory.open('typist');
      r.onsuccess = () => res(r.result);
    });
    await new Promise<void>((res) => {
      const tx = db.transaction('meta', 'readwrite');
      tx.objectStore('meta').put('stray', 'zzz');
      tx.objectStore('meta').put('stray', 'aaa');
      tx.oncomplete = () => res();
    });
    expect((await s.exportAll()).newCounts).toEqual([{ listId: 'L', day: 'd1', count: 1 }]);
  });
});

describe('openStores', () => {
  afterEach(() => vi.restoreAllMocks());

  it('is persistent when IndexedDB works', async () => {
    expect((await openStores({ factory: new IDBFactory() })).persistent).toBe(true);
  });
  it('falls back to memory when indexedDB.open throws', async () => {
    const factory = { open: () => { throw new Error('denied'); } } as unknown as IDBFactory;
    const s = await openStores({ factory });
    expect(s.persistent).toBe(false);
    await s.cards.bumpNew('L', 'd');
    expect(await s.cards.newCount('L', 'd')).toBe(1);
  });
  it('falls back to memory when open never settles (timeout)', async () => {
    const factory = { open: () => ({}) } as unknown as IDBFactory;
    const s = await openStores({ factory, timeoutMs: 20 });
    expect(s.persistent).toBe(false);
  });
  it('falls back to memory when the open request errors asynchronously', async () => {
    const factory = {
      open: () => {
        const req = {} as IDBOpenDBRequest;
        setTimeout(() => (req.onerror as () => void)(), 0);
        return req;
      },
    } as unknown as IDBFactory;
    expect((await openStores({ factory, timeoutMs: 1000 })).persistent).toBe(false);
  });
  it('falls back to memory when the probe write fails', async () => {
    vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(() => { throw new Error('quota'); });
    expect((await openStores({ factory: new IDBFactory() })).persistent).toBe(false);
  });
  it('falls back to memory when the probe reads back something else', async () => {
    vi.spyOn(IDBObjectStore.prototype, 'get').mockImplementation(() => {
      const req = { result: undefined } as IDBRequest;
      queueMicrotask(() => (req.onsuccess as () => void)());
      return req;
    });
    expect((await openStores({ factory: new IDBFactory() })).persistent).toBe(false);
  });
  it('is not persistent without IndexedDB', async () => {
    expect((await openStores({ factory: null })).persistent).toBe(false);
  });
  it('falls back to memory when reading globalThis.indexedDB throws', async () => {
    vi.spyOn(globalThis, 'indexedDB', 'get').mockImplementation(() => { throw new Error('SecurityError'); });
    expect((await openStores()).persistent).toBe(false);
  });
});

describe('localDay', () => {
  it('formats the local calendar day', () => {
    expect(localDay(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
    expect(localDay(new Date(2026, 11, 31, 0, 1))).toBe('2026-12-31');
  });
});
