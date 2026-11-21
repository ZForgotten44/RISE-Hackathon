/* gold-engine.js: The Gold Coin Game (Joel David Hamkins, "The Gold Coin game", Infinite Games: Frivolities of the Gods).
   One engine for the board, the computer, hints, puzzles, lessons and the card.  Positions are zero-based; the interface shows 1-based.
   A turn is exactly one of: SLIDE a coin left by one or more spaces (never onto or past another coin), or COLLECT the leftmost coin
   (from wherever it stands). Whoever collects the gold coin wins. Collecting a coin never moves the others. */
(function(){
const GOLD=(function(){
  const clone=s=>({...s,coins:s.coins.map(c=>({...c})),taken:s.taken.slice(),moves:s.moves.slice()});
  /* o: {n, pens:[positions], gold:position, variant:'std'|'rear', turn} */
  function newState(o){ const coins=(o.pens||[]).map((p,i)=>({id:'p'+(i+1),pos:p,kind:'penny'})); coins.push({id:'gold',pos:o.gold,kind:'gold'}); coins.sort((a,b)=>a.pos-b.pos);
    return {n:o.n,coins,turn:o.turn||1,over:false,winner:0,variant:o.variant||'std',taken:[],moves:[]}; }
  function check(o){ const errs=[]; const n=o.n|0; if(n<2||n>60) errs.push('The track needs between 2 and 60 spaces.'); const all=(o.pens||[]).concat([o.gold]); if(o.gold===undefined||o.gold===null||isNaN(o.gold)) errs.push('Place the gold coin.');
    if(all.some(p=>!Number.isInteger(p)||p<0||p>=n)) errs.push('Every coin must sit on the track.'); if(new Set(all).size!==all.length) errs.push('Two coins cannot share a space.');
    if(!errs.length&&(o.variant||'std')==='std'&&(o.pens||[]).some(p=>p>o.gold)) errs.push('In the standard game the gold coin is farthest right. Choose "Pennies behind gold" to allow pennies to its right.'); return errs; }
  function legal(s){ if(s.over) return []; const out=[]; const cs=s.coins; cs.forEach((c,i)=>{ const lo=i===0?0:cs[i-1].pos+1; for(let to=lo;to<c.pos;to++) out.push({t:'slide',id:c.id,to}); }); if(cs.length) out.push({t:'collect'}); return out; }
  function apply(s,m){ const n=clone(s); if(m.t==='collect'){ const c=n.coins.shift(); n.taken.push({id:c.id,kind:c.kind,by:s.turn}); n.moves.push({...m,by:s.turn,coin:c.id}); if(c.kind==='gold'){ n.over=true; n.winner=s.turn; } else n.turn=3-s.turn; return n; }
    const c=n.coins.find(x=>x.id===m.id); const from=c.pos; c.pos=m.to; n.coins.sort((a,b)=>a.pos-b.pos); n.moves.push({...m,by:s.turn,from}); n.turn=3-s.turn; return n; }
  /* ---- the strategy: piles from gaps ---- */
  function piles(s){ const cs=s.coins, out=[]; let i=cs.length-1; while(i>=1){ out.push({kind:'pair',h:cs[i].pos-cs[i-1].pos-1,right:cs[i].id,left:cs[i-1].id}); i-=2; }
    if(i===0){ const front=cs[0]; const beforeGold=s.variant==='rear'&&cs.length>1&&cs[1].kind==='gold'; out.push({kind:'front',h:front.pos+(beforeGold?0:1),coin:front.id,beforeGold}); } return out; }
  const xor=s=>piles(s).reduce((a,p)=>a^p.h,0);
  const goldLeftmost=s=>s.coins.length&&s.coins[0].kind==='gold';
  /* true when the player to move wins with best play (formula) */
  const winning=s=>goldLeftmost(s)||xor(s)!==0;
  /* one winning move from the formula, or null */
  function formulaMove(s){ if(s.over) return null; if(goldLeftmost(s)) return {t:'collect'}; const P=piles(s), S=P.reduce((a,p)=>a^p.h,0); if(!S) return null;
    for(const p of P){ const target=p.h^S; if(target<p.h){ if(p.kind==='pair'){ const c=s.coins.find(x=>x.id===p.right); return {t:'slide',id:c.id,to:c.pos-(p.h-target)}; }
        const c=s.coins.find(x=>x.id===p.coin); if(p.beforeGold){ return {t:'slide',id:c.id,to:target}; }            /* pile is the position itself; never collect it: that exposes gold */
        if(target===0) return {t:'collect'}; return {t:'slide',id:c.id,to:target-1}; } } return null; }
  /* ---- exact solver (memoised) ---- */
  const memo=new Map(); const key=s=>s.coins.map(c=>c.pos+(c.kind==='gold'?'g':'')).join(',');
  function win(s){ if(s.over) return false; const k=key(s); const h=memo.get(k); if(h!==undefined) return h; let r=false; for(const m of legal(s)){ const n=apply(s,m); if(n.over||!win(n)){ r=true; break; } } memo.set(k,r); return r; }
  const winningMoves=s=>legal(s).filter(m=>{ const n=apply(s,m); return n.over||!win(n); });
  const winsExact=s=>!s.over&&win(s);
  /* the same answers from the verified formula: fast on long tracks */
  const winningMovesF=s=>legal(s).filter(m=>{ const n=apply(s,m); return n.over||!winning(n); });
  const oppWinsF=(s,m)=>{ const n=apply(s,m); if(n.over) return 0; return legal(n).filter(x=>{ const t=apply(n,x); return t.over||!winning(t); }).length; };
  /* how many replies would win for the opponent after each move (used to choose among lost positions) */
  const oppWins=(s,m)=>{ const n=apply(s,m); if(n.over) return 0; return legal(n).filter(x=>{ const t=apply(n,x); return t.over||!win(t); }).length; };
  return {newState,check,legal,apply,piles,xor,winning,formulaMove,winsExact,winningMoves,winningMovesF,oppWins,oppWinsF,goldLeftmost,key,clone};
})();
{ const root=typeof window!=='undefined'?window:self; root.ZF_E=root.ZF_E||{}; root.ZF_E.GOLD=GOLD; }
if(typeof module!=='undefined') module.exports=GOLD;
})();
