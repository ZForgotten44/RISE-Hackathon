/* xo-field.js: the homepage's field of drifting X's and O's. One particle system (Field), used by three regions:
     hero   #home: the whole background, around the wordmark, tagline and Explore link
     story  the Games scroll stage: loose clusters in the top-right and bottom-left corners while the cards are up, then,
            as the cards give way to the big duck face, the negative space around the face fills in
     about  #about: around the introduction, the links and the About duck
     page   reading pages with body data-xo-page: the side margins beside the reading column
     laptop /about: the room around the laptop, fading as the page zooms into the desktop
   Each region has its own canvas behind its content (pointer-events:none). Pointer movement is read from the region's
   section (passive), so clicks, selection, scrolling, swipes and the deck's drags are untouched; a mouse or pen sweeps
   pieces aside, touch never does. One shared animation loop runs only the regions that are on screen and showing.
   Motion: each piece rides a divergence-free current (the curl of a summed-sine stream function), so an evenly seeded
   field stays even, plus a soft personal space that decays back to nothing, plus a pointer offset on a damped spring.
   Protected areas are measured from the real elements: pieces are steered around the important ones and fade to nothing
   before they reach them. Size, stroke weight, opacity, tilt and X/O are fixed when a piece is born.
   prefers-reduced-motion: still scatterings, redrawn only when a region's visibility changes.
   Debug: window.ZXO = { hero, story, about, page, laptop } (each: stats(), sizes(), _sample(), _measure(ch,s,lw)), ZXO.destroy(). */
(function(){
'use strict';
if(!window.HTMLCanvasElement) return;
const mqReduce=matchMedia('(prefers-reduced-motion: reduce)'), mqCoarse=matchMedia('(pointer: coarse)');
let reduced=mqReduce.matches;
const rnd=(a,b)=>a+Math.random()*(b-a), clamp=(v,a,b)=>v<a?a:v>b?b:v;
const sm=u=>u<=0?0:u>=1?1:u*u*(3-2*u), seg=(t,a,b)=>clamp((t-a)/(b-a),0,1);
const shuffle=a=>{ for(let i=a.length-1;i>0;i--){ const j=Math.random()*(i+1)|0; [a[i],a[j]]=[a[j],a[i]]; } return a; };

/* ---- the current: velocity = curl of psi = A1 sin(a) sin(b) + A2 cos(g) + A3 sin(h) (wavelengths 500-900px, so it reads
   as a breeze, never a vortex), plus a gentle drift to the right; each term's derivative written out, speeds in px/s ---- */
const K1x=.0081, K1y=.0104, K2=.0066, K3x=.0092, K3y=.0071, A1=2400, A2=1800, A3=1300, DRIFT=8;
function flowAt(x,y,t,out){
  const a=K1x*x+.06*t, b=K1y*y-.047*t, g=K2*(x+y)+.035*t, h=K3x*x-K3y*y-.08*t;
  const sa=Math.sin(a), sb=Math.sin(b), sg=Math.sin(g), ch=Math.cos(h);
  out.x=A1*K1y*sa*Math.cos(b)-A2*K2*sg-A3*K3y*ch+DRIFT;
  out.y=-(A1*K1x*Math.cos(a)*sb-A2*K2*sg+A3*K3x*ch);
}

/* ---- protected areas: rounded boxes (corner radius ~90% of the short half-side, so they read as soft stadiums, never a
   rectangle). sdf() is the signed distance (negative inside). A piece fades from full at band px out to the zone's floor
   at its edge, measured from the piece's own edge, so even a big piece is gone before it overlaps. ---- */
function sdf(z,x,y){
  const qx=Math.abs(x-z.cx)-(z.hx-z.r), qy=Math.abs(y-z.cy)-(z.hy-z.r);
  return Math.hypot(Math.max(qx,0),Math.max(qy,0))+Math.min(Math.max(qx,qy),0)-z.r;
}
function zone(l,t,r,b,pad,band,floor,steer,rad){ const hx=(r-l)/2+pad, hy=(b-t)/2+pad; return {cx:(l+r)/2,cy:(t+b)/2,hx,hy,r:rad!=null?Math.min(rad,hx,hy):Math.min(hx,hy)*.9,band,floor,steer}; }
/* the box around some elements, relative to an origin rect */
function boxOf(els,o){ let l=1e9,t=1e9,r=-1e9,b=-1e9; for(const el of els){ if(!el) continue; const x=el.getBoundingClientRect(); if(!x.width||!x.height) continue; l=Math.min(l,x.left); t=Math.min(t,x.top); r=Math.max(r,x.right); b=Math.max(b,x.bottom); }
  return r>l?{l:l-o.left,t:t-o.top,r:r-o.left,b:b-o.top}:null; }

/* ---- sizes: visible ink height in CSS px (an O's diameter, an X's height), and each band's share of the count:
   mostly small and medium pieces mixed among fewer large ones ---- */
const BANDS={
  desk:[[.3,14,28],[.35,30,55],[.25,58,90],[.1,95,140]],
  phone:[[.32,12,22],[.36,24,40],[.24,42,60],[.08,62,76]] };
/* depth without blur: the middle bands are the most visible; the largest are a little softer */
const ALPHA={ desk:[[.82,.96],[.84,.98],[.84,.98],[.66,.8]], phone:[[.82,.96],[.84,.98],[.82,.96],[.7,.84]] };
/* pieces per px² of a region (times its density): desktop about 1.65x the previous field, phones about 1.35x */
const PER_AREA={desk:9300,phone:10800};
const TILTS=[-.3,-.15,0,.15,.3];
/* pointer response: outward push (px/s² at the centre), carry along the sweep (1/s), the spring back (rad/s at weight 1) */
const PUSH=2600, CARRY=5, SPRING=1.8, STEER_OUT=6;

/* ================= Field: one region's particle system ================= */
function Field(o){
  const F={name:o.name}, host=o.host;
  const cv=document.createElement('canvas'); cv.className='xo-field'; cv.setAttribute('aria-hidden','true');
  o.mount(cv); const cx=cv.getContext('2d',{alpha:true});
  let W=0, H=0, dpr=1, R=200, M=80, phone=false, P=[], ink='#46443d', inkA=.24, sprites=new Map();
  let zones=[], dyn=[], quality=1, visible=false, shown=0, lastShown=-1, tOff=Math.random()*400;
  const ptr={x:0,y:0,sx:0,sy:0,vx:0,vy:0,on:false,amt:0,cx:0,cy:0,fresh:false};

  /* opacity a piece shows at (x,y), given its size: protected areas, the region's own spatial weight (story corners) */
  function quietAt(x,y,s){
    const h=s/2; let q=1;
    for(const z of zones){ const de=sdf(z,x,y)-h; if(de<z.band) q=Math.min(q,z.floor+(1-z.floor)*sm(de/z.band)); }
    for(const z of dyn){ const de=sdf(z,x,y)-h; if(de<z.band) q=Math.min(q,z.floor+(1-z.floor)*sm(de/z.band)); }
    if(o.strip!=null) q=Math.min(q,1-.72*sm((y+h*.6-o.strip.top+o.strip.f*.4)/o.strip.f));
    if(o.weight) q*=o.weight(x,y,s);
    return q;
  }
  /* inside a steering zone's band the part of a piece's velocity heading in is mostly removed (it slides along with the
     current) and a light outward drift is added; not all of it goes, so a few pass through invisibly instead of piling up */
  function steer(p){
    const h=p.s/2;
    for(const list of [zones,dyn]) for(const z of list){ if(!z.steer) continue; const de=sdf(z,p.x,p.y)-h; if(de>=z.band) continue;
      const e=.75, gx=sdf(z,p.x+e,p.y)-sdf(z,p.x-e,p.y), gy=sdf(z,p.x,p.y+e)-sdf(z,p.x,p.y-e), gl=Math.hypot(gx,gy); if(gl<1e-6) continue;
      const nx=gx/gl, ny=gy/gl, w=sm(1-de/z.band)*z.steer, vn=p.vx*nx+p.vy*ny;
      if(vn<0){ p.vx-=vn*nx*.8*w; p.vy-=vn*ny*.8*w; }
      p.vx+=nx*STEER_OUT*w; p.vy+=ny*STEER_OUT*w; }
  }

  /* each region can bring its own size bands (o.bands), opacity ranges (o.alpha), a scale on every size (o.sizeK) and a
     stroke-weight draw (o.stroke), so one region's tuning never changes another's */
  const bands=()=>(o.bands||BANDS)[phone?'phone':'desk'];
  /* ---- birth: each band gets its exact share, half X and half O within every band; stroke weight is its own draw
     (mostly medium, some fine, a few heavy), never tied to size ---- */
  function looks(p,band,ch){
    const B=bands(), A=(o.alpha||ALPHA)[phone?'phone':'desk'], b=B[band], K=o.sizeK||1, q=b[2]*K>90?2:1;
    p.band=band; p.ch=ch; p.s=Math.max(10,Math.round(rnd(b[1],b[2]+.4)*K/q)*q);
    const r=Math.random(), lw=o.stroke?o.stroke():(r<.2?rnd(1.5,2.1):r<.86?rnd(2.5,3.3):rnd(4,5))*(.5+.5*K);
    p.lw=Math.round(clamp(lw,1.4,Math.max(1.5,p.s*.15))*4)/4;
    p.a=rnd(A[band][0],A[band][1]);
    p.slow=1.1-.35*Math.min(1,(p.s-12)/128);                  // larger pieces drift a little more slowly
    p.m=Math.pow(p.s/45,.7);                                    // weight: small pieces answer the pointer fast, large ones lag and drift
    p.ti=Math.random()*TILTS.length|0; p.vx=p.vy=p.dx=p.dy=p.ex=p.ey=p.ux=p.uy=0;
  }
  function deck(nBase){
    const B=bands(), out=[]; // an even count in every band, half X and half O
    B.forEach((b,i)=>{ const n=2*Math.max(1,Math.round(b[0]*nBase/2)); for(let k=0;k<n;k++) out.push([i,k%2?'X':'O']); });
    return shuffle(out);
  }
  function baseCount(){ const area=(W+2*M)*(H+2*M), d=typeof o.density==='function'?o.density(phone):o.density; return Math.max(phone?8:20,Math.round(area/PER_AREA[phone?'phone':'desk']*d*open*quality)); }
  /* a region whose protected areas hide much of it (the hero, around its big title) gets extra pieces, so the space that
     is open still reads as full: the count is divided by the mean visibility over the region, up to a cap */
  let open=1;
  function compensate(){ if(!o.compensate){ open=1; return; } let sum=0, n=0; const step=phone?30:40;
    for(let y=step/2;y<H;y+=step) for(let x=step/2;x<W;x+=step){ sum+=quietAt(x,y,phone?30:50); n++; }
    open=clamp(o.compensate.k/Math.max(.05,sum/n),1,phone?o.compensate.phone:o.compensate.max); }
  /* the first fill is stratified (one piece per jittered cell, cells visited in random order) so the field starts even */
  function fill(){
    const want=deck(baseCount()), n=want.length;
    if(P.length&&P.length!==n){
      /* fewer pieces (a slow device): remove an X and an O in turn, so the split stays even */
      let drop='X'; while(P.length>n){ const idx=P.map((p,i)=>p.ch===drop?i:-1).filter(i=>i>=0); P.splice(idx.length?idx[Math.random()*idx.length|0]:Math.random()*P.length|0,1); drop=drop==='X'?'O':'X'; }
      const have=P.length; for(let i=have;i<n;i++){ const p={x:rnd(-M,W+M),y:rnd(-M,H+M)}; looks(p,want[i][0],want[i][1]); p.q=0; P.push(p); }
      return; }
    if(P.length) return;
    const w=W+2*M, h=H+2*M, cell=Math.sqrt(w*h/n), cols=Math.max(1,Math.round(w/cell)), rows=Math.max(1,Math.ceil(n/cols));
    const cw=w/cols, chh=h/rows, idx=shuffle([...Array(cols*rows).keys()]).slice(0,n);
    idx.forEach((k,i)=>{ const p={}; p.x=-M+(k%cols+rnd(.1,.9))*cw; p.y=-M+((k/cols|0)+rnd(.1,.9))*chh; looks(p,want[i][0],want[i][1]); p.q=quietAt(p.x,p.y,p.s); P.push(p); });
  }

  /* ---- sprites: one per X/O x size x tilt x weight, rasterised at s*dpr device px and blitted 1:1 into the dpr-sized
     backing store (DPR applied exactly once). Round caps; the X is drawn a touch larger and heavier than the O (1.0 vs
     .94 of s, 1.08x the line) because an open X otherwise reads lighter than a closed ring. ---- */
  function sprite(p){
    const key=p.ch+p.s+'|'+p.ti+'|'+p.lw; let sp=sprites.get(key); if(sp) return sp;
    const s=p.s, X=p.ch==='X', lw=X?p.lw*1.08:p.lw, n=Math.ceil((s*1.45+lw+2)*dpr), c=document.createElement('canvas'); c.width=c.height=n; const g=c.getContext('2d');
    g.translate(n/2,n/2); g.rotate(TILTS[p.ti]); g.scale(dpr,dpr);
    g.strokeStyle=ink; g.lineWidth=lw; g.lineCap='round'; g.beginPath();
    if(X){ const r=(s-lw)/2; g.moveTo(-r,-r); g.lineTo(r,r); g.moveTo(r,-r); g.lineTo(-r,r); }
    else g.arc(0,0,(s*.94-lw)/2,0,Math.PI*2);
    g.stroke(); sp={c,h:n/2}; sprites.set(key,sp); return sp;
  }
  function draw(){
    lastShown=shown; cx.setTransform(1,0,0,1,0,0); cx.clearRect(0,0,cv.width,cv.height); if(shown<.004) return;
    for(const p of P){ const a=inkA*p.a*p.q*shown; if(a<.006) continue; const sp=sprite(p); cx.globalAlpha=a; cx.drawImage(sp.c,Math.round(p.x*dpr-sp.h),Math.round(p.y*dpr-sp.h)); }
    cx.globalAlpha=1;
  }

  /* ---- a soft personal space, through a spatial hash, so pieces rarely overlap and the field stays even ---- */
  let hashC=0, hW=0, hH=0, head=null, next=null;
  function separate(dt){
    const n=P.length; if(n<2) return; const rs=phone?90:190, k=22*dt;
    if(hashC!==rs||!head||next.length<n||hW!==Math.ceil((W+2*M)/rs)+1||hH!==Math.ceil((H+2*M)/rs)+1){ hashC=rs; hW=Math.ceil((W+2*M)/rs)+1; hH=Math.ceil((H+2*M)/rs)+1; head=new Int32Array(hW*hH); next=new Int32Array(Math.max(n,64)); }
    head.fill(-1);
    for(let i=0;i<n;i++){ const p=P[i], a=clamp((p.x+M)/rs|0,0,hW-1), b=clamp((p.y+M)/rs|0,0,hH-1), c=b*hW+a; p._c=a; p._r=b; next[i]=head[c]; head[c]=i; }
    for(let i=0;i<n;i++){ const p=P[i];
      for(let yy=p._r-1;yy<=p._r+1;yy++){ if(yy<0||yy>=hH) continue;
        for(let xx=p._c-1;xx<=p._c+1;xx++){ if(xx<0||xx>=hW) continue;
          for(let j=head[yy*hW+xx];j!==-1;j=next[j]){ if(j<=i) continue; const q=P[j], dx=p.x-q.x, dy=p.y-q.y, d2=dx*dx+dy*dy, r=Math.min(rs,(p.s+q.s)*.56+12);
            if(d2<r*r&&d2>.01){ const d=Math.sqrt(d2), u=1-d/r, f=k*u*u*r/d; p.dx+=dx*f*p.slow; p.dy+=dy*f*p.slow; q.dx-=dx*f*q.slow; q.dy-=dy*f*q.slow; } } } } }
  }
  const fv={x:0,y:0};
  function step(dt,t){
    t+=tOff;
    const decay=Math.exp(-1.25*dt), sc=phone?.75:1, usePtr=!phone&&ptr.amt>.001;
    if(usePtr){ const hb=host.getBoundingClientRect(); ptr.x=ptr.cx-hb.left; ptr.y=ptr.cy-hb.top;
      if(ptr.fresh){ ptr.sx=ptr.x; ptr.sy=ptr.y; ptr.vx=ptr.vy=0; ptr.fresh=false; }
      const k=1-Math.exp(-14*dt), ox=ptr.sx, oy=ptr.sy; ptr.sx+=(ptr.x-ptr.sx)*k; ptr.sy+=(ptr.y-ptr.sy)*k;
      const kv=1-Math.exp(-8*dt), cl=v=>clamp(v,-900,900); ptr.vx+=(cl((ptr.sx-ox)/dt)-ptr.vx)*kv; ptr.vy+=(cl((ptr.sy-oy)/dt)-ptr.vy)*kv; }
    /* the pointer: a sweep pushes outward and carries pieces along its path, so a whole group moves together; a parked
       cursor only leaves a soft dent. Each piece's pointer offset (ex,ey) hangs on a critically damped spring that brings it
       back onto its own path in the current, so nothing is left as an empty patch: small pieces answer and settle fast,
       large ones are heavier, lag, and drift back more slowly. */
    const mv=usePtr?Math.min(1,Math.hypot(ptr.vx,ptr.vy)/420):0, push=PUSH*ptr.amt*(.3+.7*mv), carry=CARRY*ptr.amt, vmax=phone?45:230, umax=320, fade=1-Math.exp(-4*dt), fadeOut=1-Math.exp(-9*dt);
    separate(dt);
    for(const p of P){
      p.dx*=decay; p.dy*=decay;
      const v2=p.dx*p.dx+p.dy*p.dy; if(v2>vmax*vmax){ const k=vmax/Math.sqrt(v2); p.dx*=k; p.dy*=k; }
      let ax=0, ay=0;
      if(usePtr){ const dx=p.x-ptr.sx, dy=p.y-ptr.sy, d2=dx*dx+dy*dy, RR=R+p.s*.35;
        if(d2<RR*RR&&d2>.01){ const d=Math.sqrt(d2), u=1-d/RR, u2=u*u, f=push*u2/d; ax=(dx*f+ptr.vx*carry*u2)/p.m; ay=(dy*f+ptr.vy*carry*u2)/p.m; } }
      if(ax||ay||p.ex||p.ey||p.ux||p.uy){
        const w=SPRING/Math.sqrt(p.m);
        p.ux+=(ax-w*w*p.ex-2*w*p.ux)*dt; p.uy+=(ay-w*w*p.ey-2*w*p.uy)*dt;
        const u2=p.ux*p.ux+p.uy*p.uy; if(u2>umax*umax){ const k=umax/Math.sqrt(u2); p.ux*=k; p.uy*=k; }
        p.ex+=p.ux*dt; p.ey+=p.uy*dt;
        if(Math.abs(p.ex)+Math.abs(p.ey)<.05&&Math.abs(p.ux)+Math.abs(p.uy)<.05) p.ex=p.ey=p.ux=p.uy=0; }
      flowAt(p.x,p.y,t,fv); p.vx=fv.x*sc*p.slow+p.dx+p.ux; p.vy=fv.y*sc*p.slow+p.dy+p.uy; steer(p);
      p.x+=p.vx*dt; p.y+=p.vy*dt;
      if(p.x<-M) p.x+=W+2*M; else if(p.x>W+M) p.x-=W+2*M;    // a torus: a piece leaving one edge, whole, comes back at the other
      if(p.y<-M) p.y+=H+2*M; else if(p.y>H+M) p.y-=H+2*M;
      const q=quietAt(p.x,p.y,p.s); p.q+=(q-p.q)*(q<p.q?fadeOut:fade);   // through zone edges gradually, never popping; out a little quicker
      /* a region can move a piece that has fully faded behind something (the /about laptop) to open space, where it fades in */
      if(o.relocate&&q<.02&&p.q<.03&&o.relocate(p,F)) p.q=0;
    }
    ptr.amt+=((ptr.on?1:0)-ptr.amt)*(1-Math.exp(-(ptr.on?4:2.2)*dt));
  }

  function readTheme(){
    const light=window.ZFTheme?ZFTheme.tone(o.tone())==='light':true, cs=getComputedStyle(o.inkFrom||host);
    ink=cs.getPropertyValue('--g6').trim()||(light?'#46443d':'#b3b1a9');   // the tone's own --g6: muted charcoal on cream, warm grey on dark
    inkA=light?.24:.19; sprites=new Map();
  }
  function layout(){
    const w=o.width(), h=o.height(); if(!w||!h) return;
    phone=mqCoarse.matches||innerWidth<640;
    const d2=Math.min(window.devicePixelRatio||1,phone?1.5:2); if(d2!==dpr){ dpr=d2; sprites=new Map(); }
    if(W&&H&&(w!==W||h!==H)){ const fx=w/W, fy=h/H; for(const p of P){ p.x*=fx; p.y*=fy; } }
    W=w; H=h; R=phone?150:clamp(W*.15,200,260); M=phone?44:80;
    const bw=Math.round(W*dpr), bh=Math.round(H*dpr); if(cv.width!==bw||cv.height!==bh){ cv.width=bw; cv.height=bh; }
    zones=o.zones?o.zones(F,{phone,W,H}):[]; compensate(); fill(); for(const p of P) p.q=quietAt(p.x,p.y,p.s);
    draw();                                       // resizing clears the bitmap: repaint in the same task, so nothing flashes
  }

  const onMove=e=>{ if(e.pointerType==='touch') return; if(!ptr.on) ptr.fresh=true; ptr.cx=e.clientX; ptr.cy=e.clientY; ptr.on=true; };
  const onLeave=e=>{ if(e.pointerType==='touch') return; ptr.on=false; };
  (o.pointerHost||host).addEventListener('pointermove',onMove,{passive:true});
  (o.pointerHost||host).addEventListener('pointerleave',onLeave,{passive:true});
  const io=new IntersectionObserver(es=>{ visible=es[es.length-1].isIntersecting; Loop.kick(); },{rootMargin:'40px 0px'}); io.observe(o.observe||host);

  Object.assign(F,{
    layout, readTheme, draw, step, cv,
    zonesChanged(){ zones=o.zones?o.zones(F,{phone,W,H}):[]; },
    setDyn(list){ dyn=list||[]; },
    live:()=>visible&&!document.hidden&&W>0&&shown>.004,
    needsDraw(){ const d=F.dirty||Math.abs(shown-lastShown)>.002; F.dirty=false; return d; },
    tick(dt,t){ if(o.before) o.before(F); step(dt,t); draw(); },
    still(){ if(o.before) o.before(F); for(const p of P) p.q=quietAt(p.x,p.y,p.s); draw(); },
    lessen(){ quality=.5; fill(); },
    shift(dx,dy){ for(const p of P){ p.x+=dx; p.y+=dy;
      if(p.x<-M) p.x+=W+2*M; else if(p.x>W+M) p.x-=W+2*M; if(p.y<-M) p.y+=H+2*M; else if(p.y>H+M) p.y-=H+2*M; } F.dirty=true; },
    destroy(){ io.disconnect(); (o.pointerHost||host).removeEventListener('pointermove',onMove); (o.pointerHost||host).removeEventListener('pointerleave',onLeave); cv.remove(); P=[]; },
    stats(){ return {count:P.length,open:+open.toFixed(2),W,H,dpr,R:Math.round(R),phone,shown:+shown.toFixed(3),visible,ink,inkA,zones:zones.length+dyn.length,
      maxSpeed:Math.round(P.reduce((m,p)=>Math.max(m,Math.hypot(p.vx,p.vy)),0))}; },
    sizes(){ const B=bands(), K=o.sizeK||1, b={}, xo={X:0,O:0}, per={}; for(const p of P){ const k=Math.round(B[p.band][1]*K)+'-'+Math.round(B[p.band][2]*K); b[k]=(b[k]||0)+1; xo[p.ch]++; per[k]=per[k]||{X:0,O:0}; per[k][p.ch]++; }
      const a=P.map(p=>inkA*p.a).sort((x,y)=>x-y); return {bands:b,xo,perBand:per,alphaMed:+a[a.length>>1].toFixed(3)}; },
    _sample(){ return P.map(p=>({x:p.x,y:p.y,s:p.s,ch:p.ch,lw:p.lw,a:p.a,q:p.q,vx:p.vx,vy:p.vy,dx:p.dx,dy:p.dy,ex:p.ex,ey:p.ey})); },
    _measure(ch,s,lw){ const sp=sprite({ch,s,ti:2,lw:lw||3}), g=sp.c.getContext('2d'), d=g.getImageData(0,0,sp.c.width,sp.c.height).data; let x0=1e9,x1=-1,y0=1e9,y1=-1;
      for(let y=0;y<sp.c.height;y++) for(let x=0;x<sp.c.width;x++) if(d[(y*sp.c.width+x)*4+3]>40){ x0=Math.min(x0,x); x1=Math.max(x1,x); y0=Math.min(y0,y); y1=Math.max(y1,y); }
      const r=cv.getBoundingClientRect(); return {inkW:+((x1-x0+1)/dpr).toFixed(1),inkH:+((y1-y0+1)/dpr).toFixed(1),dpr,backing:[cv.width,cv.height],css:[r.width,r.height]}; },
    _quiet:(x,y,s)=>quietAt(x,y,s), _zones:()=>zones.concat(dyn)
  });
  Object.defineProperties(F,{ shown:{get:()=>shown,set:v=>{ shown=v; }}, phone:{get:()=>phone}, W:{get:()=>W}, H:{get:()=>H} });
  readTheme(); layout();
  return F;
}

/* ================= the shared loop: only regions on screen and showing are stepped ================= */
const Loop=(()=>{ const list=[]; let raf=0, last=0, slow=0, ema=16, lessened=false;
  function frame(now){ raf=0; const t=now/1000, dt=last?Math.min(.05,t-last):1/60; last=t; let any=false;
    if(reduced){ for(const f of list){ if(f.needsDraw()) f.still(); } return; }
    for(const f of list){ if(f.live()){ f.tick(dt,t); any=true; } else if(f.needsDraw()) f.draw(); }
    /* devices that can't keep up get half the pieces in every region */
    ema+=(dt*1000-ema)*.05; if(ema>42&&!lessened){ if(++slow>90){ lessened=true; list.forEach(f=>f.lessen()); } } else slow=Math.max(0,slow-1);
    if(any) raf=requestAnimationFrame(frame); else last=0; }
  return { add(f){ list.push(f); }, list,
    kick(){ if(!raf&&!document.hidden) raf=requestAnimationFrame(frame); },
    stop(){ cancelAnimationFrame(raf); raf=0; last=0; } }; })();

/* ================= regions ================= */
const $=id=>document.getElementById(id);
const regions={};
/* the hero and the duck greeting (#about) share a lighter tuning: every size about 28% smaller and about 18% fewer
   pieces than the Games stage, which keeps the shared defaults */
const LIGHT={sizeK:.72, count:.82};

/* ---- hero: everywhere behind #home, steered around the full wordmark with its duck (widest berth), the tagline and
   Explore link (smaller), the runner controls while live (light), fading over the runner strip ---- */
const home=$('home');
if(home){
  const strip={top:1e9,f:80};
  regions.hero=Field({ name:'hero', host:home, density:LIGHT.count, sizeK:LIGHT.sizeK, compensate:{k:.65,max:1.8,phone:1.4},
    mount:cv=>home.insertBefore(cv,home.firstChild),
    width:()=>home.clientWidth, height:()=>home.clientHeight, tone:()=>home.dataset.tone||'light', strip,
    zones(F,{phone}){ const hb=home.getBoundingClientRect(), q=s=>home.querySelector(s), z=[], add=(b,...a)=>{ if(b) z.push(zone(b.l,b.t,b.r,b.b,...a)); };
      add(boxOf([q('.wm .l1'),q('.wm .l2'),q('.wm .wmduck')],hb),phone?14:26,phone?70:130,0,1);
      add(boxOf([q('.wm .sub')],hb),phone?8:12,phone?40:70,0,.7);
      add(boxOf([q('.explore')],hb),phone?6:10,phone?36:60,0,.6);
      const ctl=$('runCtl'); if(ctl&&ctl.offsetWidth) add(boxOf([ctl],hb),12,40,.4,0);
      const run=$('runner'); strip.top=run?run.getBoundingClientRect().top-hb.top:1e9; strip.f=phone?50:80;
      return z; } });
  regions.hero.shown=1;
}

/* ---- story: the Games stage (sticky, one screen tall). story.js reports its progress every frame (ZXO.story).
   While the deck is up, pieces show only in two loose clusters, top-right and bottom-left: each is a blob whose radius
   wobbles with angle (its own random harmonics, so the two are never mirror images), thinning smoothly toward the
   middle. The deck's chrome (heading, All games, search, arrows, Create/Join, the counter, the header) and every visible
   card are protected. As the face rises the clusters give way to the whole negative space around it; the face itself
   (eyes, bill, silhouette) is protected with a wide berth and steered around; everything fades as the face leaves
   for About. Nothing jumps when the scroll direction changes: every weight is a pure function of the progress. ---- */
const stage=$('ssStage'), games=$('games');
/* the Games stage's own tuning, separate from the hero and the duck greeting (LIGHT): fuller corner clusters than the
   first version (count about 1.3x, each cluster reaching about 15% further toward the middle), same sizes and contrast */
const STORY={density:1.9, reach:{desk:.8,phone:1.08}, faceK:1.45/1.9};   // faceK keeps the later frame around the duck face as it was
if(stage&&games){
  const blob=()=>({ h:[1,2,3].map(k=>({k:k+1,a:rnd(.08,.2)/k*1.6,p:rnd(0,6.28)})), r:rnd(.9,1.08) });
  const B1=blob(), B2=blob();
  let S=null, chrome=[];                                    // last progress from story.js; chrome boxes, stage-local
  const dims={W:stage.clientWidth||innerWidth,H:stage.clientHeight||innerHeight};
  const blobW=(b,dx,dy,R0)=>{ const th=Math.atan2(dy,dx); let r=R0*b.r; for(const h of b.h) r*=1+h.a*Math.sin(h.k*th+h.p); return 1-sm(Math.hypot(dx,dy)/r); };
  regions.story=Field({ name:'story', host:stage, pointerHost:games, density:STORY.density, inkFrom:games,
    mount:cv=>stage.insertBefore(cv,stage.firstChild),
    width:()=>stage.clientWidth, height:()=>stage.clientHeight, tone:()=>games.dataset.tone||'dark',
    zones(F,{phone}){ const sb=stage.getBoundingClientRect(), z=[];
      /* chrome boxes relative to the stage (it is sticky, so these do not move while it is pinned) */
      chrome=['.ss-head','#ssAll','#ssPrev','#ssNext','#ssFoot','#ssRooms','.gs-find','.gs-field','.gs-open'].map(s=>boxOf([stage.querySelector(s)||document.querySelector(s)],sb)).filter(Boolean)
        .map(b=>zone(b.l,b.t,b.r,b.b,phone?8:14,phone?30:50,0,0));
      const nav=$('topnav'); if(nav){ const r=nav.getBoundingClientRect(); chrome.push(zone(-40,-40,innerWidth+40,r.bottom,0,phone?24:40,0,0)); }   // the fixed header, where the pinned stage sits under it
      return z; },
    weight(x,y){ if(!S) return 0;
      const R0=Math.min(dims.W,dims.H)*STORY.reach[S.phone?'phone':'desk'];
      const c=Math.max(blobW(B1,x-dims.W*1.02,y+dims.H*.02,R0), blobW(B2,x+dims.W*.02,y-dims.H*1.02,R0*.95))*S.cA;
      return 1-(1-c)*(1-S.fA*.75*STORY.faceK); },                     // the story's base density is higher, for fuller corner clusters; the frame is evened back
    before(F){ dims.W=F.W; dims.H=F.H; if(!S) return; const list=[];
      const ch=S.chrome; if(ch>.01) for(const z of chrome) list.push(Object.assign({},z,{floor:1-ch}));
      for(const c of S.cards) list.push(zone(c.x-c.hw,c.y-c.hh,c.x+c.hw,c.y+c.hh,F.phone?8:16,F.phone?28:46,1-c.op,0));
      if(S.face){ const f=S.face; list.push(zone(f.x-f.rx,f.y-f.ry,f.x+f.rx,f.y+f.ry,f.rx*.12,f.rx*.32,0,1)); }
      F.setDyn(list); } });
  /* story.js calls this at the end of every update */
  regions.story.report=d=>{
    const sx=d.sr.l, sy=d.sr.t;
    const cA=d.still?1:seg(d.enter,.15,.75)*(1-seg(d.e1,.04,.3));
    const fA=d.still?0:seg(d.e1,.14,.5)*(1-seg(d.e3,.05,.55));      // overlaps the corners' fade, so there is no dip between them
    S={ phone:d.phone, still:d.still, cA, fA, chrome:d.chrome,
      cards:d.cards, face:d.face?{x:d.face.x-sx,y:d.face.y-sy,rx:d.face.rx,ry:d.face.ry}:null };
    regions.story.shown=Math.max(cA,fA)>0?1:0; regions.story.dirty=true;
    Loop.kick(); };
}

/* ---- about: everywhere behind #about except its text and controls; the About duck gets a wide, steered berth so the
   pieces frame it. Shows as the section scrolls in (a pure function of its position, so no restart either way). ---- */
const about=$('about');
if(about){
  regions.about=Field({ name:'about', host:about, density:.9*LIGHT.count, sizeK:LIGHT.sizeK,
    mount:cv=>about.insertBefore(cv,about.firstChild),
    width:()=>about.clientWidth, height:()=>about.clientHeight, tone:()=>about.dataset.tone||'light',
    zones(F,{phone}){ const ab=about.getBoundingClientRect(), z=[], add=(b,...a)=>{ if(b) z.push(zone(b.l,b.t,b.r,b.b,...a)); };
      add(boxOf([about.querySelector('.sechead')],ab),phone?8:14,phone?36:60,0,.6);
      about.querySelectorAll('.bio > *').forEach(el=>add(boxOf([el],ab),phone?6:12,phone?32:56,0,.5));
      const duck=$('duckSvg')||$('duckwrap'); add(boxOf([duck],ab),phone?10:20,phone?60:120,0,1);
      return z; } });
  regions.about.shown=0;
}

/* ---- reading pages (/story, /about): the side margins only. A fixed layer behind the page; the reading column
   (body data-xo-page, a selector; its content box), the sticky header and any wider pieces (data-xo-protect, e.g. the
   essay's figures) are protected, and pieces simply fade before them (no steering, so nothing piles up at the column's
   edge). The layer drifts a little as the page scrolls, so it feels attached to the page. Hidden when the margins are
   too narrow to hold anything (phones). ---- */
const pageSel=document.body&&document.body.dataset.xoPage;
let pageEl=null, pageMargin=0, pageY=scrollY;
if(pageSel){
  const wrap=document.createElement('div'); wrap.className='xo-page'; wrap.setAttribute('aria-hidden','true');
  wrap.style.cssText='position:fixed;inset:0;z-index:-1;pointer-events:none;overflow:hidden';
  document.body.insertBefore(wrap,document.body.firstChild);
  pageEl=document.querySelector(pageSel);
  const band=+(document.body.dataset.xoBand||50), wide=()=>document.body.dataset.xoProtect?[...document.querySelectorAll(document.body.dataset.xoProtect)]:[];
  let wideEls=[];
  regions.page=Field({ name:'page', host:wrap, pointerHost:document.documentElement, density:1, inkFrom:document.body,
    compensate:{k:.65,max:2.6,phone:1},
    mount:cv=>wrap.appendChild(cv),
    width:()=>wrap.clientWidth, height:()=>wrap.clientHeight, tone:()=>document.body.dataset.tone||'light',
    zones(F,{phone,W,H}){ const z=[]; wideEls=wide();
      if(pageEl){ const r=pageEl.getBoundingClientRect(), cs=getComputedStyle(pageEl), l=r.left+parseFloat(cs.paddingLeft), rr=r.right-parseFloat(cs.paddingRight);
        pageMargin=Math.min(l,W-rr); z.push(zone(l,-H*3,rr,H*4,6,band,0,0,20)); }
      const hd=document.querySelector('body > header'); if(hd){ const r=hd.getBoundingClientRect(); z.push(zone(-60,-60,W+60,Math.max(0,r.bottom),0,phone?20:32,0,0,0)); }
      return z; },
    before(F){ const list=[], H=F.H; for(const el of wideEls){ const r=el.getBoundingClientRect(); if(r.bottom<-150||r.top>H+150||!r.width) continue; list.push(zone(r.left,r.top,r.right,r.bottom,10,band,0,0,20)); } F.setDyn(list); } });
}

/* ---- laptop (/about): small and medium pieces in the room around the laptop, drawn behind it. The laptop's screen,
   the heading and the controls under the laptop are protected (measured every frame, since the laptop turns and grows
   as the page scrolls). about-desk.js reports its progress (ZXO.laptop): the pieces fade away as the camera moves into
   the screen, are gone before the desktop takes the window, and come back as the desktop folds back into the laptop.
   Its own sizes, strokes and count, separate from every homepage region. ---- */
const lapHero=$('hero'), lapStick=$('stick');
let lapState={z:0,full:false,goal:1};
if(lapHero&&lapStick&&$('screen')){
  const items=()=>[...lapStick.querySelectorAll('#hintro h1, #hintro p, #hintro button, #hcap')];
  regions.laptop=Field({ name:'laptop', host:lapStick, pointerHost:lapHero, inkFrom:document.body,
    density:phone=>phone?.23:.37,           /* about 23% fewer VISIBLE pieces than the first /about tuning (1.15 and .6), which hid about a third behind the laptop */
    bands:{ desk:[[.45,12,24],[.4,26,44],[.15,46,62]], phone:[[.5,10,18],[.38,20,30],[.12,32,40]] },
    alpha:{ desk:[[.82,.96],[.84,.98],[.78,.92]], phone:[[.82,.96],[.84,.98],[.78,.92]] },
    stroke:()=>rnd(1.9,2.7),
    mount:cv=>{ cv.style.cssText='position:absolute;inset:0;width:100%;height:100%;display:block;z-index:0;pointer-events:none;user-select:none'; lapStick.insertBefore(cv,lapStick.firstChild); },
    width:()=>lapStick.clientWidth, height:()=>lapStick.clientHeight, tone:()=>document.body.dataset.tone||'light',
    zones(){ return []; },
    /* a piece that drifted behind the laptop reappears around it: above, below, left or right, each side chosen in
       proportion to the square root of its free area, so the small spaces above and below get their share and the
       sides never hold the whole field */
    relocate(p,F){ const b=lapState.box; if(!b) return false; const W=F.W, H=F.H;
      const secs=[[0,0,W,b.t],[0,b.b,W,H],[0,b.t,b.l,b.b],[b.r,b.t,W,b.b]].filter(z=>z[2]-z[0]>p.s*1.5&&z[3]-z[1]>p.s*1.5);
      if(!secs.length) return false; const w=secs.map(z=>Math.sqrt((z[2]-z[0])*(z[3]-z[1]))); let k=Math.random()*w.reduce((a,c)=>a+c,0), z=secs[0];
      for(let i=0;i<secs.length;i++){ k-=w[i]; if(k<=0){ z=secs[i]; break; } }
      for(let i=0;i<10;i++){ const x=rnd(z[0]+p.s*.6,z[2]-p.s*.6), y=rnd(z[1]+p.s*.6,z[3]-p.s*.6); if(F._quiet(x,y,p.s)>.7){ p.x=x; p.y=y; p.ex=p.ey=p.ux=p.uy=p.dx=p.dy=0; return true; } }
      return false; },
    before(F){ const now=performance.now(), dt=Math.min(.1,(now-(lapState.t||now))/1000); lapState.t=now;
      F.shown=lapState.full?0:F.shown+(lapState.goal-F.shown)*(1-Math.exp(-7*dt)); if(Math.abs(F.shown-lapState.goal)<.008) F.shown=lapState.goal;     // eases toward the goal, so coming back out of the desktop fades in
      const sb=lapStick.getBoundingClientRect(), list=[], ph=F.phone;
      /* the whole laptop (lid and base, as turned and scaled right now), not only its screen: nothing is left hidden behind it */
      let l=1e9,t=1e9,r=-1e9,b=-1e9; for(const id of ['lid','base','screen']){ const e=$(id); if(!e) continue; const x=e.getBoundingClientRect(); if(!x.width||!x.height) continue; l=Math.min(l,x.left); t=Math.min(t,x.top); r=Math.max(r,x.right); b=Math.max(b,x.bottom); }
      if(r>l){ lapState.box={l:l-sb.left,t:t-sb.top,r:r-sb.left,b:b-sb.top}; list.push(zone(l-sb.left,t-sb.top,r-sb.left,b-sb.top,ph?6:8,ph?22:30,0,.6,24)); }
      { const n=$('topnav'), r=n&&n.getBoundingClientRect(); if(r&&r.height&&r.bottom>sb.top) list.push(zone(-80,-80,sb.width+80,r.bottom-sb.top,2,ph?10:14,0,.5,0)); }   /* nothing hides under the site header */
      /* the heading and its lines are protected where their text actually is (a block heading spans the whole width) */
      for(const el of items()){ let r=el.getBoundingClientRect(); if(!r.width||!r.height) continue; if(/^(H1|P)$/.test(el.tagName)){ const g=document.createRange(); g.selectNodeContents(el); const t=g.getBoundingClientRect(); if(t.width) r=t; }
        list.push(zone(r.left-sb.left,r.top-sb.top,r.right-sb.left,r.bottom-sb.top,ph?6:10,ph?30:46,0,.5)); }
      F.setDyn(list); } });
  regions.laptop.shown=1;
}
if(regions.laptop) paintLaptop();
function paintLaptop(){ const f=regions.laptop; if(!f) return; const rc=document.documentElement.classList;
  if(rc.contains('full')||rc.contains('pfull')) lapState.full=true;
  lapState.goal=lapState.full?0:1-sm(seg(lapState.z,0,.7));
  if(lapState.full) f.shown=0; else if(reduced) f.shown=lapState.goal; else if(f.shown<.01&&lapState.goal>0) f.shown=.01;
  f.dirty=true; Loop.kick(); }

/* the deck's story stretches the stage over a long runway; About's visibility follows its own position */
let aTop=0;
function measureAbout(){ if(about) aTop=about.getBoundingClientRect().top+scrollY; }
function onScroll(){
  if(regions.page){ const f=regions.page; f.shown=pageMargin>=64?1:0; const d=scrollY-pageY; pageY=scrollY; if(d&&!reduced) f.shift(0,-d*.3); }
  if(regions.about){ const top=aTop-scrollY, VH=innerHeight; regions.about.shown=sm(seg(VH-top,VH*.05,VH*.6)); }
  Loop.kick(); }

/* ---- wiring ---- */
const all=()=>Object.values(regions);
all().forEach(f=>Loop.add(f));
addEventListener('scroll',onScroll,{passive:true});
let rzT=0; function relayoutAll(){ rzT=0; measureAbout(); all().forEach(f=>f.layout()); onScroll(); }
const ro=window.ResizeObserver?new ResizeObserver(()=>{ if(!rzT) rzT=requestAnimationFrame(relayoutAll); }):null;
if(ro){ [home,stage,about,home&&home.querySelector('.title'),pageEl,lapStick].forEach(n=>n&&ro.observe(n)); } else addEventListener('resize',relayoutAll);
document.addEventListener('zf-theme',()=>{ all().forEach(f=>{ f.readTheme(); f.draw(); }); });
document.addEventListener('visibilitychange',()=>{ if(document.hidden) Loop.stop(); else Loop.kick(); });
const onReduce=()=>{ reduced=mqReduce.matches||!!lapState.calm; Loop.stop(); all().forEach(f=>f.still()); Loop.kick(); };
mqReduce.addEventListener&&mqReduce.addEventListener('change',onReduce);
mqCoarse.addEventListener&&mqCoarse.addEventListener('change',relayoutAll);
if(document.fonts&&document.fonts.ready) document.fonts.ready.then(relayoutAll);
measureAbout(); onScroll(); if(reduced) all().forEach(f=>f.still()); Loop.kick();

window.ZXO=Object.assign({},regions,{
  story:regions.story?d=>regions.story.report(d):()=>{},
  /* about-desk.js: z, the camera's move into the screen (0..1); full, the desktop has the window; calm, its own reduce motion */
  laptop(d){ if(!regions.laptop) return; if(d.z!=null) lapState.z=d.z; if(d.full!=null) lapState.full=d.full;
    if(d.calm!=null&&d.calm!==lapState.calm){ lapState.calm=d.calm; reduced=mqReduce.matches||d.calm; Loop.stop(); if(reduced) all().forEach(f=>f.still()); Loop.kick(); }
    paintLaptop(); },
  regions, loop:Loop,
  destroy(){ Loop.stop(); removeEventListener('scroll',onScroll); if(ro) ro.disconnect(); all().forEach(f=>f.destroy()); delete window.ZXO; } });
if(regions.laptop) ZXO.laptop({calm:document.documentElement.classList.contains('calm')});
})();
