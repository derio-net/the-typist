import type { Settings, SettingsPatch } from '../../platform/settings';
import { NEW_CAP_MAX, NEW_CAP_MIN } from '../../platform/settings';
import { button, h, mountPanel, type Panel } from '../dom';

export interface SettingsProps {
  settings: Settings;
  /** Why the TTS toggle is disabled, when it is (no German voice). */
  ttsUnavailable?: string;
}
export interface SettingsHandlers {
  onChange(patch: SettingsPatch): void;
  onClose(): void;
}

export function settingsPanel(root: HTMLElement, props: SettingsProps, handlers: SettingsHandlers): Panel {
  const s = props.settings;
  const toggle = (label: string, key: string, on: boolean, patch: (v: boolean) => SettingsPatch, disabled?: string) => {
    const box = h('input', { type: 'checkbox', 'data-setting': key, checked: on, disabled: disabled !== undefined });
    box.checked = on;
    box.addEventListener('change', () => handlers.onChange(patch(box.checked)));
    return h('label', {}, box, label, disabled && h('span', { class: 'muted' }, ` (${disabled})`));
  };
  const cap = h('input', { type: 'number', min: String(NEW_CAP_MIN), max: String(NEW_CAP_MAX), value: String(s.newCap), 'data-setting': 'newCap', 'aria-label': 'new records per day' });
  cap.addEventListener('change', () => handlers.onChange({ newCap: cap.valueAsNumber }));
  return mountPanel(
    root, 'settings', 'Settings',
    h('div', { class: 'stack' },
      toggle('Grammar chip', 'aids.chip', s.aids.chip, (v) => ({ aids: { chip: v } })),
      toggle('Translation', 'aids.translation', s.aids.translation, (v) => ({ aids: { translation: v } })),
      toggle('Speak words (TTS)', 'aids.tts', s.aids.tts, (v) => ({ aids: { tts: v } }), props.ttsUnavailable),
      toggle('Recap cards', 'aids.recap', s.aids.recap, (v) => ({ aids: { recap: v } })),
      toggle('Sound effects', 'sfx', s.sfx, (v) => ({ sfx: v })),
      toggle('Music', 'music', s.music, (v) => ({ music: v })),
      h('label', {}, 'New records per day', cap)),
    h('div', { class: 'stack' }, button('Close', handlers.onClose, { 'data-action': 'close' })),
  );
}
