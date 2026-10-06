import { button, h, mountPanel, type Panel } from '../dom';

export interface ModeProps {
  listTitle: string;
  due: number;
  /** New Records still allowed today. */
  fresh: number;
  /** Playable Records in the list. */
  playable: number;
  /** Study would have nothing to play. */
  empty?: 'nothing-due';
}
export interface ModeHandlers {
  onStudy(): void;
  onFreePlay(): void;
  onBack(): void;
}

export function modePanel(root: HTMLElement, props: ModeProps, handlers: ModeHandlers): Panel {
  if (props.playable === 0) {
    return mountPanel(
      root, 'mode', props.listTitle,
      h('p', { class: 'warn' }, 'This list has no enriched records to play.'),
      h('div', { class: 'stack' }, button('Back', handlers.onBack, { 'data-action': 'back' })),
    );
  }
  const study =
    props.empty === 'nothing-due'
      ? button('Nothing due — free play?', handlers.onFreePlay, { 'data-action': 'study-empty' })
      : button('Study', handlers.onStudy, { class: 'primary', 'data-action': 'study' });
  return mountPanel(
    root, 'mode', props.listTitle,
    h('p', { 'data-counts': '' }, `${props.due} due · ${props.fresh} new`),
    h('div', { class: 'stack' }, study, button('Free play', handlers.onFreePlay, { 'data-action': 'free-play' }), button('Back', handlers.onBack, { 'data-action': 'back' })),
  );
}
