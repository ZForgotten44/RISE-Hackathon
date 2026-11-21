/* zart.js: artwork shared by the game cards and the playable boards, so a preview and the real game are drawn with the same pieces.
   Everything returns SVG markup strings. Colours come from currentColor / --cbg (cards) / --bg (arcade), except the pieces that must
   keep their own tones (Quarto pieces, Pentago marbles). */
(function(){
let UID=0; const uid=()=>++UID;
const BG='var(--cbg,var(--bg))';

/* ================= Quarto: four traits, four different visual jobs =================
   shape  : round = cylinder (curved sides and an oval top), square = block (straight sides and a flat top)
   height : tall = 2x the body of short, the same proportions everywhere
   shade  : light = cream, dark = near black
   opening: hollow = a dark cut-out in the top face, solid = a plain top face
   Drawn in a 60 x 80 box. */
const qTraits=p=>({tall:!!(p&1),round:!!(p&2),light:!!(p&4),hollow:!!(p&8)});
const qWords=p=>[(p&1)?'Tall':'Short',(p&2)?'Round':'Square',(p&4)?'Light':'Dark',(p&8)?'Hollow':'Solid'];
const qLabel=p=>qWords(p).join(' · ');
function qPiece(p,x,y,sc,cls){
  const t=qTraits(p), cy=t.tall?18:46;
  const C=t.light?{side:'#d8d3c3',top:'#fbfaf5',edge:'#1a1a18',hole:'#2b2a27',rim:'#8d897c'}:{side:'#1b1b1f',top:'#5b5b63',edge:'#efece3',hole:'#040405',rim:'#0f0f12'};
  let g=`<g class="zqp${cls?' '+cls:''}" transform="translate(${x} ${y}) scale(${sc})" stroke-linejoin="round">`;
  if(t.round){
    g+=`<path d="M8 ${cy}V66A22 8 0 0 0 52 66V${cy}Z" fill="${C.side}" stroke="${C.edge}" stroke-width="2.6"/>`;
    g+=`<ellipse cx="30" cy="${cy}" rx="22" ry="8.5" fill="${C.top}" stroke="${C.edge}" stroke-width="2.6"/>`;
    if(t.hollow) g+=`<ellipse cx="30" cy="${cy}" rx="12.5" ry="5" fill="${C.hole}" stroke="${C.rim}" stroke-width="1.6"/>`;
  }else{
    g+=`<rect x="8" y="${cy-8}" width="44" height="${74-cy+8}" rx="2.5" fill="${C.side}" stroke="${C.edge}" stroke-width="2.6"/>`;
    g+=`<rect x="8" y="${cy-8}" width="44" height="17" rx="2.5" fill="${C.top}" stroke="${C.edge}" stroke-width="2.6"/>`;
    if(t.hollow) g+=`<rect x="17.5" y="${cy-4.5}" width="25" height="9" rx="1.5" fill="${C.hole}" stroke="${C.rim}" stroke-width="1.6"/>`;
  }
  return g+'</g>'; }

/* ================= Pentago: four trays of nine recessed holes, glass marbles =================
   Player 1 = light marble, player 2 = dark marble. Geometry is shared by the card and the game. */
function pgGeom(o){ o=o||{}; const cell=o.cell||38, gap=o.gap===undefined?10:o.gap, px=o.padX===undefined?13:o.padX, pt=o.padT===undefined?30:o.padT, pb=o.padB===undefined?13:o.padB;
  const qw=3*cell+2*px, qh=3*cell+pt+pb; const qx=q=>(q&1)*(qw+gap), qy=q=>(q>>1)*(qh+gap);
  return {cell,gap,px,pt,pb,qw,qh,W:2*qw+gap,H:2*qh+gap,qx,qy,
    xy:(r,c)=>{ const q=(r>=3?2:0)+(c>=3?1:0); return [qx(q)+px+((c%3)+.5)*cell, qy(q)+pt+((r%3)+.5)*cell]; },
    hub:q=>[qx(q)+px+1.5*cell, qy(q)+pt+1.5*cell]}; }
function pgDefs(u){ return `<defs><radialGradient id="pgL${u}" cx=".34" cy=".3" r=".85"><stop offset="0" stop-color="#ffffff"/><stop offset=".55" stop-color="#e9e5da"/><stop offset="1" stop-color="#aaa597"/></radialGradient><radialGradient id="pgD${u}" cx=".34" cy=".3" r=".85"><stop offset="0" stop-color="#84848c"/><stop offset=".5" stop-color="#26262a"/><stop offset="1" stop-color="#050506"/></radialGradient><radialGradient id="pgH${u}" cx=".42" cy=".4" r=".72"><stop offset="0" stop-color="currentColor" stop-opacity=".06"/><stop offset=".72" stop-color="currentColor" stop-opacity=".16"/><stop offset="1" stop-color="currentColor" stop-opacity=".34"/></radialGradient></defs>`; }
function pgMarble(kind,x,y,r,u,cls){ return `<g class="zpgm${cls?' '+cls:''}"><circle cx="${x}" cy="${y}" r="${r}" fill="url(#pg${kind===1?'L':'D'}${u})" stroke="${kind===1?'#6f6b5f':'#d9d5c8'}" stroke-opacity="${kind===1?.7:.55}" stroke-width="1.4"/><ellipse cx="${x-r*.3}" cy="${y-r*.36}" rx="${r*.3}" ry="${r*.18}" fill="#fff" fill-opacity="${kind===1?.85:.4}"/></g>`; }
function pgFrame(G,q){ const x=G.qx(q),y=G.qy(q); return `<rect class="zpgf" x="${x}" y="${y}" width="${G.qw}" height="${G.qh}" rx="18" fill="currentColor" fill-opacity=".1" stroke="currentColor" stroke-opacity=".62" stroke-width="2.6"/><rect x="${x+G.px-5}" y="${y+G.pt-5}" width="${3*G.cell+10}" height="${3*G.cell+10}" rx="12" fill="currentColor" fill-opacity=".05" stroke="currentColor" stroke-opacity=".3" stroke-width="1.5"/>`; }
/* a socket, not a flat tinted disc: a radial gradient reads as a shallow drilled hole with a darker rim, crisp in
   both themes since it works entirely in opacities of currentColor rather than a fixed grey. */
function pgHole(x,y,G,u){ return `<circle class="zpgh" cx="${x}" cy="${y}" r="${G.cell*.43}" fill="${u?`url(#pgH${u})`:'currentColor'}" fill-opacity="${u?1:.2}" stroke="currentColor" stroke-opacity=".55" stroke-width="2"/>`; }
/* one quadrant's holes and marbles (the part that turns), as a group about the hub of the 3x3 */
function pgQuadHoles(G,q,cells,u,marbleCls){ let g=''; const r0=(q>>1)*3,c0=(q&1)*3; for(let r=r0;r<r0+3;r++)for(let c=c0;c<c0+3;c++){ const [x,y]=G.xy(r,c); g+=pgHole(x,y,G,u); const v=cells[r*6+c]; if(v) g+=pgMarble(v,x,y,G.cell*.37,u,marbleCls&&marbleCls(r*6+c)); } return g; }
function pgRotBtn(cx,cy,dir,attrs){ const a=dir>0?'M5 3.2a6 6 0 1 1 .6 -5.4M5.4 -5.8v4.2h-4.2':'M-5 3.2a6 6 0 1 0 -.6 -5.4M-5.4 -5.8v4.2h4.2'; return `<g class="zpgb" ${attrs||''} transform="translate(${cx} ${cy})"><circle r="13" fill="${BG}" stroke="currentColor" stroke-width="2.2"/><path d="${a}" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></g>`; }

/* ================= Domineering =================
   Vertical (player 1) tiles are solid, horizontal (player 2) tiles are outlined; both show two cells and a centre line. */
function domTile(x,y,cs,p,cls,vertical){ if(vertical===undefined) vertical=p===1; const w=vertical?cs-8:2*cs-8, h=vertical?2*cs-8:cs-8; const X=x+4,Y=y+4;
  const mid=vertical?`<line x1="${X+6}" y1="${Y+h/2}" x2="${X+w-6}" y2="${Y+h/2}" stroke="${p===1?BG:'currentColor'}" stroke-width="2.4" stroke-linecap="round"/>`:`<line x1="${X+w/2}" y1="${Y+6}" x2="${X+w/2}" y2="${Y+h-6}" stroke="${p===1?BG:'currentColor'}" stroke-width="2.4" stroke-linecap="round"/>`;
  const pips=vertical?[[X+w/2,Y+h/4],[X+w/2,Y+3*h/4]]:[[X+w/4,Y+h/2],[X+3*w/4,Y+h/2]];
  return `<g class="zdt${cls?' '+cls:''}"><rect x="${X}" y="${Y}" width="${w}" height="${h}" rx="10" ${p===1?'fill="currentColor"':`fill="${BG}" stroke="currentColor" stroke-width="3"`}/>${mid}${pips.map(([a,b])=>`<circle cx="${a}" cy="${b}" r="3" fill="${p===1?BG:'currentColor'}"/>`).join('')}</g>`; }
function domCell(x,y,cs,hole){ return hole?`<rect class="zdh" x="${x+3}" y="${y+3}" width="${cs-6}" height="${cs-6}" rx="8" fill="currentColor" fill-opacity=".05" stroke="currentColor" stroke-opacity=".35" stroke-width="1.6" stroke-dasharray="3 4"/><path d="M${x+cs*.3} ${y+cs*.3}l${cs*.4} ${cs*.4}m0 ${-cs*.4}l${-cs*.4} ${cs*.4}" stroke="currentColor" stroke-opacity=".3" stroke-width="2" stroke-linecap="round"/>`:`<rect class="zdcell" x="${x+3}" y="${y+3}" width="${cs-6}" height="${cs-6}" rx="8" fill="currentColor" fill-opacity=".14"/>`; }

/* ================= The Crowded Room =================
   A small venue: walls, a door in the bottom wall, and one seat per place. People are a head and shoulders. */
function person(x,y,s,cls,extra){ return `<g class="zpp${cls?' '+cls:''}" ${extra||''} transform="translate(${x} ${y}) scale(${s||1})"><circle cx="0" cy="-5" r="4.4" fill="currentColor"/><path d="M-6.2 9V6a6.2 6.2 0 0 1 12.4 0V9Z" fill="currentColor"/></g>`; }
function crowdLayout(cap,x,y,w,cols){ cols=cols||6; const rows=Math.ceil(cap/cols), sx=(w-44)/(cols-1), sy=24, top=24, aisle=34; const h=top+(rows-1)*sy+18+aisle;
  const seat=i=>{ const r=Math.floor(i/cols), c=i%cols, inRow=Math.min(cols,cap-r*cols), off=(cols-inRow)*sx/2; return [x+22+off+c*sx-(0), y+top+r*sy]; };
  const stand=k=>[x+w/2-((Math.min(cols,12)-1)*13)/2+(k%12)*13, y+h-16-Math.floor(k/12)*16];
  return {rows,cols,sx,sy,h,seat,stand,door:{x:x+w/2,y:y+h}}; }
/* seat outlines + room walls with a door gap; occupants are drawn by the caller */
function crowdRoom(cap,x,y,w,o){ o=o||{}; const L=crowdLayout(cap,x,y,w,o.cols); const gx=L.door.x, gw=34;
  let g=`<g class="zcroom${o.crowded?' crowded':''}"><rect class="zcfloor" x="${x}" y="${y}" width="${w}" height="${L.h}" rx="14" fill="currentColor" fill-opacity="${o.crowded?.16:.07}"/>`;
  g+=`<path class="zcwall" d="M${x+gx-x-gw/2} ${y+L.h}H${x+14}Q${x} ${y+L.h} ${x} ${y+L.h-14}V${y+14}Q${x} ${y} ${x+14} ${y}H${x+w-14}Q${x+w} ${y} ${x+w} ${y+14}V${y+L.h-14}Q${x+w} ${y+L.h} ${x+w-14} ${y+L.h}H${gx+gw/2}" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" ${o.crowded?'stroke-dasharray="10 5"':''}/>`;
  g+=`<path d="M${gx-gw/2} ${y+L.h}l-2 -${16}" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/>`;
  for(let i=0;i<cap;i++){ const [sx,sy]=L.seat(i); g+=`<rect class="zcseat" x="${sx-9.5}" y="${sy-9.5}" width="19" height="19" rx="6" fill="none" stroke="currentColor" stroke-opacity=".38" stroke-width="1.8"/>`; }
  return {markup:g+'</g>',L}; }
function face(x,y,r,happy,cls){ return `<g class="${cls||''}" transform="translate(${x} ${y})"><circle r="${r}" fill="none" stroke="currentColor" stroke-width="2.6"/><circle cx="${-r*.36}" cy="${-r*.2}" r="${r*.1}" fill="currentColor"/><circle cx="${r*.36}" cy="${-r*.2}" r="${r*.1}" fill="currentColor"/><path d="${happy?`M${-r*.45} ${r*.22}Q0 ${r*.68} ${r*.45} ${r*.22}`:`M${-r*.45} ${r*.55}Q0 ${r*.12} ${r*.45} ${r*.55}`}" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></g>`; }

/* ================= The Last Message: two places and a messenger =================
   Hill (A, left) and Harbor (B, right) with a river between; messages are envelopes. */
function tower(x,base,lit,cls){ const top=base-44; return `<g class="${cls||''}"><path d="M${x-14} ${base}L${x-11} ${top+6}H${x+11}L${x+14} ${base}Z" fill="currentColor" fill-opacity=".14" stroke="currentColor" stroke-width="2.6" stroke-linejoin="round"/><rect x="${x-18}" y="${top-1}" width="36" height="8" rx="2.5" fill="currentColor" fill-opacity=".28" stroke="currentColor" stroke-width="2.4"/><rect x="${x-3.5}" y="${top+16}" width="7" height="12" rx="3" fill="currentColor" fill-opacity=".5"/></g>`; }
function lamp(x,y,lit,cls){ return `<g class="zlamp ${cls||''}" transform="translate(${x} ${y})"><g class="zlrays" opacity="${lit?1:0}" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M0 -15v-6M-11 -11l-4 -4M11 -11l4 -4M-15 0h-6M15 0h6"/></g><circle class="zlbulb" r="7.5" fill="currentColor" fill-opacity="${lit?1:.14}" stroke="currentColor" stroke-width="2.4"/></g>`; }
function envelope(x,y,label,cls,lost){ return `<g class="zenv${cls?' '+cls:''}"><g transform="translate(${x} ${y})"><rect x="-15" y="-10" width="30" height="20" rx="3.5" fill="${BG}" stroke="currentColor" stroke-width="2.4"/><path d="M-15 -8l15 10 15 -10" fill="none" stroke="currentColor" stroke-width="2"/><text y="8.8" text-anchor="middle" font-size="7.6" font-weight="800" fill="currentColor" font-family="var(--font-mono)">${label}</text></g></g>`; }
/* the static places, drawn in three restrained grayscale layers: a far ridge, the two landforms (a hill plateau on the left, a harbor quay on the right,
   each with its tower standing on a plinth sunk into the ground) and open sky and river between them for the message's journey. */
function towerT(x,B,cls){ return `<g class="${cls||''}"><path d="M${x-13} ${B-6}L${x-10} ${B-44}H${x+10}L${x+13} ${B-6}Z" fill="currentColor" fill-opacity=".14" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/><rect x="${x-18}" y="${B-6}" width="36" height="9" rx="2.5" fill="currentColor" fill-opacity=".24" stroke="currentColor" stroke-width="2.4"/><rect x="${x-3.5}" y="${B-17}" width="7" height="11" rx="3" fill="currentColor" fill-opacity=".45"/><rect x="${x-17}" y="${B-50}" width="34" height="7" rx="2" fill="currentColor" fill-opacity=".26" stroke="currentColor" stroke-width="2.4"/><path d="M${x-11} ${B-50}V${B-66}H${x+11}V${B-50}" fill="currentColor" fill-opacity=".05" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/><path d="M${x-16} ${B-66}L${x} ${B-77}L${x+16} ${B-66}Z" fill="currentColor" fill-opacity=".26" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/></g>`; }
function msgWorld(o){ o=o||{}; let g='';
  g+=`<path d="M0 148C30 118 60 112 90 128C110 138 130 134 150 124C180 108 214 112 256 130V184H0Z" fill="currentColor" fill-opacity=".05" stroke="currentColor" stroke-opacity=".2" stroke-width="1.6" stroke-linejoin="round"/>`;
  g+=`<path d="M0 184V160C0 154 4 151 12 150H80C94 150 100 158 108 165C116 171 128 174 138 174V184Z" fill="currentColor" fill-opacity=".11" stroke="currentColor" stroke-opacity=".55" stroke-width="2.2" stroke-linejoin="round"/><path d="M18 162H44M50 170H72" stroke="currentColor" stroke-opacity=".25" stroke-width="2" stroke-linecap="round"/>`;
  g+=`<path d="M256 184V164C256 158 252 155 244 154H190C176 154 172 162 164 167C156 172 148 174 138 174V184Z" fill="currentColor" fill-opacity=".11" stroke="currentColor" stroke-opacity=".55" stroke-width="2.2" stroke-linejoin="round"/><path d="M158 169H190M164 169v10M176 169v10M188 169v10" stroke="currentColor" stroke-opacity=".45" stroke-width="2" stroke-linecap="round"/>`;
  g+=`<path d="M112 178q9 -5 18 0t18 0t18 0M120 183q9 -5 18 0t18 0" fill="none" stroke="currentColor" stroke-opacity=".32" stroke-width="2" stroke-linecap="round"/>`;
  g+=towerT(46,150,'zta')+towerT(214,154,'ztb');
  return {markup:g,ax:46,ay:94,bx:214,by:98,qy:66,mid:130,lane:112}; }
/* the messenger: a small duck in flight, an envelope in its beak. Faces right for GO, left for a reply. The label floats above it. */
function messenger(x,y,label,cls){ const left=label==='OK'||label==='RECEIVED'; return `<g class="zenv${cls?' '+cls:''}"><g transform="translate(${x} ${y})"><g class="zbob"><g transform="scale(${left?-1.3:1.3} 1.3)"><path d="M-10 1L-16 -2L-14 4Z" fill="${BG}" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M-10 2C-10 -5 -3 -8 3 -6C9 -4 10 3 5 7C0 10 -9 9 -10 2Z" fill="${BG}" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><path class="zwing" d="M-6 -1C-5 -10 2 -14 6 -10C3 -8 0 -4 -6 -1Z" fill="currentColor" fill-opacity=".3" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><circle cx="7" cy="-8" r="5.4" fill="${BG}" stroke="currentColor" stroke-width="2.2"/><circle cx="8.6" cy="-9.4" r="1.15" fill="currentColor"/><path d="M11.6 -8.6L17 -7L11.8 -5Z" fill="currentColor" fill-opacity=".45" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><g transform="translate(16 -2)"><rect x="0" y="-3.5" width="12" height="8.5" rx="1.6" fill="${BG}" stroke="currentColor" stroke-width="1.8"/><path d="M0.6 -3l5.4 4.2 5.4 -4.2" fill="none" stroke="currentColor" stroke-width="1.5"/></g></g><text y="-25" text-anchor="middle" font-size="8.6" font-weight="800" fill="currentColor" font-family="var(--font-mono)">${label}</text></g></g></g>`; }

/* the gold coin is 1.5x the diameter of a penny, everywhere: callers pass the PENNY radius */
const COIN_GOLD=1.5, coinR=(kind,r)=>kind==='gold'?r*COIN_GOLD:r;
window.ZART={ coin,coinR,COIN_GOLD,messenger,towerT,qPiece,qLabel,qWords,qTraits, pgGeom,pgDefs,pgMarble,pgFrame,pgHole,pgQuadHoles,pgRotBtn, domTile,domCell, person,crowdLayout,crowdRoom,face, tower,lamp,envelope,msgWorld, uid, BG };

/* ================= The Gold Coin: flat coins. Pennies stay grayscale, the single gold coin is the focus. Fixed tones in both invert states. ================= */
function coin(kind,x,y,r,cls){ const g=kind==='gold'; r=coinR(kind,r); const fill=g?'#c9a63f':'#d5d2c7', edge=g?'#8d742a':'#3f3d36', rim=g?'#a98a2e':'#9a978c';
  let s=`<g class="zgc${cls?' '+cls:''}" transform="translate(${x} ${y})"><circle r="${r}" fill="${fill}" stroke="${edge}" stroke-width="${Math.max(1.5,r*.1)}"/><circle r="${r*.68}" fill="none" stroke="${rim}" stroke-width="${Math.max(1,r*.07)}"/>`;
  if(g){ const p=[]; for(let i=0;i<10;i++){ const a=-Math.PI/2+i*Math.PI/5, rr=i%2?r*.16:r*.36; p.push((Math.cos(a)*rr).toFixed(2)+','+(Math.sin(a)*rr).toFixed(2)); } s+=`<polygon points="${p.join(' ')}" fill="${edge}"/>`; }
  else s+=`<circle r="${r*.14}" fill="${rim}"/>`;
  return s+'</g>'; }

/* ================= card previews (composed from the shared pieces above; every move shown is a legal engine move) ================= */
const T=(x,y,txt,cls,size,anchor,weight)=>`<text class="${cls||''}" x="${x}" y="${y}" text-anchor="${anchor||'middle'}" font-size="${size||12}" font-weight="${weight||700}" fill="currentColor" font-family="var(--font-sans)">${txt}</text>`;

function cardQuarto(Q){
  let st=Q.newState(); const script=[['give',8],['place',0],['give',1],['place',5],['give',9],['place',1],['give',6],['place',10],['give',10],['place',2],['give',12]];
  for(const [t,v] of script){ const m=t==='give'?{t,piece:v}:{t,cell:v}; if(!Q.legal(st).some(x=>x.t===m.t&&(m.t==='give'?x.piece===m.piece:x.cell===m.cell))) throw new Error('illegal quarto preview move'); st=Q.apply(st,m); if(st.over) throw new Error('quarto preview ended early'); }
  const off=st.offered; if(!Q.winsIfPlaced(st.board,off,3)) throw new Error('quarto preview: the offered piece does not win');
  const won=Q.apply(st,{t:'place',cell:3}); if(!won.over||!(won.common&8)) throw new Error('quarto preview: expected a hollow line');
  const cs=40,x0=6,y0=6,sc=.46,ox=(cs-60*sc)/2,oy=(cs-80*sc)/2, cx=i=>x0+(i%4)*cs, cy=i=>y0+Math.floor(i/4)*cs;
  let g=''; for(let i=0;i<16;i++) g+=`<rect x="${cx(i)+1.5}" y="${cy(i)+1.5}" width="${cs-3}" height="${cs-3}" rx="5" fill="currentColor" fill-opacity=".1"/>`;
  st.board.forEach((p,i)=>{ if(p>=0) g+=ZART.qPiece(p,cx(i)+ox,cy(i)+oy,sc); });
  g+=`<rect class="zqtgt" x="${cx(3)+2}" y="${cy(3)+2}" width="${cs-4}" height="${cs-4}" rx="6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-dasharray="4 3"/>`;
  g+=`<rect class="zqline" x="${x0-3}" y="${y0-3}" width="${cs*4+6}" height="${cs+6}" rx="9" fill="currentColor" fill-opacity=".13" stroke="currentColor" stroke-width="2.6"/>`;
  const others=st.avail.filter(p=>p!==off&&!(p&8)); const tray=[others[0],others[3]||others[1],off,others[1]], sx=[180,216], sy=[24,72];
  g+=`<rect x="174" y="6" width="78" height="112" rx="10" fill="currentColor" fill-opacity=".08" stroke="currentColor" stroke-opacity=".4" stroke-width="1.8"/>`+T(180,18,'TRAY','',8.5,'start',700);
  tray.forEach((p,k)=>{ const x=sx[k%2], y=sy[k>>1]; g+=`<rect x="${x-2}" y="${y-2}" width="34" height="44" rx="6" fill="currentColor" fill-opacity=".07"/>`; if(k!==2) g+=ZART.qPiece(p,x,y,.5); });
  g+=`<rect class="zqring" x="${sx[0]-3}" y="${sy[1]-3}" width="36" height="46" rx="7" fill="none" stroke="currentColor" stroke-width="2.6"/>`;
  g+=`<rect class="zqhand" x="174" y="124" width="78" height="52" rx="10" fill="currentColor" fill-opacity=".08" stroke="currentColor" stroke-opacity=".4" stroke-width="1.8"/>`+T(214,146,'handed','',8.5,'start',700)+T(214,157,'over','',8.5,'start',700);
  const P0=[sx[0],sy[1]], hand=[180,130], bx=cx(3)+ox, by=cy(3)+oy, bs=sc/.5;
  g+=`<g class="zqmove" style="--hy:${hand[1]-P0[1]}px;--bx:${(bx-bs*P0[0]).toFixed(2)}px;--by:${(by-bs*P0[1]).toFixed(2)}px;--bs:${bs.toFixed(3)}">${ZART.qPiece(off,P0[0],P0[1],.5)}</g>`;
  g+=T(128,200,'1 &#160;Pick a piece for them','zqc zqc1',12.5)+T(128,200,'2 &#160;They place that piece','zqc zqc2',12.5)+T(128,200,'3 &#160;Four hollow: that wins','zqc zqc3',12.5);
  return {preview:st, svg:`<svg viewBox="0 0 256 216" class="aq" role="img" aria-label="Quarto: you pick a piece from the tray, hand it over, your opponent places that piece, and four hollow pieces in a row win">${g}</svg>`}; }

function cardPentago(E,ok){
  let st=E.newState(); const prefix=[["p",14],["r",1,1],["p",9],["r",0,1],["p",6],["r",0,-1],["p",21],["r",1,1],["p",15],["r",2,1],["p",6],["r",3,1],["p",16],["r",1,1],["p",33],["r",2,-1]];
  for(const m of prefix){ const mv=m[0]==='p'?{t:'place',cell:m[1]}:{t:'rot',q:m[1],d:m[2]}; if(!E.legal(st).some(x=>x.t===mv.t&&(mv.t==='place'?x.cell===mv.cell:(x.q===mv.q&&x.d===mv.d)))) throw new Error('illegal pentago preview move'); st=E.apply(st,mv); if(st.over) throw new Error('pentago preview ended early'); }
  if(st.turn!==1||st.phase!=='place') throw new Error('pentago preview: expected player 1 to place');
  const placed=E.apply(st,{t:'place',cell:12}); if(placed.over) throw new Error('pentago preview: the placement must not win'); const fin=E.apply(placed,{t:'rot',q:1,d:-1}); if(!fin.over||fin.winner!==1||fin.reason!=='rotation') throw new Error('pentago preview: the rotation must win');
  const u=ZART.uid(), G=ZART.pgGeom({cell:38}), k=.5, ox=(256-G.W*k)/2, oy=3;
  let g=ZART.pgDefs(u)+`<g transform="translate(${ox} ${oy}) scale(${k})">`;
  for(let q=0;q<4;q++){ g+=ZART.pgFrame(G,q); const [hx,hy]=G.hub(q); g+=`<g class="${q===1?'zpgturn':''}" style="transform-origin:${hx}px ${hy}px">${ZART.pgQuadHoles(G,q,placed.cells.map((v,i)=>i===12?0:v),u)}</g>`; }
  const [px,py]=G.xy(2,0); g+=`<g class="zpgring"><circle cx="${px}" cy="${py}" r="${G.cell*.46}" fill="none" stroke="currentColor" stroke-width="3.5" stroke-dasharray="5 5"/></g><g class="zpgdrop">${ZART.pgMarble(1,px,py,G.cell*.37,u)}</g>`;
  const [b1x,b1y]=G.xy(0,4); g+=`<g class="zpgbtn" transform="translate(${G.qx(1)+G.qw/2-0} ${G.qy(1)+15})">${ZART.pgRotBtn(0,0,-1)}</g>`;
  const w=fin.lines[0], a=G.xy(Math.floor(w[0]/6),w[0]%6), b=G.xy(Math.floor(w[4]/6),w[4]%6); g+=`<line class="zpgline" x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="currentColor" stroke-width="10" stroke-linecap="round" stroke-opacity=".55"/></g>`;
  g+=T(128,199,'1 &#160;Place a marble','zpc zpc1',12.5)+T(128,199,'2 &#160;Turn one quadrant','zpc zpc2',12.5)+T(128,199,'3 &#160;Five in a row wins','zpc zpc3',12.5);
  return `<svg viewBox="0 0 256 216" class="ap" role="img" aria-label="Pentago: a marble is placed, one quadrant turns, and five marbles line up">${g}</svg>`; }

function cardDomineering(E){
  let st=E.newState(4,4); const seq=[[0,1],[3,1],[2,0],[2,1],[0,3]];
  seq.forEach(([r,c],k)=>{ if(!E.legal(st).some(m=>m.r===r&&m.c===c)) throw new Error('illegal domineering preview move'); st=E.apply(st,{r,c}); if(st.over&&k<seq.length-1) throw new Error('domineering preview ended early'); });
  if(!st.over||st.winner!==1||!st.trap||st.trap.loser!==2||E.movesFor(st,2).length||st.trap.empties.length<3) throw new Error('domineering preview: expected the horizontal player to be trapped');
  const cs=38,x0=52,y0=5, at=(r,c)=>[x0+c*cs,y0+r*cs]; let g='';
  for(let r=0;r<4;r++)for(let c=0;c<4;c++){ const [x,y]=at(r,c); g+=ZART.domCell(x,y,cs,false); }
  const n=st.moves.length; st.moves.forEach((m,k)=>{ const a=m.cells[0], [x,y]=at(Math.floor(a/4),a%4); const cls=k===n-2?'zdA':(k===n-1?'zdB':''); g+=ZART.domTile(x,y,cs,m.p,cls); if(cls){ const w=m.p===1?cs-8:2*cs-8,h=m.p===1?2*cs-8:cs-8; g+=`<rect class="zdgh zdgh${cls==='zdA'?'A':'B'}" x="${x+4}" y="${y+4}" width="${w}" height="${h}" rx="10" fill="none" stroke="currentColor" stroke-width="2.6" stroke-dasharray="5 4"/>`; } });
  st.trap.empties.forEach(i=>{ const [x,y]=at(Math.floor(i/4),i%4); g+=`<rect class="zdemp" x="${x+7}" y="${y+7}" width="${cs-14}" height="${cs-14}" rx="6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-dasharray="4 3"/>`; });
  g+=`<g class="zdleg"><rect x="34" y="172" width="11" height="20" rx="3.5" fill="currentColor"/>${T(52,187,'vertical','',12,'start',600)}<rect x="132" y="177" width="20" height="11" rx="3.5" fill="none" stroke="currentColor" stroke-width="2.2"/>${T(159,187,'horizontal','',12,'start',600)}</g>`;
  g+=T(128,205,'Horizontal covers two cells','zdc zdc1',12)+T(128,205,'Vertical covers two cells','zdc zdc2',12)+T(128,205,'No horizontal fits: vertical wins','zdc zdc3',12);
  return `<svg viewBox="0 0 256 216" class="ad" role="img" aria-label="Domineering: a horizontal domino and a vertical domino each cover two squares; then empty squares remain but no horizontal domino fits">${g}</svg>`; }

function cardCrowd(){
  const cap=18, X=26, Y=50, W=204; const {markup,L}=ZART.crowdRoom(cap,X,Y,W,{cols:6}); let g=markup;
  for(let i=0;i<cap;i++){ const [x,y]=L.seat(i); g+=ZART.person(x,y+1,.78,'zcin'); }
  const doorX=L.door.x, doorY=Y+L.h;
  g+=ZART.person(doorX-58,doorY+36,.85,'zcout')+ZART.person(doorX+58,doorY+40,.85,'zcout')+ZART.person(doorX-84,doorY+30,.85,'zcout');
  const st=[doorX,doorY+34], inn=[doorX+2,doorY-14], dx=inn[0]-st[0], dy=inn[1]-st[1];
  g+=`<g class="zcnew" style="--dx:${dx}px;--dy:${dy}px">${ZART.person(st[0],st[1],.85,'zcw')}</g>`;
  g+=`<rect class="zccap" x="${X-3}" y="${Y-3}" width="${W+6}" height="${L.h+6}" rx="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-dasharray="7 5"/>`;
  g+=`<text class="zcn zcn1" x="112" y="41" text-anchor="end" font-size="40" font-weight="800" fill="currentColor" font-family="var(--font-sans)">18</text><text class="zcn zcn2" x="112" y="41" text-anchor="end" font-size="40" font-weight="800" fill="currentColor" font-family="var(--font-sans)">19</text>`;
  g+=`<text x="120" y="41" font-size="13" font-weight="700" fill="currentColor" font-family="var(--font-sans)">of 18 places</text>`;
  g+=ZART.face(228,26,14,true,'zcface zcok')+ZART.face(228,26,14,false,'zcface zcbad');
  return `<svg viewBox="0 0 256 216" class="ac2" role="img" aria-label="A small room with 18 places and a door: when a nineteenth person walks in, the count goes from 18 to 19 and the room is crowded">${g}</svg>`; }

function cardMessage(){
  const W=ZART.msgWorld({base:150}); let g=W.markup; const ly=W.lane;
  g+=ZART.lamp(W.ax,W.ay,false,'zla')+ZART.lamp(W.bx,W.by,true,'zlb');
  g+=`<g class="zmq"><text x="${W.ax}" y="${W.qy}" text-anchor="middle" font-size="24" font-weight="800" fill="currentColor" font-family="var(--font-sans)">?</text></g>`;
  g+=ZART.messenger(78,ly,'GO','zmgo')+ZART.messenger(178,ly,'OK','zmre');
  g+=`<g class="zmx"><path d="M124 ${ly-8}l14 16m0 -16l-14 16" stroke="currentColor" stroke-width="3.4" stroke-linecap="round"/></g>`;
  g+=T(44,196,'HILL · A','',10.5,'middle',700)+T(214,196,'HARBOR · B','',10.5,'middle',700);
  g+=T(128,20,'GO sent','zmc zmc1',13)+T(128,20,'GO arrives: B is ready','zmc zmc2',13)+T(128,20,'The reply is lost: A can only guess','zmc zmc3',12.5);
  return `<svg viewBox="0 0 256 216" class="am" role="img" aria-label="Two places, Hill and Harbor: a GO message crosses the river and Harbor is ready, but the reply is lost, so Hill can only guess">${g}</svg>`; }

function cardToot(E){
  let st=E.newState(); const seq=[['O',0],['T',1],['T',2],['T',5]]; for(const [ch,col] of seq){ if(!E.legal(st).some(m=>m.ch===ch&&m.col===col)) throw new Error('illegal toot preview move'); st=E.apply(st,{ch,col}); if(st.over) throw new Error('toot preview ended early'); }
  const mv={ch:'O',col:3}; if(!E.legal(st).some(m=>m.ch===mv.ch&&m.col===mv.col)) throw new Error('toot preview: final drop illegal'); const fin=E.apply(st,mv); if(!fin.over||fin.winner!==2||fin.words.join()!=='OTTO'||st.turn!==1) throw new Error('toot preview: player 1 must spell OTTO');
  const cs=36,x0=20,y0=44, ctr=(r,c)=>[x0+c*cs+cs/2,y0+r*cs+cs/2]; const letter=(x,y,ch)=>`<circle cx="${x}" cy="${y}" r="15" fill="currentColor"/><text x="${x}" y="${y+6}" text-anchor="middle" font-size="17" font-weight="800" fill="var(--cbg)" font-family="var(--font-sans)">${ch}</text>`;
  let g=T(128,15,'Player 1 wants TOOT','zth',12,'middle',700)+T(128,31,'Player 2 wants OTTO','zth',12,'middle',700);
  g=g.replace(/font-family="var\(--font-sans\)"/g,'font-family="var(--font-mono)"');
  g+=`<rect x="${x0-5}" y="${y0-5}" width="${cs*6+10}" height="${cs*4+10}" rx="12" fill="currentColor" fill-opacity=".09" stroke="currentColor" stroke-opacity=".5" stroke-width="2.4"/>`;
  for(let r=0;r<4;r++)for(let c=0;c<6;c++){ const [x,y]=ctr(r,c); g+=`<circle cx="${x}" cy="${y}" r="14.5" fill="currentColor" fill-opacity=".14" stroke="currentColor" stroke-opacity=".4" stroke-width="1.8"/>`; const ch=st.board[E.idx(r,c)]; if(ch) g+=letter(x,y,ch); }
  const [lx,ly]=ctr(3,3); g+=`<g class="ztfall" style="--fy:${-(ly-y0+22)}px">${letter(lx,ly,'O')}</g>`;
  const a=ctr(3,0),b=ctr(3,3); g+=`<rect class="ztw" x="${a[0]-19}" y="${a[1]-19}" width="${b[0]-a[0]+38}" height="38" rx="19" fill="none" stroke="currentColor" stroke-width="3.4"/>`;
  g+=T(128,208,'Player 1 drops an O…','ztt1',12.5)+T(128,208,'That spells OTTO: Player 2 wins','ztt2',12.5);
  return `<svg viewBox="0 0 256 216" class="at" role="img" aria-label="TOOT and OTTO: player one drops an O that spells OTTO, so player two wins">${g}</svg>`; }

/* Take Two: two ducks flanking a shared bank. One coin crosses to whoever's turn it is, back and forth;
   then one duck takes two at once, the exchange stops, and the last coin is left ringed and dimmed -- never
   claimed. Ducks are drawn twice each (an idle pose and a reaching pose) and crossfaded by CSS, the same
   technique the Last Message card already uses for its two messenger instances. Reads at rest (hover-less,
   or reduced motion) as the opening frame plus the closing line, matching every other card here. */
function cardPenny(){
  const r=8, by=54, dy=131;
  const bank=[{cls:'zpk1',x:96,dx:-68},{cls:'zpk2',x:116,dx:88},{cls:'zpk3',x:136,dx:-84},{cls:'zpk4',x:156,dx:-80}];
  let g=`<rect x="70" y="30" width="132" height="50" rx="16" fill="currentColor" fill-opacity=".07"/>`;
  bank.forEach(c=>{ g+=`<g class="${c.cls}" style="--dx:${c.dx}px;--dy:${dy}px">${ZART.coin('gold',c.x,by,r)}</g>`; });
  g+=`<circle class="zpk5ring" cx="176" cy="${by}" r="${r*1.5+5}" fill="none" stroke="currentColor" stroke-width="2.2" stroke-dasharray="3 4"/>`;
  g+=`<g class="zpk5dim">${ZART.coin('gold',176,by,r)}</g>`;
  g+=`<rect x="6" y="170" width="88" height="30" rx="12" fill="currentColor" fill-opacity=".06" stroke="currentColor" stroke-opacity=".3" stroke-width="1.6"/>`;
  g+=`<rect x="162" y="170" width="88" height="30" rx="12" fill="currentColor" fill-opacity=".06" stroke="currentColor" stroke-opacity=".3" stroke-width="1.6"/>`;
  const idleA={look:{x:.5,y:.22}}, idleB={look:{x:-.5,y:.22}}, reach={wing:1}, surprise={surprise:1};
  g+=`<g class="zpdA0">${ZDuck.duckActorSvg(46,150,.92,1,idleA)}</g><g class="zpdA1">${ZDuck.duckActorSvg(46,150,.92,1,reach)}</g>`;
  g+=`<g class="zpdB0">${ZDuck.duckActorSvg(210,150,.92,-1,idleB)}</g><g class="zpdB1">${ZDuck.duckActorSvg(210,150,.92,-1,reach)}</g><g class="zpdB2">${ZDuck.duckActorSvg(210,150,.92,-1,surprise)}</g>`;
  g+=T(128,211,'Take one, and the bank stays open','zpc zpc1',11.5)+T(128,211,'Take two, and it closes','zpc zpc2',11.5)+T(128,211,'The rest is never claimed','zpc zpc3',11.5);
  return `<svg viewBox="0 0 256 216" class="atp" role="img" aria-label="Take Two: two ducks take turns drawing one coin from a shared bank; one duck takes two coins instead, the exchange stops, and the coin left behind is never claimed">${g}</svg>`; }

function cardGold(E){
  const n=8, cw=30, x0=8, ty=104, r=9.5; const cx=p=>x0+p*cw+cw/2;
  let st=E.newState({n,pens:[1,3],gold:7}); const m1={t:'slide',id:'gold',to:4}, m2={t:'collect'};
  if(!E.legal(st).some(m=>m.t==='slide'&&m.id==='gold'&&m.to===4)) throw new Error('gold card: illegal slide');
  const s1=E.apply(st,m1); if(!E.legal(s1).some(m=>m.t==='collect')) throw new Error('gold card: collect not legal'); const s2=E.apply(s1,m2); if(s2.over||s2.coins.length!==2||s2.coins[0].pos!==3) throw new Error('gold card: collecting must not move the others');
  let g=''; for(let p=0;p<n;p++) g+=`<rect x="${x0+p*cw+2}" y="${ty-20}" width="${cw-4}" height="40" rx="8" fill="currentColor" fill-opacity=".09"/>`;
  g+=`<g class="zgcol">${ZART.coin('penny',cx(1),ty,r)}</g>`+ZART.coin('penny',cx(3),ty,r);
  g+=`<circle class="zgring" cx="${cx(7)}" cy="${ty}" r="${r*1.5+4}" fill="none" stroke="currentColor" stroke-width="2.4"/>`;
  g+=`<circle class="zgdest" cx="${cx(4)}" cy="${ty}" r="${r*1.5+3}" fill="none" stroke="currentColor" stroke-width="2.4" stroke-dasharray="4 4"/>`;
  g+=`<g class="zggold" style="--dx:${(4-7)*cw}px">${ZART.coin('gold',cx(7),ty,r)}</g>`;
  g+=`<g class="zgtray"><rect x="${x0}" y="150" width="70" height="28" rx="10" fill="currentColor" fill-opacity=".08"/><text x="${x0+35}" y="168" text-anchor="middle" font-size="10" font-weight="700" fill="currentColor" font-family="var(--font-mono)" opacity=".7">TAKEN</text></g>`;
  g+=`<g class="zgcoll" style="--tx:${(x0+22)-cx(1)}px;--ty:${164-ty}px"></g>`;
  g+=T(128,34,'Slide a coin left','zgt zgt1',14)+T(128,34,'or take the leftmost coin','zgt zgt2',14)+T(128,34,'Whoever takes the gold wins','zgt zgt3',14);
  g+=T(128,206,'the leftmost coin can be taken from any space','zgn',10.5,'middle',600);
  return {preview:{n,pens:[1,3],gold:7},svg:`<svg viewBox="0 0 256 216" class="ag" role="img" aria-label="The Gold Coin: a gold coin slides left beside a penny, then the leftmost penny is taken from where it stands; whoever takes the gold wins">${g}</svg>`}; }

const CARD_CSS=`
/* gold coin: select the gold, it slides left; then the leftmost penny is taken from where it stands */
.ag .zgring,.ag .zgdest,.ag .zgt,.ag .zgn{opacity:0}.ag .zgt3{opacity:1}.ag .zgn{opacity:.75}
.ag .zggold{transform:translateX(var(--dx))}
.ag .zgcol{transform-box:fill-box;transform-origin:center}
.gcard:is(.on,.live) .ag .zgring{animation:zgr 6s forwards}.gcard:is(.on,.live) .ag .zgdest{animation:zgd 6s forwards}.gcard:is(.on,.live) .ag .zggold{animation:zgg 6s forwards}
.gcard:is(.on,.live) .ag .zgcol{animation:zgcl 6s forwards}
.gcard:is(.on,.live) .ag .zgt1{animation:zgc1 6s forwards}.gcard:is(.on,.live) .ag .zgt2{animation:zgc2 6s forwards}.gcard:is(.on,.live) .ag .zgt3{animation:zgc3 6s forwards}
@keyframes zgr{0%{opacity:0}6%,26%{opacity:1}34%,100%{opacity:0}}
@keyframes zgd{0%,10%{opacity:0}16%,28%{opacity:1}34%,100%{opacity:0}}
@keyframes zgg{0%,22%{transform:translateX(0)}36%,100%{transform:translateX(var(--dx))}}
@keyframes zgcl{0%,52%{transform:translate(0,0) scale(1);opacity:1}72%,100%{transform:translate(-4px,52px) scale(.7);opacity:0}}
@keyframes zgc1{0%{opacity:1}34%{opacity:1}38%,100%{opacity:0}}
@keyframes zgc2{0%,38%{opacity:0}46%,68%{opacity:1}74%,100%{opacity:0}}
@keyframes zgc3{0%,76%{opacity:0}86%,100%{opacity:1}}

/* sim: the three dots of the coming triangle pulse, the third edge closes it, the caption changes */
.as .zsv,.as .zsc2{opacity:0}.as .zsc1{opacity:1}
.as .zsv{transform-box:fill-box;transform-origin:center}
.gcard:is(.on,.live) .as .zsv{animation:zsv 3.4s forwards}.gcard:is(.on,.live) .as .zsc1{animation:zsc1 3.4s forwards}.gcard:is(.on,.live) .as .zsc2{animation:zsc2 3.4s forwards}
@keyframes zsv{0%{opacity:0;transform:scale(.6)}10%{opacity:1;transform:scale(1)}26%{transform:scale(1.15)}40%{opacity:1;transform:scale(1)}48%,100%{opacity:0}}
@keyframes zsc1{0%,38%{opacity:1}44%,100%{opacity:0}}
@keyframes zsc2{0%,58%{opacity:0}70%,100%{opacity:1}}

/* quarto: pick a piece from the tray, it crosses to the hand-over box, the other player places it, the row lights */
.aq .zqring,.aq .zqtgt{opacity:0}
.aq .zqc{opacity:0}.aq .zqc3{opacity:1}
.aq .zqmove{transform-box:view-box;transform-origin:0 0;transform:translate(var(--bx),var(--by)) scale(var(--bs))}
.gcard:is(.on,.live) .aq .zqmove{animation:zqm 6.4s forwards}
.gcard:is(.on,.live) .aq .zqring{animation:zqr 6.4s forwards}
.gcard:is(.on,.live) .aq .zqhand{animation:zqh 6.4s forwards}
.gcard:is(.on,.live) .aq .zqtgt{animation:zqt 6.4s forwards}
.gcard:is(.on,.live) .aq .zqline{animation:zql 6.4s forwards}
.gcard:is(.on,.live) .aq .zqc1{animation:zqc1 6.4s forwards}.gcard:is(.on,.live) .aq .zqc2{animation:zqc2 6.4s forwards}.gcard:is(.on,.live) .aq .zqc3{animation:zqc3 6.4s forwards}
@keyframes zqm{0%,16%{transform:translate(0,0) scale(1)}32%,44%{transform:translate(0,var(--hy)) scale(1)}70%,100%{transform:translate(var(--bx),var(--by)) scale(var(--bs))}}
@keyframes zqr{0%{opacity:0}6%,18%{opacity:1}26%,100%{opacity:0}}
@keyframes zqh{0%,28%{stroke-opacity:.4;stroke-width:1.8}34%,44%{stroke-opacity:1;stroke-width:3.4}52%,100%{stroke-opacity:.4;stroke-width:1.8}}
@keyframes zqt{0%,44%{opacity:0}50%,70%{opacity:1}76%,100%{opacity:0}}
@keyframes zql{0%,74%{opacity:0}86%,100%{opacity:1}}
@keyframes zqc1{0%{opacity:1}30%{opacity:1}34%,100%{opacity:0}}
@keyframes zqc2{0%,32%{opacity:0}38%,66%{opacity:1}72%,100%{opacity:0}}
@keyframes zqc3{0%,72%{opacity:0}80%,100%{opacity:1}}
/* pentago: place, then turn one quadrant, then the five */
.ap .zpgring,.ap .zpgbtn,.ap .zpc{opacity:0}.ap .zpc3{opacity:1}
.ap .zpgturn{transform-box:view-box;transform:rotate(-90deg)}
.ap .zpgdrop{transform-box:fill-box;transform-origin:center}
.gcard:is(.on,.live) .ap .zpgring{animation:zpr 6.4s forwards}
.gcard:is(.on,.live) .ap .zpgdrop{animation:zpd 6.4s forwards}
.gcard:is(.on,.live) .ap .zpgbtn{animation:zpb 6.4s forwards}
.gcard:is(.on,.live) .ap .zpgturn{animation:zpt 6.4s forwards}
.gcard:is(.on,.live) .ap .zpgline{animation:zpl 6.4s forwards}
.gcard:is(.on,.live) .ap .zpc1{animation:zpc1 6.4s forwards}.gcard:is(.on,.live) .ap .zpc2{animation:zpc2 6.4s forwards}.gcard:is(.on,.live) .ap .zpc3{animation:zpc3 6.4s forwards}
@keyframes zpr{0%{opacity:0}6%,20%{opacity:1}28%,100%{opacity:0}}
@keyframes zpd{0%,22%{opacity:0;transform:translateY(-14px) scale(.7)}30%,100%{opacity:1;transform:translateY(0) scale(1)}}
@keyframes zpb{0%,34%{opacity:0}40%,66%{opacity:1}72%,100%{opacity:0}}
@keyframes zpt{0%,42%{transform:rotate(0)}64%,100%{transform:rotate(-90deg)}}
@keyframes zpl{0%,70%{opacity:0}82%,100%{opacity:.55}}
@keyframes zpc1{0%{opacity:1}30%{opacity:1}34%,100%{opacity:0}}
@keyframes zpc2{0%,32%{opacity:0}38%,66%{opacity:1}70%,100%{opacity:0}}
@keyframes zpc3{0%,70%{opacity:0}80%,100%{opacity:1}}
.ap .zpgline{opacity:.55}
.gcard:is(.on,.live) .ap .zpgline{opacity:0}
/* domineering: horizontal covers two cells, vertical covers two cells, then nobody-horizontal-fits */
.ad .zdgh,.ad .zdc{opacity:0}.ad .zdc3{opacity:1}
.ad .zdemp{opacity:1}
.gcard:is(.on,.live) .ad .zdA{animation:zdA 6.4s forwards}.gcard:is(.on,.live) .ad .zdB{animation:zdB 6.4s forwards}
.gcard:is(.on,.live) .ad .zdghA{animation:zdgA 6.4s forwards}.gcard:is(.on,.live) .ad .zdghB{animation:zdgB 6.4s forwards}
.gcard:is(.on,.live) .ad .zdemp{animation:zdE 6.4s forwards}.gcard:is(.on,.live) .ad .zdleg{animation:zdlg 6.4s forwards}
.gcard:is(.on,.live) .ad .zdc1{animation:zdc1 6.4s forwards}.gcard:is(.on,.live) .ad .zdc2{animation:zdc2 6.4s forwards}.gcard:is(.on,.live) .ad .zdc3{animation:zdc3 6.4s forwards}
@keyframes zdA{0%,24%{opacity:0}32%,100%{opacity:1}}
@keyframes zdB{0%,56%{opacity:0}64%,100%{opacity:1}}
@keyframes zdgA{0%{opacity:0}6%,26%{opacity:1}34%,100%{opacity:0}}
@keyframes zdgB{0%,34%{opacity:0}40%,58%{opacity:1}66%,100%{opacity:0}}
@keyframes zdE{0%,72%{opacity:0}84%,100%{opacity:1}}
@keyframes zdlg{0%{opacity:1}4%,100%{opacity:0}}
@keyframes zdc1{0%{opacity:1}30%{opacity:1}34%,100%{opacity:0}}
@keyframes zdc2{0%,34%{opacity:0}40%,64%{opacity:1}70%,100%{opacity:0}}
@keyframes zdc3{0%,72%{opacity:0}82%,100%{opacity:1}}
/* crowded room: the nineteenth person arrives, 18 becomes 19, the room turns crowded */
.ac2 .zcn1{opacity:0}.ac2 .zcn2{opacity:1}.ac2 .zcok{opacity:0}.ac2 .zcbad{opacity:1}.ac2 .zccap{opacity:1}
.ac2 .zcnew{transform:translate(var(--dx),var(--dy))}
.gcard:is(.on,.live) .ac2 .zcnew{animation:zcw 5.2s forwards}
.gcard:is(.on,.live) .ac2 .zcn1{animation:zcna 5.2s forwards}.gcard:is(.on,.live) .ac2 .zcn2{animation:zcnb 5.2s forwards}
.gcard:is(.on,.live) .ac2 .zcok{animation:zcm1 5.2s forwards}.gcard:is(.on,.live) .ac2 .zcbad{animation:zcm2 5.2s forwards}
.gcard:is(.on,.live) .ac2 .zccap{animation:zcr 5.2s forwards}.gcard:is(.on,.live) .ac2 .zcfloor{animation:zcf 5.2s forwards}
@keyframes zcw{0%,10%{transform:translate(0,0)}58%,100%{transform:translate(var(--dx),var(--dy))}}
@keyframes zcna{0%,56%{opacity:1}60%,100%{opacity:0}}
@keyframes zcnb{0%,56%{opacity:0}60%,100%{opacity:1}}
@keyframes zcm1{0%,56%{opacity:1}64%,100%{opacity:0}}
@keyframes zcm2{0%,56%{opacity:0}64%,100%{opacity:1}}
@keyframes zcr{0%,58%{opacity:0}70%,100%{opacity:1}}
@keyframes zcf{0%,58%{fill-opacity:.07}70%,100%{fill-opacity:.17}}
/* last message: GO crosses, Harbor lights, the reply vanishes mid-river, Hill can only guess */
.am .zmgo,.am .zmre,.am .zmx,.am .zmc{opacity:0}.am .zmc3{opacity:1}
.am .zmq{opacity:1}
.am .zmre{opacity:.0}
.am .zmx{opacity:1}
.am .zmgo{opacity:0}
.gcard:is(.on,.live) .am .zmgo{animation:zmg 6.4s forwards}.gcard:is(.on,.live) .am .zmre{animation:zmr 6.4s forwards}
.gcard:is(.on,.live) .am .zmx{animation:zmxa 6.4s forwards}.gcard:is(.on,.live) .am .zmq{animation:zmqa 6.4s forwards}
.gcard:is(.on,.live) .am .zlb .zlbulb{animation:zlb 6.4s forwards}.gcard:is(.on,.live) .am .zlb .zlrays{animation:zlr 6.4s forwards}
.gcard:is(.on,.live) .am .zmc1{animation:zmc1 6.4s forwards}.gcard:is(.on,.live) .am .zmc2{animation:zmc2 6.4s forwards}.gcard:is(.on,.live) .am .zmc3{animation:zmc3 6.4s forwards}
@keyframes zmg{0%{opacity:0;transform:translateX(0)}6%{opacity:1;transform:translateX(0)}34%{opacity:1;transform:translateX(100px)}37%{transform:translate(100px,5px)}40%{transform:translate(100px,-3px)}43%{opacity:1;transform:translate(100px,0)}48%,100%{opacity:0;transform:translate(100px,0)}}
.zbob{animation:zbob .55s ease-in-out infinite alternate}.zwing{transform-box:fill-box;transform-origin:20% 90%;animation:zflap .28s ease-in-out infinite alternate}
@keyframes zbob{from{transform:translateY(-1.6px)}to{transform:translateY(1.6px)}}@keyframes zflap{from{transform:rotate(-10deg)}to{transform:rotate(16deg)}}
@media (prefers-reduced-motion:reduce){.zbob,.zwing{animation:none}}
@keyframes zmr{0%,44%{opacity:0;transform:translateX(0)}48%{opacity:1;transform:translateX(0)}66%{opacity:1;transform:translateX(-46px)}72%,100%{opacity:0;transform:translateX(-50px)}}
@keyframes zmxa{0%,64%{opacity:0}72%,100%{opacity:1}}
@keyframes zmqa{0%,12%{opacity:0}20%,100%{opacity:1}}
@keyframes zlb{0%,38%{fill-opacity:.14}46%,100%{fill-opacity:1}}
@keyframes zlr{0%,38%{opacity:0}46%,100%{opacity:1}}
@keyframes zmc1{0%{opacity:1}30%{opacity:1}34%,100%{opacity:0}}
@keyframes zmc2{0%,34%{opacity:0}40%,58%{opacity:1}64%,100%{opacity:0}}
@keyframes zmc3{0%,66%{opacity:0}76%,100%{opacity:1}}
.am .zla .zlbulb{fill-opacity:.14}.am .zlb .zlbulb{fill-opacity:1}
.gcard:not(.on):not(.live) .am .zlb .zlbulb{fill-opacity:1}
/* take two: one coin crosses each way, then two cross together and the exchange stops; the last coin sits ringed and dimmed */
.atp .zpc1,.atp .zpc2{opacity:0}.atp .zpc3{opacity:1}
.atp .zpdA1,.atp .zpdB1,.atp .zpdB2{opacity:0}
.atp .zpk5ring{opacity:0}
.atp .zpk1,.atp .zpk2,.atp .zpk3,.atp .zpk4{transform-box:fill-box;transform-origin:center}
.gcard:is(.on,.live) .atp .zpdA0{animation:zpA0 7.4s forwards}.gcard:is(.on,.live) .atp .zpdA1{animation:zpA1 7.4s forwards}
.gcard:is(.on,.live) .atp .zpdB0{animation:zpB0 7.4s forwards}.gcard:is(.on,.live) .atp .zpdB1{animation:zpB1 7.4s forwards}.gcard:is(.on,.live) .atp .zpdB2{animation:zpB2 7.4s forwards}
.gcard:is(.on,.live) .atp .zpk1{animation:zpf1 7.4s forwards}.gcard:is(.on,.live) .atp .zpk2{animation:zpf2 7.4s forwards}
.gcard:is(.on,.live) .atp .zpk3{animation:zpf3 7.4s forwards}.gcard:is(.on,.live) .atp .zpk4{animation:zpf4 7.4s forwards}
.gcard:is(.on,.live) .atp .zpk5dim{animation:zpDim 7.4s forwards}.gcard:is(.on,.live) .atp .zpk5ring{animation:zpRing 7.4s forwards}
.gcard:is(.on,.live) .atp .zpc1{animation:zpC1 7.4s forwards}.gcard:is(.on,.live) .atp .zpc2{animation:zpC2 7.4s forwards}.gcard:is(.on,.live) .atp .zpc3{animation:zpC3 7.4s forwards}
@keyframes zpA0{0%,3%{opacity:1}9%,17%{opacity:0}21%,37%{opacity:1}43%,82%{opacity:0}90%,100%{opacity:1}}
@keyframes zpA1{0%,3%{opacity:0}9%,17%{opacity:1}21%,37%{opacity:0}43%,82%{opacity:1}90%,100%{opacity:0}}
@keyframes zpB0{0%,21%{opacity:1}25%,33%{opacity:0}37%,53%{opacity:1}59%,82%{opacity:0}90%,100%{opacity:1}}
@keyframes zpB1{0%,21%{opacity:0}25%,33%{opacity:1}37%,100%{opacity:0}}
@keyframes zpB2{0%,53%{opacity:0}59%,82%{opacity:1}90%,100%{opacity:0}}
@keyframes zpf1{0%,9%{transform:translate(0,0);opacity:1}17%,82%{transform:translate(var(--dx),var(--dy));opacity:1}88%{transform:translate(var(--dx),var(--dy));opacity:0}89%{transform:translate(0,0);opacity:0}94%,100%{transform:translate(0,0);opacity:1}}
@keyframes zpf2{0%,25%{transform:translate(0,0);opacity:1}33%,82%{transform:translate(var(--dx),var(--dy));opacity:1}88%{transform:translate(var(--dx),var(--dy));opacity:0}89%{transform:translate(0,0);opacity:0}94%,100%{transform:translate(0,0);opacity:1}}
@keyframes zpf3{0%,43%{transform:translate(0,0);opacity:1}51%,82%{transform:translate(var(--dx),var(--dy));opacity:1}88%{transform:translate(var(--dx),var(--dy));opacity:0}89%{transform:translate(0,0);opacity:0}94%,100%{transform:translate(0,0);opacity:1}}
@keyframes zpf4{0%,45%{transform:translate(0,0);opacity:1}53%,82%{transform:translate(var(--dx),var(--dy));opacity:1}88%{transform:translate(var(--dx),var(--dy));opacity:0}89%{transform:translate(0,0);opacity:0}94%,100%{transform:translate(0,0);opacity:1}}
@keyframes zpDim{0%,53%{opacity:1}59%,82%{opacity:.42}88%,100%{opacity:1}}
@keyframes zpRing{0%,53%{opacity:0}59%,82%{opacity:1}88%,100%{opacity:0}}
@keyframes zpC1{0%,33%{opacity:1}37%,100%{opacity:0}}
@keyframes zpC2{0%,35%{opacity:0}39%,55%{opacity:1}59%,100%{opacity:0}}
@keyframes zpC3{0%,55%{opacity:0}59%,100%{opacity:1}}
`;
ZART.card={gold:cardGold,toot:cardToot,quarto:cardQuarto,pentago:cardPentago,domineering:cardDomineering,crowd:cardCrowd,message:cardMessage,penny:cardPenny,css:CARD_CSS};

})();
