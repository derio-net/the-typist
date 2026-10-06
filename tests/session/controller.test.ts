import { readFileSync } from 'node:fs';
import { createEmptyCard } from 'ts-fsrs';
import { describe, expect, it } from 'vitest';
import { advance, typeChar, type RecordStats, type World, type WorldEvent } from '../../src/engine/world';
import { createController, type SessionEvent, type SessionMode } from '../../src/session/controller';
import { parseList, type VocabRecord } from '../../src/schema';
import { createMemoryStore, localDay, withGrade } from '../../src/srs/store';

const now = new Date('2026-10-06T10:00:00Z');
const rec = (id: string): VocabRecord =>
  ({ id, type: 'phrase', lemma: id, gloss: ['g'], status: 'enriched', source_lines: [1] }) as VocabRecord;
const stats = (p: Partial<RecordStats> = {}): RecordStats => ({ typos: 0, expectedChars: 10, activeMs: 10_000, escaped: false, ...p });
const resolved = (recordId: string, p: Partial<RecordStats> = {}): WorldEvent => ({ type: 'resolved', recordId, stats: stats(p) });

function setup(mode: SessionMode = 'study', waves = [[rec('a'), rec('b')], [rec('c')]]) {
  const store = createMemoryStore();
  const events: SessionEvent[] = [];
  const c = createController({ waves, store, listId: 'L', mode, now: () => now, worldOptions: { width: 700, aids: { chip: false } } });
  c.subscribe((e) => events.push(e));
  return { c, store, events };
}

describe('session controller (R1-R4)', () => {
  it.each(['study', 'free-play'] as const)('%s: each resolved grades once, writes the store and bumps the new count on a first grade', async (mode) => {
    const { c, store } = setup(mode);
    c.start();
    c.onWorldEvents([resolved('a')], { lives: 3, score: 5 });
    c.onWorldEvents([resolved('a', { typos: 2 })], { lives: 3, score: 5 }); // a repeat is ignored
    await c.flush();
    const a = await store.get('L', 'a');
    expect([a?.seen, a?.card.reps, a?.typos]).toEqual([1, 1, 0]);
    expect(await store.newCount('L', localDay(now))).toBe(1);
    expect(await store.get('L', 'b')).toBeUndefined();
  });

  it('a record graded in an earlier session is not new again', async () => {
    const { c, store } = setup();
    await store.put('L', 'a', withGrade(undefined, createEmptyCard(now), stats()));
    c.start();
    c.onWorldEvents([resolved('a')], { lives: 3, score: 0 });
    await c.flush();
    expect((await store.get('L', 'a'))?.seen).toBe(2);
    expect(await store.newCount('L', localDay(now))).toBe(0);
  });

  it('counts a record on the day it resolved, even when written after midnight', async () => {
    const store = createMemoryStore();
    let t = new Date(2026, 9, 6, 23, 59);
    const c = createController({ waves: [[rec('a')]], store, listId: 'L', mode: 'study', now: () => t });
    c.start();
    c.onWorldEvents([resolved('a')], { lives: 3, score: 0 });
    t = new Date(2026, 9, 7, 0, 1);
    await c.flush();
    expect(await store.newCount('L', '2026-10-06')).toBe(1);
    expect(await store.newCount('L', '2026-10-07')).toBe(0);
    expect((await store.get('L', 'a'))?.card.last_review).toEqual(new Date(2026, 9, 6, 23, 59));
  });

  it('carries lives and score into the next wave and passes the world options through', () => {
    const { c } = setup();
    const w0 = c.start();
    expect(w0.wave).toBe(0);
    expect(w0.width).toBe(700);
    expect(w0.aids.chip).toBe(false);
    c.onWorldEvents([{ type: 'wave-complete' }], { lives: 2, score: 120 });
    const w1 = c.nextWave()!;
    expect([w1.wave, w1.lives, w1.score, w1.width]).toEqual([1, 2, 120, 700]);
    expect(Object.keys(w1.records)).toEqual(['c']);
  });

  it('wave-complete emits between-wave with that wave\'s Again/Hard ids, after the last wave too, then summary', async () => {
    const { c, events } = setup();
    c.start();
    c.onWorldEvents(
      [resolved('a', { escaped: true }), resolved('b'), { type: 'wave-complete' }], { lives: 2, score: 10 },
    );
    expect(events).toEqual([{ type: 'between-wave', wave: 0, weak: ['a'], more: true, lives: 2, score: 10 }]);
    c.nextWave();
    c.onWorldEvents([resolved('c', { typos: 5, expectedChars: 10 }), { type: 'wave-complete' }], { lives: 2, score: 30 });
    expect(events[1]).toEqual({ type: 'between-wave', wave: 1, weak: ['c'], more: false, lives: 2, score: 30 });
    expect(events).toHaveLength(2);
    expect(c.nextWave()).toBeUndefined();
    await c.flush();
    expect(events[2]).toMatchObject({ type: 'summary', summary: { reason: 'finished', score: 30 } });
    expect(c.ended).toBe(true);
  });

  it('game-over grades the escaped on-screen record Again and ends with a summary', async () => {
    const { c, store, events } = setup();
    c.start();
    c.onWorldEvents([resolved('a', { escaped: true }), { type: 'game-over' }], { lives: 0, score: 7 });
    await c.flush();
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ type: 'summary', summary: { reason: 'game-over', score: 7, lives: 0, counts: { Again: 1 } } });
    expect((await store.get('L', 'a'))?.escapes).toBe(1);
    expect(c.nextWave()).toBeUndefined();
    c.onWorldEvents([resolved('b')], { lives: 0, score: 7 });
    await c.flush();
    expect(await store.get('L', 'b')).toBeUndefined();
  });

  it('quit() ends with a summary and leaves on-screen records ungraded', async () => {
    const { c, store, events } = setup();
    c.start();
    c.onWorldEvents([resolved('a')], { lives: 3, score: 4 });
    c.quit({ lives: 3, score: 9 });
    c.quit();
    await c.flush();
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ type: 'summary', summary: { reason: 'quit', score: 9, graded: 1 } });
    expect(await store.get('L', 'b')).toBeUndefined();
  });

  it('the summary carries counts per grade, accuracy, chars/s and score (escaped and zero-time records excluded from the rates)', async () => {
    const { c, events } = setup('study', [[rec('a'), rec('b'), rec('c'), rec('d'), rec('e')]]);
    c.start();
    c.onWorldEvents(
      [
        resolved('a', { escaped: true, typos: 50, expectedChars: 50, activeMs: 1000 }), // counted, but not in the rates
        resolved('b', { typos: 10, expectedChars: 40 }), // Hard, 10 s
        resolved('c', { expectedChars: 20, activeMs: 4000 }), // 5 cps: Easy
        resolved('d', { expectedChars: 30, activeMs: 16_000 }), // Good
        resolved('e', { expectedChars: 99, activeMs: 0 }), // Easy, but no time: not in chars/s
      ],
      { lives: 2, score: 250 },
    );
    c.quit();
    await c.flush();
    const { summary } = events[0] as Extract<SessionEvent, { type: 'summary' }>;
    expect(summary.counts).toEqual({ Again: 1, Hard: 1, Good: 1, Easy: 2 });
    // accuracy: right chars / typed chars over non-escaped records = 189 / 199
    expect(summary.accuracy).toBeCloseTo(189 / 199);
    // chars/s: non-escaped records with time = 90 chars / 30 s
    expect(summary.charsPerSecond).toBeCloseTo(3);
    expect(summary.score).toBe(250);
    expect(summary.mode).toBe('study');
  });

  it('emits the summary only after every write landed', async () => {
    const { c, store, events } = setup();
    let seen = -1;
    c.subscribe(async (e) => {
      if (e.type === 'summary') seen = Object.keys(await store.all('L')).length;
    });
    c.start();
    c.onWorldEvents([resolved('a'), resolved('b'), { type: 'game-over' }], { lives: 0, score: 0 });
    expect(events).toHaveLength(0); // writes still pending
    await c.flush();
    expect(events).toHaveLength(1);
    expect(seen).toBe(2);
  });

  it('start() needs waves, and works once', () => {
    const empty = createController({ waves: [], store: createMemoryStore(), listId: 'L', mode: 'study', now: () => now });
    expect(() => empty.start()).toThrow(/no waves/);
    const { c } = setup();
    c.start();
    expect(() => c.start()).toThrow(/already started/);
    const { c: d } = setup();
    d.start();
    d.quit();
    expect(() => d.start()).toThrow(/already/);
  });

  it('a failed store write is counted, reported once, and does not stop later ones', async () => {
    const store = createMemoryStore();
    let fail = true;
    const flaky = { ...store, putGraded: async (...a: Parameters<typeof store.putGraded>) => { if (fail) { fail = false; throw new Error('x'); } return store.putGraded(...a); } };
    const c = createController({ waves: [[rec('a'), rec('b'), rec('c')]], store: flaky, listId: 'L', mode: 'study', now: () => now });
    const events: SessionEvent[] = [];
    c.subscribe((e) => events.push(e));
    c.start();
    c.onWorldEvents([resolved('a'), resolved('b')], { lives: 3, score: 0 });
    await c.flush();
    expect(await store.get('L', 'b')).toBeDefined();
    expect(c.writeErrors).toBe(1);
    expect(events.filter((e) => e.type === 'storage-error')).toHaveLength(1);
    fail = true;
    c.onWorldEvents([resolved('c')], { lives: 3, score: 0 });
    c.quit();
    await c.flush();
    expect(c.writeErrors).toBe(2);
    expect(events.filter((e) => e.type === 'storage-error')).toHaveLength(1);
    expect(events.at(-1)).toMatchObject({ type: 'summary', summary: { writeErrors: 2 } });
  });

  it('drives a real World: typing every ship grades each Record once', async () => {
    const parsed = parseList(readFileSync('tests/fixtures/lists/two-records.yaml', 'utf8'));
    if (!parsed.ok) throw new Error(parsed.errors.join('\n'));
    const { c, store, events } = setup('study', [parsed.list.records]);
    let w: World = c.start();
    for (let guard = 0; w.status === 'playing' && guard < 400; guard++) {
      const ship = w.ships[0];
      const feed = (next: World) => {
        c.onWorldEvents(next.events, next);
        return next;
      };
      for (const ch of ship.text) w = feed(typeChar(feed(advance(w, 100)), ch));
      w = feed(advance(w, 100));
    }
    await c.flush();
    expect(events.some((e) => e.type === 'between-wave')).toBe(true);
    expect(Object.keys(await store.all('L')).sort()).toEqual(parsed.list.records.map((r) => r.id).sort());
  });
});
