/* duck-face.js: the site's mascot, one character everywhere it is drawn large.
   The face is the logo duck (icon-512.png), traced: soft round head with cheeks, friendly dark eyes with a highlight
   (a thin white rim lets them look around), the wide muted-gold bill with its open smile and two nostrils.
   The About duck is that same face turned three-quarters toward the About text (left), on the rubber-duck body, wing
   and tail of the original About drawing (mirrored so the whole duck faces the text). Its bill is drawn for that pose
   (see beak below) rather than the logo's front-facing bill moved sideways. Phones, where the duck sits above
   the paragraph, get a mostly front-facing pose.
   A turn t (0 = facing you, 1 = three-quarters toward the left) is a function of points, so any in-between pose is the
   same face partly turned: story.js turns the large face into the About duck through those poses.
   Units: the About drawing's own 400x320 units, mirrored about x=236 (the head's centre), so the head stays put while
   the body moves to its other side. The About svg's viewBox starts at x=VBX to keep the duck centred in its box. */
(function(){
'use strict';
const FR={
  head:'M235.9 46C241.5 46 247.3 46.6 252.8 48C258.2 49.3 263.8 51.4 268.7 54.2C273.6 57 278.3 60.7 282 64.9C285.7 69 288.7 74.2 290.8 79.3C293 84.3 294.1 89.9 295 95.1C295.8 100.4 294.8 105.3 296.1 111C297.5 116.6 302.6 122.9 303 128.9C303.3 134.9 301.1 141.7 298.2 147C295.3 152.2 290.4 156.9 285.6 160.7C280.9 164.4 275.2 167.2 269.7 169.5C264.3 171.8 258.6 173.4 252.9 174.5C247.3 175.5 241.6 176 235.9 175.9C230.2 175.9 224.6 175.4 218.9 174.3C213.3 173.3 207.5 171.8 202.1 169.5C196.6 167.3 190.9 164.4 186.2 160.7C181.5 156.9 176.6 152.2 173.7 146.9C170.8 141.6 168.7 134.9 169 128.9C169.3 122.9 174.4 116.6 175.7 111C177 105.3 175.8 100.4 176.7 95.1C177.6 89.8 178.8 84.3 181 79.3C183.2 74.2 186.1 69 189.8 64.9C193.5 60.7 198.3 57 203.1 54.2C208 51.4 213.6 49.3 219 48C224.5 46.6 230.3 46 235.9 46Z',
  bill:'M235.9 110C237.4 110 239 110.2 240.5 110.6C241.9 111 243.3 111.8 244.6 112.6C245.9 113.4 247 114.4 248.1 115.4C249.2 116.3 250.3 117.2 251.3 118.2C252.3 119.1 253.2 120.2 254.3 121.1C255.5 122 256.4 122.9 258.2 123.7C260 124.5 261.5 125.1 264.9 126C268.4 126.9 275.8 127.2 278.9 129C281.9 130.7 283.1 134 283.2 136.6C283.2 139.1 281.4 142.1 279.2 144.2C277.1 146.3 272.9 147.7 270.2 149C267.4 150.3 264.9 151.1 262.8 152.1C260.7 153 259.1 153.8 257.6 154.7C256 155.6 254.8 156.5 253.4 157.4C252 158.3 250.8 159.2 249.4 159.9C248 160.6 246.5 161.1 245 161.6C243.5 162 242 162.4 240.5 162.7C239 162.9 237.4 163 235.9 163C234.4 163 232.8 162.9 231.3 162.7C229.8 162.4 228.3 162 226.8 161.6C225.3 161.1 223.8 160.6 222.4 159.9C221 159.2 219.8 158.3 218.4 157.4C217 156.5 215.8 155.6 214.2 154.7C212.7 153.8 211.1 153 209 152.1C206.9 151.1 204.4 150.3 201.6 149C198.9 147.7 194.7 146.3 192.6 144.2C190.4 142.1 188.8 139.1 188.8 136.6C188.9 134 189.9 130.7 192.9 129C196 127.2 203.6 126.9 207 126C210.5 125.2 211.8 124.5 213.6 123.7C215.3 122.8 216.3 122 217.5 121.1C218.6 120.2 219.5 119.1 220.5 118.2C221.5 117.2 222.6 116.3 223.7 115.4C224.8 114.4 225.9 113.4 227.2 112.6C228.5 111.8 229.9 111 231.3 110.6C232.8 110.2 234.4 110 235.9 110Z',
  lens:'M214.9 145.5C222 141 229 137.5 235.9 137.5C243 137.5 250 141 257.2 145.7C250 152 243 155.4 235.9 155.4C229 155.4 221 152 214.9 145.5Z',
  smile:'M197.4 133.2C197.6 137 201 141 207 143.5C210 144.7 213 145.4 215.5 145.5C222 141 229 137.5 235.9 137.5C243 137.5 250 141 256.5 145.5C259 145.4 262 144.7 265 143.5C271 141 274.2 137 274.4 133.2',
  lip:'M217.2 137.4Q235.9 124.6 254.6 137.2Q235.9 129.8 217.2 137.4Z',
  shade:'M174 140C186 168 286 168 298 140C302 160 280 178 236 178C192 178 170 160 174 140Z'
};
const C=236, VBX=90, VIEWBOX=VBX+' 0 400 320';
const NOSE=[[226.4,123.8],[245.4,123.8]], NOSE_R=[2.4,2.8];
const EYE={dx:31,cy:101.5,rx:10.8,ry:13.2,prx:8.2,pry:10.2};
/* depth: features nearer the front of the face travel further as it turns, and the far side is foreshortened */
const DEPTH={head:{sh:0,f:1,n:1}, eye:{sh:28,f:.66,n:.97}, bill:{sh:52,f:.8,n:.95}};
const lerp=(a,b,t)=>a+(b-a)*t;
function X(x,t,kind){ const d=DEPTH[kind]; return C-d.sh*t+(x-C)*(x<C?lerp(1,d.f,t):lerp(1,d.n,t)); }
/* eye i: 0 the left eye (Create), 1 the right eye (Join). Turning left, the right eye is the near one */
function eye(i,t,cheek){ cheek=cheek||0; const cx0=C+(i?1:-1)*EYE.dx, sx=i?lerp(1,.98,t):lerp(1,.62,t), sy=i?1:lerp(1,.94,t);
  return {cx:X(cx0,t,'eye'),cy:EYE.cy-cheek*.8+(i?0:t*.8),rx:EYE.rx*sx,ryT:EYE.ry*.86*sy,ryB:EYE.ry*(1-.16*cheek)*sy,prx:EYE.prx*sx,pry:EYE.pry*sy}; }
const nose=t=>NOSE.map(n=>[X(n[0],t,'bill'),n[1]]);
/* The About duck's own bill. The logo's bill is drawn for a face looking straight at you (symmetric, flared corners,
   a wide open mouth); turned, it would read as lips. So the About duck has a bill drawn for its pose: rounded, a
   little lower on the face, with a gentle closed smile. Facing you (BA0) it is symmetric; three-quarters (BA1) it
   projects to the left from a broad root at the cheek, fuller on top and tapering to a rounded tip; a short mouth line
   from the near corner (on the cheek) separates the upper bill from the shorter lower one.
   Both are listed the same way round (clockwise from the top of the ridge), so every turn in between is a blend.
   beak(t,a) blends the logo bill (a=0) into this one (a=1); story.js turns the large face with a rising with t. */
const BA0=[[236,119],[254,120.5],[270,126],[279,135],[276,145],[262,153],[246,157.5],[236,158],[226,157.5],[210,153],[196,145],[193,135],[202,126],[218,120.5]];
const BA1=[[196,120.6],[214,119.6],[228,121.5],[236.5,129.5],[238.5,142],[233,153],[220,158.5],[203,159],[187,155.8],[174,150.6],[166,146.2],[160.5,138.5],[163.5,129.2],[177.5,122.6]];
const SA0=[[206,140],[221,146.6],[251,146.6],[266,140]], SA1=[[195,149.6],[208,151.2],[223,149.6],[234.5,143.4]];
const NA0=[[227,128.5,2.3,2.6],[245,128.5,2.3,2.6]], NA1=[[190.5,127,1.3,1.7],[208,128.2,2.3,2.6]];
function catmull(P,closed){ const n=P.length, g=i=>closed?P[(i+n)%n]:P[Math.max(0,Math.min(n-1,i))]; let d='M'+r1(P[0][0])+' '+r1(P[0][1]);
  for(let i=0;i<(closed?n:n-1);i++){ const a=g(i-1),b=g(i),c=g(i+1),e=g(i+2);
    d+='C'+[b[0]+(c[0]-a[0])/6,b[1]+(c[1]-a[1])/6,c[0]-(e[0]-b[0])/6,c[1]-(e[1]-b[1])/6,c[0],c[1]].map(r1).join(' '); }
  return d+(closed?'Z':''); }
/* n points along a path; closed paths start at the leftmost point and run clockwise */
let probeP=null; const SC=new Map();
function sample(d,n,closed){ const key=d+'|'+n; if(SC.has(key)) return SC.get(key);
  if(!probeP){ const NS='http://www.w3.org/2000/svg', sv=document.createElementNS(NS,'svg'); sv.setAttribute('style','position:absolute;width:0;height:0;overflow:hidden;visibility:hidden'); sv.setAttribute('aria-hidden','true');
    probeP=document.createElementNS(NS,'path'); sv.appendChild(probeP); (document.body||document.documentElement).appendChild(sv); }
  probeP.setAttribute('d',d); const L=probeP.getTotalLength(), M=closed?n*4:n, pts=[];
  for(let i=0;i<M;i++){ const q=probeP.getPointAtLength(closed?L*i/M:L*i/(M-1)); pts.push([q.x,q.y]); }
  let out=pts;
  if(closed){ let k=0; for(let i=1;i<M;i++) if(pts[i][0]<pts[k][0]) k=i;
    let r=pts.slice(k).concat(pts.slice(0,k)), area=0; for(let i=0;i<r.length;i++){ const a=r[i],b=r[(i+1)%r.length]; area+=a[0]*b[1]-b[0]*a[1]; }
    if(area<0) r=[r[0]].concat(r.slice(1).reverse());
    out=[]; for(let i=0;i<n;i++) out.push(r[Math.floor(i*r.length/n)]); }
  SC.set(key,out); return out; }
const mix=(A,B,t)=>A.map((p,i)=>p.map((v,j)=>lerp(v,B[i][j],t)));
const NB=120, NM=60;
function beak(t,a,smile){ a=a==null?1:a; smile=smile==null?1:smile; const turn=P=>P.map(p=>[X(p[0],t,'bill'),p[1]]);
  const bill=mix(turn(sample(FR.bill,NB,true)),mix(sample(catmull(BA0,true),NB,true),sample(catmull(BA1,true),NB,true),t),a);
  const sm=mix(turn(sample(FR.smile,NM,false)),mix(sample(catmull(SA0,false),NM,false),sample(catmull(SA1,false),NM,false),t),a);
  const mid=sm[NM>>1];
  /* the logo's open mouth closes into the smile as the bill becomes the About duck's */
  const shut=P=>P.map(p=>[lerp(p[0],mid[0],a),lerp(p[1],mid[1]-1,a)]);
  const lens=shut(turn(sample(FR.lens,NB,true)).map(p=>[p[0],139+(p[1]-139)*smile])), lip=shut(turn(sample(FR.lip,NB,true)));
  const ln=nose(t), na=mix(NA0,NA1,t), nostrils=ln.map((p,i)=>mix([[p[0],p[1],NOSE_R[0],NOSE_R[1]]],[na[i]],a)[0]);
  return {bill,smile:sm,lens,lip,nostrils,open:a<.995}; }
const polyD=(P,closed)=>'M'+P.map(p=>r1(p[0])+' '+r1(p[1])).join('L')+(closed?'Z':'');
/* transform an absolute path (M C Q L Z) point by point */
function mapPath(d,f){ return d.replace(/([MCQLZ])([^MCQLZ]*)/g,(m,c,args)=>{ const v=(args.match(/-?[\d.]+/g)||[]).map(Number), o=[];
  for(let i=0;i+1<v.length;i+=2){ const p=f(v[i],v[i+1]); o.push(r1(p[0])+' '+r1(p[1])); } return c+o.join(' '); }); }
const r1=v=>Math.round(v*10)/10;
const mx=x=>2*C-x;
/* the original About drawing's body, wing and tail, mirrored to face the text */
const AB0={
  tail:'M64 200C46 190 38 168 50 156C58 168 72 178 90 180Z',
  body:'M60 214C52 190 66 170 90 168C112 136 168 122 214 136C268 128 322 156 326 208C330 264 272 294 196 294C112 294 66 264 60 214Z',
  shade:'M84 252C130 286 252 290 308 252C312 266 292 284 242 292C172 298 100 284 84 252Z',
  wing:'M112 216C118 184 178 174 228 194C234 216 216 252 166 258C132 258 110 240 112 216Z', wl1:'M134 224C152 226 176 220 194 210', wl2:'M146 240C162 240 184 234 202 222',
  neck:'M188 176C206 182 244 182 268 172L268 156L188 160Z'
};
const BODY={}; for(const k in AB0) BODY[k]=mapPath(AB0[k],(x,y)=>[mx(x),y]);
const GROUND={cx:mx(196),cy:299,rx:134,ry:9}, WING_PIVOT=[mx(170),216];
function egg(cx,cy,rx,rT,rB){ const f=v=>r1(v); return `M${f(cx-rx)} ${f(cy)}A${f(rx)} ${f(rT)} 0 0 1 ${f(cx+rx)} ${f(cy)}A${f(rx)} ${f(rB)} 0 0 1 ${f(cx-rx)} ${f(cy)}Z`; }
/* the pose the About duck holds: three-quarters toward the text on wide screens, mostly facing you on phones */
const phoneAbout=()=>matchMedia('(max-width:640px)').matches;
const aboutTurn=()=>phoneAbout()?.3:1;
/* the About duck's markup. ids and classes are what index.html animates */
function drawing(o){ o=o||{}; const t=o.t==null?aboutTurn():o.t;
  const bk=beak(t,1);
  const eyes=[1,0].map(i=>{ const e=eye(i,t), near=i===1, d=egg(e.cx,e.cy,e.rx,e.ryT,e.ryB), clip=near?'duckNearClip':'duckFarClip';
    return {near,d,clip,html:`<g class="${near?'eyeN':'eyeF'}"><path class="ln eyew" d="${d}"/><g clip-path="url(#${clip})"><g class="pu ${near?'pN':'pF'}" id="${near?'pupil':'pupil2'}"><ellipse cx="${r1(e.cx)}" cy="${r1(e.cy)}" rx="${r1(e.prx)}" ry="${r1(e.pry)}"/><circle class="gl" cx="${r1(e.cx+e.prx*.34)}" cy="${r1(e.cy-e.pry*.42)}" r="2.3"/></g></g><path class="ln" d="${d}"/></g>`}; });
  return `<g class="dk dk34" id="duck">
      <ellipse class="grd" cx="${GROUND.cx}" cy="${GROUND.cy}" rx="${GROUND.rx}" ry="${GROUND.ry}"/>
      <path class="ln fl" d="${BODY.tail}"/>
      <path class="ln fl" d="${BODY.body}"/>
      <path class="sh" d="${BODY.shade}"/>
      <g class="wing"><path class="ln fl" d="${BODY.wing}"/><path class="ln" d="${BODY.wl1}"/><path class="ln" d="${BODY.wl2}"/></g>
      <g class="head" id="duckhead">
        <path class="ln fl" d="${FR.head}"/>
        <path d="${BODY.neck}" fill="#fffdf6"/>
        <path class="sh" d="${FR.shade}" clip-path="url(#duckHeadClip)"/>
        <path class="ln" d="${FR.head}"/>
        ${eyes.map(e=>e.html).join('')}
        <path class="ln bk" d="${polyD(bk.bill,true)}"/>
        <path class="ln sm" d="${polyD(bk.smile,false)}"/>
        ${bk.nostrils.map(n=>`<ellipse class="pu" cx="${r1(n[0])}" cy="${r1(n[1])}" rx="${r1(n[2])}" ry="${r1(n[3])}"/>`).join('')}
      </g>
      <clipPath id="duckHeadClip"><path d="${FR.head}"/></clipPath>${eyes.map(e=>`<clipPath id="${e.clip}"><path d="${e.d}"/></clipPath>`).join('')}
    </g>`; }
/* geometry index.html needs for the pupils, the head tilt and the close-ups (in viewBox units) */
function about(t){ t=t==null?aboutTurn():t; const n=eye(1,t), f=eye(0,t), b=mix(NA0,NA1,t);
  return {t, near:n, far:f, head:[C,112], bill:[(b[0][0]+b[1][0])/2,138], wing:[mx(168),226]}; }
/* dizzy: fast back-and-forth mouse movement close to the duck (several quick changes of direction, not one sweep)
   makes it dizzy for about two seconds. watchDizzy calls fire() at most once per cooldown and never while a reaction
   runs (ready()). dizzyPose(u), u from 0 to 1 over DIZZY_MS, gives:
     w      how much the reaction owns the eyes (0..1; the gaze is mixed back in as it falls, so they resume smoothly)
     eyes   per eye {vx,vy} (-1..1 of the pupil's room) and s (pupil size): small circles, out of step with each
            other, then a moment out of focus (drifting apart)
     tilt   degrees: a slow lean with a soft wobble, straightening at the end (no side-to-side shake)
     blink  true from the slow blink on
     stars  three small flat stars on an orbit above the head: {x,y} offsets from the orbit's centre, r, rot, op, gold */
const DIZZY_MS=2100, DIZZY_COOL=8000;
/* deliberate shaking near the duck: a few back-and-forth strokes, left-right or up-down. Each stroke must travel at
   least STROKE px (pointer jitter never counts), and only a reversal between two such strokes counts, so a single sweep
   across the page is never one. FLIPS reversals within WINDOW ms, at the duck, set it off; speed doesn't matter */
const STROKE=26, FLIPS=3, WINDOW=1800;
function watchDizzy(o){ if(matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  let last=null, cool=0; const ax=()=>({dir:0,run:0,prevOk:false,flips:[]}); let A=[ax(),ax()];
  addEventListener('pointermove',e=>{ if(e.pointerType!=='mouse') return; const now=performance.now(), x=e.clientX, y=e.clientY;
    if(!last||now-last.t>350){ last={x,y,t:now}; A=[ax(),ax()]; return; }                     // a pause starts afresh
    const d=[x-last.x,y-last.y]; last={x,y,t:now};
    for(let i=0;i<2;i++){ const a=A[i], v=d[i]; if(Math.abs(v)<.5) continue; const sg=v>0?1:-1;
      if(sg===a.dir){ const was=a.run; a.run+=Math.abs(v);
        if(was<STROKE&&a.run>=STROKE&&a.prevOk&&o.near(x,y)) a.flips.push(now); }               // the stroke back has become a real one
      else { a.prevOk=a.dir!==0&&a.run>=STROKE; a.dir=sg; a.run=Math.abs(v);
        if(a.run>=STROKE&&a.prevOk&&o.near(x,y)) a.flips.push(now); }
      a.flips=a.flips.filter(t=>now-t<WINDOW);
      if(a.flips.length>=FLIPS&&now>cool&&o.ready()){ A=[ax(),ax()]; cool=now+DIZZY_COOL; o.fire(); return; } } },{passive:true}); }
const sm=(a,b,u)=>{ const t=Math.max(0,Math.min(1,(u-a)/(b-a))); return t*t*(3-2*t); };
function dizzyPose(u){ u=Math.max(0,Math.min(1,u));
  const w=sm(0,.06,u)*(1-sm(.86,1,u)), unf=sm(.6,.72,u);
  const eyes=[0,1].map(i=>{ const turns=i?2.15:1.85, ph=i?1.1:0, a=ph+u*Math.PI*2*turns, rr=.62*sm(.03,.15,u);
    const cx=Math.cos(a)*rr, cy=Math.sin(a)*rr*.85, fx=(i?.5:-.5), fy=.3;      // out of focus: a little apart and down
    return {vx:cx+(fx-cx)*unf, vy:cy+(fy-cy)*unf, s:1-.16*unf*(1-sm(.82,.92,u))}; });
  const hd=sm(0,.18,u)*(1-sm(.82,1,u)), tilt=hd*(5+3*Math.sin(u*Math.PI*2*1.25));
  const sop=sm(.04,.16,u)*(1-sm(.7,.84,u));
  const stars=[0,1,2].map(i=>{ const a=i*Math.PI*2/3+u*Math.PI*2*1.3, depth=(1+Math.sin(a))/2;   // sin>0: the near side of the orbit
    return {x:Math.cos(a), y:Math.sin(a), r:.78+.22*depth, rot:u*200+i*40, op:sop*(.75+.25*depth), gold:i===1}; });
  return {w, eyes, tilt, blink:u>=.8, stars}; }
/* a small flat five-pointed star, rounded by the stroke's joins */
function starD(x,y,r,rot){ let d=''; for(let k=0;k<10;k++){ const a=(rot-90)*Math.PI/180+k*Math.PI/5, q=k%2?r*.48:r; d+=(k?'L':'M')+r1(x+Math.cos(a)*q)+' '+r1(y+Math.sin(a)*q); } return d+'Z'; }
window.ZFDuckFace={DIZZY_MS,watchDizzy,dizzyPose,starD,FR,C,VBX,VIEWBOX,NOSE,NOSE_R,EYE,BODY,GROUND,WING_PIVOT,X,eye,nose,beak,egg,mapPath,drawing,about,aboutTurn,phoneAbout};
})();
