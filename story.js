/* story.js: the homepage's Games → About scroll story, one continuous scene on one scroll timeline.
   1. The runner's pixel duck leaves its track and lands on the featured card of a curved deck.
   2. Desktop: scrolling turns the deck through a central viewing position (dragging, a trackpad's sideways movement,
      the arrows and the keys move the same position, by moving the page); the duck hops onto each card as it arrives.
      After the last card, scrolling on starts the reveal. Phones: the cards are a plain horizontal scroller instead.
   3. A large head rises from beneath the deck until the cards sit on its crown. As it keeps rising, the cards travel
      away down its sides, the pixel duck steps down onto the crown, and Create/Join become the eyes (still links to
      /create and /join the whole way). Two small wings come out from under it and wave once. The face is the site's
      logo duck, seen close up.
   4. The face travels to the About duck's place, turns three-quarters and grows its body, becoming that duck,
      which then takes over (squeeze and all).
   Every frame is a pure function of the scroll position and the deck's position, so stopping anywhere holds a
   composed pose and scrolling back plays the same motion in reverse. Only the eyes' gaze and the wings' one wave
   have their own (timed) state. The face is drawn in the About duck's own units (its 400x320 drawing), so the last frame is
   that drawing. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const sec=$('games'), run=$('ssRun'), stage=$('ssStage'), ring=$('ssRing'), about=$('about');
if(!sec||!run||!stage||!window.ZF) return;
const REDUCED=matchMedia('(prefers-reduced-motion: reduce)').matches;
const NS='http://www.w3.org/2000/svg';
const qs=new URLSearchParams(location.search);

/* the featured set (mansy's order); the full list stays one click away (See all games) */
const FEATURED=['ult','gold','chomp','nim','pentago','notakto','toot','sim'];
const GAMES=ZF.GAMES, picks=FEATURED.map(id=>GAMES.findIndex(g=>g.id===id)).filter(i=>i>=0);
const N=picks.length;

/* ---------- maths ---------- */
const clamp=(v,a,b)=>v<a?a:v>b?b:v, lerp=(a,b,t)=>a+(b-a)*t;
const seg=(t,a,b)=>clamp((t-a)/(b-a),0,1);
const ease=t=>t*t*(3-2*t), ease5=t=>t*t*t*(t*(t*6-15)+10), easeOut=t=>1-(1-t)*(1-t);
const clampK=k=>clamp(k,0,N-1);
/* the deck is a ring: card k-1 of the first is the last game. modN names the card; wrapD is the shortest way round */
const modN=k=>((k%N)+N)%N, wrapD=d=>{ d=modN(d); return d>=N/2?d-N:d; };
function hex(c){ c=(c||'').trim(); if(c[0]==='#'){ if(c.length===4) c='#'+c[1]+c[1]+c[2]+c[2]+c[3]+c[3]; return [parseInt(c.slice(1,3),16),parseInt(c.slice(3,5),16),parseInt(c.slice(5,7),16)]; }
  const m=c.match(/[\d.]+/g); return m?m.slice(0,3).map(Number):[0,0,0]; }
const rgb=(a,b,t)=>'rgb('+a.map((v,i)=>Math.round(lerp(v,b[i],t))).join(',')+')';
const f1=v=>(Math.round(v*10)/10).toString();
/* a soft minimum: follows the smaller value, without a corner where they cross */
const softMin=(a,b,r)=>{ const h=clamp(.5+(b-a)/(2*r),0,1); return lerp(b,a,h)-r*h*(1-h); };

/* ---------- the mascot (duck-face.js): the logo face, and the About duck it turns into ---------- */
const DF=window.ZFDuckFace;
const INK='#0a0a0a', CREAM='#fffdf6', WHITE='#ffffff', SW_UNITS=3.2;
const AB=DF.BODY;

/* ---------- the front face: the site's logo duck (icon-512.png), traced into the same units ----------
   Its soft head with the cheek bulge, the wide bill with the raised bridge, the open smile with curled corners,
   two nostrils and dark oval eyes with a small highlight. The eyes keep a thin white rim so they can look around. */
const FR=DF.FR;
const FH={top:46,bot:176,l:169,r:303};
/* eye i (0 left = Create, 1 right = Join) at turn tn: the same eye partly turned toward the About text */
const frEye=(i,ex,tn)=>DF.eye(i,tn||0,ex.cheek);
/* the logo's open smile throughout; curious (the pixel duck has just landed on its head) narrows it, amused deepens it */
const EXPR={ neutral:{smile:1,cheek:0}, curious:{smile:.72,cheek:0}, amused:{smile:1.18,cheek:1} };
function mixExpr(a,b,t){ return {smile:lerp(a.smile,b.smile,t),cheek:lerp(a.cheek,b.cheek,t)}; }

/* ---------- path sampling, for blending one outline into another ---------- */
const probe=document.createElementNS(NS,'svg'); probe.setAttribute('style','position:absolute;width:0;height:0;overflow:hidden;visibility:hidden'); probe.setAttribute('aria-hidden','true');
const probeP=document.createElementNS(NS,'path'); probe.appendChild(probeP); document.body.appendChild(probe);
const SC=new Map();
function sample(d,n,closed,start){   // n points along the path; closed paths start at the topmost ('top') or leftmost ('left') point, clockwise
  const key=d+'|'+n+'|'+start; if(SC.has(key)) return SC.get(key);
  probeP.setAttribute('d',d); const L=probeP.getTotalLength(); const M=closed?n*4:n; const pts=[];
  for(let i=0;i<M;i++){ const p=probeP.getPointAtLength(closed?L*i/M:L*i/(M-1)); pts.push([p.x,p.y]); }
  let out=pts;
  if(closed){ let k=0; for(let i=1;i<M;i++){ if(start==='left'?pts[i][0]<pts[k][0]:pts[i][1]<pts[k][1]) k=i; }
    let r=pts.slice(k).concat(pts.slice(0,k));
    let area=0; for(let i=0;i<r.length;i++){ const a=r[i],b=r[(i+1)%r.length]; area+=a[0]*b[1]-b[0]*a[1]; } if(area<0){ r=[r[0]].concat(r.slice(1).reverse()); }
    out=[]; for(let i=0;i<n;i++) out.push(r[Math.floor(i*r.length/n)]); }
  SC.set(key,out); return out; }
const mixPts=(a,b,t)=>t<=0?a:a.map((p,i)=>[lerp(p[0],b[i][0],t),lerp(p[1],b[i][1],t)]);
const polyD=(pts,closed)=>'M'+pts.map(p=>f1(p[0])+' '+f1(p[1])).join('L')+(closed?'Z':'');
const NH=220;
const HEAD_F=()=>sample(FR.head,NH,true,'top');
/* the head outline as a track: arc length from the crown, clockwise (positive = down the right side) */
let HA=null;
function headArc(){ if(HA) return HA; const p=HEAD_F(), n=p.length, cum=[0]; for(let i=1;i<=n;i++) cum.push(cum[i-1]+Math.hypot(p[i%n][0]-p[i-1][0],p[i%n][1]-p[i-1][1])); HA={p,n,cum,P:cum[n]}; return HA; }
function arcPt(u){ const {p,n,cum,P}=headArc(); const s=((u%P)+P)%P; let lo=0,hi=n; while(hi-lo>1){ const m=(lo+hi)>>1; if(cum[m]<=s) lo=m; else hi=m; }
  const t=(s-cum[lo])/(cum[lo+1]-cum[lo]||1), a=p[lo], b=p[(lo+1)%n], A=p[(lo-3+n)%n], B=p[(lo+4)%n];
  return {x:lerp(a[0],b[0],t),y:lerp(a[1],b[1],t),a:Math.atan2(B[1]-A[1],B[0]-A[0])}; }
/* the head's top edge at a given x (units) */
function headTopY(x){ const {p,n}=headArc(); let y=Infinity; for(let i=0;i<n;i++){ const a=p[i], b=p[(i+1)%n]; if(a[1]>112&&b[1]>112) continue; if((a[0]-x)*(b[0]-x)<=0&&a[0]!==b[0]) y=Math.min(y,lerp(a[1],b[1],(x-a[0])/(b[0]-a[0]))); } return y; }

/* ---------- build the cards ---------- */
let swiped=false;
const slots=picks.map((gi,k)=>{
  const s=document.createElement('div'); s.className='ss-slot';
  const c=ZF.makeCard(GAMES[gi],gi,{num:false}); s.appendChild(c); ring.appendChild(s);
  /* every visible card works like the site's card (the card opens its game, Rules opens the rules); letting go of a
     drag or swipe is never a click */
  c.addEventListener('click',e=>{ if(swiped){ e.preventDefault(); e.stopPropagation(); } },true);
  return {el:s,card:c,k,q:null};
});
/* hover: every visible card takes the full card treatment and plays its illustration while the pointer is on it */
/* while the deck moves under a still pointer, cards passing beneath it don't react */
let movT=0;
function moving(){ if(!ring.classList.contains('ss-moving')){ ring.classList.add('ss-moving'); slots.forEach(o=>o.card.classList.remove('on')); }
  clearTimeout(movT); movT=setTimeout(()=>ring.classList.remove('ss-moving'),220); }
const create=$('ssCreate'), join=$('ssJoin'), rooms=$('ssRooms');
const allLink=$('ssAll'), head=sec.querySelector('.ss-head'), prev=$('ssPrev'), next=$('ssNext'), foot=$('ssFoot'), ind=$('ssInd');
[ 'ssBack','ssFront' ].forEach(id=>{ const n=$(id); if(n) n.remove(); });

/* ---------- the face. It lives behind the cards while they sit on its crown, then above the page so it can travel into About ---------- */
function el(tag,attrs,parent){ const n=document.createElementNS(NS,tag); for(const k in attrs) n.setAttribute(k,attrs[k]); if(parent) parent.appendChild(n); return n; }
const ov=document.createElement('div'); ov.className='ss-ov'; ov.setAttribute('aria-hidden','true'); sec.after(ov);
const svg=el('svg',{class:'ss-face'});   // not hidden: while Create/Join are eyes they are its links
stage.insertBefore(svg,ring);
const defs=el('defs',{},svg);
const clipHead=el('path',{},el('clipPath',{id:'ssClipHead'},defs));
const clipEye=[0,1].map(i=>el('path',{},el('clipPath',{id:'ssClipEye'+i},defs)));
/* two wings of the body below the screen. They greet us once, as the face becomes recognisable: one leads (it rises
   beside the lower cheek, pauses, rocks side to side twice and lowers) while the other gives a smaller, later answer
   close to the bottom edge. Each is the About duck's own wing (same outline, cream fill, one short curved feather
   crease) stood on its root, feather tip up; the root stays below the screen and is what it turns about, so the
   shape never changes as it moves. Local units: root at 0, tip about 63 above it, +x toward the face */
const WING_S=.62, WING_ROOT=[214,214];
const wingLocal=(x,y)=>{ x=2*DF.C-x;                                        // undo the About drawing's mirror
  const dx=x-WING_ROOT[0], dy=y-WING_ROOT[1]; return [-dy*WING_S,dx*WING_S]; };
const WING_D=DF.mapPath(DF.BODY.wing,wingLocal), WING_CREASE=DF.mapPath('M140 226C156 227 172 222 186 214',(x,y)=>wingLocal(2*DF.C-x,y));
const WING_REST=-34, WING_LIFT=[-22,4], WING_LEAD=1, WING_LOW=14;          // degrees (+ leans in); the right wing leads, the other stands lower
/* the greeting over time (ms): each wing's rise (0..1, from below the screen) and angle, and the head's tilt toward
   the leading wing (degrees) */
/* the greeting follows scrolling (u 0..1, from when the face is recognisable to just before About): the wings rise,
   pause in a greeting pose, wave gently twice, pause, and lower. Stopping holds the pose; scrolling up plays it back */
function greetPose(u){
  /* rise (0-.14), hold a welcoming pose (.14-.26), wave gently (.26-.8: three rocks of the leading wing, two smaller
     answers from the other), lower (.8-.98). The leading wing is a beat ahead throughout */
  const w=[0,1].map(i=>{ const lead=i===WING_LEAD, d=lead?0:.04, t=u-d;
    const rise=ease(seg(t,0,.14))*(1-ease(seg(u,.86,.98)));
    const lift=ease(seg(t,.05,.18))*(1-ease(seg(u,.8,.92)));
    const wv=seg(t,.26,.8), amp=lead?7:3.5;
    const ang=lerp(WING_REST,WING_LIFT[i],lift)+Math.sin(wv*Math.PI*2*(lead?3:2))*amp*Math.sin(wv*Math.PI);
    return {rise,ang}; });
  const tilt=4*ease(seg(u,.1,.24))*(1-ease(seg(u,.8,.92)));
  return {w,tilt}; }
/* where each wing stands: as close to the head as a clear gap allows, checked at every angle it takes */
/* the outlines are sampled once (off screen, like every other outline here); the result is kept per base height, so
   the wings can rise with the face without measuring anything again */
const WX=new Map(); let WXP=null;
function wingXs(base){ base=Math.round(base); const hit=WX.get(base); if(hit) return hit;
  if(!WXP){ const h0=HEAD_F(), tr=4*Math.PI/180;                              // the head as drawn, and tilted toward the leading wing
    WXP={heads:[h0,h0.map(([x,y])=>[236+(x-236)*Math.cos(tr)-(y-160)*Math.sin(tr),160+(x-236)*Math.sin(tr)+(y-160)*Math.cos(tr)])],pts:sample(WING_D,80,false)}; }
  const gap=10, {heads,pts}=WXP;
  const xs=[0,1].map(i=>{ const side=i?1:-1, lead=i===WING_LEAD, b=base+(lead?0:WING_LOW); let need=-Infinity;   // the wing's root sits this far out from 236
    [WING_REST,(WING_REST+WING_LIFT[i])/2,WING_LIFT[i]-8,WING_LIFT[i]+8].forEach(d=>{ const a=d*Math.PI/180, ca=Math.cos(a), sa=Math.sin(a);
      pts.forEach(([x,y])=>{ const rx=x*ca-y*sa, ry=b+x*sa+y*ca;          // rotated (left wing; the right one is its mirror)
        /* every head point on this side closer than the gap in height pushes the wing out far enough to keep the gap */
        heads.forEach(hd=>hd.forEach(([hx,hy])=>{ const dy=Math.abs(hy-ry), o=side*(hx-236); if(dy>=gap||o<=0) return;
          need=Math.max(need,o+rx+Math.sqrt(gap*gap-dy*dy)); })); }); });
    return 236+side*(need===-Infinity?110:need); });
  if(WX.size>400) WX.clear(); WX.set(base,xs); return xs; }
const P=(d,cls,parent)=>el('path',{d,class:cls},parent||bodyG);
const wingsG=el('g',{class:'ssf ss-wing'},svg);
const fwings=[0,1].map(()=>{ const g=el('g',{},wingsG); P(WING_D,'ln fl',g); P(WING_CREASE,'ln sm',g); return g; });
const G=el('g',{class:'ssf'},svg);                                          // everything below is in About-duck units
const bodyG=el('g',{},G);
P(AB.tail,'ln fl'); P(AB.body,'ln fl'); P(AB.shade,'sh');
const wingG=el('g',{},bodyG); P(AB.wing,'ln fl',wingG); P(AB.wl1,'ln',wingG); P(AB.wl2,'ln',wingG);
const grd=el('ellipse',{cx:DF.GROUND.cx,cy:DF.GROUND.cy,rx:DF.GROUND.rx,ry:DF.GROUND.ry,class:'grd'},bodyG);
const headFill=el('path',{class:'hf'},G);
const neck=el('path',{d:AB.neck,fill:CREAM},G);
const headShade=el('path',{d:FR.shade,class:'sh','clip-path':'url(#ssClipHead)'},G);
const headLine=el('path',{class:'ln'},G);
/* Create/Join stay links while they become the eyes: the drawn shape is the link, so what you can click is exactly what you see */
const eyes=[0,1].map(i=>{ const g=el('a',{class:'ss-eye',href:i?'/join':'/create','aria-label':i?'Join a room':'Create a room',tabindex:'-1'},G); const E={g, shape:el('path',{class:'ln eye'},g), inner:el('g',{'clip-path':`url(#ssClipEye${i})`},g)};
  E.pupil=el('ellipse',{class:'pu'},E.inner); E.glint=el('circle',{fill:WHITE},E.inner);
  E.rim=el('path',{class:'ln rim'},g); E.label=el('text',{class:'lab','text-anchor':'middle','dominant-baseline':'central','aria-hidden':'true'},g); E.label.textContent=i?'Join room':'Create room'; return E; });
const beakG=el('g',{},G);
const bill=el('path',{class:'ln bill'},beakG);
const lens=el('path',{class:'ink'},beakG);
const lip=el('path',{class:'ink'},beakG);
const smileL=el('path',{class:'ln sm'},beakG);
const nose=[0,1].map(()=>el('ellipse',{class:'pu'},beakG));
/* the dizzy stars: small and flat, cream and muted gold, drawn above everything else on the head */
const starsG=el('g',{style:'display:none'},G), stars=[0,1,2].map(i=>el('path',{class:'ln sm '+(i===1?'star g':'star')},starsG));
/* the pixel duck: the runner's own sprite, drawn crisp at whole-pixel scale */
const pd=document.createElement('canvas'); pd.className='ss-pixel'; ov.appendChild(pd);
const PDX=window.ZF_ART&&ZF_ART.DUCK;
const PDW=PDX?PDX.w:34, PDH=PDX?PDX.h:30, FOOT_X=14.5/34;
const PAL={dark:['#0b0b0b','#9b9992','#ece9df','#ffffff','#000000','#0b0b0b'], light:['#0f0f0e','#8a887f','#fffdf6','#ffffff','#000000','#0f0f0e']};
pd.width=PDW; pd.height=PDH; const pctx=pd.getContext('2d');
let pdKey='';
function drawPixel(pose,tick,tone){ const k=pose+tick+tone; if(k===pdKey||!PDX) return; pdKey=k; pctx.clearRect(0,0,PDW,PDH); const pal=PAL[tone]||PAL.dark;
  for(const [x,y,w,h,s] of PDX.frame(pose,tick)){ pctx.fillStyle=pal[s]; pctx.fillRect(x,y,w,h); } }

/* ---------- layout ---------- */
let L=null, mode='desk', cur={pos:0}, native=false;
function measureVH(){ const p=document.createElement('div'); p.style.cssText='position:fixed;top:0;height:100svh;width:1px;visibility:hidden;pointer-events:none'; document.body.appendChild(p); const h=p.getBoundingClientRect().height||innerHeight; p.remove(); return Math.round(h); }
let C=null;
function colors(){ const g=getComputedStyle(sec); return {bg:hex(g.getPropertyValue('--bg')||'#0b0b0a'), fg:hex(g.getPropertyValue('--fg')||'#f4f2ec'), line:hex(g.getPropertyValue('--g4')||'#45443f'), tone:ZFTheme?ZFTheme.tone(sec.dataset.tone||'dark'):'dark'}; }

function layout(){
  const W=innerWidth, H=measureVH(), phone=W<700;
  mode=REDUCED?'still':phone?'phone':'desk';
  sec.dataset.ssmode=mode; ov.dataset.ssmode=mode;
  C=colors(); ov.dataset.tone=sec.dataset.tone||'dark';
  const navH=(document.querySelector('nav')||{}).offsetHeight||54;
  /* the featured card: about 28% larger than the site's card on desktop, everything in it scaled together (zoom),
     less where the window is short; on phones nearly the full width */
  const base=phone?Math.round(Math.min(360,W-80)):300, Z=phone?1:1.28;
  slots.forEach(s=>{ s.card.style.width=base+'px'; s.card.style.zoom=Z; s.card.style.minHeight=''; });
  stage.style.setProperty('--ss-art',(phone?Math.round(clamp(H*.18,96,140)):Math.round(clamp(H*(H<800?.15:.17),92,172)))+'px');
  const cw=Math.round(base*Z);
  slots.forEach(s=>{ s.el.style.width=cw+'px'; });
  const chU=Math.max(...slots.map(s=>s.card.offsetHeight))||480;   // in the card's own (unzoomed) pixels
  slots.forEach(s=>{ s.card.style.minHeight=chU+'px'; });
  const ch=Math.max(...slots.map(s=>s.el.offsetHeight))||chU*Z;
  const headH=head.offsetHeight, roomsH=rooms.offsetHeight||48;
  /* the pixel duck: whole pixels, big enough to read beside the card's own illustration */
  const px=phone?2:(H>=1000?4:H>=760?3:2), duckW=PDW*px, duckH=PDH*px;
  /* vertical budget: header, the duck's standing room, the card, a dependable gap, Create/Join, the controls,
     and real room under the controls (short laptop windows included) */
  /* short phones (an iPhone SE with Safari's bars showing): the arrows step aside (swiping and All games remain), so
     the card keeps its readable size without climbing over the heading */
  const short=phone&&H<620; sec.dataset.short=short?'1':'';
  const ctlH=short?0:44, bottomPad=phone?16:Math.round(clamp(H*.026,16,32));
  const ctlTop=H-bottomPad-ctlH;
  const roomsTop=ctlTop-(short?0:phone?12:Math.round(clamp(H*.016,10,18)))-roomsH;
  const cardBottomMax=roomsTop-(phone?14:Math.round(clamp(H*.022,14,26)));
  const top=navH+(phone?headH+4:Math.max(10,headH*.12))+duckH+(phone?6:10);
  const k0=clamp((cardBottomMax-top)/ch,.5,1);
  const cardH=ch*k0;
  const cy=Math.round(cardBottomMax-cardH/2);
  const sp=cw*k0;
  /* the finished face: centred, the pixel duck on its crown, the chin clear of the bottom */
  const apexC=navH+duckH+(phone?10:16);
  let kC=(H-bottomPad-apexC-(phone?24:10))/(FH.bot-FH.top);
  kC=Math.min(kC,(phone?W*.86:W*.42)/(FH.r-FH.l));
  /* the same head, larger, when the cards sit on it: its crown is the line under the featured card */
  const kA=Math.max(kC*1.45,(phone?W*1.6:Math.min(W*.9,1500))/(FH.r-FH.l));
  const yA=cy+cardH/2;
  const hop=Math.round(clamp(H*.3,220,320));
  const Lhops=phone?Math.round(H*.12):hop*(N-1);          // desktop: one hop of scrolling per card; phones: a short pause
  /* the reveal's scroll length: long enough to follow each change (the duck leaving, Create/Join becoming eyes, the face
     arriving, the greeting) while every scroll step still moves something. Phones: shorter, but no longer rushed */
  const Lt=Math.round(H*(phone?1.35:2.6)), Lf=Math.round(H*(phone?.45:1.05));
  const Lpre=Lhops+Lt+Lf;
  const X=H;                                                // About slides up over the pinned stage across one screen
  L={W,H,phone,navH,cw,ch,k0,cardH,cy,sp,px,duckW,duckH,roomsTop,ctlTop,apexC,kC,kA,yA,hop,Lhops,Lt,Lf,Lpre,X,step:0,fontPx:parseFloat(getComputedStyle(create).fontSize)||16};
  /* phones: the cards are a plain horizontal scroller (one large card, a slice of the next, snapping gently).
     The page scrolls vertically as usual; nothing is recalculated while a finger moves the cards */
  native=phone; sec.dataset.native=native?'1':''; ring.classList.toggle('ss-native',native);
  if(native){
    /* the site's own card at its own size (no zoom): about 85% of the width, centred, with a glimpse of the card
       before and the card after. Only the height of the illustration gives way on short phones */
    const g=10, peek=Math.round(clamp(W*.045,14,22)), cwn=W-2*(g+peek), pad=Math.round((W-cwn)/2); L.gut=pad; L.cwn=cwn;
    slots.forEach(o=>{ o.card.style.zoom=''; o.card.style.width=cwn+'px'; o.card.style.minHeight=''; o.el.style.width=cwn+'px'; ['transform','opacity','visibility','zIndex','pointerEvents'].forEach(k=>o.el.style[k]=''); });
    const room=cardBottomMax-top;
    let chn=Math.max(...slots.map(o=>o.card.offsetHeight));
    if(chn>room){ const art=parseFloat(stage.style.getPropertyValue('--ss-art'))||120; stage.style.setProperty('--ss-art',Math.max(short?60:84,Math.round(art-(chn-room)))+'px'); chn=Math.max(...slots.map(o=>o.card.offsetHeight)); }
    slots.forEach(o=>{ o.card.style.minHeight=chn+'px'; });
    /* the card comes straight under the heading and the duck standing on it; Create/Join and the controls follow it,
       so a tall phone (or one whose toolbar has just hidden) has no blank band above the card. Only a short phone,
       where that stack would not fit, keeps the controls on the bottom edge */
    const rg=12, cg=12, stack=chn+14+roomsH+cg+ctlH+bottomPad;
    if(top+stack<=H){ L.cy=Math.round(top+chn/2); L.roomsTop=Math.round(top+chn+14); L.ctlTop=L.roomsTop+roomsH+cg; }
    else L.cy=Math.round(cardBottomMax-chn/2);
    L.cardH=chn;
    /* the scroller reaches up over the duck's standing and jumping room, so the duck can live inside it, on its card,
       and move with the cards on the compositor rather than catching up a frame later */
    L.jumpH=Math.round(clamp(H*.065,34,56)); const headroom=L.duckH+L.jumpH+6;
    ring.style.top=Math.round(L.cy-chn/2-6-headroom)+'px'; ring.style.height=Math.round(chn+12+headroom)+'px'; ring.style.alignItems='flex-end'; ring.style.paddingBottom='6px';
    ring.style.paddingLeft=pad+'px'; ring.style.paddingRight=(W-pad-cwn)+'px'; ring.style.gap=g+'px';
    L.step=cwn+g; L.ringBox={x:W/2,y:L.cy,hw:W/2+20,hh:chn/2+6}; recentre(modN(Math.round(cur.pos))); nativeSync(true); }
  else { ['top','height','paddingLeft','paddingRight','paddingBottom','alignItems','gap','transform','opacity','visibility'].forEach(k=>ring.style[k]=''); if(ord.some((k,i)=>k!==i)){ ord=slots.map(o=>o.k); slots.forEach(o=>ring.appendChild(o.el)); } }
  stage.style.height=H+'px';
  if(mode==='still'){ run.style.height=''; about.style.marginTop=''; }
  else { run.style.height=(Lpre+H+X)+'px'; about.style.marginTop=(-X)+'px'; }
  about.classList.toggle('ss-cover',mode!=='still');
  rooms.style.top=L.roomsTop+'px';
  /* desktop: the arrows flank the counter row under the buttons, clear of the cards */
  if(!phone){ foot.style.top=ctlTop+'px'; const fw=foot.offsetWidth, y=ctlTop+ctlH/2;
    prev.style.top=y+'px'; next.style.top=y+'px'; prev.style.left=Math.round(W/2-fw/2-20-48)+'px'; next.style.left=Math.round(W/2+fw/2+20)+'px'; next.style.right='auto'; }
  else { const t=L.ctlTop<ctlTop?L.ctlTop+'px':'', b=t?'auto':''; foot.style.top=t; foot.style.bottom=b; [prev,next].forEach(n=>{ n.style.top=t; n.style.bottom=b; n.style.left=''; n.style.right=''; }); }
  if(allLink&&native) allLink.style.top=Math.round(head.offsetTop+(head.offsetHeight-44)/2)+'px';
  /* the game search lines up with the heading: on its right on laptops, a button just after it on phones */
  const gsf=window.ZFGameSearch&&ZFGameSearch.el;
  if(gsf){ gsf.style.setProperty('--gs-top',Math.round(head.offsetTop+(head.offsetHeight-44)/2)+'px'); gsf.style.setProperty('--gs-left',Math.round(head.offsetLeft+head.offsetWidth+6)+'px'); gsf.style.setProperty('--gs-row',Math.round(head.offsetTop+head.offsetHeight+6)+'px'); }
  pd.style.width=duckW+'px'; pd.style.height=duckH+'px';
  roomRects=null; svg.setAttribute('viewBox',`0 0 ${W} ${innerHeight}`); svg.setAttribute('width',W); svg.setAttribute('height',innerHeight);
  const ff=getComputedStyle(create); eyes.forEach(E=>{ E.label.style.fontFamily=ff.fontFamily; E.label.style.fontWeight=ff.fontWeight; E.label.style.letterSpacing=ff.letterSpacing; });
  update();
}
let roomRects=null;
function getRoomRects(){ if(roomRects) return roomRects; const sr=stage.getBoundingClientRect();
  roomRects=[create,join].map(b=>{ const r=b.getBoundingClientRect(); return {x:r.left-sr.left+r.width/2,y:r.top-sr.top+r.height/2,hw:r.width/2,hh:r.height/2}; }); return roomRects; }

/* ---------- the deck: a curved shelf with one viewing position ----------
   Cards pass around a shallow curve through their centres. The featured card stands upright at full size, with clear
   space around it; its neighbours stay large enough to recognise, and the outer cards get smaller with distance.
   Depth comes from scale and overlap (no shadows, glow or blur). */
const SC_D=[1,.7,.52,.4,.3];                      // featured, neighbours, second neighbours, outer cards, beyond
const X_D=(()=>{ const g=[.07,-.08,-.1,-.1], x=[0]; for(let i=0;i<4;i++) x.push(x[i]+SC_D[i]/2+SC_D[i+1]/2+g[i]); return x; })();   // centre offsets, in featured-card widths
const SC_P=[1,.8,.66,.56], X_P=[0,.86,1.6,2.25];  // phones: one card and a glimpse of each neighbour
const pw=(arr,ad)=>{ const i=Math.min(arr.length-2,Math.floor(ad)), t=ad-i; return lerp(arr[i],arr[i+1],Math.min(t,1.5)); };
function deck(d){   // offset from the featured position → centre, scale, horizontal turn, angle (stage coordinates)
  const ad=Math.abs(d), sg=d<0?-1:1, {W,cy,k0,phone,cw}=L;
  if(phone){ const off=pw(X_P,ad)*cw*k0; return {x:W/2+sg*off,y:cy+7*Math.min(ad,3)*Math.min(ad,3),sc:k0*pw(SC_P,ad),sx:1,ang:sg*2.5*Math.min(ad,2)}; }
  const off=pw(X_D,ad)*cw*k0;
  const x=W/2+sg*off;
  const y=cy+L.H*.05*Math.pow(off/(W*.45),2);                       // a shallow curve through the centres
  const sc=k0*Math.max(.2,pw(SC_D,ad));
  const sx=1-.07*Math.min(ad,3);                                      // turned slightly away from the viewer
  const ang=sg*(2.5*Math.min(ad,1)+2*Math.max(0,Math.min(ad,3)-1));
  return {x,y,sc,sx,ang};
}
const deckOp=ad=>L.phone?1-seg(ad,1.7,2.3):(1-seg(ad,3.1,3.6))*(1-.14*seg(ad,1,3));
/* the height of a card's top edge at screen x X (or null if the card is not under X): where the duck's feet go */
function surfaceQ(q,X){ const a=q.ang*Math.PI/180, hs=L.ch*q.sc/2, hw=L.cw*q.sc*q.sx/2;
  const u=(X-q.x-hs*Math.sin(a))/Math.cos(a); if(Math.abs(u)>hw-4) return null;
  return q.y+u*Math.sin(a)-hs*Math.cos(a); }
const cardTopQ=q=>{ const a=q.ang*Math.PI/180; return q.y-Math.cos(a)*L.ch*q.sc/2; };

/* ---------- phones: the scroller's middle card is the featured one (its illustration plays) ---------- */
let sceneOn=false, natC=-1;
/* the scroller is a ring too: its cards are kept in order around the featured one (seven either side), so a swipe
   either way always finds a card, and the first game has the last one beside it. Only cards far off screen move */
const MID=Math.floor(N/2);
let ord=slots.map(o=>o.k);
/* only the cards that have to change ends move (one or two after a swipe), and the scroll position shifts by the same
   amount in the same frame: re-appending all fifteen forced a full layout of the scroller after every swipe */
function recentre(c){ const want=Array.from({length:N},(_,i)=>modN(c+i-MID)), sh=ord.indexOf(want[0]);
  const ok=ring.children.length>=N&&slots.every((o,i)=>o.el.parentNode===ring)&&[...ring.querySelectorAll(':scope>.ss-slot')].every((e,i)=>e===slots[ord[i]].el);
  if(!ok||sh<0){ ord=want; ord.forEach(k=>ring.appendChild(slots[k].el)); ring.scrollLeft=MID*L.step; return; }
  const n=sh>N/2?sh-N:sh, x=ring.scrollLeft;
  if(n>0) for(let i=0;i<n;i++) ring.appendChild(slots[ord[i]].el);
  else for(let i=0;i<-n;i++) ring.insertBefore(slots[ord[N-1-i]].el,ring.firstChild);
  ord=want; ring.scrollLeft=x-n*L.step; }
let rcT=0, ringTouch=false;
ring.addEventListener('touchstart',()=>{ ringTouch=true; },{passive:true});
addEventListener('touchend',()=>{ ringTouch=false; },{passive:true}); addEventListener('touchcancel',()=>{ ringTouch=false; },{passive:true});
function settleRing(){ clearTimeout(rcT); rcT=setTimeout(()=>{ if(!native||!L) return; if(ringTouch) return settleRing();
  const x=ring.scrollLeft/L.step, i=Math.round(x); if(Math.abs(x-i)>.01) return settleRing();
  if(i!==MID) recentre(ord[clamp(i,0,N-1)]); },160); }
function nativeSync(force){ if(!native||!L) return; const x=L.step?ring.scrollLeft/L.step:0, i=clamp(Math.round(x),0,N-1); cur.pos=ord[i]+(x-i); const c=ord[i];
  if(c!==natC||force){ natC=c; slots.forEach(o=>{ const on=o.k===c; o.el.classList.toggle('ss-centre',on); o.card.querySelectorAll('a').forEach(a=>{ a.tabIndex=on?0:-1; }); if(on) o.el.removeAttribute('aria-hidden'); else o.el.setAttribute('aria-hidden','true'); });
    ind.textContent=String(c+1).padStart(2,'0')+' / '+String(N).padStart(2,'0'); prev.disabled=false; next.disabled=false; }
  setLive(sceneOn?slots[c].card:null); }
let nsA=0; ring.addEventListener('scroll',()=>{ if(!native) return; settleRing(); if(!nsA) nsA=requestAnimationFrame(()=>{ nsA=0; nativeSync(); if(pd.parentNode!==ov) nativeDuck(); }); },{passive:true});

/* ---------- timeline ---------- */
function scrollS(){ return -run.getBoundingClientRect().top; }
const jump=y=>{ try{ window.scrollTo({top:y,behavior:'instant'}); }catch(e){ window.scrollTo(0,y); } };
/* every way of browsing moves this one position (card k is at the middle when it equals k) */
function goTo(k){ tweenTo(k); }
let tw=null, twTo=null;   // twTo: where a running arrow/key move is heading, so quick repeated presses add up
/* desktop: the deck's position is the page's scroll position, so every input moves the page and vertical scrolling
   carries on from wherever the deck is */
/* sideways browsing goes round the ring. Between the last game and the first there is no page position, so the deck
   is drawn from vOv there while the page waits at the nearer end; any vertical scrolling takes back over */
let vOv=null, vAt=0;
const setPos=p=>{ p=modN(p+.5)-.5; moving();
  if(mode==='desk'){ const q=clampK(p); vOv=q===p?null:p; const y=scrollY-scrollS()+q*L.hop; vAt=y; jump(y); if(vOv!==null){ cur.pos=vOv; update(); } }
  else { cur.pos=p; update(); } };
function tweenTo(k){ cancelAnimationFrame(tw); if(native){ const i=Math.round(ring.scrollLeft/L.step), j=clamp(i+Math.round(wrapD(k-ord[clamp(i,0,N-1)])),0,N-1); ring.scrollTo({left:j*L.step,behavior:REDUCED?'auto':'smooth'}); return; }
  const from=cur.pos; k=from+wrapD(k-from); if(Math.abs(from-k)<.001) return; if(mode==='still'){ cur.pos=modN(Math.round(k)); update(); return; }
  const t0=performance.now(), dur=Math.min(420+Math.abs(k-from)*160,900);
  twTo=k; const step=now=>{ const u=Math.min(1,(now-t0)/dur); setPos(from+(k-from)*easeOut(u)); if(u<1) tw=requestAnimationFrame(step); else twTo=null; };
  tw=requestAnimationFrame(step); }

/* ---------- live illustration on the featured card only ---------- */
let liveOn=null, liveT=0;
function setLive(c){ if(c===liveOn) return; if(liveOn) ZF.liveCard(liveOn,false); liveOn=c; if(c) ZF.liveCard(c,true); }

/* ---------- the runner hand-off ---------- */
let runnerHidden=false;
function hideRunner(v){ if(v===runnerHidden) return; runnerHidden=v; if(window.ZRUNNER&&ZRUNNER.hideDuck) ZRUNNER.hideDuck(v); }

/* ---------- the About duck hand-off ---------- */
const realSvg=$('duckSvg'), lead=document.querySelector('#about .lead');
let realHidden=false, arrived=false;
function hideReal(v){ if(!realSvg||v===realHidden) return; realHidden=v; realSvg.style.visibility=v?'hidden':''; }
function aboutAffine(){ const r=realSvg.getBoundingClientRect(); const k=r.width/400; return {ox:r.left-DF.VBX*k,oy:r.top,k}; }
const turnableNow=()=>mode!=='still'&&!!realSvg&&about.offsetParent!==null;
const sEndOf=()=>L.Lpre+L.X-L.navH;                       // About's heading reaches its place under the header

/* ---------- gaze: the eyes watch the pixel duck, or the pointer while it moves; changes of target are eased ---------- */
let gz=null, gzT=0, mouse=null;
function gazeTo(t){ const now=performance.now();
  if(!gz||!t){ gz=t?{x:t.x,y:t.y}:null; gzT=now; return; }
  const dt=Math.min(80,now-gzT); gzT=now; const a=1-Math.exp(-dt/150);
  gz.x+=(t.x-gz.x)*a; gz.y+=(t.y-gz.y)*a;
  if(Math.hypot(t.x-gz.x,t.y-gz.y)>.6) kick(); }

/* ---------- the frame ---------- */
let gU=0, gArm=true, gSnd=0, gBl=false, dzT0=0, dzBl=false, faceAt=null, wF=null;
let lastS=null, sFace=0, face=1, blinkT=0, exprOverride=qs.get('ssExpr'), lastE1=0, pdAt=null;
function update(){
  if(!L) return;
  const {W,H}=L, VH=innerHeight;
  const sr=stage.getBoundingClientRect(), still=mode==='still', s=still?0:scrollS();
  const enter=still?1:clamp(1-run.getBoundingClientRect().top/H,0,1);
  const pos=cur.pos;
  const sT=s-L.Lhops;
  const e1=still?0:clamp(sT/L.Lt,0,1), e2=still?0:clamp((sT-L.Lt)/L.Lf,0,1);
  const sEnd=sEndOf();
  const e3=still?0:clamp((s-L.Lpre)/(sEnd-L.Lpre),0,1);
  if(mode==='desk'){ if(vOv!==null&&Math.abs(scrollY-vAt)>1) vOv=null; cur.pos=vOv!==null?vOv:clampK(s/L.hop); }
  /* the duck faces the way the deck is going, but only after a real movement that way (30px), so small scrolls back
     and forth never flip it */
  if(lastS!==null&&e1===0){ if(face>0){ if(s>sFace) sFace=s; else if(s<sFace-30){ face=-1; sFace=s; } } else { if(s<sFace) sFace=s; else if(s>sFace+30){ face=1; sFace=s; } } } else sFace=s; lastS=s;
  stage.classList.toggle('ss-off',sr.bottom<=0||sr.top>=VH);   // nothing animates while the scene is off screen

  /* 1. the head: rises from below the screen until the deck's curve is its crown, holds while the cards sit on it,
        then keeps rising and settles into the face as the cards travel away down its sides */
  const rise=ease(seg(e1,.02,.27)), lift=ease(seg(e1,.33,.8));
  const yA=L.yA+sr.top, apexC=L.apexC+sr.top;
  let F;
  { const k=L.kA*Math.pow(L.kC/L.kA,lift), apexY=lerp(lerp(VH+30,yA,rise),apexC,lift);
    F={ox:W/2-236*k,oy:apexY-FH.top*k,k}; }
  const FA={ox:W/2-236*L.kA,oy:yA-FH.top*L.kA,k:L.kA};
  const Fs=rise<1?FA:F;                                   // where the cards sit: on the head as it will be once risen
  const turnable=turnableNow();
  const busy=turnable&&window.ZABOUTDUCK&&ZABOUTDUCK.busy();
  if(turnable){ if(e3>=1) arrived=true; else if(arrived&&s<sEnd-(busy?H*.25:24)) arrived=false; }
  else arrived=false;
  const tau=turnable?ease(seg(e3,.14,.9)):0;   // the eyes glance at the introduction first (gaze), then the head turns
  const tn=tau*(turnable?DF.aboutTurn():0);
  const travel=turnable?ease(seg(e3,0,1)):0;
  if(travel>0){ const T=aboutAffine(); const k=F.k*Math.pow(T.k/F.k,L.phone?easeOut(seg(travel,0,.55)):travel);   // phones: shrink early, so the face passes over less of the text
    /* blend about the head's centre so the head travels in a straight line while it shrinks */
    const cx=lerp(F.ox+236*F.k,T.ox+236*T.k,L.phone?travel:easeOut(seg(travel,0,.8))), cyy=lerp(F.oy+112*F.k,T.oy+112*T.k,L.phone?easeOut(seg(travel,0,.3)):travel);   // phones: onto the duck's row first (it sits under the heading)   // across to the duck's column first, so it stays clear of the text
    F={ox:cx-236*k,oy:cyy-112*k,k}; }
  else if(!turnable&&e3>0){ F={ox:F.ox,oy:F.oy-H*.18*ease(e3),k:F.k}; }

  /* 2. the deck. Before the head arrives it is the shelf; then each card sits on the crown (bottom edge on the outline,
        turned to follow it), and they leave down the sides, outer cards first, the featured card last */
  const centre=modN(Math.round(pos));
  const sat=ease(seg(e1,.04,.27));
  const shrink=Math.pow(F.k/L.kA,.5);
  const HP=headArc().P;
  let feat=null;
  /* phones: the scroller only moves and fades as one layer here; styles are written only when they change, and nothing
     inside it is measured or rebuilt while it leaves */
  if(native){ const v=1-seg(e1,.02,.25), rs=ring.style, t=e1>0?`translateY(${Math.round(H*.22*ease(seg(e1,.02,.3)))}px)`:'', o=v<1?v.toFixed(2):'', vi=v<.01?'hidden':'';
    if(rs.transform!==t) rs.transform=t; if(rs.opacity!==o) rs.opacity=o; if(rs.visibility!==vi) rs.visibility=vi; }
  else slots.forEach(o=>{
    const d=wrapD(o.k-pos), ad=Math.abs(d);
    const q0=deck(d); let q=q0, op=deckOp(ad);
    if(e1>0){
      const sg=ad<.5?1:d<0?-1:1;
      const t0=ad>=2.5?.27:ad>=1.5?.31:ad>=.5?.36:.46;
      const sl=ease(seg(e1,t0,t0+(ad<.5?.2:.25)));
      const u=(q0.x-W/2)*.9/Fs.k+sg*sl*HP*.3;
      const A=arcPt(u), sc=q0.sc*shrink, hs=L.ch*sc/2;
      const X=Fs.ox+A.x*Fs.k-sr.left, Y=Fs.oy+A.y*Fs.k-sr.top;
      q={x:lerp(q0.x,X+Math.sin(A.a)*hs,sat), y:lerp(q0.y,Y-Math.cos(A.a)*hs,sat), sc:lerp(q0.sc,sc,sat), sx:lerp(q0.sx,1,sat), ang:lerp(q0.ang,A.a*180/Math.PI*.92,sat)};
      op*=1-seg(sl,ad<.5?.35:.55,1);
    }
    o.q=q; o.op=op;
    if(o.k===centre) feat=q;
    o.el.style.transform=`translate(${f1(q.x-L.cw/2+sr.left)}px,${f1(q.y-L.ch/2)}px) rotate(${q.ang.toFixed(2)}deg) scale(${(q.sc*q.sx).toFixed(4)},${q.sc.toFixed(4)})`;
    o.el.style.opacity=op.toFixed(3); o.el.style.visibility=op<.01?'hidden':'';
    o.el.style.zIndex=String(100-Math.round(ad*20));
    const hl=clamp(1-ad*1.6,0,1); o.el.style.setProperty('--hl',hl.toFixed(3));
    const isC=o.k===centre; o.el.classList.toggle('ss-centre',isC&&ad<.5);   // kept as the cards leave: their look never switches mid-scroll
    /* any card you can see answers the pointer; faint or leaving cards let it through to what is under them */
    const hit=op>.35&&e1<.02;
    o.el.style.pointerEvents=hit?'':'none';
    if(!hit) o.card.classList.remove('on');
    const ok=isC&&ad<.08;
    o.card.querySelectorAll('a').forEach(a=>{ a.tabIndex=ok?0:-1; });
    if(ok) o.el.removeAttribute('aria-hidden'); else o.el.setAttribute('aria-hidden','true');
  });
  sceneOn=e1<.02&&enter>.6&&sr.bottom>H*.4;
  if(native){ if(e1<.02) nativeSync(); else setLive(null); }
  else { const settled=Math.abs(pos-centre)<.03&&sceneOn;
    clearTimeout(liveT); liveT=setTimeout(()=>setLive(settled?slots[centre].card:null),settled?140:0);
    ind.textContent=String(centre+1).padStart(2,'0')+' / '+String(N).padStart(2,'0');
    prev.disabled=false; next.disabled=false; }

  /* the deck's chrome clears as soon as the head starts to rise */
  const chrome=1-seg(e1,0,.1);
  const gsf=window.ZFGameSearch&&ZFGameSearch.el; if(gsf&&chrome<.5&&gsf.contains(document.activeElement)) document.activeElement.blur(); if(chrome<1&&window.ZFGameSearch) ZFGameSearch.close();
  [head,prev,next,foot,allLink,gsf].forEach(n=>{ if(!n) return; n.style.opacity=chrome.toFixed(3); n.style.visibility=chrome<.01?'hidden':''; });
  document.body.classList.toggle('ss-rooms-here',!still&&e1<.02&&enter>.75&&sr.bottom>H*.5);

  /* 3. Create/Join: real, working buttons until the morph starts; from then on they are drawn (nothing invisible to click) */
  const handoff=e1>=.02;
  rooms.classList.toggle('ss-gone',handoff);
  ring.style.pointerEvents=e1>0?'none':''; ring.classList.toggle('ss-away',e1>0);   // nothing invisible over the face and its eye links
  /* the drawn Create/Join are links (same destinations) until the face starts to become the About duck */
  const eyeLinks=handoff&&!still&&e3<=0;
  eyes.forEach(E=>{ E.g.classList.toggle('go',eyeLinks); E.g.setAttribute('tabindex',eyeLinks?'0':'-1'); if(eyeLinks) E.g.removeAttribute('aria-hidden'); else E.g.setAttribute('aria-hidden','true'); });
  [create,join].forEach(b=>{ if(handoff){ b.setAttribute('tabindex','-1'); b.setAttribute('aria-hidden','true'); } else { b.removeAttribute('tabindex'); b.removeAttribute('aria-hidden'); } });

  /* 4. the drawing's placement and line weight */
  const inStage=travel<=0&&!(e3>0);
  if(inStage&&svg.parentNode!==stage) stage.insertBefore(svg,ring);
  if(!inStage&&svg.parentNode!==ov) ov.insertBefore(svg,pd);
  svg.style.transform=inStage?`translate(${f1(-sr.left)}px,${f1(-sr.top)}px)`:'';
  /* dizzy (fast back-and-forth movement near it): the eyes stop following, their pupils drift in small circles out
     of step, lose focus, stars go round above the head as it leans and wobbles, then a slow blink, it straightens and
     looks at the pointer again (duck-face.js) */
  const dz=dzT0?(performance.now()-dzT0)/DF.DIZZY_MS:2, dp=dz<1?DF.dizzyPose(dz):null;
  /* the greeting (section 8) starts once, when the face is recognisable, and then runs on its own clock, so small
     scroll movements never hold it in a raised pose; it is armed again only after scrolling well back */
  /* the greeting's progress comes from the scroll position (eased a little toward it, so wheel steps glide) */
  const gTo=still||L.phone||REDUCED?0:clamp((sT-L.Lt*.74)/(L.Lt*.26+L.Lf*.66),0,1);   // from the face becoming recognisable to just before About
  gU+=(gTo-gU)*.2; if(Math.abs(gTo-gU)<.002) gU=gTo; else kick();
  if(e2>=.8) gU=1;   // never still up as the face leaves for About
  const gp=gU>0&&gU<1?greetPose(gU):null;
  /* the greeting's quack: once, as the leading wing first rises into its hello. It is armed again only after leaving the
     greeting altogether (before the wings or past them) and a few seconds on, so small scrolls back and forth stay quiet */
  { const tn=performance.now();
    if(gArm&&gU>=.29&&gU<.8){ gArm=false; gSnd=tn; if(window.ZS) ZS.play('greet'); }
    else if(!gArm&&(gU<=0||gU>=1)&&tn-gSnd>4000) gArm=true; }
  if(gU>=.2&&gU<.3&&!gBl){ gBl=true; blink(); } else if(gU<.15||gU>.35) gBl=false;
  const htilt=(dp?dp.tilt:0)+(gp?gp.tilt:0);
  if(dp){ kick(); if(dp.blink&&!dzBl){ dzBl=true; blink(420); } } else if(dzT0) dzT0=0;
  G.setAttribute('transform',`translate(${f1(F.ox)} ${f1(F.oy)}) scale(${F.k.toFixed(5)})`+(htilt?` rotate(${htilt.toFixed(2)} 236 160)`:''));
  starsG.style.display=dp&&dp.stars[0].op>0?'':'none';
  if(dp) dp.stars.forEach((st,i)=>{ const n=stars[i]; n.setAttribute('d',DF.starD(236+st.x*50,26+st.y*9,7*st.r,st.rot)); n.style.opacity=st.op.toFixed(3); });
  const swFace=clamp(F.k*2.7,3.5,15), swAbout=SW_UNITS*(turnable?aboutAffine().k:1);
  const sw=lerp(swFace,swAbout,tau);
  svg.style.setProperty('--sw',sw.toFixed(2)+'px');

  /* the head: one closed shape, fill and outline always the same path */
  const headPts=HEAD_F(), headD=polyD(headPts,true);
  headFill.setAttribute('d',headD); headLine.setAttribute('d',headD); clipHead.setAttribute('d',headD);
  

  /* the pixel duck first: the eyes look at it */
  placeDuck({F,pos,e1,e2,e3,enter,sr,feat,sw});
  if(e1>=.52&&lastE1<.52&&e1-lastE1<.2) blink();       // the duck lands on its head: a blink
  lastE1=e1;

  /* gaze target: the pointer while it moves (desktop), otherwise the pixel duck; straight ahead once it has gone */
  const now=performance.now();
  /* once About comes in, the eyes go to the introduction first ("Hi, it's Mansy!"; on phones the text below), as the real duck's do at rest */
  const intro=()=>{ if(DF.phoneAbout()) return {x:F.ox+236*F.k,y:F.oy+101*F.k+600}; const r=lead&&lead.getBoundingClientRect(); return r&&r.bottom>0&&r.top<VH?{x:r.left+r.width*.6,y:r.top+r.height/2}:{x:F.ox-600,y:F.oy+60*F.k}; };
  const target=(mode==='desk'&&mouse&&now-mouse.t<2200)?mouse:pdAt?{x:pdAt.x,y:pdAt.y}:(turnable&&(e3>0||e2>.85))?intro():{x:F.ox+236*F.k,y:F.oy+60*F.k+VH*.6};
  gazeTo(target);

  /* 5. eyes: the buttons, recognisable, wait while the head rises behind them; they turn the head's colours as its
        outline passes them, move to where the eyes are, round, and the labels give way to pupils in the same shapes */
  const ex=exprOverride&&EXPR[exprOverride]?EXPR[exprOverride]:faceExpr(e1,e2,e3);
  const rr=getRoomRects();
  /* the buttons stay readable as buttons while they travel; only then do they round into eyes and the labels give way */
  const mX=ease(seg(e1,.3,.62)), m2=ease(seg(e1,.52,.72)), lab=1-seg(e1,.62,.72), pupilT=easeOut(seg(e1,.68,.8));
  const blink_=blinkT>0?Math.sin(Math.min(1,blinkT)*Math.PI):0;
  faceAt={x:F.ox+236*F.k,y:F.oy+112*F.k,r:F.k*100,ok:!still&&pupilT>=1&&e3<=0};
  const ink=hex(INK), white=[255,255,255];
  eyes.forEach((E,i)=>{
    E.g.style.display=handoff?'':'none'; if(!handoff) return;
    const eye=frEye(i,ex,tn);
    const b=rr[i], bx=b.x+sr.left, by=b.y+sr.top;
    const exS=F.ox+eye.cx*F.k, eyS=F.oy+eye.cy*F.k;
    /* screen space while it is a button; the head's units once it is an eye */
    const sx=lerp(bx,exS,mX), sy=lerp(softMin(by,eyS,40),eyS,m2);
    const hw=lerp(b.hw,eye.rx*F.k,m2), hT=lerp(b.hh,eye.ryT*F.k,m2)*(1-.92*blink_), hB=lerp(b.hh,eye.ryB*F.k,m2)*(1-.92*blink_);
    const crx=lerp(10,hw,m2), crT=lerp(10,hT,m2), crB=lerp(10,hB,m2);
    const U=v=>v/F.k, x=(sx-F.ox)/F.k, y=(sy-F.oy)/F.k;
    const d=eggRect(x,y,U(hw),U(hT),U(hB),U(crx),U(crT),U(crB));
    E.shape.setAttribute('d',d); E.rim.setAttribute('d',d); clipEye[i].setAttribute('d',d);
    /* colours: the page's button until the head's outline passes behind it, then the face's ink on white */
    /* they take the face's colours (white, ink outline and label) before the head reaches them, so they read the same on black and on the head */
    const rc=ease(seg(e1,.03,.12));
    const fillA=i?1:rc, fillC=i?rgb(C.fg,white,rc):'rgb(255,255,255)';
    E.shape.style.fill=fillC; E.shape.style.fillOpacity=fillA.toFixed(3);
    E.shape.style.stroke=E.rim.style.stroke=rgb(i?C.fg:C.line,ink,rc);
    E.shape.style.strokeWidth=E.rim.style.strokeWidth=lerp(1.5,sw*lerp(.55,1,tau),m2).toFixed(2)+'px';
    E.label.style.display=lab>0?'':'none';
    if(lab>0){ E.label.setAttribute('x',f1(x)); E.label.setAttribute('y',f1(y)); E.label.style.fontSize=(L.fontPx/F.k).toFixed(3)+'px'; E.label.style.fill=rgb(i?C.bg:C.fg,ink,rc); E.label.style.opacity=lab.toFixed(3); }
    /* pupils: big and dark like the logo's eyes, held inside the eye; they look where the gaze is */
    let gvx=0, gvy=0, ps=1;
    if(gz){ const vx=gz.x-sx, vy=gz.y-sy, dd=Math.hypot(vx,vy)||1, reach=.9*Math.min(1,dd/(F.k*40));   // the same reach as the About duck's own pupils
      gvx=vx/dd*reach; gvy=vy/dd*reach; }
    if(dp){ const d=dp.eyes[i]; gvx=lerp(gvx,d.vx,dp.w); gvy=lerp(gvy,d.vy,dp.w); ps=lerp(1,d.s,dp.w); }
    const pux=x+gvx*(eye.rx-eye.prx+1.2), puy=y+gvy*(eye.ryB-eye.pry+1.6);
    const pT=pupilT*(1-.92*blink_)*ps;
    E.pupil.setAttribute('cx',f1(pux)); E.pupil.setAttribute('cy',f1(puy)); E.pupil.setAttribute('rx',Math.max(0,eye.prx*pupilT*ps).toFixed(2)); E.pupil.setAttribute('ry',Math.max(0,eye.pry*pT).toFixed(2));
    E.glint.setAttribute('cx',f1(pux+eye.prx*.34)); E.glint.setAttribute('cy',f1(puy-eye.pry*.42)); E.glint.setAttribute('r',Math.max(0,2.3*pT).toFixed(2));
  });

  /* 6. the bill is part of the head from the start: it comes into view as the head rises, at its own size */
  {
    /* the logo's bill turns with the head and becomes the About duck's own three-quarter bill as it goes */
    const bk=DF.beak(tn,tau,ex.smile);
    bill.setAttribute('d',polyD(bk.bill,true));
    lens.style.display=lip.style.display=bk.open?'':'none';
    if(bk.open){ lens.setAttribute('d',polyD(bk.lens,true)); lip.setAttribute('d',polyD(bk.lip,true)); }
    smileL.setAttribute('d',polyD(bk.smile,false));
    const ns=bk.nostrils;
    nose.forEach((c,i)=>{ c.setAttribute('cx',f1(ns[i][0])); c.setAttribute('cy',f1(ns[i][1])); c.setAttribute('rx',Math.max(0,ns[i][2]).toFixed(2)); c.setAttribute('ry',Math.max(0,ns[i][3]).toFixed(2)); });
    svg.style.setProperty('--swb',(sw*lerp(.9,1,tau)).toFixed(2)+'px'); svg.style.setProperty('--sws',(sw*lerp(.6,.75,tau)).toFixed(2)+'px');
  }

  /* 7. the body grows out from behind the head as it turns, so the head settles into it */
  const bodyT=ease(seg(tau,.35,1));
  bodyG.style.display=neck.style.display=bodyT>0?'':'none';
  const bt=`translate(242 172) scale(${lerp(.4,1,bodyT).toFixed(4)}) translate(-242 -172)`;   // uniformly: its proportions never change
  bodyG.setAttribute('transform',bt); neck.setAttribute('transform',bt);
  grd.style.opacity=seg(tau,.85,1).toFixed(3);

  /* 8. the wings (desktop), during the greeting only; they keep the face's place from before it leaves, so they never
        follow the shrinking head, and they are lowered before the transition into About */
  const wOut=L.phone?0:1;
  if(e2<=0||!wF) wF={ox:F.ox,oy:F.oy,k:F.k};
  const showW=wOut>0&&gp;
  wingsG.style.display=showW?'':'none';
  if(showW){ const bU=(VH-wF.oy)/wF.k, base=Math.max(196,bU+14), hidden=bU+96, xs=wingXs(base);
    wingsG.setAttribute('transform',`translate(${f1(wF.ox)} ${f1(wF.oy)}) scale(${wF.k.toFixed(5)})`);
    fwings.forEach((g,i)=>{ const w=gp.w[i], y=lerp(hidden,base+(i===WING_LEAD?0:WING_LOW),w.rise*wOut);
      g.setAttribute('transform',`translate(${f1(xs[i])} ${f1(y)}) scale(${i?-1:1},1) rotate(${w.ang.toFixed(2)})`); }); }

  /* the face answers a click once it is complete; while it is still becoming the About duck a click finishes that first */
  svg.classList.toggle('live',e2>.05&&!arrived);
  /* who shows the About duck: this scene until it has arrived, then the real one */
  const showFace=!still&&e1>0&&!arrived;
  svg.style.display=showFace?'':'none';
  if(turnable){ if(!arrived&&busy) ZABOUTDUCK.putBack(); hideReal(!arrived); }
  else hideReal(false);
  /* the X/O field (xo-field.js) follows the same progress: where the cards and the face are, and how far along we are */
  if(window.ZXO&&ZXO.story){ const cards=[];
    if(native){ const v=1-seg(e1,.02,.25), rb=L.ringBox; if(rb&&v>.01) cards.push({x:rb.x,y:rb.y+H*.22*ease(seg(e1,.02,.3)),hw:rb.hw,hh:rb.hh,op:v}); }
    else slots.forEach(o=>{ if(!o.q||!(o.op>.02)) return; const q=o.q, a=q.ang*Math.PI/180, w=L.cw*q.sc*q.sx/2, h=L.ch*q.sc/2, ca=Math.abs(Math.cos(a)), sa=Math.abs(Math.sin(a));
      cards.push({x:q.x+sr.left,y:q.y,hw:w*ca+h*sa,hh:w*sa+h*ca,op:o.op}); });
    ZXO.story({enter,e1,e3,chrome,still,phone:L.phone,sr:{l:sr.left,t:sr.top},cards,
      face:showFace&&inStage&&rise>0?{x:F.ox+236*F.k,y:F.oy+111*F.k,rx:68*F.k,ry:66*F.k}:null}); }
}
function eggRect(x,y,hw,hT,hB,crx,crT,crB){ crx=Math.min(crx,hw); crT=Math.min(crT,hT); crB=Math.min(crB,hB); const l=x-hw,r=x+hw,t=y-hT,b=y+hB,f=v=>v.toFixed(2);
  return `M${f(l+crx)} ${f(t)}H${f(r-crx)}A${f(crx)} ${f(crT)} 0 0 1 ${f(r)} ${f(t+crT)}V${f(b-crB)}A${f(crx)} ${f(crB)} 0 0 1 ${f(r-crx)} ${f(b)}H${f(l+crx)}A${f(crx)} ${f(crB)} 0 0 1 ${f(l)} ${f(b-crB)}V${f(t+crT)}A${f(crx)} ${f(crT)} 0 0 1 ${f(l+crx)} ${f(t)}Z`; }
/* expression over the timeline: curious as the pixel duck lands on its head, then amused, then its usual smile */
function faceExpr(e1,e2){
  let x=mixExpr(EXPR.neutral,EXPR.curious,ease(seg(e1,.5,.6))*(1-ease(seg(e1,.8,.95))));
  x=mixExpr(x,EXPR.amused,ease(seg(e1,.85,1))*(1-ease(seg(e2,.55,.9))));
  return x;
}

/* ---------- the pixel duck ---------- */
let hopSeg=null, yJ=null;   // yJ: where the duck stood when it jumped off (its flight starts there, not on the moving card)
/* phones, while the cards are browsed: the duck stands inside its card's slot, so riding a card is the card's own
   (compositor) scrolling. Each change of featured card is one hop, a pure function of the scroller's position: it rides
   its card as that card starts to move, rises, travels over and lands on the next one as that one arrives, and stays
   anchored to it. A fast fling across several cards stays up in one long glide and lands once, on the card the
   scroller settles on; reversing mid-hop brings it back the same way. */
let nd={A:-1,p:0,t:0,q:0,dir:1,hopped:false};
function nativeDuck(){ const {px,step}=L, w=PDW*px, hgt=PDH*px;
  const p=step?ring.scrollLeft/step:0, now=performance.now();
  const dt=now-nd.t; if(dt>=8){ const v=Math.abs(p-nd.p)/dt*1000; nd.t=now; nd.p=p;
    nd.q+=(clamp((v-2.2)/3,0,1)-nd.q)*(1-Math.exp(-Math.min(dt,100)/(v>2.2?60:140))); }   // how fast the cards are going (0 settled .. 1 flung)
  let iA=ord.indexOf(nd.A); if(iA<0){ iA=clamp(Math.round(p),0,N-1); nd.A=ord[iA]; nd.q=0; }
  const r=Math.round(p); if(r!==iA&&Math.abs(p-r)<.04&&nd.q<.25){ iA=clamp(r,0,N-1); nd.A=ord[iA]; nd.hopped=false; }
  const d=p-iA, u=Math.abs(d), k=r!==iA?r:iA+(d>=0?1:-1), wk=Math.abs(p-k);
  const sm=t=>ease(clamp(t,0,1)), up=sm(u/.32), g=lerp(sm(wk/.32),1,nd.q);
  const h=L.jumpH*up*g;
  const dx=d*step*up-(p-k)*step*(1-g);
  if(qs.has('ssDebug')) window.__nd={p:+p.toFixed(3),iA,k,up:+up.toFixed(2),g:+g.toFixed(2),q:+nd.q.toFixed(2),dx:Math.round(dx),h:Math.round(h)};
  if(u>.06) nd.dir=d>0?1:-1;
  const pose=h>2.5?'jump':(u>.015&&u<.1)||(wk<.1&&up>.5)?'land':'stand';
  if(u>.12&&!nd.hopped){ nd.hopped=true; if(window.ZS) ZS.play('hop'); } else if(u<.04) nd.hopped=false;
  const slot=slots[nd.A].el; if(pd.parentNode!==slot) slot.appendChild(pd);
  drawPixel(pose,0,C.tone==='light'?'light':'dark');
  const ws=w+'px', hs=hgt+'px'; if(pd.style.width!==ws) pd.style.width=ws; if(pd.style.height!==hs) pd.style.height=hs;
  pd.style.left=Math.round(L.cwn/2-w*FOOT_X)+'px'; pd.style.top=(-hgt)+'px';
  pd.style.transformOrigin=`${(FOOT_X*100).toFixed(1)}% 100%`;
  pd.style.transform=`translate(${Math.round(dx)}px,${Math.round(-h)}px)${nd.dir<0?' scaleX(-1)':''}`;
  pd.style.opacity='1';
  pdAt=null; hideRunner(true);
  /* the scroller stops sending events as it settles: keep landing until the duck is down */
  if((h>.5||nd.q>.02)&&!ndA) ndA=requestAnimationFrame(()=>{ ndA=0; if(pd.parentNode!==ov) nativeDuck(); }); }
let ndA=0; const ARR_NATIVE=.8;
function placeDuck({F,pos,e1,e2,e3,enter,sr,feat,sw}){
  /* phones land a little before the stage pins, then ride the card inside the scroller (see nativeDuck) */
  if(native&&mode!=='still'&&enter>=ARR_NATIVE&&e1<=0){ nativeDuck(); return; }
  if(pd.parentNode!==ov){ ov.appendChild(pd); pd.style.left=''; pd.style.top=''; nd.A=-1; }
  const {px}=L; let w=PDW*px;
  let pose='stand', tick=0, dir=face, op=1;
  /* the duck stays at the middle of the shelf; cards move beneath it. Its feet are on the top edge of the card under that point.
     A hop follows the deck's progress from one card to the next (scroll or drag, either direction): it crouches, rises, and
     lands on the incoming card as that card arrives under it. Small movements never lift it. */
  const k=Math.floor(pos+1e-6), fr=pos-k, X=native?L.gut+L.cwn/2:L.W/2;   // phones: over the featured card, which sits at the left gutter
  let x=X, y;
  if(native) y=L.cy-L.cardH/2+sr.top;                       // phones: it stands above the scroller while the cards pass under it
  else { const top=d=>{ const q=deck(d), v=surfaceQ(q,X); return (v===null?cardTopQ(q):v)+sr.top; };
    const yA=top(k-pos), yB=top(k+1-pos), t=seg(fr,.1,.9);
    y=fr<.1?yA:fr>.9?yB:lerp(yA,yB,ease(t))-L.H*.08*Math.sin(Math.PI*t);
    if(fr>=.1&&fr<=.9) pose='jump'; else if((fr>=.045&&fr<.1)||(fr>.9&&fr<=.965)) pose='land'; }
  if(mode==='still'){ pose='stand'; }
  /* the way in: off the runner's track, up, and down onto the featured card */
  if(enter<1&&mode!=='still'){
    const r=window.ZRUNNER&&ZRUNNER.duckRect?ZRUNNER.duckRect():null, u=native?seg(enter,.06,ARR_NATIVE):seg(enter,.1,.96);
    if(r&&u>0&&r.bottom>-60){
      const x0=r.left+r.width*FOOT_X, y0=r.bottom;
      const lift=Math.max(90,L.H*.16), uu=ease(u);
      x=lerp(x0,x,uu); y=lerp(y0,y,uu)-lift*Math.sin(Math.PI*u);
      w=lerp(r.width,PDW*px,uu); dir=1; op=1;
      pose=u<.06?'land':u>.94?'land':'jump'; hideRunner(true);
    } else if(u<=0){ hideRunner(false); op=0; }
    else { hideRunner(false); op=seg(enter,.1,.3); }
  } else hideRunner(false);
  /* the face rises under the deck: the duck rides the featured card, jumps off as that card leaves, dips a little, then
     curves up and flies out through the top of the screen, clear of the face. All of it follows scrolling, so scrolling
     back brings it back along the same path. Phones: the same flight, earlier, because the cards leave earlier there */
  let rot=0;
  const hgt=w*PDH/PDW;
  if(e1>0){
    const ringDy=native?L.H*.22*ease(seg(e1,.02,.3)):0;
    const yC=native?y+ringDy:feat?((v=>v===null?cardTopQ(feat):v)(surfaceQ(feat,X))+sr.top):y;
    const u=native?seg(e1,.03,.62):seg(e1,.44,.86);
    if(u<=0) yJ=yC;
    if(u>0){ const t=.3*ease(u)+.7*u, dx=L.W*(native?.36:.3), top=-hgt-40, y0=yJ!==null?yJ:(native?y:L.cy-L.ch*L.k0/2+sr.top);
      const P=[[X,y0],[X+dx*.22,y0+L.H*.1],[X+dx*.8,y0-L.H*.1],[X+dx,top]];
      const b=(i,t)=>{ const m=1-t; return m*m*m*P[0][i]+3*m*m*t*P[1][i]+3*m*t*t*P[2][i]+t*t*t*P[3][i]; };
      const bd=(i,t)=>{ const m=1-t; return 3*m*m*(P[1][i]-P[0][i])+6*m*t*(P[2][i]-P[1][i])+3*t*t*(P[3][i]-P[2][i]); };
      x=b(0,t); y=b(1,t);
      rot=clamp(Math.atan2(bd(1,t),bd(0,t))*180/Math.PI,-60,30)*.45*seg(u,0,.12);   // leans into the flight: nose down at first, then up
      pose=u<.05?'land':'jump'; dir=1; op=u>=1?0:1;
    } else { y=yC; pose='stand'; dir=face; }
  }
  drawPixel(pose,tick,C.tone==='light'?'light':'dark');
  const ws=f1(w)+'px', hs=f1(hgt)+'px'; if(pd.style.width!==ws) pd.style.width=ws; if(pd.style.height!==hs) pd.style.height=hs;
  /* whole pixels on phones, so the pixel art stays crisp as it moves */
  const tx=native?Math.round(x-w*FOOT_X):f1(x-w*FOOT_X), ty=native?Math.round(y-hgt):f1(y-hgt);
  pd.style.transform=`translate(${tx}px,${ty}px)${rot?` rotate(${rot.toFixed(1)}deg)`:''}${dir<0?` scaleX(-1)`:''}`;
  pd.style.transformOrigin=`${(FOOT_X*100).toFixed(1)}% 100%`;
  const vis=y>-60&&y-hgt<innerHeight+60;
  pd.style.opacity=vis?op.toFixed(3):'0';
  pdAt=(e1>0&&op>.3&&vis&&e3<=0)?{x,y:y-hgt*.55}:null;
  /* one hop sound per visible jump, at its start, in either direction (scroll, arrows, keys or drag) */
  if(mode==='desk'&&e1===0&&enter>=1){ const inJ=fr>=.12&&fr<=.88;
    if(inJ&&hopSeg!==k){ hopSeg=k; if(window.ZS) ZS.play('hop'); }
    else if(fr<.05||fr>.95) hopSeg=null; }
  else hopSeg=null;
}

/* ---------- pressing the About duck before it has assembled: finish the assembly, then squeeze ---------- */
let claimOn=false, claimA=0;
function claim(){
  if(!L||!turnableNow()) return false;
  if(claimOn) return true;                                   // one press, one action
  const s=scrollS(), sEnd=sEndOf();
  if(arrived||s>=sEnd-1) return false;
  claimOn=true; const y0=scrollY, y1=scrollY+(sEnd-s)+1, dur=clamp(Math.abs(y1-y0)*.45,320,900), t0=performance.now();
  const step=now=>{ if(!claimOn) return; const u=Math.min(1,(now-t0)/dur); jump(y0+(y1-y0)*ease(u));
    if(u<1){ claimA=requestAnimationFrame(step); return; }
    claimOn=false; update(); if(arrived&&window.ZABOUTDUCK&&ZABOUTDUCK.poke) ZABOUTDUCK.poke(); };
  claimA=requestAnimationFrame(step); return true;
}
function stopClaim(){ if(claimOn){ claimOn=false; cancelAnimationFrame(claimA); } if(twTo!==null&&!native){ cancelAnimationFrame(tw); twTo=null; } }   // any scrolling of your own also ends an arrow's glide
addEventListener('wheel',stopClaim,{passive:true}); addEventListener('touchstart',stopClaim,{passive:true});
addEventListener('keydown',e=>{ if(['ArrowUp','ArrowDown','PageUp','PageDown','Home','End',' '].includes(e.key)&&e.target===document.body) stopClaim(); });

/* ---------- input ---------- */
const deckUp=()=>!!L&&lastE1<.02;
const navBase=()=>twTo!==null&&!native?twTo:Math.round(cur.pos);
prev.addEventListener('click',()=>goTo(navBase()-1));
next.addEventListener('click',()=>goTo(navBase()+1));
/* left/right keys while the carousel (or a card in it) has focus; never from a text field or other control */
ring.addEventListener('keydown',e=>{ if(e.altKey||e.ctrlKey||e.metaKey||e.target.closest('input,textarea,select,[contenteditable]')) return;
  if(e.key==='ArrowRight'){ e.preventDefault(); goTo(navBase()+1); } else if(e.key==='ArrowLeft'){ e.preventDefault(); goTo(navBase()-1); } });
/* a sideways drag (mouse) or swipe (touch) moves the deck continuously; a vertical gesture is left to the page */
let dn=null;
ring.addEventListener('pointerdown',e=>{ if(e.button>0||!deckUp()||native) return; cancelAnimationFrame(tw); twTo=null; dn={x:e.clientX,y:e.clientY,h:null,pos:cur.pos,v:0,lp:cur.pos,lt:performance.now(),id:e.pointerId,mouse:e.pointerType==='mouse'}; swiped=false; });
ring.addEventListener('dragstart',e=>{ if(dn) e.preventDefault(); });   // links and images inside cards don't start a native drag
addEventListener('pointermove',e=>{ if(!dn||e.pointerId!==dn.id) return; const dx=e.clientX-dn.x, dy=e.clientY-dn.y;
  if(dn.h===null&&(Math.abs(dx)>8||Math.abs(dy)>8)){ dn.h=Math.abs(dx)>Math.abs(dy)*(dn.mouse?.8:1.2); if(dn.h){ ring.classList.add('ss-drag'); try{ ring.setPointerCapture(dn.id); }catch(_){} } }
  if(dn.h){ swiped=true; const p=dn.pos-dx/L.sp;
    const now=performance.now(), dt=Math.max(8,now-dn.lt); dn.v=lerp(dn.v,(p-dn.lp)/dt*1000,.35); dn.lp=p; dn.lt=now;   // cards per second, smoothed
    setPos(p); } },{passive:true});
/* letting go: a little momentum carries the deck on, then it comes to rest on a card */
function release(){ if(!dn) return; const was=dn; dn=null; ring.classList.remove('ss-drag'); if(!was.h) return;
  const v=performance.now()-was.lt>90?0:was.v, carry=clamp(v*.2,-1.5,1.5);
  let target=Math.round(cur.pos+carry); if(target===Math.round(was.pos)&&Math.abs(cur.pos-was.pos)>.15) target+=Math.sign(cur.pos-was.pos);
  tweenTo(target); setTimeout(()=>{ swiped=false; },0); }   // the click that ends a drag comes first and is swallowed
addEventListener('pointerup',release); addEventListener('pointercancel',()=>{ dn=null; ring.classList.remove('ss-drag'); setTimeout(()=>{ swiped=false; },0); });
/* trackpad (and shift + wheel): sideways movement moves the deck by the same amount, then it settles on a card */
let wSnap=0;
ring.addEventListener('wheel',e=>{ if(!deckUp()||native) return; const k=e.deltaMode===1?16:e.deltaMode===2?L.W:1, dx=e.deltaX*k, dy=e.deltaY*k;
  if(Math.abs(dx)<=Math.abs(dy)||dx===0) return;
  e.preventDefault(); cancelAnimationFrame(tw); twTo=null; setPos(cur.pos+dx/L.sp);
  clearTimeout(wSnap); wSnap=setTimeout(()=>tweenTo(Math.round(cur.pos)),170); },{passive:false});
let idleT=0;
addEventListener('pointermove',e=>{ if(e.pointerType==='mouse'){ mouse={x:e.clientX,y:e.clientY,t:performance.now()}; kick(); clearTimeout(idleT); idleT=setTimeout(kick,2250); } },{passive:true});
DF.watchDizzy({near:(x,y)=>!!faceAt&&Math.hypot(x-faceAt.x,y-faceAt.y)<faceAt.r*1.6, ready:()=>!!(faceAt&&faceAt.ok&&!dzT0&&blinkT===0), fire:()=>{ dzT0=performance.now(); dzBl=false; kick(); }});
svg.addEventListener('click',e=>{ if(e.target.closest('.ss-eye')) return; const s=scrollS(); if(s>L.Lpre-L.Lf*.9&&claim()) return; if(window.ZS) ZS.play('jsqueak'); blink(); });
function blink(ms){ if(blinkT>0) return; const t0=performance.now(), dur=ms||200; const step=now=>{ blinkT=Math.min(1.0001,(now-t0)/dur); update(); if(blinkT<1) requestAnimationFrame(step); else { blinkT=0; update(); } }; requestAnimationFrame(step); }
let raf=0; function tick(){ raf=0; update(); }
function kick(){ if(!raf) raf=requestAnimationFrame(tick); }
addEventListener('scroll',()=>{ if(L&&mode==='desk'){ const s=scrollS(); if(s>-L.H*.3&&s<L.Lhops+L.H*.2) moving(); } kick(); },{passive:true});
let lastW=0,lastH=0,rl=0;
function relayout(){ const w=innerWidth, h=measureVH(); if(w===lastW&&Math.abs(h-lastH)<2){ svg.setAttribute('height',innerHeight); svg.setAttribute('viewBox',`0 0 ${w} ${innerHeight}`); kick(); return; } lastW=w; lastH=h; layout(); }
addEventListener('resize',()=>{ cancelAnimationFrame(rl); rl=requestAnimationFrame(relayout); });
document.addEventListener('zf-theme',()=>{ C=colors(); ov.dataset.tone=sec.dataset.tone||'dark'; pdKey=''; update(); });
if(document.fonts&&document.fonts.ready) document.fonts.ready.then(()=>{ lastW=0; relayout(); });
setInterval(()=>{ if(L&&mode!=='still'&&!document.hidden){ const sT=scrollS()-L.Lhops; if(sT>L.Lt*.75&&scrollS()<L.Lpre&&Math.random()<.4) blink(); } },3600);
window.ZSTORY={busy:()=>{ if(mode==='still') return false; const r=run.getBoundingClientRect(); return r.top<innerHeight&&r.bottom>0; },
  layout:()=>{ lastW=0; relayout(); }, goTo, claim, setExpr:v=>{ exprOverride=v; update(); }, state:()=>({mode,pos:cur.pos,L,arrived,claiming:claimOn})};
relayout();
})();
