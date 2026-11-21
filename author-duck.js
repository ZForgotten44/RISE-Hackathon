/* author-duck.js: Mansy's personal duck (author-duck.png) with living eyes, the one component used wherever it appears.
   The drawing stays exactly as approved; an overlay holds only what moves: a dark pupil inside each lens and an
   eyelid for blinking, both clipped to the eye shapes, so the glasses, hair, beard and tie never change.
   Pupils ease toward the pointer, measured from the duck's box on every move (so a moved, resized or expanded window
   never throws the aim off), stay inside the eye, and return to a relaxed forward gaze when the pointer leaves.
   It blinks now and then. On touch screens it looks around slowly and glances toward a tap.
   It only animates while on screen; reduced motion keeps the eyes still and open.

   ZAuthorDuck.mount(box, {tap}) → {wake, sleep, look(x,y), blink()}
     box  an element holding <img src="/author-duck.png">; the overlay is added once
     tap  optional: called with the pointer event when the duck is pressed */
(function(){
'use strict';
const VB={w:346,h:330};
/* the two lenses in the drawing's units: the near (left) eye is wider; the far eye is seen more side-on */
const EYES=[{cx:212.6,cy:102.1,rx:13.4,ry:15.6,rot:3.4,px:215.7,py:107.4,prx:7.2,pry:8.9,reach:{x:4.5,y:3.6}},
            {cx:279.1,cy:90.8,rx:7.2,ry:14,rot:2.9,px:278.5,py:92.8,prx:5.7,pry:6.8,reach:{x:2.6,y:3.6}}];
let seq=0;
const RM=matchMedia('(prefers-reduced-motion: reduce)'), FINE=matchMedia('(hover: hover) and (pointer: fine)');
const calm=()=>RM.matches||document.documentElement.classList.contains('calm');
const NS='http://www.w3.org/2000/svg';

function overlay(box){
  let svg=box.querySelector('svg.adk-eyes'); if(svg) return svg;
  const n=++seq;
  svg=document.createElementNS(NS,'svg'); svg.setAttribute('class','adk-eyes'); svg.setAttribute('viewBox',`0 0 ${VB.w} ${VB.h}`);
  svg.setAttribute('aria-hidden','true'); svg.setAttribute('focusable','false');
  svg.innerHTML='<defs>'+EYES.map((e,i)=>`<clipPath id="adk${n}e${i}"><ellipse cx="${e.cx}" cy="${e.cy}" rx="${e.rx}" ry="${e.ry}" transform="rotate(${e.rot} ${e.cx} ${e.cy})"/></clipPath>`).join('')+'</defs>'+
    EYES.map((e,i)=>`<g clip-path="url(#adk${n}e${i})"><ellipse class="adk-pupil" cx="${e.px}" cy="${e.py}" rx="${e.prx}" ry="${e.pry}" fill="#121212"/>`+
      `<circle cx="${e.px+e.prx*.35}" cy="${e.py-e.pry*.4}" r="${(e.prx*.26).toFixed(2)}" fill="#fff" class="adk-glint"/>`+
      `<g class="adk-lid"><rect x="${e.cx-e.rx-4}" y="${e.cy-e.ry-4}" width="${2*e.rx+8}" height="${2*e.ry+6}" fill="#fefefd"/><path d="M${e.cx-e.rx+2} ${e.cy+e.ry+1}h${2*e.rx-4}" stroke="#121212" stroke-width="2.6" stroke-linecap="round"/></g></g>`).join('');
  const st=getComputedStyle(box); if(st.position==='static') box.style.position='relative';
  Object.assign(svg.style,{position:'absolute',inset:'0',width:'100%',height:'100%',display:'block',pointerEvents:'none',overflow:'visible'});
  box.appendChild(svg); return svg; }

function mount(box,o={}){
  if(!box) return {wake(){},sleep(){},look(){},blink(){}};
  if(box._adk) return box._adk;
  const svg=overlay(box), groups=[...svg.querySelectorAll('g[clip-path]')];
  const movers=groups.map(g=>[g.querySelector('.adk-pupil'),g.querySelector('.adk-glint')]), lids=[...svg.querySelectorAll('.adk-lid')];
  const cur=EYES.map(()=>({x:0,y:0})), tgt=EYES.map(()=>({x:0,y:0}));
  lids.forEach(l=>{ l.style.transformBox='fill-box'; l.style.transformOrigin='50% 0'; l.style.transform='scaleY(0)'; });
  let live=false, onScreen=true, raf=0, blinkT=0, idleT=0, backT=0, blinking=false, gi=0;
  /* the eye's centre on screen, from the box as it is right now */
  const centre=i=>{ const r=box.getBoundingClientRect(); return {x:r.left+EYES[i].cx/VB.w*r.width,y:r.top+EYES[i].cy/VB.h*r.height}; };
  const running=()=>live&&onScreen&&!calm();
  function aim(x,y,near){ if(!running()) return; EYES.forEach((e,i)=>{ const c=centre(i), dx=x-c.x, dy=y-c.y, d=Math.hypot(dx,dy)||1, k=Math.min(1,d/(near||260));
    tgt[i].x=dx/d*k*e.reach.x; tgt[i].y=dy/d*k*e.reach.y; }); kick(); }
  function look(fx,fy){ EYES.forEach((e,i)=>{ tgt[i].x=fx*e.reach.x; tgt[i].y=fy*e.reach.y; }); kick(); }
  function kick(){ if(!raf&&running()) raf=requestAnimationFrame(step); }
  function step(){ raf=0; let moving=false;
    movers.forEach((ms,i)=>{ const c=cur[i], t=tgt[i]; c.x+=(t.x-c.x)*.18; c.y+=(t.y-c.y)*.18;
      if(Math.abs(t.x-c.x)+Math.abs(t.y-c.y)>.02) moving=true; else { c.x=t.x; c.y=t.y; }
      ms.forEach(m=>m&&m.setAttribute('transform',`translate(${c.x.toFixed(2)} ${c.y.toFixed(2)})`)); });
    if(moving) kick(); }
  function blink(){ if(blinking||!running()) return; blinking=true;
    lids.forEach(l=>{ l.style.transition='transform 80ms ease-in'; l.style.transform='scaleY(1)'; });
    setTimeout(()=>{ lids.forEach(l=>{ l.style.transition='transform 130ms ease-out'; l.style.transform='scaleY(0)'; }); setTimeout(()=>{ blinking=false; },140); },100); }
  function scheduleBlink(){ clearTimeout(blinkT); if(!running()) return; blinkT=setTimeout(()=>{ blink(); scheduleBlink(); },3400+Math.random()*4600); }
  /* touch screens: a slow, relaxed look around */
  const GAZE=[[0,0],[.6,.15],[0,.1],[-.55,.05],[.15,.55],[0,0],[.35,-.35]];
  function idle(){ clearTimeout(idleT); if(!running()||FINE.matches) return; idleT=setTimeout(()=>{ gi=(gi+1)%GAZE.length; look(...GAZE[gi]); idle(); },2200+Math.random()*1800); }
  const onMove=e=>{ if(e.pointerType==='touch') return; aim(e.clientX,e.clientY); };
  const onDown=e=>{ if(e.pointerType!=='touch'||!running()) return; lastTouch=performance.now(); aim(e.clientX,e.clientY,60); clearTimeout(backT); backT=setTimeout(()=>look(0,0),1000); };
  /* a finger lifting also 'leaves' the page; only a mouse leaving should send the eyes back to rest */
  let lastTouch=0; const onLeave=e=>{ if((e&&e.pointerType==='touch')||performance.now()-lastTouch<900) return; look(0,0); };
  addEventListener('pointermove',onMove,{passive:true,capture:true});
  addEventListener('pointerdown',onDown,{passive:true,capture:true});
  document.documentElement.addEventListener('pointerleave',onLeave);
  document.addEventListener('mouseout',e=>{ if(!e.relatedTarget) onLeave(e); });
  box.addEventListener('pointerenter',e=>{ if(e.pointerType!=='touch') blink(); });
  if(o.tap) box.addEventListener('click',e=>{ o.tap(e); blink(); });
  if('IntersectionObserver' in window) new IntersectionObserver(es=>{ onScreen=es[es.length-1].isIntersecting; if(running()){ scheduleBlink(); idle(); kick(); } else { clearTimeout(blinkT); clearTimeout(idleT); cancelAnimationFrame(raf); raf=0; } }).observe(box);
  const api={ wake(){ if(live) return; live=true; scheduleBlink(); idle(); kick(); },
              sleep(){ live=false; clearTimeout(blinkT); clearTimeout(idleT); clearTimeout(backT); cancelAnimationFrame(raf); raf=0; },
              look, blink, aim, state:()=>({live,onScreen,pupils:cur.map(c=>[+c.x.toFixed(2),+c.y.toFixed(2)])}) };
  box._adk=api; if(o.wake!==false) api.wake(); return api; }

window.ZAuthorDuck={mount,EYES};
})();
