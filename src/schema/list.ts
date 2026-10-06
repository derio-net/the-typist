import { z } from 'zod';
import { RecordBase, checkEnriched } from './record';

export const Rules = z.strictObject({
  noun_examples: z.number().int().min(3).optional(),
  verb_examples: z.number().int().min(3).optional(),
  adjective_examples: z.number().int().min(2).optional(),
  phrase_examples: z.number().int().min(2).optional(),
});

export const Category = z.strictObject({
  id: z.string().min(1),
  title: z.string().min(1),
  order: z.number().int(),
});

export const ListHeader = z.strictObject({
  id: z.string().min(1),
  title: z.string().min(1),
  lang: z.string().min(1),
  gloss_lang: z.string().min(1),
  rules: Rules.optional(),
});

/** A list-level problem: `index` is the record it concerns, or null for a category. */
export interface ListIssue { index: number; message: string; where: 'records' | 'categories' }

/** List-level checks (unique ids, declared categories, categorised records) shared by `ListSchema` and `parseList`. */
export function checkListLevel(
  categories: readonly { id: string }[],
  records: readonly { id: string; categories?: string[] | undefined }[],
): ListIssue[] {
  const out: ListIssue[] = [];
  const declared = new Set<string>();
  categories.forEach((c, i) => {
    if (declared.has(c.id)) out.push({ where: 'categories', index: i, message: `duplicate category id '${c.id}'` });
    declared.add(c.id);
  });
  const seen = new Set<string>();
  records.forEach((r, i) => {
    const add = (message: string) => out.push({ where: 'records', index: i, message });
    if (seen.has(r.id)) add(`duplicate id '${r.id}'`);
    seen.add(r.id);
    for (const c of r.categories ?? []) if (!declared.has(c)) add(`undeclared category '${c}'`);
    if (declared.size > 0 && (r.categories ?? []).length === 0)
      add('record needs at least one category (the list declares categories)');
  });
  return out;
}

export const ListSchema = z
  .strictObject({
    schema: z.literal(1),
    list: ListHeader,
    categories: z.array(Category).optional(),
    records: z.array(RecordBase),
  })
  .superRefine((l, ctx) => {
    for (const { where, index, message } of checkListLevel(l.categories ?? [], l.records))
      ctx.addIssue({ code: 'custom', message, path: [where, index] });
    l.records.forEach((r, i) => {
      for (const message of checkEnriched(r, l.list.rules)) ctx.addIssue({ code: 'custom', message, path: ['records', i] });
    });
  });

export type VocabList = z.infer<typeof ListSchema>;
