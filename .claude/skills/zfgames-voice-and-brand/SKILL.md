---
name: zfgames-voice-and-brand
description: Name, voice, copy style and page-text rules for zfgames.org (Z Forgotten Games / ZF Games). Use when writing any visible text, game rules, card copy, page titles, meta descriptions or announcements for the site.
---

# ZF Games voice and brand

## Names

- Full name: **Z Forgotten Games**. Short: **ZF Games** (also "ZFGames" as an alternate in structured data).
- Domain: https://zfgames.org. Mirror (not for search): https://zfgames-org.hafezmansy.workers.dev.
- Owner and author: **Mahmoud Hafez**, who goes by **Mansy** (aka zForgotten). Footer: "© 2019 Z Forgotten Games ·
  Developed by Mahmoud Hafez · Buy me a coffee ↗" (buymeacoffee.com/zmansy).
- Homepage tagline: **"Old rules. New mistakes."** Wordmark set in Fast Blaze.
- Mascot: a rubber duck. "Collect too many rubber ducks" is part of the About text. Ducks are everywhere: party players
  are ducks, the computer opponent is a duck, hints come from Mansy's duck.
- Homepage `<title>`: "Z Forgotten Games (ZF Games) | Free Multiplayer & Strategy Games". Keep the title, og/twitter
  tags and the WebSite JSON-LD saying the same thing.

## Voice

- Plain, short, a little dry and playful. Sentences, not slogans. Examples from the site:
  - "Nine small boards, one big game."
  - "Build a shortcut. Add a trap. Try not to become the demonstration."
  - "Two answers. One ridiculous question. Make the room laugh."
  - "Hold to grow a bridge, release to tip it across the gap. You only get one."
  - "Hi, it’s Mansy! I build things, ask questions that create even bigger questions, and collect too many rubber ducks."
- Card `rule` = the premise in one or two short sentences. Card `meta` = facts joined with ` · `
  ("1–2 players · perfect computer", "4–50 players · phones as controllers · about 4 min a round").
- Use en dashes for ranges (1–50), × for sizes (4×4, 3×3×3), curly apostrophes in visible copy (’).
- No hype words ("epic", "ultimate experience"), no emoji in UI copy, no exclamation marks except in a game name
  (Quack Me Up!, Ring & Wing!).
- Say what a button does: "Create room", "Join room", "Play ↗", "Set up room →", "How to play", "Request rematch",
  "View board", "Back to lobby". Tooltips say what clicking will **do**, not the current state.
- Be honest: claims about computer strength must be true ("Perfect never misses a win"). No ranking or SEO promises.
- Credit Joel David Hamkins for the analyses the site explains (`CREDIT` in shared.js): credited for the explanation,
  not as the inventor of each game.

## Per-game page text (`tools/game-pages.js`)

For every slug: `t` (title, game name first, about 60 chars, ends "| ZF Games"), `d` (one or two plain sentences,
unique), optional `about`, `intro` (what the game is, using the words people search for), `tip` (a short true piece
of strategy; omit for party and story games), `ways` (only modes the game really supports), `rel` (up to three
related slugs), `genre`, `play`. `tools/build-routes.js` fails if an entry is missing or two pages share a title or
description. Search aliases and keywords live in shared.js (`ALIAS`, `KEYWORDS`).

## Writing for mansy (status messages and PRs)

- Lead with the result. Plain language, full sentences.
- Report **frontend** and **backend (room server)** status separately.
- Say exactly how something was tested: simulated (Node/bots), headless browser (emulated phone), or a real device.
  Never call online play working until a real round has succeeded on the deployed Render server.
- Essay text on `/story` comes only from mansy's own copy; never summarize or rewrite it.
