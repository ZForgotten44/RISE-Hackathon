---
name: zfgames-ducks-and-art
description: The ducks, card illustrations, images, icons, fonts and audio of zfgames.org, which file draws each one, and the art rules (line art in currentColor, gold only for the one detail). Use before drawing or changing any duck, illustration, card art or asset on ZF Games.
---

# ZF Games ducks, illustrations and assets

The rubber duck is the site's identity. There are several ducks, each with **one** renderer. Change a duck by
editing its source, never by redrawing it somewhere else.

## The ducks

| Duck | Source | Renderer / where it appears |
|---|---|---|
| **Logo / mascot face** | `icon-512.png`, `duck-face.png` (brandmark), favicons | `duck-face.js`: the traced logo face (round head, cheeks, dark eyes with highlight, wide muted-gold bill with an open smile). Giant face in the homepage Games story, turns 3/4 into the **About duck**. |
| **Mansy's duck (author duck)** | `author-duck.png` (glasses, hair, beard, tie) | `author-duck.js` (living eyes overlay), `side-duck.js` (the visitor duck peeking from screen edges), `hint-duck.js` (hints and rules with a bubble), lessons, trainer, computer opponent. The PNG has **empty lenses**: always use `ZPDuck.guide()` / `ZFGuideHTML`, never the bare `<img>`. |
| **Arcade duck** | `arcade-duck-side.svg` (faces right), `arcade-duck-top.svg` (faces up), supplied by mansy | `duck.js` only. Save the Duckie (top view, rotated), One More Bridge, Take Two. Canvas parses the SVG into Path2D; SVG scenes use `<use href="/arcade-duck-*.svg#group">`. |
| **Party / player duck** | `party-duck.js` (`ZPDuck`) | Every party game, Same Pond, Duck Trap, the matchup, reactions, the character creator. Profile (side) and front views; parts: hair + colour, facial hair, headwear + colour, eyewear, expression, neck item, extra. Moods via `data-mood` (`react.js`). Palette: ink `#24231f`, body `#f5f2e8`, bill gold `#c5a23c`. The server cleans ducks with the same rules: duck options live in `party-duck.js` and `server/party/core.js`; run `node tools/duck-check.js` when either changes. |
| **Homepage runner pixel duck** | `index.html` (seeded world) | hops onto the cards in `story.js`. |

## Card illustrations

- Every card's art is an SVG string in a 256×216 drawing, **line art in `currentColor`** on the card surface
  (`--cbg`), so it flips with the card and the theme. Rounded strokes, square cells.
- Resting frame = the last beat of the story, so a visitor who never hovers still sees the idea. Hover / focus / phone
  autoplay replays it once: animate under `.gcard:is(.on,.live)`.
- Files:
  - `zart.js`: shared pieces for cards **and** real boards (Quarto pieces, Pentago marbles, X/O marks...), so a preview
    and the game use the same drawing. `shared.js` `ART.*` builds the classic game cards from it.
  - `party-art.js` (`ZPArt.*`): the party game cards with side-view ducks.
  - `pond-art.js` (`ZPondArt`): Same Pond card, scenes, journey map, props.
  - `trap-art.js` (`ZTrapArt`), `tail-art.js` + `tail-draw.js` (`ZTailArt`, canvas), `c4-art.js` (`ZC4Art`), `emm-art.js` (`ZEmmArt`).
  - Art files load **before** shared.js (it builds the card list).
- **Gold marks only the one detail the picture is about** (a coin, the chosen sign, food). Containers stay neutral.
- Game backdrops (faint large motifs behind a game) are `BACKDROPS` in shared.js at `--bgop` opacity.
- `xo-field.js`: the drifting X/O field (hero, Games corners, About, side margins of reading pages with `body data-xo-page`).
  Never on game boards, rules or party rooms. Each region has its own tuning; keep them separate.

## Image and media assets (paths from repo root)

- Brand: `duck-face.png`, `author-duck.png`, `icon-192.png`, `icon-512.png`, `apple-touch-icon.png`,
  `favicon-16/32/48/96.png`, `favicon.ico`, `site.webmanifest` (theme colours `#0b0b0a` dark, `#f3f2ee` light).
- `og-image.png` is referenced in index.html but **missing** (still a to-do).
- Arcade duck: `arcade-duck-side.svg`, `arcade-duck-top.svg`.
- `/story`: `story/arcade-photo.webp`.
- `/about` (the Mac-like desktop): `about/*.webp` (project images, résumé, chip, neurorover, atlas before/after),
  `about/wallpaper-<name>-<day|night>[-blur|-soft|-thumb].webp` (pyramids default, coast, monterey, ventura, pixel-duck),
  `about/photos/<album>-NN[-t].webp` (everyday, friends, family, places; `-t` = thumbnail), `about/sketch/*.png`
  (layered portrait sketch), `about/voxa/call-en.mp3`, `about/zfg-art-*.webp`.
- Fonts: `fonts/fast-blaze.woff2` (wordmark only). Space Grotesk and IBM Plex Mono come from Google Fonts.
- Audio: `audio/zfgames-1..4.mp3` (soundtrack, `music.js`), `audio/duck-squeak.mp3` (the only recorded effect;
  runner jump and About duck). All other effects are synthesized in `sound.js` (`ZS.play('wood')`, `'squeak'`,
  coin chime, `win`, `lose`, `draw`, `roundend`, reaction `r-*`).
- Connect Four solver data: `c4-solver.wasm`, `c4-book.bin`, `c4-table.bin` (hash stamped into `c4-perfect.js`).
- Prefer WebP for photos, SVG strings for drawings. No stock art, no emoji art, no third-party logos except official
  Simple Icons paths for social links.

## Art rules (mansy)

- No glow, neon or gradients. Subtle shading at most.
- Colour lives in the ducks and pieces; surfaces stay black, charcoal or off-white with thin neutral borders.
- Ducks must read in both tones and at small sizes (badges, rosters).
- When a drawing comes from mansy (SVG, PNG), keep it exactly; add motion as overlays (like author-duck.js eyes).
