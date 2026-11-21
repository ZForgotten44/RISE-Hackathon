
/* ================= NIM + CHOMP UI ================= */
(function(){
const $=id=>document.getElementById(id);
const homeEl=$('home');
const nimSetup=$('nimSetup'), nimGame=$('nimGame'), chSetup=$('chSetup'), chGame=$('chGame');
function hideAll(){ homeEl.style.display='none'; ['setup','game','nimSetup','nimGame','chSetup','chGame','gxSetup','gxGame'].forEach(i=>{ const e=$(i); if(e) e.classList.remove('show'); }); }
function toLobby(){ cancelAI(); hideAll(); homeEl.style.display='block'; window.scrollTo({top:0,behavior:'smooth'}); refreshResume(); }
function mulberry(seed){ let a=seed>>>0; return function(){ a|=0; a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
function swBind(el,val,cb){ const on=val==='practice'; el.setAttribute('aria-checked',on); el.onclick=()=>{ const v=el.getAttribute('aria-checked')!=='true'; el.setAttribute('aria-checked',v); cb(v?'practice':'challenge'); }; }
function segs(el,val,cb){ const mark=v=>el.querySelectorAll('button').forEach(x=>{ const on=x.dataset.v===v; x.classList.toggle('on',on); x.setAttribute('aria-pressed',on?'true':'false'); }); mark(val); el.querySelectorAll('button').forEach(b=>{ b.onclick=()=>{ mark(b.dataset.v); cb(b.dataset.v); }; }); }
const SAVE_KEY='ttt-saved-v1'; let saved=JSON.parse(localStorage.getItem(SAVE_KEY)||'{}');
function saveGame(k,obj){ if(obj) saved[k]=obj; else delete saved[k]; localStorage.setItem(SAVE_KEY,JSON.stringify(saved)); refreshResume(); }
/* "Continue playing" sits quietly under the Games heading, and only when a saved Nim or Chomp game exists */
function refreshResume(){ const r=$('resumeBar'); const items=[]; if(saved.nim) items.push(`<button type="button" data-r="nim">Nim · ${saved.nim.h.length} piles <span aria-hidden="true">→</span></button>`); if(saved.chomp) items.push(`<button type="button" data-r="chomp">Chomp · ${saved.chomp.R}×${saved.chomp.C} <span aria-hidden="true">→</span></button>`); r.hidden=!items.length; r.innerHTML=items.length?`<span class="zf-resume-l" id="zfResumeL">Continue playing</span><span class="zf-resume-b" role="group" aria-labelledby="zfResumeL">${items.join('')}</span>`:''; r.querySelectorAll('button').forEach(b=>b.onclick=()=>{ if(b.dataset.r==='nim') nimResume(); else chResume(); }); }

/* ---------- shared: card wiring ---------- */

/* ================= NIM ================= */
const nimP=Object.assign({ opp:'ai', diff:'medium', first:'human', mode:'practice', rule:'normal', buildChoose:false, piles:['1','3','5','7'], tab:'list', gen:{count:4,min:1,max:9,pattern:'random',seed:'',filter:'any'} }, prefs.nim||{});
function nimSavePrefs(){ prefs.nim=nimP; savePrefs(); }
let nm=null; // nim match
const NPRESETS=[
  {name:'Classic',h:['1','3','5','7'],d:'The one everyone starts with.'},
  {name:'Two equal piles',h:['6','6'],d:'Symmetry does a lot of work here.'},
  {name:'Two unequal piles',h:['4','9'],d:'A first move fixes something.'},
  {name:'All singles',h:['1','1','1','1','1'],d:'Nothing to decide except how to count.'},
  {name:'Ones and twos',h:['1','2','2','1','2'],d:'Small piles, real choices.'},
  {name:'Ones, twos, threes',h:['3','2','1','3','2'],d:'Enough variety to matter.'},
  {name:'Paired copies',h:['2','5','9','2','5','9'],d:'Every pile has a twin.'},
  {name:'Large numbers',h:['18446744073709551616','18446744073709551617','3'],d:'Beyond 64 bits. Still exact.'},
  {name:'Misère endgame',h:['1','1','1','5'],d:'One big pile, some singles. Rule matters.'},
];
let demoNim=null, demoCh=null;
function nimOpenSetup(){ hideAll(); nimSetup.classList.add('show'); nimRenderSetup(); if(!(nm&&nm.online&&!nm.preview)) demoNim=ZFEntry.mount('nim',$('nDemo'),{get:()=>({piles:nimP.piles.map(BigInt),misere:nimP.rule==='misere'})}); (window.gameScrollTo||(el=>el.scrollIntoView({behavior:'smooth',block:'start'})))(nimSetup); }
// Returning to the room from the settings page — the live online match (nm) was never torn down, just hidden.
function nimBackToGame(){ hideAll(); nimGame.classList.add('show'); window.__nimRenderExternal&&window.__nimRenderExternal(); }
function nimHowto(){ $('nRuleNote').innerHTML=nimP.rule==='misere'?'Misère: whoever takes the last token <b>loses</b>.':'Normal: whoever takes the last token <b>wins</b>.'; }
function nimRenderSetup(){ nimHowto();
  // A live online match keeps the entry screen reachable (via the in-game Settings button) but locked to it: the
  // rest of this screen configures a LOCAL match, and starting one here would abandon a friend mid-game — the same
  // reason nimStart()/nimEnterFresh() refuse to run while nm.online is set.
  const liveOnline = nm && nm.online && !nm.preview;
  $('nOpp').querySelectorAll('button').forEach(b=>{
    b.classList.toggle('on', liveOnline ? b.dataset.v==='online' : b.dataset.v===nimP.opp);
    b.disabled = liveOnline && b.dataset.v!=='online';
    b.onclick = liveOnline ? null : ()=>{ if(b.dataset.v==='online'){ window.ZFOnlineNim&&ZFOnlineNim.open(); return; } nimP.opp=b.dataset.v; nimRenderSetup(); };
  });
  $('nOnlineNote').style.display = liveOnline?'':'none';
  if(liveOnline) $('nOnlineNote').textContent = `Playing online with ${(nm.online&&nm.online.opponentNickname)||'your friend'} — use Leave room (below the board) to end this match.`;
  $('nBackToGame').style.display = liveOnline?'':'none'; $('nBackToGame').onclick = liveOnline?nimBackToGame:null;
  $('nOfflineOnly').style.display = liveOnline?'none':'block'; $('nEDemo').style.display = liveOnline?'none':'block';
  if(liveOnline) return;
  segs($('nDiff'),nimP.diff,v=>nimP.diff=v); segs($('nFirst'),nimP.first,v=>nimP.first=v); swBind($('nMode'),nimP.mode,v=>nimP.mode=v); segs($('nRule'),nimP.rule,v=>{nimP.rule=v;nimHowto();nimPreview();});
  $('nBuildChoose').checked=nimP.buildChoose; $('nBuildChoose').onchange=e=>nimP.buildChoose=e.target.checked;
  const ai=nimP.opp==='ai'; $('nRowDiff').style.display=ai?'flex':'none'; $('nRowFirst').style.display=ai?'flex':'none'; $('nRowChoose').style.display=ai?'flex':'none';
  segs($('nTabs'),nimP.tab,v=>{nimP.tab=v;nimRenderSetup();});
  $('nList').style.display=nimP.tab==='list'?'block':'none'; $('nBuild').style.display=nimP.tab==='build'?'block':'none'; $('nGen').style.display=nimP.tab==='generate'?'block':'none'; $('nPre').style.display=nimP.tab==='presets'?'block':'none';
  if(nimP.tab==='list') $('nListIn').value=nimP.piles.join(', ');
  if(nimP.tab==='build') nimRenderBuild(); if(nimP.tab==='presets') nimRenderPresets(); if(nimP.tab==='generate') nimRenderGen();
  nimPreview();
}
function nimRenderBuild(){ const list=$('nPileList'); list.innerHTML=nimP.piles.map((h,i)=>`<div class="prow"><span class="pid">#${i+1}</span><input type="text" inputmode="numeric" value="${h}" data-i="${i}" aria-label="pile ${i+1} height"><button data-a="dup" data-i="${i}" title="duplicate">⧉</button><button data-a="up" data-i="${i}">↑</button><button data-a="down" data-i="${i}">↓</button><button data-a="del" data-i="${i}">×</button></div>`).join('');
  list.querySelectorAll('input').forEach(inp=>{ inp.onchange=()=>{ const v=inp.value.trim(); if(/^\d+$/.test(v)){ nimP.piles[+inp.dataset.i]=v.replace(/^0+(?=\d)/,''); } nimRenderBuild(); nimPreview(); }; });
  list.querySelectorAll('button').forEach(b=>b.onclick=()=>{ const i=+b.dataset.i, a=b.dataset.a; if(a==='del') nimP.piles.splice(i,1); if(a==='dup') nimP.piles.splice(i+1,0,nimP.piles[i]); if(a==='up'&&i>0){ [nimP.piles[i-1],nimP.piles[i]]=[nimP.piles[i],nimP.piles[i-1]]; } if(a==='down'&&i<nimP.piles.length-1){ [nimP.piles[i+1],nimP.piles[i]]=[nimP.piles[i],nimP.piles[i+1]]; } nimRenderBuild(); nimPreview(); }); }
$('nListApply').onclick=()=>{ const raw=$('nListIn').value; const parts=raw.split(/[\s,;\n]+/).filter(Boolean); const bad=parts.filter(x=>!/^\d+$/.test(x)); if(!parts.length){ $('nListMsg').textContent='Enter at least one number, e.g. 1, 3, 5, 7'; return; } if(bad.length){ $('nListMsg').textContent=`Not a whole number: ${bad.slice(0,3).join(', ')} — use nonnegative integers only.`; return; } nimP.piles=parts.map(x=>x.replace(/^0+(?=\d)/,'')); $('nListMsg').textContent=`${nimP.piles.length} piles applied.`; nimPreview(); };
$('nListIn')&&$('nListIn').addEventListener('keydown',e=>{ if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); $('nListApply').click(); } });
$('nAdd').onclick=()=>{ nimP.piles.push('1'); nimRenderBuild(); nimPreview(); };
$('nDupAll').onclick=()=>{ nimP.piles=nimP.piles.concat(nimP.piles); nimRenderBuild(); nimPreview(); };
$('nClear').onclick=()=>{ nimP.piles=[]; nimRenderBuild(); nimPreview(); };
$('nPaste').onclick=()=>{ try{ const h=NIM.parseList($('nPasteIn').value); nimP.piles=h.map(String); $('nPasteIn').value=''; nimRenderBuild(); nimPreview(); }catch(e){ $('nMsg').textContent=e.message; } };
$('nExport').onclick=()=>{ $('nPasteIn').value=JSON.stringify({game:'nim',rule:nimP.rule,piles:nimP.piles}); };
$('nImport').onclick=()=>{ try{ const o=JSON.parse($('nPasteIn').value); if(!Array.isArray(o.piles)||!o.piles.every(x=>/^\d+$/.test(x))) throw new Error('bad position'); nimP.piles=o.piles.map(String); if(o.rule) nimP.rule=o.rule; nimRenderSetup(); }catch(e){ $('nMsg').textContent='import failed: '+e.message; } };
$('nSavePreset').onclick=()=>{ const name=$('nPresetName').value.trim(); if(!name) return; const mine=JSON.parse(localStorage.getItem('nim-presets')||'[]'); mine.push({name,h:nimP.piles.slice(),d:'saved position'}); localStorage.setItem('nim-presets',JSON.stringify(mine)); $('nPresetName').value=''; $('nMsg').textContent='saved.'; };
function nimRenderPresets(){ const mine=JSON.parse(localStorage.getItem('nim-presets')||'[]'); $('nPre').innerHTML=NPRESETS.concat(mine).map((p,i)=>`<div class="preset" data-i="${i}"><b>${p.name}</b><span>${p.h.join(', ')}</span><em>${p.d}</em></div>`).join(''); $('nPre').querySelectorAll('.preset').forEach(el=>el.onclick=()=>{ const all=NPRESETS.concat(mine); nimP.piles=all[+el.dataset.i].h.slice(); nimP.tab='build'; nimRenderSetup(); }); }
function nimRenderGen(){ const g=nimP.gen; $('gCount').value=g.count; $('gMin').value=g.min; $('gMax').value=g.max; $('gSeed').value=g.seed; segs($('gPattern'),g.pattern,v=>g.pattern=v); segs($('gFilter'),g.filter,v=>g.filter=v); }
function nimGenerate(randomAll){ const g=nimP.gen; if(randomAll){ g.count=2+Math.floor(Math.random()*6); g.min=1; g.max=2+Math.floor(Math.random()*12); g.pattern=['equal','random','staircase','mirrored','repeat','random'][Math.floor(Math.random()*6)]; nimRenderGen(); }
  else { g.count=Math.max(1,parseInt($('gCount').value)||1); g.min=Math.max(0,parseInt($('gMin').value)||0); g.max=Math.max(g.min,parseInt($('gMax').value)||g.min); g.seed=$('gSeed').value.trim(); }
  const seed = g.seed? (parseInt(g.seed)||[...g.seed].reduce((a,ch)=>a*31+ch.charCodeAt(0),7)) : Math.floor(Math.random()*1e9); if(!g.seed) $('gSeedUsed').textContent='seed used: '+seed; else $('gSeedUsed').textContent='';
  const rnd=mulberry(seed); const span=g.max-g.min; const ri=()=>g.min+Math.floor(rnd()*(span+1));
  function one(){ const out=[]; if(g.pattern==='equal'){ const h=ri(); for(let i=0;i<g.count;i++) out.push(h); }
    else if(g.pattern==='random'){ for(let i=0;i<g.count;i++) out.push(ri()); }
    else if(g.pattern==='staircase'){ const start=ri(); for(let i=0;i<g.count;i++) out.push(Math.min(g.max,start+i)); }
    else if(g.pattern==='mirrored'){ const half=Math.ceil(g.count/2); const a=[]; for(let i=0;i<half;i++) a.push(ri()); for(let i=0;i<g.count;i++) out.push(a[i<half?i:g.count-1-i]); }
    else if(g.pattern==='repeat'){ const k=Math.max(1,Math.min(3,g.count)); const a=[]; for(let i=0;i<k;i++) a.push(ri()); for(let i=0;i<g.count;i++) out.push(a[i%k]); }
    return out; }
  let found=null; const misere=nimP.rule==='misere';
  for(let attempt=0; attempt<400; attempt++){ const h=one(); if(!h.some(x=>x>0)) continue; if(g.filter==='any'){ found=h; break; } const w=NIM.isWin(h.map(BigInt),misere); if((g.filter==='win')===w){ found=h; break; } }
  if(!found){ $('nMsg').textContent = g.filter==='any' ? 'Every generated board was empty — raise the maximum height.' : `No ${g.filter==='win'?'winning':'losing'} board found in 400 tries with these settings — try a wider height range or a different pattern (not proof that none exists).`; return; }
  $('nMsg').textContent = randomAll ? `settings: ${g.count} piles, heights ${g.min}–${g.max}, ${g.pattern}` : (nimP.mode==='challenge'&&g.filter!=='any' ? 'evaluation concealed until after the attempt' : '');
  nimP.piles=found.map(String); nimPreview(); }
$('gGo').onclick=()=>nimGenerate(false); $('gAgain').onclick=()=>nimGenerate(false); $('gRandom').onclick=()=>nimGenerate(true);
function nimLive(){ const el=$('nLive'); if(!el) return; const h=nimP.piles, MAXP=22, MAXT=10; if(!h.length){ el.innerHTML='<span class="nl-empty">No piles yet. Add one, or choose Random board.</span>'; return; }
  el.innerHTML=h.slice(0,MAXP).map(v=>{ let n=0n; try{ n=BigInt(v); }catch(e){} const shown=n>BigInt(MAXT)?MAXT:Number(n); const lab=String(v).length>6?String(v).slice(0,5)+'…':String(v); return `<div class="nl-pile" title="${v}">${'<i></i>'.repeat(shown)}<b>${n>BigInt(MAXT)?'≥':''}${lab}</b></div>`; }).join('')+(h.length>MAXP?`<span class="nl-more">+${h.length-MAXP} piles</span>`:'');
  el.setAttribute('aria-label',`Your board: ${h.length} pile${h.length===1?'':'s'}: ${h.slice(0,12).join(', ')}${h.length>12?'…':''}`); }
function nimPreview(){ const h=nimP.piles.map(BigInt); $('nStart').disabled = !h.some(x=>x>0n); if(!h.some(x=>x>0n)) $('nMsg').textContent='A match needs at least one token.'; nimLive(); if(demoNim) demoNim.refresh(); }
$('nRandomBoard')&&($('nRandomBoard').onclick=()=>{ const g=nimP.gen, keep={...g}; g.filter='any'; g.count=3+Math.floor(Math.random()*5); g.min=1; g.max=3+Math.floor(Math.random()*9); g.pattern='random'; g.seed=''; nimGenerate(false); nimP.tab='build'; nimRenderSetup(); $('nMsg').textContent=`Random board: ${nimP.piles.length} piles.`; });
/* --- adaptive layout: computed from the whole position, not per move --- */
function nimLayout(h, mini){
  const n=h.length; const MAXTOK=mini?8:60;     // individual tokens rendered per pile
  const tallest = h.reduce((m,x)=>{ const v = x>BigInt(MAXTOK)?MAXTOK:Number(x); return Math.max(m,v); },1);
  if(mini) return { rows:[h.map((_,i)=>i)], tw:26, th:11, tg:3, pg:16, MAXTOK, pan:false };
  const wrapW=Math.min(innerWidth-2*Math.max(16,innerWidth*0.05),1280);
  const W = Math.max(280,wrapW);
  const H = Math.max(300, Math.min(innerHeight-230, 820));    // the piles use the room the toolbar leaves
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const tryRows=(r)=>{
    const per=Math.ceil(n/r);
    const label=46, rowH = H/r - label - (r>1?10:0);
    const tg0=6;
    const thH = Math.floor(rowH/tallest) - tg0;                    // tallest pile fills the row
    const twW = Math.floor(W/(per+0.22*(per-1)));                 // widest pile fills the width, gaps scale with it
    const tw = clamp(Math.min(twW,190), 26, 190);
    const th = clamp(Math.min(thH, Math.round(tw*0.4)), 8, 52);
    const tg = th>=30?8:(th>=18?5:3);
    const pg = clamp(Math.round(tw*0.22), 10, 44);
    return { r, per, th, tg, tw, pg, fits: th>=14 && tw>=30 && (per*tw+(per-1)*pg)<=W };
  };
  let best=null;
  for(let r=1;r<=3;r++){ const t=tryRows(r); if(t.fits){ best=t; break; } }
  let pan=false;
  if(!best){ best={ r:Math.min(3,Math.max(1,Math.ceil(n/14))), th:18, tg:4, tw:46, pg:22 }; pan=true; }
  const rows=[]; const base=Math.floor(n/best.r), extra=n%best.r; let idx=0;
  for(let i=0;i<best.r;i++){ const cnt=base+(i<extra?1:0); rows.push(Array.from({length:cnt},(_,k)=>idx+k)); idx+=cnt; }
  /* fixed geometry for the whole round: a row is as tall as its tallest starting pile, so taking tokens never moves the baseline, the labels or the other piles */
  const colH=Math.max(56,Math.min(120,innerHeight*0.14)); const stackH=x=>{ const many=x>BigInt(MAXTOK); const n=many?14:Number(x); return n*(best.th+best.tg)+(many?colH+best.tg:0); };
  const rowH=rows.map(r=>Math.max(...r.map(i=>stackH(h[i])),best.th+best.tg));
  return { rows, tw:best.tw, th:best.th, tg:best.tg, pg:best.pg, MAXTOK, pan, rowH };
}
function renderPiles(h,hollow,sel,hover,mini,layout){
  const L = layout || nimLayout(h,mini);
  const pileHtml=(i)=>{ const x=h[i]; const many = x>BigInt(L.MAXTOK);
    const shown = many ? 14 : Number(x);           // tall piles: top tokens stay individually clickable
    const hidden = many ? x-BigInt(shown) : 0n;    // the rest is one labelled column, never a single token
    let toks='';
    if(many) toks+=`<i class="tok column ${hollow?'hollow':''}" data-pile="${i}" data-count="${hidden}" title="${hidden} more tokens in this pile — click to type an exact amount" aria-label="column of ${hidden} tokens"><b>${hidden}</b></i>`;
    for(let k=0;k<shown;k++){ const j=Number(hidden)+k; const jb=BigInt(j);
      const pv=(hover&&hover.pile===i&&x-jb<=hover.take)||(sel&&sel.pile===i&&x-jb<=sel.take);
      toks+=`<i class="tok ${hollow?'hollow':''} ${pv?'pv':''}" data-pile="${i}" data-j="${j}" title="take ${x-jb}"></i>`; }
    return `<div class="pile ${x===0n?'empty':''}" data-pile="${i}" id="npile-${i}"><div class="toks">${toks}</div><div class="plabel"><span class="pid"><span class="w">pile </span>${i+1}</span><span class="pcount">${x}</span></div></div>`; };
  return `<div class="nrows" style="display:contents">${L.rows.map((r,ri)=>`<div class="nrow"${L.rowH?` style="height:${Math.round(L.rowH[ri]+44)}px"`:''}>${r.map(pileHtml).join('')}</div>`).join('')}</div>`; }

/* --- nim match --- */
/* A fresh entry (card, Play button, arcade listing, or a direct /nim link with no room code) shows nimSetup: the
   real settings and the "try a move" demo, live on the page — no popup, no inert board-in-waiting underneath it.
   The match itself (AI turns, undo history, sounds) does not exist until nimStart() actually runs. */
function nimEnterFresh(){
  if(nm&&nm.online) return; // never tear down a live online match to show the fresh-entry setup screen underneath it
  const hasRoom=new URLSearchParams(location.search).has('room');
  if(hasRoom){ cancelAI(); hideAll(); nimGame.classList.add('show'); return; } // the room link's join-preview/reconnect (online-nim.js) owns the rest
  cancelAI(); nimOpenSetup();
}
function nimStart(swap){ if(nm&&nm.online) return; // a stale "Start game" overlay/button can outlive entering a room; never let it clobber a live online match
  cancelAI(); let humanIs=1; if(nimP.opp==='ai'){ if(nimP.first==='ai') humanIs=2; else if(nimP.first==='random') humanIs=Math.random()<.5?1:2; }
  if(swap&&nm) humanIs=3-nm.humanIs;
  const h=nimP.piles.map(BigInt); if(!h.some(x=>x>0n)) return; const misere=nimP.rule==='misere'; let note='';
  if(nimP.opp==='ai'&&nimP.buildChoose&&!swap){ const w=NIM.isWin(h,misere); humanIs = w?2:1; note = `Computer inspected your board and chose to move ${w?'first':'second'}.`; }
  nm={ layout:null, start:h.slice(), h:h.slice(), misere, opp:nimP.opp, diff:nimP.diff, mode:nimP.mode, humanIs, player:1, over:false, winner:0, moves:[], snaps:[h.slice()], view:-1, sel:null, hover:null, assisted:false, hint:null, note };
  nimSavePrefs(); hideAll(); nimGame.classList.add('show'); window.ZFShell && ZFShell.hideStartOverlay('nimGame'); $('nUndo').style.display=''; $('nRestart').style.display='';
  $('nGameMode').textContent = nimP.opp==='2p'?'two players':`${nimP.diff} · ${nimP.mode}`; $('nRematch').textContent = nimP.opp==='2p' ? 'new game · other player starts' : (humanIs===1 ? 'new game · computer starts' : 'new game · you start'); $('nRules').textContent = misere?'Remove one or more tokens from exactly one pile. You may take a whole pile. Misère: whoever takes the last token LOSES.':'Remove one or more tokens from exactly one pile. You may take a whole pile. Whoever takes the last token wins.';
  $('nHint').style.display=(nimP.mode==='practice'&&nimP.opp==='ai')?'':'none'; $('nResult').classList.remove('show');
  (window.gameScrollTo||(el=>el.scrollIntoView({behavior:'smooth',block:'start'})))(nimGame); nimRender(); nimMaybeAI(); }
function nimResume(){ if(nm&&nm.online) return; const s=saved.nim; nimP.rule=s.misere?'misere':'normal'; nimP.opp=s.opp; nimP.diff=s.diff; nimP.mode=s.mode; nm={ layout:null, start:s.start.map(BigInt), h:s.h.map(BigInt), misere:s.misere, opp:s.opp, diff:s.diff, mode:s.mode, humanIs:s.humanIs, player:s.player, over:false, winner:0, moves:s.moves.map(m=>({pile:m.pile,take:BigInt(m.take),leave:BigInt(m.leave)})), snaps:s.snaps.map(x=>x.map(BigInt)), view:-1, sel:null, hover:null, assisted:s.assisted, hint:null, note:'' }; hideAll(); nimGame.classList.add('show'); $('nGameMode').textContent=nm.opp==='2p'?'two players':`${nm.diff} · ${nm.mode}`; $('nHint').style.display=(nm.mode==='practice'&&nm.opp==='ai')?'':'none'; $('nResult').classList.remove('show'); nimRender(); nimMaybeAI(); }
function nimPersist(){ if(nm&&nm.online) return;  /* online rooms keep their own reconnect token; never overwrite the local single-player resume slot with one */
  if(!nm||nm.over){ saveGame('nim',null); return; } saveGame('nim',{ start:nm.start.map(String), h:nm.h.map(String), misere:nm.misere, opp:nm.opp, diff:nm.diff, mode:nm.mode, humanIs:nm.humanIs, player:nm.player, moves:nm.moves.map(m=>({pile:m.pile,take:String(m.take),leave:String(m.leave)})), snaps:nm.snaps.map(x=>x.map(String)), assisted:nm.assisted }); }
const nimHumanTurn=()=>nm.opp==='2p'||nm.player===nm.humanIs;
function nimViewH(){ return nm.view>=0?nm.snaps[nm.view]:nm.h; }
function nimRender(){ const h=nimViewH(); const board=$('nBoard'); if(!nm.layout) nm.layout=nimLayout(nm.start,false); board.className='nboard'+(nm.misere?' misere':'')+(nm.layout.pan?' pan':''); board.style.cssText=`--tw:${nm.layout.tw}px;--th:${nm.layout.th}px;--tg:${nm.layout.tg}px;--pg:${nm.layout.pg}px`; board.innerHTML=renderPiles(h,nm.misere,null,nm.hover,false,nm.layout); const nf=$('nFind'); if(nf) nf.style.display=nm.layout.pan?'flex':'none';
  const interactive = !nm.over && nm.view<0 && nimHumanTurn() && !nm.busy;
  board.querySelectorAll('.tok.column').forEach(t=>{ if(!interactive) return; t.addEventListener('click',()=>nimAmountEntry(+t.dataset.pile)); });
  board.querySelectorAll('.tok:not(.column)').forEach(t=>{ const i=+t.dataset.pile, j=+t.dataset.j; const take=h[i]-BigInt(j); if(!interactive) return; t.addEventListener('mouseenter',()=>{ nm.hover={pile:i,take}; nimRenderLight(); }); t.addEventListener('mouseleave',()=>{ nm.hover=null; nimRenderLight(); }); t.addEventListener('click',()=>nimAnimateThenMove({pile:i,take,leave:h[i]-take})); });
  board.querySelectorAll('.pile').forEach(p=>{ const i=+p.dataset.pile; if(!interactive||h[i]===0n) return; p.querySelector('.pcount').onclick=()=>nimAmountEntry(i); });
  const ub=$('nUndo'); ub.disabled = nm.snaps.length<=1 || nm.view>=0;
  nimStatus(); nimHist(); }
function nimAmountEntry(i){ if(nm.busy) return; const pile=$('nBoard').querySelector(`.pile[data-pile="${i}"]`); if(!pile||pile.querySelector('.amt')) return; const x=nm.h[i]; const d=document.createElement('div'); d.className='amt'; d.innerHTML=`<input type="text" inputmode="numeric" placeholder="take (≤ ${x})" aria-label="amount to take from pile ${i+1}"><button class="btn" style="padding:4px 8px;font-size:10px">all</button>`; pile.appendChild(d); const inp=d.querySelector('input'); inp.focus(); inp.addEventListener('keydown',e=>{ if(e.key==='Enter'){ const v=inp.value.trim(); if(/^\d+$/.test(v)){ let t=BigInt(v); if(t>=1n&&t<=x) nimAnimateThenMove({pile:i,take:t,leave:x-t}); else $('nHoverHint').textContent=`take between 1 and ${x}`; } } if(e.key==='Escape') d.remove(); }); inp.addEventListener('blur',()=>setTimeout(()=>{ if(d.isConnected&&document.activeElement!==inp) d.remove(); },150)); d.querySelector('button').onclick=()=>nimAnimateThenMove({pile:i,take:x,leave:0n}); }
function nimAnimateThenMove(m){ if(nm.over||nm.view>=0||nm.busy) return; if(nm.online&&nm.online.hook){ nm.online.hook.proposeMove(m); return; } const board=$('nBoard'); const h=nm.h; const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches; if(!reduce){ board.querySelectorAll(`.tok[data-pile="${m.pile}"]:not(.column)`).forEach(t=>{ const j=BigInt(t.dataset.j); if(h[m.pile]-j<=m.take) t.classList.add('leave'); }); } setTimeout(()=>nimMove(m), reduce?0:150); }
function nimRenderLight(){ const board=$('nBoard'); const h=nimViewH(); board.querySelectorAll('.tok').forEach(t=>{ const i=+t.dataset.pile,j=+t.dataset.j; const on = nm.hover&&nm.hover.pile===i&&h[i]-BigInt(j)<=nm.hover.take; t.classList.toggle('pv',!!on); }); const hv=$('nHoverHint'); hv.textContent = nm.hover ? `take ${nm.hover.take} → leave ${h[nm.hover.pile]-nm.hover.take}` : ''; }
function nimStatus(){ const st=$('nStatus'); if(nm.view>=0){ st.innerHTML=`replay — move ${nm.view} of ${nm.snaps.length-1}`; return; }
  if(nm.preview){ st.innerHTML=`<span class="cond">${nm.misere?'LAST TOKEN LOSES':'LAST TOKEN WINS'}</span><span class="who">Press Start game to begin</span>`; return; }
  const oppName=()=>(nm.online&&nm.online.opponentNickname)||'your friend';
  if(nm.over){ st.innerHTML=`Game over — ${nm.winner===3?'draw':(nm.opp==='2p'?`player ${nm.winner}`:nm.opp==='online'?(nm.winner===nm.humanIs?'you':oppName()):(nm.winner===nm.humanIs?'you':'computer'))} ${nm.winner===3?'':'win'}${nm.winner!==3&&nm.opp==='2p'?'s':''}.`; return; }
  const ones=nm.h.filter(x=>x===1n).length, nonempty=nm.h.filter(x=>x>0n).length; const endgame = nonempty>0 && ones===nonempty ? ` <span style="color:var(--g5)">· ${nonempty} single-token pile${nonempty===1?'':'s'} remain</span>` : '';
  const who = nm.opp==='2p' ? `${window.ZFName?ZFName(nm.player):'Player '+(nm.player)} to move` : nm.opp==='online' ? (nm.player===nm.humanIs?'Your turn':`${oppName()}’s turn`) : (nm.player===nm.humanIs?'Your turn':`Computer is thinking…`);
  st.innerHTML=`<span class="cond">${nm.misere?'LAST TOKEN LOSES':'LAST TOKEN WINS'}</span><span class="who">${who}</span>${endgame}${(nm.opp==='ai'&&nm.player!==nm.humanIs)?'<span class="think">searching</span>':''}${nm.note?`<div style="font-size:11px;color:var(--g5)">${nm.note}</div>`:''}`; }
function nimHist(){ const el=$('nHist'); const oppName=(nm.online&&nm.online.opponentNickname)||'friend'; el.innerHTML = nm.moves.map((m,i)=>`<span class="${(nm.view>=0?nm.view===i+1:i===nm.moves.length-1)?'cur':''}" data-i="${i+1}">${i+1}. ${nm.opp==='2p'?'P'+(i%2+1):nm.opp==='online'?((i%2+1)===nm.humanIs?'you':oppName):((i%2+1)===nm.humanIs?'you':'cpu')}: pile #${m.pile+1} take ${m.take} → ${m.leave}</span>`).join('<br>')||'<span style="color:var(--g4)">no moves yet</span>'; el.querySelectorAll('span[data-i]').forEach(s=>s.onclick=()=>{ const i=+s.dataset.i; nm.view = i===nm.snaps.length-1?-1:i; nm.sel=null; nimRender(); }); }
function nimMove(m){ if(nm.over||nm.view>=0) return; if(m.take<1n||m.take>nm.h[m.pile]) return;
  // a word on the move (practice against the computer only): when the exact theory shows this move gave up a forced win, say which move kept it
  let note=null;
  if(nm.opp==='ai'&&nm.mode==='practice'&&nm.player===nm.humanIs&&window.ZFCoach){ const w=NIM.winningMoves(nm.h,nm.misere), hit=w.some(x=>x.pile===m.pile&&x.take===m.take), k=w[0];
    const total=Number(nm.h.reduce((a,x)=>a+x,0n)>1000n?1000n:nm.h.reduce((a,x)=>a+x,0n));
    note=ZFCoach.exact({before:w.length?1:-1,after:w.length?(hit?1:-1):-1,good:w.length,total,best:k?`Taking <b>${k.take}</b> from <b>pile ${k.pile+1}</b>`:''}); }
  if(note) setTimeout(()=>ZFCoach.report(note),0); if(window.ZS) ZS.play('ticks',Number(m.take>6n?6n:m.take)); nm.h=NIM.apply(nm.h,m); nm.moves.push(m); nm.snaps.push(nm.h.slice()); nm.sel=null; nm.hover=null; nm.hint=null; const lastTaker=nm.player; nm.player=3-nm.player;
  if(NIM.terminal(nm.h)){ nm.over=true; nm.winner = nm.misere ? 3-lastTaker : lastTaker; nimFinish(); }
  nimPersist(); nimRender(); if(!nm.over) nimMaybeAI(); }
function nimFinish(){ if(window.ZS) ZS.play(nm.opp==='2p'?'roundend':nm.winner===nm.humanIs?'win':'lose'); const r=$('nResult'); const isWin=nm.opp==='2p'||nm.winner===nm.humanIs; const txt = nm.opp==='2p'?`${window.ZFName?ZFName(nm.winner):'Player '+(nm.winner)} wins.`:(nm.winner===nm.humanIs?'You win.':'Computer wins.'); const last = nm.opp==='2p'?`${window.ZFName?ZFName(3-nm.winner):'Player '+(3-nm.winner)}`:(nm.winner===nm.humanIs?'The computer':'You'); const whyTxt = nm.misere ? `${last} took the last token — and in misère, that loses.` : `${nm.opp==='2p'?`${window.ZFName?ZFName(nm.winner):'Player '+(nm.winner)}`:(nm.winner===nm.humanIs?'You':'The computer')} took the last token.`; const key=`nim-${nm.misere?'m':'n'}-${nm.diff}`; if(nm.opp==='ai'&&nm.mode==='challenge'&&!nm.assisted){ record[key]=record[key]||{w:0,l:0}; record[key][nm.winner===nm.humanIs?'w':'l']++; saveRecord(); } const rec=record[key]; const note=isWin?'':(nm.mode==='challenge'?'challenge, no assistance':(nm.assisted?'undo or hints were used. Try again anytime.':'practice — try again anytime.')); r.innerHTML=`<b>${txt}</b><div>${whyTxt}</div>${note?`<div style="color:var(--g5);font-size:12px;margin-top:6px">${note}</div>`:''}${rec?`<div class="record">challenge record: ${rec.w}W ${rec.l}L</div>`:''}`; r.classList.add('show'); }
/* the computer's Nim move, shown so it can be followed: a short pause, the pile and the exact tokens it will take are outlined, then those tokens lift away, then the player gets control back.
   The calculation itself is instant; only the presentation is slow. Nothing else on the board moves, and the sequence is cancelled by restart, undo, settings or leaving the game. */
let nimSeq=null;
function nimSeqCancel(){ if(nimSeq){ nimSeq.timers.forEach(clearTimeout); nimSeq=null; } if(typeof nm!=='undefined'&&nm&&nm.busy){ nm.busy=false; const b=$('nBoard'); if(b) b.querySelectorAll('.cpu,.cpuleave').forEach(e=>e.classList.remove('cpu','cpuleave')); } }
window.__nimCancel=nimSeqCancel; window.__nimState=()=>nm;
async function nimMaybeAI(){ if(nm.over||nm.opp!=='ai'||nm.player===nm.humanIs||nimSeq) return; nimStatus();
  const seq=nimSeq={timers:[]}; nm.busy=true; nimRender(); const t0=performance.now(); const pauseMs=500+Math.random()*200, holdMs=350+Math.random()*100, leaveMs=200;
  const m=await askAI('nim',{h:nm.h.map(String),misere:nm.misere},nm.diff);
  if(nimSeq!==seq) return;                                                       // cancelled while thinking
  if(!nm||nm.over||nm.player===nm.humanIs||!m){ nimSeq=null; nm.busy=false; nimRender(); return; }
  const at=(ms,fn)=>seq.timers.push(setTimeout(()=>{ if(nimSeq===seq) fn(); },ms));
  const take=BigInt(m.take), pile=m.pile, x=nm.h[pile], board=$('nBoard'), reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mark=cls=>{ const pe=board.querySelector(`.pile[data-pile="${pile}"]`); if(!pe) return; if(cls==='cpu') pe.classList.add('cpu'); pe.querySelectorAll('.tok').forEach(t=>{ if(t.classList.contains('column')){ const shown=pe.querySelectorAll('.tok:not(.column)').length; if(take>BigInt(shown)) t.classList.add(cls); } else if(x-BigInt(t.dataset.j)<=take) t.classList.add(cls); }); };
  at(Math.max(0,pauseMs-(performance.now()-t0)),()=>{ mark('cpu'); $('nHoverHint').textContent=`computer takes ${m.take} from pile #${m.pile+1}`; });
  at(Math.max(0,pauseMs-(performance.now()-t0))+holdMs,()=>{ if(!reduce) mark('cpuleave'); });
  at(Math.max(0,pauseMs-(performance.now()-t0))+holdMs+(reduce?0:leaveMs),()=>{ nimSeq=null; nm.busy=false; nm.lastCpu=m.pile; nimMove({pile:m.pile,take,leave:BigInt(m.leave)}); const pe=$('nBoard').querySelector(`.pile[data-pile="${m.pile}"]`); if(pe){ pe.classList.add('changed'); setTimeout(()=>pe.classList.remove('changed'),950); } $('nHoverHint').textContent=`computer took ${m.take} from pile #${m.pile+1}`; }); }
$('nUndo').onclick=()=>{ if(nm.online&&nm.online.hook){ nm.online.hook.requestUndo(); return; } if(nm.view>=0||nm.snaps.length<=1) return; if(window.ZS) ZS.play('undo'); cancelAI(); let n = nm.opp==='ai' ? (nm.player===nm.humanIs?2:1) : 1; if(nm.opp==='ai'&&nm.over&&nm.winner!==nm.humanIs) n = nm.moves.length%2===0?2:1; while(n-- && nm.snaps.length>1){ nm.snaps.pop(); nm.moves.pop(); } nm.h=nm.snaps[nm.snaps.length-1].slice(); nm.player = 1+((nm.moves.length)%2); nm.over=false; nm.winner=0; nm.assisted=true; nm.sel=null; nm.hover=null; $('nResult').classList.remove('show'); nimPersist(); nimRender(); if(nm.opp==='ai'&&nm.player!==nm.humanIs) nimMaybeAI(); };
$('nHint').onclick=()=>{ if(nm.online){ $('nHoverHint').textContent="Hints aren't available when playing a friend."; return; } if(nm.over||!nimHumanTurn()||nm.busy) return; if(window.ZS) ZS.play('ping'); nm.assisted=true; const w=NIM.winningMoves(nm.h,nm.misere); const say=(html,plain)=>{ const c=window.ZF&&ZF.coach&&ZF.coach(html); $('nHoverHint').textContent=c?'':plain; };
  if(!w.length){ say('<b>No move forces a win here.</b><br>Your opponent can win with perfect play.<!--more-->Every option was checked: whatever you take, they have an answer. If they slip, a win may open up again.','No move forces a win here. Your opponent can win with perfect play.'); return; }
  const m=w[Math.floor(Math.random()*w.length)]; nm.hover={pile:m.pile,take:m.take}; nimRenderLight();
  say(`<b>Take ${m.take} from pile ${m.pile+1}.</b><br>With perfect play from here, you win.<!--more-->It leaves your opponent no winning reply: whatever they take, you can answer.${w.length>1?` This is one of ${w.length} winning moves.`:''}`,`hint: pile #${m.pile+1}, take ${m.take}${w.length>1?` (one of ${w.length} winning moves)`:''}`); };
$('nRestart').onclick=()=>{ if(nm.online&&nm.online.hook){ nm.online.hook.requestRestart(); return; } nimP.piles=nm.start.map(String); nimStart(false); };
$('nRematch').onclick=()=>{ if(nm.online&&nm.online.hook){ nm.online.hook.requestRematch(); return; } nimP.piles=nm.start.map(String); nimStart(true); };
$('nBack').onclick=()=>{ nimPersist(); toLobby(); };
$('nStart').onclick=()=>nimStart(false);
let nimResizeT=null; addEventListener('resize',()=>{ if(!nm||!nimGame.classList.contains('show')) return; clearTimeout(nimResizeT); nimResizeT=setTimeout(()=>{ nm.layout=nimLayout(nm.start,false); nimRender(); },120); });
$('nFindGo').onclick=()=>{ const v=parseInt($('nFindIn').value); const el=document.getElementById('npile-'+(v-1)); if(el){ el.scrollIntoView({behavior:'smooth',block:'nearest',inline:'center'}); el.classList.add('changed'); setTimeout(()=>el.classList.remove('changed'),950); } };
$('nFindIn').addEventListener('keydown',e=>{ if(e.key==='Enter') $('nFindGo').click(); });
$('nRulesBtn').onclick=()=>{ const rp=$('nRulesPanel'); rp.open=!rp.open; if(rp.open) rp.scrollIntoView({behavior:'smooth',block:'nearest'}); }; $('nSettings').onclick=()=>{ cancelAI(); nimP.piles=nm.start.map(String); nimOpenSetup(); };
$('nPrev').onclick=()=>{ if(nm.snaps.length<2) return; if(nm.view===-1) nm.view=nm.snaps.length-1; if(nm.view>0) nm.view--; nm.sel=null; nimRender(); }; $('nNext').onclick=()=>{ if(nm.view===-1) return; nm.view++; if(nm.view>=nm.snaps.length-1) nm.view=-1; nimRender(); };

/* ================= CHOMP ================= */
const chP=Object.assign({ opp:'ai', diff:'medium', first:'human', mode:'practice', tab:'rect', R:3, C:8, shape:null, seed:'', bites:3 }, prefs.chomp||{});
if(prefs.chomp&&prefs.chomp.R===4&&prefs.chomp.C===6&&prefs.chomp.tab==='rect'){ chP.R=3; chP.C=8; }   // the old 4x6 default becomes the new wide 3 x 8
function chSavePrefs(){ prefs.chomp=chP; savePrefs(); }
let cm=null; let wsShape=null; // workshop shape (row lengths)
function chCurShape(){ if(chP.tab==='rect') return CHOMP.rect(chP.R,chP.C); return (wsShape&&wsShape.length===chP.R)?wsShape.slice():CHOMP.rect(chP.R,chP.C); }
function chOpenSetup(){ hideAll(); chSetup.classList.add('show'); chRenderSetup(); demoCh=ZFEntry.mount('chomp',$('cDemo'),{get:()=>({len:chCurShape(),C:chP.C,commit:chP.tab==='shape'}),commit:(r,c)=>{ wsHist.push(wsShape.slice()); wsShape=CHOMP.bite(wsShape,chP.C,r,c); chRenderSetup(); }}); (window.gameScrollTo||(el=>el.scrollIntoView({behavior:'smooth',block:'start'})))(chSetup); }
function chRenderSetup(){ segs($('cOpp'),chP.opp,v=>{chP.opp=v;chRenderSetup();}); segs($('cDiff'),chP.diff,v=>{chP.diff=v;chPreview();}); segs($('cFirst'),chP.first,v=>chP.first=v); swBind($('cMode'),chP.mode,v=>chP.mode=v);
  const ai=chP.opp==='ai'; $('cRowDiff').style.display=ai?'flex':'none'; $('cRowFirst').style.display=ai?'flex':'none';
  segs($('cTabs'),chP.tab,v=>{chP.tab=v; if(v!=='rect'&&(!wsShape||wsShape.length!==chP.R)) wsShape=CHOMP.rect(chP.R,chP.C); chRenderSetup();});
  $('cRect').style.display=chP.tab==='rect'?'block':'none'; $('cWork').style.display=chP.tab==='shape'?'block':'none'; $('cRand').style.display=chP.tab==='random'?'block':'none';
  document.querySelectorAll('#cPresets .rp').forEach(b=>b.classList.toggle('on',+b.dataset.r===chP.R&&+b.dataset.c===chP.C));
  $('cRows').value=chP.R; $('cCols').value=chP.C; $('cSeed').value=chP.seed; $('cBites').value=chP.bites;
  if(chP.tab==='shape') $('cRowLens').value=(wsShape||CHOMP.rect(chP.R,chP.C)).join(', ');
  chPreview(); }
function chDims(){ chP.R=Math.max(1,Math.min(20,parseInt($('cRows').value)||1)); chP.C=Math.max(1,Math.min(20,parseInt($('cCols').value)||1)); wsShape=CHOMP.rect(chP.R,chP.C); }
$('cRows').onchange=()=>{ chDims(); chRenderSetup(); }; $('cCols').onchange=()=>{ chDims(); chRenderSetup(); };
document.querySelectorAll('#cPresets .rp').forEach(b=>b.onclick=()=>{ chP.R=+b.dataset.r; chP.C=+b.dataset.c; wsShape=CHOMP.rect(chP.R,chP.C); chRenderSetup(); });
$('cWsReset').onclick=()=>{ wsShape=CHOMP.rect(chP.R,chP.C); chRenderSetup(); };
$('cWsUndo').onclick=()=>{ if(wsHist.length){ wsShape=wsHist.pop(); chRenderSetup(); } };
let wsHist=[];
$('cRowLens').onchange=e=>{ try{ const len=e.target.value.split(/[\s,]+/).filter(Boolean).map(Number); if(len.length!==chP.R||len.some(isNaN)||!CHOMP.valid(len,chP.C)) throw 0; wsHist.push(wsShape); wsShape=len; $('cMsg').textContent=''; }catch(x){ $('cMsg').textContent=`Need ${chP.R} lengths, each ≤ ${chP.C}, nonincreasing top to bottom, top row ≥ 1.`; } chRenderSetup(); };
$('cGen').onclick=()=>{ chP.seed=$('cSeed').value.trim(); chP.bites=Math.max(0,parseInt($('cBites').value)||0); const target=parseInt($('cTarget').value); const seed=chP.seed?(parseInt(chP.seed)||[...chP.seed].reduce((a,ch)=>a*31+ch.charCodeAt(0),7)):Math.floor(Math.random()*1e9); $('cSeedUsed').textContent=chP.seed?'':'seed used: '+seed; const rnd=mulberry(seed); let best=null;
  for(let attempt=0;attempt<200;attempt++){ let len=CHOMP.rect(chP.R,chP.C); for(let b=0;b<chP.bites;b++){ const mv=CHOMP.moves(len,chP.C); if(!mv.length) break; const [r,c]=mv[Math.floor(rnd()*mv.length)]; len=CHOMP.bite(len,chP.C,r,c); } if(!target||isNaN(target)){ best=len; break; } if(CHOMP.count(len)===target){ best=len; break; } if(!best||Math.abs(CHOMP.count(len)-target)<Math.abs(CHOMP.count(best)-target)) best=len; }
  wsShape=best; $('cMsg').textContent = (target&&!isNaN(target)&&CHOMP.count(best)!==target) ? `Closest found: ${CHOMP.count(best)} tiles (target ${target} not hit in 200 tries). Sampling is by random bites, not uniform over shapes.` : 'Sampled by random bites — not uniform over legal shapes.'; chPreview(); };
function chPreview(){ const len=chCurShape(); const C=chP.C; $('cDims').textContent=`${chP.R} rows × ${C} columns · ${CHOMP.count(len)} tiles`; if(demoCh) demoCh.refresh(); $('cDiffNote').textContent = CHOMP.exactCovered(chP.R,C) ? 'Perfect uses the exact solver — this board is covered.' : 'Perfect is unavailable for this size; the strongest opponent is Expert (bounded search, no guarantee).'; $('cDiff').querySelector('[data-v="perfect"]').disabled=!CHOMP.exactCovered(chP.R,C); if(!CHOMP.exactCovered(chP.R,C)&&chP.diff==='perfect'){ chP.diff='expert'; segs($('cDiff'),chP.diff,v=>{chP.diff=v;chPreview();}); }
}
function renderChomp(len,C,sel,hover,mini){ const R=len.length; let html=`<div class="cgrid ${mini?'mini':''}" style="grid-template-columns:repeat(${C},1fr)">`; for(let r=0;r<R;r++) for(let c=0;c<C;c++){ const present=CHOMP.has(len,C,r,c); const poison=CHOMP.isPoison(C,r,c); const inHover = hover && present && r>=hover[0] && c<=hover[1]; const inSel = sel && present && r>=sel[0] && c<=sel[1]; html+=`<button class="tile ${present?'':'gone'} ${poison?'poison':''} ${inHover?'pv':''} ${inSel?'sel':''}" data-r="${r}" data-c="${c}" ${present?'':'disabled'} aria-label="row ${r+1} column ${c+1}${poison?' poison':''}">${poison?ZF_POISON:''}</button>`; } return html+'</div>'; }
function chEnterFresh(){
  cancelAI(); chOpenSetup();
}
function chStart(swap){ cancelAI(); let humanIs=1; if(chP.opp==='ai'){ if(chP.first==='ai') humanIs=2; else if(chP.first==='random') humanIs=Math.random()<.5?1:2; } if(swap&&cm) humanIs=3-cm.humanIs;
  const len=chCurShape(); cm={ start:len.slice(), len:len.slice(), C:chP.C, R:chP.R, opp:chP.opp, diff:chP.diff, mode:chP.mode, humanIs, player:1, over:false, winner:0, moves:[], snaps:[len.slice()], view:-1, sel:null, hover:null, assisted:false, hint:null };
  chSavePrefs(); hideAll(); chGame.classList.add('show'); window.ZFShell && ZFShell.hideStartOverlay('chGame'); $('cUndo').style.display=''; $('cRestart').style.display='';
  $('cGameMode').textContent=chP.opp==='2p'?'two players':`${chP.diff}${chP.diff==='expert'?' (not yet proven)':''} · ${chP.mode}`; $('cRules').textContent='Select a tile: it and every remaining tile at or below it and at or to its left are removed. The poisoned tile is the upper-right corner — whoever takes it loses immediately. No draws.'; $('cHint').style.display=(chP.mode==='practice'&&chP.opp==='ai')?'':'none'; $('cResult').classList.remove('show'); (window.gameScrollTo||(el=>el.scrollIntoView({behavior:'smooth',block:'start'})))(chGame); chRender(); chMaybeAI(); }
function chResume(){ const s=saved.chomp; cm={ start:s.start, len:s.len, C:s.C, R:s.R, opp:s.opp, diff:s.diff, mode:s.mode, humanIs:s.humanIs, player:s.player, over:false, winner:0, moves:s.moves, snaps:s.snaps, view:-1, sel:null, hover:null, assisted:s.assisted, hint:null }; chP.C=s.C; chP.R=s.R; hideAll(); chGame.classList.add('show'); $('cGameMode').textContent=cm.opp==='2p'?'two players':`${cm.diff} · ${cm.mode}`; $('cHint').style.display=(cm.mode==='practice'&&cm.opp==='ai')?'':'none'; $('cResult').classList.remove('show'); chRender(); chMaybeAI(); }
function chPersist(){ if(!cm||cm.over){ saveGame('chomp',null); return; } saveGame('chomp',{ start:cm.start, len:cm.len, C:cm.C, R:cm.R, opp:cm.opp, diff:cm.diff, mode:cm.mode, humanIs:cm.humanIs, player:cm.player, moves:cm.moves, snaps:cm.snaps, assisted:cm.assisted }); }
const chHumanTurn=()=>cm.opp==='2p'||cm.player===cm.humanIs;
function chViewLen(){ return cm.view>=0?cm.snaps[cm.view]:cm.len; }
function chRender(){ const len=chViewLen(); const C=cm.C; const b=$('cBoard'); const keepL=b.scrollLeft, keepT=b.scrollTop; b.innerHTML=renderChomp(len,C,cm.sel,cm.hover,false); chFit(); if(cm.pinned){ b.scrollTo({left:keepL,top:keepT,behavior:'instant'}); } const interactive=!cm.over&&cm.view<0&&!cm.preview&&chHumanTurn();
  b.querySelectorAll('.tile:not(.gone)').forEach(t=>{ const r=+t.dataset.r,c=+t.dataset.c; if(!interactive){ t.disabled=true; return; } t.addEventListener('mouseenter',()=>{ if(cm.sel) return; cm.hover=[r,c]; chLight(); }); t.addEventListener('mouseleave',()=>{ cm.hover=null; chLight(); }); t.addEventListener('focus',()=>{ if(cm.sel) return; cm.hover=[r,c]; chLight(); }); t.addEventListener('click',()=>{ cm.hover=null; /* one tap, one move; only the poisoned tile still asks first, because taking it ends the game */ if(CHOMP.isPoison(C,r,c)&&!CHOMP.onlyPoison(len)){ cm.sel=[r,c]; chRender(); } else { cm.sel=null; chMove(r,c); } }); });
  gridNav(b,C);
  const sp=$('cSelPanel'); if(cm.sel&&interactive){ const [r,c]=cm.sel; const n=CHOMP.removed(len,C,r,c).length; const poison=CHOMP.isPoison(C,r,c); sp.classList.add('show'); sp.innerHTML=`<div class="selsum">${poison?'Take the poison — you lose immediately.':`Bite ${n} tile${n===1?'':'s'} → ${CHOMP.count(len)-n} remain`}</div><div class="selrow"><button class="${poison?'':'primary'}" id="cConfirm">${poison?'take poison':'confirm'}</button><button id="cCancel">cancel</button></div>`; $('cConfirm').onclick=()=>chMove(r,c); $('cCancel').onclick=()=>{ cm.sel=null; chRender(); }; }
  else { sp.classList.remove('show'); sp.innerHTML=''; }
  if(interactive&&CHOMP.onlyPoison(len)){ sp.classList.add('show'); sp.innerHTML=`<div class="selsum">Only the poison remains — ${cm.opp==='2p'?`player ${cm.player}`:'you'} must take it.</div><div class="selrow"><button id="cResolve">resolve</button></div>`; $('cResolve').onclick=()=>chMove(0,C-1); }
  const ub=$('cUndo'); ub.disabled=cm.snaps.length<=1||cm.view>=0; chStatus(); chHist(); }
function chLight(){ const len=chViewLen(); $('cBoard').querySelectorAll('.tile').forEach(t=>{ const r=+t.dataset.r,c=+t.dataset.c; t.classList.toggle('pv', !!(cm.hover&&!t.classList.contains('gone')&&r>=cm.hover[0]&&c<=cm.hover[1])); }); $('cHoverHint').textContent = cm.hover ? (CHOMP.isPoison(cm.C,...cm.hover)?'poison — taking it loses':`bite ${CHOMP.removed(len,cm.C,...cm.hover).length} tiles`) : ''; }
/* size the board from both the width and the height that are actually free; only when tiles would get too small to click does it scroll inside a bounded area */
function chFit(){ const wrap=$('cBoard'), grid=wrap.querySelector('.cgrid'); if(!grid) return; const R=cm.R, C=cm.C;
  const W=Math.max(240,Math.min(wrap.parentElement.clientWidth||innerWidth*.9,1100)-16), H=Math.max(220,innerHeight-440);   // 440 ≈ header + top bar + status + selection panel + toolbar
  const MIN=38, MAX=104, gp=t=>Math.max(3,Math.min(8,Math.round(t*.06)));
  let t=MAX; for(let k=0;k<3;k++){ const g=gp(t); t=Math.min(MAX,Math.floor((W-(C+1)*g)/C),Math.floor((H-(R+1)*g)/R)); }
  const scroll=t<MIN; if(scroll) t=MIN; const g=gp(t);
  grid.classList.add('play'); grid.style.cssText=`--C:${C};--ts:${t}px;--g:${g}px`;
  wrap.classList.toggle('scroll',scroll);
  if(scroll){ wrap.style.maxWidth=W+'px'; wrap.style.maxHeight=H+'px'; if(!cm.pinned){ const mine=cm, pin=(n)=>{ if(cm!==mine||mine.pinned) return; if(wrap.scrollWidth>wrap.clientWidth+1){ wrap.scrollTo({left:wrap.scrollWidth,top:0,behavior:'instant'}); mine.pinned=true; if(!wrap.dataset.watch){ wrap.dataset.watch='1'; ['pointerdown','wheel','touchstart'].forEach(ev=>wrap.addEventListener(ev,()=>{ if(cm) cm.touched=true; },{passive:true})); } [300,900,1800].forEach(ms=>setTimeout(()=>{ if(cm===mine&&!mine.touched&&wrap.scrollLeft<4&&wrap.scrollWidth>wrap.clientWidth+1) wrap.scrollTo({left:wrap.scrollWidth,top:0,behavior:'instant'}); },ms)); } else if(n<12) setTimeout(()=>pin(n+1),80); }; pin(0); } } else { wrap.style.maxWidth=''; wrap.style.maxHeight=''; } }
addEventListener('resize',()=>{ if(typeof cm!=='undefined'&&cm&&$('chGame').classList.contains('show')) chFit(); });
function gridNav(b,C){ b.onkeydown=e=>{ const t=document.activeElement; if(!t.classList||!t.classList.contains('tile')) return; let r=+t.dataset.r,c=+t.dataset.c; const R=cm.R; if(e.key==='ArrowLeft')c=(c+C-1)%C; else if(e.key==='ArrowRight')c=(c+1)%C; else if(e.key==='ArrowUp')r=(r+R-1)%R; else if(e.key==='ArrowDown')r=(r+1)%R; else return; e.preventDefault(); const n=b.querySelector(`.tile[data-r="${r}"][data-c="${c}"]`); if(n&&!n.disabled) n.focus(); }; }
function chStatus(){ const st=$('cStatus'); if(cm.view>=0){ st.innerHTML=`replay — move ${cm.view} of ${cm.snaps.length-1}`; return; } if(cm.preview){ st.innerHTML=`<span class="who">Press Start game to begin</span><span class="cond"><span class="pz">${ZF_POISON}</span> TAKING THE CORNER LOSES</span>`; return; } if(cm.over){ st.innerHTML=`Game over — ${cm.opp==='2p'?`player ${cm.winner} wins`:(cm.winner===cm.humanIs?'you win':'computer wins')}.`; return; } const who=cm.opp==='2p'?`${window.ZFName?ZFName(cm.player):'Player '+(cm.player)} to move`:(cm.player===cm.humanIs?'Your turn':`Computer is thinking…`); st.innerHTML=`<span class="who">${who}</span><span class="cond"><span class="pz">${ZF_POISON}</span> TAKING THE CORNER LOSES</span>${(cm.opp==='ai'&&cm.player!==cm.humanIs)?'<span class="think">searching</span>':''}`; }
function chHist(){ const el=$('cHist'); el.innerHTML=cm.moves.map((m,i)=>`<span class="${(cm.view>=0?cm.view===i+1:i===cm.moves.length-1)?'cur':''}" data-i="${i+1}">${i+1}. ${cm.opp==='2p'?'P'+(i%2+1):((i%2+1)===cm.humanIs?'you':'cpu')}: (${m[0]+1},${m[1]+1})${m[2]?` −${m[2]}`:''}</span>`).join('<br>')||'<span style="color:var(--g4)">no moves yet</span>'; el.querySelectorAll('span[data-i]').forEach(s=>s.onclick=()=>{ const i=+s.dataset.i; cm.view=i===cm.snaps.length-1?-1:i; cm.sel=null; chRender(); }); }
function chMove(r,c){ if(cm.over||cm.view>=0) return; const len=cm.len; if(!CHOMP.has(len,cm.C,r,c)) return; const n=CHOMP.removed(len,cm.C,r,c).length; const mover=cm.player;
  if(cm.opp==='ai'&&cm.mode==='practice'&&mover===cm.humanIs&&window.ZFCoach&&CHOMP.exactCovered(cm.R,cm.C)&&!CHOMP.isPoison(cm.C,r,c)){ const w=CHOMP.makeSolver(cm.C).winningMoves(len), hit=w.some(x=>x[0]===r&&x[1]===c), k=w[0];
    const total=Math.max(0,CHOMP.count?CHOMP.count(len)-1:0);
    const note=ZFCoach.exact({before:w.length?1:-1,after:w.length?(hit?1:-1):-1,good:w.length,total,best:k?`<b>Row ${k[0]+1}, column ${k[1]+1}</b>`:''}); if(note) setTimeout(()=>ZFCoach.report(note),0); }
  // brief separation animation on the removed region
  const b=$('cBoard'); b.querySelectorAll('.tile').forEach(t=>{ const tr=+t.dataset.r,tc=+t.dataset.c; if(!t.classList.contains('gone')&&tr>=r&&tc<=c) t.classList.add('bitten'); });
  if(window.ZS) ZS.play('chomp'); cm.len=CHOMP.bite(len,cm.C,r,c); cm.moves.push([r,c,n]); cm.snaps.push(cm.len.slice()); cm.sel=null; cm.hover=null; cm.hint=null; cm.player=3-mover;
  if(CHOMP.isPoison(cm.C,r,c)){ cm.over=true; cm.winner=3-mover; chFinish(); }
  chPersist(); setTimeout(()=>{ chRender(); if(!cm.over) chMaybeAI(); }, matchMedia('(prefers-reduced-motion: reduce)').matches?0:180); }
function chFinish(){ if(window.ZS) ZS.play(cm.opp==='2p'?'roundend':cm.winner===cm.humanIs?'win':'lose'); const r=$('cResult'); const isWin=cm.opp==='2p'||cm.winner===cm.humanIs; const txt=cm.opp==='2p'?`${window.ZFName?ZFName(cm.winner):'Player '+(cm.winner)} wins.`:(cm.winner===cm.humanIs?'You win.':'Computer wins.'); const key=`chomp-${cm.R}x${cm.C}-${cm.diff}`; if(cm.opp==='ai'&&cm.mode==='challenge'&&!cm.assisted){ record[key]=record[key]||{w:0,l:0}; record[key][cm.winner===cm.humanIs?'w':'l']++; saveRecord(); } const rec=record[key]; const note=isWin?'':(cm.mode==='challenge'?'challenge, no assistance':(cm.assisted?'assistance was used. Try again anytime.':'practice — try again anytime.')); r.innerHTML=`<b>${txt}</b>${note?`<div>${note}</div>`:''}${rec?`<div class="record">challenge record: ${rec.w}W ${rec.l}L</div>`:''}`; r.classList.add('show'); }
async function chMaybeAI(){ if(cm.over||cm.opp!=='ai'||cm.player===cm.humanIs) return; chStatus(); const m=await askAI('chomp',{len:cm.len,C:cm.C},cm.diff); if(!cm||cm.over||cm.player===cm.humanIs) return; if(m) chMove(m[0],m[1]); else if(CHOMP.onlyPoison(cm.len)) chMove(0,cm.C-1); }
$('cUndo').onclick=()=>{ if(cm.view>=0||cm.snaps.length<=1) return; if(window.ZS) ZS.play('undo'); cancelAI(); let n=cm.opp==='ai'?(cm.player===cm.humanIs?2:1):1; while(n-- && cm.snaps.length>1){ cm.snaps.pop(); cm.moves.pop(); } cm.len=cm.snaps[cm.snaps.length-1].slice(); cm.player=1+(cm.moves.length%2); cm.over=false; cm.winner=0; cm.assisted=true; cm.sel=null; $('cResult').classList.remove('show'); chPersist(); chRender(); };
$('cHint').onclick=()=>{ if(cm.over||!chHumanTurn()) return; if(window.ZS) ZS.play('ping'); cm.assisted=true; const say=(html,plain)=>{ const c=window.ZF&&ZF.coach&&ZF.coach(html); $('cHoverHint').textContent=c?'':plain; };
  if(!CHOMP.exactCovered(cm.R,cm.C)){ say('This board is too big for the exact solver, so I can’t check a hint for you. A guess dressed up as advice wouldn’t help.','This board is beyond exact coverage — no verified hint available.'); return; }
  const S=CHOMP.makeSolver(cm.C); const w=S.winningMoves(cm.len); if(!w.length){ say('<b>No bite forces a win here.</b><br>Your opponent can win with perfect play.<!--more-->The solver checked every bite: each one has an answer. If they slip, a win may open up again.','No bite forces a win here. Your opponent can win with perfect play.'); return; }
  const m=w[Math.floor(Math.random()*w.length)]; cm.sel=m; chRender();
  say(`<b>Bite row ${m[0]+1}, column ${m[1]+1}.</b><br>With perfect play from here, you win.<!--more-->The solver checked every reply: each one has an answer.${w.length>1?` This is one of ${w.length} winning bites.`:''}`,`hint: row ${m[0]+1}, column ${m[1]+1}${w.length>1?` (one of ${w.length} winning bites)`:''}`); };
$('cRestart').onclick=()=>{ wsShape=cm.start.slice(); chP.R=cm.R; chP.C=cm.C; chP.tab = cm.start.every(x=>x===cm.C)?'rect':'shape'; chStart(false); };
$('cRematch').onclick=()=>{ wsShape=cm.start.slice(); chP.R=cm.R; chP.C=cm.C; chP.tab = cm.start.every(x=>x===cm.C)?'rect':'shape'; chStart(true); };
$('cBack').onclick=()=>{ chPersist(); toLobby(); }; $('cStart').onclick=()=>chStart(false);
$('cRulesBtn').onclick=()=>{ const rp=$('cRulesPanel'); rp.open=!rp.open; }; $('cSettings').onclick=()=>{ cancelAI(); chOpenSetup(); };
$('cPrev').onclick=()=>{ if(cm.snaps.length<2) return; if(cm.view===-1) cm.view=cm.snaps.length-1; if(cm.view>0) cm.view--; cm.sel=null; chRender(); }; $('cNext').onclick=()=>{ if(cm.view===-1) return; cm.view++; if(cm.view>=cm.snaps.length-1) cm.view=-1; chRender(); };

/* ================= Customize board: Nim gets a roomy builder dialog; Chomp edits its own board in place ================= */
(function(){ const css=`
.nc-preview{display:flex;gap:10px;flex-wrap:wrap;justify-content:center;align-items:flex-end;min-height:110px;padding:14px 10px;background:var(--surf2);border-radius:14px;margin-bottom:16px}
.nc-pilecol{display:flex;flex-direction:column;align-items:center;gap:4px;font:600 12px var(--font-mono);color:var(--g6)}
.nc-bar{width:22px;border-radius:6px 6px 3px 3px;background:var(--fg)}
.nc-pilecol b{color:var(--fg);font-size:13px}
.nc-pilecol span{color:var(--g5);font-size:10.5px}
.nc-empty{color:var(--g5);font:500 14px var(--font-sans);margin:0;text-align:center;width:100%}
.nc-tabs{display:flex;gap:6px;margin-bottom:14px}
.nc-tabs button{flex:1;min-height:42px;border:none;border-radius:11px;background:var(--surf2);color:var(--g6);font:700 13.5px var(--font-sans);cursor:pointer}
.nc-tabs button.on{background:var(--fg);color:var(--bg)}
.nc-rows{display:flex;flex-direction:column;gap:8px}
.nc-row{display:flex;align-items:center;gap:8px}
.nc-idx{width:36px;font:600 12.5px var(--font-mono);color:var(--g5)}
.nc-step{width:38px;height:38px;border:none;border-radius:10px;background:var(--surf2);color:var(--fg);font:700 18px var(--font-sans);cursor:pointer}
.nc-step:hover{background:var(--surf3)}
.nc-count{min-width:56px;height:38px;border:none;border-radius:10px;background:transparent;color:var(--fg);font:700 15px var(--font-mono);cursor:pointer}
.nc-count:hover{background:var(--surf2)}
.nc-remove{margin-left:auto;width:36px;height:36px;border:none;border-radius:10px;background:transparent;color:var(--g5);font:600 16px var(--font-sans);cursor:pointer}
.nc-remove:hover{background:var(--surf2);color:var(--fg)}
.nc-addrow{display:flex;gap:8px;margin-top:12px}
.nc-add,.nc-rand{flex:1;min-height:42px;border:1.5px solid var(--g4);border-radius:11px;background:transparent;color:var(--fg);font:600 13.5px var(--font-sans);cursor:pointer}
.nc-add:hover,.nc-rand:hover{background:var(--surf2)}
.nc-presets{margin-top:16px;display:flex;flex-direction:column;gap:6px;max-height:180px;overflow:auto}
.nc-preset{text-align:left;min-height:42px;padding:0 12px;border:none;border-radius:10px;background:var(--surf2);color:var(--fg);font:600 13px var(--font-sans);cursor:pointer;display:flex;gap:8px;align-items:center}
.nc-preset span{color:var(--g5);font-weight:500;font-family:var(--font-mono);font-size:11.5px}
.nc-preset:hover{background:var(--surf3)}
.nc-presets-tab{margin-top:0;max-height:none}
.nc-presets-tab .nc-preset{min-height:58px;padding:10px 14px;gap:14px}
.nc-preset-prev{display:flex;align-items:flex-end;gap:2px;flex:none;width:52px;height:34px}
.nc-preset-prev i{display:block;width:5px;border-radius:2px 2px 0 0;background:var(--fg);flex:none}
.nc-preset-txt{display:flex;flex-direction:column;gap:1px;min-width:0}
.nc-preset-txt b{font-size:13.5px}
.nc-preset-txt em{font-style:normal;color:var(--g5);font-weight:500;font-size:11.5px;font-family:var(--font-sans)}
#ncListIn{width:100%;min-height:70px;font:500 14px var(--font-mono);background:var(--surf2);color:var(--fg);border:1.5px solid var(--g3);border-radius:12px;padding:10px 12px;resize:vertical}
.nc-apply{margin-top:10px;min-height:42px;padding:0 20px;border:none;border-radius:11px;background:var(--fg);color:var(--bg);font:700 13.5px var(--font-sans);cursor:pointer}
.ch-dims{display:flex;align-items:center;gap:8px;font:600 13.5px var(--font-sans);color:var(--g6)}
.ch-dims label{display:flex;align-items:center;gap:6px}
.ch-dims input{width:56px;min-height:36px;border:1.5px solid var(--g3);border-radius:9px;background:var(--surf);color:var(--fg);font:600 14px var(--font-mono);text-align:center}
.ch-dims .x{color:var(--g5)}
.ch-edithost{width:100%;display:flex;justify-content:center}
`; const s=document.createElement('style'); s.textContent=css; document.head.appendChild(s); })();

function nimCustomize(onDone){ cancelAI(); if(nm&&!onDone) nimP.piles=nm.start.map(String);
  const body=ZFShell.openCustomShell('Build your Nim board');
  const render=()=>{ body.innerHTML='';
    const prev=document.createElement('div'); prev.className='nc-preview'; body.appendChild(prev);
    const renderPreview=()=>{ const h=nimP.piles; if(!h.length){ prev.innerHTML='<p class="nc-empty">No piles yet — add one below.</p>'; return; }
      prev.innerHTML=h.map((v,i)=>{ let n=0n; try{ n=BigInt(v); }catch(e){} const hgt=Math.max(6,Math.min(96,Number(n>60n?60n:n)*4)); return `<div class="nc-pilecol"><div class="nc-bar" style="height:${hgt}px"></div><b>${v}</b><span>#${i+1}</span></div>`; }).join(''); };
    renderPreview();
    const tabs=document.createElement('div'); tabs.className='nc-tabs'; tabs.innerHTML=`<button type="button" data-v="visual">Visual</button><button type="button" data-v="list">List</button><button type="button" data-v="presets">Presets</button>`; body.appendChild(tabs);
    tabs.querySelectorAll('button').forEach(b=>{ b.classList.toggle('on',(nimP.editView||'visual')===b.dataset.v); b.onclick=()=>{ nimP.editView=b.dataset.v; render(); }; });
    const view=document.createElement('div'); body.appendChild(view);
    const editView=nimP.editView||'visual';
    if(editView==='visual'){
      const rows=document.createElement('div'); rows.className='nc-rows';
      nimP.piles.forEach((v,i)=>{ const row=document.createElement('div'); row.className='nc-row';
        row.innerHTML=`<span class="nc-idx">#${i+1}</span><button type="button" class="nc-step" data-a="dec" data-i="${i}" aria-label="Decrease pile ${i+1}">−</button><button type="button" class="nc-count" data-i="${i}" aria-label="Set pile ${i+1} exactly">${v}</button><button type="button" class="nc-step" data-a="inc" data-i="${i}" aria-label="Increase pile ${i+1}">+</button><button type="button" class="nc-remove" data-i="${i}" aria-label="Remove pile ${i+1}">×</button>`;
        rows.appendChild(row); });
      view.appendChild(rows);
      rows.querySelectorAll('.nc-step').forEach(b=>b.onclick=()=>{ const i=+b.dataset.i; let n=0n; try{ n=BigInt(nimP.piles[i]); }catch(e){} if(b.dataset.a==='inc') n+=1n; else if(n>0n) n-=1n; nimP.piles[i]=n.toString(); render(); });
      rows.querySelectorAll('.nc-count').forEach(b=>b.onclick=()=>{ const i=+b.dataset.i; const v=prompt('Set pile #'+(i+1)+' to how many tokens?',nimP.piles[i]); if(v!=null&&/^\d+$/.test(v.trim())){ nimP.piles[i]=v.trim().replace(/^0+(?=\d)/,''); render(); } });
      rows.querySelectorAll('.nc-remove').forEach(b=>b.onclick=()=>{ nimP.piles.splice(+b.dataset.i,1); render(); });
      const addRow=document.createElement('div'); addRow.className='nc-addrow'; addRow.innerHTML=`<button type="button" class="nc-add">+ Add pile</button><button type="button" class="nc-rand">Random board</button>`; view.appendChild(addRow);
      addRow.querySelector('.nc-add').onclick=()=>{ nimP.piles.push('1'); render(); };
      addRow.querySelector('.nc-rand').onclick=()=>{ nimGenerate(true); render(); };
    } else if(editView==='list'){
      view.innerHTML=`<textarea id="ncListIn" rows="3" placeholder="1, 3, 5, 7">${nimP.piles.join(', ')}</textarea><button type="button" class="nc-apply">Apply</button><p class="gs-note" id="ncListMsg">One number per pile — commas, spaces or new lines all work.</p>`;
      view.querySelector('.nc-apply').onclick=()=>{ const raw=view.querySelector('#ncListIn').value; const parts=raw.split(/[\s,;\n]+/).filter(Boolean); const bad=parts.filter(x=>!/^\d+$/.test(x));
        if(!parts.length){ view.querySelector('#ncListMsg').textContent='Enter at least one number, e.g. 1, 3, 5, 7'; return; }
        if(bad.length){ view.querySelector('#ncListMsg').textContent=`Not a whole number: ${bad.slice(0,3).join(', ')} — use nonnegative integers only.`; return; }
        nimP.piles=parts.map(x=>x.replace(/^0+(?=\d)/,'')); renderPreview(); view.querySelector('#ncListMsg').textContent=`${nimP.piles.length} piles applied.`; };
    } else {
      const mine=JSON.parse(localStorage.getItem('nim-presets')||'[]'); const pre=document.createElement('div'); pre.className='nc-presets nc-presets-tab';
      pre.innerHTML=NPRESETS.concat(mine).map((p,i)=>{ const bars=p.h.map(v=>{ let n=0n; try{ n=BigInt(v); }catch(e){} const hgt=Math.max(4,Math.min(34,Number(n>30n?30n:n)*2.6)); return `<i style="height:${hgt}px"></i>`; }).join('');
        return `<button type="button" class="nc-preset" data-i="${i}"><span class="nc-preset-prev">${bars}</span><span class="nc-preset-txt"><b>${p.name}</b><span>${p.h.join(', ')}</span><em>${p.d}</em></span></button>`; }).join('');
      view.appendChild(pre);
      pre.querySelectorAll('.nc-preset').forEach(b=>b.onclick=()=>{ const all=NPRESETS.concat(mine); nimP.piles=all[+b.dataset.i].h.slice(); nimP.editView='visual'; render(); }); }
    const rule=document.createElement('div'); rule.className='gs-row';
    rule.innerHTML=`<div class="gs-label">Win condition</div><div class="gs-seg"><button type="button" data-v="normal" class="${nimP.rule==='normal'?'on':''}">Normal — last token wins</button><button type="button" data-v="misere" class="${nimP.rule==='misere'?'on':''}">Misère — last token loses</button></div>`;
    body.appendChild(rule); rule.querySelectorAll('button').forEach(b=>b.onclick=()=>{ nimP.rule=b.dataset.v; render(); });
    const choose=document.createElement('label'); choose.className='gs-row'; choose.style.cssText='display:flex;align-items:center;gap:10px;font:500 13.5px var(--font-sans);color:var(--g6);cursor:pointer';
    choose.innerHTML=`<input type="checkbox" ${nimP.buildChoose?'checked':''}> I build, you choose — the computer inspects the board and picks its move order`;
    choose.querySelector('input').onchange=e=>nimP.buildChoose=e.target.checked; body.appendChild(choose);
    const isOnline = !onDone && nm && nm.opp==='online';
    if(!isOnline && !onDone){ const play=document.createElement('div'); play.className='gs-row'; play.innerHTML='<div class="gs-label">Play options</div>'; body.appendChild(play);
      ZFShell.segRow(play,'Players',[['ai','Computer'],['2p','Two players']],nimP.opp,v=>{ nimP.opp=v; render(); });
      if(nimP.opp==='ai') ZFShell.segRow(play,'Difficulty',[['easy','Easy'],['medium','Medium'],['hard','Hard'],['perfect','Perfect']],nimP.diff,v=>nimP.diff=v); }
    else { const note=document.createElement('p'); note.className='gs-note'; note.textContent=onDone?'This board will be used for the room you are creating.':'Applying this proposes a new board to your friend — nothing changes until they agree.'; body.appendChild(note); }
    let total=0n; try{ total=nimP.piles.reduce((a,v)=>a+BigInt(v),0n); }catch(e){}
    const actions=document.createElement('div'); actions.className='gc-actions'; actions.innerHTML=`<button type="button" class="start play2">${onDone?'Use this board':isOnline?'Propose this board':'Play this board'}</button><button type="button" class="cancel">Cancel</button>`; body.appendChild(actions);
    const playBtn=actions.querySelector('.play2'); playBtn.disabled=total<=0n; if(total<=0n){ const note=document.createElement('p'); note.className='gs-note'; note.textContent='A match needs at least one token.'; body.insertBefore(note,actions); }
    playBtn.onclick=()=>{ ZFShell.closeCustomDialog(); if(onDone) onDone(nimP.piles.slice(), nimP.rule); else if(isOnline) nm.online.hook.requestCustomize(nimP.piles.slice(), nimP.rule, undefined); else nimStart(false); };
    actions.querySelector('.cancel').onclick=()=>ZFShell.closeCustomDialog();
  };
  render(); }

function chCustomize(){ cancelAI(); if(cm){ chP.R=cm.R; chP.C=cm.C; wsShape=cm.start.slice(); } chP.tab='shape';
  const stage=chGame.querySelector('.stage'); const boardEl=$('cBoard'); const statusEl=$('cStatus'); const toolbar=stage.querySelector('.gtools');
  const bar=document.createElement('div'); bar.className='editbar'; bar.id='chEditBar';
  bar.innerHTML=`<span class="edittag">Editing board</span><div class="ch-dims"><label>Rows <input type="number" id="chER" min="1" max="20" value="${chP.R}"></label><span class="x">×</span><label>Columns <input type="number" id="chEC" min="1" max="20" value="${chP.C}"></label></div>`;
  boardEl.insertAdjacentElement('beforebegin',bar);
  const oldStatusHTML=statusEl.innerHTML; statusEl.innerHTML='<span class="cond">Click a tile to take a practice bite. The poison stays in the top-right corner.</span>';
  boardEl.style.display='none'; if(toolbar) toolbar.style.visibility='hidden';
  const editHost=document.createElement('div'); editHost.id='chEditHost'; editHost.className='ch-edithost'; boardEl.insertAdjacentElement('afterend',editHost);
  const dimsInfo=document.createElement('p'); dimsInfo.className='gs-note'; dimsInfo.style.textAlign='center'; editHost.insertAdjacentElement('afterend',dimsInfo);
  const presetRow=document.createElement('div'); presetRow.className='gc-actions'; presetRow.style.marginTop='4px';
  presetRow.innerHTML=`<button type="button" class="cancel" id="chEUndo">Undo bite</button><button type="button" class="cancel" id="chEReset">Reset to rectangle</button>`;
  dimsInfo.insertAdjacentElement('afterend',presetRow);
  const editActions=document.createElement('div'); editActions.className='editactions'; editActions.style.cssText='width:100%;justify-content:center;margin-top:14px';
  editActions.innerHTML=`<button type="button" class="play" id="chEPlay">Play this board</button><button type="button" class="cancel" id="chECancel">Cancel</button>`;
  presetRow.insertAdjacentElement('afterend',editActions);
  const customizeWrap=stage.querySelector('.gcustomize-entry'); if(customizeWrap) customizeWrap.style.display='none';
  let demo=ZFEntry.mount('chomp',editHost,{get:()=>({len:wsShape,C:chP.C,commit:true}),commit:(r,c)=>{ wsHist.push(wsShape.slice()); wsShape=CHOMP.bite(wsShape,chP.C,r,c); redraw(); }});
  function redraw(){ dimsInfo.textContent=`${chP.R} rows × ${chP.C} columns · ${CHOMP.count(wsShape)} tiles`; if(demo) demo.refresh(); }
  redraw();
  $('chER').onchange=$('chEC').onchange=()=>{ chP.R=Math.max(1,Math.min(20,parseInt($('chER').value)||1)); chP.C=Math.max(1,Math.min(20,parseInt($('chEC').value)||1)); wsShape=CHOMP.rect(chP.R,chP.C); redraw(); };
  $('chEReset').onclick=()=>{ wsShape=CHOMP.rect(chP.R,chP.C); redraw(); };
  $('chEUndo').onclick=()=>{ if(wsHist.length){ wsShape=wsHist.pop(); redraw(); } };
  function cleanup(){ bar.remove(); editHost.remove(); dimsInfo.remove(); presetRow.remove(); editActions.remove(); boardEl.style.display=''; statusEl.innerHTML=oldStatusHTML; if(toolbar) toolbar.style.visibility=''; if(customizeWrap) customizeWrap.style.display=''; }
  $('chEPlay').onclick=()=>{ cleanup(); chStart(false); };
  $('chECancel').onclick=()=>{ cleanup(); if(cm) chRender(); };
}

refreshResume();
window.__arcadeLobby=toLobby;
window.__nimPrefs=()=>nimP; window.__chompPrefs=()=>chP; window.__chompState=()=>cm;
window.__nimSetMatch=(newNm)=>{ nm=newNm; };
window.__nimRenderExternal=()=>{ if(nm) nimRender(); };
window.__nimEnterGameView=()=>{ hideAll(); nimGame.classList.add('show'); };
/* opening Nim or Chomp by its address continues the match saved on this device (not over a room link) */
const noRoom=()=>!new URLSearchParams(location.search).has('room');
const savedNote=()=>{ if(window.ZFOffline) ZFOffline.note('Game saved. Continue whenever you’re ready.'); };
function nimRoute(){ if(saved.nim&&noRoom()){ try{ nimResume(); savedNote(); return; }catch(e){ saveGame('nim',null); } } nimEnterFresh(); }
function chRoute(){ if(saved.chomp&&noRoom()){ try{ chResume(); savedNote(); return; }catch(e){ saveGame('chomp',null); } } chEnterFresh(); }
window.ZFA={nimRoute,chRoute,nimMisere:()=>nm&&!nm.preview?!!nm.misere:nimP.rule==='misere',nimOpen:nimEnterFresh,chOpen:chEnterFresh,nimAI:()=>{ if(nm&&!nm.over) nimMaybeAI(); },chAI:()=>{ if(typeof cm!=='undefined'&&cm&&!cm.over) chMaybeAI(); },nimCustomize,chCustomize,toLobby,hideAll,$};
})();
