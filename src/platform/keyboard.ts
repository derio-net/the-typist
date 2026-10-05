/** Standalone combining marks left by dead keys that did not compose. */
const DEAD_MARKS = new Set(['¨', '´', '`', '^', '~']);

/**
 * Captures typing from a hidden, always-focused input and reports committed
 * characters one by one. Composition (macOS dead keys) is read from
 * `compositionend.data`; composing `input` events are ignored without touching
 * the input (writing `value` mid-composition cancels the IME in Chromium).
 * Returns a disposer.
 */
export function createKeyboard(input: HTMLInputElement, onChar: (c: string) => void): () => void {
  let disposed = false;
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
    emit(data);
  };
  const onKeyDown = () => {
    lastComposed = '';
  };
  const onBlur = () => {
    // Firefox ignores a synchronous focus() inside blur.
    setTimeout(() => {
      if (!disposed) input.focus();
    }, 0);
  };

  input.addEventListener('input', onInput);
  input.addEventListener('compositionend', onCompositionEnd);
  input.addEventListener('keydown', onKeyDown);
  input.addEventListener('blur', onBlur);
  return () => {
    disposed = true;
    input.removeEventListener('input', onInput);
    input.removeEventListener('compositionend', onCompositionEnd);
    input.removeEventListener('keydown', onKeyDown);
    input.removeEventListener('blur', onBlur);
  };
}
