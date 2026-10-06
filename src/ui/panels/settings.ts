import type { Settings, SettingsPatch } from '../../platform/settings';
import { NEW_CAP_MAX, NEW_CAP_MIN } from '../../platform/settings';
import type { TtsVoice } from '../../platform/tts';
import { button, h, mountPanel, type Panel } from '../dom';

export interface SettingsProps {
  settings: Settings;
  /** Why the TTS toggle is disabled, when it is (no German voice). */
  ttsUnavailable?: string;
  /** The German voices, best first. */
  voices?: TtsVoice[];
}

export const VOICE_SAMPLE = 'Guten Tag! So klingt diese Stimme.';
export const VOICE_HINT =
  'For a better voice: on macOS, System Settings › Accessibility › Spoken Content › System voice › Manage Voices…, add a German Premium or Enhanced voice, then reload. ' +
  'On Windows, Settings › Time & language › Speech › Add voices › Deutsch. ' +
  'Chrome offers "Google Deutsch"; Edge offers natural "Online" voices.';
export interface SettingsHandlers {
  /** May return the stored (clamped) settings, which the panel shows. */
  onChange(patch: SettingsPatch): Settings | void;
  onClose(): void;
  /** Speaks `text` in the selected voice, even when the TTS aid is off. */
  onTestVoice?(text: string): void;
}

export function settingsPanel(root: HTMLElement, props: SettingsProps, handlers: SettingsHandlers): Panel {
  const s = props.settings;
  const toggle = (label: string, key: string, on: boolean, patch: (v: boolean) => SettingsPatch, disabled?: string) => {
    const box = h('input', { type: 'checkbox', 'data-setting': key, checked: on, disabled: disabled !== undefined });
    // an unavailable aid shows off, but the stored preference is left alone
    box.checked = on && disabled === undefined;
    box.addEventListener('change', () => handlers.onChange(patch(box.checked)));
    return h('label', {}, box, label, disabled && h('span', { class: 'muted' }, ` (${disabled})`));
  };
  const cap = h('input', { type: 'number', min: String(NEW_CAP_MIN), max: String(NEW_CAP_MAX), value: String(s.newCap), 'data-setting': 'newCap', 'aria-label': 'new records per day' });
  let shown = s.newCap;
  cap.addEventListener('change', () => {
    const typed = cap.valueAsNumber;
    // an empty or non-numeric field keeps the previous value
    if (!Number.isFinite(typed)) {
      cap.value = String(shown);
      return;
    }
    const stored = handlers.onChange({ newCap: typed });
    if (stored) shown = stored.newCap;
    cap.value = String(shown);
  });
  const off = props.ttsUnavailable !== undefined;
  const pick = h('select', { 'data-setting': 'voice', 'aria-label': 'speech voice', disabled: off });
  const voices = props.voices ?? [];
  pick.append(h('option', { value: '' }, 'Automatic (best available)'));
  for (const v of voices) pick.append(h('option', { value: v.uri }, `${v.name} (${v.lang})`));
  pick.value = voices.some((v) => v.uri === s.voice) ? (s.voice as string) : '';
  pick.addEventListener('change', () => handlers.onChange({ voice: pick.value === '' ? null : pick.value }));
  const test = button('Test voice', () => handlers.onTestVoice?.(VOICE_SAMPLE), { 'data-action': 'test-voice', disabled: off });
  return mountPanel(
    root, 'settings', 'Settings',
    h('div', { class: 'stack' },
      toggle('Grammar chip', 'aids.chip', s.aids.chip, (v) => ({ aids: { chip: v } })),
      toggle('Translation', 'aids.translation', s.aids.translation, (v) => ({ aids: { translation: v } })),
      toggle('Speak words (TTS)', 'aids.tts', s.aids.tts, (v) => ({ aids: { tts: v } }), props.ttsUnavailable),
      toggle('Recap cards', 'aids.recap', s.aids.recap, (v) => ({ aids: { recap: v } })),
      toggle('Sound effects', 'sfx', s.sfx, (v) => ({ sfx: v })),
      toggle('Music', 'music', s.music, (v) => ({ music: v })),
      h('label', {}, 'New records per day', cap),
      h('label', {}, 'Voice ', pick, ' ', test),
      off && h('p', { class: 'muted' }, `Voice choice unavailable: ${props.ttsUnavailable}`),
      h('p', { class: 'muted', 'data-slot': 'voice-hint' }, VOICE_HINT)),
    h('div', { class: 'stack' }, button('Close', handlers.onClose, { 'data-action': 'close' })),
  );
}
