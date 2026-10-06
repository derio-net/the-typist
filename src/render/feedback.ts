import { effects } from './theme';

/** How strongly a typo flash shows: 1 at the typo, falling linearly to 0 after `effects.typoFlashMs`. */
export function flashLevel(typoAt: number | undefined, now: number): number {
  if (typoAt === undefined) return 0;
  return Math.min(1, Math.max(0, 1 - (now - typoAt) / effects.typoFlashMs));
}

/**
 * A ship's text in three runs: what is typed, the ASCII prefix pending towards a digraph
 * (shown in place of the letter it stands for, e.g. `o` for `ö`), and the rest.
 */
export function splitText(ship: { text: string; pos: number; pending: string }): { typed: string; pending: string; rest: string } {
  const typed = ship.text.slice(0, ship.pos);
  if (ship.pending === '') return { typed, pending: '', rest: ship.text.slice(ship.pos) };
  return { typed, pending: ship.pending, rest: ship.text.slice(ship.pos + 1) };
}
