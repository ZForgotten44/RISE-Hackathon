/* origins.js: the optional "Origins & stories" space beside each game, like a small illustrated field guide.
   Opened only by its own button (never automatically). It never touches the match: the board stays visible and playable.
     wide screens (>= 1180px): a docked right-hand panel; the game area makes room for it
     narrower desktops/tablets: the same panel as an overlay (the board is not squeezed)
     phones (<= 640px): a bottom sheet with its own scrolling reading area; the page underneath does not move
   Three sections: Where it comes from · How people play · Sources & credits. A section appears only once it is published
   in origins-data.js and has content; until then the panel says plainly that nothing is published yet.
   ?origins=preview shows the layout with obvious placeholders (never history) so the design can be reviewed. */
(function(){
const DATA=()=>window.ZF_ORIGINS||{};
const PREVIEW=/[?&]origins=preview\b/.test(location.search);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeUrl=u=>/^(https?:)?\/\//i.test(u||'')||/^\/[^/]/.test(u||'')?u:'';
const BOOK='<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 6.5C10.3 5.2 7.9 4.6 4 4.6v13.3c3.9 0 6.3.6 8 1.9 1.7-1.3 4.1-1.9 8-1.9V4.6c-3.9 0-6.3.6-8 1.9Z"/><path d="M12 6.5v13.3"/></svg>';
const PIN='<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-6.5-6.1-6.5-11A6.5 6.5 0 0 1 18.5 10c0 4.9-6.5 11-6.5 11Z"/><circle cx="12" cy="10" r="2.3"/></svg>';
const X_='<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';

const CSS=`
.zo-trigger{display:inline-flex;align-items:center;gap:7px;min-height:40px;padding:0 12px;border:1px solid var(--g3);border-radius:12px;background:transparent;color:var(--g6);font:600 13.5px var(--font-sans);cursor:pointer}
.zo-trigger:hover,.zo-trigger:focus-visible{color:var(--fg);border-color:var(--g5)}
.zo-trigger:focus-visible{outline:2px solid var(--fg);outline-offset:2px}
.zo-trigger[aria-expanded="true"]{color:var(--fg);border-color:var(--fg)}
.gtools .zo-trigger{min-height:44px;margin-left:2px}.zo-trigger .zo-s{display:none}
@media (max-width:440px){.zo-trigger .zo-l{display:none}.zo-trigger .zo-s{display:inline}.gtools .zo-trigger{padding:0 10px}}
#zfOrigins{--zo-w:clamp(340px,27vw,400px);position:fixed;z-index:96;right:0;top:var(--zo-top,0px);bottom:0;width:var(--zo-w);display:flex;flex-direction:column;background:var(--bg);color:var(--fg);border-left:1px solid var(--g3);transform:translateX(102%);visibility:hidden;transition:transform .22s cubic-bezier(.3,.8,.3,1),visibility 0s .22s}
#zfOrigins.open{transform:none;visibility:visible;transition:transform .22s cubic-bezier(.3,.8,.3,1)}
#zfOriginsScrim{position:fixed;inset:0;z-index:95;background:rgba(0,0,0,.28);opacity:0;visibility:hidden;transition:opacity .2s,visibility 0s .2s}
html.zo-overlay #zfOriginsScrim.open{opacity:1;visibility:visible;transition:opacity .2s}
html.zo-docked .wrap{padding-right:calc(5vw + var(--zo-w-px));transition:padding-right .22s}
.zo-head{display:flex;align-items:center;gap:10px;padding:14px 14px 12px 20px;border-bottom:1px solid var(--g2);flex:none}
.zo-head h2{flex:1;margin:0;font:700 17px/1.25 var(--font-sans);letter-spacing:-.01em}
.zo-head h2 small{display:block;font:600 11px var(--font-mono);letter-spacing:.09em;text-transform:uppercase;color:var(--g5);margin-bottom:3px}
.zo-close{display:inline-flex;align-items:center;justify-content:center;width:44px;height:44px;border:none;border-radius:12px;background:transparent;color:var(--g6);cursor:pointer}
.zo-close:hover,.zo-close:focus-visible{background:var(--surf2);color:var(--fg)}
.zo-body{flex:1;overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;padding:8px 20px 36px}
.zo-sec{padding:22px 0 8px;border-bottom:1px solid var(--g2)}.zo-sec:last-child{border-bottom:none}
.zo-sec h3{margin:0 0 14px;font:600 11.5px var(--font-mono);letter-spacing:.09em;text-transform:uppercase;color:var(--g5)}
.zo-body p{margin:0 0 14px;font:400 15.5px/1.65 var(--font-sans);color:var(--g7)}
.zo-fig{margin:0 0 16px}.zo-fig img{display:block;width:100%;height:auto;border-radius:12px;background:var(--surf2)}
.zo-fig figcaption{margin-top:6px;font:500 12px/1.4 var(--font-sans);color:var(--g5)}
.zo-ph{display:flex;align-items:center;justify-content:center;aspect-ratio:4/3;border-radius:12px;border:1px dashed var(--g4);color:var(--g5);font:500 13px var(--font-sans);text-align:center;padding:12px}
.zo-places{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 14px}
.zo-place{display:inline-flex;align-items:center;gap:5px;padding:5px 10px;border-radius:999px;background:var(--surf2);font:600 12.5px var(--font-sans);color:var(--g6)}
.zo-names{margin:0 0 14px;padding:0;list-style:none}.zo-names li{font:500 14.5px/1.5 var(--font-sans);color:var(--g7)}.zo-names b{color:var(--fg)}.zo-names span{color:var(--g5)}
.zo-note{font:500 13px/1.5 var(--font-sans);color:var(--g5);border-left:2px solid var(--g3);padding:2px 0 2px 10px;margin:0 0 14px}
.zo-vars{display:flex;flex-direction:column;gap:10px;margin:0 0 16px}
.zo-var{border:1px solid var(--g3);border-radius:12px;padding:12px 14px}
.zo-var h4{margin:0;font:700 15px var(--font-sans);color:var(--fg)}.zo-var .zo-vp{display:block;margin:2px 0 6px;font:600 12px var(--font-sans);color:var(--g5)}
.zo-var p{margin:0;font-size:14.5px;line-height:1.55}
.zo-explore{margin-top:10px;display:inline-flex;align-items:center;gap:6px;min-height:40px;padding:0 12px;border:1px solid var(--g4);border-radius:10px;background:transparent;color:var(--fg);font:600 13.5px var(--font-sans);cursor:pointer}
.zo-explore:hover,.zo-explore:focus-visible{border-color:var(--fg)}
.zo-mini{margin-top:12px;border:1px solid var(--g3);border-radius:12px;padding:10px;overflow:hidden}
.zo-mini .ze-stage{min-height:0}.zo-mini .ze-note{font-size:14px}
.zo-mini-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;font:600 12px var(--font-mono);letter-spacing:.06em;text-transform:uppercase;color:var(--g5)}
.zo-mini-head button{border:none;background:transparent;color:var(--g6);font:600 13px var(--font-sans);min-height:36px;padding:0 8px;border-radius:8px;cursor:pointer}
.zo-rules{border-radius:12px;background:var(--surf2);padding:12px 14px;margin:0 0 14px}
.zo-rules b{display:block;font:700 14px var(--font-sans);color:var(--fg);margin-bottom:4px}.zo-rules p{margin:0;font-size:14.5px}
.zo-badge{display:inline-block;margin:0 0 8px;padding:3px 9px;border-radius:999px;border:1px solid var(--g4);font:700 11px var(--font-mono);letter-spacing:.06em;text-transform:uppercase;color:var(--g6)}
.zo-links{margin:0 0 14px;padding:0;list-style:none;display:flex;flex-direction:column;gap:10px}
.zo-links a{font:600 15px/1.4 var(--font-sans);color:var(--fg);text-decoration:underline;text-underline-offset:3px;text-decoration-color:var(--g4)}
.zo-links a:hover{text-decoration-color:currentColor}.zo-links span{display:block;font:500 13px var(--font-sans);color:var(--g5)}
.zo-sub{margin:4px 0 8px;font:700 13px var(--font-sans);color:var(--fg)}
.zo-list{margin:0 0 14px;padding-left:18px;font:400 14.5px/1.6 var(--font-sans);color:var(--g7)}
.zo-empty{padding:28px 0;text-align:left}.zo-empty p{color:var(--g6)}
.zo-banner{margin:14px 0 0;padding:10px 12px;border-radius:10px;border:1px dashed var(--g4);font:600 12.5px/1.4 var(--font-sans);color:var(--g6)}
.zo-offline{font:500 12.5px var(--font-sans);color:var(--g5)}
@media (max-width:640px){
  #zfOrigins{--zo-w:100%;top:auto;left:0;right:0;width:100%;max-height:82dvh;height:82dvh;border-left:none;border-top:1px solid var(--g3);border-radius:20px 20px 0 0;transform:translateY(102%);padding-bottom:env(safe-area-inset-bottom)}
  #zfOrigins.open{transform:none}
  .zo-head{padding:6px 10px 10px 18px;position:relative}
  .zo-head::before{content:"";position:absolute;left:50%;top:6px;width:38px;height:4px;margin-left:-19px;border-radius:2px;background:var(--g3)}
  .zo-head h2{padding-top:12px}
}
@media (prefers-reduced-motion:reduce){#zfOrigins,#zfOriginsScrim,html.zo-docked .wrap{transition:none!important}}
html.zo-docked .gtools{max-width:100%}
`;
let panel=null, scrim=null, body=null, opener=null, slugOpen=null, minis=[];
function css(){ if(document.getElementById('zo-css')) return; const s=document.createElement('style'); s.id='zo-css'; s.textContent=CSS; document.head.appendChild(s); }
const mode=()=>matchMedia('(max-width:640px)').matches?'sheet':matchMedia('(min-width:1180px)').matches?'docked':'overlay';
function build(){ if(panel) return; css();
  scrim=document.createElement('div'); scrim.id='zfOriginsScrim'; scrim.addEventListener('click',close); document.body.appendChild(scrim);
  panel=document.createElement('aside'); panel.id='zfOrigins'; panel.setAttribute('aria-labelledby','zoTitle'); panel.setAttribute('aria-hidden','true'); panel.tabIndex=-1;
  panel.innerHTML=`<div class="zo-head"><h2 id="zoTitle" tabindex="-1"><small>Origins &amp; stories</small><span id="zoName"></span></h2><button type="button" class="zo-close" aria-label="Close Origins and stories">${X_}</button></div><div class="zo-body" id="zoBody"></div>`;
  document.body.appendChild(panel); body=panel.querySelector('#zoBody'); panel.querySelector('.zo-close').addEventListener('click',close);
  document.addEventListener('keydown',e=>{ if(e.key==='Escape'&&panel.classList.contains('open')){ e.stopPropagation(); close(); } },true);
  addEventListener('resize',()=>{ if(panel.classList.contains('open')) layout(); }); }
function layout(){ const m=mode(), h=document.querySelector('header'); const top=(m==='sheet'||!h)?0:Math.max(0,h.getBoundingClientRect().bottom);
  panel.style.setProperty('--zo-top',top+'px'); const root=document.documentElement;
  root.classList.toggle('zo-docked',m==='docked'); root.classList.toggle('zo-overlay',m!=='docked');
  root.style.setProperty('--zo-w-px',m==='docked'?panel.getBoundingClientRect().width+'px':'0px');
  scrim.classList.toggle('open',m!=='docked'); panel.setAttribute('role',m==='docked'?'complementary':'dialog'); if(m==='docked') panel.removeAttribute('aria-modal'); else panel.setAttribute('aria-modal','false'); }

/* ---- the three sections ---- */
const has=a=>Array.isArray(a)&&a.length;
function fig(im){ if(!im) return ''; if(im.placeholder) return `<figure class="zo-fig"><div class="zo-ph">${esc(im.placeholder)}</div>${im.credit?`<figcaption>${esc(im.credit)}</figcaption>`:''}</figure>`;
  const src=safeUrl(im.src); if(!src) return ''; const cu=safeUrl(im.creditUrl);
  return `<figure class="zo-fig"><img src="${esc(src)}" alt="${esc(im.alt||'')}" loading="lazy" decoding="async">${im.credit?`<figcaption>${cu?`<a href="${esc(cu)}" target="_blank" rel="noopener noreferrer">${esc(im.credit)}</a>`:esc(im.credit)}</figcaption>`:''}</figure>`; }
const paras=a=>(a||[]).map(t=>`<p>${esc(t)}</p>`).join('');
function secWhere(d,g){ const w=d.where; if(!w||!w.published) return ''; const names=has(d.names)?`<ul class="zo-names">${d.names.map(n=>`<li><b lang="${esc(n.langCode||'')}">${esc(n.text)}</b>${n.translit?` <span>(${esc(n.translit)})</span>`:''}${n.language?` <span>· ${esc(n.language)}</span>`:''}${n.note?` <span>· ${esc(n.note)}</span>`:''}</li>`).join('')}</ul>`:'';
  const tr=d.siteTitleIsTranslation?`<p class="zo-note">“${esc(g)}” is this site’s English title, not a traditional name.</p>`:'';
  const places=has(w.places)?`<div class="zo-places">${w.places.map(p=>`<span class="zo-place">${PIN}${esc(p.label)}${p.community?` · ${esc(p.community)}`:''}</span>`).join('')}</div>`:'';
  const inner=fig(w.image)+places+names+tr+paras(w.intro)+(w.uncertain?`<p class="zo-note">${esc(w.uncertain)}</p>`:''); if(!inner.trim()) return '';
  return `<section class="zo-sec" aria-labelledby="zoS1"><h3 id="zoS1">Where it comes from</h3>${inner}</section>`; }
function secPlay(d){ const p=d.play; if(!p||!p.published) return '';
  const vars=has(p.variants)?`<div class="zo-vars">${p.variants.map((v,i)=>`<div class="zo-var"><h4>${esc(v.name)}</h4>${v.place?`<span class="zo-vp">${esc(v.place)}</span>`:''}${v.summary?`<p>${esc(v.summary)}</p>`:''}${v.explore&&EXPLORE[v.explore.game]?`<button type="button" class="zo-explore" data-ex="${i}" aria-expanded="false">Explore this board</button><div class="zo-mini" id="zoMini${i}" hidden></div>`:''}</div>`).join('')}</div>`:'';
  const r=p.siteRules; const rules=r?`<div class="zo-rules">${r.reconstructed?'<span class="zo-badge">Reconstructed rules</span>':''}<b>Rules on this site${r.version?` · ${esc(r.version)}`:''}</b>${r.summary?`<p>${esc(r.summary)}</p>`:''}${r.note?`<p class="zo-note" style="margin:8px 0 0">${esc(r.note)}</p>`:''}</div>`:'';
  const inner=fig(p.image)+vars+rules; if(!inner.trim()) return '';
  return `<section class="zo-sec" aria-labelledby="zoS2"><h3 id="zoS2">How people play</h3>${inner}</section>`; }
function secSources(d){ const s=d.sources; if(!s||!s.published) return '';
  const links=has(s.links)?`<ul class="zo-links">${s.links.map(l=>{ const u=safeUrl(l.url); return `<li>${u?`<a href="${esc(u)}" target="_blank" rel="noopener noreferrer">${esc(l.title||u)}</a>`:`<b>${esc(l.title)}</b>`}${l.publisher||l.note?`<span>${esc([l.publisher,l.note].filter(Boolean).join(' · '))}</span>`:''}</li>`; }).join('')}</ul><p class="zo-offline" data-zo-offline hidden>Source websites need a connection.</p>`:'';
  const credits=has(s.imageCredits)?`<p class="zo-sub">Images</p><ul class="zo-list">${s.imageCredits.map(c=>`<li>${esc(c)}</li>`).join('')}</ul>`:'';
  const people=has(s.contributors)?`<p class="zo-sub">With thanks to</p><ul class="zo-list">${s.contributors.map(c=>{ const u=safeUrl(c.url); return `<li>${u?`<a href="${esc(u)}" target="_blank" rel="noopener noreferrer">${esc(c.name)}</a>`:esc(c.name)}${c.role?` · ${esc(c.role)}`:''}</li>`; }).join('')}</ul>`:'';
  const unc=has(s.uncertainty)?`<p class="zo-sub">What we’re not sure about</p><ul class="zo-list">${s.uncertainty.map(c=>`<li>${esc(c)}</li>`).join('')}</ul>`:'';
  const inner=links+credits+people+unc; if(!inner.trim()) return '';
  return `<section class="zo-sec" aria-labelledby="zoS3"><h3 id="zoS3">Sources &amp; credits</h3>${inner}</section>`; }

/* ---- "Explore this board": a separate miniature that never touches the active match ---- */
const EXPLORE={
  nim:(host,c)=>window.ZFEntry&&ZFEntry.mount('nim',host,{get:()=>({piles:(c.piles||[3,4,5]).map(x=>BigInt(x)),misere:!!c.misere})}),
  chomp:(host,c)=>window.ZFEntry&&ZFEntry.mount('chomp',host,{get:()=>({len:c.len||[5,5,5,5],C:c.C||5})}),
  'recursive-tic-tac-toe':host=>window.ZFEntry&&ZFEntry.mount('ult',host),
};
['gold-coin:gold','pentago:pentago','notakto:notakto','toot-otto:toot','sim:sim'].forEach(x=>{ const [slug,id]=x.split(':');
  EXPLORE[slug]=(host,c)=>{ const d=window.ZFX&&ZFX.def(id); const f=d&&(d.entryDemo||d.demo); if(f) f(host,Object.assign({mode:'play',opp:'2p'},d.defaults||{},c.opt||{})); }; });
function wireExplore(d){ body.querySelectorAll('.zo-explore').forEach(b=>b.addEventListener('click',()=>{ const i=+b.dataset.ex, v=d.play.variants[i], box=document.getElementById('zoMini'+i); const on=b.getAttribute('aria-expanded')!=='true';
  b.setAttribute('aria-expanded',String(on)); b.textContent=on?'Hide this board':'Explore this board'; box.hidden=!on;
  if(on&&!box.dataset.ready){ box.dataset.ready='1'; box.innerHTML=`<div class="zo-mini-head"><span>Example board · not your game</span></div><div class="zo-mini-stage"></div>`; try{ EXPLORE[v.explore.game](box.querySelector('.zo-mini-stage'),v.explore); }catch(e){ box.querySelector('.zo-mini-stage').textContent='This example could not load.'; } } })); }

/* layout preview with obvious placeholders: for reviewing the design only, never shown without ?origins=preview */
function previewEntry(slug){ return { names:[{text:'[Original name]',language:'[Language]',translit:'[transliteration]'}], siteTitleIsTranslation:true,
  where:{published:true,image:{placeholder:'[One image or illustration]',credit:'[Image credit]'},places:[{label:'[Place]',community:'[Community]'}],intro:['[A short, source-supported introduction: two or three sentences.]','[A second short paragraph, if the sources support it.]'],uncertain:'[What the sources leave uncertain.]'},
  play:{published:true,variants:[{name:'[Local version A]',place:'[Where]',summary:'[How this version differs, in one or two sentences.]',explore:{game:slug}},{name:'[Local version B]',place:'[Where]',summary:'[How this version differs.]'}],siteRules:{version:'[Rules version]',summary:'[The exact rules this site plays.]',reconstructed:true,note:'[Why the rules had to be reconstructed.]'}},
  sources:{published:true,links:[{title:'[Source title]',url:'https://example.org/',publisher:'[Publisher, year]'}],imageCredits:['[Image credit and licence]'],contributors:[{name:'[Contributor]',role:'[What they shared]'}],uncertainty:['[An open question about this game’s history.]']} }; }

function render(slug){ const g=(window.ZF&&ZF.GAMES||[]).find(x=>x.slug===slug); const name=g?g.name:slug; panel.querySelector('#zoName').textContent=name;
  const d=PREVIEW?previewEntry(slug):(DATA()[slug]||{}); const html=secWhere(d,name)+secPlay(d)+secSources(d);
  body.innerHTML=(PREVIEW?'<p class="zo-banner">Layout preview. Everything in brackets is a placeholder, not history.</p>':'')+(html||`<div class="zo-empty"><p>The history of ${esc(name)} hasn’t been published here yet.</p><p>When it is, you’ll find where the game comes from, how people play it, and every source, right here beside the board.</p></div>`);
  if(html) wireExplore(d); const off=body.querySelector('[data-zo-offline]'); if(off) off.hidden=navigator.onLine!==false; }
function open(slug,trigger){ build(); opener=trigger||document.activeElement; slugOpen=slug; render(slug); layout();
  panel.classList.add('open'); panel.setAttribute('aria-hidden','false'); document.querySelectorAll('.zo-trigger').forEach(b=>b.setAttribute('aria-expanded','true'));
  requestAnimationFrame(()=>panel.querySelector('#zoTitle').focus({preventScroll:true})); }
function close(){ if(!panel||!panel.classList.contains('open')) return; panel.classList.remove('open'); panel.setAttribute('aria-hidden','true'); scrim.classList.remove('open');
  const root=document.documentElement; root.classList.remove('zo-docked','zo-overlay'); root.style.setProperty('--zo-w-px','0px');
  document.querySelectorAll('.zo-trigger').forEach(b=>b.setAttribute('aria-expanded','false'));
  setTimeout(()=>{ if(panel&&!panel.classList.contains('open')) body.innerHTML=''; },260);   // drops any miniature board
  if(opener&&document.contains(opener)&&opener.offsetParent!==null) opener.focus({preventScroll:true}); opener=null; }
const toggle=(slug,t)=>panel&&panel.classList.contains('open')&&slugOpen===slug?close():open(slug,t);
const slugNow=()=>location.pathname.replace(/^\/+|\/+$/g,'').split('/')[0];
/* the quiet entry button, made once per game toolbar by shell.js, next to How to play */
function button(){ css(); const b=document.createElement('button'); b.type='button'; b.className='zo-trigger'; b.setAttribute('aria-expanded','false'); b.setAttribute('aria-controls','zfOrigins');
  b.setAttribute('aria-label','Origins and stories'); b.innerHTML=`${BOOK}<span class="zo-l">Origins &amp; stories</span><span class="zo-s" aria-hidden="true">Origins</span>`; b.addEventListener('click',()=>toggle(slugNow(),b)); return b; }
window.ZFOrigins={open,close,toggle,button,EXPLORE};
})();
