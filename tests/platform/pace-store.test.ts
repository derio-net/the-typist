import { describe, expect, it } from 'vitest';
import { loadPace, PACE_KEY, savePace } from '../../src/platform/pace-store';

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
const throwing = (): Storage => new Proxy({} as Storage, { get: () => () => { throw new Error('blocked'); } });

describe('pace store (R5)', () => {
  it('saves under typist.pace and loads it back', () => {
    const s = fakeStorage();
    savePace({ spc: 0.31, chars: 120 }, s);
    expect(PACE_KEY).toBe('typist.pace');
    expect(JSON.parse(s.getItem('typist.pace')!)).toEqual({ spc: 0.31, chars: 120 });
    expect(loadPace(s)).toEqual({ spc: 0.31, chars: 120 });
  });

  it.each([
    ['nothing saved', null],
    ['corrupt JSON', '{nope'],
    ['wrong types', '{"spc":"fast","chars":3}'],
    ['missing field', '{"spc":0.3}'],
    ['not an object', '42'],
    ['non-positive spc', '{"spc":0,"chars":3}'],
    ['negative chars', '{"spc":0.3,"chars":-1}'],
  ])('%s gives undefined (a fresh calibration)', (_n, text) => {
    const s = fakeStorage();
    if (text !== null) s.setItem(PACE_KEY, text);
    expect(loadPace(s)).toBeUndefined();
  });

  it('a throwing storage is tolerated on load and save', () => {
    expect(loadPace(throwing())).toBeUndefined();
    expect(() => savePace({ spc: 0.3, chars: 1 }, throwing())).not.toThrow();
  });
});
