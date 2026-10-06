import type { Pace } from '../engine/pace';

export const PACE_KEY = 'typist.pace';

/** The saved typing-rate estimate; undefined when missing, corrupt, of the wrong type or the storage is blocked. */
export function loadPace(storage?: Storage): Pace | undefined {
  try {
    const text = (storage ?? globalThis.localStorage)?.getItem(PACE_KEY);
    if (!text) return undefined;
    const raw: unknown = JSON.parse(text);
    if (typeof raw !== 'object' || raw === null) return undefined;
    const { spc, chars } = raw as Record<string, unknown>;
    if (typeof spc !== 'number' || !Number.isFinite(spc) || spc <= 0) return undefined;
    if (typeof chars !== 'number' || !Number.isFinite(chars) || chars < 0) return undefined;
    return { spc, chars };
  } catch {
    return undefined;
  }
}

/** Saves the estimate; a blocked storage is ignored (the estimate then lasts for this page only). */
export function savePace(p: Pace, storage?: Storage): void {
  try {
    (storage ?? globalThis.localStorage)?.setItem(PACE_KEY, JSON.stringify({ spc: p.spc, chars: p.chars }));
  } catch {
    /* nothing to do */
  }
}
