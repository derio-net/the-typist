import { Rating, createEmptyCard, fsrs, type Card } from 'ts-fsrs';
import type { Grade } from './grade';

export type { Card };

const scheduler = fsrs();

const RATINGS = { Again: Rating.Again, Hard: Rating.Hard, Good: Rating.Good, Easy: Rating.Easy } as const;

export const ratingOf = (g: Grade) => RATINGS[g];

/** The card after grading: a never-graded Record starts from a fresh empty card. */
export function schedule(card: Card | undefined, g: Grade, now: Date): Card {
  return scheduler.next(card ?? createEmptyCard(now), now, RATINGS[g]).card;
}
