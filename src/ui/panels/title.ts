import type { VocabList } from '../../schema';
import { isPlayable } from '../../session/build';
import { button, h, mountPanel, type Panel } from '../dom';

export interface TitleProps {
  bundled: VocabList[];
  /** Lists loaded from disk this session. */
  loaded: VocabList[];
}
export interface TitleHandlers {
  onChoose(list: VocabList): void;
  onLoadFile(file: File): void;
  onSettings(): void;
}

export function titlePanel(root: HTMLElement, props: TitleProps, handlers: TitleHandlers): Panel {
  const item = (list: VocabList) =>
    button(`${list.list.title} (${list.records.filter(isPlayable).length})`, () => handlers.onChoose(list), { 'data-list': list.list.id });
  const file = h('input', { type: 'file', accept: '.yaml,.yml', hidden: true, 'data-testid': 'list-file', 'aria-label': 'list file' });
  file.addEventListener('change', () => {
    const f = file.files?.[0];
    if (f) handlers.onLoadFile(f);
    file.value = '';
  });
  return mountPanel(
    root, 'title', 'the-typist',
    h('p', { class: 'muted' }, 'Copy-type German vocabulary to shoot down the ships.'),
    h('div', { class: 'stack', 'data-section': 'bundled' }, ...props.bundled.map(item)),
    props.loaded.length > 0 && h('div', { class: 'stack', 'data-section': 'loaded' }, h('p', { class: 'muted' }, 'Loaded this session'), ...props.loaded.map(item)),
    h('div', { class: 'stack' }, button('Load list…', () => file.click(), { 'data-action': 'load' }), button('Settings', handlers.onSettings, { 'data-action': 'settings' })),
    file,
  );
}
