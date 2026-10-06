// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { createKeyboard, type Keyboard } from '../../src/platform/keyboard';

let input: HTMLInputElement;
let out: string[];
let kb: Keyboard;
let escapes: number;

function typeInput(data: string, inputType = 'insertText', isComposing = false) {
  input.value += data;
  input.dispatchEvent(new InputEvent('input', { data, inputType, isComposing, bubbles: true }));
}

beforeEach(() => {
  document.body.innerHTML = '';
  input = document.createElement('input');
  document.body.append(input);
  out = [];
  kb?.dispose();
  escapes = 0;
  kb = createKeyboard(input, (c) => out.push(c), { onEscape: () => (escapes += 1) });
});

describe('createKeyboard', () => {
  it('emits plain characters', () => {
    typeInput('a');
    typeInput('b');
    expect(out).toEqual(['a', 'b']);
  });

  it('Option-U + A composes to ä', () => {
    input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
    typeInput('¨', 'insertCompositionText', true);
    input.dispatchEvent(new CompositionEvent('compositionend', { data: 'ä', bubbles: true }));
    expect(out).toEqual(['ä']);
  });

  it('Option-U + X yields x and no dead-key mark', () => {
    input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
    typeInput('¨', 'insertCompositionText', true);
    input.dispatchEvent(new CompositionEvent('compositionend', { data: '¨x', bubbles: true }));
    expect(out).toEqual(['x']);
  });

  it('does not double-emit a trailing non-composing input after compositionend', () => {
    input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
    input.dispatchEvent(new CompositionEvent('compositionend', { data: 'ä', bubbles: true }));
    typeInput('ä', 'insertFromComposition', false);
    expect(out).toEqual(['ä']);
  });

  it('Option-S arrives as plain ß', () => {
    typeInput('ß');
    expect(out).toEqual(['ß']);
  });

  it('clears the input value after each read', () => {
    typeInput('a');
    expect(input.value).toBe('');
    input.dispatchEvent(new CompositionEvent('compositionend', { data: 'ö', bubbles: true }));
    expect(input.value).toBe('');
  });

  it('drops standalone dead-key marks', () => {
    for (const m of ['¨', '´', '`', '^', '~']) typeInput(m);
    expect(out).toEqual([]);
  });

  it('Backspace emits nothing', () => {
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true }));
    typeInput('', 'deleteContentBackward');
    expect(out).toEqual([]);
  });

  it('does not write the input value while composing (would cancel the IME)', () => {
    input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
    typeInput('¨', 'insertCompositionText', true);
    expect(input.value).toBe('¨');
    typeInput('', 'insertCompositionText', false);
    expect(input.value).toBe('¨');
    input.dispatchEvent(new CompositionEvent('compositionend', { data: 'ä', bubbles: true }));
    expect(input.value).toBe('');
    expect(out).toEqual(['ä']);
  });

  it('WebKit order: compositionend then a plain insertText echo yields one ä', () => {
    input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
    typeInput('¨', 'insertCompositionText', true);
    input.dispatchEvent(new CompositionEvent('compositionend', { data: 'ä', bubbles: true }));
    typeInput('ä', 'insertText', false);
    expect(out).toEqual(['ä']);
    // the dedupe is one-shot: a later genuine ä is kept
    typeInput('ä', 'insertText', false);
    expect(out).toEqual(['ä', 'ä']);
  });

  it('refocuses on blur (deferred, for Firefox) and stops after dispose', async () => {
    input.focus();
    input.blur();
    await new Promise((r) => setTimeout(r, 0));
    expect(document.activeElement).toBe(input);
    input.blur();
    kb.dispose();
    await new Promise((r) => setTimeout(r, 0));
    expect(document.activeElement).not.toBe(input);
    kb.dispose();
    typeInput('z');
    expect(out).toEqual([]);
  });
});

describe('createKeyboard suspension and Esc (R5)', () => {
  it('emits nothing while disabled, and nothing is lost on re-enable', () => {
    kb.setEnabled(false);
    typeInput('a');
    expect(out).toEqual([]);
    kb.setEnabled(true);
    typeInput('b');
    expect(out).toEqual(['b']);
  });

  it('does not reclaim focus while disabled, and refocuses on enable', async () => {
    const num = document.createElement('input');
    num.type = 'number';
    document.body.append(num);
    input.focus();
    kb.setEnabled(false);
    num.focus();
    await new Promise((r) => setTimeout(r, 10));
    expect(document.activeElement).toBe(num);
    kb.setEnabled(true);
    expect(document.activeElement).toBe(input);
  });

  it('reclaims focus on blur while enabled', async () => {
    input.focus();
    input.blur();
    await new Promise((r) => setTimeout(r, 10));
    expect(document.activeElement).toBe(input);
  });

  it('calls onEscape on Esc in both states, and not for other keys', () => {
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    kb.setEnabled(false);
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }));
    expect(escapes).toBe(2);
  });

  it('stops listening after dispose', () => {
    kb.dispose();
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    typeInput('x');
    expect(escapes).toBe(0);
    expect(out).toEqual([]);
  });
});
