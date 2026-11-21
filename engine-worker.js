/* engine-worker.js: computer moves run here so the board never freezes. */
importScripts('/engines.js');
self.onmessage = function(e){ const {id,game,payload,diff}=e.data; let move=-1;
  if(game==='four') move=F4.choose(payload.cells.slice(),payload.p,diff);
  else if(game==='five') move=F5.choose(payload.cells.slice(),payload.p,diff);
  else if(game==='ult'){ const s={cells:payload.cells.slice(),bw:payload.bw.slice(),next:payload.next,player:payload.player,winner:payload.winner,moves:[]}; move=ULT.choose(s,diff); }
  else if(game==='cube') move=C3.choose(payload.cells.slice(),payload.p,diff);
  else if(game==='nim'){ const m=NIM.choose(payload.h.map(x=>BigInt(x)),payload.misere,diff); move = m?{pile:m.pile,take:String(m.take),leave:String(m.leave)}:null; }
  else if(game==='chomp'){ move=CHOMP.choose(payload.len.slice(),payload.C,diff); }
  self.postMessage({id,move}); };
