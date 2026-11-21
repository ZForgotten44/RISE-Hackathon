/* coach.js: the guide's word on a move (good move, missed opportunity, mistake), from real analysis of the position.
   Only in practice games against the computer (hints on) and only when coaching is on (Settings: Coaching). Never in
   online matches: a hint or a note there would change the agreed conditions, and it would only reach its requester.
   What counts:
     Mistake  the move gave up a forced win, or turned a position that could not be lost into one that can (exact games)
     Careful  the move hands the opponent a winning reply that another move would not have (one move ahead, any game)
     Missed   a move that won on the spot was available and not played (one move ahead, any game)
     Good     the move keeps a forced win where few moves do (exact games), or avoids a winning reply where most moves
              would hand one over (one move ahead)
     Neutral  everything else: no interruption.
   Exact analysis (a solver) is said to be exact; a one-move look-ahead says only what it checked, never more.
   ZFCoach.level() 'all' | 'mistakes' | 'off'   ZFCoach.report(r)   ZFCoach.tactics(spec)   ZFCoach.exact(spec)
   ZFCoach.settingsRow(body) */
(function(){
'use strict';
const KEY='zf-coach', OLD='zf-move-notes';
function level(){ try{ const v=localStorage.getItem(KEY); if(v==='all'||v==='mistakes'||v==='off') return v; return localStorage.getItem(OLD)==='off'?'off':'all'; }catch(e){ return 'all'; } }
function setLevel(v){ try{ localStorage.setItem(KEY,v); localStorage.removeItem(OLD); }catch(e){} }
const MOOD={good:'happy',missed:'surprised',mistake:'surprised',careful:'surprised'};
/* r: {kind, html, more, exact} -> shows it through the guide (hint-duck.js via shell.js ZF.coach) */
/* praise stays rare enough to mean something: at most one "good move" every 20 seconds */
let lastGood=0;
function report(r){ if(!r||!r.kind) return false; const lv=level(); if(lv==='off'||(lv==='mistakes'&&r.kind==='good')) return false;
  if(r.kind==='good'){ if(Date.now()-lastGood<20000) return false; lastGood=Date.now(); }
  if(!(window.ZF&&ZF.coach)) return false;
  const how=r.exact?'Checked exactly by the solver.':'Checked one move ahead, not a full proof.';
  const html=`${r.html}<!--more-->${r.more?r.more+' ':''}<span class="zc-how">${how}</span> <button type="button" class="sdk-act">Coaching: ${lv==='all'?'mistakes only':'off'}</button>`;
  return ZF.coach(html,{mood:MOOD[r.kind],acts:[()=>{ setLevel(lv==='all'?'mistakes':'off'); if(window.ZFHintDuck) ZFHintDuck.hide(); }]}); }

/* one move ahead, for any game with legal(s), apply(s,m), and a terminal winner (s.over / winner) */
const MAX_WORK=6000;
function tactics(o){ const {s,m,n,legal,apply,mover}=o, winner=o.winner||(x=>x.over?x.winner:0), actor=o.actor||(x=>x.turn), over=o.over||(x=>!!x.over);
  if(!n||winner(n)===mover) return null;   // the move itself won: nothing to say
  let L; try{ L=legal(s); }catch(e){ return null; } if(!L||L.length<2) return null;
  /* a win on the spot that was not taken */
  const winsNow=L.filter(a=>{ try{ return winner(apply(s,a))===mover; }catch(e){ return false; } });
  if(winsNow.length) return {kind:'missed',html:'You had a winning move there.',more:`${winsNow.length>1?winsNow.length+' moves':'One move'} finished the game on the spot. Undo to find ${winsNow.length>1?'one':'it'}.`};
  if(over(n)) return null;
  const opp=actor(n); if(opp===mover) return null;   // a turn made of several steps (Pentago): judged when the turn passes
  const handsWin=x=>{ let R; try{ R=legal(x); }catch(e){ return false; } for(const b of R){ try{ const y=apply(x,b); if(winner(y)===opp) return true; if(!over(y)&&actor(y)===opp) return null; }catch(e){} } return false; };
  const mine=handsWin(n); if(mine===null) return null;
  /* two winning threats at once (a game that can show its position with the mover to move again: o.asMover) */
  if(!mine&&o.asMover){ try{ const x=o.asMover(n); let th=0; for(const a of legal(x)){ if(winner(apply(x,a))===mover) th++; }
      if(th>=2) return {kind:'good',html:`Good move. That leaves ${th===2?'two':th} winning threats.`,more:'They can only block one of them.'}; }catch(e){} }
  if(L.length*(L.length+1)>MAX_WORK) return mine?{kind:'careful',html:'Careful: that gives them a winning reply.',more:'Undo and look for a move that leaves them none.'}:null;
  let safe=0, total=0; for(const a of L){ let x; try{ x=apply(s,a); }catch(e){ continue; } if(over(x)) continue; total++; const h=handsWin(x); if(h===null) return null; if(!h) safe++; }
  if(mine&&safe>0) return {kind:'careful',html:'Careful: that gives them a winning reply.',more:`${safe===1?'Only one move':safe+' moves'} here would have left them none. Undo to try another.`};
  if(!mine&&total>=4&&safe<=Math.max(1,Math.floor(total*.34))) return {kind:'good',html:'Good move. Most moves here hand them a win; yours does not.',more:`Only ${safe} of ${total} moves ${safe===1?'avoids':'avoid'} giving them a winning reply.`};
  return null; }

/* exact: value(state) -> 1 (player to move wins), 0 (draw), -1 (player to move loses), or null when unknown.
   o.goodCount optional {good, total} for the moves that keep the best result. o.best optional text naming a move that kept it. */
function exact(o){ const vb=o.before, va=o.after;   // vb: for the mover before, va: for the mover after (negate the opponent's value)
  if(vb==null||va==null) return null;
  if(vb===1&&va<1) return {kind:'mistake',exact:true,html:va===0?'That let a forced win slip to a draw.':'That gave up a forced win.',more:o.best?`${o.best} would have kept it.`:'Undo to find the move that keeps it.'};
  if(vb===0&&va<0) return {kind:'mistake',exact:true,html:'Careful: that lets them force a win.',more:o.best?`${o.best} would have held the draw.`:'Before it, the game could not be lost. Undo to find a safer move.'};
  if(vb===1&&va===1&&o.good&&o.total>=3&&o.good<=Math.max(1,Math.floor(o.total/3))) return {kind:'good',exact:true,html:o.good===1?'Good move. It is the only one that keeps your forced win.':'Good move. It keeps your forced win.',more:o.good===1?'':`Only ${o.good} of ${o.total} moves do.`};
  return null; }

/* Settings: how much the guide says on moves (practice games against the computer only) */
function settingsRow(body){ if(!body) return; const v=window.ZFMatch&&ZFMatch.current(); if(v&&v.opp==='online') return;
  const row=document.createElement('div'); row.className='gs-row'; const cur=level();
  row.innerHTML=`<div class="gs-label">Coaching</div><div class="gs-seg" role="group" aria-label="Coaching">${[['all','Good moves and mistakes'],['mistakes','Mistakes only'],['off','Off']].map(([k,l])=>`<button type="button" data-v="${k}" class="${k===cur?'on':''}" aria-pressed="${k===cur}">${l}</button>`).join('')}</div><p class="gs-note">With hints on against the computer, the guide reacts to moves that matter, from the game's own analysis. Never in online matches.</p>`;
  row.querySelectorAll('button').forEach(b=>b.onclick=()=>{ setLevel(b.dataset.v); row.querySelectorAll('button').forEach(x=>{ x.classList.toggle('on',x===b); x.setAttribute('aria-pressed',x===b); }); });
  body.appendChild(row); }
window.ZFCoach={ level, setLevel, report, tactics, exact, settingsRow };
})();
