import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRenderer } from '../../src/render/renderer';
import { createWorld } from '../../src/engine/world';
import { palette } from '../../src/render/theme';
import { parseList } from '../../src/schema';
import { readFileSync } from 'node:fs';

const res = parseList(readFileSync('tests/fixtures/lists/two-records.yaml', 'utf8'));
if (!res.ok) throw new Error('fixture');

const ctxStub = () =>
  new Proxy({ measureText: () => ({ width: 10 }) } as Record<string, unknown>, {
    get: (t, k: string) => (k in t ? t[k] : () => undefined),
    set: (t, k: string, v) => ((t[k] = v), true),
  });

interface Win {
  listeners: Map<string, Set<() => void>>;
  mql: { media: string; listeners: Set<() => void> }[];
}
let win: Win;
let canvas: { width: number; height: number; style: Record<string, string>; getContext: () => unknown };
let body: { style: Record<string, string> };

beforeEach(() => {
  win = { listeners: new Map(), mql: [] };
  body = { style: {} };
  canvas = { width: 0, height: 0, style: {}, getContext: ctxStub };
  vi.stubGlobal('document', { body });
  vi.stubGlobal('window', {
    innerWidth: 600, innerHeight: 900, devicePixelRatio: 2,
    addEventListener: (n: string, f: () => void) => (win.listeners.get(n) ?? win.listeners.set(n, new Set()).get(n)!).add(f),
    removeEventListener: (n: string, f: () => void) => win.listeners.get(n)?.delete(f),
    matchMedia: (media: string) => {
      const m = { media, listeners: new Set<() => void>() };
      win.mql.push(m);
      return { addEventListener: (_: string, f: () => void) => m.listeners.add(f), removeEventListener: (_: string, f: () => void) => m.listeners.delete(f) };
    },
  });
});
afterEach(() => vi.unstubAllGlobals());

const make = () => createRenderer(canvas as unknown as HTMLCanvasElement, 720);
const liveListeners = () => [...win.listeners.values()].reduce((n, s) => n + s.size, 0) + win.mql.reduce((n, m) => n + m.listeners.size, 0);

describe('renderer lifecycle', () => {
  it('sets the page background from the palette (no colour in index.html)', () => {
    make();
    expect(body.style.background).toBe(palette.background);
    expect(readFileSync('index.html', 'utf8')).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });

  it('re-sizes the canvas when the world width differs from the one it was created with', () => {
    const r = make();
    const before = canvas.height;
    r.draw(createWorld(res.list.records, { width: 1280 }), 0);
    expect(canvas.height).not.toBe(before);
    expect(canvas.width / canvas.height).toBeCloseTo(1280 / 640, 1);
  });

  it('dispose removes the resize listener and the DPR listener', () => {
    const r = make();
    expect(win.listeners.get('resize')?.size).toBe(1);
    expect(win.mql).toHaveLength(1);
    expect(win.mql[0].media).toContain('2dppx');
    r.dispose();
    expect(liveListeners()).toBe(0);
  });

  it('a DPR change re-sizes the canvas and re-arms the listener for the new ratio', () => {
    make();
    const before = canvas.width;
    (window as unknown as { devicePixelRatio: number }).devicePixelRatio = 3;
    [...win.mql[0].listeners].forEach((f) => f());
    expect(canvas.width).toBeGreaterThan(before);
    expect(win.mql).toHaveLength(2);
    expect(win.mql[1].media).toContain('3dppx');
    expect(win.mql[0].listeners.size).toBe(0);
  });
});
