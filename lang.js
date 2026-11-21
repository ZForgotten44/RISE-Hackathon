/* lang.js: language and accessibility settings for every page. Loaded in <head>, right after theme.js, so the saved
   choices are on <html> before first paint.
   - One round button in the header (a globe, beside music / sound / invert) opens a small menu: the language list,
     each name written in its own script (no flags: many languages are not one country), then four accessibility
     switches. Nothing else is added to the page.
   - Translation never touches the game code: the English text on the page is looked up in a phrase book
     (lang/<code>.js, loaded only when that language is picked) and swapped in place. New text that a game writes
     later is caught by a MutationObserver and translated too. Text with no entry stays English, so nothing breaks.
     ZFLang.t(english) translates a string in code (cinema.js uses it for subtitles it splits into words).
   - Arabic switches the page to right-to-left; boards, dice and films keep their left-to-right geometry.
   - Draft languages (isiZulu, Sesotho, Kiswahili) are marked "draft" in the list, so nobody meets machine-quality
     text without warning.
   - Accessibility, saved in localStorage and applied to <html>:
       zf-motion   '1' reduce motion (also answers matchMedia('(prefers-reduced-motion: reduce)') for every script)
                   '0' full motion; unset follows the device setting
       zf-films    '0' story films do not open by themselves (cinema.js); the story card's Watch button still plays them
       zf-text     '1' larger text (the whole page scales 115%, like browser zoom, so layouts stay intact)
       zf-contrast '1' stronger contrast (quiet greys and hairlines darken/lighten towards the ink colour)
   - A "Skip to content" link appears for keyboard users on the first Tab. */
(function(){
'use strict';
const root=document.documentElement;
const ls={ get(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } }, set(k,v){ try{ v==null?localStorage.removeItem(k):localStorage.setItem(k,v); }catch(e){} } };
const LANGS=[
  {c:'en',n:'English'},
  {c:'fr',n:'Français'},
  {c:'es',n:'Español'},
  {c:'ar',n:'العربية',rtl:1,font:'Noto+Sans+Arabic',fam:'Noto Sans Arabic'},
  {c:'hi',n:'हिन्दी',font:'Noto+Sans+Devanagari',fam:'Noto Sans Devanagari'},
  {c:'ta',n:'தமிழ்',font:'Noto+Sans+Tamil',fam:'Noto Sans Tamil'},
  {c:'af',n:'Afrikaans'},
  {c:'sw',n:'Kiswahili',draft:1},
  {c:'zu',n:'isiZulu',draft:1},
  {c:'st',n:'Sesotho',draft:1}
];
const byCode=c=>LANGS.find(l=>l.c===c);
const myV=(()=>{ const s=document.currentScript; const m=s&&/[?&]v=([\w]+)/.exec(s.src); return m?m[1]:''; })();

/* ---------- accessibility prefs: applied at once, before paint ---------- */
const sysReduce=(()=>{ try{ return matchMedia('(prefers-reduced-motion: reduce)'); }catch(e){ return null; } })();
const motionPref=()=>ls.get('zf-motion');           // '1' | '0' | null
const reduceOn=()=>{ const p=motionPref(); return p==='1'||(p!=='0'&&!!(sysReduce&&sysReduce.matches)); };
function applyPrefs(){
  const p=motionPref(); if(p==='1') root.setAttribute('data-motion','reduce'); else root.removeAttribute('data-motion');
  ls.get('zf-text')==='1'?root.setAttribute('data-text','lg'):root.removeAttribute('data-text');
  ls.get('zf-contrast')==='1'?root.setAttribute('data-contrast','hi'):root.removeAttribute('data-contrast');
}
applyPrefs();
/* every script on the site asks matchMedia for reduced motion; the saved choice answers it */
try{ const mm=window.matchMedia.bind(window);
  window.matchMedia=function(q){ const real=mm(q); const p=motionPref();
    if(p===null||!/prefers-reduced-motion\s*:\s*reduce/i.test(String(q))) return real;
    const noop=()=>{}; return {matches:p==='1',media:real.media,onchange:null,addListener:noop,removeListener:noop,addEventListener:noop,removeEventListener:noop,dispatchEvent:()=>false}; };
}catch(e){}

const CSS=`
html[data-motion="reduce"] *,html[data-motion="reduce"] *::before,html[data-motion="reduce"] *::after{animation-duration:.01ms!important;animation-delay:0s!important;animation-iteration-count:1!important;transition-duration:.01ms!important;transition-delay:0s!important;scroll-behavior:auto!important}
html[data-text="lg"]{zoom:1.15}
html[data-contrast="hi"][data-inv="0"] [data-tone="dark"],html[data-contrast="hi"][data-inv="1"] [data-tone="light"]{--g2:#2b2b28;--g3:#45443f;--g4:#8b8a83;--g5:#b3b1a9;--g6:#dcdad2;--card-sub:#dcdad2;--card-meta:#d2d0c8}
html[data-contrast="hi"][data-inv="0"] [data-tone="light"],html[data-contrast="hi"][data-inv="1"] [data-tone="dark"]{--g2:#c8c5ba;--g3:#a09d91;--g4:#66645c;--g5:#46443d;--g6:#2c2b27;--card-sub:#2c2b27;--card-meta:#36352f}
html[data-contrast="hi"] .hlp-tip,html[data-contrast="hi"] .e-small,html[data-contrast="hi"] .note{opacity:1}
html[lang="ar"]{--font-sans:'Space Grotesk','Noto Sans Arabic',system-ui,sans-serif;--font-mono:'IBM Plex Mono','Noto Sans Arabic',monospace}
html[lang="hi"]{--font-sans:'Space Grotesk','Noto Sans Devanagari',system-ui,sans-serif;--font-mono:'IBM Plex Mono','Noto Sans Devanagari',monospace}
html[lang="ta"]{--font-sans:'Space Grotesk','Noto Sans Tamil',system-ui,sans-serif;--font-mono:'IBM Plex Mono','Noto Sans Tamil',monospace}
html[lang="ar"] *,html[lang="hi"] *,html[lang="ta"] *{letter-spacing:0!important}
html:not([lang="en"]) .entry .seg button{text-transform:none}
html:not([lang="en"]),html:not([lang="en"]) body{overflow-x:clip}
html[dir="rtl"] .soundsw::after,html[dir="rtl"] .navmenu::after,html[dir="rtl"] .zl-btn::after,html[dir="rtl"] .themesw::after{right:auto;left:-2px}
[role="button"][tabindex]:focus-visible,.tt-cell[tabindex]:focus-visible,.pcount[tabindex]:focus-visible{outline:2px solid var(--fg);outline-offset:2px}
html[dir="rtl"] svg,html[dir="rtl"] canvas,html[dir="rtl"] .gx-board,html[dir="rtl"] #boardArea,html[dir="rtl"] .nboard,html[dir="rtl"] #cBoard,html[dir="rtl"] .e-demo,html[dir="rtl"] .hg-bar,html[dir="rtl"] .tt-board,html[dir="rtl"] .seg,html[dir="rtl"] #zfCine .zc-reel{direction:ltr}
.zf-skip{position:fixed;z-index:10000;top:10px;inset-inline-start:10px;padding:10px 16px;border-radius:10px;background:var(--fg,#141412);color:var(--bg,#f3f2ee);font:600 15px var(--font-sans,sans-serif);text-decoration:none;transform:translateY(-200%)}
.zf-skip:focus{transform:none;outline:2px solid var(--bg,#fff);outline-offset:2px}
.zl-btn{position:relative;flex:0 0 auto;width:32px;height:32px;padding:0;border:1px solid var(--g2);border-radius:50%;background:var(--surf);color:var(--fg);cursor:pointer;display:inline-flex;align-items:center;justify-content:center;transition:border-color .15s}
.zl-btn::before{content:'';position:absolute;inset:-8px}
.zl-btn svg{width:18px;height:18px;display:block}
.zl-btn:hover,.zl-btn[aria-expanded="true"]{border-color:var(--fg)}
.zl-btn:focus-visible{outline:2px solid var(--fg);outline-offset:3px}
.zl-btn::after{position:absolute;top:calc(100% + 9px);right:-2px;white-space:nowrap;font:600 12px var(--font-sans);letter-spacing:.01em;padding:5px 10px;border-radius:8px;pointer-events:none;opacity:0;transition:opacity .2s;z-index:50;content:attr(data-tip);background:var(--fg);color:var(--bg)}
.zl-btn:hover::after,.zl-btn:focus-visible::after{opacity:1}
.zl-btn[aria-expanded="true"]::after{opacity:0}
@media (pointer:coarse){.zl-btn{width:36px;height:36px}.zl-btn::before{inset:-6px}}
#zfLang{position:fixed;z-index:9000;width:min(340px,calc(100vw - 32px));max-height:calc(100dvh - 80px);overflow:auto;box-sizing:border-box;padding:14px;border:1px solid var(--g3);border-radius:16px;background:var(--surf);color:var(--fg);box-shadow:0 12px 28px rgba(0,0,0,.28);font:500 15px/1.35 var(--font-sans);text-align:start}
#zfLang[hidden]{display:none}
#zfLang .zl-h{margin:2px 4px 8px;font:600 11.5px var(--font-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--g5)}
#zfLang .zl-h+.zl-list{margin-bottom:14px}
#zfLang .zl-list{display:grid;grid-template-columns:1fr 1fr;gap:4px}
#zfLang .zl-l{display:flex;align-items:center;justify-content:space-between;gap:6px;min-height:44px;padding:0 12px;border:0;border-radius:10px;background:transparent;color:var(--fg);font:600 15.5px var(--font-sans);cursor:pointer;text-align:start}
#zfLang .zl-l:hover{background:var(--surf3)}
#zfLang .zl-l[aria-checked="true"]{background:var(--fg);color:var(--bg)}
#zfLang .zl-l:focus-visible,#zfLang .zl-sw:focus-visible{outline:2px solid var(--fg);outline-offset:2px}
#zfLang .zl-l small{font:600 9.5px var(--font-mono);letter-spacing:.08em;text-transform:uppercase;opacity:.7}
#zfLang .zl-note{margin:-6px 4px 14px;font-size:13px;color:var(--g6)}
#zfLang .zl-row{display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:48px;padding:0 4px;border-top:1px solid var(--g2)}
#zfLang .zl-row span{flex:1}
#zfLang .zl-sw{position:relative;flex:none;width:48px;height:28px;padding:0;border:1px solid var(--g4);border-radius:999px;background:var(--surf2);cursor:pointer}
#zfLang .zl-sw::after{content:'';position:absolute;top:3px;inset-inline-start:3px;width:20px;height:20px;border-radius:50%;background:var(--g5);transition:transform .15s}
#zfLang .zl-sw[aria-checked="true"]{background:var(--fg);border-color:var(--fg)}
#zfLang .zl-sw[aria-checked="true"]::after{background:var(--bg);transform:translateX(20px)}
html[dir="rtl"] #zfLang .zl-sw[aria-checked="true"]::after{transform:translateX(-20px)}
#zfLang .zl-foot{margin:10px 4px 2px;font-size:13px;color:var(--g6)}
`;
const st=document.createElement('style'); st.id='zfLangCSS'; st.textContent=CSS; (document.head||root).appendChild(st);

/* ---------- translation ---------- */
const PACKS={}; let lang='en', pack=null, htmlKeys=null, started=false, mo=null;
const norm=s=>s.replace(/\s+/g,' ').trim();
const TX=new WeakMap(), AT=new WeakMap(), HT=new WeakMap();
const ATTRS=['aria-label','title','placeholder','data-tip','alt'];
/* every language also splits "A · B" labels and translates each side (e.g. "Player 1 · 10 to place") */
const COMMON=[['^(\\d+) · (.+)$','$1 · $2'],['^(.+?) · (.+)$','$1 · $2']];
/* a pattern only applies when every captured part is a number, a game name, or itself translatable, so a sentence
   that merely starts with "About " or ends with " rules" is never half-translated */
const NAMES=new Set(['morabaraba','chaupar','dasapada','patolli','bao gold','the gold coin','cacao','chomp','pingala’s piles','nim','maya wheels','pentago','kolam','notakto','viloma','toot & otto','sona','sim','recursive tic-tac-toe']);
const partOK=v=>/^[\d\s.,–-]+$/.test(v)||NAMES.has(v.toLowerCase())||lookup(v)!=null;
const fill=(tpl,m)=>tpl.replace(/\$(\d)/g,(_,k)=>{ const v=m[+k]||''; const t=/^[\d\s.,–-]+$/.test(v)||NAMES.has(v.toLowerCase())?null:lookup(v); return t==null?v:t; });
function lookup(k,noPat){ if(!pack) return null; const d=pack.d; if(Object.prototype.hasOwnProperty.call(d,k)) return d[k];
  if(!noPat&&pack.p) for(const [re,tpl] of pack.p){ const m=re.exec(k); if(m&&m.slice(1).every(v=>v==null||partOK(v))) return fill(tpl,m); } return null; }
function t(s){ if(lang==='en'||!s) return s; const k=norm(String(s)); const r=lookup(k); return r==null?s:r; }
const SKIP='script,style,textarea,code,pre,[translate="no"],.notranslate,#zfTerm,#terminal,.zc-say';
const skipEl=el=>!!(el&&el.closest&&el.closest(SKIP));
function doText(n){
  const p=n.parentElement; if(!p||skipEl(p)) return;
  let rec=TX.get(n); const cur=n.nodeValue;
  if(!rec||cur!==rec.v){ rec={o:cur,v:cur}; TX.set(n,rec); }
  const o=rec.o; let out=o;
  if(lang!=='en'&&/[A-Za-z]/.test(o)){ const k=norm(o); const r=k&&lookup(k); if(r!=null) out=o.match(/^\s*/)[0]+r+o.match(/\s*$/)[0]; }
  if(out!==cur) n.nodeValue=out; rec.v=out;
}
function doAttr(el,a){
  if(skipEl(el)&&!(el.closest&&el.closest('#zfLang'))) return; const cur=el.getAttribute(a); if(cur==null) return;
  let m=AT.get(el); if(!m){ m={}; AT.set(el,m); } let rec=m[a];
  if(!rec||cur!==rec.v){ rec={o:cur,v:cur}; m[a]=rec; }
  let out=rec.o; if(lang!=='en'&&/[A-Za-z]/.test(out)){ const r=lookup(norm(out)); if(r!=null) out=r; }
  if(out!==cur) el.setAttribute(a,out); rec.v=out;
}
const INLINE=/^(B|I|EM|STRONG|BR|SMALL|SPAN|SUP|SUB)$/;
function doHTML(el){   // a sentence split by <b>…</b> is translated as one piece
  if(!htmlKeys||!el.firstElementChild||el.namespaceURI!=='http://www.w3.org/1999/xhtml') return false;
  const rec=HT.get(el); const cur=el.innerHTML;
  if(rec&&cur===rec.v){ if(lang==='en'||!htmlKeys.has(norm(rec.o))){ el.innerHTML=rec.o; HT.delete(el); return false; } const r=pack.h[norm(rec.o)]; if(r!==cur){ el.innerHTML=r; rec.v=el.innerHTML; } return true; }
  if(cur.length>1500||lang==='en') return false;
  for(const c of el.querySelectorAll('*')) if(!INLINE.test(c.tagName)) return false;
  const k=norm(cur); if(!htmlKeys.has(k)) return false;
  el.innerHTML=pack.h[k]; HT.set(el,{o:cur,v:el.innerHTML}); return true;
}
function walk(node){
  if(node.nodeType===3){ doText(node); return; }
  if(node.nodeType!==1) return; const el=node;
  if(el.matches(SKIP)) return;
  for(const a of ATTRS) if(el.hasAttribute(a)) doAttr(el,a);
  if(doHTML(el)) return;
  for(let c=el.firstChild;c;c=c.nextSibling) walk(c);
}
function run(nodes){ if(mo) mo.disconnect(); try{ nodes.forEach(walk); } finally{ observe(); } }
function observe(){ if(!mo) mo=new MutationObserver(recs=>{ mo.disconnect(); try{
    for(const r of recs){
      if(r.type==='characterData'){ if(r.target.isConnected) doText(r.target); }
      else if(r.type==='attributes'){ if(r.target.isConnected) doAttr(r.target,r.attributeName); }
      else { const tg=r.target; if(tg.nodeType===1&&tg.isConnected&&!skipEl(tg)&&doHTML(tg)) continue; r.addedNodes.forEach(n=>{ if(n.isConnected) walk(n); }); }
    } } finally{ observe(); } });
  if(document.body) mo.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:ATTRS});
  const ti=document.querySelector('title'); if(ti) mo.observe(ti,{subtree:true,childList:true,characterData:true});
}
function translateAll(){ if(!document.body) return; const ti=document.querySelector('title'); run(ti?[ti,document.body]:[document.body]); started=true; }

function setDir(){ const L=byCode(lang)||LANGS[0]; root.setAttribute('lang',L.c); if(L.rtl) root.setAttribute('dir','rtl'); else root.removeAttribute('dir');
  if(L.font&&!document.getElementById('zfLangFont-'+L.c)){ const l=document.createElement('link'); l.id='zfLangFont-'+L.c; l.rel='stylesheet'; l.href=`https://fonts.googleapis.com/css2?family=${L.font}:wght@400;500;600;700&display=swap`; document.head.appendChild(l); } }
function loadPack(c){ return new Promise(res=>{ if(c==='en'||PACKS[c]) return res(PACKS[c]||null);
  const s=document.createElement('script'); s.src='/lang/'+c+'.js'+(myV?'?v='+myV:''); s.onload=()=>res(PACKS[c]||null); s.onerror=()=>res(null); document.head.appendChild(s); }); }
function usePack(c){ pack=c==='en'?null:PACKS[c]||null; htmlKeys=pack&&pack.h?new Set(Object.keys(pack.h)):null; }
let hold=null;
async function setLang(c,user){
  if(!byCode(c)) c='en'; lang=c; if(user) ls.set('zf-lang',c==='en'?null:c);
  setDir(); if(c!=='en') await loadPack(c); if(lang!==c) return; usePack(c);
  if(c!=='en'&&!pack){ root.setAttribute('lang','en'); root.removeAttribute('dir'); }   // phrase book did not load: the page stays honestly English
  const go=()=>{ if(started||c!=='en') translateAll(); paintMenu(); if(hold){ root.classList.remove('zl-wait'); hold=null; }
    document.dispatchEvent(new CustomEvent('zf-lang',{detail:{lang:c}})); };
  if(document.body) go(); else document.addEventListener('DOMContentLoaded',go,{once:true});
}
window.ZFLang={ t, get:()=>lang, set:c=>setLang(c,true), list:()=>LANGS.map(l=>({...l})), add(c,data){ const p={d:data.d||{},h:data.h||null,p:(data.p||[]).concat(COMMON).map(([re,tpl])=>[new RegExp(re),tpl])}; PACKS[c]=p; if(c===lang) usePack(c); } };

/* first paint: a non-English visitor sees the page once it is translated (a short hold, never more than 1.2 s) */
const saved=ls.get('zf-lang');
if(saved&&saved!=='en'&&byCode(saved)){ root.classList.add('zl-wait'); const hs=document.createElement('style'); hs.textContent='html.zl-wait body{visibility:hidden}'; document.head.appendChild(hs); hold=setTimeout(()=>{ root.classList.remove('zl-wait'); hold=null; },1200); setLang(saved,false); }
else { lang='en'; root.setAttribute('lang','en'); }

/* ---------- the menu ---------- */
const GLOBE='<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><circle cx="12" cy="12" r="8.6"/><path d="M3.6 12h16.8M12 3.4c2.4 2.4 3.6 5.3 3.6 8.6s-1.2 6.2-3.6 8.6c-2.4-2.4-3.6-5.3-3.6-8.6S9.6 5.8 12 3.4Z"/></svg>';
let menu=null, opener=null;
const SW=[['zf-motion','Reduce motion'],['zf-films','Play story films automatically'],['zf-text','Larger text'],['zf-contrast','Stronger contrast']];
const swOn=k=>k==='zf-motion'?reduceOn():k==='zf-films'?ls.get('zf-films')!=='0':ls.get(k)==='1';
function buildMenu(){
  menu=document.createElement('div'); menu.id='zfLang'; menu.hidden=true; menu.setAttribute('role','dialog'); menu.setAttribute('aria-label','Language and accessibility');
  menu.innerHTML=`<div class="zl-h" id="zlH1">Language</div><div class="zl-list" role="radiogroup" aria-labelledby="zlH1">${LANGS.map(l=>`<button type="button" class="zl-l" role="radio" data-l="${l.c}" lang="${l.c}"${l.rtl?' dir="rtl"':''}><span translate="no">${l.n}</span>${l.draft?'<small>draft</small>':''}</button>`).join('')}</div>
<p class="zl-note" hidden>Draft translation. Stories and films stay in English. Native speakers, help us improve it.</p>
<div class="zl-h">Accessibility</div>${SW.map(([k,label])=>`<div class="zl-row"><span id="zl-${k}">${label}</span><button type="button" class="zl-sw" role="switch" data-k="${k}" aria-labelledby="zl-${k}"></button></div>`).join('')}
<p class="zl-foot">Every game also plays with a keyboard: Tab moves between pieces, Enter plays.</p>`;
  document.body.appendChild(menu);
  menu.addEventListener('click',e=>{ const l=e.target.closest('.zl-l'); if(l){ setLang(l.dataset.l,true); return; }
    const s=e.target.closest('.zl-sw'); if(s){ const k=s.dataset.k, on=!swOn(k);
      if(k==='zf-films') ls.set(k,on?null:'0'); else if(k==='zf-motion') ls.set(k,on?'1':'0'); else ls.set(k,on?'1':null);
      applyPrefs(); paintMenu(); place(); document.dispatchEvent(new CustomEvent('zf-access',{detail:{key:k,on}})); } });
  menu.addEventListener('keydown',e=>{ if(e.key==='Escape'){ e.preventDefault(); close(true); return; }
    const l=e.target.closest&&e.target.closest('.zl-l'); if(l&&/^Arrow/.test(e.key)){ const all=[...menu.querySelectorAll('.zl-l')]; let i=all.indexOf(l);
      const rtl=root.getAttribute('dir')==='rtl'; const d={ArrowDown:2,ArrowUp:-2,ArrowRight:rtl?-1:1,ArrowLeft:rtl?1:-1}[e.key]; i=Math.max(0,Math.min(all.length-1,i+d)); all[i].focus(); e.preventDefault(); } });
  paintMenu();
}
function paintMenu(){ if(!menu) return; let draft=false;
  menu.querySelectorAll('.zl-l').forEach(b=>{ const on=b.dataset.l===lang; b.setAttribute('aria-checked',on); b.tabIndex=on?0:-1; if(on&&byCode(lang).draft) draft=true; });
  menu.querySelector('.zl-note').hidden=!draft;
  menu.querySelectorAll('.zl-sw').forEach(s=>s.setAttribute('aria-checked',swOn(s.dataset.k))); }
function place(){ if(!menu||menu.hidden||!opener) return; const r=opener.getBoundingClientRect(), z=root.getAttribute('data-text')?1.15:1;
  const w=menu.offsetWidth, vw=document.documentElement.clientWidth;
  let left=Math.min(r.right/z-w, vw/z-w-16); left=Math.max(16,left);
  menu.style.top=Math.round(r.bottom/z+10)+'px'; menu.style.left=Math.round(left)+'px'; }
function open(btn){ if(!menu) buildMenu(); opener=btn; menu.hidden=false; btn.setAttribute('aria-expanded','true'); paintMenu(); place();
  const cur=menu.querySelector('.zl-l[aria-checked="true"]'); cur&&cur.focus({preventScroll:true}); }
function close(refocus){ if(!menu||menu.hidden) return; menu.hidden=true; document.querySelectorAll('.zl-btn').forEach(b=>b.setAttribute('aria-expanded','false')); if(refocus&&opener) opener.focus({preventScroll:true}); }
function buildButtons(){
  document.querySelectorAll('.themesw').forEach(sw=>{ const par=sw.parentNode; if(par.querySelector(':scope > .zl-btn')) return;
    const b=document.createElement('button'); b.type='button'; b.className='zl-btn'; b.innerHTML=GLOBE;
    b.setAttribute('aria-label','Language and accessibility'); b.setAttribute('data-tip','Language & accessibility'); b.setAttribute('aria-haspopup','dialog'); b.setAttribute('aria-expanded','false');
    const first=[...par.children].find(c=>c.matches('.musicsw,.soundsw,.themesw')); par.insertBefore(b,first||sw);
    b.addEventListener('click',e=>{ e.stopPropagation(); (menu&&!menu.hidden&&opener===b)?close(false):open(b); }); });
  /* skip link for keyboard users */
  if(!document.querySelector('.zf-skip')){ const tgt=document.querySelector('main,#games,.wrap'); if(tgt){ if(!tgt.id) tgt.id='zfMain';
    const a=document.createElement('a'); a.className='zf-skip'; a.href='#'+tgt.id; a.textContent='Skip to content';
    /* moves focus to the first control in the content, so the container itself never needs a tabindex */
    a.addEventListener('click',e=>{ const f=[...tgt.querySelectorAll('a[href],button:not([disabled]),input,select,[tabindex="0"]')].find(x=>x.getClientRects().length); if(f){ e.preventDefault(); f.focus(); } }); document.body.insertBefore(a,document.body.firstChild); } }
}
/* keyboard players keep their place: when a move redraws the board and the focused piece disappears, focus returns to
   the same spot in the new board (same data-* attributes), even after the computer's reply redraws it again */
let kbd=false, refocus=null;
addEventListener('keydown',e=>{ if(e.key==='Tab'||e.key==='Enter'||e.key===' '||/^Arrow/.test(e.key)) kbd=true; },true);
addEventListener('pointerdown',()=>{ kbd=false; refocus=null; },true);
const esc=v=>(window.CSS&&CSS.escape)?CSS.escape(v):String(v).replace(/["\\]/g,'\\$&');
function sigOf(el){ const ds=[...el.attributes].filter(a=>/^data-/.test(a.name)); if(!ds.length) return null; return el.tagName.toLowerCase()+ds.map(a=>`[${a.name}="${esc(a.value)}"]`).join(''); }
let last=null;
document.addEventListener('focusin',e=>{ const t=e.target; if(!(t instanceof Element)) return; const host=t.closest('.game,.entry'); const sig=host&&sigOf(t); if(sig) last={sig,host,at:Date.now()}; });
const BOARD='.gx-board,#boardArea,.nboard,#cBoard';
const FALLBACK=['[tabindex="0"]','button:not([disabled])'].flatMap(x=>BOARD.split(',').map(b=>b+' '+x)).join(',');
const usable=m=>m&&m.getClientRects().length&&m.tabIndex>=0&&!m.disabled;
let ticking=false;
function watchFocus(){ if(!last) return; refocus={...last,since:Date.now(),until:Date.now()+4000}; if(ticking) return; ticking=true;
  const tick=()=>{ if(!refocus||Date.now()>refocus.until){ refocus=null; ticking=false; return; } const a=document.activeElement;
    if(!a||a===document.body||!a.isConnected){ let m=refocus.host.querySelector(refocus.sig); if(!usable(m)&&Date.now()-refocus.since>700) m=refocus.host.querySelector(FALLBACK); if(usable(m)) m.focus({preventScroll:true}); }
    requestAnimationFrame(tick); };
  requestAnimationFrame(tick); }
addEventListener('keyup',e=>{ if(kbd&&(e.key==='Enter'||e.key===' ')) watchFocus(); },true);
document.addEventListener('click',e=>{ if(menu&&!menu.hidden&&!menu.contains(e.target)&&!e.target.closest('.zl-btn')) close(false); });
addEventListener('resize',place); addEventListener('scroll',()=>close(false),{passive:true});
document.addEventListener('keydown',e=>{ if(e.key==='Escape'&&menu&&!menu.hidden) close(true); });
if(sysReduce&&sysReduce.addEventListener) sysReduce.addEventListener('change',paintMenu);
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',buildButtons); else buildButtons();
addEventListener('storage',e=>{ if(e.key==='zf-lang'){ setLang(e.newValue||'en',false); } else if(e.key&&/^zf-(motion|text|contrast|films)$/.test(e.key)){ applyPrefs(); paintMenu(); } });
})();
