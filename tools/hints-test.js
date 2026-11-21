/* Checks the Sim hint against an independent exact solver.  Run:  node tools/hints-test.js
   For classic six-dot Sim it verifies, over random positions, that the hint never completes your own triangle while a safe edge exists,
   and that a winning position is always given a winning edge.  (TOOT & OTTO, Domineering and Notakto hints are drawn and explained in the page;
   check them in the browser with ZFX: press Hint on each, as either player, on each board size.) */
const fs=require('fs'), path=require('path'); const root=path.join(__dirname,'..');
const src=fs.readFileSync(path.join(root,'shared.js'),'utf8'); const a=src.indexOf('const SIM_CORE=(function(){'), b=src.indexOf('})();',a)+5;
const S=eval('(()=>{'+src.slice(a,b)+';return SIM_CORE;})()');
const g2=fs.readFileSync(path.join(root,'games2.js'),'utf8'); const c=g2.indexOf('const simMemo'), d=g2.indexOf('function simPos');
const F=eval('(()=>{'+g2.slice(c,d)+';return {simAI,safeEdges};})()');
const memo=new Map(); const win=s=>{ if(s.over) return false; const k=s.own.join(''); if(memo.has(k)) return memo.get(k); let r=false; for(const e of S.legal(s)){ const n=S.apply(s,e); if(n.over) continue; if(!win(n)){ r=true; break; } } memo.set(k,r); return r; };
let bad=0,tot=0;
for(let t=0;t<400;t++){ let s=S.newState(6); const k=3+Math.floor(Math.random()*6); for(let i=0;i<k&&!s.over;i++){ const sf=F.safeEdges(s); if(!sf.length) break; s=S.apply(s,sf[Math.floor(Math.random()*sf.length)]); } if(s.over) continue;
  const h=F.simAI(s,'perfect'); tot++; const n=S.apply(s,h);
  if(F.safeEdges(s).length&&S.completes(s,h,s.turn)){ bad++; console.log('hint completes your own triangle',s.own.join('')); }
  if(win(s)&&(n.over||win(n))){ bad++; console.log('winning position, hint is not winning',s.own.join('')); } }
console.log('checked',tot,'positions, problems:',bad); process.exit(bad?1:0);
