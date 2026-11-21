/* engines2.js: rule engines for Pentago, TOOT & OTTO, Domineering, Notakto and Sim.
   Cards, demonstrations, puzzles, the computer and the matches all call these same functions. */
(function(){
/* ================= Pentago ================= */
const PENTAGO=(function(){
  const W=[]; const at=(r,c)=>r*6+c;
  for(let r=0;r<6;r++)for(let c=0;c<6;c++)for(const [dr,dc] of [[0,1],[1,0],[1,1],[1,-1]]){ const w=[]; for(let k=0;k<5;k++){ const rr=r+dr*k,cc=c+dc*k; if(rr<0||rr>5||cc<0||cc>5){ w.length=0; break; } w.push(at(rr,cc)); } if(w.length===5) W.push(w); }
  const QORG=[[0,0],[0,3],[3,0],[3,3]];
  const newState=()=>({cells:new Array(36).fill(0),turn:1,phase:'place',over:false,winner:0,lines:[],reason:'',moves:[]});
  const clone=s=>({...s,cells:s.cells.slice(),lines:s.lines.slice(),moves:s.moves.slice()});
  const lineOf=(cells,p)=>W.filter(w=>w.every(i=>cells[i]===p));
  function rotate(cells,q,dir){ const out=cells.slice(); const [r0,c0]=QORG[q]; for(let r=0;r<3;r++)for(let c=0;c<3;c++){ const src=dir>0?[2-c,r]:[c,2-r]; out[at(r0+r,c0+c)]=cells[at(r0+src[0],c0+src[1])]; } return out; }   // dir 1 = clockwise
  const legal=s=>s.over?[]:(s.phase==='place'?s.cells.map((v,i)=>v===0?{t:'place',cell:i}:null).filter(Boolean):[0,1,2,3].flatMap(q=>[{t:'rot',q,d:1},{t:'rot',q,d:-1}]));
  function apply(s,m){ const n=clone(s); n.moves.push(m);
    if(m.t==='place'){ n.cells[m.cell]=s.turn; const L=lineOf(n.cells,s.turn); if(L.length){ n.over=true; n.winner=s.turn; n.lines=L; n.reason='placement'; } else n.phase='rot'; return n; }
    n.cells=rotate(s.cells,m.q,m.d); const l1=lineOf(n.cells,1), l2=lineOf(n.cells,2);
    if(l1.length&&l2.length){ n.over=true; n.winner=0; n.lines=[...l1,...l2]; n.reason='both'; }
    else if(l1.length||l2.length){ n.over=true; n.winner=l1.length?1:2; n.lines=l1.length?l1:l2; n.reason='rotation'; }
    else if(n.cells.every(v=>v)){ n.over=true; n.winner=0; n.reason='full'; }
    else { n.phase='place'; n.turn=3-s.turn; } return n; }
  const evalFor=(cells,p)=>{ let sc=0; for(const w of W){ let a=0,b=0; for(const i of w){ if(cells[i]===p)a++; else if(cells[i]) b++; } if(!b) sc+=[0,1,5,25,120,10000][a]; else if(!a) sc-=[0,1,5,25,120,10000][b]; } return sc; };
  return {W,newState,clone,lineOf,rotate,legal,apply,evalFor,QORG};
})();

/* ================= TOOT & OTTO (4 rows x 6 columns, gravity, six T and six O each) ================= */
const TOOT=(function(){
  const R=4,C=6,idx=(r,c)=>r*C+c; const WIN=[];
  for(let r=0;r<R;r++)for(let c=0;c<C;c++)for(const [dr,dc] of [[0,1],[1,0],[1,1],[1,-1]]){ const w=[]; for(let k=0;k<4;k++){ const rr=r+dr*k,cc=c+dc*k; if(rr<0||rr>=R||cc<0||cc>=C){ w.length=0; break; } w.push(idx(rr,cc)); } if(w.length===4) WIN.push(w); }
  const newState=()=>({board:new Array(R*C).fill(''),sup:[null,{T:6,O:6},{T:6,O:6}],turn:1,over:false,winner:0,cells:[],words:[],moves:[]});
  const clone=s=>({...s,board:s.board.slice(),sup:[null,{...s.sup[1]},{...s.sup[2]}],cells:s.cells.slice(),words:s.words.slice(),moves:s.moves.slice()});
  const landing=(s,col)=>{ for(let r=R-1;r>=0;r--) if(!s.board[idx(r,col)]) return r; return -1; };
  const legal=s=>{ if(s.over) return []; const out=[]; for(let c=0;c<C;c++){ if(landing(s,c)<0) continue; for(const ch of ['T','O']) if(s.sup[s.turn][ch]>0) out.push({ch,col:c}); } return out; };
  function scan(board){ const found={TOOT:[],OTTO:[]}; for(const w of WIN){ const str=w.map(i=>board[i]).join(''); if(str==='TOOT') found.TOOT.push(w); else if(str==='OTTO') found.OTTO.push(w); } return found; }
  function apply(s,m){ const n=clone(s); const r=landing(s,m.col); n.board[idx(r,m.col)]=m.ch; n.sup[s.turn][m.ch]--; n.moves.push({...m,row:r,by:s.turn});
    const f=scan(n.board); const a=f.TOOT.length>0, b=f.OTTO.length>0;
    if(a&&b){ n.over=true; n.winner=0; n.words=['TOOT','OTTO']; n.cells=[...f.TOOT.flat(),...f.OTTO.flat()]; }
    else if(a){ n.over=true; n.winner=1; n.words=['TOOT']; n.cells=f.TOOT.flat(); }
    else if(b){ n.over=true; n.winner=2; n.words=['OTTO']; n.cells=f.OTTO.flat(); }
    else if(n.board.every(x=>x)){ n.over=true; n.winner=0; } else n.turn=3-s.turn;
    return n; }
  return {R,C,idx,WIN,newState,clone,landing,legal,scan,apply};
})();

/* ================= Domineering (player 1 places vertical dominoes, player 2 horizontal) ================= */
const DOM=(function(){
  const newState=(R=5,C=5,holes=[])=>{ const cells=new Array(R*C).fill(0); holes.forEach(i=>{ if(i>=0&&i<R*C) cells[i]=9; }); return {R,C,cells,turn:1,over:false,winner:0,trap:null,moves:[]}; };
  const clone=s=>({...s,cells:s.cells.slice(),moves:s.moves.slice()});
  /* orientOf(seatNum)->'v'|'h' lets an online match decouple orientation from seat number; omit it and player 1 is
     always vertical, player 2 always horizontal, exactly as before. */
  const movesFor=(s,p,orientOf)=>{ const out=[]; const {R,C,cells}=s; const vertical=orientOf?orientOf(p)==='v':p===1; for(let r=0;r<R;r++)for(let c=0;c<C;c++){ const i=r*C+c; if(cells[i]) continue; if(vertical){ if(r+1<R&&!cells[i+C]) out.push({r,c}); } else if(c+1<C&&!cells[i+1]) out.push({r,c}); } return out; };
  const legal=(s,orientOf)=>s.over?[]:movesFor(s,s.turn,orientOf);
  const cellsOf=(s,m,p,orientOf)=>{ const vertical=orientOf?orientOf(p)==='v':p===1; return vertical?[m.r*s.C+m.c,(m.r+1)*s.C+m.c]:[m.r*s.C+m.c,m.r*s.C+m.c+1]; };
  function apply(s,m){ const n=clone(s); const cs=cellsOf(s,m,s.turn); cs.forEach(i=>n.cells[i]=s.turn); n.moves.push({...m,p:s.turn,cells:cs});
    const next=3-s.turn; if(movesFor(n,next).length===0){ n.over=true; n.winner=s.turn; n.trap={loser:next,empties:n.cells.map((v,i)=>v===0?i:-1).filter(i=>i>=0)}; } else n.turn=next; return n; }
  return {newState,clone,movesFor,legal,cellsOf,apply};
})();

/* ================= Notakto (everyone plays X; the player who closes the last open board loses) ================= */
const NOTAKTO=(function(){
  const LINES=[0b000000111,0b000111000,0b111000000,0b001001001,0b010010010,0b100100100,0b100010001,0b001010100];
  const hasLine=m=>LINES.some(l=>(m&l)===l);
  const newState=(n=3)=>({boards:new Array(n).fill(0),closed:new Array(n).fill(false),turn:1,over:false,loser:0,winner:0,lastLine:null,moves:[]});
  const clone=s=>({...s,boards:s.boards.slice(),closed:s.closed.slice(),moves:s.moves.slice()});
  const legal=s=>{ if(s.over) return []; const out=[]; s.boards.forEach((m,b)=>{ if(s.closed[b]) return; for(let c=0;c<9;c++) if(!(m&(1<<c))) out.push({b,c}); }); return out; };
  const lineIn=m=>LINES.find(l=>(m&l)===l)||0;
  function apply(s,mv){ const n=clone(s); n.boards[mv.b]|=(1<<mv.c); n.moves.push({...mv,by:s.turn}); if(hasLine(n.boards[mv.b])){ n.closed[mv.b]=true; n.lastLine={b:mv.b,mask:lineIn(n.boards[mv.b])}; if(n.closed.every(Boolean)){ n.over=true; n.loser=s.turn; n.winner=3-s.turn; return n; } } n.turn=3-s.turn; return n; }
  /* exact solver: a position is the multiset of open boards, each reduced to its canonical form under the 8 symmetries of a square */
  const SYM=(()=>{ const perms=[]; const base=[0,1,2,3,4,5,6,7,8]; const rot=p=>[6,3,0,7,4,1,8,5,2].map(i=>p[i]); const flip=p=>[2,1,0,5,4,3,8,7,6].map(i=>p[i]); let p=base; for(let k=0;k<4;k++){ perms.push(p); perms.push(flip(p)); p=rot(p); } return perms; })();
  const canon=m=>{ let best=1e9; for(const p of SYM){ let v=0; for(let c=0;c<9;c++) if(m&(1<<c)) v|=1<<p.indexOf(c); if(v<best) best=v; } return best; };
  const CM=new Map(); const cn=m=>{ let v=CM.get(m); if(v===undefined){ v=canon(m); CM.set(m,v); } return v; };
  const memo=new Map();
  function moverWins(open){ /* open: sorted array of canonical masks of the boards still in play; true when the player to move can force the opponent to close the last board */
    if(!open.length) return true; const key=open.join(','); const hit=memo.get(key); if(hit!==undefined) return hit; let res=false;
    const seen=new Set(); for(let i=0;i<open.length&&!res;i++){ if(seen.has(open[i])) continue; seen.add(open[i]); const m=open[i];
      for(let c=0;c<9&&!res;c++){ if(m&(1<<c)) continue; const nm=m|(1<<c); const rest=open.slice(0,i).concat(open.slice(i+1)); let next;
        if(hasLine(nm)){ if(!rest.length) continue; next=rest; } else next=rest.concat([cn(nm)]).sort((a,b)=>a-b);
        if(!moverWins(next)) res=true; } }
    memo.set(key,res); return res; }
  const openList=s=>s.boards.map((m,b)=>s.closed[b]?null:cn(m)).filter(x=>x!==null).sort((a,b)=>a-b);
  function perfectMoves(s){ const out=[]; for(const mv of legal(s)){ const n=apply(s,mv); if(n.over) continue; if(!moverWins(openList(n))) out.push(mv); } return out; }
  return {LINES,hasLine,newState,clone,legal,apply,lineIn,openList,moverWins,perfectMoves,canon:cn};
})();
/* ================= Sim ================= */
const SIM_CORE=(function(){
  const cache={};
  function geom(n){ if(cache[n]) return cache[n]; const edges=[],id={}; for(let i=0;i<n;i++)for(let j=i+1;j<n;j++){ id[i+','+j]=edges.length; edges.push([i,j]); }
    const e=(a,b)=>id[Math.min(a,b)+','+Math.max(a,b)]; const tris=[]; for(let a=0;a<n;a++)for(let b=a+1;b<n;b++)for(let c=b+1;c<n;c++) tris.push([e(a,b),e(b,c),e(a,c)]);
    const byEdge=edges.map((_,k)=>tris.filter(t=>t.includes(k))); return cache[n]={n,edges,tris,byEdge}; }
  const newState=(n=6,reverse=false)=>({n,reverse,own:new Array(geom(n).edges.length).fill(0),turn:1,over:false,winner:0,tri:null,moves:[]});
  const clone=s=>({...s,own:s.own.slice(),moves:s.moves.slice()});
  const legal=s=>s.over?[]:s.own.map((o,i)=>o===0?i:-1).filter(i=>i>=0);
  const completes=(s,e,p)=>geom(s.n).byEdge[e].find(t=>t.every(k=>k===e||s.own[k]===p))||null;      // the triangle player p would finish by claiming e
  function apply(s,e){ const n=clone(s); n.own[e]=s.turn; n.moves.push(e); const t=completes(s,e,s.turn);
    if(t){ n.over=true; n.winner=s.reverse?s.turn:3-s.turn; n.tri=t; } else n.turn=3-s.turn; return n; }
  return {geom,newState,clone,legal,completes,apply};
})();
/* plain globals in a page (window) and in the computer's Web Worker (self) */
const root=typeof window!=='undefined'?window:self;
root.ZF_E=Object.assign(root.ZF_E||{},{PENTAGO,TOOT,DOM,NOTAKTO,SIM:SIM_CORE});
})();
