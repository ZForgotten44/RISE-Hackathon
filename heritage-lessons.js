/* heritage-lessons.js: How to play for Morabaraba, Chaupar, Dasapada and Patolli, in the same shape as lessons.js
   (goal > watch > try > not allowed > how it ends), on the real board drawn by each game's own renderer.
   Practice boards are their own small states and never touch a live match. Loaded after lessons.js. */
(function(){
const L=window.ZLessons, X=window.ZFX, H=window.ZF_HERITAGE; if(!L||!X||!H) return;
const {MB,CH,DP,PT}=H;
const $=(t,c)=>{ const e=document.createElement(t); if(c) e.className=c; return e; };
/* in the drawer the duck's note does the explaining, so the board drops its own key and hint line and gets the room */
try{ const st=document.createElement('style'); st.id='hg-ls-css'; st.textContent='#lsStage .hg-key,#lsStage .hg-bar .hg-say{display:none}#lsStage .ls-real{max-width:480px}#lsStage .hg{width:min(100%,480px)}#lsStage .hg .cell{fill:var(--g2);stroke:var(--g3)}#lsStage .hg .cell.safe{fill:var(--g3)}#lsStage .hg .mark{opacity:.8}#lsStage .hg svg[data-crop]{overflow:hidden;height:min(44vh,400px);width:auto;max-width:100%;margin:0 auto}#lsStage .hg-bar{margin-top:8px}'; document.head.appendChild(st); }catch(e){}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const deny=(el,a,msg)=>{ if(el){ el.classList.add('ls-no'); setTimeout(()=>el.classList.remove('ls-no'),420); } a.note(msg); if(window.ZS) ZS.play('tap'); };
/* draw a practice state with the game's own renderer; play(m) gets every move the learner makes */
const real=(id,h,st,play,extra)=>{ h.innerHTML=''; const box=$('div','ls-real'); h.appendChild(box);
  const o=Object.assign({human:!st.over,humanIs:1,opp:'ai',opt:{},demo:true,play:play||(()=>{})},extra||{}); X.def(id).render(box,st,o);
  if(o.crop){ const svg=box.querySelector('.hg svg'); if(svg){ svg.setAttribute("viewBox",o.crop.join(" ")); svg.dataset.crop="1"; } } return box; };
const SOUTH=[111,150,286,358];   // Chaupar: the centre and your own (south) arm, close up
/* a tap on the board that is not on a highlighted piece or point */
const offTarget=(box,fn)=>{ const svg=box.querySelector('.hg svg'); if(svg) svg.addEventListener('click',e=>{ if(!e.target.closest('.go')) fn(); }); };

/* ======================= Morabaraba =======================
   points: ring 0 outer, 1 middle, 2 inner; on each ring 0 top-left, 1 top, 2 top-right, 3 right, 4 bottom-right,
   5 bottom, 6 bottom-left, 7 left. Point id = ring*8 + position. */
function mbState(o){ const s=MB.newState(); (o.p1||[]).forEach(i=>s.b[i]=1); (o.p2||[]).forEach(i=>s.b[i]=2);
  s.hand=o.hand||[0,12-(o.p1||[]).length,12-(o.p2||[]).length]; s.turn=1; if(o.mill){ s.shoot=true; s.mill=o.mill; } return s; }
L.add('morabaraba',()=>[
 {kind:'goal',title:'Make mills, shoot cows',text:'Each player has <b>12 cows</b>. Three of your cows in a straight line, <b>diagonals included</b>, make a <b>mill</b>. Every new mill lets you shoot one enemy cow off the board.',
  mount(h,a){ real('morabaraba',h,mbState({p1:[0,1,2,12],p2:[9,20,14],mill:[[0,1,2]]}),null,{human:false}); a.note('Solid has three along the top edge: a mill. Now one open cow gets shot.'); }},
 {kind:'watch',title:'Place, mill, shoot',text:'First you take turns <b>placing</b> cows on empty points. The moment you complete a line of three, you <b>shoot</b>: pick any enemy cow and take it off.',
  mount(h,a){ let s; const draw=()=>real('morabaraba',h,s,null,{human:false}); const build=()=>{ s=mbState({p1:[0,1],p2:[9,20]}); draw(); a.note('Solid to place. Two cows already sit on the top edge.'); }; build();
   return {reset:build, async show(){ await sleep(500); s=MB.apply(s,{t:'place',to:2}); draw(); a.note('<b>The third cow lands.</b> Three in a line: a mill.'); await sleep(1600); s=MB.apply(s,{t:'shoot',at:20}); draw(); a.note('<b>Shot.</b> One open cow is off the board for good.'); }}; }},
 {kind:'try',title:'Make your mill',text:'Your two cows sit on the inner square. <b>Place the third</b> on the dashed point, then <b>shoot</b> any open cow.',
  mount(h,a){ let s=mbState({p1:[16,17],p2:[9,13,4]}), done=false;
   const go=m=>{ if(done) return; if(m.t==='place'&&m.to!==18){ deny(h.querySelector('.hg'),a,'<b>Legal, but no mill.</b> Put the cow on the dashed point to finish the line.'); return; }
     s=MB.apply(s,m); if(m.t==='shoot'){ done=true; draw(); a.note('<b>Mill and shot.</b> That is the whole rhythm of the game.'); a.ok(); return; } draw(); a.note('<b>A mill!</b> Now tap an open cow to shoot it.'); };
   const draw=()=>real('morabaraba',h,s,go,{human:!done,hintMove:!s.shoot&&!done?{t:'place',to:18}:null}); draw(); a.note('Tap the dashed point.');
   return {async show(){ go({t:'place',to:18}); await sleep(1100); go({t:'shoot',at:13}); }}; }},
 {kind:'cant',title:'Cows in a mill are safe',text:'You just made a mill. The three open cows along the top <b>also stand in a mill</b>. Try to shoot one of them.',
  mount(h,a){ let s=mbState({p1:[0,1,2],p2:[8,9,10,20],mill:[[0,1,2]]}), done=false;
   const draw=()=>{ const box=real('morabaraba',h,s,m=>{ if(done) return; done=true; s=MB.apply(s,m); draw(); a.note('<b>Shot.</b> A lone cow is the only fair target. You may shoot a cow in a mill only when every enemy cow stands in one.'); a.ok(); },{human:!done});
     if(!done) offTarget(box,()=>deny(box.querySelector('.hg'),a,'<b>Not allowed.</b> Those three stand in a mill, so they are safe. Shoot the lone cow.')); };
   draw(); a.note('Tap one of the three open cows at the top.'); return {async show(){ h.querySelector('.hg svg').dispatchEvent(new MouseEvent('click',{bubbles:true})); await sleep(1300); const g=h.querySelector('.go'); if(g) g.dispatchEvent(new MouseEvent('click',{bubbles:true})); }}; }},
 {kind:'end',title:'Two cows left and you lose',text:'Once all cows are placed, you <b>move</b> one cow along a line to the next empty point. With only <b>three</b> left, a cow may <b>fly</b> anywhere. Leave your opponent <b>two cows</b>, or no move, and you win.',
  mount(h,a){ let s=mbState({p1:[0,1,3,12,21],p2:[17,22,14],hand:[0,0,0]}), done=false;
   const go=m=>{ if(done) return; if(m.t==='move'&&!(m.from===3&&m.to===2)){ deny(h.querySelector('.hg'),a,'<b>Legal, but no mill.</b> Slide the dashed cow up into the top-right corner.'); return; }
     s=MB.apply(s,m); draw(); if(s.over){ done=true; draw(); a.note('<b>Two cows left: open loses.</b> Solid wins the herd.'); a.ok(); } else a.note('<b>Mill.</b> Shoot one of the three: open is down to two.'); };
   const draw=()=>real('morabaraba',h,s,go,{human:!done&&!s.over,hintMove:!s.shoot&&!s.over?{t:'move',from:3,to:2}:null}); draw(); a.note('Open has three cows left. Tap the dashed cow, then the corner above it.');
   return {async show(){ go({t:'move',from:3,to:2}); await sleep(1200); go({t:'shoot',at:17}); }}; }}
]);

/* ======================= Chaupar =======================
   one piece per colour here: piece 0 = your circles (south arm), 1 = their circles (east), 2 = your squares (north),
   3 = their squares (west). A piece's position counts along its own road; -1 waits in the centre. */
const chAt=(arm,q)=>CH.PATHS[arm].findIndex(x=>x.join()===q.join());
function chState(pos,dice){ const s=CH.newState({per:1,seed:7}); pos.forEach((p,i)=>s.pcs[i].pos=p); s.turn=1;
  if(dice){ s.phase='move'; s.thrown=dice.slice(); s.dice=dice.slice(); } return s; }
L.add('chaupar',()=>[
 {kind:'goal',title:'Bring both colours home',text:'You play <b>two colours</b> that sit opposite: <b>solid circles</b> and <b>solid squares</b>. Every piece starts in the centre, runs down its own arm, <b>all the way round the cross</b>, and back into the centre. Both colours home first wins.',
  mount(h,a){ real('chaupar',h,chState([20,34,CH.HOME,-1]),null,{human:false}); a.note('Your circle is halfway round. Your square is already home in the centre.'); }},
 {kind:'watch',title:'Throw, then move',text:'Throw <b>three long dice</b> marked 1, 2, 5 and 6. <b>Each die moves one piece</b> by its number. A <b>1 or a 6</b> brings a waiting piece in from the centre.',
  mount(h,a){ let s; const draw=()=>real('chaupar',h,s,null,{human:false,crop:SOUTH}); const build=()=>{ s=chState([-1,-1,-1,-1],[6,5,2]); draw(); a.note('Solid threw <b>6 · 5 · 2</b>.'); }; build();
   return {reset:build, async show(){ await sleep(500); s=CH.apply(s,{t:'move',v:6,pc:0,to:0}); draw(); a.note('<b>The 6 brings the circle in</b> onto the first square of its arm.'); await sleep(1500);
     s=CH.apply(s,{t:'move',v:5,pc:0,to:5}); draw(); a.note('<b>The 5 moves it five squares</b> down the middle of the arm.'); await sleep(1500);
     s=CH.apply(s,{t:'move',v:2,pc:0,to:7}); draw(); a.note('<b>The 2 takes it to the end of the arm.</b> All three dice used: the turn passes.'); }}; }},
 {kind:'try',title:'Bring a piece in',text:'You threw <b>6 · 2 · 5</b>. Only a 1 or a 6 brings a piece in, so the <b>6</b> is picked for you. Tap a <b>solid piece</b> waiting in the centre.',
  mount(h,a){ let s=chState([-1,-1,-1,-1],[6,2,5]), n=0;
   const go=m=>{ if(n>=2) return; s=CH.apply(s,m); n++; draw(); if(n===1) a.note('<b>In.</b> Now the 2 and the 5 can move it. Pick one, then the piece.'); else { a.note('<b>Moved.</b> You split your throw between your pieces as you like.'); a.ok(); } };
   const draw=()=>real('chaupar',h,s,go,{human:n<2&&s.turn===1,crop:SOUTH}); draw(); a.note('Tap one of your solid pieces in the centre.');
   return {async show(){ go({t:'move',v:6,pc:0,to:0}); await sleep(1100); go({t:'move',v:5,pc:0,to:5}); }}; }},
 {kind:'cant',title:'No capture on a crossed square',text:'Land on a <b>single enemy piece</b> to send it back to the centre. But the <b>crossed squares are safe</b>: there, pieces simply share. You have a <b>2</b> and a <b>5</b>.',
  mount(h,a){ const build=()=>chState([10,chAt(1,[0,2,3]),-1,chAt(3,[0,2,0])],[2,5]); let s=build(), done=false;
   const go=m=>{ if(done) return; done=true; s=CH.apply(s,m); draw(); if(s.hit!=null){ a.note('<b>Captured.</b> The open piece goes back to the centre and must come in again.'); a.ok(); }
     else a.note('<b>Safe square: nobody is captured.</b> The two pieces share it. Try again and use the 5.'); };
   const draw=()=>real('chaupar',h,s,go,{human:!done,crop:SOUTH}); draw(); a.note('Try the 2 first: it lands on the crossed square with an open piece.');
   return {reset(){ s=build(); done=false; draw(); }, async show(){ go({t:'move',v:5,pc:0,to:15}); }}; }},
 {kind:'end',title:'Home needs the exact count',text:'Your square is home. Your circle is <b>two squares</b> from the centre. A die bigger than that cannot be used: <b>home needs the exact count</b>.',
  mount(h,a){ let s=chState([CH.HOME-2,-1,CH.HOME,-1],[5,2]), done=false;
   const go=m=>{ if(done) return; done=true; s=CH.apply(s,m); draw(); a.note('<b>Both colours home: you win.</b>'); a.ok(); };
   const draw=()=>real('chaupar',h,s,go,{human:!done,crop:SOUTH}); draw(); a.note('The 5 is greyed out: it would overshoot. Use the 2.');
   return {async show(){ go({t:'move',v:2,pc:0,to:CH.HOME}); }}; }}
]);

/* ======================= Dasapada =======================
   pieces are {c: column, r: row counted from your own home row, st: 0 lying, 1 risen, 2 standing} */
const LY=0,RI=1,ST=2;
const row=(cols,st,r)=>cols.map(c=>({c,r:r||0,st}));
function dpState(o){ const s=DP.newState({seed:5}); s.p[1]=o.p1; s.p[2]=o.p2; s.home=[0,o.h1||0,o.h2||0]; s.turn=1; s.phase='act'; s.t=o.t; s.grab=o.grab; return s; }
const NUTS={4:{k:16,rem:0},3:{k:11,rem:3},2:{k:14,rem:2},1:{k:13,rem:1}};
L.add('dasapada',()=>[
 {kind:'goal',title:'Three across the board',text:'A ten-by-ten board. Each side has five pieces, starting <b>lying down</b> on its home row. Get <b>three of your pieces across the far edge</b> first.',
  mount(h,a){ real('dasapada',h,dpState({p1:[{c:0,r:0,st:LY},{c:2,r:3,st:RI},{c:6,r:7,st:ST}],p2:[{c:1,r:0,st:LY},{c:5,r:2,st:ST},{c:9,r:0,st:LY},{c:3,r:4,st:RI}],h1:2,h2:1,t:2,grab:NUTS[2]}),null,{human:false}); a.note('Solid has two across already. One more wins.'); }},
 {kind:'watch',title:'Lie, rise, stand, walk',text:'Grab a handful of nuts and count it off by fours. What is left over names the throw: <b>2 Dvāpara rises</b>, <b>3 Tretā stands</b>, <b>0 Kṛta walks</b>, <b>1 Kali lies down</b>. A piece must rise and stand before it can walk.',
  mount(h,a){ let s; const draw=()=>real('dasapada',h,s,null,{human:false});
   const set=t=>{ s.turn=1; s.phase='act'; s.t=t; s.grab=NUTS[t]; };
   const build=()=>{ s=dpState({p1:row([0,2,4,6,8],LY),p2:row([1,3,5,7,9],LY),t:2,grab:NUTS[2]}); draw(); a.note('Every piece starts lying down.'); }; build();
   return {reset:build, async show(){ await sleep(500); s=DP.apply(s,{t:'rise',i:2}); set(3); draw(); a.note('<b>14 nuts, 2 left over: Dvāpara rises.</b> The middle piece sits up.'); await sleep(1800);
     s=DP.apply(s,{t:'stand',i:2}); set(4); draw(); a.note('<b>11 nuts, 3 left over: Tretā stands.</b> Now it can walk.'); await sleep(1800);
     s=DP.apply(s,{t:'walk',i:2,c:4,r:4}); draw(); a.note('<b>16 nuts, none left over: Kṛta walks</b> four squares, and you throw again.'); }}; }},
 {kind:'try',title:'Raise a piece',text:'You grabbed <b>14 nuts</b>. Count off by fours: <b>2 left over</b>, so <b>Dvāpara rises</b>. Tap any of your lying pieces.',
  mount(h,a){ let s=dpState({p1:row([0,2,4,6,8],LY),p2:row([1,3,5,7,9],LY),t:2,grab:NUTS[2]}), done=false;
   const go=m=>{ if(done) return; done=true; s=DP.apply(s,m); draw(); a.note('<b>Risen.</b> Tretā will stand it up, and then Kṛta lets it walk.'); a.ok(); };
   const draw=()=>real('dasapada',h,s,go,{human:!done}); draw(); a.note('Tap a solid piece on the bottom row.');
   return {async show(){ go({t:'rise',i:1}); }}; }},
 {kind:'cant',title:'Only a standing piece walks',text:'You threw <b>Kṛta: walk 4</b>. Try to walk one of your <b>lying</b> pieces.',
  mount(h,a){ let s=dpState({p1:[{c:0,r:0,st:LY},{c:2,r:0,st:LY},{c:4,r:2,st:ST},{c:8,r:0,st:LY}],p2:row([1,5,9],LY,0).concat([{c:6,r:3,st:RI}]),t:4,grab:NUTS[4]}), done=false;
   const go=m=>{ if(done) return; done=true; s=DP.apply(s,m); draw(); a.note('<b>Walked.</b> Straight ahead goes the full four; angling one column costs a step. Kṛta also throws again.'); a.ok(); };
   const draw=()=>{ const box=real('dasapada',h,s,go,{human:!done}); if(!done) offTarget(box,()=>deny(box.querySelector('.hg'),a,'<b>Not allowed.</b> A lying piece has to rise and stand first. Only the standing piece can walk.')); };
   draw(); a.note('Tap a lying piece, then the standing one.');
   return {async show(){ h.querySelector('.hg svg').dispatchEvent(new MouseEvent('click',{bubbles:true})); await sleep(1300); go({t:'walk',i:2,c:4,r:6}); }}; }},
 {kind:'end',title:'Cross the far edge',text:'Walk past the last row and the piece is <b>across</b>. Walk onto an enemy and it goes <b>back home, lying down</b>. You have two across and a <b>Dvāpara: walk 2</b>.',
  mount(h,a){ let s=dpState({p1:[{c:5,r:7,st:ST},{c:1,r:0,st:LY}],p2:[{c:3,r:6,st:ST},{c:8,r:0,st:LY}],h1:2,h2:1,t:2,grab:NUTS[2]}), done=false;
   const go=m=>{ if(done) return; s=DP.apply(s,m); if(s.over){ done=true; draw(); a.note('<b>Three across: you win.</b>'); a.ok(); return; } done=true; draw(); a.note('Walked, but not across. Try again and walk straight ahead.'); };
   const draw=()=>real('dasapada',h,s,go,{human:!done}); draw(); a.note('Tap your standing piece, then the mark past the top edge.');
   return {async show(){ go({t:'walk',i:0,c:5,r:9,cross:true}); }}; }}
]);

/* ======================= Patolli ======================= */
function ptState(o){ const s=PT.newState({beans:6,seed:3}); s.prog[1]=o.p1||[]; s.prog[2]=o.p2||[]; s.done=[0,o.d1||0,o.d2||0];
  s.res=[0,6-s.prog[1].length-s.done[1],6-s.prog[2].length-s.done[2]]; s.turn=1;
  if(o.up){ s.phase='move'; s.up=o.up.slice().sort((x,y)=>y-x); s.thrown=[1,2,3,4,5,6].map(v=>o.up.includes(v)); } return s; }
const enemyOn=sq=>((sq-PT.START[2])%52+52)%52;
L.add('patolli',()=>[
 {kind:'goal',title:'Six pebbles, one lap',text:'The mat is a big <b>X</b> with one loop of 52 squares. Each player has <b>six pebbles</b>. Bring all six on and <b>round a full lap</b> first to win.',
  mount(h,a){ real('patolli',h,ptState({p1:[4,21,40],p2:[12,33],d1:1,d2:1}),null,{human:false}); a.note('Each side has one pebble round, three on the mat, and two still waiting.'); }},
 {kind:'watch',title:'Every bean is a move',text:'Throw <b>six beans</b>, numbered 1 to 6. <b>Each bean that lands face up</b> is its own move: it brings a pebble on, or moves one by its number.',
  mount(h,a){ let s; const draw=()=>real('patolli',h,s,null,{human:false}); const build=()=>{ s=ptState({up:[5,3]}); draw(); a.note('Beans <b>3 and 5</b> landed face up. The rest are blank.'); }; build();
   return {reset:build, async show(){ await sleep(500); s=PT.apply(s,{t:'enter',v:5,hit:false}); draw(); a.note('<b>The 5 brings a pebble on</b> at the ringed entry square.'); await sleep(1600);
     s=PT.apply(s,{t:'step',v:3,i:0,to:3,hit:false}); draw(); a.note('<b>The 3 moves it three squares.</b> Both beans used: the turn passes.'); }}; }},
 {kind:'try',title:'Use both beans',text:'Beans <b>4 and 2</b> came up. Pick a bean, then a pebble, or the waiting pebble at the edge to bring it on. <b>Use both.</b>',
  mount(h,a){ let s=ptState({p1:[5],up:[4,2]}), n=0;
   const go=m=>{ if(n>=2) return; s=PT.apply(s,m); n++; draw(); if(n===1) a.note('<b>One bean used.</b> Now the other one.'); else { a.note('<b>Both used.</b> Splitting a throw is the whole skill.'); a.ok(); } };
   const draw=()=>real('patolli',h,s,go,{human:n<2&&s.turn===1}); draw(); a.note('Pick the 4, then a pebble.');
   return {async show(){ go({t:'step',v:4,i:0,to:9,hit:false}); await sleep(1100); go({t:'enter',v:2,hit:false}); }}; }},
 {kind:'cant',title:'You can’t land on your own pebble',text:'You threw a <b>4</b>. Your back pebble is exactly four behind your front one. <b>Try to move the back pebble.</b>',
  mount(h,a){ let s=ptState({p1:[2,6],up:[4]}), done=false;
   const go=m=>{ if(done) return; done=true; s=PT.apply(s,m); draw(); a.note('<b>Allowed.</b> Two of your own pebbles never share a square.'); a.ok(); };
   const draw=()=>{ const box=real('patolli',h,s,go,{human:!done}); if(!done) offTarget(box,()=>deny(box.querySelector('.hg'),a,'<b>Not allowed.</b> Four squares on is your own pebble. Move the front one, or bring a new one on.')); };
   draw(); a.note('Tap the back pebble, then try the front one.');
   return {async show(){ h.querySelector('.hg svg').dispatchEvent(new MouseEvent('click',{bubbles:true})); await sleep(1300); go({t:'step',v:4,i:1,to:10,hit:false}); }}; }},
 {kind:'end',title:'Hit, and race home',text:'Land <b>exactly</b> on an enemy pebble to send it <b>off the mat</b>: it must come on again from the start. The first to bring all six round wins.',
  mount(h,a){ let s=ptState({p1:[10],p2:[enemyOn(13)],d1:2,up:[3]}), done=false;
   const go=m=>{ if(done) return; done=true; s=PT.apply(s,m); draw(); a.note(s.hit?'<b>Hit.</b> Their pebble is off the mat and back to the start.':'Moved.'); a.ok(); };
   const draw=()=>real('patolli',h,s,go,{human:!done}); draw(); a.note('Your 3 lands right on their pebble. Tap yours.');
   return {async show(){ go({t:'step',v:3,i:0,to:13,hit:true}); }}; }}
]);
})();
