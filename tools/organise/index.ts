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

const isReflexive = (r: VocabRecord): boolean => r.verb?.reflexive ?? r.lemma.startsWith('sich ');

/** Identity of a record for duplicate detection; homonyms and reflexive twins get distinct keys. */
function dupeKey(r: VocabRecord): string {
  if (r.type === 'noun') return `noun\u0000${r.lemma}\u0000${r.noun?.gender ?? ''}`;
  if (r.type === 'verb') return `verb\u0000${r.lemma.replace(/^sich /, '')}\u0000${isReflexive(r)}`;
  return `${r.type}\u0000${r.lemma}`;
}

/** Groups of record ids (list order) that look like the same word; only groups of 2+. */
export function findDuplicates(list: OrganiseList): string[][] {
  const groups = new Map<string, string[]>();
  for (const r of list.records) {
    const key = dupeKey(r);
    groups.set(key, [...(groups.get(key) ?? []), r.id]);
  }
  return [...groups.values()].filter((g) => g.length > 1);
}

const BLOCKS = ['noun', 'verb', 'adjective', 'phrase'] as const;
type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Fill null/missing fields of `target` from `src`, recursively; differing non-null scalars are conflicts. */
function fill(target: Obj, src: Obj, path: string, conflicts: string[], id: string): void {
  for (const [k, v] of Object.entries(src)) {
    const t = target[k];
    if (t === null || t === undefined) {
      if (v !== null && v !== undefined) target[k] = structuredClone(v);
    } else if (isObj(t) && isObj(v)) fill(t, v, `${path}.${k}`, conflicts, id);
    else if (v !== null && v !== undefined && !Array.isArray(t) && t !== v) {
      conflicts.push(`${path}.${k} differs (${id}): ${JSON.stringify(t)} vs ${JSON.stringify(v)}`);
    }
  }
}

export interface MergeResult {
  list: OrganiseList;
  conflicts: string[];
}

/**
 * Merge the records named by `group` into the first (its id survives). Type blocks merge field by field;
 * with an enriched/reviewed member, block, examples and source_note come from the most advanced one.
 * Status is capped at `enriched`. On conflicting values nothing is merged and the conflicts are returned.
 */
export function mergeRecords(list: OrganiseList, group: string[]): MergeResult {
  const members = list.records.filter((r) => group.includes(r.id));
  if (members.length < 2) return { list, conflicts: [] };
  const first = members[0];
  const maxRank = Math.max(...members.map((r) => STATUS_RANK[r.status]));
  const base = members.find((r) => STATUS_RANK[r.status] === maxRank) as VocabRecord;
  const advanced = maxRank > 0;
  const merged = structuredClone(first) as Obj;
  const conflicts: string[] = [];
  const ordered = [base, ...members.filter((r) => r !== base)];
  const mergedBlocks: Obj = {};
  for (const m of ordered) {
    for (const k of BLOCKS) {
      const blk = (m as Obj)[k];
      if (!isObj(blk)) continue;
      if (!isObj(mergedBlocks[k])) mergedBlocks[k] = structuredClone(blk);
      else fill(mergedBlocks[k] as Obj, blk, k, conflicts, m.id);
    }
  }
  if (conflicts.length) return { list, conflicts: conflicts.map((c) => `${group.join(' ')}: ${c}`) };
  for (const k of BLOCKS) delete merged[k];
  Object.assign(merged, mergedBlocks);
  const categories = union(first.categories, ...members.slice(1).map((r) => r.categories));
  if (categories.length) merged.categories = categories;
  merged.source_lines = union(...members.map((r) => r.source_lines)).sort((a, b) => a - b);
  const gloss: string[] = [];
  for (const g of members.flatMap((r) => r.gloss).map((x) => x.trim())) {
    if (!gloss.some((e) => e.toLowerCase() === g.toLowerCase())) gloss.push(g);
  }
  merged.gloss = gloss;
  merged.status = maxRank > 1 ? 'enriched' : (STATUSES[maxRank] as string);
  delete merged.examples;
  delete merged.source_note;
  const examples = advanced ? base.examples : members.find((r) => r.examples)?.examples;
  if (examples) merged.examples = structuredClone(examples);
  const note = advanced ? base.source_note : members.find((r) => r.source_note)?.source_note;
  if (note) merged.source_note = note;
  for (const key of ['government', 'abbreviation'] as const) {
    const v = members.find((r) => r[key])?.[key];
    if (v) merged[key] = v;
  }
  const drop = new Set(members.slice(1).map((r) => r.id));
  const records = list.records
    .filter((r) => !drop.has(r.id))
    .map((r) => (r.id === first.id ? (merged as unknown as VocabRecord) : r));
  return { list: { ...list, records }, conflicts: [] };
}

export interface MergeAllResult extends MergeResult {
  merged: string[][];
  skipped: string[][];
}

/** Merge every duplicate group, except groups with conflicts (reported) or containing a `skip` id. */
export function mergeAllDuplicates(list: OrganiseList, skip: string[] = []): MergeAllResult {
  let cur = list;
  const out: MergeAllResult = { list, conflicts: [], merged: [], skipped: [] };
  for (const g of findDuplicates(list)) {
    if (g.some((id) => skip.includes(id))) {
      out.skipped.push(g);
      continue;
    }
    const res = mergeRecords(cur, g);
    if (res.conflicts.length) {
      out.conflicts.push(...res.conflicts);
      out.skipped.push(g);
    } else {
      cur = res.list;
      out.merged.push(g);
    }
  }
  out.list = cur;
  return out;
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
  /** raw/total per primary category, in category `order`; records without a category are under id ''. */
  categories: { id: string; order: number; raw: number; total: number }[];
}

export function stats(list: OrganiseList): Stats {
  const out: Stats = {
    total: list.records.length,
    status: { raw: 0, enriched: 0, reviewed: 0 },
    type: { noun: 0, verb: 0, adjective: 0, phrase: 0 },
    categories: [],
  };
  const order = new Map((list.categories ?? []).map((c) => [c.id, c.order]));
  const perCat = new Map<string, { id: string; order: number; raw: number; total: number }>();
  for (const c of list.categories ?? []) perCat.set(c.id, { id: c.id, order: c.order, raw: 0, total: 0 });
  for (const r of list.records) {
    out.status[r.status]++;
    out.type[r.type]++;
    const id = r.categories?.[0] ?? '';
    const c = perCat.get(id) ?? { id, order: order.get(id) ?? Number.MAX_SAFE_INTEGER, raw: 0, total: 0 };
    perCat.set(id, c);
    c.total++;
    if (r.status === 'raw') c.raw++;
  }
  out.categories = [...perCat.values()].sort((a, b) => a.order - b.order);
  return out;
}
