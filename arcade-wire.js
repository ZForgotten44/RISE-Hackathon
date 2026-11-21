
/* lobby + routes: /arcade is the catalogue, /nim, /quarto, /toot-otto ... open a game directly (and /nim#rules opens its rules).
   A card or a pasted link starts the game at once with the last-used (or default) settings; the settings icon reopens setup over the live board. */
(function(){
  const $=ZFA.$;
  const SLUG={}, ID={}; ZF.GAMES.forEach(g=>{ SLUG[g.id]=g.slug; ID[g.slug]=g.id; });
  const START={setup:'startBtn',nimSetup:'nStart',chSetup:'cStart',gxSetup:'gxStart'};
  const SETUPS=['setup','nimSetup','chSetup','gxSetup'], GAMESEC=['game','nimGame','chGame','gxGame'];
  const shown=()=>SETUPS.map($).find(e=>e.classList.contains('show'));
  const activeId=()=>{ if($('setup').classList.contains('show')||$('game').classList.contains('show')) return cur.game; if($('nimSetup').classList.contains('show')||$('nimGame').classList.contains('show')) return 'nim'; if($('chSetup').classList.contains('show')||$('chGame').classList.contains('show')) return 'chomp'; if($('gxSetup').classList.contains('show')||$('gxGame').classList.contains('show')) return ZFX.current(); return null; };
  /* Opening a game never auto-starts play: every one of these shows its own inert board preview with a settings
     dialog on top (Player mode / difficulty / who starts / Start game) — see games2.js's showEntryPreview,
     arcade-games.js's nimEnterFresh/chEnterFresh. A room code in the URL is the one exception: the online-*.js
     adapter for that game owns the whole flow (join preview or reconnect), so no local dialog opens on top of it. */
  const open=(id,rules)=>{
    if(window.ZFX&&ZFX.has(id)) ZFX.open(id,false,true); else if(id==='nim') ZFA.nimRoute(); else if(id==='chomp') ZFA.chRoute(); else if(!(id==='ult'&&window.__ultResume&&__ultResume())) openSetup(id);
    if(rules) setTimeout(()=>ZFShell.openRules(),120); };
  const routeId=()=>{ const seg=location.pathname.replace(/^\/+|\/+$/g,'').split('/')[0]; return ID[seg]||null; };
  /* old links (arcade.html#nim, arcade.html#nim/rules) are upgraded in place: same page, address rewritten, no redirect */
  const legacy=()=>{ if(routeId()) return; const m=location.hash.replace(/^#/,'').split('/'); if(SLUG[m[0]]) history.replaceState(null,'','/'+SLUG[m[0]]+(m[1]==='rules'?'#rules':'')); };
  const norm=p=>p.replace(/\/+$/,'').replace(/\.html$/,'');
  let quiet=false;
  /* the music file changes on the moment of *entering* a game (see music.js's ZMusic.enterGame) -- once per
     distinct game id, not on every route() re-run (toggling #rules on the same game, or the settings dialog,
     never re-triggers it). Leaving a game back to the lobby never counts, only arriving at one does -- which
     is why this only fires in the `if(id)` branch. music.js itself remembers which game the music belongs to
     across page loads, so a fresh load landing on a game (already switched before its audio was created) or a
     reload of the same game makes this call a no-op there. */
  let lastGameId=null;
  const route=()=>{ quiet=true; legacy(); const id=routeId();
    if(id){ open(id,location.hash==='#rules'); if(id!==lastGameId){ lastGameId=id; if(window.ZMusic&&ZMusic.enterGame) ZMusic.enterGame(); } }
    else { ZFA.toLobby(); lastGameId=null; }
    document.documentElement.classList.remove('zf-route');   // routed: the list may show from now on (back to /arcade)
    setTimeout(()=>{ quiet=false; sync(); },0); };
  const nameOf=id=>{ const g=ZF.GAMES.find(x=>x.id===id); return g?g.name:''; };
  /* a game's own page keeps its written title and About section while that game is open; opening another game from the
     list (same page, new address) hides the About section and uses the short title */
  const ABOUT=$('aboutGame'), PAGE={slug:ABOUT?ABOUT.dataset.slug:'arcade',title:document.title};
  const sync=()=>{ if(quiet) return; const id=activeId(); const want=id?'/'+SLUG[id]:'/arcade'; if(norm(location.pathname)!==want) history.pushState({},'',want);
    const here=(id?SLUG[id]:'arcade')===PAGE.slug; if(ABOUT) ABOUT.hidden=!here; document.title=here?PAGE.title:(id?nameOf(id):'Arcade')+' · Z Forgotten Games'; };
  /* browsing All Games. The entrance is three short rows so the cards start high: the Games heading with search beside
     it; who is playing (All games · 1 player · 2 players · Group) with a Category menu and More filters (the connection:
     Same device or Online friends) on the right; then one results line. A phone stacks it as heading, search, the
     player row, and a Filters button whose bottom sheet holds Category and Connection. A game belongs to every choice
     its real modes allow (see modes in shared.js). The player, connection and category choices are remembered, the
     search isn't. */
  const PLAYERS=[['all','All games','All'],['1','1 player','Solo'],['2','2 players','2 players']],
    VIA=[['any','Any'],['local','Same device'],['online','Online friends']],
    CATS=[['all','All'],['strategy','Strategy']];
  const st={q:'',p:'all',via:'any',cat:'all'};
  try{ const v=JSON.parse(localStorage.getItem('zf-browse')||'{}'); if(PLAYERS.some(x=>x[0]===v.p)) st.p=v.p; if(VIA.some(x=>x[0]===v.via)) st.via=v.via; if(CATS.some(x=>x[0]===v.cat)) st.cat=v.cat; }catch(e){}
  const normQ=t=>String(t).toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g,'').replace(/(\d)\s*[×x]\s*(?=\d)/g,'$1 x ').replace(/[^a-z0-9]+/g,' ').trim();
  const hay={}; ZF.GAMES.forEach(g=>{ hay[g.id]=' '+normQ([g.name,g.rule,g.keywords,g.tags.join(' '),g.tags.includes('stories')?'theory':'',g.mode||'',g.players].join(' '))+' '; });
  /* every word must match the start of a word in the title, premise or keywords, so "tic tac toe" and "friends" work and "duc" still finds ducks */
  const matchQ=(g,q)=>{ const w=normQ(q).split(' ').filter(Boolean); return w.every(x=>hay[g.id].includes(' '+x)||hay[g.id].includes(' '+x.replace(/s$/,''))); };
  const matchP=g=>st.p==='all'||(st.p==='1'&&g.modes.solo)||(st.p==='group'&&g.modes.group)||(st.p==='2'&&(g.modes.local||g.modes.online));
  const matchVia=g=>st.via==='any'||(st.via==='local'?g.modes.local:g.modes.online);
  const label=(list,k)=>list.find(x=>x[0]===k)[1];
  const chev='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 10 5 5 5-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const xIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7l10 10M17 7 7 17" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>';
  const opts=(list,key,cls)=>list.map(([k,l])=>`<button type="button" class="${cls||''}" data-${key}="${k}" aria-pressed="false">${l}</button>`).join('');
  /* row 1: the search joins the heading */
  const top=document.querySelector('.zf-top');
  const search=document.createElement('label'); search.className='zf-search';
  search.innerHTML=`<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M15.5 15.5 21 21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg><input type="search" id="zfSearch" placeholder="Search games" aria-label="Search games" autocomplete="off" spellcheck="false" enterkeyhint="search">`;
  top.appendChild(search);
  /* rows 2 and 3 */
  const bar=document.createElement('div'); bar.className='zf-browse';
  bar.innerHTML=`<div class="zf-filters">
      <div class="zf-chips zf-players" role="group" aria-label="Players">${PLAYERS.map(([k,l,s])=>`<button type="button" data-p="${k}" aria-pressed="false"><span class="lg">${l}</span><span class="sm" aria-hidden="true">${s}</span></button>`).join('')}</div>
      <div class="zf-side">
        <button type="button" class="zf-pill zf-filterbtn" aria-haspopup="dialog" aria-controls="zfSheet">Filters<span class="zf-n" hidden></span></button>
        <div class="zf-tags" aria-label="Active filters"></div>
        <div class="zf-dd" data-dd="cat"><button type="button" class="zf-pill zf-ddbtn" aria-expanded="false" aria-controls="zfCatMenu"><span class="zf-ddl"></span>${chev}</button>
          <div class="zf-menu" id="zfCatMenu" role="group" aria-label="Category" hidden>${opts(CATS,'cat','zf-opt')}</div></div>
        <div class="zf-dd" data-dd="more"><button type="button" class="zf-pill zf-ddbtn" aria-expanded="false" aria-controls="zfMoreMenu"><span class="zf-ddl">More filters</span><span class="zf-n" hidden></span>${chev}</button>
          <div class="zf-menu" id="zfMoreMenu" hidden><div class="zf-glabel" id="zfViaL">Connection</div><div class="zf-optrow" role="group" aria-labelledby="zfViaL">${opts(VIA,'via','zf-opt')}</div></div></div>
      </div>
    </div>
    <div class="zf-active" aria-live="polite"><span class="zf-count"></span><button type="button" class="zf-clear" hidden>Clear filters</button></div>
    <dialog class="zf-sheet" id="zfSheet" aria-labelledby="zfSheetT"><div class="zf-sheet-in">
      <div class="zf-sheet-h"><h2 id="zfSheetT">Filters</h2><button type="button" class="zf-x" data-close aria-label="Close filters">${xIcon}</button></div>
      <div class="zf-glabel" id="zfCatL2">Category</div><div class="zf-optrow" role="group" aria-labelledby="zfCatL2">${opts(CATS,'cat','zf-opt')}</div>
      <div class="zf-glabel" id="zfViaL2">Connection</div><div class="zf-optrow" role="group" aria-labelledby="zfViaL2">${opts(VIA,'via','zf-opt')}</div>
      <div class="zf-sheet-f"><button type="button" class="zf-clear zf-sheet-clear">Clear</button><button type="button" class="zf-show" data-close></button></div>
    </div></dialog>`;
  const grid=$('zfgrid'); grid.parentNode.insertBefore(bar,grid);
  const empty=document.createElement('p'); empty.className='zf-empty'; empty.hidden=true; empty.innerHTML='No games match. <button type="button" class="zf-clear">Clear filters</button>'; grid.parentNode.insertBefore(empty,grid.nextSibling);
  const q=search.querySelector('#zfSearch'), sheet=bar.querySelector('.zf-sheet'), dds=[...bar.querySelectorAll('.zf-dd')];
  const plural=n=>n===1?'1 game':n+' games';
  const apply=()=>{
    bar.querySelectorAll('[data-p]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.p===st.p));
    bar.querySelectorAll('[data-via]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.via===st.via));
    bar.querySelectorAll('[data-cat]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.cat===st.cat));
    const catBtn=bar.querySelector('[data-dd="cat"] .zf-ddbtn'), moreBtn=bar.querySelector('[data-dd="more"] .zf-ddbtn');
    catBtn.querySelector('.zf-ddl').innerHTML=`Category: <b>${label(CATS,st.cat).replace(/&/g,'&amp;')}</b>`; catBtn.classList.toggle('set',st.cat!=='all');
    const mn=moreBtn.querySelector('.zf-n'); mn.hidden=st.via==='any'; mn.textContent='1';
    /* the choices tucked into a menu or the sheet stay visible as removable tags (a phone shows the category here too) */
    const tags=[]; if(st.cat!=='all') tags.push(['cat',label(CATS,st.cat)]); if(st.via!=='any') tags.push(['via',label(VIA,st.via)]);
    bar.querySelector('.zf-tags').innerHTML=tags.map(([k,l])=>`<button type="button" class="zf-tag" data-k="${k}" aria-label="Remove filter: ${l.replace(/&/g,'&amp;')}">${l.replace(/&/g,'&amp;')}${xIcon}</button>`).join('');
    const fn=bar.querySelector('.zf-filterbtn .zf-n'); fn.hidden=!tags.length; fn.textContent=tags.length; bar.querySelector('.zf-filterbtn').setAttribute('aria-label',tags.length?`Filters, ${tags.length} active`:'Filters');
    let n=0; ZF.GAMES.forEach(g=>{ const card=grid.querySelector(`.gcard[data-id="${g.id}"]`); if(!card) return; const ok=matchP(g)&&matchVia(g)&&(st.cat==='all'||g.tags.includes(st.cat))&&(!st.q||matchQ(g,st.q)); card.hidden=!ok; if(ok) n++; });
    const on=!!st.q.trim()||st.p!=='all'||st.via!=='any'||st.cat!=='all', total=ZF.GAMES.length;
    bar.querySelector('.zf-count').textContent=on?`${n} of ${total} games`:plural(total);
    bar.querySelector('.zf-active .zf-clear').hidden=!on; empty.hidden=n>0;
    bar.querySelector('.zf-show').textContent=n?'Show '+plural(n):'No games match';
    try{ localStorage.setItem('zf-browse',JSON.stringify({p:st.p,via:st.via,cat:st.cat})); }catch(e){} };
  /* Category and More filters open small menus under their buttons; one at a time, closed by a pick, Escape or a click elsewhere */
  const closeDDs=except=>dds.forEach(d=>{ if(d===except) return; d.querySelector('.zf-ddbtn').setAttribute('aria-expanded','false'); d.querySelector('.zf-menu').hidden=true; d.classList.remove('open'); });
  const toggleDD=d=>{ const open=d.querySelector('.zf-ddbtn').getAttribute('aria-expanded')!=='true'; closeDDs(d); d.querySelector('.zf-ddbtn').setAttribute('aria-expanded',open); d.querySelector('.zf-menu').hidden=!open; d.classList.toggle('open',open);
    if(open){ const sel=d.querySelector('.zf-opt[aria-pressed=true]')||d.querySelector('.zf-opt'); sel.focus(); } };
  bar.addEventListener('click',e=>{ const t=e.target.closest('button'); if(!t) return;
    const dd=t.closest('.zf-dd');
    if(t.classList.contains('zf-ddbtn')) return toggleDD(dd);
    if(t.dataset.p) st.p=t.dataset.p;
    else if(t.dataset.via) st.via=t.dataset.via;
    else if(t.dataset.cat) st.cat=t.dataset.cat;
    else if(t.classList.contains('zf-tag')){ if(t.dataset.k==='cat') st.cat='all'; else st.via='any'; }
    else if(t.classList.contains('zf-filterbtn')){ closeDDs(); sheet.showModal(); const f=sheet.querySelector('.zf-opt[aria-pressed=true]'); if(f) f.focus(); return; }
    else if(t.hasAttribute('data-close')) return sheet.close();
    else if(t.classList.contains('zf-clear')) return t.classList.contains('zf-sheet-clear')?(st.cat='all',st.via='any',apply()):clear();
    else return;
    apply();
    if(dd&&dd.dataset.dd==='cat'){ closeDDs(); dd.querySelector('.zf-ddbtn').focus(); } });
  document.addEventListener('click',e=>{ if(!e.target.closest('.zf-dd')) closeDDs(); });
  bar.addEventListener('keydown',e=>{ if(e.key!=='Escape') return; const d=e.target.closest('.zf-dd'); if(d&&d.classList.contains('open')){ e.preventDefault(); closeDDs(); d.querySelector('.zf-ddbtn').focus(); } });
  /* the sheet closes on a tap outside it, too */
  sheet.addEventListener('click',e=>{ if(e.target===sheet) sheet.close(); });
  sheet.addEventListener('close',()=>bar.querySelector('.zf-filterbtn').focus());
  matchMedia('(max-width:640px)').addEventListener('change',e=>{ if(!e.matches&&sheet.open) sheet.close(); closeDDs(); });
  const clear=()=>{ st.q=''; q.value=''; st.p='all'; st.via='any'; st.cat='all'; apply(); };
  empty.querySelector('.zf-clear').addEventListener('click',clear);
  q.addEventListener('input',()=>{ st.q=q.value; apply(); });
  q.addEventListener('keydown',e=>{ if(e.key==='Escape'&&q.value){ e.preventDefault(); q.value=''; st.q=''; apply(); } });
  ZF.renderGrid($('zfgrid'),{num:false,onOpen:(g,kind)=>{ history.pushState({},'',g.link+(kind==='rules'?'#rules':'')); route(); }});
  apply();
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',route); else route();
  addEventListener('popstate',route);
  /* the header's Create room / Join room shortcuts belong to All Games; a game's own page keeps its own room controls */
  { const home=$('home'), mark=()=>document.body.classList.toggle('in-game',home.style.display==='none'); mark(); new MutationObserver(mark).observe(home,{attributes:true,attributeFilter:['style']}); }
  /* the illustrated backdrop belongs to the game, not the screen: the same artwork stays put from the entry screen into
     play (ZF.backdrop keeps it when the id is unchanged, so starting a match never fades it out and back in) */
  const backdrop=()=>{ const on=shown()||GAMESEC.some(g=>$(g).classList.contains('show')); ZF.backdrop(on?activeId():null); };
  const back=$('backLink');
  const syncBack=()=>{ const inGame=!!activeId(); back.textContent=inGame?'← Back to games':'← Home'; back.setAttribute('href',inGame?'/arcade':'/'); };
  back.addEventListener('click',e=>{ if(activeId()){ e.preventDefault(); if(!ZFShell.back()) ZFA.toLobby(); } });
  const mo=new MutationObserver(()=>{ backdrop(); syncBack(); sync(); }); SETUPS.concat(GAMESEC).forEach(i=>mo.observe($(i),{attributes:true,attributeFilter:['class']})); backdrop(); syncBack();
})();
