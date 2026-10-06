import type { VocabRecord } from '../../schema/record';
import { recapContent } from './recap';
import { button, h, mountPanel, type Panel } from '../dom';

export interface BetweenWaveProps {
  /** Zero-based index of the wave just cleared. */
  wave: number;
  more: boolean;
  lives: number;
  score: number;
  /** Ids of the wave's weak Records, for the recap cards (R6, phase 5 fills the recap slot). */
  weak: string[];
  /** The weak Records to show as cards; empty when the recap setting is off. */
  recap?: readonly VocabRecord[];
}
export interface BetweenWaveHandlers {
  onContinue(): void;
}

/** The structure of the "wave cleared" panel; `[data-slot=recap]` is where the recap cards go. */
export function betweenWavePanel(root: HTMLElement, props: BetweenWaveProps, handlers: BetweenWaveHandlers): Panel {
  return mountPanel(
    root, 'between-wave', `Wave ${props.wave + 1} cleared`,
    h('p', {}, `Score ${props.score} · Lives ${props.lives}`),
    h('div', { 'data-slot': 'recap' }, ...recapContent(props.recap ?? [])),
    h('div', { class: 'stack' }, button(props.more ? 'Next wave' : 'Finish', handlers.onContinue, { class: 'primary', 'data-action': 'continue' })),
  );
}
