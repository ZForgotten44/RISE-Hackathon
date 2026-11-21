/* entry.js: the large "try a move" demonstration on each game-entry screen.
   Every demo uses the real engines (ULT, CHOMP, NIM) so its rules are the match's rules. */
(function(){
const CSS=`
.ze{position:relative;display:flex;flex-direction:column;align-items:center;gap:12px;width:100%}
.ze-top{display:flex;align-items:center;justify-content:space-between;width:100%;gap:12px}
.ze-tag{display:inline-flex;align-items:center;gap:8px;font:600 12px/1 var(--font-mono);letter-spacing:.08em;text-transform:uppercase;color:var(--g6);background:var(--surf2);padding:8px 12px;border-radius:999px}
.ze-tag::before{content:"";width:6px;height:6px;border-radius:50%;background:var(--fg)}
.ze-reset{font:500 13px var(--font-sans);color:var(--g5);background:transparent;border:none;padding:8px 10px;border-radius:8px;cursor:pointer;min-height:36px}
.ze-reset:hover,.ze-reset:focus-visible{color:var(--fg);background:var(--surf2)}
.ze-stage{display:flex;align-items:center;justify-content:center;width:100%;min-height:min(40vh,400px)}
.ze-note{min-height:28px;font:500 clamp(16px,1.3vw,18px)/1.4 var(--font-sans);color:var(--g6);text-align:center}
.ze-sq{width:min(100%,calc(100vh - 400px),520px);min-width:240px;aspect-ratio:1/1}
.ze-sq>svg{width:100%;height:100%}
.ze svg{display:block;max-width:100%;height:auto;overflow:visible}
.ze .zcell{cursor:pointer;fill:transparent}
.ze .zcell:hover+.zghost,.ze .zcell:focus-visible+.zghost{opacity:.3}
.ze .zghost{opacity:0;pointer-events:none;transition:opacity .12s}
.ze .zpulse{fill:none;stroke:var(--fg);stroke-width:3;stroke-dasharray:7 7;animation:zerot 6s linear infinite;transform-box:fill-box;transform-origin:center}
@keyframes zerot{to{stroke-dashoffset:-56}}
.ze .zmark{transition:opacity .2s,transform .22s cubic-bezier(.3,1.5,.5,1);transform-box:fill-box;transform-origin:center}
.ze .zmark.new{animation:zepop .26s cubic-bezier(.3,1.5,.5,1)}
@keyframes zepop{from{transform:scale(.4);opacity:0}}
.ze .zdraw{stroke-dasharray:var(--len,900);stroke-dashoffset:var(--len,900);animation:zedraw .55s ease-out forwards}
@keyframes zedraw{to{stroke-dashoffset:0}}
.ze .zfade{animation:zefade .5s .5s ease-in forwards}
@keyframes zefade{to{opacity:0}}
/* chomp */
.zc-grid{display:grid;gap:var(--g);justify-content:center;padding:4px;max-width:100%;overflow:auto;max-height:min(440px,calc(100vh - 340px))}
.zc-tile{width:var(--s);height:var(--s);border:none;border-radius:calc(var(--s)*.14);padding:0;background:var(--tile);box-shadow:inset 0 calc(var(--s)*-.07) 0 rgba(0,0,0,.16),0 1px 0 rgba(255,255,255,.18);cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--bg);transition:transform .26s ease,opacity .26s ease,background .1s}
.zc-tile.pv{background:repeating-linear-gradient(135deg,var(--stripe) 0 5px,var(--tile) 5px 10px);transform:scale(.94)}
.zc-tile.gone{visibility:hidden}
.zc-tile.eat{transform:scale(.4) rotate(-6deg);opacity:0}
.zc-tile.poison{background:var(--fg);color:var(--bg)}
.zc-tile.poison svg{width:62%;height:62%}
.zc-tile.shake{animation:zeshake .35s}
@keyframes zeshake{25%{transform:translateX(-4px)}75%{transform:translateX(4px)}}
/* nim */
.zn-board{display:flex;align-items:flex-end;gap:var(--pg);padding:8px 10px 0;max-width:100%;max-height:500px;overflow:auto;justify-content:safe center;scrollbar-width:thin}
.zn-scroll{font:500 12px var(--font-mono);color:var(--g5);text-align:center;margin-top:6px}
.zn-pile{display:flex;flex-direction:column;align-items:center;gap:8px}
.zn-toks{display:flex;flex-direction:column;gap:6px}
.zn-tok{width:var(--tw);height:var(--th);border:none;padding:0;border-radius:5px;background:var(--fg);cursor:pointer;transition:transform .2s,opacity .2s,background .1s}
.zn-tok.pv{background:repeating-linear-gradient(135deg,var(--g5) 0 5px,var(--g7) 5px 10px);transform:translateX(3px)}
.zn-tok.hit{background:var(--fg);outline:2px solid var(--fg);outline-offset:2px}
.zn-tok.leave{transform:translateY(-22px);opacity:0}
.zn-more{width:var(--tw);font:600 11px var(--font-mono);color:var(--g5);text-align:center;padding:4px 0;border:1px dashed var(--g4);border-radius:5px}
.zn-count{font:700 15px var(--font-sans);color:var(--g6)}
.zn-base{height:3px;width:100%;background:var(--g3);border-radius:2px;margin-top:-2px}
.zn-wrap{position:relative;width:100%;display:flex;flex-direction:column;align-items:center;gap:4px}
`;
function inject(){ if(document.getElementById('ze-css')) return; const s=document.createElement('style'); s.id='ze-css'; s.textContent=CSS; document.head.appendChild(s); }
const SK='http://www.w3.org/2000/svg';
const POISON='<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" fill-rule="evenodd" d="M12 2C7.6 2 4.5 5.2 4.5 9.4c0 2.5 1.1 4.1 2.5 5.1V18a1.5 1.5 0 0 0 1.5 1.5h.8V21h2v-1.5h1.4V21h2v-1.5h.8A1.5 1.5 0 0 0 17 18v-3.5c1.4-1 2.5-2.6 2.5-5.1C19.5 5.2 16.4 2 12 2Zm-3.3 8.2a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm6.6 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z"/></svg>';
window.ZF_POISON=POISON;
function shell(host,caption,extra){ host.innerHTML=`<div class="ze"><div class="ze-top"><span class="ze-tag">Try a move</span><button class="ze-reset" type="button" aria-label="Reset the demonstration">↺ Reset</button></div><div class="ze-stage"></div><div class="ze-note" aria-live="polite"></div></div>`;
  return { stage:host.querySelector('.ze-stage'), note:host.querySelector('.ze-note'), reset:host.querySelector('.ze-reset') }; }
const mk=(tag,attrs,inner)=>{ const e=document.createElementNS(SK,tag); for(const k in attrs) e.setAttribute(k,attrs[k]); if(inner) e.innerHTML=inner; return e; };
const X=(x,y,r,w,cls)=>`<g class="zmark ${cls||''}" stroke="currentColor" stroke-width="${w}" stroke-linecap="round"><line x1="${x-r}" y1="${y-r}" x2="${x+r}" y2="${y+r}"/><line x1="${x+r}" y1="${y-r}" x2="${x-r}" y2="${y+r}"/></g>`;
const O=(x,y,r,w,cls)=>`<circle class="zmark ${cls||''}" cx="${x}" cy="${y}" r="${r}" fill="none" stroke="currentColor" stroke-width="${w}"/>`;
const cell=(host)=>host;

/* ---------- Chomp ---------- */
function chomp(host,ctx){
  const ui=shell(host,'<b>Take a tile and everything below-left of it.</b>Whoever takes the poisoned corner loses.');
  let len,C,busy=false;
  function build(){ const s=ctx.get(); C=s.C; len=s.len.slice(); render(); ui.note.textContent='Hover a tile to preview the bite.'; }
  function render(){
    const R=len.length, avail=Math.max(260,Math.min(host.clientWidth||520,620)), g=Math.max(4,Math.round(avail/C*0.06));
    const size=Math.max(16,Math.min(72,Math.floor((avail-(C-1)*g)/C),Math.floor(400/R)-g));
    const grid=document.createElement('div'); grid.className='zc-grid'; grid.style.cssText=`--s:${size}px;--g:${g}px;grid-template-columns:repeat(${C},var(--s))`;
    for(let r=0;r<R;r++)for(let c=0;c<C;c++){ const has=CHOMP.has(len,C,r,c), pois=CHOMP.isPoison(C,r,c);
      const b=document.createElement('button'); b.type='button'; b.className='zc-tile'+(has?'':' gone')+(pois?' poison':''); b.dataset.r=r; b.dataset.c=c; b.disabled=!has; b.setAttribute('aria-label',`row ${r+1}, column ${c+1}${pois?', poison':''}`); if(pois&&has) b.innerHTML=POISON;
      grid.appendChild(b); }
    ui.stage.innerHTML=''; ui.stage.appendChild(grid);
    const tiles=[...grid.children], at=(r,c)=>tiles[r*C+c];
    const preview=(r,c)=>{ const rem=CHOMP.removed(len,C,r,c); tiles.forEach(t=>t.classList.remove('pv')); rem.forEach(([rr,cc])=>at(rr,cc).classList.add('pv')); ui.note.textContent=CHOMP.isPoison(C,r,c)?'That is the poison. Taking it loses.':`Bite ${rem.length} tile${rem.length===1?'':'s'}`; };
    const clear=()=>{ tiles.forEach(t=>t.classList.remove('pv')); ui.note.textContent='Hover a tile to preview the bite.'; };
    tiles.forEach(t=>{ if(t.disabled) return; const r=+t.dataset.r,c=+t.dataset.c;
      t.addEventListener('pointerenter',()=>{ if(!busy) preview(r,c); }); t.addEventListener('pointerleave',clear); t.addEventListener('focus',()=>{ if(!busy) preview(r,c); }); t.addEventListener('blur',clear);
      t.addEventListener('click',()=>{ if(busy) return; if(CHOMP.isPoison(C,r,c)){ t.classList.add('shake'); setTimeout(()=>t.classList.remove('shake'),400); ui.note.textContent='Poisoned. Whoever takes this tile loses — pick another.'; return; }
        if(ctx.get().commit&&ctx.commit){ ctx.commit(r,c); return; }
        const rem=CHOMP.removed(len,C,r,c); busy=true; rem.forEach(([rr,cc])=>{ const e=at(rr,cc); e.classList.remove('pv'); e.classList.add('eat'); });
        setTimeout(()=>{ len=CHOMP.bite(len,C,r,c); busy=false; render(); ui.note.textContent=`Bite taken: ${rem.length} tile${rem.length===1?'':'s'}. The rest stays put.`; },280); }); });
  }
  ui.reset.onclick=build; build();
  return { refresh:build };
}

/* ---------- Nim ---------- */
function nim(host,ctx){
  const ui=shell(host,'<b>Take any number of tokens from one pile.</b><span class="zn-rule"></span>');
  const ruleEl={}; let piles=[];
  const MAXSHOW=24;
  function build(){ const s=ctx.get(); piles=s.piles.slice(); ruleEl.textContent=s.misere?'Take the last token and you lose.':'Take the last token and you win.'; render(); ui.note.textContent=s.misere?'Misère: hover a token. Whoever takes the last one loses.':'Hover a token to see what you would take.'; }
  function render(){
    const many=piles.length>10||piles.some(p=>p>BigInt(MAXSHOW));
    const tw=many?36:46, th=many?14:19, pg=many?18:34;
    const board=document.createElement('div'); board.className='zn-board'; board.style.cssText=`--tw:${tw}px;--th:${th}px;--pg:${pg}px`;
    const total=piles.reduce((a,b)=>a+b,0n);
    piles.forEach((n,i)=>{ const shown=n>BigInt(MAXSHOW)?MAXSHOW:Number(n), hid=n-BigInt(shown);
      const p=document.createElement('div'); p.className='zn-pile'; const toks=document.createElement('div'); toks.className='zn-toks'; toks.style.flexDirection='column';
      for(let k=0;k<shown;k++){ const b=document.createElement('button'); b.type='button'; b.className='zn-tok'; b.dataset.p=i; b.dataset.k=k; b.setAttribute('aria-label',`pile ${i+1}: take ${shown-k}`); toks.appendChild(b); }
      if(hid>0n){ const m=document.createElement('div'); m.className='zn-more'; m.textContent='+'+hid+' below'; m.title=hid+' more tokens at the bottom of this pile'; toks.appendChild(m); }
      p.appendChild(toks); const cnt=document.createElement('div'); cnt.className='zn-count'; cnt.textContent=String(n); p.appendChild(cnt); board.appendChild(p); });
    ui.stage.innerHTML=''; const wrap=document.createElement('div'); wrap.className='zn-wrap'; wrap.appendChild(board); ui.stage.appendChild(wrap);
    if(board.scrollHeight>board.clientHeight+2||board.scrollWidth>board.clientWidth+2){ const sc=document.createElement('div'); sc.className='zn-scroll'; sc.textContent='Large position: scroll the board to see it all'; wrap.appendChild(sc); }
    if(total===0n){ ui.note.textContent='Board cleared. Reset to try again.'; return; }
    board.querySelectorAll('.zn-tok').forEach(t=>{ const i=+t.dataset.p,k=+t.dataset.k; const pileToks=[...board.querySelectorAll(`.zn-tok[data-p="${i}"]`)]; const take=pileToks.length-k;
      const on=()=>{ pileToks.forEach((q,j)=>q.classList.toggle('pv',j>=k)); t.classList.add('hit'); ui.note.textContent=`Take ${take} from pile ${i+1} and leave ${piles[i]-BigInt(take)}`; };
      const off=()=>{ pileToks.forEach(q=>q.classList.remove('pv','hit')); ui.note.textContent='Hover a token to see what you would take.'; };
      t.addEventListener('pointerenter',on); t.addEventListener('pointerleave',off); t.addEventListener('focus',on); t.addEventListener('blur',off);
      t.addEventListener('click',()=>{ pileToks.forEach((q,j)=>{ if(j>=k){ q.classList.remove('pv','hit'); q.classList.add('leave'); } });
        setTimeout(()=>{ piles[i]-=BigInt(take); render(); ui.note.textContent=`Taken. The lower tokens stay where they are.`; },210); }); });
  }
  ui.reset.onclick=build; build();
  return { refresh:build };
}

/* ---------- Recursive Tic-Tac-Toe ---------- */
function ult(host){
  const ui=shell(host,'<b>Your cell chooses their next board.</b>Win three small boards in a row to win the game.');
  const S=600, G=16, B=(S-2*G)/3, Cs=B/3, PAD=10;
  let st, done;
  const seed=()=>{ let s=ULT.newState(); for(const m of [36,4,44,76]) ULT.play(s,m); return s; };   // X:(4,0) O:(0,4) X:(4,8) O:(8,4): X must play in the middle board
  const bx=b=>(b%3)*(B+G), by=b=>Math.floor(b/3)*(B+G), cx=(b,c)=>bx(b)+(c%3)*Cs+Cs/2, cy=(b,c)=>by(b)+Math.floor(c/3)*Cs+Math.floor(c/3)*0+Math.floor(c/3)*0+Cs/2;
  function build(){ st=seed(); done=false; render(); ui.note.textContent='Try the top-right cell.'; }
  function render(dest,route){
    const legal=new Set(ULT.legal(st)); const activeBoards=new Set([...legal].map(i=>Math.floor(i/9)));
    let g='';
    for(let b=0;b<9;b++){ const on=activeBoards.has(b)&&!done, isDest=dest===b;
      g+=`<rect x="${bx(b)}" y="${by(b)}" width="${B}" height="${B}" rx="14" fill="var(--surf3)" fill-opacity="${on||isDest?1:.55}" stroke="${on||isDest?'var(--fg)':'none'}" stroke-width="3"/>`;
      let d=''; for(let k=1;k<3;k++){ d+=`M${bx(b)+PAD+k*(B-2*PAD)/3} ${by(b)+PAD}v${B-2*PAD}M${bx(b)+PAD} ${by(b)+PAD+k*(B-2*PAD)/3}h${B-2*PAD}`; }
      g+=`<path d="${d}" stroke="var(--g4)" stroke-width="1.6" fill="none" stroke-linecap="round"/>`; }
    const cw=(B-2*PAD)/3, ccx=(b,c)=>bx(b)+PAD+(c%3)*cw+cw/2, ccy=(b,c)=>by(b)+PAD+Math.floor(c/3)*cw+cw/2;
    for(let i=0;i<81;i++){ const v=st.cells[i]; if(!v) continue; const b=Math.floor(i/9),c=i%9; g+=`<g style="color:var(--fg)">${v===1?X(ccx(b,c),ccy(b,c),cw*.27,4.5,i===st.moves[st.moves.length-1]?'new':''):O(ccx(b,c),ccy(b,c),cw*.27,4.5,i===st.moves[st.moves.length-1]?'new':'')}</g>`; }
    if(!done){ for(const i of legal){ const b=Math.floor(i/9),c=i%9; g+=`<rect class="zcell" data-i="${i}" x="${ccx(b,c)-cw/2}" y="${ccy(b,c)-cw/2}" width="${cw}" height="${cw}" tabindex="0" role="button" aria-label="board ${b+1}, cell ${c+1}"/><g class="zghost" style="color:var(--fg)">${X(ccx(b,c),ccy(b,c),cw*.27,4.5)}</g>`; }
      const hint=4*9+2; if(legal.has(hint)) g+=`<rect class="zpulse" x="${ccx(4,2)-cw/2+4}" y="${ccy(4,2)-cw/2+4}" width="${cw-8}" height="${cw-8}" rx="8"/>`; }
    if(route){ const [fromB,fromC,toB]=route; const x1=ccx(fromB,fromC), y1=ccy(fromB,fromC), x2=bx(toB)+B/2, y2=by(toB)+B/2; const len=Math.ceil(Math.hypot(x2-x1,y2-y1)*1.2);
      g+=`<path class="zdraw zfade" style="--len:${len}" d="M${x1} ${y1}Q${(x1+x2)/2+30} ${(y1+y2)/2-40} ${x2} ${y2}" fill="none" stroke="var(--fg)" stroke-width="4" stroke-linecap="round" stroke-dasharray="${len}"/><circle cx="${x1}" cy="${y1}" r="6" fill="var(--fg)"/>`; }
    ui.stage.innerHTML=`<div class="ze-sq"><svg viewBox="0 0 ${S} ${S}" style="color:var(--fg)" role="group" aria-label="nine small boards">${g}</svg></div>`;
    ui.stage.querySelectorAll('.zcell').forEach(r=>{ const act=()=>{ if(done) return; const i=+r.dataset.i, b=Math.floor(i/9), c=i%9; ULT.play(st,i); done=true; render(undefined,[b,c,c]);
        const nb=st.next; ui.note.textContent=nb>=0?`Your opponent now plays in the ${['top-left','top','top-right','left','middle','right','bottom-left','bottom','bottom-right'][nb]} board.`:'That board is closed, so your opponent may play anywhere.';
        setTimeout(()=>{ if(host.isConnected) render(nb>=0?nb:undefined); },900); };
      r.addEventListener('click',act); r.addEventListener('keydown',e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); act(); } }); });
  }
  ui.reset.onclick=build; build();
  return { refresh(){} };
}

/* ---------- 4x4 ---------- */
function four(host){
  const ui=shell(host,'<b>Four in a row.</b>Rows, columns, or either main diagonal.');
  const S=520, N=4, cs=S/N; let cells, done;
  const seed=()=>{ const a=new Array(16).fill(0); [0,5,10].forEach(i=>a[i]=1); [3,7,12].forEach(i=>a[i]=2); return a; };   // X: three on the main diagonal, O: three scattered, X to move
  const px=i=>(i%N)*cs+cs/2, py=i=>Math.floor(i/N)*cs+cs/2, WIN=15;
  function build(){ cells=seed(); done=false; render(); ui.note.textContent='X to move. Complete the diagonal.'; }
  function render(line){
    let g=''; for(let k=1;k<N;k++) g+=`<path d="M${k*cs} 14V${S-14}M14 ${k*cs}H${S-14}" stroke="var(--g4)" stroke-width="3" stroke-linecap="round"/>`;
    cells.forEach((v,i)=>{ if(v===1) g+=`<g style="color:var(--fg)">${X(px(i),py(i),cs*.24,9,i===WIN?'new':'')}</g>`; if(v===2) g+=`<g style="color:var(--fg)">${O(px(i),py(i),cs*.24,9)}</g>`; });
    if(!done){ cells.forEach((v,i)=>{ if(v) return; g+=`<rect class="zcell" data-i="${i}" x="${px(i)-cs/2+4}" y="${py(i)-cs/2+4}" width="${cs-8}" height="${cs-8}" tabindex="0" role="button" aria-label="row ${Math.floor(i/N)+1}, column ${i%N+1}"/><g class="zghost" style="color:var(--fg)">${X(px(i),py(i),cs*.24,9)}</g>`; });
      g+=`<rect class="zpulse" x="${px(WIN)-cs/2+10}" y="${py(WIN)-cs/2+10}" width="${cs-20}" height="${cs-20}" rx="12"/>`; }
    if(line) g+=`<line class="zdraw" style="--len:800" x1="${px(0)-cs*.05}" y1="${py(0)-cs*.05}" x2="${px(WIN)+cs*.05}" y2="${py(WIN)+cs*.05}" stroke="var(--fg)" stroke-width="12" stroke-linecap="round" opacity=".55"/>`;
    ui.stage.innerHTML=`<div class="ze-sq"><svg viewBox="0 0 ${S} ${S}" role="group" aria-label="4 by 4 board">${g}</svg></div>`;
    ui.stage.querySelectorAll('.zcell').forEach(r=>{ const act=()=>{ const i=+r.dataset.i; if(done) return; if(i!==WIN){ ui.note.textContent='Not that one. The highlighted square completes the line.'; return; } cells[i]=1; done=true; render(true); ui.note.textContent='Four in a row. You win.'; };
      r.addEventListener('click',act); r.addEventListener('keydown',e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); act(); } }); });
  }
  ui.reset.onclick=build; build();
  return { refresh(){} };
}

/* ---------- 3D ---------- */
function cube(host){
  const ui=shell(host,'<b>Three in a line, anywhere in the cube.</b>Across a layer, up through layers, or corner to corner.');
  const W=560,H=560,s=190, ys=[150,290,430], done0=false; let done, marks;
  const P=(l,i,j)=>{ const u=(i+.5)/3,v=(j+.5)/3; return [W/2+(u-v)*s, ys[l]-s/2+(u+v)*s/2]; };
  const WINC=[2,2,2];
  function build(){ marks=[[0,0,0,1],[1,1,1,1],[0,2,1,2],[2,0,2,2],[1,0,2,2]].slice(0,4); done=false; render(); ui.note.textContent='X to move. Complete the line through the cube.'; }
  function render(line){
    let g=''; [2,1,0].forEach(l=>{ const y=ys[l]; g+=`<path d="M${W/2-s} ${y}L${W/2} ${y-s/2}L${W/2+s} ${y}L${W/2} ${y+s/2}Z" fill="var(--surf2)" stroke="var(--g4)" stroke-width="2.4" stroke-linejoin="round"/>`;
      let d=''; for(let k=1;k<3;k++){ const a=P(l,k-.5,-.5),b=P(l,k-.5,2.5),c=P(l,-.5,k-.5),e=P(l,2.5,k-.5); d+=`M${a[0]} ${a[1]}L${b[0]} ${b[1]}M${c[0]} ${c[1]}L${e[0]} ${e[1]}`; }
      g+=`<path d="${d}" stroke="var(--g4)" stroke-width="1.4" fill="none"/>`; });
    const at=(l,i,j)=>marks.find(m=>m[0]===l&&m[1]===i&&m[2]===j);
    for(const [l,i,j,pl] of marks){ const [x,y]=P(l,i,j); g+=`<g style="color:var(--fg)">${pl===1?X(x,y,13,5):O(x,y,13,5)}</g>`; }
    if(!done){ const [x,y]=P(...WINC); g+=`<circle class="zcell" cx="${x}" cy="${y}" r="24" data-w="1" tabindex="0" role="button" aria-label="top layer, bottom corner"/><g class="zghost" style="color:var(--fg)">${X(x,y,13,5)}</g><ellipse class="zpulse" cx="${x}" cy="${y}" rx="25" ry="15"/>`; }
    if(line){ const a=P(0,0,0),b=P(...WINC); g+=`<line class="zdraw" style="--len:700" x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="var(--fg)" stroke-width="7" stroke-linecap="round" opacity=".55"/>`; }
    ui.stage.innerHTML=`<div class="ze-sq"><svg viewBox="0 0 ${W} ${H}" role="group" aria-label="three layers of a 3 by 3 by 3 cube">${g}</svg></div>`;
    const t=ui.stage.querySelector('.zcell'); if(t){ const act=()=>{ marks.push([...WINC,1]); done=true; render(true); ui.note.textContent='Three in a line. You win.'; }; t.addEventListener('click',act); t.addEventListener('keydown',e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); act(); } }); }
  }
  ui.reset.onclick=build; build();
  return { refresh(){} };
}

/* A stepped "visual controls lesson" for a custom (non-board) game: title, text, a live mini-scene, Back/Show me/
   Next. Reuses the exact ZLessons.get(slug) content already built for the Rules drawer's "teaches by doing" steps
   (see lessons.js) — same steps, same api.note/ok/reset contract, just a simpler standalone stepper with no drawer
   chrome (no Expand, no written-rules fallback, no "back to my game") since there is no live match behind it yet. */
function mountLessonStepper(host, steps){
  if(!steps || !steps.length) return null;
  host.innerHTML=`<div class="ze"><div class="ze-top"><span class="ze-tag">Try it</span><span></span></div>
    <h4 class="ls-title" style="margin:0 0 4px;font:700 20px var(--font-sans);color:var(--fg)"></h4>
    <p class="ls-text" style="margin:0 0 6px;color:var(--g6);font:500 14.5px/1.5 var(--font-sans)"></p>
    <div class="ls-stage" id="lsStage2"></div>
    <div class="ze-note" id="lsNote2" aria-live="polite"></div>
    <div class="ls-actions" style="display:flex;gap:8px;justify-content:center;margin-top:8px;flex-wrap:wrap">
      <button type="button" class="ls-btn ghost" id="lsPrev2">Back</button>
      <button type="button" class="ls-btn ghost" id="lsShow2">Show me</button>
      <button type="button" class="ls-btn" id="lsNext2">Next</button>
    </div></div>`;
  inject();
  let idx=0, cur=null;
  const $$=sel=>host.querySelector(sel), stage=$$('#lsStage2'), note=$$('#lsNote2');
  const show=()=>{ const st=steps[idx]; host.querySelector('.ls-title').textContent=st.title; host.querySelector('.ls-text').innerHTML=st.text;
    stage.innerHTML=''; note.innerHTML=''; note.classList.remove('ok');
    const api={ note:h=>{ note.innerHTML=h; }, ok:()=>{ note.classList.add('ok'); if(window.ZS) ZS.play('ping'); }, reset:()=>{} };
    try{ cur=st.mount(stage,api)||{}; }catch(e){ console.error(e); cur={}; note.textContent='This example could not load.'; }
    $$('#lsShow2').style.display=(cur&&cur.show)?'':'none'; $$('#lsPrev2').disabled=idx===0; $$('#lsNext2').textContent=idx===steps.length-1?'Restart':'Next'; };
  $$('#lsPrev2').onclick=()=>{ if(idx>0){ idx--; show(); } };
  $$('#lsNext2').onclick=()=>{ if(cur&&cur.reset) cur.reset(); idx=idx<steps.length-1?idx+1:0; show(); };
  $$('#lsShow2').onclick=async()=>{ if(cur&&cur.reset) cur.reset(); if(cur&&cur.show){ $$('#lsShow2').disabled=true; try{ await cur.show(); }catch(e){} $$('#lsShow2').disabled=false; } };
  show();
  return { destroy(){ if(cur&&cur.reset) cur.reset(); } };
}
window.ZFEntry={ mount(id,host,ctx){ inject(); host.innerHTML=''; const f={chomp,nim,ult,four,cube}[id]; return f?f(host,ctx||{}):null; }, mountLessonStepper };
})();
