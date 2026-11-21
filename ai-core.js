/* ai-core.js: the computer opponents for Pentago, TOOT & OTTO, Notakto, Sim and The Gold Coin.
   Pure functions of a position: no page, no network. The page runs them in ai-worker.js (a Web Worker) so the board,
   buttons and animations stay responsive, and calls them directly only if a worker cannot start. Each search has a
   bounded thinking time (BUDGET, in ms): when it runs out the computer plays the best move it has checked so far. */
(function(){
const root=typeof window!=='undefined'?window:self;
const E=root.ZF_E, P=E.PENTAGO, T=E.TOOT, N=E.NOTAKTO, S=E.SIM, G=E.GOLD;
const pick=a=>a[Math.floor(Math.random()*a.length)];
const BUDGET={pentago:1600,toot:1200,notakto:1500,sim:1500,gold:1200};

//PENT
const qHas=(cells,q)=>{ const r0=(q>>1)*3,c0=(q&1)*3; for(let r=r0;r<r0+3;r++)for(let c=c0;c<c0+3;c++) if(cells[r*6+c]) return true; return false; };
function pCombos(s){ const all=[]; for(const pm of P.legal(s)){ const a=P.apply(s,pm); if(a.over){ all.push([pm,null]); continue; } for(const rm of P.legal(a)) if(qHas(a.cells,rm.q)) all.push([pm,rm]); } return all; }
function pScore(s,pm,rm,me,deep,until){ const a=P.apply(s,pm); if(a.over) return 1e6; const b=P.apply(a,rm); if(b.over){ if(b.winner===me) return 5e5; if(b.winner===0) return -1000; return -5e5; }
  let v=P.evalFor(b.cells,me); if(deep&&Date.now()<until){ let oppWin=false; for(const p2 of P.legal(b)){ const c=P.apply(b,p2); if(c.over){ oppWin=true; break; } for(const r2 of P.legal(c)){ const d=P.apply(c,r2); if(d.over&&d.winner===3-me){ oppWin=true; break; } } if(oppWin) break; } if(oppWin) v-=3e5; } return v; }
/* returns [placement, turn]; the deep check (can the opponent win at once?) stops when the thinking time runs out */
function pChoose(s,level,until){ const me=s.turn, combos=pCombos(s); let bl=[];
  if(level==='easy') bl=combos; else { let best=-1e12; for(const [pm,rm] of combos){ const v=pScore(s,pm,rm,me,level==='hard',until); if(v>best){ best=v; bl=[[pm,rm]]; } else if(v===best) bl.push([pm,rm]); } }
  return pick(bl); }
//TOOT
function tEval(s,me){ const opp=3-me; let v=0; const mine=me===1?'TOOT':'OTTO', theirs=me===1?'OTTO':'TOOT'; for(const w of T.WIN){ const cs=w.map(i=>s.board[i]); const fits=(word)=>cs.every((ch,k)=>!ch||ch===word[k]); const n=cs.filter(Boolean).length; if(fits(mine)) v+=[0,1,4,20][n]||0; if(fits(theirs)) v-=[0,1,4,20][n]||0; } return v; }
function tSearch(s,depth,alpha,beta,me){ if(s.over) return s.winner===0?0:(s.winner===me?1000+depth:-1000-depth); if(depth===0) return tEval(s,me);
  const moves=T.legal(s); if(!moves.length) return 0; const maxing=s.turn===me; let best=maxing?-1e9:1e9;
  for(const m of moves){ const v=tSearch(T.apply(s,m),depth-1,alpha,beta,me); if(maxing){ if(v>best)best=v; if(best>alpha)alpha=best; } else { if(v<best)best=v; if(best<beta)beta=best; } if(alpha>=beta) break; } return best; }
function tAI(s,level,until){ const moves=T.legal(s); const me=s.turn;
  if(level==='easy') return pick(moves);
  const wins=moves.filter(m=>{ const n=T.apply(s,m); return n.over&&n.winner===me; }); if(wins.length) return pick(wins);
  const safe=moves.filter(m=>{ const n=T.apply(s,m); return !(n.over&&n.winner!==me); }); if(level==='medium') return pick(safe.length?safe:moves);
  let best=-1e9,bl=[]; for(const m of (safe.length?safe:moves)){ const v=Date.now()<until?tSearch(T.apply(s,m),3,-1e9,1e9,me):tEval(T.apply(s,m),me); if(v>best){best=v;bl=[m];} else if(v===best) bl.push(m); } return pick(bl); }

//NOTA
function nAI(s,level){ const mv=N.legal(s); const open=s.closed.filter(x=>!x).length; const opts=[];
  const exact=(level==='perfect'&&s.boards.length<=3)||(level==='hard'&&open<=3);
  if(exact){ const pm=N.perfectMoves(s); if(pm.length) return pick(pm); }
  if(level==='easy') return pick(mv);
  const closes=m=>N.hasLine(s.boards[m.b]|(1<<m.c)); const nonClosing=mv.filter(m=>!closes(m)); const final=m=>closes(m)&&open===1;
  const notFinal=mv.filter(m=>!final(m)); const pool=notFinal.length?notFinal:mv;
  if(level==='medium') return pick(pool);
  const safeShort=pool.filter(m=>{ const n=N.apply(s,m); return n.over||N.legal(n).some(x=>!final2(n,x)); }); return pick(safeShort.length?safeShort:pool);
  function final2(n,x){ const o=n.closed.filter(v=>!v).length; return N.hasLine(n.boards[x.b]|(1<<x.c))&&o===1; } }
//SIM
const simMemo=new Map(); const skey=s=>s.own.reduce((a,v)=>a*3+v,0);
function simWin(s){ if(s.over) return false; const k=skey(s); const m=simMemo.get(k); if(m!==undefined) return m; let res=false; for(const e of S.legal(s)){ if(S.completes(s,e,s.turn)) continue; if(!simWin(S.apply(s,e))){ res=true; break; } } simMemo.set(k,res); return res; }
const safeEdges=s=>S.legal(s).filter(e=>!S.completes(s,e,s.turn));
function simAI(s,level){ const legal=S.legal(s), pick=a=>a[Math.floor(Math.random()*a.length)]; const rev=s.reverse;
  if(rev){ const goal=legal.filter(e=>S.completes(s,e,s.turn)); if(level!=='easy'&&goal.length) return pick(goal); if(level==='easy') return pick(legal);
    const calm=legal.filter(e=>{ const n=S.apply(s,e); return !S.legal(n).some(x=>S.completes(n,x,n.turn)); }); return pick(calm.length?calm:legal); }
  const safe=safeEdges(s); if(level==='easy') return pick(legal); if(!safe.length) return pick(legal); if(level==='medium') return pick(safe);
  if(level==='perfect'&&s.n===6){ const win=safe.filter(e=>!simWin(S.apply(s,e))); if(win.length) return pick(win); return pick(safe); }
  let best=1e9,be=[]; const P=s.turn, g=S.geom(s.n); for(const e of safe){ const n=S.apply(s,e); const oppSafe=safeEdges(n).length; let own=0; for(const t of g.byEdge[e]){ const mine=t.filter(k=>k!==e&&n.own[k]===P).length, theirs=t.filter(k=>k!==e&&n.own[k]===3-P).length; if(mine===1&&theirs===0) own++; }
    const v=-(own*2-oppSafe); if(v<best){best=v;be=[e];} else if(v===best) be.push(e); }
  return pick(be); }
//GOLD
function aiMove(s,level){ const L=G.legal(s); if(G.goldLeftmost(s)) return {t:'collect'}; const win=G.winningMovesF(s); const safe=L.filter(m=>{ if(m.t!=='collect') return true; const n=G.apply(s,m); return !G.goldLeftmost(n); });   /* never hand over an exposed gold if there is another move */
  if(level==='easy') return pick(Math.random()<.85?L:safe.length?safe:L);
  if(level==='medium'){ if(win.length&&Math.random()<.55) return pick(win); return pick(safe.length?safe:L); }
  if(win.length) return pick(win);
  let best=1e9,bl=[]; for(const m of (safe.length?safe:L)){ const k=G.oppWinsF(s,m); if(k<best){ best=k; bl=[m]; } else if(k===best) bl.push(m); } return pick(bl); }


const CHOOSE={
  pentago:(s,d,u)=>{ if(s.phase==='rot') return {rot:pick(P.legal(s).filter(m=>qHas(s.cells,m.q)))}; const c=pChoose(s,d,u); return {place:c[0],rot:c[1]}; },
  toot:(s,d,u)=>tAI(s,d,u), notakto:(s,d)=>nAI(s,d), sim:(s,d)=>simAI(s,d), gold:(s,d)=>aiMove(s,d) };
root.ZFAI={ BUDGET, choose(game,s,level){ const f=CHOOSE[game]; if(!f) return null; return f(s,level,Date.now()+(BUDGET[game]||1200)); } };
})();
