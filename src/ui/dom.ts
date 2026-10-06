export type Child = Node | string | null | undefined | false;

/** Builds an element: attributes (`class`, `data-*`, properties as strings) and children. */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string | boolean | undefined> = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === false) continue;
    if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, v);
  }
  for (const c of children) if (c) el.append(c);
  return el;
}

export function button(label: string, onClick: () => void, attrs: Record<string, string | boolean | undefined> = {}): HTMLButtonElement {
  const b = h('button', { type: 'button', ...attrs }, label);
  b.addEventListener('click', onClick);
  return b;
}

/** A panel: an overlay holding one dialog card over the canvas. `close` removes it. */
export interface Panel {
  el: HTMLElement;
  close(): void;
}

/** Mounts a dialog card (with a title and the given body) in `root` and returns its handle. */
export function mountPanel(root: HTMLElement, name: string, title: string, ...body: Child[]): Panel {
  const card = h('div', { class: 'panel', role: 'dialog', 'aria-label': title, 'data-panel': name }, h('h2', {}, title), ...body);
  const overlay = h('div', { class: 'panel-overlay', 'data-panel-overlay': name }, card);
  root.append(overlay);
  // the keyboard is off while a panel is open: put focus on the primary control so Enter works
  const first = card.querySelector<HTMLElement>('button.primary') ?? card.querySelector<HTMLElement>('button:not(:disabled), input:not([hidden]):not(:disabled)');
  first?.focus();
  return { el: card, close: () => overlay.remove() };
}
