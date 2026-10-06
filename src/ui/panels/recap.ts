import type { VocabRecord } from '../../schema/record';
import { displayForm, formsText } from '../../schema/display';
import { h } from '../dom';

export const NOTHING_TO_REVIEW = 'No words to review';

/** One recap card: the display form, gloss, forms and every sentence with its translation. All text, never markup. */
export function recapCard(r: VocabRecord): HTMLElement {
  const forms = formsText(r);
  return h('div', { class: 'recap-card', 'data-card': r.id },
    h('h3', {}, displayForm(r)),
    h('p', { class: 'muted' }, r.gloss.join('; ')),
    forms && h('p', { 'data-part': 'forms' }, forms),
    h('ul', {}, ...(r.examples ?? []).map((e) => h('li', {}, h('span', {}, e.de), h('br'), h('span', { class: 'muted' }, e.en)))));
}

/** The content of the between-wave panel's recap slot: a card per weak record, or just "Wave cleared". */
export function recapContent(records: readonly VocabRecord[]): (HTMLElement | string)[] {
  return records.length === 0 ? [NOTHING_TO_REVIEW] : records.map(recapCard);
}
