import { rankGermanVoices, type VoiceLike } from './voices';

/** The slice of `SpeechSynthesis` used here, so tests can stub it. */
export interface SynthLike {
  getVoices(): VoiceLike[];
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
  /** Like `say`, but speaks even while the aid is off (the Settings Test button). */
  preview(text: string): void;
  /** Cancels whatever is being said. */
  stop(): void;
  /** The German voices, best first. */
  voices(): TtsVoice[];
  /** Selects a voice by uri; null or an unknown uri means the top-ranked voice. */
  setVoice(uri: string | null): void;
  /** Called when availability changes (a German voice arriving late); returns an unsubscribe. */
  onChange(cb: (s: TtsStatus) => void): () => void;
}

export interface TtsVoice {
  uri: string;
  name: string;
  lang: string;
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
  let ranked: VoiceLike[] = [];
  let chosen: string | null = null;
  let current: TtsStatus = { available: false };
  let settled = false;
  const listeners = new Set<(s: TtsStatus) => void>();
  let resolveReady!: (s: TtsStatus) => void;
  const ready = new Promise<TtsStatus>((r) => (resolveReady = r));

  const voice = (): VoiceLike | undefined => ranked.find((v) => v.voiceURI === chosen) ?? ranked[0];
  const key = (vs: VoiceLike[]) => vs.map((v) => v.voiceURI).join('\n');

  const set = (s: TtsStatus, force = false) => {
    const changed = force || s.available !== current.available || s.reason !== current.reason;
    current = s;
    if (!settled) {
      settled = true;
      resolveReady(s);
    }
    if (changed) listeners.forEach((cb) => cb(s));
  };
  /** Re-reads and re-ranks the voices; the Settings panel is told when the list or the availability moved. */
  const evaluate = () => {
    const before = key(ranked);
    ranked = synth ? rankGermanVoices(synth.getVoices()) : [];
    set(ranked.length > 0 ? { available: true } : { available: false, reason: NO_VOICE_REASON }, settled && key(ranked) !== before);
  };

  if (!synth || !Utt) set({ available: false, reason: NO_SYNTH_REASON });
  else {
    // Chrome delivers network voices (Google Deutsch) after the local ones, so always keep listening
    synth.addEventListener('voiceschanged', evaluate);
    ranked = rankGermanVoices(synth.getVoices());
    if (ranked.length > 0) set({ available: true });
    else
      setTimeout(() => {
        if (!settled) evaluate();
      }, deps.timeoutMs ?? VOICE_WAIT_MS);
  }

  const speak = (text: string) => {
    const v = voice();
    if (!current.available || !synth || !Utt || !v) return;
    try {
      const u = new Utt(text);
      u.voice = v;
      u.lang = v.lang;
      synth.cancel();
      synth.speak(u as never);
    } catch {
      /* speech must never break the game */
    }
  };

  return {
    status: () => current,
    ready,
    onChange(cb) {
      listeners.add(cb);
      return () => void listeners.delete(cb);
    },
    setEnabled: (on) => void (enabled = on),
    say(text) {
      if (enabled) speak(text);
    },
    preview: speak,
    voices: () => ranked.map((v) => ({ uri: v.voiceURI, name: v.name, lang: v.lang })),
    setVoice: (uri) => void (chosen = uri),
    stop() {
      try {
        synth?.cancel();
      } catch {
        /* nothing to stop */
      }
    },
  };
}
