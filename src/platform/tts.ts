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

  const settle = (s: TtsStatus) => (current = s);
  const find = () => synth?.getVoices().find((v) => v.lang.toLowerCase().startsWith('de'));

  const ready = new Promise<TtsStatus>((resolve) => {
    if (!synth || !Utt) {
      resolve(settle({ available: false, reason: NO_SYNTH_REASON }));
      return;
    }
    const found = () => {
      voice = find();
      return voice !== undefined;
    };
    if (found()) {
      resolve(settle({ available: true }));
      return;
    }
    let timer: ReturnType<typeof setTimeout> | undefined;
    const finish = (s: TtsStatus) => {
      clearTimeout(timer);
      synth.removeEventListener?.('voiceschanged', onChange);
      resolve(settle(s));
    };
    // the first voiceschanged settles it: either a German voice is there or none is coming
    const onChange = () => finish(found() ? { available: true } : { available: false, reason: NO_VOICE_REASON });
    synth.addEventListener('voiceschanged', onChange);
    timer = setTimeout(() => finish(found() ? { available: true } : { available: false, reason: NO_VOICE_REASON }), deps.timeoutMs ?? VOICE_WAIT_MS);
  });

  return {
    status: () => current,
    ready,
    setEnabled: (on) => void (enabled = on),
    say(text) {
      if (!enabled || !current.available || !synth || !Utt || !voice) return;
      const u = new Utt(text);
      u.voice = voice;
      u.lang = voice.lang;
      synth.cancel();
      synth.speak(u as never);
    },
  };
}
