// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseList, type VocabList } from '../../src/schema';
import { DEFAULT_SETTINGS } from '../../src/platform/settings';
import type { Summary } from '../../src/session/controller';
import {
  bannerPanel, betweenWavePanel, categoryPanel, loadErrorsPanel, modePanel, pausePanel, settingsPanel, summaryPanel, titlePanel,
} from '../../src/ui/panels';
import { injectStyle, themeVariables } from '../../src/ui/style';
import { palette } from '../../src/render/theme';

let root: HTMLElement;
beforeEach(() => {
  document.body.innerHTML = '';
  root = document.createElement('div');
  document.body.append(root);
});

const list = (id: string, title: string): VocabList => {
  const res = parseList(readFileSync('tests/fixtures/lists/two-records.yaml', 'utf8').replace('fixture-two', id).replace('Two-record play fixture', title));
  if (!res.ok) throw new Error(res.errors.join());
  return res.list;
};
const buttons = (el: HTMLElement) => [...el.querySelectorAll('button')].map((b) => b.textContent);
const click = (el: HTMLElement, text: string) => {
  const b = [...el.querySelectorAll('button')].find((x) => x.textContent === text);
  if (!b) throw new Error(`no button ${text}: ${buttons(el)}`);
  b.click();
};

describe('panels (R5, R8, R10)', () => {
  it('title lists bundled and loaded lists, with a Load list… button wired to a hidden file input', () => {
    const onChoose = vi.fn();
    const onLoadFile = vi.fn();
    const p = titlePanel(root, { bundled: [list('a', 'Alpha')], loaded: [list('b', 'Beta')] }, { onChoose, onLoadFile, onSettings: vi.fn() });
    expect(buttons(p.el)).toContain('Alpha (2)');
    expect(buttons(p.el)).toContain('Beta (2)');
    expect(buttons(p.el)).toContain('Load list…');
    const input = p.el.querySelector<HTMLInputElement>('input[type=file]')!;
    expect(input.accept).toBe('.yaml,.yml');
    expect(input.hidden).toBe(true);
    const clicked = vi.spyOn(input, 'click');
    click(p.el, 'Load list…');
    expect(clicked).toHaveBeenCalled();
    const file = new File(['x'], 'x.yaml');
    Object.defineProperty(input, 'files', { value: [file], configurable: true });
    input.dispatchEvent(new Event('change'));
    expect(onLoadFile).toHaveBeenCalledWith(file);
    click(p.el, 'Alpha (2)');
    expect(onChoose).toHaveBeenCalledWith(expect.objectContaining({ list: expect.objectContaining({ id: 'a' }) }));
    p.close();
    expect(root.querySelector('[data-panel]')).toBeNull();
  });

  it('mode shows N due · M new, Study and Free play', () => {
    const h = { onStudy: vi.fn(), onFreePlay: vi.fn(), onBack: vi.fn() };
    const p = modePanel(root, { listTitle: 'L', due: 4, fresh: 7, playable: 11 }, h);
    expect(p.el.textContent).toContain('4 due · 7 new');
    click(p.el, 'Study');
    click(p.el, 'Free play');
    expect(h.onStudy).toHaveBeenCalled();
    expect(h.onFreePlay).toHaveBeenCalled();
  });

  it('mode with nothing due offers free play in the Study slot', () => {
    const h = { onStudy: vi.fn(), onFreePlay: vi.fn(), onBack: vi.fn() };
    const p = modePanel(root, { listTitle: 'L', due: 0, fresh: 0, playable: 11, empty: 'nothing-due' }, h);
    expect(buttons(p.el)).not.toContain('Study');
    click(p.el, 'Nothing due — free play?');
    expect(h.onFreePlay).toHaveBeenCalled();
    expect(h.onStudy).not.toHaveBeenCalled();
  });

  it('mode with no playable records says so and offers no play', () => {
    const p = modePanel(root, { listTitle: 'L', due: 0, fresh: 0, playable: 0 }, { onStudy: vi.fn(), onFreePlay: vi.fn(), onBack: vi.fn() });
    expect(p.el.textContent).toContain('no enriched records to play');
    expect(buttons(p.el)).toEqual(['Back']);
  });

  it('category picker lists categories with playable counts', () => {
    const onPick = vi.fn();
    const p = categoryPanel(root, { categories: [{ id: 'x', title: 'Economy', playable: 5 }, { id: 'y', title: 'Empty', playable: 0 }] }, { onPick, onBack: vi.fn() });
    expect(buttons(p.el)).toContain('Economy (5)');
    expect(p.el.querySelector<HTMLButtonElement>('[data-category=y]')!.disabled).toBe(true);
    click(p.el, 'Economy (5)');
    expect(onPick).toHaveBeenCalledWith('x');
  });

  it('load-errors panel lists every error line', () => {
    const p = loadErrorsPanel(root, { fileName: 'bad.yaml', errors: ['records[0]: a', 'records[1]: b', 'c'] }, { onClose: vi.fn() });
    expect([...p.el.querySelectorAll('li')].map((l) => l.textContent)).toEqual(['records[0]: a', 'records[1]: b', 'c']);
    expect(p.el.textContent).toContain('bad.yaml');
  });

  it('pause has Resume, Settings and Quit to menu', () => {
    const h = { onResume: vi.fn(), onSettings: vi.fn(), onQuit: vi.fn() };
    const p = pausePanel(root, {}, h);
    expect(buttons(p.el)).toEqual(['Resume', 'Settings', 'Quit to menu']);
    click(p.el, 'Resume');
    click(p.el, 'Settings');
    click(p.el, 'Quit to menu');
    expect(h.onResume).toHaveBeenCalled();
    expect(h.onSettings).toHaveBeenCalled();
    expect(h.onQuit).toHaveBeenCalled();
  });

  it('between-wave panel announces the cleared wave and has a recap slot', () => {
    const onContinue = vi.fn();
    const p = betweenWavePanel(root, { wave: 1, more: true, lives: 2, score: 90, weak: ['a'] }, { onContinue });
    expect(p.el.textContent).toContain('Wave 2 cleared');
    expect(p.el.querySelector('[data-slot=recap]')).not.toBeNull();
    click(p.el, 'Next wave');
    expect(onContinue).toHaveBeenCalled();
    const last = betweenWavePanel(root, { wave: 2, more: false, lives: 2, score: 90, weak: [] }, { onContinue });
    expect(buttons(last.el)).toEqual(['Finish']);
  });

  it('between-wave panel shows one recap card per weak record (R6)', () => {
    const recs = list('x', 'X').records;
    const p = betweenWavePanel(root, { wave: 0, more: true, lives: 2, score: 9, weak: [recs[0].id, recs[1].id], recap: recs }, { onContinue: vi.fn() });
    const cards = p.el.querySelectorAll('[data-slot=recap] [data-card]');
    expect(cards).toHaveLength(2);
    const first = cards[0].textContent!;
    expect(first).toContain('die Börse');
    expect(first).toContain('stock exchange');
    expect(first).toContain('die Börsen');
    for (const e of recs[0].examples!) {
      expect(first).toContain(e.de);
      expect(first).toContain(e.en);
    }
    expect(cards[1].textContent).toContain('legte an, hat angelegt');
    expect(p.el.querySelector('[data-slot=recap]')!.textContent).not.toBe('Wave cleared');
  });

  it('recap shows "wave cleared" only when there is nothing to recap (recap off or no Again/Hard)', () => {
    const none = betweenWavePanel(root, { wave: 0, more: true, lives: 2, score: 9, weak: [], recap: [] }, { onContinue: vi.fn() });
    const slot = none.el.querySelector('[data-slot=recap]')!;
    expect(slot.textContent).toBe('Wave cleared');
    expect(slot.querySelector('[data-card]')).toBeNull();
  });

  it('recap cards put list strings in as text, never as markup', () => {
    const rec = { ...list('x', 'X').records[0], gloss: ['<img src=x onerror=alert(1)>'] };
    const p = betweenWavePanel(root, { wave: 0, more: true, lives: 2, score: 9, weak: [rec.id], recap: [rec] }, { onContinue: vi.fn() });
    expect(p.el.querySelector('img')).toBeNull();
    expect(p.el.textContent).toContain('<img src=x');
  });

  it('summary shows grade counts, accuracy, chars/s and score', () => {
    const summary: Summary = {
      mode: 'study', counts: { Again: 1, Hard: 2, Good: 3, Easy: 4 }, graded: 10, accuracy: 0.9234, charsPerSecond: 3.456,
      writeErrors: 0, score: 1234, lives: 1, reason: 'finished',
    };
    const p = summaryPanel(root, { summary }, { onClose: vi.fn() });
    const t = p.el.textContent!;
    expect(t).toContain('92%');
    expect(t).toContain('3.5 chars/s');
    expect(t).toContain('1234');
    for (const g of ['Again', 'Hard', 'Good', 'Easy']) expect(p.el.querySelector(`[data-grade=${g}]`)).not.toBeNull();
    expect(p.el.querySelector('[data-grade=Good] b')!.textContent).toBe('3');
    expect(t).not.toContain('could not be saved');
    const bad = summaryPanel(root, { summary: { ...summary, writeErrors: 2 } }, { onClose: vi.fn() });
    expect(bad.el.textContent).toContain('could not be saved');
  });

  it('settings has four aid toggles, SFX, music and the new-cap field, and reports changes', () => {
    const onChange = vi.fn();
    const p = settingsPanel(root, { settings: DEFAULT_SETTINGS }, { onChange, onClose: vi.fn() });
    const boxes = [...p.el.querySelectorAll<HTMLInputElement>('input[type=checkbox]')].map((b) => b.dataset.setting);
    expect(boxes).toEqual(['aids.chip', 'aids.translation', 'aids.tts', 'aids.recap', 'sfx', 'music']);
    const chip = p.el.querySelector<HTMLInputElement>('[data-setting="aids.chip"]')!;
    chip.checked = false;
    chip.dispatchEvent(new Event('change'));
    expect(onChange).toHaveBeenLastCalledWith({ aids: { chip: false } });
    const cap = p.el.querySelector<HTMLInputElement>('input[type=number]')!;
    expect(cap.value).toBe('10');
    cap.value = '25';
    cap.dispatchEvent(new Event('change'));
    expect(onChange).toHaveBeenLastCalledWith({ newCap: 25 });
  });

  it('settings disables a toggle with its reason', () => {
    const p = settingsPanel(root, { settings: DEFAULT_SETTINGS, ttsUnavailable: 'no German voice' }, { onChange: vi.fn(), onClose: vi.fn() });
    expect(p.el.querySelector<HTMLInputElement>('[data-setting="aids.tts"]')!.disabled).toBe(true);
    expect(p.el.textContent).toContain('no German voice');
  });

  it('banner shows the storage warning and closes', () => {
    const p = bannerPanel(root, { message: 'Progress and settings will not be saved.' });
    expect(root.textContent).toContain('will not be saved');
    p.close();
    expect(root.textContent).toBe('');
  });
});

describe('style', () => {
  it('generates custom properties from the theme and injects one stylesheet', () => {
    const vars = themeVariables();
    expect(vars['--c-background']).toBe(palette.background);
    expect(vars['--c-ship-stroke-escort']).toBe(palette.shipStroke.escort);
    expect(vars['--f-hud']).toBeDefined();
    injectStyle();
    injectStyle();
    expect(document.querySelectorAll('style#typist-style')).toHaveLength(1);
    expect(document.getElementById('typist-style')!.textContent).toContain(`--c-text: ${palette.text}`);
  });

  it('keeps colour literals out of src/ui', () => {
    for (const f of ['style.ts', 'dom.ts', 'app.ts', 'panels/title.ts', 'panels/summary.ts', 'panels/settings.ts']) {
      let src = '';
      try { src = readFileSync(`src/ui/${f}`, 'utf8'); } catch { continue; }
      expect(src, f).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
      expect(src, f).not.toMatch(/\brgba?\(|\bhsla?\(/);
    }
  });
});

describe('panel review fixes', () => {
  it('title counts playable records, not all records (p4-r8)', () => {
    const l = list('a', 'Alpha');
    const mixed: VocabList = { ...l, records: [...l.records, { ...l.records[0], id: 'noun-raw', status: 'raw' }] };
    const p = titlePanel(root, { bundled: [mixed], loaded: [] }, { onChoose: vi.fn(), onLoadFile: vi.fn(), onSettings: vi.fn() });
    expect(buttons(p.el)).toContain('Alpha (2)');
  });

  it('an empty or non-numeric cap keeps the previous value and restores the field (p4-r6)', () => {
    const onChange = vi.fn((patch) => ({ ...DEFAULT_SETTINGS, ...patch }));
    const p = settingsPanel(root, { settings: DEFAULT_SETTINGS }, { onChange, onClose: vi.fn() });
    const cap = p.el.querySelector<HTMLInputElement>('input[type=number]')!;
    cap.value = '';
    cap.dispatchEvent(new Event('change'));
    expect(onChange).not.toHaveBeenCalled();
    expect(cap.value).toBe('10');
    cap.value = '30';
    cap.dispatchEvent(new Event('change'));
    expect(onChange).toHaveBeenLastCalledWith({ newCap: 30 });
    cap.value = '';
    cap.dispatchEvent(new Event('change'));
    expect(cap.value).toBe('30');
  });

  it('a mounted panel focuses its primary button, else its first control (p4-r7)', () => {
    const pause = pausePanel(root, {}, { onResume: vi.fn(), onSettings: vi.fn(), onQuit: vi.fn() });
    expect(document.activeElement).toBe(pause.el.querySelector('[data-action=resume]'));
    pause.close();
    const title = titlePanel(root, { bundled: [list('a', 'Alpha')], loaded: [] }, { onChoose: vi.fn(), onLoadFile: vi.fn(), onSettings: vi.fn() });
    expect(document.activeElement).toBe(title.el.querySelector('button'));
    title.close();
    const st = settingsPanel(root, { settings: DEFAULT_SETTINGS }, { onChange: vi.fn(), onClose: vi.fn() });
    expect(st.el.contains(document.activeElement)).toBe(true);
  });

  it('load errors keep each message whole', () => {
    const p = loadErrorsPanel(root, { fileName: 'x', errors: ['a\nb'] }, { onClose: vi.fn() });
    expect(p.el.querySelectorAll('li')).toHaveLength(1);
    expect(p.el.querySelector('li')!.textContent).toBe('a\nb');
  });
});
