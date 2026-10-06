import { z } from 'zod';
import type { Pace } from '../engine/pace';
import type { StoredCard } from './store';

export const FORMAT = 'the-typist-progress';
export const VERSION = 1;

/** Everything a progress file holds (the card store's part, plus the typing-rate estimate). */
export interface ProgressData {
  cards: { listId: string; recordId: string; stored: StoredCard }[];
  newCounts: { listId: string; day: string; count: number }[];
  pace?: Pace;
}

export interface ImportReport {
  /** Cards written (new or replacing a local one). */
  imported: number;
  /** Of those, the ones that replaced a local card. */
  replaced: number;
}

const isoDate = z
  .string()
  .refine((s) => !Number.isNaN(Date.parse(s)), 'not a valid date')
  .transform((s) => new Date(s));
const num = z.number().finite();

const CardSchema = z.strictObject({
  due: isoDate,
  // a never-graded card has stability 0 and difficulty 0
  stability: num.min(0),
  difficulty: num.min(0),
  elapsed_days: num.min(0),
  scheduled_days: num.min(0),
  learning_steps: z.number().int().min(0),
  reps: z.number().int().min(0),
  lapses: z.number().int().min(0),
  state: z.number().int().min(0).max(3),
  last_review: isoDate.optional(),
});

const File = z.strictObject({
  format: z.literal(FORMAT, { error: `not a ${FORMAT} file` }),
  version: z.literal(VERSION, { error: `unsupported version (this game reads version ${VERSION})` }),
  exportedAt: isoDate,
  cards: z.array(
    z.strictObject({
      listId: z.string().min(1),
      recordId: z.string().min(1),
      stored: z.strictObject({
        card: CardSchema,
        seen: z.number().int().min(0),
        typos: z.number().int().min(0),
        escapes: z.number().int().min(0),
      }),
    }),
  ),
  newCounts: z.array(z.strictObject({ listId: z.string().min(1), day: z.string().min(1), count: z.number().int().min(0) })),
  pace: z.strictObject({ spc: num.positive(), chars: num.min(0) }).optional(),
});

const DAY = 24 * 3600 * 1000;

export type ParseResult = { ok: true; data: ProgressData } | { ok: false; reason: string };

/** The file's text; dates are ISO strings. */
export function serializeProgress(data: ProgressData, exportedAt: Date): string {
  const iso = (d: Date | undefined) => d?.toISOString();
  return JSON.stringify(
    {
      format: FORMAT,
      version: VERSION,
      exportedAt: exportedAt.toISOString(),
      cards: data.cards.map(({ listId, recordId, stored }) => ({
        listId,
        recordId,
        stored: { ...stored, card: { ...stored.card, due: iso(stored.card.due), last_review: iso(stored.card.last_review) } },
      })),
      newCounts: data.newCounts,
      ...(data.pace ? { pace: { spc: data.pace.spc, chars: data.pace.chars } } : {}),
    },
    null,
    1,
  );
}

/** Validates the whole file before anything is written; the reason is readable. */
export function parseProgress(text: string, now: Date = new Date()): ParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, reason: 'the file is not valid JSON' };
  }
  const res = File.safeParse(raw);
  if (!res.success) {
    const i = res.error.issues[0];
    const where = i.path.length ? `${i.path.join('.')}: ` : '';
    return { ok: false, reason: `${where}${i.message}` };
  }
  const { cards, newCounts, pace, exportedAt } = res.data;
  // a future date would make a card win every later merge
  if (exportedAt.getTime() > now.getTime() + DAY) return { ok: false, reason: 'exportedAt: the file claims to be from the future' };
  for (const c of cards) {
    const at = c.stored.card.last_review;
    if (at && at.getTime() > exportedAt.getTime() + DAY) {
      return { ok: false, reason: `cards.${c.listId}/${c.recordId}: last_review is in the future` };
    }
  }
  return { ok: true, data: { cards: dedupeCards(cards as ProgressData['cards']), newCounts: dedupeCounts(newCounts), ...(pace ? { pace } : {}) } };
}

/** One entry per card: the latest last_review wins, ties keep the first. */
function dedupeCards(cards: ProgressData['cards']): ProgressData['cards'] {
  const by = new Map<string, ProgressData['cards'][number]>();
  for (const c of cards) {
    const k = JSON.stringify([c.listId, c.recordId]);
    const prev = by.get(k);
    if (!prev || reviewedAt(c.stored) > reviewedAt(prev.stored)) by.set(k, prev ? { ...c } : c);
  }
  return [...by.values()];
}

/** One entry per list and day: the largest count. */
function dedupeCounts(counts: ProgressData['newCounts']): ProgressData['newCounts'] {
  const by = new Map<string, ProgressData['newCounts'][number]>();
  for (const c of counts) {
    const k = JSON.stringify([c.listId, c.day]);
    const prev = by.get(k);
    if (!prev || c.count > prev.count) by.set(k, c);
  }
  return [...by.values()];
}

const reviewedAt = (c: StoredCard) => c.card.last_review?.getTime() ?? Number.NEGATIVE_INFINITY;

/** The imported card wins when the local one is missing or was last reviewed earlier; ties keep the local one. */
export function mergeCard(local: StoredCard | undefined, imported: StoredCard): 'import' | 'local' {
  if (!local) return 'import';
  return reviewedAt(imported) > reviewedAt(local) ? 'import' : 'local';
}

/** Daily new-card counts take the larger value. */
export const mergeCount = (local: number, imported: number): number => Math.max(local, imported);

/** The imported estimate when it has seen more characters; undefined means keep the local one. */
export function mergePace(local: Pace | undefined, imported: Pace | undefined): Pace | undefined {
  if (!imported) return undefined;
  return !local || imported.chars > local.chars ? imported : undefined;
}
