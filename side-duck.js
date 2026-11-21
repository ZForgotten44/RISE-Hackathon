/* side-duck.js: the visitor duck. It is Mansy's duck (author-duck.png: glasses, hair, beard and tie, the same drawing as
   /story and /about), peeking in from a screen edge with only its face showing. Hover it (or tap it on a phone) and the
   whole duck steps into view with a tilt and a wing wave, and a small × appears to send it away for the rest of the visit.
   While it waits it blinks and looks around; grab it and it flaps and follows your finger or pointer; let go and it looks
   offended, glides back to the nearest side edge and tucks itself away. On phones it is small and peeks in with just its
   face, and it leaves while a game is being played.
   One duck at a time, from an edge with nothing important near it. Now and then it says one short thing in a bubble
   beside it: a line that fits the page, sometimes with a real link. Bubbles stay on screen, never cover the duck's face or
   anything on the keep list, and can be closed (which pauses its unsolicited lines for a while). No line repeats in a visit.
   ZFSideDuck.start({ avoid, keep, paused, context }) -> { visit(), tell(line, opts), hide() }
     avoid:   selector of things the duck must stay clear of
     keep:    selector of things a bubble must never cover (controls, boards, answers, navigation); defaults to avoid
     paused:  () => true while the duck should stay away (a dialog open, a tab hidden, ...)
     context: () => { lines:[{t, html?}], every:[minMs,maxMs], chance } or null for no visits right now
   tell() is the asked-for voice (a hint, a word on the last move). It is handed to hint-duck.js, which shows the duck and
   its bubble as one unit; a visitor on screen steps aside at once, so there is never a second duck. */
(function(){
'use strict';
const REDUCED=matchMedia('(prefers-reduced-motion: reduce)').matches;
const sleep=ms=>new Promise(r=>setTimeout(r,ms)), rnd=(a,b)=>a+Math.random()*(b-a), pick=a=>a[Math.floor(Math.random()*a.length)], clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
/* the book icon is the same drawing as the Rules button and the Learn how to play button (shell.js ICONS.rules) */
const BOOK='<svg class="sdk-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 6.5C10.3 5.2 7.8 4.7 4.5 5v12.5c3.3-.3 5.8.2 7.5 1.5 1.7-1.3 4.2-1.8 7.5-1.5V5c-3.3-.3-5.8.2-7.5 1.5Z"/><path d="M12 6.5V19"/></svg>';

/* ---- the drawing: the About duck (three-quarter view, facing right: near eye large, far eye smaller and half hidden,
   outlined wing with two feather marks, a short smiling beak). about:true keeps the ids and the ground shadow that
   index.html's About duck animates; visitors get their own clip ids so several copies can live on one page. ---- */
let uid=0;
function drawing(o){
  o=o||{}; const n=++uid, far=o.about?'duckFarClip':'sdkFar'+n, near=o.about?'duckNearClip':'sdkNear'+n, id=a=>o.about?` id="${a}"`:'';
  return `<g class="${o.about?'dk dk34':'sdk'}"${id('duck')}>
      ${o.about?'<ellipse class="grd" cx="196" cy="299" rx="134" ry="9"/>':''}
      <path class="ln fl" d="M64 200C46 190 38 168 50 156C58 168 72 178 90 180Z"/>
      <path class="ln fl" d="M60 214C52 190 66 170 90 168C112 136 168 122 214 136C268 128 322 156 326 208C330 264 272 294 196 294C112 294 66 264 60 214Z"/>
      <path class="sh" d="M84 252C130 286 252 290 308 252C312 266 292 284 242 292C172 298 100 284 84 252Z"/>
      <g class="wing"><path class="ln fl" d="M112 216C118 184 178 174 228 194C234 216 216 252 166 258C132 258 110 240 112 216Z"/><path class="ln" d="M134 224C152 226 176 220 194 210"/><path class="ln" d="M146 240C162 240 184 234 202 222"/></g>
      <g class="head"${id('duckhead')}>
        <path class="ln fl" d="M168 116C168 62 212 44 252 56C294 68 308 110 298 140C290 170 244 180 206 172C180 166 168 144 168 116Z"/>
        <path d="M188 176C206 182 244 182 268 172L268 156L188 160Z" fill="#fffdf6"/>
        <g class="eyeF"><ellipse class="ln eyew" cx="277" cy="93" rx="9.5" ry="11"/><g clip-path="url(#${far})"><circle class="pu pF"${id('pupil2')} cx="279" cy="96" r="4.3"/><path d="M262 70H296V88Q277 82 262 90Z" fill="#fffdf6"/></g><path class="ln" d="M268.5 89Q277 84 285.5 88"/><ellipse class="ln" cx="277" cy="93" rx="9.5" ry="11"/></g>
        <path class="ln bk" d="M262 120C290 104 332 108 342 128C344 148 310 158 276 150C264 144 256 132 262 120Z"/>
        <path class="ln" d="M272 134C296 141 322 136 340 126"/><circle cx="303" cy="119" r="2.2" class="pu"/>
        <g class="eyeN"><ellipse class="ln eyew" cx="221" cy="103" rx="13" ry="14.5"/><g clip-path="url(#${near})"><circle class="pu pN"${id('pupil')} cx="223" cy="106" r="5.8"/><path d="M200 80H244V97Q222 91 200 102Z" fill="#fffdf6"/></g><path class="ln" d="M208.5 100.5Q222 91 235 97"/><ellipse class="ln" cx="221" cy="103" rx="13" ry="14.5"/></g>
        <path class="ln" d="M203 82C212 69 232 67 244 78"/>
        <path class="ln" d="M266 76Q277 72 289 76"/>
      </g>
      <clipPath id="${far}"><ellipse cx="277" cy="93" rx="9.5" ry="11"/></clipPath><clipPath id="${near}"><ellipse cx="221" cy="103" rx="13" ry="14.5"/></clipPath>
    </g>`; }

/* ---- the visitor: Mansy's duck. The picture is author-duck.png and only the pupils and blink lids move, as on /about.
   The picture has no separate wing, so the waving wing is a second copy of it clipped to the wing and turned about the
   wing's root, over a patch of the duck's own white where the drawn wing sits. Hits use the duck's outline, not the
   picture's square, so its transparent corners never block the page. ---- */
const ME_IMG='/author-duck.png', ME_WHITE='#fdfdf9';
const WING='M56 232C57 203 98 183 140 186C173 189 198 210 198 233C196 258 170 278 134 282C94 285 59 264 56 232Z';
const SHAPE='M226 4 254 12 266 20 275 36 283 52 287 60 306 68 305 92 303 100 310 108 332 116 342 132 339 140 331 148 314 156 281 164 286 172 302 188 316 212 321 236 320 252 315 268 304 284 286 300 273 308 252 316 213 324 136 324 98 316 63 300 44 284 31 268 21 244 16 212 9 196 3 180 6 164 68 156 79 148 95 140 127 132 124 116 119 92 117 84 120 60 130 44 143 28 169 12 192 4Z';
function mansy(){ const n=++uid, W='sdkW'+n, L='sdkL'+n, R='sdkR'+n;
  return `<g class="sdk me"><defs><clipPath id="${W}"><path d="${WING}"/></clipPath>
      <clipPath id="${L}"><ellipse cx="212.6" cy="102.1" rx="13.4" ry="15.6" transform="rotate(3.4 212.6 102.1)"/></clipPath>
      <clipPath id="${R}"><ellipse cx="279.1" cy="90.8" rx="7.2" ry="14" transform="rotate(2.9 279.1 90.8)"/></clipPath></defs>
    <g class="bod">
      <image href="${ME_IMG}" width="346" height="330"/>
      <path d="${WING}" fill="${ME_WHITE}"/>
      <g class="wing"><image href="${ME_IMG}" width="346" height="330" clip-path="url(#${W})"/></g>
      <g clip-path="url(#${L})"><ellipse class="pu pN" cx="215.7" cy="107.4" rx="7.2" ry="8.9" fill="#121212"/><g class="lid"><rect x="196" y="84" width="34" height="36" fill="#fefefd"/><path d="M198 120h30" stroke="#121212" stroke-width="2.6" stroke-linecap="round"/></g></g>
      <g clip-path="url(#${R})"><ellipse class="pu pF" cx="278.5" cy="92.8" rx="5.7" ry="6.8" fill="#121212"/><g class="lid"><rect x="269" y="75" width="20" height="32" fill="#fefefd"/><path d="M270 107h18" stroke="#121212" stroke-width="2.6" stroke-linecap="round"/></g></g>
      <rect class="head" x="118" y="3" width="224" height="172" fill="none"/>
      <path class="hit" d="${SHAPE}"/>
    </g></g>`; }
/* the box is the whole picture (346 by 330). At rest only the face shows: x 122 onward at a side edge (the hair, glasses
   and beak), down to y 196 at the bottom edge (the beard and the knot of the tie). */
const VB='0 0 346 330', W_OVER_H=346/330, REST_SIDE=(346-122)/346, REST_BOTTOM=196/330;
/* phones: the duck is small and peeks less, from x 168 on (the near eye, the far eye and the beak), only from the left
   or right edge. An invisible pad around it keeps the tap target comfortable. */
const PHONE_W=64, REST_PHONE=(346-168)/346, HIT_PAD=12;
const isPhone=()=>innerWidth<700;
const CSS=`
#peek{position:fixed;inset:0;pointer-events:none;z-index:60}
#peek .visitor{position:fixed;left:0;top:0;touch-action:none;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;-webkit-user-drag:none;-webkit-tap-highlight-color:transparent;pointer-events:none;will-change:transform}
#peek .visitor.phone::before{content:"";position:absolute;inset:-${HIT_PAD}px;pointer-events:auto}
#peek .visitor.held .tilt{transition:transform .1s linear}
#peek .visitor .tilt{width:100%;height:100%;transform-origin:50% 88%;transition:transform .32s cubic-bezier(.3,1.3,.5,1)}
#peek .visitor svg{width:100%;height:100%;overflow:visible;display:block}
#peek .visitor.on-dark svg{filter:drop-shadow(1px 0 0 rgba(255,253,246,.4)) drop-shadow(-1px 0 0 rgba(255,253,246,.4)) drop-shadow(0 1px 0 rgba(255,253,246,.4)) drop-shadow(0 -1px 0 rgba(255,253,246,.4))}
#peek .sdk{pointer-events:none}
#peek .sdk image{pointer-events:none}
#peek .sdk .hit{fill:transparent;pointer-events:fill;cursor:grab}
#peek .visitor.held .sdk .hit{cursor:grabbing}
#peek .sdk .bod{transform-origin:173px 318px;transform-box:view-box;transition:transform .34s cubic-bezier(.3,1.3,.5,1)}
#peek .sdk .pu{transition:transform .25s}
#peek .sdk .lid{transform-box:fill-box;transform-origin:50% 0;transform:scaleY(0);transition:transform .14s ease-out}
#peek .sdk .wing{transform-origin:186px 226px;transform-box:view-box}
#peek .sdk.blink .lid{transform:scaleY(1);transition-duration:.08s}
#peek .sdk.offended .lid{transform:scaleY(.42)}
#peek .sdk.curious .bod{transform:rotate(-5deg)}
#peek .sdk.offended .bod{transform:rotate(4deg)}
#peek .sdk.grab .pu{transform:scale(.8)}
#peek .sdk.wave .wing{animation:sdkWave .44s ease-in-out 2}
#peek .sdk.caught .wing{animation:sdkWave .15s ease-in-out 3}
#peek .sdk.drag .wing{animation:sdkFlap .2s ease-in-out infinite alternate}
#peek .sdk.talk .bod{animation:sdkTalk .36s ease-in-out 3}
@keyframes sdkWave{0%,100%{transform:rotate(0)}45%{transform:rotate(28deg)}}
@keyframes sdkFlap{from{transform:rotate(4deg)}to{transform:rotate(30deg)}}
@keyframes sdkTalk{0%,100%{transform:none}50%{transform:scale(1.025,.975)}}
/* the × that sends the duck away for the rest of the visit: shown while the whole duck is out or talking. It sits in
   the empty corner above the beak (mirrored with the duck when it faces left); on phones it sits above the head. */
#peek .sdk-off{position:absolute;left:84%;top:1%;width:28px;height:28px;margin:0;padding:0;border:1.5px solid var(--fg,#1b1a17);border-radius:50%;background:var(--bg,#fffdf6);color:var(--fg,#1b1a17);font:600 16px/1 var(--font-sans,system-ui,sans-serif);cursor:pointer;opacity:0;pointer-events:none;transition:opacity .16s}
#peek .visitor.phone .sdk-off{left:calc(62% - 14px);top:-36px}
#peek .sdk-off::after{content:"";position:absolute;inset:-8px}
#peek .visitor.offer .sdk-off{opacity:1;pointer-events:auto}
#peek .sdk-off:hover{background:var(--g1,#f1efe8)}
#peek .sdk-off:focus-visible{outline:2px solid var(--fg,#1b1a17);outline-offset:2px}
body.duck-held,body.duck-held *{user-select:none!important;-webkit-user-select:none!important}
#peek .sdk-say{position:fixed;max-width:min(240px,calc(100vw - 32px));box-sizing:border-box;padding:10px 34px 10px 14px;border-radius:14px;background:var(--fg,#f3f2ee);color:var(--bg,#0a0a0a);font:600 14px/1.4 var(--font-sans,system-ui,sans-serif);pointer-events:auto;opacity:0;transform:translateY(4px);transition:opacity .2s,transform .2s}
#peek .sdk-say.on{opacity:1;transform:none}
#peek .sdk-say a,#peek .sdk-say .sdk-act{color:inherit;font:inherit;font-weight:700;text-decoration:underline;text-underline-offset:3px;text-decoration-thickness:1.5px;white-space:nowrap}
#peek .sdk-say .sdk-act{margin:0;padding:0;border:0;background:none;cursor:pointer}
#peek .sdk-say a:focus-visible,#peek .sdk-say .sdk-act:focus-visible{outline:2px solid currentColor;outline-offset:2px;border-radius:3px}
#peek .sdk-say.apart::after{display:none}
#peek .sdk-say.hint{max-width:min(300px,calc(100vw - 32px))}
@media (max-width:699px){#peek .sdk-say.hint{max-width:calc(100vw - 32px)}}
#peek .sdk-say .sdk-ico{width:17px;height:17px;vertical-align:-3px;margin:0 2px;display:inline-block}
#peek .sdk-say .sdk-x{position:absolute;top:4px;right:4px;width:28px;height:28px;border:none;border-radius:8px;background:transparent;color:inherit;font:600 17px/1 var(--font-sans,system-ui,sans-serif);cursor:pointer;opacity:.75}
#peek .sdk-say .sdk-x:hover{opacity:1;background:rgba(127,127,127,.18)}
#peek .sdk-say .sdk-x:focus-visible{outline:2px solid currentColor;outline-offset:1px}
#peek .sdk-say::after{content:"";position:absolute;width:12px;height:12px;background:inherit;transform:rotate(45deg);top:var(--ty,50%);left:var(--tx,-5px);margin-top:-6px}
`;

/* is the page behind this point dark? Then the near-black outline gets a faint cream rim so the duck's edge stays clear */
function darkAt(x,y,skip){
  for(const e of document.elementsFromPoint(x,y)){ if(skip.contains(e)) continue;
    const m=/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?/.exec(getComputedStyle(e).backgroundColor); if(!m||(m[4]!=null&&+m[4]<.5)) continue;
    return (.2126*m[1]+.7152*m[2]+.0722*m[3])/255<.45; }
  return true; }

/* what the duck has said this visit (a tab's session), when it last spoke unasked, and whether it was sent away.
   Each line is said at most once a visit; once the page's lines are used up the duck just peeks. */
const SEEN_KEY='zf-duck-said', HUSH_KEY='zf-duck-hush', OFF_KEY='zf-duck-off';
const ss={ get(k,d){ try{ const v=sessionStorage.getItem(k); return v==null?d:JSON.parse(v); }catch(e){ return d; } }, set(k,v){ try{ sessionStorage.setItem(k,JSON.stringify(v)); }catch(e){} } };
function nextLine(lines){ if(!lines||!lines.length) return null;
  const seen=ss.get(SEEN_KEY,[]), fresh=lines.filter(l=>!seen.includes(l.t)); if(!fresh.length) return null;
  const l=pick(fresh); seen.push(l.t); ss.set(SEEN_KEY,seen.slice(-80)); return l; }
/* unasked lines: at most one every 90 s, and none for 10 minutes after a bubble was closed */
const GAP=90000, HUSH=600000;
const mayTalk=()=>Date.now()-ss.get(HUSH_KEY,0)>0;
const hush=ms=>ss.set(HUSH_KEY,Date.now()+ms);

function start(opts){
  /* asked-for lines (hints, rules, a word on a move) go to the one hint duck (hint-duck.js), which keeps the duck and its
     bubble together and works with reduced motion too. This file keeps only the unasked, peeking visitor. */
  const tellHint=(line,opts)=>window.ZFHintDuck?ZFHintDuck.show(line,Object.assign({stay:true},opts||{})):Promise.resolve(false);
  if(REDUCED) return { visit(){ return Promise.resolve(false); }, tell:tellHint, hush(){}, get off(){ return true; } };
  const o=opts||{}; if(!o.avoid) o.avoid='header,nav,button,a,input,h1,h2,h3,p,li'; if(!o.paused) o.paused=()=>false; if(!o.context) o.context=()=>({lines:[],every:[8000,15000],chance:0});   // read in place: avoid and keep may be getters
  if(!document.getElementById('sdkCss')){ const st=document.createElement('style'); st.id='sdkCss'; st.textContent=CSS; document.head.appendChild(st); }
  let layer=document.getElementById('peek'); if(!layer){ layer=document.createElement('div'); layer.id='peek'; document.body.appendChild(layer); }
  let busy=false, cur=null;   // cur: the visit on screen, so an asked-for line can send it off first
  const off=()=>!!ss.get(OFF_KEY,false);
  const hinting=()=>!!(window.ZFHintDuck&&ZFHintDuck.visible);
  const paused=()=>document.hidden||o.paused()||busy||off()||hinting();
  const seen=e=>!e.checkVisibility||e.checkVisibility({opacityProperty:true,visibilityProperty:true});   // closed dialogs and faded layers cover nothing
  const rectsOf=sel=>[...document.querySelectorAll(sel)].filter(seen).map(e=>e.getBoundingClientRect()).filter(r=>r.width>0&&r.height>0&&r.bottom>0&&r.top<innerHeight&&r.right>0&&r.left<innerWidth);
  const hits=(rects,b,pad)=>rects.some(r=>r.left<b.r+pad&&r.right>b.l-pad&&r.top<b.b+pad&&r.bottom>b.t-pad);
  const overlap=(a,b)=>a.l<b.r&&a.r>b.l&&a.t<b.b&&a.b>b.t;
  /* an edge spot: rest is the part showing while it peeks, full is the whole duck once it steps out.
     The first tries want the whole duck clear; later ones settle for a clear peek. */
  function spot(w,h,rects,phone){
    const rs=phone?REST_PHONE:REST_SIDE;
    for(let t=0;t<24;t++){
      const edge=pick(phone?['left','right']:['left','right','left','right','bottom']); let rest,full,face;
      if(edge==='left'||edge==='right'){ const y=rnd(90,innerHeight-h-60), l=edge==='left'?0:innerWidth-w;
        full={l,t:y,r:l+w,b:y+h}; rest=edge==='left'?{l:0,t:y,r:w*rs,b:y+h}:{l:innerWidth-w*rs,t:y,r:innerWidth,b:y+h}; face=edge==='left'?'right':'left'; }
      else { const x=rnd(40,innerWidth-w-40); full={l:x,t:innerHeight-h,r:x+w,b:innerHeight}; rest={l:x,t:innerHeight-h*REST_BOTTOM,r:x+w,b:innerHeight}; face=x+w/2<innerWidth/2?'right':'left'; }
      if(full.t<0||full.b>innerHeight) continue;
      if(!hits(rects,t<14?full:rest,14)) return {edge,rest,full,face};
    }
    return null; }
  /* one bubble, beside the peeking duck on its open side and level with its face; above or below it if that side is busy.
     It never covers the duck's face, stays inside the screen and covers nothing on the keep list. If the duck steps out
     the bubble goes, so the whole duck never ends up under it. */
  function bubble(b,headR,line,rects){
    const el=document.createElement('div'); el.className='sdk-say'+(line.hint?' hint':''); el.setAttribute('role','status');
    el.innerHTML=`<span>${line.html||esc(line.t)}</span><button type="button" class="sdk-x" aria-label="Close the duck’s message">×</button>`;
    el.style.visibility='hidden'; el.style.left='0'; el.style.top='0'; layer.appendChild(el);
    const bw=el.offsetWidth, bh=el.offsetHeight, m=12, R=b.rest, fy=headR.top+headR.height*.5, fx=clamp(headR.left+headR.width*.5,0,innerWidth), places=[];
    const faceBox={l:Math.max(0,headR.left)-6,t:headR.top-6,r:Math.min(innerWidth,headR.right)+6,b:headR.bottom+6};
    if(b.edge==='left'||(b.edge==='bottom'&&b.face==='right')) places.push({x:R.r+m,y:fy-bh/2,tx:'-5px'});
    else places.push({x:R.l-m-bw,y:fy-bh/2,tx:(bw-7)+'px'});
    places.push({x:fx-bw/2,y:R.t-m-bh,ty:(bh-1)+'px',ax:fx});   // above the duck
    if(b.edge!=='bottom') places.push({x:fx-bw/2,y:R.b+m,ty:'-5px',ax:fx});   // below it
    if(line.hint){ places.push({x:(innerWidth-bw)/2,y:innerHeight-bh-16,apart:1},{x:(innerWidth-bw)/2,y:((document.querySelector('header')||{getBoundingClientRect:()=>({bottom:64})}).getBoundingClientRect().bottom|0)+10,apart:1}); }   // an asked-for line may sit apart, at the foot or the top of the screen, rather than cover a control
    for(const q of places){ const x=clamp(q.x,16,innerWidth-bw-16), y=clamp(q.y,72,innerHeight-bh-16), box={l:x,t:y,r:x+bw,b:y+bh};
      if(hits(rects,box,8)||overlap(box,R)||overlap(box,faceBox)) continue;
      const tx=q.ax!=null?clamp(q.ax-x-6,14,bw-26)+'px':q.tx, ty=q.ty||Math.round(clamp(fy-y,14,bh-14))+'px';
      el.classList.toggle('apart',!!q.apart);
      el.style.left=x+'px'; el.style.top=y+'px'; el.style.setProperty('--tx',tx); el.style.setProperty('--ty',ty);
      el.style.visibility=''; requestAnimationFrame(()=>el.classList.add('on'));
      /* an inline action ("Show me") runs its own handler; a link is a link. The bubble itself never navigates. */
      el.querySelectorAll('.sdk-act').forEach((a,i)=>{ const fn=(line.acts||[])[i]; a.onclick=ev=>{ ev.stopPropagation(); if(fn) fn(); }; });
      return el; }
    /* an asked-for line with no room beside the duck takes the nearest clear spot anywhere on screen, with no tail */
    if(line.hint){ let best=null, bd=1e9;
      for(let y=72;y<=innerHeight-bh-16;y+=16) for(let x=16;x<=innerWidth-bw-16;x+=16){ const box={l:x,t:y,r:x+bw,b:y+bh};
        if(hits(rects,box,8)||overlap(box,R)||overlap(box,faceBox)) continue; const d=Math.hypot(x+bw/2-fx,y+bh/2-fy); if(d<bd){ bd=d; best=box; } }
      if(best){ el.classList.add('apart'); el.style.left=best.l+'px'; el.style.top=best.t+'px'; el.style.visibility=''; requestAnimationFrame(()=>el.classList.add('on'));
        el.querySelectorAll('.sdk-act').forEach((a,i)=>{ const fn=(line.acts||[])[i]; a.onclick=ev=>{ ev.stopPropagation(); if(fn) fn(); }; }); return el; } }
    el.remove(); return null; }

  async function visit(force){
    const ctx=force&&force.line?(o.context()||{lines:[]}):o.context(); if(!ctx) return false;
    const asked=!!(force&&force.line), phone=isPhone(), rs=phone?REST_PHONE:REST_SIDE;
    const w=phone?PHONE_W:Math.round(clamp(innerWidth*.09,112,150)), h=Math.round(w/W_OVER_H), keep=rectsOf(o.keep||o.avoid);
    // an asked-for line always finds a spot: clear of everything if it can, clear of the controls if not, any edge at worst
    const b=spot(w,h,rectsOf(o.avoid),phone)||(asked?spot(w,h,keep,phone)||spot(w,h,[],phone):null);
    if(!b) return false;
    busy=true;
    const el=document.createElement('div'); el.className='visitor'+(phone?' phone':''); el.style.width=w+'px'; el.style.height=h+'px'; el.setAttribute('data-cursor-drag',''); el.draggable=false;
    el.innerHTML=`<div class="tilt"><svg viewBox="${VB}" focusable="false" aria-hidden="true">${mansy()}</svg></div><button type="button" class="sdk-off" aria-label="Send the duck away for this visit" title="Send the duck away">×</button>`;
    const dk=el.querySelector('.sdk'), tilt=el.querySelector('.tilt'), head=el.querySelector('.head'), pupils=[...el.querySelectorAll('.pN,.pF')];
    /* every pose is a plain translate from the top left corner (plus the mirror when it faces left), so the walk in,
       the drag and the return all move the same transform and nothing is ever rebuilt */
    let flip=b.face==='left'?' scaleX(-1)':'';
    const T=p=>`translate(${p.x}px,${p.y}px)${p.flip!=null?p.flip:flip}`;
    const poses=(edge,y)=>{
      if(edge==='left') return {hidden:{x:-w*1.02,y},rest:{x:-(1-rs)*w,y},out:{x:0,y}};
      if(edge==='right') return {hidden:{x:innerWidth+w*.02,y},rest:{x:innerWidth-rs*w,y},out:{x:innerWidth-w,y}};
      const x=b.full.l; return {hidden:{x,y:innerHeight+h*.02},rest:{x,y:innerHeight-REST_BOTTOM*h},out:{x,y:innerHeight-h}}; };
    let P=poses(b.edge,b.full.t);
    el.style.transform=T(P.hidden); layer.appendChild(el);
    el.classList.toggle('on-dark',darkAt(clamp((b.rest.l+b.rest.r)/2,1,innerWidth-1),clamp(b.rest.t+h*.3,1,innerHeight-1),layer));
    let anim=null;
    const go=(to,ms,ease)=>{ const from=getComputedStyle(el).transform; if(anim) anim.cancel(); const t=typeof to==='string'?to:T(to); el.style.transform=from==='none'?'':from;
      anim=el.animate([{transform:from},{transform:t}],{duration:ms,easing:ease||'cubic-bezier(.2,.9,.3,1.1)',fill:'forwards'}); return anim.finished.catch(()=>{}); };
    const look=(x,y)=>pupils.forEach((p,i)=>{ p.style.transform=`translate(${x*(i?.6:1)}px,${y}px)`; });   // drawing units; +x is forward whichever way it faces; the far eye moves less
    const blink=async()=>{ dk.classList.add('blink'); await sleep(120); dk.classList.remove('blink'); };
    let say=null; const unsay=()=>{ if(!say) return; const s=say; say=null; s.classList.remove('on'); setTimeout(()=>s.remove(),220); if(!S.out) el.classList.remove('offer'); };

    /* ---- stepping out: hover (mouse) or a tap (touch) brings the whole duck into view with a tilt and a wave ---- */
    const S={grabbed:false,ever:false,left:false,moved:false,out:false,hover:false,offX:0,offY:0,x:0,y:0,px:0,py:0,lastX:0,downX:0,downY:0,pend:null,pid:null,backT:0};
    S.grabP=new Promise(r=>S.onGrab=r); S.relP=new Promise(r=>S.onRel=r); S.leaveP=new Promise(r=>S.onLeave=()=>{ S.left=true; r(); });
    const stop=()=>S.ever||S.left;
    S.cut=fast=>{ S.fast=!!fast; unsay(); S.onLeave(); }; cur=S;
    /* the ×: away for the rest of the visit. It never starts a grab. */
    const offBtn=el.querySelector('.sdk-off');
    offBtn.addEventListener('pointerdown',ev=>ev.stopPropagation());
    offBtn.addEventListener('click',ev=>{ ev.stopPropagation(); ss.set(OFF_KEY,true); S.cut(); });
    const stepOut=()=>{ clearTimeout(S.backT); if(S.out||stop()) return; S.out=true; el.classList.add('offer'); if(!asked) unsay();
      go(P.out,360); tilt.style.transform='rotate(-5deg)'; dk.classList.add('wave');
      setTimeout(()=>{ dk.classList.remove('wave'); if(!S.ever) tilt.style.transform=''; },950); };
    const stepBack=()=>{ if(!S.out||S.ever) return; S.out=false; if(!say) el.classList.remove('offer'); go(P.rest,420,'cubic-bezier(.4,0,.3,1)'); tilt.style.transform=''; };
    el.addEventListener('pointerenter',e=>{ if(e.pointerType!=='mouse') return; S.hover=true; stepOut(); });
    el.addEventListener('pointerleave',e=>{ if(e.pointerType!=='mouse') return; S.hover=false; clearTimeout(S.backT); S.backT=setTimeout(()=>{ if(!S.hover) stepBack(); },500); });
    /* the duck alone: no text selection, no image drag, no long-press menu and no scrolling from a touch that starts on it.
       The rest of the page keeps its normal scrolling. */
    el.addEventListener('touchstart',ev=>{ if(ev.cancelable) ev.preventDefault(); },{passive:false});
    el.addEventListener('contextmenu',ev=>ev.preventDefault()); el.addEventListener('dragstart',ev=>ev.preventDefault());
    /* it leaves on its own when the page needs the space: a game starts, a dialog opens, the tab is hidden */
    const watch=setInterval(()=>{ if(!S.ever&&!S.left&&(document.hidden||(!asked&&(o.paused()||!o.context())))) S.onLeave(); if(!S.ever&&!S.left&&hinting()) S.cut(true); },300);

    /* ---- grabbing: peeking > grabbed (a quick flap) > dragging, straight under the finger > released (offended) >
       back to the nearest side edge > tucked away. Positions are written once per frame, as a transform. ---- */
    let tiltT=0, dragT=0, raf=0;
    const paint=()=>{ raf=0; if(!S.grabbed) return;
      S.x=clamp(S.px-S.offX,0,Math.max(0,innerWidth-w)); S.y=clamp(S.py-S.offY,0,Math.max(0,innerHeight-h)); el.style.transform=T(S);
      const dx=S.px-S.lastX; S.lastX=S.px; if(dx){ tilt.style.transform=`rotate(${clamp(dx*1.6,-16,16)}deg)`; clearTimeout(tiltT); tiltT=setTimeout(()=>{ tilt.style.transform=''; },140); } };
    const grab=e=>{ if(S.grabbed||S.left) return;
      S.grabbed=S.ever=true; S.onGrab(); unsay(); el.classList.remove('offer'); clearTimeout(S.backT); const r=el.getBoundingClientRect(); el.getAnimations().forEach(a=>a.cancel()); anim=null;
      S.x=r.left; S.y=r.top; el.style.transform=T(S); tilt.style.transform=''; el.classList.add('held');
      S.offX=e.clientX-r.left; S.offY=e.clientY-r.top; S.px=S.lastX=e.clientX; S.py=e.clientY; S.moved=false; S.pid=e.pointerId; try{ el.setPointerCapture(e.pointerId); }catch(_){}
      dk.classList.remove('wave','talk','offended','curious','blink'); dk.classList.add('grab','caught'); setTimeout(()=>dk.classList.remove('caught'),460); look(0,0);
      if(window.ZS) ZS.play('surprise'); document.body.classList.add('duck-held'); window.ZFCursor&&ZFCursor.pressed(true); };
    const down=e=>{ if(S.left||S.grabbed||(S.ever&&!S.grabbed)) return; e.preventDefault(); e.stopPropagation(); S.downX=e.clientX; S.downY=e.clientY;
      if(e.pointerType!=='mouse'&&!S.out){ S.pend=e.pointerId; try{ el.setPointerCapture(e.pointerId); }catch(_){} return; }   // a touch on the peeking duck: wait to see if it is a tap or a drag
      grab(e); };
    const move=e=>{
      if(S.pend!=null&&!S.grabbed){ if(e.pointerId!==S.pend) return; if(Math.hypot(e.clientX-S.downX,e.clientY-S.downY)>6){ S.pend=null; grab(e); } else return; }
      if(!S.grabbed||e.pointerId!==S.pid) return; e.preventDefault(); if(!S.moved&&Math.hypot(e.clientX-S.downX,e.clientY-S.downY)>5) S.moved=true;
      S.px=e.clientX; S.py=e.clientY; if(!raf) raf=requestAnimationFrame(paint);
      if(!dk.classList.contains('drag')) dk.classList.add('drag'); clearTimeout(dragT); dragT=setTimeout(()=>dk.classList.remove('drag'),260); };
    /* every way a touch can end (lifted, cancelled by the browser, capture lost, the tab or window losing focus) ends here,
       once, so the duck is never left stuck to a finger that is gone */
    const release=e=>{
      if(S.pend!=null&&!S.grabbed){ const tap=e&&e.type==='pointerup'; S.pend=null; if(e&&e.pointerId!=null) try{ el.releasePointerCapture(e.pointerId); }catch(_){}
        if(tap){ stepOut(); clearTimeout(S.backT); S.backT=setTimeout(stepBack,2800); } return; }   // a tap: step out for a moment
      if(!S.grabbed) return; if(e&&e.pointerId!=null&&e.pointerId!==S.pid) return;
      S.grabbed=false; if(raf){ cancelAnimationFrame(raf); raf=0; } if(window.ZS) ZS.play('flutter'); try{ if(S.pid!=null) el.releasePointerCapture(S.pid); }catch(_){}
      dk.classList.remove('drag'); el.classList.remove('held'); clearTimeout(tiltT); tilt.style.transform=''; document.body.classList.remove('duck-held'); window.ZFCursor&&ZFCursor.pressed(false);
      if(S.moved){ const eat=ev=>{ ev.stopPropagation(); ev.preventDefault(); }; addEventListener('click',eat,true); setTimeout(()=>removeEventListener('click',eat,true),450); }   // a drag must not also click what is underneath
      S.onRel(); };
    el.addEventListener('pointerdown',down); el.addEventListener('pointermove',move);
    ['pointerup','pointercancel','lostpointercapture'].forEach(t=>el.addEventListener(t,release));
    const lost=()=>release(); addEventListener('blur',lost); document.addEventListener('visibilitychange',lost);
    const wait=p=>Promise.race([p,S.grabP,S.leaveP]);
    let closed=false;
    try{
      await wait(go(P.rest,460)); if(stop()) throw 0;
      look(4,-1); await wait(sleep(380)); if(stop()) throw 0; await blink();
      const line=asked?force.line:(force&&force.say)||(mayTalk()&&Math.random()<(ctx.chance==null?.5:ctx.chance))?nextLine(ctx.lines):null;
      if(line&&(asked||!S.out)){
        const hR=head.getBoundingClientRect();
        say=bubble(b,hR,line,keep)||(asked?bubble(b,hR,line,rectsOf('header,button,a,input,select,textarea,label,.seg,canvas,.board,.stage svg,.stage [id$="Board"] *,[role=dialog]'))||bubble(b,hR,line,[]):null);
        if(say){ dk.classList.add('talk'); el.classList.add('offer'); if(!asked) hush(GAP);
          const closeP=new Promise(r=>{ say.querySelector('.sdk-x').onclick=ev=>{ ev.stopPropagation(); if(!asked) hush(HUSH); closed=true; r(); }; });
          if(asked&&force.stay) await wait(Promise.race([closeP,force.until||new Promise(()=>{})]));
          else { await wait(Promise.race([sleep(Math.max(asked?6000:3600,line.t.length*95)),closeP]));
            // a bubble someone is reading (pointer over it, or focus in it) stays until they move on
            while(!closed&&!stop()&&say&&say.matches(':hover,:focus-within')) await wait(Promise.race([sleep(300),closeP])); }
          dk.classList.remove('talk'); unsay(); if(stop()) throw 0; } }
      if(closed||asked) throw 0;
      /* a couple of small, separate gestures; never a constant bob */
      const acts=[async()=>{ dk.classList.add('curious'); look(3,-2); await wait(sleep(1100)); dk.classList.remove('curious'); },
                  async()=>{ look(-3,1); await wait(sleep(700)); look(4,0); await wait(sleep(500)); },
                  async()=>{ await blink(); await wait(sleep(160)); await blink(); }];
      for(const a of [acts.splice(Math.floor(Math.random()*acts.length),1)[0],pick(acts)]){ await a(); if(stop()) throw 0; await wait(sleep(rnd(300,700))); if(stop()) throw 0; }
      for(let t=0;(S.hover||S.out)&&t<100;t++){ await wait(sleep(150)); if(stop()) throw 0; }   // stays while it is being looked at
    }catch(e){}
    dk.classList.remove('wave','talk','curious'); unsay();
    if(S.ever){                                       // grabbed at some point: wait for release, then glide back to the nearest side edge
      await S.relP; clearInterval(watch);
      if(S.moved) dk.classList.add('offended'); dk.classList.remove('grab');
      const r=el.getBoundingClientRect(), edge=r.left+r.width/2<innerWidth/2?'left':'right', rects=rectsOf(o.avoid);
      flip=edge==='left'?'':' scaleX(-1)';
      /* the nearest height on that edge where the peeking duck covers nothing it must keep clear of */
      const lo=72, hi=Math.max(lo,innerHeight-h-16), y0=clamp(r.top,lo,hi), restAt=y=>edge==='left'?{l:0,t:y,r:w*rs,b:y+h}:{l:innerWidth-w*rs,t:y,r:innerWidth,b:y+h};
      let y=null; for(let d=0;d<=hi-lo;d+=8){ for(const c of [y0-d,y0+d]) if(y==null&&c>=lo&&c<=hi&&!hits(rects,restAt(c),10)) y=c; if(y!=null) break; }
      P=poses(edge,y==null?y0:y);
      if(y!=null){ await go(P.rest,520,'cubic-bezier(.25,.8,.3,1)'); await sleep(S.moved?900:500); dk.classList.remove('offended'); await blink(); await sleep(700); }
      dk.classList.remove('offended');
      await go(P.hidden,340,'ease-in');
    } else { clearInterval(watch); clearTimeout(S.backT); if(S.pend!=null){ try{ el.releasePointerCapture(S.pend); }catch(_){} }
      if(S.fast){ el.style.pointerEvents='none'; el.style.transition='opacity .12s'; el.style.opacity='0'; await sleep(130); }   // a hint is coming: step aside at once
      else await go(P.hidden,340,'ease-in'); }
    removeEventListener('blur',lost); document.removeEventListener('visibilitychange',lost);
    el.remove(); if(cur===S) cur=null; busy=false; return true; }
  function schedule(ms){ setTimeout(async()=>{ if(off()) return; const ctx=o.context(); if(paused()||!ctx){ schedule(2500); return; } const ok=await visit().catch(()=>{ busy=false; return false; }); const ev=(o.context()||{}).every||[8000,15000]; schedule(ok?rnd(ev[0],ev[1]):2500); },ms); }
  const first=(o.context()||{}).every||[8000,15000];
  schedule(rnd(Math.min(5000,first[0]),Math.min(9000,first[1])));
  /* the asked-for voice is the hint duck (hint-duck.js): whatever visit is on screen steps aside at once */
  function tell(line,opts){ if(cur) cur.cut(true); return tellHint(typeof line==='string'?{t:line}:line,opts); }
  return { visit:f=>busy?Promise.resolve(false):visit(f),   // visit({say:true}) always talks: for tests and demos
    tell, hush(fast){ if(cur) cur.cut(fast); }, get off(){ return off(); } };
}
window.ZFSideDuck={ start, drawing, BOOK };
})();
