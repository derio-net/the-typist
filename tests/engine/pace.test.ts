import { describe, expect, it } from 'vitest';
import { createPace, observe } from '../../src/engine/pace';

describe('createPace', () => {
  it('starts at 0.5 s/char with nothing observed', () => {
    expect(createPace()).toEqual({ spc: 0.5, chars: 0 });
  });
  it('returns a saved estimate', () => {
    expect(createPace({ spc: 0.3, chars: 80 })).toEqual({ spc: 0.3, chars: 80 });
  });
});

describe('observe', () => {
  it('weights the first sample against a 10-character prior', () => {
    const p = observe(createPace(), 10, 1000); // sample 0.1; a = 10/20
    expect(p.spc).toBeCloseTo(0.3, 10);
    expect(p.chars).toBe(10);
  });
  it('calibrates as a cumulative average with the prior until 50 characters', () => {
    let p = createPace();
    const samples: [number, number][] = [[10, 1000], [10, 2000], [10, 1500], [10, 500]];
    for (const [c, ms] of samples) p = observe(p, c, ms);
    // prior: 10 chars at 0.5; then 40 chars with total time 5 s
    expect(p.spc).toBeCloseTo((10 * 0.5 + 5) / 50, 10);
    expect(p.chars).toBe(40);
  });
  it('switches to an exponential window of 50 after 50 characters', () => {
    const p = observe({ spc: 0.4, chars: 50 }, 10, 1000); // a = 10/60
    expect(p.spc).toBeCloseTo(0.4 + (10 / 60) * (0.1 - 0.4), 10);
    expect(p.chars).toBe(60);
  });
  it('clamps a sample to 0.05-5 s/char', () => {
    expect(observe({ spc: 0.5, chars: 50 }, 50, 1).spc).toBeCloseTo(0.5 + 0.5 * (0.05 - 0.5), 10);
    expect(observe({ spc: 0.5, chars: 50 }, 50, 10 ** 6).spc).toBeCloseTo(0.5 + 0.5 * (5 - 0.5), 10);
  });
  it('leaves the estimate unchanged for 0 characters', () => {
    const p = { spc: 0.4, chars: 7 };
    expect(observe(p, 0, 1000)).toEqual(p);
  });
});
