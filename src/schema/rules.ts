import type { VocabRecord } from './record';
import { displayForm, formsText } from './display';
import { isTypeable } from './typeable';

export const RECOGNISED_TAGS = [
  'singular', 'plural', 'separated', 'attributive', 'comparative', 'superlative',
  'Präsens', 'Präteritum', 'Perfekt', 'Plusquamperfekt', 'Futur I', 'Konjunktiv II', 'Passiv', 'Imperativ',
] as const;
export const TENSE_TAGS = [
  'Präsens', 'Präteritum', 'Perfekt', 'Plusquamperfekt', 'Futur I', 'Konjunktiv II', 'Passiv', 'Imperativ',
] as const;

export interface RuleOptions {
  noun_examples?: number;
  verb_examples?: number;
  adjective_examples?: number;
  phrase_examples?: number;
}

const DEFAULTS = { noun_examples: 3, verb_examples: 3, adjective_examples: 2, phrase_examples: 2 };

const countTag = (r: VocabRecord, tag: string) =>
  (r.examples ?? []).filter((e) => e.tags.includes(tag)).length;

type Min = Required<RuleOptions>;

const needExamples = (r: VocabRecord, count: number): string[] => {
  const n = (r.examples ?? []).length;
  return n < count ? [`${r.type} needs at least ${count} examples (has ${n})`] : [];
};

export function nounRules(r: VocabRecord, min: Min): string[] {
  const out = needExamples(r, min.noun_examples);
  const noPlural = r.noun?.plural === null || r.noun?.plural_only === true;
  if (!noPlural) {
    if (!countTag(r, 'singular')) out.push('noun needs an example tagged singular');
    if (!countTag(r, 'plural')) out.push('noun needs an example tagged plural');
  }
  return out;
}

export function verbRules(r: VocabRecord, min: Min): string[] {
  const out = needExamples(r, min.verb_examples);
  const tenses = new Set(
    (r.examples ?? []).flatMap((e) => e.tags.filter((t) => (TENSE_TAGS as readonly string[]).includes(t))),
  );
  if (tenses.size < 2) out.push(`verb examples need at least 2 distinct tenses (has ${tenses.size})`);
  if (r.verb?.separable && !countTag(r, 'separated')) out.push('separable verb needs an example tagged separated');
  return out;
}

export function adjectiveRules(r: VocabRecord, min: Min): string[] {
  const out = needExamples(r, min.adjective_examples);
  if (!countTag(r, 'attributive')) out.push('adjective needs an example tagged attributive');
  if (r.adjective?.gradable && !(r.adjective.comparative && r.adjective.superlative))
    out.push('gradable adjective needs both comparative and superlative forms');
  if (r.adjective?.gradable && !countTag(r, 'comparative') && !countTag(r, 'superlative'))
    out.push('gradable adjective needs an example tagged comparative or superlative');
  return out;
}

export function phraseRules(r: VocabRecord, min: Min): string[] {
  return needExamples(r, min.phrase_examples);
}

const BY_TYPE = { noun: nounRules, verb: verbRules, adjective: adjectiveRules, phrase: phraseRules };

/** Per-type rule messages for one enriched/reviewed record; empty when valid. */
export function checkRecordRules(r: VocabRecord, rules: RuleOptions = {}): string[] {
  return BY_TYPE[r.type](r, { ...DEFAULTS, ...rules });
}

/** Typeability messages (R3) for an enriched/reviewed record. */
export function checkTypeable(r: VocabRecord): string[] {
  const out: string[] = [];
  const check = (where: string, text: string | null) => {
    if (text !== null && !isTypeable(text)) out.push(`${where} is not typeable: '${text}'`);
  };
  check('display form', displayForm(r));
  check('forms', formsText(r));
  (r.examples ?? []).forEach((e, i) => check(`examples[${i}].de`, e.de));
  return out;
}

/** Checks that apply only to enriched/reviewed records. */
export function checkEnriched(r: VocabRecord, rules: RuleOptions = {}): string[] {
  if (r.status === 'raw') return [];
  if (r.type !== 'phrase' && !r[r.type]) return [`${r.type} record needs a '${r.type}' block`];
  return [...checkRecordRules(r, rules), ...checkTypeable(r)];
}
