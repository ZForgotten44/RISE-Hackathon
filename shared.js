/* shared.js: game data and the game-card component.
   index.html (carousel) and arcade.html (grid) both build their cards from this file, so a change to a game,
   an illustration, or the card design shows up in both places. Marks and tiles use the same drawing
   primitives as the entry-screen demonstrations (rounded strokes, square cells, one poison symbol). */
(function(){
const ZF_E=window.ZF_E;
const CSS=`
.gcard{--cbg:var(--card-bg);--cink:var(--card-ink);position:relative;flex:0 0 300px;min-height:560px;height:auto;display:grid;grid-template-rows:auto auto auto minmax(0,1fr) auto auto;align-content:start;padding:22px;border:1px solid var(--card-edge);border-radius:var(--r-card);background:var(--card-bg);color:var(--card-ink);box-shadow:0 3px 0 rgba(0,0,0,.45);transition:transform .18s ease,background .18s ease,color .18s ease,border-color .18s ease,box-shadow .18s ease;user-select:none;cursor:pointer;touch-action:pan-y}
.gcard.on{--cbg:var(--card-bg-on);--cink:var(--card-ink-on);background:var(--card-bg-on);color:var(--card-ink-on);border-color:var(--card-edge-on);transform:translateY(-4px);box-shadow:0 14px 26px rgba(0,0,0,.32)}
.gcard .gi{font:500 13px/1 var(--font-mono);letter-spacing:.06em;color:var(--card-meta);height:16px}
.gcard.on .gi{color:var(--card-meta-on)}
.gcard .art{height:216px;margin:14px 0 18px;display:flex;align-items:center;justify-content:center;min-height:0}
.gcard .art svg{width:100%;height:100%;color:currentColor;overflow:visible}
.gcard h3{font:700 var(--fs-card-title)/1.12 var(--font-sans);letter-spacing:-.015em;min-height:2.24em;margin:0 0 10px;color:inherit}
.gcard h3 .aka{display:block;margin-top:6px;font:600 11.5px/1.2 var(--font-mono);letter-spacing:.08em;text-transform:uppercase;color:var(--card-sub)}
.gcard .rule{font:400 16.5px/1.5 var(--font-sans);color:var(--card-sub);min-height:0}
.gcard.on .rule{color:var(--card-sub-on)}
.gcard .gmeta{font:500 12.5px/1.4 var(--font-mono);letter-spacing:.02em;color:var(--card-meta);margin:14px 0 16px}
.gcard.on .gmeta{color:var(--card-meta-on)}
.gcard .acts{display:flex;gap:18px;align-items:center}
.gcard .playbtn{display:inline-flex;align-items:center;gap:8px;min-height:44px;padding:0 20px;border-radius:10px;background:var(--card-ink);color:var(--card-bg);font:600 var(--fs-btn)/1 var(--font-sans);letter-spacing:.01em;transition:background .18s,color .18s}
.gcard.on .playbtn{background:var(--card-ink-on);color:var(--card-bg-on)}
.gcard .rules-link{position:relative;z-index:2;padding:10px 2px;font:500 15px/1 var(--font-sans);color:var(--card-sub);border-bottom:1px solid transparent}
.gcard .rules-link:hover{border-bottom-color:currentColor}
.gcard.on .rules-link{color:var(--card-sub-on)}
.gcard .cardlink{color:inherit;-webkit-user-drag:none}
.gcard .cardlink::after{content:"";position:absolute;inset:0;z-index:1;border-radius:var(--r-card)}
.gcard .cardlink:focus-visible{outline:none}
.gcard .cardlink:focus-visible::after{outline:2px solid var(--fg);outline-offset:3px;box-shadow:0 0 0 5px var(--bg)}
.gcard .rules-link:focus-visible{outline:2px solid currentColor;outline-offset:3px}
.gcard .playbtn,.gcard .rules-link{-webkit-user-drag:none}
.zfgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:28px 26px;align-items:stretch}
.zfgrid .gcard{flex:none;width:100%}
/* illustration behaviour (shared by every card) */
.gcard .zpv{transition:opacity .2s}
.gcard .zt{transition:transform .35s ease,opacity .3s ease}
/* 4x4: the hinted square gets its mark, then the winning line draws */
.a4 .zhint{stroke-dasharray:6 6}.a4 .zwin{opacity:0}.a4 .zline{stroke-dasharray:180;stroke-dashoffset:180;opacity:0}
.gcard:is(.on,.live) .a4 .zhint{opacity:0}.gcard:is(.on,.live) .a4 .zwin{animation:zpop .25s .1s both}.gcard:is(.on,.live) .a4 .zline{opacity:.5;animation:zdrawc .5s .35s forwards}
@keyframes zpop{from{opacity:0;transform:scale(.4)}to{opacity:1;transform:scale(1)}}
@keyframes zdrawc{to{stroke-dashoffset:0}}
.a4 .zwin{transform-box:fill-box;transform-origin:center}
/* recursive: X plays, its destination lights, O answers there, the board O points to lights briefly; both marks stay */
.au .zm1,.au .zm2,.au .zd1,.au .zd2{opacity:0}
.au .zm1,.au .zm2{transform-box:fill-box;transform-origin:center}
.gcard:is(.on,.live) .au .zact{animation:zra 4.6s forwards}
.gcard:is(.on,.live) .au .zm1{animation:zrm1 4.6s forwards}
.gcard:is(.on,.live) .au .zd1{animation:zrd1 4.6s forwards}
.gcard:is(.on,.live) .au .zm2{animation:zrm2 4.6s forwards}
.gcard:is(.on,.live) .au .zd2{animation:zrd2 4.6s forwards}
@keyframes zra{0%,10%{opacity:1}16%,100%{opacity:0}}
@keyframes zrm1{0%,4%{opacity:0;transform:scale(.4)}9%,100%{opacity:1;transform:scale(1)}}
@keyframes zrd1{0%,15%{opacity:0}20%,44%{opacity:1}50%,100%{opacity:0}}
@keyframes zrm2{0%,30%{opacity:0;transform:scale(.4)}36%,100%{opacity:1;transform:scale(1)}}
@keyframes zrd2{0%,50%{opacity:0}56%,88%{opacity:1}96%,100%{opacity:.0}}
/* 3D: a faint X appears at the empty cell, is placed, a line runs through all three Xs across the layers, then everything fades back */
.ac .zghost3,.ac .zx3,.ac .zline3{opacity:0}
.ac .zline3{stroke-dasharray:190;stroke-dashoffset:190}
.gcard:is(.on,.live) .ac .zghost3{animation:zc3g 3.8s both}
.gcard:is(.on,.live) .ac .zx3{animation:zc3x 3.8s both}
.gcard:is(.on,.live) .ac .zline3{animation:zc3l 3.8s both}
.gcard:is(.on,.live) .ac .zwx{animation:zc3w 3.8s both}
@keyframes zc3g{0%{opacity:0}6%{opacity:.4}22%{opacity:.4}26%,100%{opacity:0}}
@keyframes zc3x{0%,24%{opacity:0;transform:scale(.4)}30%{opacity:1;transform:scale(1)}86%{opacity:1}96%,100%{opacity:0}}
@keyframes zc3l{0%,30%{opacity:.85;stroke-dashoffset:190}52%{opacity:.85;stroke-dashoffset:0}86%{opacity:.85;stroke-dashoffset:0}96%,100%{opacity:0;stroke-dashoffset:0}}
@keyframes zc3w{0%,50%{transform:scale(1);stroke-width:var(--sw)}58%{transform:scale(1.28);stroke-width:calc(var(--sw)*1.5)}84%{transform:scale(1.28);stroke-width:calc(var(--sw)*1.5)}96%,100%{transform:scale(1);stroke-width:var(--sw)}}
.ac .zx3,.ac .zwx{transform-box:fill-box;transform-origin:center}
/* sim: the fatal edge is claimed, the triangle fills, everything else steps back */
.as .zstri{opacity:0}.as .zsf{stroke-dasharray:var(--L);stroke-dashoffset:var(--L);opacity:0}
.gcard:is(.on,.live) .as .zsf{animation:zsd 3.4s forwards}.gcard:is(.on,.live) .as .zstri{animation:zst 3.4s forwards}.gcard:is(.on,.live) .as .zsdim{animation:zsm 3.4s forwards}.gcard:is(.on,.live) .as .zshint{opacity:0}
@keyframes zsd{0%,12%{opacity:1;stroke-dashoffset:var(--L)}42%,100%{opacity:1;stroke-dashoffset:0}}
@keyframes zst{0%,45%{opacity:0}62%,100%{opacity:1}}
@keyframes zsm{0%,45%{opacity:1}65%,100%{opacity:.25}}
/* toot & otto */
.at .ztfall,.at .ztw,.at .ztt2{opacity:0}
.gcard:is(.on,.live) .at .ztfall{animation:ztf 4.2s forwards}.gcard:is(.on,.live) .at .ztw{animation:ztl 4.2s forwards}.gcard:is(.on,.live) .at .ztt2{animation:ztl 4.2s forwards}.gcard:is(.on,.live) .at .ztt1{animation:ztg 4.2s forwards}
@keyframes ztf{0%,10%{opacity:1;transform:translateY(var(--fy))}38%,100%{opacity:1;transform:translateY(0)}}
@keyframes ztl{0%,45%{opacity:0}58%,100%{opacity:1}}
@keyframes ztg{0%,45%{opacity:1}58%,100%{opacity:0}}
/* notakto */
.an3 .znx,.an3 .zn2,.an3 .zn3{opacity:0}
.gcard:is(.on,.live) .an3 .znx0{animation:znx 4.4s forwards}.gcard:is(.on,.live) .an3 .znx1{animation:znx2 4.4s forwards}.gcard:is(.on,.live) .an3 .znx2{animation:znx3 4.4s forwards}
.gcard:is(.on,.live) .an3 .zn1{animation:znh1 4.4s forwards}.gcard:is(.on,.live) .an3 .zn2{animation:znh2 4.4s forwards}.gcard:is(.on,.live) .an3 .zn3{animation:znh3 4.4s forwards}
.gcard:is(.on,.live) .an3 .znb1{animation:znc1 4.4s forwards}.gcard:is(.on,.live) .an3 .znb0{animation:znc0 4.4s forwards}
@keyframes znx{0%,8%{opacity:0}16%,100%{opacity:1}}@keyframes znx2{0%,40%{opacity:0}48%,100%{opacity:1}}@keyframes znx3{0%,64%{opacity:0}72%,100%{opacity:1}}
@keyframes znc1{0%,24%{opacity:1}40%,100%{opacity:.28}}@keyframes znc0{0%,76%{opacity:1}92%,100%{opacity:.28}}
@keyframes znh1{0%,22%{opacity:1}30%,100%{opacity:0}}@keyframes znh2{0%,26%{opacity:0}34%,74%{opacity:1}80%,100%{opacity:0}}@keyframes znh3{0%,78%{opacity:0}86%,100%{opacity:1}}
/* nim: the top tokens are proposed, taken, and the rest stays put */
.an .zcut{transition:opacity .3s .5s,transform .4s .5s}
.gcard:is(.on,.live) .an .zcut{opacity:0;transform:translateY(-18px)}
.an .zcuthatch{opacity:0}
.gcard:is(.on,.live) .an .zcuthatch{animation:zchh 1.1s both}
/* chomp: the proposed bite is hatched for a beat, then exactly those tiles go */
.ah .zhatch,.ah .zprop{opacity:0}
.gcard:is(.on,.live) .ah .zhatch{animation:zchh 1.5s both}.gcard:is(.on,.live) .ah .zprop{animation:zchp 1.5s both}
@keyframes zchh{0%{opacity:0}10%,58%{opacity:1}68%,100%{opacity:0}}
@keyframes zchp{0%{opacity:0}10%,58%{opacity:1}68%{opacity:.0}100%{opacity:0}}
.ah .zbite{transform-box:fill-box;transform-origin:center;transition:opacity .3s,transform .3s}
.gcard:is(.on,.live) .ah .zbite{opacity:0;transform:scale(.55);transition:opacity .3s .95s,transform .3s .95s}
.gcard .cardlink{cursor:pointer}
`+ZART.card.css;
/* ---------- shared drawing primitives ---------- */
const MK={
  x:(cx,cy,r,w,cls)=>`<g class="${cls||''}" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" fill="none"><line x1="${cx-r}" y1="${cy-r}" x2="${cx+r}" y2="${cy+r}"/><line x1="${cx+r}" y1="${cy-r}" x2="${cx-r}" y2="${cy+r}"/></g>`,
  o:(cx,cy,r,w,cls)=>`<circle class="${cls||''}" cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="currentColor" stroke-width="${w}"/>`,
  skull:(x,y,size,fill)=>`<g transform="translate(${x} ${y}) scale(${size/24})" fill="${fill}"><path fill-rule="evenodd" d="M12 2C7.6 2 4.5 5.2 4.5 9.4c0 2.5 1.1 4.1 2.5 5.1V18a1.5 1.5 0 0 0 1.5 1.5h.8V21h2v-1.5h1.4V21h2v-1.5h.8A1.5 1.5 0 0 0 17 18v-3.5c1.4-1 2.5-2.6 2.5-5.1C19.5 5.2 16.4 2 12 2Zm-3.3 8.2a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm6.6 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z"/></g>`
};
/* the same rules as the engines in arcade.html (CHOMP.has/bite/removed, genLines3): the previews are built from legal moves and checked */
const CHOMP_CORE={
  rect:(R,C)=>new Array(R).fill(C),
  has:(len,C,r,c)=>r<len.length&&c>=C-len[r]&&c<C,
  isPoison:(C,r,c)=>r===0&&c===C-1,
  bite(len,C,r,c){ const out=len.slice(), keep=C-1-c; for(let i=r;i<len.length;i++) out[i]=Math.min(out[i],keep); return out; },
  removed(len,C,r,c){ const cells=[]; for(let i=r;i<len.length;i++) for(let cc=C-len[i]; cc<=c; cc++) cells.push([i,cc]); return cells; }
};
function genLines3(n){ const set=new Map(), dirs=[]; for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++)for(let dz=-1;dz<=1;dz++){ if(dx||dy||dz) dirs.push([dx,dy,dz]); }
  for(let x=0;x<n;x++)for(let y=0;y<n;y++)for(let z=0;z<n;z++)for(const [dx,dy,dz] of dirs){ const cells=[]; for(let k=0;k<n;k++){ const cx=x+dx*k,cy=y+dy*k,cz=z+dz*k; if(cx<0||cy<0||cz<0||cx>=n||cy>=n||cz>=n){cells.length=0;break;} cells.push(cx*n*n+cy*n+cz); } if(cells.length===n){ const key=cells.slice().sort((a,b)=>a-b).join(','); set.set(key,cells); } }
  return [...set.values()]; }
const LINES3=genLines3(3);
const isWin3=cells=>{ const k=cells.slice().sort((a,b)=>a-b).join(','); return LINES3.some(L=>L.slice().sort((a,b)=>a-b).join(',')===k); };
const ULT_CORE=(function(){
  const L3=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  const newState=()=>({cells:new Array(81).fill(0),bw:new Array(9).fill(0),next:-1,player:1,winner:0,moves:[]});
  const lineWin=(get,p)=>L3.some(l=>l.every(i=>get(i)===p));
  const boardFull=(s,b)=>{ for(let c=0;c<9;c++) if(!s.cells[b*9+c]) return false; return true; };
  function legal(s){ if(s.winner) return []; const out=[]; const boards=s.next>=0?[s.next]:[...Array(9).keys()].filter(b=>s.bw[b]===0); for(const b of boards){ if(s.bw[b]) continue; for(let c=0;c<9;c++) if(!s.cells[b*9+c]) out.push(b*9+c); } return out; }
  function play(s,idx){ const b=Math.floor(idx/9),c=idx%9,p=s.player; s.cells[idx]=p; s.moves.push(idx);
    if(lineWin(i=>s.cells[b*9+i],p)) s.bw[b]=p; else if(boardFull(s,b)) s.bw[b]=3;
    if(lineWin(i=>s.bw[i]===p?p:0,p)) s.winner=p; else if(s.bw.every(v=>v!==0)) s.winner=3;
    s.next=s.bw[c]===0?c:-1; s.player=3-p; return s; }
  return {newState,legal,play};
})();

/* ================= Quarto engine (pieces are 4-bit ids: 1 tall · 2 round · 4 light · 8 hollow) ================= */
const QUARTO_CORE=(function(){
  const LINES=[[0,1,2,3],[4,5,6,7],[8,9,10,11],[12,13,14,15],[0,4,8,12],[1,5,9,13],[2,6,10,14],[3,7,11,15],[0,5,10,15],[3,6,9,12]];
  const TRAITS=[['tall','short'],['round','square'],['light','dark'],['hollow','solid']];
  const newState=()=>({board:new Array(16).fill(-1),avail:[...Array(16).keys()],offered:-1,phase:'give',turn:1,over:false,winner:0,line:null,common:0,moves:[]});
  const clone=s=>({...s,board:s.board.slice(),avail:s.avail.slice(),moves:s.moves.slice()});
  const commonMask=ps=>{ let a=15,o=0; for(const p of ps){ a&=p; o|=p; } return a|(~o&15); };                 // a bit is set when all four pieces agree on it
  function winAt(board){ for(const L of LINES){ const ps=L.map(i=>board[i]); if(ps.every(p=>p>=0)){ const m=commonMask(ps); if(m) return {line:L,common:m}; } } return null; }
  const traitList=(mask,piece)=>[0,1,2,3].filter(b=>mask&(1<<b)).map(b=>TRAITS[b][(piece>>b)&1?0:1]);
  function legal(s){ if(s.over) return []; return s.phase==='give'?s.avail.map(p=>({t:'give',piece:p})):[...Array(16).keys()].filter(i=>s.board[i]<0).map(i=>({t:'place',cell:i})); }
  function apply(s,m){ const n=clone(s); n.moves.push(m);
    if(m.t==='give'){ n.offered=m.piece; n.avail=n.avail.filter(x=>x!==m.piece); n.phase='place'; n.turn=3-s.turn; return n; }
    n.board[m.cell]=s.offered; const piece=s.offered; n.offered=-1; const w=winAt(n.board);
    if(w){ n.over=true; n.winner=s.turn; n.line=w.line; n.common=w.common; n.winPiece=piece; }
    else if(n.board.every(x=>x>=0)){ n.over=true; n.winner=0; } else n.phase='give';
    return n; }
  const winsIfPlaced=(board,piece,cell)=>{ const b=board.slice(); b[cell]=piece; return !!winAt(b); };
  const canWin=(board,piece)=>{ for(let i=0;i<16;i++) if(board[i]<0&&winsIfPlaced(board,piece,i)) return true; return false; };
  const safePieces=(board,avail)=>avail.filter(p=>!canWin(board,p));
  return {LINES,TRAITS,newState,clone,commonMask,winAt,traitList,legal,apply,canWin,safePieces,winsIfPlaced};
})();

/* ================= Sim engine (n vertices in a ring; players claim edges; completing your own triangle loses) ================= */
const SIM_CORE=ZF_E.SIM;   /* the Sim rules live in engines2.js so the computer can also run them in a Web Worker */
const isoP=(cx,cy,s,i,j)=>{ const u=(i+.5)/3,v=(j+.5)/3; return [cx+(u-v)*s, cy-s/2+(u+v)*s/2]; };

/* Quarto piece glyph, drawn in a 60 x 80 box: height = tall/short, body = round/square, fill = light/dark, opening = hollow/solid.
   Every trait is readable without colour. bgVar is the colour a "light" piece is filled with. */
const quartoGlyph=(p,x,y,sc)=>ZART.qPiece(p,x,y,sc);
const PREVIEW={};
const ART={
  four(){ const c=44,x0=12,y0=12,px=i=>x0+(i%4)*c+c/2, py=i=>y0+Math.floor(i/4)*c+c/2; let g='';
    for(let k=1;k<4;k++) g+=`<path d="M${x0+k*c} ${y0+6}V${y0+4*c-6}M${x0+6} ${y0+k*c}H${x0+4*c-6}" stroke="currentColor" stroke-opacity=".38" stroke-width="3" stroke-linecap="round"/>`;
    [0,5,10].forEach(i=>g+=MK.x(px(i),py(i),10,4.6)); [3,7,12].forEach(i=>g+=MK.o(px(i),py(i),10,4.6));
    g+=`<rect class="zhint" x="${px(15)-c/2+7}" y="${py(15)-c/2+7}" width="${c-14}" height="${c-14}" rx="6" fill="none" stroke="currentColor" stroke-width="2.4"/>`+MK.x(px(15),py(15),10,4.6,'zwin')+`<line class="zline" x1="${px(0)}" y1="${py(0)}" x2="${px(15)}" y2="${py(15)}" stroke="currentColor" stroke-width="9" stroke-linecap="round"/>`;
    return `<svg viewBox="0 0 200 200" class="a4" role="img" aria-label="4 by 4 board with three X in a diagonal">${g}</svg>`; },
  ult(){ const B=58,G=13,bx=b=>(b%3)*(B+G),by=b=>Math.floor(b/3)*(B+G),C=B/3,cx=(b,c)=>bx(b)+(c%3)*C+C/2,cy=(b,c)=>by(b)+Math.floor(c/3)*C+C/2;
    /* every move is checked against the routing rules; the highlighted boards are read from the game state, not typed in */
    const st=ULT_CORE.newState(); const play=idx=>{ if(!ULT_CORE.legal(st).includes(idx)) throw new Error('illegal recursive preview move '+idx); ULT_CORE.play(st,idx); return st.next; };
    for(const m of [36,4,44,76]) play(m);                       // X:(4,0) O:(0,4) X:(4,8) O:(8,4)
    const active=st.next;                                        // board 4: X must play here
    const opening=st.moves.slice();
    const m1=active*9+2, d1=play(m1);                            // X plays its top-right cell → the top-right board
    const m2=d1*9+6, d2=play(m2);                                // O answers in the destination, its bottom-left cell → the bottom-left board
    if(d1!==2||d2!==6) throw new Error('recursive preview routing changed');
    let g='';
    for(let b=0;b<9;b++){ g+=`<rect class="${b===active?'zact':''}" x="${bx(b)}" y="${by(b)}" width="${B}" height="${B}" rx="7" fill="currentColor" fill-opacity="${b===active?.16:.07}" stroke="currentColor" stroke-width="${b===active?2.6:0}"/>`;
      g+=`<path d="M${bx(b)+C} ${by(b)+5}V${by(b)+B-5}M${bx(b)+2*C} ${by(b)+5}V${by(b)+B-5}M${bx(b)+5} ${by(b)+C}H${bx(b)+B-5}M${bx(b)+5} ${by(b)+2*C}H${bx(b)+B-5}" stroke="currentColor" stroke-opacity=".42" stroke-width="1.1" stroke-linecap="round"/>`; }
    for(const [b,cls] of [[d1,'zd1'],[d2,'zd2']]) g+=`<rect class="${cls}" x="${bx(b)}" y="${by(b)}" width="${B}" height="${B}" rx="7" fill="currentColor" fill-opacity=".16" stroke="currentColor" stroke-width="2.6"/>`;
    opening.forEach((idx,k)=>{ const b=Math.floor(idx/9),c=idx%9; g+=k%2===0?MK.x(cx(b,c),cy(b,c),4.4,2.4):MK.o(cx(b,c),cy(b,c),4.4,2.4); });
    g+=MK.x(cx(Math.floor(m1/9),m1%9),cy(Math.floor(m1/9),m1%9),4.4,2.6,'zm1')+MK.o(cx(Math.floor(m2/9),m2%9),cy(Math.floor(m2/9),m2%9),4.4,2.6,'zm2');
    return `<svg viewBox="0 0 200 200" class="au" role="img" aria-label="nine separate local boards: an X sends play to the top-right board, an O there sends play to the bottom-left board">${g}</svg>`; },
  cube(){ const s=88,hh=s*.3,cx0=100,ys=[34,98,162]; let g='';
    /* cell (i,j) of layer l is engine cell x=i,y=j,z=l. Two Xs on (0,2,0) and (1,1,1); the empty (2,0,2) completes a body diagonal. */
    const X3=[[0,2,0],[1,1,1]], WIN=[2,0,2], O3=[[2,1,0],[1,2,1],[0,0,2]];
    if(!isWin3([...X3,WIN].map(([i,j,l])=>i*9+j*3+l))) throw new Error('3D preview line is not a winning line');
    const key=p=>p.join(','); const used=new Set([...X3,WIN].map(key)); if(O3.some(p=>used.has(key(p)))) throw new Error('3D preview marks share a cell');
    const pt=(i,j,l)=>{ const u=(i+.5)/3,v=(j+.5)/3; return [cx0+(u-v)*s, ys[l]-hh+(u+v)*hh]; };   // centre of a cell, the one place a mark may be drawn
    /* marks are drawn in the plates' own (u,v) plane and projected with the same map as the grid, so each sits flat in the middle of its cell */
    const uvP=(l,u,v)=>[cx0+(u-v)*s, ys[l]-hh+(u+v)*hh];
    const xP=(i,j,l,w,cls)=>{ const u=(i+.5)/3,v=(j+.5)/3,d=.085,a=uvP(l,u-d,v-d),b=uvP(l,u+d,v+d),c=uvP(l,u-d,v+d),e=uvP(l,u+d,v-d); return `<g class="${cls||''}" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" fill="none"><line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}"/><line x1="${c[0]}" y1="${c[1]}" x2="${e[0]}" y2="${e[1]}"/></g>`; };
    const oP=(i,j,l,w)=>{ const u=(i+.5)/3,v=(j+.5)/3,pts=[]; for(let k=0;k<24;k++){ const t=k/24*Math.PI*2, q=uvP(l,u+Math.cos(t)*.1,v+Math.sin(t)*.1); pts.push(q[0].toFixed(2)+' '+q[1].toFixed(2)); } return `<path d="M${pts.join('L')}Z" fill="none" stroke="currentColor" stroke-width="${w}"/>`; };
    [2,1,0].forEach(l=>{ const y=ys[l], op=[1,.8,.62][l]; const P=(u,v)=>[cx0+(u-v)*s, y-hh+(u+v)*hh]; let d='';
      for(let k=1;k<3;k++){ const a=P(k/3,0),b=P(k/3,1),c=P(0,k/3),e=P(1,k/3); d+=`M${a[0]} ${a[1]}L${b[0]} ${b[1]}M${c[0]} ${c[1]}L${e[0]} ${e[1]}`; }
      g+=`<g opacity="${op}"><path d="M${cx0-s} ${y}L${cx0} ${y-hh}L${cx0+s} ${y}L${cx0} ${y+hh}Z" fill="var(--cbg)" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/><path d="${d}" stroke="currentColor" stroke-opacity=".5" stroke-width="1.1" fill="none"/></g>`; });
    const [wx,wy]=pt(...WIN), pa=pt(...X3[0]);
    for(const [i,j,l] of O3){ g+=oP(i,j,l,2.5); }
    g+=`<g style="--sw:2.8">`+X3.map(([i,j,l])=>xP(i,j,l,2.8,'zwx')).join('')+`</g>`;
    g+=xP(WIN[0],WIN[1],WIN[2],2.8,'zghost3')+`<g class="zx3"><g style="--sw:2.8">`+xP(WIN[0],WIN[1],WIN[2],2.8,'zwx')+`</g></g>`;
    g+=`<line class="zline3" x1="${pa[0]}" y1="${pa[1]}" x2="${wx}" y2="${wy}" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>`;
    return `<svg viewBox="0 0 200 200" class="ac" role="img" aria-label="three separated layers of a cube with two Xs on a diagonal and one empty cell that completes it">${g}</svg>`; },
  nim(){ const tw=32,th=13,gap=5,base=180,x0=18,sp=44; let g=`<line x1="10" y1="${base+4}" x2="190" y2="${base+4}" stroke="currentColor" stroke-opacity=".4" stroke-width="2.4" stroke-linecap="round"/>`;
    [1,3,5,7].forEach((n,p)=>{ for(let k=0;k<n;k++){ const y=base-(k+1)*(th+gap)+gap, cut=p===3&&k>=5;
      g+=`<rect class="${cut?'zcut':''}" x="${x0+p*sp}" y="${y}" width="${tw}" height="${th}" rx="3.5" fill="currentColor"/>`;
      if(cut) g+=`<rect class="zcuthatch" x="${x0+p*sp-2}" y="${y-2}" width="${tw+4}" height="${th+4}" rx="5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-dasharray="4 3"/>`; } });
    return `<svg viewBox="0 0 200 200" class="an" role="img" aria-label="four piles of tokens with the top two of the last pile about to be taken">${g}</svg>`; },
  chomp(){ const t=34,x0=17,y0=30,R=4,C=5, K=CHOMP_CORE; let len=K.rect(R,C);
    for(const [r,c] of [[3,1],[2,0]]){ if(!K.has(len,C,r,c)||K.isPoison(C,r,c)) throw new Error('illegal chomp preview move'); len=K.bite(len,C,r,c); }   // opening position: legal bites from a full board
    const PR=[2,2]; if(!K.has(len,C,...PR)||K.isPoison(C,...PR)) throw new Error('illegal chomp proposal');
    const gone=K.removed(len,C,...PR), isGone=(r,c)=>gone.some(([a,b])=>a===r&&b===c);
    const at=(r,c)=>[x0+c*t,y0+r*t]; let g='<defs><pattern id="zhat" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="7" height="7" fill="currentColor"/><rect width="3.2" height="7" fill="var(--cbg)"/></pattern></defs>';
    for(let r=0;r<R;r++)for(let c=0;c<C;c++){ if(!K.has(len,C,r,c)) continue; const [x,y]=at(r,c), p=K.isPoison(C,r,c);
      g+=`<rect class="${isGone(r,c)?'zbite':''}" x="${x}" y="${y}" width="${t-5}" height="${t-5}" rx="5" fill="currentColor" fill-opacity="${p?1:.82}"/>`;
      if(p) g+=MK.skull(x+5,y+5,t-15,'var(--cbg)'); }
    for(const [r,c] of gone){ const [x,y]=at(r,c); g+=`<rect class="zhatch" x="${x}" y="${y}" width="${t-5}" height="${t-5}" rx="5" fill="url(#zhat)" stroke="currentColor" stroke-width="1.4"/>`; }
    const [px,py]=at(...PR); g+=`<rect class="zprop" x="${px-3}" y="${py-3}" width="${t+1}" height="${t+1}" rx="8" fill="none" stroke="currentColor" stroke-width="2.4" stroke-dasharray="5 4"/>`;
    return `<svg viewBox="0 0 200 200" class="ah" role="img" aria-label="a chocolate grid with a proposed bite that removes the chosen tile and everything below and to its left">${g}</svg>`; },
  quarto(){ const r=ZART.card.quarto(QUARTO_CORE); PREVIEW.quarto=r.preview; return r.svg; },
  sim(){ const S=SIM_CORE, n=6, geo=S.geom(n); const eid=(a,b)=>geo.edges.findIndex(e=>e[0]===Math.min(a,b)&&e[1]===Math.max(a,b));
    let st=S.newState(n); for(const [a,b] of [[0,2],[1,3],[2,4],[3,5]]){ const e=eid(a,b); if(!S.legal(st).includes(e)||S.completes(st,e,st.turn)) throw new Error('illegal sim preview move'); st=S.apply(st,e); }
    const fatal=eid(0,4), tri=S.completes(st,fatal,1); PREVIEW.sim={st,fatal}; if(!tri||st.turn!==1) throw new Error('sim preview: the last edge is not fatal'); const end=S.apply(st,fatal); if(!end.over||end.winner!==2) throw new Error('sim preview: expected P1 to lose');
    const R=76,cx=100,cy=100,V=[...Array(n).keys()].map(k=>{ const a=-Math.PI/2+k*2*Math.PI/n; return [cx+R*Math.cos(a),cy+R*Math.sin(a)]; });
    const line=(e,extra)=>{ const [a,b]=geo.edges[e]; return `<line x1="${V[a][0].toFixed(1)}" y1="${V[a][1].toFixed(1)}" x2="${V[b][0].toFixed(1)}" y2="${V[b][1].toFixed(1)}" stroke-linecap="round" ${extra}/>`; };
    let g='<g class="zsdim">'; geo.edges.forEach((_,e)=>{ if(e===fatal||tri.includes(e)) return; if(st.own[e]===0) g+=line(e,'stroke="currentColor" stroke-opacity=".1" stroke-width="1.2"'); else if(st.own[e]===2) g+=line(e,'stroke="currentColor" stroke-width="3.6" stroke-dasharray="7 7"'); });
    g+='</g>'; const pts=[...new Set(tri.flatMap(k=>geo.edges[k]))].map(v=>V[v].join(',')).join(' ');
    g+=`<polygon class="zstri" points="${pts}" fill="currentColor" fill-opacity=".16"/>`; tri.forEach(k=>{ if(k!==fatal) g+=line(k,'stroke="currentColor" stroke-width="4.6"'); });
    const [fa,fb]=geo.edges[fatal], L=Math.ceil(Math.hypot(V[fa][0]-V[fb][0],V[fa][1]-V[fb][1]));
    g+=line(fatal,`class="zshint" stroke="currentColor" stroke-opacity=".55" stroke-width="2.4" stroke-dasharray="2 7"`)+line(fatal,`class="zsf" stroke="currentColor" stroke-width="4.6" style="--L:${L}"`);
    V.forEach(([x,y],i)=>{ g+=`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="7.5" fill="var(--cbg)" stroke="currentColor" stroke-width="3"/>`; });
    [...new Set(tri.flatMap(k=>geo.edges[k]))].forEach(v=>{ g+=`<circle class="zsv" cx="${V[v][0].toFixed(1)}" cy="${V[v][1].toFixed(1)}" r="13" fill="none" stroke="currentColor" stroke-width="2.4" stroke-dasharray="3 4"/>`; });
    g+=`<text class="zsc zsc1" x="100" y="204" text-anchor="middle" font-size="11" font-weight="700" fill="currentColor" font-family="var(--font-sans)">One more solid edge closes it</text><text class="zsc zsc2" x="100" y="204" text-anchor="middle" font-size="11" font-weight="700" fill="currentColor" font-family="var(--font-sans)">Triangle closed: solid loses</text>`;
    return `<svg viewBox="0 0 200 210" class="as" role="img" aria-label="six dots: two solid edges of one player and two dashed edges of the other; one more solid edge completes a triangle and loses">${g}</svg>`; },
  pentago(){ return ZART.card.pentago(ZF_E.PENTAGO); },
  toot(){ return ZART.card.toot(ZF_E.TOOT); },
  c4(){ return window.ZC4Art?ZC4Art.card():''; },
  domineering(){ return ZART.card.domineering(ZF_E.DOM); },
  notakto(){ const E=ZF_E.NOTAKTO; let st=E.newState(3); const seq=[[1,4],[1,8],[1,7],[2,8],[0,6],[0,2],[0,1],[1,0],[0,8],[0,7]]; let start=null, tail=[];
    seq.forEach(([b,c],k)=>{ if(!E.legal(st).some(m=>m.b===b&&m.c===c)) throw new Error('illegal notakto preview move'); const n=E.apply(st,{b,c}); if(!start&&n.closed.some(Boolean)){ start=st; } if(start) tail.push([b,c]); st=n; });
    if(!start||!st.closed[0]||!st.closed[1]||st.closed[2]||st.over) throw new Error('notakto preview: two boards must close while one stays open'); if(tail.length>4) throw new Error('notakto preview too long');
    const cs=14,bw=cs*3, xs=[10,74,138], y0=64; let g=''; let cur=start; const stepIdx=tail.map(()=>0);
    xs.forEach((bx,b)=>{ const line=(cur0=>0)(0); g+=`<g class="znb znb${b}"><rect x="${bx-4}" y="${y0-4}" width="${bw+8}" height="${bw+8}" rx="8" fill="currentColor" fill-opacity=".07" stroke="currentColor" stroke-opacity=".5" stroke-width="1.6"/><path d="M${bx+cs} ${y0}v${bw}M${bx+2*cs} ${y0}v${bw}M${bx} ${y0+cs}h${bw}M${bx} ${y0+2*cs}h${bw}" stroke="currentColor" stroke-opacity=".4" stroke-width="1.2"/>`;
      for(let c=0;c<9;c++) if(start.boards[b]&(1<<c)) g+=xmark(bx+(c%3)*cs+cs/2,y0+Math.floor(c/3)*cs+cs/2,4.2,2.2);
      tail.forEach(([tb,tc],k)=>{ if(tb===b) g+=`<g class="znx znx${k}">${xmark(bx+(tc%3)*cs+cs/2,y0+Math.floor(tc/3)*cs+cs/2,4.2,2.2)}</g>`; });
      g+='</g>'; });
    function xmark(x,y,r,w){ return `<g stroke="currentColor" stroke-width="${w}" stroke-linecap="round"><line x1="${x-r}" y1="${y-r}" x2="${x+r}" y2="${y+r}"/><line x1="${x+r}" y1="${y-r}" x2="${x-r}" y2="${y+r}"/></g>`; }
    g+=`<text x="100" y="40" text-anchor="middle" font-size="13" font-weight="700" fill="currentColor" font-family="var(--font-mono)" class="zn1">3 boards</text><text x="100" y="40" text-anchor="middle" font-size="13" font-weight="700" fill="currentColor" font-family="var(--font-mono)" class="zn2">2 boards remain</text><text x="100" y="40" text-anchor="middle" font-size="13" font-weight="700" fill="currentColor" font-family="var(--font-mono)" class="zn3">1 board remains</text>`;
    g+=`<text x="100" y="170" text-anchor="middle" font-size="11" fill="currentColor" font-family="var(--font-sans)" font-weight="600" opacity=".8">both play X · close the last board and you lose</text>`;
    return `<svg viewBox="0 0 200 200" class="an3" data-steps="${tail.map(([b])=>b).join('')}" role="img" aria-label="Notakto: three boards; X marks close two of them while the third stays open">${g}</svg>`; },
  bridge(){ return `<svg viewBox="0 0 256 216" role="img" aria-label="One More Bridge: a bridge grows, tips across the gap, and the duck walks over">${ZDuck.bridgeArt()}</svg>`; },
  duckie(){ return `<svg viewBox="0 0 256 216" role="img" aria-label="Save the Duckie: a duck waits, lets a bus pass, hops across the road and reaches the pond">${ZDuck.duckieArt()}</svg>`; },
  gold(){ const r=ZART.card.gold(ZF_E.GOLD); PREVIEW.gold=r.preview; return r.svg; },
  crowd(){ return ZART.card.crowd(); },
  message(){ return ZART.card.message(); },
  penny(){ return ZART.card.penny(); },
  /* the four heritage games draw their own cards (heritage-art.js) */
  heritage(id){ const A=window.ZF_HERITAGE_ART; return A&&A[id]?A[id]():''; }
};
const GAMES=[
/* default order, used by the homepage carousel and the All Games page (filters keep this relative order). Party games
   (party-app.js + server/party) run one room on a shared screen with everyone playing on their own phone. */
 {id:'gold',name:'Bao Gold',aka:'The Gold Coin',rule:'Slide a coin left, or take the leftmost coin. Whoever takes the gold wins.',meta:'1–2 players · perfect computer · analysis by Hamkins',slug:'gold-coin',link:'/gold-coin',art:ART.gold()},
 {id:'chomp',name:'Cacao',aka:'Chomp',rule:'Bite a tile and everything below-left of it. The corner is poison.',meta:'1–2 players · exact solver',slug:'chomp',link:'/chomp',art:ART.chomp()},
 {id:'nim',name:'Pingala’s Piles',aka:'Nim',rule:'Take any number from one pile. Last token wins, or loses.',meta:'1–2 players · normal & misère',slug:'nim',link:'/nim',art:ART.nim()},
 {id:'pentago',name:'Maya Wheels',aka:'Pentago',rule:'Place a marble, then twist a quadrant. Five in a row wins.',meta:'1–2 players · three difficulty levels',slug:'pentago',link:'/pentago',art:ART.pentago()},
 {id:'notakto',name:'Kolam',aka:'Notakto',rule:'Both players place X. Close the last open board and you lose.',meta:'1–2 players · perfect play on 1 or 3 boards',slug:'notakto',link:'/notakto',art:ART.notakto()},
 {id:'toot',name:'Viloma',aka:'TOOT & OTTO',rule:'Drop a T or an O. Spell your word, but your opponent wins if you spell theirs.',meta:'1–2 players · searches four moves ahead',slug:'toot-otto',link:'/toot-otto',art:ART.toot()},
 {id:'sim',name:'Sona',aka:'Sim',rule:'Claim edges between six dots. Complete a triangle of your own and you lose.',meta:'1–2 players · exact endgame',slug:'sim',link:'/sim',art:ART.sim()},
 /* heritage games: rules from their own traditions and sources (Dasapada and Patolli rebuilt, with each rule tagged) */
 {id:'morabaraba',name:'Morabaraba',rule:'Line up three cows to make a mill, then shoot one of theirs.',meta:'1–2 players · Southern Africa',slug:'morabaraba',link:'/morabaraba',art:ART.heritage('morabaraba')},
 {id:'chaupar',name:'Chaupar',rule:'Throw the long dice and race your partner colours round the cross and home.',meta:'1–2 players · India',slug:'chaupar',link:'/chaupar',art:ART.heritage('chaupar')},
 {id:'dasapada',name:'Dasapada',rule:'Grab nuts, count by fours: lie down, rise, stand, walk. Three across wins.',meta:'1–2 players · rebuilt rules',slug:'dasapada',link:'/dasapada',art:ART.heritage('dasapada')},
 {id:'patolli',name:'Patolli',rule:'Throw the numbered beans and race six pebbles round the X-shaped mat.',meta:'1–2 players · rebuilt rules',slug:'patolli',link:'/patolli',art:ART.heritage('patolli')}
];
/* Infinitely More articles by Joel David Hamkins: credited for the explanation and analysis, not as the inventor of each game */
const AUTHOR={name:'Joel David Hamkins',url:'https://substack.com/@joeldavidhamkins'};
const CREDIT={
 'nim':{url:'https://www.infinitelymore.xyz/p/game-of-nim',title:'The Game of Nim'},
 'chomp':{url:'https://www.infinitelymore.xyz/p/chomp',title:'Chomp'},
 'gold-coin':{url:'https://www.infinitelymore.xyz/p/gold-coin-game',title:'The Gold Coin'}};
/* games with a real, working "online friend" room (see each game's own online-*.js adapter). Their card's label
   row says Online, with a green dot. Keep this in sync with each register()'s own online() hook. */
const ONLINE_IDS=new Set(['c4','nim','gold','sim','pentago','toot','domineering','notakto','pond','trap','tail']);
/* party games run in a shared room too; their label says Party, with a muted purple dot, and nothing else is stacked on it */
const PARTY_IDS=new Set(['quack','explain','duckoff','wrongpond','normal','court','mafia']);
function creditHTML(slug,full){ const c=CREDIT[slug]; if(!c) return ''; const a=`<a href="${AUTHOR.url}" target="_blank" rel="noopener noreferrer">${AUTHOR.name}</a>`, im=`<a class="cr-go" href="${c.url}" target="_blank" rel="noopener noreferrer" title="${c.title}"><i>Infinitely More</i> ↗</a>`;
  return full?`<p>Based on the game presentation and strategy by ${a} in ${im}. The rules text, lessons, computer opponents and artwork on this site are our own.</p>`
    :`<span class="cr-l">Credits</span> Based on the game presentation and strategy by ${a} in ${im}.`; }
const EXTRA=`
/* the label row under the premise: at most one mode label (Party or Online, each with its dot) and a quiet player count */
.gcard .glabels{display:flex;flex-wrap:wrap;align-items:center;gap:4px 8px;font:500 14px/1.35 var(--font-sans);letter-spacing:0}
.gcard .glabels .mode{display:inline-flex;align-items:center;gap:7px;font-weight:600;color:var(--card-ink)}
.gcard.on .glabels .mode{color:var(--card-ink-on)}
.gcard .glabels .sep{opacity:.7}
.gcard .glabels .count{color:var(--card-sub)}
.gcard.on .glabels .count{color:var(--card-sub-on)}
.gcard .glabels .dot{width:8px;height:8px;border-radius:50%;background:#3ecf5f;flex:none}
.gcard .glabels .mode.party .dot{background:#9580c8}
@media (max-width:640px){.gcard .glabels{font-size:15px}}
/* phone autoplay (see liveCard below): a card that scrolled or swiped away freezes its illustration where it was */
.gcard.held .art *{animation-play-state:paused!important}
`;
/* categories for the Category menu on All Games (Strategy · Arcade · Party · Theory & stories). The 'stories' tag is the
   original single-player pieces built around a paradox or a situation rather than a board. */
const TAGS={emm:['stories','strategy'],tail:['arcade','party'],gold:['strategy'],duckie:['arcade'],bridge:['arcade'],four:['strategy'],ult:['strategy'],cube:['strategy'],nim:['strategy'],chomp:['strategy'],quarto:['strategy'],sim:['strategy'],pentago:['strategy'],toot:['strategy'],domineering:['strategy'],notakto:['strategy'],morabaraba:['strategy'],chaupar:['strategy'],dasapada:['strategy'],patolli:['strategy'],crowd:['stories'],message:['stories'],penny:['stories'],pond:['party'],trap:['arcade'],quack:['party'],explain:['party'],duckoff:['party'],wrongpond:['party'],normal:['party'],court:['party'],mafia:['party']};
/* the smallest room each party game starts with (server/party/games/*.js minPlayers); rooms hold up to 50, except
   One Duck Off, which shares one drawing and stops at 10 (maxPlayers) */
const PARTY_MIN={quack:4,explain:4,duckoff:3,wrongpond:4,normal:3,court:4,mafia:7}, PARTY_MAX={duckoff:10};
/* familiar words people search for that a title or premise doesn't already contain */
const KEYWORDS={emm:'force win winning strategy domineering dominoes game tree strategy proof theorem zermelo backward induction minimax logic math hamkins',c4:'connect 4 four in a row drop discs gravity variations pull rug rotate turn board wildcard hidden bluff',tail:'snake slither nibbles worm grow tail cut steal multiplayer group io arcade',trap:'duck platformer platform build course obstacles trap race ultimate chicken horse friends two',quack:'quiplash jackbox funny answers prompts comedy writing vote laugh',pond:'duck couple couples friends date questions dilemma would you rather predict partner two',gold:'coins',duckie:'duck frogger road river crossing',bridge:'duck stick hero timing',nim:'tokens matches piles math',chomp:'chocolate bar poison',four:'tic tac toe tictactoe noughts crosses xo',cube:'tic tac toe tictactoe noughts crosses 3d xo',ult:'tic tac toe tictactoe ultimate super noughts crosses xo',notakto:'tic tac toe tictactoe noughts crosses xo misere',sim:'graph triangles lines',pentago:'marbles five in a row rotate twist',toot:'connect four letters words',quarto:'pieces traits',morabaraba:'mill morris mlabalaba umlabalaba cows south africa nine mens morris twelve',chaupar:'chaupad chausar pachisi ludo parcheesi india dice cross',dasapada:'buddha india ancient lost board game nuts dice ashtapada',patolli:'aztec maya mexico beans ancient race mat',domineering:'dominoes tiles',message:'story generals coordination',crowd:'story bar el farol crowd',penny:'duck coins story paradox',explain:'duck imposter spy questions friends group',duckoff:'duck drawing draw sketch doodle imposter friends group',wrongpond:'duck word spy imposter chameleon friends group',normal:'duck writing rules funny friends group',court:'duck trial lawyer judge argue friends group',mafia:'duck werewolf roles night vote friends group'};
GAMES.forEach(g=>{ g.tags=TAGS[g.id]||['strategy'];
  const party=PARTY_IDS.has(g.id), online=ONLINE_IDS.has(g.id), count=g.meta.split(' · ')[0];
  /* what the player filters on All Games read: solo (a computer or one-player game), local (two on one device), online (a remote friend), group (a party room) */
  g.modes={solo:!party&&/^1/.test(count),local:!party&&(/^(1–)?2/.test(count)||!!g.keyboard),online,group:party||!!g.roomCount};
  g.players=party?`${PARTY_MIN[g.id]}–${PARTY_MAX[g.id]||50} players`:count;
  g.mode=party?'party':online?'online':null;
  g.keywords=(KEYWORDS[g.id]||'')+(online?' online friends remote':'')+(g.modes.local?' two players same device':''); });
function injectCSS(){ if(document.getElementById('zf-cards')) return; const st=document.createElement('style'); st.id='zf-cards'; st.textContent=CSS+EXTRA; document.head.appendChild(st); }
/* Phones have no hover, so pages call these instead: liveCard(c,true) plays a card's illustration (the same
   animation hover plays, via .live, without the hover colours), and liveCard(c,false) freezes it where it is (.held).
   Playing a frozen card resumes it; one whose run already finished starts again from the top. Loops that never end
   (a bobbing duck, drifting clouds) don't count as unfinished. Reduced motion: nothing plays, the resting frame
   (which each illustration draws as the story's last beat) stays. */
const REDUCE=matchMedia('(prefers-reduced-motion:reduce)');
function liveCard(c,play){
  if(!play){ if(c.classList.contains('live')) c.classList.add('held'); return; }
  if(REDUCE.matches) return;
  if(c.classList.contains('live')){
    if(!c.classList.contains('held')) return;
    const anims=c.getAnimations?c.getAnimations({subtree:true}).filter(a=>a.effect&&a.effect.getTiming().iterations!==Infinity):[];
    if(anims.some(a=>a.playState!=='finished')){ c.classList.remove('held'); return; }
  }
  c.classList.remove('live','held'); void c.offsetWidth; c.classList.add('live'); }
/* All Games on a phone: a card plays while it is substantially on screen (60% of the card, or of the screen for a card
   taller than it) and freezes when it leaves. Devices with hover keep the hover and focus trigger only. */
const NOHOVER=matchMedia('(hover:none)');
const gridIO=('IntersectionObserver' in window)?new IntersectionObserver(es=>es.forEach(e=>{
  if(!NOHOVER.matches) return;
  const vh=e.rootBounds?e.rootBounds.height:innerHeight, big=e.intersectionRect.height>=vh*.6;
  liveCard(e.target,e.isIntersecting&&(e.intersectionRatio>=.6||big)); }),{threshold:[0,.2,.4,.6,.8,1]}):null;

/* one card. The whole card is the Play link (a stretched link on the title); Rules stays a separate link above it.
   opts.onOpen(game,'play'|'rules', event) lets a page handle the action itself instead of navigating. */
function makeCard(g,i,opts){
  opts=opts||{}; injectCSS();
  /* opts.room (the Create a room page): the same card, but its action opens the game's Room settings (/<game>?create,
     which never creates a room by itself) and the count is what an online room holds, not the game's solo range */
  const room=!!opts.room, pick=room&&!!g.modeScreen, href=room&&!pick?`/${g.slug}?create`:g.link, count=room&&g.mode!=='party'?(g.roomCount||'2 players'):g.players;
  const c=document.createElement('article'); c.className='gcard'; c.dataset.id=g.id; if(opts.drag) c.setAttribute('data-cursor-drag','');
  const labels=`<div class="gmeta glabels">${g.mode?`<span class="mode ${g.mode}"><span class="dot" aria-hidden="true"></span>${g.mode==='party'?'Party':'Online'}</span><span class="sep" aria-hidden="true">·</span>`:''}<span class="count">${count}</span></div>`;
  /* the number is a position in the homepage carousel; the All Games grid passes num:false (filtered results would read
     01, 04, 05 like gaps or a ranking) and keeps the empty row so the art sits exactly where it did */
  const num=opts.num===false?'':String(i+1).padStart(2,'0');
  c.innerHTML=`<div class="gi"${num?'':' aria-hidden="true"'}>${num}</div><div class="art">${g.art}</div><h3><a class="cardlink" href="${href}" draggable="false"${room&&!pick?` aria-label="${g.name}: set up room"`:''}>${g.name}</a>${g.aka?`<small class="aka">${g.aka}</small>`:''}</h3><div class="rule">${g.rule}</div>${labels}<div class="acts"><span class="playbtn" aria-hidden="true">${pick?'Play →':room?'Set up room →':'Play ↗'}</span><a class="rules-link" href="${g.link}#rules" draggable="false" data-cursor="RULES" aria-label="${g.name} rules">Rules</a></div>`;
  const go=(kind,e)=>{ if(opts.shouldSuppress&&opts.shouldSuppress()){ e.preventDefault(); return; } if(opts.onOpen&&!e.metaKey&&!e.ctrlKey&&!e.shiftKey){ e.preventDefault(); opts.onOpen(g,kind,e); } };
  c.querySelector('.cardlink').addEventListener('click',e=>go('play',e));
  c.querySelector('.rules-link').addEventListener('click',e=>{ e.stopPropagation(); go('rules',e); });
  c.addEventListener('click',e=>{ if(e.target.closest('a'))return; if(opts.shouldSuppress&&opts.shouldSuppress())return; c.querySelector('.cardlink').click(); });   // unused card space
  const others=()=>c.parentElement?[...c.parentElement.querySelectorAll('.gcard.on')]:[];
  const on=v=>{ others().forEach(x=>{ if(x!==c)x.classList.remove('on'); }); c.classList.toggle('on',v); };
  c.addEventListener('mouseenter',()=>on(true)); c.addEventListener('mouseleave',()=>on(false));
  c.addEventListener('focusin',()=>on(true)); c.addEventListener('focusout',()=>on(false));
  return c; }

/* opts.only(game) keeps a subset (Create a room shows only the games that have rooms), in the same order */
function renderGrid(el,opts){ el.classList.add('zfgrid'); el.innerHTML=''; GAMES.forEach((g,i)=>{ if(opts&&opts.only&&!opts.only(g)) return; const c=makeCard(g,i,opts); el.appendChild(c); if(gridIO) gridIO.observe(c); }); return el; }


/* ---------- setup / rules backdrops: one composed grayscale illustration per game ----------
   Drawn on a 1600x900 canvas cropped with "slice": big shapes hug the edges, the middle stays quiet,
   opacities stay far below the controls, and nothing takes pointer events. */
const BG_CSS=`#zfbg{position:fixed;inset:0;z-index:0;pointer-events:none;overflow:hidden;color:var(--fg,#fff);opacity:0;transition:opacity .45s;
-webkit-mask-image:radial-gradient(ellipse 46% 58% at 0% 100%,#000 0,#000 30%,transparent 100%),radial-gradient(ellipse 22% 30% at 100% 0%,#000 0,transparent 100%);
mask-image:radial-gradient(ellipse 46% 58% at 0% 100%,#000 0,#000 30%,transparent 100%),radial-gradient(ellipse 22% 30% at 100% 0%,#000 0,transparent 100%)}
#zfbg.on{opacity:1}#zfbg svg{position:absolute;inset:0;width:100%;height:100%;opacity:var(--bgop,.06)}#zfbg svg.acc{opacity:var(--bgacc,.05)}   /* the one gold accent (The Gold Coin) shows as muted gold, not as a grey ghost */
/* The Gold Coin's coins are filled shapes, so one opacity reads differently per theme: on dark the pale coin faces carry
   the contrast across their whole area, on light only the thin dark rims do. Tuned so the strongest part of the trace sits
   near 1.08:1 (dark) and 1.11:1 (light, rims only) against the page, at or below the grey traces of the other games. */
#zfbg{--bgacc:.05}html[data-inv="1"] [data-tone="dark"] #zfbg,html[data-inv="0"] [data-tone="light"] #zfbg{--bgacc:.065}
@media (max-width:800px){#zfbg .lg{display:none}}
#zfbg .port{display:none}
@media (max-aspect-ratio:1/1){#zfbg .land{display:none}#zfbg .port{display:block}
#zfbg{-webkit-mask-image:radial-gradient(ellipse 100% 42% at 0% 100%,#000 0,#000 35%,transparent 100%);mask-image:radial-gradient(ellipse 100% 42% at 0% 100%,#000 0,#000 35%,transparent 100%)}}`;
const bX=(x,y,r,w)=>`<g stroke="currentColor" stroke-width="${w}" stroke-linecap="round"><line x1="${x-r}" y1="${y-r}" x2="${x+r}" y2="${y+r}"/><line x1="${x+r}" y1="${y-r}" x2="${x-r}" y2="${y+r}"/></g>`;
const bO=(x,y,r,w)=>`<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="currentColor" stroke-width="${w}"/>`;
function bGrid(x,y,c,cols,rows,w){ let d=''; for(let i=0;i<=cols;i++) d+=`M${x+i*c} ${y}V${y+rows*c}`; for(let j=0;j<=rows;j++) d+=`M${x} ${y+j*c}H${x+cols*c}`; return `<path d="${d}" fill="none" stroke="currentColor" stroke-width="${w}"/>`; }
function bUlt(ox,oy,B,marks,gap){ const g=gap||B*.06, S=B, C=S/3; let out='';
  for(let b=0;b<9;b++){ const x=ox+(b%3)*(S+g), y=oy+Math.floor(b/3)*(S+g); out+=bGrid(x,y,C,3,3,S*.008); out+=`<rect x="${x}" y="${y}" width="${S}" height="${S}" fill="none" stroke="currentColor" stroke-width="${S*.016}"/>`; }
  for(const [b,c,k] of marks){ const x=ox+(b%3)*(S+g)+(c%3)*C+C/2, y=oy+Math.floor(b/3)*(S+g)+Math.floor(c/3)*C+C/2; out+=k==='x'?bX(x,y,C*.24,S*.02):bO(x,y,C*.24,S*.02); }
  return out; }
function bIso(cx,cy,s,w){ const P=(u,v)=>[cx+(u-v)*s, cy-s/2+(u+v)*s/2]; let g=`<path d="M${cx-s} ${cy}L${cx} ${cy-s/2}L${cx+s} ${cy}L${cx} ${cy+s/2}Z" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linejoin="round"/>`; let d='';
  for(let k=1;k<3;k++){ const a=P(k/3,0),b=P(k/3,1),c=P(0,k/3),e=P(1,k/3); d+=`M${a[0]} ${a[1]}L${b[0]} ${b[1]}M${c[0]} ${c[1]}L${e[0]} ${e[1]}`; }
  return g+`<path d="${d}" fill="none" stroke="currentColor" stroke-width="${w*.5}"/>`; }
function bPile(x,base,n,tw,th,gap){ let g=''; for(let k=0;k<n;k++){ g+=`<rect x="${x}" y="${base-(k+1)*(th+gap)+gap}" width="${tw}" height="${th}" rx="${th*.2}" fill="currentColor"/>`; } return g; }
const SKULL=`<path fill="currentColor" fill-rule="evenodd" d="M12 2C7.6 2 4.5 5.2 4.5 9.4c0 2.5 1.1 4.1 2.5 5.1V18a1.5 1.5 0 0 0 1.5 1.5h.8V21h2v-1.5h1.4V21h2v-1.5h.8A1.5 1.5 0 0 0 17 18v-3.5c1.4-1 2.5-2.6 2.5-5.1C19.5 5.2 16.4 2 12 2Zm-3.3 8.2a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm6.6 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z"/>`;
function bChomp(x,y,t,cols,rows,eaten,skull){ let g=''; for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){ if(eaten&&eaten(c,r)) continue; const px=x+c*t, py=y+r*t, pois=skull&&r===0&&c===cols-1;
  g+=`<rect x="${px}" y="${py}" width="${t-t*.1}" height="${t-t*.1}" rx="${t*.1}" fill="currentColor"${pois?'':' opacity=".55"'}/>`; if(pois) g+=`<g transform="translate(${px+t*.2} ${py+t*.2}) scale(${t*.5/24})" style="color:var(--bg,#000)" fill="var(--bg,#000)"><path fill-rule="evenodd" d="M12 2C7.6 2 4.5 5.2 4.5 9.4c0 2.5 1.1 4.1 2.5 5.1V18a1.5 1.5 0 0 0 1.5 1.5h.8V21h2v-1.5h1.4V21h2v-1.5h.8A1.5 1.5 0 0 0 17 18v-3.5c1.4-1 2.5-2.6 2.5-5.1C19.5 5.2 16.4 2 12 2Zm-3.3 8.2a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm6.6 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z"/></g>`; }
  return g; }

/* Domineering: a board with vertical dominoes (solid) and horizontal ones (outlined), so both orientations read at a glance */
function bDom(x,y,c,cols,rows,pieces,blocked){ let g=bGrid(x,y,c,cols,rows,c*.022);
  (blocked||[]).forEach(([cc,r])=>{ const px=x+cc*c, py=y+r*c; g+=`<path d="M${px+c*.28} ${py+c*.28}L${px+c*.72} ${py+c*.72}M${px+c*.72} ${py+c*.28}L${px+c*.28} ${py+c*.72}" stroke="currentColor" stroke-width="${c*.05}" stroke-linecap="round"/>`; });
  pieces.forEach(([cc,r,v])=>{ const px=x+cc*c+c*.1, py=y+r*c+c*.1, w=v?c*.8:c*1.8, h=v?c*1.8:c*.8;
    g+=v?`<rect x="${px}" y="${py}" width="${w}" height="${h}" rx="${c*.16}" fill="currentColor"/>`:`<rect x="${px}" y="${py}" width="${w}" height="${h}" rx="${c*.16}" fill="none" stroke="currentColor" stroke-width="${c*.07}"/><path d="M${px+w/2} ${py+h*.22}V${py+h*.78}" stroke="currentColor" stroke-width="${c*.035}" stroke-linecap="round"/>`; });
  return g; }
/* Pentago: four 3x3 quadrants of holes with marbles, and a turn arrow around one quadrant */
function bPent(x,y,q,gap,marbles,turn){ const C=q/3; let g='';
  for(let k=0;k<4;k++){ const qx=x+(k%2)*(q+gap), qy=y+Math.floor(k/2)*(q+gap); g+=`<rect x="${qx}" y="${qy}" width="${q}" height="${q}" rx="${q*.08}" fill="none" stroke="currentColor" stroke-width="${q*.018}"/>`;
    for(let i=0;i<9;i++) g+=`<circle cx="${qx+(i%3)*C+C/2}" cy="${qy+Math.floor(i/3)*C+C/2}" r="${C*.3}" fill="none" stroke="currentColor" stroke-width="${q*.008}" opacity=".7"/>`; }
  marbles.forEach(([k,i,b])=>{ const qx=x+(k%2)*(q+gap), qy=y+Math.floor(k/2)*(q+gap), cx=qx+(i%3)*C+C/2, cy=qy+Math.floor(i/3)*C+C/2;
    g+=b?`<circle cx="${cx}" cy="${cy}" r="${C*.3}" fill="currentColor"/>`:`<circle cx="${cx}" cy="${cy}" r="${C*.3}" fill="none" stroke="currentColor" stroke-width="${q*.022}"/>`; });
  if(turn!=null){ const qx=x+(turn%2)*(q+gap), qy=y+Math.floor(turn/2)*(q+gap), cx=qx+q/2, cy=qy+q/2, R=q*.7, a0=-Math.PI*.46, a1=-Math.PI*.06, P=a=>[cx+R*Math.cos(a),cy+R*Math.sin(a)];
    const [sx,sy]=P(a0), [ex,ey]=P(a1), t=a1+Math.PI/2, hx=Math.cos(t), hy=Math.sin(t), nx=Math.cos(a1), ny=Math.sin(a1), L=q*.07;
    g+=`<path d="M${sx} ${sy}A${R} ${R} 0 0 1 ${ex} ${ey}" fill="none" stroke="currentColor" stroke-width="${q*.03}" stroke-linecap="round"/><path d="M${ex-hx*L+nx*L} ${ey-hy*L+ny*L}L${ex+hx*L*.6} ${ey+hy*L*.6}L${ex-hx*L-nx*L} ${ey-hy*L-ny*L}" fill="none" stroke="currentColor" stroke-width="${q*.03}" stroke-linecap="round" stroke-linejoin="round"/>`; }
  return g; }
/* a coin exactly as The Gold Coin draws it (zart.js coin: penny radius r, gold 1.5x), with a thin edge below it for depth */
const bCoin=(kind,cx,cy,r)=>{ const g=kind==='gold'; r=g?r*1.5:r; const fill=g?'#c9a63f':'#d5d2c7', edge=g?'#8d742a':'#3f3d36', rim=g?'#a98a2e':'#9a978c', d=r*.08;
  let s=`<g><circle cx="${cx}" cy="${cy+d}" r="${r}" fill="${edge}"/><circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" stroke="${edge}" stroke-width="${r*.045}"/><circle cx="${cx}" cy="${cy}" r="${r*.68}" fill="none" stroke="${rim}" stroke-width="${r*.035}"/>`;
  if(g){ const p=[]; for(let i=0;i<10;i++){ const a=-Math.PI/2+i*Math.PI/5, rr=i%2?r*.16:r*.36; p.push((cx+Math.cos(a)*rr).toFixed(1)+','+(cy+Math.sin(a)*rr).toFixed(1)); } s+=`<polygon points="${p.join(' ')}" fill="${edge}"/>`; }
  else s+=`<circle cx="${cx}" cy="${cy}" r="${r*.14}" fill="${rim}"/>`;
  return s+'</g>'; };
/* one large cropped motif in the bottom-left corner, one small detail in the top-right; both fade out before the content */
const BACKDROPS={
 four:()=>bGrid(-160,420,190,4,4,4)+bX(-65,515,50,9)+bO(125,705,50,9)+bX(315,515,50,9)+bO(125,895,50,9)+`<g class="lg">${bGrid(1440,60,30,4,4,2)+bX(1455,75,8,3)+bO(1485,105,8,3)}</g>`,
 ult:()=>bUlt(-150,380,150,[[4,4,'x'],[4,0,'o'],[0,8,'x'],[8,2,'o'],[2,3,'x'],[6,6,'o'],[1,5,'x'],[7,1,'o']],14)+`<g class="lg">${bUlt(1420,40,26,[[4,4,'o'],[0,2,'x']],4)}</g>`,
 cube:()=>[0,1,2].map(l=>bIso(200,430+l*135,300,3)).join('')+bX(200,430,24,6)+bO(200,565,24,6)+`<g class="lg">${bIso(1500,110,90,2)}</g>`,
 nim:()=>[[-30,3],[110,6],[250,4],[390,8]].map(([x,n])=>bPile(x,930,n,110,44,14)).join('')+`<g class="lg">${bPile(1470,170,3,44,18,6)+bPile(1530,170,5,44,18,6)}</g>`,
 quarto:()=>bGrid(-140,430,120,4,4,3)+`<g fill="currentColor" stroke="none">`+[0,5,10,11,3].map((p,k)=>`<g transform="translate(${-100+(k%3)*120} ${470+Math.floor(k/3)*120}) scale(.85)" color="currentColor">${quartoGlyph([12,5,10,3,9][k],0,0,1,'var(--bg,#000)')}</g>`).join('')+`</g>`+`<g class="lg">${bGrid(1440,60,28,4,4,2)}</g>`,
 sim:()=>{ const R=250,cx=190,cy=700,V=[...Array(6).keys()].map(k=>{const a=-Math.PI/2+k*Math.PI/3; return [cx+R*Math.cos(a),cy+R*Math.sin(a)];}); let d=''; for(let i=0;i<6;i++)for(let j=i+1;j<6;j++) d+=`M${V[i][0]} ${V[i][1]}L${V[j][0]} ${V[j][1]}`; return `<path d="${d}" fill="none" stroke="currentColor" stroke-width="3"/>`+V.map(([x,y])=>`<circle cx="${x}" cy="${y}" r="14" fill="var(--bg,#000)" stroke="currentColor" stroke-width="5"/>`).join('')+`<g class="lg"><polygon points="1500,60 1560,160 1440,160" fill="none" stroke="currentColor" stroke-width="3"/></g>`; },
 chomp:()=>bChomp(-90,300,120,7,5,(c,r)=>(r>=2&&c<=2)||(r>=3&&c<=3),true)+`<g class="lg">${bChomp(1450,50,34,4,3,(c,r)=>r>=2&&c<=1,true)}</g>`,
 domineering:()=>bDom(-130,380,128,6,5,[[0,0,1],[1,1,0],[3,0,1],[2,3,0],[4,2,1],[0,3,1],[1,4,0]],[[2,1]])+`<g class="lg">${bDom(1440,50,36,4,3,[[0,0,1],[1,0,0],[2,1,0]],[])}</g>`,
 pentago:()=>bPent(-40,410,222,24,[[0,4,1],[0,8,0],[1,6,1],[1,4,0],[2,2,1],[2,4,1],[3,0,1],[3,4,0],[3,6,0],[2,6,1]],3)+`<g class="lg">${bPent(1450,40,62,8,[[0,4,1],[3,4,0]],null)}</g>`,
 /* The Gold Coin: just three loose coins, the gold one and two pennies, drawn like the playable game's (ZART.coin) */
 gold:()=>({art:'', accent:bCoin('penny',372,792,58)+bCoin('penny',36,566,58)+bCoin('gold',168,706,58)})
};
let bgEl=null, bgKey=null;
const hasBackdrop=id=>!!BACKDROPS[id];
function backdrop(id){
  if(!bgEl){ const st=document.createElement('style'); st.id='zf-bg-css'; st.textContent=BG_CSS; document.head.appendChild(st); bgEl=document.createElement('div'); bgEl.id='zfbg'; bgEl.setAttribute('aria-hidden','true'); document.body.insertBefore(bgEl,document.body.firstChild); }
  if(!id||!BACKDROPS[id]){ bgEl.classList.remove('on'); bgKey=null; return; }
  if(bgKey!==id){ bgKey=id; const a=BACKDROPS[id](), art=typeof a==='string'?a:a.art, acc=typeof a==='string'?'':a.accent, box='viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" focusable="false"';
    /* portrait screens (phones) get the same drawing cropped to its corner motif and scaled to fit the width, bottom-left */
    const port='viewBox="-120 330 820 570" preserveAspectRatio="xMinYMax meet" focusable="false"';
    bgEl.innerHTML=`<svg class="land" ${box}>${art}</svg>${acc?`<svg class="acc land" ${box}>${acc}</svg>`:''}<svg class="port" ${port}>${art}</svg>${acc?`<svg class="acc port" ${port}>${acc}</svg>`:''}`; bgEl.classList.remove('on'); void bgEl.offsetWidth; }
  bgEl.classList.add('on'); }

/* ---------- press-and-hold game surfaces ----------
   One helper for every game that is played by holding a finger or the mouse on it (One More Bridge's canvas,
   Take Two's run button, Save the Duckie's board). On phones a long press would otherwise start text selection, show
   the copy/callout menu or drag an image, and a small finger drift could scroll the page and cancel the hold.
   - the surface itself: no selection, no callout, no image drag, no scrolling while touched (touch-action:none)
   - while a hold is active: the whole page refuses selection, so iOS cannot extend a selection from nearby text
   - the hold follows one pointer with pointer capture, so drifting off the surface keeps holding
   - release, pointercancel, lost capture, leaving the window, a hidden tab (app switch) and pagehide all end it;
     down(e) and up(reason) are the game's handlers: reason is 'up' for a normal release, anything else is an interruption.
   Text and scrolling everywhere else on the page are untouched. */
let holdCss=false;
function holdSurface(el,o){ o=o||{};
  if(!holdCss){ holdCss=true; const st=document.createElement('style'); st.id='zf-hold-css'; st.textContent='.zf-hold{-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;touch-action:none;-webkit-tap-highlight-color:transparent;-webkit-user-drag:none}.zf-hold *{-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;-webkit-user-drag:none}html.zf-holding,html.zf-holding *{-webkit-user-select:none!important;user-select:none!important;-webkit-touch-callout:none!important}'; document.head.appendChild(st); }
  el.classList.add('zf-hold'); el.setAttribute('draggable','false');
  let active=null; const html=document.documentElement;
  const end=(reason,ev)=>{ if(active===null) return; const id=active; active=null; html.classList.remove('zf-holding'); try{ if(el.hasPointerCapture&&el.hasPointerCapture(id)) el.releasePointerCapture(id); }catch(_){} if(o.up) o.up(reason,ev); };
  const down=e=>{ if(e.button>0||active!==null) return; if(o.accept&&!o.accept(e)) return; e.preventDefault(); active=e.pointerId; try{ el.setPointerCapture(e.pointerId); }catch(_){}
    html.classList.add('zf-holding'); try{ const sel=getSelection(); if(sel&&!sel.isCollapsed) sel.removeAllRanges(); }catch(_){} if(o.down) o.down(e); };
  const up=e=>{ if(e.pointerId===active) end('up',e); }, cancel=e=>{ if(e.pointerId===active) end('cancel'); }, lost=e=>{ if(e.pointerId===active) end('lost'); };
  const block=e=>{ if(e.cancelable) e.preventDefault(); };
  const bail=()=>end('interrupted'), vis=()=>{ if(document.hidden) bail(); };
  el.addEventListener('pointerdown',down); el.addEventListener('pointerup',up); el.addEventListener('pointercancel',cancel); el.addEventListener('lostpointercapture',lost);
  el.addEventListener('touchstart',block,{passive:false}); el.addEventListener('touchmove',block,{passive:false});
  ['contextmenu','selectstart','dragstart'].forEach(ev=>el.addEventListener(ev,block));
  window.addEventListener('blur',bail); window.addEventListener('pagehide',bail); document.addEventListener('visibilitychange',vis);
  return { holding:()=>active!==null, end:bail, destroy(){ bail(); el.removeEventListener('pointerdown',down); el.removeEventListener('pointerup',up); el.removeEventListener('pointercancel',cancel); el.removeEventListener('lostpointercapture',lost); el.removeEventListener('touchstart',block); el.removeEventListener('touchmove',block); ['contextmenu','selectstart','dragstart'].forEach(ev=>el.removeEventListener(ev,block)); window.removeEventListener('blur',bail); window.removeEventListener('pagehide',bail); document.removeEventListener('visibilitychange',vis); } }; }
/* fast game search (the homepage's Games heading): titles first, then familiar abbreviations and spellings, then the
   premise and keywords, then near misses (one or two typed letters off). Returns [{g,score}] best first, ties in the
   site's own order. */
const normQ=t=>String(t).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/&/g,' and ').replace(/(\d)\s*[×x]\s*(?=\d)/g,'$1 x ').replace(/[^a-z0-9]+/g,' ').trim();
const ALIAS={emm:'emm cyfi can you force it every move matters zermelo',c4:'connect4 connect 4 c4 four in a row 4 in a row',ult:'uttt ttt ultimate tic tac toe super tic tac toe meta tic tac toe',cube:'3d ttt 3dttt qubic',four:'4x4 ttt 4 in a row',gold:'gold coin coin game',quack:'qmu quiplash',toot:'toot otto tootandotto',mafia:'mafia werewolf dad',duckoff:'odo fake artist',wrongpond:'chameleon spyfall',normal:'pn',court:'trial',crowd:'el farol',penny:'penny partition paradox',message:'two generals',tail:'snake',trap:'ucah',duckie:'frogger crossy road',bridge:'stick hero'};
const lev=(a,b,max)=>{ if(Math.abs(a.length-b.length)>max) return max+1; let p=Array.from({length:b.length+1},(_,i)=>i);
  for(let i=1;i<=a.length;i++){ const c=[i]; let lo=i; for(let j=1;j<=b.length;j++){ c[j]=Math.min(p[j]+1,c[j-1]+1,p[j-1]+(a[i-1]===b[j-1]?0:1)); lo=Math.min(lo,c[j]); } if(lo>max) return max+1; p=c; } return p[b.length]; };
let SEARCH=null;
function searchIndex(){ if(SEARCH) return SEARCH; SEARCH=GAMES.map((g,i)=>{ const t=normQ(g.name).replace(/^the /,''), tw=t.split(' ');
  const al=normQ((ALIAS[g.id]||'')+' '+(g.aka||'')), ini=tw.map(w=>/^\d/.test(w)?w:w[0]).join('');
  return {g,i,t,tw,compact:t.replace(/ /g,''),alias:al,aw:(al+' '+ini).split(' ').filter(Boolean),ini,more:normQ([g.rule,g.keywords,g.tags.join(' ')].join(' ')).split(' ')}; }); return SEARCH; }
function findGames(q){ q=normQ(q); if(!q) return []; const qs=q.split(' '), qc=q.replace(/ /g,'');
  const pre=(words,x)=>words.some(w=>w.startsWith(x)||w.startsWith(x.replace(/s$/,'')));
  const near=(words,x)=>x.length>=4&&words.some(w=>lev(x,w.slice(0,x.length+1),x.length>=7?2:1)<=(x.length>=7?2:1)||lev(x,w,x.length>=7?2:1)<=(x.length>=7?2:1));
  const out=[]; searchIndex().forEach(e=>{ let s=0;
    if(e.t===q||e.compact===qc) s=100;
    else if(e.t.startsWith(q)||e.compact.startsWith(qc)) s=92;
    else if(qs.every(x=>pre(e.tw,x))) s=84;
    else if(e.ini===qc||e.aw.includes(qc)||e.alias.startsWith(q)||(' '+e.alias+' ').includes(' '+q+' ')) s=76;
    else if(qs.every(x=>pre(e.tw,x)||pre(e.aw,x))) s=64;
    else if(qs.every(x=>pre(e.tw,x)||pre(e.aw,x)||pre(e.more,x))) s=44;
    else if(qs.every(x=>pre(e.tw,x)||pre(e.aw,x)||near(e.tw,x)||near(e.aw,x))) s=32;
    else if(qc.length>=5&&lev(qc,e.compact.slice(0,qc.length+1),2)<=2) s=30;
    if(s) out.push({g:e.g,score:s,i:e.i}); });
  return out.sort((a,b)=>b.score-a.score||a.i-b.i); }
const CAT_LABEL={strategy:'Strategy',arcade:'Arcade',party:'Party',stories:'Theory & stories'};
/* ---------- dialogs and the browser's Back ----------
   Every overlay (the tutorial #gdrawer, any .gdialog: results, settings, room dialogs, and native <dialog>s) gets its
   own history entry while it is open, at the same address. Back (button, trackpad swipe, a phone's back gesture) then
   closes the top dialog and stays on the page; closing it any other way (X, Escape, the backdrop) takes that entry back
   out. A Back or Forward that changes the address closes whatever is still open, so a page never shows under a
   leftover dialog. Forward onto a closed dialog's entry reopens the tutorial; others just show the page. Focus returns
   to what opened the dialog. Closing never starts, accepts or leaves anything: it is the dialog's own close control. */
const ZFModal=(function(){
  const live=new Map(); let expect=0, seq=0, href=location.href, lastOut=null;
  const isOverlay=el=>el.nodeType===1&&(el.id==='gdrawer'||el.classList.contains('gdialog')||el.tagName==='DIALOG');
  const openNow=el=>el.tagName==='DIALOG'?el.open:el.classList.contains('open');
  const closer=el=>{ if(el.tagName==='DIALOG') return ()=>el.close();
    const b=el.querySelector('#gdClose')||el.querySelector('.gdialog-head .gt, .gdialog-head button, [data-close]');
    return ()=>{ if(b) b.click(); else el.classList.remove('open'); }; };
  const reopeners={};
  ['pushState','replaceState'].forEach(k=>{ const f=history[k]; history[k]=function(){ const r=f.apply(this,arguments); href=location.href; return r; }; });
  document.addEventListener('focusin',e=>{ const t=e.target; if(!t.closest||!t.closest('#gdrawer,.gdialog,dialog')) lastOut=t; });
  function check(el){ const on=openNow(el), rec=live.get(el);
    if(on&&!rec){ const hs=history.state&&history.state.zfModal, claimed=hs&&[...live.values()].some(x=>x.id===hs);
      const r={id:'zfm'+(++seq),ret:lastOut,pushed:false}; live.set(el,r);
      if(hs&&!claimed){ r.id=hs; r.pushed=location.href; }   // reopened on Forward: this entry is its own
      else { try{ history.pushState(Object.assign({},history.state||{},{zfModal:r.id,zfKind:el.id||''}),'',location.href); r.pushed=location.href; }catch(e){} } }
    else if(!on&&rec){ live.delete(el);
      if(rec.pushed&&!rec.popped&&history.state&&history.state.zfModal===rec.id&&location.href===rec.pushed){ expect++; history.back(); }
      const a=document.activeElement; if(rec.ret&&rec.ret.isConnected&&(!a||a===document.body||el.contains(a))) try{ rec.ret.focus({preventScroll:true}); }catch(e){} } }
  new MutationObserver(ms=>{ ms.forEach(m=>{ if(isOverlay(m.target)) check(m.target); }); }).observe(document.documentElement,{subtree:true,attributes:true,attributeFilter:['class','open']});
  addEventListener('popstate',e=>{ const was=href; href=location.href;
    if(expect>0){ expect--; e.stopImmediatePropagation(); return; }
    const st=e.state||{}, same=was===location.href;
    if(live.size){ live.forEach((r,el)=>{ if(r.id===st.zfModal&&same) return; r.popped=true; try{ closer(el)(); }catch(_){} if(openNow(el)){ el.classList.remove('open'); if(el.tagName==='DIALOG') el.close(); } });
      document.documentElement.classList.remove('gt-lock');
      if(same){ e.stopImmediatePropagation(); return; } }
    if(st.zfModal&&same){ const f=reopeners[st.zfKind]; if(f&&f()){ e.stopImmediatePropagation(); return; } }
  },true);
  /* the page came back from the back/forward cache: whatever was open belongs to its own history entry */
  addEventListener('pageshow',e=>{ if(e.persisted) href=location.href; });
  return {reopen(kind,fn){ reopeners[kind]=fn; }, open:()=>live.size>0};
})();
window.ZF={modal:ZFModal,findGames,normQ,catLabel:g=>CAT_LABEL[g.tags[0]]||'Strategy',holdSurface,CREDIT,AUTHOR,creditHTML,E:ZF_E,preview:PREVIEW,QUARTO:QUARTO_CORE,SIM:SIM_CORE,quartoGlyph,GAMES,makeCard,renderGrid,liveCard,injectCSS,backdrop,hasBackdrop,mark:MK,isoP,chompCore:CHOMP_CORE,lines3:LINES3,POISON_PATH:'M12 2C7.6 2 4.5 5.2 4.5 9.4c0 2.5 1.1 4.1 2.5 5.1V18a1.5 1.5 0 0 0 1.5 1.5h.8V21h2v-1.5h1.4V21h2v-1.5h.8A1.5 1.5 0 0 0 17 18v-3.5c1.4-1 2.5-2.6 2.5-5.1C19.5 5.2 16.4 2 12 2Zm-3.3 8.2a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm6.6 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z'};
})();
