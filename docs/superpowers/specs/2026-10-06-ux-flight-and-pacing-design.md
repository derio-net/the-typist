# the-typist — flight, pacing, speech and portable progress: design

Date: 2026-10-06 · Branch: `feat/ux-flight-and-pacing` · Status: approved in brainstorm

## Goal

UX changes from playing the published game:
- the released stack flies to the top of the screen, ordered so that the
  longest text has the most time;
- ship speed follows the typist's measured typing rate, so every ship can be
  typed;
- speech starts when a ship is first attacked, with a better German voice;
- progress is protected from browser cleanup and can be moved between
  devices.

This spec changes parts of plan 2
(`docs/superpowers/implemented/specs/2026-10-06-vocab-typer-plan2-design.md`):
the TTS trigger and voice choice (its R6/TTS design), and the release kick
(its R13). Where they differ, this spec wins.

## Requirements

R1. A destroyed mothership releases its children as a stack of horizontal bands, top to bottom: the sentence ships ordered by text length, longest first (equal lengths keep their example order), then the forms ship, which is always the lowest.
R2. On release, the whole stack is kicked upward so that, at the top of the kick, the top band's hull top is at the bottom of the HUD (`WORLD.minY`, within 4 px), never above it. The bands keep their gap, share one descent speed and never cross. When the stack is too tall to fit between the HUD and the reaction distance above the player line, plan 2's R13 fallback still applies.
R3. The game keeps a typing-rate estimate in seconds per character. Each destroyed ship contributes its expected characters and its lock-to-destruction time. The first 50 characters calibrate it: a cumulative average that starts from a prior worth 10 characters (2.0 characters per second when nothing is remembered). After 50 characters it is a moving average weighted by characters, with a window of 50. A single ship's sample is clamped to 0.05–5 seconds per character.
R4. Ship speed is set when a ship spawns, from the current estimate, with a slack of 1.5. A mothership descends at (its distance to the player line) ÷ (1.5 × (its characters × seconds per character + 0.6 s)). A released stack descends at the minimum, over each band counted from the bottom, of (that band's distance to the player line at the top of the kick) ÷ (1.5 × the sum, over that band and every band below it, of (characters × seconds per character + 0.6 s)). Speeds are clamped to 8–140 px/s. The wave number no longer changes speed.
R5. The estimate carries over between waves, is saved to `localStorage` each time a Record resolves, and is the starting point of the next session. A missing or corrupt saved estimate means a fresh calibration.
R6. Speech for a ship (mothership, forms or sentence) starts when the ship is locked, at the first correct keystroke, instead of when it is destroyed. A ship is spoken at most once. Speaking cancels whatever was being said.
R7. Without a chosen voice, the game uses the best available German voice, ranked: Premium, Enhanced, Natural, Neural or Online voices first; then Google Deutsch; then other voices; the novelty voices (Eddy, Flo, Grandma, Grandpa, Reed, Rocko, Sandy, Shelley) last. Within a rank, `de-DE` comes before other German locales, then by name.
R8. Settings has a voice picker that lists the German voices in rank order after an "Automatic (best available)" default, a Test button that speaks a sample sentence in the selected voice even when the TTS aid is off, and a short hint on installing a better German voice on macOS, Windows and in Chrome or Edge. The choice is saved in the settings. A saved voice that is no longer available falls back to Automatic. When no German voice exists, the picker and Test button are disabled with plan 2's reason.
R9. When IndexedDB works, the game asks the browser for persistent storage (`navigator.storage.persist()`) at startup, and Settings states whether progress is protected from cleanup, may be cleared by the browser, or (in-memory stores) will not be saved.
R10. Settings has Export progress, which downloads a JSON file (`typist-progress-<yyyy-mm-dd>.json`) holding every list's cards, the daily new-card counts and the typing-rate estimate. It also has Import progress, which reads such a file. An invalid file changes nothing and shows why it was rejected. A valid file is merged in one transaction: an imported card replaces the local one when the local one is missing or was last reviewed earlier; new-card counts take the larger value; the imported estimate replaces the local one when it has seen more characters. A message then reports how many cards were imported.

## Design

### What exists

- `src/engine/world.ts`: `spawnChildren` (line 233) pushes the forms ship
  first and the sentences in example order, then calls `placeStack`, whose
  kick is fixed (`WORLD.burstKick` 220 px/s, `kickDecayS` 0.45 s, about 99 px
  of rise). `shipSpeed(length, wave)` (line 163) sets every ship's speed from
  `baseSpeed`, `speedPerWave` and `referenceLength`; a stack shares the
  slowest child's speed.
- `src/engine/typing.ts`: `step` emits `lock` (line 114) on the first correct
  keystroke at an unlocked ship. A lock is held until the ship is destroyed,
  so each ship locks at most once. `destroyed` carries `lockAt`,
  `destroyedAt` and `expectedChars`.
- `src/ui/app.ts`: `reactTo` (line 157) speaks on `destroyed`.
- `src/platform/tts.ts`: `createTts` takes the first voice whose `lang`
  starts with `de`. On a stock Mac that can be a novelty Eloquence voice.
- `src/srs/store.ts`: IndexedDB database `typist`, stores `cards` (keys
  `[listId, recordId]`) and `meta` (keys `['new', listId, day]`), with a
  memory fallback. Progress already persists per browser on the published
  site; nothing asks for persistent storage, and nothing exports it.
- `src/platform/settings.ts`: one `localStorage` key, `typist.settings`,
  with a type-checked merge.

### Module layout (new or changed)

```
src/engine/pace.ts         typing-rate estimate: create, observe, secondsPerChar (pure)
src/engine/world.ts        stack order, kick-to-top, pace-driven speeds, pace in World
src/session/controller.ts  carries pace between waves like lives and score
src/platform/pace-store.ts load/save the estimate under `typist.pace`
src/platform/voices.ts     German voice ranking (pure)
src/platform/tts.ts        ranked voices, setVoice, preview, voices()
src/platform/settings.ts   `voice: string | null` (a voiceURI)
src/srs/store.ts           exportAll / importAll on CardStore (IDB + memory)
src/srs/portable.ts        progress file format: zod schema, serialize, parse, merge rules
src/ui/app.ts              speak on lock, save pace, persist() request, export/import wiring
src/ui/panels/settings.ts  voice picker, Test, hint, storage line, Export/Import
```

### Stack order and flight (R1, R2)

- `spawnChildren` builds the children list as the sentences sorted by
  `text.length` descending (a stable sort), followed by the forms ship.
- `placeStack` keeps rules 1, 2 and 4 (spacing, centring on the wreck,
  reaction distance) for the spawn positions. The kick is then solved, not
  fixed: the smallest kick whose apex puts the top band's hull top at
  `WORLD.minY` (within 4 px, never above), given the shared descent speed and
  the decay constant. The apex of `y(t) = y0 − kick·τ·(1 − e^(−t/τ)) + v·t` is
  at `t* = τ·ln(kick/v)`; a bisection on `kick` meets the 4 px tolerance.
  When rule 4 has pushed the stack so far up that the top band is already at
  the HUD, the kick is 0 (rule 5's fallback, unchanged).
- The kick is a burst: with `τ = kickDecayS` most of the rise happens in the
  first half second, however far it travels.

### Typing rate and speed (R3–R5)

- `src/engine/pace.ts` (pure):
  - `Pace = { spc: number; chars: number }`: seconds per character, and the
    characters it has seen (the prior counts as 10).
  - `createPace(saved?)`: the saved estimate, or `{ spc: 0.5, chars: 10 }`.
  - `observe(p, chars, ms)`: the sample `ms/1000/chars`, clamped to
    0.05–5; weight `a = chars / (min(p.chars, 50) + chars)`; returns
    `{ spc: p.spc + a·(sample − p.spc), chars: p.chars + chars }`. Below 50
    characters this is the cumulative average from the prior; above it is a
    50-character moving average.
- The World holds `pace` (from `WorldOptions.pace`), updates it on every
  `destroyed`, and uses the current value whenever it spawns a ship.
  Speed constants live in `WORLD`: `slack: 1.5`, `retargetS: 0.6`,
  `minSpeed: 8`, `maxSpeed: 140`. `baseSpeed`, `speedPerWave`,
  `referenceLength` and `shipSpeed`'s `wave` argument go.
- Stack speed follows R4. Band distances are measured from the apex
  positions, so the kick's rise is free extra time. The stack's bottom band
  is the forms ship, which is short, so the bottom-up budget matches the
  natural typing order: lowest first.
- `controller.ts` carries `pace` between waves with `lives` and `score`
  (`WorldState` gains `pace`).
- `pace-store.ts`: `loadPace(storage?)` / `savePace(p, storage?)` under
  `typist.pace`, both type-checked and failure-tolerant like the settings
  store. The app saves on every `resolved` event, which also covers quitting
  mid-wave.

### Speech on attack (R6)

- `reactTo` speaks on `lock`, looking up the ship in the current World, and
  no longer speaks on `destroyed`. Because a lock lasts until destruction,
  "at most once per ship" holds without bookkeeping; a test pins it.

### Voices (R7, R8)

- `voices.ts`: `rankGermanVoices(voices)` filters `lang` starting with `de`
  and sorts by rank (quality markers in the name: `Premium`, `Enhanced`,
  `Natural`, `Neural`, `Online`; then `Google Deutsch`; then the rest; then
  the novelty names), then `de-DE` first, then name.
- `tts.ts`: `voices()` returns the ranked list (`{ uri, name, lang }`);
  `setVoice(uri | null)` selects one (null or unknown means the top-ranked
  voice); `say` uses it; `preview(text)` speaks regardless of the enabled
  flag. The voice list is re-read on `voiceschanged`, and `onChange`
  listeners fire so an open Settings panel refreshes.
- Settings stores `voice: string | null` (default null); `merge` accepts a
  string or null.
- The Settings panel adds a `<select data-setting="voice">`, a Test button
  (`data-action="test-voice"`, sample: "Guten Tag! So klingt diese Stimme."),
  and a muted hint:
  - macOS: System Settings › Accessibility › Spoken Content › System voice ›
    Manage Voices…, add a German Premium or Enhanced voice, then reload.
  - Windows: Settings › Time & language › Speech › Add voices › Deutsch.
  - Chrome offers "Google Deutsch"; Edge offers natural "Online" voices.

### Storage protection and portable progress (R9, R10)

- At startup, when `openStores` returned IndexedDB, the app calls
  `navigator.storage?.persist?.()` once. The result (or `persisted()` when
  already granted) feeds a Settings line: "Progress is protected from
  browser cleanup." / "The browser may clear progress if the site goes
  unused." / plan 2's memory warning.
- `CardStore` gains `exportAll(): Promise<ProgressData>` and
  `importAll(data): Promise<ImportReport>`. IndexedDB implements them with a
  cursor over `cards` and over the `meta` keys that start with `'new'`, and
  writes the import in one `readwrite` transaction over both stores.
- `portable.ts`:
  - File shape: `{ format: 'the-typist-progress', version: 1, exportedAt,
    cards: [{ listId, recordId, stored }], newCounts: [{ listId, day, count }],
    pace? }`.
  - Card dates (`due`, `last_review`) are written as ISO strings and revived
    on import. A strict zod schema validates the file before anything is
    written.
  - The merge rules are R10's. A card with no `last_review` is the oldest.
- Settings shows "Export progress" (a Blob download) and "Import progress"
  (a hidden file input), and a status line for the import result or error.

### Testing

- Unit (Vitest):
  - `world.test.ts`: stack order (length ties, forms last, no forms, no
    examples); apex of the top band at `minY` within 4 px for wrecks high and
    low; the reaction-distance fallback; speeds from pace for a mothership
    and a stack, the clamps, and the absence of a wave effect.
  - `pace.test.ts`: the prior, calibration to 50 characters, the moving
    average after it, and the clamp.
  - `controller.test.ts`: pace carried between waves.
  - `pace-store.test.ts`, `settings.test.ts` (voice field).
  - `voices.test.ts`: the ranking table, including the Mac voice set.
  - `tts.test.ts`: `setVoice`, fallback for an unknown voice, `preview`
    while disabled.
  - `app.test.ts`: speech on lock and not on destroy, once per ship; pace
    saved on resolve and read back in the next session; the `persist()` call;
    export then import round-trip.
  - `store.test.ts` + `portable.test.ts`: export/import for IndexedDB
    (fake-indexeddb) and memory, merge rules, rejection of an invalid file
    with nothing written.
  - `panels.test.ts`: voice picker, Test, hint, storage line, Export/Import
    controls and messages.
- E2E (Playwright smoke): after the existing run, export progress, clear
  IndexedDB, import the file, and check the cards are back.
- Visual: a capture of a release (forms lowest, longest sentence on top, the
  apex at the HUD) and of the Settings panel.

### Out of scope

- Cloud sync across devices (export/import covers moving progress by hand).
- Pre-recorded neural audio.
- A difficulty ramp across waves: the operator chose pure adaptation.
- A pace slider in Settings.

## Test Plan

Post-merge, operator-driven, on https://derio-net.github.io/the-typist/:

1. Play a study session. Check that the released children rise to the top
   of the screen, that the forms ship is the lowest band and the longest
   sentence the highest, and that speech starts on the first keystroke at a
   ship.
2. After about 50 letters, the ships' speed should feel matched to your
   typing: hard, but with time to finish everything.
3. In Settings, check that the automatically chosen voice is not a novelty
   voice, that the picker lists the German voices, and that Test speaks.
4. Reload the page: progress and the calibrated speed survive. Export
   progress, then import it in another browser and see the cards there.

## Implementation Plans

| Plan | Repo | File | Depends on |
|------|------|------|------------|
