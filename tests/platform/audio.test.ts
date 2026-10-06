import { describe, expect, it, vi } from 'vitest';
import { createAudio, EFFECT_NAMES } from '../../src/platform/audio';
import { sounds } from '../../src/render/theme';

function setup(head: { ok: boolean; type?: string } | 'throw' = { ok: false }) {
  const oscillators: { type: string; start: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn> }[] = [];
  let contexts = 0;
  class Ctx {
    currentTime = 0;
    state = 'suspended';
    destination = {};
    constructor() {
      contexts += 1;
    }
    resume = vi.fn(async () => undefined);
    createGain() {
      return { gain: { value: 0, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() }, connect: vi.fn() };
    }
    createOscillator() {
      const o = {
        type: 'sine', frequency: { value: 0, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
        connect: vi.fn(), start: vi.fn(), stop: vi.fn(),
      };
      oscillators.push(o);
      return o;
    }
  }
  const fetchFn = vi.fn(async () => {
    if (head === 'throw') throw new Error('offline');
    return { ok: head.ok, headers: { get: () => head.type ?? 'audio/mpeg' } };
  });
  const els: { loop: boolean; play: ReturnType<typeof vi.fn>; pause: ReturnType<typeof vi.fn>; src: string }[] = [];
  const makeAudio = vi.fn((src: string) => {
    const el = { loop: false, src, play: vi.fn(async () => undefined), pause: vi.fn() };
    els.push(el);
    return el as never;
  });
  const audio = createAudio({ AudioContext: Ctx as never, fetch: fetchFn as never, makeAudio, musicUrl: '/m.mp3' });
  return { audio, oscillators, contexts: () => contexts, fetchFn, els, makeAudio };
}

describe('audio (R7)', () => {
  it('creates no AudioContext before unlock, and plays nothing', () => {
    const s = setup();
    s.audio.play('hit');
    expect(s.contexts()).toBe(0);
    expect(s.oscillators).toHaveLength(0);
    s.audio.unlock();
    s.audio.unlock();
    expect(s.contexts()).toBe(1);
  });

  it('has a table entry for every effect, and play makes an oscillator', () => {
    expect([...EFFECT_NAMES].sort()).toEqual(['escape', 'explode-big', 'explode-small', 'hit', 'mothership-enter', 'typo', 'wave-clear']);
    for (const n of EFFECT_NAMES) expect(sounds[n]).toBeDefined();
    const s = setup();
    s.audio.unlock();
    for (const n of EFFECT_NAMES) {
      const before = s.oscillators.length;
      s.audio.play(n);
      expect(s.oscillators.length).toBeGreaterThan(before);
    }
    const o = s.oscillators[0];
    expect(o.start).toHaveBeenCalled();
    expect(o.stop).toHaveBeenCalled();
  });

  it('is a no-op with sfx off', () => {
    const s = setup();
    s.audio.unlock();
    s.audio.setOptions({ sfx: false, music: true });
    s.audio.play('hit');
    expect(s.oscillators).toHaveLength(0);
  });

  it('a 404 on the music file means no audio element and no error', async () => {
    const s = setup({ ok: false });
    await s.audio.startMusic();
    expect(s.fetchFn).toHaveBeenCalledWith('/m.mp3', { method: 'HEAD' });
    expect(s.makeAudio).not.toHaveBeenCalled();
    s.audio.pauseMusic();
  });

  it('an html fallback response (SPA 200) also counts as no file', async () => {
    const s = setup({ ok: true, type: 'text/html' });
    await s.audio.startMusic();
    expect(s.makeAudio).not.toHaveBeenCalled();
  });

  it('a failing HEAD means silence, not an error', async () => {
    const s = setup('throw');
    await expect(s.audio.startMusic()).resolves.toBeUndefined();
    expect(s.makeAudio).not.toHaveBeenCalled();
  });

  it('a found file loops during play, pauses on pause, and respects the music toggle', async () => {
    const s = setup({ ok: true });
    await s.audio.startMusic();
    const el = s.els[0];
    expect(el.loop).toBe(true);
    expect(el.play).toHaveBeenCalledTimes(1);
    s.audio.pauseMusic();
    expect(el.pause).toHaveBeenCalledTimes(1);
    s.audio.setOptions({ sfx: true, music: false });
    await s.audio.startMusic();
    expect(el.play).toHaveBeenCalledTimes(1);
    s.audio.setOptions({ sfx: true, music: true });
    expect(el.play).toHaveBeenCalledTimes(2);
    s.audio.setOptions({ sfx: true, music: false });
    expect(el.pause).toHaveBeenCalledTimes(2);
    expect(s.makeAudio).toHaveBeenCalledTimes(1);
  });
});
