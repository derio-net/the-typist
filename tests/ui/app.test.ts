// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseList, type VocabList } from '../../src/schema';
import { createSettings } from '../../src/platform/settings';
import { createMemoryStore, localDay } from '../../src/srs/store';
import { schedule } from '../../src/srs/scheduler';
import type { Renderer } from '../../src/render/renderer';
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
let storage: Storage;
const NOW = new Date('2026-10-06T09:00:00');

const fakeRenderer = (): Renderer => ({
  measure: (t) => t.length * 8, push: () => undefined, draw: () => void (draws += 1), dispose: () => undefined,
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
    now: () => NOW, raf: (cb) => frames.push(cb), caf: () => undefined, makeRenderer: () => fakeRenderer(), seed: 7,
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
  cards = createMemoryStore();
  persistent = true;
  storage = fakeStorage();
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

vi.setConfig({ testTimeout: 30_000 });
