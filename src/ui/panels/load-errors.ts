import { button, h, mountPanel, type Panel } from '../dom';

export interface LoadErrorsProps {
  fileName: string;
  errors: string[];
}
export interface LoadErrorsHandlers {
  onClose(): void;
}

export function loadErrorsPanel(root: HTMLElement, props: LoadErrorsProps, handlers: LoadErrorsHandlers): Panel {
  return mountPanel(
    root, 'load-errors', 'Could not load list',
    h('p', { class: 'muted' }, `${props.fileName} is not a valid list (${props.errors.length} ${props.errors.length === 1 ? 'error' : 'errors'}):`),
    h('ul', { class: 'errors' }, ...props.errors.map((e) => h('li', {}, e))),
    h('div', { class: 'stack' }, button('Close', handlers.onClose, { 'data-action': 'close' })),
  );
}
