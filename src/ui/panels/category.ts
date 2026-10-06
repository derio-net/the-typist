import { button, h, mountPanel, type Panel } from '../dom';

export interface CategoryProps {
  categories: { id: string; title: string; playable: number }[];
}
export interface CategoryHandlers {
  onPick(categoryId: string): void;
  onBack(): void;
}

export function categoryPanel(root: HTMLElement, props: CategoryProps, handlers: CategoryHandlers): Panel {
  return mountPanel(
    root, 'category', 'Choose a category',
    h('div', { class: 'stack' }, ...props.categories.map((c) =>
      button(`${c.title} (${c.playable})`, () => handlers.onPick(c.id), { 'data-category': c.id, disabled: c.playable === 0 }))),
    h('div', { class: 'stack' }, button('Back', handlers.onBack, { 'data-action': 'back' })),
  );
}
