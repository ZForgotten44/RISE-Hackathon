# ZF Games (zfgames.org): project handoff

Written 2026-11-21 for an agent taking over work on the site. Read this, then the skills in `.claude/skills/`:

| Skill | What it covers |
|---|---|
| `zfgames-working-rules` | permissions, PRs, testing honesty, how mansy reviews |
| `zfgames-design-tokens` | colours (light/dark), typography, radii, sizes, breakpoints |
| `zfgames-components` | game card, carousel, All Games, header/audio, Create/Join, entry screen, result, party lobby/podium |
| `zfgames-ducks-and-art` | every duck and illustration, which file draws it, image/audio/font assets |
| `zfgames-voice-and-brand` | names, tagline, copy style, page titles and descriptions |
| `zfgames-add-a-game` | the integration checklist, build and tests for a new game |

The git history and the PR descriptions on GitHub (https://github.com/ZForgotten44/zfgames.org/pulls?q=is%3Apr) are
the detailed record of every change. `git log --merges` on `main` lists them in order.

## 1. What the site is

Z Forgotten Games (ZF Games) by Mahmoud Hafez ("Mansy", GitHub `ZForgotten44`): free browser games, no account.
29 public games today: strategy board games with strong or perfect computer opponents and lessons, arcade games
starring a rubber duck, party games played on phones around a shared screen, two-player online games, and short
"theory & stories" pieces. Plus `/about` (Mansy's Mac-like desktop portfolio), `/story` (an essay), `/create` and `/join`.

## 2. Stack and architecture

- **Plain HTML, CSS and JavaScript.** No framework, no bundler, no TypeScript. Scripts are IIFEs that put one global
  on `window` (`ZF`, `ZPDuck`, `ZS`, `ZMusic`, `ZFMatch`, `ZFRules`...). The only npm dependency is `ws` for the server.
- **Shared design system**: `site.css` (tokens and shared controls), `arcade.css` (game pages), `rooms.css`,
  `party.css`, `pond.css`, `trap.css`, `tail.css`, `emm.css`, `story.css`, `about-desk.css`.
- **Shared runtime**: `theme.js` (invert), `sound.js` (effects), `music.js` (soundtrack), `cursor.js`, `feel.js`,
  `shared.js` (game list, cards, search, backdrops, modal), `shell.js` (game shell, tutorial, settings, result),
  `match.js` (matchup row, score), `turn-timer.js`, `react.js`, `hint-duck.js`, `coach.js`, `side-duck.js`.
- **Engines**: `engines.js` (4×4, Recursive, 3D, Nim, Chomp; also run in `engine-worker.js`), `engines2.js`
  (Pentago, TOOT & OTTO, Domineering, Notakto), `gold-engine.js`, `c4-core.js` + `c4-perfect.js` (WASM solver),
  `duckie-core.js`, `bridge.js`, `penny.js`, `pond-core.js`, `trap-core.js`, `tail-core.js`, `emm-core.js`.
- **Game apps**: `arcade-games.js` (Nim, Chomp UI), `games2.js` (framework + Quarto, Sim), `games3.js`, `games4.js`
  (Gold Coin), `c4-app.js`, `duckie.js`, `bridge.js`, `party-app.js` + `party-games.js` + `party-quack.js`,
  `pond-app.js`, `trap-app.js`, `tail-app.js`, `emm-app.js`. Routing on game pages: `arcade-wire.js`.
- **Pages**:
  - `index.html`: homepage (hero, Games scroll story `story.js`, About, Terminal, footer). Hand-written.
  - `tools/arcade-template.html` → every `/<slug>/index.html`, `/arcade/index.html` and `arcade.html` (generated).
  - `create/index.html`, `join/index.html`, `story/index.html`, `about/index.html` (+ `about-*.js`), `404.html`.
  - `projects/hafez-number-atlas/`: a separate project embedded by /about (has its own palette; not the site style).
- **Room server**: `server/room-server.js` (Node + `ws`), with `server/party/` (party games), `server/pond.js`,
  `server/trap.js`, `server/tail.js`. Authoritative: browsers never decide legality or winners. Rooms live in memory.
  Health check `/healthz`; `/version` reports versions for skew checks.

## 3. Room server (one server only)

- Production: **Render**, service `zfgames-room-server`, `wss://zfgames-room-server.onrender.com` (`render.yaml`,
  free plan, sleeps after 15 min idle; the client shows "Waking up the server…" and waits up to 45 s).
- Every online and party game reads **`window.ZF_ROOM_WS_URL`**, set in one script at the top of
  `tools/arcade-template.html` (and the same snippet in `join/index.html`): Render on every non-local host,
  `ws://<host>:8787` on localhost / LAN.
- **Never** add a second server, a separate party server, or a port on the Cloudflare host.
- Player cap: 50 per room, enforced on the server (`MAX_PLAYERS` in `server/party/core.js`; Tail Thief turns away the 51st; One Duck Off caps at 10).
- Room codes: `room-codes.js`, shared by server and `/join` (friend: 6 chars without O/0/I/1/L; party, pond, trap, tail: 4 consonants).
- Render redeploys from `main` (autoDeploy in render.yaml), but **ask mansy** before anything that triggers or changes it.
  Server changes since the last confirmed redeploy (Connect Four online, match score and move timers, duck and reaction
  relay, Tail Thief tt4, Duck Trap) have not been confirmed live by a real round.

## 4. Build and deploy

```bash
npm install
npm start            # local site: node serve.js 8080 (follows _redirects like the hosts)
npm run server       # local room server on :8787
npm run build        # tools/build-routes.js -> version-assets.js -> build-sitemap.js -> build-dist.js => dist/
```

- Generated and committed: game pages, `arcade/`, `arcade.html`, `sitemap.xml`, the footer games list in
  `index.html`, and the `?v=<hash>` stamps. Rebuild after JS/CSS changes.
- `tools/build-dist.js` copies the public files to `dist/` and skips development files (tools, server, docs,
  `.claude`, this file, CLAUDE.md...).
- Site deploy: **Cloudflare Workers static assets** (`wrangler.jsonc`: assets `./dist`, `html_handling:
  "drop-trailing-slash"` so `/nim` answers 200, `previews` for PR preview builds). `npx wrangler deploy` after
  `npm run build`. zfgames.org and zfgames-org.hafezmansy.workers.dev serve the same Worker. PR previews build at
  `<branch>-zfgames-org.hafezmansy.workers.dev`. `_headers` sets `no-cache` and `noindex` on workers.dev.
  `netlify.toml` is a leftover alternative host config.
- **Never deploy or change Cloudflare/Render settings without asking mansy.**

## 5. Tests

Node (run from the repo root): `tools/c4-test.js`, `c4-perfect-test.js` (~1 min), `c4-server-test.js`,
`timer-server-test.js`, `hints-test.js`, `recursive-test.js`, `duckie-levels-test.js`, `bridge-levels-test.js`,
`emm-test.js`, `pond-test.js`, `pond-text-test.js`, `pond-server-test.js`, `pond-art-check.js`, `trap-test.js`,
`trap-server-test.js`, `tail-test.js`, `tail-server-test.js`, `quack-test.js`, `party-test.js` (~8 min, 50 bots),
`party-flow-test.js`, `party-count-test.js`, `party-deck-test.js`, `party-investigation-test.js`,
`party-content-check.js`, `explain-questions-check.js`, `duck-check.js`, `room-codes-test.js`,
`seo-check.js <base>`. Headless Chromium: `tools/emm-e2e.js`.
Browser console scripts (not Node): `tools/e2e-suite.js`, `tools/lesson-test.js`, `tools/bridge-play-test.js`
(the last two were already failing on main at the 2026-11-01 merge). There is no CI; run what your change touches.

## 6. Standing decisions (from mansy)

- New games are integrated into the existing site: one card each in the existing carousel and games list, direct
  URLs, the existing templates and design tokens. No separate hub, branding or visual system.
- Visual style: no glow, neon or gradients. Gold is only an accent (coins, rewards, the one detail). Containers stay
  quiet: charcoal / off-white surfaces with thin neutral borders. Match the real site components, both themes, and the
  shared audio controls.
- Multiplayer entry uses **Create room** and **Join room**. Players are capped at 50, enforced on the server.
- `/create` reuses the real Games-section cards with their live illustrations. No separate thumbnails.
- Evidence before a PR is ready: real integrated routes tested locally, not an artifact demo. Be precise about
  simulated vs headless browser vs real device.
- Report frontend and backend status separately. Online play counts as working only after a real round succeeds on
  the deployed Render server.
- Don't merge, deploy, or change Render or Cloudflare settings without asking.
- No extra screenshots or recordings unless mansy asks.
- Game order on the site and the featured carousel list are mansy's choices; ask before changing them.
- `/story` essay text only from mansy's own copy. The homepage Terminal section stays dark and as is.

## 7. History (merged PRs, oldest first)

| PR | Date | What |
|---|---|---|
| #1–#3, #5 | 09-29/30 | Six party games (Explain Yourself, One Duck Off, Wrong Pond, Perfectly Normal, Duck Court, Duck After Dark), lobby of ducks, duck builder |
| #4 | 09-29 | Shared rubber-duck SVGs for Take Two, One More Bridge, Save the Duckie |
| #6 | 09-30 | Games browsing: phone autoplay of card art, All Games search and filters, card labels |
| #7 | 09-30 | One More Bridge journey, press-and-hold, mute icons |
| #8, #9 | 09-30 | Fast Blaze wordmark, resting duck, per-page music, game order |
| #10–#12 | 10-01/04 | Same Pond (two players predict each other), Know Me questions, journey map |
| #13, #16, #17, #20 | 10-02/03 | About section ("Hi, it’s Mansy!"), /story essay, duck squeak |
| #14, #15, #18 | 10-02 | Quack Me Up! party game, card, 62 more prompts |
| #19 | 10-03 | All Games entrance and game order |
| #21 | 10-03 | Party standings and podium, voting, pond lobby |
| #22 | 10-05 | One visual rules tutorial from both doors |
| #23 | 10-07 | Result popup, standings countdown, Phones only rooms, Same Pond /version |
| #24, #28 | 10-07/08 | /create and /join pages and shortcuts; Create uses the real cards |
| #25, #27 | 10-07/08 | Search refresh (titles, canonicals, sitemap, noindex on mirror) |
| #26 | 10-08 | Lobby pond, readiness, podium rework |
| #29, #30, #32, #34 | 10-08/09 | Duck Trap (build-and-race for two), arena, hidden traps, new objects |
| #31 | 10-10 | Phone side duck, music starts as early as allowed |
| #33 | 10-11 | Tail Thief (snake for 1–50: solo, one keyboard, online) |
| #35 | 10-10 | Same Pond question variety (+216 questions) |
| #36, #37 | 10-12/23 | Duck scroll story (curved carousel, hopping duck, face becomes the About duck); Gold Coin custom boards |
| #38 | 10-21 | /about profile (later replaced by #42) |
| #39 | 10-25 | Usability and animation pass (tutorial fit, phone duck, search, mascot, sounds) |
| #42 | 10-28 | /about as a Mac-like desktop inside a laptop (#40 archipelago and #41 superseded, closed) |
| #43 | 10-28 | Can You Force It? (Domineering and five proofs, after Hamkins) |
| #44, #47 | 10-28 / 11-01 | X/O flow field behind hero, Games and About |
| #45 | 10-28 | Playing experience: hint duck, matchup, short rules, lessons, reactions |
| #46 | 10-28 | Connect Four with variations, trainer and a Perfect opponent (own WASM solver) |
| #48 | 11-01 | Perfect solver fix, computer duck, /about entrance, reactions, Strategy Lab |
| #50 | 11-01 | Match score, move timers, active-turn ducks, guide duck eyes, move feedback |
| #49, #51 | 11-01 | Every game page gets its own search title, heading and About section |

`main` is at the #51 merge (9a4a157) as of this handoff.

## 8. Open work

- **Draft PR #53, Size It Up** (branch `claude/project-thread-n30daw`): a scale-estimation game, solo and two
  players online. Four review rounds done (146 sourced objects, stage modes, reveal views, Solo modes). Needs:
  more objects toward 200–300, phone label fixes, a Render redeploy and a real online round, real-device checks.
  Not in the featured carousel (only /arcade and the games list).
- **Draft PR #52, Ring & Wing!** (branch `claude/project-thread-zopw9o`): buzzer party game for 2–5 players.
  **Paused by mansy on 2026-11-03. Keep it as is: don't delete, merge or rework unless mansy asks.**
- PRs #48 and #50 (branch `claude/project-thread-vm3uso` and `claude/project-thread-2mkml4`) are **already merged
  into main** (2026-11-01); nothing is pending on that branch.
- Pending on mansy: Render redeploy and live rounds for the online features above; Google Search Console (submit
  sitemap, request indexing); `og-image.png` is referenced but missing.
- Not verified anywhere: real phones, Safari/iOS, a real GPU for the X/O field.
