/* sw.js: lets a saved game open and play with no connection.
   What gets saved is decided by the page (offline.js, from offline-manifest.json): the game's page plus everything it
   needs. This worker only answers requests:
     game pages    network first (short wait), then the saved copy, then /offline.html, which explains what to do
     site files    the saved copy first (every script and style address carries a content hash, so a saved copy is
                   never stale), otherwise the network
     sound         the saved file, with byte ranges answered properly so audio can seek and loop offline
     web fonts     saved the first time they load, then served from the saved copy
   It never reloads a page. A new version of this file takes over quietly; saved games are refreshed by offline.js
   between matches, never during one. Online rooms (WebSockets) are not touched: they need the internet. */
const CACHE='zf-offline';
const FONT_HOSTS=['fonts.googleapis.com','fonts.gstatic.com'];
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));

const norm=u=>{ const x=new URL(u); let p=x.pathname.replace(/\/index\.html$/,'').replace(/\/+$/,''); return p||'/'; };
function timeout(ms){ return new Promise((_,rej)=>setTimeout(()=>rej(new Error('timeout')),ms)); }

async function page(req){ const c=await caches.open(CACHE); const key=norm(req.url); const saved=await c.match(key);
  try{ /* with a saved copy, a slow network falls back to it after a short wait instead of leaving a blank screen */
    const net=fetch(req); const r=await (saved?Promise.race([net,timeout(3500)]):net); if(r&&(r.ok||!saved)) return r; return saved||r; }
  catch(e){ if(saved) return saved; const fb=await c.match('/offline.html'); return fb||new Response('<!doctype html><meta charset="utf-8"><title>Offline</title><p>You’re offline, and this page isn’t saved on this device yet.</p>',{headers:{'content-type':'text/html; charset=utf-8'}}); } }

async function ranged(req,res){ const range=req.headers.get('range'); if(!range||!res) return res;
  const buf=await res.arrayBuffer(); const m=/bytes=(\d*)-(\d*)/.exec(range); if(!m) return new Response(buf,{status:200,headers:res.headers});
  const size=buf.byteLength; let start=m[1]===''?size-(+m[2]):+m[1]; let end=m[1]===''||m[2]===''?size-1:Math.min(+m[2],size-1); start=Math.max(0,start);
  if(start>end||start>=size) return new Response(null,{status:416,headers:{'content-range':`bytes */${size}`}});
  const h=new Headers(res.headers); h.set('content-range',`bytes ${start}-${end}/${size}`); h.set('content-length',String(end-start+1)); h.set('accept-ranges','bytes');
  return new Response(buf.slice(start,end+1),{status:206,statusText:'Partial Content',headers:h}); }

/* a script without a content stamp (the Web Workers and the engines they import) is checked with the network first, so
   a worker never runs older rules than its page; offline, the saved copy answers */
const unstamped=u=>/\.(js|json)$/.test(u.pathname)&&!/[?&]v=/.test(u.search);
async function asset(req){ const c=await caches.open(CACHE);
  if(unstamped(new URL(req.url))){ try{ const r=await Promise.race([fetch(req),timeout(3500)]); if(r&&r.ok) return r; }catch(e){} const s=await c.match(req.url,{ignoreVary:true}); if(s) return s; return fetch(req); }
  const hit=await c.match(req.url,{ignoreVary:true});
  if(hit) return ranged(req,hit);
  try{ return await fetch(req); }
  catch(e){ /* offline and this exact address isn't saved: an older saved version of the same file is better than nothing */
    const any=await c.match(req.url,{ignoreSearch:true,ignoreVary:true}); if(any) return ranged(req,any); throw e; } }

async function font(req){ const c=await caches.open(CACHE); const hit=await c.match(req.url,{ignoreVary:true}); if(hit) return hit;
  const r=await fetch(req); if(r&&(r.ok||r.type==='opaque')) c.put(req.url,r.clone()).catch(()=>{}); return r; }

self.addEventListener('fetch',e=>{ const req=e.request; if(req.method!=='GET') return; const url=new URL(req.url);
  if(FONT_HOSTS.includes(url.hostname)) return e.respondWith(font(req));
  if(url.origin!==location.origin) return;
  if(url.pathname==='/sw.js'||url.pathname==='/offline-manifest.json') return;   // always fresh from the network
  if(req.mode==='navigate') return e.respondWith(page(req));
  e.respondWith(asset(req)); });
