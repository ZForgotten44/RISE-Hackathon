/* Walks every game's rules tutorial from both doors: the entry page's "Learn how to play" and the in-game Rules button.
   Checks both open the same steps, plays "Show me" on each step, checks the consequence note appears, that Skip practice
   is offered while practice remains, and that closing returns to the entry page (no match started) or to the live game
   with its position kept. Load on any arcade page, then: await __lessons()   (or await __lessons(['nim','sim'])) */
window.__lessons=async function(only){
 const sleep=ms=>new Promise(r=>setTimeout(r,ms)); const $=id=>document.getElementById(id); const out=[]; const errs=[]; window.addEventListener('error',e=>errs.push(e.message));
 const open=()=>$('gdrawer').classList.contains('open');
 const titles=async()=>{ const body=$('gdrawer'), c=document.querySelector('#gdrawer .ls-count'); if(!c) return []; const t=[]; const total=+c.textContent.split(' of ')[1];
   for(let i=0;i<total;i++){ t.push(body.querySelector('.ls-title').textContent); if(i<total-1){ $('lsNext').click(); await sleep(200); } } return t; };
 for(const g of ZF.GAMES.filter(x=>!only||only.includes(x.slug))){ if(window.ZFA&&ZFA.toLobby) ZFA.toLobby(); await sleep(200); history.pushState({},'','/'+g.slug); window.dispatchEvent(new PopStateEvent('popstate')); await sleep(700);
  const R={slug:g.slug};
  /* door 1: the entry page */
  const entry=document.querySelector('section.entry.show'), learn=entry&&entry.querySelector('.e-learn'); R.learnButton=!!learn;
  if(learn){ learn.click(); await sleep(400); R.entryOpened=open(); R.entrySteps=await titles(); $('gdClose').click(); await sleep(300);
    R.entryClosedToEntry=!open()&&entry.classList.contains('show')&&!['game','nimGame','chGame','gxGame'].some(id=>$(id).classList.contains('show')); R.entryState=entry.id+':'+['game','nimGame','chGame','gxGame'].filter(id=>$(id).classList.contains('show')).join(','); }
  /* door 2: in play */
  const start=entry&&$({setup:'startBtn',nimSetup:'nStart',chSetup:'cStart',gxSetup:'gxStart'}[entry.id]); if(start){ start.click(); await sleep(700); }
  const root=['game','nimGame','chGame','gxGame'].map($).find(e=>e.classList.contains('show')); R.game=!!root; if(!root){ out.push(R); continue; }
  const movesBefore=(root.id==='gxGame'&&ZFX.M&&ZFX.M.hist)?ZFX.M.hist.length:null;
  root.querySelector('.gtools .gt[data-label="How to play"],.gtools .gt[data-label="Rules"]').click(); await sleep(400); const body=$('gdrawer'); R.lesson=!!document.querySelector('#gdrawer .ls-count'); R.steps=[];
  if(R.lesson){ const total=+document.querySelector('#gdrawer .ls-count').textContent.split(' of ')[1];
    for(let i=0;i<total;i++){ const S={n:document.querySelector('#gdrawer .ls-count').textContent,title:body.querySelector('.ls-title').textContent,stage:$('lsStage').children.length,skip:!$('lsSkip').hidden};
      const sh=$('lsShow'); if(getComputedStyle(sh).display!=='none'&&!sh.hidden&&sh.textContent!=='Play it again'){ sh.click(); await sleep(1500); } else await sleep(1500);
      S.note=$('lsNote').innerText.slice(0,70); S.done=$('lsStage').classList.contains('done'); R.steps.push(S); if(i<total-1){ $('lsNext').click(); await sleep(250); } }
    R.sameTutorial=!R.entrySteps||JSON.stringify(R.entrySteps)===JSON.stringify(R.steps.map(s=>s.title)); }
  $('gdClose').click(); await sleep(400); R.closed=!open(); R.gameKept=root.classList.contains('show')&&(movesBefore===null||ZFX.M.hist.length===movesBefore); out.push(R); }
 return JSON.stringify({out,errs},null,0); };
