import { describe, expect, it } from 'vitest';
import { grade } from '../../src/srs/grade';
import type { RecordStats } from '../../src/engine/world';

const s = (p: Partial<RecordStats>): RecordStats => ({ typos: 0, expectedChars: 10, activeMs: 10_000, escaped: false, ...p });

describe('grade (R1)', () => {
  it.each([
    ['escaped with 0 typos', s({ escaped: true }), 'Again'],
    ['escaped beats a fast clean run', s({ escaped: true, activeMs: 1000 }), 'Again'],
    ['typo rate 0.11', s({ typos: 11, expectedChars: 100 }), 'Hard'],
    ['typo rate exactly 0.10', s({ typos: 1, expectedChars: 10 }), 'Good'],
    ['0 typos at exactly 2.5 cps', s({ expectedChars: 25, activeMs: 10_000 }), 'Good'],
    ['0 typos at 2.6 cps', s({ expectedChars: 26, activeMs: 10_000 }), 'Easy'],
    ['1 typo at 4 cps', s({ typos: 1, expectedChars: 40, activeMs: 10_000 }), 'Good'],
    ['activeMs 0 counts as fast', s({ activeMs: 0 }), 'Easy'],
    ['activeMs 0 with typos is not Easy', s({ activeMs: 0, typos: 1, expectedChars: 20 }), 'Good'],
  ] as const)('%s', (_n, stats, expected) => {
    expect(grade(stats)).toBe(expected);
  });
});
