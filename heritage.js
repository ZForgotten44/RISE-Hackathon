/* heritage.js: Morabaraba, Chaupar, Dasapada and Patolli on the shared games2.js framework (entry screen, match loop,
   undo, computer turns, result). Rules live in heritage-core.js. The dice games show their throw under the board, and
   a throw is a move like any other, so undo and saved games just work.
   Where a rule is rebuilt rather than recorded, the rules text says so with a small tag. */
(function(){
const X=window.ZFX, H=window.ZF_HERITAGE; if(!X||!H) return;
const {MB,CH,DP,PT}=H;
const who=(p,c)=>c.opp==='2p'?`${window.ZFName?ZFName(p):'Player '+p}`:(p===c.humanIs?'You':'The computer');
const wins=(p,c)=>!p?'Draw':(c.opp==='ai'&&p===c.humanIs)?'You win':`${who(p,c)} wins`;
const turnLine=(s,c,doing)=>`<span class="who">${c.human?'Your turn':c.opp==='2p'?who(s.turn,c):'Computer is thinking…'}</span><span class="cond">${doing}</span>`;
const DIFFS=[['easy','Easy'],['medium','Medium'],['hard','Hard']];
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const tag=t=>`<span class="hg-tag">${t}</span>`;
const CSS=`
.hg-tag{display:inline-block;margin:0 2px;padding:1px 7px;border-radius:999px;border:1px solid var(--g4);font:700 10.5px/1.6 var(--font-mono);letter-spacing:.06em;text-transform:uppercase;color:var(--g6);vertical-align:1px;white-space:nowrap}
.hg{width:min(100%,560px,calc(100vh - 300px));min-width:280px;margin:0 auto}
.hg svg{width:100%;height:auto;display:block;overflow:visible;color:var(--fg)}
.hg .ln{stroke:currentColor;stroke-width:3;stroke-linecap:round;fill:none;opacity:.55}
.hg .pt{fill:var(--bg);stroke:currentColor;stroke-width:2.5;opacity:.6}
.hg .p1{fill:currentColor;stroke:currentColor;stroke-width:3}
.hg .p2{fill:var(--bg);stroke:currentColor;stroke-width:5}
.hg .go{cursor:pointer;outline:none}
.hg .go .ring{fill:none;stroke:currentColor;stroke-width:2.5;stroke-dasharray:4 5;opacity:.75}
.hg .go:hover .ring,.hg .go:focus-visible .ring{opacity:1;stroke-width:3.5}
.hg .tgt{fill:currentColor;opacity:.32}
.hg .go:hover .tgt,.hg .go:focus-visible .tgt{opacity:.7}
.hg .sel{fill:none;stroke:currentColor;stroke-width:3.5}
.hg .hint{fill:none;stroke:currentColor;stroke-width:3.5;stroke-dasharray:3 6}
.hg .mill{stroke:currentColor;stroke-width:10;stroke-linecap:round;opacity:.35}
.hg .last{fill:none;stroke:currentColor;stroke-width:2;opacity:.45}
.hg .cell{fill:var(--surf2);stroke:var(--g3);stroke-width:1.2}
.hg .cell.safe{fill:var(--surf3)}
.hg .mark{stroke:currentColor;stroke-width:1.6;opacity:.45;fill:none}
.hg .ctr{fill:var(--surf);stroke:var(--g3);stroke-width:1.5}
.hg .num{font:700 11px var(--font-mono);fill:var(--g5)}
.hg-bar{display:flex;flex-wrap:wrap;gap:10px;justify-content:center;align-items:center;margin:12px auto 0;max-width:560px}
.hg-bar .lbl{font:600 11px var(--font-mono);letter-spacing:.08em;text-transform:uppercase;color:var(--g5)}
.hg-die{min-width:44px;min-height:44px;padding:0 12px;border:1.5px solid var(--g4);border-radius:12px;background:var(--surf);color:var(--fg);font:700 17px var(--font-mono);cursor:pointer}
.hg-die[aria-pressed="true"]{background:var(--fg);color:var(--bg);border-color:var(--fg)}
.hg-die.used{opacity:.3;cursor:default;text-decoration:line-through}
.hg-die:disabled{cursor:default}
.hg-act{min-height:44px;padding:0 20px;border:1px solid var(--fg);border-radius:12px;background:transparent;color:var(--fg);font:600 15px var(--font-sans);cursor:pointer}
.hg-act.primary{background:var(--fg);color:var(--bg)}
.hg-act:disabled{opacity:.4;cursor:default}
.hg-say{width:100%;text-align:center;font:500 15px/1.45 var(--font-sans);color:var(--g6);min-height:1.45em}
.hg-say b{color:var(--fg)}
.hg-key{display:flex;flex-wrap:wrap;gap:8px 22px;justify-content:center;margin-top:12px;font:500 14px var(--font-sans);color:var(--g6)}
.hg-key svg{width:18px;height:18px;vertical-align:-3px;margin-right:6px;color:var(--fg)}
@media (prefers-reduced-motion:no-preference){.hg .fresh{animation:hgin .32s ease-out both}}
@keyframes hgin{from{opacity:0;transform:scale(.6)}to{opacity:1;transform:none}}
.hg .fresh{transform-box:fill-box;transform-origin:center}
`;
let cssDone=false; function css(){ if(cssDone) return; cssDone=true; const st=document.createElement('style'); st.id='hg-css'; st.textContent=CSS; document.head.appendChild(st); X.css&&X.css(); }
const key1=(p,label)=>`<span><svg viewBox="0 0 18 18"><circle cx="9" cy="9" r="6.5" ${p===1?'fill="currentColor"':'fill="none" stroke="currentColor" stroke-width="2.4"'}/></svg>${label}</span>`;
function keyRow(c,a,b){ const n=p=>c.opp==='2p'?(window.ZFName?ZFName(p):'Player '+p):(p===c.humanIs?'You':'Computer'); return `<div class="hg-key">${key1(1,`${n(1)}${a?' · '+a:''}`)}${key1(2,`${n(2)}${b?' · '+b:''}`)}</div>`; }
const disc=(x,y,r,p,cls)=>`<circle class="${p===1?'p1':'p2'} ${cls||''}" cx="${x}" cy="${y}" r="${p===1?r:r-1.5}"/>`;
const sq=(x,y,r,p,cls)=>`<rect class="${p===1?'p1':'p2'} ${cls||''}" x="${x-r}" y="${y-r}" width="${2*r}" height="${2*r}" rx="${r*.35}"/>`;
function bindGo(host,fn){ host.querySelectorAll('[data-go]').forEach(el=>{ const act=()=>fn(JSON.parse(el.dataset.go)); el.addEventListener('click',act); el.addEventListener('keydown',e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); act(); } }); }); }
const goAttr=(o,label)=>`class="go" tabindex="0" role="button" aria-label="${label}" data-go='${JSON.stringify(o)}'`;
/* a small live board on the entry screen: try one move with the real rules */
function tryDemo(host,{init,render,note,after}){ ZF.injectCSS&&ZF.injectCSS(); css(); let st=init(), msg=note;
  host.innerHTML=`<div class="gx-demo"><span class="gx-tag">Try a move</span><div class="gx-dbody" style="width:100%"></div><div class="gx-note" aria-live="polite"></div><button type="button" class="gx-btn">↺ Reset</button></div>`;
  const body=host.querySelector('.gx-dbody'), nt=host.querySelector('.gx-note');
  const draw=()=>{ nt.innerHTML=msg; render(body,st,{human:!st.over,humanIs:st.turn,opp:'2p',demo:true,play:m=>{ const n=st; st=after.apply(st,m); msg=after.say(n,m,st)||msg; draw(); },opt:{}}); };
  host.querySelector('.gx-btn').onclick=()=>{ st=init(); msg=note; draw(); }; draw(); return {destroy(){}}; }

/* ======================= Morabaraba ======================= */
let mbSel=-1, mbFor=null;
const MBP=(i)=>{ const [x,y]=MB.XY[i]; return [40+x*70,40+y*70]; };
function mbRender(host,s,c){ css(); if(mbFor!==s){ mbFor=s; mbSel=-1; }
  const L=c.human?MB.legal(s):[], hint=c.hintMove; let g='';
  for(let r=0;r<3;r++){ const a=MBP(r*8), b=MBP(r*8+4); g+=`<rect class="ln" x="${a[0]}" y="${a[1]}" width="${b[0]-a[0]}" height="${b[1]-a[1]}"/>`; }
  for(let i=0;i<8;i++){ const a=MBP(i), b=MBP(16+i); g+=`<line class="ln" x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}"/>`; }
  if(s.mill) for(const m of s.mill){ const a=MBP(m[0]), b=MBP(m[2]); g+=`<line class="mill" x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}"/>`; }
  const last=s.last&&(s.last.to!=null?s.last.to:null);
  const can=new Set(), tgt=new Set();
  if(s.shoot) L.forEach(m=>can.add(m.at));
  else if(s.hand[s.turn]>0) L.forEach(m=>tgt.add(m.to));
  else { L.forEach(m=>can.add(m.from)); if(mbSel>=0) L.filter(m=>m.from===mbSel).forEach(m=>tgt.add(m.to)); }
  for(let i=0;i<24;i++){ const [x,y]=MBP(i), v=s.b[i]; const name=MB.NAME[i];
    let inner=v?disc(x,y,19,v,(i===last&&s.last.t!=='shoot')?'fresh':''):`<circle class="pt" cx="${x}" cy="${y}" r="6"/>`;
    if(v&&i===last) inner+=`<circle class="last" cx="${x}" cy="${y}" r="26"/>`;
    if(i===mbSel) inner+=`<circle class="sel" cx="${x}" cy="${y}" r="27"/>`;
    const hm=hint&&((hint.to===i&&hint.t==='place')||(hint.from===i)||(hint.at===i)); if(hm) inner+=`<circle class="hint" cx="${x}" cy="${y}" r="29"/>`;
    if(can.has(i)){ const lab=s.shoot?`shoot the cow on ${name}`:`cow on ${name}`; g+=`<g ${goAttr({k:'pick',i},lab)}>${inner}<circle class="ring" cx="${x}" cy="${y}" r="25"/><circle cx="${x}" cy="${y}" r="30" fill="transparent"/></g>`; }
    else if(tgt.has(i)){ g+=`<g ${goAttr({k:'to',i},(s.hand[s.turn]>0?'place a cow on ':'move to ')+name)}>${inner}<circle class="tgt" cx="${x}" cy="${y}" r="11"/><circle cx="${x}" cy="${y}" r="30" fill="transparent"/></g>`; }
    else g+=inner; }
  const handTxt=p=>s.hand[p]?`${s.hand[p]} to place`:`${MB.count(s,p)} on board${MB.flying(s,p)?' · flying':''}`;
  host.innerHTML=`<div class="hg"><svg viewBox="0 0 500 500" role="group" aria-label="Morabaraba board">${g}</svg></div>${keyRow(c,handTxt(1),handTxt(2))}`;
  bindGo(host,o=>{ if(!c.human) return;
    if(o.k==='pick'){ if(s.shoot){ c.play({t:'shoot',at:o.i}); return; } mbSel=mbSel===o.i?-1:o.i; mbRender(host,s,c); return; }
    if(s.hand[s.turn]>0){ c.play({t:'place',to:o.i}); return; }
    const m=L.find(m=>m.from===mbSel&&m.to===o.i); if(m){ mbSel=-1; c.play(m); } }); }
X.register({ id:'morabaraba', title:['Morabaraba'], blurb:'Guard the herd. Line up three cows to make a mill, then shoot one of theirs off the board.', entryReady:true, judge:()=>null,
  defaults:{}, diffs:DIFFS, diffNote:'Easy often plays at random. Medium looks two moves ahead. Hard looks three to four moves ahead and values mills you can open and close.',
  rules:`<p>Morabaraba is played across South Africa, Lesotho, Botswana and Zimbabwe, and is a recognised mind sport in South Africa. These are the Mind Sports South Africa rules ${tag('Attested')}.</p>
<p><b>Placing.</b> Each player has 12 cows. Take turns placing one cow on any empty point until all are down. <b>Moving.</b> Then move one cow along a line to the next empty point. <b>Flying.</b> When you are down to three cows, a cow may jump to any empty point.</p>
<p><b>Mills.</b> Three of your cows in a straight line, diagonals included, make a mill. Each new mill lets you <b>shoot</b> one enemy cow. You cannot shoot a cow that stands in a mill unless every enemy cow does.</p>
<p><b>Winning.</b> Leave your opponent with two cows, or with no legal move. With three cows each, ten moves each without a shot is a draw.</p>`,
  init:()=>MB.newState(), actor:s=>s.turn, apply:(s,m)=>MB.apply(s,m), legal:s=>MB.legal(s),
  ai:(s,d)=>new Promise(r=>setTimeout(()=>r(H.mbAI(s,d)),0)),
  hint:s=>X.H(H.mbAI(s,'hard'),s.shoot?'Shoot this cow. It breaks up their most dangerous line.':'The computer’s pick at Hard: it looks a few moves ahead for mills on both sides. A suggestion, not a proof.'),
  status(s,c){ if(s.over) return `<span class="who">${s.winner?`${who(s.winner,c)} won`:'Draw'}</span>`; const p=s.turn;
    return turnLine(s,c,s.shoot?'mill! shoot an enemy cow':s.hand[p]>0?'place a cow':MB.flying(s,p)?'three cows left: fly anywhere':'move a cow along a line'); },
  render:mbRender, diffLabel:o=>o.diff,
  result(s,c){ if(!s.winner) return {title:'Draw',detail:'Three cows each, and ten moves each passed without a shot.'}; const you=c.opp==='ai'&&3-s.winner===c.humanIs;
    const why=s.reason==='cows'?(you?'are down to two cows':'is down to two cows'):(you?'have no legal move':'has no legal move');
    return {title:wins(s.winner,c),detail:`${who(3-s.winner,c)} ${why}.`}; },
  demo(host){ return tryDemo(host,{ init:()=>{ let s=MB.newState(); for(const [p,i] of [[1,0],[2,8],[1,1],[2,9]]){ s.turn=p; s=MB.apply(s,{t:'place',to:i}); } s.turn=1; return s; },
    render:mbRender, note:'Two of your cows sit on the top edge. <b>Place the third</b> to make a mill.',
    after:{ apply:(s,m)=>MB.apply(s,m), say:(s,m,n)=>n.shoot?'<b>A mill.</b> Now shoot one enemy cow off the board.':m.t==='shoot'?'<b>Shot.</b> A herd in a line is safe; a lone cow is not.':'Placed. The top edge still needs its third cow.' } }); } });

/* ======================= Chaupar ======================= */
const CHD=[[0,1],[1,0],[0,-1],[-1,0]];                     // arms: south, east, north, west (anticlockwise on screen)
const CS=26, CO=7;                                         // cell size and margin; grid is 19 x 19 cells
function chXY(a,col,row){ const [dx,dy]=CHD[a], lx=dy, ly=-dx; const gx=9+dx*(2+row)+lx*(col-1), gy=9+dy*(2+row)+ly*(col-1); return [CO+gx*CS+CS/2, CO+gy*CS+CS/2]; }
let chDie=null, chFor=null;
const chShape=(a,x,y,r,cls)=>(a===0||a===1)?disc(x,y,r,CH.owner(a),cls):sq(x,y,r*.9,CH.owner(a),cls);
function chRender(host,s,c){ css(); if(chFor!==s){ chFor=s; chDie=null; }
  const L=c.human&&s.phase==='move'?CH.legal(s).filter(m=>m.t==='move'):[], dice=s.dice||[];
  if(c.human&&s.phase==='move'&&(chDie==null||!dice.includes(chDie))) chDie=(dice.find(v=>L.some(m=>m.v===v))) ?? null;
  const moves=L.filter(m=>m.v===chDie), hint=c.hintMove; let g='';
  for(let a=0;a<4;a++) for(let col=0;col<3;col++) for(let row=0;row<8;row++){ const [x,y]=chXY(a,col,row); const safe=CH.SAFE.has(CH.key([a,col,row]));
    g+=`<rect class="cell${safe?' safe':''}" x="${x-CS/2+1}" y="${y-CS/2+1}" width="${CS-2}" height="${CS-2}" rx="4"/>`;
    if(safe) g+=`<path class="mark" d="M${x-6} ${y-6}L${x+6} ${y+6}M${x+6} ${y-6}L${x-6} ${y+6}"/>`; }
  const c0=CO+8*CS; g+=`<rect class="ctr" x="${c0+1}" y="${c0+1}" width="${3*CS-2}" height="${3*CS-2}" rx="8"/>`;
  /* pieces on the track, grouped by square */
  const by={}; s.pcs.forEach((pc,i)=>{ if(pc.pos<0||pc.pos>=CH.HOME) return; const k=CH.key(CH.sq(pc)); (by[k]=by[k]||[]).push(i); });
  const movable=new Set(moves.map(m=>m.pc)), lastPc=s.last&&s.last.t==='move'?s.last.pc:-1;
  for(const k in by){ const ids=by[k], q=k.split(',').map(Number), [x,y]=chXY(q[0],q[1],q[2]);
    ids.forEach((i,n)=>{ const pc=s.pcs[i], off=ids.length>1?(n-(ids.length-1)/2)*7:0; let inner=chShape(pc.arm,x+off,y+off*.4,8,i===lastPc?'fresh':'');
      if(hint&&hint.pc===i) inner+=`<circle class="hint" cx="${x}" cy="${y}" r="14"/>`;
      if(movable.has(i)){ const m=moves.find(mm=>mm.pc===i); g+=`<g ${goAttr({pc:i},`move this piece ${chDie}`)}>${inner}<circle class="ring" cx="${x}" cy="${y}" r="12.5"/><rect x="${x-CS/2}" y="${y-CS/2}" width="${CS}" height="${CS}" fill="transparent"/></g>`; }
      else g+=inner; }); }
  /* the centre: pieces waiting to enter sit at the mouth of their arm; pieces home sit in the middle */
  for(let a=0;a<4;a++){ const [dx,dy]=CHD[a], lx=dy, ly=-dx, mid=c0+1.5*CS; const wait=[], home=[];
    s.pcs.forEach((pc,i)=>{ if(pc.arm!==a) return; if(pc.pos<0) wait.push(i); else if(pc.pos>=CH.HOME) home.push(i); });
    wait.forEach((i,n)=>{ const t=(n-(wait.length-1)/2)*11, x=mid+dx*27+lx*t, y=mid+dy*27+ly*t; let inner=chShape(a,x,y,4.6,'');
      if(hint&&hint.pc===i) inner+=`<circle class="hint" cx="${x}" cy="${y}" r="8"/>`;
      g+=movable.has(i)?`<g ${goAttr({pc:i},`bring a piece in with the ${chDie}`)}>${inner}<circle class="ring" cx="${x}" cy="${y}" r="7.5"/><circle cx="${x}" cy="${y}" r="10" fill="transparent"/></g>`:inner; });
    home.forEach((i,n)=>{ const t=(n-(home.length-1)/2)*8, x=mid+dx*11+lx*t, y=mid+dy*11+ly*t; g+=`<g opacity=".55">${chShape(a,x,y,3.4,'')}</g>`; }); }
  const W=CO*2+19*CS;
  const thrown=s.thrown?s.thrown:null, me=c.human;
  let bar='';
  if(s.phase==='throw'){ bar=`<span class="hg-say">${s.again?'<b>Three alike: throw again.</b> ':''}${me?'Throw the three long dice.':''}</span>${me?'<button type="button" class="hg-act primary" data-hg="throw">Throw the dice</button>':''}`; }
  else { const rem={}; dice.forEach(v=>rem[v]=(rem[v]||0)+1);
    bar=`<span class="lbl">Dice</span>`+thrown.map(v=>{ const live=rem[v]>0; if(live) rem[v]--; return `<button type="button" class="hg-die${live?'':' used'}" data-die="${v}" aria-pressed="${me&&live&&chDie===v}" ${me&&live&&L.some(m=>m.v===v)?'':'disabled'}>${v}</button>`; }).join('');
    if(me&&!L.length) bar+=`<span class="hg-say">No die can be used. <button type="button" class="hg-act" data-hg="pass">Pass</button></span>`;
    else if(me) bar+=`<span class="hg-say">Pick a die, then a piece. A 1 or a 6 brings a piece in from the centre.</span>`; }
  host.innerHTML=`<div class="hg"><svg viewBox="0 0 ${W} ${W}" role="group" aria-label="Chaupar board">${g}</svg></div><div class="hg-bar">${bar}</div>${keyRow(c,`${CH.homeCount(s,1)} of ${s.per*2} home`,`${CH.homeCount(s,2)} of ${s.per*2} home`)}`;
  bindGo(host,o=>{ if(!c.human) return; const m=moves.find(mm=>mm.pc===o.pc); if(m) c.play(m); });
  host.querySelectorAll('[data-die]').forEach(b=>b.onclick=()=>{ chDie=+b.dataset.die; chRender(host,s,c); });
  const th=host.querySelector('[data-hg="throw"]'); if(th) th.onclick=()=>c.play({t:'throw'});
  const ps=host.querySelector('[data-hg="pass"]'); if(ps) ps.onclick=()=>c.play({t:'pass'}); }
X.register({ id:'chaupar', title:['Chaupar'], blurb:'Race out from the centre, round the cross and home again, with a partner colour to protect.', entryReady:true, judge:()=>null, aiDelay:420,
  defaults:{pieces:'2'}, options:[{key:'pieces',label:'Pieces',values:[['2','Two per colour · quick'],['4','Four per colour · full']]}],
  diffs:DIFFS, diffNote:'Easy moves any piece. Medium captures, enters and heads home. Hard also keeps out of reach of enemy pieces and uses the safe squares.',
  rulesFor:o=>`<p>Chaupar has been played across India for centuries, from village cloths to Akbar’s courtyard at Fatehpur Sikri. It is the parent of Pachisi and Ludo. The rules here are the living tradition ${tag('Attested')}; where regions differ, we name our choice ${tag('Regional choice')}.</p>
<p><b>Partners.</b> You play two colours that sit opposite each other: solid circles and solid squares against open circles and open squares. Every piece starts in the centre.</p>
<p><b>The throw.</b> Throw three long dice marked 1, 2, 5 and 6. Each die moves one piece by its number, and you choose the order ${tag('Regional choice')}. A die showing 1 or 6 brings a piece in onto the first square of its arm ${tag('Regional choice')}. Three alike throw again.</p>
<p><b>The road.</b> Down the middle of your own arm, anticlockwise round the outside of all four arms, then back up your own middle and into the centre by the exact count.</p>
<p><b>Capture.</b> Land on a single enemy piece to send it back to the centre. The crossed squares are safe: nobody is captured there. Two enemy pieces on one square block it.</p>
<p><b>Winning.</b> The first side to bring all ${(+o.pieces||2)*2} pieces home wins.</p>`,
  init:o=>CH.newState({per:+o.pieces||2}), actor:s=>s.turn, apply:(s,m)=>CH.apply(s,m), legal:s=>CH.legal(s),
  ai:(s,d)=>CH.ai(s,d), hint:s=>X.H(CH.ai(s,'hard'),s.phase==='throw'?'Throw the dice.':'The computer’s pick at Hard: it weighs captures, safety and the road home. Dice games have no proven best move.'),
  status(s,c){ if(s.over) return `<span class="who">${who(s.winner,c)} brought every piece home</span>`; return turnLine(s,c,s.phase==='throw'?'throw the dice':`dice: ${(s.dice||[]).join(' · ')||'none left'}`); },
  render:chRender, diffLabel:o=>o.diff, modeLabel:o=>o.pieces==='4'?'full':'quick',
  result(s,c){ return {title:wins(s.winner,c),detail:`${who(s.winner,c)} brought both colours home first.`}; },
  demo(host){ return tryDemo(host,{ init:()=>{ let s=CH.newState({per:1,seed:11}); s.phase='move'; s.thrown=[6,2,5]; s.dice=[6,2,5]; return s; },
    render:chRender, note:'You threw <b>6 · 2 · 5</b>. Pick the 6, then a solid piece in the centre to bring it in.',
    after:{ apply:(s,m)=>CH.apply(s,m), say:(s,m,n)=>m.t==='move'?(s.pcs[m.pc].pos<0?'<b>In.</b> Now use the 2 or the 5 to move it down its arm.':'<b>Moved.</b> The crossed squares are safe from capture.'):'' } }); } });

/* ======================= Dasapada ======================= */
const DC=46, DO=10;
let dpSel=-1, dpFor=null;
function dpXY(pl,c,r){ const ar=DP.ab(pl,r); return [DO+c*DC+DC/2, DO+(9-ar)*DC+DC/2]; }
function postureSVG(pl,st,x,y,cls){ const f=pl===1?'p1':'p2';
  if(st===DP.LY) return `<rect class="${f} ${cls}" x="${x-14}" y="${y-5}" width="28" height="10" rx="5"/>`;
  if(st===DP.RI) return `<rect class="${f} ${cls}" x="${x-5}" y="${y-4}" width="10" height="17" rx="5"/>`;
  return `<g class="${cls}"><rect class="${f}" x="${x-5}" y="${y-10}" width="10" height="25" rx="5"/><circle class="${f}" cx="${x}" cy="${y-15}" r="5"/></g>`; }
function dpRender(host,s,c){ css(); if(dpFor!==s){ dpFor=s; dpSel=-1; }
  const L=c.human&&s.phase==='act'?DP.legal(s):[], pl=s.turn, hint=c.hintMove; let g='';
  for(let r=0;r<10;r++) for(let col=0;col<10;col++) g+=`<rect class="cell" x="${DO+col*DC+1}" y="${DO+r*DC+1}" width="${DC-2}" height="${DC-2}" rx="6"/>`;
  const pickable=new Map();   // "pl:i" -> moves on that piece
  L.forEach(m=>{ if(m.t==='pass') return; const k=m.t==='curse'?`${3-pl}:${m.j}`:`${pl}:${m.i}`; if(!pickable.has(k)) pickable.set(k,[]); pickable.get(k).push(m); });
  const walks=dpSel>=0?(pickable.get(`${pl}:${dpSel}`)||[]).filter(m=>m.t==='walk'):[];
  for(const p of [1,2]) s.p[p].forEach((q,i)=>{ const [x,y]=dpXY(p,q.c,q.r), k=`${p}:${i}`; let inner=postureSVG(p,q.st,x,y,'');
    if(p===pl&&i===dpSel) inner+=`<rect class="sel" x="${x-DC/2+3}" y="${y-DC/2+3}" width="${DC-6}" height="${DC-6}" rx="8"/>`;
    if(hint&&((hint.i===i&&p===pl&&hint.t!=='curse')||(hint.t==='curse'&&p!==pl&&hint.j===i))) inner+=`<rect class="hint" x="${x-DC/2+2}" y="${y-DC/2+2}" width="${DC-4}" height="${DC-4}" rx="9"/>`;
    if(pickable.has(k)){ const ms=pickable.get(k), only=ms.length===1&&ms[0].t!=='walk'?ms[0]:null, lab=only?({rise:'raise',stand:'stand up',down:'lay down',curse:'curse'}[only.t]+' this piece'):'choose this piece';
      g+=`<g ${goAttr({k:'pc',key:k},lab)}>${inner}<rect class="ring" x="${x-DC/2+4}" y="${y-DC/2+4}" width="${DC-8}" height="${DC-8}" rx="8"/><rect x="${x-DC/2}" y="${y-DC/2}" width="${DC}" height="${DC}" fill="transparent"/></g>`; }
    else g+=inner; });
  walks.forEach((m,n)=>{ const [x,y]=m.cross?dpXY(pl,m.c,9):dpXY(pl,m.c,m.r); const yy=m.cross?y+(pl===1?-DC*.55:DC*.55):y;
    g+=`<g ${goAttr({k:'walk',n},m.cross?'walk across the far edge':'walk here'+(m.hit?' and capture':''))}><circle class="tgt" cx="${x}" cy="${yy}" r="${m.hit?13:9}"/><circle cx="${x}" cy="${yy}" r="20" fill="transparent"/></g>`; });
  const W=DO*2+10*DC, me=c.human, gr=s.grab;
  let bar='';
  if(s.phase==='throw'){ const vis=s.pile<DP.SEEN;
    bar=`<span class="hg-say">${s.again?'<b>Kṛta walks: throw again.</b> ':''}The pile holds ${vis?`<b>${s.pile} nuts</b> (counted by fours: ${s.pile%4} left over)`:'about fifty nuts'}. Grab a handful and count it off by fours.</span>`;
    if(me) bar+=`<button type="button" class="hg-act primary" data-grab="small">Small handful</button><button type="button" class="hg-act primary" data-grab="medium">Medium</button><button type="button" class="hg-act primary" data-grab="large">Large</button>${vis?`<button type="button" class="hg-act" data-grab="all">Take all ${s.pile}</button>`:''}`; }
  else { const nm=DP.NAMES[s.t], vb=DP.VERB[s.t];
    bar=`<span class="hg-say">${gr?`${gr.all?'Took the whole pile':'Grabbed'} <b>${gr.k} nuts</b>: ${gr.rem} left after counting by fours, so <b>${nm} ${vb}</b>.`:''} ${me?({4:'Walk a standing piece 4 (or lift a piece a stage if none stands).',3:'Stand up a risen piece, or walk a standing piece 3.',2:'Raise a lying piece, or walk a standing piece 2.',1:'Lay down one of your own pieces, or curse an enemy next to your standing piece.'}[s.t]):''}</span>`;
    if(me&&L.length===1&&L[0].t==='pass') bar+=`<button type="button" class="hg-act" data-hg="pass">Nothing to do: pass</button>`; }
  host.innerHTML=`<div class="hg"><svg viewBox="0 0 ${W} ${W}" role="group" aria-label="Dasapada board, ten by ten">${g}</svg></div><div class="hg-bar">${bar}</div>${keyRow(c,`${s.home[1]} of ${DP.WIN} across`,`${s.home[2]} of ${DP.WIN} across`)}`;
  bindGo(host,o=>{ if(!c.human) return;
    if(o.k==='walk'){ const m=walks[o.n]; if(m){ dpSel=-1; c.play(m); } return; }
    const ms=pickable.get(o.key)||[]; const nonWalk=ms.filter(m=>m.t!=='walk'), hasWalk=ms.some(m=>m.t==='walk');
    if(!hasWalk&&nonWalk.length){ c.play(nonWalk[0]); return; }
    if(hasWalk&&nonWalk.length&&dpSel===+o.key.split(':')[1]){ c.play(nonWalk[0]); return; }
    const i=+o.key.split(':')[1]; dpSel=dpSel===i?-1:i; dpRender(host,s,c); });
  host.querySelectorAll('[data-grab]').forEach(b=>b.onclick=()=>c.play(b.dataset.grab==='all'?{t:'all'}:{t:'grab',size:b.dataset.grab}));
  const ps=host.querySelector('[data-hg="pass"]'); if(ps) ps.onclick=()=>c.play({t:'pass'}); }
X.register({ id:'dasapada', title:['Dasapada'], blurb:'The board game the Buddha told his monks to give up, rebuilt from the dice of its own time. Lie down, rise, stand, walk.', entryReady:true, judge:()=>null, aiDelay:480,
  defaults:{}, diffs:DIFFS, diffNote:'Easy plays at random. Medium uses simple rules of thumb. Hard plays with the values learned by 300 evolved bots: capture first, walk straight, count the pile.',
  rules:`<p>About 2,500 years ago the Buddha listed games on boards of ten rows among the distractions monks should give up ${tag('Attested')}. The name survived and the rules did not. Every rule below is rebuilt from evidence of the period, and each one is tagged.</p>
<p><b>The board.</b> Ten by ten: <i>dasa-pada</i> means “ten steps” ${tag('Attested')}. Each side has five pieces, starting lying down on its home row, and crosses to the far edge ${tag('Our reconstruction')}.</p>
<p><b>The throw.</b> The dice of the time were nuts, “the troop of fifty-three” (Rigveda 10.34) ${tag('Attested')}. Grab a handful from the pile and count it off by fours. What is left over names the throw: none is <b>Kṛta</b>, three <b>Tretā</b>, two <b>Dvāpara</b>, one <b>Kali</b> (Lüders, 1907) ${tag('Scholarly reading')}. Once fewer than twelve nuts remain the pile is visible, and you may take it all ${tag('Our reconstruction')}.</p>
<p><b>What a throw does.</b> “Kali lies down, Dvāpara rises, Tretā stands, Kṛta walks” (Aitareya Brāhmaṇa 7.15) ${tag('Attested')}. So a throw changes a piece’s posture ${tag('Our reconstruction')}:</p>
<p><b>Kṛta</b> walks a standing piece 4 squares and throws again. If none of your pieces stands, it lifts one a stage instead ${tag('Invented')}. <b>Tretā</b> stands a risen piece, or walks a standing piece 3. <b>Dvāpara</b> raises a lying piece, or walks a standing piece 2. <b>Kali</b>: something lies down, either one of your own pieces or an enemy next to one of your standing pieces. A walk may angle one column, at the cost of one step.</p>
<p><b>Capture and winning.</b> Walk onto an enemy to send it back to its home row, lying down ${tag('Invented')}. The first to bring three pieces across the far edge wins ${tag('Invented')}. In 240,000 bot games the first player won 51% of the time, with no draws.</p>`,
  init:()=>DP.newState(), actor:s=>s.turn, apply:(s,m)=>DP.apply(s,m), legal:s=>DP.legal(s),
  ai:(s,d)=>DP.ai(s,d), hint:s=>X.H(DP.ai(s,'hard'),s.phase==='throw'?(s.pile<DP.SEEN?`The pile has ${s.pile} nuts, ${s.pile%4} over four: ${[0,2].includes(s.pile%4)?'take it all for a known good throw.':'don’t take it all, that throw is weak.'}`:'Any handful: the pile is still hidden.'):'Hard’s pick, from the values the evolved bots learned. A suggestion, not a proof.'),
  status(s,c){ if(s.over) return `<span class="who">${who(s.winner,c)} brought three pieces across</span>`; return turnLine(s,c,s.phase==='throw'?'grab a handful of nuts':`${DP.NAMES[s.t]} ${DP.VERB[s.t]}`); },
  render:dpRender, diffLabel:o=>o.diff,
  result(s,c){ return {title:wins(s.winner,c),detail:`${who(s.winner,c)} brought three pieces across all ten steps.`}; },
  demo(host){ return tryDemo(host,{ init:()=>{ const s=DP.newState({seed:5}); s.phase='act'; s.t=2; s.grab={k:14,rem:2}; return s; },
    render:dpRender, note:'You grabbed 14 nuts: two left over after fours, so <b>Dvāpara rises</b>. Raise one of your lying pieces.',
    after:{ apply:(s,m)=>DP.apply(s,m), say:(s,m)=>m.t==='rise'?'<b>Risen.</b> Tretā will stand it up, and then Kṛta lets it walk.':'' } }); } });

/* ======================= Patolli ======================= */
/* the 52 squares: each arm (south, east, north, west) is its centre square, six out along one lane and six back */
const PCELL=(()=>{ const out=[]; const arms=[{c:[6,7],out:k=>[6,8+k],back:k=>[7,13-k]},{c:[7,7],out:k=>[8+k,7],back:k=>[13-k,6]},{c:[7,6],out:k=>[7,5-k],back:k=>[6,k]},{c:[6,6],out:k=>[5-k,6],back:k=>[k,7]}];
  for(const a of arms){ out.push(a.c); for(let k=0;k<6;k++) out.push(a.out(k)); for(let k=0;k<6;k++) out.push(a.back(k)); } return out; })();
const PC=30, POF=12;
let ptBean=null, ptFor=null;
function ptXY(sqr){ const [gx,gy]=PCELL[sqr]; return [POF+gx*PC+PC/2, POF+gy*PC+PC/2]; }
function ptRender(host,s,c){ css(); if(ptFor!==s){ ptFor=s; ptBean=null; }
  const L=c.human&&s.phase==='move'?PT.legal(s).filter(m=>m.t!=='pass'):[], up=s.up||[];
  if(c.human&&s.phase==='move'&&(ptBean==null||!up.includes(ptBean))) ptBean=up.find(v=>L.some(m=>m.v===v)) ?? null;
  const moves=L.filter(m=>m.v===ptBean), hint=c.hintMove; let g='';
  const W=POF*2+14*PC, mid=W/2;
  g+=`<g transform="rotate(45 ${mid} ${mid})">`;
  PCELL.forEach(([gx,gy],k)=>{ const x=POF+gx*PC, y=POF+gy*PC, end=(k%13===6||k%13===7), entry=k===PT.START[1]||k===PT.START[2];
    g+=`<rect class="cell${end||entry?' safe':''}" x="${x+1}" y="${y+1}" width="${PC-2}" height="${PC-2}" rx="${end?11:4}"/>`; if(entry) g+=`<circle class="mark" cx="${x+PC/2}" cy="${y+PC/2}" r="9"/>`; });
  for(const p of [1,2]) s.prog[p].forEach((pr,i)=>{ const sqr=PT.sqOf(p,pr), [x,y]=ptXY(sqr); let inner=disc(x,y,10,p,'');
    if(hint&&p===s.turn&&hint.i===i&&hint.t!=='enter') inner+=`<circle class="hint" cx="${x}" cy="${y}" r="15"/>`;
    const m=p===s.turn?moves.find(mm=>mm.i===i&&mm.t!=='enter'):null;
    g+=m?`<g ${goAttr({k:'i',i},`move this pebble ${ptBean}${m.t==='off'?' and off the mat':''}`)}>${inner}<circle class="ring" cx="${x}" cy="${y}" r="14"/><circle cx="${x}" cy="${y}" r="16" fill="transparent"/></g>`:inner; });
  g+='</g>';
  /* reserves and finished pebbles, in the corners beside each player's entry arm */
  const side=(p,y0)=>{ let o=''; const enter=moves.find(m=>m.t==='enter'&&p===s.turn);
    for(let k=0;k<s.res[p];k++){ const x=28+k*26, y=y0; let inner=disc(x,y,9,p,''); if(k===0&&hint&&hint.t==='enter'&&p===s.turn) inner+=`<circle class="hint" cx="${x}" cy="${y}" r="14"/>`;
      o+=(k===0&&enter)?`<g ${goAttr({k:'enter'},`bring a pebble onto the mat with the ${ptBean}`)}>${inner}<circle class="ring" cx="${x}" cy="${y}" r="13"/><circle cx="${x}" cy="${y}" r="15" fill="transparent"/></g>`:inner; }
    for(let k=0;k<s.done[p];k++){ const x=W-28-k*26; o+=`<g opacity=".45">${disc(x,y0,9,p,'')}</g>`; } return o; };
  g+=side(1,W-22)+side(2,22);
  const me=c.human; let bar='';
  if(s.phase==='throw'){ bar=me?`<span class="hg-say">Throw the ${s.beans} beans. Each one painted face up moves a pebble by its own number.</span><button type="button" class="hg-act primary" data-hg="throw">Throw the beans</button>`:''; }
  else { const T=s.thrown||[]; bar=`<span class="lbl">Beans</span>`+T.map((u,k)=>{ const v=k+1, live=u&&up.includes(v); return `<button type="button" class="hg-die${!u?' used':''}" data-bean="${v}" aria-pressed="${me&&ptBean===v}" ${me&&live&&L.some(m=>m.v===v)?'':'disabled'} aria-label="bean ${v}${u?(live?', face up':', used'):', blank'}">${u?v:'·'}</button>`; }).join('');
    if(me&&!L.length) bar+=`<span class="hg-say">${up.length?'No bean can be used.':'All blank.'} <button type="button" class="hg-act" data-hg="pass">Pass</button></span>`;
    else if(me) bar+=`<span class="hg-say">Pick a bean, then a pebble, or the pebble waiting at the edge to bring it on.</span>`; }
  host.innerHTML=`<div class="hg"><svg viewBox="0 0 ${W} ${W}" role="group" aria-label="Patolli mat">${g}</svg></div><div class="hg-bar">${bar}</div>${keyRow(c,`${s.done[1]} of ${PT.PEBBLES} round`,`${s.done[2]} of ${PT.PEBBLES} round`)}`;
  bindGo(host,o=>{ if(!c.human) return; const m=o.k==='enter'?moves.find(mm=>mm.t==='enter'):moves.find(mm=>mm.i===o.i&&mm.t!=='enter'); if(m) c.play(m); });
  host.querySelectorAll('[data-bean]').forEach(b=>b.onclick=()=>{ ptBean=+b.dataset.bean; ptRender(host,s,c); });
  const th=host.querySelector('[data-hg="throw"]'); if(th) th.onclick=()=>c.play({t:'throw'});
  const ps=host.querySelector('[data-hg="pass"]'); if(ps) ps.onclick=()=>c.play({t:'pass'}); }
X.register({ id:'patolli', title:['Patolli'], blurb:'Throw the numbered beans and race six pebbles round the X-shaped mat. Every bean is its own move.', entryReady:true, judge:()=>null, aiDelay:420,
  defaults:{beans:'6'}, options:[{key:'beans',label:'Beans',values:[['6','Six'],['5','Five · slower']]}],
  diffs:DIFFS, diffNote:'Easy plays at random. Medium uses simple rules of thumb. Hard plays with the values learned by 300 evolved bots: hit the leader, get pebbles on early, stay out of reach.',
  rulesFor:o=>`<p>Patolli was played from the Classic Maya to the Aztec empire, for cloaks, jewels and even freedom, until Spanish friars burned the mats. Only fragments of the rules survive. What is recorded is tagged, and the rest is our reconstruction.</p>
<p><b>The mat.</b> A large X drawn on a mat ${tag('Attested')}, with 52 squares in one loop round the cross ${tag('Scholarly reading')}. Each player has six pebbles, “six red and six blue” ${tag('Attested')}, and runs each one a full lap.</p>
<p><b>The beans.</b> Black beans, “five or six, depending upon how one wanted to play” (Durán) ${tag('Attested')}. Each bean is painted with “the number of squares which it could advance” ${tag('Attested')}: here bean 1 to bean ${o.beans||6} ${tag('Invented')}.</p>
<p><b>Your turn.</b> Throw the beans. Every bean that lands painted face up is a separate move: give each to any pebble ${tag('Our reconstruction')}. Any face-up bean can bring a new pebble onto your entry square, the ringed one.</p>
<p><b>Capture and winning.</b> Land exactly on an enemy pebble to send it off the mat; it must come on again ${tag('Invented')}. The first to bring all six pebbles round wins ${tag('Invented')}. With six beans, bot games were fair (51.5% for the first player) and 28% shorter than with five.</p>`,
  init:o=>PT.newState({beans:+o.beans||6}), actor:s=>s.turn, apply:(s,m)=>PT.apply(s,m), legal:s=>PT.legal(s),
  ai:(s,d)=>PT.ai(s,d), hint:s=>X.H(PT.ai(s,'hard'),s.phase==='throw'?'Throw the beans.':'Hard’s pick, from the values the evolved bots learned: hit the leader, enter early, stay out of reach.'),
  status(s,c){ if(s.over) return `<span class="who">${who(s.winner,c)} brought all six pebbles round</span>`; return turnLine(s,c,s.phase==='throw'?'throw the beans':`beans up: ${(s.up||[]).join(' · ')||'none'}`); },
  render:ptRender, diffLabel:o=>o.diff, modeLabel:o=>`${o.beans||6} beans`,
  result(s,c){ return {title:wins(s.winner,c),detail:`${who(s.winner,c)} ran all six pebbles round the mat.`}; },
  demo(host){ return tryDemo(host,{ init:()=>{ const s=PT.newState({beans:6,seed:3}); s.phase='move'; s.thrown=[false,true,false,true,true,false]; s.up=[5,4,2]; return s; },
    render:ptRender, note:'Beans <b>2, 4 and 5</b> landed face up. Each is its own move. Pick a bean, then bring a pebble on.',
    after:{ apply:(s,m)=>PT.apply(s,m), say:(s,m)=>m.t==='enter'?'<b>On the mat.</b> Use the other beans to move it, or bring on another.':m.t==='step'?'<b>Moved.</b> Splitting the throw is the whole skill.':'' } }); } });
})();
