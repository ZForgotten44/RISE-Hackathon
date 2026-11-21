---
name: zfgames-design-tokens
description: ZF Games (zfgames.org) colours, light/dark tones, typography, radii, sizes and breakpoints. Use before writing or changing any CSS, SVG colour or layout on the site.
---

# ZF Games design tokens

Source of truth: `site.css` (the `:root` block and the two tone scopes). Every page loads it. Never hard-code a
neutral colour that a token already covers; read the token with `var(--x)`.

## How theming works (read this first)

- Every area has a **base tone**: `data-tone="light"` or `data-tone="dark"` on `body`, `section`, `footer` or `nav`.
  Homepage: hero `#home` light, `#games` dark, `#about` light, `#terminal` dark, footer dark. Game pages and /arcade are dark.
- One saved switch, `html[data-inv="0|1"]` (set before first paint by `theme.js`, stored in localStorage `zf-invert`),
  flips **every** area at once. Inverted, light areas become dark and dark become light.
- The selectors in site.css are:
  - `html[data-inv="0"] [data-tone="light"], html[data-inv="1"] [data-tone="dark"]` → light values
  - `html[data-inv="0"] [data-tone="dark"],  html[data-inv="1"] [data-tone="light"]` → dark values
- Light mode is **not** `prefers-color-scheme`. To test the light theme, set `localStorage['zf-invert']='1'` (on a dark page).
- `color-scheme` is set per tone so native controls follow.
- New CSS must work in both tones by using the tokens. When a game needs its own colours (e.g. Connect Four discs),
  define them as CSS variables per tone, next to the art file (see `c4-art.js` `--c4-*`).

## Neutral palette (warm greys, never pure #000/#fff surfaces)

| Token | Dark | Light | Use |
|---|---|---|---|
| `--bg` | `#0b0b0a` | `#f3f2ee` | page background |
| `--fg` | `#f4f2ec` | `#141412` | main ink, filled buttons |
| `--g1` | `#141413` | `#e9e7df` | quietest fill |
| `--g2` | `#1c1c1a` | `#dedbd1` | hairlines, control borders |
| `--g3` | `#2b2b28` | `#c8c5ba` | panel borders, section numbers |
| `--g4` | `#45443f` | `#a09d91` | outline-button border |
| `--g5` | `#8b8a83` | `#66645c` | labels, meta, back links |
| `--g6` | `#b3b1a9` | `#46443d` | secondary text |
| `--g7` | `#dcdad2` | `#2c2b27` | strong secondary text |
| `--surf` / `--surf2` / `--surf3` | `#1a1a18` / `#1e1e1c` / `#2a2a27` | `#ebe9e1` / `#e9e7df` / `#dcd9ce` | panels, segmented tracks, hover |
| `--ctl-bg` / `--ctl-bg-hi` | `#1f1f1d` / `#2c2c29` | `#e4e1d7` / `#d8d4c8` | controls |
| `--nav-bg` | `rgba(10,10,10,.88)` | `rgba(243,242,238,.92)` | sticky headers (with `backdrop-filter:blur(12px)`) |
| `--nav-line` | `rgba(255,255,255,.09)` | `rgba(0,0,0,.1)` | header bottom border |
| `--wm`, `--wm-sub`, `--wm-sub-hi` | `#F3F1EB`, `#A8A8A3`, `#c4c4be` | `#141412`, `#55534b`, `#2c2b27` | wordmark and tagline |
| `--tile`, `--stripe`, `--piece-a`, `--piece-b` | `#dcdad2`, `#45443f`, `#f4f2ec`, `#8b8a83` | `#a09d91`, `#2c2b27`, `#141412`, `#66645c` | board tiles and pieces |
| `--cur-fill` / `--cur-line` | `#fff` / `#111` | `#111` / `#fff` | custom triangle cursor (`cursor.js`) |
| `--bgop` | `.07` | `.05` | opacity of game backdrops |

### Card family (game cards)

| Token | Dark tone | Light tone |
|---|---|---|
| `--card-bg` / `--card-edge` / `--card-ink` | `#181817` / `#3a3a37` / `#f4f2ec` | `#faf9f5` / `#1d1d1b` / `#141412` |
| `--card-sub` / `--card-meta` | `#b9b7af` / `#aeaca4` | `#46443d` / `#4a4841` |
| `--card-bg-on` (hovered / focused card flips to the opposite) | `#f3f2ee` | `#171716` |
| `--card-edge-on` / `--card-ink-on` | `#141412` / `#141412` | `#171716` / `#f4f2ec` |
| `--card-sub-on` / `--card-meta-on` | `#4a4840` / `#4f4d46` | `#cfcdc5` / `#b8b6ae` |

## Accent and semantic colours (the only non-neutrals)

- **Gold** `#c9a63f` (edge/shade `#8a6b17` or `#8d742a`; duck bill gold in party-duck.js `#c5a23c`, edge `#796323`).
  Gold is an **accent only**: coins, earned rewards, the one detail an illustration is about, a small match mark, the
  winning line rim. Never gold outlines on containers or nested boxes, never gold headlines, never gold glow.
- **Online dot** `#3ecf5f` (green, 8px circle on a card's label row). **Party dot** `#9580c8` (muted purple).
- **Connect Four** discs: red `--c4-a` (`#d64a40` dark / `#c93a31` light), blue `--c4-b` (`#3f7ed3` / `#2c66b8`). Defined in `c4-art.js` per tone.
- Party duck palette (party-duck.js): ink `#24231f`, body cream `#f5f2e8`, mould `#e5e0d3`, wing `#ebe6d9`, grey `#8d897c`.
- **Forbidden:** glow, neon, gradients, coloured drop-shadows, saturated backgrounds. Shadows are neutral and soft
  (`0 3px 0 rgba(0,0,0,.45)` at rest on a card, `0 14px 26px rgba(0,0,0,.32)` when lifted, `0 12px 28px rgba(0,0,0,.28)` on menus).

## Typography

- `--font-sans`: **Space Grotesk** (400/500/600/700), loaded from Google Fonts in site.css. All headings, body, buttons.
- `--font-mono`: **IBM Plex Mono** (400/500/600). Nav links, tags, card numbers, meta lines, labels, room codes, terminal.
- **Fast Blaze** (`fonts/fast-blaze.woff2`, self-hosted, licence in `fonts/fast-blaze-license.txt`): the homepage wordmark **only**.
- Scale tokens:
  - `--fs-section` `clamp(44px,4.2vw,56px)`: section headings
  - `--fs-entry` `clamp(44px,5vw,68px)`: game entry titles (`.e-title`, weight 700, letter-spacing -.035em, line-height 1.02)
  - `--fs-card-title` `clamp(24px,2vw,28px)`: card titles (700, -.015em)
  - `--fs-body` `clamp(16px,1.25vw,18px)`: descriptions
  - `--fs-btn` `16px`: buttons (weight 600, letter-spacing .01em)
  - `--fs-meta` `13px`: mono metadata
- Small caps-style labels: mono, 10.5 to 12.5px, `letter-spacing:.06em–.14em`, uppercase, colour `--g5`.
- Headings use tight negative letter-spacing (-.015em to -.035em). Body line-height 1.5 to 1.65.
- `-webkit-font-smoothing:antialiased` on body.

## Shape

- `--r-card: 12px` (game cards), `--r-panel: 22px` (sheets, dialogs), `--r-ctl: 12px` (inputs), `--r-pill: 999px`.
- Buttons: radius 10px (`.roombtn`, card `.playbtn`, segmented buttons); big Start button 16px; segmented track 14px;
  entry demo panel 28px; icon buttons 44×44 radius 12.
- Borders are 1px (`--g2`/`--g3`) or 1.5px (`--g4` on outline buttons and inputs). Thin and neutral.

## Sizes and layout

- Page container `.wrap`: `max-width:1360px; padding:0 5vw` (game pages: `padding:50px 5vw 80px`). Header inner max 1180px.
- Homepage nav height `--navh: 54px`; game headers `padding:22px 5vw` (phones `16px 20px`), sticky, blurred.
- Minimum touch target 44px (room buttons 44, phone room buttons 50, Join button 52, Start 58, segmented 44).
- Header controls: theme switch 48×26 (thumb 20px), sound/music buttons 32×32 round (36 on coarse pointers), icons 15–19px.
- Game card: 300px wide in the carousel, min-height 560px, padding 22px, art area 216px tall, drawn in a 256×216 viewBox.
- Room sheet: max-width 460px, padding 26px 28px; full-screen sheet on phones.

## Breakpoints

- `max-width:640px`: phone layout (nav collapses to the menu button, room buttons go to `.roompair`, sheets go full-screen).
- `max-width:860px`: header room buttons hide; Games heading carries Create/Join instead. `min-width:861px`: desktop header (duck face 35px).
- `700px`: side duck switches to its phone size (`side-duck.js`).
- `(hover:none)` / `(pointer:coarse)`: no hover tooltips, card illustrations autoplay (`.live`), larger buttons.
- Always respect `prefers-reduced-motion:reduce` (site-wide rule cuts animation and transition to .001s).

## Focus

`outline:2px solid var(--fg); outline-offset:3px` (2px on board cells and segmented buttons). Never remove focus rings.
