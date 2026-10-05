import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseList, displayForm, formsText, type VocabRecord } from '../../src/schema';
import {
  STEP_MS, advance, createWorld, shipSpeed, tick, typeChar, type World, type WorldEvent,
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
  it('ships descend; longer texts slower in proportion; speed scales per wave', () => {
    expect(shipSpeed(48, 0)).toBeLessThan(shipSpeed(10, 0));
    expect(shipSpeed(24, 0) / shipSpeed(48, 0)).toBeCloseTo(2);
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
