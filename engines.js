/* engines.js: the rule engines and AI for 4×4, Recursive, 3D, Nim and Chomp.
   Loaded as a normal script on the page and with importScripts() inside engine-worker.js, so the same code runs in both places. */
(function(){

/* ---------- utilities ---------- */
function rnd(arr){ return arr[Math.floor(Math.random()*arr.length)]; }
function lines2D(n, k){ // all lines of length k in n×n (k==n → rows/cols/main diags only when k===n and full-length)
  const L=[]; const dirs=[[0,1],[1,0],[1,1],[1,-1]];
  for(let r=0;r<n;r++)for(let c=0;c<n;c++)for(const [dr,dc] of dirs){
    const cells=[]; for(let i=0;i<k;i++){const rr=r+dr*i,cc=c+dc*i; if(rr<0||cc<0||rr>=n||cc>=n){cells.length=0;break;} cells.push(rr*n+cc);} if(cells.length===k) L.push(cells);
  }
  return L;
}
/* ---------- 4x4 (exact) ---------- */
const F4 = (function(){
  const L=[]; for(let r=0;r<4;r++)L.push([0,1,2,3].map(c=>r*4+c)); for(let c=0;c<4;c++)L.push([0,1,2,3].map(r=>r*4+c)); L.push([0,5,10,15]); L.push([3,6,9,12]);
  const M=L.map(l=>l.reduce((m,i)=>m|(1<<i),0));
  function masks(cells,p){ let me=0,opp=0; cells.forEach((v,i)=>{ if(v===p) me|=1<<i; else if(v) opp|=1<<i; }); return [me,opp]; }
  function won(m){ for(const x of M) if((m&x)===x) return true; return false; }
  function winLine(cells,p){ for(const l of L) if(l.every(i=>cells[i]===p)) return l; return null; }
  function solve(me,opp,memo){ if(won(opp)) return -1; if((me|opp)===0xFFFF) return 0; const key=me*65536+opp; const c=memo.get(key); if(c!==undefined) return c; const empty=~(me|opp)&0xFFFF; for(let i=0;i<16;i++) if(empty&(1<<i)&&won(me|(1<<i))){ memo.set(key,1); return 1; } let best=-1; for(let i=0;i<16;i++) if(empty&(1<<i)){ const v=-solve(opp,me|(1<<i),memo); if(v>best){best=v; if(best===1)break;} } memo.set(key,best); return best; }
  function exactMoves(cells,p){ const [me,opp]=masks(cells,p); const memo=new Map(); const res=[]; for(let i=0;i<16;i++) if(!cells[i]){ const v = won(me|(1<<i)) ? 1 : -solve(opp, me|(1<<i), memo); res.push({i,v}); } const best=Math.max(...res.map(r=>r.v)); return {best, moves:res.filter(r=>r.v===best).map(r=>r.i), all:res}; }
  function heur(cells,p){ let s=0; const w=[0,1,10,100]; for(const l of L){ let a=0,b=0; for(const i of l){ if(cells[i]===p)a++; else if(cells[i])b++; } if(a&&!b)s+=w[a]; else if(b&&!a)s-=w[b]; } return s; }
  function search(cells,p,depth,alpha,beta){ const o=3-p; if(winLine(cells,o)) return -10000; let any=false; let best=-Infinity; for(let i=0;i<16;i++) if(!cells[i]){ any=true; cells[i]=p; let v; if(winLine(cells,p)) v=10000; else if(depth<=1) v=heur(cells,p); else v=-search(cells,o,depth-1,-beta,-alpha); cells[i]=0; if(v>best)best=v; if(v>alpha)alpha=v; if(alpha>=beta)break; } if(!any) return 0; return best; }
  function immediate(cells,p){ for(let i=0;i<16;i++) if(!cells[i]){ cells[i]=p; const w=!!winLine(cells,p); cells[i]=0; if(w) return i; } return -1; }
  function empties(cells){ return cells.reduce((n,v)=>n+(v?0:1),0); }
  function choose(cells,p,diff){
    const o=3-p, e=[]; for(let i=0;i<16;i++) if(!cells[i]) e.push(i);
    if(diff==='easy'){ const w=immediate(cells,p); if(w>=0&&Math.random()<0.6) return w; const b=immediate(cells,o); if(b>=0&&Math.random()<0.4) return b; return rnd(e); }
    if(diff==='medium'){ const w=immediate(cells,p); if(w>=0) return w; const b=immediate(cells,o); if(b>=0) return b; return rnd(e); }
    if(diff==='hard'){ const w=immediate(cells,p); if(w>=0) return w; const b=immediate(cells,o); if(b>=0) return b; let best=-Infinity, bm=[]; for(const i of e){ cells[i]=p; const v=-search(cells,o,4,-Infinity,Infinity); cells[i]=0; if(v>best){best=v;bm=[i];} else if(v===best) bm.push(i); } return rnd(bm); }
    // perfect: plies 0-4 (≥12 empties) — every reachable position through ply 5 is a proven draw for the side to move (verified offline), so any move keeps the guarantee; from ply 5 on, exact solve.
    if(empties(cells)>=12) return rnd(e);
    const r=exactMoves(cells,p); return rnd(r.moves);
  }
  return { L, winLine, choose, exactMoves, immediate, empties };
})();
/* ---------- 5x5 connect-four variant (search) ---------- */
const F5 = (function(){
  const L=lines2D(5,4);
  function winLine(cells,p){ for(const l of L) if(l.every(i=>cells[i]===p)) return l; return null; }
  function heur(cells,p){ let s=0; const w=[0,1,8,60]; for(const l of L){ let a=0,b=0; for(const i of l){ if(cells[i]===p)a++; else if(cells[i])b++; } if(a&&!b)s+=w[a]; else if(b&&!a)s-=w[b]; } return s; }
  function search(cells,p,depth,alpha,beta){ const o=3-p; if(winLine(cells,o)) return -10000; let any=false,best=-Infinity; for(let i=0;i<25;i++) if(!cells[i]){ any=true; cells[i]=p; let v; if(winLine(cells,p)) v=10000; else if(depth<=1) v=heur(cells,p); else v=-search(cells,o,depth-1,-beta,-alpha); cells[i]=0; if(v>best)best=v; if(v>alpha)alpha=v; if(alpha>=beta)break; } return any?best:0; }
  function immediate(cells,p){ for(let i=0;i<25;i++) if(!cells[i]){ cells[i]=p; const w=!!winLine(cells,p); cells[i]=0; if(w) return i; } return -1; }
  function choose(cells,p,diff){ const o=3-p,e=[]; for(let i=0;i<25;i++) if(!cells[i]) e.push(i); const w=immediate(cells,p); const b=immediate(cells,o);
    if(diff==='easy'){ if(w>=0&&Math.random()<.6) return w; if(b>=0&&Math.random()<.4) return b; return rnd(e); }
    if(w>=0) return w; if(b>=0) return b; if(diff==='medium') return rnd(e);
    const depth = diff==='hard'?3:4; let best=-Infinity,bm=[]; for(const i of e){ cells[i]=p; const v=-search(cells,o,depth,-Infinity,Infinity); cells[i]=0; if(v>best){best=v;bm=[i];} else if(v===best) bm.push(i); } return rnd(bm); }
  return { L, winLine, choose, immediate };
})();
/* ---------- Ultimate / recursive ---------- */
const ULT = (function(){
  const L3=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  function newState(){ return { cells:new Array(81).fill(0), bw:new Array(9).fill(0), next:-1, player:1, winner:0, moves:[] }; }
  function clone(s){ return { cells:s.cells.slice(), bw:s.bw.slice(), next:s.next, player:s.player, winner:s.winner, moves:s.moves.slice() }; }
  function lineWin(get,p){ for(const l of L3) if(l.every(i=>get(i)===p)) return l; return null; }
  function boardFull(s,b){ for(let c=0;c<9;c++) if(!s.cells[b*9+c]) return false; return true; }
  function legal(s){ if(s.winner) return []; const out=[]; const boards = s.next>=0 ? [s.next] : [...Array(9).keys()].filter(b=>s.bw[b]===0); for(const b of boards){ if(s.bw[b]) continue; for(let c=0;c<9;c++) if(!s.cells[b*9+c]) out.push(b*9+c); } return out; }
  function play(s,idx){ const b=Math.floor(idx/9), c=idx%9, p=s.player; s.cells[idx]=p; s.moves.push(idx);
    if(lineWin(i=>s.cells[b*9+i],p)) s.bw[b]=p; else if(boardFull(s,b)) s.bw[b]=3;
    if(lineWin(i=>s.bw[i]===p?p:0,p)) s.winner=p;
    else if(s.bw.every(v=>v!==0)) s.winner=3;
    s.next = s.bw[c]===0 ? c : -1; s.player=3-p; return s; }
  function macroWinLine(s,p){ return lineWin(i=>s.bw[i]===p?p:0,p); }
  function evalS(s,me){ if(s.winner===me) return 100000; if(s.winner===3-me) return -100000; if(s.winner===3) return 0; let sc=0; const o=3-me;
    for(const l of L3){ let a=0,b=0,n=0; for(const i of l){ if(s.bw[i]===me)a++; else if(s.bw[i]===o)b++; else if(s.bw[i]===3)n++; } if(!b&&!n) sc+=[0,30,300,0][a]; if(!a&&!n) sc-=[0,30,300,0][b]; }
    for(let b=0;b<9;b++){ if(s.bw[b]) continue; const w = b===4?1.5:1; for(const l of L3){ let a=0,c=0; for(const i of l){ const v=s.cells[b*9+i]; if(v===me)a++; else if(v===o)c++; } if(!c) sc+=[0,1,6,0][a]*w; if(!a) sc-=[0,1,6,0][c]*w; } }
    if(s.next===-1){ sc += (s.player===me? 12 : -12); }
    return sc; }
  // negamax with score from side-to-move perspective:
  function nega(s,depth,alpha,beta){ const me=s.player; if(s.winner||depth===0) return evalS(s,me); const mv=order(s,legal(s)); let best=-Infinity; for(const m of mv){ const t=play(clone(s),m); const v=-nega(t,depth-1,-beta,-alpha); if(v>best)best=v; if(v>alpha)alpha=v; if(alpha>=beta)break; } return best; }
  function order(s,mv){ return mv.slice().sort((a,b)=>{ const sa=(a%9===4?2:0)+(Math.floor(a/9)===4?1:0), sb=(b%9===4?2:0)+(Math.floor(b/9)===4?1:0); return sb-sa; }); }
  function immediateLocal(s,p){ for(const m of legal(s)){ const t=play(clone(s),m); if(t.winner===p) return m; const b=Math.floor(m/9); if(t.bw[b]===p) return m; } return -1; }
  function choose(s,diff){ const mv=legal(s); if(!mv.length) return -1; const p=s.player;
    if(diff==='easy'){ return rnd(mv); }
    if(diff==='medium'){ for(const m of mv){ const t=play(clone(s),m); if(t.winner===p) return m; } for(const m of mv){ const t=play(clone(s),m); if(t.bw[Math.floor(m/9)]===p) return m; } const safe=mv.filter(m=>{ const t=play(clone(s),m); return t.next!==-1; }); return rnd(safe.length?safe:mv); }
    const depth = diff==='hard'?4:6; let best=-Infinity,bm=[]; for(const m of order(s,mv)){ const t=play(clone(s),m); const v=-nega(t,depth-1,-Infinity,Infinity); if(v>best){best=v;bm=[m];} else if(v===best) bm.push(m); } return rnd(bm); }
  return { newState, clone, legal, play, choose, macroWinLine, L3 };
})();
/* ---------- 3D cube ---------- */
function genLines3(n){ const set=new Map(); const dirs=[]; for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++)for(let dz=-1;dz<=1;dz++){ if(!dx&&!dy&&!dz)continue; dirs.push([dx,dy,dz]); }
  for(let x=0;x<n;x++)for(let y=0;y<n;y++)for(let z=0;z<n;z++)for(const [dx,dy,dz] of dirs){ const cells=[]; for(let k=0;k<n;k++){ const cx=x+dx*k,cy=y+dy*k,cz=z+dz*k; if(cx<0||cy<0||cz<0||cx>=n||cy>=n||cz>=n){cells.length=0;break;} cells.push(cx*n*n+cy*n+cz); } if(cells.length===n){ const key=cells.slice().sort((a,b)=>a-b).join(','); if(!set.has(key)) set.set(key,cells.slice().sort((a,b)=>a-b)); } }
  return [...set.values()]; }
const C3 = (function(){
  const N=3, L=genLines3(3), through=[]; for(let i=0;i<27;i++) through.push(L.filter(l=>l.includes(i)));
  function winLine(cells,p){ for(const l of L) if(l.every(i=>cells[i]===p)) return l; return null; }
  function heur(cells,p){ let s=0; const w=[0,1,12,0]; for(const l of L){ let a=0,b=0; for(const i of l){ if(cells[i]===p)a++; else if(cells[i])b++; } if(a&&!b)s+=w[a]; else if(b&&!a)s-=w[b]; } if(cells[13]===p) s+=6; else if(cells[13]) s-=6; return s; }
  function search(cells,p,depth,alpha,beta,budget){ const o=3-p; if(winLine(cells,o)) return -10000; let any=false,best=-Infinity; const ord=[13,0,2,6,8,18,20,24,26,4,10,12,14,16,22,1,3,5,7,9,11,15,17,19,21,23,25]; for(const i of ord) if(!cells[i]){ any=true; budget.n++; cells[i]=p; let v; if(winLine(cells,p)) v=10000; else if(depth<=1||budget.n>budget.max) v=heur(cells,p); else v=-search(cells,o,depth-1,-beta,-alpha,budget); cells[i]=0; if(v>best)best=v; if(v>alpha)alpha=v; if(alpha>=beta)break; } return any?best:0; }
  function immediate(cells,p){ for(let i=0;i<27;i++) if(!cells[i]){ cells[i]=p; const w=!!winLine(cells,p); cells[i]=0; if(w) return i; } return -1; }
  function choose(cells,p,diff){ const o=3-p,e=[]; for(let i=0;i<27;i++) if(!cells[i]) e.push(i); const w=immediate(cells,p), b=immediate(cells,o);
    if(diff==='easy'){ if(w>=0&&Math.random()<.5) return w; if(b>=0&&Math.random()<.35) return b; return rnd(e.filter(i=>i!==13).length?e.filter(i=>i!==13):e); }
    if(w>=0) return w; if(b>=0) return b; if(diff==='medium') return e.includes(13)?13:rnd(e);
    const depth = diff==='hard'?4:6; const budget={n:0,max:diff==='hard'?60000:400000}; let best=-Infinity,bm=[]; for(const i of e){ cells[i]=p; const v=-search(cells,o,depth-1,-Infinity,Infinity,budget); cells[i]=0; if(v>best){best=v;bm=[i];} else if(v===best) bm.push(i); } return rnd(bm); }
  return { L, through, winLine, choose, immediate };
})();
/* ---------- NIM (BigInt heights; normal + misère) ---------- */
const NIM = (function(){
  const B=x=>typeof x==='bigint'?x:BigInt(x);
  function parseList(text){ const parts=text.split(/[\s,;]+/).filter(Boolean); const out=[]; for(const p of parts){ if(!/^\d+$/.test(p)) throw new Error('bad number: '+p); out.push(BigInt(p)); } return out; }
  function xorAll(h){ return h.reduce((a,b)=>a^b,0n); }
  function nonEmpty(h){ return h.filter(x=>x>0n); }
  // true if position is a win for the player to move under perfect play
  function isWin(h,misere){ const ne=nonEmpty(h); if(!ne.length) return misere; // empty: last token already taken; normal -> mover lost; misère -> mover won
    if(misere){ const big=ne.filter(x=>x>1n).length; if(big===0) return ne.length%2===0; return xorAll(ne)!==0n; }
    return xorAll(ne)!==0n; }
  // all winning moves: list of {pile, take, leave}
  function winningMoves(h,misere){ const out=[]; const ne=nonEmpty(h);
    if(misere){ const bigIdx=[]; h.forEach((x,i)=>{ if(x>1n) bigIdx.push(i); }); const ones=ne.filter(x=>x===1n).length;
      if(bigIdx.length===0){ if(ne.length%2===0){ h.forEach((x,i)=>{ if(x===1n) out.push({pile:i,take:1n,leave:0n}); }); } return out; }
      if(bigIdx.length===1){ const i=bigIdx[0]; // leave odd number of ones
        if(ones%2===0) out.push({pile:i,take:h[i]-1n,leave:1n}); else out.push({pile:i,take:h[i],leave:0n}); return out; }
      // ≥2 big piles: ordinary xor moves, excluding any that leave exactly one big pile with even ones? no — standard theory: xor moves are correct while ≥2 big piles remain after? Must check resulting position with isWin.
    }
    const t=xorAll(h); if(t===0n && !misere) return out;
    h.forEach((x,i)=>{ if(x===0n) return; const target=x^t; if(target<x){ const nh=h.slice(); nh[i]=target; if(!isWin(nh,misere)) out.push({pile:i,take:x-target,leave:target}); } });
    // in misère with ≥2 big piles the xor move could leave exactly one big pile; verify generically & also allow reducing a big pile to 0/1 if that yields a P-position
    if(misere){ h.forEach((x,i)=>{ if(x<=1n) return; for(const leave of [0n,1n]){ const nh=h.slice(); nh[i]=leave; if(!isWin(nh,misere) && !out.some(m=>m.pile===i&&m.leave===leave)) out.push({pile:i,take:x-leave,leave}); } }); }
    return out; }
  function legal(h){ return h.some(x=>x>0n); }
  function randTake(x){ const cap = x>60n?60n:x; const r=BigInt(Math.floor(Math.random()*Number(cap)))+1n; return r; }
  function randomMove(h){ const idx=[]; h.forEach((x,i)=>{ if(x>0n) idx.push(i); }); const i=idx[Math.floor(Math.random()*idx.length)]; const take = Math.random()<0.25 ? h[i] : randTake(h[i]); return {pile:i,take,leave:h[i]-take}; }
  function choose(h,misere,diff){ if(!legal(h)) return null; const wins=winningMoves(h,misere);
    if(diff==='perfect'){ if(wins.length) return wins[Math.floor(Math.random()*wins.length)]; return randomMove(h); }
    if(diff==='hard'){ if(wins.length&&Math.random()<0.8) return wins[Math.floor(Math.random()*wins.length)]; return randomMove(h); }
    if(diff==='medium'){ const ne=nonEmpty(h); if(ne.length===1){ const i=h.findIndex(x=>x>0n); if(misere){ return h[i]===1n?{pile:i,take:1n,leave:0n}:{pile:i,take:h[i]-1n,leave:1n}; } return {pile:i,take:h[i],leave:0n}; } if(wins.length&&Math.random()<0.35) return wins[Math.floor(Math.random()*wins.length)]; return randomMove(h); }
    return randomMove(h); }
  function apply(h,m){ const nh=h.slice(); nh[m.pile]=nh[m.pile]-m.take; return nh; }
  function terminal(h){ return !h.some(x=>x>0n); }
  return { parseList, xorAll, isWin, winningMoves, choose, apply, terminal, legal, B };
})();

/* ---------- CHOMP (rows right-aligned, poison top-right, lengths nonincreasing top→bottom) ---------- */
const CHOMP = (function(){
  // shape: array of row lengths, index 0 = top row. Cell (r,c) present iff c >= C-len[r]. Poison = (0, C-1).
  function rect(R,C){ return new Array(R).fill(C); }
  function valid(len,C){ for(let i=0;i<len.length;i++){ if(len[i]<0||len[i]>C) return false; if(i>0&&len[i]>len[i-1]) return false; } return len[0]>=1; }
  function has(len,C,r,c){ return r<len.length && c>=C-len[r] && c<C; }
  function bite(len,C,r,c){ const out=len.slice(); const keep=C-1-c; for(let i=r;i<len.length;i++) out[i]=Math.min(out[i],keep); return out; }
  function removed(len,C,r,c){ const cells=[]; for(let i=r;i<len.length;i++) for(let cc=C-len[i]; cc<=c; cc++) cells.push([i,cc]); return cells; }
  function isPoison(C,r,c){ return r===0&&c===C-1; }
  function count(len){ return len.reduce((a,b)=>a+b,0); }
  function onlyPoison(len){ return len[0]===1 && len.slice(1).every(x=>x===0); }
  function key(len){ let k=''; for(const x of len){ if(x===0)break; k+=x+','; } return k; }
  function moves(len,C){ const out=[]; for(let r=0;r<len.length;r++){ if(len[r]===0)break; for(let c=C-len[r]; c<C; c++){ if(isPoison(C,r,c)) continue; out.push([r,c]); } } return out; }
  function stateCount(R,C){ // number of monotone shapes bounded by rectangle = C(R+C, R)
    let n=1; for(let i=1;i<=R;i++) n=n*(C+i)/i; return Math.round(n); }
  function makeSolver(C,memo){ memo=memo||new Map();
    function win(len){ if(onlyPoison(len)) return false; const k=key(len); const m=memo.get(k); if(m!==undefined) return m; let res=false; for(const [r,c] of moves(len,C)){ if(!win(bite(len,C,r,c))){ res=true; break; } } memo.set(k,res); return res; }
    function winningMoves(len){ const out=[]; for(const [r,c] of moves(len,C)) if(!win(bite(len,C,r,c))) out.push([r,c]); return out; }
    return { win, winningMoves, memo }; }
  function boundedSearch(len,C,depth,budget){ if(onlyPoison(len)) return -1; if(depth===0||budget.n>budget.max) return 0; const mv=moves(len,C); let best=-1; for(const [r,c] of mv){ budget.n++; const v=-boundedSearch(bite(len,C,r,c),C,depth-1,budget); if(v>best)best=v; if(best===1)break; } return best; }
  function choose(len,C,diff){ const mv=moves(len,C); if(!mv.length) return null; if(diff==='easy') return mv[Math.floor(Math.random()*mv.length)];
    const R=len.length; const exactOK = stateCount(R,C) <= 400000;
    // square opening: bite (1, C-2) leaves equal wings — verified strategy when board is a fresh square
    if(diff!=='easy' && R===C && len.every(x=>x===C) && C>=2) return [1,C-2];
    if(exactOK){ const S=makeSolver(C); const wins=S.winningMoves(len);
      if(diff==='perfect'||diff==='expert'){ if(wins.length) return wins[Math.floor(Math.random()*wins.length)]; // losing: prefer smallest bite to prolong
        return mv.slice().sort((a,b)=>removed(len,C,...a).length-removed(len,C,...b).length)[0]; }
      if(diff==='hard'){ if(wins.length&&Math.random()<0.75) return wins[Math.floor(Math.random()*wins.length)]; return mv[Math.floor(Math.random()*mv.length)]; }
      if(wins.length&&Math.random()<0.3) return wins[Math.floor(Math.random()*wins.length)]; return mv[Math.floor(Math.random()*mv.length)]; }
    // large board: bounded search
    let best=-2,bm=[]; const budget={n:0,max:diff==='expert'?300000:40000}; for(const [r,c] of mv){ const v=-boundedSearch(bite(len,C,r,c),C,diff==='expert'?6:3,budget); if(v>best){best=v;bm=[[r,c]];} else if(v===best) bm.push([r,c]); }
    return bm[Math.floor(Math.random()*bm.length)]; }
  function exactCovered(R,C){ return stateCount(R,C) <= 400000; }
  return { rect, valid, has, bite, removed, isPoison, count, onlyPoison, moves, makeSolver, choose, exactCovered, stateCount };
})();


;var root=typeof window!=='undefined'?window:self; root.F4=F4; root.F5=F5; root.ULT=ULT; root.C3=C3; root.NIM=NIM; root.CHOMP=CHOMP;
})();
