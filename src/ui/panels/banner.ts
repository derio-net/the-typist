import { h, type Panel } from '../dom';

export interface BannerProps {
  message: string;
}

/** The R10 storage warning: a strip over the top of the page, not a modal. */
export function bannerPanel(root: HTMLElement, props: BannerProps, _handlers: Record<string, never> = {}): Panel {
  const el = h('div', { class: 'banner', role: 'status', 'data-panel': 'banner' }, props.message);
  root.append(el);
  return { el, close: () => el.remove() };
}
