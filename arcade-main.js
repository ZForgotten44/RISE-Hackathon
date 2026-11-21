
/* engines (engines.js) are already on window; the AI runs in engine-worker.js */
let worker=null; try{ worker=new Worker('/engine-worker.js'); }catch(e){ worker=null; }
let jobId=0; const pending={};
if(worker) worker.onmessage=e=>{ const cb=pending[e.data.id]; if(cb){ delete pending[e.data.id]; cb(e.data.move); } };
function askAI(game,payload,diff){ return new Promise(res=>{ const id=++jobId; if(worker){ pending[id]=res; worker.postMessage({id,game,payload,diff}); } else { setTimeout(()=>{ let m=-1; if(game==='four')m=F4.choose(payload.cells.slice(),payload.p,diff); else if(game==='five')m=F5.choose(payload.cells.slice(),payload.p,diff); else if(game==='ult'){const s={cells:payload.cells.slice(),bw:payload.bw.slice(),next:payload.next,player:payload.player,winner:payload.winner,moves:[]}; m=ULT.choose(s,diff);} else if(game==='nim'){ const mm=NIM.choose(payload.h.map(x=>BigInt(x)),payload.misere,diff); m=mm?{pile:mm.pile,take:String(mm.take),leave:String(mm.leave)}:null; } else if(game==='chomp'){ m=CHOMP.choose(payload.len.slice(),payload.C,diff); } else m=C3.choose(payload.cells.slice(),payload.p,diff); res(m); },20); } }); }
let aiGen=0, aiFlight=-1; function cancelAI(){ for(const k in pending) delete pending[k]; jobId++; aiGen++; aiFlight=-1; if(window.__nimCancel) window.__nimCancel(); }

/* ---------- prefs ---------- */
const PREFS_KEY='ttt-prefs-v1', REC_KEY='ttt-record-v1';
let prefs=JSON.parse(localStorage.getItem(PREFS_KEY)||'{}');
let record=JSON.parse(localStorage.getItem(REC_KEY)||'{}');
function savePrefs(){ localStorage.setItem(PREFS_KEY,JSON.stringify(prefs)); }
function saveRecord(){ localStorage.setItem(REC_KEY,JSON.stringify(record)); }

/* Recursive Tic-Tac-Toe's Assisted/Unassisted setting: whether hovering or focusing a cell previews which board it
   sends the opponent to. A standalone preference (not tied to a match or to the Hints setting above) so toggling it
   from either the toolbar mid-game or the setup screen never resets the current match -- it only changes what
   routePreview() does on the next hover. */
let ultAssist=true; try{ ultAssist=localStorage.getItem('zf-ult-assist')!=='off'; }catch(e){}
function setUltAssist(v){ ultAssist=v; try{ localStorage.setItem('zf-ult-assist',v?'on':'off'); }catch(e){}
  if(!v) clearRoute();
  const kbd=document.querySelector('#game .kbd'); if(kbd) kbd.textContent = v ? 'hover or focus a cell to see where it sends your opponent' : 'unassisted: work out where each move sends your opponent yourself';
  const btn=document.getElementById('assistBtn'); if(btn){ btn.textContent=v?'assisted':'unassisted'; btn.setAttribute('aria-pressed',String(v)); }
  const sw=document.getElementById('segAssist'); if(sw) sw.setAttribute('aria-checked',String(v)); }
document.addEventListener('zf-theme',()=>{ if(cube) cube.draw(); });

/* ---------- marks ---------- */
const X_SVG='<svg class="mark" viewBox="0 0 20 20"><line x1="3" y1="3" x2="17" y2="17"/><line x1="17" y1="3" x2="3" y2="17"/></svg>';
const O_SVG='<svg class="mark" viewBox="0 0 20 20"><circle cx="10" cy="10" r="7"/></svg>';
const markOf=p=>p===1?X_SVG:O_SVG;
const nameOf=p=>p===1?'X':'O';

/* ---------- setup flow ---------- */
const GAMES={
  four:{ title:'4×4 Tic-Tac-Toe', howto:'Take turns placing X and O on a 4×4 grid. Get four of your marks in a row, column, or main diagonal to win.', diffs:[['easy','easy'],['medium','medium'],['hard','hard'],['perfect','perfect strategy']], note:'Perfect strategy is an exact solver. From the initial position neither side can be forced to lose, so against it the best you can do is draw — but it will take any win you hand it.',
    rules:'4×4 board. Players alternate placing X and O. Four in a complete row, column, or either main diagonal wins — ten winning lines, no wraparound. A full board with no winner is a draw.' },
  ult:{ title:'Recursive Tic-Tac-Toe', howto:'Nine small boards. The cell you pick inside a board sends your opponent to the matching board — play the top-right cell and they must play in the top-right board. Win three small boards in a line.', diffs:[['easy','easy'],['medium','medium'],['hard','hard'],['expert','expert search']], note:'Expert is a bounded search, not a proof — it is strong, not unbeatable.',
    rules:'Nine 3×3 boards arranged as a 3×3 grid. The first player may play anywhere. The cell you choose inside a small board sends your opponent to the small board in that same position. Win a small board to claim it on the large board; three claimed boards in a line wins. If the destination board is already won or full, the next player may choose any open board. A full, unwon board is neutral — it belongs to no one. All boards closed with no large-board line is a draw.' },
  cube:{ title:'3D Tic-Tac-Toe', howto:'A 3×3×3 cube of 27 positions. Get three of your marks in any straight line — along an edge, across a face, or through the middle of the cube.', diffs:[['easy','easy'],['medium','medium'],['hard','hard'],['expert','expert search']], note:'Honest note: in 3×3×3 the first player can force a win (starting in the center, by the fourth move at the latest) and a completed game cannot be a draw. So a computer playing second can never guarantee not losing. Play first and see if you can find the forced win.',
    rules:'3×3×3 cube, 27 positions. Three matching marks in any straight line win — 49 lines: 27 along the axes, 18 diagonals across planes, 4 through the body of the cube. No gravity: every empty position is available. Drag to orbit; a click that doesn\'t move the cursor places a mark.' },
};
let cur={ game:null, opp:'ai', diff:'medium', first:'human', mode:'practice' };
const setupEl=document.getElementById('setup'), homeEl=document.getElementById('home'), gameEl=document.getElementById('game');
function seg(id,val,cb){ const el=document.getElementById(id); const mark=v=>el.querySelectorAll('button').forEach(x=>{ const on=x.dataset.v===v; x.classList.toggle('on',on); x.setAttribute('aria-pressed',on?'true':'false'); }); mark(val); el.querySelectorAll('button').forEach(b=>{ b.onclick=()=>{ mark(b.dataset.v); cb(b.dataset.v); }; }); }
function swBind(el,val,cb){ el.setAttribute('aria-checked',val==='practice'); el.onclick=()=>{ const v=el.getAttribute('aria-checked')!=='true'; el.setAttribute('aria-checked',v); cb(v?'practice':'challenge'); }; }
function setEntryTitle(id,parts,short){ const h=document.getElementById(id); h.className='e-title'+(parts.length>1?' t2'+(short?' short':''):''); h.innerHTML=parts.map(p=>`<span>${p}</span>`).join(' '); h.setAttribute('aria-label',parts.join(' ')); }
const ENTRY={
  four:{title:'4×4 Tic-Tac-Toe',t:['4×4','Tic-Tac-Toe'],short:true,blurb:'Four in a row. Rows, columns, or either main diagonal.',rules:'<p>Players alternate placing X and O on a 4×4 board. Four of your marks in a complete row, column, or either main diagonal wins: ten winning lines, no wraparound. A full board with no winner is a draw.</p><p>Undo is always available.</p>'},
  ult:{title:'Recursive Tic-Tac-Toe',t:['Recursive','Tic-Tac-Toe'],blurb:'Nine small boards, one big game. Every cell you play chooses the board your opponent plays next.',rules:'<p>Nine 3×3 boards sit in a 3×3 grid. The first player may play anywhere. The cell you choose inside a small board sends your opponent to the small board in that same position. Win a small board to claim it; win three in a row to win the game.</p><p>Undo is always available.</p><p><b>Closed boards.</b> If you send your opponent to a board that is already won or full, they may play in any open board.</p><svg viewBox="0 0 120 120" aria-label="A closed destination board gives a free choice"><g fill="none" stroke="currentColor" stroke-width="1.5"><rect x="4" y="4" width="34" height="34" rx="4"/><rect x="43" y="4" width="34" height="34" rx="4"/><rect x="82" y="4" width="34" height="34" rx="4" stroke-dasharray="3 3"/><rect x="4" y="43" width="34" height="34" rx="4"/><rect x="43" y="43" width="34" height="34" rx="4"/><rect x="82" y="43" width="34" height="34" rx="4"/><rect x="4" y="82" width="34" height="34" rx="4"/><rect x="43" y="82" width="34" height="34" rx="4"/><rect x="82" y="82" width="34" height="34" rx="4"/></g><g stroke="currentColor" stroke-width="3" stroke-linecap="round"><line x1="90" y1="12" x2="108" y2="30"/><line x1="108" y1="12" x2="90" y2="30"/></g><circle cx="60" cy="60" r="4" fill="currentColor"/><path d="M60 60L96 22" stroke="currentColor" stroke-width="1.5" stroke-dasharray="3 3" fill="none"/></svg><p>Here the top-right board is already won, so the move that pointed to it gives a free choice.</p>'},
  cube:{title:'3D Tic-Tac-Toe',t:['3D','Tic-Tac-Toe'],short:true,blurb:'Three in a line inside a 3×3×3 cube: across a layer, through layers, or corner to corner.',rules:'<p>A 3×3×3 cube has 27 positions. Three matching marks in any straight line win: 49 lines in all (27 along the axes, 18 diagonals across planes, 4 through the body of the cube). There is no gravity, so every empty position is available. Drag to orbit.</p><p>Undo is always available.</p>'},
  nim:{title:'Pingala’s Piles',aka:'Nim',blurb:'Piles of tokens, two players. Take any number from one pile, and mind who takes the last one.'},
  chomp:{title:'Cacao',aka:'Chomp',blurb:'Bite a tile and everything below-left of it. The poisoned corner is the one tile nobody wants.'}
};
['nim','chomp'].forEach(k=>{ const p=k==='nim'?'nim':'ch'; { const h=document.getElementById(p+'Title'); h.textContent=ENTRY[k].title; const a=document.createElement('small'); a.className='e-aka'; a.textContent=ENTRY[k].aka; h.appendChild(a); h.setAttribute('aria-label',`${ENTRY[k].title} (${ENTRY[k].aka})`); } document.getElementById(p+'Blurb').textContent=ENTRY[k].blurb; });
function openSetup(g){
  // A direct room-invite link for ULT (no local match yet, no saved seat) must never show this fresh-entry setup
  // screen on top of the join preview — online-recursive.js's own dialog owns the whole flow, same as nimEnterFresh's
  // hasRoom guard in arcade-games.js.
  if(g==='ult' && !(match&&match.game==='ult'&&match.opp==='online') && new URLSearchParams(location.search).has('room')){
    cancelAI(); ['nimSetup','chSetup','nimGame','chGame'].forEach(i=>{ const e=document.getElementById(i); if(e) e.classList.remove('show'); });
    cur.game='ult'; homeEl.style.display='none'; setupEl.classList.remove('show'); gameEl.classList.add('show');
    return; // the room link's own join-preview/reconnect (online-recursive.js) owns the rest
  }
  ['nimSetup','chSetup','nimGame','chGame'].forEach(i=>{ const e=document.getElementById(i); if(e) e.classList.remove('show'); });
  // A live online ULT match keeps this entry screen reachable (via the in-game Settings button) but locked to it:
  // the rest of this screen configures a fresh LOCAL match, and starting one here would abandon a friend mid-game —
  // the same reason startBtn's own handler refuses to run while match.opp is 'online'.
  const liveOnline = !!(match && match.game===g && match.opp==='online');
  cur.game=g; const G=GAMES[g];
  if(!liveOnline){ const p=prefs[g]||{}; cur.opp=p.opp||'ai'; cur.diff=p.diff||G.diffs[1][0]; cur.first=p.first||'human'; cur.mode=p.mode||'practice'; }
  setEntryTitle('entryTitle',ENTRY[g].t,ENTRY[g].short); document.getElementById('entryBlurb').textContent=ENTRY[g].blurb; document.getElementById('entryRulesBody').innerHTML=ENTRY[g].rules; document.getElementById('entryRulesBox').open=false;
  document.getElementById('setupDemo').style.display=liveOnline?'none':'';
  if(!liveOnline) ZFEntry.mount(g,document.getElementById('entryDemo'));
  const sd=document.getElementById('segDiff'); sd.innerHTML=G.diffs.map(([v,l])=>`<button data-v="${v}">${l}</button>`).join('');
  const onlineBtn=document.getElementById('segOppOnline'); onlineBtn.style.display=(g==='ult'&&window.ZFOnlineUlt)?'':'none';
  document.getElementById('segOpp').querySelectorAll('button').forEach(b=>{ const v=b.dataset.v;
    b.disabled = liveOnline && v!=='online';
    b.onclick = liveOnline ? null : ()=>{ if(v==='online'){ window.ZFOnlineUlt && ZFOnlineUlt.open(); return; } cur.opp=v; refreshSetup(); };
  });
  document.getElementById('segOnlineNote').style.display=liveOnline?'':'none';
  if(liveOnline) document.getElementById('segOnlineNote').textContent=`Playing online with ${(match.online&&match.online.opponentNickname)||'your friend'} — use Leave room (below the board) to end this match.`;
  document.getElementById('segBackToGame').style.display=liveOnline?'':'none';
  document.getElementById('segBackToGame').onclick=liveOnline?(()=>{ setupEl.classList.remove('show'); gameEl.classList.add('show'); renderAll(); }):null;
  seg('segDiff',cur.diff,v=>cur.diff=v); seg('segFirst',cur.first,v=>cur.first=v); swBind(document.getElementById('segMode'),cur.mode,v=>cur.mode=v);
  document.getElementById('rowAssist').style.display = g==='ult' ? 'flex' : 'none';
  if(g==='ult') swBind(document.getElementById('segAssist'), ultAssist?'practice':'challenge', v=>setUltAssist(v==='practice'));
  document.getElementById('setupNote').textContent=G.note;
  refreshSetup(); homeEl.style.display='none'; gameEl.classList.remove('show'); setupEl.classList.add('show'); (window.gameScrollTo||(el=>el.scrollIntoView({behavior:'smooth',block:'start'})))(setupEl);
}
// The selected highlight and the rows it reveals both come from cur.opp, so they can never disagree.
function refreshSetup(){ const liveOnline=!!(match&&match.game===cur.game&&match.opp==='online'), sel=liveOnline?'online':cur.opp;
  document.getElementById('segOpp').querySelectorAll('button').forEach(b=>{ const on=b.dataset.v===sel; b.classList.toggle('on',on); b.setAttribute('aria-pressed',on?'true':'false'); });
  const ai=cur.opp==='ai'&&!liveOnline; document.getElementById('rowDiff').style.display=ai?'flex':'none'; document.getElementById('rowFirst').style.display=ai?'flex':'none'; }
document.getElementById('startBtn').onclick=()=>{ if(match&&match.opp==='online') return; prefs[cur.game]={opp:cur.opp,diff:cur.diff,first:cur.first,mode:cur.mode}; savePrefs(); startGame(); };
document.getElementById('backBtn').onclick=()=>{ cancelAI(); gameEl.classList.remove('show'); homeEl.style.display='block'; window.scrollTo({top:0,behavior:'smooth'}); };

/* ---------- generic match controller ---------- */
let match=null; let cube=null;
const statusEl=document.getElementById('status'), boardArea=document.getElementById('boardArea'), histEl=document.getElementById('hist'), resultEl=document.getElementById('result'), rulesEl=document.getElementById('rules');
document.getElementById('rulesBtn').onclick=()=>{ const rp=document.getElementById('rulesPanel'); rp.open=!rp.open; if(rp.open) rp.scrollIntoView({behavior:'smooth',block:'nearest'}); };
document.getElementById('settingsBtn').onclick=()=>{ cancelAI(); openSetup(cur.game); };
function humanPlayer(){ return match.humanIs; }
function isHumanTurn(){ return match.opp==='2p' || match.player===match.humanIs; }
function startGame(swap){
  cancelAI(); const G=GAMES[cur.game];
  let humanIs=1; if(cur.opp==='ai'){ if(cur.first==='ai') humanIs=2; else if(cur.first==='random') humanIs=Math.random()<.5?1:2; }
  if(swap && match) humanIs = 3-match.humanIs;
  match={ game:cur.game, opp:cur.opp, diff:cur.diff, mode:cur.mode, humanIs, player:1, over:false, winner:0, winLine:null, moves:[], snaps:[], view:-1, assisted:false, hint:-1 };
  document.getElementById('gTitle').textContent=G.title; document.getElementById('gMode').textContent = cur.opp==='2p' ? 'two players' : `${cur.diff} · ${cur.mode}`;
  rulesEl.textContent=G.rules; resultEl.classList.remove('show');
  document.getElementById('undoBtn').style.display='';
  document.getElementById('hintBtn').style.display = (cur.mode==='practice' && cur.opp==='ai')?'':'none';
  document.getElementById('assistBtn').style.display = cur.game==='ult'?'':'none';
  document.querySelector('#game .stage').classList.remove('ult','online'); if(cur.game==='four') initFour(); else if(cur.game==='ult') initUlt(); else initCube();
  if(cur.game==='ult') setUltAssist(ultAssist);
  match.snaps=[snapshot()]; persistUlt();
  setupEl.classList.remove('show'); gameEl.classList.add('show'); (window.gameScrollTo||(el=>el.scrollIntoView({behavior:'smooth',block:'start'})))(gameEl);
  renderAll(); maybeAI();
}
document.getElementById('restartBtn').onclick=()=>{ if(match&&match.opp==='online'){ if(match.online&&match.online.hook) match.online.hook.requestRestart(); return; } startGame(false); };
document.getElementById('rematchBtn').onclick=()=>{ if(match&&match.opp==='online'){ if(match.online&&match.online.hook) match.online.hook.requestRematch(); return; } startGame(true); };
document.getElementById('assistBtn').onclick=()=>setUltAssist(!ultAssist);
document.getElementById('undoBtn').onclick=()=>{ if(match.opp==='online'){ if(match.online&&match.online.hook) match.online.hook.requestUndo(); return; } if(match.view>=0) return; if(window.ZS) ZS.play('undo'); cancelAI(); let n = (match.opp==='ai')?2:1; if(match.opp==='ai' && match.player!==match.humanIs) n=1; while(n-- && match.snaps.length>1){ match.snaps.pop(); match.moves.pop(); } restore(match.snaps[match.snaps.length-1]); match.over=false; match.winner=0; match.winLine=null; match.assisted=true; resultEl.classList.remove('show'); persistUlt(); renderAll(); };
document.getElementById('hintBtn').onclick=async()=>{ if(match.over||match.opp==='online'||!isHumanTurn()) return; match.assisted=true; const m=await askAI(match.game==='four'?'four':match.game==='ult'?'ult':'cube', aiPayload(), match.game==='four'?'perfect':'expert'); match.hint=m; renderAll(); if(window.ZS) ZS.play('ping');
  // the 4×4 hint comes from the exact solver; the other two from the strongest search, and the duck says which
  if(window.ZF&&ZF.coach&&m!=null&&m>=0) ZF.coach(match.game==='four'?`Play the highlighted square (<b>row ${Math.floor(m/4)+1}, column ${m%4+1}</b>). The solver checked this position exactly: this move keeps the best result you can still force.`:'The highlighted cell is the computer’s pick at its strongest setting. It comes from a search, not a proof, so treat it as advice.'); };
document.getElementById('rPrev').onclick=()=>{ if(match.snaps.length<2) return; if(match.view===-1) match.view=match.snaps.length-1; if(match.view>0) match.view--; renderAll(); };
document.getElementById('rNext').onclick=()=>{ if(match.view===-1) return; if(match.view<match.snaps.length-1) match.view++; if(match.view===match.snaps.length-1) match.view=-1; renderAll(); };
function viewing(){ return match.view>=0; }
function viewState(){ return viewing()? match.snaps[match.view] : snapshot(); }

function snapshot(){ if(match.game==='ult') return {kind:'ult', s:ULT.clone(match.s), player:match.player}; return {kind:match.game, cells:match.cells.slice(), player:match.player}; }
function restore(sn){ if(sn.kind==='ult'){ match.s=ULT.clone(sn.s); match.player=match.s.player; } else { match.cells=sn.cells.slice(); match.player=sn.player; } }
function aiPayload(){ if(match.game==='ult'){ const s=match.s; return {cells:s.cells,bw:s.bw,next:s.next,player:s.player,winner:s.winner}; } return {cells:match.cells,p:match.player}; }
async function maybeAI(){ if(match.over||match.opp!=='ai'||match.player===match.humanIs||aiFlight===aiGen) return; const gen=aiGen, mine=match; aiFlight=gen; renderStatus(true); const m=await askAI(match.game==='four'?'four':match.game==='ult'?'ult':'cube', aiPayload(), match.diff); if(gen!==aiGen||match!==mine) return; aiFlight=-1; if(!match||match.over||match.player===match.humanIs) return; if(m>=0) applyMove(m,false); }
function finish(winner,line){ match.over=true; match.winner=winner; match.winLine=line; persistUlt(); const key=`${match.game}-${match.diff}`; let txt, cls;
  if(winner===3||winner===0){ txt='Draw.'; cls='draw'; } else if(match.opp==='2p'){ txt=`${window.ZFName?`${ZFName(winner)} (${nameOf(winner)})`:nameOf(winner)} wins.`; cls='2p'; } else if(winner===match.humanIs){ txt='You win.'; cls='win'; } else { txt='Computer wins.'; cls='loss'; }
  if(window.ZS) ZS.play(cls==='win'?'win':cls==='2p'?'roundend':cls==='loss'?'lose':'draw');
  if(match.opp==='ai' && match.mode==='challenge' && !match.assisted){ record[key]=record[key]||{w:0,l:0,d:0}; record[key][cls==='win'?'w':cls==='loss'?'l':'d']++; saveRecord(); }
  const rec=record[key]; const isWin=cls==='win'||cls==='2p'; const note=isWin?'':(match.mode==='challenge'?'challenge — no assistance used':match.assisted?'practice — undo or hints were used. Try again anytime.':'practice — try again anytime.'); resultEl.innerHTML=`<b>${txt}</b>${note?`<div>${note}</div>`:''}${(match.opp==='ai'&&rec)?`<div class="record">challenge record vs ${match.diff}: ${rec.w}W ${rec.l}L ${rec.d}D</div>`:''}`; resultEl.classList.add('show'); }
/* the guide's word on your move (coach.js), practice against the computer only: exact for 4×4 once the solver is quick
   (11 or fewer empty squares), otherwise one move ahead */
function judgeMove(m){ if(!window.ZFCoach||ZFCoach.level()==='off'||match.opp!=='ai'||match.mode!=='practice'||match.player!==match.humanIs) return null;
  try{
    if(match.game==='ult'){ if(!ULT.legal(match.s).includes(m)) return null; const s=match.s, ap=(x,a)=>{ const c=ULT.clone(x); ULT.play(c,a); return c; };
      return ZFCoach.tactics({s,m,n:ap(s,m),legal:x=>ULT.legal(x),apply:ap,actor:x=>x.player,over:x=>!!x.winner,winner:x=>x.winner===1||x.winner===2?x.winner:0,mover:match.player}); }
    const E=match.game==='four'?F4:C3, p=match.player, cells=match.cells; if(!cells||cells[m]) return null;
    if(match.game==='four'&&F4.empties(cells)<=11){ const r=F4.exactMoves(cells.slice(),p), mine=r.all.find(x=>x.i===m); if(!mine) return null;
      return ZFCoach.exact({before:r.best,after:mine.v,good:r.moves.length,total:r.all.length}); }
    const ap=(x,a)=>{ const c=x.cells.slice(); c[a]=x.turn; const w=E.winLine(c,x.turn)?x.turn:0; return {cells:c,turn:3-x.turn,winner:w,over:!!w||c.every(v=>v)}; };
    const s0={cells:cells.slice(),turn:p}; return ZFCoach.tactics({s:s0,m,n:ap(s0,m),legal:x=>x.cells.map((v,i)=>v?-1:i).filter(i=>i>=0),apply:ap,asMover:x=>Object.assign({},x,{turn:p}),mover:p});
  }catch(e){ return null; } }
function applyMove(m,byHuman){
  if(match.over||viewing()) return; match.hint=-1;
  if(byHuman!==false&&match.opp==='ai'){ const note=judgeMove(m); if(note) setTimeout(()=>ZFCoach.report(note),0); }
  if(match.game==='ult'){
    if(match.opp==='online'){ if(byHuman && !match.busy && match.online && match.online.hook) match.online.hook.proposeMove(m); return; }
    const s=match.s; if(!ULT.legal(s).includes(m)) return; if(window.ZS){ if(byHuman===false) setTimeout(()=>ZS.play('wood'),160); else ZS.play('wood'); } ULT.play(s,m); match.player=s.player; match.moves.push(m); match.snaps.push(snapshot()); persistUlt(); renderAll(); if(s.winner){ finish(s.winner, s.winner<3?ULT.macroWinLine(s,s.winner):null); renderAll(); return; } maybeAI(); return; }
  const E = match.game==='four'?F4:C3; const cells=match.cells; if(cells[m]) return; const p=match.player; if(window.ZS){ if(byHuman===false) setTimeout(()=>ZS.play('wood'),160); else ZS.play('wood'); } cells[m]=p; match.moves.push(m); const wl=E.winLine(cells,p); match.player=3-p; match.snaps.push(snapshot());
  if(wl){ finish(p,wl); } else if(cells.every(v=>v)){ finish(3,null); }
  renderAll(); if(!match.over) maybeAI();
}
function renderAll(){ renderStatus(false); renderHist(); const ub=document.getElementById('undoBtn'); if(ub) ub.disabled = match.snaps.length<=1; if(match.game==='four') renderFour(); else if(match.game==='ult') renderUlt(); else renderCubeAll(); }
function renderStatus(thinking){
  if(!match) return; const st=viewState(); const p=st.player; let s='';
  if(viewing()) s=`<span>replay — move ${match.view} of ${match.snaps.length-1}</span>`;
  else if(match.over){ s = match.winner===3 ? 'Game over — draw.' : `Game over — ${nameOf(match.winner)} wins.`; }
  else { const oppName=(match.online&&match.online.opponentNickname)||'your friend'; const who = match.opp==='2p' ? `${nameOf(p)} to move` : match.opp==='online' ? (p===match.humanIs ? `Your turn — you are ${nameOf(p)}` : `${oppName}'s turn`) : (p===match.humanIs ? `Your turn — you are ${nameOf(p)}` : `${nameOf(p)} is thinking…`); const cond = match.game==='four'?'4 IN A LINE WINS':match.game==='ult'?'3 BOARDS IN A LINE WINS':'3 IN A LINE WINS'; s=`<span class="who">${markOf(p).replace('class="mark"','class="mark" style="width:18px;height:18px"')}${who}</span><span class="cond">${cond}</span>`; if(match.game==='ult' && !viewing()){ s += `<span style="color:var(--g5)">${ultWhere(match.s)}</span>`; } if(thinking||(match.opp==='ai'&&p!==match.humanIs)) s+=`<span class="think">searching</span>`; }
  statusEl.innerHTML=s;
}
function renderHist(){ const lab=m=>describeMove(m); histEl.innerHTML = match.moves.map((m,i)=>`<span class="${(viewing()?match.view===i+1:i===match.moves.length-1)?'cur':''}" data-i="${i+1}">${i+1}. ${lab(m,i)}</span>`).join('<br>') || '<span style="color:var(--g4)">no moves yet</span>'; histEl.querySelectorAll('span[data-i]').forEach(sp=>sp.onclick=()=>{ const i=+sp.dataset.i; match.view = i===match.snaps.length-1 ? -1 : i; renderAll(); }); }
function describeMove(m,i){ const p = i%2===0 ? (match.game==='ult'?1:1) : 2; const who=nameOf(match.snaps[i]?match.snaps[i].player:p); if(match.game==='four') return `${who} ${'abcd'[m%4]}${Math.floor(m/4)+1}`; if(match.game==='ult') return `${who} board ${Math.floor(m/9)+1}, cell ${m%9+1}`; return `${who} L${Math.floor(m/9)+1} r${Math.floor(m/3)%3+1} c${m%3+1}`; }

/* ---------- 4x4 ---------- */
function initFour(){ match.cells=new Array(16).fill(0); boardArea.innerHTML=`<div class="b4" id="b4" role="grid" aria-label="4 by 4 board"></div><div class="kbd">keyboard: tab/arrows to a cell, enter to place</div>`; const b=document.getElementById('b4'); for(let i=0;i<16;i++){ const c=document.createElement('button'); c.className='cell'; c.dataset.i=i; c.setAttribute('aria-label',`cell ${'abcd'[i%4]}${Math.floor(i/4)+1}`); c.onclick=()=>{ if(isHumanTurn()) applyMove(i,true); }; b.appendChild(c); } gridKeys(b,4); }
function renderFour(){ const st=viewState(); const cells=st.cells; const b=document.getElementById('b4'); b.className='b4 turn-'+(st.player===1?'x':'o'); const last=match.moves.length?(viewing()?match.moves[match.view-1]:match.moves[match.moves.length-1]):-1;
  b.querySelectorAll('.cell').forEach(c=>{ const i=+c.dataset.i; const v=cells[i]; c.className='cell'; if(v){ c.classList.add('filled'); c.innerHTML=markOf(v); } else { c.innerHTML=`<span class="ghost">${markOf(st.player)}</span>`; } if(i===last) c.classList.add('last'); if(match.over&&match.winLine&&match.winLine.includes(i)&&!viewing()) c.classList.add('win'); if(match.hint===i) c.classList.add('hint'); if(cube&&cube.sel===i&&cube.showSel&&!match.over) c.classList.add('sel'); if(match.over||viewing()||!isHumanTurn()) c.classList.add('disabled'); }); }
function gridKeys(b,n){ b.addEventListener('keydown',e=>{ const c=document.activeElement; if(!c.classList||!c.classList.contains('cell')) return; let i=+c.dataset.i; const d={ArrowLeft:-1,ArrowRight:1,ArrowUp:-n,ArrowDown:n}[e.key]; if(d===undefined) return; e.preventDefault(); i=(i+d+n*n)%(n*n); const t=b.querySelector(`.cell[data-i="${i}"]`); if(t) t.focus(); }); }

/* ---------- ultimate ---------- */
function initUlt(){ match.s=ULT.newState(); match.player=1; document.querySelector('#game .stage').classList.add('ult'); boardArea.innerHTML=`<div class="ult-wrap"><div class="bu" id="bu"></div><svg class="ult-svg" id="ultSvg"></svg></div><div class="routehint" id="routehint"></div><div class="kbd">hover or focus a cell to see where it sends your opponent</div>`; const bu=document.getElementById('bu');
  for(let b=0;b<9;b++){ const mini=document.createElement('div'); mini.className='mini'; mini.dataset.b=b; for(let c=0;c<9;c++){ const cell=document.createElement('button'); cell.className='cell'; cell.dataset.i=b*9+c; cell.setAttribute('aria-label',`board ${b+1} cell ${c+1}`); cell.onclick=()=>{ if(isHumanTurn()) applyMove(b*9+c,true); }; cell.addEventListener('mouseenter',()=>routePreview(b*9+c)); cell.addEventListener('focus',()=>routePreview(b*9+c)); cell.addEventListener('mouseleave',clearRoute); cell.addEventListener('blur',clearRoute); mini.appendChild(cell); } const owner=document.createElement('div'); owner.className='owner'; mini.appendChild(owner); bu.appendChild(mini); } }
function ultWhere(s){ if(s.winner) return ''; if(s.next===-1) return 'free move — choose any open board'; const names=['top-left','top','top-right','left','center','right','bottom-left','bottom','bottom-right']; return `${names[s.next]} board`; }
function routePreview(i){ if(!match||match.over||viewing()) return; const s=match.s; if(!ULT.legal(s).includes(i)) return; const c=i%9; const dest=c; const hint=document.getElementById('routehint'); const bu=document.getElementById('bu'); const svg=document.getElementById('ultSvg'); const cellEl=bu.querySelector(`.cell[data-i="${i}"]`); const wr=cellEl.closest('.ult-wrap').getBoundingClientRect(); const cr=cellEl.getBoundingClientRect();
  if(s.bw[dest]!==0){ hint.textContent='Sends opponent to a closed board — they may choose any open board.'; svg.innerHTML=''; return; }
  const dm=bu.querySelector(`.mini[data-b="${dest}"]`); dm.classList.add('dest'); const dr=dm.getBoundingClientRect(); const x1=cr.left+cr.width/2-wr.left, y1=cr.top+cr.height/2-wr.top, x2=dr.left+dr.width/2-wr.left, y2=dr.top+dr.height/2-wr.top;
  svg.innerHTML = (Math.floor(i/9)===dest) ? '' : `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/><circle cx="${x2}" cy="${y2}" r="3"/>`;
  const names=['top-left','top','top-right','left','center','right','bottom-left','bottom','bottom-right']; hint.textContent = `Sends opponent to the ${names[dest]} board.`; }
function clearRoute(){ const bu=document.getElementById('bu'); if(!bu) return; bu.querySelectorAll('.mini').forEach(m=>m.classList.remove('dest')); document.getElementById('ultSvg').innerHTML=''; const h=document.getElementById('routehint'); if(h) h.textContent=''; }
function renderUlt(){ const st=viewState(); const s=st.s; const bu=document.getElementById('bu'); const legal=(match.over||viewing())?[]:ULT.legal(s); const last=match.moves.length?(viewing()?match.moves[match.view-1]:match.moves[match.moves.length-1]):-1; const human=isHumanTurn()&&!match.busy; bu.dataset.turn=s.player;
  /* only what changed is touched: a mark that is already drawn is never rebuilt, so nothing replays its animation and nothing flickers */
  bu.querySelectorAll('.mini').forEach(mini=>{ const b=+mini.dataset.b; const active = !match.over && !viewing() && (s.next===b || (s.next===-1 && s.bw[b]===0));
    mini.classList.toggle('active',active); mini.classList.toggle('closed',!!s.bw[b]); mini.classList.toggle('neutral',s.bw[b]===3);
    mini.style.borderColor = (match.over&&match.winLine&&match.winLine.includes(b)&&!viewing())?'var(--fg)':'';
    const owner=mini.querySelector('.owner'); const ov=String(s.bw[b]); if(owner._v!==ov){ owner._v=ov; owner.style.display = s.bw[b]?'flex':'none'; owner.innerHTML = s.bw[b]===3?'neutral':(s.bw[b]?markOf(s.bw[b]):''); }
    mini.querySelectorAll('.cell').forEach(cell=>{ const i=+cell.dataset.i; const v=s.cells[i]; const prev=cell._v||0;
      if(prev!==v||(!v&&!cell._g)){ cell._v=v; if(v){ cell._g=false; cell.innerHTML=markOf(v); } else { cell._g=true; cell.innerHTML=`<span class="ghost gx">${markOf(1)}</span><span class="ghost go">${markOf(2)}</span>`; } }
      cell.classList.toggle('filled',!!v); cell.classList.toggle('new',!!v&&i===last&&(prev===0||cell.classList.contains('new'))); cell.classList.toggle('last',i===last); cell.classList.toggle('hint',match.hint===i);
      cell.classList.toggle('disabled',!legal.includes(i)||!human); }); }); }

/* ---------- 3D cube ----------
   One projection drives everything: layer plates, the 3x3 grid on each plate, marks, hover preview, cursor and the winning line.
   Cells sit at integer (x,y) on layer z; their borders are at half-integers, so a mark at project(x,y,z) is always at its cell's centre. */
const IC={
  cube:'<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3.5 20 8v8l-8 4.5L4 16V8Z"/><path d="M4 8l8 4.5L20 8M12 12.5v8"/></svg>',
  flat:'<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3.5" y="3.5" width="7" height="7" rx="1.6"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.6"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.6"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.6"/></svg>',
  top:'<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4.5" y="4.5" width="15" height="15" rx="2.4"/><path d="M9.5 4.5v15M14.5 4.5v15M4.5 9.5h15M4.5 14.5h15" stroke-width="1.3"/></svg>',
  reset:'<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3.5 12a8.5 8.5 0 0 1 14.6-5.9L20.5 8.5"/><path d="M20.5 3.5v5h-5"/><circle cx="12" cy="12" r="2.4"/></svg>',
  zin:'<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2M11 8v6M8 11h6"/></svg>',
  zout:'<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2M8 11h6"/></svg>',
  help:'<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M9.6 9.6a2.5 2.5 0 1 1 3.4 2.3c-.7.3-1 .8-1 1.5M12 16.6v.1"/></svg>',
  win:'<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 19 19 5"/><circle cx="5" cy="19" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="5" r="1.6"/></svg>'
};
function initCube(){ match.cells=new Array(27).fill(0);
  /* the cube and the flat board live in their own separate wrappers (#c3wrap, #c3flatwrap), both plain children of
     #c3shell. Only #c3wrap is ever given a JS-computed width, and only while the cube is the visible one — so the
     flat layout's own CSS (.c3-flatwrap) always governs its size, with nothing left over from the other view. */
  boardArea.innerHTML=`<div class="c3-shell" id="c3shell">
  <div class="c3-view" role="toolbar" aria-label="View controls">
    <div class="c3-seg" role="group" aria-label="Board view"><button type="button" id="vCube" data-tip="Cube view" aria-pressed="false">${IC.cube}<span>Cube</span></button><button type="button" id="vFlat" class="on" data-tip="Flat view: three boards side by side" aria-pressed="true">${IC.flat}<span>Flat</span></button></div>
    <span class="c3-cam"><button type="button" class="gt" id="camZout" data-tip="Zoom out" aria-label="Zoom out">${IC.zout}</button><button type="button" class="gt" id="camZin" data-tip="Zoom in" aria-label="Zoom in">${IC.zin}</button><button type="button" class="gt" id="camTop" data-tip="Top view" aria-label="Top view">${IC.top}</button><button type="button" class="gt" id="camReset" data-tip="Reset view (keeps the game)" aria-label="Reset view (the game is kept)">${IC.reset}</button><button type="button" class="gt" id="camHelp" data-tip="Show cube controls" aria-label="Show cube controls">${IC.help}</button><button type="button" class="gt" id="viewWin" data-tip="View winning line" aria-label="View winning line" style="display:none">${IC.win}</button></span>
  </div>
  <div class="c3-hint" id="c3hint" role="note"></div>
  <div class="c3-wrap" id="c3wrap" style="display:none"><canvas class="c3-canvas" id="c3" aria-label="3D board: three layers of 3 by 3 cells. Drag to orbit, arrow keys move, Enter places"></canvas>
  <div class="selinfo" id="selinfo" style="display:none">arrows move the cursor · [ ] change layer · enter places</div></div>
  <div class="c3-flatwrap" id="c3flatwrap"><div class="flat" id="flat"></div></div>
  </div>`;
  const flat=document.getElementById('flat'), LAB=['Bottom','Middle','Top'];
  for(let z=2;z>=0;z--){ const lay=document.createElement('div'); lay.className='layer'; lay.innerHTML=`<div class="lab">${LAB[z]}</div>`; const b3=document.createElement('div'); b3.className='b3'; for(let y=0;y<3;y++)for(let x=0;x<3;x++){ const i=x*9+y*3+z; const c=document.createElement('button'); c.className='cell'; c.dataset.i=i; c.setAttribute('aria-label',`${LAB[z]} board, row ${y+1}, column ${x+1}`); c.onclick=()=>{ if(cube) cube.sel=i; if(isHumanTurn()) applyMove(i,true); }; c.onfocus=()=>{ if(cube){ cube.sel=i; } }; b3.appendChild(c); } lay.appendChild(b3); flat.appendChild(lay); }
  flat.setAttribute('role','group'); flat.setAttribute('aria-label','Three boards: top, middle, bottom');
  cube=makeCube(document.getElementById('c3'));

  const touch=matchMedia('(pointer: coarse)').matches, hint=document.getElementById('c3hint');
  hint.textContent=touch?'Drag to rotate · Pinch or use + / − to zoom · Tap a cell twice to place · Reset view to recenter':'Drag to rotate · Scroll or use + / − to zoom · Reset view to recenter';
  const fadeHint=()=>hint.classList.add('faded'); cube.onInteract=fadeHint;
  const setView=(flatOn,skipRender)=>{ document.getElementById('vCube').classList.toggle('on',!flatOn); document.getElementById('vFlat').classList.toggle('on',flatOn); document.getElementById('vCube').setAttribute('aria-pressed',!flatOn); document.getElementById('vFlat').setAttribute('aria-pressed',flatOn);
    document.getElementById('c3wrap').style.display=flatOn?'none':''; document.getElementById('c3flatwrap').style.display=flatOn?'':'none';
    document.getElementById('selinfo').style.display=flatOn?'none':''; hint.style.display=flatOn?'none':''; document.querySelector('#c3shell .c3-cam').style.display=flatOn?'none':'';
    if(!flatOn){ hint.classList.remove('faded'); fitCubeWrap(); } else if(!skipRender) renderCubeAll(); };
  document.getElementById('vCube').onclick=()=>setView(false); document.getElementById('vFlat').onclick=()=>setView(true);
  document.getElementById('camReset').onclick=()=>{ fitCubeWrap(); cube.setCam(0.5,0.62,1); fadeHint(); }; document.getElementById('camTop').onclick=()=>{ cube.setCam(0,1.3,1); fadeHint(); };
  document.getElementById('camZin').onclick=()=>{ cube.zoomBy(1.2); fadeHint(); }; document.getElementById('camZout').onclick=()=>{ cube.zoomBy(1/1.2); fadeHint(); };
  document.getElementById('camHelp').onclick=()=>hint.classList.toggle('faded');
  document.getElementById('viewWin').onclick=()=>{ if(match.winLine) cube.viewLine(match.winLine); };
  /* one tooltip element, placed below whichever view control is hovered or focused and kept inside the viewport */
  let tip=document.getElementById('c3tip'); if(!tip){ tip=document.createElement('div'); tip.id='c3tip'; tip.setAttribute('role','tooltip'); document.body.appendChild(tip); }
  const showTip=el=>{ tip.textContent=el.dataset.tip; tip.classList.add('show'); const r=el.getBoundingClientRect(), w=tip.offsetWidth; tip.style.left=Math.round(Math.max(8,Math.min(innerWidth-w-8,r.left+r.width/2-w/2)))+'px'; tip.style.top=Math.round(r.bottom+8)+'px'; };
  const hideTip=()=>tip.classList.remove('show');
  document.querySelectorAll('#c3shell [data-tip]').forEach(b=>{ b.addEventListener('pointerenter',e=>{ if(e.pointerType!=='touch') showTip(b); }); b.addEventListener('pointerleave',hideTip); b.addEventListener('focus',()=>{ if(b.matches(':focus-visible')) showTip(b); }); b.addEventListener('blur',hideTip); b.addEventListener('click',()=>{ if(!b.matches(':focus-visible')) hideTip(); }); });
  document.addEventListener('keydown',e=>{ if(e.key==='Escape') hideTip(); });
  setView(true,true);
}
function fitCubeWrap(){ const wrap=document.getElementById('c3wrap'), canvas=document.getElementById('c3'); if(!wrap||!canvas||wrap.style.display==='none') return; const area=document.getElementById('boardArea');
  /* the view-row and hint line above the canvas can wrap differently at different widths, which moves the canvas's own top —
     so the fit is solved by a few passes (each one measuring the real, current layout) rather than a single guess. */
  let size=Math.min((area?area.clientWidth:wrap.clientWidth)||320,720);
  for(let i=0;i<4;i++){ wrap.style.width=size+'px'; const availW=(area?area.clientWidth:wrap.clientWidth)||320; const top=canvas.getBoundingClientRect().top; const availH=innerHeight-top-24;
    const next=Math.max(220,Math.min(availW,availH,720)); if(Math.abs(next-size)<2){ size=next; break; } size=next; }
  wrap.style.width=size+'px'; if(cube) cube.draw(); }
function makeCube(canvas){
  const ctx=canvas.getContext('2d'); const st={ yaw:0.5, pitch:0.62, zoom:1, layer:-1, sel:13, hover:-1, showSel:false, draw, setCam, viewLine, zoomBy, onInteract:null, _e:0.85 };
  function size(){ const r=canvas.getBoundingClientRect(); const dpr=devicePixelRatio||1; if(canvas.width!==Math.round(r.width*dpr)){ canvas.width=Math.round(r.width*dpr); canvas.height=Math.round(r.height*dpr); } return [r.width,r.height,dpr]; }
  function coords(i){ return [Math.floor(i/9), Math.floor(i/3)%3, i%3]; } // x,y,z (z = layer)
  /* z is up. yaw turns the cube about the vertical axis; pitch is the camera's elevation (0 side-on, 1.57 straight down). Larger depth = nearer the camera. */
  function project(x,y,z,w,h){ const sp=1+st._e*1.2; const X=x-1, Y=y-1, Z=(z-1)*sp; const cy=Math.cos(st.yaw), sy=Math.sin(st.yaw); const rx=X*cy-Y*sy, ry=X*sy+Y*cy; const ce=Math.cos(st.pitch), se=Math.sin(st.pitch); const scale=Math.min(w,h)*0.15*st.zoom; return {sx:w/2+rx*scale, sy:h/2+(ry*se-Z*ce)*scale+0*h, depth:ry*ce+Z*se}; }
  let dim=[1,1]; const P=(x,y,z)=>project(x,y,z,dim[0],dim[1]);
  const poly=(pts,close)=>{ ctx.beginPath(); pts.forEach((p,i)=>i?ctx.lineTo(p.sx,p.sy):ctx.moveTo(p.sx,p.sy)); if(close) ctx.closePath(); };
  const quad=(x,y,z,k)=>[[-k,-k],[k,-k],[k,k],[-k,k]].map(([a,b])=>P(x+a,y+b,z));
  function mark(v,x,y,z,alpha,lw){ ctx.globalAlpha=alpha; ctx.lineCap='round'; ctx.lineJoin='round'; ctx.lineWidth=lw;
    if(v===1){ const a=P(x-.25,y-.25,z), b=P(x+.25,y+.25,z), c=P(x+.25,y-.25,z), d=P(x-.25,y+.25,z); ctx.beginPath(); ctx.moveTo(a.sx,a.sy); ctx.lineTo(b.sx,b.sy); ctx.moveTo(c.sx,c.sy); ctx.lineTo(d.sx,d.sy); ctx.stroke(); }
    else { const pts=[]; for(let k=0;k<=32;k++){ const t=k/32*Math.PI*2; pts.push(P(x+Math.cos(t)*.28,y+Math.sin(t)*.28,z)); } poly(pts,true); ctx.stroke(); } ctx.globalAlpha=1; }
  function inPoly(pts,px,py){ let c=false; for(let i=0,j=pts.length-1;i<pts.length;j=i++){ const a=pts[i],b=pts[j]; if((a.sy>py)!==(b.sy>py)&&px<(b.sx-a.sx)*(py-a.sy)/(b.sy-a.sy)+a.sx) c=!c; } return c; }
  function cellAt(px,py){ dim=size().slice(0,2); const order=[0,1,2].map(z=>({z,d:P(1,1,z).depth})).sort((a,b)=>b.d-a.d); for(const {z} of order){ for(let x=0;x<3;x++)for(let y=0;y<3;y++){ if(inPoly(quad(x,y,z,.5),px,py)) return x*9+y*3+z; } } return -1; }
  function draw(){ const [w,h,dpr]=size(); dim=[w,h]; ctx.setTransform(dpr,0,0,dpr,0,0); ctx.clearRect(0,0,w,h); const cs=getComputedStyle(document.body); const fg=cs.getPropertyValue('--fg').trim()||'#fff', bg=cs.getPropertyValue('--bg').trim()||'#000', g4=cs.getPropertyValue('--g4').trim()||'#666';
    const cells = match&&match.game==='cube' ? viewState().cells : new Array(27).fill(0); const vs=match&&match.game==='cube'?viewState():null; const player=vs?vs.player:1; const human=match&&match.game==='cube'&&!match.over&&!viewing()&&isHumanTurn();
    const selZ=coords(st.sel)[2]; const pv=human?(st.hover>=0?st.hover:(st.showSel?st.sel:-1)):-1;
    const order=[0,1,2].map(z=>({z,d:P(1,1,z).depth})).sort((a,b)=>a.d-b.d); const mk=Math.max(2,Math.min(w,h)*0.0062)*st.zoom;
    for(const {z} of order){ if(st.layer>=0&&st.layer!==z) continue; const on=z===selZ&&human;
      const plate=[[-.5,-.5],[2.5,-.5],[2.5,2.5],[-.5,2.5]].map(([x,y])=>P(x,y,z)); poly(plate,true); ctx.globalAlpha=.8; ctx.fillStyle=bg; ctx.fill(); ctx.globalAlpha=1;
      ctx.strokeStyle=g4; ctx.lineWidth=1; ctx.lineCap='butt'; for(let k=0;k<2;k++){ const t=.5+k; const a=P(t,-.5,z), b=P(t,2.5,z), c=P(-.5,t,z), d=P(2.5,t,z); ctx.beginPath(); ctx.moveTo(a.sx,a.sy); ctx.lineTo(b.sx,b.sy); ctx.moveTo(c.sx,c.sy); ctx.lineTo(d.sx,d.sy); ctx.stroke(); }
      poly(plate,true); ctx.strokeStyle=fg; ctx.globalAlpha=on?1:.62; ctx.lineWidth=on?2.4:1.8; ctx.lineJoin='round'; ctx.stroke(); ctx.globalAlpha=1;
      for(let x=0;x<3;x++)for(let y=0;y<3;y++){ const i=x*9+y*3+z, v=cells[i]; ctx.strokeStyle=fg; if(v) mark(v,x,y,z,1,mk); }
      if(pv>=0&&coords(pv)[2]===z&&!cells[pv]){ const [x,y]=coords(pv); poly(quad(x,y,z,.44),true); ctx.strokeStyle=fg; ctx.lineWidth=1.6; ctx.globalAlpha=.85; ctx.setLineDash(st.hover===pv?[]:[4,4]); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha=1; ctx.strokeStyle=fg; mark(player,x,y,z,.3,mk); }
      if(match&&match.hint>=0&&coords(match.hint)[2]===z&&!cells[match.hint]){ const [x,y]=coords(match.hint); poly(quad(x,y,z,.46),true); ctx.strokeStyle=fg; ctx.lineWidth=2.6; ctx.setLineDash([5,4]); ctx.stroke(); ctx.setLineDash([]); } }
    st.projected=true;
    if(match&&match.over&&match.winLine&&!viewing()){ const pts=match.winLine.map(i=>{const [x,y,z]=coords(i);return P(x,y,z);}); poly([pts[0],pts[2]],false); ctx.strokeStyle=fg; ctx.lineWidth=mk*1.9; ctx.lineCap='round'; ctx.stroke(); pts.forEach(p=>{ ctx.beginPath(); ctx.arc(p.sx,p.sy,mk*1.4,0,Math.PI*2); ctx.fillStyle=fg; ctx.fill(); }); }
    const [x,y,z]=coords(st.sel); const si=document.getElementById('selinfo'); if(si) si.textContent=`cursor: ${['bottom','middle','top'][z]} board, row ${y+1}, column ${x+1} · arrows move · [ ] change board · enter places`;
  }
  function zoomBy(f){ st.zoom=Math.max(.6,Math.min(1.8,st.zoom*f)); draw(); }
  function setCam(yaw,pitch,zoom){ const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches; if(reduce){ st.yaw=yaw; st.pitch=pitch; st.zoom=zoom; draw(); return; } const s0={yaw:st.yaw,pitch:st.pitch,zoom:st.zoom}; const t0=performance.now(); (function step(now){ const t=Math.min(1,(now-t0)/450); const e=t<.5?2*t*t:-1+(4-2*t)*t; st.yaw=s0.yaw+(yaw-s0.yaw)*e; st.pitch=s0.pitch+(pitch-s0.pitch)*e; st.zoom=s0.zoom+(zoom-s0.zoom)*e; draw(); if(t<1) requestAnimationFrame(step); })(t0); }
  function viewLine(line){ /* choose the camera that shows the three marks spread furthest apart */ const a=coords(line[0]), b=coords(line[2]); const [w,h]=size(); dim=[w,h]; const keep={yaw:st.yaw,pitch:st.pitch}; let best=null;
    for(let yw=-3.14;yw<3.14;yw+=0.12) for(let pt=0.15;pt<1.45;pt+=0.1){ st.yaw=yw; st.pitch=pt; const p=P(a[0],a[1],a[2]), q=P(b[0],b[1],b[2]); const d=Math.hypot(p.sx-q.sx,p.sy-q.sy)-Math.abs(yw-keep.yaw)*.4-Math.abs(pt-.62)*8; if(!best||d>best.d) best={d,yaw:yw,pitch:pt}; }
    st.yaw=keep.yaw; st.pitch=keep.pitch; setCam(best.yaw,best.pitch,1.05); }
  let dragging=false, moved=false, lx=0, ly=0; const ptrs=new Map(); let pinch=0;
  const pdist=()=>{ const [a,b]=[...ptrs.values()]; return Math.hypot(a.x-b.x,a.y-b.y); };
  canvas.addEventListener('pointerdown',e=>{ ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY}); if(ptrs.size===2){ pinch=pdist(); moved=true; dragging=false; } else { dragging=true; moved=false; lx=e.clientX; ly=e.clientY; } try{ canvas.setPointerCapture(e.pointerId); }catch(_){} });
  canvas.addEventListener('pointermove',e=>{ if(ptrs.has(e.pointerId)) ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(ptrs.size===2){ const d=pdist(); if(pinch>0&&d>0){ st.zoom=Math.max(.6,Math.min(1.8,st.zoom*d/pinch)); draw(); if(st.onInteract) st.onInteract(); } pinch=d; return; }
    if(dragging){ const dx=e.clientX-lx, dy=e.clientY-ly; if(Math.abs(dx)+Math.abs(dy)>4) moved=true; if(moved){ st.yaw+=dx*0.01; st.pitch=Math.max(0.08,Math.min(1.5,st.pitch+dy*0.01)); lx=e.clientX; ly=e.clientY; st.hover=-1; draw(); if(st.onInteract) st.onInteract(); } return; }
    if(e.pointerType==='mouse'){ const r=canvas.getBoundingClientRect(); const c=cellAt(e.clientX-r.left,e.clientY-r.top); if(c!==st.hover){ st.hover=c; draw(); } } });
  canvas.addEventListener('pointerleave',()=>{ if(st.hover!==-1){ st.hover=-1; draw(); } });
  canvas.addEventListener('pointercancel',e=>{ ptrs.delete(e.pointerId); dragging=false; pinch=0; });
  canvas.addEventListener('pointerup',e=>{ const wasPinch=ptrs.size>=2; ptrs.delete(e.pointerId); pinch=0; dragging=false; if(moved||wasPinch){ if(ptrs.size===0) moved=false; return; } const r=canvas.getBoundingClientRect(); const c=cellAt(e.clientX-r.left,e.clientY-r.top); if(c<0) return;
    if(e.pointerType==='touch'){ if(st.sel===c&&st.showSel){ if(isHumanTurn()) applyMove(c,true); } else { st.sel=c; st.showSel=true; draw(); } } else { st.sel=c; if(isHumanTurn()) applyMove(c,true); else draw(); } });
  canvas.addEventListener('wheel',e=>{ e.preventDefault(); const k=Math.max(-3,Math.min(3,(e.deltaMode===1?e.deltaY*33:e.deltaMode===2?e.deltaY*400:e.deltaY)/100)); st.zoom=Math.max(.6,Math.min(1.8,st.zoom*Math.pow(.92,k))); draw(); if(st.onInteract) st.onInteract(); },{passive:false});
  canvas.tabIndex=0;
  canvas.addEventListener('focus',()=>{ st.showSel=true; draw(); }); canvas.addEventListener('blur',()=>{ st.showSel=false; draw(); });
  canvas.addEventListener('keydown',e=>{ const [x,y,z]=coords(st.sel); let nx=x,ny=y,nz=z; if(e.key==='ArrowLeft')nx=(x+2)%3; else if(e.key==='ArrowRight')nx=(x+1)%3; else if(e.key==='ArrowUp')ny=(y+2)%3; else if(e.key==='ArrowDown')ny=(y+1)%3; else if(e.key==='[')nz=(z+2)%3; else if(e.key===']')nz=(z+1)%3; else if(e.key==='Enter'||e.key===' '){ e.preventDefault(); if(isHumanTurn()) applyMove(st.sel,true); return; } else return; e.preventDefault(); st.sel=nx*9+ny*3+nz; st.showSel=true; draw(); });
  new ResizeObserver(()=>draw()).observe(canvas);
  let fitT=null; const refit=()=>{ const w=document.getElementById('c3wrap'); if(!w||w.style.display==='none') return; clearTimeout(fitT); fitT=setTimeout(fitCubeWrap,120); };
  addEventListener('resize',refit); addEventListener('orientationchange',refit);
  draw(); return st;
}
function renderCubeAll(){ const st=viewState(); const cells=st.cells; const flat=document.getElementById('flat'); const last=match.moves.length?(viewing()?match.moves[match.view-1]:match.moves[match.moves.length-1]):-1;
  flat.querySelectorAll('.cell').forEach(c=>{ const i=+c.dataset.i; const v=cells[i]; c.className='cell'; if(v){ c.classList.add('filled'); c.innerHTML=markOf(v); } else c.innerHTML=`<span class="ghost">${markOf(st.player)}</span>`; if(i===last) c.classList.add('last'); if(match.over&&match.winLine&&match.winLine.includes(i)&&!viewing()) c.classList.add('win'); if(match.hint===i) c.classList.add('hint'); if(cube&&cube.sel===i&&cube.showSel&&!match.over) c.classList.add('sel'); if(match.over||viewing()||!isHumanTurn()) c.classList.add('disabled'); });
  const vw=document.getElementById('viewWin'); if(vw) vw.style.display = (match.over&&match.winLine)?'':'none';
  if(cube) cube.draw(); }

/* accessors for shell.js's Settings dialog: `cur` is the draft (opp/diff/first/mode), `match` the live game in progress. */
window.__gameCur=()=>cur; window.__gameMatch=()=>match; window.__gameDefs=()=>GAMES;

/* ---------- online play: a live ULT match built and driven entirely by online-recursive.js, not by startGame() ----------
   Mirrors arcade-games.js's window.__nimSetMatch/__nimEnterGameView/__nimState for Nim — the same non-gx pattern,
   since ULT (like Nim) predates games2.js's ZFX framework and has no entryReady/gx scaffolding to hook into. */
function ultEnterLiveView(seat, state){
  cancelAI(); cur.game='ult'; cur.opp='online'; const G=GAMES.ult;
  match={ game:'ult', opp:'online', diff:null, mode:'practice', humanIs:seat, player:state.player, over:false, winner:0, winLine:null, moves:[], snaps:[], view:-1, assisted:false, hint:-1, busy:false, online:null };
  document.getElementById('gTitle').textContent=G.title; document.getElementById('gMode').textContent='online friend';
  rulesEl.textContent=G.rules; resultEl.classList.remove('show'); resultEl.innerHTML='';
  document.getElementById('undoBtn').style.display=''; document.getElementById('restartBtn').style.display=''; document.getElementById('hintBtn').style.display='none';
  document.querySelector('#game .stage').classList.remove('ult'); initUlt(); document.querySelector('#game .stage').classList.add('online');
  match.s={ cells:state.cells.slice(), bw:state.bw.slice(), next:state.next, player:state.player, winner:state.winner||0, moves:[] };
  match.player=match.s.player; match.snaps=[snapshot()];
  setupEl.classList.remove('show'); gameEl.classList.add('show'); (window.gameScrollTo||(el=>el.scrollIntoView({behavior:'smooth',block:'start'})))(gameEl);
  renderAll();
}
function ultApplyRemote(state,lastMove){
  if(!match||match.game!=='ult'||match.opp!=='online') return;
  // A restart or rematch's fresh state always carries winner:0 (see online-recursive.js's `room.over?...:0`), and
  // must clear match.over/winLine here too -- otherwise a match that just ended keeps showing "Game over" (and its
  // stale winning-line highlight) forever on top of the brand new, empty board, since nothing else ever resets them.
  match.s={ cells:state.cells.slice(), bw:state.bw.slice(), next:state.next, player:state.player, winner:state.winner||0, moves:match.s?match.s.moves:[] };
  match.player=match.s.player;
  if(lastMove!=null) match.moves.push(lastMove);
  match.snaps.push(snapshot());
  if(window.ZS) ZS.play('wood');
  match.over=!!match.s.winner; match.winner=match.s.winner; match.winLine=match.s.winner&&match.s.winner<3?ULT.macroWinLine(match.s,match.s.winner):null;
  renderAll();
}

/* ---- Recursive Tic-Tac-Toe: the match against the computer (or two on one device) is saved on this device after every
   accepted move, so reopening /recursive-tic-tac-toe (online or offline) continues it. Online rooms are never saved here. */
const ULT_SAVE='zf-ult-match-v1', ULT_RULES=1;
function persistUlt(){ if(!match||match.game!=='ult'||match.opp==='online') return; try{ if(match.over) localStorage.removeItem(ULT_SAVE);
  else localStorage.setItem(ULT_SAVE,JSON.stringify({rules:ULT_RULES,opp:match.opp,diff:match.diff,mode:match.mode,first:cur.first,humanIs:match.humanIs,moves:match.moves,snaps:match.snaps.slice(-120),assisted:match.assisted})); }catch(e){} }
function resumeUlt(){ let sv=null; try{ sv=JSON.parse(localStorage.getItem(ULT_SAVE)||'null'); }catch(e){} if(!sv||sv.rules!==ULT_RULES||!sv.snaps||!sv.snaps.length) return false;
  cur.game='ult'; cur.opp=sv.opp; cur.diff=sv.diff; cur.mode=sv.mode; cur.first=sv.first||cur.first; const G=GAMES.ult;
  match={ game:'ult', opp:sv.opp, diff:sv.diff, mode:sv.mode, humanIs:sv.humanIs, player:1, over:false, winner:0, winLine:null, moves:sv.moves||[], snaps:sv.snaps, view:-1, assisted:!!sv.assisted, hint:-1 };
  document.getElementById('gTitle').textContent=G.title; document.getElementById('gMode').textContent=sv.opp==='2p'?'two players':`${sv.diff} · ${sv.mode}`;
  rulesEl.textContent=G.rules; resultEl.classList.remove('show'); document.getElementById('undoBtn').style.display='';
  document.getElementById('hintBtn').style.display=(sv.mode==='practice'&&sv.opp==='ai')?'':'none'; document.getElementById('assistBtn').style.display='';
  document.querySelector('#game .stage').classList.remove('ult','online'); initUlt(); setUltAssist(ultAssist); restore(match.snaps[match.snaps.length-1]);
  [...document.querySelectorAll('section.entry.show,.game.show')].forEach(e=>e.classList.remove('show')); if(window.ZFA&&ZFA.hideAll) ZFA.hideAll(); gameEl.classList.add('show');
  renderAll(); if(window.ZFOffline) ZFOffline.note('Game saved. Continue whenever you’re ready.'); maybeAI(); return true; }
window.__ultResume=()=>{ if(new URLSearchParams(location.search).has('room')) return false; try{ return resumeUlt(); }catch(e){ try{ localStorage.removeItem(ULT_SAVE); }catch(_){} return false; } };
window.__ultEnterLiveView=ultEnterLiveView;
window.__ultApplyRemote=ultApplyRemote;
window.__ultState=()=>(match&&match.game==='ult')?match:null;
window.__ultRenderExternal=()=>{ if(match&&match.game==='ult') renderAll(); };
window.__ultBackToGame=()=>{ setupEl.classList.remove('show'); gameEl.classList.add('show'); renderAll(); };
window.__ultOpenSetup=()=>openSetup('ult');

/* deep-link: #four / #ult / #cube */
