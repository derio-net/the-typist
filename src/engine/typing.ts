import { typedEquivalent } from '../schema/typeable';

const DIGRAPHS: Readonly<Record<string, string>> = {
  ä: 'ae', Ä: 'Ae', ö: 'oe', Ö: 'Oe', ü: 'ue', Ü: 'Ue', ß: 'ss',
};
/** Trailing characters that are pre-typed at spawn. */
const PRETYPED = new Set(['.', '!', '?', '…', '"', '“', '”', '«', '»', '‘', '’', ')']);

export interface TypingShip {
  id: string;
  recordId: string;
  text: string;
  /** Characters the player must type; the rest of `text` is pre-typed trailing punctuation. */
  required: number;
  pos: number;
  /** ASCII prefix already typed towards a digraph (e.g. 'o' for 'ö'). */
  pending: string;
  /** Vertical position; the largest y is closest to the player. */
  y: number;
  typos: number;
  lockAt: number | null;
}

export interface TypingState {
  ships: TypingShip[];
  lock: string | null;
  /** Typos per record id. */
  typos: Record<string, number>;
}

export type TypingEvent =
  | { type: 'lock'; shipId: string; recordId: string; at: number }
  | { type: 'hit'; shipId: string; recordId: string; char: string; advanced: boolean }
  | { type: 'typo'; shipId: string; recordId: string; char: string }
  | {
      type: 'destroyed';
      shipId: string;
      recordId: string;
      lockAt: number;
      destroyedAt: number;
      expectedChars: number;
      typos: number;
    };

export interface ShipInit {
  id: string;
  recordId: string;
  text: string;
  y: number;
}

export function requiredLength(text: string): number {
  let n = text.length;
  while (n > 1 && PRETYPED.has(text[n - 1])) n--;
  return n;
}

export function makeShip(init: ShipInit): TypingShip {
  return { ...init, required: requiredLength(init.text), pos: 0, pending: '', typos: 0, lockAt: null };
}

export function createTyping(ships: ShipInit[] = []): TypingState {
  return { ships: ships.map(makeShip), lock: null, typos: {} };
}

export function addShip(state: TypingState, init: ShipInit): TypingState {
  return { ...state, ships: [...state.ships, makeShip(init)] };
}

export function removeShip(state: TypingState, id: string): TypingState {
  return { ...state, ships: state.ships.filter((s) => s.id !== id), lock: state.lock === id ? null : state.lock };
}

export function setPositions(state: TypingState, ys: Record<string, number>): TypingState {
  return { ...state, ships: state.ships.map((s) => (s.id in ys ? { ...s, y: ys[s.id] } : s)) };
}

export type Match = 'advance' | 'pending' | 'miss';

/**
 * Does `typed` advance `expected`, given the ASCII prefix `pending` already typed
 * towards it? 'pending' means the first half of an ae/oe/ue/ss digraph.
 */
export function matchChar(expected: string, pending: string, typed: string): Match {
  // The exact letter always works, even half-way into its digraph (a pending 'o' then 'ö').
  if (expected === typed && (pending === '' || DIGRAPHS[expected])) return 'advance';
  if (pending === '') {
    if (typedEquivalent(expected, typed)) return 'advance';
    const digraph = DIGRAPHS[expected];
    return digraph && digraph[0] === typed ? 'pending' : 'miss';
  }
  const digraph = DIGRAPHS[expected];
  return digraph && pending + typed === digraph ? 'advance' : 'miss';
}

const matchOf = (expected: string, ship: TypingShip, typed: string): Match => matchChar(expected, ship.pending, typed);

export function step(
  state: TypingState,
  char: string,
  now: number,
): { state: TypingState; events: TypingEvent[] } {
  const events: TypingEvent[] = [];
  let target = state.lock ? state.ships.find((s) => s.id === state.lock) : undefined;
  let lock = target ? target.id : null;

  if (!target) {
    for (const s of state.ships) {
      if (s.pos >= s.required || matchOf(s.text[s.pos], s, char) === 'miss') continue;
      if (!target || s.y > target.y) target = s;
    }
    if (!target) return { state, events };
    lock = target.id;
    events.push({ type: 'lock', shipId: target.id, recordId: target.recordId, at: now });
  }

  const ship = target;
  const result = matchOf(ship.text[ship.pos], ship, char);
  let next: TypingShip = { ...ship, lockAt: ship.lockAt ?? now };
  let typos = state.typos;

  if (result === 'miss') {
    next = { ...next, typos: next.typos + 1 };
    typos = { ...typos, [ship.recordId]: (typos[ship.recordId] ?? 0) + 1 };
    events.push({ type: 'typo', shipId: ship.id, recordId: ship.recordId, char });
  } else if (result === 'pending') {
    next = { ...next, pending: char };
    events.push({ type: 'hit', shipId: ship.id, recordId: ship.recordId, char, advanced: false });
  } else {
    next = { ...next, pos: next.pos + 1, pending: '' };
    events.push({ type: 'hit', shipId: ship.id, recordId: ship.recordId, char, advanced: true });
  }

  if (next.pos >= next.required) {
    events.push({
      type: 'destroyed',
      shipId: next.id,
      recordId: next.recordId,
      lockAt: next.lockAt!,
      destroyedAt: now,
      expectedChars: next.required,
      typos: next.typos,
    });
    return { state: { ships: state.ships.filter((s) => s.id !== next.id), lock: null, typos }, events };
  }
  return { state: { ships: state.ships.map((s) => (s.id === next.id ? next : s)), lock, typos }, events };
}
