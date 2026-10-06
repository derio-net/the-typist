// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseList, type VocabList } from '../../src/schema';
import { pickWidth } from '../../src/render/canvas-size';
import { createSettings } from '../../src/platform/settings';
import { createMemoryStore, localDay } from '../../src/srs/store';
import { schedule } from '../../src/srs/scheduler';
import type { Renderer, RendererOptions } from '../../src/render/renderer';
import type { Tts } from '../../src/platform/tts';
import type { Audio, EffectName } from '../../src/platform/audio';
import { startApp, STORAGE_WARNING, type App } from '../../src/ui/app';

const twoText = readFileSync('tests/fixtures/lists/two-records.yaml', 'utf8');
const fixtureList = (): VocabList => {
  const res = parseList(twoText);
  if (!res.ok) throw new Error(res.errors.join());
  return res.list;
};

function fakeStorage(): Storage {
  const m = new Map<string, string>();
  return {
    get length() { return m.size; }, clear: () => m.clear(), getItem: (k) => m.get(k) ?? null,
    key: (i) => [...m.keys()][i] ?? null, removeItem: (k) => void m.delete(k), setItem: (k, v) => void m.set(k, v),
  };
}

let root: HTMLElement;
let app: App;
let frames: ((t: number) => void)[];
let clock: number;
let draws: number;
let cards: ReturnType<typeof createMemoryStore>;
let persistent: boolean;
let pushes: unknown[][];
let counts: { reset: number; clear: number; refit: number };
let rendererOpts: RendererOptions | undefined;
let storage: Storage;
let said: string[];
let played: EffectName[];
let music: string[];
let ttsOn: boolean[];
let ttsStatus: { available: boolean; reason?: string };
let audioOpts: { sfx: boolean; music: boolean }[];
let unlocks: number;

const fakeTts = (): Tts => ({
  status: () => ttsStatus,
  ready: Promise.resolve(ttsStatus),
  setEnabled: (on) => void ttsOn.push(on),
  say: (t) => void said.push(t),
});
const fakeAudio = (): Audio => ({
  unlock: () => void (unlocks += 1),
  play: (n) => void played.push(n),
  setOptions: (o) => void audioOpts.push(o),
  startMusic: async () => void music.push('start'),
  pauseMusic: () => void music.push('pause'),
});
const NOW = new Date('2026-10-06T09:00:00');

const fakeRenderer = (): Renderer => ({
  measure: (t) => t.length * 8,
  push: (events) => void pushes.push(events),
  draw: () => void (draws += 1),
  reset: () => void (counts.reset += 1),
  clear: () => void (counts.clear += 1),
  refit: () => void (counts.refit += 1),
  dispose: () => undefined,
});

/** Runs frames for `ms` of fake time at 16 ms each. */
function run(ms: number) {
  for (let t = 0; t < ms; t += 16) {
    clock += 16;
    const batch = frames.splice(0);
    for (const f of batch) f(clock);
  }
}

async function boot() {
  app = await startApp({
    root, bundled: [fixtureList()], stores: { cards, persistent }, settings: createSettings(storage),
    now: () => NOW, raf: (cb) => frames.push(cb), caf: () => undefined, makeRenderer: (_c, _w, o) => ((rendererOpts = o), fakeRenderer()), seed: 7,
    tts: fakeTts(), audio: fakeAudio(),
  });
}
const click = (text: string) => {
  const b = [...root.querySelectorAll('button')].find((x) => x.textContent?.startsWith(text));
  if (!b) throw new Error(`no button "${text}" in: ${[...root.querySelectorAll('button')].map((x) => x.textContent)}`);
  b.click();
};
const panelName = () => root.querySelector('[data-panel]:not(.banner)')?.getAttribute('data-panel') ?? null;
const input = () => root.querySelector<HTMLInputElement>('input[aria-label="typing input"]')!;
const esc = () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

async function startStudy() {
  click('Two-record');
  await app.settled();
  click('Study');
  await app.settled();
}

beforeEach(async () => {
  document.body.innerHTML = '';
  document.head.innerHTML = '';
  root = document.createElement('div');
  document.body.append(root);
  frames = [];
  clock = 0;
  draws = 0;
  pushes = [];
  counts = { reset: 0, clear: 0, refit: 0 };
  rendererOpts = undefined;
  cards = createMemoryStore();
  persistent = true;
  storage = fakeStorage();
  said = [];
  played = [];
  music = [];
  ttsOn = [];
  audioOpts = [];
  unlocks = 0;
  ttsStatus = { available: true };
  await boot();
});
afterEach(() => app.dispose());

describe('app state machine (R4, R5, R10)', () => {
  it('boots to the title panel listing the bundled list', () => {
    expect(app.state()).toBe('title');
    expect(panelName()).toBe('title');
    expect(root.textContent).toContain('Two-record play fixture');
    expect(root.querySelector('.banner')).toBeNull();
  });

  it('choosing a list shows the mode panel; Study starts play with the keyboard enabled', async () => {
    click('Two-record');
    await app.settled();
    expect(panelName()).toBe('mode');
    expect(root.textContent).toContain('0 due · 2 new');
    click('Study');
    await app.settled();
    expect(app.state()).toBe('play');
    expect(panelName()).toBeNull();
    expect(app.world()).toBeDefined();
    expect(document.activeElement).toBe(input());
  });

  it('Esc pauses with the keyboard off; the World clock is frozen while paused', async () => {
    await startStudy();
    run(500);
    const t0 = app.world()!.time;
    expect(t0).toBeGreaterThan(0);
    esc();
    expect(app.state()).toBe('pause');
    expect(panelName()).toBe('pause');
    const typing0 = app.world()!.typing;
    input().value = 'a';
    input().dispatchEvent(new InputEvent('input', { data: 'a', inputType: 'insertText', bubbles: true }));
    run(2000);
    expect(app.world()!.time).toBe(t0);
    expect(app.world()!.typing).toEqual(typing0);
    esc();
    expect(app.state()).toBe('play');
    expect(panelName()).toBeNull();
    run(500);
    expect(app.world()!.time).toBeGreaterThan(t0);
  });

  it('Resume continues, and typing focus returns to the game', async () => {
    await startStudy();
    esc();
    click('Resume');
    expect(app.state()).toBe('play');
    expect(document.activeElement).toBe(input());
  });

  it('Settings from pause keeps the cap field focused while typing, and closes back to pause', async () => {
    await startStudy();
    esc();
    click('Settings');
    expect(app.state()).toBe('settings');
    const cap = root.querySelector<HTMLInputElement>('input[type=number]')!;
    cap.focus();
    cap.value = '';
    for (const d of ['2', '5']) {
      cap.value += d;
      cap.dispatchEvent(new InputEvent('input', { data: d, inputType: 'insertText', bubbles: true }));
    }
    await new Promise((r) => setTimeout(r, 10));
    expect(document.activeElement).toBe(cap);
    cap.dispatchEvent(new Event('change'));
    expect(createSettings(storage).get().newCap).toBe(25);
    click('Close');
    expect(app.state()).toBe('pause');
    expect(panelName()).toBe('pause');
  });

  it('Quit to menu goes to the summary, then back to the mode panel', async () => {
    await startStudy();
    esc();
    click('Quit to menu');
    await app.settled();
    expect(app.state()).toBe('summary');
    expect(panelName()).toBe('summary');
    click('Continue');
    await app.settled();
    expect(panelName()).toBe('mode');
  });

  it('shows the banner when storage is unavailable', async () => {
    app.dispose();
    persistent = false;
    await boot();
    expect(root.querySelector('.banner')?.textContent).toBe(STORAGE_WARNING);
  });

  it('shows the banner when only settings storage throws', async () => {
    app.dispose();
    const throwing = new Proxy({} as Storage, { get: () => () => { throw new Error('blocked'); } });
    storage = throwing;
    await boot();
    expect(root.querySelector('.banner')).not.toBeNull();
  });

  it('a study session with nothing due offers free play', async () => {
    const l = fixtureList();
    for (const r of l.records) {
      await cards.putGraded(l.list.id, r.id, { card: schedule(undefined, 'Good', NOW), reps: 1, typos: 0, escapes: 0 } as never, localDay(NOW), true);
    }
    click('Two-record');
    await app.settled();
    expect(root.textContent).toContain('Nothing due — free play?');
    expect([...root.querySelectorAll('button')].some((b) => b.textContent === 'Study')).toBe(false);
    click('Nothing due');
    expect(app.state()).toBe('play');
  });

  it('a spent daily cap with nothing due also offers free play', async () => {
    createSettings(storage).set({ newCap: 1 });
    app.dispose();
    await boot();
    const l = fixtureList();
    await cards.putGraded(l.list.id, l.records[0].id, { card: schedule(undefined, 'Good', NOW), reps: 1, typos: 0, escapes: 0 } as never, localDay(NOW), true);
    await cards.bumpNew(l.list.id, localDay(NOW));
    click('Two-record');
    await app.settled();
    expect(root.textContent).toContain('Nothing due — free play?');
  });

  it('a wave ends in the between-wave panel, then the summary, then the mode panel', async () => {
    await startStudy();
    // let both Records escape: the wave completes
    for (let i = 0; i < 400 && app.state() === 'play'; i++) run(1000);
    await app.settled();
    expect(app.state()).toBe('between-wave');
    expect(root.textContent).toContain('Wave 1 cleared');
    click('Finish');
    await app.settled();
    expect(app.state()).toBe('summary');
    click('Continue');
    await app.settled();
    expect(panelName()).toBe('mode');
  });

  it('dispose removes the DOM and stops the frame loop', () => {
    app.dispose();
    expect(root.textContent).toBe('');
    const n = frames.length;
    run(100);
    expect(frames.length).toBeLessThanOrEqual(n);
  });
});


/** A list of `n` playable records, so a study session has several waves (6 Records per wave). */
function bigList(n: number): VocabList {
  const base = fixtureList();
  const records = Array.from({ length: n }, (_, i) => ({ ...base.records[i % 2], id: `${base.records[i % 2].id}-${i}` }));
  return { ...base, list: { ...base.list, id: 'big', title: 'Big list' }, records };
}

/** Types the locked (else the first) ship one character at a time until the wave ends or the session leaves play. */
function typeUntil(stop: () => boolean, limit = 20000) {
  for (let i = 0; i < limit && !stop(); i++) {
    const w = app.world();
    if (app.state() !== 'play' || !w || w.status !== 'playing') return;
    const ship = w.typing.ships.find((t) => t.id === w.typing.lock) ?? w.typing.ships[0];
    if (!ship || ship.pos >= ship.required) {
      run(16);
      continue;
    }
    const ch = ship.text[ship.pos];
    input().dispatchEvent(new InputEvent('input', { data: ch, inputType: 'insertText', bubbles: true }));
    run(16);
  }
}

async function bootBig(n: number) {
  app.dispose();
  app = await startApp({
    root, bundled: [bigList(n)], stores: { cards, persistent }, settings: createSettings(storage),
    now: () => NOW, raf: (cb) => frames.push(cb), caf: () => undefined, makeRenderer: (_c, _w, o) => ((rendererOpts = o), fakeRenderer()), seed: 7,
    tts: fakeTts(), audio: fakeAudio(),
  });
}

describe('review fixes (p4-r1..r10)', () => {
  it('the next wave takes the window size and aid settings of that moment (p4-r1, p4-r5)', async () => {
    await bootBig(7);
    click('Big list');
    await app.settled();
    click('Study');
    await app.settled();
    const first = app.world()!;
    expect(first.width).toBe(pickWidth(window.innerWidth, window.innerHeight));
    esc();
    click('Settings');
    const chip = root.querySelector<HTMLInputElement>('[data-setting="aids.chip"]')!;
    chip.checked = false;
    chip.dispatchEvent(new Event('change'));
    click('Close');
    esc();
    expect(app.state()).toBe('play');
    const [w0, h0] = [window.innerWidth, window.innerHeight];
    Object.assign(window, { innerWidth: 1280, innerHeight: 400 });
    typeUntil(() => app.state() === 'between-wave');
    expect(app.state()).toBe('between-wave');
    click('Next wave');
    const next = app.world()!;
    Object.assign(window, { innerWidth: w0, innerHeight: h0 });
    expect(next.wave).toBe(1);
    expect(next.width).toBe(pickWidth(1280, 400));
    expect(next.width).not.toBe(first.width);
    expect(next.aids.chip).toBe(false);
    expect(first.aids.chip).toBe(true);
  });

  it('the renderer is reset when each wave and each session starts (p4-r4)', async () => {
    await bootBig(7);
    click('Big list');
    await app.settled();
    click('Study');
    await app.settled();
    expect(counts.reset).toBe(1);
    typeUntil(() => app.state() === 'between-wave');
    click('Next wave');
    expect(counts.reset).toBe(2);
  });

  it('no finished World stays under the menus, and the canvas is cleared (p4-r3)', async () => {
    await startStudy();
    esc();
    click('Quit to menu');
    await app.settled();
    expect(app.state()).toBe('summary');
    expect(app.world()).toBeDefined(); // the summary sits over the last frame
    click('Continue');
    await app.settled();
    expect(panelName()).toBe('mode');
    expect(app.world()).toBeUndefined();
    const cleared = counts.clear;
    const drawn = draws;
    run(64);
    expect(draws).toBe(drawn);
    expect(counts.clear).toBeGreaterThan(cleared);
    click('Back');
    expect(app.world()).toBeUndefined();
  });

  it('the banner is in the layout: the canvas fits the height left under it (p4-r2)', async () => {
    app.dispose();
    persistent = false;
    await boot();
    const banner = root.querySelector<HTMLElement>('.banner')!;
    expect(root.firstElementChild).toBe(banner); // above the canvas, in the flow
    Object.defineProperty(banner, 'offsetHeight', { value: 30, configurable: true });
    expect(rendererOpts!.availableHeight!()).toBe(window.innerHeight - 30);
    expect(counts.refit).toBeGreaterThan(0);
    const css = document.getElementById('typist-style')!.textContent!;
    expect(css).not.toMatch(/\.banner \{[^}]*position: fixed/);
  });

  it('a storage error arriving mid-session shows the banner (p4-r10)', async () => {
    const failing = { ...cards, putGraded: () => Promise.reject(new Error('disk full')) };
    app.dispose();
    app = await startApp({
      root, bundled: [fixtureList()], stores: { cards: failing as typeof cards, persistent: true }, settings: createSettings(storage),
      now: () => NOW, raf: (cb) => frames.push(cb), caf: () => undefined, makeRenderer: () => fakeRenderer(), seed: 7,
    });
    expect(root.querySelector('.banner')).toBeNull();
    await startStudy();
    for (let i = 0; i < 400 && app.state() === 'play'; i++) run(1000);
    await app.settled();
    expect(root.querySelector('.banner')?.textContent).toBe(STORAGE_WARNING);
  });

  it('after a quit, a new session runs one frame loop and one keyboard handler (p4-r10)', async () => {
    await startStudy();
    esc();
    click('Quit to menu');
    await app.settled();
    click('Continue');
    await app.settled();
    click('Free play');
    await app.settled();
    expect(app.state()).toBe('play');
    run(200);
    expect(frames).toHaveLength(1); // one scheduled callback: one loop
    pushes.length = 0;
    run(16);
    expect(pushes).toHaveLength(1);
    pushes.length = 0;
    const w = app.world()!;
    const ship = w.typing.ships[0];
    if (ship) {
      input().dispatchEvent(new InputEvent('input', { data: ship.text[0], inputType: 'insertText', bubbles: true }));
      expect(pushes).toHaveLength(1); // one handler: the keystroke made one step
    }
  });

  it('every advance and typeChar step reaches the renderer and controller once (p4-r10)', async () => {
    await startStudy();
    run(16); // the first frame only sets the clock
    pushes.length = 0;
    run(16 * 30);
    expect(pushes).toHaveLength(30); // one step per frame
    expect(new Set(pushes).size).toBe(30); // no events array handed over twice
    // an escape resolves a Record once, however many frames follow
    for (let i = 0; i < 100 && app.state() === 'play'; i++) run(1000);
    await app.settled();
    const graded = Object.keys(await cards.all('fixture-two'));
    expect(graded.length).toBeLessThanOrEqual(2);
    expect(new Set(graded).size).toBe(graded.length);
  });
});

describe('learning aids and audio (R6, R7, R10)', () => {
  const setSetting = (key: string, on: boolean) => {
    esc();
    click('Settings');
    const box = root.querySelector<HTMLInputElement>(`[data-setting="${key}"]`)!;
    box.checked = on;
    box.dispatchEvent(new Event('change'));
    click('Close');
    esc();
  };
  const shipTexts = (w: NonNullable<ReturnType<App['world']>>) => w.ships.filter((s) => s.kind === 'escort').map((s) => ({ t: s.translation, c: s.chip }));

  it('the translation setting turns off the next wave, and a mid-wave toggle applies from the next wave', async () => {
    await bootBig(7);
    click('Big list');
    await app.settled();
    click('Study');
    await app.settled();
    setSetting('aids.translation', false);
    expect(app.world()!.aids.translation).toBe(true); // this wave keeps what it started with
    typeUntil(() => app.state() === 'between-wave');
    click('Next wave');
    expect(app.world()!.aids.translation).toBe(false);
    expect(app.world()!.aids.chip).toBe(true);
    typeUntil(() => app.world()!.ships.some((s) => s.kind === 'escort'));
    expect(shipTexts(app.world()!).every((s) => s.t === undefined)).toBe(true);
  });

  it('every destroyed ship speaks its full text, interrupting through say', async () => {
    await startStudy();
    typeUntil(() => app.state() !== 'play' || (app.world()?.results && Object.keys(app.world()!.results).length === 2) === true);
    const destroyed = pushes.flat().filter((e) => (e as { type: string }).type === 'destroyed').length;
    expect(destroyed).toBeGreaterThan(2);
    expect(said).toHaveLength(destroyed);
    const l = fixtureList();
    for (const r of l.records) for (const e of r.examples ?? []) expect(said).toContain(e.de); // escorts
    expect(said).toContain('die Börsen'); // a forms ship
    expect(said).toContain('die Börse'); // a mothership
  });

  it('TTS is told the setting before each utterance; off means the toggle is passed on', async () => {
    await startStudy();
    setSetting('aids.tts', false);
    typeUntil(() => said.length > 0, 400);
    expect(ttsOn.at(-1)).toBe(false);
  });

  it('settings shows the TTS toggle disabled with the reason when there is no German voice', async () => {
    app.dispose();
    ttsStatus = { available: false, reason: 'no German voice installed on this device' };
    await boot();
    click('Settings');
    const box = root.querySelector<HTMLInputElement>('[data-setting="aids.tts"]')!;
    expect(box.disabled).toBe(true);
    expect(box.parentElement!.textContent).toContain('no German voice installed on this device');
    expect(root.querySelector<HTMLInputElement>('[data-setting="aids.chip"]')!.disabled).toBe(false);
  });

  it('settings leaves TTS enabled when a voice exists', () => {
    click('Settings');
    expect(root.querySelector<HTMLInputElement>('[data-setting="aids.tts"]')!.disabled).toBe(false);
  });

  it('World events map to effects', async () => {
    await startStudy();
    typeUntil(() => app.state() !== 'play');
    expect(played).toContain('mothership-enter');
    expect(played).toContain('hit');
    expect(played).toContain('explode-big');
    expect(played).toContain('explode-small');
    expect(played).toContain('wave-clear');
    const destroyed = pushes.flat().filter((e) => (e as { type: string }).type === 'destroyed').length;
    expect(played.filter((p) => p === 'explode-big' || p === 'explode-small')).toHaveLength(destroyed);
  });

  it('a typo plays the typo effect and an escape the escape effect', async () => {
    await startStudy();
    run(3000);
    const w = app.world()!;
    const ship = w.typing.ships[0];
    const wrong = ship.text[0] === 'q' ? 'w' : 'q';
    input().dispatchEvent(new InputEvent('input', { data: wrong, inputType: 'insertText', bubbles: true }));
    expect(played).not.toContain('hit');
    // nothing locks on a miss, so no typo event: lock first, then miss
    input().dispatchEvent(new InputEvent('input', { data: ship.text[0], inputType: 'insertText', bubbles: true }));
    input().dispatchEvent(new InputEvent('input', { data: wrong, inputType: 'insertText', bubbles: true }));
    expect(played).toContain('typo');
    for (let i = 0; i < 400 && app.state() === 'play'; i++) run(1000);
    expect(played).toContain('escape');
  });

  it('unlocks audio on the first keydown or pointer press, once per kind of gesture', () => {
    expect(unlocks).toBe(0);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }));
    expect(unlocks).toBeGreaterThan(0);
    const n = unlocks;
    document.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    expect(unlocks).toBeGreaterThan(n);
  });

  it('music plays during play and pauses with the game; toggles reach the audio', async () => {
    await startStudy();
    expect(music.at(-1)).toBe('start');
    esc();
    expect(music.at(-1)).toBe('pause');
    click('Settings');
    const box = root.querySelector<HTMLInputElement>('[data-setting="music"]')!;
    box.checked = false;
    box.dispatchEvent(new Event('change'));
    expect(audioOpts.at(-1)).toEqual({ sfx: true, music: false });
    click('Close');
    esc();
    expect(music.at(-1)).toBe('start');
  });

  it('the recap lists the weak Records between waves, and only "Wave cleared" with recap off', async () => {
    await startStudy();
    // let both Records escape: both grade Again
    for (let i = 0; i < 400 && app.state() === 'play'; i++) run(1000);
    await app.settled();
    expect(app.state()).toBe('between-wave');
    const cardsText = root.querySelector('[data-slot=recap]')!.textContent!;
    expect(root.querySelectorAll('[data-slot=recap] [data-card]')).toHaveLength(2);
    expect(cardsText).toContain('stock exchange');
    expect(cardsText).toContain('to invest');
  });

  it('with recap off the between-wave panel shows "Wave cleared" only', async () => {
    createSettings(storage).set({ aids: { recap: false } });
    app.dispose();
    await boot();
    await startStudy();
    for (let i = 0; i < 400 && app.state() === 'play'; i++) run(1000);
    await app.settled();
    expect(app.state()).toBe('between-wave');
    expect(root.querySelector('[data-slot=recap]')!.textContent).toBe('Wave cleared');
  });
});
