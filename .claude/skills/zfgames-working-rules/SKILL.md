---
name: zfgames-working-rules
description: How mansy wants work on zfgames.org done and reported - permissions (merge, deploy, Render, Cloudflare), branches and PRs, evidence and testing honesty, screenshots, design review habits. Use at the start of any ZF Games task and before opening a PR or reporting status.
---

# Working on ZF Games with mansy

Owner: mansy (Mahmoud Hafez, GitHub `ZForgotten44`). Repo: https://github.com/ZForgotten44/zfgames.org (clone it;
the git history and PR descriptions are the project's record). Full background: `HANDOFF.md` at the repo root.

## Ask first (never do these on your own)

- Merging any PR. mansy merges, or explicitly says "merge".
- Deploying the site (Cloudflare Workers) or redeploying the room server (Render).
- Changing any Render or Cloudflare setting, DNS, `wrangler.jsonc` routing behaviour, or `render.yaml`.
- Deleting branches, draft PRs or paused work (Ring & Wing! PR #52 stays as is).
- Reordering games, changing the featured carousel, restyling the Terminal section, rewriting /story essay text.

## Branches and PRs

- Work on a branch from `main`, open a **draft PR**, keep pushing to it while mansy reviews.
- When a PR's base merges, retarget stacked PRs to `main` (PR #25 once landed on a merged branch and missed main).
- After a merge, start follow-up work on a fresh branch from the new main.
- Rebuild generated pages after merging main into a branch (conflicts in generated HTML are resolved by rebuilding).
- PR description: what changed, how it was tested (by kind), frontend vs backend status, what needs a redeploy.

## Evidence and honesty

- Test the **real integrated routes locally** (serve.js + room server), not just a standalone demo or artifact.
- Label every check: simulated (Node / bots), headless browser (emulated device), or real device. Real-device checks
  and Safari have mostly **not** been done; say so.
- Report frontend and backend separately. Backend changes need a Render redeploy before they are live.
- Online play is "working" only after a real round succeeds on wss://zfgames-room-server.onrender.com.
- Cloud sessions usually cannot reach zfgames.org, workers.dev or Render (proxy blocks them): say that the live
  check is pending rather than implying it passed.
- If a test also fails on `main`, say so (known: `tools/bridge-play-test.js` and `tools/lesson-test.js` are browser
  console scripts, not Node tests; `tools/party-test.js` takes about 8 minutes).

## Screenshots and recordings

- **Don't make screenshots or recordings unless mansy asks.** Verify directly and report briefly.
- When asked: headless Playwright (deviceScaleFactor 2 for people), `recordVideo` + ffmpeg (libx264) to mp4, both
  themes, desktop and emulated phone, labelled as emulated. Recording often finds real bugs, so record before
  calling a round done when recordings were requested.

## Design review habits (from mansy's feedback)

- Restraint: quiet containers, expressive content (ducks, layout, motion, the answers themselves).
- No glow, neon or gradients; gold only as an accent (coins, rewards, the one detail); no gold borders on boxes.
- Check both themes (the invert switch) and phone widths (320, 390, 640, 860) before calling UI done.
- Match existing components exactly (radius, button heights, label styles) rather than inventing near-copies.
- Respect reduced motion. Keep touch targets ≥44px.
- When a brief has many points, list them and confirm each one is done; mansy reviews point by point.
- If a choice changes the goal (rules, scoring, names), ask with a clear recommended option and keep building the
  recommended one meanwhile.
