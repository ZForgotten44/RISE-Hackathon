# Deploying the room server (Nim + Domineering + Pentago "Online friend")

The static site (everything except `server/room-server.js`) is deployed as Cloudflare Workers static assets
(`npm run build` then `npx wrangler deploy --assets ./dist --compatibility-date <date>`, currently live at
`https://zfgames-org.hafezmansy.workers.dev/`, with `zfgames.org` itself pointed at the same Worker) — neither
of which can run a persistent process on any port. The small stateful WebSocket server that powers online rooms
needs a real place to run continuously. This is a one-time setup.

## Why Render

A single always-on Node process, no database, minimal traffic — [Render](https://render.com) fits well: free
tier available, deploys straight from a Git repo, gives WSS (secure WebSocket) automatically with no certificate
setup, and reads the `render.yaml` already committed in this repo. Fly.io or Railway work too if you'd rather use
one of those; the steps are the same shape (push code, point it at `server/room-server.js`, note the URL, set
`ROOM_WS_URL` below).

## Steps

1. **The code is already on GitHub**: [github.com/ZForgotten44/zfgames.org](https://github.com/ZForgotten44/zfgames.org)
   (private repo, `main` branch) — Render deploys straight from it, nothing to push first.

2. **Create the Render account and service**: sign up at render.com (GitHub login is fastest) → **New +** →
   **Web Service** → connect `ZForgotten44/zfgames.org`. Render should detect `render.yaml` at the repo root and
   pre-fill everything (name `zfgames-room-server`, build `npm install --omit=dev`, start
   `node server/room-server.js`, free plan). If it doesn't auto-detect, set those fields manually. Click
   **Create Web Service**.

3. **Wait for the first deploy** (a couple of minutes), then copy the URL Render gives you — it looks like
   `https://zfgames-room-server.onrender.com` (it'll be exactly that unless the name was already taken by someone
   else on Render, in which case Render appends a suffix — use whatever it actually gives you).

4. **Point the site at it**: open [tools/arcade-template.html](tools/arcade-template.html) and find the line
   near the top of `<head>` that sets `window.ZF_ROOM_WS_URL` — replace the placeholder hostname with the one
   Render gave you (same host, just swap `https://` for `wss://`). That one URL covers every deployed hostname
   (zfgames.org and the workers.dev address both) — only `localhost`/`127.0.0.1` is excluded, and falls back to
   `ws://localhost:8787` for local dev. Then rebuild and redeploy the static site:
   ```bash
   npm run build
   npx wrangler deploy --assets ./dist --compatibility-date <today's date>
   ```

5. **Verify**: open the published site, create a Nim, Domineering, or Pentago room, and join it from a second
   device or browser using the invite link. Both should connect within a second or two — unless the room server
   was asleep (see below), in which case the first attempt will show "Waking up the server…" and can take up to
   about a minute.

## The one real tradeoff: the free plan sleeps

Render's free web services spin down after 15 minutes with no traffic and take roughly 30–60 seconds to wake
back up on the next request. The client accounts for this: a 45s connection timeout (not 10s) with a "Waking up
the server…" message that appears a few seconds in, rather than a bare spinner or a premature failure — but the
very first room created after a quiet period will still feel slow. If that matters, Render's paid "Starter"
instance (a few dollars a month) stays warm and removes the delay entirely; nothing else about this setup needs
to change to upgrade later.

## Local development

Nothing here affects local testing: `npm run server` still starts the room server on `localhost:8787`, and the
client still falls back to it automatically (`ws://localhost:8787`) whenever `ZF_ROOM_WS_URL` isn't set — which
is exactly what happens when you open the site from `localhost`/`127.0.0.1` (every other hostname gets the
deployed room server, per step 4 above).

## Party games (Explain Yourself, One Duck Off, Wrong Pond, Perfectly Normal, Duck Court, Duck After Dark)

Each party game is an ordinary arcade game: its own card and route (`/explain-yourself`, `/one-duck-off`,
`/wrong-pond`, `/perfectly-normal`, `/duck-court`, `/duck-after-dark`), built from `tools/arcade-template.html` like
every other game. A room's invite link is `/<game>?room=CODE`. The client is `party-app.js` (entry screen, dialogs,
lobby, host display, phone controller), `party-games.js` (per-game screens), `party-demos.js` (entry-screen demos)
and `party-art.js` (card art).

**Server.** They run on this same Render room server. Party messages are prefixed `p:` and routed to
`server/party/core.js` (one file per game in `server/party/games/`); every other message goes to the existing
Online friend room code unchanged, so Nim, Domineering, Pentago and the rest are unaffected. Every action is checked
against the sender's room, seat token, the current phase id and host/co-host permission. Each socket gets its own
view, so roles, private questions and secret words only go to the players entitled to them.

- Every room holds up to 50 players. Host display connections don't count. The host's "expected players" number is
  only for planning the role counts.
- The whole room always plays as one group, at any size: one shared phase, one vote, one scoreboard. Role counts
  (imposters, mafia) are limited only by staying under half the room, so 10 imposters in 30 players is fine.
- Late joiners wait for the next round; they are never added to a round in progress.
- Party rooms are saved to `PARTY_STATE_FILE` (default: the OS temp dir; `off` disables) and restored when the same
  machine restarts. Render's free plan gives each deploy a fresh disk, so **a deploy or instance replacement ends
  every party room in progress**. Online friend rooms are memory only and end on any restart.
- No origin check is applied to WebSocket upgrades, so zfgames.org and zfgames-org.hafezmansy.workers.dev both
  connect. The address comes from one place, the `ZF_ROOM_WS_URL` script in `tools/arcade-template.html`:
  production hosts use `wss://zfgames-room-server.onrender.com`; localhost and private LAN addresses use that
  machine's `:8787`. There is no fallback to a port on the static host.

**Deploying.** The server change is additive and backward compatible, so deploy the room server first, then the
site. `render.yaml` runs `node server/room-server.js` with `npm install --omit=dev` (for `ws`), listens on `$PORT`,
and uses `/healthz` for health checks. Check the service's actual auto-deploy branch in the Render dashboard: a merge
to that branch triggers a deploy only if auto-deploy is on for it.

**Testing.**
- `node tools/party-test.js [players] [game]` starts this real server locally and plays every game and mode end to
  end with scripted phones (default 50), checking host controls, the 50-player limit, reconnects and secret leaks.
  `PARTY_TEST_SPEED` shrinks timers.
- `node tools/room-codes-test.js [roomsPerKind]` starts this server, creates Online friend, party and Same Pond rooms, and checks
  every code against `room-codes.js`, the one code rule the servers and the /join page share.
- Locally: `npm start` and `npm run server`, then open http://localhost:8080/explain-yourself (or any party game).
  Phones on the same Wi-Fi can open the laptop's LAN address, e.g. http://192.168.1.20:8080/explain-yourself.
