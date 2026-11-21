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

/* Chaupar: the long dice roll 6 · 2 · 5, and a solid piece runs out of the centre down its arm */
function chaupar(){ const C=10, X0=128-9.5*C, Y0=4; let g='';
  const cell=(gx,gy,safe)=>`<rect x="${X0+gx*C+.7}" y="${Y0+gy*C+.7}" width="${C-1.4}" height="${C-1.4}" rx="1.6" fill="currentColor" fill-opacity="${safe?.36:.16}"/>`;
  for(let gx=0;gx<19;gx++) for(let gy=0;gy<19;gy++){ const inV=gx>=8&&gx<=10, inH=gy>=8&&gy<=10; if(inV===inH) continue;
    const arm=inV?(gy>10?gy-11:7-gy):(gx>10?gx-11:7-gx), side=inV?gx-8:gy-8; g+=cell(gx,gy,(arm===7&&side===1)||(arm===3&&side!==1)); }
  const cx=X0+8*C; g+=`<rect x="${cx+.7}" y="${Y0+8*C+.7}" width="${3*C-1.4}" height="${3*C-1.4}" rx="4" fill="none" stroke="currentColor" stroke-opacity=".6" stroke-width="1.8"/>`;
  const at=(gx,gy)=>[X0+gx*C+C/2,Y0+gy*C+C/2], sq=(x,y,r,f)=>`<rect x="${x-r}" y="${y-r}" width="${2*r}" height="${2*r}" rx="${r*.35}" ${f?'fill="currentColor"':'fill="var(--cbg,var(--bg))" stroke="currentColor" stroke-width="2.2"'}/>`;
  const [px,py]=at(9,11); g+=`<g class="zcp" style="--dy:${6*C}px">${solid(px,py-C,4.4)}</g>`;
  g+=sq(...at(9,4),4,true)+open(...at(14,9),4.6)+sq(...at(3,9),4,false)+open(...at(10,13),4.6);
  /* the three long dice, in the empty corner */
  [6,2,5].forEach((v,k)=>{ const x=186+k*20, y=140; g+=`<g class="zcd" style="--i:${k}"><rect x="${x}" y="${y}" width="15" height="40" rx="4" fill="none" stroke="currentColor" stroke-width="2.2"/><text class="zcn" x="${x+7.5}" y="${y+25}" text-anchor="middle" font-size="14" font-weight="800" fill="currentColor" font-family="var(--font-mono)">${v}</text></g>`; });
  g+=T(128,208,'Throw the three long dice…','zcc1')+T(128,208,'The 6 brings a piece in, the 5 runs it','zcc2',12);
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

/* Patolli: six numbered beans turn over, and a pebble runs along the X-shaped mat */
function patolli(){ const C=9, O=128-7*C, Y=90-7*C; let g=`<g transform="rotate(45 128 90)">`;
  const cells=[]; for(let k=0;k<6;k++){ cells.push([6,8+k],[7,8+k],[6,5-k],[7,5-k],[8+k,6],[8+k,7],[5-k,6],[5-k,7]); } cells.push([6,6],[7,6],[6,7],[7,7]);
  for(const [gx,gy] of cells){ const end=gx===0||gx===13||gy===0||gy===13; g+=`<rect x="${O+gx*C+.6}" y="${Y+gy*C+.6}" width="${C-1.2}" height="${C-1.2}" rx="${end?3.5:1.4}" fill="currentColor" fill-opacity="${end?.36:.16}"/>`; }
  const at=(gx,gy)=>[O+gx*C+C/2,Y+gy*C+C/2];
  g+=solid(...at(6,11),4.2)+open(...at(7,2),4.4)+open(...at(2,6),4.4)+`<g class="zpgo" style="--dx:0px;--dy:${6*C}px">${solid(...at(7,6),4.2)}</g></g>`;
  for(let k=0;k<6;k++){ const x=53+k*30, y=188, up=[1,3].includes(k);
    g+=`<g style="--i:${k}"><g class="zpb"><ellipse cx="${x}" cy="${y}" rx="9" ry="11.5" fill="currentColor"/></g>${up?`<g class="zpf"><circle cx="${x}" cy="${y}" r="6" fill="var(--cbg,var(--bg))"/><text x="${x}" y="${y+3.6}" text-anchor="middle" font-size="10" font-weight="800" fill="currentColor" font-family="var(--font-mono)">${k+1}</text></g>`:''}</g>`; }
  g+=T(128,14,'Throw six numbered beans…','zpc1',12,700,true)+T(128,14,'2 and 4 face up: two moves','zpc2',12,700,true);
  g+=T(128,212,'Every bean is its own move','',12);
  return `<svg viewBox="0 0 256 216" class="ahp" role="img" aria-label="Patolli: six numbered beans turn over, two land face up, and a pebble runs along the X-shaped mat">${g}</svg>`; }

window.ZF_HERITAGE_ART={morabaraba,chaupar,dasapada,patolli};
})();
