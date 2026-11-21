#!/usr/bin/env node
/* Writes offline-manifest.json: every file a game page needs to open and play with no connection, so offline.js can save
   it into the browser's cache and sw.js can serve it from there. Run after version-assets.js (it reads the stamped
   ?v= addresses from a built game page, so the cached copies match exactly what the page asks for).
     core   shared by every game: the page's scripts and styles, the Web Workers and the engines they import, icons,
            the duck pictures, the effect sounds, the strategy-games soundtrack, the Origins content, and offline.html
     games  per game: its own page address (all games share the same scripts) */
const fs=require('fs'), path=require('path'), crypto=require('crypto');
const root=path.join(__dirname,'..'); const GAMES=require('./games-list.js');
const page=fs.readFileSync(path.join(root,GAMES[0][0],'index.html'),'utf8');
const core=new Set();
for(const m of page.matchAll(/<(?:script|link)\b[^>]*?\b(?:src|href)="(\/[^"#]+)"/g)){ const u=m[1]; if(/^\/\//.test(u)) continue;
  const file=u.split('?')[0]; if(/\.[a-z0-9]+$/i.test(file)&&fs.existsSync(path.join(root,file))) core.add(u); }
/* requested by scripts at run time (Workers, importScripts, new Audio, fetch, img src set from JS) */
['/engine-worker.js','/engines.js','/ai-worker.js','/engines2.js','/gold-engine.js','/ai-core.js',
 '/duck-face.png','/author-duck.png','/arcade-duck-side.svg','/arcade-duck-top.svg','/fonts/fast-blaze.woff2',
 '/audio/duck-squeak.mp3','/audio/zfgames-3.mp3','/offline.html','/site.webmanifest'].forEach(u=>{ if(fs.existsSync(path.join(root,u))) core.add(u); });
/* published Origins pictures travel with the games */
const odir=path.join(root,'origins'); if(fs.existsSync(odir)) (function walk(d){ for(const f of fs.readdirSync(d)){ const p=path.join(d,f); if(fs.statSync(p).isDirectory()) walk(p); else if(!f.startsWith('.')) core.add('/'+path.relative(root,p).split(path.sep).join('/')); } })(odir);
const games={}; GAMES.forEach(([slug])=>games[slug]=['/'+slug]);
const list=[...core].sort();
const h=crypto.createHash('sha256'); list.forEach(u=>{ h.update(u); const f=path.join(root,u.split('?')[0]); h.update(fs.readFileSync(f)); }); h.update(page);
const out={version:h.digest('hex').slice(0,12),fallback:'/offline.html',core:list,games,bytes:list.reduce((n,u)=>n+fs.statSync(path.join(root,u.split('?')[0])).size,0)};
fs.writeFileSync(path.join(root,'offline-manifest.json'),JSON.stringify(out,null,1)+'\n');
console.log(`offline-manifest.json: version ${out.version}, ${list.length} core files (${(out.bytes/1048576).toFixed(1)} MB), ${GAMES.length} games`);
