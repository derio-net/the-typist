import { h, type Panel } from '../dom';

export interface BannerProps {
  message: string;
}

/** The R10 storage warning: a strip in the page flow above the canvas (the canvas fits what is left of the window), not a modal. */
export function bannerPanel(root: HTMLElement, props: BannerProps, _handlers: Record<string, never> = {}): Panel {
  const el = h('div', { class: 'banner', role: 'status', 'data-panel': 'banner' }, props.message);
  root.prepend(el);
  return { el, close: () => el.remove() };
}
