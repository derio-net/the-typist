/** Typing-rate estimate: seconds per character and the real characters observed (the prior is not counted). */
export interface Pace { spc: number; chars: number }

/** Characters the starting estimate is worth during calibration. */
const PRIOR_CHARS = 10;
/** Observed characters after which the average turns exponential. */
const CALIBRATION_CHARS = 50;
/** Effective window, in characters, of the exponential average. */
const WINDOW = 50;
const MIN_SPC = 0.05;
const MAX_SPC = 5;
const START_SPC = 0.5;

export function createPace(saved?: Pace): Pace {
  return saved ? { ...saved } : { spc: START_SPC, chars: 0 };
}

/** Folds one destroyed ship (`c` required characters typed in `ms`) into the estimate. */
export function observe(p: Pace, c: number, ms: number): Pace {
  if (c <= 0) return p;
  const sample = Math.min(MAX_SPC, Math.max(MIN_SPC, ms / 1000 / c));
  const a = p.chars < CALIBRATION_CHARS ? c / (PRIOR_CHARS + p.chars + c) : c / (WINDOW + c);
  return { spc: p.spc + a * (sample - p.spc), chars: p.chars + c };
}
