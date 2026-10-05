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

export const ListSchema = z
  .strictObject({
    schema: z.literal(1),
    list: ListHeader,
    categories: z.array(Category).optional(),
    records: z.array(RecordBase),
  })
  .superRefine((l, ctx) => {
    const declared = new Set<string>();
    (l.categories ?? []).forEach((c, i) => {
      if (declared.has(c.id))
        ctx.addIssue({ code: 'custom', message: `duplicate category id '${c.id}'`, path: ['categories', i] });
      declared.add(c.id);
    });
    const seen = new Set<string>();
    l.records.forEach((r, i) => {
      const add = (message: string) => ctx.addIssue({ code: 'custom', message, path: ['records', i] });
      if (seen.has(r.id)) add(`duplicate id '${r.id}'`);
      seen.add(r.id);
      for (const c of r.categories ?? []) if (!declared.has(c)) add(`undeclared category '${c}'`);
      if (declared.size > 0 && (r.categories ?? []).length === 0)
        add('record needs at least one category (the list declares categories)');
      for (const message of checkEnriched(r, l.list.rules)) add(message);
    });
  });

export type VocabList = z.infer<typeof ListSchema>;
