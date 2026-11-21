/* games2.js: the shared framework for the newer arcade games (entry screen, match loop, puzzles, undo, AI turns, result),
   plus Quarto and Sim. Engines live in shared.js / engines2.js, so cards, demos, puzzles and matches all use the same rules. */
(function(){
const $=id=>document.getElementById(id);
const Q=ZF.QUARTO, S=ZF.SIM;
const CSS=`
.gx-board{width:100%;display:flex;flex-direction:column;align-items:center}
.gx-legend,.gx-key{font:500 14px var(--font-sans);color:var(--g6)}
.gx-key{display:flex;gap:22px;justify-content:center;margin-top:12px}
.gx-key svg{width:44px;height:10px;vertical-align:middle;margin-right:8px;color:var(--fg)}
.gx-hintnote{max-width:52ch;margin:0 auto 10px;padding:9px 14px;border-radius:12px;background:var(--surf2);font:500 15px/1.4 var(--font-sans);color:var(--g6);text-align:center}
.gx-hintnote b{color:var(--fg)}
.gx-demo{display:flex;flex-direction:column;align-items:center;gap:12px;width:100%}
.gx-demo .gx-note{min-height:3.2em;font:500 clamp(15px,1.2vw,17px)/1.45 var(--font-sans);color:var(--g6);text-align:center;max-width:48ch}
.gx-demo .gx-note b{color:var(--fg)}
.gx-btn{font:500 14px var(--font-sans);background:transparent;border:none;color:var(--g5);cursor:pointer;min-height:36px;padding:8px 10px;border-radius:8px}
.gx-btn:hover,.gx-btn:focus-visible{color:var(--fg);background:var(--surf3)}
.gx-tag{display:inline-flex;font:600 12px var(--font-mono);letter-spacing:.08em;text-transform:uppercase;padding:8px 12px;border-radius:999px;background:var(--surf3);color:var(--g6)}
#gxGame .topbar{flex-wrap:wrap;row-gap:10px}
.gx-warn{font:500 14px/1.45 var(--font-sans);color:var(--g6);margin-top:12px;max-width:46ch;min-height:1.4em}
#gxGame .topbar .modetag{white-space:normal}
.gx-after{display:flex;flex-wrap:wrap;gap:10px;justify-content:center;align-items:center;margin-top:14px}
.gx-after button{min-height:44px;padding:0 20px;border:1px solid var(--fg);border-radius:12px;background:transparent;color:var(--fg);font:600 15px var(--font-sans);cursor:pointer}
.gx-after button.primary{background:var(--fg);color:var(--bg)}
.gx-pz{width:100%;display:flex;flex-direction:column;align-items:center;gap:10px}
.gx-chips{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;max-width:520px}
.gx-chip{min-height:44px;padding:0 16px;border:none;border-radius:12px;background:var(--surf2);color:var(--g6);font:600 15px var(--font-sans);cursor:pointer}
.gx-chip[aria-pressed="true"]{background:var(--fg);color:var(--bg)}
.gx-chip.ok{outline:3px solid var(--fg);outline-offset:2px}
.gx-chip.miss{outline:3px dashed var(--g5);outline-offset:2px}
/* quarto */
.qz{display:flex;gap:clamp(16px,2.6vw,36px);align-items:flex-start;justify-content:center;flex-wrap:wrap;width:100%}
.qz-boardcol{display:flex;flex-direction:column;align-items:center;gap:10px;width:min(100%,470px,calc(100vh - 300px));min-width:270px}
.qz-board{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));grid-template-rows:repeat(4,minmax(0,1fr));gap:6px;padding:6px;background:var(--g4);border-radius:16px;width:100%;aspect-ratio:1/1}
.qz-cell{position:relative;overflow:hidden;border:none;border-radius:11px;background:var(--surf);padding:6% 10%;cursor:pointer;color:var(--fg);display:flex;align-items:center;justify-content:center;min-width:0;min-height:0}
.qz-cell:hover:not(:disabled),.qz-cell:focus-visible{background:var(--surf3)}
.qz-cell:disabled,.qz-pc:disabled{cursor:default;opacity:1}
.qz-cell svg{width:100%;height:100%;display:block;overflow:visible}
.qz-cell .ghost{position:absolute;inset:6% 10%;width:80%;height:88%;opacity:0;pointer-events:none}
.qz-cell:hover:not(:disabled) .ghost,.qz-cell:focus-visible .ghost{opacity:.4}
.qz-cell.win{box-shadow:0 0 0 3px var(--fg);background:var(--surf3)}
.qz-cell.hint{outline:3px dashed var(--fg);outline-offset:-6px}
.qz-cell.threat{box-shadow:0 0 0 3px var(--fg) inset;background:var(--surf3)}
.qz-side{display:flex;flex-direction:column;gap:9px;width:min(100%,300px)}
.qz-offer{display:flex;align-items:center;gap:14px;border:2px solid var(--fg);border-radius:14px;padding:10px 14px;min-height:112px;background:var(--surf2)}
.qz-offer .slot{width:64px;height:88px;flex:none;display:flex;align-items:center;justify-content:center}
.qz-offer .slot.empty{border:2px dashed var(--g4);border-radius:10px}
.qz-offer .slot svg{width:100%;height:100%;display:block;overflow:visible}
.qz-offer .cap{font:600 13.5px/1.35 var(--font-sans);color:var(--g6)}
.qz-offer .cap i{display:block;font:600 10.5px var(--font-mono);letter-spacing:.09em;text-transform:uppercase;color:var(--g5);font-style:normal;margin-bottom:3px}
.qz-offer .cap b{display:block;color:var(--fg);font-size:16px;margin-bottom:2px}
.qz-trayh{font:600 11px var(--font-mono);letter-spacing:.08em;text-transform:uppercase;color:var(--g5);margin-top:2px}
.qz-tray{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:5px;padding:8px;background:var(--surf2);border-radius:14px;transition:opacity .2s}
.qz-tray.wait{opacity:.72}
.qz-tray.on{box-shadow:0 0 0 2px var(--fg)}
.qz-pc{border:none;background:var(--surf);border-radius:9px;padding:5px 6px;color:var(--fg);cursor:pointer;height:66px;min-width:0;display:flex;align-items:center;justify-content:center}
.qz-pc.g2{margin-top:7px}
.qz-pc svg{height:100%;width:auto;max-width:100%;display:block;overflow:visible}
.qz-pc:hover:not(:disabled),.qz-pc:focus-visible{background:var(--surf3);box-shadow:0 0 0 2px var(--fg)}
.qz-pc:disabled{cursor:default}
.qz-pc.gone{background:transparent;border:1.5px dashed var(--g3)}.qz-pc.gone svg{display:none}
.qz-pc.hint{outline:3px dashed var(--fg);outline-offset:-3px}
.qz-pc.bad{box-shadow:0 0 0 3px var(--fg) inset;background:var(--surf3)}
.qz-lab{font:600 14px var(--font-sans);color:var(--fg);min-height:1.5em;text-align:center}
.qz-lab.dim{color:var(--g5);font-weight:500}
.qz-traits{font:500 12.5px/1.5 var(--font-sans);color:var(--g5)}
.qz-winnote{font:600 15px var(--font-sans);color:var(--fg);text-align:center}
/* sim */
.sim{width:min(100%,600px,calc(100vh - 300px));min-width:270px;aspect-ratio:1/1}
.sim svg{width:100%;height:100%;display:block;overflow:visible;color:var(--fg)}
.sim .hit{stroke:transparent;stroke-width:34;fill:none;cursor:pointer;stroke-linecap:round}
.sim .dot{cursor:pointer;fill:var(--bg);stroke:var(--fg);stroke-width:4;transition:fill .12s}
.sim .dot:hover,.sim .dot.sel{fill:var(--fg)}
.sim .e0{stroke:var(--fg);stroke-opacity:.16;stroke-width:2}
.sim .e1{stroke:var(--fg);stroke-width:6;stroke-linecap:round}
.sim .e2{stroke:var(--fg);stroke-width:6;stroke-linecap:round;stroke-dasharray:14 11}
.sim .dim{opacity:.18;transition:opacity .4s}
.sim .tri{fill:var(--fg);fill-opacity:.14}
.sim .hint{stroke:var(--fg);stroke-width:5;stroke-dasharray:3 8;stroke-linecap:round;fill:none;pointer-events:none}
.sim .foe{stroke:var(--fg);stroke-width:5;stroke-dasharray:3 7;stroke-linecap:round;pointer-events:none}
.sim .can{stroke:var(--fg);stroke-opacity:.55;stroke-width:3}
`;
function css(){ if($('gx-css')) return; const st=document.createElement('style'); st.id='gx-css'; st.textContent=CSS; document.head.appendChild(st); }
const rngOf=seed=>{ let s=seed>>>0||1; return ()=>{ s^=s<<13; s>>>=0; s^=s>>>17; s^=s<<5; s>>>=0; return s/4294967296; }; };

/* ---------------- framework ---------------- */
const REG={}; let cur=null, opt={}, M=null, aiTimer=null;
const PKEY='zfx-prefs';
const prefs=()=>{ try{ return JSON.parse(localStorage.getItem(PKEY)||'{}'); }catch(e){ return {}; } };
const savePrefs=(id,o)=>{ const p=prefs(); p[id]=o; try{ localStorage.setItem(PKEY,JSON.stringify(p)); }catch(e){} };
function register(def){ REG[def.id]=def; }
const show=(el,on)=>el.classList.toggle('show',on);
function segButtons(id,list,val,cb){ const el=$(id); el.innerHTML=list.map(([v,l])=>`<button type="button" data-v="${v}">${l}</button>`).join(''); seg(id,val,cb); }
const dl=(d)=>typeof d.diffsFor==='function'?d.diffsFor(opt):d.diffs;
const rulesOf=d=>typeof d.rulesFor==='function'?d.rulesFor(opt):d.rules;

function refreshSetup(){
  const d=cur, ai=opt.opp==='ai', pz=opt.mode==='puzzle';
  $('gxRowMode').style.display=(d.puzzleSets||d.variants)?'flex':'none'; $('gxRowSet').style.display=pz?'flex':'none';
  const cu=!!d.custom; $('gxRowPlayers').style.display=(pz||cu)?'none':'flex'; $('gxRowOpts').style.display=pz?'none':'flex';
  $('gxRowDiff').style.display=(!pz&&ai&&!cu)?'flex':'none'; $('gxRowFirst').style.display=(ai&&!cu&&d.firstChoice!==false)?'flex':'none'; $('gxRowHints').style.display=d.noHints?'none':'flex';
  if(!pz){ const list=dl(d); if(!list.some(x=>x[0]===opt.diff)) opt.diff=list[Math.min(1,list.length-1)][0]; segButtons('gxDiff',list,opt.diff,v=>{ opt.diff=v; if(typeof d.diffNoteFor==='function') $('gxDiffNote').textContent=d.diffNoteFor(opt); }); }
  $('gxDiffNote').textContent=typeof d.diffNoteFor==='function'?d.diffNoteFor(opt):(d.diffNote||'');
  $('gxRules').innerHTML=rulesOf(d); $('gxStart').textContent=pz?'Start puzzles':(d.startLabel||'Start game');
  { let w=$('gxWarn'); if(!w){ w=document.createElement('div'); w.id='gxWarn'; w.className='gx-warn'; w.setAttribute('aria-live','polite'); $('gxStart').insertAdjacentElement('afterend',w); } const msg=(!pz&&d.canStart)?d.canStart(opt):''; w.textContent=msg||''; $('gxStart').disabled=!!msg; }
  if(d.blurbFor) $('gxBlurb').textContent=d.blurbFor(opt);
  if(pz&&d.puzzleSets){ const set=d.puzzleSets.find(x=>x.id===opt.set)||d.puzzleSets[0]; $('gxSetNote').textContent=set.note||''; }
}
/* A fresh entry (card, Play button, arcade listing, or a direct link with no room code) shows the real board at
   rest — default or last-used options, rendered but inert — with the settings dialog (Players/Difficulty/Who
   starts/Hints/Mode, plus a Start game button) open on top. Nothing about the match (AI turns, sounds, undo
   history) exists until start() actually runs, exactly as if the player had pressed Start themselves. */
function showEntryPreview(d){
  ZFA.hideAll(); show($('gxGame'),true); ZF.backdrop&&ZF.backdrop(d.id); $('gxGame').dataset.game=d.id;
  $('gxGameTitle').textContent=d.title.join(' '); $('gxMode').textContent=''; $('gxRulesBody').innerHTML=rulesOf(d);
  $('gxResult').classList.remove('show'); $('gxResult').innerHTML=''; $('gxPz').innerHTML='';
  ['gxUndo','gxRestart','gxHint','gxRetry','gxNext'].forEach(i=>$(i).style.display='none');
  let s=null;
  if(!d.custom && opt.mode!=='puzzle'){ try{ s=d.init(opt); }catch(e){ s=null; } }
  if(s){ M={def:d,opt:{...opt},hist:[s],humanIs:1,assisted:false,hintMove:null,previewOnly:true}; d.render($('gxBoard'), s, ctx()); }
  else { M=null; $('gxBoard').innerHTML=''; }
  $('gxStatus').innerHTML='<span class="who">Press Start game to begin</span>';
  window.ZFShell && ZFShell.ensureStartOverlay('gxGame', ()=>{ const b=$('gxStart'); if(b) b.click(); });
}
/* ---- the newer, non-popup entry screen (games with entryReady:true): settings and a real "try a move" demo
   live on the page, matching 4x4/3D Tic-Tac-Toe and Nim/Chomp. Rolled out one game at a time (see each game's
   own register() call) rather than for every ZFX game at once, so an untested game never regresses to a half-
   wired screen. ---- */
let demoGx=null;
function gxBackToGame(){ ZFA.hideAll(); show($('gxGame'),true); draw(); }
function renderGxSetup(){
  const d=cur;
  const liveOnline = M && M.opt && M.opt.opp==='online' && !M.previewOnly;
  /* a game with variations (Connect Four) picks one in the Mode row; the entry demonstration follows the choice */
  { const lab=$('gxRowMode').querySelector('.glabel'); if(lab) lab.textContent=d.variants?(d.variantLabel||'Variation'):'Mode';
    let vn=$('gxVarNote'); if(!vn){ vn=document.createElement('p'); vn.id='gxVarNote'; vn.className='e-small'; vn.style.margin='8px 0 0'; $('gxRowMode').appendChild(vn); }
    vn.style.display=d.variants?'':'none';
    if(d.variants){ if(!d.variants.some(x=>x[0]===opt.variant)) opt.variant=d.variants[0][0]; const cur=d.variants.find(x=>x[0]===opt.variant); vn.textContent=cur[2]||'';
      const pick=v=>{ opt.variant=v; renderGxSetup(); const demoFn=d.entryDemo||d.demo; if(demoFn&&!(M&&M.opt&&M.opt.opp==='online'&&!M.previewOnly)){ if(demoGx&&demoGx.destroy) demoGx.destroy(); $('gxDemo').innerHTML=''; demoGx=demoFn($('gxDemo'),opt); } };
      /* variantMore: the first variation is the game itself; the others sit under their own small label */
      const main=d.variantMore?d.variants.slice(0,1):d.variants;
      segButtons('gxModeSeg', main.map(x=>[x[0],x[1]]), opt.variant, pick);
      let more=$('gxModeMore');
      if(d.variantMore){ if(!more){ more=document.createElement('div'); more.id='gxModeMore'; more.innerHTML='<div class="glabel" style="margin-top:12px"></div><div class="seg" id="gxModeSeg2"></div>'; $('gxModeSeg').insertAdjacentElement('afterend',more); }
        more.style.display=''; more.querySelector('.glabel').textContent=d.variantMore; segButtons('gxModeSeg2', d.variants.slice(1).map(x=>[x[0],x[1]]), opt.variant, pick); }
      else if(more) more.style.display='none';
      $('gxRowMode').style.display=liveOnline?'none':'flex'; }
    else { const more=$('gxModeMore'); if(more) more.style.display='none'; } }
  if(d.puzzleSets){
    segButtons('gxModeSeg',[['play','Play a match'],['puzzle','Puzzles']],opt.mode,v=>{ opt.mode=v; if(v==='puzzle'&&!opt.set) opt.set=d.puzzleSets[0].id; renderGxSetup(); });
    if(opt.mode==='puzzle') segButtons('gxSetSeg', d.puzzleSets.map(x=>[x.id,x.name]), opt.set||d.puzzleSets[0].id, v=>{ opt.set=v; renderGxSetup(); });
  }
  const oppList=[['ai','Computer'],['2p','Two players']]; if(d.online) oppList.push(['online','Online friend']);
  const oppEl=$('gxOpp'); oppEl.innerHTML=oppList.map(([v,l])=>`<button type="button" data-v="${v}">${l}</button>`).join('');
  oppEl.querySelectorAll('button').forEach(b=>{ const v=b.dataset.v;
    b.classList.toggle('on', liveOnline?v==='online':v===opt.opp);
    b.disabled = liveOnline && v!=='online';
    b.onclick = liveOnline ? null : ()=>{ if(v==='online'){ d.online(); return; } opt.opp=v; renderGxSetup(); };
  });
  $('gxOnlineNote').style.display = liveOnline?'':'none';
  if(liveOnline) $('gxOnlineNote').textContent = `Playing online with ${(M.online&&M.online.opponentNickname)||'your friend'} — use Leave room (below the board) to end this match.`;
  $('gxBackToGame').style.display = liveOnline?'':'none'; $('gxBackToGame').onclick = liveOnline?gxBackToGame:null;
  $('gxOfflineOnly').style.display = liveOnline?'none':'block'; $('gxEDemo').style.display = liveOnline?'none':'block';
  $('gxBlurb').textContent = typeof d.blurbFor==='function'?d.blurbFor(opt):(d.blurb||'');
  if(liveOnline) return;
  segButtons('gxFirst',[['human','You'],['ai','Computer'],['random','Random']],opt.first,v=>{ opt.first=v; });
  { const ex=$('gxExtra'); if(ex){ ex.innerHTML=''; if(d.setupExtra) d.setupExtra(ex); } }
  $('gxHints').setAttribute('aria-checked',!!opt.hints); $('gxHints').onclick=()=>{ opt.hints=!opt.hints; $('gxHints').setAttribute('aria-checked',opt.hints); };
  // A game with its own board/challenge editor (Sim's dot count and rules variant, Domineering's size and holes)
  // must keep that reachable before a match starts too, not just from the live board's toolbar — otherwise moving
  // its Settings off the popup would have silently dropped the one way to reach it pre-game.
  const cinfo = window.ZFShell && ZFShell.gxCustomizeInfo && ZFShell.gxCustomizeInfo();
  // A dialog-based customize (Sim, Notakto) reuses the live board's own popup unchanged. An in-place one
  // (Domineering, The Gold Coin) edits the live #gxGame board directly and assumes that screen is on-screen — not
  // true here — so instead of that function, the entry screen embeds the same d.demo editor Nim's own "Board
  // workshop" uses, inline, writing straight into opt (the draft Start will use) exactly as Nim's does into nimP.
  // optsInline (The Crowded Room, The Last Message): this game's own options ARE its settings -- they render as
  // ordinary rows right here, in Settings, instead of behind a separate "Customize challenge" dialog. Skip the
  // dialog/workshop entirely for these; nothing about them (nor a duplicate settings popup) should exist elsewhere.
  if(d.optsInline){
    // #gxRowOpts is NOT an empty slot -- it's the shared "Game options" group that already holds Who-starts
    // (#gxRowFirst/#gxFirst) and, for other games, Hints. Both are already hidden here (this game sets d.custom
    // and noHints), but the group itself is shared DOM reused by every gx-framework game in this same page, so
    // clearing it outright would permanently destroy another game's Who-starts control the next time it's opened
    // in the same session. Only ever touch rows this code added itself (tagged .gx-opt-inline-row).
    $('gxSetupCustomizeWrap').style.display='none'; $('gxWorkshop').style.display='none';
    const box=$('gxRowOpts'); box.querySelectorAll('.gx-opt-inline-row').forEach(el=>el.remove());
    (d.options||[]).forEach(o=>{ const rowId='gxOptSeg_'+o.key; const row=document.createElement('div'); row.className='grp gx-opt-inline-row';
      row.innerHTML=`<div class="glabel">${o.label}</div><div class="seg" id="${rowId}"></div>`; box.appendChild(row);
      segButtons(rowId,o.values,opt[o.key],v=>{ opt[o.key]=v; if(demoGx&&demoGx.destroy) demoGx.destroy(); $('gxDemo').innerHTML=''; demoGx=d.entryDemo($('gxDemo'),opt); }); });
    refreshSetup(); return;
  }
  const inplace = cinfo && cinfo.kind==='inplace';
  $('gxSetupCustomizeWrap').style.display = (cinfo&&!inplace)?'':'none';
  if(cinfo&&!inplace){ $('gxSetupCustomizeLabel').textContent=cinfo.label; $('gxSetupCustomize').onclick=()=>ZFShell.openGxCustomize(); }
  $('gxWorkshop').style.display = inplace?'':'none';
  if(inplace){ $('gxWorkshop').querySelector('summary').textContent=cinfo.label; $('gxWorkshopBody').innerHTML=''; d.demo($('gxWorkshopBody'), opt); }
  refreshSetup();
}
function openGxSetup(){
  const d=cur;
  ZFA.hideAll(); show($('gxSetup'),true); ZF.backdrop&&ZF.backdrop(d.id); $('gxGame').dataset.game=d.id;
  $('gxTitle').textContent=d.title.join(' ');
  // A genuine fresh entry (M not already live — toSetup()'s online-lock path calls this with the real match still
  // in M, and must never touch it) still needs a previewOnly M: Customize (openGenericGxCustomize/
  // openInplaceGxCustomize) reads and mutates M.opt and, on "Play this board", calls ZFX.newGame()->start() — the
  // same thing showEntryPreview() built one for, just without also rendering it into the (now hidden) #gxGame.
  if(!M && !d.custom && opt.mode!=='puzzle'){ try{ const s=d.init(opt); M={def:d,opt:{...opt},hist:[s],humanIs:1,assisted:false,hintMove:null,previewOnly:true}; }catch(e){ M=null; } }
  renderGxSetup();
  const liveOnline = M && M.opt && M.opt.opp==='online' && !M.previewOnly;
  // entryDemo is the "try a move" teaching panel specifically; .demo is a different, older hook (a live board
  // preview reused by lessons.js and — for at least Domineering — the Customize board editor itself, which is not
  // what belongs here) and is only a safe fallback for games whose .demo genuinely is a real-engine move-and-see demo.
  if(!liveOnline){ const demoFn=d.entryDemo||d.demo; if(demoFn){ $('gxDemo').innerHTML=''; demoGx=demoFn($('gxDemo'), opt); } else { $('gxEDemo').style.display='none'; } }
  $('gxStart').onclick=start;
  (window.gameScrollTo||(el=>el.scrollIntoView({behavior:'smooth',block:'start'})))($('gxSetup'));
}
function open(id,rules,resume){
  const d=REG[id]; if(!d) return; cur=d; css(); if(aiTimer) clearTimeout(aiTimer); M=null;
  opt=Object.assign({mode:'play',opp:'ai',diff:'medium',first:'human',hints:true},d.defaults||{},prefs()[id]||{}); if(!d.puzzleSets) opt.mode='play'; if(d.migrate) d.migrate(opt);
  const hasRoom=new URLSearchParams(location.search).has('room');
  if(resume && !hasRoom && !rules && !d.custom){ const sv=savedFor(d); if(sv){ try{ resumeMatch(d,sv); return; }catch(e){ forget(id); M=null; } } }
  if(hasRoom && d.online){ ZFA.hideAll(); show($('gxGame'),true); ZF.backdrop&&ZF.backdrop(d.id); $('gxGame').dataset.game=d.id; $('gxGameTitle').textContent=d.title.join(' '); $('gxBoard').innerHTML=''; $('gxStatus').innerHTML=''; return; } // the room link's own join-preview/reconnect (online-*.js) owns the rest
  // A fully custom game (Save the Duckie, One More Bridge) has no board/init/render in the normal sense, so it
  // gets a complete bespoke entry screen instead of gxSetup — customSetup owns everything from here.
  if(d.custom && d.customSetup){ d.customSetup(); return; }
  if(d.entryReady){ openGxSetup(); return; }
  showEntryPreview(d);
  window.ZFShell && ZFShell.openEntrySettings && ZFShell.openEntrySettings();
}
/* ---- the active match against the computer (or two on one device) is saved on this device after every accepted move,
   with everything a correct resume needs: the rules version, options (difficulty, who starts), which side the human
   plays and the full move history (so undo still works). Reopening the game, online or offline, continues it. */
const MKEY='zf-match-v1', RULES_V=1;
const matches=()=>{ try{ return JSON.parse(localStorage.getItem(MKEY)||'{}'); }catch(e){ return {}; } };
function persist(){ if(!M||M.previewOnly||M.puzzle||!M.def||M.def.custom||!M.opt||M.opt.opp==='online') return; const all=matches(), id=M.def.id, s=S_();
  if(!s||s.over) delete all[id]; else all[id]={v:RULES_V,rules:M.def.rulesVersion||1,opt:M.opt,humanIs:M.humanIs,assisted:!!M.assisted,hist:M.hist.slice(-400),at:Date.now()};
  try{ localStorage.setItem(MKEY,JSON.stringify(all)); }catch(e){} }
function savedFor(d){ const m=matches()[d.id]; if(!m||m.v!==RULES_V||m.rules!==(d.rulesVersion||1)||!Array.isArray(m.hist)||!m.hist.length) return null; return m; }
function forget(id){ const all=matches(); delete all[id]; try{ localStorage.setItem(MKEY,JSON.stringify(all)); }catch(e){} }
function resumeMatch(d,m){ cur=d; opt=Object.assign({},opt,m.opt); ZFA.hideAll(); $('gxUndo').onclick=undo; $('gxRestart').onclick=restart; show($('gxGame'),true); ZF.backdrop&&ZF.backdrop(d.id); $('gxGame').dataset.game=d.id;
  window.ZFShell && ZFShell.hideStartOverlay && ZFShell.hideStartOverlay('gxGame');
  $('gxResult').classList.remove('show'); $('gxResult').innerHTML=''; $('gxGameTitle').textContent=d.title.join(' '); $('gxRulesBody').innerHTML=rulesOf(d);
  ['gxUndo','gxRestart','gxHint'].forEach(i=>$(i).style.display=''); ['gxRetry','gxNext'].forEach(i=>$(i).style.display='none'); $('gxPz').innerHTML=''; if(d.noHints) $('gxHint').style.display='none';
  M={def:d,opt:{...m.opt},hist:m.hist,humanIs:m.humanIs,assisted:m.assisted,hintMove:null};
  $('gxMode').textContent=(d.modeLabel?d.modeLabel(M.opt)+' · ':'')+(M.opt.opp==='2p'?'two players':`${d.diffLabel?d.diffLabel(M.opt):M.opt.diff} · ${M.opt.hints?'hints on':'hints off'}`);
  $('gxHint').style.display=(M.opt.opp==='ai'&&M.opt.hints&&d.hint)?'':'none';
  draw(); if(window.ZFOffline) ZFOffline.note('Game saved. Continue whenever you’re ready.'); think(); }
function start(){
  if(M && M.opt && M.opt.opp==='online') return; // a stale Start-game overlay/button can outlive entering a room; never let it clobber a live online match
  const d=cur; if(opt.mode!=='puzzle'&&d.canStart&&d.canStart(opt)){ refreshSetup(); return; }   // the same check that disables Start: an invalid board never starts
  savePrefs(d.id,opt); ZFA.hideAll(); $('gxUndo').onclick=undo; $('gxRestart').onclick=restart; show($('gxGame'),true); ZF.backdrop&&ZF.backdrop(d.id); $('gxGame').dataset.game=d.id;
  window.ZFShell && ZFShell.hideStartOverlay('gxGame');
  $('gxResult').classList.remove('show'); $('gxResult').innerHTML=''; $('gxGameTitle').textContent=d.title.join(' '); $('gxRulesBody').innerHTML=rulesOf(d);
  const pz=opt.mode==='puzzle'; ['gxUndo','gxRestart','gxHint'].forEach(i=>$(i).style.display=pz?'none':''); ['gxRetry','gxNext'].forEach(i=>$(i).style.display=pz?'':'none'); $('gxPz').innerHTML=''; if(d.noHints) $('gxHint').style.display='none';
  if(pz){ M={def:d,opt:{...opt},puzzle:{set:d.puzzleSets.find(x=>x.id===opt.set)||d.puzzleSets[0],idx:0,solved:0,done:false},hist:[]}; $('gxMode').textContent='puzzles'; loadPuzzle(); return; }
  if(d.custom){ M={def:d,opt:{...opt},hist:[]}; $('gxMode').textContent=d.modeTag?d.modeTag(opt):''; d.custom(M,{status:$('gxStatus'),board:$('gxBoard'),pz:$('gxPz'),result:$('gxResult'),undo:$('gxUndo'),restart:$('gxRestart')},opt); return; }
  let humanIs=1; if(opt.opp==='ai'){ humanIs=opt.first==='ai'?2:(opt.first==='random'?(Math.random()<.5?1:2):1); }
  const s0=d.init(opt); M={def:d,opt:{...opt},hist:[s0],humanIs,assisted:false,hintMove:null};
  $('gxMode').textContent=(d.modeLabel?d.modeLabel(opt)+' · ':'')+(opt.opp==='2p'?'two players':`${d.diffLabel?d.diffLabel(opt):opt.diff} · ${opt.hints?'hints on':'hints off'}`);
  $('gxHint').style.display=(opt.opp==='ai'&&opt.hints&&d.hint)?'':'none';
  draw(); persist(); window.scrollTo(0,0); think();
}
const S_=()=>M.hist[M.hist.length-1];
const isHuman=s=>M.opt.opp==='2p'||M.def.actor(s)===M.humanIs;
function ctx(){ const s=S_(); const busy=M.previewOnly||(M.opt.opp==='online'&&M.online&&M.online.busy);
  return { human:!s.over&&isHuman(s)&&!busy, humanIs:M.humanIs, opp:M.opt.opp, hintMove:(M.hintFor===s?M.hintMove:null), play, opt:M.opt,
    orientOf: M.online&&M.online.orientOf, colorOf: M.online&&M.online.colorOf, opponentNickname: M.online&&M.online.opponentNickname }; }
function play(move){ const s=S_(); if(s.over||!isHuman(s)) return; if(M.opt.opp==='online'){ if(M.online&&M.online.busy) return; M.online.hook.proposeMove(move); return; } push(move); }
/* sound for an accepted move (silent unless the visitor turned sound on) */
function sfxMove(s,m,n){ const Z=window.ZS; if(!Z) return; const id=M.def.id; let list;
  if(id==='pentago') list=[['wood'],['turn',null,150]]; else if(id==='sim') list=[['pluck',m]];
  else if(id==='c4') list=[];   // Connect Four's own animation plays its sounds when a piece actually lands
  else if(id==='gold') list=m&&m.t==='collect'?[[(s.coins&&s.coins[0]&&s.coins[0].kind==='gold')?'goldchime':'pennycollect']]:[['coinslide',null,110]];
  else list=[['wood']]; list.forEach(([nm,arg,delay])=>delay?setTimeout(()=>Z.play(nm,arg),delay):Z.play(nm,arg)); }
/* two people on one screen: a neutral close (the result names the winner); against the computer, your own result */
function sfxResult(s){ const Z=window.ZS; if(!Z||!M) return; if(!s.winner) return Z.play('draw'); if(M.opt.opp==='2p') return Z.play('roundend'); Z.play(s.winner===M.humanIs?'win':'lose'); }
function push(move){ const s=S_(); const n=M.def.apply(s,move); const note=judge(s,move,n); M.hist.push(n); persist(); sfxMove(s,move,n); M.hintMove=null; M.hintFor=null; M.hintNote=''; draw(); if(note&&window.ZFCoach) ZFCoach.report(note); if(n.over) finish(); else think(); }
/* the guide's word on your move (coach.js): practice against the computer only, from the game's own exact judge when it
   has one, otherwise a one-move look-ahead over its legal moves */
function judge(s,move,n){ if(!window.ZFCoach||ZFCoach.level()==='off'||!M||M.previewOnly||M.puzzle||M.opt.opp!=='ai'||!M.opt.hints||!isHuman(s)) return null;
  try{ const d=M.def; if(d.judge){ const r=d.judge(s,move,n,M.opt); if(r!==undefined) return r; }
    if(!d.legal) return null; return ZFCoach.tactics({s,m:move,n,legal:d.legal,apply:d.apply,actor:d.actor,asMover:d.asMover,mover:d.actor(s)}); }catch(e){ return null; } }
function think(){ if(M.opt.opp==='online') return; const s=S_(); if(s.over||isHuman(s)) return; aiTimer=setTimeout(()=>{ if(!M||S_()!==s) return; const m=M.def.ai(s,M.opt.diff,M.opt);
  /* a def.ai may answer later (a search in a Web Worker); a position that changed meanwhile ignores the answer */
  if(m&&typeof m.then==='function') m.then(x=>{ if(M&&S_()===s&&x) push(x); }); else push(m); },M.def.aiDelay||520); }
function hintNoteEl(){ let n=$('gxHintNote'); if(!n){ n=document.createElement('div'); n.id='gxHintNote'; n.className='gx-hintnote'; n.setAttribute('aria-live','polite'); $('gxBoard').insertAdjacentElement('beforebegin',n); } return n; }
function draw(){ const s=S_(), c=ctx(); $('gxStatus').innerHTML=M.def.status(s,c); { const n=hintNoteEl(); const t=(M.hintFor===s&&M.hintNote)?M.hintNote:''; n.innerHTML=t; n.style.display=t?'':'none'; } M.def.render($('gxBoard'),s,c);
  // a game whose turn spans more than one accepted move (Pentago: place, then rotate) can say a mid-turn position
  // isn't a valid undo target via M.online.canUndo — undefined for every other game, so this changes nothing there.
  $('gxUndo').disabled=M.hist.length<=1 || (M.opt.opp==='online' && M.online && M.online.canUndo && !M.online.canUndo()) || !!(M.def.undoLocked&&M.def.undoLocked(s,M)); }
/* a game can hold the result back until its last move has played out on the board (Connect Four: the disc lands, then
   the gold line is drawn); an undo or a new game in the meantime cancels it */
function finish(){ const s=S_(), wait=M.def.finishDelay?M.def.finishDelay(s):0; if(wait>0){ setTimeout(()=>{ if(M&&!M.previewOnly&&S_()===s) finishNow(); },wait); return; } finishNow(); }
function finishNow(){ const s=S_(); sfxResult(s); const r=M.def.result(s,ctx()); const box=$('gxResult'); box.innerHTML=`<b>${r.title}</b><div>${r.detail}</div><div class="gx-after"><button type="button" id="gxAgain" class="primary">Play again</button></div>`; box.classList.add('show'); $('gxAgain').onclick=restart; }
function undo(){ if(!M||M.hist.length<=1) return; if(M.def.undoLocked&&M.def.undoLocked(S_(),M)) return; if(M.opt.opp==='online'){ M.online.hook.requestUndo(); return; } if(aiTimer) clearTimeout(aiTimer);
  if(M.opt.opp==='2p'){ M.hist.pop(); } else { let i=M.hist.length-2; while(i>0&&M.def.actor(M.hist[i])!==M.humanIs) i--; M.hist.length=i+1; }
  M.assisted=true; M.hintMove=null; M.hintFor=null; M.hintNote=''; $('gxResult').classList.remove('show'); persist(); draw(); think(); if(window.ZS) ZS.play('undo'); }
function restart(){ if(M&&M.opt.opp==='online'){ M.online.hook.requestRestart(); return; } if(aiTimer) clearTimeout(aiTimer); if(M&&M.def) forget(M.def.id); start(); }
function hint(){ const s=S_(); if(!M||s.over||!isHuman(s)||!M.def.hint) return;
  // an online opponent can see the same hint UI a solo player would — never actually compute or reveal a move here,
  // just say why not, the same way a disabled control would if this game's hint button weren't hidden for one.
  if(M.opt.opp==='online'){ M.hintMove=null; M.hintNote="Hints aren't available when playing a friend."; M.hintFor=s; draw(); return; }
  M.assisted=true; const r=M.def.hint(s,M.opt); if(r&&r.__h){ M.hintMove=r.move; M.hintNote=r.note||''; } else { M.hintMove=r; M.hintNote=''; } M.hintFor=s;
  /* the duck says it (the note already explains the consequence, and says when it is advice rather than a proof); the
     board keeps its highlight. Without a note, it says plainly where the suggestion comes from. */
  const said=window.ZF&&ZF.coach&&ZF.coach(M.hintNote||'The highlighted move is the computer’s pick at its strongest setting. It is a suggestion from a search, not a proven best move.');
  if(said) M.hintNote=''; draw(); if(window.ZS) ZS.play('ping'); }
function toSetup(){ if(aiTimer) clearTimeout(aiTimer);
  // An online match's board must never be torn down by open()'s old inert-preview path — but a game that has
  // migrated to the inline entry screen (entryReady) can show its own safe, locked "Players: Online friend" view
  // instead of just refusing the click outright.
  if(M&&M.opt&&M.opt.opp==='online'){ if(cur&&cur.entryReady) openGxSetup(); return; }
  open(cur.id,false);
}

/* ---- puzzles: every item has a valid starting position, an answer the engine checks, an explanation drawn on the board, and a retry ---- */
function loadPuzzle(){ const P=M.puzzle, items=P.set.items(); const it=items[P.idx]; P.item=it; P.state=it.state; P.reveal=null; P.answered=false; P.pick=new Set(); $('gxResult').classList.remove('show'); drawPuzzle(); }
function drawPuzzle(){ const P=M.puzzle, it=P.item, d=M.def; const c={ human:!P.answered, humanIs:1, opp:'2p', hintMove:null, reveal:P.reveal, puzzle:true, play:m=>answerMove(m), opt:M.opt };
  $('gxStatus').innerHTML=`<span class="who">Puzzle ${P.idx+1} of ${P.set.items().length}</span><span class="cond">${it.prompt}</span>`;
  d.render($('gxBoard'),P.state,c); const pz=$('gxPz'); pz.innerHTML='';
  if(P.set.kind==='traits'){ const names=['tall','short','round','square','light','dark','hollow','solid']; pz.innerHTML=`<div class="gx-chips" role="group" aria-label="traits">${names.map(n=>`<button type="button" class="gx-chip${P.reveal?(it.answer.includes(n)?' ok':(P.pick.has(n)?' miss':'')):''}" data-n="${n}" aria-pressed="${P.pick.has(n)}" ${P.answered?'disabled':''}>${n}</button>`).join('')}</div>${P.answered?'':'<button type="button" class="start" id="gxCheck" style="margin-top:6px;min-height:48px;padding:0 32px;font-size:16px">Check answer</button>'}`;
    pz.querySelectorAll('.gx-chip').forEach(b=>b.onclick=()=>{ const n=b.dataset.n; P.pick.has(n)?P.pick.delete(n):P.pick.add(n); b.setAttribute('aria-pressed',P.pick.has(n)); });
    const chk=$('gxCheck'); if(chk) chk.onclick=()=>{ const ok=it.answer.length===P.pick.size&&it.answer.every(a=>P.pick.has(a)); conclude(ok,it.explain(ok,[...P.pick]),it.reveal?it.reveal():null); }; }
  $('gxNext').disabled=!P.answered; }
function answerMove(m){ const P=M.puzzle, it=P.item; if(P.answered) return; const r=it.check(m); if(r.cont){ P.reveal=r.reveal||null; drawPuzzle(); const box=$('gxResult'); box.innerHTML=`<div>${r.explain}</div>`; box.classList.add('show'); return; } conclude(r.ok,r.explain,r.reveal,m); }
function conclude(ok,text,reveal,m){ const P=M.puzzle; P.answered=true; P.reveal=reveal||null; if(ok) P.solved++; P.item.picked=m;
  const last=P.idx>=P.set.items().length-1; drawPuzzle(); const box=$('gxResult'); box.innerHTML=`<b>${ok?'Correct':'Not quite'}</b><div>${text}</div><div class="gx-after"><button type="button" id="gxRetry2">Retry this puzzle</button> ${last?`<span style="color:var(--g5)">${P.solved} of ${P.set.items().length} solved</span> <button type="button" class="primary" id="gxAgain2">Start over</button>`:'<button type="button" class="primary" id="gxNext2">Next puzzle</button>'}</div>`; box.classList.add('show');
  $('gxRetry2').onclick=()=>loadPuzzle(); const nx=$('gxNext2'); if(nx) nx.onclick=nextPuzzle; const ag=$('gxAgain2'); if(ag) ag.onclick=()=>{ P.idx=0; P.solved=0; loadPuzzle(); }; }
function nextPuzzle(){ const P=M.puzzle; if(P.idx<P.set.items().length-1){ P.idx++; loadPuzzle(); } }

/* the computer's move from ai-worker.js (off the main thread), or from ai-core.js directly if no worker can start.
   Resolves with the move; a position that changed meanwhile is ignored by think(). */
let aiW=null, aiSeq=0; const aiWait={};
try{ aiW=new Worker('/ai-worker.js'); aiW.onmessage=e=>{ const r=aiWait[e.data.id]; if(!r) return; delete aiWait[e.data.id]; r(e.data.error?window.ZFAI.choose(r.game,r.state,r.level):e.data.move); }; aiW.onerror=()=>{ aiW=null; }; }catch(e){ aiW=null; }
function askAI(game,state,level){ return new Promise(res=>{ if(!aiW) return setTimeout(()=>res(window.ZFAI.choose(game,state,level)),0);
  const id=++aiSeq; res.game=game; res.state=state; res.level=level; aiWait[id]=res; try{ aiW.postMessage({id,game,state,level}); }catch(e){ delete aiWait[id]; res(window.ZFAI.choose(game,state,level)); } }); }
window.ZFX={ askAI, def:id=>REG[id], pause:()=>{ if(aiTimer) clearTimeout(aiTimer); window.dispatchEvent(new Event('zf-pause')); }, peekSettings:()=>{ if(!M) return; const keep=M; open(cur.id,false); M=keep; $('gxGame').classList.add('show'); }, resume:()=>{ window.dispatchEvent(new Event('zf-resume')); if(M&&M.hist&&M.hist.length&&!S_().over) think(); }, newGame:()=>{ if(!M) return; if(aiTimer) clearTimeout(aiTimer); opt=Object.assign({},opt,M.opt); if(cur.custom) opt.seedNext=undefined; start(); }, refresh:()=>{ if(cur) refreshSetup(); }, register, has:id=>!!REG[id], open, start, ids:()=>Object.keys(REG), current:()=>cur&&cur.id, rngOf, css, H:(move,note)=>({__h:1,move,note}), get M(){ return M; }, $,
  /* Settings and the generic Customize dialog: a live game's own options (M.opt), separate from the setup-screen draft
     (opt). Changing a live option never restarts the match; changing difficulty or the opponent re-decides the very
     next computer move with a freshly cancelled timer, never a stale one. */
  draftOpt:()=>opt, setLive:(patch)=>{ if(!M) return; Object.assign(M.opt,patch); },
  cancelPending:()=>{ if(aiTimer){ clearTimeout(aiTimer); aiTimer=null; } },
  rethink:()=>{ if(!M) return; const s=S_(); if(!s.over) think(); },
  redraw:()=>{ if(M) draw(); },
  /* ---- online play: a live match built and driven entirely by an online-*.js adapter, not by start()/init() ---- */
  setM:(newM)=>{ M=newM; },
  enterLiveView:(id)=>{ const d=REG[id]; if(!d) return; cur=d; css(); if(aiTimer) clearTimeout(aiTimer);
    ZFA.hideAll(); $('gxUndo').onclick=undo; $('gxRestart').onclick=restart; show($('gxGame'),true); ZF.backdrop&&ZF.backdrop(d.id); $('gxGame').dataset.game=d.id;
    // Picking "Online friend" from inside Settings already closes it there, but a direct invite link (which never
    // opens that menu at all) can still leave the entry Settings dialog open, and its own board preview's "Start
    // game" overlay is still wired to start() (a fresh LOCAL match) — both must be gone before a room is live.
    window.ZFShell && ZFShell.closeSettings && ZFShell.closeSettings();
    window.ZFShell && ZFShell.hideStartOverlay('gxGame');
    $('gxGameTitle').textContent=d.title.join(' '); $('gxRulesBody').innerHTML=rulesOf(d);
    ['gxUndo','gxRestart','gxRetry','gxNext'].forEach(i=>$(i).style.display=''); $('gxHint').style.display=d.hint?'':'none'; $('gxRetry').style.display='none'; $('gxNext').style.display='none';
    $('gxPz').innerHTML=''; $('gxResult').classList.remove('show'); $('gxResult').innerHTML=''; },
  // Every online adapter calls showOnlineResult() itself, separately, exactly once per over-transition (guarded by
  // its own prevOver check) -- with real player names, score, Rematch/Change board/Leave room. The generic local
  // finish() (plain "Play again" wired to the offline restart()) must never also run here: a later broadcast for
  // the SAME finished game (e.g. the opponent's rematch request arriving as a fresh 'pending' state, still
  // over:true) re-invoked it unconditionally, silently clobbering the online result popup right after it was
  // correctly shown, with no code path left to restore it.
  applyRemote:(state)=>{ if(!M) return; M.hist.push(state); M.hintMove=null; M.hintFor=null; M.hintNote=''; draw(); if(state.over && M.opt.opp!=='online') finish(); } };
document.addEventListener('DOMContentLoaded',()=>{
  $('gxStart').onclick=start; $('gxUndo').onclick=undo; $('gxRestart').onclick=restart; $('gxHint').onclick=hint; $('gxSettings').onclick=toSetup; $('gxBack').onclick=()=>{ if(aiTimer) clearTimeout(aiTimer); ZFA.toLobby(); };
  $('gxRetry').onclick=()=>M&&M.puzzle&&loadPuzzle(); $('gxNext').onclick=nextPuzzle;
  $('gxRulesBtn').onclick=()=>{ const p=$('gxRulesPanel'); p.open=!p.open; if(p.open) p.scrollIntoView({behavior:'smooth',block:'nearest'}); };
  document.addEventListener('keydown',e=>{ if($('gxGame')&&$('gxGame').classList.contains('show')&&(e.key==='z'||e.key==='Z')&&(e.ctrlKey||e.metaKey)){ e.preventDefault(); undo(); } });
});

/* shared demo scaffolding: a small live board with a coaching line and a reset that starts the exercise over */
function liveDemo(host,{init,render,note,onPlay}){
  ZF.injectCSS(); css(); let st=init(), msg=note.start, extra={};
  host.innerHTML=`<div class="gx-demo"><span class="gx-tag">Try a move</span><div class="gx-dbody" style="width:100%"></div><div class="gx-note" aria-live="polite"></div><button type="button" class="gx-btn" id="gxDReset">↺ Reset</button></div>`;
  const body=host.querySelector('.gx-dbody'), nt=host.querySelector('.gx-note');
  const draw=()=>{ nt.innerHTML=msg; render(body,st,{human:!st.over,humanIs:1,opp:'2p',hintMove:extra.hint,allowed:extra.allowed,play:m=>{ const r=onPlay(st,m); st=r.state; msg=r.msg; extra=r.extra||{}; draw(); },opt:{}}); };
  host.querySelector('#gxDReset').onclick=()=>{ st=init(); msg=note.start; extra=note.extra||{}; draw(); }; extra=note.extra||{}; draw(); }

/* ================= Quarto ================= */
const glyph=(p,cls)=>`<svg viewBox="-2 -2 64 84" class="${cls||''}" aria-hidden="true">${ZF.quartoGlyph(p,0,0,1)}</svg>`;
const pieceName=p=>ZART.qLabel(p);
const TRAIT_NAMES=['tall','short','round','square','light','dark','hollow','solid'];
const hasTrait=(p,n)=>{ const i=TRAIT_NAMES.indexOf(n); const bit=i>>1, first=(i%2===0); return (((p>>bit)&1)===1)===first; };
/* traits a piece could complete a line with right now: a line with three pieces that share a trait and one empty square */
function threats(board,avail){ const out=[]; for(const L of Q.LINES){ const ps=L.map(i=>board[i]); const filled=ps.filter(p=>p>=0), empty=L.filter(i=>board[i]<0); if(filled.length!==3||empty.length!==1) continue; const m=Q.commonMask(filled); for(let b=0;b<4;b++){ if(!(m&(1<<b))) continue; const val=(filled[0]>>b)&1; const name=TRAIT_NAMES[b*2+(val?0:1)]; if(avail.some(p=>hasTrait(p,name))) out.push({line:L,cell:empty[0],trait:name}); } } return out; }
function qAI(s,level){
  const legal=Q.legal(s), pick=a=>a[Math.floor(Math.random()*a.length)];
  const giveScore=(board,avail,p)=>{ let oppBest=0; const rest=avail.filter(x=>x!==p); for(let c=0;c<16;c++){ if(board[c]>=0) continue; const b=board.slice(); b[c]=p; if(Q.winAt(b)) return -99; const k=Q.safePieces(b,rest).length; if(rest.length&&k>oppBest) oppBest=k; } return -oppBest; };
  if(s.phase==='place'){
    const cells=legal.map(m=>m.cell), wins=cells.filter(c=>Q.winsIfPlaced(s.board,s.offered,c));
    if(wins.length&&(level!=='easy'||Math.random()<.7)) return {t:'place',cell:pick(wins)};
    if(level==='easy'||level==='medium') return {t:'place',cell:pick(cells)};
    let best=-1e9,bc=[]; for(const c of cells){ const b=s.board.slice(); b[c]=s.offered; const safe=Q.safePieces(b,s.avail); let sc; if(!s.avail.length) sc=0; else if(!safe.length) sc=-50; else sc=Math.max(...safe.map(p=>giveScore(b,s.avail,p))); if(sc>best){best=sc;bc=[c];} else if(sc===best) bc.push(c); }
    return {t:'place',cell:pick(bc)};
  }
  const safe=Q.safePieces(s.board,s.avail);
  if(level==='easy') return {t:'give',piece:pick(s.avail)};
  if(level==='medium') return {t:'give',piece:pick(safe.length?safe:s.avail)};
  if(!safe.length) return {t:'give',piece:pick(s.avail)};
  let best=-1e9,bp=[]; for(const p of safe){ const sc=giveScore(s.board,s.avail,p); if(sc>best){best=sc;bp=[p];} else if(sc===best) bp.push(p); }
  return {t:'give',piece:pick(bp)};
}
const who=(p,c)=>c.opp==='2p'?`${window.ZFName?ZFName(p):'Player '+(p)}`:(p===c.humanIs?'You':'The computer');
const wins=(p,c)=>(c.opp==='ai'&&p===c.humanIs)?'You win':`${who(p,c)} wins`;
const TRAY_ORDER=(()=>{ const o=[]; for(let r=0;r<4;r++)for(let c=0;c<4;c++){ const tall=r<2, light=r%2===0, round=c<2, hollow=c%2===1; o.push((tall?1:0)|(round?2:0)|(light?4:0)|(hollow?8:0)); } return o; })();
function qRender(host,s,c){ const win=new Set(s.line||[]), hm=c.hintMove, rv=c.reveal||{}; const canPlace=c.human&&s.phase==='place', canGive=c.human&&s.phase==='give';
  const threatCells=new Set(rv.cells||[]), badPieces=new Set(rv.pieces||[]);
  let cells=''; for(let i=0;i<16;i++){ const p=s.board[i]; cells+=`<button type="button" class="qz-cell${win.has(i)?' win':''}${threatCells.has(i)?' threat':''}${hm&&hm.t==='place'&&hm.cell===i?' hint':''}" data-i="${i}" data-p="${p}" ${(canPlace&&p<0)?'':'disabled'} aria-label="row ${Math.floor(i/4)+1} column ${i%4+1}${p>=0?', '+pieceName(p):', empty'}">${p>=0?glyph(p):(canPlace&&s.offered>=0?glyph(s.offered,'ghost'):'')}</button>`; }
  let tray=''; TRAY_ORDER.forEach((p,k)=>{ const there=s.avail.includes(p); tray+=`<button type="button" class="qz-pc${k>=8?' g2':''}${there?'':' gone'}${badPieces.has(p)?' bad':''}${hm&&hm.t==='give'&&hm.piece===p?' hint':''}" data-p="${p}" ${(canGive&&there)?'':'disabled'} aria-label="${there?pieceName(p):'used'}">${there?glyph(p):''}</button>`; });
  let slot,cap; if(s.offered>=0){ slot=`<div class="slot">${glyph(s.offered)}</div>`; cap=`<div class="cap"><i>${canPlace?'In your hand':'In their hand'}</i><b>${canPlace?'Place this piece':'Being placed'}</b>${pieceName(s.offered)}</div>`; }
  else { slot='<div class="slot empty"></div>'; cap=`<div class="cap"><i>${s.over?'Finished':'Nothing in hand'}</i><b>${s.over?(s.winner?'Game over':'Draw'):(canGive?'Choose a piece for your opponent':'Choosing a piece')}</b>${canGive?'Pick one from the tray. They must place it.':''}</div>`; }
  const wn=s.over&&s.winner&&s.line?`<div class="qz-winnote">Four in a row, all ${Q.traitList(s.common,s.board[s.line[0]]).join(' and ')}.</div>`:'';
  host.innerHTML=`<div class="qz"><div class="qz-boardcol"><div class="qz-board" role="grid">${cells}</div>${wn}</div><div class="qz-side"><div class="qz-offer" aria-live="polite">${slot}${cap}</div><div class="qz-trayh">${canGive?'Pieces left · choose one for them':'Pieces left'}</div><div class="qz-tray${canGive?' on':(canPlace?' wait':'')}" role="group" aria-label="remaining pieces">${tray}</div><div class="qz-lab dim" id="qzLab" aria-live="polite">Point at a piece to read its traits.</div><div class="qz-traits">Rows: tall light · tall dark · short light · short dark. Columns: round · round hollow · square · square hollow.</div></div></div>`;
  const lab=host.querySelector('#qzLab'); const say=p=>{ if(p>=0){ lab.textContent=pieceName(p); lab.classList.remove('dim'); } else { lab.textContent='Point at a piece to read its traits.'; lab.classList.add('dim'); } };
  host.querySelectorAll('.qz-cell,.qz-pc').forEach(b=>{ const p=+b.dataset.p; if(p>=0&&!b.classList.contains('gone')){ b.addEventListener('mouseenter',()=>say(p)); b.addEventListener('focus',()=>say(p)); b.addEventListener('mouseleave',()=>say(-1)); b.addEventListener('blur',()=>say(-1)); if(b.classList.contains('qz-cell')) b.title=pieceName(p); } });
  host.querySelectorAll('.qz-cell:not(:disabled)').forEach(b=>b.onclick=()=>c.play({t:'place',cell:+b.dataset.i})); host.querySelectorAll('.qz-pc:not(:disabled)').forEach(b=>b.onclick=()=>c.play({t:'give',piece:+b.dataset.p})); }
/* puzzle positions are found by seeded play and then validated by the engine: the answers are computed, never assumed */
function qPositions(kind,seed,count){ const rng=rngOf(seed), out=[], seen=new Set();
  for(let tries=0;tries<6000&&out.length<count;tries++){ let s=Q.newState(); const plies=(kind==='safe'?10:8)+2*Math.floor(rng()*4); let ok=true;
    for(let k=0;k<plies&&ok;k++){ const mv=Q.legal(s); const m=mv[Math.floor(rng()*mv.length)]; s=Q.apply(s,m); if(s.over) ok=false; }
    if(!ok||s.phase!=='give') continue; const key=s.board.join(','); if(seen.has(key)) continue;
    const bad=s.avail.filter(p=>Q.canWin(s.board,p)), safe=s.avail.filter(p=>!Q.canWin(s.board,p));
    if(kind==='safe'&&bad.length>=2&&safe.length>=2&&s.avail.length<=11){ seen.add(key); out.push(s); }
    if(kind==='traits'){ const th=threats(s.board,s.avail); const names=[...new Set(th.map(t=>t.trait))]; if(names.length>=1&&names.length<=3&&s.avail.length>=6){ seen.add(key); out.push(s); } } }
  return out; }
const quartoSets=[
 { id:'safe', name:'Safe Gift', kind:'move', note:'A position is set. Hand over a piece that cannot win immediately.', items:(()=>{ let cache; return ()=>cache||(cache=qPositions('safe',20240611,3).map(s=>({state:s,prompt:'Which piece can you hand over safely?',
    check(m){ const safe=!Q.canWin(s.board,m.piece); const th=threats(s.board,s.avail); if(safe) return {ok:true,explain:`That piece cannot complete any line. Every square that could finish a line needs a shared trait this piece does not have.`,reveal:{cells:th.map(t=>t.cell)}}; const cells=[]; for(let i=0;i<16;i++) if(s.board[i]<0&&Q.winsIfPlaced(s.board,m.piece,i)) cells.push(i); return {ok:false,explain:`That piece completes a line at the highlighted square${cells.length>1?'s':''}, so your opponent would win at once.`,reveal:{cells,pieces:[m.piece]}}; } }))); })() },
 { id:'traits', name:'Hidden Trait', kind:'traits', note:'Name every trait that would let a piece finish a line.', items:(()=>{ let cache; return ()=>cache||(cache=qPositions('traits',777001,3).map(s=>{ const th=threats(s.board,s.avail); const answer=[...new Set(th.map(t=>t.trait))]; return {state:s,prompt:'Which traits are threatened? Select every one.',answer,
    reveal:()=>({cells:th.map(t=>t.cell)}), explain:(ok)=>`${ok?'Yes':'The threatened traits are'} ${answer.join(', ')}. The highlighted squares each complete a line of three pieces that share ${answer.length>1?'those traits':'that trait'}, so any available piece with ${answer.length>1?'one of them':'it'} wins.`}; })); })() }
];
register({ id:'quarto', title:['Quarto'], blurb:'I choose what you have to play. Place the piece you are handed, then choose one for your opponent.', entryReady:true,
  diffs:[['easy','Easy'],['medium','Medium'],['hard','Hard']], diffNote:'Easy plays at random, Medium takes wins and avoids handing you one, Hard looks two moves ahead (place, hand over, and your best reply). None of them is a perfect solver.',
  rules:`<p>Sixteen pieces, four traits: tall or short, round or square, light or dark, hollow or solid. Every combination exists once. The first player chooses a piece for the second player. From then on each turn has two parts: <b>place</b> the piece you were given on any empty square, then, if nobody has won, <b>choose</b> one remaining piece for your opponent.</p><p>Four in a row (across, down, or either long diagonal) wins if all four share <i>any one</i> trait. The pieces have no owner: the winner is whoever placed the fourth. A full board with no line is a draw. Winning lines are detected automatically. Undo is always available.</p><p><b>Puzzles.</b> Safe Gift and Hidden Trait use positions the engine checks; the answers are computed from the rules.</p>`,
  puzzleSets:quartoSets,
  demo(host){ const P=ZF.preview.quarto;
    liveDemo(host,{ init:()=>Q.clone(P), render:qRender,
      note:{start:'You were given the highlighted piece. <b>Place it</b> to finish a line of four.'},
      onPlay(s,m){ const n=Q.apply(s,m);
        if(m.t==='place'){ if(n.over){ const lst=Q.traitList(n.common,n.board[n.line[0]]); return {state:n,msg:`<b>All four are ${lst.join(' and ')}.</b> That is a win.`}; }
          return {state:n,msg:'Nothing finished. Three hollow pieces still wait in the top row. <b>Choose a piece for your opponent</b>, and keep the hollow ones back.'}; }
        const danger=Q.canWin(n.board,m.piece); return {state:Q.apply(n,{t:'place',cell:Q.legal(n).find(x=>x.t==='place'&&Q.winsIfPlaced(n.board,n.offered,x.cell))?Q.legal(n).find(x=>x.t==='place'&&Q.winsIfPlaced(n.board,n.offered,x.cell)).cell:Q.legal(n).find(x=>x.t==='place').cell}),msg:danger?'<b>That piece completes the row.</b> Your opponent wins with it. Use Reset and try again.':'That piece is safe for now. Careful hands win games.'}; } }); },
  init:()=>Q.newState(), actor:s=>s.turn, apply:(s,m)=>Q.apply(s,m), legal:s=>Q.legal(s), ai:qAI, hint:s=>qAI(s,'hard'),
  status(s,c){ if(s.over) return s.winner?`<span class="who">${who(s.winner,c)} placed the fourth piece</span>`:'<span class="who">Board full: a draw</span>';
    const h=c.human, thinking=`Computer is thinking…`; if(s.phase==='place') return `<span class="who">${h?'Your turn':thinking}</span><span class="cond">${h?'Place the piece you were given':'Placing the piece…'}</span>`; return `<span class="who">${h?'Your turn':thinking}</span><span class="cond">${h?'Choose a piece for your opponent':'Choosing a piece…'}</span>`; },
  render:qRender,
  result(s,c){ if(!s.winner) return {title:'A draw',detail:'The board filled with no line of four sharing a trait.'}; const lst=Q.traitList(s.common,s.board[s.line[0]]); return {title:`${wins(s.winner,c)}`,detail:`All four are ${lst.join(' and ')}.`}; } });

/* ================= Sim ================= */
const simMemo=new Map(); const skey=s=>s.own.reduce((a,v)=>a*3+v,0);
function simWin(s){ if(s.over) return false; const k=skey(s); const m=simMemo.get(k); if(m!==undefined) return m; let res=false; for(const e of S.legal(s)){ if(S.completes(s,e,s.turn)) continue; if(!simWin(S.apply(s,e))){ res=true; break; } } simMemo.set(k,res); return res; }
const safeEdges=s=>S.legal(s).filter(e=>!S.completes(s,e,s.turn));
function simAI(s,level){ const legal=S.legal(s), pick=a=>a[Math.floor(Math.random()*a.length)]; const rev=s.reverse;
  if(rev){ const goal=legal.filter(e=>S.completes(s,e,s.turn)); if(level!=='easy'&&goal.length) return pick(goal); if(level==='easy') return pick(legal);
    const calm=legal.filter(e=>{ const n=S.apply(s,e); return !S.legal(n).some(x=>S.completes(n,x,n.turn)); }); return pick(calm.length?calm:legal); }
  const safe=safeEdges(s); if(level==='easy') return pick(legal); if(!safe.length) return pick(legal); if(level==='medium') return pick(safe);
  if(level==='perfect'&&s.n===6){ const win=safe.filter(e=>!simWin(S.apply(s,e))); if(win.length) return pick(win); return pick(safe); }
  let best=1e9,be=[]; const P=s.turn, g=S.geom(s.n); for(const e of safe){ const n=S.apply(s,e); const oppSafe=safeEdges(n).length; let own=0; for(const t of g.byEdge[e]){ const mine=t.filter(k=>k!==e&&n.own[k]===P).length, theirs=t.filter(k=>k!==e&&n.own[k]===3-P).length; if(mine===1&&theirs===0) own++; }
    const v=-(own*2-oppSafe); if(v<best){best=v;be=[e];} else if(v===best) be.push(e); }
  return pick(be); }
function simPos(n){ const R=210,cx=250,cy=250; return [...Array(n).keys()].map(k=>{ const a=-Math.PI/2+k*2*Math.PI/n; return [cx+R*Math.cos(a),cy+R*Math.sin(a)]; }); }
let simSel=-1, simRedraw=null;
function simRender(host,s,c){ const g=S.geom(s.n), V=simPos(s.n), sty=o=>o===0?'e0':(o===1?'e1':'e2'); const tri=s.tri, inTri=k=>tri&&tri.includes(k), rv=c.reveal||{}; const allowed=c.allowed;
  const ln=(e,cls,extra)=>{ const [a,b]=g.edges[e]; return `<line class="${cls}" x1="${V[a][0].toFixed(1)}" y1="${V[a][1].toFixed(1)}" x2="${V[b][0].toFixed(1)}" y2="${V[b][1].toFixed(1)}" ${extra||''}/>`; };
  let edges='',hits='',fill='',foes=''; const canClick=e=>c.human&&!s.over&&s.own[e]===0&&(!allowed||allowed.includes(e));
  g.edges.forEach((_,e)=>{ const dim=s.over&&!inTri(e); edges+=`<g class="${dim?'dim':''}">${ln(e,sty(s.own[e]))}</g>`; if(canClick(e)) hits+=`<line class="hit" data-e="${e}" x1="${V[g.edges[e][0]][0].toFixed(1)}" y1="${V[g.edges[e][0]][1].toFixed(1)}" x2="${V[g.edges[e][1]][0].toFixed(1)}" y2="${V[g.edges[e][1]][1].toFixed(1)}"><title>edge ${g.edges[e][0]+1}–${g.edges[e][1]+1}</title></line>`; });
  (rv.edges||[]).forEach(e=>foes+=ln(e,'foe'));
  if(tri){ const vs=[...new Set(tri.flatMap(k=>g.edges[k]))]; fill=`<polygon class="tri" points="${vs.map(v=>V[v].join(',')).join(' ')}"/>`; }
  const hm=c.hintMove; const hintEl=(hm!=null&&!s.over)?ln(hm,'hint'):'';
  const dots=V.map(([x,y],i)=>`<circle class="dot${simSel===i?' sel':''}${s.over?' dim':''}" data-v="${i}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="18" ${c.human&&!s.over?'tabindex="0" role="button" aria-label="dot '+(i+1)+'"':''}/>`).join('');
  host.innerHTML=`<div class="sim"><svg viewBox="0 0 500 500" role="group" aria-label="${s.n} dots">${fill}${edges}${foes}${hintEl}${hits}${dots}</svg></div><div class="gx-key"><span><svg viewBox="0 0 44 10"><line x1="2" y1="5" x2="42" y2="5" stroke="currentColor" stroke-width="6" stroke-linecap="round"/></svg>Player 1 · solid</span><span><svg viewBox="0 0 44 10"><line x1="2" y1="5" x2="42" y2="5" stroke="currentColor" stroke-width="6" stroke-linecap="round" stroke-dasharray="12 9"/></svg>Player 2 · dashed</span></div>`;
  const claim=e=>{ simSel=-1; c.play(e); }; const redo=()=>simRender(host,s,c);
  host.querySelectorAll('.hit').forEach(el=>el.onclick=()=>claim(+el.dataset.e));
  host.querySelectorAll('.dot').forEach(el=>{ const act=()=>{ if(!c.human||s.over) return; const v=+el.dataset.v; if(simSel<0){ simSel=v; redo(); } else if(simSel===v){ simSel=-1; redo(); } else { const a=Math.min(simSel,v),b=Math.max(simSel,v); const e=g.edges.findIndex(x=>x[0]===a&&x[1]===b); if(canClick(e)) claim(e); else { simSel=v; redo(); } } }; el.onclick=act; el.onkeydown=ev=>{ if(ev.key==='Enter'||ev.key===' '){ ev.preventDefault(); act(); } }; }); }
function simPuzzles(kind,seed,count){ const rng=rngOf(seed), out=[], seen=new Set();
  for(let tries=0;tries<20000&&out.length<count;tries++){ let s=S.newState(6); const plies=6+Math.floor(rng()*4); let ok=true;
    for(let k=0;k<plies&&ok;k++){ const sf=safeEdges(s); if(sf.length<2){ ok=false; break; } s=S.apply(s,sf[Math.floor(rng()*sf.length)]); }
    if(!ok) continue; const key=s.own.join(''); if(seen.has(key)) continue; const sf=safeEdges(s), emp=S.legal(s);
    if(kind==='only'&&sf.length===1&&emp.length>=4){ seen.add(key); out.push(s); }
    if(kind==='ahead'){ const kill=sf.filter(e=>safeEdges(S.apply(s,e)).length===0); if(kill.length>=1&&kill.length<=2&&sf.length>=3&&emp.length>=5){ seen.add(key); out.push(s); } } }
  return out; }
const simSets=[
 { id:'only', name:'Only Safe Edge', kind:'move', note:'Many edges are open, but only one avoids finishing your own triangle.', items:(()=>{ let c; return ()=>c||(c=simPuzzles('only',424242,3).map(s=>{ const sf=safeEdges(s); const bad=S.legal(s).filter(e=>S.completes(s,e,s.turn)); return {state:s,prompt:`${s.turn===1?'Solid':'Dashed'} to move: which edge is safe?`,
    check(m){ const ok=sf.includes(m.e===undefined?m:m); const e=m; if(sf.includes(e)) return {ok:true,explain:'Yes: every other open edge would close a triangle of your own. This is the only safe edge.',reveal:{edges:bad}}; return {ok:false,explain:'That edge finishes a triangle of your own. The dotted edges are the ones that lose; only one open edge is safe.',reveal:{edges:bad}}; }}; })); })() },
 { id:'ahead', name:'Two Moves Ahead', kind:'move', note:'Choose the safe edge that leaves your opponent no safe reply.', items:(()=>{ let c; return ()=>c||(c=simPuzzles('ahead',9090,2).map(s=>{ const sf=safeEdges(s); const kill=sf.filter(e=>safeEdges(S.apply(s,e)).length===0); return {state:s,prompt:`${s.turn===1?'Solid':'Dashed'} to move: leave your opponent no safe edge.`,
    check(e){ if(kill.includes(e)) return {ok:true,explain:'After that edge every remaining edge would complete a triangle for your opponent, so they must lose next turn.',reveal:{edges:S.legal(S.apply(s,e)).filter(x=>S.completes(S.apply(s,e),x,3-s.turn))}}; const n=S.apply(s,e); return {ok:false,explain:S.completes(s,e,s.turn)?'That edge finishes your own triangle.':'That edge is safe now, but your opponent still has a safe reply. Look for the edge after which none remains.',reveal:{edges:S.legal(n).filter(x=>!S.completes(n,x,n.turn)).slice(0,6)}}; }}; })); })() }
];
register({ id:'sim', title:['Sim'], blurb:'The triangle is the mistake. Claim edges between the dots, and never finish a triangle of your own.', entryReady:true,
  online:()=>{ window.ZFOnlineSim && ZFOnlineSim.open(); },
  defaults:{board:'6',rules:'classic'},
  options:[{key:'board',label:'Board',values:[['6','Six dots'],['7','Seven dots · advanced']]},{key:'rules',label:'Rules',values:[['classic','Classic'],['reverse','Reverse Sim']]}],
  diffsFor:o=>(o.board==='6'&&o.rules==='classic')?[['easy','Easy'],['medium','Medium'],['hard','Hard'],['perfect','Perfect']]:[['easy','Easy'],['medium','Medium'],['hard','Hard']],
  diffNoteFor:o=>(o.board==='6'&&o.rules==='classic')?'Easy claims any edge, Medium avoids finishing its own triangle, Hard also tries to leave you few safe edges. Perfect is a complete exact solver (checked against brute force): it never gives up a won position. Sim on six dots is a win for the second player, so as first player against Perfect you can only hope for a slip.':'Perfect is not offered here: the exact solver covers only classic six-dot Sim. Easy plays at random; Medium and Hard use the same short-range heuristics as the base game, with no guarantee of strong play on this board or rule set.',
  diffLabel:o=>o.diff,
  rulesFor:o=>o.rules==='reverse'?`<p><b>Reverse Sim reverses the objective.</b> Players claim edges between ${o.board} dots as usual (first player solid, second dashed), but the player who first completes a triangle of their own edges <b>wins</b>. There is a separate win check, and the game never ends in a draw. Undo is always available.</p>`:`<p>${o.board==='7'?'Seven':'Six'} dots sit in a ring. Players take turns claiming one unclaimed edge between two dots: the first player draws <b>solid</b> edges, the second <b>dashed</b>. If you complete a triangle whose three edges are all yours, <b>you lose</b> immediately. Only triangles between the dots count; where two edges cross, the crossing is not a dot. An edge can be claimed only once, and there are no draws.</p><p>Click an edge, or click two dots to claim the edge between them. Undo is always available.</p><p><b>Puzzles.</b> Only Safe Edge and Two Moves Ahead positions are checked by the engine.</p>`,
  blurbFor:o=>o.rules==='reverse'?'Reverse Sim: this time the triangle is the goal. Complete one of your own first.':'The triangle is the mistake. Claim edges between the dots, and never finish a triangle of your own.',
  puzzleSets:simSets,
  demo(host){ const P=ZF.preview.sim, geo=S.geom(6);
    liveDemo(host,{ init:()=>S.clone(P.st), render:simRender,
      note:{start:'One edge is missing. <b>Claim it</b> (click the dotted line, or click its two dots). The lines cross in the middle, but crossings are not dots: only triangles between the six dots count.',extra:{hint:P.fatal,allowed:[P.fatal]}},
      onPlay(s,e){ const n=S.apply(s,e); return {state:n,msg:'<b>That closes a triangle of solid edges, so solid loses.</b> Everything else fades and the triangle is shaded. Use Reset to try again.'}; } }); },
  init:o=>S.newState(o.board==='7'?7:6,o.rules==='reverse'), actor:s=>s.turn, apply:(s,e)=>S.apply(s,e), legal:s=>S.legal(s), ai:(s,d)=>askAI('sim',s,d), hint:s=>{ const H=window.ZFX.H, g=S.legal(s), pk=a=>a[Math.floor(Math.random()*a.length)];
    if(s.reverse){ const goal=g.filter(e=>S.completes(s,e,s.turn)); if(goal.length) return H(goal[0],'<b>This edge completes your triangle, and in Reverse Sim that wins.</b>');
      const calm=g.filter(e=>{ const n=S.apply(s,e); return !S.legal(n).some(x=>S.completes(n,x,n.turn)); });
      if(calm.length) return H(pk(calm),'No triangle of yours can be completed yet. This edge does not hand your opponent one to complete. Reverse Sim has no exact solver, so this is a suggestion, not a proof.');
      return H(pk(g),'Every open edge lets your opponent complete a triangle first, so this position is probably lost.'); }
    const safe=safeEdges(s);
    if(!safe.length) return H(pk(g),'<b>Every open edge completes a triangle of your own, so this position is lost.</b> The hint can only show a legal edge.');
    if(s.n===6){ const win=safe.filter(e=>!simWin(S.apply(s,e))); if(win.length) return H(pk(win),'<b>Winning edge.</b> An exact solver checked every reply.');
      return H(pk(safe),'<b>No winning edge exists from here.</b> Against best play this position is lost. This edge is safe for now and makes them work for it.'); }
    return H(simAI(s,'hard'),'A safe edge (it does not finish your triangle). Seven-dot Sim has no exact solver, so this is a heuristic suggestion.'); },
  status(s,c){ if(s.over) return `<span class="who">${who(s.reverse?s.winner:3-s.winner,c)} completed a triangle</span>`; const p=s.turn; return `<span class="who">${c.human?'Your turn':`Computer is thinking…`}</span><span class="cond">${p===1?'solid edges':'dashed edges'}${s.reverse?' · triangle wins':''}</span>`; },
  render:simRender,
  result(s,c){ if(s.reverse) return {title:`${wins(s.winner,c)}`,detail:`${who(s.winner,c)} completed a triangle of ${s.winner===1?'solid':'dashed'} edges first.`}; const loser=3-s.winner; return {title:`${wins(s.winner,c)}`,detail:`${who(loser,c)} completed a triangle of ${loser===1?'solid':'dashed'} edges, so ${loser===c.humanIs&&c.opp==='ai'?'you lose':'that player loses'}.`}; } });
})();
