import type { VocabList } from '../schema';
import { advance, typeChar, type World, type WorldEvent } from '../engine/world';
import { createKeyboard, type Keyboard } from '../platform/keyboard';
import { createTts, type Tts } from '../platform/tts';
import { createAudio, type Audio } from '../platform/audio';
import { loadPace, savePace } from '../platform/pace-store';
import { createSettings, type SettingsStore } from '../platform/settings';
import { loadFile } from '../content/picker';
import { bundledLists } from '../content/bundled';
import { createRenderer, type Renderer, type RendererOptions } from '../render/renderer';
import { pickWidth } from '../render/canvas-size';
import { createController, type Controller, type SessionMode } from '../session/controller';
import { buildFreePlay, buildStudy, isPlayable, seededRng, type Built } from '../session/build';
import { localDay, openStores, type StoredCard, type Stores } from '../srs/store';
import type { Panel } from './dom';
import { h } from './dom';
import {
  bannerPanel, betweenWavePanel, categoryPanel, loadErrorsPanel, modePanel, pausePanel, settingsPanel, summaryPanel, titlePanel,
} from './panels';
import { injectStyle } from './style';

export type AppState = 'title' | 'mode' | 'category' | 'settings' | 'play' | 'pause' | 'between-wave' | 'summary';

export const STORAGE_WARNING = "Progress and settings won't be saved: browser storage is unavailable.";

export interface AppDeps {
  root: HTMLElement;
  bundled?: VocabList[];
  stores?: Stores;
  settings?: SettingsStore;
  /** Storage for the typing-rate estimate; defaults to `localStorage`. */
  paceStorage?: Storage;
  now?: () => Date;
  /** Frame scheduler; defaults to `requestAnimationFrame`. */
  raf?: (cb: (t: number) => void) => number;
  caf?: (id: number) => void;
  makeRenderer?: (canvas: HTMLCanvasElement, width: number, opts?: RendererOptions) => Renderer;
  tts?: Tts;
  audio?: Audio;
  /** Seeds the shuffles and the Worlds; defaults to a random seed per session. */
  seed?: number;
  /** Max milliseconds of one frame fed to the World (a stalled tab must not warp the game). */
  maxFrameMs?: number;
}

export interface App {
  state(): AppState;
  world(): World | undefined;
  /** Resolves once every pending async transition (store reads, session writes) has settled. */
  settled(): Promise<void>;
  dispose(): void;
}

/** The app: a state machine wiring keyboard, renderer, World, controller, stores and settings. Markup lives in the panels. */
export async function startApp(deps: AppDeps): Promise<App> {
  const { root } = deps;
  const now = deps.now ?? (() => new Date());
  const raf = deps.raf ?? ((cb) => requestAnimationFrame(cb));
  const caf = deps.caf ?? ((id) => cancelAnimationFrame(id));
  const maxFrameMs = deps.maxFrameMs ?? 250;
  const bundled = deps.bundled ?? bundledLists();
  const loaded: VocabList[] = [];
  const settings = deps.settings ?? createSettings();
  const tts = deps.tts ?? createTts();
  const audio = deps.audio ?? createAudio();
  const stores = deps.stores ?? (await openStores());

  injectStyle(root.ownerDocument);
  root.textContent = '';
  const canvas = h('canvas');
  const input = h('input', { autocomplete: 'off', 'aria-label': 'typing input', style: 'position:absolute;opacity:0;left:0;top:0;width:1px;height:1px' });
  root.append(canvas, input);
  let banner: Panel | undefined;
  /** The storage banner sits in the page flow above the canvas, so the canvas fits what is left of the window. */
  const availableHeight = () => Math.max(1, window.innerHeight - (banner?.el.offsetHeight ?? 0));
  const width = () => pickWidth(window.innerWidth, availableHeight());
  const renderer = (deps.makeRenderer ?? createRenderer)(canvas, width(), { availableHeight });

  let state: AppState = 'title';
  let world: World | undefined;
  let controller: Controller | undefined;
  let unsubscribe: (() => void) | undefined;
  let panel: Panel | undefined;
  let pending: Promise<void> = Promise.resolve();
  let lastNow = 0;
  let frameId = 0;
  let disposed = false;
  let settingsReturn: AppState = 'title';
  let list: VocabList | undefined;

  const warn = () => {
    if (banner) return;
    banner = bannerPanel(root, { message: STORAGE_WARNING });
    renderer.refit();
  };
  if (!stores.persistent || !settings.persistent) warn();

  const keyboard: Keyboard = createKeyboard(input, (c) => {
    if (state !== 'play' || !world || world.status !== 'playing') return;
    step(typeChar(world, c), lastNow);
  }, { onEscape: () => onEscape() });

  // the AudioContext may only be made inside a user gesture
  const doc = root.ownerDocument;
  const unlock = () => audio.unlock();
  doc.addEventListener('keydown', unlock, true);
  doc.addEventListener('pointerdown', unlock, true);
  const syncAudio = () => {
    const { sfx, music } = settings.get();
    audio.setOptions({ sfx, music });
  };
  syncAudio();
  // a German voice may arrive after the settings panel opened: re-render it so the toggle enables
  const offTts = tts.onChange(() => {
    if (state === 'settings') openSettings(settingsReturn);
  });

  const setState = (s: AppState) => {
    state = s;
    keyboard.setEnabled(s === 'play');
    syncAudio();
    // music runs only while playing: every other state, a pause included, silences it
    if (s === 'play') void audio.startMusic();
    else {
      audio.pauseMusic();
      tts.stop();
    }
  };
  const show = (s: AppState, make?: () => Panel) => {
    panel?.close();
    // between sessions no World stays on screen
    if (s === 'title' || s === 'mode' || s === 'category') {
      world = undefined;
      renderer.clear();
    }
    panel = make?.();
    setState(s);
  };
  const track = (p: Promise<void>) => {
    pending = pending.then(() => p).catch(() => undefined);
  };

  /** Takes a new World: draws its effects and hands its events to the controller. */
  function step(next: World, at: number) {
    const prev = world;
    world = next;
    renderer.push(next.events, at);
    // grading first: a sound or speech failure must never cost a grade
    controller?.onWorldEvents(next.events, next);
    if (next.events.some((e) => e.type === 'resolved')) savePace(next.pace, deps.paceStorage);
    react(next.events, prev);
  }

  /** Sound and speech for a step's events; the destroyed ship is looked up in the World before the step. */
  function react(events: readonly WorldEvent[], prev: World | undefined) {
    for (const e of events) {
      try {
        reactTo(e, prev);
      } catch {
        /* sound and speech are garnish: a failure must not reach the game loop */
      }
    }
  }
  function reactTo(e: WorldEvent, prev: World | undefined) {
    if (e.type === 'hit') audio.play('hit');
    else if (e.type === 'typo') audio.play('typo');
    else if (e.type === 'escaped') audio.play('escape');
    else if (e.type === 'wave-complete') audio.play('wave-clear');
    else if (e.type === 'spawned') {
      if (e.kind === 'mothership') audio.play('mothership-enter');
    } else if (e.type === 'destroyed') {
      const ship = prev?.ships.find((s) => s.id === e.shipId);
      audio.play(ship?.kind === 'mothership' ? 'explode-big' : 'explode-small');
      if (ship) {
        tts.setEnabled(settings.get().aids.tts);
        tts.say(ship.text);
      }
    }
  }

  // ---- screens ----
  const title = () =>
    show('title', () =>
      titlePanel(root, { bundled, loaded }, {
        onChoose: (l) => track(chooseList(l)),
        onLoadFile: (f) => track(loadList(f)),
        onSettings: () => openSettings('title'),
      }));

  async function loadList(file: File) {
    const res = await loadFile(file);
    if (!res.ok) {
      show('title', () => loadErrorsPanel(root, { fileName: file.name, errors: res.errors }, { onClose: title }));
      return;
    }
    const at = loaded.findIndex((l) => l.list.id === res.list.list.id);
    if (at >= 0) loaded[at] = res.list;
    else loaded.push(res.list);
    title();
  }

  async function cardsOf(l: VocabList): Promise<{ cards: Record<string, StoredCard>; newToday: number }> {
    try {
      const [cards, newToday] = await Promise.all([stores.cards.all(l.list.id), stores.cards.newCount(l.list.id, localDay(now()))]);
      return { cards, newToday };
    } catch {
      warn();
      return { cards: {}, newToday: 0 };
    }
  }

  async function chooseList(l: VocabList) {
    list = l;
    const { cards, newToday } = await cardsOf(l);
    if (disposed) return;
    const playable = l.records.filter(isPlayable);
    const t = now().getTime();
    const due = playable.filter((r) => cards[r.id] && cards[r.id].card.due.getTime() <= t).length;
    const fresh = Math.min(Math.max(0, settings.get().newCap - newToday), playable.filter((r) => !cards[r.id]).length);
    show('mode', () =>
      modePanel(root, { listTitle: l.list.title, due, fresh, playable: playable.length, empty: playable.length > 0 && due + fresh === 0 ? 'nothing-due' : undefined }, {
        onStudy: () => track(study(l)),
        onFreePlay: () => freePlay(l),
        onBack: title,
      }));
  }

  async function study(l: VocabList) {
    const { cards, newToday } = await cardsOf(l);
    if (disposed) return;
    const built = buildStudy(l, cards, newToday, settings.get().newCap, now(), seededRng(deps.seed ?? (Math.random() * 2 ** 31) | 0));
    if (built.empty) return chooseList(l);
    begin(l, 'study', built);
  }

  function freePlay(l: VocabList) {
    const cats = l.categories ?? [];
    if (cats.length === 0) return play(l, null);
    const playable = l.records.filter(isPlayable);
    show('category', () =>
      categoryPanel(root, {
        categories: [...cats].sort((a, b) => a.order - b.order).map((c) => ({
          id: c.id, title: c.title, playable: playable.filter((r) => (r.categories ?? []).includes(c.id)).length,
        })),
      }, { onPick: (id) => play(l, id), onBack: () => track(chooseList(l)) }));
  }

  function play(l: VocabList, categoryId: string | null) {
    const built = buildFreePlay(l, categoryId, seededRng(deps.seed ?? (Math.random() * 2 ** 31) | 0));
    if (built.empty) {
      track(chooseList(l));
      return;
    }
    begin(l, 'free-play', built);
  }

  function begin(l: VocabList, mode: SessionMode, built: Built) {
    unsubscribe?.();
    renderer.reset();
    controller = createController({
      waves: built.waves!,
      store: stores.cards,
      listId: l.list.id,
      mode,
      now,
      pace: loadPace(deps.paceStorage),
      // evaluated as each wave starts: the window and the aid settings may have changed since the last one
      worldOptions: () => ({
        width: width(),
        measure: renderer.measure,
        aids: { chip: settings.get().aids.chip, translation: settings.get().aids.translation },
        seed: deps.seed ?? (Math.random() * 2 ** 31) | 0,
      }),
    });
    unsubscribe = controller.subscribe((e) => {
      if (e.type === 'storage-error') warn();
      else if (e.type === 'between-wave') {
        show('between-wave', () =>
          betweenWavePanel(root, { wave: e.wave, more: e.more, lives: e.lives, score: e.score, weak: e.weak, recap: recapRecords(e.weak) }, {
            onContinue: continueFromWave,
          }));
      } else if (e.type === 'summary') {
        const done = e.summary;
        show('summary', () => summaryPanel(root, { summary: done }, { onClose: () => (list ? track(chooseList(list)) : title()) }));
      }
    });
    world = controller.start();
    show('play');
  }

  /** The weak Records' cards, unless the recap setting is off. */
  function recapRecords(ids: readonly string[]) {
    if (!settings.get().aids.recap || !list) return [];
    return ids.flatMap((id) => list!.records.filter((r) => r.id === id));
  }

  function continueFromWave() {
    const next = controller?.nextWave();
    if (next) {
      renderer.reset();
      world = next;
      show('play');
    } else {
      // the summary follows the last grade's write
      panel?.close();
      panel = undefined;
      track(controller?.flush() ?? Promise.resolve());
    }
  }

  function openSettings(from: AppState) {
    settingsReturn = from;
    show('settings', () =>
      settingsPanel(root, { settings: settings.get(), ttsUnavailable: tts.status().available ? undefined : tts.status().reason }, {
        onChange: (patch) => {
          const next = settings.set(patch);
          syncAudio();
          if (!settings.persistent) warn();
          return next;
        },
        onClose: closeSettings,
      }));
  }
  function closeSettings() {
    if (settingsReturn === 'pause') pause();
    else title();
  }

  function pause() {
    show('pause', () =>
      pausePanel(root, {}, {
        onResume: resume,
        onSettings: () => openSettings('pause'),
        onQuit: () => {
          controller?.quit(world);
          panel?.close();
          panel = undefined;
          track(controller?.flush() ?? Promise.resolve());
        },
      }));
  }
  function resume() {
    show('play');
  }

  function onEscape() {
    if (state === 'play') pause();
    else if (state === 'pause') resume();
    else if (state === 'settings') closeSettings();
  }

  // ---- frame loop: the World only advances while playing, so a pause never counts as typing time ----
  let prev: number | undefined;
  const frame = (t: number) => {
    lastNow = t;
    if (world) {
      if (state === 'play' && prev !== undefined && world.status === 'playing') step(advance(world, Math.min(t - prev, maxFrameMs)), t);
      renderer.draw(world, t);
    } else renderer.clear();
    prev = t;
    if (!disposed) frameId = raf(frame);
  };
  frameId = raf(frame);

  title();
  return {
    state: () => state,
    world: () => world,
    settled: async () => {
      let p: Promise<void>;
      do {
        p = pending;
        await p;
        await controller?.flush();
      } while (p !== pending);
    },
    dispose() {
      disposed = true;
      caf(frameId);
      unsubscribe?.();
      keyboard.dispose();
      offTts();
      tts.stop();
      doc.removeEventListener('keydown', unlock, true);
      doc.removeEventListener('pointerdown', unlock, true);
      audio.pauseMusic();
      renderer.dispose();
      panel?.close();
      banner?.close();
      root.textContent = '';
    },
  };
}
