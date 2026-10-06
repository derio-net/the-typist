import { describe, expect, it } from 'vitest';
import { Rating } from 'ts-fsrs';
import { ratingOf, schedule } from '../../src/srs/scheduler';

const now = new Date('2026-10-06T10:00:00Z');

describe('scheduler (R1)', () => {
  it('a new card graded Good is due after now with reps 1', () => {
    const c = schedule(undefined, 'Good', now);
    expect(c.due.getTime()).toBeGreaterThan(now.getTime());
    expect(c.reps).toBe(1);
  });
  it('Again is due earlier than Easy', () => {
    expect(schedule(undefined, 'Again', now).due.getTime()).toBeLessThan(schedule(undefined, 'Easy', now).due.getTime());
  });
  it('grades map to ratings 1-4', () => {
    expect(['Again', 'Hard', 'Good', 'Easy'].map((g) => ratingOf(g as never))).toEqual([Rating.Again, Rating.Hard, Rating.Good, Rating.Easy]);
    expect([Rating.Again, Rating.Hard, Rating.Good, Rating.Easy]).toEqual([1, 2, 3, 4]);
  });
  it('reviewing an existing card advances it', () => {
    const first = schedule(undefined, 'Good', now);
    const second = schedule(first, 'Good', first.due);
    expect(second.reps).toBe(2);
  });
});
