import { z } from 'zod';
import { checkEnriched, type RuleOptions } from './rules';

export { RECOGNISED_TAGS, TENSE_TAGS, checkRecordRules, checkEnriched, type RuleOptions } from './rules';

export const Gender = z.enum(['m', 'f', 'n']);

export const NounBlock = z.strictObject({
  gender: Gender,
  plural: z.string().min(1).nullable(),
  plural_only: z.boolean().optional(),
  variants: z
    .array(z.strictObject({ lemma: z.string().min(1), gender: Gender, plural: z.string().min(1).nullable().optional() }))
    .optional(),
});

export const VerbBlock = z.strictObject({
  separable: z.string().min(1).optional(),
  auxiliary: z.enum(['haben', 'sein']),
  reflexive: z.boolean(),
  parts: z.strictObject({
    praesens_3sg: z.string().min(1),
    praeteritum: z.string().min(1),
    partizip2: z.string().min(1),
  }),
});

export const AdjectiveBlock = z.strictObject({
  gradable: z.boolean(),
  comparative: z.string().min(1).optional(),
  superlative: z.string().min(1).optional(),
});

export const PhraseBlock = z.strictObject({
  register: z.enum(['formal', 'informal', 'neutral']).optional(),
  literal: z.string().optional(),
});

export const Example = z.strictObject({
  de: z.string().min(1),
  en: z.string().min(1),
  tags: z.array(z.string()),
});

export const RecordType = z.enum(['noun', 'verb', 'adjective', 'phrase']);
export const Status = z.enum(['raw', 'enriched', 'reviewed']);

export const RecordBase = z.strictObject({
  id: z.string().min(1),
  type: RecordType,
  lemma: z.string().min(1),
  gloss: z.array(z.string().min(1)).min(1),
  categories: z.array(z.string()).optional(),
  status: Status,
  source_lines: z.array(z.number().int().min(1)).min(1),
  government: z.string().optional(),
  abbreviation: z.string().optional(),
  source_note: z.string().optional(),
  noun: NounBlock.optional(),
  verb: VerbBlock.optional(),
  adjective: AdjectiveBlock.optional(),
  phrase: PhraseBlock.optional(),
  examples: z.array(Example).optional(),
});

export type VocabRecord = z.infer<typeof RecordBase>;
export type ExampleT = z.infer<typeof Example>;
export type NounBlockT = z.infer<typeof NounBlock>;
export type VerbBlockT = z.infer<typeof VerbBlock>;
export type AdjectiveBlockT = z.infer<typeof AdjectiveBlock>;

export const RecordSchema = RecordBase.superRefine((r, ctx) => {
  for (const message of checkEnriched(r)) ctx.addIssue({ code: 'custom', message });
});
