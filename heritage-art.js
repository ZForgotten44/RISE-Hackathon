/* heritage-art.js: card illustrations for Morabaraba, Chaupar, Dasapada and Patolli, drawn like the other cards in
   zart.js (256 x 216, currentColor line art, a caption that says what happens, one move that plays out when the card is
   hovered, focused or scrolled into view). Loaded before shared.js, which puts them on the cards. */
(function(){
const CSS=`
.ahm .zm3,.ahm .zmline,.ahm .zmc2,.ahc .zcn,.ahc .zcc2,.ahd .zd1,.ahd .zd2,.ahd .zdc1,.ahd .zdc2,.ahd .zdc3,.ahp .zpf,.ahp .zpc2,.ahp .zpgo{opacity:0}
.ahm .zmshot,.ahc .zcd,.ahp .zpb{transform-box:fill-box;transform-origin:center}
.gcard:is(.on,.live) .ahm .zm3{animation:zhm3 4.6s forwards}.gcard:is(.on,.live) .ahm .zmline{animation:zhml 4.6s forwards}.gcard:is(.on,.live) .ahm .zmshot{animation:zhms 4.6s forwards}
.gcard:is(.on,.live) .ahm .zmc1{animation:zhout 4.6s forwards}.gcard:is(.on,.live) .ahm .zmc2{animation:zhin 4.6s forwards}
@keyframes zhm3{0%,10%{opacity:0;transform:translateY(-16px)}24%,100%{opacity:1;transform:none}}
@keyframes zhml{0%,26%{opacity:0}36%,100%{opacity:.35}}
@keyframes zhms{0%,50%{opacity:1;transform:scale(1)}64%,100%{opacity:0;transform:scale(.3)}}
@keyframes zhout{0%,44%{opacity:1}52%,100%{opacity:0}}
@keyframes zhin{0%,48%{opacity:0}58%,100%{opacity:1}}
.gcard:is(.on,.live) .ahc .zcd{animation:zhcd 4.6s both;animation-delay:calc(var(--i)*.08s)}.gcard:is(.on,.live) .ahc .zcn{animation:zhcn 4.6s forwards}
.gcard:is(.on,.live) .ahc .zcp{animation:zhcp 4.6s forwards}.gcard:is(.on,.live) .ahc .zcc1{animation:zhout 4.6s forwards}.gcard:is(.on,.live) .ahc .zcc2{animation:zhin 4.6s forwards}
@keyframes zhcd{0%{transform:none}6%{transform:rotate(-14deg) translateY(-4px)}12%{transform:rotate(10deg)}18%{transform:rotate(-5deg)}24%,100%{transform:none}}
@keyframes zhcn{0%,22%{opacity:0}30%,100%{opacity:1}}
@keyframes zhcp{0%,46%{transform:none}80%,100%{transform:translateY(var(--dy))}}
.gcard:is(.on,.live) .ahd .zd0{animation:zhd0 5.4s forwards}.gcard:is(.on,.live) .ahd .zd1{animation:zhd1 5.4s forwards}.gcard:is(.on,.live) .ahd .zd2{animation:zhd2 5.4s forwards}
.gcard:is(.on,.live) .ahd .zdc0{animation:zhdc0 5.4s forwards}.gcard:is(.on,.live) .ahd .zdc1{animation:zhd1 5.4s forwards}.gcard:is(.on,.live) .ahd .zdc2{animation:zhdc2 5.4s forwards}.gcard:is(.on,.live) .ahd .zdc3{animation:zhdc3 5.4s forwards}
@keyframes zhd0{0%,16%{opacity:1}22%,100%{opacity:0}}
@keyframes zhd1{0%,16%{opacity:0}22%,40%{opacity:1}46%,100%{opacity:0}}
@keyframes zhd2{0%,40%{opacity:0;transform:none}46%,62%{opacity:1;transform:none}84%,100%{opacity:1;transform:translateY(var(--dy))}}
@keyframes zhdc0{0%,14%{opacity:1}20%,100%{opacity:0}}
@keyframes zhdc2{0%,42%{opacity:0}48%,62%{opacity:1}68%,100%{opacity:0}}
@keyframes zhdc3{0%,64%{opacity:0}70%,100%{opacity:1}}
.gcard:is(.on,.live) .ahp .zpb{animation:zhpb 1s both;animation-delay:calc(var(--i)*.1s)}.gcard:is(.on,.live) .ahp .zpf{animation:zhpf 1.2s both;animation-delay:calc(var(--i)*.1s)}
.gcard:is(.on,.live) .ahp .zpgo{animation:zhpgo 4.8s forwards}.gcard:is(.on,.live) .ahp .zpc1{animation:zhout 4.8s forwards}.gcard:is(.on,.live) .ahp .zpc2{animation:zhin 4.8s forwards}
@keyframes zhpb{0%{transform:none}45%{transform:rotate(200deg) scale(.7)}100%{transform:rotate(360deg)}}
@keyframes zhpf{0%,60%{opacity:0}85%,100%{opacity:1}}
@keyframes zhpgo{0%,30%{opacity:0;transform:none}36%{opacity:1;transform:none}70%,100%{opacity:1;transform:translate(var(--dx),var(--dy))}}
@media (prefers-reduced-motion:reduce){.gcard:is(.on,.live) :is(.ahm,.ahc,.ahd,.ahp) *{animation-duration:.01s!important;animation-delay:0s!important}}
`;
try{ const st=document.createElement('style'); st.id='zf-heritage-art'; st.textContent=CSS; (document.head||document.documentElement).appendChild(st); }catch(e){}
const T=(x,y,txt,cls,size,weight,mono)=>`<text class="${cls||''}" x="${x}" y="${y}" text-anchor="middle" font-size="${size||12.5}" font-weight="${weight||700}" fill="currentColor" font-family="var(${mono?'--font-mono':'--font-sans'})">${txt}</text>`;
const solid=(x,y,r)=>`<circle cx="${x}" cy="${y}" r="${r}" fill="currentColor"/>`;
const open=(x,y,r)=>`<circle cx="${x}" cy="${y}" r="${r-1.4}" fill="var(--cbg,var(--bg))" stroke="currentColor" stroke-width="2.8"/>`;

/* Morabaraba: the third cow lands, the mill lights, and an open cow is shot off the board */
function morabaraba(){ const P=(x,y)=>[56+x*24,34+y*24]; let g=T(128,14,'Three cows in a line make a mill','',12,700,true);
  for(const r of [0,1,2]){ const a=P(r,r), b=P(6-r,6-r); g+=`<rect x="${a[0]}" y="${a[1]}" width="${b[0]-a[0]}" height="${b[1]-a[1]}" fill="none" stroke="currentColor" stroke-opacity=".5" stroke-width="2.2"/>`; }
  const L=(x1,y1,x2,y2)=>{ const a=P(x1,y1), b=P(x2,y2); return `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="currentColor" stroke-opacity=".5" stroke-width="2.2"/>`; };
  g+=L(3,0,3,2)+L(3,4,3,6)+L(0,3,2,3)+L(4,3,6,3)+L(0,0,2,2)+L(6,0,4,2)+L(0,6,2,4)+L(6,6,4,4);
  [[0,0],[3,0],[6,0],[1,1],[3,1],[5,1],[2,2],[3,2],[4,2],[0,3],[1,3],[2,3],[4,3],[5,3],[6,3],[2,4],[3,4],[4,4],[1,5],[3,5],[5,5],[0,6],[3,6],[6,6]].forEach(([x,y])=>{ const [a,b]=P(x,y); g+=`<circle cx="${a}" cy="${b}" r="3.2" fill="currentColor" fill-opacity=".5"/>`; });
  const [a,b]=P(0,0), [c,d]=P(6,0); g+=`<line class="zmline" x1="${a}" y1="${b}" x2="${c}" y2="${d}" stroke="currentColor" stroke-width="15" stroke-linecap="round"/>`;
  g+=solid(...P(0,0),10)+solid(...P(3,0),10)+`<g class="zm3">${solid(...P(6,0),10)}</g>`+solid(...P(1,5),10)+solid(...P(4,4),10);
  g+=open(...P(1,3),10)+open(...P(3,5),10)+`<g class="zmshot">${open(...P(5,3),10)}</g>`+open(...P(2,2),10);
  g+=T(128,207,'Solid places its third cow…','zmc1')+T(128,207,'A mill: shoot one open cow','zmc2');
  return `<svg viewBox="0 0 256 216" class="ahm" role="img" aria-label="Morabaraba: solid places a third cow in a line, makes a mill and shoots an open cow off the board">${g}</svg>`; }

/* Chaupar: close up on the centre and your own arm. The long dice roll 6 · 2 · 5, and a solid piece runs out of the centre */
function chaupar(){ const C=18, cx=128, cy=51; let g='';
  /* cells around the centre: (i, j) in cell units from the centre square's middle */
  const cell=(i,j,safe)=>`<rect x="${cx+i*C-C/2+.8}" y="${cy+j*C-C/2+.8}" width="${C-1.6}" height="${C-1.6}" rx="2.4" fill="currentColor" fill-opacity="${safe?.38:.16}"/>`;
  const mark=(i,j)=>{ const x=cx+i*C, y=cy+j*C; return `<path d="M${x-3.5} ${y-3.5}l7 7m0 -7l-7 7" stroke="currentColor" stroke-width="1.6" stroke-opacity=".8"/>`; };
  for(let k=2;k<=7;k++) for(const s of [-1,0,1]){ const safe=(k===5&&s!==0); g+=cell(s,k,safe)+(safe?mark(s,k):''); }          // south arm: your own
  for(let k=2;k<=2;k++) for(const s of [-1,0,1]) g+=cell(s,-k,false);                                                       // north arm, cut off
  for(let k=2;k<=5;k++) for(const s of [-1,0,1]){ const safe=(k===5&&s!==0); g+=cell(k,s,safe)+cell(-k,s,safe)+(safe?mark(k,s)+mark(-k,s):''); }   // east and west
  g+=`<rect x="${cx-1.5*C+1}" y="${cy-1.5*C+1}" width="${3*C-2}" height="${3*C-2}" rx="6" fill="none" stroke="currentColor" stroke-opacity=".65" stroke-width="2"/>`;
  const sq=(x,y,r,f)=>`<rect x="${x-r}" y="${y-r}" width="${2*r}" height="${2*r}" rx="${r*.35}" ${f?'fill="currentColor"':'fill="var(--cbg,var(--bg))" stroke="currentColor" stroke-width="2.4"'}/>`;
  g+=sq(cx-C*.55,cy-C*.55,5.4,true)+open(cx+C*.55,cy-C*.55,6.6)+sq(cx-C*.55,cy+C*.55,5.4,false);
  g+=`<g class="zcp" style="--dy:${5*C}px">${solid(cx,cy+C,7.5)}</g>`+open(cx+C*4,cy,7.5)+open(cx-C,cy+C*4,7.5);
  [6,2,5].forEach((v,k)=>{ const x=182+k*20, y=124; g+=`<g class="zcd" style="--i:${k}"><rect x="${x}" y="${y}" width="15" height="40" rx="4" fill="none" stroke="currentColor" stroke-width="2.2"/><text class="zcn" x="${x+7.5}" y="${y+25}" text-anchor="middle" font-size="14" font-weight="800" fill="currentColor" font-family="var(--font-mono)">${v}</text></g>`; });
  g+=T(128,207,'Throw the three long dice…','zcc1')+T(128,207,'The 6 brings a piece in, the 5 runs it','zcc2',12);
  return `<svg viewBox="0 0 256 216" class="ahc" role="img" aria-label="Chaupar: the long dice roll six, two and five, and a solid piece runs out of the centre down its arm">${g}</svg>`; }
/* Dasapada: a ten-row board; one piece lies, rises, stands, then walks up four rows */
function dasapada(){ const C=15, X0=53, Y0=22; let g=T(128,14,'Count the nuts by fours','',12,700,true);
  for(let r=0;r<10;r++) for(let c=0;c<10;c++) g+=`<rect x="${X0+c*C+.7}" y="${Y0+r*C+.7}" width="${C-1.4}" height="${C-1.4}" rx="2.4" fill="currentColor" fill-opacity=".14"/>`;
  const at=(c,r)=>[X0+c*C+C/2,Y0+(9-r)*C+C/2];
  const sty=f=>f?'fill="currentColor"':'fill="var(--cbg,var(--bg))" stroke="currentColor" stroke-width="2"';
  const lie=(x,y,f)=>`<rect x="${x-6.5}" y="${y-2.6}" width="13" height="5.2" rx="2.6" ${sty(f)}/>`;
  const rise=(x,y,f)=>`<rect x="${x-2.6}" y="${y-2}" width="5.2" height="8.5" rx="2.6" ${sty(f)}/>`;
  const stand=(x,y,f)=>`<g ${sty(f)}><rect x="${x-2.6}" y="${y-4}" width="5.2" height="11" rx="2.6"/><circle cx="${x}" cy="${y-7}" r="2.6"/></g>`;
  for(const c of [0,2,6,8]) g+=lie(...at(c,0),true); g+=stand(...at(1,5),true);
  const [x,y]=at(4,0); g+=`<g class="zd0">${lie(x,y,true)}</g><g class="zd1">${rise(x,y,true)}</g><g class="zd2" style="--dy:${-4*C}px">${stand(x,y,true)}</g>`;
  for(const c of [1,5,9]) g+=lie(...at(c,9),false); g+=rise(...at(3,8),false)+stand(...at(7,6),false);
  g+=T(128,206,'Every piece starts lying down','zdc0')+T(128,206,'2 left over: Dvāpara, it rises','zdc1')+T(128,206,'3 left over: Tretā, it stands','zdc2')+T(128,206,'None left over: Kṛta, it walks 4','zdc3');
  return `<svg viewBox="0 0 256 216" class="ahd" role="img" aria-label="Dasapada: a piece lies down, rises, stands, then walks four rows up the ten-row board">${g}</svg>`; }

/* Patolli: the X-shaped mat, close up, and six numbered beans turning over; a pebble runs along one arm */
function patolli(){ const C=17, N=10, O=128-N*C/2, Y=98-N*C/2; let g=`<g transform="rotate(45 128 98)">`;
  const cells=[]; for(let k=0;k<4;k++){ cells.push([4,6+k],[5,6+k],[4,3-k],[5,3-k],[6+k,4],[6+k,5],[3-k,4],[3-k,5]); } cells.push([4,4],[5,4],[4,5],[5,5]);
  for(const [gx,gy] of cells){ const end=gx===0||gx===9||gy===0||gy===9; g+=`<rect x="${O+gx*C+.7}" y="${Y+gy*C+.7}" width="${C-1.4}" height="${C-1.4}" rx="${end?4.5:2}" fill="currentColor" fill-opacity="${end?.38:.16}"/>`; }
  const at=(gx,gy)=>[O+gx*C+C/2,Y+gy*C+C/2];
  g+=open(...at(5,1),7.4)+open(...at(1,4),7.4)+solid(...at(8,5),6.6)+`<g class="zpgo" style="--dx:0px;--dy:${3*C}px">${solid(...at(4,5),6.6)}</g></g>`;
  for(let k=0;k<6;k++){ const x=68+k*24, y=198, up=[1,3].includes(k);
    g+=`<g style="--i:${k}"><g class="zpb"><ellipse cx="${x}" cy="${y}" rx="8.5" ry="11" fill="currentColor"/></g>${up?`<g class="zpf"><circle cx="${x}" cy="${y}" r="6" fill="var(--cbg,var(--bg))"/><text x="${x}" y="${y+3.6}" text-anchor="middle" font-size="10" font-weight="800" fill="currentColor" font-family="var(--font-mono)">${k+1}</text></g>`:''}</g>`; }
  g+=T(128,13,'Throw six beans…','zpc1',12,700,true)+T(128,13,'2 and 4 up: two moves','zpc2',12,700,true);
  return `<svg viewBox="0 0 256 216" class="ahp" role="img" aria-label="Patolli: six numbered beans turn over, two land face up, and a pebble runs along the X-shaped mat">${g}</svg>`; }

window.ZF_HERITAGE_ART={morabaraba,chaupar,dasapada,patolli};
})();
