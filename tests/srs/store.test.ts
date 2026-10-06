import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { createEmptyCard } from 'ts-fsrs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createIdbStore, createMemoryStore, localDay, openStores, withGrade, type CardStore } from '../../src/srs/store';

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
});

describe('openStores', () => {
  afterEach(() => vi.restoreAllMocks());

  it('is persistent when IndexedDB works', async () => {
    const s = await openStores(new IDBFactory());
    expect(s.persistent).toBe(true);
  });
  it('falls back to memory when indexedDB.open throws', async () => {
    const factory = { open: () => { throw new Error('denied'); } } as unknown as IDBFactory;
    const s = await openStores(factory);
    expect(s.persistent).toBe(false);
    await s.cards.bumpNew('L', 'd');
    expect(await s.cards.newCount('L', 'd')).toBe(1);
  });
  it('falls back to memory when the probe write fails', async () => {
    vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(() => { throw new Error('quota'); });
    expect((await openStores(new IDBFactory())).persistent).toBe(false);
  });
  it('falls back to memory when the probe reads back something else', async () => {
    vi.spyOn(IDBObjectStore.prototype, 'get').mockImplementation(() => {
      const req = { result: undefined } as IDBRequest;
      queueMicrotask(() => (req.onsuccess as () => void)());
      return req;
    });
    expect((await openStores(new IDBFactory())).persistent).toBe(false);
  });
  it('is not persistent without IndexedDB', async () => {
    expect((await openStores(null)).persistent).toBe(false);
  });
});

describe('localDay', () => {
  it('formats the local calendar day', () => {
    expect(localDay(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
    expect(localDay(new Date(2026, 11, 31, 0, 1))).toBe('2026-12-31');
  });
});
