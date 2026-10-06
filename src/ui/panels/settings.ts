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
  /** Whether progress is protected from browser cleanup; absent until the browser has answered. */
  storage?: StorageStatus;
  /** Offer Export and Import: only from the title, where no live World holds a pace that would overwrite an import. */
  portable?: boolean;
}

export type StorageStatus = 'protected' | 'may-be-cleared' | 'memory';
export const STORAGE_LINES: Record<StorageStatus, string> = {
  protected: 'Progress is protected from browser cleanup.',
  'may-be-cleared': 'The browser may clear progress if the site goes unused.',
  memory: "Progress and settings won't be saved: browser storage is unavailable.",
};

export interface TransferResult {
  ok: boolean;
  message: string;
}

/** "Name (de-DE)", unless the name already carries its locale or a parenthesised language. */
export function voiceLabel(v: TtsVoice): string {
  const carries = v.name.toLowerCase().includes(v.lang.toLowerCase()) || /\)\s*$/.test(v.name);
  return carries ? v.name : `${v.name} (${v.lang})`;
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
  /** Downloads the progress file. */
  onExport?(): Promise<TransferResult>;
  /** Reads a progress file the player chose. */
  onImport?(file: File): Promise<TransferResult>;
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
  for (const v of voices) pick.append(h('option', { value: v.uri }, voiceLabel(v)));
  pick.value = voices.some((v) => v.uri === s.voice) ? (s.voice as string) : '';
  pick.addEventListener('change', () => handlers.onChange({ voice: pick.value === '' ? null : pick.value }));
  const test = button('Test voice', () => handlers.onTestVoice?.(VOICE_SAMPLE), { 'data-action': 'test-voice', disabled: off });
  const status = h('p', { class: 'muted', 'data-slot': 'transfer-status', 'aria-live': 'polite' });
  const report = (run: Promise<TransferResult> | undefined) =>
    void run?.then(
      (r) => {
        status.textContent = r.message;
        status.dataset.state = r.ok ? 'ok' : 'error';
      },
      (e: unknown) => {
        status.textContent = e instanceof Error ? e.message : String(e);
        status.dataset.state = 'error';
      },
    );
  const picker = h('input', { type: 'file', accept: '.json,application/json', hidden: true, 'data-testid': 'progress-file', 'aria-label': 'progress file' });
  picker.addEventListener('change', () => {
    const file = picker.files?.[0];
    if (!file) return;
    report(handlers.onImport?.(file));
    picker.value = ''; // the same file can be chosen again
  });
  const transfer = props.portable
    ? h('div', { 'data-slot': 'transfer' },
        h('div', { 'data-slot': 'transfer-row' },
          button('Export progress', () => report(handlers.onExport?.()), { 'data-action': 'export-progress' }),
          button('Import progress', () => picker.click(), { 'data-action': 'import-progress' }),
          picker),
        status)
    : undefined;
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
      h('div', { 'data-slot': 'voice-row' }, h('span', {}, 'Voice'), pick, test),
      off && h('p', { class: 'muted' }, `Voice choice unavailable: ${props.ttsUnavailable}`),
      h('p', { class: 'muted', 'data-slot': 'voice-hint' }, VOICE_HINT),
      props.storage && h('p', { class: 'muted', 'data-slot': 'storage-line' }, STORAGE_LINES[props.storage]),
      transfer),
    h('div', { class: 'stack' }, button('Close', handlers.onClose, { 'data-action': 'close' })),
  );
}
