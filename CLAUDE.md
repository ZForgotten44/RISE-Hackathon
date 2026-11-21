# CLAUDE.md: zfgames.org (Z Forgotten Games)

Free browser games by Mahmoud Hafez (mansy, GitHub ZForgotten44). Plain HTML/CSS/JS, no framework.
Full context: **HANDOFF.md**. Design system and conventions: **.claude/skills/** (load the matching skill before work).

## Commands
- `npm start`: local site on :8080 (serve.js). `npm run server`: room server on :8787.
- `npm run build`: regenerate game pages, `?v=` stamps, sitemap, then `dist/`. Rebuild after any JS/CSS change and commit the generated files.
- Tests are Node scripts in `tools/*-test.js` / `*-check.js`; run the ones your change touches (see HANDOFF.md §5).

## Rules that always apply
- Never merge, deploy, or change Render or Cloudflare settings without mansy's explicit go-ahead.
- One room server only: Render `wss://zfgames-room-server.onrender.com`, read through `window.ZF_ROOM_WS_URL`. Players capped at 50 on the server.
- New games integrate into the existing site (one card in carousel and list, `/<slug>`, existing templates and tokens). No separate branding.
- No glow, neon or gradients. Gold `#c9a63f` only as an accent. Use the tokens in site.css; support both tones (`html[data-inv]`).
- Test real integrated routes locally; label tests as simulated, headless/emulated, or real device. Report frontend and backend separately. Online works only after a real round on deployed Render.
- No screenshots or recordings unless mansy asks.
- Ring & Wing! draft PR #52 is paused: leave it alone.
