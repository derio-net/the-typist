import { describe, expect, it } from 'vitest';
import { displayForm, formsText } from '../../src/schema/display';
import type { VocabRecord } from '../../src/schema/record';

const rec = (over: Partial<VocabRecord> & { type: VocabRecord['type'] }): VocabRecord => ({
  id: 'x', lemma: 'x', gloss: ['x'], status: 'enriched', source_lines: [1], ...over,
});

describe('displayForm', () => {
  it('noun with article', () => {
    expect(displayForm(rec({ type: 'noun', lemma: 'Börse', noun: { gender: 'f', plural: 'Börsen' } }))).toBe('die Börse');
    expect(displayForm(rec({ type: 'noun', lemma: 'Haus', noun: { gender: 'n', plural: 'Häuser' } }))).toBe('das Haus');
  });
  it('noun with variants', () => {
    expect(
      displayForm(rec({
        type: 'noun', lemma: 'Anleger',
        noun: { gender: 'm', plural: 'Anleger', variants: [{ lemma: 'Anlegerin', gender: 'f', plural: 'Anlegerinnen' }] },
      })),
    ).toBe('der Anleger / die Anlegerin');
  });
  it('reflexive verb', () => {
    const verb = { auxiliary: 'haben' as const, reflexive: true, parts: { praesens_3sg: 'meldet an', praeteritum: 'meldete an', partizip2: 'angemeldet' } };
    expect(displayForm(rec({ type: 'verb', lemma: 'anmelden', verb }))).toBe('sich anmelden');
  });
  it('adjective and phrase use the lemma', () => {
    expect(displayForm(rec({ type: 'adjective', lemma: 'wichtig' }))).toBe('wichtig');
    expect(displayForm(rec({ type: 'phrase', lemma: 'Daumen drücken' }))).toBe('Daumen drücken');
  });
});

describe('formsText', () => {
  it('noun plural', () => {
    expect(formsText(rec({ type: 'noun', lemma: 'Börse', noun: { gender: 'f', plural: 'Börsen' } }))).toBe('die Börsen');
  });
  it('none for plural null, plural_only, phrase', () => {
    expect(formsText(rec({ type: 'noun', noun: { gender: 'm', plural: null } }))).toBeNull();
    expect(formsText(rec({ type: 'noun', noun: { gender: 'f', plural: 'Nebenkosten', plural_only: true } }))).toBeNull();
    expect(formsText(rec({ type: 'phrase' }))).toBeNull();
  });
  it('verb principal parts with auxiliary', () => {
    const verb = { auxiliary: 'haben' as const, reflexive: false, parts: { praesens_3sg: 'legt an', praeteritum: 'legte an', partizip2: 'angelegt' } };
    expect(formsText(rec({ type: 'verb', verb }))).toBe('legte an, hat angelegt');
    expect(formsText(rec({ type: 'verb', verb: { ...verb, auxiliary: 'sein', parts: { ...verb.parts, partizip2: 'gegangen', praeteritum: 'ging' } } }))).toBe('ging, ist gegangen');
  });
  it('adjective forms only when gradable', () => {
    expect(formsText(rec({ type: 'adjective', adjective: { gradable: true, comparative: 'wichtiger', superlative: 'am wichtigsten' } }))).toBe('wichtiger, am wichtigsten');
    expect(formsText(rec({ type: 'adjective', adjective: { gradable: false } }))).toBeNull();
  });
});
