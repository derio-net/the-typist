import { fonts, palette } from '../render/theme';

const kebab = (s: string) => s.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);

/** CSS custom properties for every palette colour and font token, so the panels share the canvas's theme. */
export function themeVariables(): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const [k, v] of Object.entries(palette)) {
    if (typeof v === 'string') vars[`--c-${kebab(k)}`] = v;
    else for (const [k2, v2] of Object.entries(v)) vars[`--c-${kebab(k)}-${kebab(k2)}`] = v2;
  }
  for (const [k, v] of Object.entries(fonts)) vars[`--f-${kebab(k)}`] = v;
  return vars;
}

const RULES = `
.panel-overlay { position: fixed; inset: 0; display: grid; place-items: center; z-index: 10;
  background: color-mix(in srgb, var(--c-background) 70%, transparent); color: var(--c-text); font: var(--f-translation); }
.panel { box-sizing: border-box; min-width: min(360px, 92vw); max-width: min(560px, 94vw); max-height: 90vh; overflow: auto;
  padding: 20px 24px; background: var(--c-background); border: 1px solid var(--c-ship-stroke-escort); border-radius: 10px;
  box-shadow: 0 8px 32px var(--c-text-shadow); }
.panel h2 { margin: 0 0 12px; font: var(--f-banner); color: var(--c-text); }
.panel p { margin: 8px 0; }
.panel .muted { color: var(--c-translation); opacity: 0.8; }
.panel .stack { display: flex; flex-direction: column; gap: 8px; margin: 12px 0; }
.panel .row { display: flex; justify-content: space-between; align-items: center; gap: 16px; }
.panel button { font: var(--f-hud); color: var(--c-text); background: var(--c-plate); border: 1px solid var(--c-ship-stroke-escort);
  border-radius: 6px; padding: 8px 14px; cursor: pointer; text-align: left; }
.panel button:hover:not(:disabled), .panel button:focus-visible { border-color: var(--c-typed); outline: none; }
.panel button.primary { border-color: var(--c-typed); color: var(--c-typed); }
.panel button:disabled { opacity: 0.45; cursor: not-allowed; }
.panel ul { margin: 8px 0; padding-left: 18px; }
.panel ul.errors { font: var(--f-ship); color: var(--c-typo-flash); max-height: 40vh; overflow: auto; }
.panel ul.errors li { white-space: pre-wrap; }
.panel .warn { color: var(--c-pending); }
.panel .grades { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin: 12px 0; text-align: center; }
.panel .grades b { display: block; font: var(--f-banner); color: var(--c-typed); }
.panel input[type=number] { width: 5em; font: var(--f-hud); color: var(--c-text); background: var(--c-plate);
  border: 1px solid var(--c-ship-stroke-escort); border-radius: 4px; padding: 4px 6px; }
.panel select { min-width: 0; max-width: 100%; font: var(--f-hud); color: var(--c-text); background: var(--c-plate);
  border: 1px solid var(--c-ship-stroke-escort); border-radius: 4px; padding: 4px 6px; }
.panel [data-slot=voice-row] { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.panel [data-slot=voice-row] select { flex: 1 1 12em; }
.panel [data-slot=transfer-row] { display: flex; flex-wrap: wrap; gap: 8px; }
.panel [data-slot=transfer-status][data-state=error] { color: var(--c-typo-flash); opacity: 1; }
.panel [data-slot=voice-row] button { white-space: nowrap; }
.panel label { display: flex; gap: 8px; align-items: center; }
/* Scrolling cue: shadows at the clipped edges (background-attachment: local hides them at the ends), and a visible scrollbar */
[data-slot=recap] { max-height: 45vh; overflow-y: auto; scrollbar-gutter: stable; padding-bottom: 4px; scrollbar-width: thin; scrollbar-color: var(--c-typed) var(--c-plate);
  background:
    linear-gradient(var(--c-plate) 30%, transparent) top / 100% 24px no-repeat local,
    linear-gradient(transparent, var(--c-plate) 70%) bottom / 100% 24px no-repeat local,
    linear-gradient(var(--c-ship-stroke-escort), transparent) top / 100% 8px no-repeat scroll,
    linear-gradient(transparent, var(--c-ship-stroke-escort)) bottom / 100% 8px no-repeat scroll; }
[data-slot=recap]::-webkit-scrollbar { width: 8px; }
[data-slot=recap]::-webkit-scrollbar-thumb { background: var(--c-typed); border-radius: 4px; }
.recap-card { margin: 8px 0; padding: 8px 10px; border: 1px solid var(--c-ship-stroke-escort); border-radius: 4px; background: var(--c-plate); }
.recap-card h3 { margin: 0; font: var(--f-hud); color: var(--c-typed); }
.recap-card p { margin: 4px 0; }
.recap-card ul { margin: 4px 0 0; padding-left: 16px; font: var(--f-gloss); }
/* in the flow, above the canvas: it never covers the HUD */
.banner { position: relative; z-index: 20; padding: 6px 12px; text-align: center;
  background: var(--c-pending); color: var(--c-background); font: var(--f-chip); }
`;

/** Injects the one stylesheet (idempotent per document). */
export function injectStyle(doc: Document = document): HTMLStyleElement {
  const existing = doc.getElementById('typist-style');
  if (existing) return existing as HTMLStyleElement;
  const vars = Object.entries(themeVariables()).map(([k, v]) => `${k}: ${v};`).join(' ');
  const style = doc.createElement('style');
  style.id = 'typist-style';
  style.textContent = `:root { ${vars} }\n${RULES}`;
  doc.head.append(style);
  return style;
}
