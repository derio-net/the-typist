import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { hullExtent, sizes } from '../../src/layout/metrics';
import { parseList, displayForm, formsText, type VocabRecord } from '../../src/schema';
import { createPace, observe } from '../../src/engine/pace';
import { requiredLength } from '../../src/engine/typing';
import {
  STEP_MS, WORLD, advance, defaultMeasure, placeStack, createWorld, shipBounds, budgetSpeed, kickApex, tick, typeChar, type World, type WorldEvent,
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
  it('ships descend', () => {
    const w0 = createWorld([boerse]);
    const w1 = tick(w0);
    expect(w1.ships[0].y).toBeGreaterThan(w0.ships[0].y);
    expect(w1.time).toBeCloseTo(STEP_MS);
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
  const lowBurst = (seed: number) => {
    let w = createWorld([boerse, anlegen], { seed });
    w = { ...w, ships: w.ships.map((s) => ({ ...s, y: 300 })) };
    return typeText(w, w.ships[0].text);
  };
  const bands = (w: World) =>
    kids(w).map(shipBounds).sort((a, b) => a.y0 - b.y0);
  const disjointRows = (w: World) => {
    const b = bands(w);
    for (let i = 1; i < b.length; i++) expect(b[i].y0).toBeGreaterThanOrEqual(b[i - 1].y1 - 1e-6);
  };

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
    let w = lowBurst(5);
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

describe('world options: score, width, aids (P2.T1)', () => {
  const burstOf = (w: World) => typeText(w, w.ships.find((s) => s.kind === 'mothership')!.text);

  it('starts at the given score and defaults to width 960 with both aids on', () => {
    expect(createWorld([boerse], { score: 120 }).score).toBe(120);
    const d = createWorld([boerse]);
    expect(d.score).toBe(0);
    expect(d.width).toBe(960);
    expect(d.aids).toEqual({ chip: true, translation: true });
  });

  it('a narrower width bounds mothership entry and child edge bounces', () => {
    for (let seed = 1; seed < 12; seed++) {
      const w0 = createWorld([boerse], { width: 720, seed });
      const m = w0.ships[0];
      expect(m.x).toBeGreaterThanOrEqual(m.w / 2);
      expect(m.x).toBeLessThanOrEqual(720 - m.w / 2);
      let w = burstOf(w0);
      for (let i = 0; i < 60; i++) {
        w = advance(w, 250);
        for (const s of w.ships) expect(shipBounds(s).x1).toBeLessThanOrEqual(720 + 1e-6);
      }
    }
  });

  it('with aids off escorts carry no chip or translation and are no wider than their text', () => {
    const w = burstOf(createWorld([boerse], { aids: { chip: false, translation: false } }));
    const escorts = byKind(w, 'escort');
    expect(escorts.length).toBeGreaterThan(0);
    for (const e of escorts) {
      expect(e.chip).toBeUndefined();
      expect(e.translation).toBeUndefined();
      expect(e.w).toBeCloseTo(defaultMeasure(e.text) + 2 * hullExtent('escort').side, 6);
    }
    const on = byKind(burstOf(createWorld([boerse])), 'escort');
    expect(on[0].translation).toBeDefined();
    expect(on[0].w).toBeGreaterThan(escorts[0].w - 1e-9);
  });
});

describe('game over grades on-screen records with an escaped ship (P2.T2)', () => {
  it('resolves the record (escaped) before game-over; a record without an escape is not resolved', () => {
    let w = createWorld([boerse], { lives: 1, seed: 3 });
    w = typeText(w, w.ships[0].text);
    expect(w.ships.length).toBeGreaterThan(1);
    const events: WorldEvent[] = [];
    for (let i = 0; i < 100000 && w.status === 'playing'; i++) {
      w = tick(w);
      events.push(...w.events);
    }
    expect(w.status).toBe('game-over');
    const resolved = events.filter((e) => e.type === 'resolved');
    expect(resolved).toHaveLength(1);
    expect(resolved[0]).toMatchObject({ recordId: boerse.id, stats: { escaped: true } });
    expect(events.findIndex((e) => e.type === 'resolved')).toBeLessThan(events.findIndex((e) => e.type === 'game-over'));
    expect(w.results[boerse.id].escaped).toBe(true);
  });

  it('at game over only the on-screen record with an escaped ship resolves; another open record does not', () => {
    let w = createWorld([boerse, phrase], { lives: 1, seed: 3 });
    w = typeText(w, w.ships[0].text); // boerse breaks up: open ships
    // phrase is also on screen with an open ship and no escape
    w = { ...w, queue: [], records: { ...w.records, [phrase.id]: { ...w.records[phrase.id], open: 1 } } };
    expect(w.records[boerse.id].open).toBeGreaterThan(0);
    const events: WorldEvent[] = [];
    for (let i = 0; i < 100000 && w.status === 'playing'; i++) {
      w = tick(w);
      events.push(...w.events);
    }
    expect(w.status).toBe('game-over');
    const resolved = events.filter((e) => e.type === 'resolved');
    expect(resolved).toHaveLength(1);
    expect(resolved[0]).toMatchObject({ recordId: boerse.id, stats: { escaped: true } });
    expect(w.results[phrase.id]).toBeUndefined();
    expect(events.findIndex((e) => e.type === 'resolved')).toBeLessThan(events.findIndex((e) => e.type === 'game-over'));
  });
});

describe('player ship drifts toward its locked target (P2.T3)', () => {
  const at = (w: World, x: number): World => ({ ...w, ships: w.ships.map((s) => ({ ...s, x })) });
  const seconds = (w: World, n: number) => {
    for (let i = 0; i < n * 60; i++) w = tick(w);
    return w;
  };

  it('drift speed is the burst top speed', () => {
    expect(WORLD.playerDriftVx).toBe(WORLD.burstMaxVx);
  });

  it('starts centred and stays put without a lock', () => {
    const w = createWorld([boerse], { width: 720 });
    expect(w.playerX).toBe(360);
    expect(seconds(w, 3).playerX).toBe(360);
  });

  it('moves toward the locked ship by at most the drift speed, never overshooting', () => {
    let w = at(createWorld([boerse]), 100);
    w = typeChar(w, w.ships[0].text[0]);
    expect(w.typing.lock).not.toBeNull();
    const start = w.playerX;
    const after = seconds(w, 1);
    expect(start - after.playerX).toBeGreaterThan(0);
    expect(start - after.playerX).toBeLessThanOrEqual(WORLD.playerDriftVx + 1e-6);
    expect(seconds(w, 2).playerX).toBeLessThan(after.playerX);
    // a very near target is reached exactly, not overshot
    const near = at({ ...w }, w.playerX - 0.1);
    expect(tick(near).playerX).toBeCloseTo(w.playerX - 0.1, 9);
  });

  it('is clamped to the canvas', () => {
    let w = at(createWorld([boerse], { width: 100 }), 50);
    w = typeChar(w, w.ships[0].text[0]);
    expect(w.typing.lock).not.toBeNull();
    expect(tick({ ...w, playerX: 500 }).playerX).toBe(100); // target inside, player outside on the right
    expect(tick({ ...w, playerX: -400 }).playerX).toBe(0); // and on the left
  });
});

describe('released rows clear the HUD and keep a gap (P2.T4)', () => {
  const burst = (opts: Parameters<typeof createWorld>[1] = {}, y?: number) => {
    let w = createWorld([boerse, anlegen], opts);
    if (y !== undefined) w = { ...w, ships: w.ships.map((s) => ({ ...s, y })) };
    return typeText(w, w.ships[0].text);
  };
  const kidsOf = (w: World) => w.ships.filter((s) => s.kind !== 'mothership').sort((a, b) => a.y - b.y);
  const topOverTime = (w: World) => {
    const first = kidsOf(w)[0].id;
    let top = Infinity;
    for (let i = 0; i < 90; i++) {
      w = tick(w);
      const s = w.ships.find((x) => x.id === first)!;
      top = Math.min(top, s.y - s.above);
    }
    return top;
  };

  it.each([1, 2, 3, 4])('the first row never rises above the HUD, even right under it (seed %i)', (seed) => {
    const w = burst({ seed });
    expect(topOverTime(w)).toBeGreaterThanOrEqual(WORLD.minY - 1e-6);
  });

  it.each([1, 2, 3])('consecutive rows are separated by at least bandGap (seed %i)', (seed) => {
    const b = kidsOf(burst({ seed })).map(shipBounds);
    expect(b.length).toBeGreaterThan(2);
    for (let i = 1; i < b.length; i++) expect(b[i].y0 - b[i - 1].y1).toBeGreaterThanOrEqual(WORLD.bandGap - 1e-6);
  });

  it('when the reaction distance and the HUD conflict, the reaction distance wins and the kick shrinks (never below 0)', () => {
    const w = burst({ seed: 2, minReactionS: 20 });
    const kids = kidsOf(w);
    const last = kids[kids.length - 1];
    expect(last.y).toBeLessThanOrEqual(WORLD.playerY - last.speed * 20 + 1e-6);
    for (const k of kids) {
      expect(k.vy).toBeLessThanOrEqual(0);
    }
    expect(topOverTime(w)).toBeGreaterThanOrEqual(WORLD.minY - 1e-6);
  });
});

describe('placeStack', () => {
  const rows = [{ above: 10, below: 10, chars: 30 }, { above: 12, below: 20, chars: 20 }, { above: 8, below: 8, chars: 8 }];
  const pace = createPace();
  const base = { rows, wreckY: 300, pace, minReactionS: 3 };

  it('spaces row centres by below + bandGap + above', () => {
    const { ys } = placeStack(base);
    expect(ys[1] - ys[0]).toBe(10 + WORLD.bandGap + 12);
    expect(ys[2] - ys[1]).toBe(20 + WORLD.bandGap + 8);
  });

  it('centres the stack on the wreck when nothing constrains it', () => {
    const { ys } = placeStack(base);
    expect((ys[0] - 10 + ys[2] + 8) / 2).toBeCloseTo(300, 6);
  });

  it('solves the kick so the apex puts the top hull at the HUD, within 4 px and never above', () => {
    for (const wreckY of [120, 300, 520]) {
      const { ys, kick, speed } = placeStack({ ...base, wreckY });
      expect(kick).toBeGreaterThan(0);
      const top = ys[0] - 10 - kickApex(kick, speed);
      expect(top).toBeGreaterThanOrEqual(WORLD.minY - 1e-6);
      expect(top).toBeLessThanOrEqual(WORLD.minY + 4);
    }
  });

  it('rise-0 floor: a wreck under the HUD keeps the stack below it with no kick', () => {
    const { ys, kick } = placeStack({ ...base, wreckY: WORLD.minY + 14 });
    expect(ys[0] - 10).toBeGreaterThanOrEqual(WORLD.minY - 1e-9);
    expect(kick).toBe(0);
  });

  it('reaction distance wins over the HUD: the kick is 0 when the stack cannot fit', () => {
    const { ys, speed, kick } = placeStack({ ...base, minReactionS: 26 });
    expect(ys[2]).toBeLessThanOrEqual(WORLD.playerY - speed * 26 + 1e-6);
    expect(kick).toBeGreaterThanOrEqual(0);
    expect(placeStack({ ...base, minReactionS: 1000 }).kick).toBe(0);
  });

  it.each([450, WORLD.minY + WORLD.entryGap + 20])('a light stack at a very fast pace spawns below the HUD and peaks at it (p1-r3, wreck %i)', (wreckY) => {
    const light = [{ above: 18, below: 18, chars: 12 }, { above: 18, below: 18, chars: 9 }, { above: 18, below: 18, chars: 6 }];
    for (const spc of [0.05, 0.06, 0.08]) {
      const fast = { spc, chars: 200 };
      const { ys, kick, speed } = placeStack({ rows: light, wreckY, pace: fast, minReactionS: 3 });
      expect(ys[0] - 18).toBeGreaterThanOrEqual(WORLD.minY - 1e-6);
      expect(ys[2] + speed * 3).toBeLessThanOrEqual(WORLD.playerY + 1e-6); // the reaction distance still holds
      if (kick > 0) {
        const top = ys[0] - 18 - kickApex(kick, speed);
        expect(top).toBeGreaterThanOrEqual(WORLD.minY - 1e-6);
        expect(top).toBeLessThanOrEqual(WORLD.minY + 4);
      }
    }
  });

  it('takes the speed from the apex distances, bottom-up', () => {
    const { ys, kick, speed } = placeStack(base);
    const rise = kickApex(kick, speed);
    const want = Math.min(...rows.map((_, i) => budgetSpeed(
      WORLD.playerY - (ys[i] - rise), rows.slice(i).map((r) => r.chars), pace,
    )));
    expect(speed).toBeCloseTo(want, 3);
  });
});

describe('stack order (R1)', () => {
  const rec = (examples: string[]): VocabRecord => ({ ...anlegen, examples: examples.map((e) => ex(e)) });
  const released = (r: VocabRecord) => {
    const w = createWorld([r], { seed: 1 });
    return typeText(w, w.ships[0].text);
  };
  const topToBottom = (w: World) => [...w.ships].sort((a, b) => a.y - b.y);
  const s20 = 'a'.repeat(19) + '.';
  const s45 = 'b'.repeat(44) + '.';
  const s30 = 'c'.repeat(29) + '.';

  it('sentences longest first, then the forms ship lowest', () => {
    const w = released(rec([s20, s45, s30]));
    expect(topToBottom(w).map((s) => s.text.length)).toEqual([45, 30, 20, formsText(anlegen)!.length]);
    expect(topToBottom(w).map((s) => s.kind)).toEqual(['escort', 'escort', 'escort', 'forms']);
  });

  it('equal lengths keep their example order', () => {
    const w = released(rec(['x'.repeat(9) + '1', 'y'.repeat(9) + '2', 'z'.repeat(9) + '3']));
    expect(topToBottom(w).filter((s) => s.kind === 'escort').map((s) => s.id.slice(-2))).toEqual(['e0', 'e1', 'e2']);
  });

  it('a Record without forms spawns only sentences, longest first', () => {
    const w = released({ ...phrase, examples: [ex('kurz'), ex('ein viel längerer Satz')] });
    expect(topToBottom(w).map((s) => s.text)).toEqual(['ein viel längerer Satz', 'kurz']);
  });

  it('a Record without examples spawns only the forms ship', () => {
    const w = released(rec([]));
    expect(w.ships.map((s) => s.kind)).toEqual(['forms']);
  });
});

describe('kick to the top (R2)', () => {
  const apexTop = (wreckY: number) => {
    let w = createWorld([boerse, anlegen], { seed: 3 });
    w = { ...w, ships: w.ships.map((s) => ({ ...s, y: wreckY })) };
    w = typeText(w, w.ships[0].text);
    const kids = w.ships.filter((s) => s.kind !== 'mothership').sort((a, b) => a.y - b.y);
    const top = kids[0].id;
    let min = Infinity;
    for (let i = 0; i < 600 && w.status === 'playing'; i++) {
      w = tick(w);
      const s = w.ships.find((x) => x.id === top)!;
      min = Math.min(min, s.y - s.above);
      if (w.ships.filter((k) => k.kind !== 'mothership').every((k) => k.vy + k.speed >= 0)) break;
    }
    return { min, w };
  };

  it.each([[120, 'the rise-0 floor case'], [300, 'a kicked stack'], [520, 'a kicked stack']])('a wreck at y=%i (%s): the top hull reaches the HUD at the apex', (y) => {
    const { min } = apexTop(y);
    expect(min).toBeGreaterThanOrEqual(WORLD.minY - 1e-6);
    expect(min).toBeLessThanOrEqual(WORLD.minY + 4);
  });

  it.each([300, 520])('a wreck at y=%i kicks the stack upward at spawn (p1-r5)', (y) => {
    let w = createWorld([boerse, anlegen], { seed: 3 });
    w = { ...w, ships: w.ships.map((s) => ({ ...s, y })) };
    w = typeText(w, w.ships[0].text);
    for (const k of w.ships.filter((s) => s.kind !== 'mothership')) expect(k.vy).toBeLessThan(0);
  });

  it('a wreck right under the HUD spawns the stack at or below it, without a kick', () => {
    let w = createWorld([boerse]);
    w = typeText(w, w.ships[0].text);
    const kids = w.ships.filter((s) => s.kind !== 'mothership');
    for (const k of kids) {
      expect(Math.abs(k.vy)).toBe(0);
      expect(k.y - k.above).toBeGreaterThanOrEqual(WORLD.minY - 1e-6);
    }
  });

  it('bands keep their gap and never cross during the flight', () => {
    let { w } = apexTop(300);
    for (let i = 0; i < 200; i++) {
      w = tick(w);
      const b = w.ships.filter((s) => s.kind !== 'mothership').map(shipBounds).sort((p, q) => p.y0 - q.y0);
      for (let k = 1; k < b.length; k++) expect(b[k].y0 - b[k - 1].y1).toBeGreaterThanOrEqual(WORLD.bandGap - 1e-6);
    }
  });
});

describe('pace-driven speeds (R4)', () => {
  const pace = { spc: 0.5, chars: 100 };

  it('a mothership descends at distance / (1.5 x (chars x spc + 0.6))', () => {
    const w = createWorld([boerse], { pace });
    const m = w.ships[0];
    const chars = requiredLength(m.text);
    expect(m.speed).toBeCloseTo(
      Math.min(WORLD.maxSpeed, Math.max(WORLD.minSpeed, (WORLD.playerY - m.y) / (1.5 * (chars * 0.5 + 0.6)))), 9,
    );
  });

  it('budgetSpeed sums the ships below and clamps to 8..140', () => {
    expect(budgetSpeed(300, [8, 10], pace)).toBeCloseTo(300 / (1.5 * (8 * 0.5 + 0.6 + 10 * 0.5 + 0.6)), 9);
    expect(budgetSpeed(1, [50], pace)).toBe(WORLD.minSpeed);
    expect(budgetSpeed(1e6, [1], pace)).toBe(WORLD.maxSpeed);
  });

  it('the wave number changes nothing', () => {
    expect(createWorld([boerse], { pace, wave: 5 }).ships[0].speed).toBe(createWorld([boerse], { pace }).ships[0].speed);
  });

  it('a slower typist gets slower ships', () => {
    const fast = createWorld([boerse], { pace: { spc: 0.2, chars: 100 } }).ships[0].speed;
    const slow = createWorld([boerse], { pace: { spc: 1, chars: 100 } }).ships[0].speed;
    expect(slow).toBeLessThan(fast);
  });

  it('the destroyed mothership updates the pace before its children get their speed (p1-r1)', () => {
    const fast = { spc: 0.1, chars: 100 };
    let w = createWorld([boerse], { seed: 4, pace: fast });
    w = { ...w, ships: w.ships.map((s) => ({ ...s, y: 300 })) };
    const m = w.ships[0];
    w = typeChar(w, m.text[0]);
    w = { ...w, time: w.time + 4000 };
    w = typeText(w, m.text.slice(1));
    const expected = observe(fast, requiredLength(m.text), 4000);
    expect(w.pace.spc).toBeCloseTo(expected.spc, 9);
    expect(w.pace.chars).toBe(expected.chars);
    const rows = w.ships.filter((s) => s.kind !== 'mothership').sort((a, b) => a.y - b.y);
    const rise = kickApex(-rows[0].vy, rows[0].speed);
    const speedFor = (p: typeof fast) => Math.min(...rows.map((_, i) => budgetSpeed(
      WORLD.playerY - (rows[i].y - rise), rows.slice(i).map((r) => requiredLength(r.text)), p,
    )));
    expect(rows[0].speed).toBeGreaterThan(WORLD.minSpeed + 1); // not clamped: the pace matters
    expect(rows[0].speed).toBeCloseTo(speedFor(expected), 3);
    expect(Math.abs(rows[0].speed - speedFor(fast))).toBeGreaterThan(0.5);
  });

  it('budgets count required characters, not the pre-typed final punctuation (p1-r2)', () => {
    const p = { spc: 0.5, chars: 100 };
    const text = 'Guten Tag, bis bald!';
    const rec: VocabRecord = { ...phrase, id: 'phrase-bald', lemma: text, examples: [] };
    const m = createWorld([rec], { pace: p }).ships[0];
    expect(requiredLength(text)).toBe(text.length - 1);
    const want = budgetSpeed(WORLD.playerY - m.y, [text.length - 1], p);
    expect(m.speed).toBeCloseTo(want, 9);
    expect(m.speed).not.toBeCloseTo(budgetSpeed(WORLD.playerY - m.y, [text.length], p), 3);
  });

  it('a stack budgets required characters too (p1-r2)', () => {
    const p = { spc: 0.1, chars: 100 };
    let w = createWorld([boerse], { seed: 4, pace: p });
    w = { ...w, ships: w.ships.map((s) => ({ ...s, y: 300 })) };
    w = typeText(w, w.ships[0].text);
    const rows = w.ships.filter((s) => s.kind !== 'mothership').sort((a, b) => a.y - b.y);
    expect(rows.some((r) => requiredLength(r.text) < r.text.length)).toBe(true);
    const rise = kickApex(-rows[0].vy, rows[0].speed);
    const at = (len: (t: string) => number) => Math.min(...rows.map((_, i) => budgetSpeed(
      WORLD.playerY - (rows[i].y - rise), rows.slice(i).map((r) => len(r.text)), w.pace,
    )));
    expect(rows[0].speed).toBeGreaterThan(WORLD.minSpeed + 1);
    expect(rows[0].speed).toBeCloseTo(at(requiredLength), 3);
    expect(rows[0].speed).not.toBeCloseTo(at((t) => t.length), 3);
  });
});
