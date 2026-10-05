# Audio prompts for the-typist

## Music (generate it yourself with a music model)

You can use Suno, Udio, ElevenLabs Music or Stable Audio. The music plays
while you read and type German, so it has to stay out of the way.

- **No vocals:** lyrics compete with reading.
- **Steady:** no sudden drops, no loud builds.
- **Loopable:** the game loops the track seamlessly.

### Main gameplay loop

> Instrumental synthwave / chillwave for a calm space typing game, no vocals,
> no spoken words, 92 BPM, steady four-on-the-floor kick at low volume, warm
> analog pads, soft arpeggiated synth in a minor key, gentle sub bass, light
> airy shimmer, focused and meditative, unobtrusive background music for
> concentration, consistent energy throughout with no drops, no build-ups and
> no breakdowns, clean mix with the mid-range left open, 2–3 minutes,
> seamless loop.

### Optional menu / recap track

> Instrumental ambient space music, no vocals, slow 70 BPM, wide evolving pads,
> distant bell-like synth melody, soft and hopeful, very calm, for a game menu
> and between-round review screen, 1–2 minutes, seamless loop.

**Files:**
- Export as `.mp3` (or `.ogg`) at a normal mastering level and put them in
  `public/assets/audio/`: `music-game.mp3` and, optionally, `music-menu.mp3`.
- If the generator doesn't loop cleanly, trim both ends at a bar line. The game
  can also crossfade the loop point.
- Check the generator's licence terms for your use and note them in
  `docs/style-guide.md`.

## Sound effects

**Default:** the game synthesizes its sound effects in code (Web Audio), with
no files. Use the prompts below only if you want recorded or generated effects
instead (for example ElevenLabs Sound Effects). Keep each sound short and
dry, with little reverb, so rapid typing doesn't smear.

- **`hit`:** short, soft sci-fi laser blip, high-pitched, 80 ms, very short
  tail, pleasant enough to hear hundreds of times.
- **`typo`:** short, muted, low electronic error buzz, 120 ms, not harsh.
- **`explode-small`:** small sci-fi ship explosion, crunchy noise burst with a
  quick falling tone, 400 ms.
- **`explode-big`:** larger spaceship explosion with a deep boom and
  scattering metal debris, 900 ms.
- **`escape`:** warning alarm blip, two descending tones, 400 ms (a ship
  reached the player).
- **`wave-clear`:** short bright ascending synth arpeggio, triumphant but
  light, 1 second.
- **`mothership-enter`:** low sci-fi whoosh with a soft engine hum, 700 ms.

**Files:** use `.mp3` or `.ogg`, named as above (`hit.mp3`, …), in
`public/assets/audio/sfx/`.
