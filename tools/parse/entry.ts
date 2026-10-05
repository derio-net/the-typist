import type { VocabRecord } from '../../src/schema/index';
import { slug } from './headers';

export type Reason = 'template' | 'list' | 'slash' | 'und' | 'plural' | 'parenthetical' | 'phrase' | 'word' | 'gloss';

export interface Unresolved {
  line: number;
  text: string;
  reason: Reason;
}

interface Ctx {
  lhs: string;
  gloss: string[];
  line: number;
  text: string;
  category?: string;
}

type Outcome = VocabRecord | Unresolved;
type Matcher = (c: Ctx) => Outcome | null;

export const isUnresolved = (o: Outcome): o is Unresolved => 'reason' in o;

const GENDER = { der: 'm', die: 'f', das: 'n' } as const;
type Article = keyof typeof GENDER;
const isArticle = (s: string): s is Article => s in GENDER;
const CAPITAL = /^[A-ZÄÖÜ]/;

const fail = (c: Ctx, reason: Reason): Unresolved => ({ line: c.line, text: c.text, reason });

/** Split on ', ' outside parentheses. */
export function splitGloss(rhs: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = '';
  for (let i = 0; i < rhs.length; i++) {
    const ch = rhs[i];
    if (ch === '(') depth++;
    if (ch === ')') depth = Math.max(0, depth - 1);
    if (depth === 0 && ch === ',' && rhs[i + 1] === ' ') {
      out.push(cur.trim());
      cur = '';
      i++;
      continue;
    }
    cur += ch;
  }
  out.push(cur.trim());
  return out.filter(Boolean);
}

const deumlaut = (s: string) => s.toLowerCase().replace(/äu/g, 'au').replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/ü/g, 'u');

/** Full plural from the source's `-suffix` / full-form notation, or null when it cannot be built. */
export function buildPlural(lemma: string, form: string): string | null {
  if (!form.startsWith('-')) return CAPITAL.test(form) ? form : null; // `Ämter`, `Museen`
  const s = form.slice(1);
  if (s === '') return lemma; // unchanged
  if (/^(n|e|s|en|se|er|nen)$/.test(s)) return lemma + s;
  if (s === 'men' && lemma.endsWith('mus')) return lemma.slice(0, -3) + 'men'; // Algorithmus
  // replacement tail with umlaut, e.g. `-länder`, `-schläge`: the tail of the lemma, de-umlauted, equals the core
  for (const ending of ['', 'er', 'e', 'en', 'n']) {
    if (!s.endsWith(ending)) continue;
    const core = s.slice(0, s.length - ending.length);
    if (core.length === 0) continue;
    if (lemma.toLowerCase().endsWith(deumlaut(core)) && lemma.length >= core.length)
      return lemma.slice(0, lemma.length - core.length) + s;
  }
  return null;
}

const base = (c: Ctx, type: VocabRecord['type'], lemma: string): VocabRecord => ({
  id: `${type}-${slug(lemma.replace(/^sich /, ''))}`,
  type,
  lemma,
  gloss: c.gloss,
  ...(c.category ? { categories: [c.category] } : {}),
  status: 'raw',
  source_lines: [c.line],
});

// ---- matchers, tried in the spec's table order ------------------------------------------

// shape: template phrase `Sehr geehrte(r)...`, `Darf ich Sie bitten...?` (needs a full typeable phrase)
function templateShape(c: Ctx): Outcome | null {
  return /\.\.\.|…|\([re]\)/.test(c.lhs) ? fail(c, 'template') : null;
}

// shape: a list of three or more '/'-separated items (modal triple, connectors)
function listShape(c: Ctx): Outcome | null {
  return c.lhs.split(' / ').length >= 3 ? fail(c, 'list') : null;
}

const variantLemmaOk = (first: string, second: string): boolean => {
  if (first === second) return true;
  const stem = first.replace(/e$/, '');
  const umlauted = stem.replace(/([aou])([^aou]*)$/, (_m, v: string, rest: string) => ({ a: 'ä', o: 'ö', u: 'ü' })[v]! + rest);
  return [first, stem, umlauted].some((s) => second === s + 'in') || second === first;
};

function dualRecord(c: Ctx, first: Article, second: Article, lemma: string, variant: string): Outcome {
  const r = base(c, 'noun', lemma);
  r.noun = { gender: GENDER[first], plural: null, variants: [{ lemma: variant, gender: GENDER[second] }] };
  return r;
}

// shape: dual gender `der Dozent / die Dozentin`, `der/die Vorgesetzte`; any other two-item slash line is unresolved
function dualGenderShape(c: Ctx): Outcome | null {
  const compact = /^(der|die|das)\/(der|die|das) (\S+)$/.exec(c.lhs);
  if (compact && CAPITAL.test(compact[3])) return dualRecord(c, compact[1] as Article, compact[2] as Article, compact[3], compact[3]);
  const items = c.lhs.split(' / ');
  if (items.length !== 2) return null;
  const a = /^(der|die|das) (\S+)$/.exec(items[0]);
  const b = /^(der|die|das) (\S+)$/.exec(items[1]);
  if (a && b && CAPITAL.test(a[2]) && CAPITAL.test(b[2]) && variantLemmaOk(a[2], b[2]))
    return dualRecord(c, a[1] as Article, b[1] as Article, a[2], b[2]);
  return fail(c, 'slash');
}

// shape: `und` compound `das Angebot und die Nachfrage`
function undShape(c: Ctx): Outcome | null {
  return / und /.test(c.lhs) ? fail(c, 'und') : null;
}

const GOVERNMENT = /^(?:an|auf|aus|bei|durch|für|gegen|in|mit|nach|über|um|von|vor|zu|unter)(?: \+ [AD])?$/;
const ABBREVIATION = /^[A-ZÄÖÜ]{2,}$/;

interface Paren {
  plural_only?: boolean;
  government?: string;
  reflexive?: boolean;
  abbreviation?: string;
}

// shapes: parenthetical `(pl.)`, government `(in)` `(an + D)`, reflexive `(sich)` `(sich mit)`, abbreviation `(KI)`
function parseParen(inner: string): Paren | null {
  if (inner === 'pl.') return { plural_only: true };
  if (GOVERNMENT.test(inner)) return { government: inner };
  if (inner === 'sich') return { reflexive: true };
  const refl = /^sich (.+)$/.exec(inner);
  if (refl && GOVERNMENT.test(refl[1])) return { reflexive: true, government: refl[1] };
  if (ABBREVIATION.test(inner)) return { abbreviation: inner };
  return null;
}

const INFLECTED_ADJECTIVE = /^[a-zäöüß]+(?:e|en|er|es|em)$/;

// shape: article + [adjective] + capitalised noun [+ plural]; plural forms; (pl.)
function nounShape(c: Ctx, head: string, plural: string | undefined, paren: Paren): Outcome | null {
  const tokens = head.split(' ');
  if (!isArticle(tokens[0])) return null;
  if (tokens.length < 2 || tokens.length > 3) return fail(c, 'phrase');
  const last = tokens[tokens.length - 1];
  const middle = tokens.length === 3 ? tokens[1] : null;
  if (!CAPITAL.test(last) || (middle !== null && !INFLECTED_ADJECTIVE.test(middle))) return fail(c, 'phrase');
  if (paren.reflexive) return fail(c, 'parenthetical');
  const lemma = tokens.slice(1).join(' ');
  let pl: string | null = null;
  if (plural !== undefined) {
    if (middle !== null || paren.plural_only) return fail(c, 'plural');
    pl = buildPlural(lemma, plural);
    if (pl === null) return fail(c, 'plural');
  }
  const r = base(c, 'noun', lemma);
  r.noun = { gender: GENDER[tokens[0] as Article], plural: pl, ...(paren.plural_only ? { plural_only: true } : {}) };
  if (paren.government) r.government = paren.government;
  if (paren.abbreviation) r.abbreviation = paren.abbreviation;
  return r;
}

// shape: article-less single word or `sich …`, a verb if it ends in -en/-ern/-eln; `anlegen (in)`, `freuen (sich)`
function verbShape(c: Ctx, head: string, plural: string | undefined, paren: Paren): Outcome | null {
  const tokens = head.split(' ');
  const reflexive = tokens[0] === 'sich' || paren.reflexive === true;
  const words = tokens[0] === 'sich' ? tokens.slice(1) : tokens;
  if (words.length !== 1) return fail(c, 'phrase');
  if (!/(en|ern|eln)$/.test(words[0]) || CAPITAL.test(words[0])) return fail(c, 'word');
  if (plural !== undefined || paren.plural_only || paren.abbreviation) return fail(c, 'parenthetical');
  const r = base(c, 'verb', reflexive ? `sich ${words[0]}` : words[0]);
  if (paren.government) r.government = paren.government;
  return r;
}

// shape: everything with an optional trailing parenthesis and `, <plural>` — dispatches to noun or verb
function wordShape(c: Ctx): Outcome | null {
  let lhs = c.lhs;
  let paren: Paren = {};
  const m = /^(.*\S)\s*\(([^)]*)\)$/.exec(lhs);
  if (m) {
    const p = parseParen(m[2].trim());
    if (!p) return fail(c, 'parenthetical');
    paren = p;
    lhs = m[1];
  }
  const comma = lhs.indexOf(', ');
  const head = comma < 0 ? lhs : lhs.slice(0, comma);
  const plural = comma < 0 ? undefined : lhs.slice(comma + 2).trim();
  if (isArticle(head.split(' ')[0])) return nounShape(c, head, plural, paren);
  return verbShape(c, head, plural, paren);
}

const MATCHERS: Matcher[] = [templateShape, listShape, dualGenderShape, undShape, wordShape];

export function parseEntry(split: { lhs: string; rhs: string }, line: number, text: string, category?: string): Outcome {
  const c: Ctx = { lhs: split.lhs, gloss: splitGloss(split.rhs), line, text, category };
  if (c.gloss.length === 0) return fail(c, 'gloss');
  for (const match of MATCHERS) {
    const out = match(c);
    if (out) return out;
  }
  return fail(c, 'phrase');
}

/** Make ids unique: nouns with distinct genders take a gender suffix, otherwise `-2`, `-3` in source order. */
export function assignIds(records: VocabRecord[]): void {
  const groups = new Map<string, VocabRecord[]>();
  for (const r of records) groups.set(r.id, [...(groups.get(r.id) ?? []), r]);
  for (const [id, group] of groups) {
    if (group.length < 2) continue;
    const genders = group.map((r) => r.noun?.gender);
    if (group[0].type === 'noun' && new Set(genders).size === group.length) {
      group.forEach((r) => (r.id = `${id}-${r.noun!.gender}`));
    } else {
      group.slice(1).forEach((r, i) => (r.id = `${id}-${i + 2}`));
    }
  }
}

