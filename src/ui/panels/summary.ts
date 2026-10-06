import type { Summary } from '../../session/controller';
import { button, h, mountPanel, type Panel } from '../dom';

export interface SummaryProps {
  summary: Summary;
}
export interface SummaryHandlers {
  onClose(): void;
}

const TITLES: Record<Summary['reason'], string> = {
  finished: 'Session complete',
  'game-over': 'Game over',
  quit: 'Session ended',
};

export function summaryPanel(root: HTMLElement, props: SummaryProps, handlers: SummaryHandlers): Panel {
  const s = props.summary;
  return mountPanel(
    root, 'summary', TITLES[s.reason],
    h('div', { class: 'grades' },
      ...(['Again', 'Hard', 'Good', 'Easy'] as const).map((g) => h('div', { 'data-grade': g }, h('b', {}, String(s.counts[g])), g))),
    h('p', {}, `Accuracy ${Math.round(s.accuracy * 100)}%`),
    h('p', {}, `${s.charsPerSecond.toFixed(1)} chars/s`),
    h('p', {}, `Score ${s.score}`),
    s.writeErrors > 0 && h('p', { class: 'warn' }, 'Some progress could not be saved.'),
    h('div', { class: 'stack' }, button('Continue', handlers.onClose, { class: 'primary', 'data-action': 'close' })),
  );
}
