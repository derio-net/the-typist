import { audioLevels, sounds, type Sound } from '../render/theme';

export type EffectName = keyof typeof sounds;
export const EFFECT_NAMES = Object.keys(sounds) as EffectName[];

export interface AudioOptions { sfx: boolean; music: boolean }

export interface Audio {
  /** Creates the AudioContext; call from the first keydown or pointer press (autoplay policy). */
  unlock(): void;
  play(name: EffectName): void;
  setOptions(o: AudioOptions): void;
  /** Looks for the music file once, then loops it while the music toggle is on. Silent when there is no file. */
  startMusic(): Promise<void>;
  pauseMusic(): void;
}

interface MusicEl { loop: boolean; volume?: number; play(): Promise<void> | void; pause(): void }

export interface AudioDeps {
  AudioContext?: new () => AudioContext;
  fetch?: typeof fetch;
  makeAudio?: (src: string) => MusicEl;
  musicUrl?: string;
}

export const MUSIC_PATH = 'assets/audio/music-game.mp3';

export function createAudio(deps: AudioDeps = {}): Audio {
  const Ctor = deps.AudioContext ?? (typeof AudioContext === 'undefined' ? undefined : AudioContext);
  const doFetch = deps.fetch ?? (typeof fetch === 'undefined' ? undefined : fetch);
  const makeAudio = deps.makeAudio ?? ((src: string) => new globalThis.Audio(src) as MusicEl);
  const musicUrl = deps.musicUrl ?? `${(import.meta as { env?: { BASE_URL?: string } }).env?.BASE_URL ?? '/'}${MUSIC_PATH}`;
  let ctx: AudioContext | undefined;
  let opts: AudioOptions = { sfx: true, music: true };
  let wanted = false;
  let audible = false;
  let el: MusicEl | undefined;
  let probe: Promise<void> | undefined;

  const sync = () => {
    if (!el) return;
    const should = wanted && opts.music;
    if (should && !audible) {
      audible = true;
      Promise.resolve(el.play()).catch(() => (audible = false));
    } else if (!should && audible) {
      audible = false;
      el.pause();
    }
  };

  const look = async () => {
    try {
      const res = await doFetch?.(musicUrl, { method: 'HEAD' });
      // a dev server answers a missing file with its html fallback: only audio counts
      const type = res?.headers?.get('content-type') ?? '';
      if (!res?.ok || type.includes('text/html')) return;
      el = makeAudio(musicUrl);
      el.loop = true;
      el.volume = audioLevels.music;
    } catch {
      /* no file reachable: stay silent */
    }
  };

  const tone = (s: Sound) => {
    if (!ctx) return;
    const t = ctx.currentTime;
    const end = t + s.ms / audioLevels.msPerSecond;
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = s.wave;
    osc.frequency.setValueAtTime(s.from, t);
    osc.frequency.exponentialRampToValueAtTime(s.to, end);
    amp.gain.setValueAtTime(s.gain, t);
    amp.gain.exponentialRampToValueAtTime(Number.EPSILON, end);
    osc.connect(amp);
    amp.connect(ctx.destination);
    osc.start(t);
    osc.stop(end);
  };

  return {
    unlock() {
      if (ctx || !Ctor) return;
      try {
        ctx = new Ctor();
        void ctx.resume?.();
      } catch {
        ctx = undefined;
      }
    },
    play(name) {
      if (!opts.sfx || !ctx) return;
      try {
        tone(sounds[name]);
      } catch {
        /* a failed effect must never break the game */
      }
    },
    setOptions(o) {
      opts = { ...o };
      sync();
    },
    async startMusic() {
      wanted = true;
      probe ??= look();
      await probe;
      if (wanted) sync();
    },
    pauseMusic() {
      wanted = false;
      sync();
    },
  };
}
