/** Standalone combining marks left by dead keys that did not compose. */
const DEAD_MARKS = new Set(['¨', '´', '`', '^', '~']);

/**
 * Captures typing from a hidden, always-focused input and reports committed
 * characters one by one. Composition (macOS dead keys) is read from
 * `compositionend.data`; composing `input` events are ignored. Returns a disposer.
 */
export function createKeyboard(input: HTMLInputElement, onChar: (c: string) => void): () => void {
  const emit = (text: string) => {
    for (const ch of text) if (!DEAD_MARKS.has(ch)) onChar(ch);
  };

  const onInput = (e: Event) => {
    const ev = e as InputEvent;
    const read = ev.data ?? input.value;
    input.value = '';
    // Composition results arrive via compositionend; some browsers echo them again here.
    if (ev.isComposing || ev.inputType === 'insertCompositionText' || ev.inputType === 'insertFromComposition') return;
    if (ev.inputType && ev.inputType.startsWith('delete')) return;
    emit(read);
  };
  const onCompositionEnd = (e: Event) => {
    const data = (e as CompositionEvent).data ?? '';
    input.value = '';
    emit(data);
  };
  const onBlur = () => input.focus();

  input.addEventListener('input', onInput);
  input.addEventListener('compositionend', onCompositionEnd);
  input.addEventListener('blur', onBlur);
  return () => {
    input.removeEventListener('input', onInput);
    input.removeEventListener('compositionend', onCompositionEnd);
    input.removeEventListener('blur', onBlur);
  };
}
