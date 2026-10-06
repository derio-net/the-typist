import type { RecordStats } from '../engine/world';

export type Grade = 'Again' | 'Hard' | 'Good' | 'Easy';

/** Typo rate above this is Hard (exactly this is still Good). */
export const HARD_TYPO_RATE = 0.1;
/** A clean run faster than this many characters per second is Easy (exactly this is Good). */
export const EASY_CPS = 2.5;

/** R1: Again if any ship escaped; else Hard on a high typo rate; else Easy when clean and fast; else Good. */
export function grade(stats: RecordStats): Grade {
  if (stats.escaped) return 'Again';
  if (stats.expectedChars > 0 && stats.typos / stats.expectedChars > HARD_TYPO_RATE) return 'Hard';
  if (stats.typos === 0 && isFast(stats)) return 'Easy';
  return 'Good';
}

function isFast({ expectedChars, activeMs }: RecordStats): boolean {
  if (expectedChars <= 0) return false;
  if (activeMs <= 0) return true;
  return expectedChars / (activeMs / 1000) > EASY_CPS;
}
