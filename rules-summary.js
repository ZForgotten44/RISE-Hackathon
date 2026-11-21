/* rules-summary.js: the basic rules of every game in four short lines, the same shape everywhere:
     Goal · Your turn · Restriction · Winning
   Written from each game's own full rules and in its own terms. The full rules (unusual cases, variants, credits) stay
   one tap away in "More rules", never in the opening explanation.
   The How to play tutorial shows the card in its written-rules section. An entry page shows it only when the game has
   no interactive lesson: where one exists, the entry page keeps just the title, one line and How to play, and the
   rules stay in the lesson and behind the in-game How to play button, so the same material is never taught twice.
   ZFRules.html(slug, fullHTML) -> the card   ZFRules.has(slug) */
(function(){
'use strict';
const R={
  'recursive-tic-tac-toe':['Win three small boards in a line on the big board.','Mark one empty cell in the small board you were sent to.','The cell you pick sends your opponent to the board in the same position.','Three claimed boards in a line wins. All boards closed with no line is a draw.'],
  'gold-coin':['Be the one who takes the gold coin.','Slide one coin left, or take the leftmost coin.','Coins never move right, pass another coin or share a space. You cannot pass your turn.','Taking the gold ends the game at once and wins. Pennies count for nothing.'],
  '3d-tic-tac-toe':['Three of your marks in one straight line inside the 3×3×3 cube.','Place one mark on any empty spot, on any of the three layers.','Every straight line counts: along an edge, across a face, or through the centre.','The first line of three wins.'],
  'chomp':['Make your opponent take the poisoned tile.','Pick a tile. It goes, with every tile at or below it and at or to its left.','The poisoned tile is the top-right corner.','Whoever takes the poisoned tile loses. There are no draws.'],
  'domineering':['Leave your opponent with no room for a domino.','Place one domino on two free squares. Player 1 places them vertical, Player 2 horizontal.','Dominoes cannot overlap, leave the board or cover holes.','If you cannot place a domino on your turn, you lose, even with free squares left.'],
  'nim':['Normal play: take the last token. Misère: make your opponent take it.','Take one or more tokens from one pile.','Only one pile per turn. You may take a whole pile.','Normal play: the last token wins. Misère: the last token loses.'],
  'pentago':['Five of your marbles in a row.','Place a marble in an empty hole, then turn one quadrant a quarter turn.','Every turn has both steps, unless your marble already makes five.','Five in a line wins. Five for both after a turn, or a full board, is a draw.'],
  '4x4-tic-tac-toe':['Four of your marks in a row.','Place your mark on any empty square.','Only full rows, full columns and the two long diagonals count. No wraparound.','The first line of four wins. A full board with no line is a draw.'],
  'notakto':['Don’t be the one who closes the last board.','Place an X on any empty cell of any open board.','Both players play X. Three in a row closes that board for good.','Whoever closes the last open board loses.'],
  /* Connect Four: the card follows the variation being played or chosen (c4-app.js) */
  'connect-four':()=>{ const C=window.ZFC4; return C?C.SUMMARY[C.currentVariant()]||C.SUMMARY.classic:null; },
  'toot-otto':['Player 1 spells TOOT, Player 2 spells OTTO.','Choose T or O and drop it into a column that is not full.','You have six of each letter. A word counts no matter who dropped its letters.','Spell your word in a line of four to win. Both words at once, or a full board, is a draw.'],
  'quarto':['Complete a line of four pieces that share a trait.','Place the piece you were handed, then choose a piece for your opponent.','Pieces belong to nobody. The traits are tall or short, round or square, light or dark, hollow or solid.','Whoever places the fourth piece of such a line wins. A full board with no line is a draw.'],
  'sim':['Never finish a triangle of your own.','Claim one unclaimed edge between two dots.','Only triangles with their corners on the dots count. Where edges cross is not a dot.','Complete a triangle in your own edges and you lose. There are no draws.'],
  'take-two':['See whether taking two really is the only rational move.','Take one coin and the exchange goes on, or take two and it ends.','Taking two ends it at once. Whatever is left in the bank goes to nobody.','Each experiment shows what both ducks walk away with.'],
  'crowded-room':['Finish 12 nights with the highest total.','Each night, choose to go out or stay home, at the same moment as 29 other guests.','The room has a limited number of places (18 unless you change it).','Go out to a room that is not over full: +3. Over full: −2. Stay home: +1.'],
  'last-message':['Both groups attack at dawn together.','Send GO messages to Harbor, then decide whether Hill attacks.','Messages can be lost, and each one costs 1. Harbor attacks only if a GO reaches it.','Both attack: +8. Both wait: 0. Only one attacks: −10.'],
  'save-the-duckie':['Get the duck across the road and the river to the pond.','Hop one space at a time: arrow keys or WASD, a tap beside the duck, or a swipe.','A vehicle sends you back to the last safe island. Water is safe: a rubber duck floats.','Reach the pond to finish the level. Ducklings count once you reach the next island.'],
  'one-more-bridge':['Get the duck home across every gap.','Hold to grow a bridge. Let go and it tips over the gap.','One bridge per crossing. It has to end on the far landing, not short of it or past it.','Land it and the duck crosses. Finish a stop to open the next one.'],
  'quack-me-up':['Make the room laugh.','Answer a ridiculous prompt on your phone. Another duck secretly got the same one.','Answers appear without names, and you sit out the vote on your own prompt.','Each prompt is worth 100 points, split by the share of votes. Most points wins.'],
  'explain-yourself':['Catch the imposters, or blend in if you are one.','Answer your question privately, then defend your answer in one sentence.','Imposters got a different question that looks similar, and don’t know the real one.','Points for voting out imposters. Imposters score by escaping or getting an innocent duck voted out.'],
  'one-duck-off':['Catch the imposters, or bluff well if you are one.','Add two short strokes to the shared drawing, with limited ink.','Imposters don’t know the subject. Everyone else draws it without giving it away.','Points for voting out imposters. A caught imposter can still score by guessing the subject.'],
  'wrong-pond':['Catch the imposters, or blend in if you are one.','Give one clue about your secret word.','Imposters have a close but different word. Too obvious and they catch on; too vague and you look suspicious.','Points for voting out imposters. Imposters score by escaping or getting an innocent duck voted out.'],
  'perfectly-normal':['Write the rule the room believes most.','Write one rule that sounds completely normal for an absurd place.','Rules are voted on in small sets, and you can’t vote for your own.','The winners of each set meet in a final. Most votes wins.'],
  'duck-court':['Win the jury over.','Lawyers argue with the evidence they picked. The jury writes the evidence and votes.','Each case has a defendant, a prosecutor and a defense lawyer. Roles change every case.','The jury votes guilty or not guilty. The lawyer who convinced them scores.'],
  'duck-after-dark':['Villagers remove the whole mafia. The mafia matches the village in number.','By night, roles act in secret. By day, talk, nominate, hear a defense and vote.','Your role stays secret. Eliminated ducks move to the ghost lounge and stop voting.','The village wins when the mafia is gone. The mafia wins once it equals the village.'],
  'same-pond':['Predict what your partner would actually do.','Choose privately what you would do, then predict your partner’s choice.','Coins come only from predictions. Nothing scores who chose “better”.','Exact predictions earn 3 coins, close ones partial credit. Play Together to pool them.'],
  'duck-trap':['Get your duck home, and catch your partner with your trap.','Pick an object, place it on the shared course, then race to the duck house.','Every object affects both ducks, including the one that built it.','Home: 3 coins. Home first: 1. Your object sends your partner into the pond: 1. Most coins wins.'],
  'tail-thief':['Be the longest snake still in when time runs out.','Steer with the arrows or WASD, or swipe. Eat fruit to grow.','A wall, a closed gate, your own body or another head puts you out.','Cut a body to shorten it, land on a tail to steal it. The longest snake wins.']
};
const LABELS=['Goal','Your turn','Restriction','Winning'];
const CSS=`
.zrs{margin:14px 0 0;max-width:62ch;padding:14px 16px 10px;border-radius:16px;background:var(--surf2);text-align:left}
.zrs dl{display:grid;grid-template-columns:max-content 1fr;gap:7px 14px;margin:0}
.zrs dt{font:700 11.5px/1.55 var(--font-mono);letter-spacing:.08em;text-transform:uppercase;color:var(--g5);padding-top:2px}
.zrs dd{margin:0;font:500 15px/1.45 var(--font-sans);color:var(--fg)}
.zrs details{margin-top:8px;border-top:1px solid var(--g3);padding-top:2px}
.zrs summary{cursor:pointer;list-style:none;display:flex;align-items:center;gap:8px;min-height:40px;font:600 14px var(--font-sans);color:var(--g6)}
.zrs summary::-webkit-details-marker{display:none}
.zrs summary::before{content:"";width:7px;height:7px;border-right:2px solid currentColor;border-bottom:2px solid currentColor;transform:rotate(-45deg);transition:transform .15s;margin:0 4px}
.zrs details[open] summary::before{transform:rotate(45deg)}
.zrs summary:hover,.zrs summary:focus-visible{color:var(--fg)}
.zrs summary:focus-visible{outline:2px solid var(--fg);outline-offset:2px;border-radius:6px}
.zrs .zrs-more{padding:2px 0 8px;font:400 14.5px/1.55 var(--font-sans);color:var(--g6)}
.zrs .zrs-more p{margin:0 0 10px}
@media (max-width:520px){.zrs dl{grid-template-columns:1fr;gap:2px}.zrs dd{margin-bottom:8px}.zrs dt{padding-top:0}}
@media (prefers-reduced-motion:reduce){.zrs summary::before{transition:none}}
`;
const st=document.createElement('style'); st.id='zrs-css'; st.textContent=CSS; document.head.appendChild(st);
function html(slug,full){ const r=typeof R[slug]==='function'?R[slug]():R[slug]; if(!r) return '';
  return `<div class="zrs" data-slug="${slug}"><dl>${r.map((t,i)=>`<dt>${LABELS[i]}</dt><dd>${t}</dd>`).join('')}</dl>${full&&full.trim()?`<details><summary>More rules</summary><div class="zrs-more">${full}</div></details>`:''}</div>`; }
const slugNow=()=>location.pathname.replace(/^\/+|\/+$/g,'').split('/')[0].replace(/\.html$/,'');
/* a lesson to learn from: the shared tutorial's (ZLessons), or Tail Thief's own, which plays on its entry page */
const taught=slug=>slug==='tail-thief'||!!(window.ZLessons&&ZLessons.has(slug));
/* entry pages without a lesson: the card replaces the old "Full rules" box, under the short description */
function mount(){ const slug=slugNow(); if(!R[slug]) return;
  if(taught(slug)){ document.querySelectorAll('section.entry .zrs').forEach(c=>c.remove()); return; }
  document.querySelectorAll('section.entry').forEach(sec=>{ if(!sec.classList.contains('show')) return; const head=sec.querySelector('.e-head'), box=sec.querySelector('.e-rules'); if(!head||!box) return;
    const body=box.querySelector('.e-rules-body'), full=body?body.innerHTML:''; let card=head.querySelector('.zrs');
    if(card&&card.dataset.slug===slug&&card.dataset.full===String(full.length)) return;
    const wasOpen=card&&card.querySelector('details[open]');
    if(card) card.remove(); box.hidden=true;
    const wrap=document.createElement('div'); wrap.innerHTML=html(slug,full); card=wrap.firstChild; card.dataset.full=String(full.length); if(wasOpen) card.querySelector('details').open=true;
    const learn=head.querySelector('.e-learn'); (learn||box).insertAdjacentElement('beforebegin',card); }); }
let t=0; const later=()=>{ clearTimeout(t); t=setTimeout(mount,40); };
/* only an entry page opening, or its full rules being filled in, can change the card: nothing during play */
function watch(){ mount(); const mo=new MutationObserver(later);
  document.querySelectorAll('section.entry').forEach(sec=>{ mo.observe(sec,{attributes:true,attributeFilter:['class']}); const b=sec.querySelector('.e-rules-body'); if(b) mo.observe(b,{childList:true,subtree:true,characterData:true}); });
  addEventListener('popstate',later); }
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',watch); else setTimeout(watch,0);
window.ZFRules={ html, has:slug=>!!R[slug], slug:slugNow };
})();
