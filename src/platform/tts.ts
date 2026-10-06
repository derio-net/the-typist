/** The slice of `SpeechSynthesis` used here, so tests can stub it. */
export interface SynthLike {
  getVoices(): { lang: string }[];
  addEventListener(type: 'voiceschanged', cb: () => void): void;
  removeEventListener?(type: 'voiceschanged', cb: () => void): void;
  cancel(): void;
  speak(u: never): void;
}

export interface TtsStatus {
  available: boolean;
  /** Why speech is unavailable; absent while it is still being looked for. */
  reason?: string;
}

export interface Tts {
  status(): TtsStatus;
  /** Resolves once the voice question is settled (found, or given up). */
  ready: Promise<TtsStatus>;
  setEnabled(on: boolean): void;
  /** Cancels whatever is being said, then speaks `text` in German. */
  say(text: string): void;
  /** Cancels whatever is being said. */
  stop(): void;
  /** Called when availability changes (a German voice arriving late); returns an unsubscribe. */
  onChange(cb: (s: TtsStatus) => void): () => void;
}

export interface TtsDeps {
  synth?: SynthLike;
  Utterance?: new (text: string) => { lang: string; voice: unknown };
  timeoutMs?: number;
}

export const NO_VOICE_REASON = 'no German voice installed on this device';
export const NO_SYNTH_REASON = 'speech synthesis is not supported in this browser';
const VOICE_WAIT_MS = 1500;

export function createTts(deps: TtsDeps = {}): Tts {
  const synth = deps.synth ?? (typeof speechSynthesis === 'undefined' ? undefined : (speechSynthesis as unknown as SynthLike));
  const Utt = deps.Utterance ?? (typeof SpeechSynthesisUtterance === 'undefined' ? undefined : (SpeechSynthesisUtterance as never));
  let enabled = true;
  let voice: { lang: string } | undefined;
  let current: TtsStatus = { available: false };
  let settled = false;
  const listeners = new Set<(s: TtsStatus) => void>();
  let resolveReady!: (s: TtsStatus) => void;
  const ready = new Promise<TtsStatus>((r) => (resolveReady = r));

  const set = (s: TtsStatus) => {
    const changed = s.available !== current.available || s.reason !== current.reason;
    current = s;
    if (!settled) {
      settled = true;
      resolveReady(s);
    }
    if (changed) listeners.forEach((cb) => cb(s));
  };
  const find = () => {
    voice = synth?.getVoices().find((v) => v.lang.toLowerCase().startsWith('de'));
    return voice !== undefined;
  };
  const evaluate = () => set(find() ? { available: true } : { available: false, reason: NO_VOICE_REASON });

  if (!synth || !Utt) set({ available: false, reason: NO_SYNTH_REASON });
  else if (find()) set({ available: true });
  else {
    // voices may still arrive after we give up: keep listening, and upgrade when a German one shows up
    synth.addEventListener('voiceschanged', evaluate);
    setTimeout(() => {
      if (!settled) evaluate();
    }, deps.timeoutMs ?? VOICE_WAIT_MS);
  }

  return {
    status: () => current,
    ready,
    onChange(cb) {
      listeners.add(cb);
      return () => void listeners.delete(cb);
    },
    setEnabled: (on) => void (enabled = on),
    say(text) {
      if (!enabled || !current.available || !synth || !Utt || !voice) return;
      try {
        const u = new Utt(text);
        u.voice = voice;
        u.lang = voice.lang;
        synth.cancel();
        synth.speak(u as never);
      } catch {
        /* speech must never break the game */
      }
    },
    stop() {
      try {
        synth?.cancel();
      } catch {
        /* nothing to stop */
      }
    },
  };
}
