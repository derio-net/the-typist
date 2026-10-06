import { button, h, mountPanel, type Panel } from '../dom';

export interface PauseHandlers {
  onResume(): void;
  onSettings(): void;
  onQuit(): void;
}

export function pausePanel(root: HTMLElement, _props: Record<string, never>, handlers: PauseHandlers): Panel {
  return mountPanel(
    root, 'pause', 'Paused',
    h('div', { class: 'stack' },
      button('Resume', handlers.onResume, { class: 'primary', 'data-action': 'resume' }),
      button('Settings', handlers.onSettings, { 'data-action': 'settings' }),
      button('Quit to menu', handlers.onQuit, { 'data-action': 'quit' })),
  );
}
