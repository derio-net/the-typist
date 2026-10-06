import { describe, expect, it } from 'vitest';
import { flashLevel, splitText } from '../../src/render/feedback';
import { theme } from '../../src/render/theme';

describe('flashLevel', () => {
  const ms = theme.effects.typoFlashMs;
  it('is 1 at the typo and decays to 0 after typoFlashMs', () => {
    expect(flashLevel(1000, 1000)).toBe(1);
    expect(flashLevel(1000, 1000 + ms / 2)).toBeCloseTo(0.5, 9);
    expect(flashLevel(1000, 1000 + ms)).toBe(0);
    expect(flashLevel(1000, 1000 + 10 * ms)).toBe(0);
  });
  it('is 0 with no typo recorded', () => {
    expect(flashLevel(undefined, 5000)).toBe(0);
  });
});

describe('splitText', () => {
  it('splits typed, pending and the rest, skipping the letter the pending prefix stands for', () => {
    expect(splitText({ text: 'Börse', pos: 1, pending: 'o' })).toEqual({ typed: 'B', pending: 'o', rest: 'rse' });
  });
  it('has an empty pending when nothing is pending', () => {
    expect(splitText({ text: 'Börse', pos: 1, pending: '' })).toEqual({ typed: 'B', pending: '', rest: 'örse' });
    expect(splitText({ text: 'Börse', pos: 0, pending: '' })).toEqual({ typed: '', pending: '', rest: 'Börse' });
  });
});
