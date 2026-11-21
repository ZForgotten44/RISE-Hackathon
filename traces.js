/* traces.js: dedicated background artwork for every game (not the card illustrations).
   Each game has two fragments, A (the main composition) and B (a smaller companion), drawn on a 240x240 grid for cropping at a screen edge.
   Home shows A of one game at a time, alternating sides; a game page shows its own A and B around the board. Grayscale, low contrast;
   only the Gold Coin trace carries a muted gold. */
(function(){
const S=(w,extra)=>`fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${extra||''}`;
const svg=(inner,attrs)=>`<svg viewBox="0 0 240 240" ${attrs||''}>${inner}</svg>`;
const bar=(x,y,w,h)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="9" fill="currentColor"/>`;
const xmark=(cx,cy,r,w)=>`<path d="M${cx-r} ${cy-r}L${cx+r} ${cy+r}M${cx+r} ${cy-r}L${cx-r} ${cy+r}" ${S(w)}/>`;
/* a 3x3 grid of size sz at (x,y); nested: cells whose small grids are drawn */
function grid3(x,y,sz,lw,inner,nested,iw){ let g=''; const c=sz/3; g+=`<rect x="${x}" y="${y}" width="${sz}" height="${sz}" rx="${sz*.05}" ${S(lw)}/>`; for(let i=1;i<3;i++){ g+=`<path d="M${x+c*i} ${y}V${y+sz}M${x} ${y+c*i}H${x+sz}" ${S(lw*.8)}/>`; }
  (nested||[]).forEach(([cx,cy])=>{ const ox=x+cx*c+c*.12, oy=y+cy*c+c*.12, s2=c*.76, c2=s2/3; for(let i=1;i<3;i++) g+=`<path d="M${ox+c2*i} ${oy}V${oy+s2}M${ox} ${oy+c2*i}H${ox+s2}" ${S(iw||1.8)}/>`; g+=`<rect x="${ox}" y="${oy}" width="${s2}" height="${s2}" rx="2" ${S(iw||1.8)}/>`; }); return g; }
const piece={ round:(x,y,h,w)=>`<path d="M${x} ${y}V${y+h}A${w/2} ${w*.19} 0 0 0 ${x+w} ${y+h}V${y}" ${S(7)}/><ellipse cx="${x+w/2}" cy="${y}" rx="${w/2}" ry="${w*.19}" fill="currentColor"/>`,
  hollow:(x,y,h,w)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" ${S(7)}/><rect x="${x}" y="${y}" width="${w}" height="${h*.34}" rx="6" ${S(7)}/><rect x="${x+w*.24}" y="${y+h*.09}" width="${w*.52}" height="${h*.16}" rx="3" fill="currentColor"/>` };
const dom=(x,y,vert)=>{ const w=vert?56:116, h=vert?116:56; let pips=vert?`<circle cx="${x+28}" cy="${y+29}" r="6" fill="currentColor"/><circle cx="${x+28}" cy="${y+87}" r="6" fill="currentColor"/><path d="M${x+10} ${y+58}h36" ${S(4)}/>`:`<circle cx="${x+29}" cy="${y+28}" r="6" fill="currentColor"/><circle cx="${x+87}" cy="${y+28}" r="6" fill="currentColor"/><path d="M${x+58} ${y+10}v36" ${S(4)}/>`; return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="17" ${vert?'fill="currentColor" fill-opacity=".9"':S(8)}/>${vert?pips.replace(/fill="currentColor"/g,'fill="var(--tbg,#000)"').replace(/stroke="currentColor"/g,'stroke="var(--tbg,#000)"'):pips}`; };
const person=(x,y,s)=>`<g transform="translate(${x} ${y}) scale(${s})"><circle cx="0" cy="-16" r="11" ${S(6)}/><path d="M-20 18V12a20 20 0 0 1 40 0V18Z" ${S(6)}/></g>`;
const env=(x,y,w,h)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="12" ${S(7)}/><path d="M${x+6} ${y+8}L${x+w/2} ${y+h*.58}L${x+w-6} ${y+8}" ${S(6)}/>`;
const coin=(cx,cy,r,gold)=>gold?`<circle class="gold" cx="${cx}" cy="${cy}" r="${r}" fill="#b89a3c" stroke="#8d742a" stroke-width="3"/><circle cx="${cx}" cy="${cy}" r="${r*.62}" fill="none" stroke="#8d742a" stroke-width="2.4"/><path d="M${cx} ${cy-r*.34}l${r*.11} ${r*.2}h${r*.24}l-${r*.19} ${r*.15}l${r*.08} ${r*.24}l-${r*.24}-${r*.15}l-${r*.24} ${r*.15}l${r*.08}-${r*.24}l-${r*.19}-${r*.15}h${r*.24}Z" fill="#8d742a"/>`:`<circle cx="${cx}" cy="${cy}" r="${r}" ${S(8)}/><circle cx="${cx}" cy="${cy}" r="${r*.68}" ${S(3)}/>`;


/* ---- shared drawing components: the same proportions the live games use ---- */
const R2=n=>Math.round(n*100)/100;
/* coin: r is the PENNY radius; gold is 1.5x (ZART.COIN_GOLD). Pennies are gray outlines, gold is one muted solid */
const COIN_GOLD=1.5;
const coinT=(kind,cx,cy,r)=>{ if(kind==='gold'){ r=r*COIN_GOLD; return `<circle class="gold" cx="${cx}" cy="${cy}" r="${R2(r)}" fill="#b89a3c" stroke="#8d742a" stroke-width="3"/><circle cx="${cx}" cy="${cy}" r="${R2(r*.68)}" fill="none" stroke="#8d742a" stroke-width="2.2"/><polygon fill="#8d742a" points="${Array.from({length:10},(_,i)=>{ const a=-Math.PI/2+i*Math.PI/5, rr=i%2?r*.16:r*.36; return R2(cx+Math.cos(a)*rr)+','+R2(cy+Math.sin(a)*rr); }).join(' ')}"/>`; }
  return `<circle cx="${cx}" cy="${cy}" r="${r}" ${S(6)}/><circle cx="${cx}" cy="${cy}" r="${R2(r*.68)}" ${S(2.4)}/><circle cx="${cx}" cy="${cy}" r="${R2(r*.14)}" fill="currentColor"/>`; };
/* a row of coin spaces (the game's track), cell 56 wide like the live board */
const spaceT=(x,y,w,h)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${R2(w*.2)}" ${S(3.2)}/>`;
/* pentago quadrant: rounded frame, inner well, exactly nine circular recesses on a regular 3x3 grid (hole r = .43 cell, marble r = .37 cell) */
function quadrant(x,y,cell,marbles){ const pad=cell*.34, w=3*cell+2*pad; let g=`<rect x="${x}" y="${y}" width="${R2(w)}" height="${R2(w)}" rx="${R2(cell*.5)}" ${S(5)}/><rect x="${R2(x+pad-cell*.12)}" y="${R2(y+pad-cell*.12)}" width="${R2(3*cell+cell*.24)}" height="${R2(3*cell+cell*.24)}" rx="${R2(cell*.3)}" ${S(2.2,' opacity=".55"')}/>`;
  for(let r=0;r<3;r++)for(let c=0;c<3;c++){ const cx=R2(x+pad+(c+.5)*cell), cy=R2(y+pad+(r+.5)*cell); g+=`<circle cx="${cx}" cy="${cy}" r="${R2(cell*.43)}" ${S(3.2)}/>`; if((marbles||[]).some(m=>m[0]===r&&m[1]===c)) g+=`<circle cx="${cx}" cy="${cy}" r="${R2(cell*.3)}" fill="currentColor"/>`; } return g; }
/* recursive: a 3x3 of boards, each a 3x3. Heavy outer rules, fine inner rules; cropped by the fragment's viewBox */
function nested(x,y,size,marks){ const c=size/3; let g=''; for(let bi=0;bi<3;bi++)for(let bj=0;bj<3;bj++){ const ox=x+bj*c+c*.08, oy=y+bi*c+c*.08, sz=c*.84, m=sz/3; g+=`<rect x="${R2(ox)}" y="${R2(oy)}" width="${R2(sz)}" height="${R2(sz)}" rx="3" ${S(1.6)}/>`; for(let k=1;k<3;k++) g+=`<path d="M${R2(ox+m*k)} ${R2(oy)}V${R2(oy+sz)}M${R2(ox)} ${R2(oy+m*k)}H${R2(ox+sz)}" ${S(1.6)}/>`; }
  for(let k=1;k<3;k++) g+=`<path d="M${R2(x+c*k)} ${y}V${y+size}M${x} ${R2(y+c*k)}H${x+size}" ${S(7)}/>`; g+=`<rect x="${x}" y="${y}" width="${size}" height="${size}" rx="14" ${S(7)}/>`;
  (marks||[]).forEach(([bi,bj,ci,cj,k])=>{ const c1=size/3, sz=c1*.84, m=sz/3, cx=x+bj*c1+c1*.08+(cj+.5)*m, cy=y+bi*c1+c1*.08+(ci+.5)*m, q=m*.28; g+=k==='x'?`<path d="M${R2(cx-q)} ${R2(cy-q)}L${R2(cx+q)} ${R2(cy+q)}M${R2(cx+q)} ${R2(cy-q)}L${R2(cx-q)} ${R2(cy+q)}" ${S(2.6)}/>`:`<circle cx="${R2(cx)}" cy="${R2(cy)}" r="${R2(q*1.05)}" ${S(2.6)}/>`; }); return g; }
/* 3D: exactly the live board's projection (z up; yaw .5, elevation .62; layer spacing 1+.85*1.2), so a mark at a cell centre is centred in its cell */
function proj3(o){ const sp=1+.85*1.2, cy=Math.cos(o.yaw), sy=Math.sin(o.yaw), ce=Math.cos(o.el), se=Math.sin(o.el); return (x,y,z)=>{ const X=x-1,Y=y-1,Z=(z-1)*sp; const rx=X*cy-Y*sy, ry=X*sy+Y*cy; return [R2(o.cx+rx*o.s), R2(o.cy+(ry*se-Z*ce)*o.s)]; }; }
function plate3(P,z,lw){ const q=[[-.5,-.5],[2.5,-.5],[2.5,2.5],[-.5,2.5]].map(([a,b])=>P(a,b,z)); let g=''; for(let k=1;k<3;k++){ const t=-.5+k; const a=P(t,-.5,z), b=P(t,2.5,z), c=P(-.5,t,z), d=P(2.5,t,z); g+=`<path d="M${a} L${b} M${c} L${d}" ${S(lw*.4,' opacity=".7"')}/>`; } return `<path d="M${q.map(p=>p.join(' ')).join(' L')} Z" ${S(lw)}/>`+g; }
function mark3(P,kind,x,y,z,w){ if(kind==='x'){ const a=P(x-.25,y-.25,z), b=P(x+.25,y+.25,z), c=P(x+.25,y-.25,z), d=P(x-.25,y+.25,z); return `<path d="M${a} L${b} M${c} L${d}" ${S(w)}/>`; } const pts=[]; for(let k=0;k<=24;k++){ const t=k/24*Math.PI*2; pts.push(P(x+Math.cos(t)*.28,y+Math.sin(t)*.28,z).join(' ')); } return `<path d="M${pts.join(' L')} Z" ${S(w)}/>`; }
/* chomp: tiles like the board (rounded squares, gap 4px); the poison tile carries the skull */
const SKULL='M12 2C7.6 2 4.5 5.2 4.5 9.4c0 2.5 1.1 4.1 2.5 5.1V18a1.5 1.5 0 0 0 1.5 1.5h.8V21h2v-1.5h1.4V21h2v-1.5h.8A1.5 1.5 0 0 0 17 18v-3.5c1.4-1 2.5-2.6 2.5-5.1C19.5 5.2 16.4 2 12 2Zm-3.3 8.2a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm6.6 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z';
const skull=(cx,cy,s)=>`<path d="${SKULL}" transform="translate(${R2(cx-12*s)} ${R2(cy-12*s)}) scale(${s})" fill="var(--tbg,#000)" fill-rule="evenodd"/>`;
/* domineering: a vertical tile is solid, a horizontal tile is outlined; two squares each, no markings */
const domT=(x,y,vert)=>{ const w=vert?56:116, h=vert?116:56; return vert?`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="17" fill="currentColor" fill-opacity=".9"/>`:`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="17" ${S(8)}/>`; };
/* 4x4: grid rules only, X and O the way the board draws them */
function grid4(x,y,cell,lw){ let g=''; for(let k=1;k<4;k++) g+=`<path d="M${x+cell*k} ${y}V${y+cell*4}M${x} ${y+cell*k}H${x+cell*4}" ${S(lw)}/>`; return g; }

const T={
 '4x4-tic-tac-toe':{A:svg(grid4(-30,-20,86,5)+xmark(13,23,24,10)+`<circle cx="99" cy="109" r="28" ${S(10)}/>`+xmark(185,195,24,10)),B:svg(grid4(60,60,80,5)+`<circle cx="100" cy="100" r="26" ${S(9)}/>`+xmark(180,180,22,9))},
 'recursive-tic-tac-toe':{A:svg(nested(-96,-90,330,[[0,0,1,1,'x'],[0,1,0,2,'o'],[1,0,2,0,'o'],[1,1,1,1,'x'],[0,0,2,2,'o']])),B:svg(nested(-20,-30,250,[[1,1,1,1,'x'],[1,0,0,1,'o'],[0,1,2,0,'x']]))},
 '3d-tic-tac-toe':{A:svg((()=>{ const P=proj3({cx:120,cy:122,s:34,yaw:.5,el:.62}); return plate3(P,0,4.5)+plate3(P,1,4.5)+plate3(P,2,4.5)+mark3(P,'x',1,1,1,6)+mark3(P,'o',2,0,2,6); })()),B:svg((()=>{ const P=proj3({cx:132,cy:120,s:62,yaw:.5,el:.62}); return plate3(P,2,5)+mark3(P,'x',1,1,2,9); })())},
 'nim':{A:svg(`<path d="M6 210H234" ${S(4)}/>`+bar(26,170,78,26)+bar(26,138,78,26)+bar(26,106,78,26)+bar(26,74,78,26)+bar(126,170,78,26)+bar(126,138,78,26)+`<g transform="rotate(-9 190 62)">${bar(150,48,78,26)}</g><path d="M164 130C174 108 186 92 196 84" ${S(3,' stroke-dasharray="2 9"')}/>`),B:svg(`<path d="M6 210H234" ${S(4)}/>`+bar(50,170,78,26)+bar(50,138,78,26)+bar(50,106,78,26)+`<g transform="rotate(8 176 72)">${bar(138,58,78,26)}</g>`)},
 'chomp':{A:svg([0,1,2,3].map(c=>[0,1,2].map(r=>{ const x=22+c*52,y=44+r*52,bitten=(r>=1&&c<=1); if(bitten) return `<rect x="${x+3}" y="${y+3}" width="44" height="44" rx="8" ${S(3,' stroke-dasharray="3 7" opacity=".7"')}/>`; return `<rect x="${x}" y="${y}" width="48" height="48" rx="8" fill="currentColor"/>`+((r===0&&c===3)?skull(x+24,y+24,1.5):''); }).join('')).join('')),B:svg([0,1].map(c=>[0,1].map(r=>{ const x=70+c*56,y=70+r*56; if(r===1&&c===0) return `<rect x="${x+3}" y="${y+3}" width="46" height="46" rx="8" ${S(3,' stroke-dasharray="3 7" opacity=".7"')}/>`; return `<rect x="${x}" y="${y}" width="50" height="50" rx="8" fill="currentColor"/>`+((r===0&&c===1)?skull(x+25,y+25,1.55):''); }).join('')).join(''))},
 /* quarto: the live game's own pieces (ZART.qPiece), not a lookalike drawing */
 'quarto':{A:svg(ZART.qPiece(9,10,26,1.9)+ZART.qPiece(6,132,84,1.55)),B:svg(ZART.qPiece(3,70,64,1.7))},
 'sim':{A:svg(`<path d="M56 182H184M56 182L120 68" ${S(9)}/><path class="tblink" d="M184 182L120 68" ${S(7,' stroke-dasharray="1 16"')}/><g fill="var(--tbg,#000)" ${S(8)}><circle cx="56" cy="182" r="15"/><circle cx="184" cy="182" r="15"/><circle cx="120" cy="68" r="15"/></g>`),B:svg(`<path d="M50 60L190 180" ${S(6,' stroke-dasharray="1 15"')}/><g fill="var(--tbg,#000)" ${S(8)}><circle cx="50" cy="60" r="15"/><circle cx="190" cy="180" r="15"/></g>`)},
 'pentago':{A:svg(quadrant(34,34,42,[[0,0]])),B:svg(quadrant(58,58,34,[[1,2]]))},
 'domineering':{A:svg(domT(34,30,true)+domT(96,132,false)),B:svg(domT(90,62,true))},
 /* connect four: a corner of the board with its round openings, and a piece mid-drop */
 'connect-four':{A:svg(`<rect x="20" y="40" width="250" height="220" rx="22" ${S(8)}/>`+[0,1,2,3].map(r=>[0,1,2,3].map(c=>`<circle cx="${62+c*56}" cy="${82+r*52}" r="19" ${S(5)}/>`).join('')).join('')+`<circle cx="118" cy="186" r="19" fill="currentColor"/><circle cx="174" cy="186" r="19" fill="currentColor"/>`),B:svg(`<circle cx="120" cy="70" r="40" fill="currentColor"/><path d="M120 128V200M96 176l24 24 24-24" ${S(9)}/>`)},
 'toot-otto':{A:svg(`<circle cx="70" cy="120" r="54" ${S(8)}/><path d="M46 96H94M70 96V148" ${S(13)}/><circle cx="174" cy="120" r="54" ${S(8)}/><circle cx="174" cy="120" r="22" ${S(13)}/>`),B:svg(`<circle cx="120" cy="120" r="70" ${S(9)}/><path d="M86 90H154M120 90V160" ${S(17)}/>`)},
 /* notakto: one clean 3x3, cropped at the edge, a few centred X — never an O, never a nested board */
 'notakto':{A:svg(grid3(-40,20,200,5,0)+xmark(60,120,17,8)+xmark(127,53,17,8)),B:svg(grid3(60,50,160,5,0)+xmark(140,130,20,9))},
 'crowded-room':{A:svg([[24,26],[80,26],[136,26],[24,82],[80,82]].map(([x,y])=>`<rect x="${x}" y="${y}" width="44" height="44" rx="13" ${S(6)}/>`).join('')+person(176,150,1.35)+`<path d="M116 218C136 210 150 206 160 196" ${S(4,' stroke-dasharray="2 11"')}/>`),B:svg(`<rect x="34" y="60" width="52" height="52" rx="15" ${S(6)}/><rect x="98" y="60" width="52" height="52" rx="15" ${S(6)}/>`+person(150,170,1.2))},
 'last-message':{A:svg(env(20,52,128,88)+`<path d="M160 126C176 108 190 128 200 112" ${S(6,' stroke-dasharray="11 13"')}/><path d="M214 108l16 -8M214 120l16 8" ${S(6)}/><path d="M60 186C82 170 94 196 116 180" ${S(6,' stroke-dasharray="11 13"')}/>`),B:svg(env(40,84,150,102))},
 /* the gold coin: one large, softly faded gold coin and a couple of small pennies, cropped at a corner — no slot boxes */
 'gold-coin':{A:svg(coinT('gold',206,54,54)+coinT('penny',108,150,15)+coinT('penny',150,168,15)),B:svg(coinT('gold',196,196,46)+coinT('penny',96,138,14))}
};
 /* the homepage set: only large marks, a few Nim stacks and a rubber duck (never whole card illustrations) */
T['xo']={A:svg(xmark(120,120,74,28)),B:svg(`<circle cx="120" cy="120" r="82" ${S(26)}/>`)};
const DUCKB='M46 168C40 158 42 146 52 146C60 146 62 156 58 162C74 156 128 148 168 158C158 138 154 114 162 96C172 60 216 50 246 68C272 84 274 112 268 130C274 146 292 156 306 172C340 212 318 270 240 277C170 284 94 278 76 226C68 198 72 186 80 178C68 176 52 174 46 168Z';
const duckG=(t,w)=>`<g transform="${t}" ${S(w)}><path d="${DUCKB}"/><path d="M258 100C282 90 322 92 332 104C334 116 308 126 268 124C260 118 256 108 258 100Z"/><path d="M112 206C120 172 176 166 226 184C232 200 214 234 164 240C132 240 112 226 112 206Z"/><circle cx="222" cy="93" r="10.5"/><circle cx="225" cy="94" r="4.6" fill="currentColor"/></g>`;
T['duck']={A:svg(duckG('translate(6 18) scale(.68)',10)),B:svg(duckG('translate(-187 -42) scale(1.25)',9))};
/* a lightly cropped tic-tac-toe grid with a few marks; it slides in now and then */
T['ttt']={A:svg(`<path d="M-30 74H270M-30 154H270M60 -20V260M140 -20V260" ${S(8)}/>`+xmark(20,34,22,10)+`<circle cx="100" cy="114" r="24" ${S(10)}/>`+xmark(180,194,22,10)),B:svg(`<path d="M-30 86H270M-30 166H270M74 -20V260M154 -20V260" ${S(8)}/><circle cx="34" cy="126" r="24" ${S(10)}/>`+xmark(114,46,22,10)+`<circle cx="194" cy="206" r="24" ${S(10)}/>`)};
window.__TR_HOME=['xo','ttt'];
/* duck arcade traces: one element each */
T['one-more-bridge']={A:svg(`<path d="M-10 150H90M150 150H250" ${S(8)}/><path d="M90 150L150 150" ${S(6,' stroke-dasharray="2 12"')}/>`),B:svg(`<rect x="-20" y="120" width="90" height="130" rx="12" ${S(6)}/><path d="M70 120H180" ${S(9)}/>`)};
/* save the duckie: the rubber duck itself, cleanly cropped at a corner — no road or river scenery */
T['save-the-duckie']={A:svg(duckG('translate(10 40) scale(.72)',10)),B:svg(duckG('translate(-40 20) scale(.95)',9))};
const ID={c4:'connect-four',four:'4x4-tic-tac-toe',ult:'recursive-tic-tac-toe',cube:'3d-tic-tac-toe',nim:'nim',chomp:'chomp',quarto:'quarto',sim:'sim',pentago:'pentago',toot:'toot-otto',domineering:'domineering',notakto:'notakto',crowd:'crowded-room',message:'last-message',gold:'gold-coin',duckie:'save-the-duckie',bridge:'one-more-bridge'};
window.ZTRACE={ slugs:Object.keys(T).filter(k=>!window.__TR_HOME.includes(k)||k==='nim'), home:window.__TR_HOME, slugsAll:Object.keys(T), frag:(slug,k)=>(T[slug]&&T[slug][k])||null, byId:ID, hasGold:slug=>slug==='gold-coin',
  css:`.tblink{animation:tfBlink 6s ease-in-out infinite}@keyframes tfBlink{0%,45%{opacity:0}60%,88%{opacity:1}100%{opacity:0}}@media (prefers-reduced-motion:reduce){.tblink{animation:none;opacity:.7}}` };
})();
