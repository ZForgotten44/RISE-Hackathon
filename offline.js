/* offline.js: saving games for play without a connection, and the small calm status line that goes with it.
   - Registers sw.js (HTTPS, or localhost while developing).
   - After a game page has loaded, saves that game automatically: its page plus every file in offline-manifest.json's
     core list (scripts, styles, workers, engines, pictures, sounds, Origins content) and the web fonts it uses.
     "Available offline" appears only after every one of those files is confirmed in the cache.
   - Other games are saved only when someone asks ("Save for offline" on the All games page). Nothing else downloads.
   - A newer version of the site is saved only between matches (never while a match is unfinished) and never reloads.
   - Status words: "Available offline", "Offline · Playing on this device", "Game saved. Continue whenever you’re ready."
   Browser storage can be cleared by the browser or the person, so nothing here promises permanent availability. */
(function(){
const CACHE='zf-offline', SKEY='zf-offline-saved', MAN='/offline-manifest.json';
const canSW='serviceWorker' in navigator && (location.protocol==='https:'||/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname));
const hasCaches=typeof caches!=='undefined';
const slugs=()=>(window.ZF&&ZF.GAMES||[]).map(g=>g.slug);
const here=()=>location.pathname.replace(/^\/+|\/+$/g,'').split('/')[0];
const isGame=s=>slugs().includes(s);
const savedMap=()=>{ try{ return JSON.parse(localStorage.getItem(SKEY)||'{}'); }catch(e){ return {}; } };
const setSaved=m=>{ try{ localStorage.setItem(SKEY,JSON.stringify(m)); }catch(e){} };
const listeners=new Set(); const emit=()=>listeners.forEach(f=>{ try{ f(); }catch(e){} });

/* ---- the status line: one quiet line at the bottom corner of a game page, never a popup ---- */
const CSS=`#zfNet{position:fixed;left:14px;bottom:calc(14px + env(safe-area-inset-bottom));z-index:60;display:flex;align-items:center;gap:8px;max-width:calc(100vw - 28px);padding:7px 12px;border-radius:999px;background:var(--bg);border:1px solid var(--g3);color:var(--g6);font:600 12.5px/1.3 var(--font-sans);opacity:0;transform:translateY(6px);transition:opacity .25s,transform .25s;pointer-events:none}
#zfNet.on{opacity:1;transform:none}
#zfNet i{flex:none;width:7px;height:7px;border-radius:50%;background:var(--g5)}
#zfNet.ok i{background:var(--fg)}
#zfNet.off{color:var(--fg)}
@media (prefers-reduced-motion:reduce){#zfNet{transition:none}}
.zo-offsec{margin:40px 0 0;padding-top:22px;border-top:1px solid var(--g2)}
.zo-offsec h2{margin:0 0 6px;font:700 18px var(--font-sans);color:var(--fg)}
.zo-offsec p{margin:0 0 16px;font:500 14.5px/1.5 var(--font-sans);color:var(--g6);max-width:62ch}
.zo-offlist{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:8px;margin:0;padding:0;list-style:none}
.zo-offlist li{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 12px;border:1px solid var(--g3);border-radius:12px;font:600 14.5px var(--font-sans);color:var(--fg)}
.zo-offlist button{min-height:38px;padding:0 12px;border:1px solid var(--g4);border-radius:10px;background:transparent;color:var(--fg);font:600 13px var(--font-sans);cursor:pointer;white-space:nowrap}
.zo-offlist button:hover,.zo-offlist button:focus-visible{border-color:var(--fg)}
.zo-offlist button:disabled{cursor:default;opacity:.7}
.zo-offlist .st{font:600 12.5px var(--font-sans);color:var(--g5);white-space:nowrap}`;
let net=null, noteT=0, noteText='';
function css(){ if(document.getElementById('zf-net-css')) return; const s=document.createElement('style'); s.id='zf-net-css'; s.textContent=CSS; document.head.appendChild(s); }
function line(){ if(net) return net; css(); net=document.createElement('div'); net.id='zfNet'; net.setAttribute('role','status'); net.setAttribute('aria-live','polite'); net.innerHTML='<i aria-hidden="true"></i><span></span>'; document.body.appendChild(net); return net; }
const onlineMatch=()=>{ const M=window.ZFX&&ZFX.M; if(M&&M.opt&&M.opt.opp==='online'&&!M.previewOnly) return true; const u=window.__ultState&&__ultState(); return !!(u&&u.opp==='online'); };
function paint(){ if(!isGame(here())) return; const el=line(), t=el.querySelector('span'); const off=navigator.onLine===false; const saved=!!savedMap()[here()];
  let text='', cls='';
  if(noteText){ text=noteText; cls='ok'; }
  else if(off){ text=onlineMatch()?'Offline · Your online match will continue when you reconnect':'Offline · Playing on this device'; cls='off'; }
  else if(saved&&shownOK) { text='Available offline'; cls='ok'; }
  el.className=(text?'on ':'')+cls; if(text) t.textContent=text; }
let shownOK=false;
/* "Available offline" is a quiet confirmation: shown when it becomes true, then it steps aside */
function confirmOK(){ shownOK=true; paint(); setTimeout(()=>{ shownOK=false; paint(); },6000); }
function note(text){ noteText=text; paint(); clearTimeout(noteT); noteT=setTimeout(()=>{ noteText=''; paint(); },7000); }
addEventListener('online',()=>{ paint(); refreshIfIdle(); }); addEventListener('offline',paint);

/* ---- saving ---- */
async function manifest(){ try{ const r=await fetch(MAN,{cache:'no-store'}); if(r.ok){ const m=await r.clone().json(); if(hasCaches){ const c=await caches.open(CACHE); await c.put(MAN,r); } return m; } }catch(e){}
  if(!hasCaches) return null; try{ const c=await caches.open(CACHE); const r=await c.match(MAN); return r?r.json():null; }catch(e){ return null; } }
/* the web fonts this page actually uses (Google Fonts): the stylesheet, then each font file it names */
async function fontURLs(){ const out=new Set(); performance.getEntriesByType('resource').forEach(e=>{ if(/fonts\.(googleapis|gstatic)\.com/.test(e.name)) out.add(e.name); }); return [...out]; }
/* stamped files (?v=hash), sounds, fonts and pictures never change at the same address, so a saved copy is kept; an
   unstamped script or page is fetched again on every save so it matches the current site */
const fixed=u=>/[?&]v=/.test(u)||/\.(mp3|woff2|png|svg|webp|jpg|ico)$/.test(u.split('?')[0])||/^https?:/.test(u);
async function putAll(c,urls,{cors}={}){ const miss=[]; for(const u of urls){ if(fixed(u)&&await c.match(u,{ignoreVary:true})) continue; miss.push(u); }
  let i=0; const worker=async()=>{ while(i<miss.length){ const u=miss[i++]; const r=await fetch(u,cors?{mode:'cors',credentials:'omit'}:{cache:'no-cache'}); if(!r.ok) throw new Error('could not save '+u); await c.put(u,r); } };
  await Promise.all([worker(),worker(),worker(),worker()]); }
async function verify(c,urls){ for(const u of urls) if(!(await c.match(u,{ignoreVary:true}))) return false; return true; }
let busy=null;
async function save(slug,opts){ opts=opts||{}; if(!hasCaches||!canSW) throw new Error('This browser can’t save games for offline play.');
  const m=await manifest(); if(!m||!m.games[slug]) throw new Error('Can’t reach the site to save this game.');
  const c=await caches.open(CACHE); const page=m.games[slug], core=m.core, fonts=opts.fonts||[];
  await putAll(c,core); await putAll(c,page); if(fonts.length) await putAll(c,fonts,{cors:true}).catch(()=>{});   // the site still works with system fonts
  if(!(await verify(c,core.concat(page)))) throw new Error('Saving didn’t finish.');
  const s=savedMap(); s[slug]={v:m.version,at:Date.now()}; setSaved(s); emit(); return true; }
async function forgetStale(){ if(!hasCaches) return; const m=await manifest(); if(!m) return; const keep=new Set([MAN,...m.core]); Object.values(m.games).forEach(a=>a.forEach(u=>keep.add(u)));
  const c=await caches.open(CACHE); for(const req of await c.keys()){ const u=new URL(req.url); if(u.origin!==location.origin) continue; const k=u.pathname+u.search; if(!keep.has(k)) await c.delete(req); } }
/* a match in progress on this device for that game (its saved resume slot) */
function matchOpen(slug){ try{ const g=JSON.parse(localStorage.getItem('zf-match-v1')||'{}'); const id=((window.ZF&&ZF.GAMES)||[]).find(x=>x.slug===slug); if(id&&g[id.id]) return true;
  const t=JSON.parse(localStorage.getItem('ttt-saved-v1')||'{}'); if(slug==='nim'&&t.nim) return true; if(slug==='chomp'&&t.chomp) return true;
  if(slug==='recursive-tic-tac-toe'&&localStorage.getItem('zf-ult-match-v1')) return true; }catch(e){} return false; }
/* bring saved games up to the current version, quietly, only for games with no unfinished match, and only online */
async function refreshIfIdle(){ if(!canSW||!hasCaches||navigator.onLine===false||busy) return; const m=await manifest(); if(!m) return; const s=savedMap();
  const stale=Object.keys(s).filter(k=>s[k].v!==m.version&&m.games[k]&&!matchOpen(k)); if(!stale.length) return;
  busy=(async()=>{ for(const k of stale){ try{ await save(k,{fonts:await fontURLs()}); }catch(e){} } const s2=savedMap(); if(Object.values(s2).every(x=>x.v===m.version)) await forgetStale().catch(()=>{}); })();
  await busy; busy=null; }

/* ---- "Save for offline" on the All games page: each other game, saved only when asked ---- */
function offlineList(){ const home=document.getElementById('home'); if(!home||here()!=='arcade'||!canSW||!hasCaches||document.getElementById('zfOfflineSec')) return; css();
  const sec=document.createElement('section'); sec.className='zo-offsec'; sec.id='zfOfflineSec'; sec.setAttribute('aria-labelledby','zfOffH');
  sec.innerHTML='<h2 id="zfOffH">Play without internet</h2><p>A game you open here is saved on this device so you can keep playing against the computer offline. Save others ahead of time below. Your browser may clear saved games if it runs short of space.</p><ul class="zo-offlist" id="zfOffList"></ul>';
  home.appendChild(sec); const draw=()=>{ const s=savedMap(); document.getElementById('zfOffList').innerHTML=(ZF.GAMES||[]).map(g=>`<li><span>${g.name.replace(/&/g,'&amp;').replace(/</g,'&lt;')}</span>${s[g.slug]?'<span class="st">Available offline</span>':`<button type="button" data-s="${g.slug}">Save for offline</button>`}</li>`).join('');
    sec.querySelectorAll('button[data-s]').forEach(b=>b.onclick=async()=>{ b.disabled=true; b.textContent='Saving…'; try{ await save(b.dataset.s,{fonts:await fontURLs()}); }catch(e){ b.disabled=false; b.textContent=navigator.onLine===false?'Needs a connection':'Try again'; return; } draw(); }); };
  draw(); listeners.add(draw); }

async function start(){ if(!canSW) return;
  try{ await navigator.serviceWorker.register('/sw.js'); }catch(e){ return; }
  const slug=here(); offlineList(); paint();
  if(isGame(slug)&&navigator.onLine!==false){
    const s=savedMap(); const m=await manifest(); if(!m) return;
    if(!s[slug]||(s[slug].v!==m.version&&!matchOpen(slug))){ try{ await save(slug,{fonts:await fontURLs()}); confirmOK(); }catch(e){ /* stays quietly unsaved; it will try again next visit */ } }
    refreshIfIdle(); }
  else if(navigator.onLine!==false) refreshIfIdle(); }
window.ZFOffline={ note, save, saved:slug=>!!savedMap()[slug], status:paint, onChange:f=>listeners.add(f) };
const go=()=>{ const idle=window.requestIdleCallback||(f=>setTimeout(f,1200)); idle(()=>start(),{timeout:4000}); };
if(document.readyState==='complete') go(); else addEventListener('load',go);
})();
