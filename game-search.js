/* game-search.js: "Find a game…" in the homepage's Games heading. Laptop: a compact field on the right of the heading.
   Phone: a search button beside the heading that opens the field as a row under it (All games stays where it is).
   Up to three strong matches, more on request; each opens its game directly (never through All Games). Arrow keys
   move, Enter opens, Escape closes. Matching lives in shared.js (ZF.findGames). */
(function(){
'use strict';
const stage=document.getElementById('ssStage'), head=stage&&stage.querySelector('.ss-head');
if(!stage||!head||!window.ZF||!ZF.findGames) return;
const ICON_Q='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6" fill="none" stroke="currentColor" stroke-width="2"/><path d="m15 15 5 5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>';
const ICON_X='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7l10 10M17 7 7 17" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>';
const esc=t=>String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]);
const box=document.createElement('div'); box.className='gs-find'; box.id='gsFind';
box.innerHTML=`<button type="button" class="gs-open" aria-label="Find a game" aria-expanded="false" aria-controls="gsField">${ICON_Q}</button>
<div class="gs-field" id="gsField" role="search"><span class="gs-ic">${ICON_Q}</span><input type="search" id="gsInput" placeholder="Find a game…" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="go" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="gsList" aria-label="Find a game"><button type="button" class="gs-clear" aria-label="Clear search" hidden>${ICON_X}</button><button type="button" class="gs-cancel">Cancel</button></div>
<div class="gs-pop" hidden><ul class="gs-list" id="gsList" role="listbox" aria-label="Matching games"></ul><button type="button" class="gs-more" hidden></button><p class="gs-empty" hidden></p></div>`;
stage.appendChild(box);
const $=s=>box.querySelector(s), input=$('#gsInput'), list=$('#gsList'), pop=$('.gs-pop'), more=$('.gs-more'), empty=$('.gs-empty'), clear=$('.gs-clear'), openBtn=$('.gs-open');
let res=[], shown=0, act=-1, wide=false;
const phone=()=>innerWidth<700;
function render(){ const q=input.value.trim(); clear.hidden=!q;
  if(!q){ hide(); return; }
  const all=ZF.findGames(q), best=all.length?all[0].score:0;
  res=all.filter(r=>best<60||r.score>=44);
  shown=Math.min(res.length,wide?8:3); act=res.length?0:-1;
  list.innerHTML=res.slice(0,shown).map((r,i)=>{ const g=r.g; return `<li role="presentation"><a role="option" id="gsOpt${i}" class="gs-opt" href="${esc(g.link)}" aria-selected="${i===act}"><span class="gs-name">${esc(g.name)}</span><span class="gs-meta">${esc(g.players)} · ${esc(ZF.catLabel(g))}</span></a></li>`; }).join('');
  more.hidden=res.length<=shown; if(!more.hidden) more.textContent=`Show ${Math.min(res.length,8)-shown} more`;
  empty.hidden=!!res.length; if(!res.length) empty.innerHTML=`No game matches “${esc(q)}”. Try a name like Nim or Pentago, or <a href="/arcade">browse all games ↗</a>`;
  pop.hidden=false; input.setAttribute('aria-expanded','true'); mark(); }
function mark(){ list.querySelectorAll('.gs-opt').forEach((a,i)=>a.setAttribute('aria-selected',String(i===act)));
  if(act>=0) input.setAttribute('aria-activedescendant','gsOpt'+act); else input.removeAttribute('aria-activedescendant'); }
function hide(){ pop.hidden=true; input.setAttribute('aria-expanded','false'); input.removeAttribute('aria-activedescendant'); wide=false; }
function expand(v){ box.classList.toggle('open',v); document.body.classList.toggle('gs-on',v); openBtn.setAttribute('aria-expanded',String(v));
  if(v){ setTimeout(()=>input.focus({preventScroll:true}),0); } else { input.value=''; render(); openBtn.focus({preventScroll:true}); } }
const go=i=>{ const r=res[i]; if(r) location.href=r.g.link; };
input.addEventListener('input',()=>{ wide=false; render(); });
input.addEventListener('focus',()=>{ if(input.value.trim()) render(); });
input.addEventListener('keydown',e=>{
  if(e.key==='ArrowDown'||e.key==='ArrowUp'){ if(pop.hidden) render(); if(!shown) return; e.preventDefault(); act=(act+(e.key==='ArrowDown'?1:-1)+shown)%shown; mark(); const o=list.querySelector('#gsOpt'+act); if(o) o.scrollIntoView({block:'nearest'}); }
  else if(e.key==='Enter'){ e.preventDefault(); if(act>=0) go(act); }
  else if(e.key==='Escape'){ e.preventDefault(); e.stopPropagation(); if(!pop.hidden&&input.value){ hide(); } else if(input.value){ input.value=''; render(); } else if(phone()) expand(false); else input.blur(); } });
clear.addEventListener('click',()=>{ input.value=''; render(); input.focus(); });
more.addEventListener('click',()=>{ wide=true; const a=act; render(); act=a; mark(); input.focus(); });
openBtn.addEventListener('click',()=>expand(true));
$('.gs-cancel').addEventListener('click',()=>expand(false));
/* the list closes when you click or tap anywhere else; a result is an ordinary link */
document.addEventListener('pointerdown',e=>{ if(!box.contains(e.target)){ hide(); if(phone()&&box.classList.contains('open')&&!input.value) expand(false); } });
list.addEventListener('pointermove',e=>{ const o=e.target.closest('.gs-opt'); if(!o) return; const i=+o.id.slice(5); if(i!==act){ act=i; mark(); } });
/* the scroll story fades the heading row as the face rises; the search goes with it */
window.ZFGameSearch={el:box,close(){ hide(); if(box.classList.contains('open')&&!input.value){ box.classList.remove('open'); document.body.classList.remove('gs-on'); } }};
})();
