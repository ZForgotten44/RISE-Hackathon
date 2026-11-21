/* Recursive Tic-Tac-Toe rules check.  node tools/recursive-test.js
   Plays thousands of random games on the site's engine and on a small independent reference, and requires them to agree on every position:
   legal moves, which board is next, small-board wins and draws, and the overall result. Also counts how often the special cases occur. */
const fs=require('fs'), path=require('path'); const src=fs.readFileSync(path.join(__dirname,'..','engines.js'),'utf8');
const a=src.indexOf('const ULT = (function(){'), b=src.indexOf('})();',a)+5; const ULT=eval('(()=>{'+src.slice(a,b)+';return ULT;})()');
const L=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
const won=(get,p)=>L.some(l=>l.every(i=>get(i)===p));
function ref(){ const cells=Array(81).fill(0), bw=Array(9).fill(0); let next=-1, player=1, winner=0;
  return { cells,bw,get next(){return next;},get player(){return player;},get winner(){return winner;},
    legal(){ if(winner) return []; const boards=(next>=0&&bw[next]===0)?[next]:[...Array(9).keys()].filter(x=>bw[x]===0); const o=[]; for(const x of boards) for(let c=0;c<9;c++) if(!cells[x*9+c]) o.push(x*9+c); return o; },
    play(i){ const x=Math.floor(i/9), c=i%9; cells[i]=player; if(won(k=>cells[x*9+k],player)) bw[x]=player; else if([...Array(9).keys()].every(k=>cells[x*9+k])) bw[x]=3;
      if(won(k=>bw[k],player)) winner=player; else if(bw.every(v=>v)) winner=3; next=bw[c]===0?c:-1; player=3-player; } }; }
let games=0, plies=0, bad=0, smallWins=0, smallDraws=0, sentToClosed=0, macroWins=0, macroDraws=0;
const eq=(x,y)=>x.length===y.length&&x.every((v,i)=>v===y[i]);
for(let g=0;g<6000;g++){ const s=ULT.newState(), r=ref(); games++;
  while(!s.winner){ const lm=ULT.legal(s).slice().sort((p,q)=>p-q), rm=r.legal().sort((p,q)=>p-q);
    if(!eq(lm,rm)){ bad++; console.log('legal moves differ',g,lm.length,rm.length); break; }
    if(!lm.length){ bad++; console.log('no legal move but game not over'); break; }
    const m=lm[Math.floor(Math.random()*lm.length)], before=s.bw.slice(); ULT.play(s,m); r.play(m); plies++;
    const dest=m%9; if(before[dest]!==0) sentToClosed++;
    for(let x=0;x<9;x++){ if(before[x]===0&&s.bw[x]===1||before[x]===0&&s.bw[x]===2) smallWins++; if(before[x]===0&&s.bw[x]===3) smallDraws++; }
    if(!eq(s.bw,r.bw)||!eq(s.cells,r.cells)||s.next!==r.next||s.player!==r.player||s.winner!==r.winner){ bad++; console.log('state differs',g,plies); break; }
    if(s.next!==-1&&s.bw[s.next]!==0){ bad++; console.log('next board is closed'); break; }
    if(before[dest]!==0&&s.next!==-1&&!s.winner){ bad++; console.log('sent to a closed board but not given a free choice'); break; } }
  if(s.winner===3) macroDraws++; else if(s.winner) macroWins++; }
console.log({games,plies,smallBoardWins:smallWins,smallBoardDraws:smallDraws,sentToClosedBoard:sentToClosed,macroWins,macroDraws,disagreements:bad}); process.exit(bad?1:0);
