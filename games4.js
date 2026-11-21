/* games4.js: The Gold Coin (interface, computer, hints, challenges, workshop). Rules and strategy: gold-engine.js.
   Credit: Joel David Hamkins, "The Gold Coin game", in Infinite Games: Frivolities of the Gods. Explanations and artwork here are the site's own. */
(function(){
const X=window.ZFX, G=ZF_E.GOLD, Z=window.ZART, $=X.$, rngOf=X.rngOf;
const who=(p,c)=>c.opp==='2p'?`${window.ZFName?ZFName(p):'Player '+(p)}`:c.opp==='online'?(p===c.humanIs?'You':(c.opponentNickname||'Your friend')):(p===c.humanIs?'You':'The computer');
const pick=(a,r)=>a[Math.floor((r||Math.random)()*a.length)];
const CW=56, PAD=18, CY=74, R=17, RK=k=>Z.coinR(k,R);
const CSS=`
.gc{display:flex;flex-direction:column;align-items:center;gap:12px;width:100%}
.gc-scroll{width:min(100%,900px);overflow-x:auto;overscroll-behavior-x:contain;padding:4px 0;scrollbar-width:thin}
.gc svg{display:block;height:auto;color:var(--fg);overflow:visible}
.gc .space{fill:currentColor;fill-opacity:.09}
.gc .space.warn{fill:currentColor;fill-opacity:.32}
.gc .num{font:600 11px var(--font-mono);fill:currentColor;fill-opacity:.55;text-anchor:middle}
.gc .lm{font:700 10px var(--font-mono);fill:currentColor;fill-opacity:.6;text-anchor:middle;letter-spacing:.08em}
.gc .coin{cursor:pointer;outline:none}.gc .coin.off{cursor:default}
.gc .coin .selring{pointer-events:none;fill:none;stroke:var(--fg);stroke-width:3.4;opacity:0}.gc .coin.sel .selring{opacity:1}
.gc .coin:focus-visible .selring{opacity:1;stroke-dasharray:4 4}
.gc .dest{cursor:pointer;outline:none}.gc .dest .ring{fill:none;stroke:var(--fg);stroke-width:2.2;stroke-dasharray:4 5;opacity:.55}.gc .dest:hover .ring,.gc .dest:focus-visible .ring{opacity:1;stroke-dasharray:none}
.gc .ghost{opacity:0;pointer-events:none}.gc .dest:hover .ghost,.gc .dest:focus-visible .ghost{opacity:.45}
.gc .hintbox{fill:none;stroke:var(--fg);stroke-width:2.4;stroke-dasharray:6 5;opacity:.85}
.gc .hintring{fill:none;stroke:var(--fg);stroke-width:3;stroke-dasharray:3 5}
.gc .zgc{pointer-events:none}
.gc-pan{font:500 12px var(--font-sans);color:var(--g5)}
.gc-bar{display:flex;gap:10px;align-items:center;justify-content:center;flex-wrap:wrap;min-height:48px}
.gc-take{min-height:46px;padding:0 20px;border:none;border-radius:13px;background:var(--fg);color:var(--bg);font:700 15px var(--font-sans);cursor:pointer}
.gc-take:hover{opacity:.9}.gc-take.hl{outline:3px dashed var(--fg);outline-offset:3px}
.gc-msg{font:500 14.5px/1.5 var(--font-sans);color:var(--g6);text-align:center;max-width:52ch;min-height:2.6em}.gc-msg b{color:var(--fg)}
.gc-trays{display:flex;gap:16px;font:600 12.5px var(--font-mono);color:var(--g5);justify-content:center}.gc-tray{display:flex;align-items:center;gap:6px;background:var(--surf2);border-radius:999px;padding:6px 12px;min-height:34px}
.gc-tray svg{width:26px;height:26px;overflow:visible}
.gc-choose{display:flex;gap:10px}.gc-choose button{min-height:50px;padding:0 24px;border:none;border-radius:14px;background:var(--surf3);color:var(--fg);font:700 16px var(--font-sans);cursor:pointer}
.gc-build{display:flex;flex-direction:column;gap:10px;align-items:center;width:100%}
.gc-build .row{display:flex;gap:8px;flex-wrap:wrap;justify-content:center;align-items:center}
.gc-build button.m{min-height:38px;padding:0 14px;border:none;border-radius:10px;background:var(--surf3);color:var(--fg);font:600 13.5px var(--font-sans);cursor:pointer}.gc-build button.m[aria-pressed=true]{background:var(--fg);color:var(--bg)}
.gc-build textarea,.gc-build input{font:500 13.5px var(--font-mono);background:var(--surf);color:var(--fg);border:1px solid var(--g3);border-radius:10px;padding:8px 10px}
.gc-build .bad{color:var(--fg);font:600 13.5px var(--font-sans)}
.gc-build .gc-lab{font:600 13px var(--font-sans);color:var(--g6)}
.gc-verdict{font:600 14px var(--font-sans);color:var(--fg);text-align:center;min-height:1.6em}
`;
(function(){ const st=document.createElement('style'); st.id='gx4-css'; st.textContent=CSS; document.head.appendChild(st); })();

/* ---------- positions ---------- */
const EXAMPLE={n:11,pens:[2,5],gold:10}, EXAMPLE_SHORT={n:8,pens:[1,3],gold:7}, TRACK_MIN=4, TRACK_MAX=30;
/* Rules: 'rear' (the default) lets pennies stand on either side of the gold; 'std' keeps the gold farthest right.
   Every position on a 'std' board plays identically under 'rear' (the pile formula coincides), so 'rear' is simply the
   general game. One validity check serves every board — built, pasted, random or example — so a board the
   workshop accepts is exactly a board Play accepts. */
const DEFAULT_RULES='rear';
const exampleFor=()=>innerWidth<560?EXAMPLE_SHORT:EXAMPLE;
function validPos(p,variant){ if(!p||typeof p!=='object') return ['Build a position in the workshop first.']; if(!Number.isInteger(p.n)) return ['The track length is missing.']; if(!Array.isArray(p.pens)) return ['The pennies are missing.'];
  if(p.n<TRACK_MIN||p.n>TRACK_MAX) return [`The track needs between ${TRACK_MIN} and ${TRACK_MAX} spaces.`];
  const e=G.check({n:p.n,pens:p.pens,gold:p.gold,variant:variant||DEFAULT_RULES});
  return e.map(t=>t.startsWith('In the standard game')?'With “Gold farthest right” rules no penny may stand to the right of the gold coin. Move that penny, or switch Rules to “Pennies on both sides”.':t); }
function parseCustom(o){ try{ return JSON.parse(o.custom||'null'); }catch(e){ return null; } }
function optToState(o){ const variant=o.variant||DEFAULT_RULES; let p=null; if(o.position==='custom'){ p=parseCustom(o); if(validPos(p,variant).length) p=null; } if(!p&&o.position==='random'){ p=randomBoard(+o.len||12,variant,{k:+o.coins||4}); } if(!p) p=exampleFor(); return G.newState({n:p.n,pens:p.pens.slice(),gold:p.gold,variant}); }
/* ---- random boards ----
   The old generator drew a uniform subset and always made the rightmost coin gold, so every board had all its pennies
   in front of the gold. This one: varies the coin count within the allowed range; mixes three spacing styles (uniform,
   lumpy gaps with tight pairs and wide holes, evenly spread); puts the gold among the coins with pennies on both sides
   most of the time (and farthest right about a fifth of the time) when the rules allow it; never makes the gold the
   leftmost coin (that position is won on the first move); validates each board with validPos; and never returns the
   same layout twice in a row when another one exists. */
let lastRandomKey='';
function spreadCoins(n,k,r){ const style=r(); let cs;
  if(style<.4){ const all=[...Array(n).keys()]; for(let i=all.length-1;i>0;i--){ const j=Math.floor(r()*(i+1)); [all[i],all[j]]=[all[j],all[i]]; } cs=all.slice(0,k); }
  else { const free=n-k, w=[]; for(let i=0;i<=k;i++){ const base=style<.75?-Math.log(1-r()*.999):(.6+r()*.8); w.push(style<.75&&r()<.3?base*.12:base); }
    const sum=w.reduce((a,b)=>a+b,0); const slot=w.map(x=>Math.floor(free*x/sum)); let left=free-slot.reduce((a,b)=>a+b,0); while(left-->0) slot[Math.floor(r()*(k+1))]++;
    cs=[]; let at=slot[0]; for(let i=0;i<k;i++){ cs.push(at); at+=1+slot[i+1]; } }
  return cs.sort((a,b)=>a-b); }
function randomBoard(n,variant,o){ o=o||{}; const r=o.rng||Math.random; n=Math.max(TRACK_MIN,Math.min(TRACK_MAX,n|0)); variant=variant||DEFAULT_RULES;
  const kMax=Math.max(1,Math.min(o.kMax||7,n-1)), kMin=Math.max(1,Math.min(o.kMin||3,kMax));
  let best=null;
  for(let t=0;t<40;t++){ const k=o.k?Math.max(1,Math.min(o.k,n)):kMin+Math.floor(r()*(kMax-kMin+1)); const cs=spreadCoins(n,k,r);
    let gi=k-1; if(variant!=='std'&&k>=3&&r()>=.2) gi=1+Math.floor(r()*(k-2));
    const p={n,pens:cs.filter((_,i)=>i!==gi),gold:cs[gi]}; if(validPos(p,variant).length) continue;
    best=p; const key=n+'|'+p.pens.join(',')+'|'+p.gold; if(key!==lastRandomKey){ lastRandomKey=key; return p; } }
  return best||exampleFor(); }
/* the puzzle sets are generated from fixed seeds with this original sampler, so they stay exactly as they were */
function randomPos(n,k,variant,rng){ const r=rng||Math.random; k=Math.min(k,n); const all=[...Array(n).keys()]; for(let i=all.length-1;i>0;i--){ const j=Math.floor(r()*(i+1)); [all[i],all[j]]=[all[j],all[i]]; } const cs=all.slice(0,k).sort((a,b)=>a-b); if(variant==='rear'){ const gi=Math.floor(r()*k); return {n,pens:cs.filter((_,i)=>i!==gi),gold:cs[gi]}; } return {n,pens:cs.slice(0,-1),gold:cs[cs.length-1]}; }
const label=(s,id)=>{ const c=s.coins.find(x=>x.id===id); return c?(c.kind==='gold'?'the gold coin':`the penny at space ${c.pos+1}`):'that coin'; };

/* ---------- the computer ---------- */
function aiMove(s,level){ const L=G.legal(s); if(G.goldLeftmost(s)) return {t:'collect'}; const win=G.winningMovesF(s); const safe=L.filter(m=>{ if(m.t!=='collect') return true; const n=G.apply(s,m); return !G.goldLeftmost(n); });   /* never hand over an exposed gold if there is another move */
  if(level==='easy') return pick(Math.random()<.85?L:safe.length?safe:L);
  if(level==='medium'){ if(win.length&&Math.random()<.55) return pick(win); return pick(safe.length?safe:L); }
  if(win.length) return pick(win);
  let best=1e9,bl=[]; for(const m of (safe.length?safe:L)){ const k=G.oppWinsF(s,m); if(k<best){ best=k; bl=[m]; } else if(k===best) bl.push(m); } return pick(bl); }

/* ---------- hints: nudge, then the reason, then the exact move ---------- */
function hintFor(s,prev){ const key=G.key(s)+'|'+s.turn; const level=prev&&prev.key===key?Math.min(3,prev.level+1):1;
  const mv=G.formulaMove(s); if(!mv) return {key,level:3,move:null,text:'There’s no forced win from here against perfect play. Any move is a gamble on a mistake.'};
  if(mv.t==='collect'&&G.goldLeftmost(s)) return {key,level:3,move:mv,text:'The gold coin is the leftmost coin. Take it.'};
  const P=G.piles(s), S=P.reduce((a,p)=>a^p.h,0); const pile=P.find(p=>(p.kind==='pair'&&p.right===mv.id)||(p.kind==='front'&&(mv.t==='collect'||p.coin===mv.id)));
  const nud=pile&&pile.kind==='pair'&&P.indexOf(pile)===0?'Look at the gap directly before the right-hand coin of the last pair.':(pile&&pile.kind==='front'?'Look at the coin farthest to the left.':'Look at the gap between two coins further left.');
  const reason=pile?(pile.kind==='pair'?`Pair this coin with its left neighbour. The gap between them is ${pile.h}. Making it ${pile.h^S} leaves your opponent a balanced position.`:`The front coin counts as ${pile.h}. Making it ${pile.h^S} leaves your opponent a balanced position.`):'Balance the gaps.';
  const txt=level===1?nud:(level===2?reason:(mv.t==='collect'?'Take the leftmost coin.':`Slide ${label(s,mv.id)} to space ${mv.to+1}.`));
  return {key,level,move:mv,pile,text:txt}; }

/* ---------- rendering ---------- */
let moveIn=null;
function coinSvgStr(kind,x,y,r,cls){ return Z.coin(kind,x,y,r,cls); }
function gRender(host,s,c){
  const prev=host._gcPrev; host._gcPrev=s; if(host._gcState!==s){ host._gcState=s; host._sel=null; }
  const n=s.n, W=n*CW+PAD*2, H=200; const cxp=p=>PAD+p*CW+CW/2; const human=c.human&&!s.over&&!s.choice; const hint=c.hintMove&&typeof c.hintMove==='object'?c.hintMove:null;
  const cs=s.coins; const L=human?G.legal(s):[]; const found=(c.reveal&&c.reveal.found)||[];
  let g=''; for(let p=0;p<n;p++){ g+=`<rect class="space" x="${PAD+p*CW+3}" y="${CY-32}" width="${CW-6}" height="64" rx="12"/><text class="num" x="${cxp(p)}" y="${CY+52}">${p+1}</text>`; }
  if(cs.length) g+=`<text class="lm" x="${cxp(cs[0].pos)}" y="${CY+72}">LEFTMOST</text>`;
  if(hint&&hint.level>=2&&hint.pile&&hint.move){ const p=hint.pile; if(p.kind==='pair'){ const a=cs.find(x=>x.id===p.left), b=cs.find(x=>x.id===p.right); if(a&&b) g+=`<rect class="hintbox" x="${cxp(a.pos)-R-4}" y="${CY-RK('gold')-6}" width="${cxp(b.pos)-cxp(a.pos)+2*RK(b.kind)+8}" height="${2*RK('gold')+12}" rx="18"/>`; } else { const a=cs.find(x=>x.id===p.coin); if(a) g+=`<rect class="hintbox" x="${cxp(0)-RK('penny')-4}" y="${CY-RK('gold')-6}" width="${cxp(a.pos)-cxp(0)+RK('penny')+RK(a.kind)+8}" height="${2*RK('gold')+12}" rx="18"/>`; } }
  cs.forEach(co=>{ const can=human&&L.some(m=>m.t==='slide'&&m.id===co.id)||(human&&co===cs[0]); g+=`<g class="coin${human?'':' off'}" data-id="${co.id}" ${human?`tabindex="0" role="button" aria-label="${co.kind==='gold'?'gold coin':'penny'} at space ${co.pos+1}"`:''}><circle cx="${cxp(co.pos)}" cy="${CY}" r="${RK(co.kind)+6}" fill="transparent"/>${coinSvgStr(co.kind,cxp(co.pos),CY,R)}<circle class="selring" cx="${cxp(co.pos)}" cy="${CY}" r="${RK(co.kind)+5}"/></g>`; });
  /* destinations for every coin (shown for the selected one) */
  L.filter(m=>m.t==='slide').forEach(m=>{ const co=cs.find(x=>x.id===m.id); g+=`<g class="dest" data-for="${m.id}" data-to="${m.to}" style="display:none" tabindex="-1" role="button" aria-label="slide ${co.kind==='gold'?'gold':'the penny'} to space ${m.to+1}"><rect x="${PAD+m.to*CW}" y="${CY-36}" width="${CW}" height="72" fill="transparent"/><circle class="ring" cx="${cxp(m.to)}" cy="${CY}" r="${RK(co.kind)+2}"/><g class="ghost">${coinSvgStr(co.kind,cxp(m.to),CY,R)}</g></g>`; });
  if(hint&&hint.level>=3&&hint.move&&hint.move.t==='slide'){ const m=hint.move; g+=`<circle class="hintring" cx="${cxp(m.to)}" cy="${CY}" r="${RK((cs.find(x=>x.id===m.id)||{}).kind)+8}"/>`; }
  found.forEach(m=>{ if(m.t==='slide') g+=`<circle class="hintring" cx="${cxp(m.to)}" cy="${CY}" r="${RK((cs.find(x=>x.id===m.id)||{}).kind)+8}"/>`; });
  const you=s.taken.filter(t=>t.by===1), opp=s.taken.filter(t=>t.by===2); const meIs=c.opp==='ai'?c.humanIs:1;
  const tray=(list,name)=>`<div class="gc-tray"><span>${name}</span>${list.map(t=>`<svg viewBox="-14 -14 28 28">${coinSvgStr(t.kind,0,0,8.5)}</svg>`).join('')||'<span style="opacity:.5">none</span>'}</div>`;
  const choice=s.choice?`<div class="gc-choose"><button data-c="first">Move first</button><button data-c="second">Move second</button></div>`:'';
  host.innerHTML=`<div class="gc"><div class="gc-bar" id="gcBar"></div><div class="gc-scroll" id="gcScroll"><svg viewBox="0 0 ${W} ${H}" style="width:100%;min-width:${Math.max(280,n*(innerWidth<560?40:28))}px" role="group" aria-label="Coin track with ${n} spaces">${g}</svg></div>${innerWidth<560&&n>8?'<div class="gc-pan">Swipe sideways to see the whole track</div>':''}${choice}<div class="gc-msg" id="gcMsg" aria-live="polite"></div><div class="gc-trays">${tray(c.opp==='ai'?(meIs===1?you:opp):you,c.opp==='ai'?'You took':'Player 1 took')}${tray(c.opp==='ai'?(meIs===1?opp:you):opp,c.opp==='ai'?'Computer took':'Player 2 took')}</div></div>`;
  const svg=host.querySelector('svg'), bar=host.querySelector('#gcBar'), msg=host.querySelector('#gcMsg');
  const setMsg=t=>{ msg.innerHTML=t; };
  if(s.choice){ setMsg('It is your choice. Which player would you rather be?'); host.querySelectorAll('.gc-choose button').forEach(b=>b.onclick=()=>c.play({choose:b.dataset.c})); return; }
  if(hint) setMsg(hint.text); else if(human) setMsg(cs.length===1?'Only one coin is left. Take it.':'Select a coin, then a highlighted space. Or select the leftmost coin to take it.');
  else if(!s.over&&c.opp==='ai') setMsg(`Computer is thinking…`);
  /* slide animation for the coin that just moved; collect animation for the coin just taken */
  const last=s.moves[s.moves.length-1]; if(prev&&last&&prev.moves.length===s.moves.length-1&&svg.animate){ if(last.t==='slide'){ const el=svg.querySelector(`.coin[data-id="${last.id}"]`); if(el) el.animate([{transform:`translateX(${(last.from-last.to)*CW}px)`},{transform:'none'}],{duration:280,easing:'cubic-bezier(.3,.9,.3,1)'}); }
    else if(last.t==='collect'&&prev.coins[0]){ const old=prev.coins[0]; const tmp=document.createElementNS('http://www.w3.org/2000/svg','g'); tmp.innerHTML=coinSvgStr(old.kind,cxp(old.pos),CY,R); svg.appendChild(tmp); tmp.animate([{transform:'none',opacity:1},{transform:`translate(${-cxp(old.pos)+PAD}px,${H-CY-10}px) scale(.55)`,opacity:0}],{duration:420,easing:'ease-in'}).onfinish=()=>tmp.remove(); } }
  if(!human) return;
  const coinEl=id=>svg.querySelector(`.coin[data-id="${id}"]`);
  const paint=()=>{ const sel=host._sel; svg.querySelectorAll('.coin').forEach(e=>e.classList.toggle('sel',e.dataset.id===sel)); svg.querySelectorAll('.dest').forEach(d=>{ const on=d.dataset.for===sel; d.style.display=on?'':'none'; d.setAttribute('tabindex',on?'0':'-1'); });
    bar.innerHTML=(sel&&sel===cs[0].id)?`<button type="button" class="gc-take${hint&&hint.level>=3&&hint.move&&hint.move.t==='collect'?' hl':''}" id="gcTake">${cs.length===1&&cs[0].kind==='gold'?'Take the gold':'Take leftmost coin'}</button>`:(hint&&hint.level>=3&&hint.move&&hint.move.t==='collect'?'<span class="gc-msg"><b>Select the leftmost coin, then take it.</b></span>':'');
    const tk=bar.querySelector('#gcTake'); if(tk) tk.onclick=()=>c.play({t:'collect'});
    if(sel){ const co=cs.find(x=>x.id===sel); const k=L.filter(m=>m.t==='slide'&&m.id===sel).length; setMsg(k?`<b>Choose a highlighted space</b> for ${label(s,sel)}${sel===cs[0].id?', or take it with the button.':'.'}`:(sel===cs[0].id?`${label(s,sel)} has no room to slide. You can take it.`:`${label(s,sel)} has no room to slide: coins cannot pass or land on another coin.`)); } };
  const select=id=>{ host._sel=host._sel===id?null:id; paint(); };
  svg.querySelectorAll('.coin').forEach(el=>{ const id=el.dataset.id; el.addEventListener('keydown',e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); select(id); } });
    el.addEventListener('pointerdown',e=>{ if(e.button!==0) return; if(e.pointerType!=='mouse'){ return; } e.preventDefault(); let started=false; const sx=e.clientX; const co=cs.find(x=>x.id===id); const moves=L.filter(m=>m.t==='slide'&&m.id===id); const scale=svg.getBoundingClientRect().width/W; const wasSel=host._sel===id; host._sel=id; paint();
      const move=ev=>{ const dx=ev.clientX-sx; if(!started&&Math.abs(dx)>6){ started=true; } if(started){ const lo=moves.length?Math.min(...moves.map(m=>m.to)):co.pos, dxu=Math.max((lo-co.pos)*CW,Math.min(0,dx/scale)); el.style.transform=`translateX(${dxu}px)`; } };
      const up=ev=>{ window.removeEventListener('pointermove',move); window.removeEventListener('pointerup',up); if(!started){ host._sel=wasSel?null:id; paint(); return; } const dxu=(ev.clientX-sx)/scale; const to=Math.round(co.pos+dxu/CW); const m=moves.find(x=>x.to===to);
        if(m){ c.play(m); } else { el.animate([{transform:el.style.transform},{transform:'none'}],{duration:180}); el.style.transform=''; } };
      window.addEventListener('pointermove',move); window.addEventListener('pointerup',up); });
    el.addEventListener('click',e=>{ if(e.detail===0||true){ /* touch and keyboard select on click; mouse selects on pointerdown */ } });
    el.addEventListener('pointerup',e=>{ if(e.pointerType!=='mouse'&&e.pointerType!==''){ select(id); } }); });
  svg.querySelectorAll('.dest').forEach(d=>{ const go=()=>c.play({t:'slide',id:d.dataset.for,to:+d.dataset.to}); d.addEventListener('click',go); d.addEventListener('keydown',e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); go(); } }); });
  paint(); moveIn=()=>{ host._sel=null; paint(); }; }
document.addEventListener('keydown',e=>{ if(e.key==='Escape'&&moveIn) moveIn(); });

/* ---------- puzzles: authored by a solver, never by hand ---------- */
function pset(id,name,note,gen){ let cache; return {id,name,kind:'move',note,items:()=>cache||(cache=gen())}; }
const seedRng=seed=>rngOf(seed);
function collect(seed,count,test,maker){ const r=seedRng(seed), out=[]; const seen=new Set(); for(let t=0;t<9000&&out.length<count;t++){ const s=maker(r); if(!s) continue; const k=G.key(s); if(seen.has(k)) continue; if(test(s)){ seen.add(k); out.push(s); } } return out; }
const mk=(r,n,k,variant)=>{ const p=randomPos(n,k,variant,r); return G.newState({n:p.n,pens:p.pens,gold:p.gold,variant}); };
const moveText=(s,m)=>m.t==='collect'?'taking the leftmost coin':`sliding ${label(s,m.id)} to space ${m.to+1}`;
function winItems(states,prompt,extra){ return states.map(s=>{ const wins=G.winningMoves(s); return {state:s,prompt,check(m){ const ok=wins.some(w=>w.t===m.t&&(w.t==='collect'||(w.id===m.id&&w.to===m.to))); const after=G.apply(s,m); const exp=extra?extra(s,wins):''; return ok?{ok:true,explain:`Yes: after ${moveText(s,m)} your opponent faces a balanced position with no winning reply. ${exp}`}:{ok:false,explain:`That gives your opponent a winning reply. ${wins.length===1?'Only one move wins here':'Several moves win here'}: ${wins.slice(0,3).map(w=>moveText(s,w)).join('; ')}.`}; }}; }); }
const PUZ=[
 pset('alone','Only gold','Only the gold coin is left. It does not have to reach the edge first.',()=>collect(11,3,()=>true,r=>{ const n=6+Math.floor(r()*5); return G.newState({n,pens:[],gold:2+Math.floor(r()*(n-2))}); }).map(s=>({state:s,prompt:'Take the gold.',check(m){ return m.t==='collect'?{ok:true,explain:'Yes. The leftmost coin can be taken from wherever it stands, and here that is the gold. The game ends.'}:{ok:false,explain:'You can slide, but you can also simply take the leftmost coin, which here is gold. Taking it wins at once.'}; }}))),
 pset('two','Two coins','One penny, then the gold. Leave your opponent a pair that touches.',()=>winItems(collect(21,3,s=>G.winning(s)&&s.coins.length===2&&s.coins[1].pos-s.coins[0].pos>1,r=>mk(r,10,2,'std')),'Win from here.',()=>'Close the gap so the coins touch.')),
 pset('first','First or second?','Some positions are lost for whoever moves. Choose which player to be.',()=>(()=>{ const lose=collect(31,2,s=>s.coins.length<=3&&!G.winning(s),r=>mk(r,9,2+Math.floor(r()*2),'std')), win=collect(32,2,s=>s.coins.length<=3&&G.winning(s)&&!G.goldLeftmost(s),r=>mk(r,9,2+Math.floor(r()*2),'std')); return [win[0],lose[0],win[1],lose[1]]; })().map(s=>({state:{...s,choice:true},prompt:'Would you choose to move first or second?',check(m){ const win=G.winsExact(s)||G.goldLeftmost(s); const right=(m.choose==='first')===win; return right?{ok:true,explain:win?'First: from here the player to move has a winning move.':'Second: whoever moves from here loses against perfect play, because every move leaves the other player a winning reply.'}:{ok:false,explain:win?'From here the player to move can force a win, so you want to move first.':'From here the player to move loses against perfect play, so you want to move second.'}; }}))),
 pset('three','Three coins','Two pennies and the gold. Compare the gap in front with the gap before gold.',()=>winItems(collect(41,3,s=>G.winning(s)&&s.coins.length===3,r=>mk(r,11,3,'std')),'Win from here.',()=>'')),
 pset('take','Collect to win','In each position the winning move is to take the leftmost coin, not slide.',()=>winItems(collect(51,3,s=>s.coins.length>=3&&G.winningMoves(s).some(m=>m.t==='collect')&&!G.goldLeftmost(s),r=>mk(r,11,3+Math.floor(r()*2),'std')),'Win from here.',()=>'Removing the coin took away the last spare move.')),
 pset('gaps','Several gaps','Pair the coins from the right. Balance the gaps inside the pairs.',()=>winItems(collect(61,3,s=>s.coins.length>=5&&G.winning(s)&&G.piles(s).length>=3,r=>mk(r,14,5+Math.floor(r()*2),'std')),'Win from here.',()=>'')),
 { id:'every',name:'Every winning move',kind:'move',note:'Find all the winning moves. Each correct move is marked; keep going until you have them all.',items:(()=>{ let c; return ()=>c||(c=collect(71,3,s=>{ const w=G.winningMoves(s).length; return G.winning(s)&&s.coins.length>=3&&w>=2&&w<=4; },r=>mk(r,11,3+Math.floor(r()*2),'std')).map(s=>{ const wins=G.winningMoves(s); const got=[]; return {state:s,prompt:`Find every winning move (${wins.length} of them).`,check(m){ const w=wins.find(x=>x.t===m.t&&(x.t==='collect'||(x.id===m.id&&x.to===m.to))); if(!w) return {ok:false,explain:`That move gives your opponent a winning reply. There ${wins.length===1?'is':'are'} ${wins.length} winning move${wins.length===1?'':'s'}: ${wins.map(x=>moveText(s,x)).join('; ')}.`,reveal:{found:wins}}; if(!got.includes(w)) got.push(w); if(got.length<wins.length) return {cont:true,explain:`<b>Yes.</b> ${got.length} of ${wins.length} found.`,reveal:{found:got.slice()}}; return {ok:true,explain:`All ${wins.length} found. Each of these leaves your opponent a balanced position, so more than one answer can be right.`,reveal:{found:got.slice()}}; }}; })); })() },
 pset('rear','Pennies behind gold','Pennies may stand to the right of the gold. Using their moves can matter.',()=>winItems(collect(81,3,s=>s.coins.length>=3&&G.winning(s)&&!G.goldLeftmost(s)&&s.coins[s.coins.length-1].kind!=='gold',r=>mk(r,10,3+Math.floor(r()*2),'rear')),'Win from here.',()=>'A penny behind the gold can spend a turn.'))
];

/* ---------- workshop: build a position, test it ---------- */
function workshop(host,o){ ZF.injectCSS&&ZF.injectCSS(); X.css(); if(!o.variant) o.variant=DEFAULT_RULES;
  /* The editor opens on the board that Play would start right now: the saved custom board, or else the board on show
     (the live match's start, or the entry preview), or else the example this screen size starts with. */
  const copy=p=>({n:p.n,pens:(p.pens||[]).slice(),gold:p.gold});
  let cur=(()=>{ if(o.position==='custom'){ const p=parseCustom(o); if(p&&typeof p==='object'&&Array.isArray(p.pens)) return copy(p); }
    const M=X.M, s0=M&&M.def&&M.def.id==='gold'&&M.hist&&M.hist[0]; if(s0&&s0.coins){ return {n:s0.n,pens:s0.coins.filter(c=>c.kind==='penny').map(c=>c.pos),gold:(s0.coins.find(c=>c.kind==='gold')||{}).pos}; }
    return copy(exampleFor()); })(); let mode='penny', shown=false, shrinkWarn='';
  const save=()=>{ o.custom=JSON.stringify(cur); if(o.position!=='custom'){ o.position='custom'; } X.refresh&&X.refresh(); };
  /* a random start on show is pinned as the custom board, so Play starts with exactly the board displayed here */
  if(o.position==='random'){ o.custom=JSON.stringify(cur); o.position='custom'; }
  const draw=()=>{ const n=cur.n, variant=o.variant||DEFAULT_RULES; const errs=validPos(cur,variant); const s=errs.length?null:G.newState({n,pens:cur.pens,gold:cur.gold,variant});
    let g=''; for(let p=0;p<n;p++){ const isG=cur.gold===p, isP=cur.pens.includes(p); const shrinkAffected=shrinkWarn&&p>=cur.n-Math.abs(shrinkWarn.by); g+=`<rect class="space${shrinkAffected?' warn':''}" x="${PAD+p*CW+3}" y="${CY-32}" width="${CW-6}" height="64" rx="12"/><text class="num" x="${PAD+p*CW+CW/2}" y="${CY+52}">${p+1}</text>`; if(isP) g+=coinSvgStr('penny',PAD+p*CW+CW/2,CY,R); if(isG) g+=coinSvgStr('gold',PAD+p*CW+CW/2,CY,R); g+=`<rect class="cell" data-p="${p}" x="${PAD+p*CW}" y="${CY-36}" width="${CW}" height="72" fill="transparent" style="cursor:pointer" tabindex="0" role="button" aria-label="space ${p+1}"/>`; }
    const W=n*CW+PAD*2; const txt=`Pennies: ${cur.pens.map(p=>p+1).sort((a,b)=>a-b).join(', ')||'none'}  ·  Gold: ${cur.gold===undefined||cur.gold===null?'?':cur.gold+1}`;
    host.innerHTML=`<div class="gx-demo"><span class="gx-tag">Workshop</span><div class="gc-build"><div class="row"><button class="m" data-mode="penny" aria-pressed="${mode==='penny'}">Penny</button><button class="m" data-mode="gold" aria-pressed="${mode==='gold'}">Gold coin</button><button class="m" data-mode="remove" aria-pressed="${mode==='remove'}">Remove</button></div><div class="row" role="group" aria-label="Rules"><span class="gc-lab">Rules</span><button class="m" data-rules="rear" aria-pressed="${variant!=='std'}">Pennies on both sides</button><button class="m" data-rules="std" aria-pressed="${variant==='std'}">Gold farthest right</button></div><div class="gc-scroll" style="width:100%"><svg class="gc" viewBox="0 0 ${W} 150" style="width:100%;min-width:${Math.max(260,n*26)}px;color:var(--fg)">${g}</svg></div><div class="row"><span class="gc-sum" style="font:600 13px var(--font-mono);color:var(--g6)">${txt}</span></div><div class="row">Track <button class="m" data-len="-1" aria-label="shorter">−</button><b style="min-width:2ch;text-align:center;color:var(--fg)">${n}</b><button class="m" data-len="1" aria-label="longer">+</button><button class="m" id="gwRandom">Random position</button><button class="m" id="gwTest">Who wins from here?</button></div><div class="row"><input id="gwPaste" size="34" placeholder="Pennies: 3, 6   Gold: 11" aria-label="paste a position (spaces start at 1)"><button class="m" id="gwApply">Use this</button></div><div class="bad" id="gwErr">${shrinkWarn.msg||''}</div><div class="gc-verdict" id="gwV">${shown&&s?verdict(s):''}</div><div class="gx-note" style="min-height:0">Spaces are numbered from 1. Select a tool, then click a space — Gold moves the one gold coin rather than adding a second. Dragging a coin to a new space also works.</div></div></div>`;
    host.querySelectorAll('.cell').forEach(c=>{ const p=+c.dataset.p;
      const go=()=>{ shrinkWarn=''; if(mode==='gold'){ cur.pens=cur.pens.filter(x=>x!==p); cur.gold=p; } else if(mode==='remove'){ if(cur.gold===p){ shrinkWarn={by:0,msg:'The game needs exactly one gold coin — use the Gold tool to move it instead of removing it.'}; } else cur.pens=cur.pens.filter(x=>x!==p); } else { if(cur.gold===p) return; cur.pens=cur.pens.includes(p)?cur.pens.filter(x=>x!==p):cur.pens.concat([p]); } shown=false; save(); draw(); };
      c.addEventListener('click',go); c.addEventListener('keydown',e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); go(); } });
      /* drag an existing coin to an empty space */
      if(cur.gold===p||cur.pens.includes(p)){ c.addEventListener('pointerdown',e=>{ if(e.button!==0) return; const fromP=p, kind=cur.gold===p?'gold':'penny'; let dropped=false;
        const up=ev=>{ window.removeEventListener('pointerup',up); const svg=host.querySelector('svg'); const r=svg.getBoundingClientRect(); const scale=r.width/W; const to=Math.round((ev.clientX-r.left)/scale/CW-0.5); if(to>=0&&to<cur.n&&to!==fromP&&!(cur.gold===to)&&!cur.pens.includes(to)){ dropped=true; if(kind==='gold') cur.gold=to; else { cur.pens=cur.pens.filter(x=>x!==fromP); cur.pens.push(to); } shrinkWarn=''; save(); draw(); } };
        window.addEventListener('pointerup',up,{once:true}); }); } });
    host.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{ mode=b.dataset.mode; shrinkWarn=''; draw(); });
    host.querySelectorAll('[data-rules]').forEach(b=>b.onclick=()=>{ if(o.variant===b.dataset.rules) return; o.variant=b.dataset.rules; shown=false; X.refresh&&X.refresh(); draw(); });
    host.querySelectorAll('[data-len]').forEach(b=>b.onclick=()=>{ const by=+b.dataset.len; const nextN=Math.max(TRACK_MIN,Math.min(TRACK_MAX,cur.n+by));
      if(by<0){ const occupied=[cur.gold,...cur.pens].some(p=>p>=nextN); if(occupied){ shrinkWarn={by:cur.n-nextN,msg:`Space ${cur.n} still holds a coin (highlighted) — move or remove it before shortening the track.`}; draw(); return; } }
      cur.n=nextN; shrinkWarn=''; save(); draw(); });
    host.querySelector('#gwRandom').onclick=()=>{ const p=randomBoard(cur.n,o.variant||DEFAULT_RULES,{kMin:3,kMax:7}); cur=copy(p); shown=false; shrinkWarn=''; save(); draw(); };
    host.querySelector('#gwTest').onclick=()=>{ shown=true; draw(); };
    host.querySelector('#gwApply').onclick=()=>{ const t=host.querySelector('#gwPaste').value; const pm=/pennies?\s*:?\s*([\d,\s]*)/i.exec(t), gm=/gold\s*:?\s*(\d+)/i.exec(t); if(!gm){ host.querySelector('#gwErr').textContent='Add "Gold: N" (spaces start at 1).'; return; } const pens=pm&&pm[1]?pm[1].split(/[\s,]+/).filter(Boolean).map(x=>+x-1):[]; const gold=+gm[1]-1; const n=cur.n; const off=[gold].concat(pens).filter(x=>x<0||x>=n).map(x=>x+1); if(off.length){ host.querySelector('#gwErr').textContent=`Space ${off[0]} is off the board: the track runs from 1 to ${n}. Make the track longer first, or move the coin.`; return; } const e=validPos({n,pens,gold},o.variant||DEFAULT_RULES); if(e.length){ host.querySelector('#gwErr').textContent=e.join(' '); return; } cur={n,pens,gold}; shown=false; shrinkWarn=''; save(); draw(); }; };
  const verdict=s=>{ const w=G.winning(s); return w?`The player to move can force a win. One winning move: ${(()=>{ const m=G.formulaMove(s); return m.t==='collect'?'take the leftmost coin':`slide ${label(s,m.id)} to space ${m.to+1}`; })()}.`:'The player to move loses against perfect play. Every move leaves a winning reply.'; };
  draw(); }

/* ---------- register ---------- */
X.register({ id:'gold', title:['Bao Gold'], aka:'The Gold Coin', blurb:'Slide a coin left, or take the leftmost coin. Whoever takes the gold wins.', entryReady:true,
  online:()=>{ window.ZFOnlineGold && ZFOnlineGold.open(); }, onlineCustomize:()=>{ window.ZFOnlineGold && ZFOnlineGold.customize(); },
  // .demo is the coin/track workshop (reused by the live Customize board and this entry screen's own inline
  // workshop) -- not a rules demo, so "try a move" gets its own function. This practice position is a throwaway
  // G.newState() the demo owns entirely; it is never M's own state and can never touch a real match.
  // Every move gRender ever offers here (a highlighted destination, or the take-leftmost button) already came
  // from G.legal() -- the same validator the real game uses -- so this never second-guesses which legal move the
  // player chose. It applies whatever they play and narrates the result; it only ever *suggests* which move to
  // try next, in the message text, never by silently discarding a legal move it didn't expect.
  entryDemo(host){ ZF.injectCSS&&ZF.injectCSS(); X.css();
    const mk=()=>G.newState({n:6,pens:[1],gold:4,variant:'std'});
    const startMsg='Try sliding a coin left into an open space, or take the leftmost coin — whoever takes the <b>gold coin</b> wins the game. For this example, try the penny first.';
    let st=mk(), msg=startMsg;
    host.innerHTML=`<div class="gx-demo"><span class="gx-tag">Try a move</span><div class="gx-dbody" style="width:100%"></div><div class="gx-note" aria-live="polite"></div><button type="button" class="gx-btn">↺ Reset</button></div>`;
    const body=host.querySelector('.gx-dbody'), nt=host.querySelector('.gx-note');
    const draw=()=>{ nt.innerHTML=msg;
      gRender(body, st, { human:true, humanIs:1, opp:'2p', hintMove:null, play(m){
        const before=st.coins.find(c=>c.id===m.id||(m.t==='collect'&&c===st.coins[0]));
        st=G.apply(st,m);
        if(m.t==='collect'){
          msg = before.kind==='gold'
            ? '✓ <b>You took the gold coin — that wins the game instantly</b>, wherever it sat on the track.'
            : `You took the penny at the front. <b>Pennies never decide the game</b> — only the gold coin does.${st.coins.length?' Keep going: slide, or take the leftmost coin again once it\'s the gold.':''}`;
        } else {
          const goldLeft = st.coins.length && st.coins[0].kind==='gold';
          msg = `You slid ${before.kind==='gold'?'the gold coin':'the penny'} to space ${m.to+1}. Coins can't pass or land on each other, which is why only some spaces were open.${goldLeft?' The <b>gold coin</b> is leftmost now — take it, and you win.':' Keep exploring, or take the leftmost coin.'}`;
        }
        draw();
      } });
    };
    body.addEventListener('click',e=>{ if(st.over||e.target.closest('.coin,.dest,#gcTake')) return;
      msg='Tap a coin to select it, then a highlighted space — or take the leftmost coin with the button that appears below it.'; draw(); });
    host.querySelector('.gx-btn').onclick=()=>{ st=mk(); msg=startMsg; draw(); };
    draw();
  },
  defaults:{variant:DEFAULT_RULES,position:'example',len:'12',coins:'4',custom:''}, aiDelay:800,
  /* saved settings from before the Rules control existed carry variant 'std' that nobody chose (it was the hidden
     default), which silently rejected every board with a penny right of the gold: start those on the general rules */
  migrate(o){ if(o.rulesRev!==2){ o.variant=DEFAULT_RULES; o.rulesRev=2; } },
  options:[{key:'variant',label:'Rules',values:[['rear','Pennies on both sides'],['std','Gold farthest right']]},{key:'position',label:'Start from',values:[['example','Example'],['random','Random'],['custom','Workshop']]},{key:'len',label:'Random track',values:[['8','8'],['10','10'],['12','12'],['16','16'],['24','24']]},{key:'coins',label:'Random coins',values:[['3','3'],['4','4'],['5','5'],['6','6'],['7','7']]}],
  diffs:[['easy','Easy'],['medium','Medium'],['hard','Perfect']],
  diffNote:'Easy takes the gold when it can and otherwise moves almost at random. Medium finds a winning move about half the time. Perfect always plays a winning move when one exists (the strategy is checked against an exhaustive solver). From a lost position no play can force a win, so Perfect just makes the trickiest move it can.',
  rulesFor:o=>`<p><b>Slide a coin left, or take the leftmost coin. Whoever takes the gold wins.</b></p><p>Coins sit on a row of spaces: pennies and one gold coin${o.variant==='std'?', with the gold farthest right (the Gold farthest right rules)':', which may stand anywhere among them, with pennies before it, after it or both'}. On your turn do <b>exactly one</b> of these: <b>slide</b> one coin left by one or more spaces, without landing on or passing another coin; or <b>take</b> the leftmost coin, wherever it stands. It does not have to reach the first space. Coins cannot move right, and you cannot pass. Pennies count for nothing: only taking the gold decides the winner, and it ends the game at once. Taking a coin does not move the others.</p><p>Nothing here is luck. Whoever balances the gaps between paired coins wins; the lessons let you discover how before any mathematics appears.</p>`,
  canStart(o){ if(o.position!=='custom') return ''; return validPos(parseCustom(o),o.variant||DEFAULT_RULES)[0]||''; },
  init:o=>optToState(o), actor:s=>s.turn, apply:(s,m)=>G.apply(s,m), legal:s=>G.legal(s),
  /* exact: the solver knows every position */
  judge:(s,m,n)=>{ if(!window.ZFCoach||n.over) return null; const L=G.legal(s); let vb,va,good; try{ vb=G.winning(s)?1:-1; va=G.winning(n)?-1:1; good=G.winningMovesF(s).length; }catch(e){ return null; }
    return ZFCoach.exact({before:vb,after:va,good,total:L.length}); }, ai:(s,d)=>X.askAI('gold',s,d),
  hint:(s)=>hintFor(s,(X.M&&X.M.hintMove&&typeof X.M.hintMove==='object')?X.M.hintMove:null),
  status(s,c){ if(s.over) return `<span class="who">${who(s.winner,c)==='You'?'You took the gold coin':who(s.winner,c)+' took the gold coin'}</span>`;
    // c.human is also false while an online opponent is busy/disconnected -- not the same as whose turn it logically
    // is, so the online branch checks the turn directly (matching Domineering's own fix for the same conflation).
    const mine=s.turn===c.humanIs;
    return `<span class="who">${c.opp==='online'?(mine?'Your turn':`${(c.opponentNickname||'Your friend')}’s turn`):(c.human?'Your turn':`Computer is thinking…`)}</span><span class="cond">slide a coin, or take the leftmost</span>`; },
  render:gRender,
  result(s,c){ const name=who(s.winner,c); const title=name==='You'?'You won!':(name==='The computer'?'Computer won':`${name} won!`); const detail=name==='You'?'You took the gold coin.':(name==='The computer'?'The computer took the gold coin.':`${name} took the gold coin.`); return {title,detail}; },
  demo:workshop, onOption:(o,h)=>workshop(h,o),
  puzzleSets:PUZ });
})();
