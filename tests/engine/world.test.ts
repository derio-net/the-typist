import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { sizes } from '../../src/layout/metrics';
import { parseList, displayForm, formsText, type VocabRecord } from '../../src/schema';
import {
  STEP_MS, WORLD, advance, createWorld, shipBounds, shipSpeed, tick, typeChar, type World, type WorldEvent,
} from '../../src/engine/world';

const fixture = parseList(readFileSync('tests/fixtures/lists/two-records.yaml', 'utf8'));
if (!fixture.ok) throw new Error(fixture.errors.join('\n'));
const [boerse, anlegen] = fixture.list.records;

const ex = (de: string, en = 'x') => ({ de, en, tags: ['singular'] });
const pluralOnly: VocabRecord = {
  id: 'noun-nebenkosten', type: 'noun', lemma: 'Nebenkosten', gloss: ['extra costs'], status: 'enriched',
  source_lines: [1], noun: { gender: 'f', plural: 'Nebenkosten', plural_only: true },
  examples: [ex('Die Nebenkosten steigen.')],
};
const phrase: VocabRecord = {
  id: 'phrase-jedoch', type: 'phrase', lemma: 'jedoch', gloss: ['however'], status: 'enriched',
  source_lines: [2], examples: [ex('Er kam, jedoch zu spät.'), ex('Sie blieb, jedoch nicht lange.')],
};

const typeText = (w: World, text: string): World => {
  for (const c of text) w = typeChar(w, c);
  return w;
};
const find = (w: World, id: string) => w.ships.find((s) => s.id === id);
const byKind = (w: World, kind: string) => w.ships.filter((s) => s.kind === kind);
const allEvents = (...ws: World[]): WorldEvent[] => ws.flatMap((w) => w.events);

describe('spawning', () => {
  it('creates one mothership per record: text is displayForm, label is the gloss', () => {
    const w = createWorld([boerse]);
    expect(w.ships).toHaveLength(1);
    expect(w.ships[0]).toMatchObject({ kind: 'mothership', text: displayForm(boerse), label: 'stock exchange' });
  });

  it('destroying the mothership spawns the forms ship and one escort per example around it', () => {
    let w = createWorld([boerse]);
    const m = w.ships[0];
    w = typeText(w, m.text);
    expect(find(w, m.id)).toBeUndefined();
    const forms = byKind(w, 'forms');
    expect(forms.map((s) => s.text)).toEqual([formsText(boerse)]);
    const escorts = byKind(w, 'escort');
    expect(escorts.map((s) => s.text)).toEqual(boerse.examples!.map((e) => e.de));
    expect(escorts[0].translation).toBe(boerse.examples![0].en);
    expect(escorts[0].chip).toBe('singular, Präteritum');
    const spots = new Set(escorts.map((s) => `${s.x},${s.y}`));
    expect(spots.size).toBe(escorts.length);
    expect(spots.has(`${m.x},${m.y}`)).toBe(false);
  });

  it('plural_only nouns and phrases spawn no forms ship', () => {
    for (const r of [pluralOnly, phrase]) {
      let w = createWorld([r]);
      w = typeText(w, w.ships[0].text);
      expect(byKind(w, 'forms')).toHaveLength(0);
      expect(byKind(w, 'escort')).toHaveLength(r.examples!.length);
    }
  });
});

describe('movement', () => {
  it('ships descend; longer texts slower (by the square root of length); speed scales per wave', () => {
    expect(shipSpeed(48, 0)).toBeLessThan(shipSpeed(10, 0));
    expect(shipSpeed(24, 0) / shipSpeed(48, 0)).toBeCloseTo(Math.SQRT2);
    expect(shipSpeed(10, 0)).toBe(shipSpeed(12, 0));
    expect(shipSpeed(10, 2)).toBeGreaterThan(shipSpeed(10, 0));
    const w0 = createWorld([boerse]);
    const w1 = tick(w0);
    expect(w1.ships[0].y).toBeGreaterThan(w0.ships[0].y);
    expect(w1.time).toBeCloseTo(STEP_MS);
    const fast = tick(createWorld([boerse], { wave: 3 }));
    expect(fast.ships[0].y - w0.ships[0].y).toBeGreaterThan(w1.ships[0].y - w0.ships[0].y);
  });

  it('advance runs whole 60 Hz steps and keeps the remainder', () => {
    let w = advance(createWorld([boerse]), STEP_MS * 2.5);
    expect(w.time).toBeCloseTo(STEP_MS * 2);
    w = advance(w, STEP_MS * 0.6);
    expect(w.time).toBeCloseTo(STEP_MS * 3);
  });
});

describe('escape, lives, resolution', () => {
  const runUntil = (w: World, pred: (w: World) => boolean, max = 100000) => {
    const events: WorldEvent[] = [];
    for (let i = 0; i < max && !pred(w); i++) {
      w = tick(w);
      events.push(...w.events);
    }
    return { w, events };
  };

  it('a ship reaching the player line costs a life and emits escaped; record resolves escaped', () => {
    const { w, events } = runUntil(createWorld([boerse]), (x) => x.status !== 'playing');
    expect(w.lives).toBe(2);
    expect(events.filter((e) => e.type === 'escaped')).toHaveLength(1);
    expect(w.results['noun-boerse']).toEqual({ typos: 0, expectedChars: 0, activeMs: 0, escaped: true });
    expect(w.status).toBe('wave-complete');
  });

  it('0 lives ends the session', () => {
    const w0 = createWorld([boerse, anlegen, phrase], { lives: 1 });
    const { w } = runUntil(w0, (x) => x.status !== 'playing');
    expect(w.lives).toBe(0);
    expect(w.status).toBe('game-over');
    expect(tick(w)).toBe(w);
    expect(typeChar(w, 'a').events).toEqual([]);
  });

  it('records resolve when the last ship is destroyed; stats count typos, chars and active time', () => {
    let w = createWorld([phrase]);
    w = typeText(w, 'jx'); // lock + typo
    w = typeText(w, 'edoch');
    // ships do not move here, so time is controlled by tick
    expect(w.results['phrase-jedoch']).toBeUndefined();
    const escorts = byKind(w, 'escort');
    for (const e of escorts) {
      for (const c of e.text.replace(/\.$/, '')) w = tick(typeChar(w, c));
    }
    const stats = w.results['phrase-jedoch'];
    expect(stats.typos).toBe(1);
    expect(stats.escaped).toBe(false);
    expect(stats.expectedChars).toBe('jedoch'.length + escorts.reduce((n, e) => n + e.text.replace(/\.$/, '').length, 0));
    expect(stats.activeMs).toBeGreaterThan(0);
    expect(w.status).toBe('wave-complete');
    expect(allEvents(w).some((e) => e.type === 'wave-complete')).toBe(true);
  });

  it('a wave ends only when all its records are resolved', () => {
    let w = createWorld([boerse, phrase]);
    const boerseM = w.ships.find((s) => s.recordId === 'noun-boerse')!;
    w = typeText(w, boerseM.text);
    expect(w.status).toBe('playing');
  });
});

describe('headless play-through of the two-record fixture', () => {
  it('feeding every ship text (one ae fallback) resolves both records with zero escapes', () => {
    let w = createWorld([boerse, anlegen]);
    let fallbackUsed = false;
    let guard = 0;
    while (w.status === 'playing' && guard++ < 50) {
      const ship = [...w.ships].sort((a, b) => b.y - a.y)[0];
      let text = ship.text;
      if (!fallbackUsed && text.includes('ö')) {
        text = text.replace('ö', 'oe');
        fallbackUsed = true;
      }
      for (const c of text) {
        if (!find(w, ship.id)) break;
        w = typeChar(w, c);
      }
      expect(find(w, ship.id)).toBeUndefined();
      w = tick(w);
    }
    expect(fallbackUsed).toBe(true);
    expect(w.status).toBe('wave-complete');
    expect(w.lives).toBe(3);
    expect(Object.keys(w.results).sort()).toEqual(['noun-boerse', 'verb-anlegen']);
    for (const r of Object.values(w.results)) {
      expect(r.escaped).toBe(false);
      expect(r.typos).toBe(0);
    }
    expect(w.score).toBeGreaterThan(0);
  });
});

const lowered = (w: World, y: number): World => ({ ...w, ships: w.ships.map((s) => ({ ...s, y })) });
const intersects = (a: ReturnType<typeof shipBounds>, b: ReturnType<typeof shipBounds>) =>
  a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;

describe('child placement (r1, r2, r3)', () => {
  const destroyFirst = (w: World) => typeText(w, w.ships.find((s) => s.kind === 'mothership')!.text);

  it.each([0, 200, 450])('children fit the canvas and never overlap live ships (mothership at y=%i)', (y) => {
    let w = createWorld([boerse, anlegen]);
    const target = w.ships[0];
    w = { ...w, ships: w.ships.map((s) => (s.id === target.id ? { ...s, y: y || s.y } : s)) };
    w = typeText(w, target.text);
    const boxes = w.ships.map(shipBounds);
    expect(boxes.length).toBe(1 + boerse.examples!.length); // forms + escorts; one record on screen at a time
    for (const b of boxes) {
      expect(b.x0).toBeGreaterThanOrEqual(0);
      expect(b.x1).toBeLessThanOrEqual(WORLD.width);
      expect(b.y0).toBeGreaterThanOrEqual(0);
    }
    for (let i = 0; i < boxes.length; i++)
      for (let j = i + 1; j < boxes.length; j++) expect(intersects(boxes[i], boxes[j])).toBe(false);
  });

  it('siblings descend together, so a short forms ship never overtakes a long sentence', () => {
    let w = createWorld([boerse]);
    w = destroyFirst(w);
    const kids = w.ships.filter((s) => s.recordId === boerse.id);
    expect(new Set(kids.map((k) => k.speed)).size).toBe(1);
    w = advance(w, 2000);
    const boxes = w.ships.filter((s) => s.recordId === boerse.id).map(shipBounds);
    for (let i = 0; i < boxes.length; i++)
      for (let j = i + 1; j < boxes.length; j++) expect(intersects(boxes[i], boxes[j])).toBe(false);
  });

  it('keeps children a reaction distance above the player line even when the mothership dies low', () => {
    let w = createWorld([boerse]);
    w = lowered(w, WORLD.playerY - 5);
    w = destroyFirst(w);
    const kids = w.ships.filter((s) => s.kind !== 'mothership');
    expect(kids.length).toBeGreaterThan(0);
    for (const k of kids) expect(k.y).toBeLessThanOrEqual(WORLD.playerY - k.speed * WORLD.minReactionS + 1e-9);
    const next = advance(w, 1000);
    expect(next.lives).toBe(3);
  });

  it('measures with the injected function: wider-than-canvas text is centred', () => {
    let w = createWorld([boerse], { measure: () => WORLD.width + 400 });
    w = destroyFirst(w);
    for (const s of w.ships) expect(s.x).toBe(WORLD.width / 2);
  });

  it('uses the injected measure for the clamp (no ship box leaves the canvas)', () => {
    let w = createWorld([boerse], { measure: (t) => t.length * 14 + 24 });
    w = destroyFirst(w);
    for (const s of w.ships) {
      const b = shipBounds(s);
      expect(b.x0).toBeGreaterThanOrEqual(0);
      expect(b.x1).toBeLessThanOrEqual(WORLD.width);
    }
  });
});

describe('advance events (r4)', () => {
  it('keeps events from every step, not just the last', () => {
    const lanes = createWorld([boerse, anlegen]);
    const staggered: World = { ...lanes, ships: lanes.ships.map((s, i) => ({ ...s, y: s.y + i * 200 })) };
    const w = advance(staggered, 60000);
    const escaped = w.events.filter((e) => e.type === 'escaped');
    const resolved = w.events.filter((e) => e.type === 'resolved');
    expect(escaped).toHaveLength(2);
    expect(resolved).toHaveLength(2);
    expect(w.events.at(-1)?.type).toBe('wave-complete');
  });
});

describe('escapes (r13)', () => {
  it('releases the lock when the locked ship escapes', () => {
    let w = typeChar(createWorld([boerse]), 'd');
    expect(w.typing.lock).not.toBeNull();
    w = advance(w, 60000);
    expect(w.lives).toBe(2);
    expect(w.typing.lock).toBeNull();
    expect(w.typing.ships).toEqual([]);
  });

  it('a child escaping after the mothership was destroyed with typos still resolves with those stats', () => {
    let w = createWorld([phrase]);
    w = typeText(w, 'jx');
    w = typeText(w, 'edoch');
    expect(w.results['phrase-jedoch']).toBeUndefined();
    w = advance(w, 120000);
    expect(w.results['phrase-jedoch']).toEqual({ typos: 1, expectedChars: 6, activeMs: 0, escaped: true });
    expect(w.lives).toBe(1);
  });
});

describe('one record at a time, banded break-up', () => {
  const kids = (w: World) => w.ships.filter((s) => s.kind !== 'mothership');
  const burst = (seed: number) => typeText(createWorld([boerse, anlegen], { seed }), displayForm(boerse));
  const bands = (w: World) =>
    kids(w).map(shipBounds).sort((a, b) => a.y0 - b.y0);
  const disjointRows = (w: World) => {
    const b = bands(w);
    for (let i = 1; i < b.length; i++) expect(b[i].y0).toBeGreaterThanOrEqual(b[i - 1].y1 - 1e-6);
  };

  it('descends slower than before: a short mothership falls at the base speed, ≤ 21 px/s on wave 0', () => {
    expect(WORLD.baseSpeed).toBeLessThanOrEqual(21);
    expect(shipSpeed(5, 0)).toBe(WORLD.baseSpeed);
  });

  it('only the first record\'s mothership is on screen at the start', () => {
    const w = createWorld([boerse, anlegen], { seed: 1 });
    expect(w.ships.map((s) => s.id)).toEqual([`${boerse.id}:m`]);
  });

  it('the next mothership enters only when every ship of the current record is gone', () => {
    let w = burst(2);
    expect(w.ships.some((s) => s.recordId === anlegen.id)).toBe(false);
    for (const k of kids(w).sort((a, b) => b.y - a.y)) w = typeText(w, k.text.replace(/[.!?…]$/, ''));
    expect(w.ships.filter((s) => s.recordId === boerse.id)).toEqual([]);
    expect(w.ships.map((s) => s.id)).toEqual([`${anlegen.id}:m`]);
    expect(w.events.some((e) => e.type === 'spawned' && e.shipId === `${anlegen.id}:m`)).toBe(true);
  });

  it('the mothership falls straight down', () => {
    const w0 = createWorld([boerse], { seed: 1 });
    const w1 = advance(w0, 2000);
    expect(w1.ships[0].vx).toBe(0);
    expect(w1.ships[0].x).toBe(w0.ships[0].x);
  });

  it('children drift sideways slowly, within the configured range', () => {
    expect(WORLD.burstMaxVx).toBeLessThanOrEqual(25);
    const w = burst(7);
    expect(kids(w).length).toBeGreaterThan(1);
    for (const k of kids(w)) {
      expect(Math.abs(k.vx)).toBeGreaterThanOrEqual(WORLD.burstMinVx);
      expect(Math.abs(k.vx)).toBeLessThanOrEqual(WORLD.burstMaxVx);
    }
  });

  it('is deterministic for a seed and varies between seeds', () => {
    const vx = (w: World) => kids(w).map((k) => k.vx);
    expect(vx(burst(3))).toEqual(vx(burst(3)));
    expect(vx(burst(3))).not.toEqual(vx(burst(4)));
  });

  it('each child occupies its own horizontal band, and bands never cross while they fall', () => {
    let w = burst(9);
    disjointRows(w);
    for (let i = 0; i < 40; i++) {
      w = advance(w, 250);
      disjointRows(w);
    }
  });

  it('children all share one speed and get a strong upward kick, without being pushed into the HUD', () => {
    let w = burst(5);
    const before = kids(w);
    expect(new Set(before.map((k) => k.speed)).size).toBe(1);
    w = advance(w, 400);
    const after = kids(w);
    for (const k of after) {
      const k0 = before.find((b) => b.id === k.id)!;
      expect(k0.y - k.y).toBeGreaterThan(30);
      expect(k.y).toBeGreaterThanOrEqual(WORLD.minY - 1e-6); // the strip (the word) stays below the HUD line
    }
  });

  it('children bounce off the screen edges and stay inside the canvas', () => {
    let w = burst(11);
    const k = kids(w)[0];
    w = { ...w, ships: w.ships.map((s) => (s.id === k.id ? { ...s, x: WORLD.width - s.w / 2 - 0.5, vx: Math.abs(s.vx) } : s)) };
    w = advance(w, 200);
    expect(w.ships.find((s) => s.id === k.id)!.vx).toBeLessThan(0);
    for (let i = 0; i < 20; i++) {
      w = advance(w, 250);
      for (const b of w.ships.map(shipBounds)) {
        expect(b.x0).toBeGreaterThanOrEqual(-1e-9);
        expect(b.x1).toBeLessThanOrEqual(WORLD.width + 1e-9);
      }
    }
  });
});
