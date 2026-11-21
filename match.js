/* match.js: the matchup above the board in every two-player strategy game.
     [your duck + name]   ·   Your turn   ·   [opponent's name + duck]
   The players' own names and customized ducks (the party profile, a local second player, or the online seats). With no
   name chosen, it falls back to Player 1 and Player 2. Two equal sides, each duck large enough to read its face and
   turned towards the middle, its name beside it (under it on a phone) with a small mark for its piece or role. The
   player to move gets a duck about 13% larger at full brightness, a bold name and a short quiet mark; the waiting duck
   is slightly dimmed (its face and accessories stay readable) and comes back to full brightness while it reacts. The
   middle column holds the one label that says whose turn it is, the move timer when one is set (turn-timer.js) and the
   match score.
   The match score counts games won by each player, not turns: it changes once when a game finishes, survives rematches,
   refreshes and a change of who starts (it belongs to the player, not the seat), keeps draws apart, and never counts a
   restarted unfinished board. A different opponent (another name, the computer at another level, another mode) starts
   a new score, as does Reset match score in Settings. Online, the room server's score is shown as it is: it alone
   counts, once per finished game, and keeps it across reconnects. Game points (a game's own scoring) are separate. The row has a fixed height, so a handover never moves the board, and with reduced motion the sizes still change,
   only without the animation.
   It reads each game's existing state (no game logic lives here). A ZFX game opts in by being listed in GX_TWO or by
   setting matchup:true on its definition.
   ZFMatch.refresh()  ZFMatch.current() -> {mode, players, turn, mine}  ZFMatch.score(v)  ZFMatch.timeout(seat)
   ZFMatch.settingsRow(body)  ZFMatch.scoreLine()  */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const lsGet=(k,d)=>{ try{ const v=localStorage.getItem(k); return v?JSON.parse(v):d; }catch(e){ return d; } };
const lsSet=(k,v)=>{ try{ localStorage.setItem(k,JSON.stringify(v)); }catch(e){} };
const LS_PROFILE='zf-party-profile', LS_LOCAL='zf-match-players';
const GX_TWO={quarto:1,sim:1,pentago:1,toot:1,domineering:1,notakto:1,gold:1};
const CPU_DUCK={mansy:1}, P2_DUCK={head:'beanie',hc:'black'};
const clean=d=>window.ZPDuck?ZPDuck.clean(d||{}):(d||{});
/* each player's piece, word or direction where the game has one; otherwise who moves first */
const XG='<svg viewBox="0 0 12 12"><path d="M2.5 2.5l7 7M9.5 2.5l-7 7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>', OG='<svg viewBox="0 0 12 12"><circle cx="6" cy="6" r="3.8" fill="none" stroke="currentColor" stroke-width="2"/></svg>';
const VG='<svg viewBox="0 0 12 12"><rect x="3.8" y="1" width="4.4" height="10" rx="1.2" fill="currentColor"/></svg>', HG='<svg viewBox="0 0 12 12"><rect x="1" y="3.8" width="10" height="4.4" rx="1.2" fill="currentColor"/></svg>';
const ROLES={ '4x4-tic-tac-toe':[XG,OG], 'recursive-tic-tac-toe':[XG,OG], '3d-tic-tac-toe':[XG,OG], 'toot-otto':['TOOT','OTTO'], domineering:[VG+'Vertical',HG+'Horizontal'], notakto:['',''] };
const roleOf=seat=>{ const slug=location.pathname.replace(/^\/+|\/+$/g,'').split('/')[0], r=ROLES[slug]; return r?r[seat-1]:seat===1?'1st':'2nd'; };

const CSS=`
.zm{order:0;position:relative;display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);align-items:center;column-gap:14px;width:100%;max-width:620px;height:124px;margin:0 auto;box-sizing:border-box;padding:0 4px}
.zm[hidden]{display:none}
/* two equal sides; each duck faces the middle, with its name right beside it, on the side towards the turn label */
.zm-p{display:flex;align-items:center;justify-content:flex-end;gap:12px;min-width:0;height:100%;position:relative}
.zm-p.r{flex-direction:row-reverse;text-align:right}
.zm-duck{position:relative;flex:none;width:104px;height:112px;display:flex;align-items:flex-end;justify-content:center;padding-bottom:8px;box-sizing:border-box;transform:scale(.88);transform-origin:50% 90%;transition:transform .32s cubic-bezier(.3,1.4,.5,1)}
.zm-duck .pd{width:96px;height:104px;transition:opacity .3s,filter .3s}
/* while a game is on, the waiting duck is a little dimmer (brightness and contrast, never a halo); it is back to full
   brightness whenever it reacts, and both are at full brightness once the game is over */
.zm.zm-live .zm-p:not(.on) .zm-duck .pd{opacity:.66;filter:saturate(.7)}
.zm.zm-live .zm-p:not(.on) .zm-duck.zr-big .pd{opacity:1;filter:none}
.zm.zm-live .zm-p:not(.on) .zm-name{opacity:.8}
.zm-p.r .zm-duck .pd{--pd-dir:-1}
.zm-p.r .zm-duck .pd-svg{transform:scaleX(-1)}
.zm-p.on .zm-duck{transform:none}
/* the player to move: a short, quiet mark under the duck (space for it is always kept, so nothing moves) */
.zm-duck::after{content:"";position:absolute;left:50%;bottom:0;width:30px;height:3px;margin-left:-15px;border-radius:2px;background:var(--g5);opacity:0;transform:scaleX(.4);transition:opacity .25s,transform .25s}
.zm-p.on .zm-duck::after{opacity:1;transform:none}
.zm-duck.hop .pd{animation:zmHop .45s ease-out}
@keyframes zmHop{0%,100%{translate:0 0}40%{translate:0 -8%}}
.zm-who{display:flex;flex-direction:column;align-items:flex-start;min-width:0;gap:3px}
.zm-p.r .zm-who{align-items:flex-end}
.zm-name{max-width:100%;font:600 16px/1.2 var(--font-sans);color:var(--g6);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;transition:color .2s}
.zm-p.on .zm-name{color:var(--fg);font-weight:800}
.zm-sub{max-width:100%;font:600 11px/1.2 var(--font-mono);letter-spacing:.06em;text-transform:uppercase;color:var(--g5);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.zm-sub:empty{display:none}
.zm-sub .dot{display:inline-block;width:7px;height:7px;border-radius:50%;margin-right:5px;vertical-align:0;background:#3f9142}.zm-sub .dot.gone{background:#b3483f}
/* what each player is: their mark, their word, their direction, or who moved first */
.zm-role{display:inline-flex;align-items:center;gap:5px;height:20px;padding:0 7px;border-radius:6px;background:var(--surf2);color:var(--g6);font:700 11px/1 var(--font-mono);letter-spacing:.04em}
.zm-role:empty{display:none}
.zm-role svg{width:12px;height:12px;flex:none}
.zm-mid{justify-self:center;display:flex;flex-direction:column;align-items:center;gap:6px;min-width:0}
.zm-turn{display:inline-flex;align-items:center;justify-content:center;gap:6px;width:176px;min-height:36px;padding:0 14px;box-sizing:border-box;border-radius:999px;background:var(--fg);color:var(--bg);font:700 14px/1 var(--font-sans);white-space:nowrap;max-width:44vw;overflow:hidden;text-overflow:ellipsis}   /* one width whatever the name, so the row never shifts */
.zm-turn.wait{background:var(--surf3);color:var(--fg)}
.zm-turn.end{background:var(--surf2);color:var(--fg)}
.zm-turn i{width:8px;height:8px;border-radius:50%;background:currentColor;flex:none}
.zm-turn.wait i{animation:zmThink 1s ease-in-out infinite}
@keyframes zmThink{50%{opacity:.25}}
.zm-turn span{overflow:hidden;text-overflow:ellipsis}
/* the move timer (turn-timer.js fills it): a thin bar and the seconds left; its space is kept even when it is off */
.zm-clock{display:flex;align-items:center;gap:7px;width:150px;height:13px;font:700 12px/1 var(--font-mono);color:var(--g6);font-variant-numeric:tabular-nums;visibility:hidden}
.zm-clock.on{visibility:visible}
.zm-bar{flex:1;height:4px;border-radius:2px;background:var(--surf3);overflow:hidden}
.zm-bar i{display:block;height:100%;border-radius:2px;background:var(--g5);transform-origin:0 50%;transform:scaleX(var(--p,1))}
.zm-clock.warn{color:var(--fg)}.zm-clock.warn .zm-bar i{background:var(--fg)}
.zm-clock.paused{opacity:.55}
.zm-clock.warn .zm-secs{animation:zmWarn 1s steps(1) infinite}
@keyframes zmWarn{50%{opacity:.55}}
/* the match score: games won by each player, read left to right like the ducks; draws apart */
.zm-score{display:flex;align-items:baseline;justify-content:center;gap:5px;min-height:15px;font:600 12px/1 var(--font-sans);color:var(--g6);font-variant-numeric:tabular-nums;white-space:nowrap}
.zm-score .zm-sk{font:700 9.5px/1 var(--font-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--g5);margin-right:2px}
.zm-score b{display:inline-block;min-width:.6em;text-align:center;font:800 15px/1 var(--font-sans);color:var(--fg)}
.zm-score b.bump{animation:zmBump .55s cubic-bezier(.3,1.5,.5,1)}
@keyframes zmBump{0%{transform:none}35%{transform:scale(1.4) translateY(-2px)}100%{transform:none}}
.zm-score small{font:600 11px/1 var(--font-sans);color:var(--g5)}
/* a game lost on time: the board and the move controls rest until a new game starts */
.zm-timeout .stage .board,.zm-timeout .stage [id$="Board"],.zm-timeout .stage #boardArea,.zm-timeout .stage .gx-board,.zm-timeout .stage canvas,
.zm-timeout .stage .board *,.zm-timeout .stage [id$="Board"] *,.zm-timeout .stage #boardArea *,.zm-timeout .stage .gx-board *{pointer-events:none!important}
.zm-timeout .gtools [data-label="Undo"],.zm-timeout .gtools [data-label="Hint"]{pointer-events:none;opacity:.4}
.zm-edit{margin:0;padding:0 2px;border:none;background:none;color:var(--g5);font:600 11.5px/1.2 var(--font-sans);text-decoration:underline;text-underline-offset:2px;cursor:pointer}
.zm-edit:hover,.zm-edit:focus-visible{color:var(--fg)}
.zm-edit:focus-visible{outline:2px solid var(--fg);outline-offset:2px;border-radius:3px}
.stage.has-zm>.status .who{display:none}
.stage.has-zm .on-bar .who{display:none}
/* phones: the name goes under its duck, so a long name never squeezes the turn label */
@media (max-width:600px){
  .zm{height:132px;column-gap:6px;padding:0;max-width:none}
  .zm-p,.zm-p.r{flex-direction:column;justify-content:center;align-items:center;gap:2px;text-align:center}
  .zm-duck{width:74px;height:78px;padding-bottom:6px}
  .zm-duck .pd{width:68px;height:72px}
  .zm-duck::after{width:22px;margin-left:-11px}
  .zm-who,.zm-p.r .zm-who{align-items:center;max-width:100%;gap:2px}
  .zm-name{font-size:13.5px}
  .zm-sub{font-size:9.5px}
  .zm-role{height:17px;font-size:10px;padding:0 5px}
  .zm-turn{width:34vw;max-width:150px;min-height:32px;padding:0 11px;font-size:12.5px}
  .zm-mid{gap:5px}.zm-clock{width:30vw;max-width:130px}
}
@media (prefers-reduced-motion:reduce){.zm-duck,.zm-duck::after,.zm-name,.zm-duck .pd{transition:none}.zm-turn.wait i{animation:none}.zm-duck.hop .pd{animation:none}.zm-score b.bump,.zm-clock.warn .zm-secs{animation:none}}
/* the score in Settings and in the result dialog */
.zm-sline{display:flex;flex-wrap:wrap;align-items:center;gap:10px 14px}.zm-sline .zm-score{justify-content:flex-start;font-size:14px}.zm-sline .zm-score b{font-size:17px}
.zm-reset{min-height:40px;padding:0 14px;border:1.5px solid var(--g4);border-radius:999px;background:transparent;color:var(--fg);font:600 13.5px var(--font-sans);cursor:pointer}.zm-reset:hover{border-color:var(--fg)}.zm-reset:focus-visible{outline:2px solid var(--fg);outline-offset:2px}.zm-reset.sure{background:var(--fg);color:var(--bg);border-color:var(--fg)}
/* the players dialog (local games): a name and a duck for each */
.zmd .gdialog-card{max-width:560px}
.zmd-rows{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.zmd-row{display:flex;flex-direction:column;align-items:center;gap:8px;padding:14px 10px;border-radius:16px;background:var(--surf2)}
.zmd-row .gs-label{align-self:stretch;text-align:center;margin:0}
.zmd-row input{width:100%;box-sizing:border-box;min-height:46px;padding:0 12px;border:1.5px solid var(--g3);border-radius:12px;background:var(--bg);color:var(--fg);font:600 15px var(--font-sans);text-align:center}
.zmd-row input:focus-visible{outline:2px solid var(--fg);outline-offset:1px}
.zmd-row button{min-height:40px;padding:0 14px;border:1.5px solid var(--g4);border-radius:999px;background:var(--bg);color:var(--fg);font:600 13.5px var(--font-sans);cursor:pointer}
.zmd-acts{display:flex;align-items:stretch;gap:10px;margin-top:16px}.zmd-acts .start{flex:1;min-height:50px;margin-top:0;padding:0 24px;font-size:16px}
.zmd-acts .cancel{min-height:50px;padding:0 20px;border:1.5px solid var(--g4);border-radius:12px;background:transparent;color:var(--fg);font:600 14.5px var(--font-sans);cursor:pointer}
@media (max-width:480px){.zmd-rows{grid-template-columns:1fr}}
.zmd.zmd-cr .gdialog-card{max-width:min(980px,96vw)}
/* setup: who is playing, under the Players choice. One card per seat at this device; the computer's card is Mansy's duck */
.zm-who{display:flex;flex-direction:row;flex-wrap:wrap;gap:10px;margin-top:12px;max-width:560px}
.zm-card{flex:1 1 210px;min-width:0;display:flex;align-items:center;gap:12px;padding:10px 12px 10px 8px;border:1px solid var(--g2);border-radius:16px;background:var(--surf2);box-sizing:border-box}
.zm-card>.pd{flex:none;width:72px;height:76px}
.zm-cbody{flex:1;min-width:0;display:flex;flex-direction:column;align-items:flex-start;gap:6px}
.zm-clab{font:700 11px var(--font-mono);letter-spacing:.08em;text-transform:uppercase;color:var(--g5)}
.zm-card input{width:100%;box-sizing:border-box;min-height:42px;padding:0 12px;border:1.5px solid var(--g3);border-radius:11px;background:var(--bg);color:var(--fg);font:600 15px var(--font-sans)}
.zm-card input:focus-visible{outline:2px solid var(--fg);outline-offset:1px}
.zm-cust{min-height:38px;padding:0 12px;white-space:nowrap;border:1.5px solid var(--g4);border-radius:999px;background:transparent;color:var(--fg);font:600 13.5px var(--font-sans);cursor:pointer}
.zm-cust:hover{border-color:var(--fg)}.zm-cust:focus-visible{outline:2px solid var(--fg);outline-offset:2px}
.zm-cname{font:700 16px/1.2 var(--font-sans);color:var(--fg)}.zm-clevel{font:600 13px var(--font-sans);color:var(--g6)}
.zm-who+.e-small{margin-top:8px}
`;
const st=document.createElement('style'); st.id='zm-css'; st.textContent=CSS; document.head.appendChild(st);

/* ---- who is playing, read from each game's own state ---- */
/* the computer's level, as its setup names it (easy, medium, hard, perfect, ...) */
const diffWord=d=>{ d=String(d||''); return d?d.charAt(0).toUpperCase()+d.slice(1):''; };
const profile=()=>{ const p=lsGet(LS_PROFILE,{})||{}; return {nick:String(p.nick||'').trim().slice(0,18),duck:clean(p.duck)}; };
const locals=()=>{ const l=lsGet(LS_LOCAL,{})||{}; const pr=profile();
  return [{nick:String((l[1]||{}).nick||'').trim(),duck:clean((l[1]||{}).duck||pr.duck)},{nick:String((l[2]||{}).nick||'').trim(),duck:clean((l[2]||{}).duck||P2_DUCK)}]; };
const ROOTS={
  game:()=>{ const m=window.__gameMatch&&__gameMatch(); if(!m) return null; return {s:m,len:(m.moves||[]).length,opp:m.opp,diff:m.diff,humanIs:m.humanIs,turn:m.player,over:!!m.over,winner:m.winner===3?0:m.winner,online:m.online,busy:m.busy}; },
  nimGame:()=>{ const m=window.__nimState&&__nimState(); if(!m||m.preview) return null; return {s:m,len:(m.moves||[]).length,opp:m.opp,diff:m.diff,humanIs:m.humanIs,turn:m.player,over:!!m.over,winner:m.winner===3?0:m.winner,online:m.online,busy:m.busy}; },
  chGame:()=>{ const m=window.__chompState&&__chompState(); if(!m||m.preview) return null; return {s:m,len:(m.moves||[]).length,opp:m.opp,diff:m.diff,humanIs:m.humanIs,turn:m.player,over:!!m.over,winner:m.winner,online:m.online,busy:m.busy}; },
  gxGame:()=>{ const M=window.ZFX&&ZFX.M, id=ZFX.current&&ZFX.current(); if(!M||!(GX_TWO[id]||(M.def&&M.def.matchup))||M.previewOnly||M.puzzle||!M.hist||!M.hist.length) return null;
    const last=M.hist[M.hist.length-1]; let turn=1; try{ turn=M.def.actor(last); }catch(e){}
    return {s:M,len:M.hist.length-1,opp:M.opt.opp,diff:(M.def.diffs||[]).length>1||typeof M.def.diffsFor==='function'?M.opt.diff:'',level:M.levelLabel||'',humanIs:M.humanIs,turn,over:!!last.over,winner:last.over?(last.winner||0):0,online:M.online}; }
};
let peer={};   // the online opponent's duck, from the room server (online-rooms.js)
/* the one place a player's duck is drawn from who the player is: the computer is always Mansy's duck (named Computer,
   with its level), everyone else their own customized duck. The matchup, the setup card, the result dialog and the
   reactions all ask here, so no screen can fall back to a default duck for the computer. */
function duckHTML(p,o){ o=o||{}; if(!window.ZPDuck||!p) return '';
  if(p.cpu&&ZPDuck.mansy){ const lv=p.diff?diffWord(p.diff):''; return ZPDuck.mansy(Object.assign({},o,{label:o.label||`Computer${lv?', '+lv+' level':''}: Mansy’s duck`})); }
  return ZPDuck.html({nick:p.nick,duck:p.duck},o); }
function read(root){ const f=ROOTS[root]; const r=f&&f(); if(!r||!(r.opp==='ai'||r.opp==='2p'||r.opp==='online')) return null;
  const pr=profile(); let players;
  if(r.opp==='ai'){ const me={nick:pr.nick||'You',duck:pr.duck,you:true,local:true}, cpu={nick:'Computer',duck:CPU_DUCK,cpu:true};
    players=r.humanIs===2?[cpu,me]:[me,cpu]; }
  else if(r.opp==='2p'){ const L=locals(); players=[{nick:L[0].nick||'Player 1',duck:L[0].duck,local:true,slot:1},{nick:L[1].nick||'Player 2',duck:L[1].duck,local:true,slot:2}]; }
  else { const o=r.online||{}, mine=o.mySeat||r.humanIs||1;
    const me={nick:(o.myNickname&&o.myNickname.trim())||`Player ${mine}`,duck:pr.duck,you:true,local:true};
    const them={nick:(o.opponentNickname&&String(o.opponentNickname).trim())||`Player ${3-mine}`,duck:clean(peer.duck||P2_DUCK),connected:o.opponentConnected!==false,remote:true};
    players=mine===2?[them,me]:[me,them]; }
  players.forEach((p,i)=>p.seat=i+1);
  return Object.assign(r,{players,mine:r.opp==='2p'?r.turn:r.opp==='online'?((r.online||{}).mySeat||r.humanIs):r.humanIs}); }

/* ---- the row ---- */
const els={};
function rowFor(root){ if(els[root]) return els[root]; const R=$(root), stage=R&&R.querySelector('.stage'); if(!stage) return null;
  const el=document.createElement('div'); el.className='zm'; el.hidden=true; el.setAttribute('role','group'); el.setAttribute('aria-label','Players');
  el.innerHTML=`<div class="zm-p l" data-seat="1"><span class="zm-duck"></span><span class="zm-who"><span class="zm-name"></span><span class="zm-role"></span><span class="zm-sub"></span></span></div><div class="zm-mid"><div class="zm-turn" aria-live="polite"><i></i><span></span></div><div class="zm-clock" role="timer" aria-live="off"><span class="zm-bar"><i></i></span><span class="zm-secs"></span></div><div class="zm-score" role="status"></div></div><div class="zm-p r" data-seat="2"><span class="zm-duck"></span><span class="zm-who"><span class="zm-name"></span><span class="zm-role"></span><span class="zm-sub"></span></span></div>`;
  stage.insertBefore(el,stage.firstChild); els[root]={el,stage,sig:'',duckSig:['',''],turn:0}; return els[root]; }
const possessive=n=>n+(/s$/i.test(n)?'’':'’s');
function label(v){
  if(v.over){ if(!v.winner) return {t:'Draw',cls:'end'}; const w=v.players[v.winner-1], you=w.you&&v.opp!=='2p';
    if(v.timeout) return {t:you?'You won on time':`${w.nick} won on time`,cls:'end'};
    return {t:you?'You won':`${w.nick} won`,cls:'end'}; }
  const p=v.players[v.turn-1]; if(!p) return {t:'',cls:''};
  if(v.opp==='2p') return {t:`${possessive(p.nick)} turn`,cls:''};
  if(p.you) return {t:'Your turn',cls:''};
  if(p.cpu) return {t:'Computer’s turn',cls:'wait'};
  return {t:`${possessive(p.nick)} turn`,cls:'wait'}; }

/* ---- the match score ---- */
const LS_SCORE='zf-match-score', SCORE_IDLE=24*3600e3;
const slugNow=()=>location.pathname.replace(/^\/+|\/+$/g,'').split('/')[0]||'arcade';
/* who a player is for the score: you, the computer at its level, or a named player at this device */
const pid=(p,v)=>p.cpu?'cpu:'+(v.diff||''):v.opp==='ai'?'you':'p'+(p.slot||p.seat)+':'+String(p.nick||'').trim().toLowerCase();
const sigOf=v=>v.opp+'|'+v.players.map(p=>pid(p,v)).slice().sort().join('|');
function scoreRec(v){ const all=lsGet(LS_SCORE,{})||{}, sig=sigOf(v); let r=all[slugNow()];
  if(!r||r.sig!==sig||Date.now()-(r.at||0)>SCORE_IDLE) r={sig,w:{},d:0,at:Date.now()}; return r; }
function scoreSave(r){ const all=lsGet(LS_SCORE,{})||{}; r.at=Date.now(); all[slugNow()]=r; lsSet(LS_SCORE,all); }
/* the room client of an online match on screen (online-rooms.js registers each one) */
const roomOf=v=>{ const code=v&&v.online&&v.online.code; const c=(window.__zfRoomClients||[]).find(c=>c.room&&c.room.code&&(!code||c.room.code===code)); return c&&c.room; };
/* {a, b, d}: games won by the left and right player, and draws */
function score(v){ v=v||current; if(!v) return null;
  if(v.opp==='online'){ const rm=roomOf(v); return {a:rm&&rm.score?rm.score[1]||0:0,b:rm&&rm.score?rm.score[2]||0:0,d:rm&&rm.draws||0,online:true}; }
  const r=scoreRec(v), ids=v.players.map(p=>pid(p,v)); return {a:r.w[ids[0]]||0,b:r.w[ids[1]]||0,d:r.d||0}; }
function count(v,winner,len){ const r=scoreRec(v), id=winner?pid(v.players[winner-1],v):null; if(id) r.w[id]=(r.w[id]||0)+1; else r.d=(r.d||0)+1; scoreSave(r); return {sig:r.sig,id,len}; }
function uncount(c){ const all=lsGet(LS_SCORE,{})||{}, r=all[slugNow()]; if(!r||r.sig!==c.sig) return; if(c.id) r.w[c.id]=Math.max(0,(r.w[c.id]||0)-1); else r.d=Math.max(0,(r.d||0)-1); scoreSave(r); }
const drawsWord=d=>d?`${d} draw${d===1?'':'s'}`:'';
function scoreInner(v,sc,names){ const P=v.players;
  return (names?`<span>${esc(P[0].you&&v.opp!=='2p'?'You':P[0].nick)}</span>`:'<span class="zm-sk">Match</span>')+`<b data-k="a">${sc.a}</b><span aria-hidden="true">–</span><b data-k="b">${sc.b}</b>`+(names?`<span>${esc(P[1].you&&v.opp!=='2p'?'You':P[1].nick)}</span>`:'')+(sc.d?`<small>· ${drawsWord(sc.d)}</small>`:''); }
const scoreAria=(v,sc)=>`Match score: ${v.players[0].you&&v.opp!=='2p'?'you':v.players[0].nick} ${sc.a}, ${v.players[1].you&&v.opp!=='2p'?'you':v.players[1].nick} ${sc.b}${sc.d?', '+drawsWord(sc.d):''}`;
let lastSc=null;
function paintScore(v){ const sc=score(v); if(!sc) return; const key=sc.a+':'+sc.b+':'+sc.d;
  const bumped=lastSc&&lastSc.sig===sigOf(v)&&lastSc.key!==key?{a:sc.a>lastSc.a,b:sc.b>lastSc.b}:null; lastSc={sig:sigOf(v),key,a:sc.a,b:sc.b};
  const targets=[...document.querySelectorAll('.zm:not([hidden]) .zm-score')].map(e=>[e,false]).concat([...document.querySelectorAll('.zm-score-live')].map(e=>[e,true]));
  targets.forEach(([e,names])=>{ const h=scoreInner(v,sc,names); if(e.dataset.h!==h){ e.dataset.h=h; e.innerHTML=h; e.setAttribute('aria-label',scoreAria(v,sc)); }
    if(bumped&&!matchMedia('(prefers-reduced-motion: reduce)').matches) e.querySelectorAll('b').forEach(b=>{ if(bumped[b.dataset.k]){ b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump'); } }); }); }
/* the score line for another surface (the result dialog): it stays current, and bumps when a game is counted */
const scoreLine=()=>'<div class="zm-score zm-score-live" role="status"></div>';
function resetScore(){ const v=current; if(!v||v.opp==='online') return; const all=lsGet(LS_SCORE,{})||{}; delete all[slugNow()]; lsSet(LS_SCORE,all); lastSc=null; Object.values(els).forEach(b=>{ b.counted=null; }); refresh(); }
/* Settings: the score with a deliberate reset (a second press confirms). Online, the room's score cannot be reset here. */
function settingsRow(body){ const v=current; if(!v||!body) return; const row=document.createElement('div'); row.className='gs-row zm-srow';
  const online=v.opp==='online';
  row.innerHTML=`<div class="gs-label">Match score</div><div class="zm-sline"><span class="zm-score zm-score-live"></span>${online?'':'<button type="button" class="zm-reset">Reset match score</button>'}</div><p class="gs-note">${online?'The room keeps this score for both of you: games won, counted once each, with draws apart.':'Games won in this match, with draws apart. It carries on through rematches; a different opponent starts a new score.'}</p>`;
  body.appendChild(row); paintScore(v);
  const b=row.querySelector('.zm-reset'); if(b){ let t=0; b.onclick=()=>{ if(!b.classList.contains('sure')){ b.classList.add('sure'); b.textContent='Press again to reset'; clearTimeout(t); t=setTimeout(()=>{ b.classList.remove('sure'); b.textContent='Reset match score'; },3500); return; }
    clearTimeout(t); resetScore(); b.classList.remove('sure'); b.textContent='Score reset'; b.disabled=true; setTimeout(()=>{ b.disabled=false; b.textContent='Reset match score'; },1600); }; } }
/* a game lost on time (turn-timer.js): the player to move loses this game, the score counts it once, and the board
   rests until a new game. Local games only: online, the room server decides and says so. */
function timeout(seat){ const v=current; if(!v||v.over||v.opp==='online') return false; const box=els[v.root]; if(!box||box.timedOut) return false;
  box.timedOut={seat,s:v.s,len:v.len}; box.counted=Object.assign(count(v,3-seat,v.len),{timeout:true}); box.live=false;
  const R=$(v.root); if(R) R.classList.add('zm-timeout'); paint(v.root); return true; }

let current=null;
function paint(root){ const box=rowFor(root); if(!box) return; const v=read(root); const {el,stage}=box;
  if(!v){ if(!el.hidden){ el.hidden=true; stage.classList.remove('has-zm'); } if(current&&current.root===root) current=null; if(window.ZFTimer) ZFTimer.sync(root,null,null); return; }
  /* a new game (a new state object) starts fresh: nothing counted yet, nothing timed out */
  if(box.gi!==v.s){ box.gi=v.s; box.live=false; box.counted=null; if(box.timedOut){ box.timedOut=null; const R=$(root); if(R) R.classList.remove('zm-timeout'); } }
  if(box.timedOut&&(v.over||v.len!==box.timedOut.len)){ box.timedOut=null; const R=$(root); if(R) R.classList.remove('zm-timeout'); }
  if(box.timedOut){ v.over=true; v.winner=3-box.timedOut.seat; v.timeout=true; }
  if(v.opp==='online'&&v.over){ const rm=roomOf(v); if(rm&&rm.endReason==='timeout') v.timeout=true; }
  current=Object.assign({root},v);
  if(el.hidden){ el.hidden=false; stage.classList.add('has-zm'); }
  /* the score: counted once, when a game seen being played here finishes; an undo back into that game takes it back */
  if(v.opp!=='online'){
    if(v.over&&!v.timeout){ if(box.live&&!box.counted) box.counted=count(v,v.winner,v.len); }
    else if(!v.over){ if(box.counted&&!box.counted.timeout&&v.len<box.counted.len){ uncount(box.counted); box.counted=null; } box.live=true; } }
  el.classList.toggle('zm-live',!v.over);
  v.players.forEach((p,i)=>{ const side=el.children[i===0?0:2], ds=JSON.stringify(p.duck)+p.nick+(p.cpu?v.diff:'');
    /* a game can mark each seat beside the name (Connect Four: a disc in that player's colour) */
    const gdef=root==='gxGame'&&window.ZFX&&ZFX.M&&ZFX.M.def, mark=gdef&&gdef.seatMark?gdef.seatMark(i+1):'';
    if(box.duckSig[i]!==ds+mark){ box.duckSig[i]=ds+mark; side.querySelector('.zm-duck').innerHTML=duckHTML(Object.assign({diff:v.diff},p),{size:'sm',crop:'match',moods:true}); const nm=side.querySelector('.zm-name');
      if(mark) nm.innerHTML=i===0?mark+esc(p.nick):esc(p.nick)+mark; else nm.textContent=p.nick; nm.title=p.nick; }
    const sub0=p.cpu?(v.level?`AI · ${esc(v.level)}`:v.diff?`AI · ${diffWord(v.diff)}`:'AI'):p.remote?`<span class="dot${p.connected?'':' gone'}"></span>${p.connected?'Online':'Away'}`:v.opp==='2p'?'':'You';
    const sub=sub0.toLowerCase()===String(p.nick||'').toLowerCase()?'':sub0;   // never "You / You" or "Computer / Computer"
    const edit=p.local&&!v.over&&v.opp!=='online'?`<button type="button" class="zm-edit" data-edit="${i+1}" aria-label="${v.opp==='2p'?`Name and duck for ${esc(p.nick)}`:'Edit player'}">${v.opp==='2p'?'Name &amp; duck':'Edit'}</button>`:'';
    const rl=side.querySelector('.zm-role'), role=roleOf(i+1); if(rl.dataset.h!==role){ rl.dataset.h=role; rl.innerHTML=role; const word=role===XG?'X':role===OG?'O':role.replace(/<[^>]+>/g,''); rl.setAttribute('role','img'); rl.setAttribute('aria-label',word==='1st'?'Moves first':word==='2nd'?'Moves second':'Plays '+word); }
    const sw=side.querySelector('.zm-sub'), html=(sub?`<span>${sub}</span>`:'')+(sub&&edit?' ':'')+edit;
    if(sw.dataset.h!==html){ sw.dataset.h=html; sw.innerHTML=html; }
    side.classList.toggle('on',!v.over&&v.turn===i+1);
    side.setAttribute('aria-current',!v.over&&v.turn===i+1?'true':'false'); });
  const lb=label(v), tEl=el.querySelector('.zm-turn');
  if(tEl.dataset.t!==lb.t){ tEl.dataset.t=lb.t; tEl.querySelector('span').textContent=lb.t; tEl.title=lb.t; }
  tEl.className='zm-turn'+(lb.cls?' '+lb.cls:'');
  paintScore(v);
  if(window.ZFTimer) ZFTimer.sync(root,v,el.querySelector('.zm-clock'));
  /* the computer answers the result once, on its own duck: pleased when it wins, a nod to you when you win, surprised at a
     draw. Only for a game seen being played here, so a finished game reopened later stays quiet. */
  const cpuSeat=v.opp==='ai'?(v.humanIs===1?2:1):0;
  if(!v.over){ box.cpuSaw=true; box.cpuSaid=false; }
  else if(cpuSeat&&box.cpuSaw&&!box.cpuSaid){ box.cpuSaid=true; const k=v.winner===cpuSeat?'happy':v.winner?'nod':'surprised';
    setTimeout(()=>{ if(window.ZFReact&&current&&current.root===root) ZFReact._play(cpuSeat,k,true); },700); }
  /* the handover: announced once per real change of turn, never on an ordinary re-render */
  const sig=v.over?'over':v.turn+':'+v.opp;
  if(box.sig&&box.sig!==sig&&!v.over){ const d=el.children[v.turn===1?0:2].querySelector('.zm-duck'); d.classList.remove('hop'); void d.offsetWidth; d.classList.add('hop'); setTimeout(()=>d.classList.remove('hop'),500); }
  box.sig=sig;
  if(window.ZFReact) ZFReact.sync(root,el,v); }
let raf=0; const refresh=()=>{ cancelAnimationFrame(raf); raf=requestAnimationFrame(()=>Object.keys(ROOTS).forEach(r=>{ const R=$(r); if(R) paint(r); })); };
/* re-read whenever a game redraws its status, its result or its own visibility */
function watch(){ Object.keys(ROOTS).forEach(r=>{ const R=$(r); if(!R) return; const mo=new MutationObserver(refresh); mo.observe(R,{attributes:true,attributeFilter:['class']});
  const stage=R.querySelector('.stage'); if(stage) new MutationObserver(muts=>{ if(muts.some(m=>!(m.target.closest&&m.target.closest('.zm,#zfHint')))) refresh(); }).observe(stage,{childList:true,subtree:true,characterData:true}); }); refresh(); }
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',watch); else setTimeout(watch,0);
addEventListener('popstate',()=>setTimeout(refresh,60));

/* ---- before a game: who is playing, on each two-player setup screen ----
   Under the Players choice: against the computer, your card (name, duck, Customize duck) and the computer's (Mansy's
   duck, its level); two players, a card for each, kept apart in zf-match-players; online, your own card (your friend
   picks theirs when they join). Ready ducks are there from the start, so nobody has to customize anything. Names save
   as you type, a duck when Save duck is pressed in the shared creator, which opens over the setup, so the chosen mode
   and settings underneath are never touched. */
const SETUPS={ setup:['segOpp','segDiff'], nimSetup:['nOpp','nDiff'], chSetup:['cOpp','cDiff'], gxSetup:['gxOpp','gxDiff'] };
const segVal=id=>{ const b=document.querySelector('#'+id+' button.on'); return b?{v:b.dataset.v,t:b.textContent.trim()}:null; };
function setupOpp(sec){ const [o]=SETUPS[sec]; const el=$(o); if(!el) return null;
  if(sec==='gxSetup'){ const id=window.ZFX&&ZFX.current&&ZFX.current(), def=id&&ZFX.def&&ZFX.def(id); const row=$('gxRowPlayers');
    if(!(GX_TWO[id]||(def&&def.matchup))||!row||row.style.display==='none') return null; }
  const v=segVal(o); return v?v.v:null; }
function whoHTML(sec,opp){ const pr=profile(), L=locals(), [,dId]=SETUPS[sec], dv=segVal(dId), dRow=$(dId)&&$(dId).closest('.grp');
  const level=dv&&dRow&&dRow.style.display!=='none'&&$(dId).children.length>1?diffWord(dv.t):'';
  const card=(slot,lab,nick,duck,ph)=>`<div class="zm-card">${ZPDuck.html({nick:nick||ph,duck},{size:'md'})}<div class="zm-cbody"><label class="zm-clab" for="zmW-${sec}-${slot}">${lab}</label><input id="zmW-${sec}-${slot}" data-wnick="${slot}" maxlength="16" autocomplete="off" placeholder="${ph}" value="${esc(nick)}"><button type="button" class="zm-cust" data-wduck="${slot}" aria-label="Customize duck${lab?' for '+lab:''}">Customize duck</button></div></div>`;
  if(opp==='2p') return `<div class="zm-who">${card('p1','Player 1',L[0].nick,L[0].duck,'Player 1')}${card('p2','Player 2',L[1].nick,L[1].duck,'Player 2')}</div>`;
  if(opp==='online') return `<div class="zm-who">${card('me','You',pr.nick,pr.duck,'Your name')}</div><p class="e-small">Your friend picks their own name and duck when they join.</p>`;
  return `<div class="zm-who">${card('me','You',pr.nick,pr.duck,'Your name')}<div class="zm-card">${duckHTML({cpu:true,diff:dv&&dv.v},{size:'md'})}<div class="zm-cbody"><span class="zm-clab">Opponent</span><span class="zm-cname">Computer</span><span class="zm-clevel">${level?`AI · ${esc(level)}`:'AI'}</span></div></div></div>`; }
function paintWho(sec){ const S=$(sec); if(!S||!window.ZPDuck||!ZPDuck.mansy) return; const [o]=SETUPS[sec], seg=$(o), grp=seg&&seg.closest('.grp'); if(!grp) return;
  let box=grp.querySelector('.zm-whobox'); const opp=S.classList.contains('show')?setupOpp(sec):null;
  if(!opp){ if(box) box.hidden=true; return; }
  if(!box){ box=document.createElement('div'); box.className='zm-whobox'; seg.insertAdjacentElement('afterend',box); }
  const html=whoHTML(sec,opp); box.hidden=false; if(box.dataset.h===html) return;
  const a=document.activeElement, keep=a&&box.contains(a)&&a.dataset.wnick?{id:a.id,s:a.selectionStart,e:a.selectionEnd}:null;
  box.dataset.h=html; box.innerHTML=html;
  if(keep){ const f=$(keep.id); if(f){ f.focus({preventScroll:true}); try{ f.setSelectionRange(keep.s,keep.e); }catch(e){} } } }
function paintAllWho(){ Object.keys(SETUPS).forEach(paintWho); }
function saveWho(slot,patch){ if(slot==='me'){ const p=lsGet(LS_PROFILE,{})||{}; lsSet(LS_PROFILE,Object.assign(p,patch)); }
  else { const l=lsGet(LS_LOCAL,{})||{}, k=slot==='p1'?1:2, L=locals(); l[k]=Object.assign({nick:L[k-1].nick,duck:L[k-1].duck},l[k]||{},patch); lsSet(LS_LOCAL,l); }
  Object.values(els).forEach(b=>{ b.duckSig=['','']; }); refresh(); }
const whoNow=slot=>{ const pr=profile(), L=locals(); return slot==='me'?pr:slot==='p1'?L[0]:L[1]; };
document.addEventListener('input',e=>{ const t=e.target; if(!t||!t.dataset||!t.dataset.wnick) return; saveWho(t.dataset.wnick,{nick:String(t.value||'').trim().slice(0,16)}); });
document.addEventListener('change',e=>{ const t=e.target; if(t&&t.dataset&&t.dataset.wnick) paintAllWho(); });
document.addEventListener('click',e=>{ const b=e.target.closest&&e.target.closest('[data-wduck]'); if(b){ e.preventDefault(); const slot=b.dataset.wduck, w=whoNow(slot);
    customize(w.duck,w.nick||(slot==='me'?'You':slot==='p1'?'Player 1':'Player 2'),dk=>{ saveWho(slot,{duck:dk}); paintAllWho(); },b); return; }
  if(document.querySelector('.entry.show')) setTimeout(paintAllWho,0); });   // a setup may redraw the button that was clicked, so no check on the target
if(window.MutationObserver) document.addEventListener('DOMContentLoaded',()=>{ const mo=new MutationObserver(()=>paintAllWho()); Object.keys(SETUPS).forEach(id=>{ const S=$(id); if(S) mo.observe(S,{attributes:true,attributeFilter:['class']}); }); paintAllWho(); });
setTimeout(paintAllWho,0);

/* the shared duck creator in a dialog of its own: browsing changes only the draft, Save duck keeps it. Used from the
   setup cards, the in-game Players dialog and the online room dialog. Nothing under it (setup, game) is redrawn. */
function customize(duck,nick,onSave,from){ ensureDlg(); const body=dlg.querySelector('.gdialog-body'); dlg.classList.add('zmd-cr');
  dlg.querySelector('#zmdT').textContent='Customize duck'; const ret=from||document.activeElement;
  const done=()=>{ dlg.classList.remove('open','zmd-cr'); if(ret&&ret.focus) try{ ret.focus({preventScroll:true}); }catch(e){} };
  closeHook=done;
  const st=ZPDuck.newCreator(clean(duck),nick||'You',true);
  body.innerHTML=ZPDuck.creatorHTML('zm-cr1',st,{mainCls:'start',save(dk){ onSave(dk); done(); },cancel(){ done(); }});
  dlg.classList.add('open'); body.scrollTop=0; }

/* ---- names and ducks for the people at this device ---- */
let dlg=null, closeHook=null;
function ensureDlg(){ if(dlg) return; dlg=document.createElement('div'); dlg.className='gdialog zmd'; dlg.setAttribute('role','dialog'); dlg.setAttribute('aria-modal','true'); dlg.setAttribute('aria-labelledby','zmdT');
  dlg.innerHTML=`<div class="gdialog-scrim"></div><div class="gdialog-card"><div class="gdialog-head"><h3 id="zmdT">Players</h3><button type="button" class="gt" aria-label="Close" data-x>×</button></div><div class="gdialog-body"></div></div>`;
  document.body.appendChild(dlg); const x=()=>{ if(closeHook) closeHook(); else dlg.classList.remove('open'); };
  dlg.querySelector('.gdialog-scrim').onclick=x; dlg.querySelector('[data-x]').onclick=x;
  dlg.addEventListener('keydown',e=>{ if(e.key==='Escape'){ e.stopPropagation(); x(); } }); }
function openPlayers(slot){ const v=current; if(!v) return;
  const two=v.opp==='2p', pr=profile(), L=locals();
  const d={1:{nick:two?L[0].nick:pr.nick,duck:two?L[0].duck:pr.duck},2:{nick:L[1].nick,duck:L[1].duck}}, ids=two?[1,2]:[1]; let open=null;
  ensureDlg(); dlg.querySelector('#zmdT').textContent='Players';
  const close=()=>{ dlg.classList.remove('open','zmd-cr'); }; closeHook=close;
  const body=dlg.querySelector('.gdialog-body');
  const render=()=>{
    dlg.classList.toggle('zmd-cr',!!open);
    if(open){ const st=ZPDuck.newCreator(d[open].duck,d[open].nick||(two?`Player ${open}`:'You'),true);
      body.innerHTML=ZPDuck.creatorHTML('zm-cr',st,{mainCls:'start',save(dk){ d[open].duck=dk; open=null; render(); },cancel(){ open=null; render(); }}); return; }
    body.innerHTML=`<div class="zmd-rows" style="${two?'':'grid-template-columns:1fr'}">${ids.map(i=>`<div class="zmd-row"><label class="gs-label" for="zmdN${i}">${two?`Player ${i}`:'You'}</label>${ZPDuck.html({nick:d[i].nick||'Duck',duck:d[i].duck},{size:'lg'})}<input id="zmdN${i}" maxlength="16" autocomplete="off" placeholder="${two?`Player ${i}`:'Your name'}" value="${esc(d[i].nick)}"><button type="button" data-duck="${i}">Change duck</button></div>`).join('')}</div>
      <div class="zmd-acts"><button type="button" class="start" data-save>Save</button><button type="button" class="cancel" data-cancel>Cancel</button></div>`;
    ids.forEach(i=>{ const inp=body.querySelector('#zmdN'+i); inp.oninput=()=>{ d[i].nick=inp.value; }; });
    body.querySelectorAll('[data-duck]').forEach(b=>b.onclick=()=>{ open=+b.dataset.duck; render(); });
    body.querySelector('[data-cancel]').onclick=close;
    body.querySelector('[data-save]').onclick=()=>{
      if(two) lsSet(LS_LOCAL,{1:{nick:String(d[1].nick||'').trim().slice(0,16),duck:d[1].duck},2:{nick:String(d[2].nick||'').trim().slice(0,16),duck:d[2].duck}});
      else { const p=lsGet(LS_PROFILE,{})||{}; lsSet(LS_PROFILE,Object.assign(p,{nick:String(d[1].nick||'').trim().slice(0,16),duck:d[1].duck})); }
      Object.values(els).forEach(b=>{ b.duckSig=['','']; }); close(); refresh(); paintAllWho(); };
    const f=body.querySelector('#zmdN'+(slot||1)); if(f) try{ f.focus({preventScroll:true}); }catch(e){} };
  render(); dlg.classList.add('open'); }
document.addEventListener('click',e=>{ const b=e.target.closest&&e.target.closest('.zm-edit'); if(!b) return; e.preventDefault(); openPlayers(+b.dataset.edit); });

/* the name a game prints for seat p in a two-player match on one device: the name typed for that player, else Player p */
window.ZFName=p=>{ const L=locals(), n=L[p-1]&&L[p-1].nick; return n||`Player ${p}`; };
window.ZFMatch={ refresh, customize, duckHTML, paintSetup:paintAllWho, score, scoreLine, settingsRow, resetScore, timeout, roomOf, slug:slugNow, redrawDuck(seat){ Object.values(els).forEach(b=>{ b.duckSig[seat-1]=''; }); refresh(); }, current:()=>current, setPeer(p){ peer=p||{}; Object.values(els).forEach(b=>{ b.duckSig=['','']; }); refresh(); }, profile,
  duckEl(seat){ if(!current) return null; const b=els[current.root]; return b&&b.el.children[seat===1?0:2].querySelector('.zm-duck'); } };
})();
