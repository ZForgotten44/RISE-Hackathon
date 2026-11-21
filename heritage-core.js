/* heritage-core.js: the rules of the four heritage games, Morabaraba, Chaupar, Dasapada and Patolli. Pure functions on
   plain state objects, so the page, the computer players and (later) the room server all share one copy.
   Dice games keep their random seed inside the state, so a throw is just another move: replaying the same history
   gives the same throws, and undo can never be used to re-roll. */
(function(){
const root=typeof window!=='undefined'?window:(typeof self!=='undefined'?self:globalThis);
const clone=o=>JSON.parse(JSON.stringify(o));
/* the same xorshift the framework uses (games2.js rngOf), stepped from the state's own seed */
function rnd(s){ let x=s.seed>>>0||1; x^=x<<13; x>>>=0; x^=x>>>17; x^=x<<5; x>>>=0; s.seed=x; return x/4294967296; }
const newSeed=()=>(Math.floor(Math.random()*4294967295)>>>0)||7;

/* =============== Morabaraba (Mind Sports South Africa generalised rules) ===============
   24 points on three nested squares, ring r (0 outer, 2 inner), position i 0..7 clockwise from the top-left corner.
   Even i are corners, odd i are midpoints. Midpoints and corners both join the next ring: the corner diagonals are
   what make it Morabaraba rather than Nine Men's Morris. */
const MB=(()=>{
  const id=(r,i)=>r*8+((i%8)+8)%8;
  const ADJ=[...Array(24)].map(()=>[]); const link=(a,b)=>{ if(!ADJ[a].includes(b)){ ADJ[a].push(b); ADJ[b].push(a); } };
  for(let r=0;r<3;r++) for(let i=0;i<8;i++){ link(id(r,i),id(r,i+1)); if(r<2) link(id(r,i),id(r+1,i)); }
  const MILLS=[]; for(let r=0;r<3;r++) for(let i=0;i<8;i+=2) MILLS.push([id(r,i),id(r,i+1),id(r,i+2)]);
  for(let i=0;i<8;i++) MILLS.push([id(0,i),id(1,i),id(2,i)]);           // 4 midpoint lines + 4 corner diagonals
  const XY=(()=>{ const out=[]; const ring=[[0,0],[1,0],[2,0],[2,1],[2,2],[1,2],[0,2],[0,1]];
    for(let r=0;r<3;r++) for(const [a,b] of ring){ const lo=r, hi=6-r; out.push([lo+a*(hi-lo)/2, lo+b*(hi-lo)/2]); } return out; })();
  const NAME=(()=>{ const cols='abcdefg'; return XY.map(([x,y])=>cols[x]+(7-y)); })();
  function newState(){ return {b:Array(24).fill(0),hand:[0,12,12],turn:1,shoot:false,quiet:0,ply:0,over:false,winner:0,last:null}; }
  const count=(s,p)=>s.b.reduce((n,v)=>n+(v===p?1:0),0);
  const inMill=(b,pt,p)=>MILLS.some(m=>m.includes(pt)&&m.every(x=>b[x]===p));
  const flying=(s,p)=>s.hand[p]===0&&count(s,p)===3;
  function shootable(s,p){ const foe=3-p, all=[]; for(let i=0;i<24;i++) if(s.b[i]===foe) all.push(i);
    const free=all.filter(i=>!inMill(s.b,i,foe)); return free.length?free:all; }
  function legal(s){ if(s.over) return []; const p=s.turn, out=[];
    if(s.shoot) return shootable(s,p).map(at=>({t:'shoot',at}));
    if(s.hand[p]>0){ for(let i=0;i<24;i++) if(!s.b[i]) out.push({t:'place',to:i}); return out; }
    const fly=flying(s,p); for(let i=0;i<24;i++) if(s.b[i]===p){ const to=fly?[...Array(24).keys()]:ADJ[i]; for(const j of to) if(!s.b[j]) out.push({t:'move',from:i,to:j}); }
    return out; }
  function end(s){ const p=s.turn, foe=3-p;
    if(s.hand[foe]===0&&count(s,foe)<3){ s.over=true; s.winner=p; s.reason='cows'; return; }
    s.turn=foe;
    if(!legal(s).length){ s.over=true; s.winner=p; s.reason='blocked'; return; }
    if(s.hand[1]===0&&s.hand[2]===0&&count(s,1)===3&&count(s,2)===3&&s.quiet>=20){ s.over=true; s.winner=0; s.reason='draw10'; return; }
    if(s.quiet>=200){ s.over=true; s.winner=0; s.reason='draw'; } }
  function apply(s0,m){ const s=clone(s0), p=s.turn; s.ply++; s.last=m;
    if(m.t==='shoot'){ s.b[m.at]=0; s.shoot=false; s.quiet=0; end(s); return s; }
    if(m.t==='place'){ s.b[m.to]=p; s.hand[p]--; } else { s.b[m.from]=0; s.b[m.to]=p; }
    s.quiet++;
    const pt=m.to; if(MILLS.some(x=>x.includes(pt)&&x.every(y=>s.b[y]===p))){ s.shoot=true; s.mill=MILLS.filter(x=>x.includes(pt)&&x.every(y=>s.b[y]===p)); return s; }
    s.mill=null; end(s); return s; }
  /* evaluation for the computer, from the mover's side: cows on and in hand, mills, open two-in-a-rows, mobility */
  function evalFor(s,p){ if(s.over) return s.winner===p?1e6:s.winner?-1e6:0; const foe=3-p;
    let v=(count(s,p)+s.hand[p]-count(s,foe)-s.hand[foe])*100;
    for(const m of MILLS){ const a=m.filter(x=>s.b[x]===p).length, b=m.filter(x=>s.b[x]===foe).length, e=3-a-b;
      if(a===3) v+=14; if(b===3) v-=14; if(a===2&&e===1) v+=9; if(b===2&&e===1) v-=11; }
    if(s.hand[p]===0&&s.hand[foe]===0){ const t=s.turn; s.turn=p; const mp=legal(s).length; s.turn=foe; const mf=legal(s).length; s.turn=t; v+=(mp-mf)*3; }
    return v; }
  return {ADJ,MILLS,XY,NAME,newState,legal,apply,count,inMill,flying,evalFor};
})();

/* alpha-beta for Morabaraba. A shoot is its own ply by the same player, so the search follows s.turn, not depth parity. */
function mbSearch(s,depth,me,a,b){ if(depth<=0||s.over) return MB.evalFor(s,me);
  const L=MB.legal(s); if(!L.length) return MB.evalFor(s,me); const maxi=s.turn===me;
  let best=maxi?-Infinity:Infinity;
  for(const m of L){ const n=MB.apply(s,m); const v=mbSearch(n,depth-(n.turn===s.turn?0.5:1),me,a,b);
    if(maxi){ if(v>best) best=v; if(v>a) a=v; } else { if(v<best) best=v; if(v<b) b=v; } if(b<=a) break; }
  return best; }
function mbAI(s,level){ const L=MB.legal(s); if(!L.length) return null; const me=s.turn;
  if(level==='easy'&&Math.random()<.6) return L[Math.floor(Math.random()*L.length)];
  const depth=level==='easy'?1:level==='medium'?2:(s.hand[1]+s.hand[2]>10?3:4);
  let best=null, bv=-Infinity; const order=L.map(m=>({m,n:MB.apply(s,m)})).sort(()=>Math.random()-.5);
  for(const {m,n} of order){ const v=mbSearch(n,depth-(n.turn===s.turn?0.5:1),me,-Infinity,Infinity); if(v>bv){ bv=v; best=m; } }
  return best; }

/* =============== Chaupar (living tradition; two players, each with two partner colours) ===============
   The cross: four arms of 3 columns x 8 squares around the centre (the charkoni). Each colour enters down the middle
   column of its own arm, runs anticlockwise round the outer columns of all four arms, then comes back up its own
   middle column to the centre. Arms: 0 south, 1 east, 2 north, 3 west. Player 1 plays south and north, player 2 east
   and west, so partners sit opposite each other as in the courtyard game.
   A square is [arm, col, row]: col 0 = left, 1 = middle, 2 = right (seen from the centre, looking out), row 0 next to
   the centre, row 7 at the arm's end. */
const CH=(()=>{
  const FACES=[1,2,5,6];                                   // the long dice (pasa): four faces
  const PER=4;                                             // pieces per colour
  function path(arm){ const P=[]; for(let r=0;r<8;r++) P.push([arm,1,r]);          // down your own middle column
    for(let r=7;r>=0;r--) P.push([arm,2,r]);                                         // back up your right-hand column
    for(let k=1;k<=3;k++){ const a=(arm+k)%4; for(let r=0;r<8;r++) P.push([a,0,r]); P.push([a,1,7]); for(let r=7;r>=0;r--) P.push([a,2,r]); }   // round each arm's end square
    for(let r=0;r<8;r++) P.push([arm,0,r]);                                          // out along your left-hand column
    for(let r=7;r>=0;r--) P.push([arm,1,r]);                                         // and home up the middle
    return P; }
  const PATHS=[0,1,2,3].map(path), LEN=PATHS[0].length, HOME=LEN;   // progress HOME = reached the centre
  const key=q=>q.join(',');
  const SAFE=new Set(); for(let a=0;a<4;a++){ SAFE.add(key([a,1,7])); SAFE.add(key([a,0,3])); SAFE.add(key([a,2,3])); }
  const ARMS=[[0,2],[1,3]];                                // player 1, player 2
  const owner=arm=>arm%2===0?1:2;
  function newState(o){ const per=+((o&&o.per)||PER); const s={turn:1,phase:'throw',dice:null,pcs:[],per,seed:(o&&o.seed)||newSeed(),over:false,winner:0,last:null,captures:[0,0,0]};
    for(let a=0;a<4;a++) for(let k=0;k<per;k++) s.pcs.push({arm:a,pos:-1});   // -1 = waiting in the centre, HOME = finished
    return s; }
  const sq=pc=>PATHS[pc.arm][pc.pos];
  const occupants=(s,q)=>s.pcs.map((pc,i)=>({pc,i})).filter(({pc})=>pc.pos>=0&&pc.pos<HOME&&key(sq(pc))===key(q));
  /* one die moves one piece: enter (a 1 or a 6 brings a piece onto its first square), or step forward exactly */
  function dieMoves(s,v){ const p=s.turn, out=[];
    s.pcs.forEach((pc,i)=>{ if(owner(pc.arm)!==p||pc.pos>=HOME) return;
      let to; if(pc.pos<0){ if(v!==1&&v!==6) return; to=0; } else to=pc.pos+v;
      if(to>HOME) return;                                  // home needs the exact count
      if(to<HOME){ const here=occupants(s,PATHS[pc.arm][to]); const foes=here.filter(o=>owner(o.pc.arm)!==p);
        if(foes.length>=2&&!SAFE.has(key(PATHS[pc.arm][to]))) return; }  // a pair of enemy pieces blocks the square
      out.push({t:'move',v,pc:i,to}); });
    return out; }
  function legal(s){ if(s.over) return []; if(s.phase==='throw') return [{t:'throw'}];
    const seen=new Set(), out=[]; for(const v of s.dice){ if(seen.has(v)) continue; seen.add(v); out.push(...dieMoves(s,v)); }
    return out.length?out:[{t:'pass'}]; }
  const homeCount=(s,p)=>s.pcs.filter(pc=>owner(pc.arm)===p&&pc.pos===HOME).length;
  function nextTurn(s){ const tri=s.thrown&&s.thrown[0]===s.thrown[1]&&s.thrown[1]===s.thrown[2]; s.phase='throw'; s.dice=null;
    if(!tri) s.turn=3-s.turn; s.again=tri; }
  function apply(s0,m){ const s=clone(s0); s.last=m;
    if(m.t==='throw'){ s.thrown=[0,0,0].map(()=>FACES[Math.floor(rnd(s)*4)]); s.dice=s.thrown.slice(); s.phase='move'; s.again=false;
      if(legal(s)[0].t==='pass'){ s.stuck=true; } else s.stuck=false; return s; }
    if(m.t==='pass'){ nextTurn(s); return s; }
    const pc=s.pcs[m.pc], p=s.turn; s.dice.splice(s.dice.indexOf(m.v),1); s.hit=null;
    pc.pos=m.to;
    if(m.to<HOME){ const q=sq(pc); if(!SAFE.has(key(q))){ const foes=occupants(s,q).filter(o=>owner(o.pc.arm)!==p); if(foes.length===1){ foes[0].pc.pos=-1; s.captures[p]++; s.hit=foes[0].i; } } }
    if(homeCount(s,p)===s.per*2){ s.over=true; s.winner=p; return s; }
    if(!s.dice.length||legal(s)[0].t==='pass'){ nextTurn(s); }
    return s; }
  /* the computer: one die at a time, scored by what the move does (from strategy notes on the race: capture, enter,
     reach safety, don't stop in front of an enemy) */
  function danger(s,p,pcIdx,to){ const pc=s.pcs[pcIdx]; if(to>=HOME) return 0; const q=PATHS[pc.arm][to]; if(SAFE.has(key(q))) return 0; let d=0;
    s.pcs.forEach(e=>{ if(owner(e.arm)===p||e.pos<0||e.pos>=HOME) return; for(const v of [1,2,5,6,3,4,7,8,10,11,12]){ const t=e.pos+v; if(t<HOME&&key(PATHS[e.arm][t])===key(q)){ d+=v<=6?1:.4; break; } } }); return d; }
  function score(s,m,level){ if(m.t!=='move') return 0; const p=s.turn, pc=s.pcs[m.pc]; let v=0;
    const q=m.to<HOME?PATHS[pc.arm][m.to]:null;
    if(q&&!SAFE.has(key(q))&&occupants(s,q).some(o=>owner(o.pc.arm)!==p)) v+=60+(occupants(s,q).find(o=>owner(o.pc.arm)!==p).pc.pos)*.6;
    if(pc.pos<0) v+=30; if(m.to===HOME) v+=45; if(q&&SAFE.has(key(q))) v+=12;
    v+=m.v*1.5;
    if(level==='hard'){ v-=danger(s,p,m.pc,m.to)*(18+pc.pos*.25); if(pc.pos>=0&&pc.pos<HOME){ const here=PATHS[pc.arm][pc.pos]; if(!SAFE.has(key(here))) v+=danger(s,p,m.pc,pc.pos)*10; } }
    return v; }
  function ai(s,level){ const L=legal(s); if(L.length===1) return L[0];
    if(level==='easy') return L[Math.floor(Math.random()*L.length)];
    let best=L[0], bv=-Infinity; for(const m of L){ const v=score(s,m,level)+Math.random()*.01; if(v>bv){ bv=v; best=m; } } return best; }
  return {FACES,PER,PATHS,LEN,HOME,SAFE,ARMS,key,owner,newState,legal,apply,homeCount,ai,score,sq};
})();

/* =============== Dasapada, "Krta Walks" (reconstructed from period sources; see the rules text for each tag) ===============
   10 x 10. Player 1 crosses upward from row 0, player 2 downward from row 9. A piece's row is kept in its own frame
   (0 = its home row, 9 = the far edge). Postures: 0 lying, 1 risen, 2 standing. A throw is a grab of nuts from a pile
   of 53, counted off by fours: remainder 0 Krta (walks 4, throws again), 3 Treta (stands, or walks 3),
   2 Dvapara (rises, or walks 2), 1 Kali (something lies down). */
const DP=(()=>{
  const LY=0,RI=1,ST=2, WIN=3, PILE=53, SEEN=12;
  const NAMES={4:'Kṛta',3:'Tretā',2:'Dvāpara',1:'Kali'}, VERB={4:'walks',3:'stands',2:'rises',1:'lies down'};
  const THROW={0:4,3:3,2:2,1:1};
  const GRAB={small:[5,9],medium:[10,14],large:[15,19]};
  function newState(o){ const s={turn:1,phase:'throw',t:0,pile:PILE,p:[null,[],[]],home:[0,0,0],seed:(o&&o.seed)||newSeed(),over:false,winner:0,last:null,grab:null};
    for(let c=0;c<10;c+=2) s.p[1].push({c,r:0,st:LY}); for(let c=1;c<10;c+=2) s.p[2].push({c,r:0,st:LY}); return s; }
  const ab=(pl,r)=>pl===1?r:9-r;
  function occ(s,c,ar){ for(const pl of [1,2]) for(const q of s.p[pl]) if(q.c===c&&ab(pl,q.r)===ar) return {pl,q}; return null; }
  const adj=(s,pl,a,b)=>Math.abs(a.c-b.c)<=1&&Math.abs(ab(pl,a.r)-ab(3-pl,b.r))<=1;
  function acts(s){ const pl=s.turn, t=s.t, mine=s.p[pl], out=[];
    if(t===1){ mine.forEach((q,i)=>{ if(q.st>LY) out.push({t:'down',i}); });
      const foes=new Set(); mine.forEach(q=>{ if(q.st===ST) s.p[3-pl].forEach((e,j)=>{ if(e.st>LY&&adj(s,pl,q,e)) foes.add(j); }); });
      foes.forEach(j=>out.push({t:'curse',j})); return out.length?out:[{t:'pass'}]; }
    if(t===4&&!mine.some(q=>q.st===ST)){ mine.forEach((q,i)=>{ if(q.st===RI) out.push({t:'stand',i}); else if(q.st===LY) out.push({t:'rise',i}); }); if(out.length) return out; }
    mine.forEach((q,i)=>{ if(t===2&&q.st===LY) out.push({t:'rise',i}); if(t===3&&q.st===RI) out.push({t:'stand',i});
      if(q.st===ST&&t>=2) for(const dc of [-1,0,1]){ const nc=q.c+dc; if(nc<0||nc>9) continue; const nr=Math.min(q.r+t-(dc?1:0),9);
        if(nr>=9){ out.push({t:'walk',i,c:nc,r:9,cross:true}); continue; }
        const o=occ(s,nc,ab(pl,nr)); if(o&&o.pl===pl) continue; out.push({t:'walk',i,c:nc,r:nr,hit:!!o}); } });
    return out.length?out:[{t:'pass'}]; }
  function legal(s){ if(s.over) return []; if(s.phase==='throw'){ const L=[{t:'grab',size:'small'},{t:'grab',size:'medium'},{t:'grab',size:'large'}]; if(s.pile<SEEN) L.push({t:'all'}); return L; } return acts(s); }
  function homeCol(s,pl,c){ const taken=k=>s.p[pl].some(q=>q.r===0&&q.c===k)||s.p[3-pl].some(q=>ab(3-pl,q.r)===ab(pl,0)&&q.c===k);
    for(let d=0;d<10;d++) for(const k of [c-d,c+d]) if(k>=0&&k<10&&!taken(k)) return k; return c; }
  function finishAct(s){ if(s.home[s.turn]>=WIN){ s.over=true; s.winner=s.turn; return; }
    if(s.t===4){ s.phase='throw'; s.again=true; return; } s.phase='throw'; s.again=false; s.turn=3-s.turn; }
  function apply(s0,m){ const s=clone(s0); s.last=m; const pl=s.turn;
    if(m.t==='grab'||m.t==='all'){ let k;
      if(m.t==='all') k=s.pile; else { const [lo,hi]=GRAB[m.size]; k=Math.min(s.pile,lo+Math.floor(rnd(s)*(hi-lo+1))); }
      s.pile-=k; const rem=k%4; s.t=THROW[rem]; s.grab={k,rem,all:m.t==='all'}; if(s.pile<=0||m.t==='all') s.pile=PILE;
      s.phase='act'; s.hit=null; return s; }
    s.hit=null;
    if(m.t==='pass'){ finishAct(s); return s; }
    if(m.t==='down') s.p[pl][m.i].st=LY; else if(m.t==='curse') s.p[3-pl][m.j].st=LY;
    else if(m.t==='rise') s.p[pl][m.i].st=RI; else if(m.t==='stand') s.p[pl][m.i].st=ST;
    else if(m.t==='walk'){ const q=s.p[pl][m.i];
      if(m.cross){ s.p[pl].splice(m.i,1); s.home[pl]++; }
      else { const o=occ(s,m.c,ab(pl,m.r)); if(o&&o.pl!==pl){ o.q.r=0; o.q.st=LY; o.q.c=-1; o.q.c=homeCol(s,o.pl,m.c); s.hit={pl:o.pl}; } q.c=m.c; q.r=m.r; } }
    finishAct(s); return s; }
  /* computer players: the bot weights found by 300 evolved strategies (research/sim, champion) for Hard, the
     hand-written starting weights for Medium, random for Easy */
  const W={ hard:[-0.792,0.141,6.641,-0.361,-1.68,1.487,-0.665,-0.781,-4.31,1.495,0.75,2.525,0.746,-0.884,0.667,-4.104],
    medium:[1,5,3,1.5,1.2,1,-1,-1,-0.3,0.2,-0.5,0.5,1,-1,-1,1] };
  function danger(s,pl,c,ar){ for(const q of s.p[3-pl]) if(q.st===ST&&Math.abs(q.c-c)<=1&&Math.abs(ab(3-pl,q.r)-ar)<=1) return 1; return 0; }
  function feats(s,m){ const pl=s.turn, f=Array(12).fill(0);
    if(m.t==='walk'){ const q=s.p[pl][m.i]; f[0]=m.r-q.r; f[1]=m.cross?1:0; f[2]=m.hit?1:0; f[8]=m.c!==q.c?1:0; f[9]=q.r/9; f[10]=m.cross?0:danger(s,pl,m.c,ab(pl,m.r)); }
    else if(m.t==='curse'){ f[3]=1; f[11]=s.p[3-pl][m.j].r/9; }
    else if(m.t==='stand'){ f[4]=1; f[9]=s.p[pl][m.i].r/9; } else if(m.t==='rise'){ f[5]=1; f[9]=s.p[pl][m.i].r/9; }
    else if(m.t==='down'){ const q=s.p[pl][m.i]; f[6]=q.st; f[7]=q.r/9; } return f; }
  function ai(s,level){ const L=legal(s); if(L.length===1) return L[0];
    if(s.phase==='throw'){ const w=W[level]; if(s.pile<SEEN&&w){ const rem=s.pile%4; if(w[12+rem]>0) return {t:'all'}; }
      return {t:'grab',size:['small','medium','large'][Math.floor(Math.random()*3)]}; }
    if(level==='easy') return L[Math.floor(Math.random()*L.length)];
    const w=W[level]; let best=L[0], bv=-Infinity;
    for(const m of L){ const f=m.t==='pass'?null:feats(s,m); const v=(f?f.reduce((a,x,k)=>a+x*w[k],0):0)+Math.random()*1e-6; if(v>bv){ bv=v; best=m; } } return best; }
  return {LY,RI,ST,WIN,PILE,SEEN,NAMES,VERB,newState,legal,apply,ai,ab,occ};
})();

/* =============== Patolli, "Durán's Mat" (reconstructed; numbered beans after Durán) ===============
   One shared loop of 52 squares round the cross: 4 arms of 2 lanes x 6 squares, plus 4 centre squares. Player 1 enters
   on square 0 (south arm), player 2 on square 26 (north arm), and each pebble runs one full lap of 52 and leaves the mat.
   Beans: each is painted with its own number (1..n); a bean that lands painted face up is a move of that many squares,
   and each one moves a pebble of your choice. Any face-up bean can bring a new pebble onto your entry square. */
const PT=(()=>{
  const TRACK=52, START=[0,0,26], PEBBLES=6;
  function newState(o){ const beans=+((o&&o.beans)||6); return {turn:1,phase:'throw',beans,up:null,prog:[null,[],[]],res:[0,PEBBLES,PEBBLES],done:[0,0,0],seed:(o&&o.seed)||newSeed(),over:false,winner:0,last:null,thrown:null}; }
  const sqOf=(pl,pr)=>(START[pl]+pr)%TRACK;
  const at=(s,pl,sq)=>s.prog[pl].findIndex(pr=>sqOf(pl,pr)===sq);
  function beanMoves(s,v){ const pl=s.turn, out=[];
    if(s.res[pl]>0&&at(s,pl,sqOf(pl,0))<0) out.push({t:'enter',v,hit:at(s,3-pl,sqOf(pl,0))>=0});
    s.prog[pl].forEach((pr,i)=>{ const n=pr+v; if(n>=TRACK){ out.push({t:'off',v,i}); return; } const sq=sqOf(pl,n); if(at(s,pl,sq)>=0) return; out.push({t:'step',v,i,to:n,hit:at(s,3-pl,sq)>=0}); });
    return out; }
  function legal(s){ if(s.over) return []; if(s.phase==='throw') return [{t:'throw'}];
    const out=[]; for(const v of new Set(s.up)) out.push(...beanMoves(s,v)); return out.length?out:[{t:'pass'}]; }
  function endTurn(s){ s.phase='throw'; s.up=null; s.turn=3-s.turn; }
  function apply(s0,m){ const s=clone(s0); s.last=m; const pl=s.turn; s.hit=null;
    if(m.t==='throw'){ s.thrown=[]; for(let v=1;v<=s.beans;v++) s.thrown.push(rnd(s)<.5); s.up=[]; s.thrown.forEach((u,k)=>{ if(u) s.up.push(k+1); }); s.up.sort((a,b)=>b-a);
      s.phase='move'; if(!s.up.length||legal(s)[0].t==='pass') s.stuck=true; else s.stuck=false; return s; }
    if(m.t==='pass'){ endTurn(s); return s; }
    s.up.splice(s.up.indexOf(m.v),1);
    if(m.t==='enter'){ s.res[pl]--; s.prog[pl].push(0); const j=at(s,3-pl,sqOf(pl,0)); if(j>=0){ s.prog[3-pl].splice(j,1); s.res[3-pl]++; s.hit={pl:3-pl,sq:sqOf(pl,0)}; } }   // entering onto an enemy hits it too
    else if(m.t==='off'){ s.prog[pl].splice(m.i,1); s.done[pl]++; }
    else { const sq=sqOf(pl,m.to), j=at(s,3-pl,sq); if(j>=0){ s.prog[3-pl].splice(j,1); s.res[3-pl]++; s.hit={pl:3-pl,sq}; } s.prog[pl][m.i]=m.to; }
    if(s.done[pl]===PEBBLES){ s.over=true; s.winner=pl; return s; }
    if(!s.up.length||legal(s)[0].t==='pass') endTurn(s);
    return s; }
  /* computer players: the evolved champion's weights for 6 beans (research/sim) for Hard, the hand-written ones for Medium */
  const W={ hard:[-3.214,2.125,5.936,3.605,2.557,3.301,-1.401,1.072,0.752,-1.714], medium:[5,3,3,2,1,-0.5,-1,1,0.2,-0.2] };
  function danger(s,pl,sq){ for(const pr of s.prog[3-pl]){ const d=((sq-sqOf(3-pl,pr))%TRACK+TRACK)%TRACK; if(d>=1&&d<=s.beans&&pr+d<TRACK) return 1; } return 0; }
  function feats(s,m){ const pl=s.turn, f=Array(10).fill(0);
    if(m.t==='enter'){ f[4]=1; f[5]=m.v/s.beans; f[6]=danger(s,pl,sqOf(pl,0)); }
    else if(m.t==='off'){ const pr=s.prog[pl][m.i]; f[0]=(TRACK-pr)/TRACK; f[1]=1; f[8]=pr/TRACK; f[7]=danger(s,pl,sqOf(pl,pr)); }
    else if(m.t==='step'){ const pr=s.prog[pl][m.i], sq=sqOf(pl,m.to), j=at(s,3-pl,sq); f[0]=(m.to-pr)/TRACK; f[8]=pr/TRACK;
      if(j>=0){ f[2]=1; f[3]=s.prog[3-pl][j]/TRACK; } f[6]=danger(s,pl,sq); f[7]=danger(s,pl,sqOf(pl,pr)); f[9]=sq===START[3-pl]?1:0; }
    return f; }
  function ai(s,level){ const L=legal(s); if(L.length===1) return L[0];
    if(level==='easy') return L[Math.floor(Math.random()*L.length)];
    /* the sim spends the biggest bean first; here every bean is a choice, so the bot picks the best (bean, pebble) pair */
    const w=W[level]; let best=L[0], bv=-Infinity;
    for(const m of L){ const v=feats(s,m).reduce((a,x,k)=>a+x*w[k],0)+m.v*.001+Math.random()*1e-6; if(v>bv){ bv=v; best=m; } } return best; }
  return {TRACK,START,PEBBLES,newState,legal,apply,ai,sqOf,at};
})();

const API={MB,CH,DP,PT,mbAI,rnd};
root.ZF_HERITAGE=API;
if(typeof module!=='undefined'&&module.exports) module.exports=API;
})();
