/* party-duck.js — the party collection's rubber-duck avatars, and the character creator every party game and
   Same Pond share. One rubber bath duck, drawn in profile (the avatar everywhere) or from the front (the creator's
   second view), with combinable parts: hair and its colour, facial hair, headwear and its colour, eyewear, an
   expression, something around the neck and an extra (headphones, a flower, earrings). Ducks are told apart by
   shape, accessory, numbered badge and name — never by colour alone.

   ZPDuck.svg(duck, opts) -> '<svg …>'   opts.view 'front' | 'side'; opts.crop 'bust' | 'face' for thumbnails
   ZPDuck.html(player, opts) -> an avatar span with its badge; opts.cls adds state classes:
     hop (joined), ready (wing raised), sent (envelope slid forward), speak (bob + spotlight),
     accused (wide eyes), cleared (relieved), reveal (a dramatic mask), pencil (holding a pencil), ghost, pd-live
   ZPDuck.newCreator(duck, nick) + ZPDuck.creatorHTML(id, state, {save, cancel}) -> the shared creator
   Loads in the page (window.ZPDuck) and in Node (module.exports), so both room servers keep exactly the same rules. */
(function(){
const HAS_DOC=typeof document!=='undefined'&&typeof document.addEventListener==='function';
const INK='#24231f', BODY='#f5f2e8', MOLD='#e5e0d3', WING='#ebe6d9', GOLD='#c5a23c', GOLDE='#796323', GREY='#8d897c';
const S=`stroke="${INK}" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"`;
const S2=`stroke="${INK}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"`;
const own=(o,k)=>typeof k==='string'&&Object.prototype.hasOwnProperty.call(o,k);

/* ---------- the duck ---------- */
/* The one rubber bath duck every party game draws (the avatar, the card art and the demos), facing right.
   Drawn in a 360x300 space, then placed so its head sits where the accessories expect it: head centre (7,-13),
   about 14 units across, body resting on y=26. Ink is heavier than the source drawing so it still reads at 28px. */
const DUCK_T='translate(7 -13) scale(.24) translate(-197 -100)';
const BILL=`<path d="M246 110C254 108 260 114 269 117C277 120 290 118 291 126C292 135 282 143 268 143C256 143 247 138 243 132C239 125 239 115 246 110Z" fill="${GOLD}" stroke="${INK}" stroke-width="7" stroke-linejoin="round"/>
<path d="M247 128C258 132 274 134 286 129" fill="none" stroke="${GOLDE}" stroke-width="3.5" stroke-linecap="round"/>`;
const DUCK_IN=`
<path d="M145 146C141 133 138 119 140 105C142 71 165 48 197 48C230 48 254 70 255 100C256 119 246 129 246 142C246 155 265 167 275 180C284 192 287 205 284 219C278 248 245 260 205 262C165 264 124 261 96 251C65 240 47 219 44 196C42 181 45 164 52 163C59 162 60 178 72 182C91 163 115 150 145 146Z" fill="${BODY}"/>
<path d="M58 213C88 243 145 250 195 249C235 249 264 243 280 226C270 251 239 260 205 262C165 264 124 261 96 251C77 244 63 231 58 213Z" fill="${MOLD}"/>
<g class="pd-wing"><path d="M98 199C116 184 142 181 164 188C182 194 192 207 210 208C198 227 174 233 151 229C126 226 108 215 98 199Z" fill="${WING}"/><path d="M101 202C120 222 145 231 169 228C186 227 200 220 208 210" fill="none" stroke="#aca697" stroke-width="5" stroke-linecap="round"/><path d="M112 191C128 184 147 184 161 188" fill="none" stroke="#d2cbbb" stroke-width="4" stroke-linecap="round"/></g>
<path d="M145 146C141 133 138 119 140 105C142 71 165 48 197 48C230 48 254 70 255 100C256 119 246 129 246 142C246 155 265 167 275 180C284 192 287 205 284 219C278 248 245 260 205 262C165 264 124 261 96 251C65 240 47 219 44 196C42 181 45 164 52 163C59 162 60 178 72 182C91 163 115 150 145 146Z" fill="none" stroke="${INK}" stroke-width="9" stroke-linejoin="round"/>
${BILL}
<g class="pd-eyes"><g class="pd-eye"><ellipse cx="226" cy="100" rx="9" ry="10.5" fill="${INK}"/><circle cx="229" cy="96.5" r="2.8" fill="#fffdf6"/></g></g>
<g class="pd-relief"><path d="M215 102C219 95 231 95 236 101" fill="none" stroke="${INK}" stroke-width="6" stroke-linecap="round"/></g>`;
const DUCK=`<g class="pd-duck" transform="${DUCK_T}">${DUCK_IN}</g>`;
const BILL_OVER=`<g transform="${DUCK_T}">${BILL}</g>`;   // facial hair tucks under the bill, so the bill is drawn again over it
const EYE={x:14,y:-13};   // where the profile's eye lands in avatar units
/* The same duck seen from the front (the creator's second view): head centre (0,-13), both eyes, the bill facing us. */
const FBODY='M-19.5 9C-22 18 -15 27 0 27C15 27 22 18 19.5 9C17.5 2 10 -1 0 -1C-10 -1 -17.5 2 -19.5 9Z';
const FEYE=[-5.3,5.3].map(x=>`<g class="pd-eye"><ellipse cx="${x}" cy="-15.2" rx="2.15" ry="2.6" fill="${INK}"/><circle cx="${x+.75}" cy="-16.1" r=".72" fill="#fffdf6"/></g>`).join('');
const FBILL=`<path d="M-8.6 -7.6C-6 -10 6 -10 8.6 -7.6C10.2 -5.6 7.8 -2.4 0 -2.2C-7.8 -2.4 -10.2 -5.6 -8.6 -7.6Z" fill="${GOLD}" ${S2}/><path d="M-6.8 -5.3C-3 -4.3 3 -4.3 6.8 -5.3" fill="none" stroke="${GOLDE}" stroke-width="1" stroke-linecap="round"/>`;
const FDUCK=`<g class="pd-duck pd-front"><path d="${FBODY}" fill="${BODY}"/><path d="M-20.6 15C-17 23 -9 25.4 0 25.4C9 25.4 17 23 20.6 15C19.6 23 12 27 0 27C-12 27 -19.6 23 -20.6 15Z" fill="${MOLD}"/>
<g class="pd-wing"><path d="M-18.6 7C-24 9.6 -24.4 17.6 -18.4 20.6C-16.2 16 -16.2 11 -18.6 7Z" fill="${WING}" ${S2}/></g><path d="M18.6 7C24 9.6 24.4 17.6 18.4 20.6C16.2 16 16.2 11 18.6 7Z" fill="${WING}" ${S2}/>
<path d="${FBODY}" fill="none" stroke="${INK}" stroke-width="2.2"/><circle cx="0" cy="-13" r="13.5" fill="${BODY}" stroke="${INK}" stroke-width="2.2"/>
<g class="pd-eyes">${FEYE}</g><g class="pd-relief"><path d="M-7.6 -14.8C-6.6 -16.8 -4 -16.8 -3 -14.8M3 -14.8C4 -16.8 6.6 -16.8 7.6 -14.8" fill="none" stroke="${INK}" stroke-width="1.5" stroke-linecap="round"/></g></g>`;

/* ---------- drawing helpers ---------- */
const f2=n=>+(+n).toFixed(2);
const P=(a,r,cx,cy)=>{ const t=a*Math.PI/180; return [f2(cx+r*Math.cos(t)),f2(cy+r*Math.sin(t))]; };
const SH={x:7,y:-12.6,r:13.4}, FH={x:0,y:-13,r:13.5};   // the head circle, in profile and from the front
/* points around the head: angle 0 faces the bill (or the duck's left from the front), -90 is the top */
const arc=(H,a0,a1,n,vol,e0,e1)=>{ const o=[]; for(let i=0;i<n;i++){ const t=i/(n-1), base=e0+(e1-e0)*t; o.push(P(a0+(a1-a0)*t,H.r+base+(vol-base)*Math.pow(Math.sin(Math.PI*t),.6),H.x,H.y)); } return o; };
/* a smooth path through points (Catmull-Rom); a third value of 1 on a point makes it a sharp corner */
function chain(Q,closed){ const n=Q.length, g=i=>closed?Q[(i+n)%n]:Q[Math.max(0,Math.min(n-1,i))]; let d='';
  for(let i=0;i<(closed?n:n-1);i++){ const p0=g(i-1),p1=g(i),p2=g(i+1),p3=g(i+2);
    const a=p1[2]?p1:[p1[0]+(p2[0]-p0[0])/6,p1[1]+(p2[1]-p0[1])/6], b=p2[2]?p2:[p2[0]-(p3[0]-p1[0])/6,p2[1]-(p3[1]-p1[1])/6];
    d+=`C${f2(a[0])} ${f2(a[1])} ${f2(b[0])} ${f2(b[1])} ${f2(p2[0])} ${f2(p2[1])}`; }
  return d; }
const Mv=p=>`M${f2(p[0])} ${f2(p[1])}`;
const blob=Q=>Mv(Q[0])+chain(Q,true)+'Z';
const mir=p=>[-p[0],p[1],p[2]];
/* a front-view shape mirrored about x=0: R runs from the top centre, down the duck's left, back up to the hairline centre */
const sym=R=>blob(R.concat(R.slice(1,-1).reverse().map(mir)));
/* curly outlines: little arcs between points, bulging outwards */
function scal(Q,k){ let d=''; for(let i=1;i<Q.length;i++){ const a=Q[i-1],b=Q[i],r=f2(Math.hypot(b[0]-a[0],b[1]-a[1])*(k||.6)); d+=`A${r} ${r} 0 0 1 ${f2(b[0])} ${f2(b[1])}`; } return d; }
const cloud=(O,I,k)=>Mv(O[0])+scal(O,k)+chain([O[O.length-1].slice(0,2).concat(1)].concat(I,[O[0].slice(0,2).concat(1)]),false)+'Z';
const symCloud=(OR,IR,k)=>cloud(OR.slice(1).reverse().map(mir).concat(OR),IR.concat(IR.slice(0,-1).reverse().map(mir)),k);
const hx=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
const mix=(a,b,t)=>'#'+hx(a).map((v,i)=>Math.round(v+(hx(b)[i]-v)*t).toString(16).padStart(2,'0')).join('');
const lum=h=>{ const [r,g,b]=hx(h); return (.3*r+.59*g+.11*b)/255; };
/* a colour with its shades: f fill, d darker, s strands (lighter on dark hair, darker on light hair) */
const tone=h=>({ f:h, d:mix(h,INK,.35), s:lum(h)<.4?mix(h,'#ffffff',.38):mix(h,INK,.42) });
const fillP=(d,c,sw)=>`<path d="${d}" fill="${c}" ${sw===2?S2:S}/>`;
const lines=(c,d,w)=>`<path d="${d}" fill="none" stroke="${c}" stroke-width="${w||.9}" stroke-linecap="round" stroke-linejoin="round"/>`;
const flip=s=>`<g transform="scale(-1 1)">${s}</g>`;

/* ---------- colours ---------- */
const HCOL={ black:['#2b2622','Black'], espresso:['#4e3324','Dark brown'], brown:['#80553a','Brown'], auburn:['#9c4a2c','Auburn'], blonde:['#d6ae55','Blonde'], silver:['#c9c4b8','Silver'], teal:['#3f7f80','Teal'], lilac:['#9a83b6','Lilac'] };
const ACOL={ sage:['#8fa596','Sage'], clay:['#b98a72','Clay'], slate:['#6d8793','Slate'], plum:['#7d5a78','Plum'], ink:['#3b3a36','Charcoal'], cream:['#efe9dc','Cream'], rose:['#c98d8d','Rose'], gold:[GOLD,'Gold'] };
const COLS={ hc:HCOL, ac:ACOL, nc:ACOL };

/* ---------- hair ----------
   Every style is one solid mass that covers the side of the head down to its own hairline, with volume beyond the
   head's outline, so it reads as hair at 28px. "lift" raises a hat sitting on top of it; "tall" styles don't fit
   under a hat with a crown (only the crown and the party hat sit on them). Profile hairlines stay behind the eye. */
const sp=(a,dr)=>P(a,SH.r+(dr||0),SH.x,SH.y);
const C1=p=>p.concat(1);
/* sleek shells (pulled back into a tail, a bun or braids): a thin layer, hairline behind the eye */
const sleekSide=c=>fillP(blob([C1(sp(146,.3))].concat(arc(SH,160,306,9,1.6,.6,.8),[[17,-21.4,1],[13.4,-20.4],[9.6,-19.2],[7.2,-15.8],[6.2,-10.8],[5.6,-7.4,1],[2.6,-8.4],[-0.6,-6.4]])),c.f)+lines(c.s,'M14.4 -24.6C9 -26.4 1.6 -24.6 -2.6 -20.2M12.4 -21.8C7 -23 1.4 -21.4 -1.6 -17.4');
const sleekFront=(c,part)=>fillP(sym([[0,-28.4]].concat(arc(FH,272,355,6,1.4,1.2,.8),[[14.4,-8.6],[13.6,-5.6,1],[12,-6.6],[11.6,-12.4],[9.8,-17.6],[6,-21],[2.4,-22.4],[0,part?-23.6:-22.2,part?1:0]])),c.f,2)+lines(c.s,part?'M0 -27.4V-23.6M-2.6 -27C-6 -26 -9.4 -23 -11 -18.4M2.6 -27C6 -26 9.4 -23 11 -18.4':'M-4 -26.8C-8 -25.4 -10.8 -22 -12 -17.6M4 -26.8C8 -25.4 10.8 -22 12 -17.6');
const tie=(x,y,rot)=>`<rect x="${f2(x-1.7)}" y="${f2(y-2.6)}" width="3.4" height="5.2" rx="1.4" transform="rotate(${rot||0} ${x} ${y})" fill="${GOLD}" stroke="${INK}" stroke-width="1.3"/>`;
/* a plait: overlapping lobes along a path, alternating sides, finished with a tie and a soft tuft */
function plait(c,pts,w){ let o=''; const n=pts.length;
  for(let i=0;i<n-1;i++){ const [x,y]=pts[i],[x2,y2]=pts[i+1], ang=Math.atan2(y2-y,x2-x)*180/Math.PI, len=Math.hypot(x2-x,y2-y), s=i%2?1:-1;
    o+=`<g transform="translate(${f2(x)} ${f2(y)}) rotate(${f2(ang-90)})"><path d="M${f2(-w*.5*s)} ${f2(-len*.15)}C${f2(w*.7*s)} ${f2(len*.05)} ${f2(w*.65*s)} ${f2(len*.75)} ${f2(-w*.2*s)} ${f2(len*1.12)}C${f2(-w*.62*s)} ${f2(len*.7)} ${f2(-w*.7*s)} ${f2(len*.2)} ${f2(-w*.5*s)} ${f2(-len*.15)}Z" fill="${c.f}" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/></g>`; }
  const [ex,ey]=pts[n-1],[px,py]=pts[n-2], ang=Math.atan2(ey-py,ex-px)*180/Math.PI;
  return o+`<g transform="translate(${f2(ex)} ${f2(ey)}) rotate(${f2(ang-90)})"><path d="M-2.2 0.6C-3.2 3 -2.6 5.6 0 6.6C2.6 5.6 3.2 3 2.2 0.6Z" fill="${c.f}" stroke="${INK}" stroke-width="1.5" stroke-linejoin="round"/>${lines(c.s,'M-0.8 2V5M0.8 2V5',.7)}<rect x="-2.6" y="-1.4" width="5.2" height="2.6" rx="1" fill="${GOLD}" stroke="${INK}" stroke-width="1.2"/></g>`; }
const bunAt=(c,x,y,r,braided)=>braided
  ? `<circle cx="${x}" cy="${y}" r="${r}" fill="${c.f}" ${S2}/>${[0,1,2,3,4,5,6].map(i=>{ const a=i*51.4, q=P(a,r*.55,x,y); return `<ellipse cx="${q[0]}" cy="${q[1]}" rx="${f2(r*.42)}" ry="${f2(r*.27)}" transform="rotate(${f2(a+90)} ${q[0]} ${q[1]})" fill="${c.f}" stroke="${INK}" stroke-width="1.1"/>`; }).join('')}<circle cx="${x}" cy="${y}" r="${f2(r*.3)}" fill="${c.f}" stroke="${INK}" stroke-width="1.1"/>`
  : `<circle cx="${x}" cy="${y}" r="${r}" fill="${c.f}" ${S2}/>${lines(c.s,`M${f2(x-r*.62)} ${f2(y+r*.1)}C${f2(x-r*.5)} ${f2(y-r*.62)} ${f2(x+r*.5)} ${f2(y-r*.7)} ${f2(x+r*.62)} ${f2(y-r*.05)}M${f2(x-r*.35)} ${f2(y+r*.45)}C${f2(x-r*.1)} ${f2(y-r*.2)} ${f2(x+r*.45)} ${f2(y-r*.2)} ${f2(x+r*.5)} ${f2(y+r*.3)}`,1)}`;
/* small curls drawn inside curly hair, for texture */
const coils=(c,pts)=>lines(c.s,pts.map(([x,y])=>`M${x} ${y}a1.3 1.3 0 1 1 1.5 1.2`).join(''),1);
/* short styles: a close cap over the top and back of the head, hairline behind the eye. They share one outline
   (hairline and sideburn) and differ in volume, edge and texture, so each still reads at avatar size. */
const SHL=[[16.2,-22.4,1],[13.6,-21.4],[10.6,-20.8],[8.2,-18.8],[6.6,-15.4],[6,-11.6,1],[3.4,-12.2],[0.4,-9.8],[-3.6,-7.2]];
const FHL=[[14.2,-11.6,1],[12.6,-12.4],[12,-16.4],[10.8,-19.6],[7.4,-21.2],[3.6,-21.8],[0,-22,1]];
const capS=(vol,e1,hl)=>blob([C1(sp(150,.2))].concat(arc(SH,158,304,9,vol,.4,e1==null?.8:e1),hl||SHL));
const capF=(vol,top,hl)=>sym([[0,-26.5-(top==null?vol:top)]].concat(arc(FH,274,352,6,vol,vol,.7),hl||FHL));
const soft=(d,c,op)=>`<path d="${d}" fill="${c.f}" fill-opacity="${op||1}" stroke="${c.d}" stroke-width="1.2" stroke-linejoin="round"/>`;
const dots=(c,pts,w)=>lines(c.s,pts.map(([x,y])=>`M${x} ${y}h.01`).join(''),w||1.2);
const SHINE_S=`<path d="M3.6 -22.8C5.6 -24.6 8.6 -25.2 11.2 -24.6" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" opacity=".85"/><circle cx="13.6" cy="-23.6" r=".9" fill="#fff" opacity=".85"/>`;
const SHINE_F=`<path d="M-6.6 -21.8C-4.6 -24.2 -1.4 -25 1.4 -24.6" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" opacity=".85"/><circle cx="3.8" cy="-24.2" r=".9" fill="#fff" opacity=".85"/>`;
const SHORT={
  buzz:{ label:'Buzz cut', w:'buzz cut', dc:'black', lift:.6,
    side:c=>soft(capS(.7,.4),c,.78)+dots(c,[[-2,-14],[1,-19],[4,-22.6],[8,-24],[12,-23.4],[-1,-9.6],[2,-14.8],[6,-19.6],[-4,-10.6],[10,-21.2]]),
    front:c=>soft(capF(.7,.7,[[14.2,-12.4,1],[12.8,-13],[12.2,-16.8],[11,-20],[7.4,-21.6],[3.6,-22.2],[0,-22.4,1]]),c,.78)+dots(c,[[-9,-21],[-4,-24],[0,-25],[4,-24],[9,-21],[-11.6,-16],[11.6,-16],[-6,-22],[6,-22]]) },
  textured:{ label:'Textured crop', w:'close-cropped textured hair', dc:'espresso', lift:1.4,
    side:c=>fillP(cloud([C1(sp(150,.2))].concat(arc(SH,160,306,11,1.8,.5,1.1)),SHL,.55),c.f)+lines(c.s,'M0 -21.6l1.4 1.6M5 -24.4l1.2 1.8M10 -25l.6 2M-3.4 -16.4l1.6 1.2M14.4 -23.6l-.2 1.6M3 -18.6l1.4 1.2',.9),
    front:c=>fillP(symCloud([[0,-28.6]].concat(arc(FH,280,352,5,1.8,1.8,.7)),[[14.2,-11.6],[12.6,-12.4],[12,-16.4],[10.8,-19.6],[7.4,-21.2],[3.6,-21.8],[0,-22]],.55),c.f,2)+lines(c.s,'M-8 -24.2l.8 1.8M-3 -26.2l.4 2M2.4 -26.2l-.2 2M7.6 -24.4l-.6 1.8M-11.8 -19.6l1.2 1.4M11.8 -19.6l-1.2 1.4',.9) },
  crop:{ label:'Short crop', w:'short straight crop', dc:'brown', lift:1.6,
    side:c=>fillP(capS(2,1.6,[[18.2,-21.4,1],[16.4,-20.2,1],[13.4,-20.4],[10.4,-20.4],[8.2,-18.6],[6.6,-15.4],[6,-11.6,1],[3.4,-12.2],[0.4,-9.8],[-3.6,-7.2]]),c.f)+lines(c.s,'M15.6 -25.6C11 -27.6 4 -26.8 -0.6 -22.6M9.6 -23C6.4 -22.8 3.6 -21.2 2 -18.4'),
    front:c=>fillP(capF(2,2,[[14.6,-11.6,1],[12.8,-12.4],[12.2,-16.4],[11.6,-19.4,1],[7,-19.8],[3.4,-20],[0,-20,1]]),c.f,2)+lines(c.s,'M-9 -23.4V-20.2M-4.6 -25V-20.4M0 -25.6V-20.4M4.6 -25V-20.4M9 -23.4V-20.2',.8) },
  curlycrop:{ label:'Short curls', w:'short curly crop', dc:'black', lift:2.2,
    side:c=>fillP(cloud([C1(sp(150,.2))].concat(arc(SH,160,306,9,2.6,.6,1.6)),SHL,.68),c.f)+coils(c,[[-3,-14],[1,-21],[6,-24],[11,-24.4],[-2,-9],[3,-17]]),
    front:c=>fillP(symCloud([[0,-30]].concat(arc(FH,280,352,5,2.6,2.6,.8)),[[14.2,-11.6],[12.6,-12.4],[12,-16.4],[10.8,-19.6],[7.4,-21.2],[3.6,-21.8],[0,-22]],.68),c.f,2)+coils(c,[[-10,-20],[-5,-25],[1,-26.4],[7,-24],[11,-18]]) },
  fade:{ label:'Low fade', w:'low fade', dc:'black', lift:1.6,
    side:c=>soft(capS(.6,.4),c,.42)+fillP(blob([C1(sp(200,.4))].concat(arc(SH,206,304,7,2.4,.4,1.2),[[16.4,-22.2,1],[13.6,-21.6],[10,-22.2],[5.6,-23],[1,-22.4],[-2.8,-20.4,1]])),c.f)+lines(c.s,'M14 -25.6C10 -27.4 4 -27 0 -24.2'),
    front:c=>soft(capF(.6,.6),c,.42)+fillP(sym([[0,-29.2]].concat(arc(FH,274,322,5,2.4,2.4,.8),[[12.4,-19.6,1],[9.4,-20.6],[5,-21.6],[0,-21.8,1]])),c.f,2)+lines(c.s,'M-3.6 -27.4C-7 -26.6 -9.6 -24.4 -10.6 -21.6M3.6 -27.4C7 -26.6 9.6 -24.4 10.6 -21.6',.8) },
  sidepart:{ label:'Side part', w:'short side part', dc:'auburn', lift:1.8,
    side:c=>fillP(capS(2.2,1.4),c.f)+lines(c.s,'M2 -26.2C6 -26.8 11 -26 15.4 -23.4M8.4 -23.2C6 -22.6 4 -21 2.6 -18.6M-1 -22C-2.8 -19.4 -3.4 -16 -3 -12.6'),
    front:c=>fillP(capF(2.2,2.2,[[14.2,-11.6,1],[12.6,-12.4],[12,-16.4],[10.8,-19.6],[7.4,-21.4],[3.6,-22.4],[0,-23.2],[-0.1,-23.2,1]]),c.f,2)+lines(c.s,'M-4.6 -28.6C-4.4 -26.6 -4.6 -24.6 -5.4 -22.4',1.3)+lines(c.s,'M-3.2 -27.4C1 -27.4 6.6 -25.6 10.2 -21.8M-3 -24.6C1.4 -24.6 6 -22.8 8.8 -20.4M-6.4 -27.4C-8.6 -26.4 -10.6 -24.2 -11.6 -21',.8) },
  quiff:{ label:'Soft quiff', w:'soft quiff', dc:'brown', lift:2.8,
    side:c=>fillP(blob([C1(sp(150,.2))].concat(arc(SH,158,296,9,2.4,.4,4.2),[[20,-25.6],[20.2,-22.4,1],[17.4,-21.4],[13.6,-21.4],[10.6,-20.8],[8.2,-18.8],[6.6,-15.4],[6,-11.6,1],[3.4,-12.2],[0.4,-9.8],[-3.6,-7.2]])),c.f)+lines(c.s,'M18.6 -27.6C14 -30.6 6 -29.6 1.6 -25.6M17.4 -24.4C13.6 -27 8 -26.6 4.6 -24'),
    front:c=>fillP(sym([[0,-32.2]].concat(arc(FH,282,352,6,2.2,3,.7),FHL)),c.f,2)+lines(c.s,'M0 -32.4C-2.4 -31.4 -3.6 -29.4 -3.4 -27M3 -31.6C1.6 -30 1.2 -28.2 1.6 -26.2M-6.4 -28C-9 -26.6 -10.8 -24 -11.6 -21M6.4 -28C9 -26.6 10.8 -24 11.6 -21',.8) },
  coils:{ label:'Short coils', w:'short coiled hair', dc:'black', lift:2.6,
    side:c=>fillP(cloud([C1(sp(150,.2))].concat(arc(SH,160,306,14,3,.8,1.8)),SHL,.7),c.f)+coils(c,[[-4,-12],[-1,-17],[2,-22],[6,-25.4],[10,-25.6],[13.6,-24],[-2,-8],[2,-12.6],[4,-18],[8,-21.6]]),
    front:c=>fillP(symCloud([[0,-30.6]].concat(arc(FH,280,352,7,3,3,.9)),[[14.2,-11.6],[12.6,-12.4],[12,-16.4],[10.8,-19.6],[7.4,-21.2],[3.6,-21.8],[0,-22]],.7),c.f,2)+coils(c,[[-12,-17],[-9,-22],[-5,-26],[-1,-27.4],[3,-27],[7,-24.6],[10,-21],[12,-15],[-3,-23],[2,-23.4]]) },
  bald:{ label:'Bald', w:'bald head', dc:'brown', lift:0, nocol:1,
    side:()=>SHINE_S, front:()=>SHINE_F },
  receding:{ label:'Receding', w:'receding hairline', dc:'silver', lift:.8,
    side:c=>SHINE_S+fillP(blob([C1(sp(150,.2))].concat(arc(SH,158,252,7,1.4,.4,.6),[[2.8,-25.8,1],[2.4,-22],[3.6,-17.4],[5.4,-12.2,1],[3,-12.4],[0.4,-9.8],[-3.6,-7.2]])),c.f,2)+lines(c.s,'M-1 -22.6C-3 -19.6 -3.6 -16 -3.2 -12.6M1.2 -23.2C0 -20 -0.2 -16.6 0.6 -13.6',.8),
    front:c=>{ const t=fillP(blob([[9.4,-24.4,1]].concat(arc(FH,306,352,4,1.4,.8,.7),[[14.2,-11.6,1],[12.6,-12.4],[12,-16.4],[11.4,-19.8],[10.6,-22.2]])),c.f,2); return SHINE_F+t+flip(t); } },
};
const HAIR={
  pixie:{ label:'Pixie', w:'pixie cut', dc:'espresso', lift:2,
    side:c=>fillP(blob([C1(sp(145,.4))].concat(arc(SH,160,312,9,2.9,.9,.9),[[17.6,-21,1],[15,-21.6],[13.6,-19.6,1],[11.2,-20.4],[8.8,-18.8],[6.8,-15.2],[5.8,-10,1],[3.4,-11.4],[1,-8.8],[-2,-6.4]])),c.f)+lines(c.s,'M15 -25.2C10 -27.8 3 -26.6 -1.4 -22.4M9.6 -23.6C6 -23.4 2.6 -21.4 0.6 -18M-3.6 -18.6C-4.4 -15 -4.2 -11.4 -3.2 -8.4'),
    front:c=>fillP(sym([[0,-29.8]].concat(arc(FH,272,358,6,2.6,2.6,1.2),[[14.4,-12.6,1],[12.4,-13.6],[11.4,-16.2],[10.4,-18.4],[8.4,-18.8,1],[6.6,-20.6],[3.8,-19.4,1],[1.6,-21],[0,-20.4,1]])),c.f,2)+lines(c.s,'M-2 -27.6C-6 -26.8 -9.6 -24 -11 -20M2 -27.6C6 -26.8 9.6 -24 11 -20') },
  ...SHORT,
  bob:{ label:'Bob', w:'bob', dc:'brown', lift:3,
    side:c=>fillP(blob([[5.4,-0.6,1],[1,0.6],[-4,0.4],[-8.6,-1,1],[-11.4,-5.4],[-12,-11]].concat(arc(SH,198,308,7,3.4,3,2),[[18.8,-20.4,1],[15,-20.4],[11.4,-19.6],[8.6,-17],[7.2,-12],[6.8,-6]])),c.f)+lines(c.s,'M16 -26C10 -29 2 -27.6 -3 -22.6C-7 -18.6 -8.4 -11 -7.4 -3.6M11 -22C6 -22.4 1.4 -19.8 -1 -15.6C-2.6 -12 -3 -6 -2 -1.6'),
    front:c=>fillP(sym([[0,-30.2]].concat(arc(FH,272,345,5,3.4,3.2,3.6),[[17.6,-9],[17.6,-3],[16.4,0.8,1],[12.2,-0.2,1],[11.6,-7],[11.4,-13.4],[9.4,-19],[5.6,-22.4],[2,-24],[0,-24.4,1]])),c.f,2)+lines(c.s,'M0 -29V-24.4M-3 -28.6C-9 -27 -13.4 -20 -14.4 -12C-15 -6 -14.6 -2 -14 0M3 -28.6C9 -27 13.4 -20 14.4 -12C15 -6 14.6 -2 14 0') },
  shoulder:{ label:'Shoulder-length', w:'shoulder-length hair', dc:'auburn', lift:3,
    side:c=>fillP(blob([[5.6,5.6,1],[1,7.2],[-4.2,6.6],[-9,7.8],[-13.2,9.8,1],[-12.8,4.6],[-12.8,-2],[-12.4,-8.6]].concat(arc(SH,200,308,7,3.4,3.4,2),[[18.8,-20.4,1],[15,-20.4],[11.2,-19.6],[8.4,-16.6],[7,-11],[6.6,-4],[6.4,1.6]])),c.f)+lines(c.s,'M16 -26C10 -29 2 -27.6 -3 -22.6C-8 -17.6 -9.4 -8 -8.6 1.4C-8.4 3.8 -8.8 5.6 -9.6 7M10.6 -22C5 -22.4 0.6 -19 -1.4 -13.6C-2.6 -9 -2 -1 -0.6 5'),
    front:c=>fillP(sym([[0,-30.2]].concat(arc(FH,272,345,5,3.4,3.2,3.6),[[17.8,-8],[18,-1],[18.6,5],[20.6,8,1],[16,7.4],[12.6,6.4,1],[12,0],[11.6,-8],[11,-15],[8.6,-19.8],[4.8,-22.8],[0,-24,1]])),c.f,2)+lines(c.s,'M0 -29V-24M-3 -28.6C-9 -27 -13.6 -20 -14.6 -12C-15.4 -4 -15.2 2 -16.6 6.6M3 -28.6C9 -27 13.6 -20 14.6 -12C15.4 -4 15.2 2 16.6 6.6') },
  long:{ label:'Long straight', w:'long straight hair', dc:'black', lift:3,
    side:c=>fillP(blob([[5.2,13.6,1],[0.6,14.4],[-4.2,14.2],[-9,14.8],[-13.2,14,1],[-14,7],[-13.6,-1],[-12.8,-8.6]].concat(arc(SH,200,308,7,3.2,3.4,2),[[18.8,-20.4,1],[15,-20.4],[11.2,-19.8],[8.4,-16.8],[7,-11],[6.6,-3],[6.2,6]])),c.f)+lines(c.s,'M16 -26C10 -29 2 -27.6 -3 -22.6C-8.4 -17 -9.6 -8 -9.6 1C-9.6 6 -9.8 10 -10 13.4M10.6 -22C5 -22.4 0.6 -19 -1.4 -13.6C-3 -8 -3 0 -3.2 6.4C-3.2 9.4 -3.4 11.4 -3.6 13.2M2.4 -3.4V12.6'),
    front:c=>fillP(sym([[0,-30]].concat(arc(FH,272,345,5,3.2,3.2,3.6),[[17.8,-8],[18.4,0],[19.4,8],[20,15.4,1],[14,15.6,1],[12.8,8],[12,0],[11.6,-8],[11,-15],[8.6,-19.8],[4.8,-22.8],[0,-24,1]])),c.f,2)+lines(c.s,'M0 -29V-24M-3 -28.6C-9 -27 -13.6 -20 -14.6 -12C-15.6 -2 -16 6 -16.6 14.6M3 -28.6C9 -27 13.6 -20 14.6 -12C15.6 -2 16 6 16.6 14.6') },
  wavy:{ label:'Long wavy', w:'long wavy hair', dc:'blonde', lift:3.4,
    side:c=>fillP(blob([[4.6,14.6,1],[1.6,16],[-1.8,14.6],[-5.4,16.4],[-9.2,14.8],[-13,16.6,1],[-13.6,12],[-15.8,8],[-13.6,3.4],[-15.6,-1.6],[-13.4,-7]].concat(arc(SH,200,308,7,3.6,3.4,2),[[18.8,-20.4,1],[15,-20.4],[11.2,-19.8],[8.2,-16.6],[7.4,-11.6],[6,-6.6],[7.4,-1.4],[5.6,4],[7.2,9.4]])),c.f)+lines(c.s,'M16 -26C10 -29 2 -27.6 -3 -22.6C-8 -17.6 -9.2 -11 -8.4 -6C-7.6 -1 -10.6 3 -9.6 7.6C-8.8 11 -10.6 13 -9.6 15M10.6 -22C5 -22.4 0.6 -19 -1.4 -13.6C-2.4 -9 -1 -5 -2.4 -0.6C-3.6 3 -1.6 6.6 -2.8 10.6M2.6 -2C3.6 2 1.8 5.6 3 9.6'),
    front:c=>fillP(sym([[0,-30.4]].concat(arc(FH,272,345,5,3.6,3.6,3.8),[[17.6,-8],[19.8,-3],[17.8,2],[20.2,7.4],[18.4,12],[20.6,16.2,1],[16.4,15],[13.6,16.4,1],[14.4,11.6],[12.4,7],[13.6,2],[11.6,-3],[12,-9],[10.8,-15.6],[8.4,-20],[4.6,-22.8],[0,-24,1]])),c.f,2)+lines(c.s,'M0 -29.2V-24M-3 -28.8C-9 -27 -13.4 -20 -14.6 -12C-15.6 -6 -14 -2 -15.4 3C-16.6 7 -15 11 -16.6 15M3 -28.8C9 -27 13.4 -20 14.6 -12C15.6 -6 14 -2 15.4 3C16.6 7 15 11 16.6 15') },
  curls:{ label:'Curls', w:'curls', dc:'espresso', lift:3.6,
    side:c=>fillP(cloud([[5.8,-1,1],[1.4,1.6],[-3,2],[-7.4,1],[-11,-2],[-13,-6.6],[-13.6,-11.6]].concat(arc(SH,202,300,7,4.4,4,3.4),[[17.6,-25],[18.8,-21]]),[[15.4,-20.6],[12,-20.6],[9,-19],[7.6,-15],[7.2,-10],[7.2,-5]]),c.f)+coils(c,[[-8,-6],[-4,-12],[-9,-14],[0,-21],[5,-24.6],[11,-24],[-2,-2.6],[-6,-19.6],[2,-9]]),
    front:c=>fillP(symCloud([[0,-31.4]].concat(arc(FH,278,350,5,4.4,4.4,4),[[18.6,-8],[17.6,-3],[15.6,0.6]]),[[12.4,-0.6],[12,-6],[12,-12],[10.6,-17.6],[7.6,-20.4],[4,-21.6],[0,-21.8]]),c.f,2)+coils(c,[[-14,-4],[-13,-13],[-8,-23],[-2,-26.4],[5,-26],[10,-22],[13,-10],[-15,-9.4],[11,-3]]) },
  afro:{ label:'Afro', w:'afro', dc:'black', lift:8.6, tall:1,
    side:c=>fillP(cloud([[5,-1.4,1]].concat([105,123,141,159,177,195,213,231,249,267,285,303,318].map((a,i)=>P(a,18.6+(i%2?.8:0),4,-15.4))),[[16.8,-22.4],[12.6,-20.8],[9.2,-18.8],[7.6,-14],[7,-8],[6.2,-3.6]],.62),c.f)+coils(c,[[-10,-8],[-6,-16],[-12,-17],[-3,-25],[3,-29],[9,-28],[-1,-6],[-8,-25],[2,-14],[14,-26.8]]),
    front:c=>fillP(symCloud([0,15,30,45,60,75,90,105,120,135,150].map((a,i)=>P(a+270,21+(i%2?.8:0),0,-16)).map((p,i)=>i===0?[0,-37.6]:p),[[11.4,-2],[11.6,-9],[10.4,-16.4],[6.6,-20.4],[2.4,-21.8],[0,-21.9]],.62),c.f,2)+coils(c,[[-16,-8],[-14,-20],[-6,-30],[2,-32],[10,-28],[15,-16],[-17,0],[15,-4],[-9,-24],[7,-22]]) },
  ponytail:{ label:'Ponytail', w:'ponytail', dc:'brown', lift:1.2,
    side:c=>fillP(blob([[-6.6,-21.6],[-11,-22.4],[-16,-19],[-18.8,-12],[-19.2,-4],[-17.6,3],[-14.6,8,1],[-15.2,2.4],[-14.8,-4.6],[-13.2,-11],[-10,-15.2],[-6.4,-17.4]]),c.f)+lines(c.s,'M-11.6 -19.6C-15.4 -16.6 -17 -10 -16.8 -3C-16.6 1 -16 4 -15.4 6.4')+sleekSide(c)+tie(-6.6,-19.4,24),
    front:c=>sleekFront(c,0),
    fback:c=>fillP(blob([[11.6,-22],[16.6,-17.6],[18.8,-9],[18.4,0],[16,7,1],[15.4,0],[14.2,-8],[10.6,-14]]),c.f,2) },
  pigtails:{ label:'Twin ponytails', w:'twin ponytails', dc:'auburn', lift:1.5,
    side:c=>fillP(blob([[-5.2,-11.6],[-9.4,-12.4],[-13.4,-9],[-15,-3],[-14.4,3],[-12.4,7.4,1],[-11.6,2.6],[-11.2,-2.6],[-9.6,-6.8],[-5.8,-8.4]]),c.d)+fillP(blob([[-3.6,-10.4],[-7.6,-11],[-11.8,-7.4],[-13,-1.6],[-12,4.6],[-9.8,8.4,1],[-9.2,3.4],[-9,-1.6],[-7.6,-5.6],[-4,-7.4]]),c.f)+sleekSide(c)+tie(-4.4,-9.2,40),
    front:c=>{ const t=fillP(blob([[12,-12],[16.4,-12.6],[20.2,-9],[21.8,-3],[21,3],[19,7.6,1],[18.4,2.6],[17.6,-2.4],[16,-6.4],[12.6,-8]]),c.f,2)+tie(13.6,-10.4,-50); return t+flip(t)+sleekFront(c,1); } },
  bun:{ label:'Bun', w:'bun', dc:'black', lift:1.2, tall:1,
    side:c=>bunAt(c,-7.4,-24.8,6)+sleekSide(c)+lines(INK,'M-3.4 -21.8C-5.6 -19.2 -9.6 -18.8 -11.6 -20.6',1.4),
    front:c=>sleekFront(c,0),
    fback:c=>bunAt(c,0,-31.4,6.4) },
  braidbun:{ label:'Braided bun', w:'braided bun', dc:'espresso', lift:1.2, tall:1,
    side:c=>bunAt(c,-7.4,-24.8,6.4,1)+sleekSide(c),
    front:c=>sleekFront(c,0),
    fback:c=>bunAt(c,0,-31.6,6.8,1) },
  braid:{ label:'Single braid', w:'braid', dc:'brown', lift:1.2,
    side:c=>plait(c,[[-6.2,-9.6],[-8.8,-5.4],[-10.6,-0.8],[-11.6,3.8],[-12,8.4],[-11.8,12.6]],6.2)+sleekSide(c),
    front:c=>sleekFront(c,1)+plait(c,[[11.6,-7],[13.6,-3],[14.8,1.4],[15.4,5.8],[15.4,10.2],[15,14.2]],6) },
  braids:{ label:'Twin braids', w:'twin braids', dc:'black', lift:1.5,
    side:c=>plait({f:c.d,s:c.s},[[-5.8,-7.6],[-8.2,-3.6],[-9.8,0.8],[-10.6,5.2],[-10.8,9.6]],5.6)+sleekSide(c)+plait(c,[[1.2,-8.4],[0.6,-4.2],[0,0.2],[-0.4,4.6],[-0.6,9],[-0.6,13.2]],5.8),
    front:c=>{ const b=plait(c,[[12.2,-8.4],[13.4,-4.4],[14.2,-0.2],[14.6,4.2],[14.6,8.6],[14.4,12.8]],5.8); return sleekFront(c,1)+b+flip(b); } },
  fringe:{ label:'Fringe', w:'fringe', dc:'black', lift:2.6,
    side:c=>fillP(blob([C1(sp(145,.6))].concat(arc(SH,160,298,8,3,1,2.6),[[18.8,-25],[20.2,-21.6],[19.6,-19,1],[15.4,-18.8],[11.4,-19,1],[8.6,-16.6],[7,-12],[6.4,-6.6,1],[3,-7],[0,-5.2],[-2.6,-4.6]])),c.f)+lines(c.s,'M16 -26.6C11 -29 3 -27.6 -1.6 -23.2C-5 -19.6 -6.2 -14 -5.4 -8.6M17.6 -22.6L17.2 -19.6M14.6 -23.4L14.2 -19.4'),
    front:c=>fillP(sym([[0,-30]].concat(arc(FH,272,350,6,3,3,2.4),[[15.4,-9],[15,-6,1],[12.6,-7],[12.2,-12.4],[12,-18.4,1],[8,-19],[4,-19.2],[0,-19.2]])),c.f,2)+lines(c.s,'M-8 -23.6L-8.2 -19.6M-4 -24.4V-19.6M0 -24.6V-19.6M4 -24.4V-19.6M8 -23.6L8.2 -19.6') },
};
const MIG_HAIR={ short:'pixie', spiky:'pixie', tuft:'pixie', mohawk:'pixie' };   // styles from earlier versions

/* ---------- facial hair ----------
   Shaped beneath the bill and around the lower cheek; never near the eye. The bill is drawn again over it, and a
   moustache sits on the base of the bill. Uses the hair colour (brown when there is no hair). */
const FBEARD_TOP=[[-11.2,-10.4,1],[-9.6,-6.6],[-6,-3.4],[0,-2.6],[6,-3.4],[9.6,-6.6],[11.2,-10.4,1]];
const fbeard=(bottom)=>blob(FBEARD_TOP.concat(bottom));
const MO_SIDE=c=>fillP('M17.2 -9.8C19.4 -11.4 22.6 -11 24.4 -9.4C25.8 -8.6 27 -9.4 27.4 -11C28.8 -8.2 27 -6 24.2 -6.6C22.2 -7.2 20 -6.8 17.6 -6Z',c.f,2)+lines(c.s,'M19 -8.6C21 -9.4 22.6 -9 23.6 -8.2',.8);
const MO_FRONT=c=>fillP('M-9.6 -8.8C-6 -10.8 -2 -9.8 0 -8.6C2 -9.8 6 -10.8 9.6 -8.8C11 -9.2 11.8 -10.4 11.6 -12C13.2 -9 11.2 -6.4 8 -6.8C5 -7.2 2 -6.4 0 -6C-2 -6.4 -5 -7.2 -8 -6.8C-11.2 -6.4 -13.2 -9 -11.6 -12C-11.8 -10.4 -11 -9.2 -9.6 -8.8Z',c.f,2);
const BEARD={
  stubble:{ label:'Stubble', w:'stubble',
    side:c=>`<path d="M5.6 -9.6C9 -8.6 13 -8.2 16.6 -8.4C17.6 -6.4 18.2 -4.4 18.9 -2.6C16 -1.2 11.6 -1.2 8.4 -2.8C6.6 -3.8 5.4 -6 5.6 -9.6Z" fill="${c.f}" opacity=".32"/>${lines(c.d,[[7.4,-7],[9.6,-5.4],[12,-6.6],[13.4,-4],[15.6,-6],[16.6,-3.6],[10.4,-3.2],[7.6,-4.4],[14,-7.6],[11,-7.8]].map(([x,y])=>`M${x} ${y}h.01`).join(''),1.3)}`,
    front:c=>`<path d="${fbeard([[11,-6],[8.6,-1],[3.6,1.6],[0,2],[-3.6,1.6],[-8.6,-1],[-11,-6]])}" fill="${c.f}" opacity=".32"/>${lines(c.d,[[-9,-6],[-7,-3],[-4,-0.6],[0,0.4],[4,-0.6],[7,-3],[9,-6],[-10,-8.6],[10,-8.6],[-2,-1],[2,-1]].map(([x,y])=>`M${x} ${y}h.01`).join(''),1.3)}` },
  short:{ label:'Short beard', w:'short beard',
    side:c=>fillP(blob([[5,-10.6,1],[9.6,-8.2],[15.4,-7.8],[18.2,-5.4],[21.6,-3],[25.6,-2.6,1],[25,0.8],[21.6,3.2],[16,3.6],[10.6,1.6],[6.2,-2.2],[4.2,-6.6]]),c.f,2)+lines(c.s,'M9 -4.4C11.4 -1.6 15 0.4 19.6 0.4',.8),
    front:c=>fillP(fbeard([[12.2,-5.6],[9.4,1.2],[4,4.4],[0,5],[-4,4.4],[-9.4,1.2],[-12.2,-5.6]]),c.f,2)+lines(c.s,'M-6 0.6C-2.6 2.4 2.6 2.4 6 0.6',.8) },
  full:{ label:'Full beard', w:'full beard',
    side:c=>fillP(blob([[4.4,-11.6,1],[9.4,-8.4],[15.4,-7.8],[18.2,-5.4],[21.6,-3],[26.4,-2.8,1],[27.2,1.8],[25.4,6.6],[21,9.6],[15.4,9.2],[10.4,6],[6,1.4],[3.4,-4.4]]),c.f,2)+lines(c.s,'M8.4 -3C11 1 15.4 4.6 20.6 5.6M13.4 -2.4C15.6 0 18.6 1.6 22.4 2M21.6 7.6C23 6 24.2 4 24.6 1.6',.8),
    front:c=>fillP(fbeard([[13,-5],[11.6,2.4],[7.4,8.6],[2.6,10.8],[0,11],[-2.6,10.8],[-7.4,8.6],[-11.6,2.4],[-13,-5]]),c.f,2)+lines(c.s,'M-7 2C-5 6 -2.6 8 0 8.6C2.6 8 5 6 7 2M0 1.6V6.4',.8) },
  round:{ label:'Rounded beard', w:'rounded beard',
    side:c=>fillP(blob([[5,-10.6,1],[9.6,-8.2],[15.4,-7.8],[18.2,-5.4],[21.6,-3],[25.4,-2.6,1],[26.4,2.4],[24.4,7.4],[19.4,9.6],[14,8.4],[10,4.4],[6.4,-0.6],[4.4,-6]]),c.f,2)+lines(c.s,'M12.6 0.6C15 4 19 5.6 23 4.6',.8),
    front:c=>fillP(fbeard([[12.4,-5.4],[11.4,1.6],[7.6,7.2],[2.6,9.6],[0,9.8],[-2.6,9.6],[-7.6,7.2],[-11.4,1.6],[-12.4,-5.4]]),c.f,2)+lines(c.s,'M-5.6 3.6C-3 6 3 6 5.6 3.6',.8) },
  goatee:{ label:'Goatee', w:'goatee',
    side:c=>fillP(blob([[19.6,-3.6,1],[22.4,-2.6],[24.8,-2.6,1],[25,0.8],[23.6,4.4],[22.4,6.6,1],[20.8,3.4],[19.4,0]]),c.f,2),
    front:c=>fillP('M-3.6 -2.4C-1.4 -1.8 1.4 -1.8 3.6 -2.4C4.2 0.6 3 4.4 0 7.4C-3 4.4 -4.2 0.6 -3.6 -2.4Z',c.f,2) },
  moustache:{ label:'Moustache', w:'moustache', over:1,
    side:MO_SIDE, front:MO_FRONT },
  mobeard:{ label:'Moustache and beard', w:'moustache and beard', over:1,
    under:{ side:c=>BEARD.short.side(c), front:c=>BEARD.short.front(c) }, side:MO_SIDE, front:MO_FRONT },
};

/* ---------- headwear ----------
   Hats are drawn around x=0 with the brim near y=-24, then shifted onto the profile head (x=7) and raised by the
   hair's lift. Nothing here echoes a secret role (no detective hat, no doctor's cap): a costume must never read as
   a role. "tint" hats take the headwear colour. */
const HEAD={
  crown:{ label:'Crown', onTop:1, svg:()=>`<path d="M-11 -24L-12 -35L-5.5 -29L0 -37L5.5 -29L12 -35L11 -24Z" fill="${GOLD}" ${S}/><circle cx="0" cy="-37" r="1.8" fill="${GOLD}" ${S}/><path d="M-10 -26.5H10" stroke="${GOLDE}" stroke-width="1.4"/>` },
  cap:{ label:'Cap', tint:1, dc:'ink', svg:c=>`<path d="M-11 -22C-11 -36 11 -36 11 -22Z" fill="${c.f}" ${S}/><path d="M7 -23.5C13 -26 21 -25 24 -21.5C18 -20 12 -20 7 -21Z" fill="${c.f}" ${S}/><circle cx="0" cy="-35" r="1.6" fill="${GOLD}"/>`,
    front:c=>`<path d="M-12 -22C-12 -37 12 -37 12 -22Z" fill="${c.f}" ${S}/><path d="M0 -36.4V-23" stroke="${c.d}" stroke-width="1"/><path d="M-13 -22.6C-8 -25 8 -25 13 -22.6C9 -18.6 -9 -18.6 -13 -22.6Z" fill="${c.d}" ${S}/><circle cx="0" cy="-36.4" r="1.6" fill="${GOLD}"/>` },
  beanie:{ label:'Beanie', tint:1, dc:'slate', svg:c=>`<path d="M-12 -23C-12 -38 12 -38 12 -23Z" fill="${c.f}" ${S}/><path d="M-5 -35V-25M0 -36V-25M5 -35V-25" stroke="${INK}" stroke-width="1" opacity=".45"/><rect x="-13" y="-26" width="26" height="5.5" rx="2.2" fill="${c.f}" ${S}/><circle cx="0" cy="-38.5" r="3.4" fill="#fff" ${S}/>` },
  gradcap:{ label:'Graduation cap', svg:()=>`<path d="M-9 -27V-21C-3 -18 3 -18 9 -21V-27Z" fill="${INK}"/><path d="M-19 -29L0 -36L19 -29L0 -22Z" fill="${INK}" ${S}/><path d="M0 -29L-13 -26V-17" fill="none" stroke="${GOLD}" stroke-width="1.8" stroke-linecap="round"/><rect x="-14.6" y="-18" width="3.2" height="5" rx="1" fill="${GOLD}"/>` },
  sunhat:{ label:'Sun hat', tint:1, dc:'cream', svg:c=>`<path d="M-10 -24C-10.6 -35 10.6 -35 10 -24Z" fill="${c.f}" ${S}/><path d="M-9.8 -27.4C-3 -29 3 -29 9.8 -27.4V-24.6C3 -26 -3 -26 -9.8 -24.6Z" fill="${GOLD}" stroke="${INK}" stroke-width="1.4"/><path d="M-21 -23.4C-14 -27.6 14 -27.6 21 -23.4C14 -19.6 -14 -19.6 -21 -23.4Z" fill="${c.f}" ${S}/>` },
  beret:{ label:'Beret', tint:1, dc:'plum', svg:c=>`<path d="M-14 -24C-16 -33 9 -37 16 -28C13 -23.5 -8 -22 -14 -24Z" fill="${c.f}" ${S}/><path d="M1 -34.5L2 -37.5" ${S}/>` },
  partyhat:{ label:'Party hat', onTop:1, svg:()=>`<g transform="rotate(8)"><path d="M-9 -23L0 -45L9 -23Z" fill="#fff" ${S}/><path d="M-6 -30L4 -34M-3.5 -37L2.5 -40" stroke="${GOLD}" stroke-width="2" stroke-linecap="round"/><circle cx="0" cy="-45.5" r="2.4" fill="${GOLD}" ${S}/></g>` },
  tophat:{ label:'Top hat', svg:()=>`<rect x="-9" y="-42" width="18" height="18" rx="1.5" fill="${INK}" ${S}/><rect x="-9" y="-29" width="18" height="3.2" fill="${GOLD}"/><path d="M-15 -23.5C-8 -26.5 8 -26.5 15 -23.5C8 -21 -8 -21 -15 -23.5Z" fill="${INK}" ${S}/>` },
  chef:{ label:'Chef’s hat', svg:()=>`<circle cx="-7" cy="-34" r="6.5" fill="#fff" ${S}/><circle cx="7" cy="-34" r="6.5" fill="#fff" ${S}/><circle cx="0" cy="-38" r="7.5" fill="#fff" ${S}/><rect x="-10" y="-31" width="20" height="7" rx="1.5" fill="#fff" ${S}/><path d="M-4 -31V-26M4 -31V-26" stroke="${INK}" stroke-width="1" opacity=".4"/>` },
  astronaut:{ label:'Astronaut helmet', svg:()=>`<circle cx="3" cy="-12" r="20" fill="#dfe6ee" fill-opacity=".22" stroke="${INK}" stroke-width="2.4"/><path d="M-10 -24C-7 -28-2 -30 3 -30" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" opacity=".85"/><rect x="-11" y="4" width="26" height="5" rx="2.5" fill="${GOLD}" ${S}/>`,
    front:()=>`<circle cx="0" cy="-12" r="20" fill="#dfe6ee" fill-opacity=".22" stroke="${INK}" stroke-width="2.4"/><path d="M-12 -23C-9 -27.6 -4 -30 1 -30" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" opacity=".85"/><rect x="-13" y="4" width="26" height="5" rx="2.5" fill="${GOLD}" ${S}/>` },
};
/* Hijabs and the head wrap (in the headwear slot) cover the hair and are drawn under the glasses, the brows and the
   neck extras, so the face, the eye and the bill always stay visible. In profile the face opening follows the
   cheek from the chin up to the forehead, with an under-scarf band along its edge. */
const FACEHOLE='10 -1C5 -2.6 2 -6 1.4 -11C0.8 -16 2.6 -21.6 8.6 -25.4';   // the face opening, from the chin up to the forehead
const fold=(d,c)=>`<path d="${d}" fill="none" stroke="${c}" stroke-width="1.1" stroke-linecap="round" opacity=".6"/>`;
const band=c=>`<path d="M9.4 -24.2C4 -21 2.4 -16 2.8 -11C3.2 -6.6 5.6 -3.6 9.4 -2.2" fill="none" stroke="${c}" stroke-width="2.2" stroke-linecap="round"/>`;
const underband=c=>mix(c.f,'#ffffff',.55);
const HOLE_F='M0 -24.6C7 -24.6 11.4 -18.6 11.4 -11.6C11.4 -4 6.6 0.6 0 0.6C-6.6 0.6 -11.4 -4 -11.4 -11.6C-11.4 -18.6 -7 -24.6 0 -24.6Z';
const WRAPS={
  hijab:{ label:'Hijab', tint:1, dc:'sage', covers:1, ears:1,
    svg:c=>`<path d="M${P(-56,16.4,0,-13).join(' ')}A16.4 16.4 0 0 0 ${P(-196,16.4,0,-13).join(' ')}C-17 -1 -18.4 5 -20 10C-10 14.6 6 14.4 17 9.6C15 5 12.6 1.6 ${FACEHOLE}Z" fill="${c.f}" ${S}/>${band(underband(c))}${fold('M-2 -28.6C-9 -26 -13.4 -18 -13.6 -9M-15.4 -2C-10 2 -2 4 6 4.6M-6 7C1 9 8 8.6 13 7',c.d)}`,
    front:c=>`<path d="M0 -30.2C10.6 -30.2 17 -22 17 -12C17 -4 17.6 2.6 20.4 8.6C12 13 -12 13 -20.4 8.6C-17.6 2.6 -17 -4 -17 -12C-17 -22 -10.6 -30.2 0 -30.2Z${HOLE_F}" fill-rule="evenodd" fill="${c.f}" ${S}/><path d="${HOLE_F}" fill="none" stroke="${underband(c)}" stroke-width="1.8" transform="translate(0 -12) scale(1.08) translate(0 12)"/>${fold('M-14.6 -2C-12 3 -6 5.6 0 6M14.6 -2C12 3 6 5.6 0 6M-8 9C-3 10.6 3 10.6 8 9',c.d)}` },
  hijablong:{ label:'Long hijab', tint:1, dc:'ink', covers:1, ears:1,
    svg:c=>`<path d="M${P(-56,16.4,0,-13).join(' ')}A16.4 16.4 0 0 0 ${P(-196,16.4,0,-13).join(' ')}C-18.6 1 -21 10 -22.4 19C-8 23 10 22.6 23.6 17.4C21 9 15 2.4 ${FACEHOLE}Z" fill="${c.f}" ${S}/>${band(underband(c))}${fold('M-2 -28.6C-9 -26 -13.4 -18 -13.8 -8M-17 4C-16 10 -16.4 15 -17.6 19M-6 6C-5 12 -5.4 17 -6 21.4M7 6C8.4 11 9 16 9 21',lum(c.f)<.4?mix(c.f,'#ffffff',.35):c.d)}`,
    front:c=>`<path d="M0 -30.2C10.6 -30.2 17 -22 17 -12C17 -2 19 8 23.4 20.6C10 24.6 -10 24.6 -23.4 20.6C-19 8 -17 -2 -17 -12C-17 -22 -10.6 -30.2 0 -30.2Z${HOLE_F}" fill-rule="evenodd" fill="${c.f}" ${S}/><path d="${HOLE_F}" fill="none" stroke="${underband(c)}" stroke-width="1.8" transform="translate(0 -12) scale(1.08) translate(0 12)"/>${fold('M-15 2C-15.6 9 -17 15 -19 20M15 2C15.6 9 17 15 19 20M-6 6C-6 12 -6.6 17 -7.4 22M6 6C6 12 6.6 17 7.4 22',lum(c.f)<.4?mix(c.f,'#ffffff',.35):c.d)}` },
  hijabwrap:{ label:'Wrapped hijab', tint:1, dc:'clay', covers:1, ears:1,
    svg:c=>`<path d="M-11 -16C-20.6 -12 -23.6 0 -21 13C-18.6 12.4 -17 11 -16 9C-16 2 -14 -6 -9 -11Z" fill="${c.d}" ${S}/><path d="M${P(-56,16.4,0,-13).join(' ')}A16.4 16.4 0 0 0 ${P(-196,16.4,0,-13).join(' ')}C-16.6 -2 -16.8 3 -16.4 6.4C-6 10.4 6 10 15.4 6.6C13.6 3.6 12 1.2 ${FACEHOLE}Z" fill="${c.f}" ${S}/>${band(underband(c))}${fold('M7 -28C0 -25.4 -8 -18 -12.4 -9M-1 -29.6C-8 -28 -13 -22.6 -15 -15.6M-13 0C-6 4 4 5 12 3.4',c.d)}<circle cx="2.2" cy="-21.4" r="1.6" fill="${GOLD}" stroke="${INK}" stroke-width="1.2"/>`,
    front:c=>`<path d="M0 -30.2C10.6 -30.2 17 -22 17 -12C17 -5 16.6 0 18 5.6C10 9.6 -10 9.6 -18 5.6C-16.6 0 -17 -5 -17 -12C-17 -22 -10.6 -30.2 0 -30.2Z${HOLE_F}" fill-rule="evenodd" fill="${c.f}" ${S}/><path d="${HOLE_F}" fill="none" stroke="${underband(c)}" stroke-width="1.8" transform="translate(0 -12) scale(1.08) translate(0 12)"/><path d="M12 -6C18 -2 20 6 16.6 14C14 13.6 12.4 12.6 11.6 11C13.6 5 12.4 0 8.6 -3Z" fill="${c.d}" ${S}/>${fold('M-14.4 -20C-10 -26 -3 -28 4 -27.6M-15.6 -8C-12 -18 -4 -24.6 6 -26',c.d)}<circle cx="-11.6" cy="-20.6" r="1.6" fill="${GOLD}" stroke="${INK}" stroke-width="1.2"/>` },
  headwrap:{ label:'Head wrap', tint:1, dc:'slate', covers:1,
    svg:c=>`<path d="M${P(-48,16.6,0,-13).join(' ')}A16.6 16.6 0 0 0 ${P(-196,16.6,0,-13).join(' ')}C-15 -4 -12 -3.4 -10 -5.2C-6 -9 -2.6 -16 2.4 -20.4C4.6 -22.4 7.6 -24 ${P(-48,13.4,0,-13).join(' ')}Z" fill="${c.f}" ${S}/>${fold('M10 -27C2 -24 -6 -18 -12 -8.6M3 -29.6C-4 -27.6 -11 -21 -15 -13M-5 -29C-10 -26.6 -14.4 -22 -16.2 -17',underband(c))}<path d="M5.4 -29.6C2.6 -35 9.2 -37.6 10.4 -32.8C13.4 -36 18.2 -31.6 13.6 -28.6C11.6 -27.4 8 -27.6 5.4 -29.6Z" fill="${c.f}" ${S}/><path d="M9 -31.4C9.6 -30.4 10.4 -30 11.2 -30.2" fill="none" stroke="${INK}" stroke-width="1" opacity=".5"/>`,
    front:c=>`<path d="M-15.6 -10C-17.6 -20 -10 -30.6 0 -30.6C10 -30.6 17.6 -20 15.6 -10C13 -12.6 12 -15.6 11 -18.4C6 -21.4 -6 -21.4 -11 -18.4C-12 -15.6 -13 -12.6 -15.6 -10Z" fill="${c.f}" ${S}/>${fold('M-12 -16C-8 -24 2 -27 10 -24M-13.6 -12.6C-11 -20 -4 -24 4 -24.6M12 -16.6C10 -22 4 -26 -3 -27',underband(c))}<path d="M-5.4 -29C-8 -35 -1.6 -37.6 0 -33C1.6 -37.6 8 -35 5.4 -29C2.6 -27.4 -2.6 -27.4 -5.4 -29Z" fill="${c.f}" ${S}/>` },
};
for(const k in WRAPS) WRAPS[k].wrap=1;
Object.assign(HEAD,WRAPS);

/* ---------- eyewear ----------
   Each lens is drawn around the eye at (0,0). In profile an arm runs back to the side of the head; from the front
   the lenses are a touch smaller and joined by a bridge. */
const STAR='M0 -6L1.8 -2L6 -1.6L2.8 1.3L3.8 5.5L0 3.2L-3.8 5.5L-2.8 1.3L-6 -1.6L-1.8 -2Z';
const FACE={
  round:{ label:'Round glasses', hw:4.3, lens:()=>`<circle r="4.3" fill="#fff" fill-opacity=".18" stroke="${INK}" stroke-width="1.5"/>` },
  glasses:{ label:'Rectangular glasses', hw:5.2, lens:()=>`<rect x="-5.2" y="-3.6" width="10.4" height="7" rx="1.6" fill="#fff" fill-opacity=".18" stroke="${INK}" stroke-width="1.5"/>` },
  sunglasses:{ label:'Sunglasses', hw:5.8, lens:()=>`<rect x="-6" y="-4.5" width="11.5" height="8" rx="3.5" fill="${INK}"/><path d="M-3.5 -2.5L-1 -3.2" stroke="#fff" stroke-width="1.2" stroke-linecap="round" opacity=".8"/>` },
  star:{ label:'Star glasses', hw:5.6, lens:()=>`<path d="${STAR}" fill="${GOLD}" fill-opacity=".55" stroke="${INK}" stroke-width="1.3" stroke-linejoin="round"/>` },
  monocle:{ label:'Monocle', one:1, hw:4, lens:()=>`<circle r="4" fill="#fff" fill-opacity=".18" stroke="${GOLD}" stroke-width="1.6"/><path d="M-2.5 3.4C-4 8 -2 11 -5 14" fill="none" stroke="${GOLDE}" stroke-width="1" stroke-linecap="round"/>` },
  pirate:{ label:'Pirate patch', one:1, hw:4.6, lens:()=>`<ellipse rx="4.6" ry="4.2" fill="${INK}"/>`,
    side:()=>`<path d="M-5 -24L${EYE.x+6} ${EYE.y+3}" stroke="${INK}" stroke-width="1.6"/>`, front:()=>`<path d="M-12.6 -21L12.6 -9.6" stroke="${INK}" stroke-width="1.6"/>` },
  sleepmask:{ label:'Sleep mask', mask:1,
    side:()=>`<path d="M-6 ${EYE.y-4}L${EYE.x+5} ${EYE.y-4.5}C${EYE.x+7} ${EYE.y-1} ${EYE.x+7} ${EYE.y+2} ${EYE.x+5} ${EYE.y+4}L-6 ${EYE.y+3.5}Z" fill="${GREY}" ${S}/><path d="M${EYE.x-3} ${EYE.y}C${EYE.x-1.5} ${EYE.y+1.6} ${EYE.x+1} ${EYE.y+1.6} ${EYE.x+2.5} ${EYE.y}" fill="none" stroke="${GOLD}" stroke-width="1.6" stroke-linecap="round"/>`,
    front:()=>`<path d="M-13 -19.4C-6 -21 6 -21 13 -19.4C13.6 -16 13.6 -13.6 13 -11.4C6 -10 1.6 -12 0 -12.6C-1.6 -12 -6 -10 -13 -11.4C-13.6 -13.6 -13.6 -16 -13 -19.4Z" fill="${GREY}" ${S}/><path d="M-8 -15.4C-6.6 -13.6 -4 -13.6 -2.6 -15.4M2.6 -15.4C4 -13.6 6.6 -13.6 8 -15.4" fill="none" stroke="${GOLD}" stroke-width="1.6" stroke-linecap="round"/>` },
};
function eyewear(f,front){
  if(f.mask) return front?f.front():f.side();
  if(!front) return `${f.side?f.side():''}${f.one?'':`<path d="M${EYE.x-f.hw} ${EYE.y-1.5}H-6" stroke="${INK}" stroke-width="1.5" stroke-linecap="round"/>`}<g transform="translate(${EYE.x} ${EYE.y})">${f.lens()}</g>`;
  const k=.86, L=x=>`<g transform="translate(${x} -15.2) scale(${k})">${f.lens()}</g>`;
  if(f.one) return `${f.front?f.front():''}${L(5.3)}`;
  const e=f2(5.3-f.hw*k);
  return `<path d="M${-e} -15.8Q0 -17.4 ${e} -15.8" fill="none" stroke="${INK}" stroke-width="1.4" stroke-linecap="round"/><path d="M${f2(-5.3-f.hw*k)} -16H-13.2M${f2(5.3+f.hw*k)} -16H13.2" stroke="${INK}" stroke-width="1.4" stroke-linecap="round"/>${L(-5.3)}${L(5.3)}`; }

/* ---------- expressions ----------
   They change only the brow and lid around each eye (drawn at (0,0); +x is towards the bill or the middle of the
   face). They hide while a game shows a state on the eye (accused, cleared) so a costume never looks like an outcome. */
const EXPR={
  cheerful:{ label:'Cheerful', r:()=>`<path d="M-3.5 -5.2Q0 -7.8 3.6 -5.6" fill="none" stroke="${INK}" stroke-width="1.5" stroke-linecap="round"/><ellipse cx="2.5" cy="5.4" rx="2.6" ry="1.4" fill="${GOLD}" opacity=".45"/>` },
  sleepy:{ label:'Sleepy', r:()=>`<path d="M-2.8 -0.2C-2.6 -4 2.6 -4 2.8 -0.2Z" fill="${BODY}"/><path d="M-3 -0.2H3" stroke="${INK}" stroke-width="1.3" stroke-linecap="round"/>` },
  grumpy:{ label:'Grumpy', r:()=>`<path d="M-3.8 -6.4L3.4 -3.8" stroke="${INK}" stroke-width="1.8" stroke-linecap="round"/>` },
  worried:{ label:'Worried', r:()=>`<path d="M-3.6 -3.8L3.4 -6.4" stroke="${INK}" stroke-width="1.6" stroke-linecap="round"/>` },
  cool:{ label:'Cool', r:()=>`<path d="M-3 -0.8C-2.8 -3.6 2.8 -3.6 3 -0.8Z" fill="${BODY}"/><path d="M-3.2 -0.8H3.2" stroke="${INK}" stroke-width="1.3" stroke-linecap="round"/><path d="M-3.4 -5.6Q0 -6.8 3.4 -6" fill="none" stroke="${INK}" stroke-width="1.4" stroke-linecap="round"/>` },
};
const exprSvg=(e,front)=>front?`<g transform="translate(-5.3 -15.2) scale(.95)">${e.r()}</g><g transform="translate(5.3 -15.2) scale(-.95 .95)">${e.r()}</g>`:`<g transform="translate(${EYE.x} ${EYE.y})">${e.r()}</g>`;

/* ---------- reactions ----------
   Five passing moods a player can show during a match: the face does the work (eyes, brows, beak), and the body only
   supports it (a bounce, a dip, a recoil, a tilt, a nod; see the CSS below). They are drawn with the duck itself, in
   the same slots as the expressions above, so hair, beards, glasses, hats and colours all stay exactly as they are:
   the eyes and brows sit under the eyewear and the headwear, and an open beak opens over a beard (it is part of the
   bill, which a beard always tucks under) and under a moustache.
   svg(duck, {moods:true}) includes every mood, hidden; a parent .pd with data-mood="happy" shows that one and hides
   the resting eye and the duck's own expression, so changing mood never redraws the duck. Profile view only. */
const MOUTH=`<path d="M246 128C256 140 278 142 289 131C291 146 280 156 264 156C252 155 245 146 246 128Z" fill="${INK}"/>`;
const JAW=`<path d="M249 142C260 151 278 150 287 143C287 155 276 163 263 163C253 162 247 154 249 142Z" fill="${GOLD}" stroke="${INK}" stroke-width="7" stroke-linejoin="round"/>`;
const BEAK={
  open:`<g transform="${DUCK_T}">${MOUTH}${JAW}${BILL}</g>`,
  wide:`<g transform="${DUCK_T}"><path d="M246 128C256 142 280 144 290 131C293 154 281 172 264 172C250 171 244 156 246 128Z" fill="${INK}"/><g transform="translate(0 13)">${JAW}</g>${BILL}</g>`,
  smirk:`<path d="M18.4 -6.2Q20.4 -4.6 22.8 -6.4" fill="none" stroke="${INK}" stroke-width="1.3" stroke-linecap="round"/>`,
};
const L=(d,w)=>`<path d="${d}" fill="none" stroke="${INK}" stroke-width="${w||1.7}" stroke-linecap="round" stroke-linejoin="round"/>`;
/* a brow keeps a thin cream edge, so it still reads where it crosses dark hair */
const LB=(d,w)=>`<path d="${d}" fill="none" stroke="${BODY}" stroke-width="${(w||1.7)+1}" stroke-linecap="round" stroke-linejoin="round"/>`+L(d,w);
const BLUSH=`<ellipse cx="3.4" cy="4.8" rx="2.7" ry="1.5" fill="${GOLD}" opacity=".5"/>`;
const MOODS={
  happy:{ label:'Happy', beak:'open', eye:()=>L('M-3 1.3Q0 -3.6 3 1.3',2.1)+BLUSH, brow:()=>LB('M-3.2 -5.4Q0 -7.6 3.2 -5.8',1.7) },
  frustrated:{ label:'Frustrated', eye:()=>`<path d="M-2.7 -0.9L2.7 0.5L2.5 1.5Q0 3.6 -2.5 1.5Z" fill="${INK}"/>`, brow:()=>LB('M-3.6 -4.6L3.6 -1.9',2.3) },
  surprised:{ label:'Surprised', beak:'wide', eye:()=>`<circle r="3.5" fill="#fffdf6" stroke="${INK}" stroke-width="1.3"/><circle cx=".5" cy=".2" r="1.8" fill="${INK}"/><circle cx="1.1" cy="-.6" r=".55" fill="#fffdf6"/>`, brow:()=>LB('M-3.4 -6.9Q0 -9.6 3.4 -7.3',1.8) },
  cheeky:{ label:'Cheeky', beak:'smirk', eye:()=>L('M-3 -0.2Q0 2.6 3 -0.2',2.1), brow:()=>LB('M-3.4 -4.4L0.8 -7L3.8 -6.2',1.8) },
  nod:{ label:'Good move', eye:()=>`<path d="M-2.5 1C-2.5 -2.9 2.5 -2.9 2.5 1Q0 -.5 -2.5 1Z" fill="${INK}"/><circle cx=".9" cy="-1" r=".6" fill="#fffdf6"/>`+BLUSH, brow:()=>LB('M-3 -5.4Q0 -7.2 3 -5.8',1.7) },
};
/* behind glasses the brows move up to sit just above the frames, where they can still be read */
const moodFace=(k,lift)=>`<g class="pd-mood" data-m="${k}"><g transform="translate(${EYE.x} ${EYE.y}) scale(1.18)">${MOODS[k].eye()}<g transform="translate(0 ${-(lift||0)})">${MOODS[k].brow()}</g></g></g>`;
const moodBeak=(k,over)=>MOODS[k].beak&&MOODS[k].beak!=='smirk'?`<g class="pd-mood" data-m="${k}">${BEAK[MOODS[k].beak]}${over||''}</g>`:'';   // over: a moustache, which stays on top of the bill
const moodOver=k=>MOODS[k].beak==='smirk'?`<g class="pd-mood" data-m="${k}">${BEAK.smirk}</g>`:'';

/* ---------- around the neck, and extras ---------- */
const NECK={
  bowtie:{ label:'Bow tie', tint:1, dc:'gold', side:c=>`<g transform="translate(15 1) rotate(-12)"><path d="M0 0L-6.5 -4V4Z" fill="${c.f}" ${S}/><path d="M0 0L6.5 -4V4Z" fill="${c.f}" ${S}/><circle cx="0" cy="0" r="2" fill="${c.d}" ${S}/></g>`,
    front:c=>`<g transform="translate(0 1.4)"><path d="M0 0L-7 -4.4V4.4Z" fill="${c.f}" ${S}/><path d="M0 0L7 -4.4V4.4Z" fill="${c.f}" ${S}/><circle r="2.1" fill="${c.d}" ${S}/></g>` },
  scarf:{ label:'Scarf', tint:1, dc:'clay', side:c=>`<path d="M-7 -6C1 -1 11 0 19.5 -3.2L20.5 1.5C11 5 0 4 -7.5 -1Z" fill="${c.f}" ${S}/><path d="M-4 -2L-7.5 9L-2.5 9.6L0 0" fill="${c.f}" ${S}/><path d="M-6.4 5.5H-2" stroke="${INK}" stroke-width="1" opacity=".5"/>`,
    front:c=>`<path d="M-15.6 -2.4C-6 1.6 6 1.6 15.6 -2.4L16.4 2.4C6 6.6 -6 6.6 -16.4 2.4Z" fill="${c.f}" ${S}/><path d="M6 4.4L5 15.6L10.4 15L10.6 3.6" fill="${c.f}" ${S}/><path d="M5.4 11.6H10.4" stroke="${INK}" stroke-width="1" opacity=".5"/>` },
  tie:{ label:'Tie', tint:1, dc:'ink', side:c=>`<path d="M14 -0.5L18 -0.8L17 2.6L15 2.7Z" fill="${c.f}" ${S}/><path d="M15 2.6L17 2.5L18.6 12L16 15L13.8 12.2Z" fill="${c.f}" ${S}/>`,
    front:c=>`<path d="M-2.4 -0.6H2.4L1.6 2.8H-1.6Z" fill="${c.f}" ${S}/><path d="M-1.6 2.8H1.6L3.2 12.6L0 16L-3.2 12.6Z" fill="${c.f}" ${S}/>` },
  bandana:{ label:'Bandana', tint:1, dc:'slate', side:c=>`<path d="M5 -1.5C10 0.5 16 0.5 20.5 -2.2L14.5 9Z" fill="${c.f}" ${S}/><circle cx="12" cy="1.8" r=".9" fill="#fff"/><circle cx="15.5" cy="1.2" r=".9" fill="#fff"/><circle cx="13.8" cy="4.8" r=".9" fill="#fff"/>`,
    front:c=>`<path d="M-11 -1C-4 2 4 2 11 -1L0 11.6Z" fill="${c.f}" ${S}/><circle cx="-3" cy="2.6" r=".9" fill="#fff"/><circle cx="3" cy="2.6" r=".9" fill="#fff"/><circle cx="0" cy="6.4" r=".9" fill="#fff"/>` },
  beads:{ label:'Necklace', side:()=>`${[[-4,-2.5],[0,0],[4,1.6],[8,2.4],[12,2.2],[16,0.8]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="1.9" fill="${GOLD}" stroke="${INK}" stroke-width="1"/>`).join('')}`,
    front:()=>`${[[-12,-0.6],[-8,2],[-4,3.4],[0,3.9],[4,3.4],[8,2],[12,-0.6]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="1.9" fill="${GOLD}" stroke="${INK}" stroke-width="1"/>`).join('')}` },
};
const FLOWER=`${[0,72,144,216,288].map(a=>`<ellipse cx="0" cy="-4.6" rx="3" ry="4.2" transform="rotate(${a})" fill="#fff" ${S}/>`).join('')}<circle r="3" fill="${GOLD}" ${S}/>`;
const ACC={
  headphones:{ label:'Headphones', tint:1, dc:'gold', lifts:1,
    side:c=>`<path d="M-2 -12C-5 -35 19 -38 20 -22" fill="none" stroke="${INK}" stroke-width="3.2" stroke-linecap="round"/><rect x="-4" y="-17" width="8" height="12" rx="3.5" fill="${c.f}" ${S}/>`,
    front:c=>`<path d="M-14.6 -14C-16 -34 16 -34 14.6 -14" fill="none" stroke="${INK}" stroke-width="3.2" stroke-linecap="round"/><rect x="-18.6" y="-19" width="6.6" height="12" rx="3" fill="${c.f}" ${S}/><rect x="12" y="-19" width="6.6" height="12" rx="3" fill="${c.f}" ${S}/>` },
  flower:{ label:'Flower', lifts:1, side:()=>`<g transform="translate(1 -24)">${FLOWER}</g>`, front:()=>`<g transform="translate(-9 -24)">${FLOWER}</g>` },
  earrings:{ label:'Small earrings', side:()=>`<circle cx="3.2" cy="-5.4" r="1.1" fill="${GOLD}" stroke="${INK}" stroke-width=".9"/><circle cx="3.2" cy="-2.2" r="1.7" fill="none" stroke="${GOLD}" stroke-width="1.2"/>`,
    front:()=>[-13.2,13.2].map(x=>`<circle cx="${x}" cy="-6.4" r="1.1" fill="${GOLD}" stroke="${INK}" stroke-width=".9"/><circle cx="${x}" cy="-3.2" r="1.7" fill="none" stroke="${GOLD}" stroke-width="1.2"/>`).join('') },
};

/* ---------- what goes with what ----------
   The first slot of each rule wins when a saved duck breaks it; in the creator the choice just made wins and the
   other item comes off, with a note that says why. */
const NECK_UNDER={ scarf:1, bandana:1 };
const art=w=>(/^[aeiou]/i.test(w)?'An ':'A ')+w;
const RULES=[
  { a:'head', b:'hair', bad:h=>!!HEAD[h].wrap, why:h=>`${art(lw('head',h))} covers the hair`, tuck:1 },
  { a:'head', b:'hair', bad:(h,r)=>!HEAD[h].wrap&&!HEAD[h].onTop&&!!HAIR[r].tall, why:(h,r)=>`${art(lw('head',h))} doesn’t fit over the ${lw('hair',r)}` },
  { a:'head', b:'neck', bad:(h,n)=>!!HEAD[h].ears&&!!NECK_UNDER[n], why:h=>`${art(lw('head',h))} already wraps the neck` },
  { a:'head', b:'acc', bad:(h,x)=>!!HEAD[h].ears&&x==='earrings', why:h=>`${art(lw('head',h))} covers the ears` },
  { a:'head', b:'acc', bad:(h,x)=>h==='astronaut'&&x==='headphones', why:()=>'Headphones don’t fit inside a helmet' },
];
const TABLES={ head:HEAD, hair:HAIR, beard:BEARD, face:FACE, expr:EXPR, neck:NECK, acc:ACC };
const KEYS=['head','hair','beard','face','expr','neck','acc'];
const lw=(k,v)=>{ const o=TABLES[k]&&own(TABLES[k],v)&&TABLES[k][v]; return o?(o.w||o.label.toLowerCase()):''; };
function fits(hat,hair){ return !own(HEAD,hat)||!own(HAIR,hair)||!RULES.slice(0,2).some(r=>r.bad(hat,hair)); }
function fitsNeck(hat,neck){ return !own(HEAD,hat)||!own(NECK,neck)||!RULES[2].bad(hat,neck); }
/* Any saved or received duck goes through here: unknown values are dropped, older styles are mapped to today's. */
function clean(d){ d=d&&typeof d==='object'?d:{}; const o={}, raw={};
  for(const k of KEYS) raw[k]=d[k];
  if(own(MIG_HAIR,raw.hair)) raw.hair=MIG_HAIR[raw.hair];
  if(raw.head==='rainhat') raw.head='sunhat';
  if(raw.head==='headphones'||raw.head==='flower'){ if(!own(ACC,raw.acc)) raw.acc=raw.head; raw.head=''; }
  for(const k of KEYS) o[k]=own(TABLES[k],raw[k])?raw[k]:'';
  for(const k in COLS) o[k]=own(COLS[k],d[k])?d[k]:'';
  for(const r of RULES) if(o[r.a]&&o[r.b]&&r.bad(o[r.a],o[r.b])) o[r.b]='';
  return o; }
/* d is the duck before the change, k|v the choice: returns the new duck and, when something else came off, why */
function adjust(d,k,v){ const t=clean(d); if(!own(TABLES,k)) return {duck:t,note:''}; t[k]=own(TABLES[k],v)?v:''; let note='';
  for(const r of RULES){ if(!t[r.a]||!t[r.b]||!r.bad(t[r.a],t[r.b])) continue;
    const off=k===r.b?r.a:r.b, why=r.why(t[r.a],t[r.b]), hw=lw('hair',t.hair);
    note+=(note?' ':'')+(r.tuck&&off==='hair'?`${why}, so the ${hw} ${/s$/.test(hw)?'are':'is'} tucked away.`:r.tuck?`${why}, so the ${lw('head',t.head)} came off to show the ${hw}.`:`${why}, so the ${lw(off,t[off])} came off.`);
    t[off]=''; }
  return {duck:clean(t),note}; }
const word=(k,v)=>lw(k,v);
/* the items a choice would take off, in words ("long hair and scarf"), for the option buttons */
const clears=(d,k,v)=>{ d=clean(d); const t=adjust(d,k,v).duck; return KEYS.filter(x=>x!==k&&d[x]&&!t[x]).map(x=>word(x,d[x])).join(' and '); };
const hairWord=h=>lw('hair',h);

/* ---------- drawing a duck ---------- */
const HEADX='translate(7 0)';   // hats were drawn around x=0; the profile head is centred at x=7
const MASK=`<g class="pd-mask"><path d="M${EYE.x-8} ${EYE.y-4}C${EYE.x-3} ${EYE.y-7} ${EYE.x+4} ${EYE.y-7} ${EYE.x+7} ${EYE.y-3}C${EYE.x+7} ${EYE.y+3} ${EYE.x+2} ${EYE.y+5} ${EYE.x-2} ${EYE.y+3}C${EYE.x-5} ${EYE.y+2} ${EYE.x-8} ${EYE.y+1} ${EYE.x-8} ${EYE.y-4}Z" fill="${INK}" stroke="${GOLD}" stroke-width="1.6"/><circle cx="${EYE.x}" cy="${EYE.y-1}" r="2.1" fill="${GOLD}"/></g>`;
const PENCIL=`<g class="pd-pencil" transform="translate(6 12) rotate(-58)"><rect x="-2.2" y="-12" width="4.4" height="17" rx="1" fill="${GOLD}" ${S}/><path d="M-2.2 5L0 10L2.2 5Z" fill="${BODY}" ${S}/></g>`;
const ENV=`<g class="pd-env"><rect x="-4" y="16" width="20" height="13" rx="2" fill="#fff" ${S}/><path d="M-4 17L6 24L16 17" fill="none" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/></g>`;
const SPOT=`<ellipse class="pd-spot" cx="0" cy="29" rx="30" ry="5" fill="${GOLD}" opacity=".55"/>`;
const SHADOW=`<ellipse class="pd-shadow" cx="0" cy="28" rx="26" ry="3" fill="#000" opacity=".16"/>`;
const VIEWBOX={ full:'-34 -48 68 82', bust:'-25 -47 54 66', face:'-12 -33 38 32', match:'-26 -47 60 76', mug:'-9 -37 42 43' }, VIEWBOX_F={ full:'-34 -48 68 82', bust:'-27 -47 54 66', face:'-19 -32 38 32' };

/* The bare duck for illustrations: (x,y) is the point it rests on, s the scale (1 = about 69 units wide),
   dir -1 faces left. o.surprise widens the eye, o.wing raises the wing, o.relief closes the eye. */
const DUCK_FIG=DUCK.replace('stroke-width="9"','stroke-width="12"').replace('stroke-width="7"','stroke-width="9"');   // drawn smaller in the cards, so a touch more ink
function figure(x,y,s,dir,o,cls){ o=o||{}; const k=1.15*(s||1);
  const st=(o.surprise?'accused ':'')+(o.wing?'ready ':'')+(o.relief?'cleared ':'');
  return `<g class="pd pd-fig ${st}${cls||''}" transform="translate(${x} ${y}) scale(${(dir||1)*k} ${k}) translate(0 -26.5)">${DUCK_FIG}</g>`; }

const colOf=(k,v,dflt)=>tone((COLS[k][v]||COLS[k][dflt]||[GREY])[0]);
function svg(duck,opts){
  opts=opts||{}; const d=clean(duck), F=opts.view==='front';
  const H=HAIR[d.hair], B=BEARD[d.beard], h=HEAD[d.head], g=FACE[d.face], e=EXPR[d.expr], n=NECK[d.neck], x=ACC[d.acc];
  const hc=colOf('hc',d.hc,H?H.dc:'brown'), ac=h&&h.tint?colOf('ac',d.ac,h.dc):null, nc=colOf('nc',d.nc,n&&n.dc||'gold'), xc=colOf('nc',d.nc,x&&x.dc||'gold');
  const lift=H&&!(h&&h.wrap)?H.lift:0;
  const hk=f2(1+lift*.045), hat=h?`<g transform="${F?'':HEADX}${lift?` translate(0 ${-lift}) translate(0 -24) scale(${hk}) translate(0 24)`:''}">${F&&h.front?h.front(ac):h.svg(ac)}</g>`:'';
  const back=H&&(F?H.fback:H.back), hairBack=back?`<g class="pd-rim">${back(hc)}</g>`:'';
  const hairFront=H?`<g class="pd-rim">${F?H.front(hc):H.side(hc)}</g>`:'';
  const bd=B&&(F?B.front:B.side), beard=B?`<g class="pd-beard">${B.under?(F?B.under.front(hc):B.under.side(hc)):''}${B.over?'':bd(hc)}${F?FBILL:BILL_OVER}${B.over?bd(hc):''}</g>`:'';
  const acc=x?`<g${x.lifts&&lift?` transform="translate(0 ${-lift})"`:''}>${F?x.front(xc):x.side(xc)}</g>`:'';
  const vb=(F?VIEWBOX_F:VIEWBOX)[opts.crop]||VIEWBOX.full, M=opts.moods&&!F?Object.keys(MOODS):[];
  return `<svg class="pd-svg${F?' pd-svg-front':''}" viewBox="${vb}" aria-hidden="true" focusable="false">${opts.crop?'':SPOT+SHADOW}${hairBack}${F?FDUCK+FBILL:DUCK}${h&&h.wrap?`<g class="pd-rim">${hat}</g>`:''}${hairFront}${beard}${M.map(k=>moodBeak(k,B&&B.over?bd(hc):'')).join('')}${e?`<g class="pd-expr">${exprSvg(e,F)}</g>`:''}${M.map(k=>moodFace(k,g&&!g.mask?2.4:0)+moodOver(k)).join('')}${n?(F?n.front(nc):n.side(nc)):''}${x&&!x.lifts?acc:''}${g?eyewear(g,F):''}${h&&!h.wrap?`<g class="pd-rim">${hat}</g>`:''}${x&&x.lifts?acc:''}${F||opts.crop?'':MASK+PENCIL+ENV}</svg>`;
}
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function describe(duck){ const d=clean(duck), e=EXPR[d.expr], parts=[];
  if(d.hair) parts.push((d.hc?HCOL[d.hc][1].toLowerCase()+' ':'')+lw('hair',d.hair));
  for(const k of ['beard','head','face','neck','acc']) if(d[k]) parts.push(lw(k,d[k]));
  return (e?e.label.toLowerCase()+' ':'')+(parts.length?'duck with '+parts.join(', '):'plain duck'); }
/* p = {nick, duck, badge}; opts = {cls, size:'xs'|'sm'|'md'|'lg'|'xl', name:true, sub:'…html', view, crop, moods:true (draw
   the reaction moods, for data-mood on the .pd), mood:'happy' (show one from the start)} */
function html(p,opts){
  p=p||{}; opts=opts||{};
  const badge=p.badge?`<b class="pd-badge" aria-label="number ${p.badge}">${p.badge}</b>`:'';
  const mood=opts.mood&&MOODS[opts.mood]?` data-mood="${opts.mood}"`:'';
  const av=`<span class="pd pd-${opts.size||'md'} ${opts.cls||''}"${mood} role="img" aria-label="${esc((p.nick||'Duck')+', '+describe(p.duck))}">${svg(p.duck,{view:opts.view,moods:opts.moods||!!mood,crop:opts.crop})}${badge}</span>`;
  if(!opts.name) return av;
  return `<span class="pdn ${opts.wrap||''}">${av}<span class="pdn-name" dir="auto">${esc(p.nick||'Duck')}</span>${opts.sub?`<span class="pdn-sub">${opts.sub}</span>`:''}</span>`;
}
const SLOTS=[['hair','Hair',HAIR],['beard','Facial hair',BEARD],['head','Headwear',HEAD],['face','Eyewear',FACE],['expr','Expression',EXPR],['neck','Around the neck',NECK],['acc','Extras',ACC]];
const OPTIONS={}; for(const [k,,T] of SLOTS) OPTIONS[k]=[['','None']].concat(Object.entries(T).map(([v,o])=>[v,o.label]));
const pick=a=>a[Math.floor(Math.random()*a.length)];
function random(){ const K=k=>Object.keys(TABLES[k]), c=Object.keys(ACOL), d={
    hair:Math.random()<.78?pick(K('hair')):'', hc:pick(Object.keys(HCOL)), beard:Math.random()<.18?pick(K('beard')):'',
    head:Math.random()<.5?pick(K('head')):'', ac:pick(c), face:Math.random()<.3?pick(K('face')):'', expr:Math.random()<.55?pick(K('expr')):'',
    neck:Math.random()<.35?pick(K('neck')):'', nc:pick(c), acc:Math.random()<.25?pick(K('acc')):'' };
  if(d.head&&d.hair&&!fits(d.head,d.hair)) d.head='';   // keep the hair; drop the hat it would clash with
  return clean(d); }

/* ---------- the creator ----------
   One large live preview (it blinks and bobs; side or front view) beside the tabs on a wide screen, above them on a
   phone. Every option tile shows YOUR duck wearing it. Browsing changes only the draft: the saved duck changes on
   "Save duck", Reset goes back to it and Undo steps back one change. The page passes save/cancel callbacks; the
   creator redraws itself in place, so the page doesn't need to. */
const TABS=[['hair','Hair',['hair'],'hc'],['beard','Facial hair',['beard'],'hc'],['head','Headwear',['head'],'ac'],['face','Eyewear',['face']],['expr','Expression',['expr']],['acc','Accessories',['neck','acc'],'nc']];
const GROUP={ neck:'Around the neck', acc:'Extras' }, COLNAME={ hc:'Hair colour', ac:'Headwear colour', nc:'Accessory colour' };
const CROP={ hair:'bust', beard:'bust', head:'bust', face:'face', expr:'face', acc:'' };
const same=(a,b)=>JSON.stringify(clean(a))===JSON.stringify(clean(b));
const REG={};
/* isSaved: whether the duck passed in is one the player already saved (false for a fresh random duck) */
function newCreator(duck,nick,isSaved){ const d=clean(duck); return { saved:d, draft:d, tab:'hair', view:'side', hist:[], note:'', nick:nick||'', confirm:false, kept:isSaved!==false }; }
function colourUse(k,d){ if(k==='hc') return d.hair&&!HAIR[d.hair].nocol?HAIR[d.hair].dc:d.beard?'brown':'';
  if(k==='ac') return d.head&&HEAD[d.head].tint?HEAD[d.head].dc:'';
  const n=NECK[d.neck], x=ACC[d.acc]; return n&&n.tint?n.dc:x&&x.tint?x.dc:''; }
function creatorInner(id,st,o){
  const d=st.draft, dirty=!same(d,st.saved), T=TABS.find(t=>t[0]===st.tab)||TABS[0], E=esc;
  const tabs=TABS.map(([k,l,slots])=>{ const on=k===T[0], set=slots.some(s=>d[s]); return `<button type="button" role="tab" id="pdcr-${id}-t-${k}" aria-selected="${on}" tabindex="${on?0:-1}" data-pdcr="tab" data-v="${k}">${E(l)}${set?'<i aria-hidden="true"></i>':''}</button>`; }).join('');
  const groups=T[2].map(slot=>{ const opts=OPTIONS[slot].map(([v,l])=>{ const on=d[slot]===v, t=adjust(d,slot,v).duck, off=on?'':clears(d,slot,v), pic=svg(t,{crop:CROP[T[0]],view:st.view});
      return `<button type="button" class="pdcr-opt" aria-pressed="${on}" data-pdcr="set" data-k="${slot}" data-v="${v}">${v?pic:`<span class="pdcr-none" aria-hidden="true">${pic}</span>`}<span class="pdcr-ol">${E(l)}</span>${off?`<small>Takes off the ${E(off)}</small>`:''}</button>`; }).join('');
    return `${T[2].length>1?`<h4 class="pdcr-gh">${E(GROUP[slot])}</h4>`:''}<div class="pdcr-grid" role="group" aria-label="${E(T[2].length>1?GROUP[slot]:T[1])}">${opts}</div>`; }).join('');
  let cols='';
  if(T[3]){ const k=T[3], use=colourUse(k,d), cur=d[k]||use, tbl=COLS[k];
    cols=`<div class="pdcr-cols"><span class="pdcr-ch">${E(COLNAME[k])}${use?`: <b>${E(tbl[cur][1])}</b>`:''}</span>${use?`<div class="pdcr-sw" role="radiogroup" aria-label="${E(COLNAME[k])}">${Object.entries(tbl).map(([v,[hex,name]])=>`<button type="button" role="radio" aria-checked="${v===cur}" aria-label="${E(name)}" title="${E(name)}" tabindex="${v===cur?0:-1}" data-pdcr="col" data-k="${k}" data-v="${v}"><span style="background:${hex}"></span></button>`).join('')}</div>`:`<span class="pdcr-chint">${k==='hc'?'Pick a hairstyle or facial hair to colour it.':k==='ac'?'Pick headwear that comes in colours: a cap, beanie, sun hat, beret, hijab or head wrap.':'Pick a scarf, tie, bow tie, bandana or headphones to colour them.'}</span>`}</div>`; }
  const view=['side','front'].map(v=>`<button type="button" aria-pressed="${st.view===v}" data-pdcr="view" data-v="${v}">${v==='side'?'Side':'Front'}</button>`).join('');
  /* Save and Back sit in their own bar. On a phone it stays at the top while everything scrolls under it. On a laptop
     the preview and the bar are one block pinned at the top of the creator, the bar directly under the duck, and only
     the options scroll beneath it, so nothing ever floats across the duck, the name or the tabs. The line beside the
     buttons says "Saved" only when this exact duck is the saved one; any change shows "Unsaved changes". Leaving
     with changes asks once: Save changes or Discard changes. */
  const bar=st.confirm
    ?`<div class="pdcr-bar confirm" role="group" aria-label="Unsaved changes"><p class="pdcr-state" role="status">You have unsaved changes.</p><div class="pdcr-btns"><button type="button" class="${E(o.mainCls||'start')}" data-pdcr="save">Save changes</button><button type="button" class="${E(o.secondCls||'zp-second')}" data-pdcr="cancel">Discard changes</button></div></div>`
    :`<div class="pdcr-bar" role="group" aria-label="Your duck"><div class="pdcr-btns"><button type="button" class="${E(o.mainCls||'start')}" data-pdcr="save">${E(o.saveLabel||'Save your duck')}</button><button type="button" class="${E(o.secondCls||'zp-second')}" data-pdcr="cancel">${E(o.cancelLabel||'Back')}</button></div><p class="pdcr-state${dirty?' dirty':''}" role="status">${dirty?'<i aria-hidden="true"></i>Unsaved changes':st.kept?'Saved':''}</p></div>`;
  return `<div class="pdcr-top"><div class="pdcr-stage"><div class="pdcr-prev">${html({nick:st.nick||'You',duck:d},{size:'xl',cls:'pd-live',view:st.view})}</div><span class="pdcr-name" dir="auto">${E(st.nick||'Your name')}</span><div class="pdcr-view" role="group" aria-label="Preview">${view}</div><p class="pdcr-desc">${E(describe(d).replace(/^./,c=>c.toUpperCase()))}</p></div>${bar}</div>
  <div class="pdcr-panel"><div class="pdcr-tabs" role="tablist" aria-label="Customize your duck">${tabs}</div>
    <div class="pdcr-body" role="tabpanel" aria-labelledby="pdcr-${id}-t-${T[0]}">${groups}${cols}</div>
    <p class="pdcr-note" role="status" aria-live="polite">${E(st.note||'')}</p>
    <div class="pdcr-tools"><button type="button" data-pdcr="rand">Randomize</button><button type="button" data-pdcr="undo"${st.hist.length?'':' aria-disabled="true"'}>Undo</button><button type="button" data-pdcr="reset"${dirty?'':' aria-disabled="true"'}>Reset</button></div>
    </div>`;
}
/* the bar sticks just under the page's own sticky header, whatever its height */
function headTop(){ if(!HAS_DOC) return; try{ const h=document.querySelector('body>header'), cs=h&&getComputedStyle(h), top=h&&/sticky|fixed/.test(cs.position)?Math.round(h.getBoundingClientRect().height):0; document.documentElement.style.setProperty('--pdcr-top',top+'px'); }catch(e){} }
function creatorHTML(id,st,o){ REG[id]={st,o:o||{}}; headTop(); return `<div class="pdcr" data-pdcr-id="${esc(id)}">${creatorInner(id,st,o||{})}</div>`; }
function redrawCreator(id,focus){ const r=REG[id]; if(!HAS_DOC||!r) return; const el=document.querySelector(`[data-pdcr-id="${id}"]`); if(!el) return;
  const tb0=el.querySelector('.pdcr-tabs'), sx=tb0?tb0.scrollLeft:0;
  el.innerHTML=creatorInner(id,r.st,r.o); const tb=el.querySelector('.pdcr-tabs'); if(tb) tb.scrollLeft=sx;
  const f=focus&&el.querySelector(focus); if(f) try{ f.focus({preventScroll:true}); }catch(e){} }
function creatorAct(id,a,ds){ const r=REG[id]; if(!r) return; const st=r.st, push=()=>{ st.hist.push(st.draft); if(st.hist.length>40) st.hist.shift(); };
  let focus=`[data-pdcr="${a}"]`+(ds.k?`[data-k="${ds.k}"]`:'')+(ds.v!=null?`[data-v="${ds.v}"]`:'');
  if(a!=='cancel') st.confirm=false;
  if(a==='tab'){ st.tab=ds.v; st.note=''; }
  else if(a==='view') st.view=ds.v==='front'?'front':'side';
  else if(a==='set'){ const x=adjust(st.draft,ds.k,ds.v); if(!same(x.duck,st.draft)){ push(); st.draft=x.duck; } st.note=x.note; }
  else if(a==='col'){ push(); st.draft=clean(Object.assign({},st.draft,{[ds.k]:ds.v})); st.note=''; }
  else if(a==='rand'){ push(); st.draft=random(); st.note=''; }
  else if(a==='undo'){ if(!st.hist.length) return; st.draft=st.hist.pop(); st.note='Undone.'; }
  else if(a==='reset'){ if(same(st.draft,st.saved)) return; push(); st.draft=st.saved; st.note='Back to your saved duck.'; }
  else if(a==='save'){ st.saved=st.draft; st.kept=true; st.hist=[]; st.note=''; if(r.o.save) r.o.save(clean(st.draft)); return; }
  else if(a==='cancel'){ if(!same(st.draft,st.saved)&&!st.confirm){ st.confirm=true; redrawCreator(id,'[data-pdcr="cancel"]'); return; } st.confirm=false; st.draft=st.saved; if(r.o.cancel) r.o.cancel(); return; }
  redrawCreator(id,focus); }
if(HAS_DOC){
  document.addEventListener('click',e=>{ const b=e.target&&e.target.closest&&e.target.closest('[data-pdcr]'); if(!b) return; const w=b.closest('[data-pdcr-id]'); if(!w||!REG[w.dataset.pdcrId]) return;
    e.preventDefault(); e.stopPropagation(); if(b.getAttribute('aria-disabled')==='true') return; creatorAct(w.dataset.pdcrId,b.dataset.pdcr,{k:b.dataset.k,v:b.dataset.v}); },true);
  document.addEventListener('keydown',e=>{ const t=e.target; if(!t||!t.closest||!t.closest('[data-pdcr-id]')) return;
    const grp=t.closest('[role=tablist],[role=radiogroup]'); if(!grp) return;
    const items=[...grp.querySelectorAll('button')], i=items.indexOf(t), j=e.key==='ArrowRight'||e.key==='ArrowDown'?i+1:e.key==='ArrowLeft'||e.key==='ArrowUp'?i-1:e.key==='Home'?0:e.key==='End'?items.length-1:null;
    if(j==null||i<0) return; e.preventDefault(); items[(j+items.length)%items.length].click(); });
}

const CSS=`
.pd{position:relative;display:inline-block;flex:none;line-height:0;vertical-align:middle}
.pd-svg{width:100%;height:100%;overflow:visible;display:block}
.pd-rim{filter:drop-shadow(0 0 .45px #f5f2e8) drop-shadow(0 0 .45px #f5f2e8)}   /* a thin cream edge, so dark hair and hats stay visible on a dark page */
.pd-xs{width:28px;height:33px}.pd-sm{width:40px;height:47px}.pd-md{width:58px;height:68px}.pd-lg{width:92px;height:108px}.pd-xl{width:150px;height:176px}.pd-fl{width:100%;height:auto;aspect-ratio:68/82}
.pd-badge{position:absolute;right:-4px;bottom:2px;min-width:18px;height:18px;padding:0 4px;box-sizing:border-box;border-radius:999px;background:var(--fg);color:var(--bg);font:700 11px/18px var(--font-mono);text-align:center;border:1.5px solid var(--bg)}
.pd-xs .pd-badge{min-width:14px;height:14px;font-size:9px;line-height:14px;right:-5px;bottom:0}
.pd-relief,.pd-mask,.pd-pencil,.pd-env,.pd-spot{opacity:0;transition:opacity .25s}
.pd-eye,.pd-wing,.pd-mask,.pd-env{transform-box:fill-box}
.pd-eye{transform-origin:center;transition:transform .2s}
.pd-wing{transform-origin:0 0;transition:transform .3s cubic-bezier(.3,1.6,.5,1)}
.pd.ready .pd-wing{transform:rotate(-24deg)}
.pd.accused .pd-eye{transform:scale(1.6)}
.pd-expr{transition:opacity .2s}.pd.accused .pd-expr,.pd.cleared .pd-expr{opacity:0}
.pd.cleared .pd-eyes{opacity:0}.pd.cleared .pd-relief{opacity:1}
.pd.reveal .pd-mask{opacity:1;animation:pdMask .7s cubic-bezier(.3,1.5,.5,1)}
.pd.pencil .pd-pencil{opacity:1}
.pd.sent .pd-env{opacity:1;animation:pdEnv .5s ease-out}
.pd.speak .pd-spot{opacity:1}.pd.speak .pd-svg{animation:pdBob 1.1s ease-in-out infinite}
.pd.hop .pd-svg{animation:pdHop .55s ease-out}
.pd.pd-live .pd-svg{animation:pdIdle 3.4s ease-in-out infinite}.pd.pd-live .pd-eye{animation:pdBlink 4.2s infinite}
.pd.ghost{opacity:.38;filter:grayscale(1)}
.pd.dim{opacity:.45}
@keyframes pdHop{0%{transform:translateY(-38%) scale(.8)}55%{transform:translateY(0) scale(1.06,.94)}75%{transform:translateY(-6%)}100%{transform:none}}
@keyframes pdBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-5%) rotate(-2deg)}}
@keyframes pdIdle{0%,100%{transform:translateY(0)}50%{transform:translateY(-3%)}}
@keyframes pdBlink{0%,92%,100%{transform:none}95%{transform:scaleY(.12)}}
@keyframes pdMask{from{transform:scale(.3) rotate(-20deg);opacity:0}to{transform:none;opacity:1}}
@keyframes pdEnv{from{transform:translate(-60%,0);opacity:0}to{transform:none;opacity:1}}
@media (prefers-reduced-motion:reduce){.pd .pd-svg,.pd .pd-mask,.pd .pd-env,.pd .pd-eye{animation:none!important}.pd-wing,.pd-eye{transition:none}}
/* reactions: the face changes at once (a short fade); the body move is one brief gesture. --pd-dir is -1 on a duck
   drawn mirrored, so "forward" and "back" stay true to the way it faces. Reduced motion keeps the face, drops the move. */
.pd-mood{opacity:0;transition:opacity .14s}
.pd-eyes,.pd[data-mood] .pd-expr{transition:opacity .14s}
.pd[data-mood] .pd-eyes,.pd[data-mood] .pd-expr,.pd[data-mood] .pd-relief{opacity:0}
.pd[data-mood="happy"] .pd-mood[data-m="happy"],.pd[data-mood="frustrated"] .pd-mood[data-m="frustrated"],.pd[data-mood="surprised"] .pd-mood[data-m="surprised"],.pd[data-mood="cheeky"] .pd-mood[data-m="cheeky"],.pd[data-mood="nod"] .pd-mood[data-m="nod"]{opacity:1}
.pd.pd-moving[data-mood] .pd-svg{transform-origin:50% 80%}
/* each face has its own gesture: a cheerful hop with a wing wave, a grumbling shake with quick flaps, a startled
   recoil with the wing thrown up, a sly head tilt, an approving nod with one flap */
.pd.pd-moving[data-mood="happy"] .pd-svg{animation:pdmHappy .62s cubic-bezier(.3,1.3,.5,1)}.pd.pd-moving[data-mood="happy"] .pd-wing{animation:pdmWave .5s ease-in-out .08s 2}
.pd.pd-moving[data-mood="frustrated"] .pd-svg{animation:pdmShake .7s ease-in-out .12s}.pd.pd-moving[data-mood="frustrated"] .pd-wing{animation:pdmFlap .28s ease-in-out .2s 3}
.pd.pd-moving[data-mood="surprised"] .pd-svg{animation:pdmRecoil .7s cubic-bezier(.2,1.2,.4,1)}.pd.pd-moving[data-mood="surprised"] .pd-wing{animation:pdmThrow 1.1s cubic-bezier(.2,1.2,.4,1)}
.pd.pd-moving[data-mood="cheeky"] .pd-svg{animation:pdmTilt 1.5s ease-in-out}
.pd.pd-moving[data-mood="nod"] .pd-svg{animation:pdmNod 1.1s ease-in-out .1s}.pd.pd-moving[data-mood="nod"] .pd-wing{animation:pdmFlap .4s ease-in-out .45s 1}
@keyframes pdmHappy{0%,100%{translate:0 0}35%{translate:0 -14%}60%{translate:0 0;scale:1.05 .95}80%{translate:0 -3%;scale:1}}
@keyframes pdmDip{0%,100%{rotate:0deg;translate:0 0}30%,70%{rotate:calc(var(--pd-dir,1)*7deg);translate:0 4%}}
@keyframes pdmShake{0%,100%{rotate:0deg}15%{rotate:calc(var(--pd-dir,1)*-6deg)}35%{rotate:calc(var(--pd-dir,1)*6deg)}55%{rotate:calc(var(--pd-dir,1)*-5deg)}75%{rotate:calc(var(--pd-dir,1)*3deg)}}
@keyframes pdmFlap{50%{transform:rotate(-28deg)}}
@keyframes pdmWave{30%{transform:rotate(-34deg)}60%{transform:rotate(-14deg)}}
@keyframes pdmThrow{0%,100%{transform:none}18%,70%{transform:rotate(-40deg) translateY(-4%)}}
@keyframes pdmRecoil{0%{translate:0 0;rotate:0deg}22%{translate:calc(var(--pd-dir,1)*-9%) -3%;rotate:calc(var(--pd-dir,1)*-7deg)}100%{translate:0 0;rotate:0deg}}
@keyframes pdmTilt{0%,100%{rotate:0deg}20%,75%{rotate:calc(var(--pd-dir,1)*-10deg)}}
@keyframes pdmNod{0%,100%{rotate:0deg}22%,62%{rotate:calc(var(--pd-dir,1)*10deg)}42%{rotate:calc(var(--pd-dir,1)*2deg)}}
.pd-me .pd-lid{opacity:0;animation:pdmeBlink 5.3s infinite}.pd-me image{image-rendering:auto}
@keyframes pdmeBlink{0%,93%,97%,100%{opacity:0}94.5%,95.5%{opacity:1}}
@media (prefers-reduced-motion:reduce){.pd.pd-moving[data-mood] .pd-svg,.pd.pd-moving[data-mood] .pd-wing{animation:none!important}.pd-mood,.pd-eyes{transition:none}.pd-me .pd-lid{animation:none}}
.pdn{display:inline-flex;flex-direction:column;align-items:center;gap:4px;min-width:0;text-align:center}
.pdn-name{font:600 13px/1.2 var(--font-sans);color:var(--fg);max-width:100%;white-space:normal;overflow-wrap:anywhere}
.pdn-sub{font:500 11.5px/1.3 var(--font-mono);color:var(--g5)}
.pdcr{container-type:inline-size;text-align:left;display:flex;flex-direction:column;gap:14px}
.pdcr-top{display:contents}
.gdialog .pdcr{--pdcr-top:0px}   /* inside a dialog the dialog body scrolls, not the page, so nothing sits above it */
.pdcr-bar{order:-1;position:sticky;top:var(--pdcr-top,0px);z-index:5;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:6px 12px;margin:0 -4px -2px;padding:10px 4px;background:var(--bg);border-bottom:1px solid var(--g3)}
.pdcr-bar .pdcr-btns{display:flex;gap:8px;flex:1 1 280px}
.pdcr .pdcr-bar .pdcr-btns>button{flex:1 1 0;min-height:46px;margin:0;width:auto;min-width:0;padding:0 12px;font-size:16px;white-space:nowrap}
.pdcr .pdcr-bar .pdcr-state{margin:0;font:500 13px/1.3 var(--font-sans);color:var(--g6)}
.pdcr .pdcr-bar .pdcr-state.dirty{color:var(--fg);font-weight:600}
.pdcr-state.dirty i{display:inline-block;width:7px;height:7px;margin-right:6px;border-radius:50%;background:var(--fg);vertical-align:1px}
.pdcr .pdcr-bar.confirm .pdcr-state{color:var(--fg);font-weight:600;flex-basis:100%}
.pdcr-stage{display:flex;flex-direction:column;align-items:center;gap:8px;padding:16px 12px 12px;border-radius:16px;background:var(--surf2)}
.pdcr-prev .pd-xl{width:132px;height:155px}
.pdcr-name{font:600 17px/1.2 var(--font-sans);color:var(--fg);max-width:100%;overflow-wrap:anywhere;text-align:center}
.pdcr-desc{margin:0;font:400 13.5px/1.4 var(--font-sans);color:var(--g6);text-align:center}
.pdcr-view{display:inline-flex;padding:3px;border-radius:999px;background:var(--surf3)}
.pdcr-view button{min-height:36px;min-width:72px;padding:0 14px;border:none;border-radius:999px;background:none;color:var(--g6);font:600 14px var(--font-sans);cursor:pointer}
.pdcr-view button[aria-pressed=true]{background:var(--bg);color:var(--fg);box-shadow:0 0 0 1.5px var(--fg) inset}
.pdcr-panel{display:flex;flex-direction:column;gap:12px;min-width:0}
.pdcr-tabs{display:flex;gap:2px;overflow-x:auto;scrollbar-width:none;border-bottom:1px solid var(--g3);scroll-snap-type:x proximity}
.pdcr-tabs::-webkit-scrollbar{display:none}
.pdcr-tabs button{flex:none;position:relative;min-height:46px;padding:0 12px;border:none;border-bottom:2.5px solid transparent;margin-bottom:-1px;background:none;color:var(--g6);font:600 15px var(--font-sans);cursor:pointer;white-space:nowrap;scroll-snap-align:start}
.pdcr-tabs button[aria-selected=true]{color:var(--fg);border-bottom-color:var(--fg)}
.pdcr-tabs button i{position:absolute;top:10px;right:3px;width:6px;height:6px;border-radius:50%;background:var(--zp-gold,${GOLD})}
.pdcr-body{display:flex;flex-direction:column;gap:10px}
.pdcr-gh{margin:4px 0 0;font:600 13px/1.2 var(--font-mono);letter-spacing:.06em;text-transform:uppercase;color:var(--g5)}
.pdcr-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(86px,1fr));gap:8px}
.pdcr-opt{position:relative;display:flex;flex-direction:column;align-items:center;gap:3px;min-height:104px;padding:6px 4px 8px;border:1.5px solid var(--g3);border-radius:14px;background:var(--bg);color:var(--fg);cursor:pointer;font:inherit}
.pdcr-opt:hover{border-color:var(--g5)}
.pdcr-opt svg{width:68px;height:68px;overflow:hidden}
.pdcr-opt .pdcr-none{opacity:.6;line-height:0}
.pdcr-opt[aria-pressed=true]{border:2px solid var(--fg);background:var(--surf3)}
.pdcr-opt[aria-pressed=true]::after{content:'✓';position:absolute;top:5px;right:5px;width:20px;height:20px;border-radius:50%;background:var(--fg);color:var(--bg);font:700 12px/20px var(--font-sans);text-align:center}
.pdcr-ol{font:500 12.5px/1.2 var(--font-sans);text-align:center}
.pdcr-opt small{font:400 11px/1.2 var(--font-sans);color:var(--g6);text-align:center}
.pdcr-cols{display:flex;flex-direction:column;gap:8px;padding-top:4px}
.pdcr-ch{font:500 14px/1.3 var(--font-sans);color:var(--g6)}.pdcr-ch b{color:var(--fg);font-weight:600}
.pdcr-chint{font:400 13px/1.4 var(--font-sans);color:var(--g5)}
.pdcr-sw{display:flex;flex-wrap:wrap;gap:8px}
.pdcr-sw button{width:42px;height:42px;padding:4px;border:2px solid transparent;border-radius:50%;background:none;cursor:pointer}
.pdcr-sw button span{display:block;width:100%;height:100%;border-radius:50%;box-shadow:0 0 0 1.5px var(--g4) inset}
.pdcr-sw button[aria-checked=true]{border-color:var(--fg)}
.pdcr-note{margin:0;font:500 14px/1.4 var(--font-sans);color:var(--fg)}.pdcr-note:empty{display:none}
.pdcr-tools{display:flex;gap:8px;flex-wrap:wrap}
.pdcr-tools button{flex:1 1 0;min-height:44px;padding:0 8px;white-space:nowrap;border:1.5px solid var(--g4);border-radius:12px;background:transparent;color:var(--fg);font:600 14.5px var(--font-sans);cursor:pointer}
.pdcr-tools button[aria-disabled=true]{opacity:.45;cursor:default}
.pdcr-save{display:flex;gap:8px;flex-wrap:wrap}.pdcr-save button{flex:1 1 140px;white-space:nowrap;padding-left:12px;padding-right:12px}
.pdcr-state{margin:0;font:400 13px/1.4 var(--font-sans);color:var(--g5)}
.pdcr button:focus-visible{outline:2px solid var(--fg);outline-offset:2px}
/* laptops: title, the whole duck, the action bar right under it, then the options. The preview and the bar are one
   pinned block with its own space; the preview shrinks on shorter windows so the options keep room to scroll. */
@media (min-width:760px) and (min-height:480px){
  .pdcr{gap:0}
  .pdcr-top{display:block;position:sticky;top:var(--pdcr-top,0px);z-index:5;background:var(--bg);margin:0 -4px;padding:0 4px}
  .gdialog .pdcr-top{top:-18px;padding-top:18px;margin-top:-18px}   /* covers the dialog body's top padding too */
  .pdcr .pdcr-bar{order:0;position:static;margin:0;padding:12px 0;background:none}
  .pdcr-stage{display:grid;grid-template-columns:auto minmax(0,1fr);grid-template-areas:"prev name" "prev view" "prev desc";align-items:center;justify-items:start;column-gap:22px;row-gap:8px;padding:clamp(14px,3vh,24px) 22px 12px}
  .pdcr-prev{grid-area:prev;line-height:0}.pdcr-name{grid-area:name;align-self:end;text-align:left;font-size:19px}.pdcr-view{grid-area:view}.pdcr-desc{grid-area:desc;align-self:start;text-align:left}
  .pdcr-prev .pd-xl{height:clamp(110px,24vh,210px);width:auto;aspect-ratio:150/176}
  .pdcr-panel{padding-top:14px}
}
@media (min-width:760px) and (min-height:480px) and (max-height:780px){
  .pdcr-stage{padding:10px 18px 8px;row-gap:4px}.pdcr-prev .pd-xl{height:clamp(84px,15vh,130px)}
  .pdcr .pdcr-bar{padding:8px 0}.pdcr .pdcr-bar .pdcr-btns>button{min-height:42px}
  .pdcr-view button{min-height:32px}
}
`;
if(HAS_DOC&&!document.getElementById('zp-duck-css')){ const st=document.createElement('style'); st.id='zp-duck-css'; st.textContent=CSS; document.head.appendChild(st); }
/* ---- Mansy's duck (the /story author duck: author-duck.png, unchanged, with the same pupils and blink lids drawn over
   its empty eyes as on /story and /about). It is the computer's duck in every game. It takes the same five moods as a
   player's duck: the mood eyes and brows are the shared MOODS drawings, placed over its two eyes (the far one narrower,
   as the picture is three-quarter view), with a mouth drawn on its own bill; the wing that flaps is a copy of the
   picture's wing. Same classes as html() (.pd, .pd-svg, .pd-eyes, .pd-mood, .pd-wing), so the same CSS moves it. ---- */
const ME_IMG='/author-duck.png', ME_WHITE='#fdfdf9';
const ME_WING='M56 232C57 203 98 183 140 186C173 189 198 210 198 233C196 258 170 278 134 282C94 285 59 264 56 232Z';
const ME_NEAR={x:212.6,y:102.1}, ME_FAR={x:279.1,y:90.8};
const ME_MOUTH={
  open:`<path d="M268 139C290 147 316 145 336 133C333 147 310 158 286 153C277 151 270 146 268 139Z" fill="${INK}"/><path d="M286 150C298 154 314 152 324 146" stroke="#d9785f" stroke-width="5" fill="none" stroke-linecap="round"/>`,
  wide:`<path d="M266 137C290 145 318 143 338 129C338 152 314 170 288 166C274 163 266 152 266 137Z" fill="${INK}"/><path d="M284 160C298 165 316 162 328 154" stroke="#d9785f" stroke-width="6" fill="none" stroke-linecap="round"/>`,
  smirk:`<path d="M318 136Q330 133 338 124" stroke="${INK}" stroke-width="5" fill="none" stroke-linecap="round"/>` };
const ME_VIEW={ match:'-8 -30 362 392', mug:'150 20 196 170' };
let meN=0;
function mansySvg(opts){ opts=opts||{}; const n=++meN, W='meW'+n, L='meL'+n, R='meR'+n, vb=ME_VIEW[opts.crop]||'0 0 346 330';
  /* cheeky is a wink: the near eye closes, the far one stays open under its raised brow */
  const face=(k,e,sx,sy,lift)=>`<g transform="translate(${e.x} ${e.y}) scale(${sx} ${sy})">${(k==='cheeky'&&e===ME_FAR?MOODS.nod:MOODS[k]).eye()}<g transform="translate(0 ${-lift})">${MOODS[k].brow()}</g></g>`;
  const moods=Object.keys(MOODS).map(k=>`<g class="pd-mood" data-m="${k}">${face(k,ME_FAR,1.9,3.2,4.2)}${face(k,ME_NEAR,3.4,3.4,4.2)}${MOODS[k].beak?ME_MOUTH[MOODS[k].beak]:''}</g>`).join('');
  return `<svg class="pd-svg pd-me" viewBox="${vb}" preserveAspectRatio="xMidYMax meet" aria-hidden="true" focusable="false"><defs><clipPath id="${W}"><path d="${ME_WING}"/></clipPath>
    <clipPath id="${L}"><ellipse cx="212.6" cy="102.1" rx="13.4" ry="15.6" transform="rotate(3.4 212.6 102.1)"/></clipPath>
    <clipPath id="${R}"><ellipse cx="279.1" cy="90.8" rx="7.2" ry="14" transform="rotate(2.9 279.1 90.8)"/></clipPath></defs>
    <image href="${ME_IMG}" width="346" height="330"/>
    <path d="${ME_WING}" fill="${ME_WHITE}"/><g class="pd-wing" style="transform-box:view-box;transform-origin:190px 214px"><image href="${ME_IMG}" width="346" height="330" clip-path="url(#${W})"/></g>
    <g class="pd-eyes"><g clip-path="url(#${L})"><ellipse class="pd-pu" cx="215.7" cy="107.4" rx="7.2" ry="8.9" fill="#121212"/><circle cx="218.2" cy="103.8" r="1.9" fill="#fff"/><g class="pd-lid"><rect x="196" y="84" width="34" height="36" fill="#fefefd"/><path d="M198 120h30" stroke="#121212" stroke-width="2.6" stroke-linecap="round"/></g></g>
    <g clip-path="url(#${R})"><ellipse class="pd-pu" cx="278.5" cy="92.8" rx="5.7" ry="6.8" fill="#121212"/><circle cx="280.5" cy="90.1" r="1.5" fill="#fff"/><g class="pd-lid"><rect x="269" y="75" width="20" height="32" fill="#fefefd"/><path d="M270 107h18" stroke="#121212" stroke-width="2.6" stroke-linecap="round"/></g></g></g>
    ${opts.moods===false?'':moods}</svg>`; }
/* the guide: the same complete vector (picture, pupils with their highlights, blink lids, the five mood faces) for every
   hint, rule note, lesson and move note, and for the computer opponent. The eyes are drawn by this SVG itself, never by a
   separate overlay, so no screen can show the picture without them. opts.cls adds classes, opts.mood shows one face. */
function guide(opts){ opts=opts||{}; return mansy(Object.assign({size:'fl',label:'Mansy’s duck'},opts,{cls:'pd-guide '+(opts.cls||'')})); }
/* the computer's avatar: html() for Mansy's duck */
function mansy(opts){ opts=opts||{}; const mood=opts.mood&&MOODS[opts.mood]?` data-mood="${opts.mood}"`:'';
  return `<span class="pd pd-${opts.size||'md'} pd-mansy ${opts.cls||''}"${mood} role="img" aria-label="${esc(opts.label||'Computer: Mansy’s duck, with glasses, short hair, a beard and a black tie')}">${mansySvg(opts)}</span>`; }

const API={ svg, html, mansy, mansySvg, guide, figure, describe, MOODS:Object.keys(MOODS).map(k=>[k,MOODS[k].label]), OPTIONS, SLOTS:SLOTS.map(([k,l])=>[k,l]), random, clean, fits, fitsNeck, adjust, clears, word, hairWord, GOLD,
  COLOURS:{ hair:HCOL, accessory:ACOL }, KEYS, newCreator, creatorHTML, same };
if(typeof module!=='undefined'&&module.exports) module.exports=API;
if(typeof window!=='undefined') window.ZPDuck=API;
})();
