import { describe, expect, it } from 'vitest';
import { createTyping, step, type TypingEvent, type TypingState } from '../../src/engine/typing';

interface S { id: string; text: string; y?: number; rec?: string }

function make(ships: S[]): TypingState {
  return createTyping(ships.map((s) => ({ id: s.id, recordId: s.rec ?? 'r-' + s.id, text: s.text, y: s.y ?? 0 })));
}

function run(state: TypingState, chars: string, t0 = 100): { state: TypingState; events: TypingEvent[] } {
  const events: TypingEvent[] = [];
  let now = t0;
  for (const c of chars) {
    const r = step(state, c, now);
    state = r.state;
    events.push(...r.events);
    now += 10;
  }
  return { state, events };
}
const kinds = (e: TypingEvent[]) => e.map((x) => x.type);
const ship = (s: TypingState, id: string) => s.ships.find((x) => x.id === id)!;

describe('target lock', () => {
  it('locks the closest (largest y) matching ship on the first char', () => {
    const { state, events } = run(make([{ id: 'far', text: 'Haus', y: 10 }, { id: 'near', text: 'Hund', y: 50 }]), 'H');
    expect(state.lock).toBe('near');
    expect(kinds(events)).toEqual(['lock', 'hit']);
  });
  it('skips closer ships that do not match', () => {
    const { state } = run(make([{ id: 'a', text: 'Hund', y: 90 }, { id: 'b', text: 'Auto', y: 10 }]), 'A');
    expect(state.lock).toBe('b');
  });
  it('after lock, chars go only to the locked ship; a non-match is a typo, no progress', () => {
    const { state, events } = run(make([{ id: 'a', text: 'Hund', y: 90 }, { id: 'b', text: 'Hase', y: 10 }]), 'Hax');
    expect(state.lock).toBe('a');
    expect(ship(state, 'a').pos).toBe(1);
    expect(ship(state, 'b').pos).toBe(0);
    expect(kinds(events)).toEqual(['lock', 'hit', 'typo', 'typo']);
    expect(state.typos['r-a']).toBe(2);
  });
  it('ignores a char matching no ship when unlocked (no typo)', () => {
    const { state, events } = run(make([{ id: 'a', text: 'Hund' }]), 'x');
    expect(state.lock).toBeNull();
    expect(events).toEqual([]);
    expect(state.typos).toEqual({});
  });
  it('is case sensitive', () => {
    const { state } = run(make([{ id: 'a', text: 'Hund' }]), 'h');
    expect(state.lock).toBeNull();
  });
  it('destroys the ship, emits timestamps and releases the lock', () => {
    const { state, events } = run(make([{ id: 'a', text: 'Ab' }]), 'Ab', 1000);
    expect(state.ships).toEqual([]);
    expect(state.lock).toBeNull();
    const d = events.find((e) => e.type === 'destroyed')!;
    expect(d).toMatchObject({ shipId: 'a', recordId: 'r-a', lockAt: 1000, destroyedAt: 1010, expectedChars: 2, typos: 0 });
  });
});

describe('equivalences', () => {
  it.each([
    ['Börse', 'Börse'], ['Börse', 'Boerse'], ['Ärger', 'Ärger'], ['Ärger', 'Aerger'],
    ['Straße', 'Straße'], ['Straße', 'Strasse'], ['Müll', 'Muell'], ['über', 'ueber'],
    ['Ste’ll', "Ste'll"], ['„Ja“ x', '"Ja" x'], ['A – B', 'A - B'], ['CO₂-x', 'CO2-x'],
  ])('%s accepts %s', (text, typed) => {
    const { state, events } = run(make([{ id: 'a', text }]), typed);
    expect(state.ships).toEqual([]);
    expect(kinds(events)).not.toContain('typo');
    expect(kinds(events).at(-1)).toBe('destroyed');
  });

  it('after the first half of a digraph only the second half is accepted; a wrong char is a typo and keeps pending', () => {
    let r = run(make([{ id: 'a', text: 'Börse' }]), 'Bo');
    expect(ship(r.state, 'a').pending).toBe('o');
    expect(ship(r.state, 'a').pos).toBe(1);
    r = run(r.state, 'r');
    expect(kinds(r.events)).toEqual(['typo']);
    expect(ship(r.state, 'a').pending).toBe('o');
    r = run(r.state, 'e');
    expect(ship(r.state, 'a').pos).toBe(2);
    expect(ship(r.state, 'a').pending).toBe('');
  });

  it("'Ae' is required for a capital Ä; 'ae' is a typo", () => {
    const { state } = run(make([{ id: 'a', text: 'Ä' + 'x' }]), 'Aa');
    expect(ship(state, 'a').pending).toBe('A');
    expect(state.typos['r-a']).toBe(1);
  });
});

describe('punctuation', () => {
  it.each(['Er kommt.', 'Wirklich?', 'Nein!', 'Er kommt…', 'Sie sagt „Nein.“', 'Er sagt »Nein«', 'Sie sagt „Nein”', 'Er sagt "Nein"'])('%s trailing punctuation is pre-typed', (text) => {
    const stripped = text.replace(/[.!?…“”«»"]+$/u, '');
    const { state, events } = run(make([{ id: 'a', text }]), stripped);
    expect(state.ships).toEqual([]);
    expect(kinds(events).at(-1)).toBe('destroyed');
  });
  it('mid-sentence comma must be typed', () => {
    const { state } = run(make([{ id: 'a', text: 'Ja, gut.' }]), 'Ja ');
    expect(ship(state, 'a').pos).toBe(2);
    expect(state.typos['r-a']).toBe(1);
  });
  it('expectedChars excludes pre-typed punctuation', () => {
    const { events } = run(make([{ id: 'a', text: 'Er kommt.' }]), 'Er kommt');
    expect(events.find((e) => e.type === 'destroyed')).toMatchObject({ expectedChars: 8 });
  });
});

import { matchChar, type Match } from '../../src/engine/typing';

describe('matchChar', () => {
  it.each<[string, string, string, Match]>([
    ['a', '', 'a', 'advance'],
    ['a', '', 'b', 'miss'],
    ['ä', '', 'ä', 'advance'],
    ['ä', '', 'a', 'pending'],
    ['ä', 'a', 'e', 'advance'],
    ['ä', 'a', 'a', 'miss'],
    ['Ä', '', 'A', 'pending'],
    ['Ä', 'A', 'e', 'advance'],
    ['Ä', '', 'a', 'miss'],
    ['ß', '', 's', 'pending'],
    ['ß', 's', 's', 'advance'],
    ['ß', 's', 'e', 'miss'],
    ['’', '', "'", 'advance'],
    ['„', '', '"', 'advance'],
    ['–', '', '-', 'advance'],
    ['₂', '', '2', 'advance'],
    ['b', 'a', 'b', 'miss'],
    ['ö', 'o', 'ö', 'advance'],
    ['ä', 'a', 'ä', 'advance'],
    ['é', '', 'é', 'advance'],
    ['é', '', 'e', 'advance'],
    ['É', '', 'E', 'advance'],
    ['É', '', 'É', 'advance'],
    ['é', '', 'x', 'miss'],
    ['ç', '', 'c', 'advance'],
  ])('matchChar(%j, pending %j, typed %j) -> %s', (e, p, t, want) => {
    expect(matchChar(e, p, t)).toBe(want);
  });
});

describe('pre-typed closing quotes and brackets (R14)', () => {
  it('a closing ’ and . are pre-typed', () => {
    const r = run(make([{ id: 'a', text: 'Er sagte ‘ja’.' }]), 'Er sagte ‘ja');
    expect(kinds(r.events)).toContain('destroyed');
  });
  it('a closing ) is pre-typed', () => {
    const r = run(make([{ id: 'a', text: '(siehe oben)' }]), '(siehe oben');
    expect(kinds(r.events)).toContain('destroyed');
  });
  it('a mid-sentence ’ still has to be typed', () => {
    const r = run(make([{ id: 'a', text: 'Das ’ja’ sagt er.' }]), 'Das ’ja');
    expect(kinds(r.events)).not.toContain('destroyed');
    expect(ship(r.state, 'a').pos).toBe(7);
  });
});
