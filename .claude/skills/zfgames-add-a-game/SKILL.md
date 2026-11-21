---
name: zfgames-add-a-game
description: Checklist for adding a new game (or a room mode) to zfgames.org so it is integrated into the existing site, its card, routes, search text, rooms and tests. Use whenever a new game, game mode or online room is built for ZF Games.
---

# Adding a game to ZF Games

mansy's rule: a new game joins the existing site. **One card** in the existing carousel/list, its own direct URL
(`/<slug>`), the existing templates and tokens, the shared header and audio controls, light and dark themes.
No separate hub, branding or visual system. Read `zfgames-design-tokens`, `zfgames-components`,
`zfgames-ducks-and-art` and `zfgames-voice-and-brand` first.

## Where a game is wired in (follow an existing game, e.g. grep for `tail-thief` / `'tail'`)

1. **Engine / rules**: `<x>-core.js` (pure, loadable by both page and server with `require()` when online).
2. **Page app**: `<x>-app.js` + `<x>.css` (class prefix unique to the game; check it isn't taken, e.g. `tt-` is TOOT & OTTO, Tail Thief uses `tl-`).
3. **Card art**: `<x>-art.js` exposing `.card()` (256×216 SVG in currentColor, `:is(.on,.live)` animations).
   Load it before shared.js in `index.html`, `create/index.html` and `tools/arcade-template.html`.
4. **Card data**: add `{id, name, rule, meta, slug, link, art}` to `GAMES` in `shared.js`, at the position mansy
   chooses. Also, as applicable: `ONLINE_IDS` (has an online friend room), `PARTY_IDS`, `TAGS` (category),
   `NEW_SLUGS`, `KEYWORDS`, `ALIAS`, `PARTY_MIN`/`PARTY_MAX`, `roomCount`, `modeScreen`.
5. **Routes**: add `[slug, name, short description]` to `tools/games-list.js` (same order as GAMES), and a full entry
   to `tools/game-pages.js` (title, description, intro, tip, ways, rel, genre, play). Renamed games keep their old
   URL through `_redirects` / `RETIRED`/`MOVED` in `tools/build-routes.js`.
6. **Template markup**: the game's setup/game sections go in `tools/arcade-template.html` (every game page is built from
   it). Register its section ids in `arcade-wire.js` (`SETUPS`, `GAMESEC`) and in the `hideAll()` list in arcade-games.js where relevant.
7. **Rules**: `rules-summary.js` (Goal / Your turn / Restriction / Winning) and a "How to play" lesson (`shell.js`
   tutorial, `lessons.js`) if the game has one.
8. **Rooms** (if online): two-player board games use `online-rooms.js` + an `online-<x>.js` adapter and a `RULES` entry
   in `server/room-server.js`. Larger games get their own server module (`server/pond.js`, `trap.js`, `tail.js`,
   `server/party/games/<x>.js`) required by room-server.js, a message prefix (`dt:`, `tt:`...), and a code kind in
   `room-codes.js` (+ `tools/room-codes-test.js`). Cap players at 50 on the server. Add a server version tag if
   page/server skew matters (Same Pond's `/version` pattern).
9. **Room server URL**: always `window.ZF_ROOM_WS_URL` (set once in the template head: Render in production,
   `ws://<host>:8787` locally). Never a second server or a port on the Cloudflare host.
10. **Featured carousel**: `FEATURED` in `story.js` is a fixed list. Only add the game if mansy asks.
11. **Create room page**: games with rooms appear automatically via `renderGrid(..., {room:true, only})` with the real card.

## Build

```bash
npm run build          # build-routes -> version-assets -> build-sitemap -> build-dist  (writes dist/)
# or, while iterating on generated pages only:
node tools/build-routes.js && node tools/version-assets.js && node tools/build-sitemap.js
```

Generated files are committed: every `<slug>/index.html`, `arcade/index.html`, `arcade.html`, `sitemap.xml`, the
footer game list in `index.html`, and `?v=<hash>` stamps on script/style URLs. **After changing any JS or CSS, rebuild**
so the stamps change. If two branches conflict only in generated pages, rebuild instead of hand-merging.

## Test (be precise about what kind of test it was)

- Unit / rules: `node tools/<x>-test.js` (pure Node, no browser).
- Server: `node tools/<x>-server-test.js` starts the real room server and plays over real WebSockets.
- Local integrated routes: `npm start` (serve.js on :8080) plus `npm run server` (room server on :8787; party games:
  `PARTY_STATE_FILE=off PARTY_TEST_SPEED=0.15 node server/room-server.js 8787`). Open `http://localhost:8080/<slug>`.
- Browser: headless Chromium via Playwright (pre-installed in cloud sessions), desktop and emulated phones
  (iPhone 13, 320×568), dark and light (`localStorage['zf-invert']='1'`). Say "emulated", not "on a phone".
- `node tools/seo-check.js http://localhost:8080` checks titles, canonicals and the per-game table.
- Online play counts as working **only after a real round on the deployed Render server**, which needs mansy to redeploy.
