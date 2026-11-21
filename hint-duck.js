/* hint-duck.js: Mansy's duck delivering a hint, a rule or a word on the game. One duck and one bubble, built as a single
   fixed unit: the bubble is a child of the same box as the duck, so the two always appear, move and leave together.
   - The duck is the shared guide vector (ZPDuck.guide: author-duck.png with its pupils, highlights and blink lids drawn
     in the same SVG, plus the mood faces), the same asset as the lessons, the trainer and the computer opponent. The
     picture is decoded before anything shows, so a message never appears without its duck, or the duck without eyes.
   - The duck is the larger of the two: its face reads first, and the bubble beside it stays compact (one or two short
     sentences; anything longer goes behind "Explain"). The font is never shrunk to make room.
   - It enters from one of several safe spots (left, right, lower left, lower right, and the upper corners when those
     are clear), chosen from what is on screen: never over the hinted move, the board controls, the score or the timer.
     It avoids repeating the last spot when another safe one exists. Phones take the clearest spot, for readability.
   - One instance. A new hint while one is up swaps the words in place (the duck nods); it never stacks a second duck,
     and a stale request that arrives late is dropped.
   - The unit sits in the corner or edge that covers the least of what matters: the hinted cell, the controls, the board.
     It is position:fixed, so it never moves the board or anything else on the page.
   - It stays until it is closed (×, Escape), replaced, or the caller's `until` settles (usually: a move on the board),
     and at least long enough to read. Pointer over it or focus in it keeps it up.
   - It adds no sound of its own (the Hint button already plays one, and two would stack), so it reads the same muted.
   - A hint is short: one or two sentences. Any reasoning goes after "<!--more-->" and waits behind "Explain"; a longer
     text without that marker is split after its second sentence.
   - opts.mood ('happy', 'surprised', 'nod', 'frustrated', 'cheeky') shows that face on the guide while it speaks.
   - Reduced motion: opacity only. Hidden means hidden: no click area is left behind.
   ZFHintDuck.show({html|t, acts:[fn]}, {until:Promise, stay:true, keep:selector, mood}) -> Promise<boolean shown>
   ZFHintDuck.hide()   ZFHintDuck.visible   ZFHintDuck.ready() (decodes the picture early) */
(function(){
'use strict';
const IMG='/author-duck.png', RATIO=346/330;
const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const CSS=`
#zfHint{position:fixed;left:0;top:0;z-index:62;display:flex;align-items:flex-start;gap:4px;pointer-events:none;visibility:hidden;opacity:0;transform:translate3d(var(--x,0),var(--y,0),0);transition:opacity .16s ease,visibility 0s .16s}
#zfHint.on{visibility:visible;opacity:1;pointer-events:auto;transition:opacity .16s ease}
#zfHint.right{flex-direction:row-reverse}
#zfHint.low{align-items:flex-end}
/* duck and bubble enter together, from the side the unit sits on (from below for the lower spots) */
#zfHint .zh-in{display:flex;align-items:inherit;flex-direction:inherit;gap:inherit;transform:translate(var(--ix,-18px),var(--iy,0));transition:transform .26s cubic-bezier(.2,.9,.3,1.12)}
#zfHint.right .zh-in{--ix:18px}
#zfHint.low .zh-in{--ix:0px;--iy:22px}
#zfHint.on .zh-in{transform:none}
#zfHint .zh-duck{flex:none;width:var(--dw,108px);aspect-ratio:${RATIO};position:relative;transform-origin:50% 90%}
#zfHint .zh-duck>.pd{display:block;width:100%;height:100%}
#zfHint .zh-duck img,#zfHint .zh-duck svg{display:block;width:100%;height:100%;user-select:none;-webkit-user-drag:none;pointer-events:none}
#zfHint.right .zh-duck .pd-svg,#zfHint.right .zh-duck>img{transform:scaleX(-1)}
#zfHint.right .zh-duck .pd{--pd-dir:-1}
#zfHint.on-dark .zh-duck .pd-svg,#zfHint.on-dark .zh-duck>img{filter:drop-shadow(1px 0 0 rgba(255,253,246,.45)) drop-shadow(-1px 0 0 rgba(255,253,246,.45)) drop-shadow(0 -1px 0 rgba(255,253,246,.45))}
#zfHint .zh-duck.nod{animation:zhNod .42s ease-in-out}
@keyframes zhNod{0%,100%{transform:none}40%{transform:rotate(-6deg) translateY(-2px)}}
/* a compact bubble beside the duck's face, with its tail pointing at the bill */
#zfHint .zh-say{position:relative;box-sizing:border-box;max-width:var(--bw,250px);margin-top:calc(var(--dw,108px)*.1);padding:8px 32px 9px 12px;border-radius:13px;background:var(--bg,#fffdf6);color:var(--fg,#1b1a17);border:1px solid var(--g3,#ccc);font:500 14px/1.42 var(--font-sans,system-ui,sans-serif);box-shadow:0 6px 18px rgba(0,0,0,.12)}
#zfHint.low .zh-say{margin-top:0;margin-bottom:calc(var(--dw,108px)*.42)}
#zfHint .zh-say::before{content:"";position:absolute;top:15px;left:-6px;width:10px;height:10px;background:inherit;border-left:1px solid var(--g3,#ccc);border-bottom:1px solid var(--g3,#ccc);transform:rotate(45deg)}
#zfHint.low .zh-say::before{top:auto;bottom:15px}
#zfHint.right .zh-say::before{left:auto;right:-6px;border-left:none;border-bottom:none;border-right:1px solid var(--g3,#ccc);border-top:1px solid var(--g3,#ccc)}
#zfHint .zh-say b{font-weight:700}
#zfHint .zc-how{color:var(--g5,#777)}
/* a short message first; the reasoning, if any, one tap away */
#zfHint .zh-more{margin:4px 0 0;padding:0;border:none;background:none;color:var(--g6,#666);font:600 13px/1.4 var(--font-sans,system-ui,sans-serif);text-decoration:underline;text-underline-offset:3px;cursor:pointer;display:block}
#zfHint .zh-more:hover{color:var(--fg,#111)}
#zfHint .zh-detail{display:block;margin-top:6px;color:var(--g6,#555);font-size:13.5px}
#zfHint .zh-detail[hidden]{display:none}
#zfHint .zh-txt{display:block;transition:opacity .14s}
#zfHint .zh-txt.swap{opacity:0}
#zfHint .zh-say a,#zfHint .zh-say .sdk-act{color:inherit;font:inherit;font-weight:700;text-decoration:underline;text-underline-offset:3px;text-decoration-thickness:1.5px}
#zfHint .zh-say .sdk-act{margin:0;padding:0;border:0;background:none;cursor:pointer;white-space:nowrap}
#zfHint .zh-say .sdk-ico{width:17px;height:17px;vertical-align:-3px;margin:0 2px;display:inline-block}
#zfHint .zh-x{position:absolute;top:2px;right:2px;width:30px;height:30px;border:none;border-radius:9px;background:transparent;color:inherit;font:600 18px/1 var(--font-sans,system-ui,sans-serif);cursor:pointer;opacity:.8}
#zfHint .zh-x:hover{opacity:1;background:rgba(127,127,127,.2)}
#zfHint .zh-more:focus-visible,#zfHint .zh-x:focus-visible,#zfHint .zh-say a:focus-visible,#zfHint .zh-say .sdk-act:focus-visible{outline:2px solid currentColor;outline-offset:2px}
@media (prefers-reduced-motion:reduce){#zfHint .zh-in{transform:none!important;transition:none}#zfHint .zh-duck.nod{animation:none}#zfHint .zh-txt{transition:none}}
`;
/* what a hint must never cover, most important first. The weights decide between two imperfect spots. */
const KEEP=[['.hint,.hinted,.hintc,.hintring,.dmhint,.c3-hint,.hb,.hl,.zm-mid,.zm-turn,.zm-clock,.zm-score',12],['.gtools,.zm,header,.gdialog.open .gdialog-card,#gdrawer.open .gt-card',6],
  ['.stage [id$="Board"],.stage .board,.stage svg,.stage canvas,.stage .status,.ls-stage,.on-bar,.on-pending',3]];

let el=null, duckBox=null, txt=null, gen=0, timer=0, untilGen=0, side='left', lastLine=null, extraKeep='', lastSpot='', moodT=0;
let picP=null;
function ready(){ if(picP) return picP;
  picP=new Promise(res=>{ const im=new Image(); im.decoding='async'; im.src=IMG;
    const ok=()=>res(im), bad=()=>res(null);
    if(im.decode) im.decode().then(ok,()=>{ im.complete&&im.naturalWidth?ok():bad(); }); else { im.onload=ok; im.onerror=bad; } });
  return picP; }
/* the guide: the shared vector with its eyes (party-duck.js); the drawn About duck only if that is missing entirely */
function guideDuck(pic){ if(window.ZPDuck&&ZPDuck.guide&&pic) return ZPDuck.guide({label:'',moods:true}).replace(/ role="img" aria-label="[^"]*"/,' aria-hidden="true"'); return fallbackDuck(); }
function fallbackDuck(){ const d=window.ZFSideDuck&&ZFSideDuck.drawing; return d?`<svg viewBox="40 40 310 260" aria-hidden="true">${d({})}</svg>`:''; }
function build(){ if(el) return el;
  if(!document.getElementById('zfHintCss')){ const st=document.createElement('style'); st.id='zfHintCss'; st.textContent=CSS; document.head.appendChild(st); }
  el=document.createElement('div'); el.id='zfHint'; el.setAttribute('role','status'); el.setAttribute('aria-live','polite'); el.setAttribute('aria-hidden','true');
  el.innerHTML=`<div class="zh-in"><div class="zh-duck"></div><div class="zh-say"><span class="zh-txt"></span><button type="button" class="zh-x" aria-label="Close the hint">×</button></div></div>`;
  document.body.appendChild(el); duckBox=el.querySelector('.zh-duck'); txt=el.querySelector('.zh-txt');
  el.querySelector('.zh-x').onclick=e=>{ e.stopPropagation(); hide(); };
  el.addEventListener('keydown',e=>{ if(e.key==='Escape'){ e.stopPropagation(); hide(); } });
  el.addEventListener('pointerdown',e=>e.stopPropagation());   // reading or closing the hint is not a move on the board
  addEventListener('resize',()=>{ if(el.classList.contains('on')) replace(); });
  document.addEventListener('keydown',e=>{ if(e.key==='Escape'&&el.classList.contains('on')&&!document.querySelector('#gdrawer.open,.gdialog.open')) hide(); });
  return el; }

const seen=e=>!e.checkVisibility||e.checkVisibility({opacityProperty:true,visibilityProperty:true});
function keepRects(){ const out=[]; const list=KEEP.concat(extraKeep?[[extraKeep,8]]:[]);
  for(const [sel,w] of list) for(const e of document.querySelectorAll(sel)){ if(el.contains(e)||!seen(e)) continue; const r=e.getBoundingClientRect(); if(r.width<1||r.height<1||r.bottom<0||r.top>innerHeight) continue; out.push({l:r.left,t:r.top,r:r.right,b:r.bottom,w}); }
  return out; }
const cover=(rs,b)=>rs.reduce((s,r)=>{ const w=Math.min(r.r,b.r)-Math.max(r.l,b.l), h=Math.min(r.b,b.b)-Math.max(r.t,b.t); return w>0&&h>0?s+w*h*r.w:s; },0);
function darkBehind(x,y){ for(const e of document.elementsFromPoint(x,y)){ if(el.contains(e)) continue;
    const m=/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?/.exec(getComputedStyle(e).backgroundColor); if(!m||(m[4]!=null&&+m[4]<.5)) continue;
    return (.2126*m[1]+.7152*m[2]+.0722*m[3])/255<.45; } return false; }
/* sizes first (the duck larger than before, the bubble compact), then the spot. Candidate spots: left and right at mid
   height and in the lower corners, plus the upper corners. A spot is safe when it covers nothing that matters (or no more
   than the clearest spot does); among the safe ones a laptop varies the entrance and avoids the last one used, a phone
   takes the clearest. */
const SPOTS=[['ll','left','low'],['lr','right','low'],['ml','left','mid'],['mr','right','mid'],['tl','left','top'],['tr','right','top']];
function place(animate){
  const phone=innerWidth<700, dw=phone?Math.round(clamp(innerWidth*.23,80,96)):Math.round(clamp(innerWidth*.09,116,136)), pad=phone?8:16;
  el.style.setProperty('--dw',dw+'px'); el.style.setProperty('--bw',Math.min(phone?228:244,innerWidth-dw-2*pad-8)+'px');
  const hh=(document.querySelector('header')||{getBoundingClientRect:()=>({bottom:0})}).getBoundingClientRect().bottom;
  const top=Math.max(pad,hh+8), kb=phone&&window.visualViewport?Math.max(0,innerHeight-visualViewport.height):0, rects=keepRects();
  const opts=[];
  for(const [id,s,v] of SPOTS){ el.classList.toggle('right',s==='right'); el.classList.toggle('low',v==='low');
    const w=el.offsetWidth, h=el.offsetHeight, x=s==='left'?pad:innerWidth-w-pad;
    let y=v==='low'?innerHeight-h-pad-kb:v==='top'?top:Math.round((innerHeight-h)/2); y=clamp(y,top,Math.max(top,innerHeight-h-pad-kb));
    const c=cover(rects,{l:x,t:y,r:x+w,b:y+h});
    opts.push({id,s,v,x,y,c:c+(phone?(v==='low'?0:v==='mid'?30:60):0)}); }
  const min=Math.min(...opts.map(o=>o.c)), safe=opts.filter(o=>o.c<=min+1);
  let pick;
  if(phone) pick=safe[0];
  else { const fresh=safe.filter(o=>o.id!==lastSpot); const pool=fresh.length?fresh:safe; pick=pool[Math.random()*pool.length|0]; }
  if(animate) lastSpot=pick.id;
  side=pick.s; el.classList.toggle('right',side==='right'); el.classList.toggle('low',pick.v==='low');
  if(!animate) el.style.transition='none';
  el.style.setProperty('--x',Math.round(pick.x)+'px'); el.style.setProperty('--y',Math.round(pick.y)+'px');
  if(!animate){ void el.offsetWidth; el.style.transition=''; }
  el.classList.toggle('on-dark',darkBehind(clamp(pick.x+(side==='left'?dw/2:el.offsetWidth-dw/2),1,innerWidth-1),clamp(pick.y+(pick.v==='low'?el.offsetHeight-dw*.6:dw*.4),1,innerHeight-1))); }
/* a re-measure (resize, Explain opening) keeps the unit on its side and height band rather than jumping elsewhere */
function replace(){ const keep=lastSpot; place(false); lastSpot=keep; }

/* "<!--more-->" in a hint splits it: the short message shows, the rest waits behind "Explain". A longer text with no
   marker is split after its second sentence (only at the top level of the markup, never inside a tag or a bold run). */
function splitShort(html){ let depth=0, n=0; for(let i=0;i<html.length;i++){ const ch=html[i];
    if(ch==='<'){ const close=html[i+1]==='/', end=html.indexOf('>',i); if(end<0) break; const tag=html.slice(i,end+1); if(!/\/>$|^<br/i.test(tag)) depth+=close?-1:1; i=end; continue; }
    if(depth===0&&/[.!?]/.test(ch)&&/^\s+[A-Z“"<]/.test(html.slice(i+1,i+3))){ if(++n===2){ const rest=html.slice(i+1).trim(); return rest.length>24?[html.slice(0,i+1),rest]:[html,'']; } } }
  return [html,'']; }
function setText(line){ let [short,more]=String(line.html||esc(line.t||'')).split('<!--more-->');
  if(!(more&&more.trim())&&!line.noSplit){ const [a,b]=splitShort(short); if(b&&!/sdk-act/.test(b)){ short=a; more=b; } }
  txt.innerHTML=short+(more&&more.trim()?`<button type="button" class="zh-more" aria-expanded="false">Explain</button><span class="zh-detail" hidden>${more}</span>`:'');
  const mb=txt.querySelector('.zh-more'); if(mb) mb.onclick=ev=>{ ev.stopPropagation(); const d=txt.querySelector('.zh-detail'), open=d.hidden; d.hidden=!open; mb.setAttribute('aria-expanded',open); mb.textContent=open?'Less':'Explain'; replace(); };
  txt.querySelectorAll('.sdk-act').forEach((a,i)=>{ const fn=(line.acts||[])[i]; a.onclick=ev=>{ ev.stopPropagation(); if(fn) fn(); }; }); }
/* the guide's face for this message: set on the duck already drawn, held while it speaks, then back to neutral */
function mood(k){ const pd=duckBox&&duckBox.querySelector('.pd'); if(!pd) return; clearTimeout(moodT); pd.classList.remove('pd-moving'); pd.removeAttribute('data-mood');
  if(!k) return; void pd.offsetWidth; pd.setAttribute('data-mood',k); pd.classList.add('pd-moving'); moodT=setTimeout(()=>{ pd.classList.remove('pd-moving'); pd.removeAttribute('data-mood'); },2600); }
const plain=line=>String(line.t||line.html||'').split('<!--more-->')[0].replace(/<[^>]+>/g,'');
/* long enough to read: about 4 words a second, never under 6 s */
const readMs=line=>Math.max(6000,plain(line).split(/\s+/).length*260+2500);
function arm(line,o,my){ clearTimeout(timer);
  const minUntil=Date.now()+readMs(line);
  const close=()=>{ if(my!==gen) return; if(el.matches(':hover,:focus-within')){ timer=setTimeout(close,400); return; } hide(); };
  if(o.until){ const u=++untilGen; o.until.then(()=>{ if(u!==untilGen||my!==gen) return; clearTimeout(timer); timer=setTimeout(close,clamp(minUntil-Date.now(),1200,4000)); }); }   // a move on the board ends it, after a moment
  if(o.stay===false) timer=setTimeout(close,readMs(line)); }

async function show(line,o){ o=o||{}; if(typeof line==='string') line={t:line}; build();
  const my=++gen; extraKeep=o.keep||'';
  const visible=el.classList.contains('on');
  if(visible){   // one duck: swap the words in place
    lastLine=line; txt.classList.add('swap'); duckBox.classList.remove('nod'); void duckBox.offsetWidth; duckBox.classList.add('nod');
    await new Promise(r=>setTimeout(r,reduced()?0:140)); if(my!==gen) return false;
    setText(line); txt.classList.remove('swap'); replace(); mood(o.mood); arm(line,o,my); return true; }
  const pic=await Promise.race([ready(),new Promise(r=>setTimeout(()=>r(undefined),1000))]); if(my!==gen) return false;
  if(!duckBox.firstChild) duckBox.innerHTML=guideDuck(pic);
  lastLine=line; setText(line); place(true); mood(o.mood);
  el.removeAttribute('aria-hidden'); requestAnimationFrame(()=>{ if(my===gen) el.classList.add('on'); });
  if(window.ZF&&ZF.mascot&&ZF.mascot.hush) try{ ZF.mascot.hush(true); }catch(e){}   // the peeking visitor leaves at once: never two ducks
  arm(line,o,my); return true; }
function hide(){ if(!el) return; gen++; clearTimeout(timer); el.classList.remove('on'); el.setAttribute('aria-hidden','true');
  if(el.contains(document.activeElement)) try{ document.activeElement.blur(); }catch(e){} }
window.ZFHintDuck={ show, hide, ready, get visible(){ return !!(el&&el.classList.contains('on')); } };
/* decode the picture while the page is idle, so the first hint has nothing to wait for */
(window.requestIdleCallback||(f=>setTimeout(f,1200)))(()=>ready());
})();
