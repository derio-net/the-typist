export interface Aids {
  chip: boolean;
  translation: boolean;
  tts: boolean;
  recap: boolean;
}

export interface Settings {
  aids: Aids;
  sfx: boolean;
  music: boolean;
  /** New Records introduced per day by Study, 1-50. */
  newCap: number;
}

export type SettingsPatch = Partial<Omit<Settings, 'aids'>> & { aids?: Partial<Aids> };

export const SETTINGS_KEY = 'typist.settings';
export const NEW_CAP_MIN = 1;
export const NEW_CAP_MAX = 50;

export const DEFAULT_SETTINGS: Settings = {
  aids: { chip: true, translation: true, tts: true, recap: true },
  sfx: true,
  music: true,
  newCap: 10,
};

export interface SettingsStore {
  get(): Settings;
  set(patch: SettingsPatch): Settings;
  /** False when `localStorage` is unavailable: settings last only for this page. */
  readonly persistent: boolean;
}

const clone = (s: Settings): Settings => ({ ...s, aids: { ...s.aids } });

const clampCap = (n: unknown): number =>
  typeof n === 'number' && Number.isFinite(n)
    ? Math.min(NEW_CAP_MAX, Math.max(NEW_CAP_MIN, Math.round(n)))
    : DEFAULT_SETTINGS.newCap;

/** Merges untrusted `raw` over `base`, taking only fields of the right type. */
function merge(base: Settings, raw: unknown): Settings {
  const out = clone(base);
  if (typeof raw !== 'object' || raw === null) return out;
  const r = raw as Record<string, unknown>;
  if (typeof r.sfx === 'boolean') out.sfx = r.sfx;
  if (typeof r.music === 'boolean') out.music = r.music;
  if (typeof r.newCap === 'number') out.newCap = clampCap(r.newCap);
  if (typeof r.aids === 'object' && r.aids !== null) {
    const a = r.aids as Record<string, unknown>;
    for (const k of Object.keys(out.aids) as (keyof Aids)[]) if (typeof a[k] === 'boolean') out.aids[k] = a[k];
  }
  return out;
}

/** Settings kept in one `localStorage` key; a blocked or corrupt store degrades to memory or defaults. */
export function createSettings(storage?: Storage): SettingsStore {
  let store: Storage | undefined;
  let persistent = true;
  try {
    store = storage ?? globalThis.localStorage;
    if (!store) throw new Error('no localStorage');
    store.getItem(SETTINGS_KEY);
  } catch {
    store = undefined;
    persistent = false;
  }
  let current = DEFAULT_SETTINGS;
  try {
    const text = store?.getItem(SETTINGS_KEY);
    if (text) current = merge(DEFAULT_SETTINGS, JSON.parse(text));
  } catch {
    current = DEFAULT_SETTINGS;
  }
  current = clone(current);

  return {
    get: () => clone(current),
    set(patch) {
      current = merge(current, patch);
      try {
        store?.setItem(SETTINGS_KEY, JSON.stringify(current));
      } catch {
        persistent = false;
      }
      return clone(current);
    },
    get persistent() {
      return persistent;
    },
  };
}
