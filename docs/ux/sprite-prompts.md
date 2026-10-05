# Sprite prompts for the-typist

These prompts produce assets for the UX pass between plan 1 and plan 2. Prepend
the style block to every asset prompt so the assets share one look. Generate
one asset per request, because image models rarely keep a whole sprite sheet
consistent.

## Delivery requirements (for every asset)

- **Background:** transparent PNG. If the model can't do alpha, use a flat
  pure-magenta `#FF00FF` background with no glow touching it. We key it out.
- **Bullets and explosions:** a pure black `#000000` background is fine. They
  are drawn with additive blending, so black disappears.
- **Size:** generate at roughly 1024 px on the long side. The game downsamples.
- **Framing:** one object, centred, with nothing cropped at the edges and no
  text, letters, numbers, logos or UI in the image. The game draws all text.
- **Hulls (motherships, forms ships, sentence ships):** these are stretched
  horizontally to fit their text (3-slice). The left and right ends hold all
  the detail. The **central 60% must be a plain, uniform horizontal band** that
  looks identical when stretched: no rivets, no lights, no gradient running
  left to right. Across that band sits a dark glass display strip where the
  game prints the word.

## Style block (prepend to every prompt)

> Game sprite, pre-rendered 3D look like a polished Blender/Octane render,
> slightly top-down three-quarter view seen from below-front, single key light
> from the upper left with a soft cyan rim light from the right, glossy painted
> metal with subtle panel lines, crisp silhouette readable at small size, clean
> stylised sci-fi (not gritty, not photoreal), deep-space palette, no text, no
> watermark, isolated object, transparent background.

## Assets

### 1. Mothership hull (one per vocabulary record: the headword)

> A wide, low alien carrier hull shaped like a horizontal capsule, about four
> times wider than tall. Rich violet and deep purple armour with gold trim at
> both ends. Small swept fins and a glowing engine cluster sit on the LEFT and
> RIGHT end caps only. The whole central section is one plain, uniform violet
> band with a long, dark, glossy glass display strip running straight across
> it (empty, no text). There's a faint purple underglow.

### 2. Forms ship (the plural / principal-parts ship)

> A sleek, wide diamond-shaped scout hull, about four times wider than tall,
> with pointed left and right tips. Teal and cyan metal with bright cyan edge
> lights at both tips. The central 60% is a plain, uniform teal band with an
> empty dark glass display strip straight across it. It looks lighter and
> faster than the carrier.

### 3. Sentence ship (one per example sentence; can get very wide)

> A long, slim freighter barge hull, about six times wider than tall, made of
> steel blue and slate grey plating. Its compact cockpit and cargo details sit
> ONLY on the left and right end caps, with small amber running lights. The
> long central section is a plain, uniform steel-blue band with an empty dark
> glass display strip straight across it. It has a modest, workmanlike look.

### 4. Player ship (bottom centre, aims upward)

> A compact defensive turret-fighter seen from slightly behind and above,
> pointing straight up. Mint green and white armour, a twin-barrel cannon on
> top, a glowing mint engine at the bottom, and symmetrical wings. It is heroic
> but small, and about as wide as it is tall.

### 5. Bullet (fired at the locked ship)

> A single glowing plasma bolt pointing straight up: an elongated teardrop with
> a hot white core fading to mint green and a short soft trail below it. It is
> very bright, on a pure black background.

### 6. Explosion burst (we animate it in code with scale, fade and particles)

> A single spherical energy explosion seen head-on: a white-hot core, orange
> and violet fire, an expanding shockwave ring and a few bright sparks flying
> outward. It is round and centred, on a pure black background.

If the model handles sprite sheets well, ask for this instead:

> The same explosion as 8 animation frames in one horizontal row, evenly
> spaced and growing from a small flash to fading smoke, on a pure black
> background.

### 7. Optional extras

- **Lock-on reticle:** thin mint-green targeting brackets (four corner
  brackets), glowing, flat, on a transparent background.
- **Hull debris:** 3 to 4 small tumbling metal fragments in violet, teal and
  steel blue, on a transparent background. These are used for the break-up
  effect.
- **Background:** a seamless, very dark navy deep-space nebula tile with faint
  stars, low contrast so text stays readable, 2048×2048, tileable.

## Where the files go

- **Folder:** put them in `public/assets/sprites/`, named `mothership.png`,
  `forms.png`, `sentence.png`, `player.png`, `bullet.png` and `explosion.png`
  (or `explosion-sheet.png`).
- **Wiring:** the plan-2 UX phase connects them through the `drawShip` hook in
  `src/render/theme.ts`, which already gives each ship its box.
- **Licence:** note each asset's source and licence in `docs/style-guide.md`.
