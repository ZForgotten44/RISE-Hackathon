---
name: zfgames-components
description: The real UI components of zfgames.org (game card, homepage carousel, All Games list, Create/Join room pages, header and audio controls, game entry screens, result dialog, party lobby and podium) with file locations and rules. Use when building or changing any page or game UI on ZF Games.
---

# ZF Games components

Reuse these. A new game or page never gets its own hub, header, card style or visual system.
Tokens are in the `zfgames-design-tokens` skill.

## Game card (`shared.js`)

- One component for the homepage carousel, `/arcade` (All Games) and `/create`. Built by `ZF.makeCard(g,i,opts)`,
  listed by `ZF.renderGrid(el,opts)`. CSS is injected by shared.js (`const CSS` and `const EXTRA`), after arcade.css,
  so overrides need higher specificity (e.g. `#home .zfgrid`).
- Data: the `GAMES` array in shared.js: `{id, name, rule, meta, slug, link, art}` plus optional `roomCount`,
  `modeScreen`, `keyboard`. Order of this array = site order (mansy chose it; don't reorder without asking).
- Anatomy (`article.gcard`, grid rows): optional `NEW` pill (top right, mono 11px, 800, letter-spacing .14em) ·
  `.gi` number (`01`, mono 13px; omitted on All Games via `num:false`) · `.art` (216px, an SVG in currentColor) ·
  `h3` title with `.cardlink` (stretched link) · `.rule` (16.5px, `--card-sub`) · `.glabels` label row ·
  `.acts`: `.playbtn` (filled, radius 10, 44px, "Play ↗") and `.rules-link` ("Rules", goes to `/<slug>#rules`).
- Label row: at most one mode label, `Online` (green dot `#3ecf5f`) or `Party` (purple dot `#9580c8`), then `·` and the
  player count. Online replaces NEW when both apply. `ONLINE_IDS` and `PARTY_IDS` sets control this.
- States: hover / keyboard focus adds `.on`: the card flips to the opposite surface (`--card-*-on`), lifts 4px and
  plays its illustration once. Touch screens autoplay on scroll with `.live` and freeze off-screen with `.held`
  (`ZF.liveCard`). **Illustration CSS must use `.gcard:is(.on,.live) …`** so phones see it.
- `feel.js` adds a small lift and one wobble on hover, a press-in on touch. No sounds.
- On `/create` (`opts.room`), the same card links to `/<slug>?create` ("Set up room →") and shows the room's player count.

## Homepage (`index.html`, `story.js`, `story.css`)

- Sections: `#home` hero (Fast Blaze wordmark, duck face, tagline, X/O field from `xo-field.js`), `#games` "01 Games"
  scroll story, `#about` (About duck greeting), `#terminal` (keep it dark and as is), footer.
- Section heads: big muted number (`.secnum`, `--g3`) + heading.
- `#games` is a scroll story: a curved ring of cards (`#ssRing`), arrows ◁ ▷, counter `01 / 15` (mono), "All games ↗",
  and the Create room / Join room pair. The featured set is a fixed list `FEATURED` in story.js; a new game is not
  automatically featured. Desktop: vertical scroll turns the deck; phones: horizontal centre-snap scroller (~85% card).
  After the last card a giant duck face rises and becomes the About duck (`duck-face.js`).
- Footer game links are generated between `<!-- games:start -->` and `<!-- games:end -->` by `tools/build-routes.js`.
  Use `div role="navigation"`, never `<nav>` (index.html styles `nav` as the fixed top bar).

## All Games (`/arcade`, `arcade-wire.js`, `arcade.css`)

- Row 1: "Games" heading with search on the right (`game-search.js`, `ZF.findGames`, typo-tolerant with aliases).
- Row 2: player chips (All · Solo · 2 players · Group), "Category: All" menu (Strategy · Arcade · Party · Theory &
  stories, from `TAGS` in shared.js), "More filters" (Connection: Any / Same device / Online friends).
- Row 3: "13 of 25 games · Clear filters". Phones get a Filters bottom sheet (`<dialog>`).
- Selected state everywhere is the white (ink) pill: `background:var(--fg); color:var(--bg)`.
- "Continue playing" row only appears when a saved game exists.
- The static HTML holds a plain `<ul class="zf-gamelist">` for crawlers; cards replace it.

## Header and audio controls (shared on every page)

- Left: duck-face brandmark (`duck-face.png`, 30px, 35px on desktop) + back link (`--g5`, hover `--fg`).
- Right, in this order with `gap:10px`: music button (`music.js` builds it), sound button `.soundsw` (`sound.js`),
  invert switch `.themesw` (`theme.js`). All three share one size family (32px round / 48×26 pill), 1px `--g2`
  border, `--surf` fill, tooltip below (`data-tip`, ink pill, 12px 600). Don't add a fourth style of icon button.
- Music and effects have independent mutes (`zf-music-on`, `zf-sound`). Music starts on the first user gesture.
- Create room / Join room (`.roombtn`): Join is the filled one (`.fill`, ink on paper), Create is the neutral outline
  (1.5px `--g4`). 44px tall, radius 10, 16px 600. One pair per view: header `.roomnav` on laptops, `.roompair` under the
  Games heading at ≤860px, `.navrooms` in the phone menu. Hidden on game pages (`body.in-game`).
- Phone nav (≤640px): links move into a dropdown behind the menu button, with a dim scrim.

## Create / Join room pages (`/create`, `/join`, `rooms.css`, `room-codes.js`)

- Same header as game pages. One focused `.sheet` (max 460px, radius 22, `--surf`, 1px `--g3`); full-screen on phones.
- Join: one labelled field `.codein` (60px, mono 26px 700, letter-spacing .2em, uppercase, centred) and one filled
  button. Codes follow `room-codes.js` (no O/0, I/1, L); server and page share it.
- Create: the **real game cards** with their live illustrations (`renderGrid` with `opts.room` and `only` = games
  with rooms). Never separate thumbnails.
- A plain `.explain` block underneath for search visitors; footer `.sitelinks`.

## Game entry / setup screen (`tools/arcade-template.html`, `arcade.css`, `games2.js`, `shell.js`)

- Two columns on desktop: left `.e-head` (`.e-title`, `.e-blurb`) + `.e-ctl` (options), right `.e-demo` (an inert board
  preview on `--surf2`, radius 28). Stacks on phones.
- Options: `.grp` / `.glabel` (14px `--g5`) / `.opt` rows with segmented controls `.entry .seg` (track `--surf2`,
  radius 14, 4px padding; buttons 44px radius 10; selected = ink pill).
- Primary action `.start`: 58px, radius 16, `--fg` fill, 18px 700.
- "How to play" lessons (`shell.js` tutorial, `lessons.js`, `rules-summary.js` Goal / Your turn / Restriction / Winning).
  Games with a lesson show no rules card on setup.
- In game: sticky header with Rules, Settings, sound, music, invert; `match.js` matchup row with each player's duck,
  score, move timer (`turn-timer.js`); `react.js` duck reactions; `hint-duck.js` for hints and notes (author duck + bubble).

## Result dialog (`shell.js` `openResult`)

- One modal for every board game: symbol (trophy, or the winner's own duck when `def.resultDuck`), title, detail,
  match score line, and the game's own actions (Play again / Request rematch / Change board / Leave room), plus
  "View board" / "Look at the board". Escape and scrim close it.

## Party games (`party-app.js`, `party-games.js`, `party.css`, `party-duck.js`, `server/party/`)

- One room on a shared screen, everyone on their own phone. Modes: "Shared screen" and "Phones only".
- Lobby is a pond (`.zp`, colours as `--zp-*` tokens on `.zp` with light overrides): ducks swim in; when full they
  shrink and draw together. Readiness: a check beside the name, "Getting ready…", "N of M ready". No gold in the lobby.
- Podium (`podiumHost`): steps on one stage, crowd around; controls Play again, Settings, Back to lobby.
- Standings countdown between rounds. Players are told apart by shape, accessory, badge number and name, never by colour alone.
- Rooms hold up to 50 players, enforced on the server (`MAX_PLAYERS` in `server/party/core.js`; One Duck Off stops at 10).

## Dialogs and menus

- `ZF.modal` (shared.js) wires Back/Forward to close overlays.
- Menus: `--surf`, 1px `--g3`, radius 16, neutral shadow. Selected option = ink pill.
