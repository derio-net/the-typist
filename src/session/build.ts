import type { VocabList } from '../schema/list';
import type { VocabRecord } from '../schema/record';
import type { StoredCard } from '../srs/store';

/** Records per wave, at most. */
export const WAVE_SIZE = 6;

export type Rng = () => number;
export type Empty = 'no-playable' | 'nothing-due';
export type Built = { waves: VocabRecord[][]; empty?: undefined } | { waves?: undefined; empty: Empty };

/** mulberry32 as a `() => [0, 1)` generator. */
export function seededRng(seed: number): Rng {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher-Yates over a copy. */
export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const chunk = <T>(items: readonly T[], size = WAVE_SIZE): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
};

/** Raw records are never played. */
export const isPlayable = (r: VocabRecord): boolean => r.status === 'enriched' || r.status === 'reviewed';

const hasCategories = (list: VocabList): boolean => (list.categories ?? []).length > 0;

/** R2: due cards plus never-graded records (up to the remaining daily cap), grouped by primary category. */
export function buildStudy(
  list: VocabList, cards: Record<string, StoredCard>, newCountToday: number, cap: number, now: Date, rng: Rng,
): Built {
  const playable = list.records.filter(isPlayable);
  if (playable.length === 0) return { empty: 'no-playable' };

  const dueAt = (r: VocabRecord): number | undefined => {
    const c = cards[r.id];
    return c && c.card.due.getTime() <= now.getTime() ? c.card.due.getTime() : undefined;
  };
  let newLeft = Math.max(0, cap - newCountToday);
  const picked: VocabRecord[] = [];
  for (const r of playable) {
    if (dueAt(r) !== undefined) picked.push(r);
    else if (!cards[r.id] && newLeft > 0) {
      picked.push(r);
      newLeft -= 1;
    }
  }
  if (picked.length === 0) return { empty: 'nothing-due' };

  if (!hasCategories(list)) return { waves: chunk(picked).map((w) => shuffle(w, rng)) };

  const byCategory = new Map<string, VocabRecord[]>();
  for (const r of picked) {
    const id = r.categories?.[0] ?? '';
    byCategory.set(id, [...(byCategory.get(id) ?? []), r]);
  }
  const overdue = (id: string) => Math.min(...(byCategory.get(id) ?? []).map((r) => dueAt(r) ?? Infinity));
  const order = new Map((list.categories ?? []).map((c) => [c.id, c.order]));
  const ids = [...byCategory.keys()].sort((a, b) => {
    const [oa, ob] = [overdue(a), overdue(b)];
    if (oa !== ob) return oa === Infinity ? 1 : ob === Infinity ? -1 : oa - ob;
    return (order.get(a) ?? Infinity) - (order.get(b) ?? Infinity);
  });
  return { waves: ids.flatMap((id) => chunk(byCategory.get(id) ?? [])).map((w) => shuffle(w, rng)) };
}

/** R3: every playable record of the category (primary or not), shuffled; the whole list in order when it has no categories. */
export function buildFreePlay(list: VocabList, categoryId: string | null, rng: Rng): Built {
  const playable = list.records.filter(isPlayable);
  if (playable.length === 0) return { empty: 'no-playable' };
  if (!hasCategories(list)) return { waves: chunk(playable) };
  const inCategory = playable.filter((r) => categoryId !== null && (r.categories ?? []).includes(categoryId));
  if (inCategory.length === 0) return { empty: 'no-playable' };
  return { waves: chunk(shuffle(inCategory, rng)) };
}
