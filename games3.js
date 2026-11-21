/* games3.js: Pentago, TOOT & OTTO, Domineering, Notakto and the two original games (The Crowded Room, The Last Message).
   Board games use the same engines and the same artwork (zart.js) as their cards; the originals are simulations with disclosed, seeded rules. */
(function(){
const X=window.ZFX, E=ZF.E, P=E.PENTAGO, T=E.TOOT, D=E.DOM, N=E.NOTAKTO, $=X.$, rngOf=X.rngOf, Z=window.ZART;
const who=(p,c)=>c.opp==='2p'?`${window.ZFName?ZFName(p):'Player '+(p)}`:c.opp==='online'?(p===c.humanIs?'You':(c.opponentNickname||'Your friend')):(p===c.humanIs?'You':'The computer');
/* a rough, opening-position-only estimate: it counts legal placements on the empty (or holed) board, not how the
   game actually plays out from there, so it's labeled "reasonably balanced" rather than "fair" or "equal". */
function domBalance(v,h){
  if(!v||!h) return {label:'One side has no opening',cls:'bad'};
  const diff=Math.abs(v-h), rel=diff/((v+h)/2);
  if(rel<=0.15) return {label:'Reasonably balanced',cls:'ok'};
  return {label: v>h?'Favors vertical':'Favors horizontal', cls:'skew'};
}
const DOM_BALANCE_TIP='Counts only how many vertical and horizontal placements are legal on this empty board right now — not how a full game between two players would actually go. Equal counts are a reasonable starting point, not a guarantee of a fair match.';
const wins=(p,c)=>(c.opp!=='2p'&&p===c.humanIs)?'You win':`${who(p,c)} wins`;
const pick=(a,r)=>a[Math.floor((r||Math.random)()*a.length)];
const setPref=(id,k,v)=>{ try{ const p=JSON.parse(localStorage.getItem('zfx-prefs')||'{}'); p[id]=Object.assign(p[id]||{},{[k]:v}); localStorage.setItem('zfx-prefs',JSON.stringify(p)); }catch(e){} };
const CSS=`
/* pentago */
.pg{width:min(100%,680px,calc((100vh - 300px)/1.12));min-width:290px;margin:0 auto}
.pg svg{width:100%;height:auto;display:block;overflow:visible;color:var(--fg)}
.pg-steps{display:flex;gap:8px;justify-content:center;align-items:center;flex-wrap:wrap;margin:0 0 12px;font:600 14px var(--font-sans);color:var(--g6)}
.pg-steps .st{padding:7px 13px;border-radius:999px;background:var(--surf2);color:var(--g5)}
.pg-steps .st.done{color:var(--g6);background:var(--surf3)}
.pg-steps .st.cur{background:var(--fg);color:var(--bg)}
.pgcell{cursor:pointer;outline:none}
.pgcell .pgghost{opacity:0;pointer-events:none}
.pgcell:hover .pgghost,.pgcell:focus-visible .pgghost,.pgcell.pghov .pgghost{opacity:.6}
.pgcell:focus-visible .pgfocus{stroke:var(--fg);stroke-width:3}
.pgbtn{cursor:pointer;outline:none;transition:opacity .2s}
.pgbtn.off{opacity:.22;pointer-events:none}
.pgbtn.on:hover circle,.pgbtn.on:focus-visible circle{fill:var(--fg)}
.pgbtn.on:hover path,.pgbtn.on:focus-visible path{stroke:var(--bg)}
.pgbtn.used{opacity:1}.pgbtn.used circle{fill:var(--fg)}.pgbtn.used path{stroke:var(--bg)}
.cr-scene .crp.sel .hit{stroke:var(--fg);stroke-width:2}
.pgbtn.hb circle{stroke-dasharray:3 3;stroke-width:3.4}
.pgline{stroke:var(--fg);stroke-width:10;stroke-linecap:round;opacity:.5}
.pgfresh{fill:none;stroke:var(--fg);stroke-width:3.4;stroke-dasharray:5 5}
/* toot & otto */
.tt{display:flex;flex-direction:column;align-items:center;gap:12px}
.tt-words{display:flex;gap:18px;flex-wrap:wrap;justify-content:center;font:600 15px var(--font-sans);color:var(--g6)}.tt-words b{font:700 20px var(--font-mono);color:var(--fg);letter-spacing:.06em}
.tt-board{position:relative;display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:6px;padding:8px;background:var(--g4);border-radius:16px;width:min(100%,500px)}
.tt-cell{aspect-ratio:1/1;border-radius:50%;background:var(--surf);display:flex;align-items:center;justify-content:center;font:800 clamp(20px,4.6vw,34px) var(--font-sans);color:var(--bg);position:relative}
.tt-cell.f{background:var(--fg)}.tt-cell.w{box-shadow:0 0 0 4px var(--bg),0 0 0 7px var(--fg)}.tt-cell.g{color:var(--fg);opacity:.4;background:transparent}
.tt-cell.hit{cursor:pointer}
.tt-cell.hintc{color:var(--fg);opacity:1;background:transparent;box-shadow:inset 0 0 0 3px var(--fg);animation:zhint 1.1s ease-in-out infinite}
.tt-pick button.hinted{box-shadow:0 0 0 3px var(--bg),0 0 0 5px var(--fg)}
@keyframes zhint{50%{opacity:.45}}
.dmhint{fill:var(--fg);fill-opacity:.1;stroke:var(--fg);stroke-width:3.4;stroke-dasharray:6 5;pointer-events:none;animation:zhint 1.1s ease-in-out infinite}
.nk .hintc{fill:var(--fg);fill-opacity:.1;stroke:var(--fg);stroke-width:2.6;stroke-dasharray:4 4;pointer-events:none;animation:zhint 1.1s ease-in-out infinite}
.nk .xg{opacity:.45}
.tt-sup{display:flex;gap:18px;flex-wrap:wrap;justify-content:center;font:600 13.5px var(--font-mono);color:var(--g5)}.tt-sup .cur{color:var(--fg);font-weight:800;background:var(--surf2);border-radius:999px;padding:3px 10px}
.tt-pick{display:flex;gap:14px;align-items:flex-end}
.tt-pick .ttbtn{display:flex;flex-direction:column;align-items:center;gap:4px}
.tt-pick button{min-width:64px;min-height:48px;border:none;border-radius:12px;background:var(--surf2);color:var(--fg);font:800 22px var(--font-sans);cursor:pointer;position:relative}
.tt-pick button[aria-pressed="true"]{background:var(--fg);color:var(--bg)}
.tt-pick button:disabled{opacity:.32;cursor:not-allowed;text-decoration:line-through}
.tt-pick .ttcount{font:700 12px var(--font-mono);color:var(--g5);letter-spacing:.02em}
.tt-pick .ttcount.out{color:var(--g4);text-decoration:line-through}
@media (max-width:420px){.tt-sup{gap:10px;font-size:12px}.tt-pick{gap:10px}}
/* domineering */
.dm{width:min(100%,560px,calc(100vh - 330px));min-width:270px;margin:0 auto}.dm svg{display:block;width:100%;height:auto;color:var(--fg);overflow:visible}
.dmhit{fill:transparent;cursor:pointer;outline:none}
.dmgv{fill:var(--fg);fill-opacity:.16;stroke:var(--fg);stroke-width:3.4;pointer-events:none}
.dmgi{fill:none;stroke:var(--g5);stroke-width:2.4;stroke-dasharray:3 5;pointer-events:none;opacity:.9}
.dmgx{stroke:var(--g5);stroke-width:2.6;stroke-linecap:round;pointer-events:none}
.dmlast{fill:none;stroke:var(--fg);stroke-width:2.6;stroke-dasharray:5 4;pointer-events:none;transform-box:fill-box;transform-origin:center;animation:zdmPulse .45s ease-out}
.zdt{transform-box:fill-box;transform-origin:center}
.zdt.zdt-new{animation:zdmPop .4s ease-out}
@keyframes zdmPulse{from{opacity:0;transform:scale(1.18)}to{opacity:1;transform:scale(1)}}
@keyframes zdmPop{from{opacity:0;transform:scale(.6)}to{opacity:1;transform:scale(1)}}
@media (prefers-reduced-motion: reduce){.dmlast{animation:none}.zdt.zdt-new{animation:none}}
.dmem{fill:none;stroke:var(--fg);stroke-width:2.6;stroke-dasharray:4 4;pointer-events:none}
.dm-msg{font:500 14px/1.4 var(--font-sans);color:var(--g6);text-align:center;min-height:2.6em;margin-top:8px}
.dm-msg b{color:var(--fg)}
.dm-leg{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:6px;font:500 14px var(--font-sans);color:var(--g6)}.dm-leg span{display:inline-flex;align-items:center;gap:8px;padding:5px 12px 5px 9px;border-radius:999px;border:1.5px solid transparent}.dm-leg span.cur{color:var(--fg);font-weight:700;border-color:var(--g4);background:var(--surf2)}.dm-leg svg{width:auto;height:30px;color:var(--fg);overflow:visible}
.dm-count{font:500 13.5px var(--font-mono);color:var(--g5);text-align:center}
.dmws{cursor:pointer;outline:none}
.dm-dims{display:flex;align-items:center;gap:14px;flex-wrap:wrap;justify-content:center;font:600 13.5px var(--font-sans);color:var(--g6)}
.dm-dims label{display:flex;align-items:center;gap:6px}
.dm-dims .x{color:var(--g5)}
.dm-dims input{width:44px;min-height:34px;border:1.5px solid var(--g3);border-radius:9px;background:var(--surf);color:var(--fg);font:600 14px var(--font-mono);text-align:center}
.dm-step{width:32px;height:32px;border:none;border-radius:9px;background:var(--surf2);color:var(--fg);font:700 16px var(--font-sans);cursor:pointer}
.dm-step:hover{background:var(--surf3)}
.dm-warn{font:500 13px/1.4 var(--font-sans);color:var(--g6);text-align:center;max-width:44ch;margin:0 auto}
.dm-balance{display:flex;align-items:center;justify-content:center;gap:6px;flex-wrap:wrap;font:700 13px var(--font-sans)}
.dm-balance .lbl{padding:4px 11px;border-radius:999px;background:var(--surf3);color:var(--fg)}
.dm-balance.bad .lbl{background:var(--g2);color:var(--fg)}
.dm-why{width:20px;height:20px;border-radius:50%;border:1px solid var(--g4);background:transparent;color:var(--g5);font:700 11px var(--font-mono);cursor:pointer;line-height:1;padding:0}
.dm-why:hover,.dm-why:focus-visible{border-color:var(--fg);color:var(--fg)}
.dm-tip{display:none;font:500 12.5px/1.5 var(--font-sans);color:var(--g5);max-width:42ch;text-align:center;margin:2px auto 0;background:var(--surf3);border-radius:10px;padding:8px 12px}
.dm-tip.show{display:block}
/* notakto */
.nk{display:flex;gap:clamp(14px,2.6vw,30px);flex-wrap:wrap;justify-content:center;align-items:flex-start;width:100%;max-width:900px;margin:0 auto}
.nk-b{width:min(31%,270px);min-width:150px;transition:opacity .35s}.nk-b svg{width:100%;height:auto;display:block;color:var(--fg)}
.nk-b.closed{opacity:.3}.nk-b .c{fill:var(--surf);cursor:pointer}.nk-b .c:hover{fill:var(--surf3)}.nk-b.closed .c{cursor:default}.nk-b .fr{fill:none;stroke:var(--g4);stroke-width:3}
.nk-b .x{stroke:var(--fg);stroke-width:7;stroke-linecap:round}.nk-b .line{stroke:var(--fg);stroke-width:8;stroke-linecap:round}
.nk-b.last .fr{stroke:var(--fg)}
.nk-count{font:700 18px var(--font-mono);color:var(--fg);text-align:center}
/* the crowded room */
.cr{display:flex;flex-direction:column;gap:12px;width:100%;align-items:center}
.cr-count{display:flex;align-items:center;gap:14px;justify-content:center;flex-wrap:wrap;min-height:64px}
.cr-count .n{font:800 56px/1 var(--font-sans);color:var(--fg);letter-spacing:-.02em}
.cr-count .of{font:600 16px var(--font-sans);color:var(--g6);max-width:16ch}
.cr-count svg{width:44px;height:44px;color:var(--fg);flex:none}
.cr-scene{width:min(100%,400px)}.cr-scene svg{width:100%;height:auto;display:block;color:var(--fg);overflow:visible}
.cr-scene .arr{animation:crIn .55s calc(var(--i)*55ms) both}
@keyframes crIn{from{opacity:0;transform:translateY(46px)}to{opacity:1;transform:none}}
.cr-scene .crp{cursor:pointer;outline:none}.cr-scene .crp.dim{opacity:.4}.cr-scene .crp:focus-visible circle.hit,.cr-scene .crp:hover circle.hit{stroke:var(--fg);stroke-width:2}
.cr-scene .youring{fill:none;stroke:var(--fg);stroke-width:2.6}
.cr-say{font:500 clamp(16px,1.5vw,19px)/1.45 var(--font-sans);color:var(--fg);text-align:center;max-width:52ch;min-height:2.9em}
.cr-lines{font:500 clamp(16px,1.5vw,19px)/1.55 var(--font-sans);color:var(--g6);text-align:center;max-width:52ch}.cr-lines div{animation:crLine .4s both}.cr-lines div:nth-child(2){animation-delay:.5s}.cr-lines div:nth-child(3){animation-delay:1s}.cr-lines div:nth-child(4){animation-delay:1.4s}.cr-lines b{color:var(--fg)}.cr-lines .soft{font-size:14px;color:var(--g5)}
@keyframes crLine{from{opacity:0;transform:translateY(5px)}to{opacity:1}}
.cr-past{font:600 13px var(--font-mono);letter-spacing:.04em;color:var(--g5);background:var(--surf2);padding:5px 12px;border-radius:999px}
.cr-say.soft{color:var(--g6);font-size:15px}
.cr-choose{display:flex;gap:12px;flex-wrap:wrap;justify-content:center}.cr-choose button{min-width:150px;min-height:56px;border:none;border-radius:14px;font:700 18px var(--font-sans);cursor:pointer;background:var(--surf3);color:var(--fg);padding:0 22px}.cr-choose button.go{background:var(--fg);color:var(--bg)}
.cr-choose button:disabled{opacity:.4;cursor:default}
.cr-guess{display:flex;align-items:center;gap:10px;font:500 14px var(--font-sans);color:var(--g6)}.cr-guess button{width:34px;height:34px;border:none;border-radius:50%;background:var(--surf3);color:var(--fg);font:700 18px var(--font-sans);cursor:pointer}.cr-guess b{min-width:2ch;text-align:center;color:var(--fg);font:700 18px var(--font-mono)}
.cr-chart{width:min(100%,600px)}.cr-chart svg{width:100%;height:auto;display:block;color:var(--fg)}
.cr-hud{display:flex;gap:22px;flex-wrap:wrap;justify-content:center;font:600 14px var(--font-sans);color:var(--g6)}.cr-hud b{font:700 20px var(--font-mono);color:var(--fg)}
.cr-prog{font:600 12px var(--font-mono);letter-spacing:.08em;text-transform:uppercase;color:var(--g5)}
.cr-info{font:500 14.5px/1.5 var(--font-sans);color:var(--g6);max-width:60ch;text-align:center;min-height:2.6em}.cr-info b{color:var(--fg)}
.cr-build{display:grid;grid-template-columns:1fr auto;gap:8px 18px;max-width:520px;width:100%;align-items:center}
.cr-build .t{font:600 15px var(--font-sans);color:var(--fg)}.cr-build .t small{display:block;font:400 13px var(--font-sans);color:var(--g5)}
.cr-guests{max-width:600px;width:100%;font:500 14px var(--font-sans);color:var(--g6)}.cr-guests summary{cursor:pointer;color:var(--g6)}
.cr-guests .row{display:grid;grid-template-columns:120px 1fr;gap:4px 12px;padding-top:8px}.cr-guests .row b{color:var(--fg)}
/* the last message */
.lm{display:flex;flex-direction:column;gap:14px;width:100%;align-items:center}
.lm-map{width:min(100%,460px)}.lm-map svg{width:100%;height:auto;display:block;color:var(--fg);overflow:visible}
.lm-story{font:500 clamp(16px,1.5vw,19px)/1.5 var(--font-sans);color:var(--fg);max-width:54ch;text-align:center}
.lm-story small{display:block;font:400 14.5px/1.5 var(--font-sans);color:var(--g6);margin-top:6px}
.lm-qa{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;width:min(100%,680px)}
.lm-qa div{background:var(--surf2);border-radius:14px;padding:11px 14px;font:500 14px/1.45 var(--font-sans);color:var(--g6)}.lm-qa div b{display:block;font:700 11px var(--font-mono);letter-spacing:.09em;text-transform:uppercase;color:var(--g5);margin-bottom:4px}
.lm-panels{display:grid;grid-template-columns:1fr 1fr;gap:12px;width:min(100%,680px)}
.lm-panel{background:var(--surf2);border-radius:14px;padding:12px 14px;font:500 14px/1.5 var(--font-sans);color:var(--g6)}.lm-panel h4{font:700 15px var(--font-sans);color:var(--fg);margin:0 0 6px}
.lm-acts{display:flex;gap:10px;flex-wrap:wrap;justify-content:center}.lm-acts button{min-height:52px;padding:0 24px;border:none;border-radius:14px;font:700 16px var(--font-sans);cursor:pointer;background:var(--surf3);color:var(--fg)}.lm-acts button.pri{background:var(--fg);color:var(--bg)}.lm-acts button:disabled{opacity:.35;cursor:default}
.lm-tbl{width:min(100%,680px);border-collapse:collapse;font:500 13.5px var(--font-mono);color:var(--g6)}.lm-tbl td,.lm-tbl th{padding:6px 8px;text-align:left;border-bottom:1px solid var(--g3)}.lm-tbl th{color:var(--fg)}
.rb{font-weight:700;color:var(--fg)}
.lm-prog{font:600 12px var(--font-mono);letter-spacing:.08em;text-transform:uppercase;color:var(--g5)}
@media (max-width:640px){.lm-panels,.lm-qa{grid-template-columns:1fr}}
`;
(function(){ const st=document.createElement('style'); st.id='gx3-css'; st.textContent=CSS; document.head.appendChild(st); })();

/* ================= Pentago ================= */
const PG=Z.pgGeom({cell:38});
const qHas=(cells,q)=>{ const r0=(q>>1)*3,c0=(q&1)*3; for(let r=r0;r<r0+3;r++)for(let c=c0;c<c0+3;c++) if(cells[r*6+c]) return true; return false; };
/* the computer picks a placement and a turn together, then plays them as two visible actions */
let pQueue=null;
function pCombos(s){ const all=[]; for(const pm of P.legal(s)){ const a=P.apply(s,pm); if(a.over){ all.push([pm,null]); continue; } for(const rm of P.legal(a)) if(qHas(a.cells,rm.q)) all.push([pm,rm]); } return all; }
function pScore(s,pm,rm,me,deep){ const a=P.apply(s,pm); if(a.over) return 1e6; const b=P.apply(a,rm); if(b.over){ if(b.winner===me) return 5e5; if(b.winner===0) return -1000; return -5e5; }
  let v=P.evalFor(b.cells,me); if(deep){ let oppWin=false; for(const p2 of P.legal(b)){ const c=P.apply(b,p2); if(c.over){ oppWin=true; break; } for(const r2 of P.legal(c)){ const d=P.apply(c,r2); if(d.over&&d.winner===3-me){ oppWin=true; break; } } if(oppWin) break; } if(oppWin) v-=3e5; } return v; }
function pChoose(s,level){ const me=s.turn, combos=pCombos(s); let bl=[];
  if(level==='easy') bl=combos; else { let best=-1e12; for(const [pm,rm] of combos){ const v=pScore(s,pm,rm,me,level==='hard'); if(v>best){ best=v; bl=[[pm,rm]]; } else if(v===best) bl.push([pm,rm]); } }
  const ch=pick(bl); pQueue={rot:ch[1]}; return ch[0]; }
/* the turn after a placement when the planned one is gone (a resumed game): win if possible, never hand over five, else build */
function pBestRot(s){ const me=s.turn; let best=-1e12,bl=[]; for(const rm of P.legal(s)){ if(!qHas(s.cells,rm.q)) continue; const n=P.apply(s,rm); const v=n.over?(n.winner===me?1e6:n.winner===0?-1e3:-1e6):P.evalFor(n.cells,me); if(v>best){best=v;bl=[rm];} else if(v===best) bl.push(rm); } return bl.length?pick(bl):pick(P.legal(s)); }
const pRegistry={ id:'pentago', title:['Pentago'], blurb:'Place one. Twist everything. Five in a row wins, even if the twist makes it.', aiDelay:750,
  diffs:[['easy','Easy'],['medium','Medium'],['hard','Hard']], diffNote:'Easy plays at random. Medium takes a win it can see and otherwise builds lines. Hard also refuses any move that lets you win with your next placement and twist. None of them is a perfect solver.',
  rules:`<p>The board is 6×6, made of four <b>quadrants</b>, each a tray of 3×3 holes. Each turn has <b>two steps</b>: <b>1. place</b> a marble in an empty hole, then <b>2. turn</b> any one quadrant a quarter turn, clockwise or counter-clockwise. Player 1 plays the light marbles, Player 2 the dark. Five or more of your marbles in an unbroken line (across, down or diagonally) wins.</p><p>If your placement makes five, you win at once, with no turn. If the turn makes five for one player, that player wins; if it makes five for <b>both</b>, the game is a draw. A full board with no line is also a draw. <i>Convention:</i> turning a quadrant that is empty or unchanged is allowed and works as a neutral turn.</p><p><b>One Twist</b> puzzles start after the placement and ask for the turn that wins.</p>`,
  init:()=>P.newState(), actor:s=>s.turn, apply:(s,m)=>P.apply(s,m), legal:s=>P.legal(s),
  ai(s,level){ if(s.phase==='rot'){ const q=pQueue&&pQueue.rot; pQueue=null; return q||pBestRot(s); } return X.askAI('pentago',s,level).then(r=>{ if(!r) return null; pQueue={rot:r.rot}; return r.place; }); },
  hint(s){ if(s.phase==='rot'){ let best=-1e12,b=null; for(const rm of P.legal(s)){ const n=P.apply(s,rm); const v=n.over?(n.winner===s.turn?1e6:-1e6):P.evalFor(n.cells,s.turn); if(v>best){best=v;b=rm;} } return b; }
    let best=-1e12,b=null; for(const [pm,rm] of pCombos(s)){ const v=pScore(s,pm,rm,s.turn,false); if(v>best){best=v;b=pm;} } return b; },
  status(s,c){ if(s.over) return `<span class="who">${s.winner?who(s.winner,c)+' wins':'A draw'}</span>`; const step=s.phase==='place'?1:2;
    if(c.opp==='online'){ const verb=step===1?'place a marble':'rotate a quadrant', verbIng=step===1?'is placing a marble':'is rotating a quadrant';
      // whose turn it logically is (s.turn) is not the same thing as c.human (also false while busy/disconnected) —
      // conflating them showed the nonsensical "You is placing a marble" during an opponent disconnect on my own turn.
      const mine=s.turn===c.humanIs;
      return `<span class="who">${mine?`Your turn — ${verb}`:`${who(s.turn,c)} ${verbIng}`}</span>`; }
    const who_=c.opp==='2p'?`${window.ZFName?ZFName(s.turn):'Player '+(s.turn)}`:(c.human?'Your turn':`Computer is thinking…`);
    const cond=c.human?(step===1?'Step 1 of 2 · place a marble':'Step 2 of 2 · turn a quadrant'):(step===1?'Step 1 of 2 · placing a marble…':'Step 2 of 2 · turning a quadrant…');
    return `<span class="who">${who_}</span><span class="cond">${cond}</span>`; },
  render(host,s,c){ pRender(host,s,c); },
  result(s,c){ const why={placement:'Five in a row made by the placement itself, before any turn.',rotation:'The turn lined up five marbles.',both:'The turn gave both players a line of five, so nobody wins.',full:'The board filled with no line of five.'}[s.reason]; return {title:s.winner?`${wins(s.winner,c)}`:'A draw',detail:why}; },
  online:()=>{ window.ZFOnlinePentago && ZFOnlinePentago.open(); }, entryReady:true };
function pRender(host,s,c){
  const prev=host._pgPrev; const shown=(c.reveal&&c.reveal.state)?c.reveal.state:s; host._pgPrev=shown;
  const al=c.allowed||{}; const live=!shown.over&&!c.reveal; const placing=c.human&&live&&shown.phase==='place', rotating=c.human&&live&&shown.phase==='rot';
  // marble color is purely cosmetic (the rule engine only ever reasons in seat numbers) — c.colorOf, when the host
  // picked a color online, remaps a seat number to which gradient (1=light,2=dark) it draws as; identity otherwise.
  const kindOf=c.colorOf||(p=>p), dispCells=shown.cells.map(v=>v?kindOf(v):0);
  const u=Z.uid(), last=shown.moves[shown.moves.length-1]; let g=Z.pgDefs(u);
  for(let q=0;q<4;q++){ g+=Z.pgFrame(PG,q); const [hx,hy]=PG.hub(q); g+=`<g class="pgq" data-q="${q}" style="transform-origin:${hx}px ${hy}px">${Z.pgQuadHoles(PG,q,dispCells,u)}</g>`; }
  if(last&&last.t==='place'&&live){ const [x,y]=PG.xy(Math.floor(last.cell/6),last.cell%6); g+=`<circle class="pgfresh" cx="${x}" cy="${y}" r="${PG.cell*.47}"/>`; }
  if(c.hintMove&&c.hintMove.t==='place'&&placing){ const [x,y]=PG.xy(Math.floor(c.hintMove.cell/6),c.hintMove.cell%6); g+=`<circle cx="${x}" cy="${y}" r="${PG.cell*.47}" fill="none" stroke="currentColor" stroke-width="3" stroke-dasharray="3 5"/>`; }
  if(al.cell!==undefined&&placing){ const [x,y]=PG.xy(Math.floor(al.cell/6),al.cell%6); g+=`<circle cx="${x}" cy="${y}" r="${PG.cell*.47}" fill="none" stroke="currentColor" stroke-width="3" stroke-dasharray="4 5"/>`; }
  (shown.over?shown.lines:[]).forEach(l=>{ const a=PG.xy(Math.floor(l[0]/6),l[0]%6), b=PG.xy(Math.floor(l[4]/6),l[4]%6); g+=`<line class="pgline" x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}"/>`; });
  if(placing){ for(let i=0;i<36;i++){ if(shown.cells[i]!==0||(al.cell!==undefined&&al.cell!==i)) continue; const [x,y]=PG.xy(Math.floor(i/6),i%6); g+=`<g class="pgcell" data-i="${i}" tabindex="0" role="button" aria-label="place a marble at row ${Math.floor(i/6)+1}, column ${i%6+1}"><g class="pgghost">${Z.pgMarble(kindOf(shown.turn),x,y,PG.cell*.37,u)}</g><circle class="pgfocus" cx="${x}" cy="${y}" r="${PG.cell*.45}" fill="transparent" stroke="none"/></g>`; } }
  if(!shown.over&&!c.reveal){ for(let q=0;q<4;q++) for(const d of [-1,1]){ const on=rotating&&(!al.rot||(al.rot.q===q&&al.rot.d===d)); const used=last&&last.t==='rot'&&last.q===q&&last.d===d&&shown.phase==='place'&&false;
      const cx=d<0?PG.qx(q)+PG.px+16:PG.qx(q)+PG.qw-PG.px-16, cy=PG.qy(q)+15; g+=`<g class="pgbtn ${on?'on':'off'}${c.hintMove&&c.hintMove.t==='rot'&&c.hintMove.q===q&&c.hintMove.d===d&&rotating?' hb':''}${last&&last.t==='rot'&&last.q===q&&last.d===d&&!rotating?' used':''}" data-q="${q}" data-d="${d}" ${on?'tabindex="0" role="button"':'aria-disabled="true"'} aria-label="turn quadrant ${q+1} ${d>0?'clockwise':'counter-clockwise'}"><title>${d>0?'Turn clockwise':'Turn counter-clockwise'}</title>${Z.pgRotBtn(cx,cy,d)}</g>`; } }
  const si=shown.over?2:(shown.phase==='place'?0:1);
  const steps=(c.puzzle||shown.over)?'':`<div class="pg-steps" aria-live="polite"><span>${c.opp==='2p'?`${window.ZFName?ZFName(shown.turn):'Player '+(shown.turn)}`:(c.human?'You':'Computer')}</span><span class="st ${si>0?'done':'cur'}">1 · Place a marble</span><span class="st ${si===1?'cur':''}">2 · Turn a quadrant</span></div>`;
  host.innerHTML=`<div class="pg">${steps}<svg viewBox="0 0 ${PG.W} ${PG.H}" role="group" aria-label="Pentago board: four quadrants, each a tray of nine holes">${g}</svg></div>`;
  // The ghost marble's visibility is driven by CSS :hover already, but a full host.innerHTML rebuild (every render,
  // including the opponent's move landing while the pointer sits still over the board) replaces the hovered element
  // outright -- the browser then has to re-match :hover on the new node, which is usually instant but isn't
  // guaranteed to repaint before the next frame on every engine, and any indicator that failed to explicitly clear
  // on a rebuild would otherwise show a stale cell as still highlighted. An explicit pointerenter/leave pair makes
  // the "one target lit at a time" invariant hold by construction: entering a new cell synchronously clears every
  // other lit cell first, so there is never more than one ghost showing and never a leftover one from before.
  const clearPgHover=()=>host.querySelectorAll('.pgcell.pghov').forEach(e=>e.classList.remove('pghov'));
  host.querySelectorAll('.pgcell').forEach(el=>{ const act=()=>c.play({t:'place',cell:+el.dataset.i});
    el.addEventListener('click',act); el.addEventListener('keydown',e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); act(); } });
    el.addEventListener('pointerenter',()=>{ clearPgHover(); el.classList.add('pghov'); });
    el.addEventListener('pointerleave',()=>el.classList.remove('pghov')); });
  host.querySelectorAll('.pgbtn.on').forEach(el=>{ const act=()=>c.play({t:'rot',q:+el.dataset.q,d:+el.dataset.d}); el.addEventListener('click',act); el.addEventListener('keydown',e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); act(); } }); });
  if(last&&last.t==='rot'&&prev&&prev.moves.length===shown.moves.length-1){ const grp=host.querySelector(`.pgq[data-q="${last.q}"]`); if(grp&&grp.animate) grp.animate([{transform:`rotate(${-last.d*90}deg)`},{transform:'rotate(0deg)'}],{duration:560,easing:'cubic-bezier(.3,.8,.25,1)'}); } }
/* puzzles: One Twist */
function pPositions(seed,count){ const rng=rngOf(seed), out=[], seen=new Set(); const pk=a=>a[Math.floor(rng()*a.length)];
  for(let t=0;t<2500&&out.length<count;t++){ let s=P.newState(); const plies=10+2*Math.floor(rng()*4); let ok=true;
    for(let k=0;k<plies&&ok;k++){ let mv; if(s.phase==='place'&&s.turn===1&&rng()<.8){ let bestv=-1e9,bl=[]; for(const m of P.legal(s)){ const a=P.apply(s,m); if(a.over){ok=false;break;} const v=P.evalFor(a.cells,1); if(v>bestv){bestv=v;bl=[m];} else if(v===bestv) bl.push(m); } if(!ok) break; mv=pk(bl); } else if(s.phase==='rot'){ const all=P.legal(s), safe=all.filter(m=>!P.apply(s,m).over); mv=pk(safe.length?safe:all); } else mv=pk(P.legal(s)); s=P.apply(s,mv); if(s.over) ok=false; }
    if(!ok||s.turn!==1||s.phase!=='place') continue; let combos=[],bad=false; for(const pm of P.legal(s)){ const a=P.apply(s,pm); if(a.over){bad=true;break;} for(const rm of P.legal(a)){ const b=P.apply(a,rm); if(b.over&&b.winner===1&&b.reason==='rotation') combos.push([pm,rm]); } }
    if(bad||combos.length<1||combos.length>3||s.cells.filter(x=>x).length>14) continue; const key=s.cells.join(''); if(seen.has(key)) continue; seen.add(key); const place=combos[0][0]; const after=P.apply(s,place); const wins=P.legal(after).filter(rm=>{ const b=P.apply(after,rm); return b.over&&b.winner===1; }); out.push({state:after,wins,place}); }
  return out; }
pRegistry.puzzleSets=[{ id:'twist', name:'One Twist', kind:'move', note:'The marble is already placed. Find the turn that gives you five.', items:(()=>{ let c; return ()=>c||(c=pPositions(31337,3).map(o=>({state:o.state,prompt:'Which turn makes five in a row?',
  check(m){ const ok=o.wins.some(w=>w.q===m.q&&w.d===m.d); const after=P.apply(o.state,m); return ok?{ok:true,explain:'Yes. The highlighted line is the five that turn creates. '+(o.wins.length>1?'More than one turn works here.':'It is the only winning turn.'),reveal:{state:after}}:{ok:false,explain:after.over&&after.winner===2?'That turn gives your opponent five (highlighted).':'That turn does not complete five. Look for the quadrant that carries a marble into the gap.',reveal:{state:after}}; } }))); })() }];
pRegistry.demo=(host)=>{ const PV=(()=>{ const prefix=[["p",14],["r",1,1],["p",9],["r",0,1],["p",6],["r",0,-1],["p",21],["r",1,1],["p",15],["r",2,1],["p",6],["r",3,1],["p",16],["r",1,1],["p",33],["r",2,-1]]; let st=P.newState(); for(const m of prefix) st=P.apply(st,m[0]==='p'?{t:'place',cell:m[1]}:{t:'rot',q:m[1],d:m[2]}); return st; })();
  ZF.injectCSS(); X.css(); let st=PV, msg='<b>Step 1.</b> Place a marble in the dashed hole.', al={cell:12};
  host.innerHTML=`<div class="gx-demo"><span class="gx-tag">Try a move</span><div class="gx-dbody" style="width:100%"></div><div class="gx-note" aria-live="polite"></div><button type="button" class="gx-btn">↺ Reset</button></div>`; const body=host.querySelector('.gx-dbody'), nt=host.querySelector('.gx-note');
  const draw=()=>{ nt.innerHTML=msg; pRender(body,st,{human:!st.over,humanIs:1,opp:'2p',allowed:al,opt:{},play:m=>{ st=P.apply(st,m); if(m.t==='place'){ msg='<b>Step 2.</b> Now turn the top-right quadrant counter-clockwise (the arrow on its top left).'; al={rot:{q:1,d:-1}}; } else { msg='<b>Five in a row.</b> The turn slid a marble into the line, and turning is part of every move.'; al={}; } draw(); }}); };
  host.querySelector('.gx-btn').onclick=()=>{ st=PV; body._pgPrev=null; msg='<b>Step 1.</b> Place a marble in the dashed hole.'; al={cell:12}; draw(); }; draw(); };
X.register(pRegistry);

/* ================= TOOT & OTTO ================= */
let tLetter='T', tHover=-1;
function tEval(s,me){ const opp=3-me; let v=0; const mine=me===1?'TOOT':'OTTO', theirs=me===1?'OTTO':'TOOT'; for(const w of T.WIN){ const cs=w.map(i=>s.board[i]); const fits=(word)=>cs.every((ch,k)=>!ch||ch===word[k]); const n=cs.filter(Boolean).length; if(fits(mine)) v+=[0,1,4,20][n]||0; if(fits(theirs)) v-=[0,1,4,20][n]||0; } return v; }
function tSearch(s,depth,alpha,beta,me){ if(s.over) return s.winner===0?0:(s.winner===me?1000+depth:-1000-depth); if(depth===0) return tEval(s,me);
  const moves=T.legal(s); if(!moves.length) return 0; const maxing=s.turn===me; let best=maxing?-1e9:1e9;
  for(const m of moves){ const v=tSearch(T.apply(s,m),depth-1,alpha,beta,me); if(maxing){ if(v>best)best=v; if(best>alpha)alpha=best; } else { if(v<best)best=v; if(best<beta)beta=best; } if(alpha>=beta) break; } return best; }
function tAI(s,level){ const moves=T.legal(s); const me=s.turn;
  if(level==='easy') return pick(moves);
  const wins=moves.filter(m=>{ const n=T.apply(s,m); return n.over&&n.winner===me; }); if(wins.length) return pick(wins);
  const safe=moves.filter(m=>{ const n=T.apply(s,m); return !(n.over&&n.winner!==me); }); if(level==='medium') return pick(safe.length?safe:moves);
  let best=-1e9,bl=[]; for(const m of (safe.length?safe:moves)){ const v=tSearch(T.apply(s,m),3,-1e9,1e9,me); if(v>best){best=v;bl=[m];} else if(v===best) bl.push(m); } return pick(bl); }

const ord=n=>['','1st','2nd','3rd','4th','5th','6th'][n]||n+'th';
function tHint(s){ const H=X.H, moves=T.legal(s), me=s.turn, word=me===1?'TOOT':'OTTO', theirs=me===1?'OTTO':'TOOT';
  const say=m=>`Drop <b>${m.ch}</b> in <b>column ${m.col+1}</b> (it lands ${ord(T.R-T.landing(s,m.col))} from the bottom).`;
  const wins=moves.filter(m=>{ const n=T.apply(s,m); return n.over&&n.winner===me; });
  if(wins.length){ const m=pick(wins); return H(m,`${say(m)} <b>This spells ${word}, so you win.</b>`); }
  const safe=moves.filter(m=>{ const n=T.apply(s,m); return !(n.over&&n.winner!==me); });
  if(!safe.length){ const m=pick(moves); return H(m,`${say(m)} Every legal drop spells ${theirs} for your opponent, so this position is lost.`); }
  const m=tAI(s,'hard'); return H(m,`${say(m)} It avoids spelling ${theirs} and rates best after a four-move search. TOOT &amp; OTTO has no exact solver here, so this is advice, not a proof.`); }
function tRender(host,s,c){ if(c.reveal&&c.reveal.state) s=c.reveal.state; const cur=s.turn, sup=s.sup[cur]; if(!s.sup[cur][tLetter]) tLetter=sup.T?'T':'O'; const win=new Set(s.cells||[]); const canPlay=c.human&&!s.over&&!c.reveal;
  let cells=''; for(let r=0;r<4;r++)for(let col=0;col<6;col++){ const ch=s.board[T.idx(r,col)]; const hm=canPlay?c.hintMove:null, isH=hm&&!ch&&col===hm.col&&T.landing(s,col)===r; cells+=`<div class="tt-cell${ch?' f':''}${win.has(T.idx(r,col))?' w':''}${canPlay&&T.landing(s,col)>=0?' hit':''}${isH?' hintc':''}" data-col="${col}" data-r="${r}" role="gridcell" aria-label="row ${r+1} column ${col+1}${ch?', '+ch:''}${isH?', suggested drop: '+hm.ch:''}">${ch||(isH?hm.ch:'')}</div>`; }
  const sp=(p)=>`<span class="${cur===p&&!s.over?'cur':''}">P${p}: T×${s.sup[p].T} O×${s.sup[p].O}</span>`;
  const letterBtn=(L)=>`<div class="ttbtn"><button type="button" data-l="${L}" class="${c.hintMove&&c.hintMove.ch===L?'hinted':''}" aria-pressed="${tLetter===L}" aria-label="${L}, ${sup[L]} left" ${sup[L]?'':'disabled'}>${L}</button><span class="ttcount${sup[L]?'':' out'}">${sup[L]} left</span></div>`;
  host.innerHTML=`<div class="tt"><div class="tt-words"><span>Player 1 wants <b>TOOT</b></span><span>Player 2 wants <b>OTTO</b></span></div><div class="tt-board" role="grid">${cells}</div><div class="tt-sup">${sp(1)}${sp(2)}</div>${canPlay?`<div class="tt-pick" role="group" aria-label="letter to drop, ${cur===1?'Player 1':'Player 2'}'s remaining letters">${letterBtn('T')}${letterBtn('O')}</div><div class="gx-key" style="margin-top:0">Choose a letter, then click a column. Any four in a row that spell a word count, whoever dropped the letters.</div>`:''}</div>`;
  const cellAt=(r,col)=>host.querySelector(`.tt-cell[data-r="${r}"][data-col="${col}"]`); let ghostEl=null;
  const clearGhost=()=>{ if(ghostEl){ ghostEl.classList.remove('g'); ghostEl.textContent=''; ghostEl=null; } };
  host.querySelectorAll('.tt-pick button').forEach(b=>b.onclick=()=>{ tLetter=b.dataset.l; host.querySelectorAll('.tt-pick button').forEach(x=>x.setAttribute('aria-pressed',x.dataset.l===tLetter)); if(ghostEl) ghostEl.textContent=tLetter; });
  host.querySelectorAll('.tt-cell.hit').forEach(el=>{ const col=+el.dataset.col; el.onclick=()=>{ clearGhost(); c.play({ch:tLetter,col}); };
    el.onmouseenter=()=>{ clearGhost(); const r=T.landing(s,col); if(r>=0){ ghostEl=cellAt(r,col); ghostEl.classList.add('g'); ghostEl.textContent=tLetter; } }; el.onmouseleave=clearGhost; }); }
function tPositions(seed,count){ const rng=rngOf(seed), out=[], seen=new Set(); for(let t=0;t<4000&&out.length<count;t++){ let s=T.newState(); const plies=6+Math.floor(rng()*8); let ok=true; for(let k=0;k<plies&&ok;k++){ const mv=T.legal(s); s=T.apply(s,mv[Math.floor(rng()*mv.length)]); if(s.over) ok=false; } if(!ok) continue; const mv=T.legal(s); const bad=mv.filter(m=>{ const n=T.apply(s,m); return n.over&&n.winner===3-s.turn; }); const good=mv.length-bad.length; if(bad.length>=2&&good>=3){ const key=s.board.join(''); if(!seen.has(key)){ seen.add(key); out.push(s); } } } return out; }

X.register({ id:'toot', title:['TOOT','& OTTO'], blurb:'Your letter can win for them. Spell your word, but never spell theirs.', entryReady:true,
  online:()=>{ window.ZFOnlineToot && ZFOnlineToot.open(); },
  diffs:[['easy','Easy'],['medium','Medium'],['hard','Hard']], diffNote:'Easy drops at random. Medium takes a word it can complete and avoids spelling yours. Hard searches four moves ahead. None of them is a perfect solver.',
  rules:`<p>The board has <b>4 rows and 6 columns</b>. Player 1 wants to spell <b>TOOT</b>, Player 2 wants <b>OTTO</b>. Each player has six T pieces and six O pieces. On your turn, pick T or O and drop it into a column that is not full; it settles in the lowest empty cell. TOOT moves first.</p><p>Four adjacent letters (across, down or diagonally) that spell a word end the game. <b>Who dropped the letters does not matter</b>: if your move spells your opponent's word, they win. If one move spells both words, the game is a draw, and so is a full board with neither word. Undo is always available.</p><p><b>Wrong Word</b> puzzles ask for a drop that does not accidentally spell your opponent's word.</p>`,
  init:()=>T.newState(), actor:s=>s.turn, apply:(s,m)=>T.apply(s,m), legal:s=>T.legal(s), ai:(s,d)=>X.askAI('toot',s,d), hint:tHint,
  status(s,c){ if(s.over) return `<span class="who">${s.winner?`${s.words[0]} spelled: ${wins(s.winner,c)}`:'A draw'}</span>`; return `<span class="who">${c.human?'Your turn':`Computer is thinking…`}</span><span class="cond">Player ${s.turn} · wants ${s.turn===1?'TOOT':'OTTO'}</span>`; },
  render:tRender,
  result(s,c){ if(!s.winner) return {title:'A draw',detail:s.words.length?'One drop spelled both TOOT and OTTO at once.':'The board filled without either word.'}; const last=s.moves[s.moves.length-1]; return {title:`${wins(s.winner,c)}`,detail:`${s.words[0]} was spelled${last.by!==s.winner?', by the other player\'s own drop':''}. The winner is whoever the word belongs to.`}; },
  demo(host){ ZF.injectCSS(); X.css(); const mk=()=>{ let st=T.newState(); for(const [ch,col] of [['O',0],['T',1],['T',2],['T',5]]) st=T.apply(st,{ch,col}); return st; }; let st=mk(), msg='Player 1 wants TOOT. Drop an <b>O</b> in the fourth column and see what happens.';
    host.innerHTML=`<div class="gx-demo"><span class="gx-tag">Try a move</span><div class="gx-dbody" style="width:100%"></div><div class="gx-note" aria-live="polite"></div><button type="button" class="gx-btn">↺ Reset</button></div>`; const body=host.querySelector('.gx-dbody'), nt=host.querySelector('.gx-note');
    const draw=()=>{ nt.innerHTML=msg; tLetter='O'; tRender(body,st,{human:!st.over,humanIs:1,opp:'2p',opt:{},play:m=>{ st=T.apply(st,m); msg=st.over?(st.winner===2?'<b>OTTO.</b> Player 1 dropped the last letter, but the word belongs to Player 2, so Player 2 wins.':st.winner===1?'<b>TOOT.</b> Player 1 wins.':'Nothing happened yet.'):'That drop spells nothing. Use Reset and try the fourth column with an O.'; draw(); }}); };
    host.querySelector('.gx-btn').onclick=()=>{ st=mk(); msg='Player 1 wants TOOT. Drop an <b>O</b> in the fourth column and see what happens.'; draw(); }; draw(); },
  puzzleSets:[{ id:'wrong', name:'Wrong Word', kind:'move', note:'It is your move. Find a drop that does not spell your opponent\'s word.', items:(()=>{ let c; return ()=>c||(c=tPositions(60606,3).map(s=>({state:s,prompt:`Player ${s.turn} (${s.turn===1?'TOOT':'OTTO'}): pick a drop that does not hand over ${s.turn===1?'OTTO':'TOOT'}.`,
    check(m){ const n=T.apply(s,m); const bad=n.over&&n.winner===3-s.turn; return bad?{ok:false,explain:`That drop spells ${n.words[0]}, which belongs to your opponent, so they win. The highlighted letters are the word.`,reveal:{state:n}}:{ok:true,explain:`Safe. ${n.over?(n.winner===0?'It even ends the game as a draw.':'It spells your own word.'):'It spells nothing for your opponent.'} Several drops in this position would have handed the game over.`,reveal:{state:n}}; } }))); })() }] });


/* ================= Domineering ================= */
const dMemo=new Map(); function dExact(){ const memo=dMemo; const key=s=>s.C+'x'+s.cells.join('')+s.turn; const win=s=>{ if(s.over) return true; const k=key(s); if(memo.has(k)) return memo.get(k); let r=false; for(const m of D.legal(s)){ if(D.apply(s,m).over){ r=true; break; } if(!win(D.apply(s,m))){ r=true; break; } } memo.set(k,r); return r; }; return win; }
function dMob(s,me){ return D.movesFor(s,me).length-D.movesFor(s,3-me).length; }
function dSearch(s,depth,alpha,beta,me){ if(s.over) return s.winner===me?1000+depth:-1000-depth; if(depth===0) return dMob(s,me); const mv=D.legal(s); const maxing=s.turn===me; let best=maxing?-1e9:1e9; for(const m of mv){ const v=dSearch(D.apply(s,m),depth-1,alpha,beta,me); if(maxing){ if(v>best)best=v; if(best>alpha)alpha=best; } else { if(v<best)best=v; if(best<beta)beta=best; } if(alpha>=beta) break; } return best; }
function dAI(s,level){ const mv=D.legal(s), me=s.turn; if(level==='easy') return pick(mv); const empties=s.cells.filter(v=>v===0).length;
  if(level==='hard'&&empties<=14){ const win=dExact(); const good=mv.filter(m=>{ const n=D.apply(s,m); return n.over||!win(n); }); if(good.length) return pick(good); }
  const depth=level==='medium'?1:3; let best=-1e9,bl=[]; for(const m of mv){ const v=dSearch(D.apply(s,m),depth-1,-1e9,1e9,me); if(v>best){best=v;bl=[m];} else if(v===best) bl.push(m); } return pick(bl); }

const DCS=44, DPAD=10;
/* the placement a click on cell (r,c) means for the player to move: anchor there, or the neighbour that completes a legal domino */
function dHint(s){ const H=X.H, mv=D.legal(s), me=s.turn, name=me===1?'vertical':'horizontal', empties=s.cells.filter(v=>v===0).length;
  const say=m=>`Place your ${name} domino on <b>row ${m.r+1}, column ${m.c+1}</b> and the square ${me===1?'below':'to its right'}.`;
  if(empties<=25){ const win=dExact(); const good=mv.filter(m=>{ const n=D.apply(s,m); return n.over||!win(n); });
    if(good.length){ const m=pick(good); return H(m,`${say(m)} <b>Winning placement</b>: the position is solved exactly and your opponent cannot recover.`); }
    const m=dAI(s,'hard'); return H(m,`<b>No placement forces a win here.</b><br>Your opponent can win with perfect play.<!--more-->Solved exactly. The highlighted placement (row ${m.r+1}, column ${m.c+1}) is a look-ahead pick that keeps you the most room; it is not a winning move.`); }
  const m=dAI(s,'hard'); return H(m,`${say(m)} Chosen by a three-move look-ahead on how many placements each side keeps. With more than 25 free squares it is too big to solve exactly yet, so it is advice, not a proof.`); }
function dPick(s,legalSet,r,col,orientOf){ const vertical=orientOf?orientOf(s.turn)==='v':s.turn===1; const cand=vertical?[{r,c:col},{r:r-1,c:col}]:[{r,c:col},{r,c:col-1}]; return cand.find(m=>m.r>=0&&m.c>=0&&legalSet.has(m.r*s.C+m.c))||null; }
function dRender(host,s,c){ if(c.reveal&&c.reveal.state) s=c.reveal.state; const cs=DCS,pad=DPAD,W=s.C*cs+pad*2,H=s.R*cs+pad*2; const live=c.human&&!s.over&&!c.reveal;
  const orientOf=c.orientOf, vOf=p=>orientOf?orientOf(p)==='v':p===1;
  const legal=live?D.legal(s,orientOf):[]; const legalSet=new Set(legal.map(m=>m.r*s.C+m.c)); const turnVertical=vOf(s.turn), name=turnVertical?'vertical':'horizontal';
  let g=''; for(let r=0;r<s.R;r++)for(let col=0;col<s.C;col++) g+=Z.domCell(pad+col*cs,pad+r*cs,cs,s.cells[r*s.C+col]===9);
  s.moves.forEach((m,k)=>{ const a=m.cells[0], r=Math.floor(a/s.C), col=a%s.C; g+=Z.domTile(pad+col*cs,pad+r*cs,cs,m.p,k===s.moves.length-1?'zdt-new':null,vOf(m.p)); });
  const lm=s.moves[s.moves.length-1]; if(lm){ const a=lm.cells[0], r=Math.floor(a/s.C), col=a%s.C, lv=vOf(lm.p), w=lv?cs-8:2*cs-8, h=lv?2*cs-8:cs-8; g+=`<rect class="dmlast" x="${pad+col*cs+1}" y="${pad+r*cs+1}" width="${w+6}" height="${h+6}" rx="12"/>`; }
  if(s.over&&s.trap) s.trap.empties.forEach(i=>{ const r=Math.floor(i/s.C),col=i%s.C; g+=`<rect class="dmem" x="${pad+col*cs+8}" y="${pad+r*cs+8}" width="${cs-16}" height="${cs-16}" rx="6"/>`; });
  if(live&&c.hintMove){ const m=c.hintMove; g+=`<rect class="dmhint" x="${pad+m.c*cs+4}" y="${pad+m.r*cs+4}" width="${turnVertical?cs-8:2*cs-8}" height="${turnVertical?2*cs-8:cs-8}" rx="11"/>`; }
  g+=`<rect class="dmgv" id="dmGv" width="0" height="0" rx="11" style="display:none"/><g id="dmGi" style="display:none"><rect class="dmgi" width="${cs-10}" height="${cs-10}" rx="8"/><path class="dmgx" d=""/></g>`;
  if(live) for(let r=0;r<s.R;r++)for(let col=0;col<s.C;col++){ if(s.cells[r*s.C+col]!==0) continue; const ok=!!dPick(s,legalSet,r,col,orientOf); g+=`<rect class="dmhit" data-r="${r}" data-c="${col}" x="${pad+col*cs}" y="${pad+r*cs}" width="${cs}" height="${cs}" ${ok?'tabindex="0" role="button"':'tabindex="-1"'} aria-label="row ${r+1} column ${col+1}${ok?', place a '+name+' domino':', no room for a '+name+' domino'}"/>`; }
  const me=(p)=>c.opp!=='2p'&&c.humanIs===p?' (you)':'';
  const mini=(p)=>{ const v=vOf(p); return `<svg viewBox="0 0 ${v?22:44} ${v?44:22}" style="width:${v?15:30}px;height:${v?30:15}px" aria-hidden="true">${Z.domTile(-4,-4,22,p,null,v)}</svg>`; };
  const pname=(p)=>c.opp==='online'?(p===c.humanIs?'You':(c.opponentNickname||'Your friend')):c.opp==='2p'?(window.ZFName?ZFName(p):`Player ${p}`):(p===c.humanIs?'You':'The computer');
  const curP=p=>!s.over&&s.turn===p?' class="cur" aria-current="true"':'';
  host.innerHTML=`<div class="dm"><svg viewBox="0 0 ${W} ${H}" role="group" aria-label="Domineering board, ${s.R} rows by ${s.C} columns">${g}</svg></div><div class="dm-msg" id="dmMsg" aria-live="polite">${live?`Point at a square to preview your ${name} domino.`:''}</div><div class="dm-leg"><span${curP(1)}>${mini(1)}${pname(1)} · ${vOf(1)?'vertical':'horizontal'}${me(1)}</span><span${curP(2)}>${mini(2)}${pname(2)} · ${vOf(2)?'vertical':'horizontal'}${me(2)}</span></div>`;
  if(!live) return;
  const gv=host.querySelector('#dmGv'), gi=host.querySelector('#dmGi'), msg=host.querySelector('#dmMsg');
  const clear=()=>{ gv.style.display='none'; gi.style.display='none'; msg.innerHTML=`Point at a square to preview your ${name} domino.`; };
  const show=(r,col)=>{ const m=dPick(s,legalSet,r,col,orientOf); if(m){ gi.style.display='none'; const x=pad+m.c*cs+4, y=pad+m.r*cs+4; gv.setAttribute('x',x); gv.setAttribute('y',y); gv.setAttribute('width',turnVertical?cs-8:2*cs-8); gv.setAttribute('height',turnVertical?2*cs-8:cs-8); gv.style.display=''; msg.innerHTML=`<b>Click to place</b> a ${name} domino on these two squares.`; }
    else { gv.style.display='none'; const x=pad+col*cs+5, y=pad+r*cs+5; const rect=gi.querySelector('rect'); rect.setAttribute('x',x); rect.setAttribute('y',y); gi.querySelector('path').setAttribute('d',`M${x+12} ${y+12}l${cs-34} ${cs-34}m0 ${-(cs-34)}l${-(cs-34)} ${cs-34}`); gi.style.display=''; msg.innerHTML=`No room here: a ${name} domino needs two free squares ${turnVertical?'one above the other':'side by side'}.`; } };
  host.querySelectorAll('.dmhit').forEach(el=>{ const r=+el.dataset.r,col=+el.dataset.c; const go=()=>{ const m=dPick(s,legalSet,r,col,orientOf); if(m) c.play(m); };
    el.addEventListener('pointerenter',()=>show(r,col)); el.addEventListener('pointermove',()=>show(r,col)); el.addEventListener('pointerleave',clear); el.addEventListener('focus',()=>show(r,col)); el.addEventListener('blur',clear);
    el.addEventListener('click',go); el.addEventListener('keydown',e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); go(); } }); }); }
function dBoard(o){ const R=+o.rows||5, C=+o.cols||5; let holes=[]; try{ holes=JSON.parse(o.holes||'[]'); }catch(e){} return D.newState(R,C,holes.filter(i=>i<R*C)); }
function dPuzzles(seed,count){ const rng=rngOf(seed), out=[], seen=new Set(); const win=dExact(); for(let t=0;t<800&&out.length<count;t++){ let s=D.newState(4,4); const plies=3+Math.floor(rng()*3); let ok=true; for(let k=0;k<plies&&ok;k++){ const mv=D.legal(s); if(!mv.length){ ok=false; break; } s=D.apply(s,mv[Math.floor(rng()*mv.length)]); if(s.over) ok=false; } if(!ok) continue; const mv=D.legal(s); const good=mv.filter(m=>{ const n=D.apply(s,m); return n.over||!win(n); }); const key=s.cells.join('')+s.turn; if(good.length===1&&mv.length>=3&&!seen.has(key)){ seen.add(key); out.push({s,good:good[0]}); } } return out; }

X.register({ id:'domineering', title:['Domineering'], blurb:'Every domino takes two squares, and only one of you can use each gap. Run out of room and you lose.', entryReady:true,
  online:()=>{ window.ZFOnlineDomineering && ZFOnlineDomineering.open(); },
  onlineCustomize:()=>{ window.ZFOnlineDomineering && ZFOnlineDomineering.customize(); },
  // .demo is the board-size/holes editor (reused by the Customize dialog and this same entry screen's inline
  // workshop) — not a rules demo, so the "try a move" panel gets its own function instead of overloading that one.
  // Seed: one vertical domino already placed at column 0 leaves (2,0) a genuine dead end (no free cell above or
  // below it to pair with) right next to two untouched columns — dRender's own hover text explains both outcomes,
  // this just has to put a legal and an illegal option side by side without giving away which is which.
  // The practice alternates, like a real match: Player 1 places vertical dominoes, Player 2 horizontal ones. The
  // shaded centre square is blocked, so the board also shows that a domino needs two adjacent free squares.
  entryDemo(host){ ZF.injectCSS(); X.css();
    const mk=()=>D.newState(4,4,[5]);
    const turnLine=st=>`<b>Player ${st.turn}’s turn: ${st.turn===1?'vertical':'horizontal'}.</b> ${st.turn===1?'Place a domino standing up, on a square and the one below it.':'Place a domino lying flat, on a square and the one to its right.'}`;
    const startMsg=st=>`${turnLine(st)} A domino needs two empty squares next to each other, and cannot cover a piece or the crossed-out square.`;
    let st=mk(), msg=startMsg(st);
    host.innerHTML=`<div class="gx-demo"><span class="gx-tag">Try a move</span><div class="gx-dbody" style="width:100%"></div><div class="gx-note" aria-live="polite"></div><button type="button" class="gx-btn">↺ Reset</button></div>`;
    const body=host.querySelector('.gx-dbody'), nt=host.querySelector('.gx-note');
    const draw=()=>{ nt.innerHTML=msg; dRender(body,st,{ human:!st.over, humanIs:1, opp:'2p', opt:{}, play:m=>{ const by=st.turn; st=D.apply(st,m);
      if(st.over) msg=`<b>Player ${st.trap.loser} has no room for a ${st.trap.loser===1?'vertical':'horizontal'} domino, so Player ${st.winner} wins.</b> Reset to practise again.`;
      else msg=`<b>${by===1?'Vertical':'Horizontal'} placed.</b> ${turnLine(st)}`; draw(); } }); };
    host.querySelector('.gx-btn').onclick=()=>{ st=mk(); msg=startMsg(st); draw(); };
    draw();
  },
  defaults:{rows:'5',cols:'5',holes:'[]'}, options:[{key:'rows',label:'Rows',values:[['4','4'],['5','5'],['6','6'],['7','7']]},{key:'cols',label:'Columns',values:[['4','4'],['5','5'],['6','6'],['7','7']]}],
  diffs:[['easy','Easy'],['medium','Medium'],['hard','Hard']], diffNote:'Easy plays at random. Medium looks one move ahead at how many placements each side keeps. Hard looks three moves ahead, and solves the position exactly once 14 or fewer squares are empty. It is not exact on the opening of large boards, and custom boards are exploratory.',
  rules:`<p>Player 1 places only <b>vertical</b> dominoes (two squares stacked), Player 2 only <b>horizontal</b> dominoes (two squares side by side). Each turn places exactly one domino on two free squares; pieces cannot overlap, leave the board, or cover holes. <b>If you cannot place a domino on your turn, you lose</b>, even if free squares remain. The board does not need to be full.</p><p>Point at a square to preview the two squares your domino would cover; a muted outline means no domino of yours fits there. The Board Workshop lets you choose a size and paint holes to make corridors and uneven shapes. <b>Last Space</b> puzzles have exactly one winning placement; the engine solves each position exactly.</p>`,
  init:o=>dBoard(o), actor:s=>s.turn, apply:(s,m)=>D.apply(s,m), legal:s=>D.legal(s), ai:dAI, hint:dHint,
  canStart(o){ const s=dBoard(o); const free=s.cells.filter(v=>v===0).length; if(free<4) return 'Leave at least four free squares.'; if(!D.movesFor(s,1).length) return 'Vertical would have no legal placement at the start, and would lose at once. Remove a hole so two free squares sit one above the other.'; if(!D.movesFor(s,2).length) return 'Horizontal would have no legal placement at the start, and would lose at once. Remove a hole so two free squares sit side by side.'; return ''; },
  status(s,c){ const vOf=p=>c.orientOf?c.orientOf(p)==='v':p===1; if(s.over) return `<span class="who">${wins(s.winner,c)}: ${who(s.trap.loser,c)} had no ${vOf(s.trap.loser)?'vertical':'horizontal'} placement</span>`;
    // c.human is also false while busy/disconnected — that's not the same thing as whose turn it logically is, and
    // conflating them showed "{opponent}'s turn" during a disconnect even on the local player's own turn.
    const mine=s.turn===c.humanIs;
    return `<span class="who">${c.opp==='online'?(mine?'Your turn':`${(c.opponentNickname||'Your friend')}’s turn`):(c.human?'Your turn':`Computer is thinking…`)}</span><span class="cond">${vOf(s.turn)?'vertical dominoes':'horizontal dominoes'}</span>`; },
  render:dRender,
  result(s,c){ const vOf=p=>c.orientOf?c.orientOf(p)==='v':p===1; return {title:`${wins(s.winner,c)}`,detail:`${s.trap.empties.length} free square${s.trap.empties.length===1?'':'s'} remain (dashed), but none fit a ${vOf(s.trap.loser)?'vertical':'horizontal'} domino. Free space is not enough: it has to be the right shape.`}; },
  demo(host,o){ ZF.injectCSS(); X.css(); const cur=()=>({R:+o.rows||5,C:+o.cols||5}); let holes; try{ holes=new Set(JSON.parse(o.holes||'[]')); }catch(e){ holes=new Set(); } let note='';
    const save=()=>{ o.holes=JSON.stringify([...holes]); if(window.ZFX&&ZFX.refresh) ZFX.refresh(); };
    const resize=(newR,newC)=>{ const {R,C}=cur(); newR=Math.max(2,Math.min(12,newR||R)); newC=Math.max(2,Math.min(12,newC||C)); if(newR===R&&newC===C){ draw(); return; }
      const pts=[...holes].map(i=>[Math.floor(i/C),i%C]); const kept=pts.filter(([r,c])=>r<newR&&c<newC); const cut=pts.length-kept.length;
      holes=new Set(kept.map(([r,c])=>r*newC+c)); o.rows=String(newR); o.cols=String(newC);
      note=cut?`${cut} blocked cell${cut===1?'':'s'} outside the new size ${cut===1?'was':'were'} removed.`:''; save(); draw(); };
    const draw=()=>{ const {R,C}=cur(); const cs=DCS,pad=DPAD; let g=''; for(let r=0;r<R;r++)for(let c=0;c<C;c++){ const i=r*C+c; g+=Z.domCell(pad+c*cs,pad+r*cs,cs,holes.has(i))+`<rect class="dmws dmhit" data-i="${i}" x="${pad+c*cs}" y="${pad+r*cs}" width="${cs}" height="${cs}" tabindex="0" role="button" aria-pressed="${holes.has(i)}" aria-label="row ${r+1} column ${c+1}, ${holes.has(i)?'hole':'free'}"/>`; }
      const st=dBoard({rows:R,cols:C,holes:JSON.stringify([...holes])}), v=D.movesFor(st,1).length, h=D.movesFor(st,2).length, free=st.cells.filter(x=>x===0).length;
      const warn=!v?'Vertical would have no legal opening placement here — it would lose immediately.':(!h?'Horizontal would have no legal opening placement here — it would lose immediately.':'');
      const bal=domBalance(v,h);
      host.innerHTML=`<div class="gx-demo"><span class="gx-tag">Board workshop</span>
        <div class="dm-dims"><label>Rows<button type="button" class="dm-step" data-a="r-">−</button><input type="number" class="dm-rows-in" min="2" max="12" value="${R}" aria-label="Rows"><button type="button" class="dm-step" data-a="r+">+</button></label><span class="x">×</span><label>Columns<button type="button" class="dm-step" data-a="c-">−</button><input type="number" class="dm-cols-in" min="2" max="12" value="${C}" aria-label="Columns"><button type="button" class="dm-step" data-a="c+">+</button></label></div>
        <div class="dm" style="width:min(100%,460px)"><svg viewBox="0 0 ${C*cs+pad*2} ${R*cs+pad*2}">${g}</svg></div>
        <div class="gx-note">Click a square to block or restore it. Holes are blocked for both players.</div>
        <div class="dm-count">${free} free squares · vertical has ${v} opening placement${v===1?'':'s'} · horizontal has ${h}</div>
        <div class="dm-balance ${bal.cls}"><span class="lbl" title="${DOM_BALANCE_TIP}">${bal.label}</span><button type="button" class="dm-why" aria-label="Why this estimate?" aria-expanded="false">?</button></div>
        <div class="dm-tip" role="note">${DOM_BALANCE_TIP}</div>
        ${warn?`<div class="dm-warn">${warn}</div>`:(note?`<div class="dm-warn">${note}</div>`:'')}
        <div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:center"><button class="gx-btn" data-p="clear">Clear blocked cells</button><button class="gx-btn" data-p="center">Centre hole</button><button class="gx-btn" data-p="corners">Corner holes</button><button class="gx-btn" data-p="pillars">Pillars</button></div></div>`;
      host.querySelectorAll('.dmws').forEach(el=>{ const t=()=>{ const i=+el.dataset.i; holes.has(i)?holes.delete(i):holes.add(i); note=''; save(); draw(); }; el.addEventListener('click',t); el.addEventListener('keydown',e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); t(); } }); });
      host.querySelectorAll('[data-p]').forEach(b=>b.onclick=()=>{ holes=new Set(); const p=b.dataset.p; for(let r=0;r<R;r++)for(let c=0;c<C;c++){ const i=r*C+c; if(p==='center'&&r===Math.floor(R/2)&&c===Math.floor(C/2)) holes.add(i); if(p==='corners'&&(r===0||r===R-1)&&(c===0||c===C-1)) holes.add(i); if(p==='pillars'&&r%2===1&&c%2===1) holes.add(i); } note=''; save(); draw(); });
      host.querySelectorAll('.dm-step').forEach(b=>b.onclick=()=>{ const a=b.dataset.a; if(a==='r-') resize(R-1,C); else if(a==='r+') resize(R+1,C); else if(a==='c-') resize(R,C-1); else resize(R,C+1); });
      host.querySelector('.dm-rows-in').onchange=e=>resize(parseInt(e.target.value),C);
      host.querySelector('.dm-cols-in').onchange=e=>resize(R,parseInt(e.target.value));
      host.querySelector('.dm-why').onclick=e=>{ const tip=host.querySelector('.dm-tip'), on=!tip.classList.contains('show'); tip.classList.toggle('show',on); e.target.setAttribute('aria-expanded',String(on)); }; };
    draw(); },
  onOption(o,demo){ o.holes='[]'; this.demo(demo,o); },
  puzzleSets:[{ id:'last', name:'Last Space', kind:'move', note:'A small board, one winning placement. The engine has solved each position.', items:(()=>{ let c; return ()=>c||(c=dPuzzles(1234,3).map(o=>({state:o.s,prompt:`Player ${o.s.turn} (${o.s.turn===1?'vertical':'horizontal'}) to move: which placement wins?`,
    check(m){ const ok=m.r===o.good.r&&m.c===o.good.c; return ok?{ok:true,explain:'Yes. After that placement the opponent cannot win with any reply, and it is the only placement that does. The dashed squares show where the game ended if it is played out.',reveal:{state:D.apply(o.s,m)}}:{ok:false,explain:'That placement lets your opponent win. Exactly one placement wins here; try to count how many placements each side keeps.',reveal:{state:D.apply(o.s,m)}}; } }))); })() }] });


/* ================= Notakto ================= */
function nHint(s){ const H=X.H, mv=N.legal(s), open=s.closed.filter(x=>!x).length, pk=a=>a[Math.floor(Math.random()*a.length)];
  const say=m=>`Place an X on <b>board ${m.b+1}, row ${Math.floor(m.c/3)+1}, column ${m.c%3+1}</b>.`;
  const closes=m=>N.hasLine(s.boards[m.b]|(1<<m.c)), closesLast=m=>closes(m)&&open===1;
  if(open<=3||s.boards.length<=3){ const pm=N.perfectMoves(s);
    if(pm.length){ const m=pk(pm); return H(m,`${say(m)} <b>Winning move</b>: an exact solver checked every reply.${closes(m)?' It closes that board, which is legal and good here.':''}`); }
    const ok=mv.filter(m=>!closesLast(m)); if(ok.length){ const m=pk(ok); return H(m,`${say(m)} <b>No winning move exists.</b> Against best play this position is lost; this move does not close the last board, so it keeps the game going.`); }
    const m=pk(mv); return H(m,`${say(m)} <b>Every move closes the last open board, so you lose.</b> The hint can only show a legal cell.`); }
  const m=nAI(s,'hard'); return H(m,`${say(m)} A heuristic suggestion: it avoids closing the last board. With ${open} boards open the exact solver is not run, so this is advice, not a proof.`); }
function nkRender(host,s,c){ if(c.reveal&&c.reveal.state) s=c.reveal.state; const open=s.closed.filter(x=>!x).length; const cs=34,pad=4; const canPlay=c.human&&!s.over;
  let html=`<div class="nk-count" aria-live="polite">${s.over?'All boards closed':`${open} board${open===1?'':'s'} remain`}</div><div class="nk">`;
  s.boards.forEach((m,b)=>{ let g=`<rect class="fr" x="${pad}" y="${pad}" width="${cs*3}" height="${cs*3}" rx="10"/>`; for(let cell=0;cell<9;cell++){ const x=pad+(cell%3)*cs,y=pad+Math.floor(cell/3)*cs, has=m&(1<<cell); const ok=canPlay&&!s.closed[b]&&!has; const isH=ok&&c.hintMove&&c.hintMove.b===b&&c.hintMove.c===cell; if(isH) g+=`<rect class="hintc" x="${x+2}" y="${y+2}" width="${cs-4}" height="${cs-4}" rx="6"/><path class="x xg" d="M${x+9} ${y+9}L${x+cs-9} ${y+cs-9}M${x+cs-9} ${y+9}L${x+9} ${y+cs-9}" style="pointer-events:none"/>`; g+=`<rect class="c" data-b="${b}" data-c="${cell}" x="${x+2}" y="${y+2}" width="${cs-4}" height="${cs-4}" rx="6" ${ok?'tabindex="0" role="button"':'style="pointer-events:none"'} aria-label="board ${b+1} row ${Math.floor(cell/3)+1} column ${cell%3+1}"/>`; if(has) g+=`<path class="x" d="M${x+9} ${y+9}L${x+cs-9} ${y+cs-9}M${x+cs-9} ${y+9}L${x+9} ${y+cs-9}" style="pointer-events:none"/>`; }
    const lineMask=s.closed[b]?N.lineIn(m):0; if(lineMask){ const cells=[...Array(9).keys()].filter(i=>lineMask&(1<<i)); const a=cells[0],z=cells[2]; g+=`<line class="line" x1="${pad+(a%3)*cs+cs/2}" y1="${pad+Math.floor(a/3)*cs+cs/2}" x2="${pad+(z%3)*cs+cs/2}" y2="${pad+Math.floor(z/3)*cs+cs/2}" opacity=".6"/>`; }
    const last=s.over&&s.lastLine&&s.lastLine.b===b; html+=`<div class="nk-b${s.closed[b]?' closed':''}${last?' last':''}"><svg viewBox="0 0 ${cs*3+pad*2} ${cs*3+pad*2}" role="group" aria-label="board ${b+1}${s.closed[b]?' (closed)':''}">${g}</svg></div>`; });
  html+='</div>'; host.innerHTML=html;
  host.querySelectorAll('.c[tabindex]').forEach(el=>{ const act=()=>c.play({b:+el.dataset.b,c:+el.dataset.c}); el.onclick=act; el.onkeydown=e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); act(); } }; }); }
function nAI(s,level){ const mv=N.legal(s); const open=s.closed.filter(x=>!x).length; const opts=[];
  const exact=(level==='perfect'&&s.boards.length<=3)||(level==='hard'&&open<=3);
  if(exact){ const pm=N.perfectMoves(s); if(pm.length) return pick(pm); }
  if(level==='easy') return pick(mv);
  const closes=m=>N.hasLine(s.boards[m.b]|(1<<m.c)); const nonClosing=mv.filter(m=>!closes(m)); const final=m=>closes(m)&&open===1;
  const notFinal=mv.filter(m=>!final(m)); const pool=notFinal.length?notFinal:mv;
  if(level==='medium') return pick(pool);
  const safeShort=pool.filter(m=>{ const n=N.apply(s,m); return n.over||N.legal(n).some(x=>!final2(n,x)); }); return pick(safeShort.length?safeShort:pool);
  function final2(n,x){ const o=n.closed.filter(v=>!v).length; return N.hasLine(n.boards[x.b]|(1<<x.c))&&o===1; } }
function nPositions(seed,count){ const rng=rngOf(seed), out=[], seen=new Set(); for(let t=0;t<2000&&out.length<count;t++){ let s=N.newState(3); const plies=4+Math.floor(rng()*5); let ok=true; for(let k=0;k<plies&&ok;k++){ const mv=N.legal(s); s=N.apply(s,mv[Math.floor(rng()*mv.length)]); if(s.over) ok=false; } if(!ok) continue; const pm=N.perfectMoves(s), mv=N.legal(s); if(pm.length>=1&&pm.length<=3&&mv.length-pm.length>=6){ const key=s.boards.join(',')+s.closed.join(''); if(!seen.has(key)){ seen.add(key); out.push({s,pm}); } } } return out; }
X.register({ id:'notakto', title:['Notakto'], blurb:'We both play X. The last line loses. Close the final open board and you lose.', entryReady:true,
  online:()=>{ window.ZFOnlineNotakto && ZFOnlineNotakto.open(); }, onlineCustomize:()=>{ window.ZFOnlineNotakto && ZFOnlineNotakto.customize(); },
  defaults:{boards:'3'}, options:[{key:'boards',label:'Boards',values:[['3','Three'],['5','Five'],['7','Seven']]}],
  diffsFor:o=>(o.boards==='3')?[['easy','Easy'],['medium','Medium'],['hard','Hard'],['perfect','Perfect']]:[['easy','Easy'],['medium','Medium'],['hard','Hard']],
  diffNoteFor:o=>o.boards!=='3'?`${o.boards} boards: solving the whole game exactly takes too long while this many boards are open, so Perfect is not offered. Hard plays exactly once three or fewer boards remain open, and uses fast heuristics before that — it stays responsive at every board count.`:'Easy plays at random. Medium never closes the last board unless forced. Hard also plays exactly in the endgame. Perfect is an exact solver over all symmetric board positions (checked against brute force on smaller cases).',
  rules:`<p>Start with one, three or five 3×3 boards. <b>Both players place X</b> on an empty cell of any open board. When a move completes three Xs in a row, column or diagonal, that board <b>closes</b> and takes no more moves. Closing an earlier board is legal and can be smart. <b>The player who closes the last open board loses.</b></p><p>Because every mark is an X, the interface shows whose turn it is instead of giving marks owners. Undo is always available.</p><p><b>Close This or Leave It?</b> puzzles ask for the move that wins by exact analysis.</p>`,
  init:o=>N.newState(+o.boards||3), actor:s=>s.turn, apply:(s,m)=>N.apply(s,m), legal:s=>N.legal(s),
  /* exact while three or fewer boards are open (the same bound the solver uses for hints) */
  judge:(s,m,n)=>{ if(!window.ZFCoach||N.openList(s).length>3) return undefined; const mover=s.turn, L=N.legal(s); if(n.over) return null;
    const vb=N.moverWins(N.openList(s))?1:-1, va=N.moverWins(N.openList(n))?-1:1, good=N.perfectMoves(s).length;
    return ZFCoach.exact({before:vb,after:va,good,total:L.length}); }, ai:(s,d)=>X.askAI('notakto',s,d), hint:nHint,
  status(s,c){ if(s.over) return `<span class="who">${who(s.loser,c)} closed the last board</span>`; return `<span class="who">${c.human?'Your turn':`Computer is thinking…`}</span><span class="cond">${c.opp==='2p'?`${window.ZFName?ZFName(s.turn):'Player '+(s.turn)} places an X`:'everyone plays X'}</span>`; },
  render:nkRender, diffLabel:o=>o.diff,
  result(s,c){ return {title:`${wins(s.winner,c)}`,detail:`${who(s.loser,c)} completed the last open line, so ${s.loser===c.humanIs&&c.opp==='ai'?'you lose':'that player loses'}. The highlighted line is the last one.`}; },
  demo(host){ ZF.injectCSS(); X.css(); const mk=()=>{ let st=N.newState(3); const seq=[[1,4],[1,8],[1,7],[2,8],[0,6],[0,2],[0,1]]; for(const [b,c] of seq) st=N.apply(st,{b,c}); return st; };
    let st=mk(), msg='Two boards are one X from closing. Go ahead and close one: <b>closing early is legal</b>. Only the last board loses.';
    host.innerHTML=`<div class="gx-demo"><span class="gx-tag">Try a move</span><div class="gx-dbody" style="width:100%"></div><div class="gx-note" aria-live="polite"></div><button type="button" class="gx-btn">↺ Reset</button></div>`; const body=host.querySelector('.gx-dbody'), nt=host.querySelector('.gx-note');
    const draw=()=>{ nt.innerHTML=msg; nkRender(body,st,{human:!st.over,opp:'2p',play:m=>{ const before=st.closed.filter(x=>!x).length; st=N.apply(st,m); const after=st.closed.filter(x=>!x).length; msg=st.over?'<b>That closed the last board, so that player loses.</b>':(after<before?`<b>A board closed.</b> ${after} remain. Keep an eye on who will have to close the last one.`:'Placed. Try completing a line.'); draw(); }}); };
    host.querySelector('.gx-btn').onclick=()=>{ st=mk(); msg='Two boards are one X from closing. Go ahead and close one: <b>closing early is legal</b>. Only the last board loses.'; draw(); }; draw(); },
  puzzleSets:[{ id:'close', name:'Close This or Leave It?', kind:'move', note:'Three boards are in play. Find a move that wins with best play.', items:(()=>{ let c; return ()=>c||(c=nPositions(5150,3).map(o=>({state:o.s,prompt:'Which move wins with best play?',
    check(m){ const ok=o.pm.some(x=>x.b===m.b&&x.c===m.c); const closes=N.hasLine(o.s.boards[m.b]|(1<<m.c)); return ok?{ok:true,explain:closes?'That move closes a board, and it is the right one: it leaves your opponent in a position they cannot win.':'Yes. It closes nothing, and still leaves your opponent in a lost position.',reveal:{state:N.apply(o.s,m)}}:{ok:false,explain:closes?'Closing that board hands your opponent a winning position.':'That move leaves your opponent a winning reply. The exact solver found only '+o.pm.length+' good move'+(o.pm.length===1?'':'s')+'.',reveal:{state:N.apply(o.s,m)}}; } }))); })() }] });

/* ================= The Crowded Room (original; inspired by the El Farol bar problem) ================= */
const TYPES={ repeater:{name:'Repeater',rule:'Goes if last night was comfortable (at or under capacity), stays home if it was crowded.'}, contrarian:{name:'Contrarian',rule:'Expects a reversal: goes if last night was crowded, stays home if it was comfortable.'}, averager:{name:'Averager',rule:'Goes if the average of the last three nights was at or under capacity.'}, follower:{name:'Copycat',rule:'Copies what last night’s highest-scoring guest did.'}, wanderer:{name:'Wanderer',rule:'Flips a coin every night.'} };
const MIXES={ balanced:{repeater:7,contrarian:6,averager:6,follower:5,wanderer:5}, copycat:{repeater:8,contrarian:2,averager:3,follower:14,wanderer:2}, reversal:{repeater:3,contrarian:14,averager:6,follower:3,wanderer:3} };
const NGUESTS=29;
function crowdMake(o){ const seed=o.seed||Math.floor(Math.random()*1e9); const cap=+o.cap||18; const mix=o.mixObj||MIXES[o.mix]||MIXES.balanced; const rng=rngOf(seed); const guests=[]; for(const [t,k] of Object.entries(mix)) for(let i=0;i<k;i++) guests.push({type:t}); while(guests.length<NGUESTS) guests.push({type:'wanderer'}); guests.length=NGUESTS; for(let i=guests.length-1;i>0;i--){ const j=Math.floor(rng()*(i+1)); [guests[i],guests[j]]=[guests[j],guests[i]]; } guests.forEach((g,i)=>{ g.id=i+1; });
  const nightRng=k=>rngOf(seed*7919+k*104729+13); return {seed,cap,guests,nightRng}; }
function crowdRun(cfg,choices){ const {cap,guests}=cfg; const hist=[]; const scores=guests.map(()=>0); let me=0; const nights=[]; let last=guests.map(()=>null);
  choices.forEach((choice,k)=>{ const r=cfg.nightRng(k); const acts=guests.map((g,i)=>{ const coin=r(); if(k===0) return coin<.5; const prev=hist[k-1]; const a3=hist.slice(-3); const avg=a3.reduce((x,y)=>x+y,0)/a3.length;
      if(g.type==='repeater') return prev<=cap; if(g.type==='contrarian') return prev>cap; if(g.type==='averager') return avg<=cap; if(g.type==='wanderer') return coin<.5;
      if(g.type==='follower'){ let best=0; scores.forEach((s,j)=>{ if(s>scores[best]) best=j; }); return last[best]===true; } return false; });
    const att=acts.filter(Boolean).length+(choice?1:0); const comfy=att<=cap; guests.forEach((g,i)=>{ scores[i]+=acts[i]?(comfy?3:-2):1; }); const gain=choice?(comfy?3:-2):1; me+=gain; hist.push(att); last=acts; nights.push({acts,att,choice,gain,comfy,total:me}); });
  return {nights,hist,me,scores}; }
const sentence=(att,cap,go)=>go?(att<=cap?`${att} people came, so there was a place for you: +3.`:`${att} people came for ${cap} places, so the night was spoiled for you: −2.`):(att<=cap?`Only ${att} others came, so you missed a good night: +1.`:`${att} others came for ${cap} places: staying home was the safe choice, +1.`);
/* the scene: a room with one seat per place, a door, and everyone else outside. Before the reveal everyone is outside deciding. */
function crowdScene(o){ const {cap,acts,meIn,revealed,sel,fresh,n}=o; const X0=26,Y0=6,W=204; const {markup,L}=Z.crowdRoom(cap,X0,Y0,W,{cols:6,crowded:revealed&&o.att>cap}); let g=markup;
  const inside=[]; if(revealed) acts.forEach((a,i)=>{ if(a) inside.push(i); }); const total=inside.length+(revealed&&meIn?1:0);
  const slot=k=>k<cap?L.seat(k):L.stand(k-cap);
  inside.forEach((gi,k)=>{ const [x,y]=slot(k); g+=`<g ${fresh?`class="arr" style="--i:${k}"`:''}><g class="crp${sel===gi?' sel':''}" data-i="${gi}" tabindex="0" role="button" aria-label="guest ${gi+1}">${Z.person(x,y+1,.8)}<circle class="hit" cx="${x}" cy="${y}" r="11" fill="transparent"/></g></g>`; });
  if(revealed&&meIn){ const [x,y]=slot(inside.length); g+=`<g ${fresh?`class="arr" style="--i:${inside.length}"`:''}>${Z.person(x,y+1,.95)}<circle class="youring" cx="${x}" cy="${y}" r="13"/></g>`; }
  const outY=Y0+L.h+48; let k=0;
  g+=`<text x="20" y="${outY-17}" font-size="8.5" font-weight="700" letter-spacing=".08em" fill="currentColor" opacity=".6" font-family="var(--font-mono)">${revealed?'STAYED HOME':'OTHERS DECIDING'}</text>`;
  for(let i=0;i<n;i++){ if(revealed&&acts[i]) continue; const x=20+(k%15)*15.5, y=outY+Math.floor(k/15)*22; k++; g+=`<g class="crp${revealed?' dim':''}${sel===i?' sel':''}" data-i="${i}" tabindex="0" role="button" aria-label="guest ${i+1}${revealed?', stayed home':''}">${Z.person(x,y,.75)}<circle class="hit" cx="${x}" cy="${y}" r="9" fill="transparent"/></g>`; }
  if(!revealed||!meIn){ const mx=Z.crowdLayout(cap,X0,Y0,W,6).door.x, my=revealed?outY+50:Y0+L.h+14; g+=`<g>${Z.person(mx,my,1.1)}<circle class="youring" cx="${mx}" cy="${my}" r="15"/></g>`; }
  const H=Math.max(outY+Math.ceil(Math.max(k,1)/15)*22+30,(revealed&&!meIn)?outY+50+26:0);
  return {svg:`<svg viewBox="0 0 256 ${H}" role="group" aria-label="The room with ${cap} places, its door, and the guests">${g}</svg>`,total}; }
const faceSVG=(happy)=>`<svg viewBox="-16 -16 32 32" aria-hidden="true">${Z.face(0,0,13,happy)}</svg>`;
function countUp(el,to,ms){ if(!el) return; let v=0; const step=Math.max(1,Math.ceil(to/14)); const tick=()=>{ v=Math.min(to,v+step); el.textContent=v; if(v<to) setTimeout(tick,ms/14); }; el.textContent=0; setTimeout(tick,60); setTimeout(()=>{ el.textContent=to; },ms+250); }

const INTRO=[
  {others:12, ask:'There are 18 places. Do you go tonight, or stay home?', prev:null},
  {others:19, ask:null, prev:1},
  {others:9,  ask:null, prev:2} ];

X.register({ id:'crowd', title:['The Crowded','Room'], blurb:'One decision: go out tonight, or stay home? The room only has 18 places, and everyone else is deciding too.', noHints:true, firstChoice:false, startLabel:'Open the doors', entryReady:true, optsInline:true,
  defaults:{cap:'18',mix:'balanced',rumor:'off',intro:'guided'}, options:[{key:'cap',label:'Places',values:[['12','12'],['15','15'],['18','18'],['21','21']]},{key:'mix',label:'Guests',values:[['balanced','Mixed'],['copycat','Copycat City'],['reversal','Contrarians'],['build','Build the Crowd']]},{key:'rumor',label:'Rumor',values:[['off','Off'],['on','Private Rumor']]},{key:'intro',label:'Guide',values:[['guided','Guided first nights'],['skip','Skip the guide']]}],
  diffs:[['normal','Normal']],
  rules:`<p><b>Inspired by</b> Brian Arthur's <a href="https://sites.santafe.edu/arthur/" target="_blank" rel="noopener">El Farol problem</a>. The rules and scoring below are this site's own design.</p><p>You and 29 other guests decide, at the same time, whether to <b>go out</b> to a room with a limited number of places (18 by default). If you go and the room holds no more than its places: <b>+3</b>. If you go and it is over: <b>−2</b>. Stay home: <b>+1</b> either way. You play 12 nights and the highest total wins. The first three nights are a guided example.</p><p>The other guests follow simple rules you can inspect after each night (Repeater, Contrarian, Averager, Copycat, Wanderer). Their choices are hidden until you decide. Each run has a seed, so it can be replayed. <b>Private Rumor</b> gives you a noisy tip about tonight's crowd. <b>Copycat City</b> fills the city with people who copy the winners. <b>Build the Crowd</b> lets you choose how many of each kind of guest there are. Undo takes back the last night.</p>`,
  // A single illustrative night, playable right on the entry screen, using the real room scene and the real payoff
  // numbers (+3 comfortable / −2 over capacity / +1 home) -- not generic text. The full "guided first nights"
  // sequence still runs after Start (see custom() below); this is a lighter, immediate taste of the same choice,
  // at whatever capacity the Places setting currently has, so changing that setting changes what's on screen here.
  entryDemo(host,o){ ZF.injectCSS(); X.css(); const cap=+o.cap||18;
    let done=false, myGo=null;
    const others=cap+1; // one over capacity, so Go and Stay Home visibly differ
    const draw=()=>{
      const meIn=!!(done&&myGo), att=others+(myGo?1:0);
      const acts=Array.from({length:NGUESTS},(_,i)=>i<others);
      const sc=crowdScene({cap,acts,meIn,revealed:done,n:NGUESTS,att,fresh:done});
      const msg=!done?`Tonight's room holds <b>${cap} place${cap===1?'':'s'}</b>. Go if you think it will be quiet, stay home if you think it will be full — everyone else is deciding the same thing, right now.`
        :(myGo?(att<=cap?`<b>You went, and there was room.</b> ${att} came for ${cap} places: +3.`:`<b>You went, and it was over capacity.</b> ${att} came for ${cap} places: −2.`)
              :(others<=cap?`<b>You stayed home</b> — it turned out quiet. Staying home always pays +1, whatever happens.`:`<b>You stayed home</b> — good call, it was packed. +1.`));
      host.innerHTML=`<div class="gx-demo"><span class="gx-tag">Try tonight</span><div class="cr-scene">${sc.svg}</div><div class="gx-note" style="max-width:46ch">${msg}</div>${done?'<button type="button" class="gx-btn" id="crDemoAgain">↺ Try another night</button>':'<div style="display:flex;gap:10px;justify-content:center;margin-top:8px"><button type="button" id="crDemoGo" class="gx-btn">Go tonight</button><button type="button" id="crDemoStay" class="gx-btn">Stay home</button></div>'}</div>`;
      if(!done){ host.querySelector('#crDemoGo').onclick=()=>{ myGo=true; done=true; draw(); }; host.querySelector('#crDemoStay').onclick=()=>{ myGo=false; done=true; draw(); }; }
      else host.querySelector('#crDemoAgain').onclick=()=>{ done=false; myGo=null; draw(); };
    };
    draw();
  },
  custom(M,el,o){ let seed=o.seedNext||Math.floor(Math.random()*1e9); o.seedNext=undefined; const cap=+o.cap||18;
    let stage=(o.intro==='skip')?(o.mix==='build'?'build':'play'):'intro'; let introN=0; const introRes=[]; let choices=[], sel=-1, fresh=false, guess=12, guesses=[]; let cfg=null; let mixObj=Object.assign({},MIXES.balanced);
    const $c=id=>document.getElementById(id);
    const begin=()=>{ cfg=crowdMake({...o,seed,mixObj:o.mix==='build'?mixObj:null}); stage='play'; choices=[]; guesses=[]; sel=-1; fresh=false; resultView=false; draw(); };
    const introScene=(k,revealed,go)=>{ const others=INTRO[k].others; const acts=Array.from({length:NGUESTS},(_,i)=>i<others); return crowdScene({cap:18,acts,meIn:!!go,revealed,n:NGUESTS,att:others+(go?1:0),fresh:true}); };
    const draw=()=>{
      el.result.classList.remove('show'); el.undo.disabled=true; el.undo.style.display=''; el.restart.style.display='';
      el.restart.onclick=()=>{ o.seedNext=seed; M.def.custom(M,el,o); };
      if(stage==='intro') return drawIntro(); if(stage==='bridge') return drawBridge(); if(stage==='build') return drawBuild(); return drawPlay(); };
    function drawIntro(){ const k=introN, prevs=introRes; const R=introRes[k]; const spec=INTRO[k];
      const ask=k===0?spec.ask:(k===1?`Last night ${prevs[0].att} people came, so the room was quiet. Do you go tonight?`:`Last night ${prevs[1].att} people came for 18 places, so it was crowded. Do you go tonight?`);
      el.status.innerHTML=`<span class="who">Guided night ${k+1} of 3</span><span class="cond">practice, not scored</span>`;
      const sc=introScene(k,!!R,R&&R.go); const cnt=R?`<div class="cr-count"><span class="n" id="crN">${R.att}</span><span class="of">came · 18 places</span>${faceSVG(R.att<=18)}</div>`:`<div class="cr-count"><span class="n">18</span><span class="of">places tonight</span></div>`;
      el.board.innerHTML=`<div class="cr">${cnt}<div class="cr-scene">${sc.svg}</div>${R?`<div class="cr-lines" aria-live="polite"><div>${R.go?'You went.':'You stayed home.'}</div><div>${R.att} people arrived for 18 places.</div><div><b>${R.go?(R.att<=18?'There was a place for you: +3 points.':'Too crowded: −2 points.'):(R.att<=18?'You missed a good night: +1 point.':'You avoided a crowded room: +1 point.')}</b></div></div>`:`<div class="cr-say" aria-live="polite">${ask}</div>`}${R?`<div class="cr-say soft">${k<2?(k===0?'Everyone else is about to see this number too.':'Now look at what happens when a crowded night is followed by tonight’s decision.'):''}</div><div class="cr-choose"><button class="go" id="crNext">${k<2?'Next night':'What just happened?'}</button></div>`:`<div class="cr-choose"><button class="go" id="crGo">Go tonight</button><button id="crStay">Stay home</button></div><div class="cr-say soft">You get +3 if the room has room, −2 if it is over its places, +1 if you stay home.</div>`}</div>`;
      if(R) countUp($c('crN'),R.att,900);
      const pickIt=go=>{ const att=spec.others+(go?1:0); introRes[k]={go,att}; draw(); };
      if(!R){ $c('crGo').onclick=()=>pickIt(true); $c('crStay').onclick=()=>pickIt(false); }
      else $c('crNext').onclick=()=>{ if(k<2){ introN++; } else stage='bridge'; draw(); }; }
    function drawBridge(){ const [a,b,cN]=introRes; el.status.innerHTML='<span class="who">What just happened</span>';
      el.board.innerHTML=`<div class="cr"><div class="cr-count"><span class="n" style="font-size:40px">${a.att} → ${b.att} → ${cN.att}</span></div><div class="cr-say">Night 1 was quiet, so almost everyone decided to go on night 2, and the room was packed. Night 2 was packed, so almost everyone stayed home on night 3.<br><br><b>When everyone reacts to yesterday, yesterday stops being a good guide to tomorrow.</b></div><div class="cr-say soft">From here you play 12 real nights against 29 other guests who each follow a rule of their own. You can inspect those rules after every night.</div><div class="cr-choose"><button class="go" id="crBegin">${o.mix==='build'?'Build the crowd':'Play the 12 nights'}</button></div></div>`;
      $c('crBegin').onclick=()=>{ setPref('crowd','intro','skip'); o.intro='skip'; stage=(o.mix==='build')?'build':'play'; if(stage==='play') begin(); else draw(); }; }
    function drawBuild(){ const keys=Object.keys(TYPES); const total=keys.reduce((s,k)=>s+mixObj[k],0); el.status.innerHTML='<span class="who">Build the Crowd</span><span class="cond">choose 29 guests</span>';
      el.board.innerHTML=`<div class="cr"><div class="cr-say">Choose what kind of guests fill the city. Then see whether you can still read the crowd.</div><div class="cr-build">${keys.map(k=>`<div class="t">${TYPES[k].name}<small>${TYPES[k].rule}</small></div><div class="cr-guess"><button data-k="${k}" data-d="-1" aria-label="fewer ${TYPES[k].name}">−</button><b>${mixObj[k]}</b><button data-k="${k}" data-d="1" aria-label="more ${TYPES[k].name}">+</button></div>`).join('')}</div><div class="cr-hud"><span>Guests <b>${total}</b> of ${NGUESTS}</span></div><div class="cr-choose"><button class="go" id="crBuildGo" ${total===NGUESTS?'':'disabled'}>Open the doors</button></div></div>`;
      el.board.querySelectorAll('.cr-guess button').forEach(b=>b.onclick=()=>{ const k=b.dataset.k, d=+b.dataset.d; const nv=mixObj[k]+d; const tot=keys.reduce((s,x)=>s+mixObj[x],0)+d; if(nv>=0&&tot<=NGUESTS){ mixObj[k]=nv; draw(); } }); $c('crBuildGo').onclick=begin; }
        let resultView=false;
    /* the reveal is its own screen: what you did, what happened, what it cost. The next decision appears only when the player advances. */
    function drawResult(run,k,over,last,capN){ const pts=n=>`${n} point${Math.abs(n)===1?'':'s'}`;
      el.status.innerHTML=`<span class="who">Night ${k} of 12</span><span class="cond">${pts(run.me)}</span>`; el.undo.disabled=false; el.undo.onclick=()=>{ choices.pop(); guesses.pop(); sel=-1; fresh=false; resultView=false; draw(); };
      const sc=crowdScene({cap:capN,acts:last.acts,meIn:last.choice,revealed:true,n:NGUESTS,att:last.att,sel,fresh});
      const verdict=last.choice?(last.comfy?`There was a place for you: +3 points.`:`Too crowded: −2 points.`):(last.comfy?`You missed a good night: +1 point.`:`You avoided a crowded room: +1 point.`);
      const g=guesses[k-1]!==undefined&&guesses[k-1]!==null?`<div class="soft">You expected ${guesses[k-1]} others; ${last.att-(last.choice?1:0)} came.</div>`:'';
      el.result.classList.remove('show');
      el.board.innerHTML=`<div class="cr"><div class="cr-count"><span class="n" id="crN">${last.att}</span><span class="of">came tonight · ${capN} places</span>${faceSVG(last.comfy)}</div><div class="cr-scene">${sc.svg}</div><div class="cr-lines" aria-live="polite"><div>${last.choice?'You went.':'You stayed home.'}</div><div>${last.att} people arrived for ${capN} places.</div><div><b>${verdict}</b></div>${g}</div><div class="cr-choose"><button class="go" id="crNext2">${over?'See how it went':'Next night'}</button></div><div class="cr-say soft">Click anyone in the picture to see the rule they follow.</div></div>`;
      countUp($c('crN'),last.att,900);
      el.board.querySelectorAll('.crp').forEach(p=>{ const i=+p.dataset.i; const s_=()=>{ sel=i; fresh=false; const gu=cfg.guests[i]; el.board.querySelector('.cr-say').innerHTML=`<b>Guest ${gu.id}: ${TYPES[gu.type].name}.</b> ${TYPES[gu.type].rule} Tonight they ${last.acts[i]?'went':'stayed home'}.`; }; p.addEventListener('click',s_); p.addEventListener('keydown',e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); s_(); } }); });
      $c('crNext2').onclick=()=>{ resultView=false; fresh=false; draw(); }; fresh=false; }
    function drawPlay(){ const run=crowdRun(cfg,choices), k=choices.length, over=k>=12, last=run.nights[run.nights.length-1]; const capN=cfg.cap;
      if(resultView&&last) return drawResult(run,k,over,last,capN);
      let rumor=null; if(!over&&o.rumor==='on'){ const others=crowdRun(cfg,[...choices,false]).nights[k].att; const rr=rngOf(cfg.seed*31+k*17+5); rumor=Math.max(0,others+Math.round((rr()-.5)*6)); }
      const pts=n=>`${n} point${Math.abs(n)===1?'':'s'}`; el.status.innerHTML=over?`<span class="who">Twelve nights</span><span class="cond">${pts(run.me)}</span>`:`<span class="who">Night ${k+1} of 12</span><span class="cond">${pts(run.me)}</span>`;
      el.undo.disabled=k===0||over&&false; el.undo.onclick=()=>{ if(choices.length){ choices.pop(); guesses.pop(); sel=-1; fresh=false; resultView=false; draw(); } };
      const sc=crowdScene({cap:capN,acts:[],meIn:false,revealed:false,n:NGUESTS,att:0,sel,fresh:false});
      const cnt=`<div class="cr-count"><span class="n">${capN}</span><span class="of">places tonight</span></div>${last?`<div class="cr-past">Last night: ${last.att} came (${last.comfy?'quiet':'crowded'})</div>`:''}`;
      const g=last&&guesses[k-1]!==undefined&&guesses[k-1]!==null?` You expected ${guesses[k-1]} others; ${last.att-(last.choice?1:0)} came.`:'';
      const info=sel>=0?`<b>Guest ${cfg.guests[sel].id}: ${TYPES[cfg.guests[sel].type].name}.</b> ${TYPES[cfg.guests[sel].type].rule}${last?` Last night they ${last.acts[sel]?'went':'stayed home'}.`:''}`:`There are ${capN} places. Do you go tonight, or stay home?`;
      const bars=(()=>{ const w=560,hh=90,bw=w/12; const sy=hh/Math.max(30,capN+8); return `<svg viewBox="0 0 ${w} ${hh+30}"><line x1="0" x2="${w}" y1="${hh-capN*sy}" y2="${hh-capN*sy}" stroke="currentColor" stroke-dasharray="5 5" opacity=".55"/><text x="${w-2}" y="${hh-capN*sy-4}" font-size="11" text-anchor="end" fill="currentColor" font-family="var(--font-mono)" opacity=".7">${capN} places</text>${run.nights.map((n,i)=>`<rect x="${i*bw+5}" y="${hh-n.att*sy}" width="${bw-10}" height="${n.att*sy}" rx="4" fill="currentColor" opacity="${n.comfy?.42:1}"/><text x="${i*bw+bw/2}" y="${hh+13}" font-size="12" text-anchor="middle" fill="currentColor" font-family="var(--font-mono)">${n.att}</text><text x="${i*bw+bw/2}" y="${hh+26}" font-size="11" text-anchor="middle" fill="currentColor" font-family="var(--font-mono)" opacity=".7">${n.choice?(n.gain>0?'+':'')+n.gain:'home'}</text>`).join('')}</svg>`; })();
      
      el.board.innerHTML=`<div class="cr">${cnt}<div class="cr-scene">${sc.svg}</div><div class="cr-say" aria-live="polite">${info}${rumor!==null?`<br><b>Private rumor:</b> a friend says about <b>${rumor}</b> of the other guests will come tonight (give or take three). Only you heard it.`:''}</div>${over?'':`<div class="cr-choose"><button class="go" id="crGo">Go out</button><button id="crStay">Stay home</button></div>`}<details class="cr-guests cr-more"><summary>Guess, history and guests</summary>${over?'':`<div class="cr-guess">Your guess for how many others come: <button id="crM" aria-label="fewer">−</button><b id="crG">${guess}</b><button id="crP" aria-label="more">+</button></div>`}${k>0?`<div class="cr-chart" aria-label="attendance by night">${bars}</div>`:'<p style="margin:8px 0 0">After the first night this shows how many came each night.</p>'}${Object.values(TYPES).map(t=>`<div class="row"><b>${t.name}</b><span>${t.rule}</span></div>`).join('')}</details></div>`;
      if(last&&fresh) countUp($c('crN'),last.att,900);
      el.board.querySelectorAll('.crp').forEach(p=>{ const i=+p.dataset.i; const s_=()=>{ sel=i; fresh=false; draw(); }; p.addEventListener('click',s_); p.addEventListener('keydown',e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); s_(); } }); });
      if(!over){ $c('crM').onclick=()=>{ guess=Math.max(0,guess-1); $c('crG').textContent=guess; }; $c('crP').onclick=()=>{ guess=Math.min(NGUESTS,guess+1); $c('crG').textContent=guess; };
        const go=c=>{ choices.push(c); guesses.push(guess); sel=-1; fresh=true; resultView=true; draw(); }; $c('crGo').onclick=()=>go(true); $c('crStay').onclick=()=>go(false); }
      else { const stay=12; const herd=run.nights.filter((n,i)=>i>0&&run.nights[i-1].comfy&&!n.comfy).length; const goes=choices.filter(Boolean).length;
        el.result.innerHTML=`<b>${run.me} points</b><div>${run.me>12?'Better than staying home every night (12), so you read the crowd better than chance.':(run.me===12?'The same as staying home every night (12).':'Staying home every night scores 12. Guessing a crowd that is guessing back is hard.')} ${herd>0?`${herd} time${herd===1?'':'s'} a quiet night was followed by a packed one.`:''}</div><div class="gx-after"><button type="button" class="primary" id="crAgain">New guests</button> <button type="button" id="crReplay">Replay these guests</button></div>`; el.result.classList.add('show');
        $c('crAgain').onclick=()=>{ o.seedNext=undefined; M.def.custom(M,el,o); }; $c('crReplay').onclick=()=>{ o.seedNext=cfg.seed; M.def.custom(M,el,o); }; }
      fresh=false; }
    if(stage==='play') begin(); else draw(); }, modeTag:o=>o.mix==='copycat'?'Copycat City':(o.mix==='build'?'Build the Crowd':(o.rumor==='on'?'private rumor':'mixed guests')) });

/* ================= The Last Message (original; inspired by the coordinated attack problem) ================= */
const POLICY='Harbor’s policy, known to everyone: “If a GO reaches me, I attack at dawn. If nothing reaches me, I wait.”';
function lmPayoff(a,b){ return a&&b?8:(!a&&!b?0:-10); }
function lmAnalyze(k,rule,p){ /* every delivery pattern for k exchanges: GO_i delivered? reply_i delivered (only if GO_i delivered)? */
  let rows={both:0,wait:0,loneA:0,loneB:0}, exp=0, worst=null, worstV=1e9; const bits=2*k;
  for(let m=0;m<(1<<bits);m++){ let go=[],re=[],pr=1,valid=true; for(let i=0;i<k;i++){ const g=(m>>(2*i))&1, r=(m>>(2*i+1))&1; if(!g&&r){ valid=false; break; } go.push(g); re.push(r); pr*=g?(1-p):p; if(g) pr*=r?(1-p):p; } if(!valid) continue;
    const bActs=go.some(Boolean), ack=re.some(Boolean); const aActs=rule==='ack'?ack:(rule==='always'); const sent=k+go.filter(Boolean).length; const v=lmPayoff(aActs,bActs)-sent;
    const cls=aActs&&bActs?'both':(!aActs&&!bActs?'wait':(aActs?'loneA':'loneB')); rows[cls]+=pr; exp+=pr*v; if(v<worstV){ worstV=v; worst={go,re,cls,v}; } }
  return {rows,exp,worst}; }

/* the scene: Hill (A, yours) on the left, Harbor (B) on the right, a river between. Envelopes are placed by the caller and animated. */
const LM_W=Z.msgWorld({base:150});
function lmScene(o){ o=o||{}; let g=LM_W.markup; const ly=LM_W.lane;
  g+=Z.lamp(LM_W.ax,LM_W.ay,!!o.aLit,'zla')+Z.lamp(LM_W.bx,LM_W.by,!!o.bLit,'zlb');
  if(o.q) g+=`<text x="${LM_W.ax}" y="${LM_W.qy}" text-anchor="middle" font-size="24" font-weight="800" fill="currentColor" font-family="var(--font-sans)">?</text>`;
  if(o.lostAt) g+=`<path d="M${o.lostAt-8} ${ly-8}l16 16m0 -16l-16 16" stroke="currentColor" stroke-width="3.6" stroke-linecap="round"/>`;
  (o.env||[]).forEach(e=>{ g+=Z.messenger(e.x,ly,e.label,e.cls); });
  g+=`<text x="44" y="196" text-anchor="middle" font-size="10.5" font-weight="700" fill="currentColor" font-family="var(--font-mono)">HILL · A (you)</text><text x="214" y="196" text-anchor="middle" font-size="10.5" font-weight="700" fill="currentColor" font-family="var(--font-mono)">HARBOR · B</text>`;
  if(o.reveal) g+=`<text x="128" y="64" text-anchor="middle" font-size="9" font-weight="700" letter-spacing=".08em" fill="currentColor" fill-opacity=".7" font-family="var(--font-mono)">EXPLANATION: BOTH SIDES SHOWN</text>`;
  return `<svg viewBox="0 46 256 160" role="img" aria-label="${o.alt||'Hill on the left, Harbor on the right, a river between them'}">${g}</svg>`; }
const lmFly=(root,cls,from,to,ms,fade)=>{ const el=root.querySelector('.'+cls); if(!el||!el.animate) return; el.style.transformBox='fill-box'; el.style.transformOrigin='center'; el.animate([{transform:`translateX(${from}px) scale(1)`,opacity:1},{transform:`translateX(${to}px) scale(${fade?.5:1})`,opacity:fade?0:1}],{duration:ms,easing:'ease-in-out',fill:'forwards'}); };
const qa=(know,choose,risk)=>`<div class="lm-qa"><div><b>What you know</b>${know}</div><div><b>What you can choose</b>${choose}</div><div><b>If only one side attacks</b>${risk}</div></div>`;
const LOSS=.3;
X.register({ id:'message', title:['The Last','Message'], blurb:'Two groups must act together, but messages between them can be lost. Is one message enough?', noHints:true, firstChoice:false, startLabel:'Begin the story', entryReady:true, optsInline:true,
  defaults:{mode:'story',loss:'30',ex:'3'}, options:[{key:'mode',label:'Start with',values:[['story','Guided story'],['workshop','Protocol workshop']]},{key:'loss',label:'Workshop loss',values:[['10','10%'],['30','30%'],['50','50%']]},{key:'ex',label:'Workshop exchanges',values:[['1','One'],['2','Two'],['3','Three']]}], diffs:[['normal','Normal']],
  rules:`<p><b>Inspired by</b> Halpern and Moses on <a href="https://research.ibm.com/publications/knowledge-and-common-knowledge-in-a-distributed-environment" target="_blank" rel="noopener">knowledge and common knowledge</a>. The scenario and scoring are this site's own design.</p><p>Two groups, <b>Hill</b> (you, A) and <b>Harbor</b> (B), win only if they attack at dawn <b>together</b>. Both attack: <b>+8</b>. Both wait: <b>0</b>. Only one attacks: <b>−10</b>. Every message sent costs <b>1</b>. Messages can be lost. Harbor's policy is public: if a GO reaches it, it attacks at dawn; otherwise it waits.</p><p>The <b>guided story</b> has two short scenarios: one message, then an acknowledgment. The <b>Protocol Workshop</b> lets you send up to three exchanges at 10%, 30% or 50% loss, and afterwards shows what each rule would have scored over every possible delivery pattern.</p>`,
  // One illustrative signal, playable on the entry screen with the real map and the real payoff/cost numbers --
  // not a static picture of the dilemma. The full two-scenario guided story still runs after Start.
  entryDemo(host){ ZF.injectCSS(); X.css();
    let stage='ask', sent=null, delivered=null;
    const draw=()=>{
      const scene = stage==='ask'
        ? lmScene({alt:'Hill and Harbor, before any message is sent'})
        : lmScene({aLit:stage==='result'&&sent&&delivered, bLit:stage==='result'&&sent&&delivered, env:sent?[{x:78,label:'GO',cls:delivered?'zmgo':''}]:[], lostAt:(sent&&!delivered)?78:0, reveal:true, alt: sent?(delivered?'GO reached Harbor':'GO was lost crossing the river'):'Hill sent nothing'});
      const msg = stage==='ask'
        ? `${POLICY} Hill can send a <b>GO</b> messenger, but the road is dangerous, and Hill can never see whether one arrived. Send it (costs 1), or hold?`
        : (sent
            ? (delivered ? `<b>The message arrived.</b> Harbor attacks at dawn, and Hill — following the same policy — attacks too: both win, worth <b>8</b> each, minus the 1 it cost to send: <b>+7</b> for Hill.` : `<b>The message was lost.</b> Harbor never attacks. Hill spent 1 to send it and changed nothing: <b>−1</b>.`)
            : `<b>Hill sent nothing.</b> Harbor waits, Hill waits: a safe, silent <b>0</b>.`);
      host.innerHTML=`<div class="gx-demo"><span class="gx-tag">Try one signal</span><div class="lm-map" style="width:min(100%,420px)">${scene}</div><div class="gx-note" style="max-width:48ch">${msg}</div>${stage==='result'?'<button type="button" class="gx-btn" id="lmDemoAgain">↺ Try again</button>':'<div style="display:flex;gap:10px;justify-content:center;margin-top:8px"><button type="button" id="lmDemoSend" class="gx-btn">Send GO</button><button type="button" id="lmDemoHold" class="gx-btn">Hold</button></div>'}</div>`;
      if(stage==='ask'){ host.querySelector('#lmDemoSend').onclick=()=>{ sent=true; delivered=Math.random()>=LOSS; stage='result'; draw(); }; host.querySelector('#lmDemoHold').onclick=()=>{ sent=false; delivered=false; stage='result'; draw(); }; }
      else host.querySelector('#lmDemoAgain').onclick=()=>{ stage='ask'; sent=null; delivered=null; draw(); };
    };
    draw();
  },
  custom(M,el,o){ if(o.mode==='workshop') return workshop(M,el,o); return story(M,el,o); }, modeTag:o=>o.mode==='workshop'?`workshop · ${o.loss}% loss · ${o.ex} exchange${o.ex==='1'?'':'s'}`:'guided story' });

/* ---- guided story: two scenarios, one decision each ---- */
function story(M,el,o){ const seed=o.seedNext||Math.floor(Math.random()*1e9); o.seedNext=undefined; const rng=rngOf(seed); const plans=[0,1].map(()=>({go:rng()>=LOSS,re:rng()>=LOSS}));
  let sc=0, step='intro', sent=null, decided=null; const $c=id=>document.getElementById(id);
  const draw=()=>{ el.result.classList.remove('show'); el.undo.style.display='none'; el.restart.style.display=''; el.restart.onclick=()=>{ o.seedNext=seed; M.def.custom(M,el,o); }; const pl=plans[sc], ack=sc===1;
    el.status.innerHTML=`<span class="who">Scenario ${sc+1} of 2 · ${ack?'An acknowledgment':'One message'}</span>`;
    const prog='';
    if(step==='intro'){
      const t=sc===0?`Hill and Harbor must attack at dawn, and <b>only together</b>. If just one attacks, it is lost. Hill can send a messenger with <b>GO</b> to Harbor, but the road is dangerous: about 3 in 10 messengers never arrive.<small>${POLICY}</small>`
        :`Same two groups, one change: Harbor now sends <b>RECEIVED</b> back whenever a GO reaches it. That reply can be lost too.<small>${POLICY} Each message, GO or RECEIVED, costs 1.</small>`;
      el.board.innerHTML=`<div class="lm">${prog}<div class="lm-map">${lmScene({alt:'Hill and Harbor, before any message is sent'})}</div><div class="lm-story">${t}</div>${qa(sc===0?'Hill and Harbor both need to attack at dawn.':'Hill sends GO. Harbor replies RECEIVED if GO arrives.',`Send GO (costs 1) or send nothing.`,'Attack alone or wait while the other attacks: −10.')}<div class="lm-acts"><button class="pri" id="lmSend">Send GO (−1)</button><button id="lmNone">Send nothing</button></div></div>`;
      $c('lmSend').onclick=()=>{ sent=true; step='decide'; draw(); }; $c('lmNone').onclick=()=>{ sent=false; step='decide'; draw(); }; return; }
    if(step==='decide'){ const heard=ack&&sent&&pl.go&&pl.re;
      const knowTxt=!sent?'You sent nothing. Harbor will wait.':(ack?(heard?'GO went out and <b>RECEIVED came back</b>. So GO arrived.':'GO went out and <b>nothing came back</b>. That could mean GO was lost, or that GO arrived and the reply was lost. You cannot tell which.'):'GO went out. You cannot see whether it arrived.');
      const story_=!sent?'You send nothing. Harbor will wait at dawn. Will you attack anyway, or wait too?':(ack?(heard?'A messenger returns with RECEIVED: Harbor got your GO. But Harbor cannot know whether its reply made it back. Decide: attack at dawn, or wait?':'No reply arrives. Was the GO lost, or only the reply? Decide: attack at dawn, or wait?'):'The messenger disappears down the road. You cannot know whether GO reached Harbor. Decide: attack at dawn, or wait?');
      const env=sent?(heard?[{x:78,label:'OK',cls:'zmre'}]:[]):[];
      el.board.innerHTML=`<div class="lm">${prog}<div class="lm-map" id="lmMap">${lmScene({aLit:false,q:true,env:sent?[{x:78,label:'GO',cls:'zmgo'}].concat(heard?[{x:178,label:'OK',cls:'zmre'}]:[]):[],alt:'Hill decides whether to attack'})}</div><div class="lm-story">${story_}</div>${qa(knowTxt,'Attack at dawn, or wait.','Attack alone: −10. Wait while Harbor attacks: −10.')}<div class="lm-acts"><button class="pri" id="lmAct">Attack at dawn</button><button id="lmWait">Wait</button></div></div>`;
      const map=$c('lmMap'); if(sent){ lmFly(map,'zmgo',0,60,900,true); if(heard){ const re=map.querySelector('.zmre'); if(re){ re.style.opacity=0; setTimeout(()=>{ re.style.opacity=1; lmFly(map,'zmre',0,-100,1000,false); },1000); } } }
      $c('lmAct').onclick=()=>{ decided='act'; step='result'; draw(); }; $c('lmWait').onclick=()=>{ decided='wait'; step='result'; draw(); }; return; }
    /* result: replay the truth, then say what each side knew */
    const goDelivered=sent&&pl.go, replyDelivered=ack&&goDelivered&&pl.re, aAct=decided==='act', bAct=!!goDelivered; const msgs=(sent?1:0)+(ack&&goDelivered?1:0); const score=lmPayoff(aAct,bAct)-msgs;
    const cls=aAct&&bAct?'Both attacked':(!aAct&&!bAct?'Both waited':(aAct?'Hill attacked alone':'Harbor attacked alone'));
    const env=[]; if(sent) env.push({x:78,label:'GO',cls:'zmgo'}); if(ack&&goDelivered) env.push({x:178,label:'OK',cls:'zmre'});
    el.status.innerHTML=`<span class="who">Dawn</span><span class="cond">${cls}</span>`;
    const hillKnew=!sent?'Hill sent nothing.':(ack?(replyDelivered?'Hill sent GO and received RECEIVED.':'Hill sent GO and heard nothing back.'):'Hill sent GO and heard nothing: no reply was possible.');
    const harborKnew=!goDelivered?'No GO ever reached Harbor, so Harbor waited.':(ack?`GO reached Harbor, so Harbor attacked. It sent RECEIVED, and ${replyDelivered?'it arrived':'it was lost'}, and Harbor never learns which.`:'GO reached Harbor, so Harbor attacked.');
    const lesson=aAct===bAct?(aAct?'Both attacked, but Hill could not have been sure of that when it chose.':'Both waited: safe, but nothing was won.'):(aAct?'Hill attacked but the GO never reached Harbor. Hill had no way to tell that from a GO that arrived.':(bAct?'Harbor attacked because GO reached it, but Hill waited. One side acting alone is the loss the messages were meant to prevent.':''));
    const ackNote=ack?(replyDelivered?'Even with RECEIVED in hand, Hill knows GO arrived, but Harbor does not know whether that RECEIVED arrived. Another confirmation would raise the same question again.':'Without RECEIVED, Hill faces two situations that look identical: GO lost, or GO delivered with the reply lost.'):'A single message can be lost with nothing to show for it. An acknowledgment can tell Hill more, and then it raises its own question.';
    el.board.innerHTML=`<div class="lm">${prog}<div class="lm-map" id="lmMap">${lmScene({aLit:aAct,bLit:bAct,q:false,env:[],lostAt:(sent&&!goDelivered)?128:(ack&&goDelivered&&!replyDelivered?128:0),alt:'The truth revealed',reveal:true})}</div><div class="lm-story"><span class="rb">${cls}: ${score>0?'+':''}${score} points</span> (${aAct||bAct?(aAct&&bAct?'+8':'−10'):'0'}${msgs?`, messages −${msgs}`:''}).<small>${lesson}</small></div><div class="lm-panels"><div class="lm-panel"><h4>What Hill knew</h4>${hillKnew}</div><div class="lm-panel"><h4>What Harbor knew</h4>${harborKnew}</div></div><div class="lm-story"><small style="margin-top:0">${ackNote}</small></div><div class="lm-acts">${sc===0?'<button class="pri" id="lmNext">Next: an acknowledgment</button>':'<button class="pri" id="lmWork">Open the Protocol Workshop</button>'}<button id="lmAgain">${sc===0?'Replay this scenario':'Play the story again'}</button></div></div>`;
    const map=$c('lmMap'); if(map&&sent){ const svgEl=map.querySelector('svg'); const holder=document.createElement('div'); holder.innerHTML=lmScene({env}); const envs=holder.querySelectorAll('.zenv'); envs.forEach(e=>svgEl.appendChild(e)); const goEl=svgEl.querySelector('.zmgo'), reEl=svgEl.querySelector('.zmre');
      if(goEl&&goEl.animate) goEl.animate([{transform:'translateX(0)',opacity:1},{transform:`translateX(${goDelivered?96:52}px)`,opacity:goDelivered?1:0}],{duration:1300,easing:'ease-in-out',fill:'forwards'}).onfinish=()=>{ if(goDelivered) goEl.animate([{transform:'translateX(96px)'},{transform:'translateX(96px) translateY(5px)'},{transform:'translateX(96px) translateY(-3px)'},{transform:'translateX(96px)'}],{duration:420,fill:'forwards'}); };
      if(reEl&&reEl.animate){ reEl.style.opacity=0; setTimeout(()=>{ reEl.style.opacity=''; reEl.animate([{transform:'translateX(0)',opacity:1},{transform:`translateX(${replyDelivered?-96:-52}px)`,opacity:replyDelivered?1:0}],{duration:1300,easing:'ease-in-out',fill:'forwards'}); },1400); } }
    const nx=$c('lmNext'); if(nx) nx.onclick=()=>{ sc=1; step='intro'; sent=null; decided=null; draw(); };
    const wk=$c('lmWork'); if(wk) wk.onclick=()=>{ setPref('message','mode','workshop'); o.mode='workshop'; o.seedNext=undefined; M.def.custom(M,el,o); };
    $c('lmAgain').onclick=()=>{ if(sc===0){ step='intro'; sent=null; decided=null; draw(); } else { o.seedNext=undefined; sc=0; M.def.custom(M,el,o); } }; };
  draw(); }

/* ---- protocol workshop: up to three exchanges, every failure pattern analysed afterwards ---- */
function workshop(M,el,o){ const p=+o.loss/100, maxEx=+o.ex; const seed=o.seedNext||Math.floor(Math.random()*1e9); o.seedNext=undefined; const rng=rngOf(seed); const plan=[]; for(let i=0;i<3;i++){ plan.push({go:rng()>=p,re:rng()>=p}); }
  let sent=0, acks=[], phase='send', decided=null; const $c=id=>document.getElementById(id); const seen=()=>acks.some(Boolean);
  const draw=()=>{ const k=sent, done=phase==='done'; const goDel=plan.slice(0,k).map(x=>x.go); const bActs=goDel.some(Boolean);
    el.status.innerHTML=done?'<span class="who">Deadline passed</span>':`<span class="who">${phase==='send'?`Exchange ${k+1} of ${maxEx}`:'The deadline'}</span><span class="cond">${phase==='send'?'send GO or stop':'attack or wait'}</span>`;
    let env=[]; plan.slice(0,k).forEach((g,i)=>{ if(done||(g.go&&g.re)) {} });
    const scene=lmScene({aLit:done&&decided==='act',bLit:done&&bActs,q:!done&&k>0&&!seen(),env:[],alt:'Hill and Harbor'});
    const table=plan.slice(0,k).map((g,i)=>`<tr><td>${i+1}</td><td>${done?(g.go?'arrived':'lost'):'sent'}</td><td>${done?(g.go?(g.re?'arrived':'lost'):'not sent'):(g.go&&g.re?'arrived':'nothing')}</td></tr>`).join('');
    el.board.innerHTML=`<div class="lm"><div class="lm-map">${scene}</div><div class="lm-story"><small style="margin-top:0">${POLICY}</small></div>${k?`<table class="lm-tbl"><tr><th>Exchange</th><th>GO ${done?'reached Harbor':'(sent)'}</th><th>RECEIVED ${done?'reached Hill':'(seen by Hill)'}</th></tr>${table}</table>`:''}<div class="lm-panels"><div class="lm-panel"><h4>Hill knows</h4>${k===0?'No messages sent yet.':acks.map((a,i)=>`GO ${i+1} sent. ${a?'RECEIVED arrived.':'No reply arrived.'}`).join('<br>')}</div><div class="lm-panel"><h4>Harbor knows</h4>${done?(bActs?`A GO reached Harbor on exchange ${goDel.findIndex(Boolean)+1}. Harbor attacks.`:'No GO ever reached Harbor. Harbor waits.'):'Hidden until the deadline.'}</div></div><div class="lm-acts">${done?'':(phase==='send'?`<button class="pri" id="lmSend">Send GO (−1)</button><button id="lmStop">${k?'Stop sending':'Send nothing'}</button>`:`<button class="pri" id="lmAct">Attack at dawn</button><button id="lmWait">Wait</button>`)}</div></div>`;
    el.undo.style.display='none'; el.restart.style.display='';
    const send=$c('lmSend'); if(send) send.onclick=()=>{ const g=plan[sent]; acks.push(g.go&&g.re); sent++; if(sent>=maxEx) phase='decide'; draw(); }; const stop=$c('lmStop'); if(stop) stop.onclick=()=>{ phase='decide'; draw(); };
    const fin=(a)=>{ decided=a; phase='done'; const aAct=a==='act'; const goN=plan.slice(0,sent).filter(x=>x.go).length; const bA=goN>0; const msgs=sent+goN; const score=lmPayoff(aAct,bA)-msgs;
      const rule=aAct?(seen()?'ack':'always'):(seen()?'never':'ack'); const rl={ack:'send GO, then attack only if a RECEIVED comes back',always:'send GO, then attack whatever happens',never:'send GO, then wait whatever happens'}[rule]; const an=lmAnalyze(sent,rule,p);
      const failing=an.worst&&(an.worst.cls==='loneA'||an.worst.cls==='loneB'); const pct=x=>Math.round(x*100)+'%';
      const failText=an.worst.cls==='loneB'?'GO reaches Harbor but every reply is lost, so Harbor attacks alone (−10)':(an.worst.cls==='loneA'?'no GO reaches Harbor, so Hill attacks alone (−10)':'');
      const guaranteed=sent===0&&!aAct?'Sending nothing and waiting is the one rule that cannot go wrong here, but it never lets the groups act together, so it scores 0.':(failing?`Judged as “${rl}” with ${sent} exchange${sent===1?'':'s'}: it averages ${an.exp.toFixed(1)} points, coordinates in ${pct(an.rows.both+an.rows.wait)} of delivery patterns and fails in ${pct(an.rows.loneA+an.rows.loneB)}. It is not guaranteed: there is a pattern where ${failText}. More exchanges shrink the failure chance but never remove it.`:'This rule cannot fail under any delivery pattern.');
      const rowsFor=(r,l)=>{ const x=lmAnalyze(maxEx,r,p); return `<tr><td>${l}</td><td>${pct(x.rows.both)}</td><td>${pct(x.rows.wait)}</td><td>${pct(x.rows.loneA+x.rows.loneB)}</td><td>${x.exp.toFixed(1)}</td></tr>`; };
      draw(); el.result.classList.add('show'); const cls=aAct&&bA?'Both attacked':(!aAct&&!bA?'Both waited':(aAct?'Hill attacked alone':'Harbor attacked alone'));
      el.result.innerHTML=`<b>${cls}: ${score>0?'+':''}${score} points</b><div><span class="rb">This run:</span> ${sent} GO${sent===1?'':'s'} sent, ${goN} arrived and got a reply${goN===1?'':' each'} (each message costs 1). The two groups ${aAct===bA?'happened to coordinate':'did not coordinate'}. <span class="rb">The strategy</span> is a separate question from one lucky or unlucky run. ${guaranteed}<br><span style="opacity:.85">Harbor attacks on any GO it receives, so sending several GOs and attacking makes coordination likely here. The catch: Hill never learns whether a GO arrived, the reply can be lost even when it did, and every message costs 1.</span></div><table class="lm-tbl"><tr><th>Rule, with ${maxEx} exchange${maxEx===1?'':'s'} (every pattern, ${o.loss}% loss)</th><th>Both attack</th><th>Both wait</th><th>Someone alone</th><th>Avg</th></tr>${rowsFor('ack','Send GOs, attack only after a reply')}${rowsFor('always','Send GOs, attack whatever happens')}${rowsFor('never','Send GOs, always wait')}</table><div class="gx-after"><button type="button" class="primary" id="lmAgain">Another run</button> <button type="button" id="lmSame">Replay this seed</button> <button type="button" id="lmBack">Back to the story</button></div>`;
      $c('lmAgain').onclick=()=>{ o.seedNext=undefined; M.def.custom(M,el,o); }; $c('lmSame').onclick=()=>{ o.seedNext=seed; M.def.custom(M,el,o); }; $c('lmBack').onclick=()=>{ o.mode='story'; setPref('message','mode','story'); o.seedNext=undefined; M.def.custom(M,el,o); }; };
    const ac=$c('lmAct'),wt=$c('lmWait'); if(ac){ ac.onclick=()=>fin('act'); wt.onclick=()=>fin('wait'); } };
  el.result.classList.remove('show'); el.restart.onclick=()=>{ o.seedNext=seed; M.def.custom(M,el,o); }; draw(); }
})();
