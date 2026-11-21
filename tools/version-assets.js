#!/usr/bin/env node
/* Stamps every local script and stylesheet reference with a hash of the file's contents (?v=1a2b3c4d), so a browser or CDN can never mix an old
   script with new HTML. A file that changes gets a new URL; a file that does not keeps its old one. Safe to run repeatedly.
   Used by tools/build-routes.js (for every generated page) and for index.html, /story, /join and /create:   node tools/version-assets.js */
const fs=require('fs'), path=require('path'), crypto=require('crypto'); const root=path.join(__dirname,'..');
const hashOf=f=>crypto.createHash('sha1').update(fs.readFileSync(path.join(root,f))).digest('hex').slice(0,8);
function stamp(html){ return html.replace(/(\b(?:src|href)=")(\/?)([\w.-]+\.(?:js|css))(?:\?v=[0-9a-f]+)?(")/g,(m,a,slash,file,q)=>{ try{ return a+slash+file+'?v='+hashOf(file)+q; }catch(e){ return m; } }); }
module.exports={stamp};
if(require.main===module){ for(const rel of ['index.html','story/index.html','join/index.html','create/index.html']){ const f=path.join(root,rel); const before=fs.readFileSync(f,'utf8'), after=stamp(before); if(after!==before) fs.writeFileSync(f,after); console.log(rel+': assets stamped'); } }
