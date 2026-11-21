/* cinema.js: a short film that opens each game. The first time someone opens a game, a window rises over the page
   and plays four drawn scenes of where the game (or the idea behind it) comes from: the place, the people of the
   time, the idea, and where the game stands today. Modern games say plainly that they are modern. Each scene has a subtitle (our narration) and, where it
   matters, a small note on how sure we are. A score made for each game (Web Audio, nothing downloaded) plays only
   after the visitor taps Sound on; the site music steps aside while it does.
   - Skip, ×, Esc or Play close it, and it shrinks into the corner, where the story card (story-ticker.js) carries on.
   - It plays by itself every time a game is opened (not on a reload). The story card has a Watch button to see it again.
   - Tap the left or right of the picture to go back or forward.
   - Line art in currentColor, gold #c9a63f for one detail per scene, both tones, no gradients.
   - Reduced motion: no drawing, walking or zooming; the scenes and subtitles still change. */
(function(){
'use strict';
const SEEN='zf-cine-seen', STEP=7600, GOLD='#c9a63f';
const seen=()=>{ try{ return JSON.parse(localStorage.getItem(SEEN)||'[]'); }catch(e){ return []; } };
const markSeen=s=>{ try{ const a=seen(); if(!a.includes(s)){ a.push(s); localStorage.setItem(SEEN,JSON.stringify(a)); } }catch(e){} };
const slugNow=()=>location.pathname.replace(/^\/+|\/+$/g,'').split('/')[0];
const reduced=()=>{ try{ return matchMedia('(prefers-reduced-motion: reduce)').matches; }catch(e){ return false; } };

/* ---------- drawing helpers ---------- */
const P=(d,c,st)=>`<path d="${d}"${c?` class="${c}"`:''}${st?` style="${st}"`:''}/>`;
const D=(d,c,dl,t)=>`<path pathLength="1" d="${d}" class="dr${c?' '+c:''}" style="--d:${dl||0}s${t?`;--t:${t}s`:''}"/>`;   // draws itself on
const C=(x,y,r,c,st)=>`<circle cx="${x}" cy="${y}" r="${r}"${c?` class="${c}"`:''}${st?` style="${st}"`:''}/>`;
const G=(inner,c,st,tr)=>`<g${tr?` transform="${tr}"`:''}><g${c?` class="${c}"`:''}${st?` style="${st}"`:''}>${inner}</g></g>`;
const TX=(x,y,s,c,st)=>`<text x="${x}" y="${y}"${c?` class="${c}"`:''}${st?` style="${st}"`:''}>${s}</text>`;
const f1=n=>Math.round(n*10)/10;

/* people: anonymous, faceless, dressed for their time. feet at 0, about 110 tall standing.
   kind: jama (Mughal robe and turban), dhoti (wrap, bare chest), blanket (herder's blanket), cloak (Mexica tilma),
   monk (robe, bowl), shirt (today). pose: stand | sit (cross-legged, reaching right) | chair (reaching right). */
function hair(h,y){
  if(h==='turban') return P(`M-9.6 ${y-1} C-11 ${y-15} 11 ${y-15} 9.6 ${y-1} C4 ${y-4.5} -4 ${y-4.5} -9.6 ${y-1}Z`,'f')+P(`M-6 ${y-10.5} C-1 ${y-6} 4 ${y-6} 8 ${y-8}`,'thin');
  if(h==='bun') return P(`M-8.6 ${y} C-9 ${y-11} 9 ${y-11} 8.6 ${y} C4 ${y-3} -4 ${y-3} -8.6 ${y}Z`,'fc')+C(2,y-10.5,4,'fc');
  if(h==='short') return P(`M-8.6 ${y} C-9 ${y-11} 9 ${y-11} 8.6 ${y} C4 ${y-3} -4 ${y-3} -8.6 ${y}Z`,'fc');
  if(h==='kofia') return P(`M-9 ${y-3} L-8.4 ${y-12} L8.4 ${y-12} L9 ${y-3} Z`,'f')+P(`M-8.6 ${y-7.5} L8.6 ${y-7.5}`,'thin');
  if(h==='fringe') return P(`M-8.8 ${y+3} C-10 ${y-11} 10 ${y-11} 8.8 ${y+3} L8 ${y-2} C3 ${y-4} -3 ${y-4} -8 ${y-2}Z`,'fc');
  return '';
}
function fig(o){
  const k=o.kind||'dhoti', pose=o.pose||'stand', fill=o.fill||'f';
  let s='';
  if(pose==='stand'){
    const arms=P('M-9 -84 C-14 -74 -15 -64 -14 -55')+P('M9 -84 C14 -74 15 -64 14 -55');
    if(k==='jama') s=P('M-9 -86 L9 -86 L11 -56 C15 -38 19 -18 23 -1 L-23 -1 C-19 -18 -15 -38 -11 -56 Z',fill)+P('M-11 -56 L11 -56')+P('M3 -56 L5 -38','thin')+arms;
    else if(k==='dhoti') s=P('M-6.5 -32 L-7 0 M6.5 -32 L7 0')+P('M-9 -86 C-10 -74 -9 -63 -8 -56 L8 -56 C9 -63 10 -74 9 -86 Z',fill)+P('M-9.5 -56 L9.5 -56 L11 -32 L2.5 -32 L0 -42 L-2.5 -32 L-11 -32 Z',fill)+arms;
    else if(k==='blanket') s=P('M-5 -40 L-6 0 M5 -40 L6 0')+P('M-13 -88 C-15 -72 -16 -54 -15 -38 L15 -38 C16 -54 15 -72 13 -88 Z',fill)+P('M-15.4 -50 L15.4 -50 M-15.6 -46 L15.6 -46','thin')+P('M10 -80 C14 -72 16 -66 18 -62')+(o.staff?P('M17 -84 L25 0'):'');
    else if(k==='cloak') s=P('M-6 -38 L-7 0 M6 -38 L7 0')+P('M-9 -86 C-10 -72 -9 -50 -8 -40 L8 -40 C9 -50 10 -72 9 -86Z',fill)+P('M-3 -40 L3 -40 L2 -30 L-2 -30Z',fill)+P('M-11 -87 L9 -87 L14 -34 L-14 -44 Z',fill)+C(7,-86,2.5,'fc')+P('M-11 -82 C-15 -72 -16 -62 -15 -52');
    else if(k==='saree') s=P('M-9 -86 L9 -86 L12 -56 C14 -36 16 -16 18 -1 L-18 -1 C-16 -16 -14 -36 -12 -56 Z',fill)+P('M-9 -86 C-2 -74 6 -64 12 -56 M-12 -56 C-4 -50 6 -50 12 -56','thin')+P('M-3 -30 L-4 -1 M3 -30 L3 -1','thin')+arms;
    else if(k==='kanzu') s=P('M-9 -86 L9 -86 L11 -56 L13 -1 L-13 -1 L-11 -56 Z',fill)+P('M0 -86 L0 -70','thin')+arms;
    else if(k==='shirt') s=P('M-7 -50 L-8 0 M7 -50 L8 0')+P('M-9 -86 C-10 -72 -9 -56 -9 -48 L9 -48 C9 -56 10 -72 9 -86Z',fill)+P('M-3 -86 L0 -80 L3 -86','thin')+arms;
    else if(k==='monk') s=P('M-6 -5 L-6 0 M6 -5 L6 0')+P('M-10 -86 C-13 -60 -15 -30 -14 -5 L14 -5 C15 -30 13 -60 10 -86 Z',fill)+P('M-10 -86 C0 -70 8 -50 14 -32','thin')+P('M-10 -83 C-14 -70 -11 -58 -7 -54 M10 -83 C14 -70 11 -58 7 -54')+P('M-8.5 -55 Q0 -44 8.5 -55 Z','f');
    s+=P('M-2.5 -89.6 L-2.5 -86 M2.5 -89.6 L2.5 -86')+C(0,-98,8.5,'f')+hair(o.hair,-98);
  } else if(pose==='sit'){
    const legs=P('M-28 -1 C-20 -19 20 -19 28 -1 C14 3 -14 3 -28 -1Z',['jama','saree','kanzu'].includes(k)?fill:'f')+P('M-6 -6 C0 -10 6 -8 12 -4','thin');
    let torso;
    if(k==='jama'||k==='kanzu') torso=P('M-9 -58 L9 -58 L12 -26 L-12 -26 Z',fill)+(k==='jama'?P('M-12 -30 L12 -30','thin'):P('M0 -58 L0 -46','thin'));
    else if(k==='saree') torso=P('M-9 -58 L9 -58 L12 -26 L-12 -26 Z',fill)+P('M-9 -58 C-2 -48 6 -36 12 -28','thin');
    else if(k==='cloak') torso=P('M-9 -58 C-10 -46 -9 -34 -9 -26 L9 -26 C9 -34 10 -46 9 -58Z','f')+P('M-11 -59 L9 -59 L13 -24 L-13 -30 Z',fill)+C(7,-58,2.5,'fc');
    else if(k==='blanket') torso=P('M-13 -60 C-15 -48 -16 -36 -15 -24 L15 -24 C16 -36 15 -48 13 -60 Z',fill)+P('M-15.4 -34 L15.4 -34 M-15.6 -30 L15.6 -30','thin');
    else torso=P('M-9 -58 C-10 -46 -9 -34 -9 -26 L9 -26 C9 -34 10 -46 9 -58Z',fill)+(k==='dhoti'?P('M-20 -8 C-10 -16 10 -16 20 -8','thin'):'');
    s=legs+torso+P('M-9 -56 C-15 -46 -17 -34 -14 -22')+G(P('M9 -56 C17 -48 26 -38 34 -30')+C(35,-29,2.6,'f'),o.arm||'')+P('M-2.5 -61.6 L-2.5 -58 M2.5 -61.6 L2.5 -58')+C(0,-70,8.5,'f')+hair(o.hair,-70);
  } else if(pose==='chair'){
    s=P('M-16 -44 L-16 0 M-16 -44 L12 -44 M8 -44 L8 0 M-16 -44 L-19 -90','s4')+P('M12 -44 L13 0 M17 -44 L18 0')+P('M-9 -86 C-10 -72 -9 -56 -8 -50 L9 -50 C9 -56 10 -72 9 -86Z',fill)+P('M-8 -50 L17 -50 L17 -44 L-8 -44Z',fill)+P('M-3 -86 L0 -80 L3 -86','thin')+G(P('M9 -82 C16 -72 22 -64 30 -60')+C(31,-60,2.6,'f'),o.arm||'')+P('M-2.5 -89.6 L-2.5 -86 M2.5 -89.6 L2.5 -86')+C(0,-98,8.5,'f')+hair(o.hair,-98);
  }
  const sc=o.s||1;
  return G(s,o.c||'',o.st||'',`translate(${o.x} ${o.y}) scale(${o.flip?-sc:sc} ${sc})`);
}
/* a cow with Nguni lyre horns, facing right, feet at 0 */
function cow(x,y,s,c,st,spot){
  const b=P('M12 -21 L11 0 M20 -21 L21 0 M46 -22 L45 0 M54 -22 L55 0')+P('M4 -30 C-2 -26 -2 -16 0 -10')
    +P('M4 -24 C0 -32 4 -40 14 -40 L50 -41 C56 -41 60 -38 62 -34 L64 -24 C60 -20 54 -20 52 -22 L12 -21 C8 -21 5 -22 4 -24 Z','f')
    +P('M47 -41 C50 -46 55 -46 58 -40','f')+P('M60 -38 L70 -43 L75 -32 L66 -28 Z','f')
    +P('M68 -42 C63 -52 66 -58 73 -58 M66 -41 C59 -47 57 -54 61 -60','thin')
    +(spot?P('M22 -38 C28 -40 34 -36 32 -30 C28 -26 20 -30 22 -38Z','fc'):'');
  return G(b,c||'',st||'',`translate(${x} ${y}) scale(${s})`);
}
const birds=(x,y,dl)=>G(P(`M${x} ${y} q6 -6 12 0 q6 -6 12 0`,'thin')+P(`M${x+30} ${y-12} q5 -5 10 0 q5 -5 10 0`,'thin'),'wk',`--x:120px;--t:9s;--d:${dl||0}s`);
/* a sona / kolam line: one unbroken curve that bounces at 45 degrees round an m x n grid of dots (one line when m and n
   share no factor). Returns the dots and the smoothed path. */
function mirror(m,n,u,ox,oy){
  const W=2*m, H=2*n; let x=1, y=0, dx=1, dy=1; const pts=[[x,y]];
  for(let g=0;g<400;g++){ const tx=dx>0?W-x:x, ty=dy>0?H-y:y, t=Math.min(tx,ty); x+=dx*t; y+=dy*t; if(x===0||x===W) dx=-dx; if(y===0||y===H) dy=-dy; if(x===1&&y===0&&dx===1&&dy===1) break; pts.push([x,y]); }
  const at=([a,b])=>`${f1(ox+a*u)} ${f1(oy+b*u)}`, mid=(a,b)=>[(a[0]+b[0])/2,(a[1]+b[1])/2], k=pts.length;
  const near=(p,q,r)=>{ const dx=q[0]-p[0], dy=q[1]-p[1], l=Math.hypot(dx,dy); return [p[0]+dx*r/l,p[1]+dy*r/l]; };   // round only close to each bounce, so every dot keeps its own loop
  let d=`M${at(near(pts[0],pts[1],.7))}`; for(let i=1;i<=k;i++){ const P0=pts[i%k], a=near(P0,pts[i-1],.7), b=near(P0,pts[(i+1)%k],.7); d+=` L${at(a)} Q${at(P0)} ${at(b)}`; }
  let dots=''; for(let i=0;i<m;i++) for(let j=0;j<n;j++) dots+=C(f1(ox+(2*i+1)*u),f1(oy+(2*j+1)*u),3,'fc');
  return {d:d+'Z',dots};
}
function gear(r,N){ let d=''; for(let i=0;i<N*4;i++){ const a=(i+(i%4===1||i%4===3?.35*(i%4===1?-1:1):0))*Math.PI*2/(N*4), rr=(i%4===1||i%4===2)?r+15:r; d+=(i?' L':'M')+f1(Math.cos(a)*rr)+' '+f1(Math.sin(a)*rr); } return d+'Z'; }
const ttt=(x,y,w,c,dl)=>D(`M${x+w/3} ${y} L${x+w/3} ${y+w} M${x+2*w/3} ${y} L${x+2*w/3} ${y+w} M${x} ${y+w/3} L${x+w} ${y+w/3} M${x} ${y+2*w/3} L${x+w} ${y+2*w/3}`,c,dl,.9);
const xo=(x,y,r,o,c,st)=>o?C(x,y,r,c||'',st):P(`M${x-r} ${y-r} L${x+r} ${y+r} M${x+r} ${y-r} L${x-r} ${y+r}`,c||'',st);
const grass=(x0,x1,y,step)=>{ let d=''; for(let x=x0;x<x1;x+=step){ const j=(x*7)%13; d+=`M${x+j} ${y} l-4 -8 M${x+j+2} ${y} l0 -11 M${x+j+4} ${y} l4 -8 `; } return P(d,'s thin'); };

/* boards laid on the ground: board coordinates projected onto the floor (y squashed by k), so lines keep their width */
const proj=(cx,cy,u,k)=>(x,y)=>`${f1(cx+x*u)} ${f1(cy+y*u*k)}`;
const seg=(pj,list)=>list.map(([a,b,c,d])=>`M${pj(a,b)} L${pj(c,d)}`).join(' ');
function morabarabaLines(){
  const L=[]; for(const r of [3,2,1]) L.push([-r,-r,r,-r],[r,-r,r,r],[r,r,-r,r],[-r,r,-r,-r]);
  L.push([0,-3,0,-1],[0,1,0,3],[-3,0,-1,0],[1,0,3,0],[-3,-3,-1,-1],[3,-3,1,-1],[3,3,1,1],[-3,3,-1,1]); return L;
}
const MB_PTS=(()=>{ const p=[]; for(const r of [3,2,1]) for(const [a,b] of [[-1,-1],[0,-1],[1,-1],[1,0],[1,1],[0,1],[-1,1],[-1,0]]) p.push([a*r,b*r]); return p; })();
function crossLines(){
  const L=[], rot=([x,y],q)=>q===0?[x,y]:q===1?[-y,x]:q===2?[-x,-y]:[y,-x];
  for(let q=0;q<4;q++){
    for(const x of [-1.5,-.5,.5,1.5]){ const a=rot([x,-1.5],q), b=rot([x,-9.5],q); L.push([...a,...b]); }
    for(let j=0;j<=8;j++){ const a=rot([-1.5,-1.5-j],q), b=rot([1.5,-1.5-j],q); L.push([...a,...b]); }
  }
  return L;
}
const CROSS_OUT=[[-1.5,-9.5],[1.5,-9.5],[1.5,-1.5],[9.5,-1.5],[9.5,1.5],[1.5,1.5],[1.5,9.5],[-1.5,9.5],[-1.5,1.5],[-9.5,1.5],[-9.5,-1.5],[-1.5,-1.5]];
const outline=(pj,pts)=>'M'+pts.map(p=>pj(p[0],p[1])).join(' L')+'Z';
function patolliLines(){   // the X: two diagonal strips of squares, 2 wide
  const L=[]; for(const sgn of [1,-1]){ for(let i=-6;i<=6;i++){ L.push([i-1,sgn*(i)-1,i+1,sgn*(i)-1]); } }
  return L;
}
function patolliSquares(pj,cls,dl){   // squares along the two arms of the X, as small diamonds
  let s=''; let n=0;
  for(const sgn of [1,-1]) for(let i=-6;i<=6;i++){ if(i===0&&sgn===-1) continue; const x=i, y=sgn*i;
    s+=D(`M${pj(x-.5,y-.5)} L${pj(x+.5,y-.5)} L${pj(x+.5,y+.5)} L${pj(x-.5,y+.5)}Z`,cls,(dl||0)+n*.05,.6); n++; }
  return s;
}

/* ---------- the films ---------- */
const FILMS={
morabaraba:{ score:'mbira', scenes:[
 { place:'Southern Africa', sub:'In Southern Africa, cattle were wealth. They paid lobola, sealed alliances and ranked families.',
   svg:()=>G(C(470,150,26,'gd rise'),'','')+D('M0 232 C80 200 150 205 230 222 C300 236 360 200 440 206 C520 212 580 228 640 220','s',0,2.2)
    +D('M0 268 C140 258 260 262 380 266 C470 269 560 262 640 264','',.2,2)
    +G(P('M0 0 C1 -14 -1 -28 2 -42 M2 -42 L-14 -62 M2 -42 L16 -66 M-3 -30 L-12 -46')+P('M-46 -64 C-30 -80 -8 -76 2 -72 C14 -80 36 -78 50 -66 C30 -60 12 -64 2 -62 C-12 -60 -32 -58 -46 -64Z','g2f'),'up','--d:.6s','translate(110 266)')
    +birds(380,110,.4)
    +G(cow(250,284,.95,'','',1)+cow(320,276,.85)+cow(392,290,1,'','',1)+cow(455,280,.9)+fig({x:205,y:300,kind:'blanket',hair:'short',staff:1,s:.95}),'wk','--x:46px;--t:8s;--d:.3s')
    +grass(20,620,322,58) },
 { place:'The grazing grounds', sub:'Herd boys scratched the board into flat rock near the grazing grounds, where the cattle could be watched.',
   svg:()=>{ const pj=proj(322,282,25,.42); let st=''; MB_PTS.forEach((p,i)=>{ if([0,4,9,13,17,21].includes(i)) st+=C(...pj(p[0],p[1]).split(' ').map(Number),5.5,i%2?'f fi':'fc fi',`--d:${2.2+i*.06}s`); });
    return D('M0 232 C100 214 200 220 300 226 C400 232 500 214 640 222','s',0,2)
     +G(cow(470,226,.45,'s4')+cow(540,222,.42,'s4'),'wk','--x:-30px;--t:9s')
     +P('M96 334 C104 272 180 244 322 244 C464 244 540 272 548 334 Z','g2f')
     +D(seg(pj,morabarabaLines()),'',.5,2)+st
     +fig({x:150,y:312,pose:'sit',kind:'blanket',hair:'short',arm:'reach'})
     +fig({x:494,y:312,pose:'sit',kind:'blanket',hair:'short',flip:1})
     +C(...pj(3,-3).split(' ').map(Number),5.5,'gf fi','--d:3.4s'); } },
 { place:'The board', sub:'Every piece is a cow. Line up three and you have a mill, and a mill lets you take a cow.',
   svg:()=>{ const u=42, cx=320, cy=180, pt=(x,y)=>[cx+x*u,cy+y*u]; const ln=morabarabaLines().map(([a,b,c,d])=>`M${pt(a,b).join(' ')} L${pt(c,d).join(' ')}`).join(' ');
    const dark=[[-3,-3],[0,-3],[3,-3]], light=[[-2,2],[2,0],[-1,0],[0,3]]; let s='';
    light.forEach((p,i)=>{ const q=pt(...p); s+=C(q[0],q[1],12,'f fi'+(i===1?' gone':''),`--d:${.9+i*.35}s`); });
    dark.forEach((p,i)=>{ const q=pt(...p); s+=C(q[0],q[1],12,'fc fi',`--d:${1.1+i*.7}s`); });
    return G(D(ln,'',0,1.4)+s+D(`M${pt(-3,-3).join(' ')} L${pt(3,-3).join(' ')}`,'gd thick',3.3,.8)+G(P(`M${pt(2,0)[0]-9} ${pt(2,0)[1]-9} l18 18 M${pt(2,0)[0]+9} ${pt(2,0)[1]-9} l-18 18`,'thick'),'flash',''),'',''); } },
 { place:'South Africa · 1996', sub:'In 1996, South Africa made Morabaraba an official mind sport. Today it has world championships.',
   svg:()=>{ const pj=proj(320,236,9,.36);
    let crowd=''; for(let i=0;i<9;i++){ const x=110+i*52, y=168+(i%2)*6; crowd+=C(x,y-22,8,'f s4')+P(`M${x-16} ${y+4} C${x-14} ${y-12} ${x+14} ${y-12} ${x+16} ${y+4}`,'s4'); }
    return D('M40 120 L600 120','s',0,1.6)+G(crowd,'fi','--d:.2s')+P('M0 180 L640 180','s thin')
     +fig({x:220,y:312,pose:'chair',kind:'shirt',hair:'short',c:'up',st:'--d:.6s'})
     +fig({x:420,y:312,pose:'chair',kind:'shirt',hair:'fringe',flip:1,c:'up',st:'--d:.8s'})
     +P('M200 232 L440 232 L436 244 L204 244 Z','f')+P('M224 244 L224 312 M416 244 L416 312')
     +D(seg(pj,morabarabaLines()),'thin',1,1.4)
     +G(P('M376 214 L412 214 L412 230 L376 230 Z','f')+C(388,222,4,'thin')+C(401,222,4,'thin')+P('M386 214 L386 210 M402 214 L402 210','gd thick'),'fi','--d:1.4s'); } }
]},
chaupar:{ score:'court', scenes:[
 { place:'Fatehpur Sikri, India · c. 1580', sub:'Emperor Akbar built a new capital of red sandstone at Fatehpur Sikri.',
   svg:()=>{ const W=[300,236,172,108], H=[40,34,30,26]; let y=286, s='';
    W.forEach((w,i)=>{ const x0=330-w/2, x1=330+w/2, top=y-H[i]; let cols=''; for(let x=x0+w/(i<2?14:8);x<x1-2;x+=w/(i<2?14:8)) cols+=`M${f1(x)} ${top+4} L${f1(x)} ${y}`;
      s+=G(P(`M${x0} ${y} L${x0} ${top+4} L${x1} ${top+4} L${x1} ${y}`,'f')+P(cols,'thin')+P(`M${x0-8} ${top+4} L${x1+8} ${top+4} L${x1+2} ${top} L${x0-2} ${top} Z`,'f'),'up',`--d:${.3+i*.45}s`); y=top; });
    s+=G(P(`M312 ${y} L312 ${y-20} M348 ${y} L348 ${y-20} M324 ${y} L324 ${y-20} M336 ${y} L336 ${y-20}`)+P(`M306 ${y-20} L354 ${y-20}`)+P(`M310 ${y-20} C310 ${y-44} 350 ${y-44} 350 ${y-20} Z`,'f')+P(`M330 ${y-38} L330 ${y-50}`,'gd thick')+C(330,y-52,2.6,'gf'),'up','--d:2.1s');
    let arch=''; for(let i=0;i<4;i++){ const x=8+i*34; arch+=`M${x} 300 L${x} 248 C${x} 232 ${x+9} 224 ${x+15} 220 C${x+21} 224 ${x+30} 232 ${x+30} 248 L${x+30} 300 `; }
    let arch2=''; for(let i=0;i<4;i++){ const x=500+i*34; arch2+=`M${x} 300 L${x} 248 C${x} 232 ${x+9} 224 ${x+15} 220 C${x+21} 224 ${x+30} 232 ${x+30} 248 L${x+30} 300 `; }
    return D('M0 286 L640 286','',0,1.4)+s+D(arch+'M4 212 L146 212 M4 206 L146 206','',.4,2)+D(arch2+'M496 212 L640 212 M496 206 L640 206','',.6,2)
     +D('M330 300 L330 360 M250 300 L150 360 M410 300 L510 360 M190 300 L20 360 M470 300 L620 360 M0 318 L640 318','s thin',.8,1.6)+birds(120,110,1); } },
 { place:'The courtyard', sub:'He had a giant Chaupar board laid into the courtyard floor, in stone.', note:'The courtyard board can still be seen at Fatehpur Sikri.',
   svg:()=>{ const pj=proj(320,250,17,.44);
    return G(P('M440 150 L440 120 L560 120 L560 150 M450 120 L450 108 L550 108 L550 120 M470 108 L470 98 L530 98 L530 108','s'),'','')+P('M0 150 L640 150','s thin')
     +D(outline(pj,CROSS_OUT),'thick',.2,1.6)+D(seg(pj,crossLines()),'thin',.9,2.2)
     +D(`M${pj(-1.5,-1.5)} L${pj(1.5,-1.5)} L${pj(1.5,1.5)} L${pj(-1.5,1.5)}Z`,'gd thick',2.6,.8)
     +fig({x:70,y:268,kind:'jama',hair:'turban',s:.8,c:'up',st:'--d:1.2s'})+fig({x:110,y:274,kind:'jama',hair:'turban',s:.85,fill:'g3f',c:'up',st:'--d:1.4s'}); } },
 { place:'The courtyard', sub:'Legend says people in coloured robes stood in as the pieces, and moved square by square.', note:'Legend: the records do not say so.',
   svg:()=>{ const pj=proj(320,250,17,.44), at=(x,y)=>pj(x,y).split(' ').map(Number);
    const p1=at(-.5,7.5),p2=at(.5,-6.5),p3=at(-7.5,-.5),p4=at(8.5,.5),p5=at(3,.5);
    return P(outline(pj,CROSS_OUT),'thick')+P(seg(pj,crossLines()),'thin')
     +P('M470 172 L470 116 M590 172 L590 116 M462 116 L598 116 L590 106 L470 106 Z','s4')+fig({x:530,y:172,pose:'sit',kind:'jama',hair:'turban',s:.5,c:'s4'})
     +fig({x:p2[0],y:p2[1],kind:'jama',hair:'turban',s:.56,fill:'g3f',c:'up',st:'--d:.2s'})
     +fig({x:p3[0],y:p3[1],kind:'jama',hair:'turban',s:.68,fill:'g4f',c:'up',st:'--d:.4s'})
     +fig({x:p4[0],y:p4[1],kind:'jama',hair:'turban',s:.68,fill:'g3f',c:'up',st:'--d:.6s'})
     +G(fig({x:p5[0],y:p5[1],kind:'jama',hair:'turban',s:.74,fill:'gf2'}),'hop','--d:2.2s;--hx:17px')
     +fig({x:p1[0],y:p1[1],kind:'jama',hair:'turban',s:.8,fill:'g4f',c:'up',st:'--d:.8s'}); } },
 { place:'From India to the world', sub:'Chaupar is the grandparent of Pachisi, Ludo and Parcheesi. Billions have played its grandchildren.',
   svg:()=>{ const a=proj(118,170,6.2,1), b=proj(320,170,6.2,1);
    const cloth=P('M248 98 L392 98 L392 242 L248 242 Z','g2f fi','--d:1.1s');
    let ludo=''; const lx=460, ly=104, L=132, c=L/15;
    ludo+=D(`M${lx} ${ly} h${L} v${L} h${-L} Z`,'thick',2.2,1);
    for(const [x,y] of [[0,0],[9,0],[0,9],[9,9]]) ludo+=D(`M${lx+x*c} ${ly+y*c} h${6*c} v${6*c} h${-6*c} Z`,'',2.6,.8)+G(C(lx+(x+2)*c,ly+(y+2)*c,c*.7,'thin')+C(lx+(x+4)*c,ly+(y+2)*c,c*.7,'thin')+C(lx+(x+2)*c,ly+(y+4)*c,c*.7,'thin')+C(lx+(x+4)*c,ly+(y+4)*c,c*.7,'thin'),'fi','--d:3.2s');
    ludo+=D(`M${lx+6*c} ${ly+6*c} L${lx+9*c} ${ly+9*c} M${lx+9*c} ${ly+6*c} L${lx+6*c} ${ly+9*c}`,'',3,.6);
    let grid=''; for(let i=1;i<6;i++){ grid+=`M${lx+i*c} ${ly+6*c} v${3*c} M${lx+(9+i)*c} ${ly+6*c} v${3*c} M${lx+6*c} ${ly+i*c} h${3*c} M${lx+6*c} ${ly+(9+i)*c} h${3*c} `; }
    grid+=`M${lx} ${ly+7*c} h${6*c} M${lx} ${ly+8*c} h${6*c} M${lx+9*c} ${ly+7*c} h${6*c} M${lx+9*c} ${ly+8*c} h${6*c} M${lx+7*c} ${ly} v${6*c} M${lx+8*c} ${ly} v${6*c} M${lx+7*c} ${ly+9*c} v${6*c} M${lx+8*c} ${ly+9*c} v${6*c}`;
    ludo+=D(grid,'thin',3,1);
    return D(outline(a,CROSS_OUT),'thick',0,1.2)+D(seg(a,crossLines()),'thin',.5,1.4)+D(`M${a(-1.5,-1.5)} L${a(1.5,-1.5)} L${a(1.5,1.5)} L${a(-1.5,1.5)}Z`,'gd thick',1.2,.6)
     +cloth+D(outline(b,CROSS_OUT),'thick',1.3,1.2)+D(seg(b,crossLines()),'thin',1.6,1.2)+ludo
     +D('M190 170 L224 170 M216 164 L224 170 L216 176','s',1,.5)+D('M400 170 L434 170 M426 164 L434 170 L426 176','s',2,.5)
     +TX(118,292,'CHAUPAR','fi tag')+TX(320,292,'PACHISI','fi tag')+TX(526,292,'LUDO · PARCHEESI','fi tag'); } }
]},
dasapada:{ score:'grove', scenes:[
 { place:'North India · c. 500 BCE', sub:'About 2,500 years ago in North India, people played on boards of eight and ten rows.',
   svg:()=>{ const tree=(x,y,h,dl)=>G(P(`M${x} ${y} L${x} ${y-h} M${x} ${y-h*.55} L${x-14} ${y-h*.75} M${x} ${y-h*.65} L${x+12} ${y-h*.85}`)+P(`M${x-30} ${y-h+6} C${x-38} ${y-h-20} ${x-14} ${y-h-34} ${x} ${y-h-26} C${x+12} ${y-h-40} ${x+40} ${y-h-24} ${x+30} ${y-h+2} C${x+20} ${y-h+12} ${x-20} ${y-h+14} ${x-30} ${y-h+6} Z`,'g2f'),'up',`--d:${dl}s`);
    const hut=(x,y,dl)=>G(P(`M${x-26} ${y} L${x-26} ${y-30} L${x+26} ${y-30} L${x+26} ${y} Z`,'f')+P(`M${x-34} ${y-28} L${x} ${y-62} L${x+34} ${y-28} Z`,'f')+P(`M${x-6} ${y} L${x-6} ${y-18} L${x+6} ${y-18} L${x+6} ${y}`)+P(`M${x-24} ${y-36} L${x-14} ${y-44} M${x+24} ${y-36} L${x+14} ${y-44}`,'thin'),'up',`--d:${dl}s`);
    return C(450,96,18,'gd rise')+D('M0 250 L640 250','',0,1.4)+tree(70,252,120,.2)+tree(140,250,96,.4)+tree(560,252,126,.3)+tree(612,250,90,.5)
     +hut(270,250,.8)+hut(350,252,1)+D('M352 186 C346 172 358 164 352 150 C346 138 356 128 352 116','s',1.6,2.6)
     +D('M0 292 C60 286 120 296 180 290 S300 286 360 292 S480 296 540 290 S620 288 640 290','s',.4,2)+D('M40 316 C100 310 160 320 220 314 S340 310 400 316 S520 320 600 314','s thin',.7,2)+birds(200,96,.6); } },
 { place:'A village courtyard', sub:'Players grabbed nuts from a pile and counted them off in fours. What was left over named the throw.', note:'Our reading follows the scholar Lüders (1907).',
   svg:()=>{ const pj=proj(326,266,15,.42); const L=[]; for(let i=-5;i<=5;i++){ L.push([i,-5,i,5],[-5,i,5,i]); }
    let pile=''; [[-4,0],[4,-2],[0,-5],[-8,-4],[8,2],[-2,4],[3,4],[-6,3],[6,-6],[0,0],[-3,-8],[4,-9]].forEach(([dx,dy])=>{ pile+=P(`M${118+dx-3.4} ${300+dy} a3.4 2.6 0 1 0 6.8 0 a3.4 2.6 0 1 0 -6.8 0`,'fc'); });
    let rows=''; for(let g=0;g<3;g++) for(let i=0;i<4;i++) rows+=P(`M${150+i*10-3.4} ${326} a3.4 2.6 0 1 0 6.8 0 a3.4 2.6 0 1 0 -6.8 0`,(g===2?'gf':'fc')+' fi',`--d:${1.4+g*1.1+i*.12}s;transform:translateX(${g*48}px)`);
    return D('M0 220 L640 220','s',0,1.4)
     +D(seg(pj,L),'thin',.3,1.8)
     +fig({x:178,y:290,pose:'sit',kind:'dhoti',hair:'bun',arm:'reach'})+fig({x:478,y:290,pose:'sit',kind:'dhoti',hair:'short',flip:1})+pile+rows
     +G(C(...pj(-4.5,4.5).split(' ').map(Number),5,'fc')+C(...pj(3.5,-4.5).split(' ').map(Number),5,'f'),'fi','--d:.9s'); } },
 { place:'A road between towns', sub:'The Buddha told his monks to give up games like this. Games grab attention and feed the craving to win.', note:'From the Brahmajāla Sutta.',
   svg:()=>{ const pj=proj(520,300,7,.34); const L=[]; for(let i=-5;i<=5;i++){ L.push([i,-5,i,5],[-5,i,5,i]); }
    const tree=(x,y,h)=>P(`M${x} ${y} L${x} ${y-h}`)+P(`M${x-30} ${y-h+6} C${x-38} ${y-h-20} ${x-14} ${y-h-34} ${x} ${y-h-26} C${x+12} ${y-h-40} ${x+40} ${y-h-24} ${x+30} ${y-h+2} C${x+20} ${y-h+12} ${x-20} ${y-h+14} ${x-30} ${y-h+6} Z`,'g2f');
    return P('M0 268 L640 268','')+tree(60,268,130)+tree(600,268,110)+P(seg(pj,L),'s thin')
     +G(G(fig({x:120,y:284,kind:'monk',s:.95}),'bob','')+G(fig({x:178,y:284,kind:'monk',s:.95}),'bob','--d:.25s')+G(fig({x:236,y:284,kind:'monk',s:.95}),'bob','--d:.5s'),'wk','--x:150px;--t:8s')
     +C(84,112,3,'gf fi','--d:1s'); } },
 { place:'What survived', sub:'The ban kept the game’s name in the texts, but its rules were lost. Ours are rebuilt from the evidence.', note:'Every rule in How to play says where it comes from.',
   svg:()=>{ const u=12, cx=320, cy=104; let L=''; for(let i=-5;i<=5;i++){ L+=`M${cx+i*u} ${cy-5*u} L${cx+i*u} ${cy+5*u} M${cx-5*u} ${cy+i*u} L${cx+5*u} ${cy+i*u} `; }
    let script=''; for(let r=0;r<3;r++){ let d=`M${110+(r===1?20:0)} ${236+r*14}`; for(let x=0;x<380-(r===2?120:0);x+=12) d+=` q3 -6 6 0 q3 5 6 0`; script+=D(d,'thin',.8+r*.5,1.6); }
    return G(P(L,'thin'),'lost','')+P('M80 222 L560 222 C578 222 578 282 560 282 L80 282 C62 282 62 222 80 222Z','g2f')
     +C(196,252,5,'f')+C(444,252,5,'f')+D('M196 257 C190 300 206 320 198 344 M444 257 C452 300 436 320 446 344','gd',.4,1)+script; } }
]},
patolli:{ score:'lake', scenes:[
 { place:'Tenochtitlan, Mexico · c. 1500', sub:'Across Mexico and Central America, nobles and commoners played Patolli.',
   svg:()=>{ let s=''; const tiers=[[220,18],[184,18],[148,18],[112,18]]; let y=252;
    tiers.forEach(([w,h],i)=>{ s+=G(P(`M${320-w/2} ${y} L${320-w/2+4} ${y-h} L${320+w/2-4} ${y-h} L${320+w/2} ${y} Z`,'f'),'up',`--d:${.3+i*.35}s`); y-=h; });
    s+=G(P(`M306 252 L312 ${y} M334 252 L328 ${y}`,'thin'),'up','--d:1.6s');
    s+=G(P(`M266 ${y} L266 ${y-26} L304 ${y-26} L304 ${y} M262 ${y-26} L308 ${y-26} L304 ${y-34} L266 ${y-34} Z`,'f')+P(`M336 ${y} L336 ${y-26} L374 ${y-26} L374 ${y} M332 ${y-26} L378 ${y-26} L366 ${y-40} L344 ${y-40} Z`,'f')+P(`M280 ${y} L280 ${y-14} L290 ${y-14} L290 ${y} M350 ${y} L350 ${y-14} L360 ${y-14} L360 ${y}`,'thin'),'up','--d:1.9s');
    const canoe=G(P('M0 0 L74 0 C66 9 8 9 0 0Z','f')+C(40,-20,6,'f')+P('M40 -14 L40 0')+P('M28 -18 L54 8','thin'),'wk','--x:-160px;--t:9s');
    return C(118,96,20,'gd rise')+D('M380 210 L440 150 C446 146 452 146 458 150 L520 210 M560 210 L590 176 L620 168 L640 176','s',0,2)+P('M0 252 L640 252','')+s
     +D('M0 270 C40 266 80 274 120 270 S200 266 240 270 M380 272 C420 268 460 276 500 272 S580 268 640 272 M0 300 C50 296 100 304 150 300 S250 296 300 300 M340 304 C390 300 440 308 490 304 S590 300 640 304','s',.3,2.2)
     +D('M304 252 L288 360 M336 252 L352 360','thin',.6,1.4)+G(canoe,'','','translate(560 326)')+birds(440,90,.8); } },
 { place:'A courtyard in the city', sub:'Players threw marked beans and bet cloaks, jewels, even their own freedom.', note:'The mat, pebbles and beans follow Durán, writing in the 1570s.',
   svg:()=>{ const pj=proj(320,266,15,.44); let beans='';
    for(let i=0;i<5;i++) beans+=G(P('M-5 0 a5 3.4 0 1 0 10 0 a5 3.4 0 1 0 -10 0','f')+C(0,0,1.2,'fc'),'toss',`--d:${1.6+i*.08}s;--x:${-150+i*24}px;--y:${-6+(i%2)*10}px`,`translate(430 262)`);
    let stakes=''; for(let i=0;i<3;i++) stakes+=P(`M${40+i*3} ${320-i*9} L${92+i*3} ${320-i*9} L${88+i*3} ${312-i*9} L${44+i*3} ${312-i*9} Z`,'f');
    let beads=''; for(let i=0;i<7;i++) beads+=C(104+i*8,330-Math.sin(i/6*Math.PI)*6,3.4,'gf');
    return D('M0 214 L640 214','s',0,1.4)
     +D(`M${pj(-7.5,-7.5)} L${pj(7.5,-7.5)} L${pj(7.5,7.5)} L${pj(-7.5,7.5)}Z`,'',.2,1)+patolliSquares(pj,'thin',.6)
     +fig({x:170,y:296,pose:'sit',kind:'cloak',hair:'fringe'})+fig({x:470,y:296,pose:'sit',kind:'cloak',hair:'fringe',flip:1})+''
     +G(stakes+beads,'fi','--d:.9s')+beans; } },
 { place:'After 1521', sub:'Spanish friars called it idolatry and burned the mats. Only fragments of the rules survived.',
   svg:()=>{ const pj=proj(320,266,15,.44); let fl='';
    [[-130,1],[-80,1.3],[-30,1.6],[20,1.4],[70,1.2],[120,1]].forEach(([x,h],i)=>{ fl+=G(P(`M${320+x-16} 276 C${320+x-20} ${276-30*h} ${320+x-4} ${276-40*h} ${320+x} ${276-62*h} C${320+x+6} ${276-40*h} ${320+x+22} ${276-30*h} ${320+x+16} 276 Z`,'g2f')+P(`M${320+x-6} 276 C${320+x-8} ${276-16*h} ${320+x} ${276-22*h} ${320+x} ${276-30*h} C${320+x+2} ${276-20*h} ${320+x+8} ${276-14*h} ${320+x+6} 276`,'thin'),'fl',`--d:${(i%3)*.17}s`); });
    return D('M0 214 L640 214','s',0,1)+G(P(`M${pj(-7.5,-7.5)} L${pj(7.5,-7.5)} L${pj(7.5,7.5)} L${pj(-7.5,7.5)}Z`,'')+patolliSquares(pj,'thin',0),'burn','')
     +G(fl,'fi','--d:.4s')+D('M240 180 C230 150 252 130 240 100 C230 74 250 56 244 30 M330 170 C322 140 342 120 332 92 C324 66 342 50 336 24 M410 182 C402 152 422 132 412 104','s',.8,3); } },
 { place:'Naachtun, Guatemala · 2025', sub:'In 2025, archaeologists found a Patolli board about 1,500 years old at the Maya city of Naachtun.',
   svg:()=>{ let blocks=''; for(let r=0;r<4;r++) for(let c=0;c<9;c++){ const x=86+c*52+(r%2?26:0), y=150+r*40; if(x<560) blocks+=`M${x} ${y} h48 v36 h-48 Z `; }
    const pj=proj(322,222,9,1);
    let grid=''; for(let x=100;x<=540;x+=88) grid+=`M${x} 128 L${x} 326 `; grid+='M80 128 L560 128 M80 326 L560 326';
    return P(blocks,'s4 thin')+D(grid,'s thin',0,1.4)+patolliSquares(pj,'',.6)
     +G(P('M0 0 L-10 18 L10 18 Z','gf')+P('M0 0 L0 -26','thin'),'fi','--d:2.6s','translate(470 140)')
     +G(G(P('M0 0 L46 -30','thick')+P('M-4 2 L-12 12 M0 4 L-6 15 M4 4 L0 16','thin'),'scrub',''),'','','translate(398 306)'); } }
]},
nim:{ score:'grove', scenes:[
 { place:'India · c. 300 BCE', sub:'Around 300 BCE, the Indian scholar Pingala set out to list every possible rhythm in Sanskrit poetry.',
   svg:()=>{ const tree=P('M120 290 L120 130 M120 190 L96 160 M120 170 L146 140')+P('M60 136 C48 96 96 66 124 84 C150 60 200 86 186 128 C176 150 76 158 60 136 Z','g2f');
    let leaves=''; for(let i=0;i<4;i++) leaves+=P(`M${400+i*3} ${296-i*7} L${500+i*3} ${296-i*7} C${506+i*3} ${296-i*7} ${506+i*3} ${288-i*7} ${500+i*3} ${288-i*7} L${400+i*3} ${288-i*7} C${394+i*3} ${288-i*7} ${394+i*3} ${296-i*7} ${400+i*3} ${296-i*7}Z`,'f');
    return D('M0 290 L640 290','',0,1.2)+G(tree,'up','--d:.2s')+C(520,90,16,'gd rise')
     +fig({x:300,y:292,pose:'sit',kind:'dhoti',hair:'bun',arm:'reach',c:'up',st:'--d:.5s'})
     +G(P('M330 262 L392 262 C398 262 398 256 392 256 L330 256 C324 256 324 262 330 262Z','f')+leaves,'fi','--d:.9s')
     +D('M338 259 q4 -4 8 0 q4 4 8 0 q4 -4 8 0 q4 4 8 0 q4 -4 8 0 q4 4 8 0','thin',1.4,2)+birds(380,100,.6); } },
 { place:'Light and heavy', sub:'His trick: every syllable is light or heavy, a 0 or a 1.',
   svg:()=>{ const pat=[1,0,0,1,0,1,1,0]; let s='';
    pat.forEach((h,i)=>{ const x=124+i*56; s+=G(h?P(`M${x-14} 130 L${x+14} 130`,'thick'):P(`M${x-12} 118 C${x-12} 142 ${x+12} 142 ${x+12} 118`,'thick'),'up',`--d:${.3+i*.18}s`);
      s+=G(TX(x,226,h?'1':'0','tbig'+(i===5?' tg':'')),'up',`--d:${2+i*.18}s`); });
    return s+TX(320,74,'A LINE OF VERSE','fi')+D('M100 170 L540 170','s thin',1.6,1)+TX(320,286,'THE SAME LINE IN 0S AND 1S','fi','--d:3.4s'); } },
 { place:'Counting the patterns', sub:'Listing every pattern this way is binary counting, about 1,900 years before Europe “discovered” it.',
   svg:()=>{ let s=''; for(let r=0;r<8;r++){ const b=[(r>>2)&1,(r>>1)&1,r&1]; b.forEach((v,c)=>{ const x=220+c*36, y=60+r*30;
      s+=G(v?P(`M${x-10} ${y} L${x+10} ${y}`,'thick'):P(`M${x-9} ${y-8} C${x-9} ${y+8} ${x+9} ${y+8} ${x+9} ${y-8}`,'thick'),'fi',`--d:${.3+r*.3}s`); });
      s+=G(TX(420,60+r*30+8,String(r),'tbig'+(r===7?' tg':'')),'fi',`--d:${.5+r*.3}s`); }
    return s+D('M370 44 L370 300','s thin',.2,1.2); } },
 { place:'Today', sub:'It is also how you beat Nim: write each heap in 0s and 1s, and keep every column even.', note:'Nim does not come from Pingala: the link is binary. Charles Bouton named and solved Nim in 1901.',
   svg:()=>{ const heaps=[3,5,6]; let s='';
    heaps.forEach((h,k)=>{ const x=150+k*170; for(let i=0;i<h;i++) s+=C(x+(i%3-1)*22,250-Math.floor(i/3)*22-(i%3===1?0:0),9,(k===2&&i>=5?'gf':'fc')+' fi',`--d:${.2+k*.3+i*.05}s`);
      const b=h.toString(2).padStart(3,'0'); s+=G(TX(x,300,b.split('').join(' '),'tbig'),'fi',`--d:${1.6+k*.3}s`); });
    return D('M60 270 L580 270','s thin',0,1)+s+TX(320,334,'EVERY COLUMN HAS TWO 1S: EVEN, SO THIS HEAP SET IS SAFE','fi','--d:3s'); } }
]},
sim:{ score:'mbira', scenes:[
 { place:'Angola, Zambia, DR Congo', sub:'Chokwe storytellers press dots into the sand, and tell a story as they draw.',
   svg:()=>{ const fire=G(G(P('M320 300 C304 280 312 262 320 244 C328 262 336 280 320 300Z','gf'),'fl','')+P('M300 304 L340 298 M302 298 L338 304','thin'),'fi','--d:.3s');
    let dots=''; for(let i=0;i<4;i++) for(let j=0;j<3;j++) dots+=C(200+i*16,316+j*8,2,'fc fi',`--d:${1+i*.1+j*.1}s`);
    return D('M0 290 L640 290','',0,1.2)+fire+P('M0 0 L640 0','s')
     +fig({x:240,y:300,pose:'sit',kind:'dhoti',hair:'short',arm:'reach',c:'up',st:'--d:.6s'})
     +fig({x:420,y:300,pose:'sit',kind:'cloak',hair:'short',flip:1,s:.9,c:'up',st:'--d:.8s'})+fig({x:500,y:300,pose:'sit',kind:'dhoti',hair:'bun',flip:1,s:.8,c:'up',st:'--d:1s'})
     +dots+G(P('M50 290 L50 240 L114 240 L114 290 Z','f s4')+P('M40 242 L82 196 L124 242 Z','f s4')+P('M74 290 L74 262 L90 262 L90 290','s4'),'','')+P('M548 66 C534 72 534 96 548 102 C528 104 518 84 526 72 C530 66 540 62 548 66Z','s'); } },
 { place:'A sona in the sand', sub:'Mid-story, they sweep one unbroken line around the dots, without lifting a finger.',
   svg:()=>{ const m=mirror(5,3,30,170,90); return G(m.dots,'fi','')+D(m.d,'gd thick',.6,5.2); } },
 { place:'Points and paths', sub:'That is the maths Europe calls graph theory, and credits to Euler in 1736.', note:'The age of the sona tradition is uncertain. It is older than its 20th-century records.',
   svg:()=>{ const pts=[[170,110],[320,80],[470,110],[220,250],[420,250],[320,190]]; const E=[[0,1],[1,2],[0,5],[2,5],[3,5],[4,5],[0,3],[2,4],[3,4],[1,5]];
    let e=''; E.forEach(([a,b],i)=>{ e+=D(`M${pts[a].join(' ')} L${pts[b].join(' ')}`,'',.3+i*.22,.6); });
    return e+pts.map((p,i)=>C(p[0],p[1],9,'f fi',`--d:${i*.1}s`)).join('')+D('M170 110 L320 80 L470 110 L320 190 L220 250 L420 250','gd thick',3,1.6); } },
 { place:'Six dots', sub:'Sim is pure graph theory: six dots, two colours, and someone must close a triangle. Make sure it isn’t you.', note:'Gustavus Simmons invented Sim in 1969. It does not come from sona: the link is points and lines.',
   svg:()=>{ const P6=[...Array(6)].map((_,k)=>[320+Math.cos(-Math.PI/2+k*Math.PI/3)*120,186+Math.sin(-Math.PI/2+k*Math.PI/3)*120].map(f1));
    const A=[[0,2],[2,4],[1,3],[0,3],[1,4]], B=[[1,2],[3,4],[4,5],[0,5],[1,5]]; let s=''; let n=0;
    for(let k=0;k<5;k++){ if(A[k]) s+=D(`M${P6[A[k][0]].join(' ')} L${P6[A[k][1]].join(' ')}`,'thick',.3+n++*.45,.4); if(B[k]) s+=D(`M${P6[B[k][0]].join(' ')} L${P6[B[k][1]].join(' ')}`,'s thick',.3+n++*.45,.4); }
    s+=D(`M${P6[4].join(' ')} L${P6[0].join(' ')}`,'gd thick',.3+n*.45+.3,.5);
    return s+P6.map(p=>C(p[0],p[1],8,'f')).join(''); } }
]},
'gold-coin':{ score:'coast', scenes:[
 { place:'Across Africa', sub:'For many centuries, people across Africa have played mancala: seeds moving along rows of pits.',
   svg:()=>{ let pits=''; for(let r=0;r<2;r++) for(let c=0;c<6;c++) pits+=C(268+c*21,262+r*14,6,'f');
    const tree=P('M120 290 L118 150 M118 200 L92 170 M118 180 L144 150')+P('M44 150 C36 100 90 80 120 96 C150 74 210 96 196 140 C186 166 60 172 44 150 Z','g2f');
    return D('M0 290 L640 290','',0,1.2)+G(tree,'up','--d:.2s')+C(520,84,16,'gd rise')
     +fig({x:220,y:300,pose:'sit',kind:'dhoti',hair:'short',arm:'reach',c:'up',st:'--d:.5s'})+fig({x:420,y:300,pose:'sit',kind:'dhoti',hair:'short',flip:1,c:'up',st:'--d:.7s'})
     +G(P('M256 256 L396 256 L396 282 L256 282 Z','f')+pits+P('M266 290 L262 300 M386 290 L390 300','thin'),'fi','--d:.9s')
     +G(C(275,262,1.6,'fc')+C(296,262,1.6,'fc')+C(338,276,1.6,'fc')+C(359,262,1.6,'fc'),'fi','--d:1.5s'); } },
 { place:'The Swahili coast', sub:'On the Swahili coast, where the game is called bao, top players are treated like local legends.',
   svg:()=>{ const dhow=G(P('M0 0 L90 0 L80 12 L10 12 Z','f')+P('M44 0 L44 -70 M14 -6 L76 -78 L44 -70','')+P('M20 -10 L74 -74 L44 -66 Z','g2f'),'wk','--x:-80px;--t:10s');
    let crowd=''; for(let i=0;i<6;i++){ const x=360+i*40; crowd+=C(x,190,8,'f s4')+P(`M${x-14} 214 C${x-12} 198 ${x+12} 198 ${x+14} 214`,'s4'); }
    return D('M0 220 C60 216 120 224 180 220','s',0,1.4)+D('M0 244 C70 240 140 248 210 244','s thin',.2,1.4)+G(dhow,'','','translate(120 212)')
     +P('M250 214 L250 130 L330 130 L330 214 M270 214 L270 180 C270 168 290 168 290 180 L290 214','f')+P('M248 130 L332 130','')
     +crowd+D('M240 290 L640 290','',.2,1)
     +fig({x:410,y:290,kind:'kanzu',hair:'kofia',pose:'chair',arm:'reach',s:.95,c:'up',st:'--d:.6s'})+fig({x:530,y:290,kind:'kanzu',hair:'kofia',pose:'chair',flip:1,s:.95,c:'up',st:'--d:.8s'})
     +G(P('M436 238 L504 238 L504 290 M440 238 L440 290','thin')+P('M430 230 L510 230 L510 240 L430 240 Z','f')+C(446,235,2.4,'gf')+C(458,235,2.4,'thin')+C(470,235,2.4,'gf')+C(482,235,2.4,'thin')+C(494,235,2.4,'gf'),'fi','--d:1.2s')+C(80,70,14,'gd rise'); } },
 { place:'Counting at speed', sub:'Rows of pits trained lightning-fast mental arithmetic and planning many moves ahead.',
   svg:()=>{ let s=P('M110 110 L530 110 L530 250 L110 250 Z','g2f'); for(let r=0;r<2;r++) for(let c=0;c<8;c++) s+=C(150+c*49,150+r*62,20,'f');
    let seeds=''; for(let c=0;c<5;c++) seeds+=C(150+(c+2)*49+(c%2?4:-4),212,5,(c===4?'gf':'fc')+' fi',`--d:${1+c*.55}s`);
    for(let k=0;k<5;k++) seeds+=C(150+(k%3)*8-8,212+(k>2?8:0)-4,4.5,'fc');
    return s+seeds+D('M150 260 C200 290 300 290 346 262','s',.6,1.2)+TX(320,320,'ONE SEED IN EACH PIT, THEN COUNT AHEAD','fi','--d:3.4s'); } },
 { place:'Today', sub:'The Gold Coin runs on the same row logic. Don’t chase the gold: pair the coins from the right.', note:'It comes from the Silver Dollar Game in Winning Ways (1982). It is not a mancala game.',
   svg:()=>{ let s=''; for(let i=0;i<9;i++) s+=P(`M${104+i*48} 160 L${148+i*48} 160 L${148+i*48} 204 L${104+i*48} 204 Z`,'f');
    const coins=[1,3,4,6,8]; coins.forEach((c,k)=>{ s+=C(126+c*48,182,15,(c===4?'gf':'fc')+' up',`--d:${.3+k*.15}s`); });
    s+=D('M414 228 L414 238 L510 238 L510 228','gd',2,.6)+D('M270 228 L270 238 L318 238 L318 228','',2.5,.6);
    return s+TX(320,130,'TAKE FROM THE LEFT, OR SLIDE A COIN LEFT','fi','--d:.8s'); } }
]},
pentago:{ score:'lake', scenes:[
 { place:'Mexico and Guatemala', sub:'The Maya watched the sky and ran the clock on turning wheels.',
   svg:()=>{ let st=''; [[220,28],[180,26],[144,24],[110,22]].forEach(([w,h],i)=>{ const y=290-[0,28,54,78][i]; st+=G(P(`M${320-w/2} ${y} L${320-w/2+8} ${y-h} L${320+w/2-8} ${y-h} L${320+w/2} ${y} Z`,'f'),'up',`--d:${.2+i*.3}s`); });
    st+=G(P('M296 190 L296 160 L344 160 L344 190 M290 160 L350 160 L344 152 L296 152 Z','f')+P('M304 152 L304 126 L336 126 L336 152 M312 126 L312 140 M328 126 L328 140','f')+P('M316 190 L316 174 L324 174 L324 190','thin'),'up','--d:1.4s');
    st+=P('M310 290 L314 212 M330 290 L326 212','thin');
    let stars=''; [[90,70],[140,110],[200,60],[460,80],[520,120],[580,64],[400,50]].forEach(([x,y],i)=>{ stars+=G(P(`M${x-4} ${y} L${x+4} ${y} M${x} ${y-4} L${x} ${y+4}`,'thin'),'fi',`--d:${1+i*.2}s`); });
    const tree=(x,h)=>P(`M${x} 290 L${x} ${290-h}`)+P(`M${x-26} ${296-h} C${x-34} ${276-h} ${x-12} ${262-h} ${x} ${270-h} C${x+14} ${258-h} ${x+36} ${278-h} ${x+26} ${296-h} Z`,'g2f');
    return D('M0 290 L640 290','',0,1.2)+st+tree(80,90)+tree(140,70)+tree(520,84)+tree(590,100)+stars+C(470,110,12,'gd rise'); } },
 { place:'Two counts at once', sub:'A 260-day count and a 365-day year turned together, and lined up only once every 52 years.', note:'Daykeepers still keep the 260-day count today.',
   svg:()=>G(P(gear(72,10),'f'),'spin','--t:16s','translate(246 182)')+G(P(gear(98,14),'f')+C(0,-82,5,'gf'),'spin','--t:22.4s;--dir:reverse','translate(436 182)')
     +G(C(0,0,10,'fc'),'','','translate(246 182)')+G(C(0,0,10,'fc'),'','','translate(436 182)')+TX(250,320,'260 DAYS','fi')+TX(436,320,'365 DAYS','fi') },
 { place:'A true zero', sub:'To handle numbers that big, the Maya used a true zero, centuries before Europe had one.',
   svg:()=>{ const num=(x,v,dl)=>{ let s=''; const bars=Math.floor(v/5), dots=v%5; for(let b=0;b<bars;b++) s+=P(`M${x-26} ${250-b*16} L${x+26} ${250-b*16}`,'thick'); for(let d=0;d<dots;d++) s+=C(x-(dots-1)*8+d*16,250-bars*16-4,4.5,'fc'); return G(s,'up',`--d:${dl}s`); };
    const shell=G(P('M-30 0 C-30 -22 30 -22 30 0 C30 14 -30 14 -30 0Z','g2f')+P('M-20 -8 C-8 -2 8 -2 20 -8 M-24 2 C-8 8 8 8 24 2','thin')+P('M-30 0 C-16 -6 -6 -12 0 -16','gd'),'up','--d:1.8s','translate(470 240)');
    return num(150,7,.3)+num(250,13,.7)+num(350,19,1.1)+shell+TX(150,300,'7')+TX(250,300,'13')+TX(350,300,'19')+TX(470,300,'0','fi tg','--d:2s'); } },
 { place:'Sweden · 2005', sub:'In Pentago every move turns a quarter of the board. Don’t play the board you see: play the board after the turn.', note:'Tomas Flodén designed Pentago in 2005. It has no Maya origin: the link is turning cycles.',
   svg:()=>{ const q=(x,y,c,dl)=>{ let s=P(`M${x} ${y} h108 v108 h-108 Z`,'g2f'); const M=[[0,1,0],[2,1,0],[0,0,2]]; for(let i=0;i<3;i++) for(let j=0;j<3;j++){ const v=(M[(i+c)%3][(j+c)%3]); s+=C(x+18+j*36,y+18+i*36,12,v===1?'fc':v===2?'f':'s thin'); } return s; };
    return q(204,62,0)+G(q(324,62,1),'turn','--d:2.2s')+q(204,182,2)+q(324,182,0)+D('M444 70 C470 90 470 130 452 156 M452 156 L452 140 M452 156 L438 150','gd thick',1.6,.6); } }
]},
notakto:{ score:'dawn', scenes:[
 { place:'Tamil Nadu, South India', sub:'Every dawn in Tamil Nadu, millions of women draw a kolam on the doorstep.',
   svg:()=>{ const house=P('M380 290 L380 120 L600 120 L600 290','f')+P('M360 124 L620 124 L590 92 L390 92 Z','f')+P('M450 290 L450 170 L530 170 L530 290','f')+P('M440 290 L540 290 L546 300 L434 300 Z','g2f');
    let dots=''; for(let i=0;i<5;i++) for(let j=0;j<2;j++) dots+=C(170+i*22,312+j*12,2,'fc fi',`--d:${1.2+i*.12}s`);
    return D('M0 290 L640 290','',0,1.2)+G(house,'up','--d:.2s')+C(150,110,22,'gd rise')+D('M178 312 C192 300 206 324 222 312 C236 300 250 324 262 312','thin',2.2,1.6)
     +fig({x:280,y:300,pose:'sit',kind:'saree',hair:'bun',arm:'reach',flip:1,c:'up',st:'--d:.6s'})+dots+birds(60,70,.4); } },
 { place:'A kolam', sub:'A grid of rice-flour dots, wrapped in one looping line.',
   svg:()=>{ const m=mirror(4,5,25,220,55); return G(m.dots,'fi','')+D(m.d,'thick',.6,5.2)+C(345,180,4.5,'gf fi','--d:4.6s'); } },
 { place:'Mother to daughter', sub:'Gone by nightfall and drawn again the next day: geometry passed from mother to daughter.', note:'Computer scientists in Chennai have used kolam to study how rules make patterns.',
   svg:()=>{ const m=mirror(3,2,14,276,270); return D('M0 250 L640 250','',0,1)+G(m.dots,'fi','--d:.4s')+D(m.d,'',.8,3)
     +fig({x:240,y:262,pose:'sit',kind:'saree',hair:'bun',arm:'reach',c:'up',st:'--d:.3s'})+fig({x:420,y:262,pose:'sit',kind:'saree',hair:'bun',flip:1,s:.75,arm:'reach',c:'up',st:'--d:.5s'})
     +P('M528 66 C514 72 514 96 528 102 C508 104 498 84 506 72 C510 66 520 62 528 66Z','s'); } },
 { place:'The 2010s', sub:'Notakto is played on grids too. You both draw X, and whoever makes the last line of three loses.', note:'Thane Plambeck and Greg Whitehead named and solved it. It does not come from kolam.',
   svg:()=>{ let s=''; [[90,0],[250,1],[410,2]].forEach(([x,k])=>{ s+=ttt(x,110,140,'',.2+k*.3);
      const X=[[[0,0],[1,1],[2,2]],[[0,2],[1,0]],[[2,0],[0,1],[1,2]]][k]; X.forEach(([i,j],n)=>{ s+=G(xo(x+23+j*47,133+i*47,12,0,'thick'),'fi',`--d:${1.2+k*.3+n*.3}s`); });
      if(k===0) s+=D(`M${x+10} 120 L${x+130} 240`,'gd thick',3,.6); });
    return s+TX(160,286,'DEAD','fi','--d:3.4s'); } }
]},
'toot-otto':{ score:'chant', scenes:[
 { place:'India', sub:'For 3,000 years, Vedic reciters kept their texts perfect without writing them down.', note:'UNESCO lists Vedic chanting as world heritage.',
   svg:()=>{ const tree=P('M540 290 L540 140 M540 200 L516 170 M540 180 L566 150')+P('M478 146 C466 106 514 76 544 94 C570 70 630 96 616 138 C606 160 494 168 478 146 Z','g2f');
    let waves=''; for(let i=0;i<3;i++) waves+=D(`M${200+i*12} ${190-i*14} C${220+i*12} ${176-i*14} ${220+i*12} ${204+i*14} ${200+i*12} ${190+i*14}`,'s',.8+i*.3,.8);
    return D('M0 290 L640 290','',0,1.2)+G(tree,'up','--d:.2s')+fig({x:150,y:296,pose:'sit',kind:'dhoti',hair:'bun',arm:'reach',c:'up',st:'--d:.4s'})+waves
     +fig({x:300,y:300,pose:'sit',kind:'dhoti',hair:'short',flip:1,s:.8,c:'up',st:'--d:.6s'})+fig({x:370,y:300,pose:'sit',kind:'dhoti',hair:'short',flip:1,s:.8,c:'up',st:'--d:.7s'})+fig({x:440,y:300,pose:'sit',kind:'dhoti',hair:'bun',flip:1,s:.8,c:'up',st:'--d:.8s'})
     +G(G(P('M80 300 C72 286 76 274 84 264 C90 276 94 288 86 300Z','gf'),'fl','')+P('M64 300 L104 300','thin'),'fi','--d:.4s'); } },
 { place:'Forwards and backwards', sub:'They chanted forwards, then backwards, then in pairs and loops, so one wrong syllable stuck out at once.',
   svg:()=>{ const W=['A','B','C','D']; let s=''; W.forEach((w,i)=>{ s+=G(C(170+i*100,110,24,'f')+TX(170+i*100,118,w,'tbig'),'up',`--d:${.2+i*.15}s`); });
    const row=(y,seq,dl)=>seq.map((w,i)=>G(TX(200+i*48,y,w,'tmid'+(i>=2&&i<=3?' tg':'')),'fi',`--d:${dl+i*.12}s`)).join('');
    return s+row(196,['A','B','B','A','A','B'],1.2)+row(236,['B','C','C','B','B','C'],2.2)+row(276,['C','D','D','C','C','D'],3.2)
     +D('M140 150 L460 150 M450 144 L460 150 L450 156','s',1,.6)+TX(320,330,'EACH PAIR SAID FORWARDS, BACKWARDS, FORWARDS','fi','--d:4s'); } },
 { place:'Rāghavayādavīyam · c. 1650', sub:'One Sanskrit poem tells one epic read forwards, and another read backwards.',
   svg:()=>{ let script=''; for(let r=0;r<3;r++){ let d=`M120 ${170+r*16}`; for(let x=0;x<400;x+=12) d+=` q3 -6 6 0 q3 5 6 0`; script+=D(d,'thin',.4+r*.4,1.4); }
    return P('M100 150 L540 150 C556 150 556 222 540 222 L100 222 C84 222 84 150 100 150Z','g2f')+script
     +D('M120 112 L500 112 M490 104 L500 112 L490 120','thick',2,.8)+TX(310,98,'READ THIS WAY: RĀMA’S STORY','fi','--d:2.2s')
     +D('M520 262 L140 262 M150 254 L140 262 L150 270','gd thick',3.2,.8)+TX(330,292,'READ BACK: KṚṢṆA’S STORY','fi tg','--d:3.4s'); } },
 { place:'Today', sub:'TOOT and OTTO read both ways too, so read every gap from both sides.', note:'Toot and Otto is a modern letter game. It has no Indian origin: the link is reading both ways.',
   svg:()=>{ const G6=[['','','','','',''],['','O','','','',''],['T','T','O','','',''],['O','T','O','O','','']]; let s='';
    for(let r=0;r<4;r++) for(let c=0;c<6;c++){ const x=200+c*48, y=118+r*48; s+=P(`M${x} ${y} h44 v44 h-44 Z`,'f'); if(G6[r][c]) s+=G(TX(x+22,y+31,G6[r][c],'tbig'),'fi',`--d:${.3+(r*6+c)*.04}s`); }
    s+=G(TX(414,293,'T','tbig tg'),'up','--d:2s')+D('M252 303 L436 303','gd thick',2.6,.8)+TX(320,346,'T O O T READS THE SAME BOTH WAYS','fi','--d:3.2s');
    return s; } }
]},
chomp:{ score:'lake', scenes:[
 { place:'Mesoamerica', sub:'People in Mesoamerica were brewing cacao more than 3,500 years ago.',
   svg:()=>{ const pod=(x,y,r)=>G(P(`M0 -16 C10 -14 12 10 0 18 C-12 10 -10 -14 0 -16Z`,'f')+P('M0 -14 L0 16 M-5 -10 C-7 0 -6 10 -3 14 M5 -10 C7 0 6 10 3 14','thin'),'','',`translate(${x} ${y}) rotate(${r})`);
    const tree=P('M140 290 L138 110 M138 170 L104 130 M138 150 L176 116')+P('M70 120 C56 70 120 40 150 62 C186 40 240 70 222 114 C210 140 84 146 70 120Z','g2f')+pod(150,210,-8)+pod(126,240,10)+pod(152,256,-4);
    return D('M0 290 L640 290','',0,1.2)+G(tree,'up','--d:.2s')
     +fig({x:380,y:290,kind:'cloak',hair:'fringe',c:'up',st:'--d:.6s'})+G(P('M394 210 L414 210 L412 226 L396 226 Z','f'),'up','--d:.8s')
     +D('M405 228 C406 252 404 270 406 284','gd',1.6,1.2)+G(P('M390 284 L422 284 L418 300 L394 300 Z','f'),'up','--d:1s')+C(540,90,16,'gd rise'); } },
 { place:'An Aztec market', sub:'In Aztec markets, cacao beans worked as small change.',
   svg:()=>{ let beans=''; for(let i=0;i<14;i++) beans+=P(`M${290+(i%7)*10-4} ${262-Math.floor(i/7)*7} a4 2.6 0 1 0 8 0 a4 2.6 0 1 0 -8 0`,'fc');
    let pots=''; [[420,272],[450,276],[480,270]].forEach(([x,y])=>{ pots+=P(`M${x-12} ${y-20} C${x-18} ${y-6} ${x-12} ${y+6} ${x} ${y+6} C${x+12} ${y+6} ${x+18} ${y-6} ${x+12} ${y-20} Z`,'f'); });
    return D('M0 290 L640 290','',0,1.2)+P('M260 290 L520 290 L536 300 L244 300 Z','g2f')+G(beans+pots,'fi','--d:.6s')
     +fig({x:200,y:296,kind:'cloak',hair:'fringe',c:'up',st:'--d:.3s'})+fig({x:580,y:296,kind:'cloak',hair:'fringe',flip:1,c:'up',st:'--d:.5s'})
     +G(P('M222 216 a4 2.6 0 1 0 8 0 a4 2.6 0 1 0 -8 0','gf'),'wk','--x:320px;--t:2.4s;--d:1.4s')+P('M0 120 L120 120 L120 290 M520 290 L520 140 L640 140','s'); } },
 { place:'A price list · 1545', sub:'A turkey cost 100 beans, and forgers hollowed out beans and filled them with clay.',
   svg:()=>{ const turkey=G(P('M-40 0 C-50 -40 -10 -60 10 -40 C24 -26 20 0 0 4 Z','f')+P('M-34 -12 C-70 -40 -60 -80 -30 -70 C-40 -50 -36 -30 -30 -20','f')+P('M10 -40 L18 -64 C20 -72 30 -70 28 -62 L22 -46','f')+P('M28 -62 L36 -60 L28 -56 M24 -54 C26 -48 24 -44 22 -42','thin')+P('M-12 4 L-14 22 M2 4 L4 22','thin'),'up','--d:.2s','translate(150 230)');
    let b=''; for(let i=0;i<100;i++) b+=P(`M${340+(i%10)*20-5} ${90+Math.floor(i/10)*20} a5 3.4 0 1 0 10 0 a5 3.4 0 1 0 -10 0`,(i===99?'gf':'fc')+' fi',`--d:${.8+i*.025}s`);
    return turkey+b+TX(245,190,'=','tbig fi','--d:.6s')+TX(150,286,'1 TURKEY','fi')+TX(430,312,'100 CACAO BEANS','fi'); } },
 { place:'Today', sub:'In Chomp every bite costs you, and one square is poisoned. The first player can always win.', note:'Schuh (1952) and Gale (1974) made Chomp. It has no Mesoamerican origin: the link is chocolate.',
   svg:()=>{ let s=''; for(let r=0;r<4;r++) for(let c=0;c<7;c++){ const x=166+c*44, y=80+r*44, gone=(r>=2&&c>=4); s+=P(`M${x} ${y} h40 v40 h-40 Z`,(r===0&&c===0?'gf':'g2f')+(gone?' gone':''),gone?`--d:0s`:''); }
    return s+G(P('M166 80 l40 40 M206 80 l-40 40','thick'),'','')+D('M342 166 C360 150 400 150 470 166','gd',3.4,.6); } }
]}
};

/* ---------- music: a short score for each game, built from Web Audio voices ---------- */
let ac=null, master=null, verb=null, nbuf=null, timer=null, nextT=0, step=0, score=null;
function graph(ctx){
  ac=ctx; nbuf=null; master=ac.createGain(); master.gain.value=0; const comp=ac.createDynamicsCompressor(); master.connect(comp); comp.connect(ac.destination);
  const len=ac.sampleRate*2.2, ir=ac.createBuffer(2,len,ac.sampleRate);
  for(let ch=0;ch<2;ch++){ const d=ir.getChannelData(ch); for(let i=0;i<len;i++) d[i]=(Math.random()*2-1)*Math.pow(1-i/len,3); }
  verb=ac.createConvolver(); verb.buffer=ir; const wet=ac.createGain(); wet.gain.value=.32; verb.connect(wet); wet.connect(master);
  return ac;
}
function audioInit(){
  if(ac&&!(ac instanceof (window.OfflineAudioContext||Object))) return ac;
  const AC=window.AudioContext||window.webkitAudioContext; if(!AC) return null;
  return graph(new AC());
}
/* render a score without playing it (for checks and previews): resolves to an AudioBuffer */
function renderScore(name,sec){
  const OAC=window.OfflineAudioContext; if(!OAC||!SCORES[name]) return Promise.reject(new Error('no offline audio'));
  const keep=[ac,master,verb,nbuf], sc=SCORES[name];
  graph(new OAC(2,Math.ceil(44100*sec),44100)); master.gain.value=.5;
  for(let t=.05,k=0;t<sec-1;t+=sc.dt,k++) sc.play(t,k);
  const done=ac.startRendering(); [ac,master,verb,nbuf]=keep; return done;
}
const hz=(base,n)=>base*Math.pow(2,n/12);
function out(node,send){ node.connect(master); if(send) { const g=ac.createGain(); g.gain.value=send; node.connect(g); g.connect(verb); } }
function env(t,a,peak,dec,g){ g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(peak,t+a); g.gain.exponentialRampToValueAtTime(.0001,t+a+dec); }
const V={
  mbira(t,f,v){ for(const [m,a,d] of [[1,1,1.4],[2.76,.32,.35],[5.4,.12,.12]]){ const o=ac.createOscillator(), g=ac.createGain(); o.type='sine'; o.frequency.value=f*m; env(t,.004,a*v,d,g); o.connect(g); out(g,.5); o.start(t); o.stop(t+d+.1); } },
  pluck(t,f,v,dec){ const o=ac.createOscillator(), fl=ac.createBiquadFilter(), g=ac.createGain(); o.type='sawtooth'; o.frequency.value=f; fl.type='lowpass'; fl.Q.value=6; fl.frequency.setValueAtTime(f*9,t); fl.frequency.exponentialRampToValueAtTime(f*1.6,t+(dec||1.6)); env(t,.005,v,dec||1.6,g); o.connect(fl); fl.connect(g); out(g,.45); o.start(t); o.stop(t+(dec||1.6)+.1); },
  flute(t,f,v,dur,glide){ const o=ac.createOscillator(), g=ac.createGain(), lfo=ac.createOscillator(), lg=ac.createGain(); o.type='sine'; o.frequency.setValueAtTime(glide?f*.94:f,t); if(glide) o.frequency.linearRampToValueAtTime(f,t+.18);
    lfo.frequency.value=5; lg.gain.value=f*.012; lfo.connect(lg); lg.connect(o.frequency); g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(v,t+.12); g.gain.setValueAtTime(v,t+dur-.15); g.gain.linearRampToValueAtTime(0,t+dur);
    o.connect(g); out(g,.6); o.start(t); lfo.start(t); o.stop(t+dur+.05); lfo.stop(t+dur+.05);
    const n=noise(t,dur,v*.18,'bandpass',f*2); n&&0; },
  drone(t,f,dur,v){ for(const [m,dt] of [[1,0],[1,4],[1.5,-3],[2,2]]){ const o=ac.createOscillator(), fl=ac.createBiquadFilter(), g=ac.createGain(); o.type='sawtooth'; o.frequency.value=f*m; o.detune.value=dt; fl.type='lowpass'; fl.frequency.value=f*4; g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(v*(m===1?1:.5),t+.8); g.gain.setValueAtTime(v*(m===1?1:.5),t+dur-.8); g.gain.linearRampToValueAtTime(0,t+dur); o.connect(fl); fl.connect(g); out(g,.5); o.start(t); o.stop(t+dur+.05); } },
  wood(t,f,v){ const o=ac.createOscillator(), g=ac.createGain(); o.type='sine'; o.frequency.setValueAtTime(f*1.25,t); o.frequency.exponentialRampToValueAtTime(f,t+.03); env(t,.002,v,.22,g); o.connect(g); out(g,.35); o.start(t); o.stop(t+.3); noise(t,.03,v*.4,'highpass',2000); },
  drum(t,f,v){ const o=ac.createOscillator(), g=ac.createGain(); o.type='sine'; o.frequency.setValueAtTime(f*2,t); o.frequency.exponentialRampToValueAtTime(f,t+.08); env(t,.003,v,.5,g); o.connect(g); out(g,.25); o.start(t); o.stop(t+.6); },
  tabla(t,v){ const o=ac.createOscillator(), g=ac.createGain(); o.type='sine'; o.frequency.setValueAtTime(520,t); o.frequency.exponentialRampToValueAtTime(480,t+.2); env(t,.002,v,.28,g); o.connect(g); out(g,.3); o.start(t); o.stop(t+.35); noise(t,.02,v*.5,'highpass',3000); },
  shake(t,v){ noise(t,.06,v,'highpass',5000); },
  voice(t,f,v,dur,to){ const o=ac.createOscillator(), f1=ac.createBiquadFilter(), f2=ac.createBiquadFilter(), g=ac.createGain(), m=ac.createGain(); o.type='sawtooth'; o.frequency.setValueAtTime(f,t); if(to) o.frequency.linearRampToValueAtTime(to,t+dur*.8);
    f1.type='bandpass'; f1.frequency.value=650; f1.Q.value=5; f2.type='bandpass'; f2.frequency.value=1080; f2.Q.value=6; g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(v,t+.15); g.gain.setValueAtTime(v,t+dur-.2); g.gain.linearRampToValueAtTime(0,t+dur);
    o.connect(f1); o.connect(f2); f1.connect(g); f2.connect(m); m.gain.value=.6; m.connect(g); out(g,.6); o.start(t); o.stop(t+dur+.05); },
  bell(t,f,v){ for(const [m,a,d] of [[1,1,4],[2.4,.4,2.4],[4.1,.22,1.4],[5.9,.1,.8]]){ const o=ac.createOscillator(), g=ac.createGain(); o.frequency.value=f*m; env(t,.004,a*v,d,g); o.connect(g); out(g,.6); o.start(t); o.stop(t+d+.1); } }
};
function noise(t,dur,v,type,fq){ if(!nbuf){ nbuf=ac.createBuffer(1,ac.sampleRate,ac.sampleRate); const d=nbuf.getChannelData(0); for(let i=0;i<d.length;i++) d[i]=Math.random()*2-1; }
  const s=ac.createBufferSource(), fl=ac.createBiquadFilter(), g=ac.createGain(); s.buffer=nbuf; fl.type=type; fl.frequency.value=fq; env(t,.003,v,dur,g); s.connect(fl); fl.connect(g); out(g,.2); s.start(t); s.stop(t+dur+.05); return s; }
/* each score: a step length and a function that plays one step. Scales: mbira in G major pentatonic, the court in
   raga Yaman, the grove in raga Bhupali, the lake in a minor pentatonic with slit drum and clay flute. */
const SCORES={
  mbira:{ dt:.19, play(t,i){ const G3=196, rh=[12,7,16,7,14,9,16,9,12,7,19,7,14,9,16,12,19,14,16,9,12,7,14,7], lh=[0,null,null,-5,null,null,-3,null,null,-5,null,null];
    V.mbira(t,hz(G3,rh[i%24]),.16); const b=lh[i%12]; if(b!==null) V.mbira(t,hz(G3/2,b),.22); V.shake(t,i%3===0?.05:.022); if(i%24===0) V.drum(t,70,.35); } },
  court:{ dt:.24, play(t,i){ const SA=146.83, mel=[null,null,-1,2,4,null,6,4,2,null,4,null,0,null,null,null, 7,null,9,11,12,null,11,9,7,null,6,4,2,null,0,null];
    if(i%32===0) V.drone(t,SA/2,32*.24+.2,.05); const tp=[7,12,12,0]; if(i%4===0) V.pluck(t,hz(SA/2,tp[(i/4)%4]),.06,2.2);
    const m=mel[i%32]; if(m!==null&&i>=32) V.pluck(t,hz(SA*2,m),.12,1.4);
    if([0,6,8,12].includes(i%16)) V.tabla(t,.12); if([0,10].includes(i%16)) V.drum(t,85,.28); } },
  grove:{ dt:.3, play(t,i){ const SA=130.81, mel=[0,null,2,null,4,null,null,null,7,null,9,null,7,null,4,null, 2,null,4,null,2,null,0,null,null,null,null,null,null,null,null,null];
    if(i%32===0) V.drone(t,SA,32*.3+.3,.065); if(i%4===0) V.pluck(t,hz(SA,[7,12,12,0][(i/4)%4]),.07,2.6);
    const m=mel[i%32]; if(m!==null&&i>=16) V.flute(t,hz(SA*4,m),.11,.55,1); if(i%64===48) V.bell(t,hz(SA*4,0),.08); } },
  coast:{ dt:.2, play(t,i){ const D=146.83, mel=[0,null,1,4,5,null,4,1,0,null,null,null,7,8,7,5, 4,null,5,7,8,null,10,8,7,null,5,4,1,null,0,null];
    if(i%2===0) V.pluck(t,hz(D/2,[0,7][(i/2)%2]),.05,.9); const m=mel[i%32]; if(m!==null&&i>=16) V.pluck(t,hz(D*2,m),.11,1.1);
    if([0,6,10].includes(i%16)) V.drum(t,78,.32); if([4,12].includes(i%16)) V.tabla(t,.1); if(i%2) V.shake(t,.018); } },
  dawn:{ dt:.26, play(t,i){ const E=164.81, mel=[0,null,1,null,4,null,5,null,7,null,null,null,8,null,7,null, 5,null,4,null,1,null,0,null,null,null,null,null,null,null,null,null];
    if(i%32===0) V.drone(t,E/2,32*.26+.2,.05); if(i%4===0) V.pluck(t,hz(E/2,[7,12,12,0][(i/4)%4]),.06,2.4);
    const m=mel[i%32]; if(m!==null&&i>=16) V.pluck(t,hz(E*2,m),.1,1.8); if([0,7,10].includes(i%16)&&i>=32) V.tabla(t,.07); } },
  chant:{ dt:.34, play(t,i){ const SA=130.81, line=[[0,0],[2,0],[0,0],[-2,0],[0,0],[0,0],[2,-.5],[0,0]];
    if(i%32===0) V.drone(t,SA/2,32*.34+.2,.08); if(i%4===0){ const [n,sl]=line[(i/4)%8]; V.voice(t,hz(SA,n),.2,4*.34-.05,sl?hz(SA,n-1):0); }
    if(i%16===0) V.bell(t,hz(SA*4,0),.03); } },
  modern:{ dt:.16, play(t,i){ const C=261.63, arp=[0,4,7,11,12,11,7,4, -3,0,4,7,9,7,4,0, -7,-3,0,4,5,4,0,-3, -5,-1,2,5,7,5,2,-1];
    V.mbira(t,hz(C,arp[i%32]),.07); if(i%8===0) V.drum(t,55,.4); if(i%8===4) V.tabla(t,.05); if(i%2) V.shake(t,.02); } },
  lake:{ dt:.21, play(t,i){ const A3=220, slit=[1,0,0,1,0,0,1,0,1,0,0,1,0,1,0,0], hi=[0,0,1,0,0,1,0,0,0,1,0,0,1,0,0,1], fl=[null,null,null,null,12,null,15,null,17,null,null,null,15,null,12,null, 10,null,12,null,null,null,7,null,null,null,null,null,null,null,null,null];
    if(slit[i%16]) V.wood(t,A3*.75,.22); if(hi[i%16]) V.wood(t,A3,.16); if(i%8===0) V.drum(t,62,.4); if(i%2) V.shake(t,.03);
    const m=fl[i%32]; if(m!==null&&i>=32) V.flute(t,hz(A3*2,m),.08,.4,1); } }
};
function tick(){ if(!ac||!score) return; while(nextT<ac.currentTime+.25){ try{ score.play(nextT,step); }catch(e){} nextT+=score.dt; step++; } }
function musicStart(name){
  if(!audioInit()) return false; if(ac.state==='suspended') ac.resume();
  score=SCORES[name]; step=0; nextT=ac.currentTime+.08; clearInterval(timer); timer=setInterval(tick,60); tick();
  master.gain.cancelScheduledValues(ac.currentTime); master.gain.setValueAtTime(master.gain.value,ac.currentTime); master.gain.linearRampToValueAtTime(.5,ac.currentTime+1.2);
  try{ window.ZMusic&&ZMusic.yieldTo(true); }catch(e){}
  return true;
}
function musicStop(){ if(!ac) return; clearInterval(timer); timer=null; score=null; master.gain.cancelScheduledValues(ac.currentTime); master.gain.setValueAtTime(master.gain.value,ac.currentTime); master.gain.linearRampToValueAtTime(0,ac.currentTime+.6); }

/* ---------- the window ---------- */
const BOOK='<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 6.5C10.3 5.2 7.9 4.6 4 4.6v13.3c3.9 0 6.3.6 8 1.9 1.7-1.3 4.1-1.9 8-1.9V4.6c-3.9 0-6.3.6-8 1.9Z"/><path d="M12 6.5v13.3"/></svg>';
const NOTE='<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><circle cx="9" cy="17.5" r="3" fill="currentColor"/><path d="M12 17.5V5l6 1.2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const NOTE_OFF='<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><g opacity=".55"><circle cx="9" cy="17.5" r="3" fill="currentColor"/><path d="M12 17.5V5l6 1.2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></g><path d="M4 4l16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
const X_='<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
const CSS=`
#zfCine{position:fixed;inset:0;z-index:95;display:grid;place-items:center;padding:16px;box-sizing:border-box;background:rgba(8,8,7,.66);opacity:0;visibility:hidden;transition:opacity .5s ease,visibility 0s .5s}
#zfCine.on{opacity:1;visibility:visible;transition:opacity .5s ease}
#zfCine .zc-win{position:relative;width:min(860px,100%,calc((100dvh - 296px)*1.7778 + 28px));min-width:min(100%,340px);max-height:calc(100dvh - 32px);overflow:auto;box-sizing:border-box;border:1px solid var(--g3);border-radius:18px;background:var(--bg);color:var(--fg);box-shadow:0 10px 30px rgba(0,0,0,.18);transform:translateY(28px) scale(.94);transition:transform .8s cubic-bezier(.22,1,.36,1),opacity .5s}
#zfCine.on .zc-win{transform:none}
#zfCine.away{background:transparent;transition:background .5s,opacity .5s .2s,visibility 0s .7s}
#zfCine.away .zc-win{transform:translate(32vw,38vh) scale(.28);opacity:0;transition:transform .7s cubic-bezier(.55,0,.3,1),opacity .5s .2s}
#zfCine .zc-top{display:flex;align-items:center;gap:8px;padding:12px 10px 10px 18px;font:600 11px/1 var(--font-mono);letter-spacing:.08em;text-transform:uppercase;color:var(--g6)}
#zfCine .zc-top>svg{color:${GOLD};flex:none}
#zfCine .zc-t{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#zfCine .zc-btn{display:inline-flex;align-items:center;gap:7px;min-height:40px;padding:0 12px;border:1px solid var(--g3);border-radius:12px;background:transparent;color:var(--g6);font:600 13px var(--font-sans);letter-spacing:0;text-transform:none;cursor:pointer}
#zfCine .zc-btn:hover{color:var(--fg);border-color:var(--g5)}
#zfCine .zc-btn[aria-pressed="true"]{color:var(--fg);border-color:var(--fg)}
#zfCine .zc-x{width:40px;padding:0;justify-content:center;border-color:transparent}
#zfCine button:focus-visible{outline:2px solid var(--fg);outline-offset:2px}
#zfCine .zc-frame{position:relative;margin:0 14px}
#zfCine .zc-stage{position:relative;aspect-ratio:16/9;border:1px solid var(--g3);border-radius:12px;background:var(--g1);overflow:hidden;cursor:pointer}
#zfCine .zc-stage::before,#zfCine .zc-stage::after{content:"";position:absolute;left:0;right:0;height:50%;z-index:3;background:var(--bg);transition:transform 1.1s cubic-bezier(.7,0,.2,1) .25s;pointer-events:none}
#zfCine .zc-stage::before{top:0;transform:translateY(0)}#zfCine .zc-stage::after{bottom:0}
#zfCine.open .zc-stage::before{transform:translateY(-101%)}#zfCine.open .zc-stage::after{transform:translateY(101%)}
#zfCine .zc-sc{position:absolute;inset:0;opacity:0;transition:opacity .9s ease}
#zfCine .zc-sc.on{opacity:1}
#zfCine .zc-sc svg{display:block;width:100%;height:100%;color:var(--fg)}
#zfCine .zc-sc :is(path,circle){fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
#zfCine .zc-sc .thin{stroke-width:1.4}#zfCine .zc-sc .thick{stroke-width:3}
#zfCine .zc-sc .f{fill:var(--g1)}#zfCine .zc-sc .g2f{fill:var(--g2)}#zfCine .zc-sc .g3f{fill:var(--g3)}#zfCine .zc-sc .g4f{fill:var(--g4)}#zfCine .zc-sc .fc{fill:currentColor}
#zfCine .zc-sc .gf{fill:${GOLD};stroke:${GOLD}}#zfCine .zc-sc .gf2{fill:${GOLD}}#zfCine .zc-sc .gd{stroke:${GOLD}}
#zfCine .zc-sc .s{stroke:var(--g5)}#zfCine .zc-sc .s4{stroke:var(--g4)}#zfCine .zc-sc .s4 :is(path,circle){stroke:var(--g4)}
#zfCine .zc-sc text{fill:var(--g6);font:600 11px var(--font-mono);letter-spacing:.08em;text-anchor:middle}
#zfCine .zc-sc .tbig{fill:var(--fg);font:600 24px var(--font-mono);letter-spacing:0}#zfCine .zc-sc .tg{fill:${GOLD}}#zfCine .zc-sc .tmid{fill:var(--fg);font:600 16px var(--font-sans);letter-spacing:.02em}
#zfCine .zc-sc.on .spin{transform-box:fill-box;transform-origin:center;animation:zcSpin var(--t,12s) linear infinite var(--dir,normal)}
#zfCine .zc-sc.on .turn{transform-box:fill-box;transform-origin:center;animation:zcTurn 1.4s cubic-bezier(.6,0,.2,1) var(--d,0s) both}
@keyframes zcSpin{to{transform:rotate(360deg)}}@keyframes zcTurn{to{transform:rotate(90deg)}}
#zfCine .zc-sc .dr{stroke-dasharray:1 1;stroke-dashoffset:1}
#zfCine .zc-sc.on .dr{animation:zcDraw var(--t,1.6s) cubic-bezier(.45,0,.2,1) var(--d,0s) forwards}
#zfCine .zc-sc :is(.fi,.up,.rise){opacity:0}
#zfCine .zc-sc.on .fi{animation:zcFade .8s ease var(--d,0s) forwards}
#zfCine .zc-sc.on .up{animation:zcUp 1s cubic-bezier(.22,1,.36,1) var(--d,0s) forwards}
#zfCine .zc-sc.on .rise{animation:zcRise 6s cubic-bezier(.22,1,.36,1) var(--d,0s) forwards}
#zfCine .zc-sc.on .wk{animation:zcWalk var(--t,7s) linear var(--d,0s) both}
#zfCine .zc-sc.on .bob{animation:zcBob .5s ease-in-out var(--d,0s) infinite alternate}
#zfCine .zc-sc.on .hop{animation:zcHop 3.4s cubic-bezier(.45,0,.2,1) var(--d,0s) both}
#zfCine .zc-sc.on .toss{animation:zcToss .9s cubic-bezier(.3,.6,.4,1) var(--d,0s) both}
#zfCine .zc-sc.on .gone{animation:zcFade .8s ease var(--d,0s) forwards,zcGone .6s ease 4.6s forwards}
#zfCine .zc-sc.on .flash{opacity:0;animation:zcFlash 1.4s ease 4.1s forwards}
#zfCine .zc-sc.on .lost{animation:zcLost 3s ease 2.4s forwards}
#zfCine .zc-sc.on .burn{animation:zcBurn 5s ease 1.4s forwards}
#zfCine .zc-sc.on .fl{transform-box:fill-box;transform-origin:50% 100%;animation:zcFl .42s ease-in-out var(--d,0s) infinite alternate}
#zfCine .zc-sc.on .scrub{animation:zcScrub .7s ease-in-out infinite alternate}
#zfCine .zc-sc.on .kb{animation:zcKb 8.5s linear both}
#zfCine .zc-sc.on .kbz{transform-origin:50% 22%;animation:zcKbz 8.5s cubic-bezier(.4,0,.2,1) both}
@keyframes zcDraw{to{stroke-dashoffset:0}}
@keyframes zcFade{to{opacity:1}}
@keyframes zcUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
@keyframes zcRise{from{opacity:0;transform:translateY(34px)}to{opacity:1;transform:none}}
@keyframes zcWalk{from{transform:none}to{transform:translateX(var(--x,40px))}}
@keyframes zcBob{to{transform:translateY(-2.5px)}}
@keyframes zcHop{0%{transform:none}22%{transform:translate(calc(var(--hx)*.5),-16px)}40%,50%{transform:translateX(var(--hx))}72%{transform:translate(calc(var(--hx)*1.5),-16px)}90%,100%{transform:translateX(calc(var(--hx)*2))}}
@keyframes zcToss{0%{opacity:0;transform:none}15%{opacity:1}50%{transform:translate(calc(var(--x)*.5),-60px) rotate(200deg)}100%{opacity:1;transform:translate(var(--x),calc(var(--y) + 40px)) rotate(400deg)}}
@keyframes zcGone{to{opacity:0;transform:scale(.4)}}
@keyframes zcFlash{0%{opacity:0}25%,60%{opacity:1}100%{opacity:0}}
@keyframes zcLost{to{opacity:.16}}
@keyframes zcBurn{to{opacity:.12}}
@keyframes zcFl{from{transform:scaleY(.86) skewX(-3deg)}to{transform:scaleY(1.08) skewX(3deg)}}
@keyframes zcScrub{to{transform:translateX(-22px)}}
@keyframes zcKb{from{transform:scale(1)}to{transform:scale(1.07)}}
@keyframes zcKbz{from{transform:scale(1)}to{transform:scale(1.12)}}
#zfCine .zc-place{position:absolute;z-index:2;left:12px;top:12px;max-width:calc(100% - 24px);padding:6px 9px;border-radius:8px;background:var(--bg);color:var(--g6);font:600 11px/1.2 var(--font-mono);letter-spacing:.08em;text-transform:uppercase;opacity:0;transform:translateY(-4px);transition:opacity .5s,transform .5s}
#zfCine .zc-place.in{opacity:1;transform:none;transition-delay:.5s}
#zfCine .zc-sub{max-width:680px;min-height:5.2em;margin:14px auto 0;padding:0 10px;box-sizing:border-box;text-align:center}
#zfCine .zc-say{margin:0;font:600 19px/1.38 var(--font-sans);color:var(--fg);text-wrap:balance}
#zfCine .zc-say span{display:inline-block;opacity:0;transform:translateY(5px);animation:zcUp .5s ease forwards;animation-delay:calc(.35s + var(--i)*.075s)}
#zfCine .zc-note{margin:6px 0 0;font:600 11px/1.3 var(--font-mono);letter-spacing:.06em;text-transform:uppercase;color:var(--g6);opacity:0;animation:zcFade .6s ease 2.4s forwards}
#zfCine .zc-note:empty{display:none}
#zfCine .zc-bars{display:flex;gap:6px;margin:12px 14px 0}
#zfCine .zc-bars button{flex:1;height:14px;padding:5px 0;border:0;background:transparent;cursor:pointer}
#zfCine .zc-bars i{display:block;height:4px;border-radius:2px;background:var(--g3);overflow:hidden}
#zfCine .zc-bars i b{display:block;height:100%;background:${GOLD};transform-origin:left;transform:scaleX(0)}
#zfCine .zc-bars .done b{transform:scaleX(1)}
#zfCine .zc-bars .run b{animation:zcBar var(--zc-step) linear both}
#zfCine.paused .zc-bars .run b{animation-play-state:paused}
@keyframes zcBar{from{transform:scaleX(0)}to{transform:scaleX(1)}}
#zfCine .zc-foot{display:flex;flex-wrap:wrap;align-items:center;gap:10px;padding:10px 14px 14px}
#zfCine .zc-hint{flex:1;min-width:160px;color:var(--g6);font:500 13px/1.3 var(--font-sans)}
#zfCine .zc-play{min-height:44px;padding:0 18px;border:1px solid var(--fg);border-radius:12px;background:var(--fg);color:var(--bg);font:600 14px var(--font-sans);cursor:pointer}
#zfCine .zc-play:hover{opacity:.88}
@media (max-width:640px){
 #zfCine{padding:10px;align-items:center}
 #zfCine .zc-frame{margin:0 10px}
 #zfCine .zc-sub{margin-top:12px;padding:0 2px;text-align:left;min-height:6.4em}
 #zfCine .zc-say{font-size:17px}
 #zfCine .zc-hint{display:none}
 #zfCine .zc-foot{justify-content:flex-end}
 #zfCine.away .zc-win{transform:translate(0,40vh) scale(.3)}
}
@media (prefers-reduced-motion:reduce){
 #zfCine,#zfCine .zc-win,#zfCine .zc-sc,#zfCine .zc-stage::before,#zfCine .zc-stage::after{transition:none!important}
 #zfCine .zc-stage::before,#zfCine .zc-stage::after{display:none}
 #zfCine .zc-sc *{animation:none!important;opacity:1!important;stroke-dashoffset:0!important}
 #zfCine .zc-sc .gone,#zfCine .zc-sc .flash{opacity:0!important}
 #zfCine .zc-say span,#zfCine .zc-note{animation:none;opacity:1;transform:none}
}
`;
let adv=null, box=null, slug='', film=null, i=0, opener=null, soundOn=false, open=false;
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function gameName(s){ const g=((window.ZF&&ZF.GAMES)||[]).find(x=>x.slug===s); return g?g.name:s; }
function build(){
  if(box) return;
  const st=document.createElement('style'); st.id='zf-cine-css'; st.textContent=CSS; document.head.appendChild(st);
  box=document.createElement('div'); box.id='zfCine';
  box.innerHTML=`<div class="zc-win" role="dialog" aria-modal="true" aria-labelledby="zcT">
<div class="zc-top">${BOOK}<span class="zc-t" id="zcT"></span><button type="button" class="zc-btn zc-snd" aria-pressed="false">${NOTE_OFF}<span>Sound on</span></button><button type="button" class="zc-btn zc-x" aria-label="Skip the film">${X_}</button></div>
<div class="zc-frame"><div class="zc-stage" aria-hidden="true"><div class="zc-place"></div><div class="zc-reel"></div></div>
<div class="zc-sub" aria-live="polite"><p class="zc-say"></p><p class="zc-note"></p></div></div>
<div class="zc-bars"></div>
<div class="zc-foot"><span class="zc-hint">Tap the picture to go back or forward.</span><button type="button" class="zc-btn zc-read">Read the full story</button><button type="button" class="zc-play">Play</button></div></div>`;
  document.body.appendChild(box);
  box.querySelector('.zc-x').addEventListener('click',()=>close());
  box.querySelector('.zc-play').addEventListener('click',()=>close());
  box.querySelector('.zc-read').addEventListener('click',()=>{ const s=slug; close(true); try{ const t=window.ZFStoryTicker; t&&t.hide&&t.hide(); }catch(e){} try{ localStorage.setItem('zf-story-done',JSON.stringify([...new Set([...(JSON.parse(localStorage.getItem('zf-story-done')||'[]')),s])])); }catch(e){} window.ZFOrigins&&ZFOrigins.open(s,document.querySelector('.zo-trigger')||undefined); });
  box.querySelector('.zc-snd').addEventListener('click',()=>setSound(!soundOn));
  box.querySelector('.zc-stage').addEventListener('click',e=>{ const r=e.currentTarget.getBoundingClientRect(); go(e.clientX-r.left<r.width*.33?i-1:i+1); });
  box.addEventListener('click',e=>{ if(e.target===box) close(); });
  box.addEventListener('keydown',e=>{
    if(e.key==='Escape'){ e.preventDefault(); close(); }
    else if(e.key==='ArrowRight') go(i+1); else if(e.key==='ArrowLeft') go(i-1);
    else if(e.key==='Tab'){ const f=[...box.querySelectorAll('button')].filter(b=>b.offsetParent); const a=f[0], z=f[f.length-1];
      if(e.shiftKey&&document.activeElement===a){ e.preventDefault(); z.focus(); } else if(!e.shiftKey&&document.activeElement===z){ e.preventDefault(); a.focus(); } }
  });
  box.style.setProperty('--zc-step',STEP+'ms');
}
function setSound(on){
  soundOn=!!on && !!(window.AudioContext||window.webkitAudioContext);
  const b=box.querySelector('.zc-snd'); b.setAttribute('aria-pressed',soundOn?'true':'false'); b.innerHTML=(soundOn?NOTE:NOTE_OFF)+`<span>${soundOn?'Sound off':'Sound on'}</span>`;
  if(soundOn) musicStart(film.score); else { musicStop(); }
}
function paint(k){
  const sc=film.scenes[k], reel=box.querySelector('.zc-reel');
  const old=reel.querySelector('.zc-sc.on'); if(old){ old.classList.remove('on'); setTimeout(()=>old.remove(),950); }
  const el=document.createElement('div'); el.className='zc-sc';
  el.innerHTML=`<svg viewBox="0 0 640 360" preserveAspectRatio="xMidYMid slice"><g class="kb" style="transform-origin:50% 60%">${sc.svg()}</g></svg>`;
  reel.appendChild(el); void el.offsetWidth; el.classList.add('on');
  const pl=box.querySelector('.zc-place'); pl.classList.remove('in'); pl.textContent=sc.place; void pl.offsetWidth; pl.classList.add('in');
  const sub=window.ZFLang?ZFLang.t(sc.sub):sc.sub, words=sub.split(' ');   /* lang.js: the subtitle in the visitor's language */
  const say=box.querySelector('.zc-say'); say.innerHTML=words.map((w,n)=>`<span style="--i:${n}">${esc(w)}</span>`).join(' ');
  say.setAttribute('aria-label',sub);
  box.querySelector('.zc-note').textContent=sc.note||'';
  clearTimeout(adv); adv=setTimeout(()=>go(i+1,true),STEP);   /* a timer, not the bar's animationend: the site shortens animations under reduced motion */
  box.querySelectorAll('.zc-bars button').forEach((b,n)=>{ b.classList.toggle('done',n<k); b.classList.remove('run'); if(n===k){ void b.offsetWidth; b.classList.add('run'); } b.setAttribute('aria-current',n===k?'step':'false'); });
}
function go(k,auto){
  if(!open) return;
  if(k<0) k=0;
  if(k>=film.scenes.length){ if(auto) setTimeout(()=>{ if(open) close(); },900); return; }
  i=k; paint(i);
}
function play(s,trigger){
  const f=FILMS[s]; if(!f) return false;
  build(); slug=s; film=f; i=0; open=true; opener=trigger||document.activeElement;
  box.querySelector('.zc-t').textContent=`The story behind ${gameName(s)}`;
  box.querySelector('.zc-bars').innerHTML=f.scenes.map((sc,n)=>`<button type="button" aria-label="Scene ${n+1} of ${f.scenes.length}"><i><b></b></i></button>`).join('');
  box.querySelectorAll('.zc-bars button').forEach((b,n)=>b.addEventListener('click',()=>go(n)));
  box.querySelector('.zc-reel').innerHTML='';
  box.classList.remove('away','open');
  try{ window.ZFStoryTicker&&ZFStoryTicker.hide(); }catch(e){}
  try{ window.ZMusic&&ZMusic.yieldTo(true); }catch(e){}
  /* sound only by the visitor's choice: always off until they tap Sound on */
  setSound(false);
  requestAnimationFrame(()=>{ box.classList.add('on'); setTimeout(()=>{ box.classList.add('open'); paint(0); },reduced()?0:350); box.querySelector('.zc-snd').focus({preventScroll:true}); });
  markSeen(s);
  return true;
}
function close(noCard){
  if(!open) return; open=false; clearTimeout(adv); markSeen(slug);
  musicStop(); try{ window.ZMusic&&ZMusic.yieldTo(false); }catch(e){}
  box.classList.add('away'); box.classList.remove('on');
  setTimeout(()=>{ box.classList.remove('away','open'); box.querySelector('.zc-reel').innerHTML=''; },900);
  if(!noCard){ setTimeout(()=>{ try{ const t=window.ZFStoryTicker; if(t&&!t.done().includes(slug)) t.show(slug); }catch(e){} },650); }
  if(opener&&opener.focus&&document.contains(opener)) try{ opener.focus({preventScroll:true}); }catch(e){}
}
/* opens by itself once per heritage game, a moment after the page settles */
const filmsOff=()=>{ try{ return localStorage.getItem('zf-films')==='0'; }catch(e){ return false; } };   // Language & accessibility menu (lang.js): films can be set not to open by themselves
/* Zack: the film pops up first every time a game is opened, from the homepage, the arcade or anywhere else
   (the arcade opens games in-page, so route changes count too). A reload of the same game does not replay it. */
const pending=s=>!!FILMS[s]&&!filmsOff()&&!/[?&]nofilm\b/.test(location.search);
const reloaded=()=>{ try{ const e=performance.getEntriesByType('navigation')[0]; return !!e&&e.type==='reload'; }catch(x){ return false; } };
let bootT=null, here=slugNow();
function boot(){ clearTimeout(bootT); const s=slugNow(); if(!pending(s)) return; bootT=setTimeout(()=>{ if(slugNow()===s&&!open) play(s); },500); }
function onRoute(){ const s=slugNow(); if(s===here) return; here=s; clearTimeout(bootT); if(open&&s!==slug) close(true); boot(); }
['pushState','replaceState'].forEach(k=>{ const f=history[k]; history[k]=function(){ const r=f.apply(this,arguments); setTimeout(onRoute,0); return r; }; });
addEventListener('popstate',()=>setTimeout(onRoute,0));
const first=()=>{ if(!reloaded()) boot(); };
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',first); else first();
window.ZFCinema={ play, close, has:s=>!!FILMS[s], pending, films:FILMS, renderScore };
})();
