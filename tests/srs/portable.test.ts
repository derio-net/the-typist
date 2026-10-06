import { createEmptyCard, State } from 'ts-fsrs';
import { describe, expect, it } from 'vitest';
import { FORMAT, mergeCard, mergePace, parseProgress, serializeProgress, type ProgressData } from '../../src/srs/portable';
import type { StoredCard } from '../../src/srs/store';

const at = new Date('2026-10-06T10:00:00Z');
const card = (lastReview?: string, seen = 1): StoredCard => {
  const c = createEmptyCard(at);
  if (lastReview) c.last_review = new Date(lastReview);
  return { card: c, seen, typos: 0, escapes: 0 };
};
const data = (): ProgressData => ({
  cards: [{ listId: 'L', recordId: 'a', stored: card('2026-10-01T00:00:00Z', 3) }],
  newCounts: [{ listId: 'L', day: '2026-10-06', count: 4 }],
  pace: { spc: 0.5, chars: 80 },
});

describe('serialize / parse', () => {
  it('writes format, version 1, exportedAt, ISO dates, counts and pace', () => {
    const f = JSON.parse(serializeProgress(data(), at));
    expect(f.format).toBe(FORMAT);
    expect(f.version).toBe(1);
    expect(f.exportedAt).toBe('2026-10-06T10:00:00.000Z');
    expect(f.cards[0].stored.card.last_review).toBe('2026-10-01T00:00:00.000Z');
    expect(f.cards[0].stored.card.due).toBe('2026-10-06T10:00:00.000Z');
    expect(f.newCounts).toEqual([{ listId: 'L', day: '2026-10-06', count: 4 }]);
    expect(f.pace).toEqual({ spc: 0.5, chars: 80 });
  });
  it('round-trips, reviving the dates', () => {
    const res = parseProgress(serializeProgress(data(), at));
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data).toEqual(data());
    expect(res.data.cards[0].stored.card.due).toBeInstanceOf(Date);
    expect(res.data.cards[0].stored.card.state).toBe(State.New);
  });
  it('keeps a card with no last_review', () => {
    const d = data();
    d.cards[0].stored = card();
    const res = parseProgress(serializeProgress(d, at));
    expect(res.ok && res.data.cards[0].stored.card.last_review).toBeUndefined();
  });
  it('pace is optional', () => {
    const d = data();
    delete d.pace;
    const res = parseProgress(serializeProgress(d, at));
    expect(res.ok && res.data.pace).toBeUndefined();
  });
  const bad = (mut: (f: any) => void) => {
    const f = JSON.parse(serializeProgress(data(), at));
    mut(f);
    return parseProgress(JSON.stringify(f));
  };
  it.each([
    ['not JSON', () => parseProgress('{nope'), /JSON/],
    ['wrong format', () => bad((f) => (f.format = 'other')), /not a the-typist-progress file/],
    ['wrong version', () => bad((f) => (f.version = 2)), /version/],
    ['missing cards', () => bad((f) => delete f.cards), /cards/],
    ['bad date', () => bad((f) => (f.cards[0].stored.card.due = 'yesterday')), /date/i],
    ['bad count', () => bad((f) => (f.newCounts[0].count = -1)), /newCounts/],
    ['unknown key', () => bad((f) => (f.extra = 1)), /extra|unrecognized/i],
    ['bad pace', () => bad((f) => (f.pace = { spc: 0, chars: 1 })), /pace/],
  ])('rejects %s with a readable reason', (_n, run, reason) => {
    const res = run();
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toMatch(reason);
  });
});

describe('merge rules', () => {
  it('keeps the imported card when the local one is missing', () => {
    expect(mergeCard(undefined, card('2026-10-01T00:00:00Z'))).toBe('import');
  });
  it('keeps the imported card when the local last_review is older', () => {
    expect(mergeCard(card('2026-10-01T00:00:00Z'), card('2026-10-02T00:00:00Z'))).toBe('import');
  });
  it('keeps the local card when it is newer', () => {
    expect(mergeCard(card('2026-10-03T00:00:00Z'), card('2026-10-02T00:00:00Z'))).toBe('local');
  });
  it('a missing last_review is the oldest', () => {
    expect(mergeCard(card(), card('2026-10-02T00:00:00Z'))).toBe('import');
    expect(mergeCard(card('2026-10-02T00:00:00Z'), card())).toBe('local');
  });
  it('ties keep the local card', () => {
    expect(mergeCard(card('2026-10-02T00:00:00Z'), card('2026-10-02T00:00:00Z'))).toBe('local');
    expect(mergeCard(card(), card())).toBe('local');
  });
  it('the pace is taken when the imported one has more chars', () => {
    expect(mergePace({ spc: 1, chars: 10 }, { spc: 2, chars: 11 })).toEqual({ spc: 2, chars: 11 });
    expect(mergePace({ spc: 1, chars: 10 }, { spc: 2, chars: 10 })).toBeUndefined();
    expect(mergePace({ spc: 1, chars: 10 }, { spc: 2, chars: 3 })).toBeUndefined();
    expect(mergePace(undefined, { spc: 2, chars: 3 })).toEqual({ spc: 2, chars: 3 });
    expect(mergePace({ spc: 1, chars: 10 }, undefined)).toBeUndefined();
  });
});
