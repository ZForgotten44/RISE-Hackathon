/* heritage-art.js: card illustrations for Morabaraba, Chaupar, Dasapada and Patolli, drawn like the other cards
   (currentColor line art, one small move that plays when the card is hovered, focused or scrolled into view on a phone).
   Loaded before shared.js, which puts them on the cards. */
(function(){
const CSS=`
.ahm .zm3{opacity:0}.ahm .zmshot{transform-box:fill-box;transform-origin:center}
.gcard:is(.on,.live) .ahm .zm3{animation:zhm3 3.6s both}.gcard:is(.on,.live) .ahm .zmline{animation:zhml 3.6s both}.gcard:is(.on,.live) .ahm .zmshot{animation:zhms 3.6s both}
.ahm .zmline{opacity:0}
@keyframes zhm3{0%,10%{opacity:0;transform:translateY(-10px)}22%,100%{opacity:1;transform:none}}
@keyframes zhml{0%,24%{opacity:0}34%,100%{opacity:.35}}
@keyframes zhms{0%,44%{opacity:1;transform:scale(1)}60%,100%{opacity:0;transform:scale(.4)}}
.ahc .zcp{transition:transform .9s cubic-bezier(.3,.8,.3,1) .3s}
.gcard:is(.on,.live) .ahc .zcp{transform:translateY(-52px)}
.ahc .zcd{opacity:.35}.gcard:is(.on,.live) .ahc .zcd{animation:zhcd 1.2s both}
@keyframes zhcd{0%{opacity:.35}30%,100%{opacity:1}}
.ahd .zd1,.ahd .zd2{opacity:0}
.gcard:is(.on,.live) .ahd .zd0{animation:zhd0 3.6s both}.gcard:is(.on,.live) .ahd .zd1{animation:zhd1 3.6s both}.gcard:is(.on,.live) .ahd .zd2{animation:zhd2 3.6s both}
@keyframes zhd0{0%,22%{opacity:1}28%,100%{opacity:0}}
@keyframes zhd1{0%,22%{opacity:0}28%,52%{opacity:1}58%,100%{opacity:0}}
@keyframes zhd2{0%,52%{opacity:0}58%,100%{opacity:1}}
.ahp .zpb{transform-box:fill-box;transform-origin:center}
.gcard:is(.on,.live) .ahp .zpb{animation:zhpb .9s both;animation-delay:calc(var(--i)*.12s)}
.ahp .zpf{opacity:0}.gcard:is(.on,.live) .ahp .zpf{animation:zhpf .9s both;animation-delay:calc(var(--i)*.12s)}
@keyframes zhpb{0%{transform:rotate(0) scale(1)}50%{transform:rotate(200deg) scale(.7)}100%{transform:rotate(360deg) scale(1)}}
@keyframes zhpf{0%,55%{opacity:0}75%,100%{opacity:1}}
@media (prefers-reduced-motion:reduce){.gcard:is(.on,.live) :is(.ahm,.ahc,.ahd,.ahp) *{animation-duration:.01s!important;transition-duration:.01s!important}}
`;
try{ const st=document.createElement('style'); st.id='zf-heritage-art'; st.textContent=CSS; (document.head||document.documentElement).appendChild(st); }catch(e){}
const solid=(x,y,r,cls)=>`<circle class="${cls||''}" cx="${x}" cy="${y}" r="${r}" fill="currentColor"/>`;
const open=(x,y,r,cls)=>`<circle class="${cls||''}" cx="${x}" cy="${y}" r="${r-1.3}" fill="var(--cbg,var(--bg))" stroke="currentColor" stroke-width="2.6"/>`;

/* Morabaraba: the third cow lands, the mill lights, and an enemy cow is shot off the board */
function morabaraba(){ const P=(x,y)=>[22+x*26,22+y*26]; let g='';
  for(const r of [0,1,2]){ const a=P(r,r), b=P(6-r,6-r); g+=`<rect x="${a[0]}" y="${a[1]}" width="${b[0]-a[0]}" height="${b[1]-a[1]}" fill="none" stroke="currentColor" stroke-opacity=".5" stroke-width="2"/>`; }
  const L=(x1,y1,x2,y2)=>{ const a=P(x1,y1), b=P(x2,y2); return `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="currentColor" stroke-opacity=".5" stroke-width="2"/>`; };
  g+=L(3,0,3,2)+L(3,4,3,6)+L(0,3,2,3)+L(4,3,6,3)+L(0,0,2,2)+L(6,0,4,2)+L(0,6,2,4)+L(6,6,4,4);
  const pt=(x,y)=>{ const [a,b]=P(x,y); return `<circle cx="${a}" cy="${b}" r="3" fill="currentColor" fill-opacity=".45"/>`; };
  [[0,0],[3,0],[6,0],[1,1],[3,1],[5,1],[2,2],[3,2],[4,2],[0,3],[1,3],[2,3],[4,3],[5,3],[6,3],[2,4],[3,4],[4,4],[1,5],[3,5],[5,5],[0,6],[3,6],[6,6]].forEach(([x,y])=>g+=pt(x,y));
  const [a,b]=P(0,0), [c,d]=P(6,0); g+=`<line class="zmline" x1="${a}" y1="${b}" x2="${c}" y2="${d}" stroke="currentColor" stroke-width="12" stroke-linecap="round"/>`;
  g+=solid(...P(0,0),9)+solid(...P(3,0),9)+`<g class="zm3">${solid(...P(6,0),9)}</g>`+solid(...P(1,5),9)+solid(...P(4,4),9);
  g+=open(...P(1,3),9)+open(...P(3,5),9)+`<g class="zmshot">${open(...P(5,3),9)}</g>`+open(...P(2,2),9);
  return `<svg viewBox="0 0 200 200" class="ahm" role="img" aria-label="Morabaraba board: three cows in a line make a mill, and an enemy cow is shot">${g}</svg>`; }

/* Chaupar: the cross of squares, partners' pieces on it, and one piece running up an arm */
function chaupar(){ const C=11, O=1.5; let g='';
  const cell=(gx,gy,safe)=>`<rect x="${O+gx*C+.8}" y="${O+gy*C+.8}" width="${C-1.6}" height="${C-1.6}" rx="1.6" fill="currentColor" fill-opacity="${safe?.3:.12}"/>`;
  for(let gx=0;gx<18;gx++) for(let gy=0;gy<18;gy++){ const inV=gx>=7&&gx<=9, inH=gy>=7&&gy<=9; if((inV&&!inH)||(inH&&!inV)){ const safe=((gy===3||gy===14)&&(gx===7||gx===9))||((gx===3||gx===14)&&(gy===7||gy===9))||((gx===8)&&(gy===0||gy===17))||((gy===8)&&(gx===0||gx===17)); g+=cell(gx,gy,safe); } }
  const ctr=O+7*C; g+=`<rect x="${ctr+1}" y="${ctr+1}" width="${3*C-2}" height="${3*C-2}" rx="4" fill="none" stroke="currentColor" stroke-opacity=".5" stroke-width="1.6"/>`;
  const at=(gx,gy)=>[O+gx*C+C/2,O+gy*C+C/2];
  g+=`<g class="zcp">${solid(...at(9,15),4.4)}</g>`+solid(...at(8,3),4.4)+open(...at(13,7),4.4)+open(...at(2,9),4.4)+`<rect x="${at(7,12)[0]-4}" y="${at(7,12)[1]-4}" width="8" height="8" rx="2" fill="currentColor"/>`;
  g+=`<g class="zcd" transform="translate(150 166)">${[0,1,2].map(k=>`<rect x="${k*14}" y="0" width="10" height="26" rx="3" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="${k*14+5}" cy="${[7,13,19][k]}" r="1.8" fill="currentColor"/>`).join('')}</g>`;
  return `<svg viewBox="0 0 200 200" class="ahc" role="img" aria-label="Chaupar cross with partner pieces, one running along its arm, and three long dice">${g}</svg>`; }

/* Dasapada: a ten-row board, pieces in their postures; one lies down, rises, then stands */
function dasapada(){ const C=17, O=15; let g='';
  for(let r=0;r<10;r++) for(let c=0;c<10;c++) g+=`<rect x="${O+c*C+.8}" y="${O+r*C+.8}" width="${C-1.6}" height="${C-1.6}" rx="2.4" fill="currentColor" fill-opacity=".1"/>`;
  const at=(c,r)=>[O+c*C+C/2,O+(9-r)*C+C/2];
  const lie=(x,y,f)=>`<rect x="${x-6}" y="${y-2.4}" width="12" height="4.8" rx="2.4" ${f?'fill="currentColor"':'fill="none" stroke="currentColor" stroke-width="1.8"'}/>`;
  const rise=(x,y,f)=>`<rect x="${x-2.4}" y="${y-2}" width="4.8" height="8" rx="2.4" ${f?'fill="currentColor"':'fill="none" stroke="currentColor" stroke-width="1.8"'}/>`;
  const stand=(x,y,f)=>`<g ${f?'fill="currentColor"':'fill="none" stroke="currentColor" stroke-width="1.8"'}><rect x="${x-2.4}" y="${y-4.5}" width="4.8" height="11" rx="2.4"/><circle cx="${x}" cy="${y-7}" r="2.4"/></g>`;
  for(const c of [0,6,8]) g+=lie(...at(c,0),true); g+=stand(...at(2,3),true);
  const [x,y]=at(4,0); g+=`<g class="zd0">${lie(x,y,true)}</g><g class="zd1">${rise(x,y,true)}</g><g class="zd2">${stand(x,y,true)}</g>`;
  for(const c of [1,5,9]) g+=lie(...at(c,9),false); g+=rise(...at(3,8),false)+stand(...at(7,6),false);
  return `<svg viewBox="0 0 200 200" class="ahd" role="img" aria-label="ten-row Dasapada board: a piece lies down, rises, then stands">${g}</svg>`; }

/* Patolli: the X-shaped mat and the numbered beans turning over */
function patolli(){ const C=10.5, O=26; let g=`<g transform="rotate(45 100 86)">`;
  const cells=[]; for(let k=0;k<6;k++){ cells.push([6,8+k],[7,8+k],[6,5-k],[7,5-k],[8+k,6],[8+k,7],[5-k,6],[5-k,7]); } cells.push([6,6],[7,6],[6,7],[7,7]);
  for(const [gx,gy] of cells){ const end=gx===0||gx===13||gy===0||gy===13; g+=`<rect x="${O+gx*C+.6}" y="${12+gy*C+.6}" width="${C-1.2}" height="${C-1.2}" rx="${end?4:1.4}" fill="currentColor" fill-opacity="${end?.3:.12}"/>`; }
  const at=(gx,gy)=>[O+gx*C+C/2,12+gy*C+C/2];
  g+=solid(...at(6,10),3.6)+solid(...at(11,7),3.6)+open(...at(7,3),3.6)+open(...at(2,6),3.6)+'</g>';
  for(let k=0;k<6;k++){ const x=37+k*25, y=178, up=[1,3,4].includes(k);
    g+=`<g style="--i:${k}"><g class="zpb"><ellipse cx="${x}" cy="${y}" rx="8.5" ry="11" fill="currentColor"/></g>${up?`<g class="zpf"><circle cx="${x}" cy="${y}" r="5.4" fill="var(--cbg,var(--bg))"/><text x="${x}" y="${y+3.2}" text-anchor="middle" font-size="9" font-weight="700" fill="currentColor" font-family="var(--font-mono)">${k+1}</text></g>`:''}</g>`; }
  return `<svg viewBox="0 0 200 200" class="ahp" role="img" aria-label="X-shaped Patolli mat with pebbles, and six numbered beans turning over">${g}</svg>`; }

window.ZF_HERITAGE_ART={morabaraba,chaupar,dasapada,patolli};
})();
