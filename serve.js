#!/usr/bin/env node
/* Local preview server:  node serve.js [port]   (default http://localhost:8080)
   Serves the site the way a static host does: /nim and /nim/ both answer with nim/index.html, /arcade with arcade/index.html.
   It follows _redirects (renamed games) the way the hosts do. (Opening index.html by double-click uses file:// URLs, where /nim has no meaning; use this server.) */
const http=require('http'),fs=require('fs'),path=require('path');
const root=__dirname, port=+process.argv[2]||+process.env.PORT||8080;
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.ico':'image/x-icon','.json':'application/json','.wasm':'application/wasm','.webmanifest':'application/manifest+json','.txt':'text/plain','.mp3':'audio/mpeg','.pdf':'application/pdf','.webp':'image/webp'};
const REDIR={}; try{ fs.readFileSync(path.join(root,'_redirects'),'utf8').split('\n').forEach(l=>{ const m=l.trim().split(/\s+/); if(m.length>=2&&m[0][0]==='/') REDIR[m[0]]=m[1]; }); }catch(e){}
http.createServer((req,res)=>{
  const u=new URL(req.url,'http://localhost'); let p; try{ p=decodeURIComponent(u.pathname); }catch(e){ res.writeHead(400); return res.end('bad request'); }
  const mv=REDIR[p]; if(mv){ res.writeHead(301,{Location:mv+u.search}); return res.end(); }
  const f=path.normalize(path.join(root,p)); if(!f.startsWith(root)){ res.writeHead(403); return res.end('forbidden'); }
  const cands=[f,f+'.html',path.join(f,'index.html')]; const hit=cands.find(c=>{ try{ return fs.statSync(c).isFile(); }catch(e){ return false; } });
  if(!hit){ const nf=path.join(root,'404.html'); res.writeHead(404,{'Content-Type':types['.html']}); return fs.existsSync(nf)?fs.createReadStream(nf).pipe(res):res.end('404'); }
  const type=types[path.extname(hit)]||'application/octet-stream', st=fs.statSync(hit), range=req.headers.range;
  /* the audio track is long (~170MB); honoring Range lets an <audio> element seek between passages
     instead of downloading the whole file just to start playing or to jump ahead. */
  if(range){ const m=/bytes=(\d*)-(\d*)/.exec(range); const start=m&&m[1]?parseInt(m[1],10):0, end=m&&m[2]?parseInt(m[2],10):st.size-1;
    if(isNaN(start)||isNaN(end)||start>end||end>=st.size){ res.writeHead(416,{'Content-Range':`bytes */${st.size}`}); return res.end(); }
    res.writeHead(206,{'Content-Type':type,'Content-Range':`bytes ${start}-${end}/${st.size}`,'Accept-Ranges':'bytes','Content-Length':end-start+1,'Cache-Control':'no-store'});
    return fs.createReadStream(hit,{start,end}).pipe(res); }
  res.writeHead(200,{'Content-Type':type,'Accept-Ranges':'bytes','Content-Length':st.size,'Cache-Control':'no-store'}); fs.createReadStream(hit).pipe(res);
}).listen(port,()=>console.log(`Z Forgotten Games preview: http://localhost:${port}/   (arcade: /arcade, games: /nim /pentago /toot-otto …)`));
