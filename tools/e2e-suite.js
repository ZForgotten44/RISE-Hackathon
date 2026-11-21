/* In-browser play test used during development. Load it on any game page and run:  await __suite('nim')
   It makes a legal move, uses Undo, opens/closes Rules and Settings, toggles Invert, checks keyboard focus and touch press-and-hold,
   restarts, and applies settings from the slim panel. It returns a JSON report. */
window.__suite=async function(slug){
 const sleep=ms=>new Promise(r=>setTimeout(r,ms)), $=id=>document.getElementById(id), ck=e=>e.dispatchEvent(new MouseEvent('click',{bubbles:true}));
 const R={slug,path:location.pathname}; const errs=[]; window.addEventListener('error',e=>errs.push(e.message));
 await sleep(1500); const root=['game','nimGame','chGame','gxGame'].map($).find(e=>e.classList.contains('show')); R.entered=!!root&&location.pathname==='/'+slug; if(!root){ R.errs=errs; return JSON.stringify(R); }
 const T=l=>l==='Settings'?root.querySelector('.gtools .gt'):root.querySelector('.gtools .gt[data-label="'+l+'"]'); R.tools=[...root.querySelectorAll('.gtools .gt:not([hidden])')].map(b=>b.dataset.label+(b.disabled?'(off)':'')).join(',');
 const isGx=root.id==='gxGame';
 const moves=()=>{ if(isGx&&ZFX.M&&ZFX.M.hist) return ZFX.M.hist.length; if(root.id==='game') return match.snaps.length; return null; };
 const sig=()=>root.querySelector('.stage').innerText.length+'|'+root.querySelectorAll('svg circle,.tok,.tile.gone,.cell.filled,.qz-cell svg,.tt-cell.f,.zdt,.crp').length;
 const s0=sig(), m0=moves(); const S=slug;
 if(S==='4x4-tic-tac-toe'){ ck(document.querySelector('#b4 .cell:not(.filled)')); }
 else if(S==='recursive-tic-tac-toe'){ ck(document.querySelector('#bu .mini.active .cell:not(.filled), #bu .cell:not(.filled)')); }
 else if(S==='3d-tic-tac-toe'){ $('vFlat').click(); await sleep(200); ck(document.querySelector('#flat .cell:not(.filled)')); }
 else if(S==='nim'){ ck(document.querySelector('#nBoard .tok:not(.column)')); }
 else if(S==='chomp'){ ck(document.querySelector('#cBoard button.tile')); await sleep(300); const c=[...document.querySelectorAll('#cSelPanel button')].find(b=>b.textContent==='confirm'); if(c) c.click(); }
 else if(S==='quarto'){ ck(document.querySelector('#gxBoard .qz-pc:not(:disabled)')); }
 else if(S==='sim'){ ck(document.querySelector('#gxBoard .hit')); }
 else if(S==='pentago'){ ck(document.querySelector('#gxBoard .pgcell')); }
 else if(S==='toot-otto'){ ck(document.querySelector('#gxBoard .tt-cell.hit')); }
 else if(S==='domineering'){ ck(document.querySelector('#gxBoard .dmhit[tabindex="0"]')); }
 else if(S==='notakto'){ ck(document.querySelector('#gxBoard .c[tabindex]')); }
 else if(S==='crowded-room'){ ck($('crGo')); }
 else if(S==='last-message'){ ck($('lmSend')); }
 else if(S==='gold-coin'){ const c=document.querySelector('#gxBoard .coin[tabindex]'); c.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,button:0,pointerType:'mouse'})); c.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,button:0,pointerType:'mouse'})); await sleep(50); const d=[...document.querySelectorAll('#gxBoard .dest')].find(x=>x.style.display!=='none'); if(d) ck(d); else document.getElementById('gcTake').click(); }
 await sleep(1800); R.moved=(m0!==null?moves()>m0:sig()!==s0); R.m=m0+'->'+moves();
 const u=T('Undo'); R.undo=u&&!u.hidden?(u.disabled?'disabled':'enabled'):'not offered'; if(u&&!u.hidden&&!u.disabled){ const b4=moves(); u.click(); await sleep(700); R.undoWorked=b4===null?true:moves()<b4; }
 T('Rules').click(); await sleep(300); R.rulesOpen=$('gdrawer').classList.contains('open')&&$('gdBody').innerText.length>20; $('gdClose').click(); await sleep(300); R.rulesClosed=!$('gdrawer').classList.contains('open');
 const su=root.id==='game'?$('setup'):root.id==='nimGame'?$('nimSetup'):root.id==='chGame'?$('chSetup'):$('gxSetup'); const mB=moves();
 const det=root.querySelector('.setupbelow');
 T('Settings').click(); await sleep(500); R.panel=!!det&&det.open&&!!det.querySelector('.e-ctl'); R.gameUnder=root.classList.contains('show'); R.setupHidden=!su.classList.contains('show'); R.panelH=det?Math.round(det.getBoundingClientRect().height):0; T('Settings').click(); await sleep(400); R.panelClosed=!det||!det.open; R.ctlReturned=!!su.querySelector('.e-ctl'); R.stateKept=mB===null?true:moves()===mB;
 const inv0=document.documentElement.dataset.inv; document.querySelector('.themesw').click(); await sleep(300); R.invert=inv0+'->'+document.documentElement.dataset.inv; R.gameStillShown=root.classList.contains('show'); document.querySelector('.themesw').click(); await sleep(200);
 R.keyboard=(()=>{ const b=T('Rules'); b.focus(); return 'focus='+(document.activeElement===b); })();
 const hb=T('Rules'); hb.dispatchEvent(new PointerEvent('pointerdown',{pointerType:'touch',bubbles:true})); await sleep(520); R.touchHold=hb.classList.contains('hold'); hb.dispatchEvent(new PointerEvent('pointerup',{pointerType:'touch',bubbles:true})); hb.click(); await sleep(200); R.holdSuppressedClick=!$('gdrawer').classList.contains('open'); await sleep(1500);
 T('Restart').click(); await sleep(800); R.restart=moves()===null?true:moves()<=1||moves()<=m0+1;
 T('Settings').click(); await sleep(500); const st=det&&det.querySelector('.start'); R.applyLabel=st&&st.textContent; if(st&&!st.disabled){ st.click(); await sleep(900); R.applied=!det.open&&root.classList.contains('show'); } else if(det){ det.open=false; R.applied='start disabled'; } else R.applied='no panel for this game';
 R.errs=errs; return JSON.stringify(R); };
