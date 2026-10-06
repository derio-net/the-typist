/** Standalone combining marks left by dead keys that did not compose. */
const DEAD_MARKS = new Set(['¨', '´', '`', '^', '~']);

/**
 * Captures typing from a hidden, always-focused input and reports committed
 * characters one by one. Composition (macOS dead keys) is read from
 * `compositionend.data`; composing `input` events are ignored without touching
 * the input (writing `value` mid-composition cancels the IME in Chromium).
 * Returns a disposer.
 */
export interface Keyboard {
  dispose(): void;
  /**
   * While disabled the keyboard emits no characters and does not reclaim focus, so panel controls keep
   * theirs. Enabling refocuses the input. Esc is reported in both states.
   */
  setEnabled(on: boolean): void;
}

export interface KeyboardOptions {
  onEscape?: () => void;
}

export function createKeyboard(input: HTMLInputElement, onChar: (c: string) => void, opts: KeyboardOptions = {}): Keyboard {
  let disposed = false;
  let enabled = true;
  /** `compositionend.data` awaiting a possible WebKit echo as a plain input event. */
  let lastComposed = '';

  const emit = (text: string) => {
    for (const ch of text) if (!DEAD_MARKS.has(ch)) onChar(ch);
  };

  const onInput = (e: Event) => {
    const ev = e as InputEvent;
    if (ev.isComposing || ev.inputType === 'insertCompositionText' || ev.inputType === 'insertFromComposition') return;
    const read = ev.data ?? input.value;
    input.value = '';
    if (!enabled) return;
    const echo = lastComposed !== '' && read === lastComposed;
    lastComposed = '';
    if (echo) return;
    if (ev.inputType && ev.inputType.startsWith('delete')) return;
    emit(read);
  };
  const onCompositionEnd = (e: Event) => {
    const data = (e as CompositionEvent).data ?? '';
    input.value = '';
    lastComposed = data;
    if (enabled) emit(data);
  };
  const onKeyDown = () => {
    lastComposed = '';
  };
  // on the document, so Esc also works while a panel control holds focus
  const onDocKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') opts.onEscape?.();
  };
  const onBlur = () => {
    // Firefox ignores a synchronous focus() inside blur.
    setTimeout(() => {
      if (!disposed && enabled) input.focus();
    }, 0);
  };

  input.addEventListener('input', onInput);
  input.addEventListener('compositionend', onCompositionEnd);
  input.addEventListener('keydown', onKeyDown);
  input.addEventListener('blur', onBlur);
  document.addEventListener('keydown', onDocKeyDown);
  return {
    setEnabled(on) {
      enabled = on;
      lastComposed = '';
      if (on && !disposed) input.focus();
    },
    dispose() {
      disposed = true;
      document.removeEventListener('keydown', onDocKeyDown);
      input.removeEventListener('input', onInput);
      input.removeEventListener('compositionend', onCompositionEnd);
      input.removeEventListener('keydown', onKeyDown);
      input.removeEventListener('blur', onBlur);
    },
  };
}
