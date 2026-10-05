import type { VocabRecord } from '../../src/schema/index';

/** The slice of a list file the organise helpers read and write. */
export interface OrganiseList {
  categories?: { id: string; title: string; order: number }[];
  records: VocabRecord[];
}

const STATUS_RANK = { raw: 0, enriched: 1, reviewed: 2 } as const;
const STATUSES = ['raw', 'enriched', 'reviewed'] as const;
const TYPES = ['noun', 'verb', 'adjective', 'phrase'] as const;

const union = <T>(...lists: (T[] | undefined)[]): T[] => [...new Set(lists.flatMap((l) => l ?? []))];

/** Groups of record ids (list order) sharing type and lemma; only groups of 2+. */
export function findDuplicates(list: OrganiseList): string[][] {
  const groups = new Map<string, string[]>();
  for (const r of list.records) {
    const key = `${r.type}\u0000${r.lemma}`;
    groups.set(key, [...(groups.get(key) ?? []), r.id]);
  }
  return [...groups.values()].filter((g) => g.length > 1);
}

/** Merge the records named by `group` into the first; returns a new list. */
export function mergeRecords(list: OrganiseList, group: string[]): OrganiseList {
  const members = list.records.filter((r) => group.includes(r.id));
  if (members.length < 2) return list;
  const [first, ...rest] = members;
  const merged: VocabRecord = { ...first };
  const categories = union(first.categories, ...rest.map((r) => r.categories));
  if (categories.length) merged.categories = categories;
  merged.source_lines = union(first.source_lines, ...rest.map((r) => r.source_lines)).sort((a, b) => a - b);
  merged.gloss = union(first.gloss, ...rest.map((r) => r.gloss));
  merged.status = members.reduce((s, r) => (STATUS_RANK[r.status] > STATUS_RANK[s] ? r.status : s), first.status);
  for (const r of rest) {
    for (const [k, v] of Object.entries(r)) {
      if (!(k in merged) && v !== undefined) (merged as Record<string, unknown>)[k] = v;
    }
  }
  const drop = new Set(rest.map((r) => r.id));
  return { ...list, records: list.records.filter((r) => !drop.has(r.id)).map((r) => (r.id === first.id ? merged : r)) };
}

/** Merge every duplicate group. */
export function mergeAllDuplicates(list: OrganiseList): OrganiseList {
  return findDuplicates(list).reduce(mergeRecords, list);
}

/** First n raw record ids, by primary-category order then list order. */
export function nextBatch(list: OrganiseList, n = 25, category?: string): string[] {
  const order = new Map((list.categories ?? []).map((c) => [c.id, c.order]));
  const rank = (r: VocabRecord) => order.get(r.categories?.[0] ?? '') ?? Number.MAX_SAFE_INTEGER;
  return list.records
    .map((r, i) => ({ r, i }))
    .filter(({ r }) => r.status === 'raw' && (category === undefined || r.categories?.[0] === category))
    .sort((a, b) => rank(a.r) - rank(b.r) || a.i - b.i)
    .slice(0, n)
    .map(({ r }) => r.id);
}

export interface Stats {
  total: number;
  status: Record<(typeof STATUSES)[number], number>;
  type: Record<(typeof TYPES)[number], number>;
}

export function stats(list: OrganiseList): Stats {
  const out: Stats = {
    total: list.records.length,
    status: { raw: 0, enriched: 0, reviewed: 0 },
    type: { noun: 0, verb: 0, adjective: 0, phrase: 0 },
  };
  for (const r of list.records) {
    out.status[r.status]++;
    out.type[r.type]++;
  }
  return out;
}
