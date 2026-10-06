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

This spec supersedes parts of two earlier specs. Where they differ, this
spec wins:
- **Plan 1** (`docs/superpowers/implemented/specs/2026-10-05-vocab-typer-design.md`):
  R10's TTS of a destroyed ship's text, and the speed design (speed falls with
  the square root of text length).
- **Plan 2** (`docs/superpowers/implemented/specs/2026-10-06-vocab-typer-plan2-design.md`):
  - the TTS trigger and voice choice (the R6 TTS design);
  - the release kick (R13);
  - the stack taking its slowest child's speed.

Matrix rows tied to those parts (`learning-aids`, citing plan 2 R6;
`degraded-states`; `play-feel`, citing plan 2 R13) get updated notes. They
also get this spec's requirement ids as origins where their claim changes.
New rows cover R1–R10, and a `verify: post-merge` row covers the Test Plan.

## Requirements

R1. A destroyed mothership releases its children as a stack of horizontal bands, top to bottom: the sentence ships ordered by text length, longest first (equal lengths keep their example order), then the forms ship, which is always the lowest.
R2. On release, the whole stack is kicked upward so that, at the top of the kick, the top band's hull top is at the bottom of the HUD (`WORLD.minY`, within 4 px), never above it. The bands keep their gap, share one descent speed and never cross. When the stack is too tall to fit between the HUD and the reaction distance above the player line, plan 2's R13 fallback still applies.
R3. The game keeps a typing-rate estimate in seconds per character. Each destroyed ship contributes a sample: its required characters (`requiredLength`, without pre-typed final punctuation) and its lock-to-destruction time. The first 50 observed characters calibrate it: a cumulative average of the samples and a prior worth 10 characters (2.0 characters per second when nothing is remembered); the prior does not count toward the 50. After 50 observed characters it is an exponentially weighted average with an effective window of 50 characters. A single sample is clamped to 0.05–5 seconds per character.
R4. Ship speed is set when a ship spawns, from the current estimate, with a slack of 1.5; "characters" means a ship's required characters (`requiredLength`). A destroyed mothership's own sample updates the estimate before its children spawn. A mothership descends at (its distance to the player line) ÷ (1.5 × (its characters × seconds per character + 3 s)). A released stack descends at the minimum, over each band counted from the bottom, of (that band's distance to the player line at the top of the kick) ÷ (1.5 × the sum, over that band and every band below it, of (characters × seconds per character + 3 s)). Speeds are clamped to 8–140 px/s. The wave number no longer changes speed.
R5. The estimate carries over between waves, is saved to `localStorage` each time a Record resolves, and is the starting point of the next session. A missing or corrupt saved estimate means a fresh calibration.
R6. Speech for a ship (mothership, forms or sentence) starts when the ship is locked, at the first correct keystroke, instead of when it is destroyed — including a ship locked and destroyed by the same keystroke. A ship is spoken at most once. Speaking cancels whatever was being said.
R7. Without a chosen voice, the game uses the best available German voice, ranked: Premium, Enhanced, Natural, Neural or Online voices first (by name or voiceURI); then Google Deutsch; then the adult macOS Eloquence voices (Eddy, Flo, Reed, Sandy, Shelley), which the operator found speak German better than the compact Anna; then other voices; the character voices (Grandma, Grandpa, Rocko) last. Within a rank, `de-DE` comes before other German locales, then by name.
R8. Settings has a voice picker that lists the German voices in rank order after an "Automatic (best available)" default, a Test button that speaks a sample sentence in the selected voice even when the TTS aid is off, and a short hint on installing a better German voice on macOS, Windows and in Chrome or Edge. The choice is saved in the settings. A saved voice that is no longer available falls back to Automatic. When no German voice exists, the picker and Test button are disabled with plan 2's reason.
R9. When IndexedDB works, the game asks the browser for persistent storage (`navigator.storage.persist()`) at startup, and Settings states whether progress is protected from cleanup, may be cleared by the browser, or (in-memory stores) will not be saved.
R10. Settings opened from the title screen (not from pause) has Export progress, which downloads a JSON file (`typist-progress-<yyyy-mm-dd>.json`) holding every list's cards, the daily new-card counts and the typing-rate estimate. It also has Import progress, which reads such a file. An invalid file changes nothing and shows why it was rejected. A valid file's cards and counts are merged in one IndexedDB transaction: an imported card replaces the local one when the local one is missing or was last reviewed earlier; new-card counts take the larger value. After that transaction commits, the imported estimate replaces the local one when it has seen more characters. A message then reports how many cards were imported.

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
- `src/ui/app.ts`: `react` (line 151) receives the World before the step; `reactTo` (line 160) speaks on `destroyed`.
- `src/platform/tts.ts`: `createTts` takes the first voice whose `lang`
  starts with `de` (line 60). On a stock Mac that can be a novelty Eloquence
  voice. `SynthLike.getVoices()` (line 3) types only `lang`. `voiceschanged`
  is subscribed only when no German voice exists at start (lines 59–69), and
  `onChange` fires only when availability changes (lines 50–57).
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
- `placeStack` places the spawn positions with these rules, in order:
  1. spacing;
  2. centring on the wreck;
  3. a rise-0 floor: the top band's hull top at or below `WORLD.minY`, since
     a wreck just under the HUD would otherwise put a centred stack above it,
     where no kick can bring it down;
  4. reaction distance. With pace-driven speeds, lifting the stack raises
     its own speed budget, which can push it behind the HUD at very fast
     paces (review p1-r3). So rule 4 first caps the shared speed to what the
     room below the stack allows. It lifts the stack, winning over rule 3,
     only when the stack is too tall even at `minSpeed`.
- The kick is then solved, not fixed. It is the kick whose apex puts the top
  band's hull top at `WORLD.minY`, within 4 px and never above it. The solve
  uses the World's discrete integrator, not the continuous formula. `tick()`
  decays `vy` and then adds `(speed + vy)·dt`, so after `n` steps the rise is
  `kick·dt·Σ_{i=1..n} dⁱ − v·n·dt`, with `d = e^(−dt/τ)`. The apex is the
  maximum of that over whole steps. A bisection on `kick` meets the
  tolerance.
- When the spawn position already has the top band at the HUD, the kick is
  0, which is rule 5's fallback.
- `WORLD.burstKick` is removed. `kickDecayS` stays as the decay constant τ,
  so most of the rise happens in the first half second, however far it
  travels.

### Typing rate and speed (R3–R5)

- `src/engine/pace.ts` (pure):
  - `Pace = { spc: number; chars: number }`: seconds per character, and the
    real characters observed (the prior is not counted).
  - `createPace(saved?)`: the saved estimate, or `{ spc: 0.5, chars: 0 }`.
  - `observe(p, c, ms)`: the sample `ms/1000/c`, clamped to 0.05–5. The
    weight is `a = c / (10 + p.chars + c)` while `p.chars < 50` (the
    cumulative average with a 10-character prior), else `a = c / (50 + c)`
    (an exponentially weighted average, effective window 50). It returns
    `{ spc: p.spc + a·(sample − p.spc), chars: p.chars + c }`.
  - Ship budgets use `requiredLength(text)` from `typing.ts`, the same count
    the sample divides by.
- The World holds `pace` (from `WorldOptions.pace`), updates it on every
  `destroyed` before anything else that event triggers, so a mothership's
  sample is observed before `spawnChildren` runs, and uses the current value
  whenever it spawns a ship.
  Speed constants live in `WORLD`: `slack: 1.5`, `readS: 3` (reading and retargeting time per ship; 0.6 s at delivery, raised to 3 s after the operator found motherships fell too fast),
  `minSpeed: 8`, `maxSpeed: 140`. `baseSpeed`, `speedPerWave`,
  `referenceLength` and `shipSpeed`'s `wave` argument go.
- Stack speed follows R4. Band distances are measured from the apex
  positions, so the kick's rise is free extra time. The stack's bottom band
  is the forms ship, which is short, so the bottom-up budget matches the
  natural typing order: lowest first.
- `controller.ts` carries `pace` between waves with `lives` and `score`
  (`WorldState` gains `pace`). The app calls `loadPace()` once per session
  and passes it in the controller's options. The controller seeds the first
  wave with it and, like `lives` and `score` (line 149), overrides any `pace`
  from `worldOptions()` on every wave.
- `pace-store.ts`: `loadPace(storage?)` / `savePace(p, storage?)` under
  `typist.pace`, both type-checked and failure-tolerant like the settings
  store. The app saves on every `resolved` event, which also covers quitting
  mid-wave.

### Speech on attack (R6)

- `reactTo` speaks on `lock`, looking the ship up in `prev`, the World
  before the step, and no longer speaks on `destroyed`. A keystroke that
  locks and finishes a ship emits `lock` and `destroyed` in one step, and the
  ship is then gone from the new World; `prev` holds it in both cases.
  Because a lock lasts until destruction, "at most once per ship" holds
  without bookkeeping, and a test pins it.

### Voices (R7, R8)

- `voices.ts`: `rankGermanVoices(voices)` filters `lang` starting with `de`
  and sorts by rank (quality markers in the name: `Premium`, `Enhanced`,
  `Natural`, `Neural`, `Online`, in the name or the voiceURI; then `Google
  Deutsch`; then Eddy, Flo, Reed, Sandy and Shelley; then the rest; then
  Grandma, Grandpa and Rocko), then `de-DE` first, then name.
- `tts.ts`:
  - `SynthLike.getVoices()` widens to `{ name, voiceURI, lang }`.
  - `voices()` returns the ranked list (`{ uri, name, lang }`).
  - `setVoice(uri | null)` selects one; null or an unknown uri means the
    top-ranked voice.
  - `say` uses the selected voice. `preview(text)` speaks regardless of the
    enabled flag.
  - It always subscribes to `voiceschanged`: Chrome delivers network voices
    such as Google Deutsch after the local ones. Each event re-reads and
    re-ranks the list, and `onChange` fires whenever the list or the
    availability changes, so an open Settings panel refreshes.
- `app.ts` calls `tts.setVoice(settings.get().voice)` at startup and after
  every settings change.
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
  Both are offered only when Settings was opened from the title screen, so no
  live World holds a pace that the next `resolved` would save over the
  import. The import parses and validates the file before opening the
  transaction, merges cards and counts in one IndexedDB transaction, and
  calls `savePace` after it commits.

### Music (operator feedback on PR #10)

- Plan 2's audio loops `assets/audio/music-game.mp3` when the file exists,
  but no track ever shipped. The operator chose the CC0 track "Space Shooter
  (Loop)" by Alex McCulloch (opengameart.org). It ships re-encoded at
  128 kbps (about 1.3 MB) and is credited in `CREDITS.md`, as its author
  asks. A test pins the file and the credit.

### Testing

- Existing tests to rewrite or retire:
  - `tests/engine/world.test.ts`:
    - lines 66–77: `shipSpeed` by length and wave;
    - lines 278–281: the `baseSpeed` bound;
    - line 512: `vy > −burstKick`;
    - lines 533–545: `kick == burstKick` and the fixed-rise apex.
  - `tests/ui/app.test.ts`:
    - lines 477–487: speech on every destroyed ship, which becomes speech on
      lock;
    - lines 629–635: grading before speech, which is vacuous once speech
      fires on the first keystroke. Replace it with a test that a speech
      failure on lock does not reach the game loop.
- Unit (Vitest):
  - `world.test.ts`: stack order (length ties, forms last, no forms, no
    examples); apex of the top band at `minY` within 4 px for wrecks high and
    low, asserted by running `tick()` to the apex; a wreck just under the
    HUD (rise-0 floor); the reaction-distance fallback; the mothership's
    sample observed before its children's speed is set; speeds from pace for a mothership
    and a stack, the clamps, and the absence of a wave effect.
  - `pace.test.ts`: the prior, calibration to 50 characters, the moving
    average after it, and the clamp.
  - `controller.test.ts`: pace carried between waves.
  - `pace-store.test.ts`, `settings.test.ts` (voice field).
  - `voices.test.ts`: the ranking table, including the Mac voice set.
  - `tts.test.ts`: `setVoice`, fallback for an unknown voice, `preview`
    while disabled, re-ranking on a late `voiceschanged` that adds a better
    voice.
  - `app.test.ts`: speech on lock and not on destroy, once per ship,
    including a lock and destroy in one keystroke; the saved voice applied
    at startup and on change; Export/Import absent from pause's Settings; pace
    saved on resolve and read back in the next session; the `persist()` call;
    export then import round-trip.
  - `store.test.ts` + `portable.test.ts`: export/import for IndexedDB
    (fake-indexeddb) and memory, merge rules, rejection of an invalid file
    with nothing written.
  - `panels.test.ts`: voice picker, Test, hint, storage line, Export/Import
    controls and messages.
- E2E (Playwright smoke): after the existing run, open Settings from the
  title and export progress, saving the file from `page.waitForEvent('download')`.
  Clear the `cards` and `meta` stores in a readwrite transaction. Do not use
  `deleteDatabase`, which the app's open connection blocks. Import the saved
  file through the hidden file input, and check the cards are back.
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
3. In Settings, check that the automatically chosen voice is not a character
   voice, that the picker lists the German voices, and that Test speaks.
4. Reload the page: progress and the calibrated speed survive. Export
   progress, then import it in another browser and see the cards there.

## Implementation Plans

| Plan | Repo | File | Depends on |
|------|------|------|------------|
| 2026-10-06-ux-flight-and-pacing | `derio-net/the-typist` | `2026-10-06-ux-flight-and-pacing` | — |
