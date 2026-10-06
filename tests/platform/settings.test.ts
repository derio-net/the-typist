import { beforeEach, describe, expect, it } from 'vitest';
import { createSettings, DEFAULT_SETTINGS, SETTINGS_KEY } from '../../src/platform/settings';

function fakeStorage(): Storage {
  const m = new Map<string, string>();
  return {
    get length() { return m.size; },
    clear: () => m.clear(),
    getItem: (k) => m.get(k) ?? null,
    key: (i) => [...m.keys()][i] ?? null,
    removeItem: (k) => void m.delete(k),
    setItem: (k, v) => void m.set(k, v),
  };
}
const throwing = (): Storage =>
  new Proxy({} as Storage, { get: () => () => { throw new Error('blocked'); } });

let storage: Storage;
beforeEach(() => (storage = fakeStorage()));

describe('settings store (R5, R6, R7, R10)', () => {
  it('has the documented defaults', () => {
    expect(SETTINGS_KEY).toBe('typist.settings');
    expect(createSettings(storage).get()).toEqual({
      aids: { chip: true, translation: true, tts: true, recap: true },
      sfx: true,
      music: true,
      newCap: 10,
      voice: null,
    });
    expect(DEFAULT_SETTINGS.newCap).toBe(10);
  });

  it('round-trips through localStorage', () => {
    const a = createSettings(storage);
    a.set({ aids: { chip: false }, sfx: false, newCap: 20 });
    expect(JSON.parse(storage.getItem('typist.settings')!).newCap).toBe(20);
    const b = createSettings(storage).get();
    expect(b.aids).toEqual({ chip: false, translation: true, tts: true, recap: true });
    expect(b.sfx).toBe(false);
    expect(b.music).toBe(true);
    expect(b.newCap).toBe(20);
  });

  it('clamps newCap to 1-50', () => {
    const s = createSettings(storage);
    expect(s.set({ newCap: 0 }).newCap).toBe(1);
    expect(s.set({ newCap: 99 }).newCap).toBe(50);
    expect(s.set({ newCap: 7.6 }).newCap).toBe(8);
    expect(s.set({ newCap: NaN }).newCap).toBe(10);
  });

  it('falls back to defaults on corrupt JSON or wrong shapes', () => {
    storage.setItem('typist.settings', '{nope');
    expect(createSettings(storage).get()).toEqual(DEFAULT_SETTINGS);
    storage.setItem('typist.settings', JSON.stringify({ sfx: 'yes', newCap: 'x', aids: 5 }));
    expect(createSettings(storage).get()).toEqual(DEFAULT_SETTINGS);
  });

  it('works in memory and reports persistent: false when storage throws', () => {
    const s = createSettings(throwing());
    expect(s.persistent).toBe(false);
    expect(s.set({ sfx: false }).sfx).toBe(false);
    expect(s.get().sfx).toBe(false);
  });

  it('is persistent with working storage', () => {
    expect(createSettings(storage).persistent).toBe(true);
  });

  it('get returns a copy', () => {
    const s = createSettings(storage);
    s.get().aids.chip = false;
    expect(s.get().aids.chip).toBe(true);
  });

  it('voice defaults to null and merges a string or null, ignoring other types (R8)', () => {
    const a = createSettings(storage);
    expect(a.get().voice).toBeNull();
    a.set({ voice: 'u:anna' });
    expect(createSettings(storage).get().voice).toBe('u:anna');
    a.set({ voice: 42 as never });
    a.set({ voice: undefined });
    expect(a.get().voice).toBe('u:anna');
    storage.setItem(SETTINGS_KEY, JSON.stringify({ voice: { x: 1 } }));
    expect(createSettings(storage).get().voice).toBeNull();
    a.set({ voice: null });
    expect(a.get().voice).toBeNull();
    expect(createSettings(storage).get().voice).toBeNull();
  });
});
