import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTts } from '../../src/platform/tts';

type Voice = { lang: string; name: string };
class Utt {
  lang = '';
  voice: Voice | null = null;
  constructor(public text: string) {}
}

function fakeSynth(initial: Voice[]) {
  let voices = initial;
  const listeners: (() => void)[] = [];
  const calls: string[] = [];
  const spoken: Utt[] = [];
  return {
    synth: {
      getVoices: () => voices,
      addEventListener: (_: string, cb: () => void) => void listeners.push(cb),
      removeEventListener: () => undefined,
      cancel: () => void calls.push('cancel'),
      speak: (u: Utt) => {
        calls.push('speak');
        spoken.push(u);
      },
    },
    calls,
    spoken,
    setVoices(v: Voice[]) {
      voices = v;
      listeners.forEach((l) => l());
    },
  };
}
const EN = { lang: 'en-US', name: 'Sam' };
const DE = { lang: 'de-DE', name: 'Anna' };
const DE2 = { lang: 'de-AT', name: 'Max' };

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('tts (R6, R10)', () => {
  it('picks the first voice whose lang starts with de', async () => {
    const f = fakeSynth([EN, DE, DE2]);
    const tts = createTts({ synth: f.synth, Utterance: Utt as never });
    expect(await tts.ready).toEqual({ available: true });
    tts.say('Haus');
    expect(f.spoken[0].voice).toBe(DE);
    expect(f.spoken[0].lang).toBe('de-DE');
  });

  it('waits for voiceschanged when the voice list starts empty', async () => {
    const f = fakeSynth([]);
    const tts = createTts({ synth: f.synth, Utterance: Utt as never });
    expect(tts.status().available).toBe(false);
    f.setVoices([EN, DE]);
    expect((await tts.ready).available).toBe(true);
  });

  it('reports unavailable with a reason when voiceschanged brings no German voice', async () => {
    const f = fakeSynth([]);
    const tts = createTts({ synth: f.synth, Utterance: Utt as never });
    f.setVoices([EN]);
    const s = await tts.ready;
    expect(s.available).toBe(false);
    expect(s.reason).toMatch(/German/);
    tts.say('Haus');
    expect(f.spoken).toHaveLength(0);
  });

  it('gives up after 1500 ms with a reason', async () => {
    const f = fakeSynth([]);
    const tts = createTts({ synth: f.synth, Utterance: Utt as never });
    vi.advanceTimersByTime(1499);
    expect(tts.status().reason).toBeUndefined();
    vi.advanceTimersByTime(2);
    const s = await tts.ready;
    expect(s).toEqual({ available: false, reason: expect.stringMatching(/German/) });
  });

  it('is unavailable without speechSynthesis', async () => {
    const tts = createTts({ synth: undefined });
    expect((await tts.ready).reason).toMatch(/not supported/);
    expect(() => tts.say('x')).not.toThrow();
  });

  it('say cancels the previous utterance, then speaks a de one', async () => {
    const f = fakeSynth([DE]);
    const tts = createTts({ synth: f.synth, Utterance: Utt as never });
    await tts.ready;
    tts.say('eins');
    tts.say('zwei');
    expect(f.calls).toEqual(['cancel', 'speak', 'cancel', 'speak']);
    expect(f.spoken.map((u) => u.text)).toEqual(['eins', 'zwei']);
  });

  it('speaks nothing while off', async () => {
    const f = fakeSynth([DE]);
    const tts = createTts({ synth: f.synth, Utterance: Utt as never });
    await tts.ready;
    tts.setEnabled(false);
    tts.say('eins');
    expect(f.calls).toEqual([]);
    tts.setEnabled(true);
    tts.say('eins');
    expect(f.calls).toEqual(['cancel', 'speak']);
  });

  it('stop cancels speech without speaking (p5-r1)', async () => {
    const f = fakeSynth([DE]);
    const tts = createTts({ synth: f.synth, Utterance: Utt as never });
    await tts.ready;
    tts.stop();
    expect(f.calls).toEqual(['cancel']);
  });

  it('a throwing synth never escapes say or stop (p5-r3)', async () => {
    const f = fakeSynth([DE]);
    f.synth.cancel = () => { throw new Error('boom'); };
    const tts = createTts({ synth: f.synth, Utterance: Utt as never });
    await tts.ready;
    expect(() => tts.say('x')).not.toThrow();
    expect(() => tts.stop()).not.toThrow();
  });

  it('keeps listening after giving up: a later German voice upgrades it and notifies (p5-r4)', async () => {
    const f = fakeSynth([]);
    const tts = createTts({ synth: f.synth, Utterance: Utt as never });
    const seen: boolean[] = [];
    tts.onChange((s) => seen.push(s.available));
    vi.advanceTimersByTime(1600);
    await tts.ready;
    expect(tts.status().available).toBe(false);
    f.setVoices([DE]);
    expect(tts.status()).toEqual({ available: true });
    expect(seen).toContain(false);
    expect(seen.at(-1)).toBe(true);
    tts.say('Haus');
    expect(f.spoken[0].voice).toBe(DE);
  });
});
