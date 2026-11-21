/* ai-worker.js: the computer's moves for the games2/3/4 framework (Pentago, TOOT & OTTO, Notakto, Sim, The Gold Coin)
   run here, off the page's main thread. Same engines and the same ai-core.js as the page, so behaviour never changes. */
importScripts('/engines2.js','/gold-engine.js','/ai-core.js');
self.onmessage=function(e){ const {id,game,state,level}=e.data; let move=null, error=null;
  try{ move=self.ZFAI.choose(game,state,level); }catch(err){ error=String(err&&err.message||err); }
  self.postMessage({id,move,error}); };
