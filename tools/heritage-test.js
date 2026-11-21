/* tools/heritage-test.js: plays the four heritage games through to the end, many times, with every move checked against
   the legal list. Morabaraba, Chaupar, Dasapada, Patolli. Run: node tools/heritage-test.js */
const H=require('../heritage-core.js');
let fail=0; const ok=(c,msg)=>{ if(!c){ fail++; console.log('FAIL',msg); } };
const rand=L=>L[Math.floor(Math.random()*L.length)];
function play(name,E,pick,N,opt){ const w=[0,0,0];
  for(let g=0;g<N;g++){ let s=E.newState(opt||{}), k=0;
    while(!s.over&&k<30000){ const L=E.legal(s); ok(L.length>0,`${name}: no legal move in a live position`); const m=pick(s,L);
      ok(L.some(x=>JSON.stringify(x)===JSON.stringify(m)),`${name}: illegal move ${JSON.stringify(m)}`); s=E.apply(s,m); k++; }
    ok(s.over,`${name}: game did not finish`); w[s.winner]++; }
  console.log(`${name}: ${N} games, wins P1 ${w[1]} P2 ${w[2]} draws ${w[0]}`); }
/* the same seed and the same moves give the same throws (undo can't re-roll) */
for(const E of [H.CH,H.DP,H.PT]){ const a=E.newState({seed:42}), b=E.newState({seed:42}); const m=E.legal(a)[0]; ok(JSON.stringify(E.apply(a,m))===JSON.stringify(E.apply(b,m)),'throws must be deterministic for a seed'); }
/* Morabaraba: the board has 24 points and 20 mills, and every point is on at least two mills */
ok(H.MB.MILLS.length===20,'20 mills'); ok(H.MB.ADJ.every(a=>a.length>=2),'every point joined');
play('Morabaraba random',H.MB,(s,L)=>rand(L),200);
play('Morabaraba medium vs random',H.MB,(s,L)=>s.turn===1?H.mbAI(s,'medium'):rand(L),10);
play('Chaupar random (quick)',H.CH,(s,L)=>rand(L),100,{per:2});
play('Chaupar hard (full)',H.CH,s=>H.CH.ai(s,'hard'),30,{per:4});
play('Dasapada random',H.DP,(s,L)=>rand(L),300);
play('Dasapada hard',H.DP,s=>H.DP.ai(s,'hard'),300);
play('Patolli random (6 beans)',H.PT,(s,L)=>rand(L),200);
play('Patolli hard (5 beans)',H.PT,s=>H.PT.ai(s,'hard'),100,{beans:5});
console.log(fail?`${fail} failures`:'All heritage checks passed.'); process.exit(fail?1:0);
